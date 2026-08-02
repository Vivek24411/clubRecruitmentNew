import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";

export default function Session() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [rsvp, setRsvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sessionResponse, rsvpResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getSession`, { params: { sessionId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/sessionRsvp`, { params: { sessionId } }),
      ]);
      if (!sessionResponse.data.success) throw new Error(sessionResponse.data.msg);
      setSession(sessionResponse.data.session);
      setRsvp(rsvpResponse.data.rsvp);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load this session");
    } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const updateRsvp = async (cancel = false) => {
    setWorking(true);
    try {
      const endpoint = cancel ? "/student/sessionRsvp/cancel" : "/student/sessionRsvp";
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}${endpoint}`, { sessionId });
      if (!data.success) throw new Error(data.msg);
      setRsvp(data.rsvp);
      toast.success(data.msg);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update RSVP");
    } finally { setWorking(false); }
  };

  if (loading) return <div className="mx-auto max-w-4xl p-8" role="status">Loading session…</div>;
  if (!session) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Session not found</h1><Link className="mt-4 inline-block text-[#1a4b8e]" to="/sessions">Back to sessions</Link></div>;

  const startsAt = sessionDate(session.date, session.time);
  const isPast = startsAt <= new Date();
  const activeRsvp = ["confirmed", "waitlisted"].includes(rsvp?.status);
  const placesLeft = session.capacity ? Math.max(session.capacity - (session.confirmedRsvpCount || 0), 0) : null;

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/sessions" className="text-sm font-semibold text-[#1a4b8e] hover:underline">← All sessions</Link>
    <section className="mt-5 overflow-hidden rounded-2xl bg-[#1a4b8e] p-7 text-white shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">{session.clubId?.name || "Club session"}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{session.title}</h1>
      <p className="mt-3 max-w-3xl text-blue-100">{session.shortDescription}</p>
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-bold">About this session</h2>
        <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{session.longDescription || "No additional description provided."}</p>
        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Starts</dt><dd className="font-semibold">{formatDateTime(startsAt)}</dd></div>
          <div><dt className="text-sm text-slate-500">Venue</dt><dd className="font-semibold">{session.venue || "To be announced"}</dd></div>
          <div><dt className="text-sm text-slate-500">Duration</dt><dd className="font-semibold">{session.duration ? `${session.duration} minutes` : "Not set"}</dd></div>
          <div><dt className="text-sm text-slate-500">Availability</dt><dd className="font-semibold">{placesLeft === null ? "Open attendance" : placesLeft > 0 ? `${placesLeft} places left` : "Waitlist available"}</dd></div>
        </dl>
      </article>
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Your RSVP</h2>
        {rsvp && <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${rsvp.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : rsvp.status === "waitlisted" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{rsvp.status}</span>}
        <p className="mt-3 text-sm text-slate-600">{isPast ? "This session has already started." : activeRsvp ? "We’ll keep your place and status here." : "Reserve a place. If full, you’ll join the waitlist automatically."}</p>
        {!isPast && (activeRsvp ? <button disabled={working} onClick={() => updateRsvp(true)} className="mt-5 w-full rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Cancel RSVP</button> : <button disabled={working} onClick={() => updateRsvp(false)} className="mt-5 w-full rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white disabled:opacity-60">{working ? "Updating…" : "RSVP now"}</button>)}
      </aside>
    </div>
  </div>;
}
