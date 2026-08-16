const { applicationDefault, cert, getApps, initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const pushRegistrationModel = require("../models/pushRegistration.model");

let firebaseApp;

function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"));
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

function firebaseConfigured() {
  return Boolean(
    process.env.PUSH_NOTIFICATIONS_ENABLED === "true"
    && process.env.FIREBASE_PROJECT_ID
    && (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
      || process.env.GOOGLE_APPLICATION_CREDENTIALS),
  );
}

function messagingClient() {
  if (!firebaseConfigured()) return null;
  if (firebaseApp) return getMessaging(firebaseApp);
  const account = serviceAccount();
  firebaseApp = getApps()[0] || initializeApp({
    credential: account ? cert(account) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  return getMessaging(firebaseApp);
}

function notificationLink(link) {
  const path = String(link || "/notifications");
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/notifications";
  const origin = String(process.env.STUDENT_APP_ORIGIN || "").replace(/\/$/, "");
  return { path: safePath, absolute: origin ? `${origin}${safePath}` : "" };
}

const INVALID_REGISTRATION_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
  "messaging/registration-not-found",
]);

async function sendPushNotification(studentId, notification) {
  const client = messagingClient();
  if (!client) return { configured: false, sent: 0, failed: 0 };

  const registrations = await pushRegistrationModel.find({
    studentId,
    expiresAt: { $gt: new Date() },
  }).sort({ updatedAt: -1 }).limit(10).lean();
  if (!registrations.length) return { configured: true, sent: 0, failed: 0 };

  const target = notificationLink(notification.link);
  const title = String(notification.title || "Discovr update").slice(0, 120);
  const body = String(notification.message || "You have a new recruitment update.").slice(0, 500);
  let sent = 0;
  let failed = 0;
  const invalidIds = [];
  const deliveredIds = [];

  for (let offset = 0; offset < registrations.length; offset += 500) {
    const batch = registrations.slice(offset, offset + 500);
    const response = await client.sendEachForMulticast({
      fids: batch.map((registration) => registration.installationId),
      data: {
        title,
        body,
        link: target.path,
        type: String(notification.type || "general").slice(0, 80),
      },
      webpush: {
        headers: { Urgency: "high", TTL: "86400" },
        ...(target.absolute ? { fcmOptions: { link: target.absolute } } : {}),
      },
    });
    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((result, index) => {
      if (result.success) deliveredIds.push(batch[index]._id);
      else if (INVALID_REGISTRATION_CODES.has(result.error?.code)) invalidIds.push(batch[index]._id);
    });
  }

  await Promise.all([
    invalidIds.length ? pushRegistrationModel.deleteMany({ _id: { $in: invalidIds } }) : Promise.resolve(),
    deliveredIds.length ? pushRegistrationModel.updateMany(
      { _id: { $in: deliveredIds } },
      { $set: { lastDeliveredAt: new Date() } },
    ) : Promise.resolve(),
  ]);
  return { configured: true, sent, failed };
}

module.exports = { firebaseConfigured, sendPushNotification };
