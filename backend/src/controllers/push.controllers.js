const { validationResult } = require("express-validator");
const pushRegistrationModel = require("../models/pushRegistration.model");
const { firebaseConfigured } = require("../services/firebaseMessaging.services");
const { exactHttpOrigin } = require("../utils/appOrigin");

const REGISTRATION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_INSTALLATIONS_PER_STUDENT = 10;
const NATIVE_APP_ORIGIN = "discovr://native";

function pushAppOrigin(req) {
  if (!req.get("origin") && req.get("x-discovr-client") === "mobile") return NATIVE_APP_ORIGIN;
  const requested = exactHttpOrigin(req.get("origin"))?.origin || "";
  const configured = exactHttpOrigin(process.env.STUDENT_APP_ORIGIN)?.origin || "";
  if (!requested || (configured && requested !== configured)) return null;
  return configured || requested;
}

module.exports.registerPushInstallation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, msg: "Invalid push registration", errors: errors.array() });
  const appOrigin = pushAppOrigin(req);
  if (!appOrigin) return res.status(403).json({ success: false, msg: "Browser notifications are available only on the official Discovr student app" });

  const installationId = String(req.body.installationId).trim();
  const native = appOrigin === NATIVE_APP_ORIGIN;
  const provider = native ? "expo" : "fcm";
  if (req.body.provider && req.body.provider !== provider) {
    return res.status(400).json({ success: false, msg: "Push provider does not match this client" });
  }
  const now = new Date();
  const registration = await pushRegistrationModel.findOneAndUpdate(
    { installationId },
    {
      $set: {
        studentId: req.student._id,
        provider,
        appOrigin,
        userAgent: String(req.get("user-agent") || "").slice(0, 500),
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + REGISTRATION_TTL_MS),
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const installations = await pushRegistrationModel.find({ studentId: req.student._id })
    .select("_id")
    .sort({ updatedAt: -1 })
    .lean();
  const staleIds = installations.slice(MAX_INSTALLATIONS_PER_STUDENT).map((item) => item._id);
  if (staleIds.length) await pushRegistrationModel.deleteMany({ _id: { $in: staleIds } });

  return res.json({
    success: true,
    msg: native ? "Push notifications enabled on this device" : "Browser notifications enabled",
    registrationId: registration._id,
    deliveryConfigured: native || firebaseConfigured(),
  });
};

module.exports.unregisterPushInstallation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, msg: "Invalid push registration", errors: errors.array() });
  const appOrigin = pushAppOrigin(req);
  if (!appOrigin) return res.status(403).json({ success: false, msg: "Browser notifications are available only on the official Discovr student app" });
  await pushRegistrationModel.deleteOne({
    studentId: req.student._id,
    installationId: String(req.body.installationId).trim(),
    appOrigin,
  });
  return res.json({ success: true, msg: "Push notifications disabled on this device" });
};

module.exports.getPushInstallationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, msg: "Invalid push registration", errors: errors.array() });
  const appOrigin = pushAppOrigin(req);
  if (!appOrigin) return res.status(403).json({ success: false, msg: "Browser notifications are available only on the official Discovr student app" });
  const active = await pushRegistrationModel.exists({
    studentId: req.student._id,
    installationId: String(req.query.installationId).trim(),
    appOrigin,
    expiresAt: { $gt: new Date() },
  });
  return res.json({ success: true, active: Boolean(active), deliveryConfigured: appOrigin === NATIVE_APP_ORIGIN || firebaseConfigured() });
};

module.exports.pushAppOrigin = pushAppOrigin;
module.exports.NATIVE_APP_ORIGIN = NATIVE_APP_ORIGIN;
