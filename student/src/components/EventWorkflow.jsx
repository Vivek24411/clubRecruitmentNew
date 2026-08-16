import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Badge, Button, Card, Field, Input, SkeletonList, Textarea } from "./ui";
import { uploadDirect } from "../utils/directUpload";

const tone = { advanced: "ok", rejected: "bad", waitlisted: "warn", submitted: "info", under_review: "warn", scheduled: "info", eligible: "neutral", active: "accent", withdrawn: "neutral", revoked: "neutral", missed: "bad" };
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
      const entries = Object.entries(files).filter(([, file]) => Boolean(file));
      const directAssets = await Promise.all(entries.map(([, file]) =>
        uploadDirect(file, { role: "student", kind: "submission" })));
      const payload = {
        candidateId: candidate._id,
        answersJSON: JSON.stringify(Object.entries(answers).map(([key, value]) => ({ key, value }))),
        fileKeysJSON: JSON.stringify(entries.map(([key]) => key)),
        directAssets,
      };
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

function SubmissionReadOnly({ submission }) {
  if (!submission) return null;
  return (
    <div className="mt-4 rounded-sm border border-line bg-paper-2/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Your submitted work</p>
        <span className="text-xs text-ink-3">Revision {submission.revision} · {format(submission.submittedAt)}</span>
      </div>
      <div className="mt-3 space-y-2">
        {(submission.answers || []).map((answer) => (
          <div key={answer.key} className="rounded-sm bg-surface px-3 py-2.5">
            <p className="eyebrow">{answer.key.replaceAll("_", " ")}</p>
            {/^https?:\/\//i.test(answer.value) ? <a href={answer.value} target="_blank" rel="noreferrer" className="link link-accent mt-1 block break-all text-sm">{answer.value} ↗</a> : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{answer.value}</p>}
          </div>
        ))}
        {(submission.files || []).map((file) => <a key={file.publicId} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-sm bg-surface px-3 py-2.5 text-sm font-semibold text-accent"><span className="truncate">{file.originalName || file.fieldKey}</span><span>Open ↗</span></a>)}
      </div>
      <p className="mt-3 text-xs text-ink-3">This submission is read-only because the round was decided or its deadline passed.</p>
    </div>
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
  const submissionByCandidate = useMemo(() => {
    const latest = new Map();
    (data?.submissions || []).forEach((submission) => {
      if (!latest.has(submission.candidateId)) latest.set(submission.candidateId, submission);
    });
    return latest;
  }, [data]);
  const slotByCandidate = useMemo(() => new Map((data?.slots || []).map((slot) => [slot.candidateId, slot])), [data]);

  if (!data) return <SkeletonList rows={3} className="mt-6" />;
  if (!data.registration) return null;
  const finalRoundId = data.event.rounds.at(-1)?._id;
  const finalStatus = data.studentOverallStatus || data.registration.overallStatus;
  return (
    <section className="ruled-top pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="display text-xl">Your event progress</h2><p className="mt-2 text-sm text-ink-3">Every team member’s exact round result, submission, and schedule appears here.</p></div>{["selected", "rejected", "waitlisted", "withdrawn"].includes(finalStatus) && <Badge tone={finalStatus === "selected" ? "ok" : finalStatus === "rejected" ? "bad" : finalStatus === "waitlisted" ? "warn" : "neutral"} className="px-4 py-2 text-base capitalize">{finalStatus}</Badge>}</div>
      <div className="mt-6 space-y-4">
        {data.event.rounds.map((round) => {
          const candidates = candidatesByRound.get(round._id) || [];
          const hasPublishedDetails = Boolean(round.description || round.instructions || round.startsAt || round.venue || round.meetingUrl || round.submissionDeadlineAt);
          return (
            <Card key={round._id} className={`overflow-hidden ${!candidates.length ? "opacity-65" : ""}`}>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Round {round.order}</p>
                    <h3 className="display mt-1 text-lg">{round.title}</h3>
                    {hasPublishedDetails ? <p className="mt-2 text-sm text-ink-3">{round.description || round.instructions || (round.submissionDeadlineAt ? `Submission deadline: ${format(round.submissionDeadlineAt)}` : "Schedule details are available below.")}</p> : candidates.length > 0 ? <p className="mt-2 text-sm text-ink-3">Details will be shared by the club.</p> : null}
                  </div>
                  {!candidates.length && <Badge>Locked</Badge>}
                </div>
                {round.scheduleMode === "common" && round.startsAt && <div className="mt-4 rounded-sm bg-paper-2 px-4 py-3 text-sm"><strong>{format(round.startsAt)}</strong>{round.venue && <span className="text-ink-3"> at {round.venue}</span>}{round.meetingUrl && <a className="link mt-1 block" href={round.meetingUrl} target="_blank" rel="noreferrer">Open meeting link ↗</a>}</div>}
              </div>
              {candidates.map((candidate) => {
                const slot = slotByCandidate.get(candidate._id);
                const submission = submissionByCandidate.get(candidate._id);
                const person = candidate.scope === "participant" ? candidate.studentId?.name || "Team member" : data.registration.teamName || "Team / application";
                const statusLabel = round._id === finalRoundId && candidate.status === "advanced" ? "selected" : candidate.status.replaceAll("_", " ");
                const terminal = ["advanced", "rejected", "waitlisted", "missed", "withdrawn", "revoked"].includes(candidate.status);
                const deadlinePassed = round.submissionDeadlineAt && new Date(round.submissionDeadlineAt) < new Date();
                const editableSubmission = round.submissionEnabled && candidate.canAct && !terminal && !deadlinePassed;
                return (
                  <div key={candidate._id} className="border-t border-line p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{person}</p>
                        <p className="mt-0.5 text-xs text-ink-3">{candidate.scope === "participant" ? "Individual result" : `${candidate.participantIds?.length || 1} participant(s) · Team result`}</p>
                        {candidate.scope === "application" && candidate.participantIds?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{candidate.participantIds.map((student) => <span key={student._id || student} className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-xs font-medium text-ink-2">{student.name || "Team member"}</span>)}</div>}
                      </div>
                      <Badge tone={tone[candidate.status]} className="px-3 py-1.5 text-sm capitalize">{statusLabel}</Badge>
                    </div>
                    {slot && <div className="mt-4 rounded-sm border-l-2 border-accent bg-accent-tint/40 px-4 py-3 text-sm"><p className="font-semibold">{candidate.scope === "participant" ? `${person}'s slot` : "Team slot"}: {format(slot.startAt)}</p>{slot.venue && <p className="mt-1 text-ink-3">{slot.venue}</p>}{slot.meetingUrl && <a className="link mt-1 block" href={slot.meetingUrl} target="_blank" rel="noreferrer">Open meeting link ↗</a>}</div>}
                    {submission && !editableSubmission && <SubmissionReadOnly submission={submission} />}
                    {editableSubmission && <SubmissionForm eventId={eventId} round={round} candidate={candidate} existing={submission} onSaved={load} />}
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
