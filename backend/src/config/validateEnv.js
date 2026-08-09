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
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin || origin === "*") {
        throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`);
      }
    }
  }
  if (process.env.STUDENT_APP_ORIGIN) {
    const studentOrigin = new URL(process.env.STUDENT_APP_ORIGIN);
    if (!["http:", "https:"].includes(studentOrigin.protocol) || studentOrigin.origin !== process.env.STUDENT_APP_ORIGIN) {
      throw new Error("STUDENT_APP_ORIGIN must be an exact HTTP(S) origin");
    }
  }
  if (process.env.TRUST_PROXY_HOPS && (!Number.isInteger(Number(process.env.TRUST_PROXY_HOPS)) || Number(process.env.TRUST_PROXY_HOPS) < 0)) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }
  if (process.env.SESSION_MAX_AGE_MS && (!Number.isFinite(Number(process.env.SESSION_MAX_AGE_MS)) || Number(process.env.SESSION_MAX_AGE_MS) <= 0)) {
    throw new Error("SESSION_MAX_AGE_MS must be a positive number");
  }
}

module.exports = validateEnv;
