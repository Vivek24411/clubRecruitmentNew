import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${import.meta.env.VITE_BASE_URI}/club/getSessions`).then(({ data }) => data.success ? setSessions(data.sessions) : toast.error(data.msg)).catch(() => toast.error("Could not load sessions")).finally(() => setLoading(false)); }, []);
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Information sessions</h1><p className="mt-1 text-slate-600">Manage schedules, capacity, RSVPs, and attendance.</p></div><Link to="/addSession" className="rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white">Create session</Link></div>{loading ? <p className="mt-8">Loading sessions…</p> : sessions.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">No sessions yet.</div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <article key={session._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{session.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold capitalize">{session.status}</span></div><p className="mt-2 text-sm text-slate-600">{session.date} at {session.time}</p><p className="mt-1 text-sm text-slate-500">{session.venue} · {session.duration} min</p><p className="mt-3 text-sm"><strong>{session.confirmedRsvpCount || 0}</strong>{session.capacity ? ` / ${session.capacity}` : ""} confirmed</p><Link to={`/session/${session._id}`} className="mt-4 inline-block text-sm font-semibold text-[#1a4b8e]">Manage session →</Link></article>)}</div>}</div>;
}
