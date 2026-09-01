const test = require("node:test");
const assert = require("node:assert/strict");
const jobModel = require("../src/models/job.model");
const sessionModel = require("../src/models/session.model");
const { signDirectUpload, UPLOAD_KINDS } = require("../src/middlewares/directUpload");
const upload = require("../src/middlewares/upload");
const {
  buildSessionReminderNotification,
  dateInKolkata,
  sessionReminderRunAt,
  sessionStartAt,
} = require("../src/services/jobQueue.services");
const { formatNotificationDateTime } = require("../src/services/student.services");
const { sessionEndAt, sessionHasEnded } = require("../src/utils/sessionSchedule");
const { buildPublicAppUrl, isPublicHttpsOrigin } = require("../src/utils/appOrigin");
const validateEnv = require("../src/config/validateEnv");

test("job records support scheduled session reminders", () => {
  assert.ok(jobModel.schema.path("type").enumValues.includes("session_reminder"));
});

test("session reminders are scheduled two hours before an IITR session", () => {
  const session = { date: "2026-08-20", time: "18:30" };
  assert.equal(sessionStartAt(session).toISOString(), "2026-08-20T13:00:00.000Z");
  assert.equal(
    sessionReminderRunAt(session, new Date("2026-08-20T08:00:00.000Z")).toISOString(),
    "2026-08-20T11:00:00.000Z",
  );
});

test("a session remains active until its duration has elapsed", () => {
  const session = { date: "2026-08-20", time: "18:30", duration: "60" };
  assert.equal(sessionEndAt(session).toISOString(), "2026-08-20T14:00:00.000Z");
  assert.equal(sessionHasEnded(session, new Date("2026-08-20T13:59:59.000Z")), false);
  assert.equal(sessionHasEnded(session, new Date("2026-08-20T14:00:00.000Z")), true);
});

test("an RSVP made inside the final two hours queues an immediate reminder", () => {
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

test("reminder email data contains the session name, time, venue, and meeting link", () => {
  const session = {
    _id: "507f1f77bcf86cd799439011",
    title: "Robotics orientation",
    date: "2026-08-20",
    time: "18:30",
    venue: "L-2, Lecture Hall Complex",
    meetingUrl: "https://meet.google.com/example",
  };
  const notification = buildSessionReminderNotification(session);
  assert.match(notification.title, /Robotics orientation/);
  assert.equal(notification.emailDetails.startsAt.toISOString(), "2026-08-20T13:00:00.000Z");
  assert.equal(notification.emailDetails.venue, "L-2, Lecture Hall Complex");
  assert.equal(notification.emailDetails.meetingUrl, "https://meet.google.com/example");
  assert.equal(notification.link, `/session/${session._id}`);
});

test("email links use only a public HTTPS student origin", () => {
  const path = "/session/507f1f77bcf86cd799439011";
  assert.equal(
    buildPublicAppUrl(path, "https://discovr.devx6.live"),
    `https://discovr.devx6.live${path}`,
  );
  assert.equal(buildPublicAppUrl(path, "http://localhost:5173"), null);
  assert.equal(buildPublicAppUrl(path, "https://127.0.0.1"), null);
  assert.equal(buildPublicAppUrl(path, "https://[::1]"), null);
  assert.equal(buildPublicAppUrl("//evil.example/session", "https://discovr.devx6.live"), null);
  assert.equal(isPublicHttpsOrigin("https://discovr.devx6.live"), true);
  assert.equal(isPublicHttpsOrigin("http://discovr.devx6.live"), false);
});

test("startup rejects a localhost student origin when real email delivery is enabled", () => {
  const keys = [
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_PASSWORD_HASH",
    "JWT_SECRET",
    "MONGODB_URI",
    "NODE_ENV",
    "PUSH_NOTIFICATIONS_ENABLED",
    "RESEND_API_KEY",
    "STUDENT_APP_ORIGIN",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "development-only";
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
    process.env.MONGODB_URI = "mongodb://localhost/test";
    process.env.NODE_ENV = "development";
    process.env.PUSH_NOTIFICATIONS_ENABLED = "false";
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.STUDENT_APP_ORIGIN = "http://localhost:5173";
    assert.throws(validateEnv, /public HTTPS origin/);
  } finally {
    keys.forEach((key) => {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    });
  }
});

test("sessions support optional online access details", () => {
  assert.equal(sessionModel.schema.path("meetingUrl").options.maxlength, 2048);
  assert.equal(sessionModel.schema.path("venue").options.required, undefined);
  assert.equal(sessionModel.schema.path("longDescription").options.required, undefined);
});

test("club, event, and session banners allow files up to 20 MB", () => {
  const twentyMegabytes = 20 * 1024 * 1024;
  assert.equal(UPLOAD_KINDS.clubBanner.maxBytes, twentyMegabytes);
  assert.equal(UPLOAD_KINDS.eventBanner.maxBytes, twentyMegabytes);
  assert.equal(UPLOAD_KINDS.sessionThumbnail.maxBytes, twentyMegabytes);
  assert.equal(UPLOAD_KINDS.clubLogo.maxBytes, 5 * 1024 * 1024);
  assert.equal(upload.bannerUpload.limits.fileSize, twentyMegabytes);
  assert.equal(upload.limits.fileSize, 5 * 1024 * 1024);
});

test("submission limits match Cloudinary Free media limits", () => {
  assert.equal(UPLOAD_KINDS.submission.maxBytesByMimeType["image/jpeg"], 10 * 1024 * 1024);
  assert.equal(UPLOAD_KINDS.submission.maxBytesByMimeType["application/pdf"], 10 * 1024 * 1024);
  assert.equal(UPLOAD_KINDS.submission.maxBytesByMimeType["video/mp4"], 100 * 1024 * 1024);
});

test("upload signing reports the provider's lower image limit for client optimization", () => {
  const keys = ["JWT_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_MAX_IMAGE_BYTES"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.JWT_SECRET = "test-upload-token-secret";
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    delete process.env.CLOUDINARY_MAX_IMAGE_BYTES;
    let response;
    signDirectUpload(["sessionThumbnail"])(
      { body: { kind: "sessionThumbnail" }, club: { _id: "club-id" } },
      { json(payload) { response = payload; return payload; } },
      (error) => { throw error; },
    );
    assert.equal(response.upload.maxBytes, 20 * 1024 * 1024);
    assert.equal(response.upload.providerMaxBytes, 10 * 1024 * 1024);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
