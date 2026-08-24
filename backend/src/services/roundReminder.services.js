const crypto = require("crypto");
const jobModel = require("../models/job.model");
const eventModel = require("../models/event.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const studentModel = require("../models/student.model");
const { sendNotificationEmail } = require("./student.services");

const SUBMISSION_DEADLINE_LEAD_MS = 6 * 60 * 60 * 1000;
const INTERVIEW_LEAD_MS = 2 * 60 * 60 * 1000;
const ACTIVE_DEADLINE_STATUSES = ["eligible", "scheduled", "active"];
const ACTIVE_INTERVIEW_STATUSES = ["eligible", "scheduled", "active"];

function reminderRunAt(targetAt, leadMs, now = new Date()) {
  const target = new Date(targetAt);
  if (Number.isNaN(target.getTime()) || target <= now) return null;
  return new Date(Math.max(now.getTime(), target.getTime() - leadMs));
}

function submissionDeadlineReminderRunAt(deadlineAt, now = new Date()) {
  return reminderRunAt(deadlineAt, SUBMISSION_DEADLINE_LEAD_MS, now);
}

function interviewReminderRunAt(startAt, now = new Date()) {
  return reminderRunAt(startAt, INTERVIEW_LEAD_MS, now);
}

function candidateRecipientIds(candidate) {
  const recipients = candidate?.participantIds?.length
    ? candidate.participantIds
    : [candidate?.studentId];
  return [...new Set(recipients.filter(Boolean).map((studentId) => String(studentId?._id || studentId)))];
}

function roundReminderJobId(kind, sourceId, studentId, targetAt) {
  return crypto
    .createHash("sha256")
    .update(`round-reminder:${kind}:${sourceId}:${studentId}:${new Date(targetAt).toISOString()}`)
    .digest("hex")
    .slice(0, 24);
}

async function enqueueRoundReminder({ kind, sourceId, studentId, eventId, roundId, candidateId, slotId, targetAt }, options = {}) {
  const now = options.now || new Date();
  const runAt = kind === "submission_deadline"
    ? submissionDeadlineReminderRunAt(targetAt, now)
    : interviewReminderRunAt(targetAt, now);
  if (!sourceId || !studentId || !eventId || !roundId || !candidateId || !runAt) return null;

  const jobId = roundReminderJobId(kind, sourceId, studentId, targetAt);
  const job = await jobModel.findOneAndUpdate(
    { _id: jobId },
    {
      $setOnInsert: {
        type: "round_reminder",
        payload: {
          kind,
          studentId: String(studentId),
          eventId: String(eventId),
          roundId: String(roundId),
          candidateId: String(candidateId),
          ...(slotId ? { slotId: String(slotId) } : {}),
          expectedAt: new Date(targetAt).toISOString(),
        },
        status: "queued",
        runAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const shouldRequeue = job.status === "failed"
    || (options.reviveCompleted && job.status === "completed");
  if (shouldRequeue && !job.delivery?.emailAt) {
    return jobModel.findOneAndUpdate(
      { _id: jobId, status: job.status, "delivery.emailAt": null },
      {
        $set: {
          status: "queued",
          attempts: 0,
          runAt,
          completedAt: null,
          lastError: "",
          updatedAt: new Date(),
        },
        $unset: { lockedAt: 1, lockedBy: 1 },
      },
      { new: true },
    );
  }
  return job;
}

async function enqueueSubmissionDeadlineReminders(candidates, round, options = {}) {
  if (!round?._id || !round.submissionDeadlineAt) return [];
  const jobs = [];
  for (const candidate of candidates || []) {
    if (!ACTIVE_DEADLINE_STATUSES.includes(candidate.status)) continue;
    for (const studentId of candidateRecipientIds(candidate)) {
      jobs.push(enqueueRoundReminder({
        kind: "submission_deadline",
        sourceId: candidate._id,
        studentId,
        eventId: candidate.eventId,
        roundId: round._id,
        candidateId: candidate._id,
        targetAt: round.submissionDeadlineAt,
      }, options));
    }
  }
  return Promise.all(jobs);
}

async function enqueueSubmissionDeadlineRemindersForRound(event, round, options = {}) {
  if (!event?._id || !round?._id || !round.submissionDeadlineAt) return [];
  const candidates = await roundCandidateModel
    .find({ eventId: event._id, roundId: round._id, status: { $in: ACTIVE_DEADLINE_STATUSES } })
    .select("eventId roundId studentId participantIds status")
    .lean();
  return enqueueSubmissionDeadlineReminders(candidates, round, options);
}

async function enqueueInterviewRemindersForSlot(slot, options = {}) {
  if (options.roundType && options.roundType !== "interview") return [];
  if (!slot?._id || !slot.startAt || slot.status !== "scheduled") return [];
  return Promise.all(candidateRecipientIds(slot).map((studentId) => enqueueRoundReminder({
    kind: "interview",
    sourceId: slot._id,
    studentId,
    eventId: slot.eventId,
    roundId: slot.roundId,
    candidateId: slot.candidateId,
    slotId: slot._id,
    targetAt: slot.startAt,
  }, options)));
}

function allEventRounds(event) {
  const rounds = [
    ...(event?.verticals || []).flatMap((vertical) => vertical.rounds || []),
    ...(event?.rounds || []),
  ];
  return [...new Map(rounds.filter((round) => round?._id).map((round) => [String(round._id), round])).values()];
}

function eventRound(event, roundId) {
  return allEventRounds(event).find((round) => String(round._id) === String(roundId)) || null;
}

function dateInKolkata(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function buildRoundReminderNotification({ kind, event, round, clubName, slot = null, now = new Date() }) {
  const isInterview = kind === "interview";
  const targetAt = isInterview ? slot?.startAt : round?.submissionDeadlineAt;
  const deadlineIsToday = dateInKolkata(targetAt) === dateInKolkata(now);
  const remainingMs = new Date(targetAt).getTime() - new Date(now).getTime();
  const interviewTiming = remainingMs >= 90 * 60 * 1000
    ? "starts in about 2 hours"
    : "starts soon";
  return {
    type: isInterview ? "round_interview_reminder" : "round_deadline_reminder",
    title: isInterview
      ? `Interview reminder: ${round.title}`
      : `${round.title} deadline ${deadlineIsToday ? "is today" : "is coming up"}`,
    message: isInterview
      ? `Your ${round.title} slot for ${event.title}, organised by ${clubName}, ${interviewTiming}.`
      : `The ${round.title} deadline for ${event.title}, organised by ${clubName}, ${deadlineIsToday ? "is today" : "is coming up soon"}. Please submit before the deadline.`,
    link: `/event/${event._id}`,
    emailDetails: {
      startsAt: targetAt,
      dateLabel: isInterview ? "Interview time" : "Submission deadline",
      clubName,
      eventName: event.title,
      roundName: round.title,
      ...(isInterview && slot?.venue ? { venue: slot.venue } : {}),
      ...(isInterview && slot?.meetingUrl ? { meetingUrl: slot.meetingUrl } : {}),
    },
  };
}

async function markEmailHandled(job, workerId) {
  await jobModel.updateOne(
    { _id: job._id, lockedBy: workerId },
    { $set: { "delivery.emailAt": new Date(), updatedAt: new Date() } },
  );
}

async function deliverRoundReminder(job, workerId) {
  const { kind, studentId, eventId, roundId, candidateId, slotId, expectedAt } = job.payload || {};
  if (!["submission_deadline", "interview"].includes(kind)
    || !studentId || !eventId || !roundId || !candidateId || !expectedAt) return;

  const event = await eventModel
    .findOne({ _id: eventId, status: { $in: ["published", "closed"] } })
    .select("title clubId verticals.rounds rounds")
    .populate("clubId", "name")
    .lean();
  const round = eventRound(event, roundId);
  if (!event || !round) return;

  const candidate = await roundCandidateModel.findOne({
    _id: candidateId,
    eventId,
    roundId,
    participantIds: studentId,
    status: { $in: kind === "interview" ? ACTIVE_INTERVIEW_STATUSES : ACTIVE_DEADLINE_STATUSES },
  }).select("_id").lean();
  if (!candidate) return;

  let slot = null;
  let actualAt = round.submissionDeadlineAt;
  if (kind === "interview") {
    if (round.type !== "interview" || !slotId) return;
    slot = await scheduleSlotModel.findOne({
      _id: slotId,
      candidateId,
      eventId,
      roundId,
      participantIds: studentId,
      status: "scheduled",
    }).select("startAt venue meetingUrl status").lean();
    if (!slot) return;
    actualAt = slot.startAt;
  }

  const target = new Date(actualAt);
  if (Number.isNaN(target.getTime()) || target <= new Date() || target.toISOString() !== expectedAt) return;

  const student = await studentModel.findById(studentId).select("email notificationPreferences").lean();
  if (!student) return;
  if (!job.delivery?.emailAt) {
    if (student.notificationPreferences?.email !== false) {
      await sendNotificationEmail(
        student.email,
        buildRoundReminderNotification({
          kind,
          event,
          round,
          clubName: event.clubId?.name || "the organising club",
          slot,
        }),
        { idempotencyKey: `job:${job._id}` },
      );
    }
    await markEmailHandled(job, workerId);
  }
}

async function backfillRoundReminders(options = {}) {
  const now = options.now || new Date();
  const [deadlineEvents, futureSlots] = await Promise.all([
    eventModel.find({
      status: { $in: ["published", "closed"] },
      $or: [
        { "verticals.rounds.submissionDeadlineAt": { $gt: now } },
        { "rounds.submissionDeadlineAt": { $gt: now } },
      ],
    }).select("verticals.rounds rounds status").lean(),
    scheduleSlotModel.find({ status: "scheduled", startAt: { $gt: now } })
      .select("eventId roundId candidateId studentId participantIds startAt status")
      .lean(),
  ]);

  for (const event of deadlineEvents) {
    for (const round of allEventRounds(event)) {
      if (round.submissionDeadlineAt && new Date(round.submissionDeadlineAt) > now) {
        await enqueueSubmissionDeadlineRemindersForRound(event, round, { now });
      }
    }
  }

  const eventIds = [...new Set(futureSlots.map((slot) => String(slot.eventId)))];
  const interviewEvents = eventIds.length
    ? await eventModel.find({ _id: { $in: eventIds }, status: { $in: ["published", "closed"] } })
      .select("verticals.rounds rounds status")
      .lean()
    : [];
  const eventsById = new Map(interviewEvents.map((event) => [String(event._id), event]));
  for (const slot of futureSlots) {
    const round = eventRound(eventsById.get(String(slot.eventId)), slot.roundId);
    if (round?.type === "interview") await enqueueInterviewRemindersForSlot(slot, { now });
  }
}

module.exports = {
  ACTIVE_DEADLINE_STATUSES,
  ACTIVE_INTERVIEW_STATUSES,
  INTERVIEW_LEAD_MS,
  SUBMISSION_DEADLINE_LEAD_MS,
  allEventRounds,
  backfillRoundReminders,
  buildRoundReminderNotification,
  candidateRecipientIds,
  dateInKolkata,
  deliverRoundReminder,
  enqueueInterviewRemindersForSlot,
  enqueueSubmissionDeadlineReminders,
  enqueueSubmissionDeadlineRemindersForRound,
  interviewReminderRunAt,
  roundReminderJobId,
  submissionDeadlineReminderRunAt,
};
