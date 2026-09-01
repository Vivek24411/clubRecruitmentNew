import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Page, PageHeader, Skeleton } from "../components/ui";
import { formatDateTime } from "../utils/date";

const TYPE_LABELS = {
  registration_deadline: "Registration",
  submission_deadline: "Submission",
  round_start: "Round",
  round: "Round",
  interview: "Interview",
  session: "Session",
};

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function escapeIcs(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function icsDate(value) {
  return new Date(value).toISOString().replaceAll("-", "").replaceAll(":", "").replace(".000", "");
}

function downloadCalendar(items) {
  const events = items.map((item) => [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(item.id)}@discovr.iitr.ac.in`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(item.startsAt)}`,
    item.endsAt ? `DTEND:${icsDate(item.endsAt)}` : "",
    `SUMMARY:${escapeIcs(item.title)}`,
    item.venue ? `LOCATION:${escapeIcs(item.venue)}` : "",
    `DESCRIPTION:${escapeIcs(`Open in Discovr: ${window.location.origin}${item.link}`)}`,
    "END:VEVENT",
  ].filter(Boolean).join("\r\n")).join("\r\n");
  const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Discovr//Student Calendar//EN\r\n${events}\r\nEND:VCALENDAR\r\n`], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "discovr-calendar.ics";
  anchor.click();
  URL.revokeObjectURL(href);
}

function googleCalendarUrl(item) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${icsDate(item.startsAt)}/${icsDate(item.endsAt || item.startsAt)}`,
    details: `Open in Discovr: ${window.location.origin}${item.link}`,
    location: item.venue || "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function monthCells(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells = Array(first.getDay()).fill(null);
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function Calendar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dateKey(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/calendar`);
      if (!data.success) throw new Error(data.msg);
      setItems(data.items || []);
    } catch (caught) {
      setError(caught.response?.data?.msg || caught.message || "Could not load your calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = dateKey(item.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [items]);
  const selectedItems = byDay.get(selected) || [];
  const upcoming = items.filter((item) => new Date(item.startsAt) >= new Date());
  const cells = monthCells(month);

  return (
    <Page>
      <PageHeader
        eyebrow="Your schedule"
        title="Discovr calendar"
        description="Applications, round deadlines, interviews, and sessions—kept together and reminded two hours before they begin."
        actions={<Button variant="secondary" disabled={!items.length} onClick={() => downloadCalendar(items)}>Export .ics</Button>}
      />

      {error && <Card className="mt-7 border-bad/25 bg-bad-tint p-4" role="alert"><p className="text-sm text-bad">{error}</p><Button className="mt-3" size="sm" variant="secondary" onClick={load}>Try again</Button></Card>}
      {loading ? <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]"><Skeleton className="h-[32rem]"/><Skeleton className="h-[32rem]"/></div> : !items.length ? (
        <EmptyState className="mt-8" title="Your calendar is ready" description="Apply to an event, RSVP to a session, or use Add to calendar on any event or session." action={<Button to="/events">Explore events</Button>} />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <Card className="calendar-shell overflow-hidden p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</Button>
              <h2 className="display text-xl">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
              <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</Button>
            </div>
            <div className="calendar-grid mt-5" aria-label={month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="calendar-weekday">{day}</span>)}
              {cells.map((day, index) => day ? (() => {
                const key = dateKey(day);
                const dayItems = byDay.get(key) || [];
                const active = selected === key;
                const today = key === dateKey(new Date());
                return <button key={key} type="button" className={`calendar-day ${active ? "is-selected" : ""} ${today ? "is-today" : ""}`} onClick={() => setSelected(key)} aria-pressed={active} aria-label={`${day.toLocaleDateString("en-IN", { dateStyle: "full" })}, ${dayItems.length} items`}><span>{day.getDate()}</span>{dayItems.length > 0 && <span className="calendar-dots" aria-hidden="true">{dayItems.slice(0, 3).map((item) => <i key={item.id} />)}</span>}</button>;
              })() : <span key={`blank-${index}`} className="calendar-day is-empty" aria-hidden="true" />)}
            </div>
          </Card>

          <aside>
            <Card className="p-5 sm:p-6">
              <p className="eyebrow eyebrow-accent">Selected day</p>
              <h2 className="display mt-2 text-xl">{new Date(`${selected}T12:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" })}</h2>
              <div className="mt-5 space-y-3" aria-live="polite">
                {selectedItems.length ? selectedItems.map((item) => <CalendarAgendaItem key={item.id} item={item} />) : <p className="rounded-sm bg-paper-2 p-4 text-sm text-ink-3">Nothing scheduled for this day.</p>}
              </div>
            </Card>
            {upcoming.length > 0 && <p className="mt-4 text-center text-xs text-ink-3">{upcoming.length} upcoming calendar {upcoming.length === 1 ? "item" : "items"}</p>}
          </aside>
        </div>
      )}
    </Page>
  );
}

function CalendarAgendaItem({ item }) {
  return <div className="rounded-sm border border-line bg-paper-2 p-4 transition-colors hover:border-line-2">
    <div className="flex flex-wrap items-center gap-2"><Badge tone={item.type === "interview" ? "warn" : item.type === "session" ? "info" : "accent"}>{TYPE_LABELS[item.type] || "Important"}</Badge><span className="text-xs font-semibold text-ink-3">{formatDateTime(item.startsAt)}</span></div>
    <h3 className="mt-2 text-sm font-semibold leading-snug">{item.title}</h3>
    {(item.clubName || item.venue) && <p className="mt-1 text-xs text-ink-3">{[item.clubName, item.venue].filter(Boolean).join(" · ")}</p>}
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold"><Link to={item.link} className="link link-accent">Open details →</Link><a href={googleCalendarUrl(item)} target="_blank" rel="noreferrer" className="link">Google Calendar ↗</a></div>
  </div>;
}
