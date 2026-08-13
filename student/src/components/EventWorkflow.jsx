import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Badge, Button, Card, Field, Input, SkeletonList, Textarea } from "./ui";

const tone = { advanced: "ok", rejected: "bad", submitted: "info", under_review: "warn", scheduled: "info", eligible: "neutral", active: "accent" };
const format = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

function SubmissionForm({ eventId, round, candidate, existing, onSaved }) {
  const initialAnswers = Object.fromEntries((existing?.answers || []).map((answer) => [answer.key, answer.value]));
  const [answers, setAnswers] = useState(initialAnswers);
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const canSubmit = !round.submissionOpensAt || new Date(round.submissionOpensAt) <= new Date();
  const beforeDeadline = !round.submissionDeadlineAt || new Date(round.submissionDeadlineAt) >= new Date();

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("candidateId", candidate._id);
      payload.append("answersJSON", JSON.stringify(Object.entries(answers).map(([key, value]) => ({ key, value }))));
      const keys = [];
      Object.entries(files).forEach(([key, file]) => {
        if (!file) return;
        payload.append("files", file);
        keys.push(key);
      });
      payload.append("fileKeysJSON", JSON.stringify(keys));
      const { data } = await axios.put(`${import.meta.env.VITE_BASE_URI}/student/events/${eventId}/rounds/${round._id}/submission`, payload);
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      setFiles({});
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not submit work");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-line pt-5">
      {(round.submissionFields || []).map((field) => (
        <Field key={field.key} label={field.label} id={`${candidate._id}-${field.key}`} required={field.required} hint={field.helpText}>
          {["file", "pdf", "video"].includes(field.type) ? (
            <>
              <input
                id={`${candidate._id}-${field.key}`}
                type="file"
                required={field.required && !existing?.files?.some((file) => file.fieldKey === field.key)}
                accept={field.type === "video" ? "video/mp4,video/webm,video/quicktime" : field.type === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,application/pdf"}
                onChange={(event) => setFiles({ ...files, [field.key]: event.target.files[0] || null })}
                className="block w-full text-sm"
              />
              {existing?.files?.filter((file) => file.fieldKey === field.key).map((file) => <a key={file.publicId} href={file.url} target="_blank" rel="noreferrer" className="link mt-2 block break-all text-xs">Current: {file.originalName || field.label}</a>)}
            </>
          ) : field.type === "text" ? (
            <Textarea id={`${candidate._id}-${field.key}`} rows="4" required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
          ) : (
            <Input id={`${candidate._id}-${field.key}`} type="url" required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} placeholder={field.type === "github" ? "https://github.com/..." : "https://"} />
          )}
        </Field>
      ))}
      <Button type="submit" loading={saving} disabled={!canSubmit || !beforeDeadline || (existing && !round.allowResubmission)}>
        {saving ? "Uploading..." : existing ? "Update submission" : "Submit work"}
      </Button>
      {!canSubmit && <p className="text-sm text-warn">Submissions open {format(round.submissionOpensAt)}.</p>}
      {!beforeDeadline && <p className="text-sm text-bad">The submission deadline has passed.</p>}
    </form>
  );
}

export default function EventWorkflow({ eventId }) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try {
      const { data: response } = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/events/${eventId}/workflow`);
      if (!response.success) throw new Error(response.msg);
      setData(response);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load your round progress");
    }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);
  const candidatesByRound = useMemo(() => {
    const map = new Map();
    (data?.candidates || []).forEach((candidate) => {
      if (!map.has(candidate.roundId)) map.set(candidate.roundId, []);
      map.get(candidate.roundId).push(candidate);
    });
    return map;
  }, [data]);
  const submissionByCandidate = useMemo(() => new Map((data?.submissions || []).map((submission) => [submission.candidateId, submission])), [data]);
  const slotByCandidate = useMemo(() => new Map((data?.slots || []).map((slot) => [slot.candidateId, slot])), [data]);

  if (!data) return <SkeletonList rows={3} className="mt-6" />;
  if (!data.registration) return null;
  return (
    <section className="ruled-top pt-8">
      <h2 className="display text-xl">Your event progress</h2>
      <p className="mt-2 text-sm text-ink-3">Round access, submissions, decisions, and schedules appear here.</p>
      <div className="mt-6 space-y-4">
        {data.event.rounds.map((round) => {
          const candidates = candidatesByRound.get(round._id) || [];
          return <Card key={round._id} className={`p-4 sm:p-5 ${!candidates.length ? "opacity-65" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Round {round.order}</p><h3 className="display mt-1 text-lg">{round.title}</h3><p className="mt-2 text-sm text-ink-3">{round.description || round.instructions || "Details will be shared by the club."}</p></div>{candidates.length ? <div className="flex flex-wrap gap-2">{candidates.map((candidate) => <Badge key={candidate._id} tone={tone[candidate.status]} className="capitalize">{candidate.status.replaceAll("_", " ")}</Badge>)}</div> : <Badge>Locked</Badge>}</div>{round.scheduleMode === "common" && round.startsAt && <div className="mt-4 rounded-sm bg-paper-2 px-4 py-3 text-sm"><strong>{format(round.startsAt)}</strong>{round.venue && <span className="text-ink-3"> at {round.venue}</span>}</div>}{candidates.map((candidate) => { const slot = slotByCandidate.get(candidate._id); const submission = submissionByCandidate.get(candidate._id); return <div key={candidate._id}>{slot && <div className="mt-4 rounded-sm border-l-2 border-accent bg-accent-tint/40 px-4 py-3 text-sm"><p className="font-semibold">Your slot: {format(slot.startAt)}</p>{slot.venue && <p className="mt-1 text-ink-3">{slot.venue}</p>}{slot.meetingUrl && <a className="link mt-1 block" href={slot.meetingUrl} target="_blank" rel="noreferrer">Open meeting link</a>}</div>}{round.submissionEnabled && !["advanced", "rejected", "missed", "withdrawn"].includes(candidate.status) && <SubmissionForm eventId={eventId} round={round} candidate={candidate} existing={submission} onSaved={load} />}</div>;})}</Card>;
        })}
      </div>
    </section>
  );
}
