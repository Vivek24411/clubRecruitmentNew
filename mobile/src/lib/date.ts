export function sessionStart(session: { date?: string; time?: string }) {
  if (!session.date) return null;
  const value = new Date(`${String(session.date).slice(0, 10)}T${session.time || '00:00'}:00+05:30`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function sessionEnd(session: { date?: string; time?: string; duration?: number | string }) {
  const start = sessionStart(session);
  if (!start) return null;
  const minutes = Number(session.duration);
  if (!Number.isFinite(minutes) || minutes <= 0) return start;
  return new Date(start.getTime() + minutes * 60_000);
}

export function sessionTiming(session: { date?: string; time?: string; duration?: number | string }, now = new Date()) {
  const startsAt = sessionStart(session);
  const endsAt = sessionEnd(session);
  if (!startsAt || !endsAt) return 'tba' as const;
  if (endsAt.getTime() <= now.getTime()) return 'past' as const;
  if (startsAt.getTime() <= now.getTime()) return 'ongoing' as const;
  return 'upcoming' as const;
}

export function eventDeadline(event: { registrationDeadlineAt?: string | null; registerationDeadline?: string }) {
  if (event.registrationDeadlineAt) {
    const value = new Date(event.registrationDeadlineAt);
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (!event.registerationDeadline) return null;
  const value = new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function eventIsOpen(event: { status?: string; registrationDeadlineAt?: string | null; registerationDeadline?: string }, now = new Date()) {
  const deadline = eventDeadline(event);
  return event.status === 'published' && Boolean(deadline && deadline.getTime() > now.getTime());
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return 'Date to be announced';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

export function formatSessionDate(session: { date?: string; time?: string }) {
  return formatDateTime(sessionStart(session));
}

export function formatDateOnly(value?: string | Date | null) {
  if (!value) return 'Date to be announced';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export function titleCase(value?: string) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
