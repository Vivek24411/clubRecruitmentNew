import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { eventDeadline, formatDateTime } from "../utils/date";

const buttonPrimary = "rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white hover:bg-[#153c70] disabled:opacity-60";
const buttonSecondary = "rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60";

export default function Event() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [view, setView] = useState(null);
  const [detail, setDetail] = useState(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const [eventResponse, applicationResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEvent`, { params: { eventId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEventDetails`, { params: { eventId } }),
      ]);
      if (!eventResponse.data.success) throw new Error(eventResponse.data.msg);
      setEvent(eventResponse.data.event);
      setPlatformOpen(eventResponse.data.registrationOpen !== false);
      setView(Number(applicationResponse.data.Show));
      setDetail(applicationResponse.data.detail);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load event");
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const action = async (endpoint, payload = {}, confirmation) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setWorking(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/${endpoint}`, { eventId, ...payload });
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      setMemberEmail("");
      setTeamName("");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not complete that action");
    } finally { setWorking(false); }
  };

  if (loading) return <div className="mx-auto max-w-5xl p-8" role="status">Loading event…</div>;
  if (!event) return <div className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Event not found</h1><Link to="/events" className="mt-4 inline-block text-[#1a4b8e]">Back to events</Link></div>;

  const deadline = eventDeadline(event);
  const open = platformOpen && event.status === "published" && (!deadline || deadline > new Date());
  const isTeamEvent = event.registrationType !== "individual";
  const registration = view === 1 || view === 2 ? detail : null;
  const maxTeam = event.maxTeamSize || event.maxParticipants || 1;

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/events" className="text-sm font-semibold text-[#1a4b8e] hover:underline">← All events</Link>
    {event.eventBanner && <img src={event.eventBanner} alt="" className="mt-5 aspect-[16/6] w-full rounded-2xl object-cover shadow-sm" />}
    <section className="mt-5 rounded-2xl bg-[#1a4b8e] p-7 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-100">{event.clubId?.name || "Recruitment event"}</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{event.title}</h1><p className="mt-3 max-w-3xl text-blue-100">{event.shortDescription}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${open ? "bg-emerald-100 text-emerald-800" : "bg-white/20 text-white"}`}>{open ? "Applications open" : !platformOpen ? "Recruitment paused" : event.status === "closed" ? "Applications closed" : event.status}</span>
      </div>
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">About the opportunity</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{event.longDescription}</p>
          <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <div><dt className="text-sm text-slate-500">Deadline</dt><dd className="font-semibold">{formatDateTime(deadline)}</dd></div>
            <div><dt className="text-sm text-slate-500">Application</dt><dd className="font-semibold capitalize">{event.registrationType?.replace("_", " ") || "Team"}</dd></div>
            <div><dt className="text-sm text-slate-500">Team size</dt><dd className="font-semibold">{isTeamEvent ? `${event.minTeamSize || 1}–${maxTeam}` : "Individual"}</dd></div>
            <div><dt className="text-sm text-slate-500">Rounds</dt><dd className="font-semibold">{event.numberOfRounds || event.roundDetails?.length || "Not specified"}</dd></div>
          </dl>
          {event.eligibility && <div className="mt-5 rounded-lg bg-blue-50 p-4"><h3 className="font-semibold">Eligibility</h3><p className="mt-1 text-sm text-slate-700">{event.eligibility}</p></div>}
        </article>
        {event.roundDetails?.length > 0 && <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Selection process</h2><ol className="mt-4 space-y-3">{event.roundDetails.map((round, index) => <li key={index} className="flex gap-3 rounded-lg bg-slate-50 p-4"><span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#1a4b8e] font-bold text-white">{index + 1}</span><div><p className="font-semibold">{round.Type || round.type || `Round ${index + 1}`}</p>{(round.Description || round.description) && <p className="mt-1 text-sm text-slate-600">{round.Description || round.description}</p>}</div></li>)}</ol></article>}
      </div>

      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {view === 0 && <>
          <h2 className="text-lg font-bold">Apply for this event</h2>
          <p className="mt-2 text-sm text-slate-600">{!platformOpen ? "The platform recruitment cycle is currently closed." : isTeamEvent ? "Register as captain, then invite teammates by college email." : "Submit an individual application."}</p>
          <button disabled={!open || working} onClick={() => action("registerEvent")} className={`${buttonPrimary} mt-5 w-full`}>{working ? "Submitting…" : open ? "Apply now" : "Applications closed"}</button>
        </>}

        {view === 1 && registration && <>
          <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">{isTeamEvent ? "Your team" : "Your application"}</h2><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold capitalize text-blue-800">{registration.overallStatus?.replace("_", " ")}</span></div>
          {isTeamEvent && <>
            <form className="mt-5" onSubmit={(e) => { e.preventDefault(); action("addTeamName", { teamName }); }}><label className="text-sm font-medium">Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={registration.teamName || "Choose a team name"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" minLength={2} required /></label><button disabled={!open || working} className={`${buttonSecondary} mt-2 w-full`}>{registration.teamName ? "Rename team" : "Save team name"}</button></form>
            <div className="mt-5"><p className="text-sm font-semibold">Members ({1 + (registration.membersAccepted?.length || 0)}/{maxTeam})</p><div className="mt-2 space-y-2"><div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">{registration.studentId?.name}</p><p className="text-slate-500">Captain</p></div>{registration.membersAccepted?.map((member) => <div key={member._id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><div><p className="font-medium">{member.name}</p><p className="text-slate-500">{member.email}</p></div><button disabled={!open || working} onClick={() => action("removeTeamMember", { memberId: member._id }, `Remove ${member.name} from the team?`)} className="text-xs font-semibold text-red-700">Remove</button></div>)}</div></div>
            {1 + (registration.membersAccepted?.length || 0) < (event.minTeamSize || 1) && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">Invite at least {(event.minTeamSize || 1) - 1 - (registration.membersAccepted?.length || 0)} more teammate(s) to meet the minimum team size.</p>}
            {registration.membersOffered?.length > 0 && <div className="mt-5"><p className="text-sm font-semibold">Pending invitations</p>{registration.membersOffered.map((member) => <div key={member._id} className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm"><span className="truncate">{member.email}</span><button onClick={() => action("cancelMemberOffer", { memberEmail: member.email })} className="font-semibold text-red-700">Cancel</button></div>)}</div>}
            <form className="mt-5" onSubmit={(e) => { e.preventDefault(); action("addMemberOffer", { memberEmail }); }}><label className="text-sm font-medium">Invite by IITR email<input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="student@iitr.ac.in" required /></label><button disabled={!open || working || 1 + (registration.membersAccepted?.length || 0) >= maxTeam} className={`${buttonPrimary} mt-2 w-full`}>Send invitation</button></form>
          </>}
          <Link to="/applications" className="mt-5 block text-center text-sm font-semibold text-[#1a4b8e]">Track application</Link>
          <button disabled={working || ["selected", "rejected"].includes(registration.overallStatus)} onClick={() => action("unregisterAsCaptain", {}, "Withdraw this application? Your team will be disbanded.")} className="mt-3 w-full text-sm font-semibold text-red-700 disabled:opacity-50">Withdraw application</button>
        </>}

        {view === 2 && registration && <>
          <h2 className="text-lg font-bold">You joined this team</h2><p className="mt-2 font-semibold">{registration.teamName || "Unnamed team"}</p><p className="mt-1 text-sm text-slate-600">Captain: {registration.studentId?.name}</p><div className="mt-4 space-y-2">{registration.membersAccepted?.map((member) => <p key={member._id} className="rounded-lg bg-slate-50 p-3 text-sm">{member.name}</p>)}</div><Link to="/applications" className="mt-5 block text-center text-sm font-semibold text-[#1a4b8e]">Track application</Link><button disabled={!open || working} onClick={() => action("leaveTeam", {}, "Leave this team? You may need a new invitation to rejoin.")} className="mt-3 w-full text-sm font-semibold text-red-700">Leave team</button>
        </>}

        {view === 3 && Array.isArray(detail) && <>
          <h2 className="text-lg font-bold">Team invitations</h2><p className="mt-2 text-sm text-slate-600">Choose one team, or start your own application.</p><div className="mt-4 space-y-3">{detail.map((offer) => <div key={offer._id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold">{offer.teamName || `${offer.studentId?.name}'s team`}</p><p className="text-sm text-slate-500">Captain: {offer.studentId?.name}</p><div className="mt-3 flex gap-2"><button disabled={!open || working} onClick={() => action("acceptMemberOffer", { studentId: offer.studentId?._id })} className={`${buttonPrimary} flex-1`}>Accept</button><button disabled={working} onClick={() => action("declineMemberOffer", { captainId: offer.studentId?._id })} className={`${buttonSecondary} flex-1`}>Decline</button></div></div>)}</div><button disabled={!open || working} onClick={() => action("registerEvent")} className="mt-4 w-full text-sm font-semibold text-[#1a4b8e] disabled:opacity-50">Start my own application</button>
        </>}
      </aside>
    </div>
  </div>;
}
