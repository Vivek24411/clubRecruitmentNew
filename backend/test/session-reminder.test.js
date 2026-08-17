const test = require("node:test");
const assert = require("node:assert/strict");
const jobModel = require("../src/models/job.model");
const {
  buildSessionReminderNotification,
  dateInKolkata,
  sessionReminderRunAt,
  sessionStartAt,
} = require("../src/services/jobQueue.services");
const { formatNotificationDateTime } = require("../src/services/student.services");

test("job records support scheduled session reminders", () => {
  assert.ok(jobModel.schema.path("type").enumValues.includes("session_reminder"));
});

test("session reminders are scheduled one hour before an IITR session", () => {
  const session = { date: "2026-08-20", time: "18:30" };
  assert.equal(sessionStartAt(session).toISOString(), "2026-08-20T13:00:00.000Z");
  assert.equal(
    sessionReminderRunAt(session, new Date("2026-08-20T08:00:00.000Z")).toISOString(),
    "2026-08-20T12:00:00.000Z",
  );
});

test("an RSVP made inside the final hour queues an immediate reminder", () => {
  const session = { date: "2026-08-20", time: "18:30" };
  const now = new Date("2026-08-20T12:30:00.000Z");
  assert.equal(sessionReminderRunAt(session, now).toISOString(), now.toISOString());
});

test("past or incomplete sessions do not queue reminders", () => {
  const now = new Date("2026-08-20T14:00:00.000Z");
  assert.equal(sessionReminderRunAt({ date: "2026-08-20", time: "18:30" }, now), null);
  assert.equal(sessionReminderRunAt({ date: "2026-08-20" }, now), null);
});

test("reminder dates are formatted for India in email content", () => {
  const formatted = formatNotificationDateTime("2026-08-20T13:00:00.000Z");
  assert.match(formatted, /20/);
  assert.match(formatted, /2026/);
  assert.match(formatted, /6:30/);
  assert.equal(dateInKolkata(new Date("2026-08-19T20:00:00.000Z")), "2026-08-20");
});

test("reminder email data contains the session name, time, and venue", () => {
  const session = {
    _id: "507f1f77bcf86cd799439011",
    title: "Robotics orientation",
    date: "2026-08-20",
    time: "18:30",
    venue: "L-2, Lecture Hall Complex",
  };
  const notification = buildSessionReminderNotification(session);
  assert.match(notification.title, /Robotics orientation/);
  assert.equal(notification.emailDetails.startsAt.toISOString(), "2026-08-20T13:00:00.000Z");
  assert.equal(notification.emailDetails.venue, "L-2, Lecture Hall Complex");
  assert.equal(notification.link, `/session/${session._id}`);
});
