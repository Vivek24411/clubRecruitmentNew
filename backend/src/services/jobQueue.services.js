const crypto = require("crypto");
const os = require("os");
const jobModel = require("../models/job.model");
const notificationModel = require("../models/notification.model");
const studentModel = require("../models/student.model");
const { sendNotificationEmail } = require("./student.services");
const { sendPushNotification } = require("./firebaseMessaging.services");

const workerId = `${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;

async function enqueueNotifications(studentIds, notification) {
  const recipients = [...new Set((studentIds || []).filter(Boolean).map(String))];
  if (!recipients.length) return [];
  return jobModel.insertMany(recipients.map((studentId) => ({
    type: "notification",
    payload: { studentId, notification },
  })), { ordered: false });
}

async function enqueueNotification(studentId, notification) {
  const [job] = await enqueueNotifications([studentId], notification);
  return job || null;
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
  if (!studentId || !notification) return;
  const student = await studentModel.findById(studentId).select("email notificationPreferences").lean();
  if (!student) return;
  const deliveryKey = `job:${job._id}`;
  const markDelivered = (channel) => jobModel.updateOne(
    { _id: job._id, lockedBy: workerId },
    { $set: { [`delivery.${channel}At`]: new Date(), updatedAt: new Date() } },
  );
  if (!job.delivery?.inAppAt) {
    if (student.notificationPreferences?.inApp !== false) {
      await notificationModel.updateOne(
        { deliveryKey },
        { $setOnInsert: { studentId, ...notification, deliveryKey } },
        { upsert: true },
      );
    }
    await markDelivered("inApp");
  }
  if (!job.delivery?.emailAt) {
    if (student.notificationPreferences?.email !== false) {
      await sendNotificationEmail(student.email, notification, { idempotencyKey: deliveryKey });
    }
    await markDelivered("email");
  }
  if (!job.delivery?.pushAt) {
    await sendPushNotification(studentId, notification);
    await markDelivered("push");
  }
}

async function processJob(job) {
  try {
    if (job.type === "notification") await deliverNotification(job);
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
  tick();
  return () => clearInterval(timer);
}

module.exports = { enqueueNotification, enqueueNotifications, startJobWorker };
