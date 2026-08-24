const clubModel = require("../models/club.model");
const eventModel = require("../models/event.model");
const sessionModel = require("../models/session.model");
const { notifyPushRegisteredStudents } = require("./notification.services");
const { sessionStartAt } = require("../utils/sessionSchedule");

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "details are available on Discovr";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function eventDeadline(event) {
  if (event?.registrationDeadlineAt) return new Date(event.registrationDeadlineAt);
  if (event?.registerationDeadline) return new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
  return null;
}

function safeImage(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function buildEventPublicationNotification(event, clubName) {
  const deadline = eventDeadline(event);
  return {
    type: "event_published",
    title: `New event: ${event.title}`,
    message: `${clubName} listed ${event.title}. ${deadline ? `Registration closes ${formatDateTime(deadline)}.` : "Open the event page for registration details."}`,
    link: `/event/${event._id}`,
    image: safeImage(event.eventBanner),
  };
}

function buildSessionPublicationNotification(session, clubName) {
  const startsAt = sessionStartAt(session);
  return {
    type: "session_published",
    title: `New session: ${session.title}`,
    message: `${clubName} listed ${session.title}. ${startsAt ? `Starts ${formatDateTime(startsAt)}.` : "Open the session page for schedule details."}`,
    link: `/session/${session._id}`,
    image: safeImage(session.sessionThumbnail),
  };
}

async function clubNameFor(item) {
  if (item?.clubId?.name) return item.clubId.name;
  const club = await clubModel.findById(item?.clubId).select("name").lean();
  return club?.name || "A Discovr club";
}

async function announceOnce({ model, item, buildNotification, kind }) {
  if (!item?._id || item.status !== "published") return [];
  const claimed = await model.findOneAndUpdate(
    { _id: item._id, status: "published", pushAnnouncementSentAt: null },
    { $set: { pushAnnouncementSentAt: new Date(), updatedAt: new Date() } },
    { new: true },
  );
  if (!claimed) return [];
  try {
    const clubName = await clubNameFor(claimed);
    return await notifyPushRegisteredStudents(buildNotification(claimed, clubName));
  } catch (error) {
    await model.updateOne({ _id: claimed._id }, { $set: { pushAnnouncementSentAt: null } });
    console.error(`${kind} publication push announcement failed:`, error?.message || error);
    return [];
  }
}

function announcePublishedEvent(event) {
  return announceOnce({ model: eventModel, item: event, buildNotification: buildEventPublicationNotification, kind: "Event" });
}

function announcePublishedSession(session) {
  return announceOnce({ model: sessionModel, item: session, buildNotification: buildSessionPublicationNotification, kind: "Session" });
}

module.exports = {
  announcePublishedEvent,
  announcePublishedSession,
  buildEventPublicationNotification,
  buildSessionPublicationNotification,
  eventDeadline,
  formatDateTime,
};
