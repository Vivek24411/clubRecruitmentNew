const crypto = require("crypto");
const mongoose = require("mongoose");
const eventModel = require("../models/event.model");
const eventMembershipModel = require("../models/eventMembership.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const scheduleReservationModel = require("../models/scheduleReservation.model");

const ROUND_TYPES = new Set([
  "test", "submission", "interview", "group_discussion", "presentation", "hackathon", "custom",
]);

function cleanString(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function cleanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function legacyRoundToTyped(round, index) {
  const rawType = cleanString(round?.Type || round?.type || "custom", 100).toLowerCase();
  const mappings = {
    test: "test",
    submission: "submission",
    interview: "interview",
    "group discussion": "group_discussion",
    presentation: "presentation",
    task: "submission",
    hackathon: "hackathon",
  };
  const type = mappings[rawType] || (ROUND_TYPES.has(rawType) ? rawType : "custom");
  const date = round?.TestDate || round?.roundDate;
  const deadline = round?.SubmissionDeadline;
  return {
    order: index + 1,
    title: cleanString(round?.title || round?.Type || `Round ${index + 1}`, 120),
    type,
    customType: type === "custom" ? cleanString(round?.Type, 100) : "",
    scheduleMode: date ? "common" : type === "interview" ? "slots" : "none",
    startsAt: date ? new Date(`${String(date).slice(0, 10)}T09:00:00+05:30`) : null,
    interviewMode: type === "interview" ? "individual" : null,
    evaluationScope: type === "interview" ? "participant" : "application",
    submissionEnabled: ["submission", "hackathon"].includes(type),
    submissionDeadlineAt: deadline
      ? new Date(`${String(deadline).slice(0, 10)}T23:59:59.999+05:30`)
      : null,
    submissionFields: round?.GoogleFormLink
      ? [{ key: "submission_link", label: "Submission link", type: "url", required: true, helpText: "" }]
      : [],
  };
}

function normalizeRounds(input) {
  const rounds = Array.isArray(input) ? input.slice(0, 20) : [];
  return rounds.map((round, index) => {
    if (round?.Type && !round?.title) return legacyRoundToTyped(round, index);
    const requestedType = cleanString(round?.type, 40).toLowerCase();
    const type = ROUND_TYPES.has(requestedType) ? requestedType : "custom";
    const interviewMode = type === "interview"
      ? (round?.interviewMode === "group" ? "group" : "individual")
      : null;
    const evaluationScope = type === "interview"
      ? (interviewMode === "group" ? "application" : "participant")
      : round?.evaluationScope === "participant" ? "participant" : "application";
    const submissionEnabled = Boolean(round?.submissionEnabled || ["submission", "hackathon"].includes(type));
    const scheduleMode = type === "interview"
      ? "slots"
      : ["common", "slots"].includes(round?.scheduleMode) ? round.scheduleMode : "none";
    const submissionFields = Array.isArray(round?.submissionFields)
      ? round.submissionFields.slice(0, 12).map((field, fieldIndex) => ({
        key: cleanString(field?.key || `field_${fieldIndex + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, "_"),
        label: cleanString(field?.label || `Field ${fieldIndex + 1}`, 120),
        type: ["text", "url", "github", "file", "pdf", "video"].includes(field?.type) ? field.type : "url",
        required: field?.required !== false,
        helpText: cleanString(field?.helpText, 300),
      }))
      : [];
    return {
      ...(mongoose.isValidObjectId(round?._id) ? { _id: round._id } : {}),
      order: index + 1,
      title: cleanString(round?.title || `Round ${index + 1}`, 120),
      type,
      customType: type === "custom" ? cleanString(round?.customType, 100) : "",
      description: cleanString(round?.description, 2000),
      instructions: cleanString(round?.instructions, 5000),
      evaluationScope,
      interviewMode,
      scheduleMode,
      startsAt: cleanDate(round?.startsAt),
      endsAt: cleanDate(round?.endsAt),
      venue: cleanString(round?.venue, 300),
      meetingUrl: cleanString(round?.meetingUrl, 2048),
      slotDurationMinutes: Math.min(Math.max(Number(round?.slotDurationMinutes) || 20, 5), 480),
      slotBufferMinutes: Math.min(Math.max(Number(round?.slotBufferMinutes) || 0, 0), 120),
      slotCapacity: Math.min(Math.max(Number(round?.slotCapacity) || 1, 1), 100),
      submissionEnabled,
      submissionOpensAt: cleanDate(round?.submissionOpensAt),
      submissionDeadlineAt: cleanDate(round?.submissionDeadlineAt),
      allowResubmission: round?.allowResubmission !== false,
      submissionFields,
    };
  });
}

async function ensureEventRounds(eventOrId) {
  const event = typeof eventOrId === "string" || eventOrId?._bsontype
    ? await eventModel.findById(eventOrId)
    : eventOrId;
  if (!event) return null;
  if (!event.rounds?.length && event.roundDetails?.length) {
    event.rounds = normalizeRounds(event.roundDetails);
    event.numberOfRounds = event.rounds.length;
    await event.save();
  }
  return event;
}

function eventRound(event, roundId) {
  return event?.rounds?.find((round) => String(round._id) === String(roundId)) || null;
}

function registrationParticipantIds(registration) {
  return [registration.studentId, ...(registration.membersAccepted || [])]
    .map((student) => student?._id || student)
    .filter(Boolean);
}

async function createCandidatesForRound({ event, round, registration, participantIds, sourceCandidateId = null }) {
  const participants = (participantIds?.length ? participantIds : registrationParticipantIds(registration))
    .map((id) => id?._id || id);
  if (!participants.length) return [];
  if (round.evaluationScope === "participant") {
    return Promise.all(participants.map((studentId) => roundCandidateModel.findOneAndUpdate(
      { eventId: event._id, roundId: round._id, registrationId: registration._id, studentId },
      {
        $setOnInsert: {
          eventId: event._id,
          roundId: round._id,
          registrationId: registration._id,
          studentId,
          participantIds: [studentId],
          scope: "participant",
          status: "eligible",
          sourceCandidateId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )));
  }
  const candidate = await roundCandidateModel.findOneAndUpdate(
    { eventId: event._id, roundId: round._id, registrationId: registration._id, studentId: null },
    {
      $setOnInsert: {
        eventId: event._id,
        roundId: round._id,
        registrationId: registration._id,
        studentId: null,
        scope: "application",
        status: "eligible",
        sourceCandidateId,
      },
      $addToSet: { participantIds: { $each: participants } },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return [candidate];
}

async function initializeRegistrationWorkflow(event, registration) {
  await ensureEventRounds(event);
  const firstRound = event.rounds?.[0];
  if (!firstRound) return [];
  registration.currentRound = 1;
  registration.currentRoundId = firstRound._id;
  registration.overallStatus = "in_progress";
  await registration.save();
  return createCandidatesForRound({ event, round: firstRound, registration });
}

async function ensureRegistrationWorkflow(event, registration) {
  await ensureEventRounds(event);
  if (!event.rounds?.length || registration.overallStatus === "withdrawn") return [];
  const existing = await roundCandidateModel.find({ registrationId: registration._id }).limit(1);
  if (existing.length) return existing;
  const legacyIndex = Math.min(Math.max(Number(registration.currentRound || 1) - 1, 0), event.rounds.length - 1);
  const round = event.rounds[legacyIndex] || event.rounds[0];
  registration.currentRound = round.order;
  registration.currentRoundId = round._id;
  if (["submitted", "waitlisted"].includes(registration.overallStatus)) registration.overallStatus = "in_progress";
  await registration.save();
  const candidates = await createCandidatesForRound({ event, round, registration });
  const legacyRound = registration.roundDetails?.[legacyIndex];
  if (legacyRound?.selected) {
    await roundCandidateModel.updateMany({ _id: { $in: candidates.map((candidate) => candidate._id) } }, { status: "advanced", decisionPublishedAt: new Date() });
  } else if (legacyRound?.status === "scheduled") {
    await roundCandidateModel.updateMany({ _id: { $in: candidates.map((candidate) => candidate._id) } }, { status: "scheduled" });
  }
  return candidates;
}

async function syncRegistrationParticipants(event, registration) {
  await ensureEventRounds(event);
  const activeRound = eventRound(event, registration.currentRoundId)
    || event.rounds?.[Math.max(Number(registration.currentRound || 1) - 1, 0)];
  if (!activeRound) return [];
  return createCandidatesForRound({ event, round: activeRound, registration });
}

async function advanceCandidate(event, registration, candidate) {
  const currentRound = eventRound(event, candidate.roundId);
  if (!currentRound) return [];
  const nextRound = event.rounds.find((round) => round.order === currentRound.order + 1);
  if (!nextRound) {
    registration.overallStatus = "selected";
    registration.currentRound = currentRound.order;
    registration.currentRoundId = currentRound._id;
    await registration.save();
    return [];
  }
  const participants = candidate.scope === "participant" && candidate.studentId
    ? [candidate.studentId]
    : candidate.participantIds;
  registration.overallStatus = "in_progress";
  registration.currentRound = nextRound.order;
  registration.currentRoundId = nextRound._id;
  await registration.save();
  return createCandidatesForRound({
    event,
    round: nextRound,
    registration,
    participantIds: participants,
    sourceCandidateId: candidate._id,
  });
}

async function findScheduleConflict(participantIds, startAt, endAt, excludeSlotId = null) {
  return scheduleSlotModel.findOne({
    ...(excludeSlotId ? { _id: { $ne: excludeSlotId } } : {}),
    status: "scheduled",
    participantIds: { $in: participantIds },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).populate("eventId", "title").populate("participantIds", "name email");
}

async function upsertScheduleSlot({ candidate, startAt, endAt, venue, meetingUrl, batchId }) {
  const start = cleanDate(startAt);
  const end = cleanDate(endAt);
  if (!start || !end || end <= start) {
    const error = new Error("The slot end time must be after its start time");
    error.status = 400;
    throw error;
  }
  const existing = await scheduleSlotModel.findOne({ candidateId: candidate._id });
  const conflict = await findScheduleConflict(candidate.participantIds, start, end, existing?._id);
  if (conflict) {
    const names = (conflict.participantIds || []).map((student) => student.name).filter(Boolean).join(", ");
    const error = new Error(`${names || "A participant"} already has an interview during this slot${conflict.eventId?.title ? ` for ${conflict.eventId.title}` : ""}`);
    error.status = 409;
    error.conflict = conflict;
    throw error;
  }
  const slotId = existing?._id || new mongoose.Types.ObjectId();
  const token = crypto.randomUUID();
  const oldReservations = existing ? await scheduleReservationModel.find({ slotId }) : [];
  const oldKeys = new Set(oldReservations.map((reservation) => `${reservation.studentId}:${reservation.minute.toISOString()}`));
  const newKeys = new Set();
  const reservations = [];
  for (const studentId of candidate.participantIds) {
    for (let minute = start.getTime(); minute < end.getTime(); minute += 60000) {
      const rounded = new Date(Math.floor(minute / 60000) * 60000);
      const key = `${studentId}:${rounded.toISOString()}`;
      newKeys.add(key);
      if (!oldKeys.has(key)) reservations.push({ studentId, minute: rounded, slotId, token });
    }
  }
  try {
    if (reservations.length) await scheduleReservationModel.insertMany(reservations, { ordered: true });
  } catch (error) {
    await scheduleReservationModel.deleteMany({ token });
    if (error?.code === 11000) {
      const conflictError = new Error("A participant received another interview while this slot was being saved. Choose a different time");
      conflictError.status = 409;
      throw conflictError;
    }
    throw error;
  }
  const oldReservationIdsToRelease = oldReservations
    .filter((reservation) => !newKeys.has(`${reservation.studentId}:${reservation.minute.toISOString()}`))
    .map((reservation) => reservation._id);
  let slot;
  try {
    slot = await scheduleSlotModel.findOneAndUpdate(
      { _id: slotId },
      {
        eventId: candidate.eventId,
        roundId: candidate.roundId,
        candidateId: candidate._id,
        registrationId: candidate.registrationId,
        studentId: candidate.studentId,
        participantIds: candidate.participantIds,
        startAt: start,
        endAt: end,
        venue: cleanString(venue, 300),
        meetingUrl: cleanString(meetingUrl, 2048),
        status: "scheduled",
        batchId: batchId || null,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    await scheduleReservationModel.deleteMany({ token });
    throw error;
  }
  if (oldReservationIdsToRelease.length) {
    await scheduleReservationModel.deleteMany({ _id: { $in: oldReservationIdsToRelease } });
  }
  candidate.status = "scheduled";
  await candidate.save();
  return slot;
}

async function autoScheduleCandidates({ candidates, startAt, endAt, durationMinutes, bufferMinutes, venue, meetingUrl }) {
  const windowStart = cleanDate(startAt);
  const windowEnd = cleanDate(endAt);
  const duration = Math.min(Math.max(Number(durationMinutes) || 20, 5), 480);
  const buffer = Math.min(Math.max(Number(bufferMinutes) || 0, 0), 120);
  if (!windowStart || !windowEnd || windowEnd <= windowStart) {
    const error = new Error("Enter a valid scheduling window");
    error.status = 400;
    throw error;
  }
  const batchId = crypto.randomUUID();
  const scheduled = [];
  const unscheduled = [];
  let cursor = new Date(windowStart);
  for (const candidate of candidates) {
    let placed = false;
    while (cursor.getTime() + duration * 60000 <= windowEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + duration * 60000);
      const conflict = await findScheduleConflict(candidate.participantIds, cursor, slotEnd);
      if (!conflict) {
        const slot = await upsertScheduleSlot({
          candidate,
          startAt: cursor,
          endAt: slotEnd,
          venue,
          meetingUrl,
          batchId,
        });
        scheduled.push(slot);
        cursor = new Date(slotEnd.getTime() + buffer * 60000);
        placed = true;
        break;
      }
      cursor = new Date(cursor.getTime() + 5 * 60000);
    }
    if (!placed) unscheduled.push(candidate);
  }
  return { batchId, scheduled, unscheduled };
}

async function ensureMembership({ eventId, registrationId, studentId, role }) {
  return eventMembershipModel.findOneAndUpdate(
    { eventId, studentId },
    { $setOnInsert: { eventId, registrationId, studentId, role, joinedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  advanceCandidate,
  autoScheduleCandidates,
  cleanDate,
  createCandidatesForRound,
  ensureEventRounds,
  ensureRegistrationWorkflow,
  ensureMembership,
  eventRound,
  findScheduleConflict,
  initializeRegistrationWorkflow,
  normalizeRounds,
  registrationParticipantIds,
  syncRegistrationParticipants,
  upsertScheduleSlot,
};
