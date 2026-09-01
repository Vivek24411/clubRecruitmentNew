const calendarBookmarkModel = require("../models/calendarBookmark.model");
const eventMembershipModel = require("../models/eventMembership.model");
const eventModel = require("../models/event.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const sessionModel = require("../models/session.model");
const sessionRsvpModel = require("../models/sessionRsvp.model");
const { sessionEndAt, sessionStartAt } = require("../utils/sessionSchedule");
const { isHttpUrl } = require("../utils/validation");

const safeUrl = (value) => isHttpUrl(value) ? String(value || "") : "";

function iso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function calendarWindow(query = {}) {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const defaultTo = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  const from = query.from ? new Date(query.from) : defaultFrom;
  const to = query.to ? new Date(query.to) : defaultTo;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    const error = new Error("Calendar date range is invalid");
    error.status = 400;
    throw error;
  }
  if (to - from > 2 * 366 * 24 * 60 * 60 * 1000) {
    const error = new Error("Calendar range cannot exceed two years");
    error.status = 400;
    throw error;
  }
  return { from, to };
}

function pushItem(items, range, item) {
  const startsAt = iso(item.startsAt);
  if (!startsAt) return;
  const start = new Date(startsAt);
  if (start < range.from || start > range.to) return;
  items.push({ ...item, startsAt, endsAt: iso(item.endsAt) });
}

function roundItems({ items, range, event, vertical, round, saved }) {
  const base = {
    sourceType: "event",
    sourceId: String(event._id),
    eventId: String(event._id),
    eventTitle: event.title,
    clubName: event.clubId?.name || "",
    verticalTitle: event.verticalsEnabled ? vertical?.title || "" : "",
    link: `/event/${event._id}`,
    venue: round.venue || "",
    meetingUrl: safeUrl(round.meetingUrl),
    saved,
  };
  if (round.startsAt) pushItem(items, range, {
    ...base,
    id: `round-start:${event._id}:${round._id}`,
    type: round.type === "interview" ? "round" : "round_start",
    title: `${round.title} · ${event.title}`,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
  });
  const deadline = round.submissionDeadlineAt || (round.submissionEnabled ? round.endsAt : null);
  if (deadline) pushItem(items, range, {
    ...base,
    id: `round-deadline:${event._id}:${round._id}`,
    type: "submission_deadline",
    title: `${round.title} deadline · ${event.title}`,
    startsAt: deadline,
    endsAt: null,
  });
}

async function getStudentCalendar(studentId, query = {}) {
  const range = calendarWindow(query);
  const [bookmarks, memberships, rsvps, slots] = await Promise.all([
    calendarBookmarkModel.find({ studentId }).lean(),
    eventMembershipModel.find({ studentId }).select("eventId verticalId").lean(),
    sessionRsvpModel.find({ studentId, status: { $in: ["confirmed", "waitlisted", "attended"] } }).select("sessionId status").lean(),
    scheduleSlotModel.find({
      status: "scheduled",
      startAt: { $gte: range.from, $lte: range.to },
      $or: [{ studentId }, { participantIds: studentId }],
    }).lean(),
  ]);

  const savedEventIds = new Set(bookmarks.filter((item) => item.sourceType === "event").map((item) => String(item.sourceId)));
  const savedSessionIds = new Set(bookmarks.filter((item) => item.sourceType === "session").map((item) => String(item.sourceId)));
  const verticalsByEvent = new Map();
  for (const membership of memberships) {
    const eventId = String(membership.eventId);
    if (!verticalsByEvent.has(eventId)) verticalsByEvent.set(eventId, new Set());
    verticalsByEvent.get(eventId).add(String(membership.verticalId));
  }
  const eventIds = [...new Set([...savedEventIds, ...verticalsByEvent.keys()])];
  const sessionIds = [...new Set([...savedSessionIds, ...rsvps.map((rsvp) => String(rsvp.sessionId))])];
  const [events, sessions] = await Promise.all([
    eventModel.find({ _id: { $in: eventIds }, status: { $in: ["published", "closed"] } })
      .populate("clubId", "name").lean(),
    sessionModel.find({ _id: { $in: sessionIds }, status: { $in: ["published", "completed"] } })
      .populate("clubId", "name").lean(),
  ]);

  const items = [];
  for (const event of events) {
    const eventId = String(event._id);
    const saved = savedEventIds.has(eventId);
    const selectedVerticalIds = verticalsByEvent.get(eventId) || new Set();
    const verticals = saved
      ? event.verticals || []
      : (event.verticals || []).filter((vertical) => selectedVerticalIds.has(String(vertical._id)));
    const eventDeadline = event.registrationDeadlineAt
      || (event.registerationDeadline ? `${event.registerationDeadline}T23:59:59.999+05:30` : null);
    if (eventDeadline) pushItem(items, range, {
      id: `registration-deadline:${event._id}`,
      type: "registration_deadline",
      title: `Registration deadline · ${event.title}`,
      startsAt: eventDeadline,
      endsAt: null,
      sourceType: "event",
      sourceId: eventId,
      eventId,
      eventTitle: event.title,
      clubName: event.clubId?.name || "",
      link: `/event/${event._id}`,
      saved,
    });
    for (const vertical of verticals) {
      for (const round of vertical.rounds || []) roundItems({ items, range, event, vertical, round, saved });
    }
  }

  const rsvpStatusBySession = new Map(rsvps.map((rsvp) => [String(rsvp.sessionId), rsvp.status]));
  for (const session of sessions) {
    const startsAt = sessionStartAt(session);
    pushItem(items, range, {
      id: `session:${session._id}`,
      type: "session",
      title: session.title,
      startsAt,
      endsAt: sessionEndAt(session),
      sourceType: "session",
      sourceId: String(session._id),
      sessionId: String(session._id),
      clubName: session.clubId?.name || "",
      link: `/session/${session._id}`,
      venue: session.venue || "",
      meetingUrl: safeUrl(session.meetingUrl),
      saved: savedSessionIds.has(String(session._id)),
      rsvpStatus: rsvpStatusBySession.get(String(session._id)) || null,
    });
  }

  const eventsById = new Map(events.map((event) => [String(event._id), event]));
  for (const slot of slots) {
    const event = eventsById.get(String(slot.eventId));
    pushItem(items, range, {
      id: `interview:${slot._id}`,
      type: "interview",
      title: `Interview${event?.title ? ` · ${event.title}` : ""}`,
      startsAt: slot.startAt,
      endsAt: slot.endAt,
      sourceType: "event",
      sourceId: String(slot.eventId),
      eventId: String(slot.eventId),
      eventTitle: event?.title || "",
      clubName: event?.clubId?.name || "",
      link: `/event/${slot.eventId}`,
      venue: slot.venue || "",
      meetingUrl: safeUrl(slot.meetingUrl),
      saved: savedEventIds.has(String(slot.eventId)),
    });
  }

  const unique = [...new Map(items.map((item) => [item.id, item])).values()]
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return { items: unique, bookmarks, range: { from: range.from.toISOString(), to: range.to.toISOString() } };
}

module.exports = { calendarWindow, getStudentCalendar };
