const { validationResult } = require("express-validator");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");
const eventMembershipModel = require("../models/eventMembership.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const roundSubmissionModel = require("../models/roundSubmission.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const scheduleReservationModel = require("../models/scheduleReservation.model");
const { notifyStudent } = require("../services/notification.services");
const { writeAudit } = require("../services/audit.services");
const { destroyCloudinaryAsset, destroyUploadedFile } = require("../utils/uploads");
const {
  advanceCandidate,
  autoScheduleCandidates,
  createCandidatesForRound,
  ensureEventRounds,
  ensureMembership,
  ensureRegistrationWorkflow,
  eventRound,
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
  return ensureEventRounds(event);
}

async function workflowData(event) {
  const registrations = await registerationEventModel.find({
    eventId: event._id,
    overallStatus: { $ne: "withdrawn" },
  })
      .populate("studentId", "name email branch year academicYear academicStatus enrollmentNumber phoneNumber profilePicture")
      .populate("membersAccepted", "name email branch year academicYear academicStatus enrollmentNumber phoneNumber profilePicture")
      .sort({ registeredAt: 1 });
  await Promise.all(registrations.map((registration) => ensureRegistrationWorkflow(event, registration)));
  const registrationIds = registrations.map((registration) => registration._id);
  const [candidates, submissions, slots] = await Promise.all([
    roundCandidateModel.find({
      eventId: event._id,
      registrationId: { $in: registrationIds },
      status: { $nin: ["revoked", "withdrawn"] },
    })
      .populate("studentId", "name email branch year enrollmentNumber phoneNumber profilePicture")
      .populate("participantIds", "name email branch year enrollmentNumber phoneNumber profilePicture")
      .sort({ createdAt: 1 }),
    roundSubmissionModel.find({ eventId: event._id, registrationId: { $in: registrationIds } })
      .populate("submittedBy", "name email")
      .sort({ submittedAt: -1 }),
    scheduleSlotModel.find({
      eventId: event._id,
      registrationId: { $in: registrationIds },
      status: { $ne: "cancelled" },
    })
      .populate("studentId", "name email")
      .populate("participantIds", "name email")
      .sort({ startAt: 1 }),
  ]);
  return { registrations, candidates, submissions, slots };
}

module.exports.getEventWorkflow = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const [data, targetEvents] = await Promise.all([
    workflowData(event),
    eventModel.find({ clubId: req.club._id, _id: { $ne: event._id }, status: { $ne: "archived" } })
      .select("title status rounds roundDetails numberOfRounds")
      .sort({ createdAt: -1 }),
  ]);
  await Promise.all(targetEvents.map((target) => ensureEventRounds(target)));
  return res.json({ success: true, event, ...data, targetEvents });
};

async function recomputeRegistrationProgress(event, registrationId) {
  const candidates = await roundCandidateModel.find({ registrationId, status: { $ne: "revoked" } });
  if (!candidates.length) return;
  const registration = await registerationEventModel.findById(registrationId);
  if (!registration || registration.overallStatus === "withdrawn") return;

  const roundOrder = new Map((event.rounds || []).map((round) => [String(round._id), round.order]));
  const highestOrder = Math.max(...candidates.map((candidate) => roundOrder.get(String(candidate.roundId)) || 0));
  const highestRound = event.rounds.find((round) => round.order === highestOrder);
  const currentCandidates = candidates.filter((candidate) => String(candidate.roundId) === String(highestRound?._id));
  const finalRound = highestOrder === event.rounds.length;
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
  const finalRound = round.order === event.rounds.length;
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
    await Promise.all(candidate.participantIds.map((studentId) => notifyStudent(studentId, {
      type: "round_scheduled",
      title: `${round.title} scheduled`,
      message: `Your ${round.title} slot for ${event.title} is ${new Date(slot.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}${slot.venue ? ` at ${slot.venue}` : ""}.`,
      link: `/event/${event._id}`,
      emailDetails: { startsAt: slot.startAt, venue: slot.venue, meetingUrl: slot.meetingUrl },
    })));
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
    await Promise.all(result.scheduled.flatMap((slot) => slot.participantIds.map((studentId) => notifyStudent(studentId, {
      type: "round_scheduled",
      title: `${round.title} scheduled`,
      message: `Your ${round.title} slot for ${event.title} is ${new Date(slot.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}${slot.venue ? ` at ${slot.venue}` : ""}.`,
      link: `/event/${event._id}`,
      emailDetails: { startsAt: slot.startAt, venue: slot.venue, meetingUrl: slot.meetingUrl },
    }))));
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

async function createImportedRegistration({ targetEvent, targetRound, participantIds, sourceCandidate, sourceRegistration }) {
  const existingMemberships = await eventMembershipModel.find({
    eventId: targetEvent._id,
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

  if (free.length && targetEvent.registrationType !== "individual" && sourceCandidate.scope === "application") {
    const [captainId, ...members] = free;
    let registration = await registerationEventModel.findOne({
      eventId: targetEvent._id,
      studentId: captainId,
      overallStatus: { $ne: "withdrawn" },
    });
    if (!registration) {
      registration = await registerationEventModel.create({
        eventId: targetEvent._id,
        studentId: captainId,
        membersAccepted: members,
        teamName: sourceRegistration.teamName,
        numberOfRounds: targetEvent.rounds.length,
        currentRound: targetRound.order,
        currentRoundId: targetRound._id,
        overallStatus: "in_progress",
        source: {
          type: "extracted",
          eventId: sourceCandidate.eventId,
          roundId: sourceCandidate.roundId,
          registrationId: sourceCandidate.registrationId,
        },
      });
    }
    await ensureMembership({ eventId: targetEvent._id, registrationId: registration._id, studentId: captainId, role: "captain" });
    await Promise.all(members.map((studentId) => ensureMembership({
      eventId: targetEvent._id, registrationId: registration._id, studentId, role: "member",
    })));
    groups.set(String(registration._id), free);
  } else {
    for (const studentId of free) {
      let registration = await registerationEventModel.findOne({
        eventId: targetEvent._id,
        studentId,
        overallStatus: { $ne: "withdrawn" },
      });
      if (!registration) {
        registration = await registerationEventModel.create({
          eventId: targetEvent._id,
          studentId,
          numberOfRounds: targetEvent.rounds.length,
          currentRound: targetRound.order,
          currentRoundId: targetRound._id,
          overallStatus: "in_progress",
          source: {
            type: "extracted",
            eventId: sourceCandidate.eventId,
            roundId: sourceCandidate.roundId,
            registrationId: sourceCandidate.registrationId,
          },
        });
      }
      await ensureMembership({ eventId: targetEvent._id, registrationId: registration._id, studentId, role: "captain" });
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
  if (!sourceEvent || !targetEvent || !sourceRound || !targetRound) {
    return res.status(404).json({ success: false, msg: "Source or target event round was not found" });
  }
  const sourceCandidates = await roundCandidateModel.find({
    _id: { $in: req.body.candidateIds.slice(0, 250) },
    eventId: sourceEvent._id,
    roundId: sourceRound._id,
    status: "advanced",
  });
  const imported = [];
  for (const candidate of sourceCandidates) {
    const sourceRegistration = await registerationEventModel.findById(candidate.registrationId);
    if (!sourceRegistration) continue;
    const created = await createImportedRegistration({
      targetEvent,
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
    metadata: { sourceEventId: sourceEvent._id, sourceRoundId: sourceRound._id, imported: imported.length },
  });
  return res.json({ success: true, msg: `${imported.length} target candidate record(s) created`, candidates: imported });
};

module.exports.getMyEventWorkflow = async (req, res) => {
  if (invalidRequest(req, res)) return;
  const event = await ensureEventRounds(await eventModel.findOne({
    _id: req.params.eventId,
    status: { $in: ["published", "closed", "cancelled"] },
  }).populate("clubId", "name clubLogo contactEmail website linkedin instagram"));
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const membership = await eventMembershipModel.findOne({ eventId: event._id, studentId: req.student._id });
  if (!membership) return res.json({ success: true, event, registration: null, candidates: [], submissions: [], slots: [] });
  const registration = await registerationEventModel.findById(membership.registrationId)
    .populate("studentId", "name email")
    .populate("membersAccepted", "name email");
  await ensureRegistrationWorkflow(event, registration);
  const candidates = await roundCandidateModel.find({
    eventId: event._id,
    registrationId: membership.registrationId,
    status: { $ne: "revoked" },
  }).populate("studentId", "name email profilePicture").populate("participantIds", "name email profilePicture").sort({ createdAt: 1 });
  const candidateIds = candidates.map((candidate) => candidate._id);
  const [submissions, slots] = await Promise.all([
    roundSubmissionModel.find({ candidateId: { $in: candidateIds } }).sort({ submittedAt: -1 }),
    scheduleSlotModel.find({ candidateId: { $in: candidateIds }, status: { $ne: "cancelled" } }).sort({ startAt: 1 }),
  ]);
  const candidatesWithAccess = candidates.map((candidate) => ({
    ...candidate.toObject(),
    canAct: (candidate.participantIds || []).some((student) => String(student?._id || student) === String(req.student._id)),
  }));
  return res.json({
    success: true,
    event,
    registration,
    membership,
    studentOverallStatus: studentApplicationStatus(event, candidates, req.student._id, registration.overallStatus),
    candidates: candidatesWithAccess,
    submissions,
    slots,
  });
};

module.exports.submitRoundWork = async (req, res) => {
  if (invalidRequest(req, res)) {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return;
  }
  const event = await ensureEventRounds(await eventModel.findOne({
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

  let answers;
  let fileKeys;
  try {
    answers = JSON.parse(req.body.answersJSON || "[]");
    fileKeys = JSON.parse(req.body.fileKeysJSON || "[]");
    if (!Array.isArray(answers) || !Array.isArray(fileKeys)) throw new Error();
  } catch {
    await Promise.all((req.files || []).map(destroyUploadedFile));
    return res.status(400).json({ success: false, msg: "Submission data is invalid" });
  }
  const cleanAnswers = answers.slice(0, 20).map((answer) => ({
    key: String(answer.key || "").slice(0, 80),
    value: String(answer.value || "").slice(0, 10000),
  }));
  const answerMap = new Map(cleanAnswers.map((answer) => [answer.key, answer.value.trim()]));
  const files = (req.files || []).map((file, index) => ({
    fieldKey: String(fileKeys[index] || "attachment").slice(0, 80),
    url: file.path,
    publicId: file.filename,
    resourceType: file.resourceType || (file.mimetype?.startsWith("video/") ? "video" : file.mimetype === "application/pdf" ? "raw" : "image"),
    format: file.format || "",
    originalName: file.originalName || file.originalname || "",
    mimeType: file.mimetype || "",
    bytes: file.size || 0,
  }));
  const existing = await roundSubmissionModel.findOne({ candidateId: candidate._id });
  if (existing && !round.allowResubmission) {
    await Promise.all(files.map((file) => destroyCloudinaryAsset(file.publicId, file.resourceType)));
    return res.status(409).json({ success: false, msg: "This round allows only one submission" });
  }
  const existingFilesByField = new Map((existing?.files || []).map((file) => [file.fieldKey, file]));
  const uploadedFields = new Set(files.map((file) => file.fieldKey));
  const missing = round.submissionFields.filter((field) => field.required && (
    ["file", "pdf", "video"].includes(field.type)
      ? !uploadedFields.has(field.key) && !existingFilesByField.has(field.key)
      : !answerMap.get(field.key)
  ));
  if (missing.length) {
    await Promise.all(files.map((file) => destroyCloudinaryAsset(file.publicId, file.resourceType)));
    return res.status(400).json({ success: false, msg: `Complete required field: ${missing[0].label}` });
  }

  const retainedFiles = (existing?.files || []).filter((file) => !uploadedFields.has(file.fieldKey));
  const submission = await roundSubmissionModel.findOneAndUpdate(
    { candidateId: candidate._id },
    {
      eventId: event._id,
      roundId: round._id,
      registrationId: candidate.registrationId,
      candidateId: candidate._id,
      submittedBy: req.student._id,
      answers: cleanAnswers,
      files: [...retainedFiles.map((file) => file.toObject ? file.toObject() : file), ...files],
      revision: (existing?.revision || 0) + 1,
      status: "submitted",
      submittedAt: now,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  const replaced = (existing?.files || []).filter((file) => uploadedFields.has(file.fieldKey));
  await Promise.all(replaced.map((file) => destroyCloudinaryAsset(file.publicId, file.resourceType)));
  candidate.status = "submitted";
  await candidate.save();
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "round.submit", targetType: "submission", targetId: submission._id });
  return res.json({ success: true, msg: existing ? "Submission updated" : "Submission received", submission });
};

module.exports.addWalkInAttendance = async (req, res) => {
  // Exported here only to keep workflow-related imports out of the legacy controller.
  return res.status(501).json({ success: false, msg: "Not implemented" });
};
