const crypto = require("crypto");

const startedAt = new Date();
const requestMetrics = {
  total: 0,
  errors: 0,
  durationsMs: [],
};

function log(level, event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function requestObservability(req, res, next) {
  const supplied = String(req.get("x-request-id") || "").trim();
  req.requestId = /^[A-Za-z0-9._:-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    requestMetrics.total += 1;
    if (res.statusCode >= 500) requestMetrics.errors += 1;
    requestMetrics.durationsMs.push(durationMs);
    if (requestMetrics.durationsMs.length > 500) requestMetrics.durationsMs.shift();
    log(res.statusCode >= 500 ? "error" : "info", "http.request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    });
  });
  next();
}

function metricsSnapshot() {
  const durations = [...requestMetrics.durationsMs].sort((a, b) => a - b);
  const percentile = (value) => durations.length
    ? Math.round(durations[Math.min(Math.floor(durations.length * value), durations.length - 1)] * 10) / 10
    : 0;
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    requests: {
      total: requestMetrics.total,
      errors: requestMetrics.errors,
      p50DurationMs: percentile(0.5),
      p95DurationMs: percentile(0.95),
    },
  };
}

module.exports = { log, metricsSnapshot, requestObservability };
