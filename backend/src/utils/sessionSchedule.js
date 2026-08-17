const SESSION_TIME_ZONE_OFFSET = "+05:30";

function sessionStartAt(session) {
  const date = String(session?.date || "");
  const time = String(session?.time || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const startsAt = new Date(`${date}T${time}:00${SESSION_TIME_ZONE_OFFSET}`);
  return Number.isNaN(startsAt.getTime()) ? null : startsAt;
}

function sessionEndAt(session) {
  const startsAt = sessionStartAt(session);
  if (!startsAt) return null;
  const durationMinutes = Number(session?.duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return startsAt;
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

function sessionHasEnded(session, now = new Date()) {
  const endsAt = sessionEndAt(session);
  return Boolean(endsAt && endsAt <= now);
}

module.exports = { sessionEndAt, sessionHasEnded, sessionStartAt };
