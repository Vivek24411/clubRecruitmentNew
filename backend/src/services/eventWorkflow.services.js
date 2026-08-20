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
    const evaluationScope = type === "test"
      ? "participant"
      : type === "interview"
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

function normalizeVerticals(input, defaults = {}) {
  const list = Array.isArray(input) ? input.slice(0, 20) : [];
  return list.map((vertical, index) => {
    const registrationType = ["individual", "team", "optional_team"].includes(vertical?.registrationType)
      ? vertical.registrationType
      : (defaults.registrationType || "team");
    const minTeamSize = registrationType === "individual"
      ? 1
      : Math.max(Number(vertical?.minTeamSize) || 1, 1);
    const maxTeamSize = registrationType === "individual"
      ? 1
      : Math.max(Number(vertical?.maxTeamSize) || minTeamSize, minTeamSize);
    return {
      // Existing verticals keep their _id: registrations, memberships and
      // candidates all point at it.
      ...(mongoose.isValidObjectId(vertical?._id) ? { _id: vertical._id } : {}),
      title: cleanString(vertical?.title || `Vertical ${index + 1}`, 120),
      shortDescription: cleanString(vertical?.shortDescription, 500),
      description: cleanString(vertical?.description, 5000),
      order: index + 1,
      isDefault: false,
      status: vertical?.status === "closed" ? "closed" : "open",
      registrationType,
      minTeamSize,
      maxTeamSize,
      maxParticipants: vertical?.maxParticipants ? Number(vertical.maxParticipants) : null,
      registrationDeadlineAt: cleanDate(vertical?.registrationDeadlineAt),
      eligibilityMode: ["undergraduate", "all_iitr"].includes(vertical?.eligibilityMode)
        ? vertical.eligibilityMode
        : null,
      programmeEligibility: Array.isArray(vertical?.programmeEligibility) ? vertical.programmeEligibility : [],
      rounds: normalizeRounds(vertical?.rounds).map((round) => ({
        ...round,
        evaluationScope: (registrationType === "individual" || round.type === "test")
          ? "participant"
          : round.evaluationScope,
      })),
    };
  });
}

async function ensureEventVerticals(eventOrId) {
  const event = typeof eventOrId === "string" || eventOrId?._bsontype
    ? await eventModel.findById(eventOrId)
    : eventOrId;
  if (!event) return null;
  let stale = false;
  if (!event.rounds?.length && event.roundDetails?.length) {
    event.rounds = normalizeRounds(event.roundDetails);
    stale = true;
  }
  // The model hook seeds a hidden default vertical from event.rounds, so a
  // bare save is enough to bring a pre-vertical event up to date.
  if (!event.verticals?.length) stale = true;
  if (stale) await event.save();
  return event;
}

// Resolves the vertical to work in. Passing no id means the first one, which
// is the hidden default on events that never enabled verticals.
function eventVertical(event, verticalId) {
  const verticals = event?.verticals || [];
  if (!verticals.length) return null;
  if (!verticalId) return verticals[0];
  return verticals.find((vertical) => String(vertical._id) === String(verticalId)) || null;
}

function verticalRounds(event, verticalId) {
  const vertical = eventVertical(event, verticalId);
  if (vertical) return vertical.rounds || [];
  return event?.rounds || [];
}

function verticalForRound(event, roundId) {
  return (event?.verticals || []).find((vertical) =>
    (vertical.rounds || []).some((round) => String(round._id) === String(roundId))) || null;
}

// Round ids are globally unique ObjectIds even though rounds are embedded, so
// a round always identifies exactly one vertical.
function eventRound(event, roundId) {
  for (const vertical of event?.verticals || []) {
    const round = (vertical.rounds || []).find((item) => String(item._id) === String(roundId));
    if (round) return round;
  }
  return (event?.rounds || []).find((round) => String(round._id) === String(roundId)) || null;
}

// A vertical inherits the event's rules unless it declares its own.
function verticalEligibilitySource(event, vertical) {
  if (!vertical?.eligibilityMode) return event;
  return {
    eligibilityMode: vertical.eligibilityMode,
    programmeEligibility: vertical.programmeEligibility,
    eligibilityYears: [],
  };
}

function verticalDeadlineAt(event, vertical) {
  return vertical?.registrationDeadlineAt || event?.registrationDeadlineAt || null;
}

function registrationVerticalId(event, registration, round = null) {
  return registration?.verticalId
    || (round ? verticalForRound(event, round._id)?._id : null)
    || event?.verticals?.[0]?._id
    || null;
}

function registrationParticipantIds(registration) {
  return [registration.studentId, ...(registration.membersAccepted || [])]
    .map((student) => student?._id || student)
    .filter(Boolean);
}

function candidateIncludesStudent(candidate, studentId) {
  const target = String(studentId?._id || studentId || "");
  if (!target) return false;
  if (candidate.scope === "participant") {
    return String(candidate.studentId?._id || candidate.studentId || "") === target;
  }
  return (candidate.participantIds || []).some((student) => String(student?._id || student) === target);
}

function studentApplicationStatus(event, candidates, studentId, fallback = "in_progress", verticalId = null) {
  if (fallback === "withdrawn") return "withdrawn";
  const relevant = (candidates || []).filter((candidate) =>
    candidate.status !== "revoked" && candidateIncludesStudent(candidate, studentId));
  if (!relevant.length) return fallback || "in_progress";

  const rounds = verticalRounds(event, verticalId || relevant[0]?.verticalId);
  const orderByRound = new Map(rounds.map((round) => [String(round._id), round.order]));
  const highestOrder = Math.max(...relevant.map((candidate) => orderByRound.get(String(candidate.roundId)) || 0));
  const current = relevant.filter((candidate) => (orderByRound.get(String(candidate.roundId)) || 0) === highestOrder);
  const finalRound = highestOrder === rounds.length;
  const statuses = current.map((candidate) => candidate.status);

  if (finalRound && statuses.includes("advanced")) return "selected";
  if (statuses.some((status) => status === "waitlisted")) return "waitlisted";
  if (statuses.length && statuses.every((status) => ["rejected", "missed", "withdrawn"].includes(status))) {
    return statuses.includes("withdrawn") ? "withdrawn" : "rejected";
  }
  return "in_progress";
}

async function createCandidatesForRound({ event, round, registration, participantIds, sourceCandidateId = null }) {
  const participants = (participantIds?.length ? participantIds : registrationParticipantIds(registration))
    .map((id) => id?._id || id);
  if (!participants.length) return [];
  const verticalId = registrationVerticalId(event, registration, round);
  if (round.evaluationScope === "participant") {
    return Promise.all(participants.map(async (studentId) => {
      const candidate = await roundCandidateModel.findOneAndUpdate(
        { eventId: event._id, roundId: round._id, registrationId: registration._id, studentId },
        {
          $setOnInsert: {
            eventId: event._id,
            verticalId,
            roundId: round._id,
            registrationId: registration._id,
            studentId,
            participantIds: [studentId],
            scope: "participant",
            status: "eligible",
            sourceCandidateId,
          },
          ...(sourceCandidateId ? { $addToSet: { sourceCandidateIds: sourceCandidateId } } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (candidate.status === "revoked") {
        candidate.status = "eligible";
        candidate.decisionPublishedAt = null;
        await candidate.save();
      }
      return candidate;
    }));
  }
  const candidate = await roundCandidateModel.findOneAndUpdate(
    { eventId: event._id, roundId: round._id, registrationId: registration._id, studentId: null },
    {
      $setOnInsert: {
        eventId: event._id,
        verticalId,
        roundId: round._id,
        registrationId: registration._id,
        studentId: null,
        scope: "application",
        status: "eligible",
        sourceCandidateId,
      },
      $addToSet: {
        participantIds: { $each: participants },
        ...(sourceCandidateId ? { sourceCandidateIds: sourceCandidateId } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (candidate.status === "revoked") {
    candidate.status = "eligible";
    candidate.decisionPublishedAt = null;
    await candidate.save();
  }
  return [candidate];
}

async function initializeRegistrationWorkflow(event, registration) {
  await ensureEventVerticals(event);
  const firstRound = verticalRounds(event, registration.verticalId)[0];
  if (!firstRound) return [];
  registration.currentRound = 1;
  registration.currentRoundId = firstRound._id;
  registration.overallStatus = "in_progress";
  await registration.save();
  return createCandidatesForRound({ event, round: firstRound, registration });
}

async function ensureRegistrationWorkflow(event, registration) {
  await ensureEventVerticals(event);
  const rounds = verticalRounds(event, registration.verticalId);
  if (!rounds.length || registration.overallStatus === "withdrawn") return [];
  const existing = await roundCandidateModel.find({ registrationId: registration._id }).limit(1);
  if (existing.length) return existing;
  const legacyIndex = Math.min(Math.max(Number(registration.currentRound || 1) - 1, 0), rounds.length - 1);
  const round = rounds[legacyIndex] || rounds[0];
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
  await ensureEventVerticals(event);
  const activeRound = eventRound(event, registration.currentRoundId)
    || verticalRounds(event, registration.verticalId)[Math.max(Number(registration.currentRound || 1) - 1, 0)];
  if (!activeRound) return [];
  return createCandidatesForRound({ event, round: activeRound, registration });
}

async function advanceCandidate(event, registration, candidate) {
  const currentRound = eventRound(event, candidate.roundId);
  if (!currentRound) return [];
  const nextRound = verticalRounds(event, registrationVerticalId(event, registration, currentRound))
    .find((round) => round.order === currentRound.order + 1);
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
    const existingSlot = await scheduleSlotModel.findOne({ candidateId: candidate._id });
    let placed = false;
    while (cursor.getTime() + duration * 60000 <= windowEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + duration * 60000);
      const conflict = await findScheduleConflict(candidate.participantIds, cursor, slotEnd, existingSlot?._id);
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

async function updateCandidateSlotParticipants(candidate, removedParticipantIds, cancel = false) {
  const removed = new Set(removedParticipantIds.map(String));
  const slots = await scheduleSlotModel.find({ candidateId: candidate._id, status: "scheduled" });
  for (const slot of slots) {
    const remaining = (slot.participantIds || []).filter((studentId) => !removed.has(String(studentId)));
    if (cancel || !remaining.length) {
      slot.status = "cancelled";
      await slot.save();
      await scheduleReservationModel.deleteMany({ slotId: slot._id });
      continue;
    }
    slot.participantIds = remaining;
    if (slot.studentId && removed.has(String(slot.studentId))) slot.studentId = null;
    await slot.save();
    await scheduleReservationModel.deleteMany({ slotId: slot._id, studentId: { $in: removedParticipantIds } });
  }
}

async function revokeDownstreamCandidates(sourceCandidate, removedParticipantIds = null) {
  if (!sourceCandidate) return [];
  const removedIds = (removedParticipantIds?.length
    ? removedParticipantIds
    : sourceCandidate.participantIds || []).map((studentId) => studentId?._id || studentId);
  const removed = new Set(removedIds.map(String));
  const children = await roundCandidateModel.find({
    $or: [
      { sourceCandidateId: sourceCandidate._id },
      { sourceCandidateIds: sourceCandidate._id },
    ],
  });
  const changed = [];
  for (const child of children) {
    const participantRemoved = child.scope === "participant"
      ? removed.has(String(child.studentId))
      : (child.participantIds || []).some((studentId) => removed.has(String(studentId)));
    if (!participantRemoved) continue;

    const originalParticipants = [...(child.participantIds || [])];
    const remainingParticipants = originalParticipants.filter((studentId) => !removed.has(String(studentId)));
    const sourceIds = (child.sourceCandidateIds || []).filter((candidateId) => String(candidateId) !== String(sourceCandidate._id));
    child.sourceCandidateIds = sourceIds;
    child.participantIds = remainingParticipants;
    const shouldRevoke = child.scope === "participant" || remainingParticipants.length === 0;
    if (shouldRevoke) {
      child.status = "revoked";
      child.decisionPublishedAt = new Date();
    }
    await child.save();
    await updateCandidateSlotParticipants(child, removedIds, shouldRevoke);
    changed.push(child);

    if (shouldRevoke || child.status === "advanced") {
      await revokeDownstreamCandidates(child, removedIds);
    }
  }
  return changed;
}

async function removeParticipantFromRegistrationWorkflow(registrationId, studentId, status = "withdrawn") {
  const candidates = await roundCandidateModel.find({ registrationId, participantIds: studentId });
  for (const candidate of candidates) {
    if (candidate.status === "advanced") await revokeDownstreamCandidates(candidate, [studentId]);
    if (candidate.scope === "participant" && String(candidate.studentId) === String(studentId)) {
      candidate.status = status;
    }
    candidate.participantIds = (candidate.participantIds || []).filter((id) => String(id) !== String(studentId));
    if (!candidate.participantIds.length) candidate.status = status;
    await candidate.save();
    await updateCandidateSlotParticipants(candidate, [studentId], !candidate.participantIds.length);
    await revokeDownstreamCandidates(candidate, [studentId]);
  }
}

async function withdrawRegistrationWorkflow(registrationId) {
  // Withdrawing retires the whole application, including rounds the club had
  // already decided. Leaving an "advanced" candidate behind kept the student
  // in the club's active workspace after they had left, and disagreed with
  // removeParticipantFromRegistrationWorkflow, which already overwrites a
  // decided status when a single participant leaves. Scores, notes and
  // decisionPublishedAt stay on the record, so the decision is still auditable.
  // "revoked" is a system state rather than a decision, so it is left alone.
  const candidates = await roundCandidateModel.find({
    registrationId,
    status: { $ne: "revoked" },
  });
  for (const candidate of candidates) {
    candidate.status = "withdrawn";
    await candidate.save();
    await updateCandidateSlotParticipants(candidate, candidate.participantIds || [], true);
  }
}

async function ensureMembership({ eventId, verticalId, registrationId, studentId, role }) {
  return eventMembershipModel.findOneAndUpdate(
    { eventId, verticalId, studentId },
    { $setOnInsert: { eventId, verticalId, registrationId, studentId, role, joinedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = {
  advanceCandidate,
  autoScheduleCandidates,
  cleanDate,
  createCandidatesForRound,
  ensureEventVerticals,
  ensureRegistrationWorkflow,
  ensureMembership,
  eventRound,
  eventVertical,
  verticalRounds,
  verticalForRound,
  verticalEligibilitySource,
  verticalDeadlineAt,
  registrationVerticalId,
  normalizeVerticals,
  findScheduleConflict,
  initializeRegistrationWorkflow,
  normalizeRounds,
  removeParticipantFromRegistrationWorkflow,
  registrationParticipantIds,
  candidateIncludesStudent,
  studentApplicationStatus,
  revokeDownstreamCandidates,
  syncRegistrationParticipants,
  upsertScheduleSlot,
  withdrawRegistrationWorkflow,
};
