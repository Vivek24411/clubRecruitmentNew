const { validationResult } = require("express-validator");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");
const eventMembershipModel = require("../models/eventMembership.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const roundSubmissionModel = require("../models/roundSubmission.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const scheduleReservationModel = require("../models/scheduleReservation.model");
const studentModel = require("../models/student.model");
const { notifyStudent } = require("../services/notification.services");
const { enqueueUniqueNotifications } = require("../services/jobQueue.services");
const {
  ACTIVE_DEADLINE_STATUSES,
  buildIncompleteSubmissionNotification,
  enqueueInterviewRemindersForSlot,
  incompleteSubmissionRecipientIds,
} = require("../services/roundReminder.services");
const { writeAudit } = require("../services/audit.services");
const { destroyCloudinaryAsset, destroyUploadedFile } = require("../utils/uploads");
const { saveRoundSubmission } = require("../services/roundSubmission.services");
const { secureSubmission, secureSubmissions } = require("../services/submissionFiles.services");
const {
  advanceCandidate,
  autoScheduleCandidates,
  createCandidatesForRound,
  ensureEventVerticals,
  ensureMembership,
  ensureRegistrationWorkflow,
  eventRound,
  eventVertical,
  verticalRounds,
  verticalForRound,
  registrationParticipantIds,
  revokeDownstreamCandidates,
  studentApplicationStatus,
  upsertScheduleSlot,
} = require("../services/eventWorkflow.services");

function invalidRequest(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, msg: "Please correct the highlighted details", errors: errors.array() });
    return true;
  }
  return false;
}

async function ownedEvent(eventId, clubId) {
  const event = await eventModel.findOne({ _id: eventId, clubId });
  return ensureEventVerticals(event);
}

function escapedRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function workflowData(event, query = {}) {
  // A round id identifies its own vertical, so an explicit roundId wins over
  // the vertical selector and keeps deep links working.
  const vertical = (query.roundId && verticalForRound(event, query.roundId))
    || eventVertical(event, query.verticalId)
    || event.verticals[0];
  const rounds = verticalRounds(event, vertical?._id);
  const selectedRound = rounds.find((round) => String(round._id) === String(query.roundId)) || rounds[0];
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 10), 100);
  const filter = {
    eventId: event._id,
    verticalId: vertical?._id,
    status: query.status && query.status !== "all" ? query.status : { $nin: ["revoked", "withdrawn"] },
  };
  if (selectedRound?._id) filter.roundId = selectedRound._id;

  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    const pattern = new RegExp(escapedRegex(search), "i");
    const [students, registrations] = await Promise.all([
      studentModel.find({ $or: [{ name: pattern }, { email: pattern }, { phoneNumber: pattern }, { enrollmentNumber: pattern }, { branch: pattern }] }).select("_id").limit(500).lean(),
      registerationEventModel.find({ eventId: event._id, verticalId: vertical?._id, teamName: pattern }).select("_id").limit(500).lean(),
    ]);
    const studentIds = students.map((student) => student._id);
    const registrationIds = registrations.map((registration) => registration._id);
    filter.$or = [
      { studentId: { $in: studentIds } },
      { participantIds: { $in: studentIds } },
      { registrationId: { $in: registrationIds } },
    ];
  }

  const [candidates, total, grouped, registrationTotal] = await Promise.all([
    roundCandidateModel.find(filter)
      .populate("studentId", "name email programme branch year enrollmentNumber phoneNumber profilePicture")
      .populate("participantIds", "name email programme branch year enrollmentNumber phoneNumber profilePicture")
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    roundCandidateModel.countDocuments(filter),
    roundCandidateModel.aggregate([
      { $match: { eventId: event._id, verticalId: vertical?._id, status: { $nin: ["revoked", "withdrawn"] } } },
      { $group: { _id: { roundId: "$roundId", status: "$status" }, count: { $sum: 1 } } },
    ]),
    registerationEventModel.countDocuments({ eventId: event._id, verticalId: vertical?._id, overallStatus: { $ne: "withdrawn" } }),
  ]);

  const registrationIds = [...new Set(candidates.map((candidate) => String(candidate.registrationId)))];
  const candidateIds = candidates.map((candidate) => candidate._id);
  const [registrations, submissions, slots] = await Promise.all([
    registerationEventModel.find({ _id: { $in: registrationIds } })
      .populate("studentId", "name email programme branch year academicYear academicStatus enrollmentNumber phoneNumber profilePicture")
      .populate("membersAccepted", "name email programme branch year academicYear academicStatus enrollmentNumber phoneNumber profilePicture")
      .lean(),
    roundSubmissionModel.find({ candidateId: { $in: candidateIds } })
      .populate("submittedBy", "name email")
      .sort({ submittedAt: -1 })
      .lean(),
    scheduleSlotModel.find({ candidateId: { $in: candidateIds }, status: { $ne: "cancelled" } })
      .populate("studentId", "name email")
      .populate("participantIds", "name email")
      .sort({ startAt: 1 })
      .lean(),
  ]);

  // When an event runs several verticals, reviewers need to see where else a
  // candidate stands before deciding. Display only: nothing here writes.
  let crossVertical = {};
  if ((event.verticals || []).length > 1) {
    const studentIds = [...new Set(candidates.flatMap((candidate) =>
      (candidate.participantIds || []).map((student) => String(student?._id || student))))];
    if (studentIds.length) {
      const otherMemberships = await eventMembershipModel.find({
        eventId: event._id,
        studentId: { $in: studentIds },
        verticalId: { $ne: vertical?._id },
      }).lean();
      const otherRegistrationIds = [...new Set(otherMemberships.map((membership) => String(membership.registrationId)))];
      const otherCandidates = otherRegistrationIds.length
        ? await roundCandidateModel.find({
          registrationId: { $in: otherRegistrationIds },
          status: { $ne: "revoked" },
        }).lean()
        : [];
      const byRegistration = new Map();
      for (const candidate of otherCandidates) {
        const key = String(candidate.registrationId);
        if (!byRegistration.has(key)) byRegistration.set(key, []);
        byRegistration.get(key).push(candidate);
      }
      const titles = new Map((event.verticals || []).map((item) => [String(item._id), item.title]));
      for (const membership of otherMemberships) {
        const key = String(membership.studentId);
        if (!crossVertical[key]) crossVertical[key] = [];
        crossVertical[key].push({
          verticalId: membership.verticalId,
          verticalTitle: titles.get(String(membership.verticalId)) || "",
          role: membership.role,
          status: studentApplicationStatus(
            event,
            byRegistration.get(String(membership.registrationId)) || [],
            membership.studentId,
            "in_progress",
            membership.verticalId,
          ),
        });
      }
    }
  }

  const roundCounts = {};
  for (const item of grouped) {
    const roundId = String(item._id.roundId);
    roundCounts[roundId] ||= { total: 0, statuses: {} };
    roundCounts[roundId].total += item.count;
    roundCounts[roundId].statuses[item._id.status] = item.count;
  }
  const finalRoundId = String(rounds.at(-1)?._id || "");
  return {
    registrations,
    candidates,
    submissions: secureSubmissions(submissions, "club"),
    slots,
    vertical,
    selectedVerticalId: vertical?._id || null,
    crossVertical,
    summary: {
      registrations: registrationTotal,
      roundCounts,
      finalSelectedCount: roundCounts[finalRoundId]?.statuses?.advanced || 0,
    },
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    selectedRoundId: selectedRound?._id || null,
  };
}

module.exports.getEventWorkflow = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const [data, targetEvents] = await Promise.all([
    workflowData(event, req.query),
    eventModel.find({ clubId: req.club._id, _id: { $ne: event._id }, status: { $ne: "archived" } })
      .select("title status rounds roundDetails numberOfRounds verticals verticalsEnabled")
      .sort({ createdAt: -1 }),
  ]);
  await Promise.all(targetEvents.map((target) => ensureEventVerticals(target)));
  return res.json({ success: true, event, ...data, targetEvents });
};

async function ensureLegacyRegistrationWorkflows(event, verticalId) {
  const registrations = await registerationEventModel.find({
    eventId: event._id,
    verticalId,
    overallStatus: { $ne: "withdrawn" },
  });
  if (!registrations.length) return 0;
  const represented = new Set((await roundCandidateModel.distinct("registrationId", {
    eventId: event._id,
    registrationId: { $in: registrations.map((registration) => registration._id) },
  })).map(String));
  const missing = registrations.filter((registration) => !represented.has(String(registration._id)));
  for (let index = 0; index < missing.length; index += 25) {
    await Promise.all(missing.slice(index, index + 25).map((registration) =>
      ensureRegistrationWorkflow(event, registration)));
  }
  return missing.length;
}

module.exports.remindIncompleteSubmissions = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  const vertical = round ? verticalForRound(event, round._id) : null;
  if (!event || !round || !vertical) {
    return res.status(404).json({ success: false, msg: "Event or round not found" });
  }
  if (event.status !== "published") {
    return res.status(409).json({ success: false, msg: "Reminders can be sent only while the event is published" });
  }
  if (!round.submissionEnabled && !["submission", "hackathon"].includes(round.type)) {
    return res.status(409).json({ success: false, msg: "This round does not collect an application submission" });
  }
  const deadline = new Date(round.submissionDeadlineAt);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    return res.status(409).json({ success: false, msg: "Set a future submission deadline before sending a reminder" });
  }

  const backfilledRegistrations = await ensureLegacyRegistrationWorkflows(event, vertical._id);
  const candidates = await roundCandidateModel.find({
    eventId: event._id,
    roundId: round._id,
    status: { $in: ACTIVE_DEADLINE_STATUSES },
  }).select("_id studentId participantIds status").lean();
  const submittedCandidateIds = candidates.length
    ? await roundSubmissionModel.distinct("candidateId", {
      eventId: event._id,
      roundId: round._id,
      candidateId: { $in: candidates.map((candidate) => candidate._id) },
    })
    : [];
  const recipientIds = incompleteSubmissionRecipientIds(candidates, submittedCandidateIds);
  if (!recipientIds.length) {
    return res.json({
      success: true,
      msg: "No incomplete active applications need a reminder",
      recipientCount: 0,
      queuedCount: 0,
      duplicateCount: 0,
      backfilledRegistrations,
    });
  }

  const notification = buildIncompleteSubmissionNotification({
    event,
    round,
    clubName: req.club.name || "the organising club",
  });
  const queued = await enqueueUniqueNotifications(recipientIds, notification, {
    channels: ["email"],
    dedupeKey: `submission-due:${event._id}:${round._id}:${deadline.toISOString()}`,
  });
  await writeAudit({
    actorRole: "club",
    actorId: req.club._id,
    action: "round.remind_incomplete_submissions",
    targetType: "round",
    targetId: round._id,
    metadata: { ...queued, eventId: event._id, backfilledRegistrations },
  });
  const msg = queued.queuedCount
    ? `Reminder email queued for ${queued.queuedCount} student${queued.queuedCount === 1 ? "" : "s"}${queued.duplicateCount ? `; ${queued.duplicateCount} already had this reminder` : ""}`
    : `All ${queued.recipientCount} incomplete applicant${queued.recipientCount === 1 ? " has" : "s have"} already been reminded for this deadline`;
  return res.json({ success: true, msg, ...queued, backfilledRegistrations });
};

function csvValue(value) {
  let text = value == null ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports.exportRoundCandidates = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  if (!event || !round) return res.status(404).json({ success: false, msg: "Event or round not found" });

  const filter = {
    eventId: event._id,
    roundId: round._id,
    status: req.query.status && req.query.status !== "all"
      ? req.query.status
      : { $nin: ["revoked", "withdrawn"] },
  };
  const search = String(req.query.search || "").trim().slice(0, 100);
  if (search) {
    const pattern = new RegExp(escapedRegex(search), "i");
    const [students, registrations] = await Promise.all([
      studentModel.find({ $or: [{ name: pattern }, { email: pattern }, { phoneNumber: pattern }, { enrollmentNumber: pattern }, { branch: pattern }] }).select("_id").limit(1000).lean(),
      registerationEventModel.find({ eventId: event._id, teamName: pattern }).select("_id").limit(1000).lean(),
    ]);
    const studentIds = students.map((student) => student._id);
    filter.$or = [
      { studentId: { $in: studentIds } },
      { participantIds: { $in: studentIds } },
      { registrationId: { $in: registrations.map((registration) => registration._id) } },
    ];
  }

  const candidates = await roundCandidateModel.find(filter)
    .populate("studentId", "name email enrollmentNumber phoneNumber programme branch year")
    .populate("participantIds", "name email enrollmentNumber phoneNumber programme branch year")
    .populate({
      path: "registrationId",
      select: "teamName studentId membersAccepted registeredAt overallStatus",
      populate: [
        { path: "studentId", select: "name email enrollmentNumber phoneNumber programme branch year" },
        { path: "membersAccepted", select: "name email enrollmentNumber phoneNumber programme branch year" },
      ],
    })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const submissions = await roundSubmissionModel.find({ candidateId: { $in: candidates.map((candidate) => candidate._id) } })
    .sort({ submittedAt: -1 })
    .lean();
  const byCandidate = new Map();
  submissions.forEach((submission) => {
    const key = String(submission.candidateId);
    if (!byCandidate.has(key)) byCandidate.set(key, submission);
  });
  const submissionFieldByKey = new Map((round.submissionFields || []).map((field) => [field.key, field]));

  const rows = [[
    "Round", "Evaluation", "Application / team", "Candidate", "Email", "Phone",
    "Enrollment", "Programme", "Branch / discipline", "Year", "All participants",
    "Round status", "Application status", "Score", "Reviewer notes", "Applied at",
    "Submitted at", "Submission answers", "Submission files",
  ]];
  candidates.forEach((candidate) => {
    const registration = candidate.registrationId;
    const person = candidate.scope === "participant" ? (candidate.studentId || candidate.participantIds?.[0]) : registration?.studentId;
    const participants = candidate.participantIds || [];
    const submission = byCandidate.get(String(candidate._id));
    rows.push([
      `${round.order}. ${round.title}`,
      candidate.scope === "participant" ? "Per student" : "Whole application/team",
      registration?.teamName || registration?.studentId?.name || "Application",
      candidate.scope === "participant" ? person?.name : registration?.studentId?.name,
      person?.email,
      person?.phoneNumber,
      person?.enrollmentNumber,
      person?.programme,
      person?.branch,
      person?.year,
      participants.map((student) => `${student.name} <${student.email}>`).join("; "),
      candidate.status,
      registration?.overallStatus,
      candidate.score,
      candidate.notes,
      registration?.registeredAt ? new Date(registration.registeredAt).toISOString() : "",
      submission?.submittedAt ? new Date(submission.submittedAt).toISOString() : "",
      (submission?.answers || []).map((answer) => {
        const field = submissionFieldByKey.get(answer.key);
        const value = field?.type === "boolean" ? (answer.value === "true" ? "Yes" : "No") : answer.value;
        return `${field?.label || answer.key}: ${value}`;
      }).join(" | "),
      (submission?.files || []).map((file) => file.originalName || file.fieldKey || "Protected attachment").join(" | "),
    ]);
  });

  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  const eventName = String(event.title).replace(/[^a-z0-9_-]/gi, "_");
  const roundName = String(round.title).replace(/[^a-z0-9_-]/gi, "_");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${eventName}-${roundName}-applications.csv"`);
  return res.send(`\uFEFF${csv}`);
};

async function recomputeRegistrationProgress(event, registrationId) {
  const candidates = await roundCandidateModel.find({ registrationId, status: { $ne: "revoked" } });
  if (!candidates.length) return;
  const registration = await registerationEventModel.findById(registrationId);
  if (!registration || registration.overallStatus === "withdrawn") return;

  const rounds = verticalRounds(event, registration.verticalId);
  const roundOrder = new Map(rounds.map((round) => [String(round._id), round.order]));
  const highestOrder = Math.max(...candidates.map((candidate) => roundOrder.get(String(candidate.roundId)) || 0));
  const highestRound = rounds.find((round) => round.order === highestOrder);
  const currentCandidates = candidates.filter((candidate) => String(candidate.roundId) === String(highestRound?._id));
  const finalRound = highestOrder === rounds.length;
  const terminalRejections = new Set(["rejected", "missed", "withdrawn"]);

  registration.currentRound = highestOrder || registration.currentRound;
  registration.currentRoundId = highestRound?._id || registration.currentRoundId;
  if (finalRound && currentCandidates.some((candidate) => candidate.status === "advanced")) {
    registration.overallStatus = "selected";
  } else if (currentCandidates.length && currentCandidates.every((candidate) => terminalRejections.has(candidate.status))) {
    registration.overallStatus = "rejected";
  } else if (
    currentCandidates.some((candidate) => candidate.status === "waitlisted")
    && currentCandidates.every((candidate) => candidate.status === "waitlisted" || terminalRejections.has(candidate.status))
  ) {
    registration.overallStatus = "waitlisted";
  } else {
    registration.overallStatus = "in_progress";
  }
  await registration.save();
}

module.exports.publishRoundDecisions = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  if (!event || !round) return res.status(404).json({ success: false, msg: "Event or round not found" });

  const requested = req.body.decisions.slice(0, 250);
  const candidateIds = requested.map((decision) => decision.candidateId);
  const candidates = await roundCandidateModel.find({
    _id: { $in: candidateIds },
    eventId: event._id,
    roundId: round._id,
    status: { $nin: ["withdrawn", "revoked"] },
  });
  const byId = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
  const affectedRegistrations = new Set();
  const teamDecisionUpdates = new Map();
  const results = [];

  for (const decision of requested) {
    const candidate = byId.get(String(decision.candidateId));
    if (!candidate) continue;
    const previousStatus = candidate.status;
    candidate.status = decision.status;
    candidate.score = decision.score === "" || decision.score == null ? null : Number(decision.score);
    candidate.notes = decision.notes == null || decision.notes === "" ? null : String(decision.notes).slice(0, 4000);
    candidate.decisionPublishedAt = new Date();
    await candidate.save();
    affectedRegistrations.add(String(candidate.registrationId));

    const registration = await registerationEventModel.findById(candidate.registrationId);
    if (previousStatus === "advanced" && decision.status !== "advanced") {
      await revokeDownstreamCandidates(candidate);
    }
    if (decision.status === "advanced" && registration) {
      await advanceCandidate(event, registration, candidate);
    }
    if (registration) {
      const key = String(registration._id);
      if (!teamDecisionUpdates.has(key)) teamDecisionUpdates.set(key, { registration, decisions: [] });
      teamDecisionUpdates.get(key).decisions.push({
        status: decision.status,
        participantIds: (candidate.participantIds || []).map((studentId) => String(studentId?._id || studentId)),
      });
    }
    results.push(candidate);
  }

  await Promise.all([...affectedRegistrations].map((registrationId) =>
    recomputeRegistrationProgress(event, registrationId)));
  const finalRound = round.order === verticalRounds(event, verticalForRound(event, round._id)?._id).length;
  await Promise.all([...teamDecisionUpdates.values()].flatMap(({ registration, decisions }) =>
    registrationParticipantIds(registration).map((studentId) => {
      const own = decisions.filter((decision) => decision.participantIds.includes(String(studentId)));
      const primary = own[0];
      const status = primary?.status;
      const ownMessage = status === "advanced"
        ? (finalRound
          ? `Congratulations. You cleared ${round.title} and completed the selection process.`
          : `You cleared ${round.title} and can now access round ${round.order + 1}.`)
        : status === "waitlisted"
          ? `You are waitlisted after ${round.title}. The club will notify you when a final decision is made.`
          : status === "rejected"
            ? `Your application will not move forward after ${round.title}.`
            : null;
      return notifyStudent(studentId, {
        type: status === "advanced" ? "round_advanced" : status === "waitlisted" ? "round_waitlisted" : status === "rejected" ? "round_rejected" : "team_round_update",
        title: status === "advanced"
          ? (finalRound ? `Selected for ${event.title}` : `Advanced in ${event.title}`)
          : status === "waitlisted"
            ? `Waitlisted in ${event.title}`
            : status === "rejected"
              ? `Update for ${event.title}`
              : `Team results published for ${event.title}`,
        message: ownMessage || `${round.title} results were published for one or more members of your team. Open the event to view every member's exact status.`,
        link: `/event/${event._id}`,
      });
    })));
  await writeAudit({
    actorRole: "club",
    actorId: req.club._id,
    action: "round.decisions_publish",
    targetType: "round",
    targetId: round._id,
    metadata: { eventId: event._id, count: results.length },
  });
  return res.json({ success: true, msg: `${results.length} decision(s) published`, candidates: results });
};

module.exports.updateCandidateReview = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  if (!event || !round) return res.status(404).json({ success: false, msg: "Event or round not found" });
  const candidate = await roundCandidateModel.findOne({
    _id: req.params.candidateId,
    eventId: event._id,
    roundId: round._id,
  });
  if (!candidate) return res.status(404).json({ success: false, msg: "Candidate not found" });
  candidate.score = req.body.score === "" || req.body.score == null ? null : Number(req.body.score);
  candidate.notes = req.body.notes == null || req.body.notes === "" ? null : String(req.body.notes).slice(0, 4000);
  await candidate.save();
  await writeAudit({
    actorRole: "club",
    actorId: req.club._id,
    action: "round.review_save",
    targetType: "candidate",
    targetId: candidate._id,
    metadata: { eventId: event._id, roundId: round._id },
  });
  return res.json({ success: true, msg: "Score and notes saved", candidate });
};

module.exports.scheduleCandidate = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  if (!event || !round || round.scheduleMode !== "slots") {
    return res.status(404).json({ success: false, msg: "A slot-based round was not found" });
  }
  const candidate = await roundCandidateModel.findOne({
    _id: req.body.candidateId,
    eventId: event._id,
    roundId: round._id,
    status: { $in: ["eligible", "scheduled", "active", "submitted", "under_review"] },
  });
  if (!candidate) return res.status(404).json({ success: false, msg: "Candidate not found" });
  try {
    const slot = await upsertScheduleSlot({ candidate, ...req.body });
    await Promise.all([
      enqueueInterviewRemindersForSlot(slot, { roundType: round.type, reviveCompleted: true }),
      ...candidate.participantIds.map((studentId) => notifyStudent(studentId, {
        type: "round_scheduled",
        title: `${round.title} scheduled`,
        message: `Your ${round.title} slot for ${event.title} is ${new Date(slot.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}${slot.venue ? ` at ${slot.venue}` : ""}.`,
        link: `/event/${event._id}`,
        emailDetails: { startsAt: slot.startAt, venue: slot.venue, meetingUrl: slot.meetingUrl },
      })),
    ]);
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "round.slot_schedule", targetType: "slot", targetId: slot._id });
    return res.json({ success: true, msg: "Slot saved and participants notified", slot });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      msg: error.message || "Unable to schedule this slot",
      conflict: error.conflict || null,
    });
  }
};

module.exports.autoScheduleRound = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  const round = eventRound(event, req.params.roundId);
  if (!event || !round || round.scheduleMode !== "slots") {
    return res.status(404).json({ success: false, msg: "A slot-based round was not found" });
  }
  const candidates = await roundCandidateModel.find({
    _id: { $in: req.body.candidateIds.slice(0, 250) },
    eventId: event._id,
    roundId: round._id,
    status: { $in: ["eligible", "scheduled", "active", "submitted", "under_review"] },
  }).sort({ createdAt: 1 });
  try {
    const result = await autoScheduleCandidates({
      candidates,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      durationMinutes: req.body.durationMinutes || round.slotDurationMinutes,
      bufferMinutes: req.body.bufferMinutes ?? round.slotBufferMinutes,
      venue: req.body.venue || round.venue,
      meetingUrl: req.body.meetingUrl || round.meetingUrl,
    });
    await Promise.all([
      ...result.scheduled.map((slot) => enqueueInterviewRemindersForSlot(slot, {
        roundType: round.type,
        reviveCompleted: true,
      })),
      ...result.scheduled.flatMap((slot) => slot.participantIds.map((studentId) => notifyStudent(studentId, {
        type: "round_scheduled",
        title: `${round.title} scheduled`,
        message: `Your ${round.title} slot for ${event.title} is ${new Date(slot.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}${slot.venue ? ` at ${slot.venue}` : ""}.`,
        link: `/event/${event._id}`,
        emailDetails: { startsAt: slot.startAt, venue: slot.venue, meetingUrl: slot.meetingUrl },
      }))),
    ]);
    await writeAudit({
      actorRole: "club", actorId: req.club._id, action: "round.auto_schedule",
      targetType: "round", targetId: round._id,
      metadata: { scheduled: result.scheduled.length, unscheduled: result.unscheduled.length },
    });
    return res.json({
      success: true,
      msg: `${result.scheduled.length} slot(s) scheduled${result.unscheduled.length ? `; ${result.unscheduled.length} need another window` : ""}`,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, msg: error.message || "Unable to schedule candidates" });
  }
};

module.exports.cancelScheduleSlot = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const slot = await scheduleSlotModel.findOneAndUpdate(
    { _id: req.params.slotId, eventId: event._id },
    { status: "cancelled" },
    { new: true }
  );
  if (!slot) return res.status(404).json({ success: false, msg: "Slot not found" });
  await scheduleReservationModel.deleteMany({ slotId: slot._id });
  await roundCandidateModel.updateOne({ _id: slot.candidateId, status: "scheduled" }, { status: "eligible" });
  await Promise.all(slot.participantIds.map((studentId) => notifyStudent(studentId, {
    type: "round_schedule_cancelled",
    title: `Schedule changed for ${event.title}`,
    message: "Your previous slot was cancelled. The club will share a new schedule.",
    link: `/event/${event._id}`,
  })));
  return res.json({ success: true, msg: "Slot cancelled", slot });
};

async function createImportedRegistration({ targetEvent, targetVertical, targetRound, participantIds, sourceCandidate, sourceRegistration }) {
  const targetVerticalId = targetVertical._id;
  const existingMemberships = await eventMembershipModel.find({
    eventId: targetEvent._id,
    verticalId: targetVerticalId,
    studentId: { $in: participantIds },
  });
  const groups = new Map();
  for (const membership of existingMemberships) {
    const key = String(membership.registrationId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(membership.studentId);
  }
  const alreadyPlaced = new Set(existingMemberships.map((membership) => String(membership.studentId)));
  const free = participantIds.filter((studentId) => !alreadyPlaced.has(String(studentId)));

  if (free.length && targetVertical.registrationType !== "individual" && sourceCandidate.scope === "application") {
    const [captainId, ...members] = free;
    let registration = await registerationEventModel.findOne({
      eventId: targetEvent._id,
      verticalId: targetVerticalId,
      studentId: captainId,
      overallStatus: { $ne: "withdrawn" },
    });
    if (!registration) {
      registration = await registerationEventModel.create({
        eventId: targetEvent._id,
        verticalId: targetVerticalId,
        studentId: captainId,
        membersAccepted: members,
        teamName: sourceRegistration.teamName,
        numberOfRounds: targetVertical.rounds.length,
        currentRound: targetRound.order,
        currentRoundId: targetRound._id,
        overallStatus: "in_progress",
        source: {
          type: "extracted",
          eventId: sourceCandidate.eventId,
          verticalId: sourceCandidate.verticalId,
          roundId: sourceCandidate.roundId,
          registrationId: sourceCandidate.registrationId,
        },
      });
    }
    await ensureMembership({ eventId: targetEvent._id, verticalId: targetVerticalId, registrationId: registration._id, studentId: captainId, role: "captain" });
    await Promise.all(members.map((studentId) => ensureMembership({
      eventId: targetEvent._id, verticalId: targetVerticalId, registrationId: registration._id, studentId, role: "member",
    })));
    groups.set(String(registration._id), free);
  } else {
    for (const studentId of free) {
      let registration = await registerationEventModel.findOne({
        eventId: targetEvent._id,
        verticalId: targetVerticalId,
        studentId,
        overallStatus: { $ne: "withdrawn" },
      });
      if (!registration) {
        registration = await registerationEventModel.create({
          eventId: targetEvent._id,
          verticalId: targetVerticalId,
          studentId,
          numberOfRounds: targetVertical.rounds.length,
          currentRound: targetRound.order,
          currentRoundId: targetRound._id,
          overallStatus: "in_progress",
          source: {
            type: "extracted",
            eventId: sourceCandidate.eventId,
            verticalId: sourceCandidate.verticalId,
            roundId: sourceCandidate.roundId,
            registrationId: sourceCandidate.registrationId,
          },
        });
      }
      await ensureMembership({ eventId: targetEvent._id, verticalId: targetVerticalId, registrationId: registration._id, studentId, role: "captain" });
      groups.set(String(registration._id), [studentId]);
    }
  }

  const importedCandidates = [];
  for (const [registrationId, groupParticipants] of groups) {
    const registration = await registerationEventModel.findById(registrationId);
    if (!registration) continue;
    registration.currentRound = targetRound.order;
    registration.currentRoundId = targetRound._id;
    registration.overallStatus = "in_progress";
    await registration.save();
    const created = await createCandidatesForRound({
      event: targetEvent,
      round: targetRound,
      registration,
      participantIds: groupParticipants,
      sourceCandidateId: sourceCandidate._id,
    });
    importedCandidates.push(...created);
  }
  return importedCandidates;
}

module.exports.extractCandidates = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const [sourceEvent, targetEvent] = await Promise.all([
    ownedEvent(req.params.eventId, req.club._id),
    ownedEvent(req.body.targetEventId, req.club._id),
  ]);
  const sourceRound = eventRound(sourceEvent, req.params.roundId);
  const targetRound = eventRound(targetEvent, req.body.targetRoundId);
  const targetVertical = targetRound ? verticalForRound(targetEvent, targetRound._id) : null;
  if (!sourceEvent || !targetEvent || !sourceRound || !targetRound || !targetVertical) {
    return res.status(404).json({ success: false, msg: "Source or target event round was not found" });
  }
  const requested = req.body.candidateIds.slice(0, 250);
  const sourceCandidates = await roundCandidateModel.find({
    _id: { $in: requested },
    eventId: sourceEvent._id,
    roundId: sourceRound._id,
    status: "advanced",
  });
  // A page open since before a decision changed will still offer candidates
  // that have since been rejected, withdrawn or retired. Say so rather than
  // reporting a cheerful "0 created".
  if (!sourceCandidates.length) {
    return res.status(409).json({
      success: false,
      msg: `None of the ${requested.length} selected candidate(s) are still advanced in ${sourceRound.title}. Refresh the page and try again`,
    });
  }

  const imported = [];
  const withdrawn = [];
  const empty = [];
  for (const candidate of sourceCandidates) {
    const sourceRegistration = await registerationEventModel.findById(candidate.registrationId);
    if (!sourceRegistration) continue;
    // Someone who withdrew must not be pulled into another event.
    if (sourceRegistration.overallStatus === "withdrawn") {
      withdrawn.push(candidate._id);
      continue;
    }
    if (!candidate.participantIds?.length) {
      empty.push(candidate._id);
      continue;
    }
    const created = await createImportedRegistration({
      targetEvent,
      targetVertical,
      targetRound,
      participantIds: candidate.participantIds,
      sourceCandidate: candidate,
      sourceRegistration,
    });
    imported.push(...created);
    await Promise.all(candidate.participantIds.map((studentId) => notifyStudent(studentId, {
      type: "event_extracted",
      title: `Added to ${targetEvent.title}`,
      message: `Based on your result in ${sourceEvent.title}, you were added directly to ${targetRound.title}.`,
      link: `/event/${targetEvent._id}`,
    })));
  }
  await writeAudit({
    actorRole: "club", actorId: req.club._id, action: "round.extract_candidates",
    targetType: "round", targetId: targetRound._id,
    metadata: {
      sourceEventId: sourceEvent._id, sourceRoundId: sourceRound._id,
      targetVerticalId: targetVertical._id,
      imported: imported.length,
      skipped: withdrawn.length + empty.length,
    },
  });

  const reasons = [
    withdrawn.length ? `${withdrawn.length} withdrawn application(s)` : "",
    empty.length ? `${empty.length} application(s) with no active participants` : "",
  ].filter(Boolean).join(" and ");

  if (!imported.length) {
    return res.status(409).json({
      success: false,
      msg: reasons
        ? `Nothing was imported: skipped ${reasons}`
        : "Nothing was imported. The selected candidates are already in the target round",
    });
  }
  return res.json({
    success: true,
    msg: `${imported.length} candidate record(s) added to ${targetVertical.title} · ${targetRound.title}${reasons ? `; skipped ${reasons}` : ""}`,
    candidates: imported,
    skipped: withdrawn.length + empty.length,
  });
};

module.exports.getMyEventWorkflow = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ensureEventVerticals(await eventModel.findOne({
    _id: req.params.eventId,
    status: { $in: ["published", "closed", "cancelled"] },
  }).populate("clubId", "name clubLogo contactEmail website linkedin instagram"));
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });

  // A student can hold one application per vertical, so this returns every
  // application they have in this event rather than a single one.
  const memberships = await eventMembershipModel
    .find({ eventId: event._id, studentId: req.student._id })
    .sort({ joinedAt: 1 });
  if (!memberships.length) {
    return res.json({
      success: true, event, applications: [],
      registration: null, candidates: [], submissions: [], slots: [],
    });
  }

  const applications = [];
  for (const membership of memberships) {
    const registration = await registerationEventModel.findById(membership.registrationId)
      .populate("studentId", "name email")
      .populate("membersAccepted", "name email");
    if (!registration) continue;
    await ensureRegistrationWorkflow(event, registration);
    const candidates = await roundCandidateModel.find({
      eventId: event._id,
      registrationId: membership.registrationId,
      status: { $ne: "revoked" },
    }).populate("studentId", "name email profilePicture")
      .populate("participantIds", "name email profilePicture")
      .sort({ createdAt: 1 });
    const candidateIds = candidates.map((candidate) => candidate._id);
    const [submissions, slots] = await Promise.all([
      roundSubmissionModel.find({ candidateId: { $in: candidateIds } }).sort({ submittedAt: -1 }),
      scheduleSlotModel.find({ candidateId: { $in: candidateIds }, status: { $ne: "cancelled" } }).sort({ startAt: 1 }),
    ]);
    const vertical = eventVertical(event, registration.verticalId);
    applications.push({
      verticalId: registration.verticalId,
      verticalTitle: vertical?.title || event.title,
      membership,
      registration,
      studentOverallStatus: studentApplicationStatus(
        event, candidates, req.student._id, registration.overallStatus, registration.verticalId,
      ),
      candidates: candidates.map((candidate) => ({
        ...candidate.toObject(),
        canAct: (candidate.participantIds || []).some((student) => String(student?._id || student) === String(req.student._id)),
      })),
      submissions: secureSubmissions(submissions, "student"),
      slots,
    });
  }

  const [primary] = applications;
  return res.json({
    success: true,
    event,
    applications,
    // Flattened view of the first application, for clients that predate verticals.
    registration: primary?.registration || null,
    membership: primary?.membership || null,
    studentOverallStatus: primary?.studentOverallStatus || null,
    candidates: primary?.candidates || [],
    submissions: primary?.submissions || [],
    slots: primary?.slots || [],
  });
};

module.exports.submitRoundWork = async (req, res) => {
  if (invalidRequest(req, res)) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return;
  }
  const event = await ensureEventVerticals(await eventModel.findOne({
    _id: req.params.eventId,
    status: { $in: ["published", "closed"] },
  }));
  const round = eventRound(event, req.params.roundId);
  if (!event || !round || !round.submissionEnabled) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(404).json({ success: false, msg: "Submission round not found" });
  }
  const candidate = await roundCandidateModel.findOne({
    _id: req.body.candidateId,
    eventId: event._id,
    roundId: round._id,
    participantIds: req.student._id,
    status: { $nin: ["advanced", "rejected", "missed", "withdrawn", "waitlisted", "revoked"] },
  });
  if (!candidate) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(403).json({ success: false, msg: "You are not eligible to submit for this round" });
  }
  const now = new Date();
  if (round.submissionOpensAt && round.submissionOpensAt > now) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(400).json({ success: false, msg: "Submissions are not open yet" });
  }
  if (round.submissionDeadlineAt && round.submissionDeadlineAt < now) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(400).json({ success: false, msg: "The submission deadline has passed" });
  }

  try {
    const saved = await saveRoundSubmission({
      event,
      round,
      candidate,
      studentId: req.student._id,
      answersJSON: req.body.answersJSON,
      fileKeysJSON: req.body.fileKeysJSON,
      uploadedFiles: req.files || [],
    });
    await writeAudit({ actorRole: "student", actorId: req.student._id, action: "round.submit", targetType: "submission", targetId: saved.submission._id });
    return res.json({ success: true, msg: saved.existing ? "Submission updated" : "Submission received", submission: secureSubmission(saved.submission, "student") });
  } catch (error) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(error.status || 500).json({ success: false, msg: error.status ? error.message : "Could not save the submission" });
  }
};

module.exports.addWalkInAttendance = async (req, res) => {
  // Exported here only to keep workflow-related imports out of the legacy controller.
  return res.status(501).json({ success: false, msg: "Not implemented" });
};
