import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Badge, Button, Card, DateTimeInput, EmptyState, Field, Input, Monogram, Page, Select, SkeletonList, Textarea } from "../components/ui";

const STATUS_TONES = {
  advanced: "ok", rejected: "bad", waitlisted: "warn", submitted: "info",
  under_review: "warn", scheduled: "info", eligible: "neutral", active: "accent",
  withdrawn: "neutral", revoked: "neutral", missed: "bad",
};
const PROGRAMME_LABELS = { undergraduate: "UG", mtech: "M.Tech.", msc: "M.Sc.", mba: "MBA", phd: "PhD" };
const displayDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled";
const localDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const isUrl = (value) => /^https?:\/\//i.test(String(value || ""));
const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return "";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
};

function StudentAvatar({ student, className = "h-10 w-10" }) {
  if (student?.profilePicture) {
    return <img src={student.profilePicture} alt="" loading="lazy" className={`${className} flex-none rounded-full border border-line bg-surface object-cover`} />;
  }
  return <Monogram name={student?.name || "?"} size="sm" className={`${className} rounded-full border border-surface`} />;
}

function PersonRow({ student, captain = false }) {
  return (
    <div className="grid items-center gap-2 border-t border-line/70 py-2 text-xs first:border-0 sm:grid-cols-[1.1fr_1.2fr_.85fr_.8fr]">
      <div className="flex min-w-0 items-center gap-2.5"><StudentAvatar student={student} /><p className="min-w-0 truncate font-semibold text-ink">{student?.name || "Student"}{captain ? " · Captain" : ""}</p></div>
      <p className="break-all text-ink-3">{student?.email || "—"}</p>
      <p className="text-ink-3">{student?.phoneNumber ? <a href={`tel:${student.phoneNumber}`} className="link font-medium">{student.phoneNumber}</a> : "—"}</p>
      <p className="text-ink-3">{[PROGRAMME_LABELS[student?.programme] || "UG", student?.branch || student?.enrollmentNumber].filter(Boolean).join(" · ") || "—"}</p>
    </div>
  );
}

const CROSS_TONE = { selected: "ok", advanced: "ok", in_progress: "info", waitlisted: "warn", rejected: "bad", withdrawn: "neutral" };

// Where this candidate's participants stand in the event's other verticals.
// Read-only context for the reviewer; nothing here changes a decision.
function CrossVerticalStatus({ candidate, crossVertical }) {
  const entries = [...new Map(
    (candidate.participantIds || [])
      .flatMap((student) => (crossVertical[String(student?._id || student)] || [])
        .map((entry) => [`${student?._id || student}-${entry.verticalId}`, { ...entry, student }])),
  ).values()];
  if (!entries.length) return null;

  return (
    <div className="mt-3 border-t border-line/70 pt-3">
      <p className="text-xs font-semibold text-ink-4">Also applied to</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entries.map((entry) => (
          <Badge key={`${entry.student?._id || entry.student}-${entry.verticalId}`} tone={CROSS_TONE[entry.status] || "neutral"}>
            {entry.verticalTitle}: {String(entry.status).replaceAll("_", " ")}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CandidateIdentity({ candidate, registration, finalRound }) {
  if (candidate.scope === "participant") {
    const student = candidate.studentId || candidate.participantIds?.[0];
    return (
      <div className="flex min-w-0 items-start gap-3">
        <StudentAvatar student={student} />
        <div className="min-w-0">
          <p className="font-semibold">{student?.name || "Student"}</p>
          <p className="mt-0.5 break-all text-xs text-ink-3">{student?.email}</p>
          <p className="mt-0.5 text-xs text-ink-3">{student?.phoneNumber ? <a href={`tel:${student.phoneNumber}`} className="link font-medium">{student.phoneNumber}</a> : "Phone not provided"}</p>
          <p className="mt-1 text-xs text-ink-3">{PROGRAMME_LABELS[student?.programme] || "UG"} · {student?.branch || "Branch not provided"}{student?.enrollmentNumber ? ` · ${student.enrollmentNumber}` : ""}</p>
          <p className="mt-1 text-xs text-ink-4">Individual evaluation</p>
          <Badge className="mt-2 capitalize" tone={STATUS_TONES[candidate.status]}>
            {finalRound && candidate.status === "advanced" ? "selected" : candidate.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>
    );
  }
  const participants = candidate.participantIds || [];
  const primaryContact = registration?.studentId || participants[0];
  return (
    <div className="min-w-0">
      <p className="font-semibold">{registration?.teamName || registration?.studentId?.name || "Application"}</p>
      <p className="mt-0.5 text-xs text-ink-3">{participants.length} participant{participants.length === 1 ? "" : "s"}</p>
      {primaryContact?.phoneNumber && <p className="mt-1 text-xs text-ink-3">Primary contact · <a href={`tel:${primaryContact.phoneNumber}`} className="link font-medium">{primaryContact.phoneNumber}</a></p>}
      <div className="mt-2 flex -space-x-2" aria-label="Team members">
        {participants.slice(0, 5).map((student) => <StudentAvatar key={student._id} student={student} className="h-8 w-8" />)}
        {participants.length > 5 && <span className="grid h-8 w-8 place-items-center rounded-full border border-surface bg-ink text-[0.65rem] font-semibold text-white">+{participants.length - 5}</span>}
      </div>
      <Badge className="mt-2 capitalize" tone={STATUS_TONES[candidate.status]}>
        {finalRound && candidate.status === "advanced" ? "selected" : candidate.status.replaceAll("_", " ")}
      </Badge>
      <details className="mt-3 rounded-sm border border-line bg-paper-2/50 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-accent">View team details</summary>
        <div className="mt-2">
          {participants.map((student) => <PersonRow key={student._id} student={student} captain={student._id === registration?.studentId?._id} />)}
        </div>
      </details>
    </div>
  );
}

function SubmissionSummary({ submission, fields = [] }) {
  if (!submission) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-line-2 bg-surface/50 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-ink-2">No work submitted yet</p>
        <p className="mt-1 text-xs text-ink-4">Answers and attachments will appear here when the candidate submits.</p>
      </div>
    );
  }
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const labels = new Map(fields.map((field) => [field.key, field.label]));
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-2/55 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Submitted work</p>
          <p className="mt-0.5 text-xs text-ink-3">Revision {submission.revision} · {displayDate(submission.submittedAt)}</p>
        </div>
        <Badge tone={submission.status === "accepted" ? "ok" : submission.status === "rejected" ? "bad" : submission.status === "under_review" ? "warn" : "info"} className="capitalize">
          {String(submission.status || "submitted").replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="space-y-5 p-4">
        {submission.answers?.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {submission.answers.map((answer) => (
              <div key={answer.key} className="min-w-0 rounded-sm bg-paper-2/45 px-3.5 py-3 text-xs">
                <p className="eyebrow">{labels.get(answer.key) || answer.key.replaceAll("_", " ")}</p>
                {fieldByKey.get(answer.key)?.type === "boolean"
                  ? <p className="mt-2 leading-relaxed text-ink-2">{answer.value === "true" ? "Yes" : "No"}</p>
                  : isUrl(answer.value)
                  ? <a href={answer.value} target="_blank" rel="noreferrer" className="link mt-2 block break-all font-semibold">Open submitted link ↗</a>
                  : <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed text-ink-2">{answer.value || "—"}</p>}
              </div>
            ))}
          </div>
        )}
        {submission.files?.length > 0 && (
          <div>
            <p className="eyebrow">Attachments</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {submission.files.map((file) => {
                const kind = file.resourceType === "video" || file.mimeType?.startsWith("video/")
                  ? "Video"
                  : file.mimeType === "application/pdf" || file.format === "pdf" ? "PDF" : "Image";
                return (
                  <button type="button" key={file.publicId} onClick={async () => {
                    try {
                      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}${file.downloadPath}`);
                      if (!data.download?.url) throw new Error("Download is unavailable");
                      window.open(data.download.url, "_blank", "noopener,noreferrer");
                    } catch (error) {
                      toast.error(error.response?.data?.msg || error.message || "Could not open this attachment");
                    }
                  }} className="group flex min-w-0 items-center gap-3 rounded-sm border border-line bg-white px-3 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-tint/30">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-sm bg-ink text-[0.62rem] font-bold tracking-wider text-white">{kind.toUpperCase().slice(0, 3)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">{file.originalName || labels.get(file.fieldKey) || "Attachment"}</span>
                      <span className="mt-0.5 block text-[0.68rem] text-ink-4">{kind}{file.bytes ? ` · ${formatBytes(file.bytes)}` : ""}</span>
                    </span>
                    <span className="flex-none text-sm font-semibold text-accent" aria-hidden="true">↗</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!submission.answers?.length && !submission.files?.length && <p className="text-sm text-ink-3">The candidate submitted without any answer or attachment.</p>}
      </div>
      {submission.submittedBy?.name && <p className="border-t border-line px-4 py-2.5 text-xs text-ink-4">Submitted by <span className="font-semibold text-ink-3">{submission.submittedBy.name}</span></p>}
    </div>
  );
}

export default function EventRegisteredStudents() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [roundId, setRoundId] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [selected, setSelected] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTab, setSelectedTab] = useState(false);
  const [page, setPage] = useState(1);
  const [operation, setOperation] = useState("");
  const [autoForm, setAutoForm] = useState({ startAt: "", endAt: "", durationMinutes: 20, bufferMinutes: 0, venue: "", meetingUrl: "" });
  const [manual, setManual] = useState(null);
  const [extract, setExtract] = useState({ targetEventId: "", targetRoundId: "" });

  const load = useCallback(async () => {
    try {
      const { data: response } = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/workflow`, {
        params: {
          verticalId: verticalId || undefined,
          roundId: roundId || undefined,
          status: statusFilter,
          search: debouncedSearch || undefined,
          page,
          limit: 50,
        },
      });
      if (!response.success) throw new Error(response.msg);
      setData(response);
      setVerticalId((current) => current || response.selectedVerticalId || "");
      setRoundId((current) => current || response.selectedRoundId || "");
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load event workflow");
    }
  }, [debouncedSearch, eventId, page, roundId, statusFilter, verticalId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { setSelected([]); setDrafts({}); }, [roundId, verticalId, page, statusFilter, debouncedSearch]);

  const verticals = data?.event?.verticals || [];
  const verticalsEnabled = Boolean(data?.event?.verticalsEnabled) && verticals.length > 1;
  const activeVertical = verticals.find((item) => item._id === verticalId) || verticals[0];
  const verticalRounds = activeVertical?.rounds || [];
  const round = verticalRounds.find((item) => item._id === roundId);
  const finalRound = round?.order === verticalRounds.length;
  const canRemindIncomplete = data?.event?.status === "published"
    && Boolean(round?.submissionDeadlineAt)
    && new Date(round.submissionDeadlineAt) > new Date()
    && (round?.submissionEnabled || ["submission", "hackathon"].includes(round?.type));
  const crossVertical = data?.crossVertical || {};
  const registrations = useMemo(() => new Map((data?.registrations || []).map((item) => [item._id, item])), [data]);
  const slots = useMemo(() => new Map((data?.slots || []).filter((slot) => slot.status !== "cancelled").map((slot) => [slot.candidateId, slot])), [data]);
  const submissions = useMemo(() => {
    const latest = new Map();
    (data?.submissions || []).forEach((submission) => {
      if (!latest.has(submission.candidateId)) latest.set(submission.candidateId, submission);
    });
    return latest;
  }, [data]);
  const candidates = data?.candidates || [];
  const chosen = candidates.filter((candidate) => selected.includes(candidate._id));
  const allVisibleSelected = candidates.length > 0 && candidates.every((candidate) => selected.includes(candidate._id));
  const finalSelectedCount = data?.summary?.finalSelectedCount || 0;

  const toggle = (candidateId) => setSelected((previous) => previous.includes(candidateId) ? previous.filter((id) => id !== candidateId) : [...previous, candidateId]);
  const toggleAllVisible = () => setSelected((previous) => {
    const visibleIds = new Set(candidates.map((candidate) => candidate._id));
    if (allVisibleSelected) return previous.filter((candidateId) => !visibleIds.has(candidateId));
    return [...new Set([...previous, ...visibleIds])];
  });
  const patchDraft = (candidateId, changes) => setDrafts((previous) => ({ ...previous, [candidateId]: { ...(previous[candidateId] || {}), ...changes } }));

  const publish = async (status) => {
    if (!chosen.length) return toast.warning("Select at least one candidate");
    setOperation(`decision-${status}`);
    try {
      const decisions = chosen.map((candidate) => ({ candidateId: candidate._id, status, score: drafts[candidate._id]?.score ?? candidate.score, notes: drafts[candidate._id]?.notes ?? candidate.notes }));
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/decisions`, { decisions });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
      setSelected([]);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setOperation(""); }
  };

  const saveReview = async (candidate) => {
    setOperation(`review-${candidate._id}`);
    try {
      const { data: response } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/candidates/${candidate._id}`, {
        score: drafts[candidate._id]?.score ?? candidate.score,
        notes: drafts[candidate._id]?.notes ?? candidate.notes,
      });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setOperation(""); }
  };

  const remindIncomplete = async () => {
    if (!round || !canRemindIncomplete) return;
    const confirmed = window.confirm(
      `Email only the students who have not submitted ${round.title}?\n\nThe email will include the deadline: ${displayDate(round.submissionDeadlineAt)}. Each student can receive this reminder only once for this deadline.`,
    );
    if (!confirmed) return;
    setOperation("submission-reminders");
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/submission-reminders`);
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not queue submission reminders");
    } finally {
      setOperation("");
    }
  };

  const autoSchedule = async (event) => {
    event.preventDefault();
    if (!chosen.length) return toast.warning("Select candidates for this scheduling window");
    setOperation("auto-schedule");
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/slots/auto`, {
        candidateIds: chosen.map((item) => item._id), ...autoForm,
        startAt: new Date(autoForm.startAt).toISOString(), endAt: new Date(autoForm.endAt).toISOString(),
      });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setOperation(""); }
  };

  const saveManual = async (event) => {
    event.preventDefault();
    setOperation("manual-schedule");
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/slots`, {
        ...manual, startAt: new Date(manual.startAt).toISOString(), endAt: new Date(manual.endAt).toISOString(),
      });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      setManual(null);
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setOperation(""); }
  };

  const extractCandidates = async (event) => {
    event.preventDefault();
    const advanced = chosen.filter((candidate) => candidate.status === "advanced");
    if (!advanced.length) return toast.warning("Select candidates already advanced from this round");
    setOperation("extract");
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/extract`, { candidateIds: advanced.map((item) => item._id), ...extract });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      // Decisions may have moved on elsewhere; reload so the selection cannot
      // go stale against the round it was made in.
      await load();
      setSelected([]);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setOperation(""); }
  };

  const exportRound = async () => {
    if (!roundId) return;
    setOperation("export");
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/export`, {
        params: { status: statusFilter, search: debouncedSearch || undefined },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const disposition = response.headers["content-disposition"] || "";
      link.href = url;
      link.download = disposition.match(/filename="([^"]+)"/)?.[1] || "round-applications.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.msg || "Could not export this round");
    } finally {
      setOperation("");
    }
  };

  if (!data) return <Page><SkeletonList rows={6} /></Page>;
  const targetEvent = data.targetEvents?.find((event) => event._id === extract.targetEventId);
  const targetRounds = (targetEvent?.verticals || []).flatMap((vertical) =>
    (vertical.rounds || []).map((item) => ({ ...item, verticalTitle: vertical.title })));

  return (
    <Page>
      <Link to={`/event/${eventId}`} className="link text-sm text-ink-3">← Back to event</Link>
      <header className="mt-6"><p className="eyebrow eyebrow-accent">Round workspace</p><h1 className="display mt-2 break-words text-3xl sm:text-4xl">{data.event.title}</h1><p className="mt-3 text-sm text-ink-3">Review submissions, publish exact decisions, and schedule conflict-free slots.</p></header>

      {verticalsEnabled && (
        <div className="mt-7">
          <p className="eyebrow">Vertical</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {verticals.map((item) => (
              <button
                key={item._id}
                type="button"
                aria-pressed={item._id === activeVertical?._id}
                className={`rounded-sm border px-4 py-2 text-sm font-semibold transition-colors ${item._id === activeVertical?._id ? "border-accent bg-accent-tint/50 text-accent" : "border-line text-ink-3 hover:text-ink"}`}
                onClick={() => {
                  setVerticalId(item._id);
                  setRoundId(item.rounds?.[0]?._id || "");
                  setStatusFilter("all");
                  setSelectedTab(false);
                  setPage(1);
                }}
              >
                {item.title}
                {item.status === "closed" && <span className="ml-2 text-xs font-normal text-ink-4">closed</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-3">
            Each vertical runs its own rounds and teams. Decisions here apply only to {activeVertical?.title}.
          </p>
        </div>
      )}

      {finalSelectedCount > 0 && <Card className="mt-7 border-l-4 border-l-ok p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-ok">Final selections</p><h2 className="display mt-1 text-xl">{finalSelectedCount} selected {finalSelectedCount === 1 ? "entry" : "entries"}</h2></div><Button type="button" variant="secondary" size="sm" onClick={() => { setRoundId(verticalRounds.at(-1)?._id || ""); setStatusFilter("advanced"); setSelectedTab(true); setPage(1); }}>View selected</Button></div></Card>}

      <div className="mt-8 overflow-x-auto border-b border-line" role="tablist"><div className="flex min-w-max gap-1">{verticalRounds.map((item) => <button key={item._id} type="button" role="tab" aria-selected={!selectedTab && item._id === roundId} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${!selectedTab && item._id === roundId ? "border-accent text-accent" : "border-transparent text-ink-3 hover:text-ink"}`} onClick={() => { setRoundId(item._id); setStatusFilter("all"); setSelectedTab(false); setPage(1); }}>{item.order}. {item.title}</button>)}<button type="button" role="tab" aria-selected={selectedTab} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${selectedTab ? "border-ok text-ok" : "border-transparent text-ink-3 hover:text-ink"}`} onClick={() => { setRoundId(verticalRounds.at(-1)?._id || ""); setStatusFilter("advanced"); setSelectedTab(true); setPage(1); }}>Selected students ({finalSelectedCount})</button></div></div>

      {round && <Card className="mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge tone="info">{round.type.replaceAll("_", " ")}</Badge><Badge>{round.evaluationScope === "participant" ? "Per student" : "Whole team/application"}</Badge></div><h2 className="display mt-3 text-xl">{round.title}</h2><p className="mt-2 max-w-2xl text-sm text-ink-3">{round.description || "No round description added."}</p></div><div className="text-right text-sm text-ink-3"><p>{data.pagination?.total || 0} matching candidate record(s)</p>{round.submissionDeadlineAt && <p className="mt-1">Deadline {displayDate(round.submissionDeadlineAt)}</p>}{canRemindIncomplete && <Button type="button" variant="accent" size="sm" className="mt-3" loading={operation === "submission-reminders"} disabled={Boolean(operation)} onClick={remindIncomplete}>Email incomplete applications</Button>}</div></div></Card>}

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end"><Field label="Search applications" id="candidate-search"><Input id="candidate-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, email, phone, team, branch…" /></Field><Field label="Status" id="candidate-status"><Select id="candidate-status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setSelectedTab(false); setPage(1); }}><option value="all">All statuses</option><option value="eligible">Eligible</option><option value="scheduled">Scheduled</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="advanced">{finalRound ? "Selected" : "Advanced"}</option><option value="waitlisted">Waitlisted</option><option value="rejected">Rejected</option></Select></Field><div className="flex flex-wrap items-center gap-2 pb-1"><Button type="button" variant="secondary" size="sm" loading={operation === "export"} disabled={!roundId || Boolean(operation)} onClick={exportRound}>Export CSV</Button><Button type="button" variant="secondary" size="sm" disabled={!candidates.length} onClick={toggleAllVisible}>{allVisibleSelected ? "Clear page" : "Select page"}</Button><p className="whitespace-nowrap text-sm text-ink-3">{chosen.length} selected</p></div></div>

      {!candidates.length ? (
        <EmptyState className="mt-6" title="No matching candidates" description="Try another round, status, or search term." />
      ) : (
        <div className="mt-4 space-y-5">
          {candidates.map((candidate) => {
            const registration = registrations.get(candidate.registrationId);
            const submission = submissions.get(candidate._id);
            const slot = slots.get(candidate._id);
            const schedulable = round.scheduleMode === "slots"
              && ["eligible", "scheduled", "active", "submitted", "under_review"].includes(candidate.status);
            return (
              <Card key={candidate._id} className="overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      className="mt-1 h-4 w-4 flex-none accent-[var(--color-accent)]"
                      type="checkbox"
                      checked={selected.includes(candidate._id)}
                      onChange={() => toggle(candidate._id)}
                      aria-label={`Select ${registration?.teamName || candidate.studentId?.name || "candidate"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <CandidateIdentity candidate={candidate} registration={registration} finalRound={finalRound} />
                      <p className="mt-3 text-xs text-ink-4">Applied {displayDate(registration?.registeredAt)}</p>
                      <CrossVerticalStatus candidate={candidate} crossVertical={crossVertical} />
                    </div>
                  </div>
                </div>

                <div className="grid border-t border-line bg-paper-2/20 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)]">
                  <section className="min-w-0 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">Submission</p>
                        <h3 className="mt-1 text-sm font-semibold">Candidate response</h3>
                      </div>
                      {submission && <span className="text-xs text-ink-4">{(submission.answers?.length || 0) + (submission.files?.length || 0)} item(s)</span>}
                    </div>
                    <SubmissionSummary submission={submission} fields={round.submissionFields || []} />
                  </section>

                  <aside className="border-t border-line bg-surface p-5 sm:p-6 lg:border-l lg:border-t-0">
                    <div>
                      <p className="eyebrow">Private review</p>
                      <div className="mt-4 grid gap-4">
                        <Field label="Score (optional)" id={`score-${candidate._id}`}>
                          <Input
                            id={`score-${candidate._id}`}
                            type="number"
                            min="0"
                            value={drafts[candidate._id]?.score ?? candidate.score ?? ""}
                            onChange={(event) => patchDraft(candidate._id, { score: event.target.value })}
                          />
                        </Field>
                        <Field label="Reviewer notes" id={`notes-${candidate._id}`} hint="Visible only to club reviewers.">
                          <Textarea
                            id={`notes-${candidate._id}`}
                            rows="4"
                            className="min-h-0"
                            value={drafts[candidate._id]?.notes ?? candidate.notes ?? ""}
                            onChange={(event) => patchDraft(candidate._id, { notes: event.target.value })}
                          />
                        </Field>
                        <Button type="button" variant="secondary" size="sm" loading={operation === `review-${candidate._id}`} onClick={() => saveReview(candidate)}>
                          Save review
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-line pt-5 text-sm">
                      <p className="eyebrow">Schedule</p>
                      <p className="mt-2 font-semibold text-ink-2">{slot ? displayDate(slot.startAt) : "No slot assigned"}</p>
                      {slot?.venue && <p className="mt-1 text-xs text-ink-3">{slot.venue}</p>}
                      {slot?.meetingUrl && <a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="link mt-1 block break-all text-xs">Meeting link ↗</a>}
                      {schedulable && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-3"
                          onClick={() => setManual({
                            candidateId: candidate._id,
                            startAt: localDateTime(slot?.startAt),
                            endAt: localDateTime(slot?.endAt),
                            venue: slot?.venue || round.venue || "",
                            meetingUrl: slot?.meetingUrl || round.meetingUrl || "",
                          })}
                        >
                          {slot ? "Reschedule" : "Set slot"}
                        </Button>
                      )}
                    </div>
                  </aside>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {data.pagination?.pages > 1 && <div className="mt-6 flex items-center justify-between gap-4"><Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</Button><p className="text-sm text-ink-3">Page {data.pagination.page} of {data.pagination.pages}</p><Button type="button" variant="secondary" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div>}

      {candidates.length > 0 && <Card className="sticky bottom-4 z-20 mt-6 p-4 shadow-lg sm:p-5"><div className="flex flex-wrap items-center gap-3"><p className="mr-auto text-sm font-semibold">{chosen.length ? `${chosen.length} selected` : "Select candidates to publish a decision"}</p><Button type="button" loading={operation === "decision-advanced"} disabled={!chosen.length || Boolean(operation)} onClick={() => publish("advanced")}>{finalRound ? "Select candidates" : "Advance selected"}</Button><Button type="button" variant="secondary" loading={operation === "decision-waitlisted"} disabled={!chosen.length || Boolean(operation)} onClick={() => publish("waitlisted")}>Waitlist selected</Button><Button type="button" variant="danger" loading={operation === "decision-rejected"} disabled={!chosen.length || Boolean(operation)} onClick={() => publish("rejected")}>Reject selected</Button></div></Card>}

      {round?.scheduleMode === "slots" && <Card className="mt-6 p-5 sm:p-6"><h2 className="display text-xl">Auto-schedule selected</h2><p className="mt-2 text-sm text-ink-3">Set an easy-to-read window. Existing slots across all clubs are checked before assignment.</p><form onSubmit={autoSchedule} className="mt-5 grid gap-4 lg:grid-cols-2"><Field label="Window starts" id="windowStart"><DateTimeInput id="windowStart" required value={autoForm.startAt} onChange={(value) => setAutoForm({ ...autoForm, startAt: value })} /></Field><Field label="Window ends" id="windowEnd"><DateTimeInput id="windowEnd" required value={autoForm.endAt} onChange={(value) => setAutoForm({ ...autoForm, endAt: value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Slot minutes" id="duration"><Input id="duration" type="number" min="5" value={autoForm.durationMinutes} onChange={(event) => setAutoForm({ ...autoForm, durationMinutes: Number(event.target.value) })} /></Field><Field label="Buffer minutes" id="buffer"><Input id="buffer" type="number" min="0" value={autoForm.bufferMinutes} onChange={(event) => setAutoForm({ ...autoForm, bufferMinutes: Number(event.target.value) })} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Venue" id="venue"><Input id="venue" value={autoForm.venue} onChange={(event) => setAutoForm({ ...autoForm, venue: event.target.value })} /></Field><Field label="Meeting link" id="meeting"><Input id="meeting" type="url" value={autoForm.meetingUrl} onChange={(event) => setAutoForm({ ...autoForm, meetingUrl: event.target.value })} /></Field></div><div className="lg:col-span-2"><Button type="submit" loading={operation === "auto-schedule"} disabled={!chosen.length || Boolean(operation)}>Schedule {chosen.length || "selected"}</Button></div></form></Card>}

      {data.targetEvents?.length > 0 && <Card className="mt-6 p-5 sm:p-6"><h2 className="display text-xl">Add selected to another event</h2><p className="mt-2 text-sm text-ink-3">Only advanced candidates are imported. Individual candidate entries remain individual.</p><form onSubmit={extractCandidates} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"><Field label="Target event" id="targetEvent"><Select id="targetEvent" required value={extract.targetEventId} onChange={(event) => setExtract({ targetEventId: event.target.value, targetRoundId: "" })}><option value="">Choose event</option>{data.targetEvents.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}</Select></Field><Field label="Start in round" id="targetRound"><Select id="targetRound" required disabled={!targetEvent} value={extract.targetRoundId} onChange={(event) => setExtract({ ...extract, targetRoundId: event.target.value })}><option value="">Choose round</option>{targetRounds.map((item) => <option key={item._id} value={item._id}>{targetEvent?.verticalsEnabled ? `${item.verticalTitle} — ` : ""}{item.order}. {item.title}</option>)}</Select></Field><div className="flex items-end"><Button type="submit" loading={operation === "extract"} disabled={!chosen.length || Boolean(operation)}>Add candidates</Button></div></form></Card>}

      {manual && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/55 p-4 backdrop-blur-sm"><Card className="w-full max-w-2xl animate-scale-in p-5 sm:p-6"><h2 className="display text-xl">Set participant slot</h2><p className="mt-1.5 text-sm text-ink-3">The slot is checked against every participant’s existing interviews.</p><form onSubmit={saveManual} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Starts" id="manualStart"><DateTimeInput id="manualStart" required value={manual.startAt} onChange={(value) => setManual({ ...manual, startAt: value })} /></Field><Field label="Ends" id="manualEnd"><DateTimeInput id="manualEnd" required value={manual.endAt} onChange={(value) => setManual({ ...manual, endAt: value })} /></Field><Field label="Venue" id="manualVenue"><Input id="manualVenue" value={manual.venue} onChange={(event) => setManual({ ...manual, venue: event.target.value })} /></Field><Field label="Meeting link" id="manualMeeting"><Input id="manualMeeting" type="url" value={manual.meetingUrl} onChange={(event) => setManual({ ...manual, meetingUrl: event.target.value })} /></Field><div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" loading={operation === "manual-schedule"} disabled={Boolean(operation)}>Check and save</Button><Button type="button" variant="secondary" disabled={Boolean(operation)} onClick={() => setManual(null)}>Cancel</Button></div></form></Card></div>}
    </Page>
  );
}
