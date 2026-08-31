import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Badge, Button, Card, Field, Input, Select, SkeletonList, Textarea } from "./ui";
import { uploadDirect } from "../utils/directUpload";

const tone = { advanced: "ok", rejected: "bad", waitlisted: "warn", submitted: "info", under_review: "warn", scheduled: "info", eligible: "neutral", active: "accent", withdrawn: "neutral", revoked: "neutral", missed: "bad" };
const roundTypeLabel = { test: "Test", submission: "Submission", interview: "Interview", group_discussion: "Group discussion", presentation: "Presentation", hackathon: "Hackathon", custom: "Custom" };
const format = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
const MEGABYTE = 1024 * 1024;
const fileSize = (bytes) => bytes ? `${(bytes / MEGABYTE).toFixed(bytes >= 10 * MEGABYTE ? 0 : 1)} MB` : "";
const uploadHint = (type) => type === "video"
  ? "MP4, WebM, or MOV up to 100 MB."
  : type === "pdf"
    ? "PDF up to 10 MB."
    : "JPG, PNG, or WebP up to 25 MB (large images are optimized before upload), or PDF up to 10 MB.";

function pickedFileError(file) {
  if (file.type.startsWith("image/") && file.size > 25 * MEGABYTE) return "Choose an image no larger than 25 MB";
  if (file.type === "application/pdf" && file.size > 10 * MEGABYTE) return "Choose a PDF no larger than 10 MB";
  if (file.type.startsWith("video/") && file.size > 100 * MEGABYTE) return "Choose a video no larger than 100 MB";
  return "";
}

async function openProtectedFile(file) {
  try {
    const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}${file.downloadPath}`);
    if (!data.download?.url) throw new Error("Download is unavailable");
    window.open(data.download.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(error.response?.data?.msg || error.message || "Could not open this attachment");
  }
}

export function SubmissionForm({ eventId, round, candidate, existing, onSaved, verticalId, initialApplication = false }) {
  const initialAnswers = Object.fromEntries((existing?.answers || []).map((answer) => [answer.key, answer.value]));
  const [answers, setAnswers] = useState(initialAnswers);
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const inputId = candidate?._id || verticalId || "application";
  const canSubmit = !round.submissionOpensAt || new Date(round.submissionOpensAt) <= new Date();
  const beforeDeadline = !round.submissionDeadlineAt || new Date(round.submissionDeadlineAt) >= new Date();

  const chooseFile = (fieldKey, event) => {
    const file = event.target.files[0] || null;
    const error = file && pickedFileError(file);
    if (error) {
      event.target.value = "";
      toast.error(error);
      setFiles((current) => ({ ...current, [fieldKey]: null }));
      return;
    }
    setFiles((current) => ({ ...current, [fieldKey]: file }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const entries = Object.entries(files).filter(([, file]) => Boolean(file));
      const directAssets = await Promise.all(entries.map(([, file]) =>
        uploadDirect(file, { role: "student", kind: "submission" })));
      const payload = {
        ...(candidate?._id ? { candidateId: candidate._id } : {}),
        ...(verticalId ? { verticalId } : {}),
        answersJSON: JSON.stringify(Object.entries(answers).map(([key, value]) => ({ key, value }))),
        fileKeysJSON: JSON.stringify(entries.map(([key]) => key)),
        directAssets,
      };
      const url = initialApplication
        ? `${import.meta.env.VITE_BASE_URI}/student/events/${eventId}/application`
        : `${import.meta.env.VITE_BASE_URI}/student/events/${eventId}/rounds/${round._id}/submission`;
      const { data } = await axios({ method: initialApplication ? "post" : "put", url, data: payload });
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      setFiles({});
      await onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not submit work");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-line pt-5">
      {(round.submissionFields || []).map((field) => (
        <Field key={field.key} label={field.label} id={`${inputId}-${field.key}`} required={field.required} hint={[field.helpText, ["file", "pdf", "video"].includes(field.type) ? uploadHint(field.type) : ""].filter(Boolean).join(" ")}>
          {["file", "pdf", "video"].includes(field.type) ? (
            <>
              <input
                id={`${inputId}-${field.key}`}
                type="file"
                required={field.required && !existing?.files?.some((file) => file.fieldKey === field.key)}
                accept={field.type === "video" ? "video/mp4,video/webm,video/quicktime" : field.type === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,application/pdf"}
                onChange={(event) => chooseFile(field.key, event)}
                className="block w-full rounded-sm border border-dashed border-line-2 bg-paper-2/45 p-3 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
              {files[field.key] && <p className="mt-2 text-xs font-medium text-ink-2">Selected: {files[field.key].name} · {fileSize(files[field.key].size)}</p>}
              {existing?.files?.filter((file) => file.fieldKey === field.key).map((file) => <button type="button" key={file.publicId} onClick={() => openProtectedFile(file)} className="link mt-2 block break-all text-left text-xs">Current: {file.originalName || field.label}</button>)}
            </>
          ) : field.type === "boolean" ? (
            <label className="flex items-start gap-3 rounded-sm border border-line bg-surface px-4 py-3 text-sm text-ink-2">
              <input id={`${inputId}-${field.key}`} type="checkbox" required={field.required} checked={answers[field.key] === "true"} onChange={(event) => setAnswers({ ...answers, [field.key]: String(event.target.checked) })} className="mt-0.5" />
              <span>Select to confirm</span>
            </label>
          ) : field.type === "select" ? (
            <Select id={`${inputId}-${field.key}`} required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })}>
              <option value="">Choose an option</option>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          ) : ["text", "long_text"].includes(field.type) ? (
            <Textarea id={`${inputId}-${field.key}`} rows="4" required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
          ) : field.type === "short_text" ? (
            <Input id={`${inputId}-${field.key}`} type="text" required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
          ) : (
            <Input id={`${inputId}-${field.key}`} type="url" required={field.required} value={answers[field.key] || ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} placeholder={field.type === "github" ? "https://github.com/..." : field.type === "drive_link" ? "https://drive.google.com/..." : "https://"} />
          )}
        </Field>
      ))}
      <Button type="submit" loading={saving} disabled={!canSubmit || !beforeDeadline || (existing && !round.allowResubmission)}>
        {saving ? "Uploading..." : initialApplication ? "Submit application" : existing ? "Update submission" : "Submit work"}
      </Button>
      {!canSubmit && <p className="text-sm text-warn">Submissions open {format(round.submissionOpensAt)}.</p>}
      {!beforeDeadline && <p className="text-sm text-bad">The submission deadline has passed.</p>}
    </form>
  );
}

function SubmissionReadOnly({ submission, fields = [] }) {
  if (!submission) return null;
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  return (
    <div className="mt-4 rounded-sm border border-line bg-paper-2/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Your submitted work</p>
        <span className="text-xs text-ink-3">Revision {submission.revision} · {format(submission.submittedAt)}</span>
      </div>
      <div className="mt-3 space-y-2">
        {(submission.answers || []).map((answer) => (
          <div key={answer.key} className="rounded-sm bg-surface px-3 py-2.5">
            <p className="eyebrow">{fieldByKey.get(answer.key)?.label || answer.key.replaceAll("_", " ")}</p>
            {fieldByKey.get(answer.key)?.type === "boolean" ? <p className="mt-1 text-sm text-ink-2">{answer.value === "true" ? "Yes" : "No"}</p> : /^https?:\/\//i.test(answer.value) ? <a href={answer.value} target="_blank" rel="noreferrer" className="link link-accent mt-1 block break-all text-sm">{answer.value} ↗</a> : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{answer.value}</p>}
          </div>
        ))}
        {(submission.files || []).map((file) => <button type="button" key={file.publicId} onClick={() => openProtectedFile(file)} className="flex w-full items-center justify-between gap-3 rounded-sm bg-surface px-3 py-2.5 text-left text-sm font-semibold text-accent"><span className="truncate">{file.originalName || file.fieldKey}</span><span>Open ↗</span></button>)}
      </div>
      <p className="mt-3 text-xs text-ink-3">This submission is read-only because the round was decided or its deadline passed.</p>
    </div>
  );
}

// One vertical's round-by-round progress. A student can hold several of these
// in the same event, one per vertical they applied to.
function ApplicationProgress({ application, rounds, eventId, showTitle, onSaved }) {
  const { registration, candidates, submissions, slots } = application;
  const candidatesByRound = new Map();
  for (const candidate of candidates || []) {
    if (!candidatesByRound.has(candidate.roundId)) candidatesByRound.set(candidate.roundId, []);
    candidatesByRound.get(candidate.roundId).push(candidate);
  }
  const submissionByCandidate = new Map();
  for (const submission of submissions || []) {
    if (!submissionByCandidate.has(submission.candidateId)) submissionByCandidate.set(submission.candidateId, submission);
  }
  const slotByCandidate = new Map((slots || []).map((slot) => [slot.candidateId, slot]));

  const finalRoundId = rounds.at(-1)?._id;
  const finalStatus = application.studentOverallStatus || registration?.overallStatus;

  return (
    <div className={showTitle ? "rounded-md border border-line p-4 sm:p-5" : ""}>
      {showTitle && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="display text-lg">{application.verticalTitle}</h3>
          {["selected", "rejected", "waitlisted", "withdrawn"].includes(finalStatus) && (
            <Badge tone={finalStatus === "selected" ? "ok" : finalStatus === "rejected" ? "bad" : finalStatus === "waitlisted" ? "warn" : "neutral"} className="px-3 py-1.5 text-sm capitalize">{finalStatus}</Badge>
          )}
        </div>
      )}
      <div className="space-y-4">
        {rounds.map((round) => {
          const roundCandidates = candidatesByRound.get(round._id) || [];
          const hasPublishedDetails = Boolean(round.description || round.instructions || round.startsAt || round.endsAt || round.venue || round.meetingUrl || round.submissionDeadlineAt || round.submissionFields?.length);
          return (
            <Card key={round._id} className={`overflow-hidden ${!roundCandidates.length ? "opacity-65" : ""}`}>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Round {round.order}</p>
                    <h3 className="display mt-1 text-lg">{round.title}</h3>
                    {round.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-3">{round.description}</p>}
                    {!hasPublishedDetails && roundCandidates.length > 0 ? <p className="mt-2 text-sm text-ink-3">Details will be shared by the club.</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2"><Badge tone="info">{round.customType || roundTypeLabel[round.type] || "Round"}</Badge>{!roundCandidates.length && <Badge>Locked</Badge>}</div>
                </div>
                {round.instructions && <div className="mt-4 rounded-sm bg-paper-2 px-4 py-3 text-sm"><p className="eyebrow">Instructions</p><p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-ink-2">{round.instructions}</p></div>}
                {(round.startsAt || round.endsAt || round.venue || round.meetingUrl) && <div className="mt-4 grid gap-3 rounded-sm bg-paper-2 px-4 py-3 text-sm sm:grid-cols-2">{round.startsAt && <div><p className="eyebrow">{round.type === "submission" ? "Submissions open" : "Starts"}</p><strong className="mt-1 block">{format(round.startsAt)}</strong></div>}{round.endsAt && <div><p className="eyebrow">{round.type === "submission" ? "Submission deadline" : "Ends"}</p><strong className="mt-1 block">{format(round.endsAt)}</strong></div>}{round.venue && <div><p className="eyebrow">Venue</p><p className="mt-1 font-medium">{round.venue}</p></div>}{round.meetingUrl && <div><p className="eyebrow">Online access</p><a className="link mt-1 block break-all" href={round.meetingUrl} target="_blank" rel="noreferrer">Open meeting link ↗</a></div>}</div>}
                {round.type !== "submission" && round.submissionDeadlineAt && (
                  <div className="mt-3 rounded-sm border-l-2 border-accent bg-accent-tint/40 px-4 py-3 text-sm">
                    <p className="eyebrow eyebrow-accent">Submission deadline</p>
                    <p className="mt-1 font-semibold">{format(round.submissionDeadlineAt)}</p>
                  </div>
                )}
                {(round.submissionFields || []).length > 0 && <div className="mt-4"><p className="eyebrow">What you need to submit</p><div className="mt-2 flex flex-wrap gap-2">{round.submissionFields.map((field) => <span key={field.key} className="rounded-full border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium text-ink-2">{field.label}{field.required === false ? " · optional" : " · required"}</span>)}</div></div>}
              </div>
              {roundCandidates.map((candidate) => {
                const slot = slotByCandidate.get(candidate._id);
                const submission = submissionByCandidate.get(candidate._id);
                const person = candidate.scope === "participant" ? candidate.studentId?.name || "Team member" : registration?.teamName || "Team / application";
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
                    {submission && !editableSubmission && <SubmissionReadOnly submission={submission} fields={round.submissionFields || []} />}
                    {editableSubmission && <SubmissionForm eventId={eventId} round={round} candidate={candidate} existing={submission} onSaved={onSaved} />}
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
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

  const applications = useMemo(() => data?.applications || [], [data]);
  const roundsFor = useCallback((verticalId) => {
    const vertical = (data?.event?.verticals || []).find((item) => String(item._id) === String(verticalId));
    return vertical?.rounds || data?.event?.rounds || [];
  }, [data]);

  if (!data) return <SkeletonList rows={3} className="mt-6" />;
  if (!applications.length) return null;
  const multiple = applications.length > 1;
  const single = applications[0];
  const singleStatus = single.studentOverallStatus || single.registration?.overallStatus;

  return (
    <section className="ruled-top pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-xl">Your event progress</h2>
          <p className="mt-2 text-sm text-ink-3">
            {multiple
              ? "Each vertical you applied to is judged separately, and shows its own rounds and results."
              : "Every team member’s exact round result, submission, and schedule appears here."}
          </p>
        </div>
        {!multiple && ["selected", "rejected", "waitlisted", "withdrawn"].includes(singleStatus) && (
          <Badge tone={singleStatus === "selected" ? "ok" : singleStatus === "rejected" ? "bad" : singleStatus === "waitlisted" ? "warn" : "neutral"} className="px-4 py-2 text-base capitalize">{singleStatus}</Badge>
        )}
      </div>
      <div className="mt-6 space-y-6">
        {applications.map((application) => (
          <ApplicationProgress
            key={application.registration?._id || application.verticalId}
            application={application}
            rounds={roundsFor(application.verticalId)}
            eventId={eventId}
            showTitle={multiple}
            onSaved={load}
          />
        ))}
      </div>
    </section>
  );
}
