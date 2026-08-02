import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import { eventDeadline, formatDateTime, sessionDate } from "../utils/date";

export default function Home() {
  const { profile } = useContext(StudentContextData);
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { axios.get(`${import.meta.env.VITE_BASE_URI}/student/getDashBoard`).then(({ data }) => { if (data.success) { setEvents(data.events || []); setSessions(data.sessions || []); setSettings(data.settings); } }).finally(() => setLoading(false)); }, []);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => (eventDeadline(a)?.getTime() || Infinity) - (eventDeadline(b)?.getTime() || Infinity)), [events]);
  const upcomingSessions = useMemo(() => sessions.filter((session) => sessionDate(session.date, session.time) > new Date()).sort((a, b) => sessionDate(a.date, a.time) - sessionDate(b.date, b.time)), [sessions]);
  const now = new Date();
  const cycleOpen = settings?.recruitmentCycle?.status !== "closed"
    && settings?.recruitmentCycle?.status !== "draft"
    && (!settings?.recruitmentCycle?.startAt || new Date(settings.recruitmentCycle.startAt) <= now)
    && (!settings?.recruitmentCycle?.endAt || new Date(settings.recruitmentCycle.endAt) >= now);
  const registrationsOpen = settings?.registrationEnabled !== false && cycleOpen;

  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#123866] to-[#1a4b8e] p-7 text-white shadow-lg sm:p-10"><p className="font-semibold text-blue-100">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</p><h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">Find your place in IITR’s student community.</h1><p className="mt-4 max-w-2xl text-blue-100">Discover clubs, apply with a team, track every selection round, and reserve information-session seats.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/events" className="rounded-lg bg-white px-4 py-2 font-bold text-[#1a4b8e]">Explore open events</Link><Link to="/applications" className="rounded-lg border border-blue-200 px-4 py-2 font-bold text-white">Track applications</Link></div></section>
    {settings?.maintenanceMessage && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><strong>{settings.recruitmentCycle?.name || "Recruitment update"}: </strong>{settings.maintenanceMessage}</div>}
    {settings && !registrationsOpen && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-800">New applications are paused outside the active recruitment cycle.</div>}
    {loading ? <p className="mt-8" role="status">Loading opportunities…</p> : <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section><div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold">Deadlines coming up</h2><p className="mt-1 text-sm text-slate-600">Events with the nearest application deadlines.</p></div><Link className="text-sm font-semibold text-[#1a4b8e]" to="/events">View all</Link></div><div className="mt-4 space-y-3">{sortedEvents.slice(0, 4).map((event) => { const deadline = eventDeadline(event); const days = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null; return <Link to={`/event/${event._id}`} key={event._id} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#1a4b8e]">{event.clubId?.name}</p><h3 className="mt-1 text-lg font-bold">{event.title}</h3></div>{days !== null && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${days <= 2 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{days < 0 ? "Closed" : days === 0 ? "Today" : `${days}d left`}</span>}</div><p className="mt-3 text-sm text-slate-500">Deadline {formatDateTime(deadline)}</p></Link>; })}{sortedEvents.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No open events right now.</p>}</div></section>
      <section><div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold">Upcoming sessions</h2><p className="mt-1 text-sm text-slate-600">Meet clubs and learn how their selection works.</p></div><Link className="text-sm font-semibold text-[#1a4b8e]" to="/sessions">View all</Link></div><div className="mt-4 space-y-3">{upcomingSessions.slice(0, 4).map((session) => <Link to={`/session/${session._id}`} key={session._id} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="grid h-12 w-12 flex-none place-items-center rounded-lg bg-blue-100 text-center text-xs font-bold text-[#1a4b8e]">{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" }).format(sessionDate(session.date, session.time))}</div><div><p className="text-sm font-semibold text-[#1a4b8e]">{session.clubId?.name}</p><h3 className="font-bold">{session.title}</h3><p className="mt-1 text-sm text-slate-500">{formatDateTime(sessionDate(session.date, session.time))} · {session.venue}</p></div></Link>)}{upcomingSessions.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No upcoming sessions.</p>}</div></section>
    </div>}
  </div>;
}
