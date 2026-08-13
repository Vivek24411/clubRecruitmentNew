import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Badge, Button, Card, EmptyState, Field, Input, Page, Select, SkeletonList, Textarea } from "../components/ui";

const STATUS_TONES = { advanced: "ok", rejected: "bad", submitted: "info", under_review: "warn", scheduled: "info", eligible: "neutral" };
const displayDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled";

function CandidateName({ candidate, registration }) {
  if (candidate.scope === "participant") {
    const student = candidate.studentId || candidate.participantIds?.[0];
    return <><p className="font-semibold">{student?.name || "Student"}</p><p className="mt-0.5 break-all text-xs text-ink-3">{student?.email}</p></>;
  }
  return <><p className="font-semibold">{registration?.teamName || registration?.studentId?.name || "Application"}</p><p className="mt-0.5 text-xs text-ink-3">{candidate.participantIds?.length || 0} participant(s)</p></>;
}

export default function EventRegisteredStudents() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [roundId, setRoundId] = useState("");
  const [selected, setSelected] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState(false);
  const [autoForm, setAutoForm] = useState({ startAt: "", endAt: "", durationMinutes: 20, bufferMinutes: 0, venue: "", meetingUrl: "" });
  const [manual, setManual] = useState(null);
  const [extract, setExtract] = useState({ targetEventId: "", targetRoundId: "" });

  const load = useCallback(async () => {
    try {
      const { data: response } = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/workflow`);
      if (!response.success) throw new Error(response.msg);
      setData(response);
      setRoundId((current) => current || response.event.rounds?.[0]?._id || "");
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load event workflow");
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected([]); setDrafts({}); }, [roundId]);

  const round = data?.event?.rounds?.find((item) => item._id === roundId);
  const registrations = useMemo(() => new Map((data?.registrations || []).map((item) => [item._id, item])), [data]);
  const slots = useMemo(() => new Map((data?.slots || []).filter((slot) => slot.status !== "cancelled").map((slot) => [slot.candidateId, slot])), [data]);
  const submissions = useMemo(() => new Map((data?.submissions || []).map((submission) => [submission.candidateId, submission])), [data]);
  const candidates = useMemo(() => (data?.candidates || []).filter((candidate) => candidate.roundId === roundId && [candidate, registrations.get(candidate.registrationId)].some((item) => JSON.stringify(item || {}).toLowerCase().includes(search.toLowerCase()))), [data, registrations, roundId, search]);
  const chosen = candidates.filter((candidate) => selected.includes(candidate._id));

  const toggle = (candidateId) => setSelected((previous) => previous.includes(candidateId) ? previous.filter((id) => id !== candidateId) : [...previous, candidateId]);
  const patchDraft = (candidateId, changes) => setDrafts((previous) => ({ ...previous, [candidateId]: { ...(previous[candidateId] || {}), ...changes } }));

  const publish = async (status) => {
    if (!chosen.length) return toast.warning("Select at least one candidate");
    setWorking(true);
    try {
      const decisions = chosen.map((candidate) => ({ candidateId: candidate._id, status, score: drafts[candidate._id]?.score ?? candidate.score, notes: drafts[candidate._id]?.notes ?? candidate.notes }));
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/decisions`, { decisions });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
      setSelected([]);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setWorking(false); }
  };

  const autoSchedule = async (event) => {
    event.preventDefault();
    if (!chosen.length) return toast.warning("Select the candidates for this scheduling window");
    setWorking(true);
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/slots/auto`, { candidateIds: chosen.map((item) => item._id), ...autoForm });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setWorking(false); }
  };

  const saveManual = async (event) => {
    event.preventDefault();
    setWorking(true);
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/slots`, manual);
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
      setManual(null);
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setWorking(false); }
  };

  const extractCandidates = async (event) => {
    event.preventDefault();
    const advanced = chosen.filter((candidate) => candidate.status === "advanced");
    if (!advanced.length) return toast.warning("Select candidates who have advanced from this round");
    setWorking(true);
    try {
      const { data: response } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/rounds/${roundId}/extract`, { candidateIds: advanced.map((item) => item._id), ...extract });
      if (!response.success) throw new Error(response.msg);
      toast.success(response.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setWorking(false); }
  };

  if (!data) return <Page><SkeletonList rows={6} /></Page>;
  const targetEvent = data.targetEvents?.find((event) => event._id === extract.targetEventId);

  return (
    <Page>
      <Link to={`/event/${eventId}`} className="link text-sm text-ink-3">Back to event</Link>
      <header className="mt-6"><p className="eyebrow eyebrow-accent">Round workspace</p><h1 className="display mt-2 break-words text-3xl sm:text-4xl">{data.event.title}</h1><p className="mt-3 text-sm text-ink-3">Review work, publish decisions, schedule conflict-free slots, and move selected candidates into another event.</p></header>

      <div className="mt-8 overflow-x-auto border-b border-line" role="tablist">
        <div className="flex min-w-max gap-1">{data.event.rounds.map((item) => <button key={item._id} type="button" role="tab" aria-selected={item._id === roundId} className={`border-b-2 px-4 py-3 text-sm font-semibold ${item._id === roundId ? "border-accent text-accent" : "border-transparent text-ink-3"}`} onClick={() => setRoundId(item._id)}>{item.order}. {item.title}</button>)}</div>
      </div>

      {round && <Card className="mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge tone="info">{round.type.replaceAll("_", " ")}</Badge><Badge>{round.evaluationScope === "participant" ? "Per student" : "Whole application"}</Badge></div><h2 className="display mt-3 text-xl">{round.title}</h2><p className="mt-2 max-w-2xl text-sm text-ink-3">{round.description || "No round description added."}</p></div><div className="text-right text-sm text-ink-3"><p>{candidates.length} candidate record(s)</p>{round.submissionDeadlineAt && <p className="mt-1">Deadline {displayDate(round.submissionDeadlineAt)}</p>}</div></div></Card>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Input aria-label="Search candidates" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, team, branch..." className="sm:max-w-md" /><p className="text-sm text-ink-3">{selected.length} selected</p></div>

      {!candidates.length ? <EmptyState className="mt-6" title="No candidates in this round" description="Candidates appear here after registration or after they advance from the previous round." /> : <div className="mt-4 space-y-3">{candidates.map((candidate) => {
        const registration = registrations.get(candidate.registrationId);
        const submission = submissions.get(candidate._id);
        const slot = slots.get(candidate._id);
        return <Card key={candidate._id} className="p-4 sm:p-5"><div className="grid gap-4 lg:grid-cols-[minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(13rem,1fr)_auto] lg:items-start"><label className="flex min-w-0 items-start gap-3"><input className="mt-1" type="checkbox" checked={selected.includes(candidate._id)} onChange={() => toggle(candidate._id)} /><span className="min-w-0"><CandidateName candidate={candidate} registration={registration} /><Badge className="mt-2 capitalize" tone={STATUS_TONES[candidate.status]}>{candidate.status.replaceAll("_", " ")}</Badge></span></label><div className="min-w-0 text-sm"><p className="eyebrow">Work</p>{submission ? <><p className="mt-2">Revision {submission.revision} submitted {displayDate(submission.submittedAt)}</p>{submission.answers?.map((answer) => <a key={answer.key} href={answer.value} target="_blank" rel="noreferrer" className="link mt-1 block break-all text-xs">{answer.key}: {answer.value}</a>)}{submission.files?.map((file) => <a key={file.publicId} href={file.url} target="_blank" rel="noreferrer" className="link mt-1 block break-all text-xs">{file.originalName || file.fieldKey}</a>)}</> : <p className="mt-2 text-ink-3">No submission</p>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><Field label="Score (optional)" id={`score-${candidate._id}`}><Input id={`score-${candidate._id}`} type="number" min="0" value={drafts[candidate._id]?.score ?? candidate.score ?? ""} onChange={(event) => patchDraft(candidate._id, { score: event.target.value })} /></Field><Field label="Notes (optional)" id={`notes-${candidate._id}`}><Textarea id={`notes-${candidate._id}`} rows="2" className="min-h-0" value={drafts[candidate._id]?.notes ?? candidate.notes ?? ""} onChange={(event) => patchDraft(candidate._id, { notes: event.target.value })} /></Field></div><div className="min-w-40 text-sm"><p className="eyebrow">Schedule</p><p className="mt-2 text-ink-2">{slot ? displayDate(slot.startAt) : "No slot"}</p>{slot?.venue && <p className="mt-1 text-xs text-ink-3">{slot.venue}</p>}{round.scheduleMode === "slots" && <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setManual({ candidateId: candidate._id, startAt: slot?.startAt ? new Date(new Date(slot.startAt).getTime() - new Date(slot.startAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "", endAt: slot?.endAt ? new Date(new Date(slot.endAt).getTime() - new Date(slot.endAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "", venue: slot?.venue || round.venue || "", meetingUrl: slot?.meetingUrl || round.meetingUrl || "" })}>{slot ? "Reschedule" : "Set slot"}</Button>}</div></div></Card>;
      })}</div>}

      {candidates.length > 0 && <Card className="mt-6 p-5 sm:p-6"><div className="flex flex-wrap gap-3"><Button type="button" loading={working} disabled={!selected.length} onClick={() => publish("advanced")}>Advance selected</Button><Button type="button" variant="danger" loading={working} disabled={!selected.length} onClick={() => publish("rejected")}>Reject selected</Button></div></Card>}

      {round?.scheduleMode === "slots" && <Card className="mt-6 p-5 sm:p-6"><h2 className="display text-xl">Auto schedule selected</h2><p className="mt-2 text-sm text-ink-3">Choose a time window. Existing interviews across all clubs are checked before each slot is assigned.</p><form onSubmit={autoSchedule} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Window starts" id="windowStart"><Input id="windowStart" type="datetime-local" required value={autoForm.startAt} onChange={(event) => setAutoForm({ ...autoForm, startAt: event.target.value })} /></Field><Field label="Window ends" id="windowEnd"><Input id="windowEnd" type="datetime-local" required value={autoForm.endAt} onChange={(event) => setAutoForm({ ...autoForm, endAt: event.target.value })} /></Field><Field label="Slot minutes" id="duration"><Input id="duration" type="number" min="5" value={autoForm.durationMinutes} onChange={(event) => setAutoForm({ ...autoForm, durationMinutes: Number(event.target.value) })} /></Field><Field label="Buffer minutes" id="buffer"><Input id="buffer" type="number" min="0" value={autoForm.bufferMinutes} onChange={(event) => setAutoForm({ ...autoForm, bufferMinutes: Number(event.target.value) })} /></Field><Field label="Venue" id="venue"><Input id="venue" value={autoForm.venue} onChange={(event) => setAutoForm({ ...autoForm, venue: event.target.value })} /></Field><Field label="Meeting link" id="meeting"><Input id="meeting" type="url" value={autoForm.meetingUrl} onChange={(event) => setAutoForm({ ...autoForm, meetingUrl: event.target.value })} /></Field><div className="flex items-end sm:col-span-2"><Button type="submit" loading={working} disabled={!selected.length}>Schedule {selected.length || "selected"}</Button></div></form></Card>}

      {data.targetEvents?.length > 0 && <Card className="mt-6 p-5 sm:p-6"><h2 className="display text-xl">Add selected to another event</h2><p className="mt-2 text-sm text-ink-3">Only candidates already advanced from this round are imported. Existing target registrations are reused.</p><form onSubmit={extractCandidates} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"><Field label="Target event" id="targetEvent"><Select id="targetEvent" required value={extract.targetEventId} onChange={(event) => setExtract({ targetEventId: event.target.value, targetRoundId: "" })}><option value="">Choose event</option>{data.targetEvents.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}</Select></Field><Field label="Start in round" id="targetRound"><Select id="targetRound" required disabled={!targetEvent} value={extract.targetRoundId} onChange={(event) => setExtract({ ...extract, targetRoundId: event.target.value })}><option value="">Choose round</option>{targetEvent?.rounds?.map((item) => <option key={item._id} value={item._id}>{item.order}. {item.title}</option>)}</Select></Field><div className="flex items-end"><Button type="submit" loading={working} disabled={!selected.length}>Add candidates</Button></div></form></Card>}

      {manual && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-4"><Card className="w-full max-w-xl p-5 sm:p-6"><h2 className="display text-xl">Set participant slot</h2><form onSubmit={saveManual} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Starts" id="manualStart"><Input id="manualStart" type="datetime-local" required value={manual.startAt} onChange={(event) => setManual({ ...manual, startAt: event.target.value })} /></Field><Field label="Ends" id="manualEnd"><Input id="manualEnd" type="datetime-local" required value={manual.endAt} onChange={(event) => setManual({ ...manual, endAt: event.target.value })} /></Field><Field label="Venue" id="manualVenue"><Input id="manualVenue" value={manual.venue} onChange={(event) => setManual({ ...manual, venue: event.target.value })} /></Field><Field label="Meeting link" id="manualMeeting"><Input id="manualMeeting" type="url" value={manual.meetingUrl} onChange={(event) => setManual({ ...manual, meetingUrl: event.target.value })} /></Field><div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" loading={working}>Check and save</Button><Button type="button" variant="secondary" onClick={() => setManual(null)}>Cancel</Button></div></form></Card></div>}
    </Page>
  );
}
