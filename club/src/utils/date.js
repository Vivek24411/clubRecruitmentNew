export function eventDeadline(event) {
  if (event?.registrationDeadlineAt) return new Date(event.registrationDeadlineAt);
  if (!event?.registerationDeadline) return null;
  return new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
}

function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundEndDate(round) {
  return [round?.endsAt, round?.submissionDeadlineAt, round?.startsAt]
    .map(validDate)
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;
}

function finalRound(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return null;
  return [...rounds].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0)).at(-1);
}

export function eventEndDate(event) {
  const verticals = Array.isArray(event?.verticals) ? event.verticals : [];
  const finalRoundEnds = verticals
    .map((vertical) => roundEndDate(finalRound(vertical?.rounds)))
    .filter(Boolean);

  if (!finalRoundEnds.length) {
    const rounds = event?.rounds?.length ? event.rounds : event?.roundDetails;
    const end = roundEndDate(finalRound(rounds));
    if (end) finalRoundEnds.push(end);
  }

  return finalRoundEnds.sort((a, b) => b - a)[0] || eventDeadline(event);
}

export function eventIsOpen(event, now = new Date()) {
  if (event?.status !== "published") return false;
  const endsAt = eventEndDate(event);
  return !endsAt || endsAt > now;
}

export function eventApplicationsOpen(event, now = new Date()) {
  if (event?.status !== "published") return false;
  const deadline = eventDeadline(event);
  return !deadline || deadline > now;
}

export function sessionDate(date, time = "00:00") {
  if (!date) return null;
  return new Date(`${date}T${time}:00+05:30`);
}

export function sessionEndDate(session) {
  const startsAt = sessionDate(session?.date, session?.time);
  if (!startsAt || Number.isNaN(startsAt.getTime())) return null;
  const durationMinutes = Number(session?.duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return startsAt;
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

export function sessionIsOpen(session, now = new Date()) {
  if (session?.status !== "published") return false;
  const endsAt = sessionEndDate(session);
  return !endsAt || endsAt > now;
}

/**
 * Whole calendar days (in IST) between today and a deadline: 0 means it falls
 * today, 1 tomorrow, negative means it has passed. Counting calendar days
 * rather than elapsed milliseconds is what makes "closes today" reachable —
 * a plain ceil() of the difference rounds any part of today up to 1.
 */
export function daysUntil(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // en-CA formats as YYYY-MM-DD, so this is a date-only value in IST.
  const inIST = (input) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(input);
  const start = Date.parse(`${inIST(new Date())}T00:00:00Z`);
  const end = Date.parse(`${inIST(date)}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function formatDateTime(value, options = {}) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: options.dateOnly ? undefined : "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
