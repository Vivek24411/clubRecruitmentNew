/* eslint-disable react-refresh/only-export-components */
import { Button, DateTimeInput, Field, Input, Select, Textarea } from "./ui";

export const ROUND_TYPES = [
  ["test", "Common test · individual results"],
  ["submission", "Application / submission form"],
  ["interview", "Interview"],
  ["group_discussion", "Group discussion"],
  ["presentation", "Presentation"],
  ["hackathon", "Hackathon"],
  ["custom", "Custom round"],
];

const emptyRound = (order) => ({
  order,
  title: `Round ${order}`,
  type: "test",
  customType: "",
  description: "",
  instructions: "",
  evaluationScope: "participant",
  interviewMode: null,
  scheduleMode: "common",
  startsAt: "",
  endsAt: "",
  venue: "",
  meetingUrl: "",
  slotDurationMinutes: 20,
  slotBufferMinutes: 0,
  submissionEnabled: false,
  submissionOpensAt: "",
  submissionDeadlineAt: "",
  allowResubmission: true,
  submissionFields: [],
});

const emptyApplicationFormRound = (order, registrationType) => ({
  ...emptyRound(order),
  title: "Application form",
  type: "submission",
  evaluationScope: registrationType === "individual" ? "participant" : "application",
  submissionEnabled: true,
});

export function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function normalizeRoundsForForm(rounds = []) {
  return rounds.map((round, index) => ({
    ...emptyRound(index + 1),
    ...round,
    order: index + 1,
    startsAt: toLocalDateTime(round.startsAt),
    endsAt: toLocalDateTime(round.endsAt),
    submissionOpensAt: toLocalDateTime(round.submissionOpensAt),
    submissionDeadlineAt: toLocalDateTime(round.submissionDeadlineAt),
  }));
}

function RoundEditor({ round, index, teamEvent, onChange, onRemove, onMove, total }) {
  const set = (key, value) => onChange(index, { ...round, [key]: value });
  const setType = (type) => {
    const submissionEnabled = type === "submission" || type === "hackathon";
    const interviewMode = type === "interview" ? (round.interviewMode || "individual") : null;
    set("type", type);
    onChange(index, {
      ...round,
      type,
      submissionEnabled,
      interviewMode,
      evaluationScope: !teamEvent || type === "test"
        ? "participant"
        : type === "interview" && interviewMode === "individual"
          ? "participant"
          : round.evaluationScope || "application",
      scheduleMode: type === "interview" ? "slots" : round.scheduleMode,
    });
  };
  const addField = () => {
    const fields = round.submissionFields || [];
    const usedKeys = new Set(fields.map((field) => field.key));
    let nextNumber = fields.length + 1;
    while (usedKeys.has(`field_${nextNumber}`)) nextNumber += 1;
    set("submissionFields", [
      ...fields,
      { key: `field_${nextNumber}`, label: "", type: "short_text", required: true, helpText: "" },
    ]);
  };
  const updateField = (fieldIndex, changes) => set(
    "submissionFields",
    round.submissionFields.map((field, current) => current === fieldIndex ? { ...field, ...changes } : field),
  );
  const removeField = (fieldIndex) => set(
    "submissionFields",
    round.submissionFields.filter((_, current) => current !== fieldIndex),
  );

  return (
    <section className="border-t border-line pt-6 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{index + 1}</span>
          <h3 className="display text-lg">{round.title || `Round ${index + 1}`}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move round up">Up</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label="Move round down">Down</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Round title" id={`round-title-${index}`} required>
          <Input id={`round-title-${index}`} value={round.title || ""} onChange={(event) => set("title", event.target.value)} required />
        </Field>
        <Field label="Round type" id={`round-type-${index}`} required>
          <Select id={`round-type-${index}`} value={round.type} onChange={(event) => setType(event.target.value)}>
            {ROUND_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        {round.type === "custom" && (
          <Field label="Custom type" id={`custom-type-${index}`} className="sm:col-span-2" required>
            <Input id={`custom-type-${index}`} value={round.customType || ""} onChange={(event) => set("customType", event.target.value)} required />
          </Field>
        )}
        <Field label="Short description" id={`round-description-${index}`} className="sm:col-span-2">
          <Textarea id={`round-description-${index}`} rows="2" className="min-h-0" value={round.description || ""} onChange={(event) => set("description", event.target.value)} />
        </Field>
        <Field label="Instructions" id={`round-instructions-${index}`} className="sm:col-span-2">
          <Textarea id={`round-instructions-${index}`} rows="3" className="min-h-0" value={round.instructions || ""} onChange={(event) => set("instructions", event.target.value)} />
        </Field>
      </div>

      {round.type === "interview" && teamEvent && (
        <Field label="Interview format" id={`interview-mode-${index}`} className="mt-5 max-w-sm">
          <Select
            id={`interview-mode-${index}`}
            value={round.interviewMode || "individual"}
            onChange={(event) => onChange(index, {
              ...round,
              interviewMode: event.target.value,
              evaluationScope: event.target.value === "group" ? "application" : "participant",
            })}
          >
            <option value="individual">Separate slot for each student</option>
            <option value="group">One slot for the whole team</option>
          </Select>
        </Field>
      )}

      {round.type !== "interview" && teamEvent && round.type !== "test" && (
        <Field label="Evaluate this round" id={`evaluation-scope-${index}`} className="mt-5 max-w-sm">
          <Select id={`evaluation-scope-${index}`} value={round.evaluationScope || "application"} onChange={(event) => set("evaluationScope", event.target.value)}>
            <option value="application">As one team/application</option>
            <option value="participant">Each student individually</option>
          </Select>
        </Field>
      )}

      {(round.type === "test" || !teamEvent) && (
        <p className="mt-5 rounded-sm border-l-2 border-info bg-info-tint/40 px-4 py-3 text-sm text-ink-2">
          Results for this round are recorded separately for each student.
        </p>
      )}

      {round.type !== "interview" && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Schedule" id={`schedule-mode-${index}`}>
            <Select id={`schedule-mode-${index}`} value={round.scheduleMode || "none"} onChange={(event) => set("scheduleMode", event.target.value)}>
              <option value="none">No fixed schedule</option>
              <option value="common">Same time for everyone</option>
              <option value="slots">Different participant slots</option>
            </Select>
          </Field>
          {round.scheduleMode !== "none" && (
            <>
              <Field label="Starts" id={`starts-${index}`}>
                <DateTimeInput id={`starts-${index}`} value={round.startsAt || ""} onChange={(value) => set("startsAt", value)} />
              </Field>
              <Field label="Ends" id={`ends-${index}`}>
                <DateTimeInput id={`ends-${index}`} value={round.endsAt || ""} onChange={(value) => set("endsAt", value)} />
              </Field>
            </>
          )}
        </div>
      )}

      {(round.scheduleMode !== "none" || round.type === "interview") && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Venue" id={`venue-${index}`}>
            <Input id={`venue-${index}`} value={round.venue || ""} onChange={(event) => set("venue", event.target.value)} />
          </Field>
          <Field label="Meeting link" id={`meeting-${index}`}>
            <Input id={`meeting-${index}`} type="url" value={round.meetingUrl || ""} onChange={(event) => set("meetingUrl", event.target.value)} placeholder="https://" />
          </Field>
          {round.scheduleMode === "slots" && (
            <>
              <Field label="Slot minutes" id={`duration-${index}`}>
                <Input id={`duration-${index}`} type="number" min="5" max="480" value={round.slotDurationMinutes || 20} onChange={(event) => set("slotDurationMinutes", Number(event.target.value))} />
              </Field>
              <Field label="Buffer minutes" id={`buffer-${index}`}>
                <Input id={`buffer-${index}`} type="number" min="0" max="120" value={round.slotBufferMinutes || 0} onChange={(event) => set("slotBufferMinutes", Number(event.target.value))} />
              </Field>
            </>
          )}
        </div>
      )}

      {(round.submissionEnabled || ["submission", "hackathon"].includes(round.type)) && (
        <div className="mt-6 rounded-sm border border-line bg-paper-2/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Submission form</h4>
              <p className="mt-1 text-sm text-ink-3">Links and text are stored directly. Images, PDFs, and videos upload to Cloudinary.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={(round.submissionFields || []).length >= 12} onClick={addField}>Add field</Button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Opens" id={`submission-open-${index}`}>
              <DateTimeInput id={`submission-open-${index}`} value={round.submissionOpensAt || ""} onChange={(value) => set("submissionOpensAt", value)} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={!round.startsAt} onClick={() => set("submissionOpensAt", round.startsAt)}>Use round start</Button>
                <Button type="button" variant="ghost" size="sm" disabled={!round.endsAt} onClick={() => set("submissionOpensAt", round.endsAt)}>Use round end</Button>
              </div>
            </Field>
            <Field label="Deadline" id={`submission-deadline-${index}`} required>
              <DateTimeInput id={`submission-deadline-${index}`} value={round.submissionDeadlineAt || ""} onChange={(value) => set("submissionDeadlineAt", value)} required quickTimes={["17:00", "20:00", "23:00", "23:59"]} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={!round.startsAt} onClick={() => set("submissionDeadlineAt", round.startsAt)}>Use round start</Button>
                <Button type="button" variant="ghost" size="sm" disabled={!round.endsAt} onClick={() => set("submissionDeadlineAt", round.endsAt)}>Use round end</Button>
              </div>
            </Field>
            <label className="flex items-end gap-3 pb-3 text-sm font-medium">
              <input type="checkbox" checked={round.allowResubmission !== false} onChange={(event) => set("allowResubmission", event.target.checked)} />
              Allow edits before deadline
            </label>
          </div>
          <div className="mt-5 space-y-4">
            {(round.submissionFields || []).map((field, fieldIndex) => (
              <div key={`submission-field-${index}-${fieldIndex}`} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_12rem_auto]">
                <Field label="Field label" id={`field-label-${index}-${fieldIndex}`}>
                  <Input id={`field-label-${index}-${fieldIndex}`} value={field.label} onChange={(event) => updateField(fieldIndex, { label: event.target.value })} required />
                </Field>
                <Field label="Input type" id={`field-type-${index}-${fieldIndex}`}>
                  <Select id={`field-type-${index}-${fieldIndex}`} value={field.type} onChange={(event) => updateField(fieldIndex, { type: event.target.value })}>
                    <option value="short_text">Short answer</option>
                    <option value="long_text">Long answer</option>
                    <option value="boolean">Checkbox</option>
                    <option value="url">Website link</option>
                    <option value="github">GitHub repository</option>
                    {field.type === "text" && <option value="text">Text answer (legacy)</option>}
                    <option value="file">Image/file</option>
                    <option value="pdf">PDF or deck</option>
                    <option value="video">Video</option>
                  </Select>
                </Field>
                <div className="flex items-end gap-3 pb-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required !== false} onChange={(event) => updateField(fieldIndex, { required: event.target.checked })} />Required</label>
                  <button type="button" className="link text-sm font-semibold text-bad" onClick={() => removeField(fieldIndex)}>Remove</button>
                </div>
                <Field label="Help text (optional)" id={`field-help-${index}-${fieldIndex}`} className="sm:col-span-2">
                  <Input id={`field-help-${index}-${fieldIndex}`} value={field.helpText || ""} onChange={(event) => updateField(fieldIndex, { helpText: event.target.value })} maxLength={300} placeholder="Explain what the applicant should enter" />
                </Field>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function RoundBuilder({ rounds, onChange, registrationType }) {
  const update = (index, round) => {
    const next = [...rounds];
    next[index] = round;
    onChange(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
  };
  const move = (index, delta) => {
    const next = [...rounds];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next.map((round, itemIndex) => ({ ...round, order: itemIndex + 1 })));
  };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-xl">Event rounds</h2>
          <p className="mt-1.5 text-sm text-ink-3">Build any sequence of common activities, submissions, and participant slots.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rounds.length === 0 && <Button type="button" variant="accent" onClick={() => onChange([emptyApplicationFormRound(1, registrationType)])}>Start with application form</Button>}
          <Button type="button" variant="secondary" onClick={() => onChange([...rounds, emptyRound(rounds.length + 1)])}>Add round</Button>
        </div>
      </div>
      {rounds.length ? (
        <div className="mt-6 space-y-7">
          {rounds.map((round, index) => (
            <RoundEditor
              key={round._id || `round-${index}`}
              round={round}
              index={index}
              total={rounds.length}
              teamEvent={registrationType !== "individual"}
              onChange={update}
              onMove={move}
              onRemove={(removeIndex) => onChange(rounds.filter((_, itemIndex) => itemIndex !== removeIndex).map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })))}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-sm border border-dashed border-line-2 px-5 py-8 text-center text-sm text-ink-3">No rounds yet. Add a regular activity, or begin with a required/optional application form whose responses appear in Manage Applications.</p>
      )}
    </div>
  );
}
