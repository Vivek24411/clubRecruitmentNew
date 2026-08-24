const test = require("node:test");
const assert = require("node:assert/strict");
const eventModel = require("../src/models/event.model");
const sessionModel = require("../src/models/session.model");
const pushRegistrationModel = require("../src/models/pushRegistration.model");
const jobModel = require("../src/models/job.model");
const { enqueueNotifications } = require("../src/services/jobQueue.services");
const { notifyPushRegisteredStudents } = require("../src/services/notification.services");
const {
  buildEventPublicationNotification,
  buildSessionPublicationNotification,
} = require("../src/services/publicationAnnouncement.services");

test("publication records and browser installations retain push announcement metadata", () => {
  assert.ok(eventModel.schema.path("pushAnnouncementSentAt"));
  assert.ok(sessionModel.schema.path("pushAnnouncementSentAt"));
  assert.equal(pushRegistrationModel.schema.path("appOrigin").options.required, true);
});

test("new event announcements include club, event, deadline, link, and artwork", () => {
  const notification = buildEventPublicationNotification({
    _id: "507f1f77bcf86cd799439011",
    title: "Developer Recruitment",
    registrationDeadlineAt: "2026-09-01T18:30:00.000Z",
    eventBanner: "https://images.example/event.webp",
  }, "Programming Club");
  assert.match(notification.title, /Developer Recruitment/);
  assert.match(notification.message, /Programming Club/);
  assert.match(notification.message, /Registration closes/);
  assert.equal(notification.link, "/event/507f1f77bcf86cd799439011");
  assert.equal(notification.image, "https://images.example/event.webp");
});

test("new session announcements include club, session, start time, and link", () => {
  const notification = buildSessionPublicationNotification({
    _id: "507f1f77bcf86cd799439012",
    title: "Meet the team",
    date: "2026-09-02",
    time: "18:30",
  }, "Programming Club");
  assert.match(notification.title, /Meet the team/);
  assert.match(notification.message, /Programming Club/);
  assert.match(notification.message, /Starts/);
  assert.equal(notification.link, "/session/507f1f77bcf86cd799439012");
});

test("notification jobs can be explicitly limited to browser push", async () => {
  const original = jobModel.insertMany;
  let inserted = [];
  jobModel.insertMany = async (documents) => { inserted = documents; return documents; };
  try {
    await enqueueNotifications(["507f1f77bcf86cd799439021"], { title: "Push only" }, { channels: ["push"] });
    assert.deepEqual(inserted[0].payload.channels, ["push"]);
  } finally {
    jobModel.insertMany = original;
  }
});

test("global announcements target only active installations on the configured student origin", async () => {
  const previousOrigin = process.env.STUDENT_APP_ORIGIN;
  const originalDistinct = pushRegistrationModel.distinct;
  const originalInsertMany = jobModel.insertMany;
  let filter;
  let inserted = [];
  process.env.STUDENT_APP_ORIGIN = "https://discovr.iitr.ac.in";
  pushRegistrationModel.distinct = async (_field, value) => {
    filter = value;
    return ["507f1f77bcf86cd799439031"];
  };
  jobModel.insertMany = async (documents) => { inserted = documents; return documents; };
  try {
    await notifyPushRegisteredStudents({ title: "New listing" });
    assert.equal(filter.appOrigin, "https://discovr.iitr.ac.in");
    assert.ok(filter.expiresAt.$gt instanceof Date);
    assert.deepEqual(inserted[0].payload.channels, ["push"]);
  } finally {
    pushRegistrationModel.distinct = originalDistinct;
    jobModel.insertMany = originalInsertMany;
    if (previousOrigin === undefined) delete process.env.STUDENT_APP_ORIGIN;
    else process.env.STUDENT_APP_ORIGIN = previousOrigin;
  }
});
