import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";

const statusStyle = {
  selected: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  waitlisted: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-slate-100 text-slate-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/student/myApplications`)
      .then(({ data }) => data.success ? setApplications(data.applications.filter((item) => item.registrationId)) : toast.error(data.msg))
      .catch((error) => toast.error(error.response?.data?.msg || "Could not load applications"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My applications</h1>
        <p className="mt-1 text-slate-600">Track your team, rounds, interviews, and final decision.</p>
      </div>
      {loading ? <p role="status">Loading applications…</p> : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No applications yet</h2>
          <p className="mt-2 text-slate-600">Explore open events and submit your first application.</p>
          <Link to="/events" className="mt-5 inline-block rounded-lg bg-[#1a4b8e] px-4 py-2 text-white">Browse events</Link>
        </div>
      ) : <div className="space-y-4">
        {applications.map(({ _id, role, registrationId: application, history, reason }) => {
          const event = application.eventId;
          const currentRound = application.roundDetails?.find((round) => round.status === "scheduled") || application.roundDetails?.[Math.max(application.currentRound - 1, 0)];
          return <article key={_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1a4b8e]">{event?.clubId?.name || "Club"}</p>
                <h2 className="text-xl font-bold">{event?.title || "Event"}</h2>
                <p className="mt-1 text-sm text-slate-500">{role === "captain" ? "Team captain" : "Team member"} · Applied {formatDateTime(application.registeredAt)}{history ? ` · ${reason === "removed" ? "Removed from team" : reason === "left" ? "Left team" : "Application withdrawn"}` : ""}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyle[application.overallStatus] || statusStyle.submitted}`}>
                {application.overallStatus?.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
              <div><p className="text-xs font-medium uppercase text-slate-500">Team</p><p className="mt-1 font-medium">{application.teamName || (event?.registrationType === "individual" ? "Individual" : "Not named")}</p></div>
              <div><p className="text-xs font-medium uppercase text-slate-500">Progress</p><p className="mt-1 font-medium">{application.currentRound ? `Round ${application.currentRound} of ${application.numberOfRounds || "—"}` : "Application submitted"}</p></div>
              <div><p className="text-xs font-medium uppercase text-slate-500">Next date</p><p className="mt-1 font-medium">{currentRound?.roundDate ? formatDateTime(currentRound.roundDate) : "Not scheduled"}</p></div>
            </div>
            {event && ["published", "closed"].includes(event.status) && <Link to={`/event/${event._id}`} className="mt-4 inline-flex text-sm font-semibold text-[#1a4b8e] hover:underline">View application and team →</Link>}
          </article>;
        })}
      </div>}
    </div>
  );
}
