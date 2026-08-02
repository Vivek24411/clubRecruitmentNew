import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const statuses = ["draft", "published", "cancelled", "completed", "archived"];
export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllSessions`).then(({ data }) => data.success ? setSessions(data.sessions) : toast.error(data.msg)).catch(() => toast.error("Could not load sessions")).finally(() => setLoading(false)); }, []);
  const updateStatus = async (session, status) => { if (["cancelled", "archived"].includes(status) && !window.confirm(`${status} ${session.title}?`)) return; try { const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/admin/sessions/${session._id}/status`, { status }); if (!data.success) throw new Error(data.msg); setSessions((items) => items.map((item) => item._id === session._id ? { ...item, ...data.session } : item)); toast.success(data.msg); } catch (error) { toast.error(error.response?.data?.msg || error.message); } };
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Session moderation</h1><p className="mt-1 text-slate-600">Review information sessions and remove outdated or inappropriate listings.</p>{loading ? <p className="mt-8">Loading sessions…</p> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <article key={session._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#1a4b8e]">{session.clubId?.name || "Unknown club"}</p><h2 className="mt-1 text-xl font-bold">{session.title}</h2><p className="mt-2 text-sm text-slate-600">{session.date} at {session.time} · {session.venue}</p><div className="mt-5 flex items-end justify-between gap-3"><label className="text-xs font-semibold uppercase text-slate-500">Status<select value={session.status || "published"} onChange={(e) => updateStatus(session, e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium normal-case text-slate-900">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><Link to={`/session/${session._id}`} className="pb-2 text-sm font-semibold text-[#1a4b8e]">Review details →</Link></div></article>)}</div>}</div>;
}
