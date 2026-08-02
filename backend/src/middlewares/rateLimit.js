const buckets = new Map();
const rateLimitBucketModel = require("../models/rateLimitBucket.model");

function requestIdentity(req, keyPrefix, keyGenerator) {
  const generated = keyGenerator?.(req);
  const identity = generated || req.ip || req.socket?.remoteAddress || "unknown";
  return `${keyPrefix}:${identity}`;
}

function rejectRequest(res, resetAt) {
  const retryAfter = Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000));
  res.set("Retry-After", String(retryAfter));
  return res.status(429).json({
    success: false,
    msg: "Too many requests. Please try again later.",
  });
}

async function consumePersistent(key, windowMs) {
  const now = new Date();
  const active = await rateLimitBucketModel.findOneAndUpdate(
    { key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true }
  );
  if (active) return active;

  const reset = await rateLimitBucketModel.findOneAndUpdate(
    { key, resetAt: { $lte: now } },
    { $set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } },
    { new: true }
  );
  if (reset) return reset;

  try {
    return await rateLimitBucketModel.create({
      key,
      count: 1,
      resetAt: new Date(now.getTime() + windowMs),
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return rateLimitBucketModel.findOneAndUpdate(
      { key, resetAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    );
  }
}

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, keyPrefix = "global", persistent = false, keyGenerator } = {}) {
  if (persistent) {
    return async (req, res, next) => {
      const key = requestIdentity(req, keyPrefix, keyGenerator);
      try {
        const current = await consumePersistent(key, windowMs);
        if (current && current.count > max) return rejectRequest(res, current.resetAt);
        return next();
      } catch (error) {
        console.error("Persistent rate limiter failed; using local fallback:", error?.message || "unknown error");
        const now = Date.now();
        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
          buckets.set(key, { count: 1, resetAt: now + windowMs });
          return next();
        }
        current.count += 1;
        if (current.count > max) return rejectRequest(res, current.resetAt);
        return next();
      }
    };
  }

  return (req, res, next) => {
    const now = Date.now();
    const key = requestIdentity(req, keyPrefix, keyGenerator);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      return rejectRequest(res, current.resetAt);
    }

    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = rateLimit;
