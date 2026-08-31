const crypto = require("crypto");
const os = require("os");
const jobModel = require("../models/job.model");
const notificationModel = require("../models/notification.model");
const studentModel = require("../models/student.model");
const eventModel = require("../models/event.model");
const sessionModel = require("../models/session.model");
const sessionRsvpModel = require("../models/sessionRsvp.model");
const { sendNotificationEmail } = require("./student.services");
const { sendPushNotification } = require("./firebaseMessaging.services");
const { sessionStartAt } = require("../utils/sessionSchedule");
const { backfillRoundReminders, deliverRoundReminder } = require("./roundReminder.services");

const workerId = `${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;
const SESSION_REMINDER_LEAD_MS = 60 * 60 * 1000;

function sessionReminderRunAt(session, now = new Date()) {
  const startsAt = sessionStartAt(session);
  if (!startsAt || startsAt <= now) return null;
  return new Date(Math.max(now.getTime(), startsAt.getTime() - SESSION_REMINDER_LEAD_MS));
}

function sessionReminderJobId(studentId, sessionId, startsAt) {
  const digest = crypto
    .createHash("sha256")
    .update(`session-reminder:${sessionId}:${studentId}:${startsAt.toISOString()}`)
    .digest("hex")
    .slice(0, 24);
  return digest;
}

function buildSessionReminderNotification(session) {
  return {
    type: "session_reminder",
    title: `Reminder: ${session.title} is coming up`,
    message: "The session you RSVP'd for starts soon.",
    link: `/session/${session._id}`,
    emailDetails: { startsAt: sessionStartAt(session), venue: session.venue, meetingUrl: session.meetingUrl },
  };
}

async function enqueueSessionReminder(studentId, session, options = {}) {
  const now = options.now || new Date();
  const startsAt = sessionStartAt(session);
  const runAt = sessionReminderRunAt(session, now);
  if (!studentId || !session?._id || session.status !== "published" || !startsAt || !runAt) return null;

  const jobId = sessionReminderJobId(studentId, session._id, startsAt);
  const job = await jobModel.findOneAndUpdate(
    { _id: jobId },
    {
      $setOnInsert: {
        type: "session_reminder",
        payload: {
          studentId: String(studentId),
          sessionId: String(session._id),
          expectedStartsAt: startsAt.toISOString(),
        },
        status: "queued",
        runAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (["completed", "failed"].includes(job.status) && (!job.delivery?.emailAt || !job.delivery?.pushAt)) {
    return jobModel.findOneAndUpdate(
      { _id: jobId, status: job.status },
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

async function enqueueSessionReminders(studentIds, session, options = {}) {
  const recipients = [...new Set((studentIds || []).filter(Boolean).map(String))];
  return Promise.all(recipients.map((studentId) => enqueueSessionReminder(studentId, session, options)));
}

async function enqueueNotifications(studentIds, notification, options = {}) {
  const recipients = [...new Set((studentIds || []).filter(Boolean).map(String))];
  if (!recipients.length) return [];
  const requestedChannels = Array.isArray(options.channels)
    ? options.channels.filter((channel) => ["inApp", "email", "push"].includes(channel))
    : [];
  const channels = requestedChannels.length ? [...new Set(requestedChannels)] : ["inApp", "email", "push"];
  return jobModel.insertMany(recipients.map((studentId) => ({
    type: "notification",
    payload: { studentId, notification, channels },
  })), { ordered: false });
}

function notificationJobId(dedupeKey, studentId) {
  return crypto
    .createHash("sha256")
    .update(`notification:${dedupeKey}:${studentId}`)
    .digest("hex")
    .slice(0, 24);
}

async function enqueueUniqueNotifications(studentIds, notification, options = {}) {
  const recipients = [...new Set((studentIds || []).filter(Boolean).map(String))];
  const dedupeKey = String(options.dedupeKey || "").trim();
  if (!recipients.length || !dedupeKey) {
    return { recipientCount: recipients.length, queuedCount: 0, duplicateCount: 0 };
  }
  const requestedChannels = Array.isArray(options.channels)
    ? options.channels.filter((channel) => ["inApp", "email", "push"].includes(channel))
    : [];
  const channels = requestedChannels.length ? [...new Set(requestedChannels)] : ["inApp", "email", "push"];
  const now = new Date();
  const result = await jobModel.bulkWrite(recipients.map((studentId) => ({
    updateOne: {
      filter: { _id: notificationJobId(dedupeKey, studentId) },
      update: {
        $setOnInsert: {
          type: "notification",
          payload: { studentId, notification, channels },
          status: "queued",
          attempts: 0,
          maxAttempts: 8,
          runAt: now,
          createdAt: now,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  })), { ordered: false });
  const queuedCount = Number(result.upsertedCount) || 0;
  return {
    recipientCount: recipients.length,
    queuedCount,
    duplicateCount: recipients.length - queuedCount,
  };
}

async function enqueueNotification(studentId, notification, options = {}) {
  const [job] = await enqueueNotifications([studentId], notification, options);
  return job || null;
}

function notificationChannels(payload = {}) {
  // Publication announcements are catalogue discovery, not transactional
  // mail. Force old queued jobs (created before channels were persisted) to
  // remain browser-push-only as well as all newly queued announcements.
  if (payload.notification?.type === "event_published") return new Set(["push"]);
  const configured = Array.isArray(payload.channels)
    ? payload.channels.filter((channel) => ["inApp", "email", "push"].includes(channel))
    : [];
  return new Set(configured.length ? configured : ["inApp", "email", "push"]);
}

async function claimJob() {
  const now = new Date();
  const staleLock = new Date(now.getTime() - 5 * 60 * 1000);
  return jobModel.findOneAndUpdate(
    {
      $or: [
        { status: "queued", runAt: { $lte: now } },
        { status: "processing", lockedAt: { $lte: staleLock } },
      ],
    },
    {
      $set: { status: "processing", lockedAt: now, lockedBy: workerId, updatedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { runAt: 1, createdAt: 1 } },
  );
}

async function deliverNotification(job) {
  const { studentId, notification } = job.payload || {};
  const channels = notificationChannels(job.payload);
  if (!studentId || !notification) return;
  const eventLink = String(notification.link || "").match(/^\/event\/([a-f\d]{24})$/i);
  if (eventLink && !await eventModel.exists({
    _id: eventLink[1],
    status: { $in: ["published", "closed", "cancelled"] },
  })) return;
  const sessionLink = String(notification.link || "").match(/^\/session\/([a-f\d]{24})$/i);
  if (sessionLink && !await sessionModel.exists({
    _id: sessionLink[1],
    status: { $in: ["published", "cancelled", "completed"] },
  })) return;
  const student = await studentModel.findById(studentId).select("email notificationPreferences").lean();
  if (!student) return;
  const deliveryKey = `job:${job._id}`;
  const markDelivered = (channel) => jobModel.updateOne(
    { _id: job._id, lockedBy: workerId },
    { $set: { [`delivery.${channel}At`]: new Date(), updatedAt: new Date() } },
  );
  if (channels.has("inApp") && !job.delivery?.inAppAt) {
    if (student.notificationPreferences?.inApp !== false) {
      await notificationModel.updateOne(
        { deliveryKey },
        { $setOnInsert: { studentId, ...notification, deliveryKey } },
        { upsert: true },
      );
    }
    await markDelivered("inApp");
  }
  if (channels.has("push") && !job.delivery?.pushAt) {
    await sendPushNotification(studentId, notification);
    await markDelivered("push");
  }
  if (channels.has("email") && !job.delivery?.emailAt) {
    if (student.notificationPreferences?.email !== false) {
      await sendNotificationEmail(student.email, notification, { idempotencyKey: deliveryKey });
    }
    await markDelivered("email");
  }
}

async function deliverSessionReminder(job) {
  const { studentId, sessionId, expectedStartsAt } = job.payload || {};
  if (!studentId || !sessionId || !expectedStartsAt) return;

  const [session, rsvp, student] = await Promise.all([
    sessionModel.findById(sessionId).select("title date time venue meetingUrl status").lean(),
    sessionRsvpModel.findOne({ sessionId, studentId, status: "confirmed", source: { $ne: "walk_in" } }).select("_id").lean(),
    studentModel.findById(studentId).select("email notificationPreferences").lean(),
  ]);
  const startsAt = sessionStartAt(session);
  if (
    !session
    || session.status !== "published"
    || !rsvp
    || !student
    || !startsAt
    || startsAt <= new Date()
    || startsAt.toISOString() !== expectedStartsAt
  ) return;

  const notification = buildSessionReminderNotification(session);
  if (!job.delivery?.pushAt) {
    await sendPushNotification(studentId, notification);
    await jobModel.updateOne(
      { _id: job._id, lockedBy: workerId },
      { $set: { "delivery.pushAt": new Date(), updatedAt: new Date() } },
    );
  }
  if (!job.delivery?.emailAt) {
    if (student.notificationPreferences?.email !== false) {
      await sendNotificationEmail(
        student.email,
        notification,
        { idempotencyKey: `job:${job._id}` },
      );
    }
    await jobModel.updateOne(
      { _id: job._id, lockedBy: workerId },
      { $set: { "delivery.emailAt": new Date(), updatedAt: new Date() } },
    );
  }
}

async function processJob(job) {
  try {
    if (job.type === "notification") await deliverNotification(job);
    if (job.type === "session_reminder") await deliverSessionReminder(job);
    if (job.type === "round_reminder") await deliverRoundReminder(job, workerId);
    await jobModel.updateOne(
      { _id: job._id, lockedBy: workerId },
      { $set: { status: "completed", completedAt: new Date(), updatedAt: new Date() }, $unset: { lockedAt: 1, lockedBy: 1 } },
    );
  } catch (error) {
    const terminal = job.attempts >= job.maxAttempts;
    const delayMs = Math.min(60000 * (2 ** Math.max(job.attempts - 1, 0)), 6 * 60 * 60 * 1000);
    await jobModel.updateOne(
      { _id: job._id, lockedBy: workerId },
      {
        $set: {
          status: terminal ? "failed" : "queued",
          runAt: new Date(Date.now() + delayMs),
          lastError: String(error?.message || "Notification delivery failed").slice(0, 1000),
          updatedAt: new Date(),
        },
        $unset: { lockedAt: 1, lockedBy: 1 },
      },
    );
    if (terminal) console.error("Notification job permanently failed:", job._id, error?.message || error);
  }
}

function dateInKolkata(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function backfillSessionReminders() {
  const sessions = await sessionModel
    .find({ status: "published", date: { $gte: dateInKolkata() } })
    .select("title date time venue status")
    .lean();

  for (const session of sessions) {
    if (!sessionReminderRunAt(session)) continue;
    const rsvps = await sessionRsvpModel
      .find({ sessionId: session._id, status: "confirmed", source: { $ne: "walk_in" } })
      .select("studentId")
      .lean();
    await enqueueSessionReminders(rsvps.map((rsvp) => rsvp.studentId), session);
  }
}

function startJobWorker(options = {}) {
  const intervalMs = Math.max(Number(options.intervalMs ?? process.env.JOB_POLL_INTERVAL_MS) || 1000, 250);
  const batchSize = Math.min(Math.max(Number(options.batchSize ?? process.env.JOB_BATCH_SIZE) || 3, 1), 20);
  let active = false;
  const tick = async () => {
    if (active) return;
    active = true;
    try {
      const jobs = [];
      for (let index = 0; index < batchSize; index += 1) {
        const job = await claimJob();
        if (!job) break;
        jobs.push(job);
      }
      await Promise.all(jobs.map(processJob));
    } catch (error) {
      console.error("Job worker tick failed:", error?.message || error);
    } finally {
      active = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  const roundReminderBackfillIntervalMs = Math.max(
    Number(options.roundReminderBackfillIntervalMs ?? process.env.ROUND_REMINDER_BACKFILL_INTERVAL_MS) || 15 * 60 * 1000,
    60 * 1000,
  );
  const roundReminderTimer = setInterval(() => {
    backfillRoundReminders().catch((error) => {
      console.error("Round reminder backfill failed:", error?.message || error);
    });
  }, roundReminderBackfillIntervalMs);
  roundReminderTimer.unref();
  backfillSessionReminders().catch((error) => {
    console.error("Session reminder backfill failed:", error?.message || error);
  });
  backfillRoundReminders().catch((error) => {
    console.error("Round reminder backfill failed:", error?.message || error);
  });
  tick();
  return () => {
    clearInterval(timer);
    clearInterval(roundReminderTimer);
  };
}

module.exports = {
  backfillSessionReminders,
  buildSessionReminderNotification,
  dateInKolkata,
  enqueueNotification,
  enqueueNotifications,
  enqueueUniqueNotifications,
  notificationJobId,
  notificationChannels,
  enqueueSessionReminder,
  enqueueSessionReminders,
  sessionReminderRunAt,
  sessionStartAt,
  startJobWorker,
};
