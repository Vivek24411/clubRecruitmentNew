import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = setTimeout(() => { setLoading(true); axios.get(`${import.meta.env.VITE_BASE_URI}/admin/audit-logs`, { params: { action: filter, limit: 100 } }).then(({ data }) => data.success ? setLogs(data.logs) : toast.error(data.msg)).catch(() => toast.error("Could not load audit log")).finally(() => setLoading(false)); }, 250); return () => clearTimeout(timer); }, [filter]);
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Audit log</h1><p className="mt-1 text-slate-600">A trace of sensitive account, event, team, and selection actions.</p></div><label className="text-sm font-medium">Filter action<input className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. application" /></label></div><div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">{loading ? <p className="p-6">Loading log…</p> : logs.length === 0 ? <p className="p-8 text-center text-slate-500">No matching audit entries.</p> : logs.map((log) => <div key={log._id} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[1fr_1fr_1.5fr]"><div><p className="font-semibold">{log.action}</p><p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p></div><p className="text-sm"><span className="font-medium capitalize">{log.actorRole}</span><br/><span className="break-all text-slate-500">{log.actorId || "system"}</span></p><p className="text-sm"><span className="font-medium capitalize">{log.targetType}</span><br/><span className="break-all text-slate-500">{log.targetId || "—"}</span></p></div>)}</div></div>;
}
