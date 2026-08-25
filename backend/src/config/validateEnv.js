const { exactHttpOrigin, isLoopbackHostname, isPublicHttpsOrigin } = require("../utils/appOrigin");

function validateEnv() {
  const required = ["JWT_SECRET", "MONGODB_URI"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must contain at least 32 characters");
    console.warn("Security warning: JWT_SECRET should contain at least 32 characters");
  }
  if (!process.env.ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL)) throw new Error("ADMIN_EMAIL must be a valid email address");
  if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD_HASH or ADMIN_PASSWORD is required");
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD_HASH) throw new Error("ADMIN_PASSWORD_HASH is required in production");
  if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_ORIGINS) throw new Error("ALLOWED_ORIGINS is required in production");
  if (process.env.NODE_ENV === "production") {
    const productionServices = ["RESEND_API_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
    const missingServices = productionServices.filter((key) => !process.env[key]);
    if (missingServices.length) throw new Error(`Missing production service configuration: ${missingServices.join(", ")}`);
  }
  if (process.env.ALLOWED_ORIGINS) {
    for (const origin of process.env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)) {
      const parsed = exactHttpOrigin(origin);
      if (!parsed || origin === "*") {
        throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`);
      }
      if (process.env.NODE_ENV === "production" && (parsed.protocol !== "https:" || isLoopbackHostname(parsed.hostname))) {
        throw new Error(`Production ALLOWED_ORIGINS entries must be public HTTPS origins: ${origin}`);
      }
    }
  }
  const studentOriginRequired = process.env.NODE_ENV === "production"
    || Boolean(process.env.RESEND_API_KEY)
    || process.env.PUSH_NOTIFICATIONS_ENABLED === "true";
  if (studentOriginRequired && !process.env.STUDENT_APP_ORIGIN) {
    throw new Error("STUDENT_APP_ORIGIN is required when notifications are enabled");
  }
  if (process.env.STUDENT_APP_ORIGIN) {
    if (!exactHttpOrigin(process.env.STUDENT_APP_ORIGIN)) {
      throw new Error("STUDENT_APP_ORIGIN must be an exact HTTP(S) origin");
    }
    if ((process.env.NODE_ENV === "production" || process.env.RESEND_API_KEY)
      && !isPublicHttpsOrigin(process.env.STUDENT_APP_ORIGIN)) {
      throw new Error("STUDENT_APP_ORIGIN must be a public HTTPS origin when email delivery or production mode is enabled");
    }
  }
  if (process.env.EMAIL_APP_ORIGIN
    && (!exactHttpOrigin(process.env.EMAIL_APP_ORIGIN) || !isPublicHttpsOrigin(process.env.EMAIL_APP_ORIGIN))) {
    throw new Error("EMAIL_APP_ORIGIN must be an exact public HTTPS origin");
  }
  if (process.env.TRUST_PROXY_HOPS && (!Number.isInteger(Number(process.env.TRUST_PROXY_HOPS)) || Number(process.env.TRUST_PROXY_HOPS) < 0)) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }
  if (process.env.SESSION_MAX_AGE_MS && (!Number.isFinite(Number(process.env.SESSION_MAX_AGE_MS)) || Number(process.env.SESSION_MAX_AGE_MS) <= 0)) {
    throw new Error("SESSION_MAX_AGE_MS must be a positive number");
  }
  if (process.env.PUSH_NOTIFICATIONS_ENABLED === "true") {
    if (!process.env.FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is required when push notifications are enabled");
    const hasFirebaseCredential = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
      || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!hasFirebaseCredential) throw new Error("Firebase service-account credentials are required when push notifications are enabled");
    let serviceAccountProjectId = "";
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const account = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"));
        serviceAccountProjectId = account.project_id || account.projectId || "";
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        serviceAccountProjectId = account.project_id || account.projectId || "";
      }
    } catch {
      throw new Error("Firebase service-account credentials are not valid JSON");
    }
    if (serviceAccountProjectId && serviceAccountProjectId !== process.env.FIREBASE_PROJECT_ID) {
      throw new Error("FIREBASE_PROJECT_ID must match the Firebase service-account project");
    }
  }
}

module.exports = validateEnv;
