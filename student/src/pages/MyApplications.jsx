import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";
import { Badge, Button, EmptyState, Input, Monogram, Page, PageHeader, SkeletonList } from "../components/ui";

const STATUS_TONE = { selected: "ok", rejected: "bad", waitlisted: "warn", in_progress: "info", submitted: "neutral", withdrawn: "neutral" };
const CANDIDATE_TONE = { advanced: "ok", rejected: "bad", waitlisted: "warn", scheduled: "info", submitted: "info", under_review: "warn", eligible: "neutral", withdrawn: "neutral", missed: "bad" };
const TERMINAL = new Set(["selected", "rejected", "withdrawn"]);

function roundState(candidates) {
  if (!candidates.length) return "locked";
  const statuses = candidates.map((candidate) => candidate.status);
  if (statuses.some((status) => ["eligible", "scheduled", "active", "submitted", "under_review"].includes(status))) return "current";
  if (statuses.some((status) => status === "waitlisted")) return "waitlisted";
  if (statuses.some((status) => status === "advanced")) return "advanced";
  if (statuses.every((status) => ["rejected", "missed", "withdrawn"].includes(status))) return "rejected";
  return "current";
}

function RoundProgress({ rounds, candidates }) {
  if (!rounds?.length) return null;
  const byRound = new Map();
  candidates.forEach((candidate) => {
    if (!byRound.has(candidate.roundId)) byRound.set(candidate.roundId, []);
    byRound.get(candidate.roundId).push(candidate);
  });
  const states = rounds.map((round) => roundState(byRound.get(round._id) || []));
  const reached = states.filter((state) => state !== "locked").length;
  const colors = { advanced: "bg-ok", rejected: "bg-bad", waitlisted: "bg-warn", current: "bg-accent", locked: "bg-paper-3" };
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between"><span className="eyebrow">Round progress</span><span className="tabular text-xs font-semibold text-ink-2">{reached} of {rounds.length} reached</span></div>
      <div className="mt-2 flex gap-1.5">{states.map((state, index) => <span key={rounds[index]._id} title={`${rounds[index].title}: ${state}`} className={`h-2 flex-1 rounded-full ${colors[state]}`} />)}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-ink-3"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ok" />Advanced</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />Current</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-warn" />Waitlisted</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-bad" />Rejected</span></div>
    </div>
  );
}

function applicationSummary(application) {
  const event = application.eventId;
  const rounds = event?.rounds || [];
  const candidates = (application.workflow?.candidates || []).filter((candidate) => candidate.isMine !== false);
  const slots = application.workflow?.slots || [];
  const status = application.workflow?.studentOverallStatus || application.overallStatus;
  const roundOrder = new Map(rounds.map((round) => [round._id, round.order]));
  const highestOrder = candidates.length
    ? Math.max(0, ...candidates.map((candidate) => roundOrder.get(candidate.roundId) || 0))
    : Number(application.currentRound || 0);
  const currentRound = rounds.find((round) => round.order === highestOrder) || rounds[0];
  const currentCandidates = candidates.filter((candidate) => candidate.roundId === currentRound?._id);
  const currentIds = new Set(currentCandidates.map((candidate) => candidate._id));
  const slot = slots.filter((item) => currentIds.has(item.candidateId)).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];
  let next = null;
  if (!TERMINAL.has(status) && currentRound) {
    if (slot) next = { label: "Interview / scheduled slot", value: slot.startAt };
    else if (currentRound.scheduleMode === "common" && currentRound.startsAt) next = { label: "Round starts", value: currentRound.startsAt };
    else if (currentRound.submissionDeadlineAt) next = { label: "Submission deadline", value: currentRound.submissionDeadlineAt };
    else if (currentRound.endsAt) next = { label: "Round ends", value: currentRound.endsAt };
  }
  return { rounds, candidates, currentRound, currentCandidates, next, status };
}

function CandidateResults({ rounds, candidates, teamName }) {
  if (!candidates.length) return null;
  const reachedRounds = rounds.map((round) => ({
    round,
    entries: candidates.filter((candidate) => candidate.roundId === round._id),
  })).filter(({ entries }) => entries.length);
  return (
    <details className="mt-5 rounded-sm border border-line bg-paper-2/45 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-accent">View exact results for every round</summary>
      <div className="mt-3 space-y-4">{reachedRounds.map(({ round, entries }) => (
        <section key={round._id} className="border-t border-line pt-3 first:border-0 first:pt-0">
          <p className="eyebrow">Round {round.order} · {round.title}</p>
          <div className="mt-2 space-y-2">{entries.map((candidate) => {
            const name = candidate.scope === "participant" ? candidate.studentId?.name || "Student" : teamName || "Team / application";
            const label = round.order === rounds.length && candidate.status === "advanced" ? "selected" : candidate.status.replaceAll("_", " ");
            return <div key={candidate._id} className="flex items-start justify-between gap-3 rounded-sm bg-surface px-3 py-2.5"><div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-ink-3">{candidate.scope === "participant" ? "Individual result" : (candidate.participantIds || []).map((student) => student.name).filter(Boolean).join(", ") || `${candidate.participantIds?.length || 1} participant(s)`}</p></div><Badge tone={CANDIDATE_TONE[candidate.status] || "neutral"} className="capitalize">{label}</Badge></div>;
          })}</div>
        </section>
      ))}</div>
    </details>
  );
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/student/myApplications`)
      .then(({ data }) => data.success ? setApplications(data.applications.filter((item) => item.registrationId)) : toast.error(data.msg))
      .catch((error) => toast.error(error.response?.data?.msg || "Could not load applications"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter(({ role, registrationId }) => `${registrationId?.eventId?.title || ""} ${registrationId?.eventId?.clubId?.name || ""} ${registrationId?.teamName || ""} ${registrationId?.workflow?.studentOverallStatus || registrationId?.overallStatus || ""} ${role || ""}`.toLowerCase().includes(query));
  }, [applications, search]);

  return (
    <Page width="5xl">
      <PageHeader eyebrow="Your record" title="Applications" description="Every application you've submitted, including teams, rounds, interview dates, and final decisions." />
      {!loading && applications.length > 0 && <div className="relative mt-8"><label htmlFor="application-search" className="sr-only">Search applications</label><Input id="application-search" type="search" className="pl-4" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by event, club, team, or status…" /></div>}

      <div className="mt-6">
        {loading ? <SkeletonList rows={3} /> : applications.length === 0 ? <EmptyState title="No applications yet" description="Once you apply to an event, its full progress will be tracked here." action={<Button to="/events">Browse open events</Button>} /> : visible.length === 0 ? <EmptyState title="No matching applications" description="Try another event, club, team, or status." action={<Button variant="secondary" onClick={() => setSearch("")}>Clear search</Button>} /> : <div className="stagger space-y-4">{visible.map(({ _id, role, registrationId: application, history, reason }) => {
          const event = application.eventId;
          const summary = applicationSummary(application);
          const individual = event?.registrationType === "individual";
          const roleLabel = individual ? "Individual applicant" : role === "captain" ? "Team captain" : "Team member";
          const status = history ? "withdrawn" : summary.status;
          return <article key={_id} className={`card overflow-hidden border-l-4 ${status === "selected" ? "border-l-ok" : status === "rejected" ? "border-l-bad" : status === "waitlisted" ? "border-l-warn" : status === "withdrawn" ? "border-l-line-2" : "border-l-accent"}`}><div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3.5">{event?.clubId?.clubLogo ? <img src={event.clubId.clubLogo} alt="" className="h-11 w-11 rounded-md border border-line object-contain p-1" /> : <Monogram name={event?.clubId?.name || "Club"} size="sm" />}<div className="min-w-0"><p className="eyebrow eyebrow-accent">{event?.clubId?.name || "Club"}</p><h2 className="display mt-1 text-xl leading-snug">{event?.title || "Event"}</h2><p className="mt-1.5 text-sm text-ink-3">{roleLabel} · Applied {formatDateTime(application.registeredAt)}{history ? ` · ${reason === "removed" ? "Removed from team" : reason === "left" ? "Left team" : "Withdrawn"}` : ""}</p></div></div><Badge tone={STATUS_TONE[status] || "neutral"} className="px-3 py-1.5 text-sm capitalize" live={status === "in_progress"}>{status?.replace("_", " ")}</Badge></div>

          <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4"><div><p className="eyebrow">Application</p><p className="mt-1.5 font-medium">{individual ? "Individual" : application.teamName || "Unnamed team"}</p></div><div><p className="eyebrow">Current stage</p><p className="mt-1.5 font-medium">{summary.currentRound ? `Round ${summary.currentRound.order}: ${summary.currentRound.title}` : "Submitted"}</p></div><div className="sm:col-span-2"><p className="eyebrow">{summary.next?.label || (TERMINAL.has(status) ? "Decision" : "Next date")}</p><p className="mt-1.5 font-medium">{summary.next ? formatDateTime(summary.next.value) : status === "selected" ? "Selection process completed" : status === "rejected" ? "This application will not move forward" : status === "withdrawn" ? "Application withdrawn" : "Not scheduled"}</p></div></div>

          {!history && <RoundProgress rounds={summary.rounds} candidates={summary.candidates} />}
          {!history && <CandidateResults rounds={summary.rounds} candidates={summary.candidates} teamName={application.teamName} />}
          {event && ["published", "closed"].includes(event.status) && <Link to={`/event/${event._id}`} className="link link-accent mt-6 inline-flex text-sm font-semibold">{individual ? "View application" : "View application and team"} →</Link>}
          </div></article>;
        })}</div>}
      </div>
    </Page>
  );
}
