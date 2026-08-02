export function eventDeadline(event) {
  if (event?.registrationDeadlineAt) return new Date(event.registrationDeadlineAt);
  if (!event?.registerationDeadline) return null;
  return new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
}

export function sessionDate(date, time = "00:00") {
  if (!date) return null;
  return new Date(`${date}T${time}:00+05:30`);
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
