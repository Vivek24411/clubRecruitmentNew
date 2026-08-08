export function eventDeadline(event) {
  if (event?.registrationDeadlineAt) return new Date(event.registrationDeadlineAt);
  if (!event?.registerationDeadline) return null;
  return new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
}

export function sessionDate(date, time = "00:00") {
  if (!date) return null;
  return new Date(`${date}T${time}:00+05:30`);
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
