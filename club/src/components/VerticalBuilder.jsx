/* eslint-disable react-refresh/only-export-components */
import RoundBuilder, { normalizeRoundsForForm } from "./RoundBuilder";
import { Button, DateTimeInput, Field, Input, Select, Textarea } from "./ui";

const emptyVertical = (order) => ({
  title: "",
  shortDescription: "",
  description: "",
  problemStatementUrl: "",
  order,
  status: "open",
  registrationType: "individual",
  minTeamSize: 1,
  maxTeamSize: 1,
  maxParticipants: "",
  registrationDeadlineAt: "",
  rounds: [],
});

export function normalizeVerticalsForForm(verticals = []) {
  return verticals.map((vertical, index) => ({
    ...emptyVertical(index + 1),
    ...vertical,
    order: index + 1,
    maxParticipants: vertical.maxParticipants ?? "",
    registrationDeadlineAt: vertical.registrationDeadlineAt
      ? new Date(vertical.registrationDeadlineAt).toISOString().slice(0, 16)
      : "",
    rounds: normalizeRoundsForForm(vertical.rounds || []),
  }));
}

// Serialises a vertical for the API, matching how AddEvent serialises rounds.
export function serializeVertical(vertical) {
  return {
    ...(vertical._id ? { _id: vertical._id } : {}),
    title: vertical.title,
    shortDescription: vertical.shortDescription || "",
    description: vertical.description || "",
    problemStatementUrl: vertical.problemStatementUrl || "",
    order: vertical.order,
    status: vertical.status || "open",
    registrationType: vertical.registrationType,
    minTeamSize: vertical.registrationType === "individual" ? 1 : Number(vertical.minTeamSize) || 1,
    maxTeamSize: vertical.registrationType === "individual" ? 1 : Number(vertical.maxTeamSize) || 1,
    maxParticipants: vertical.maxParticipants ? Number(vertical.maxParticipants) : null,
    registrationDeadlineAt: vertical.registrationDeadlineAt
      ? new Date(vertical.registrationDeadlineAt).toISOString()
      : null,
    rounds: (vertical.rounds || []).map((round) => ({
      ...round,
      startsAt: round.startsAt ? new Date(round.startsAt).toISOString() : null,
      endsAt: round.endsAt ? new Date(round.endsAt).toISOString() : null,
      submissionOpensAt: round.submissionOpensAt ? new Date(round.submissionOpensAt).toISOString() : null,
      submissionDeadlineAt: round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : null,
    })),
  };
}

function RegistrationTypeFields({ registrationType, minTeamSize, maxTeamSize, idPrefix, set }) {
  return (
    <>
      <Field label="Registration type" id={`${idPrefix}-regtype`}>
        <Select id={`${idPrefix}-regtype`} value={registrationType} onChange={(event) => set("registrationType", event.target.value)}>
          <option value="individual">Individual</option>
          <option value="team">Team only</option>
          <option value="optional_team">Individual or team</option>
        </Select>
      </Field>
      {registrationType !== "individual" && (
        <>
          <Field label="Minimum team size" id={`${idPrefix}-min`}>
            <Input id={`${idPrefix}-min`} type="number" min="1" value={minTeamSize} onChange={(event) => set("minTeamSize", Number(event.target.value))} />
          </Field>
          <Field label="Maximum team size" id={`${idPrefix}-max`}>
            <Input id={`${idPrefix}-max`} type="number" min={minTeamSize} value={maxTeamSize} onChange={(event) => set("maxTeamSize", Number(event.target.value))} />
          </Field>
        </>
      )}
    </>
  );
}

function VerticalEditor({ vertical, index, total, onChange, onRemove, onMove }) {
  const set = (key, value) => onChange(index, { ...vertical, [key]: value });

  return (
    <section className="animate-scale-in overflow-hidden rounded-md border-2 border-accent/25 bg-accent-tint/20 shadow-sm">
      <div className="border-b border-accent/20 bg-accent-tint/65 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-accent text-sm font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
          <div><p className="eyebrow eyebrow-accent">Vertical {index + 1}</p><h3 className="display mt-0.5 text-lg">{vertical.title || `Untitled vertical`}</h3></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === 0} onClick={() => onMove(index, -1)}>Up</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === total - 1} onClick={() => onMove(index, 1)}>Down</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>
      </div>

      <div className="p-4 sm:p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vertical name" id={`vertical-title-${index}`} required>
          <Input id={`vertical-title-${index}`} value={vertical.title} onChange={(event) => set("title", event.target.value)} placeholder="Technology" required />
        </Field>
        <Field label="Applications" id={`vertical-status-${index}`}>
          <Select id={`vertical-status-${index}`} value={vertical.status} onChange={(event) => set("status", event.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="One-line summary (optional)" id={`vertical-short-${index}`} className="sm:col-span-2">
          <Input id={`vertical-short-${index}`} maxLength="500" value={vertical.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
        </Field>
        <Field label="What this vertical does (optional)" id={`vertical-description-${index}`} className="sm:col-span-2">
          <Textarea id={`vertical-description-${index}`} rows="3" className="min-h-0" value={vertical.description} onChange={(event) => set("description", event.target.value)} />
        </Field>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <RegistrationTypeFields registrationType={vertical.registrationType} minTeamSize={vertical.minTeamSize} maxTeamSize={vertical.maxTeamSize} idPrefix={`vertical-${index}`} set={set} />
        <Field label="Participant limit (optional)" id={`vertical-capacity-${index}`} hint="Counts people in this vertical only.">
          <Input id={`vertical-capacity-${index}`} type="number" min="1" max="10000" value={vertical.maxParticipants} onChange={(event) => set("maxParticipants", event.target.value)} placeholder="Unlimited" />
        </Field>
        <Field label="Own registration deadline (optional)" id={`vertical-deadline-${index}`} hint="Leave empty to use the event registration deadline.">
          <DateTimeInput id={`vertical-deadline-${index}`} value={vertical.registrationDeadlineAt} onChange={(value) => set("registrationDeadlineAt", value)} quickTimes={["17:00", "20:00", "23:00", "23:59"]} />
        </Field>
        <Field label="Problem statement Drive link (optional)" id={`vertical-problem-${index}`} className="sm:col-span-2 lg:col-span-4" hint="Students will see this as a clickable link.">
          <Input id={`vertical-problem-${index}`} type="url" value={vertical.problemStatementUrl || ""} onChange={(event) => set("problemStatementUrl", event.target.value)} placeholder="https://drive.google.com/..." />
        </Field>
      </div>

      <div className="mt-6 rounded-sm border border-line bg-paper-2/60 p-4 sm:p-5">
        <RoundBuilder
          rounds={vertical.rounds}
          onChange={(rounds) => set("rounds", rounds)}
          registrationType={vertical.registrationType}
        />
      </div>
      </div>
    </section>
  );
}

export default function VerticalBuilder({
  enabled,
  verticals,
  rounds,
  maxVerticalApplications,
  registrationType,
  minTeamSize,
  maxTeamSize,
  problemStatementUrl,
  onToggle,
  onVerticalsChange,
  onRoundsChange,
  onMaxApplicationsChange,
  onRegistrationChange,
}) {
  const update = (index, vertical) => {
    const next = [...verticals];
    next[index] = vertical;
    onVerticalsChange(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
  };
  const move = (index, delta) => {
    const next = [...verticals];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onVerticalsChange(next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })));
  };
  const remove = (index) => onVerticalsChange(
    verticals.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })),
  );

  // Turning verticals on seeds the first vertical with the rounds already
  // built, so nothing the club typed is lost.
  const toggle = (value) => {
    if (value && verticals.length < 2) {
      const current = verticals[0] || {};
      onVerticalsChange([
        {
          ...emptyVertical(1),
          ...current,
          title: current.title && !current.isDefault ? current.title : "",
          isDefault: false,
          registrationType,
          minTeamSize,
          maxTeamSize,
          problemStatementUrl,
          rounds: current.rounds?.length ? current.rounds : rounds,
        },
        emptyVertical(2),
      ]);
    }
    onToggle(value);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-xl">Verticals</h2>
          <p className="mt-1.5 text-sm text-ink-3">
            Split this event into independent tracks. Each vertical runs its own rounds, forms its own teams, and is decided on separately.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(event) => toggle(event.target.checked)} />
          This event has verticals
        </label>
      </div>

      {enabled ? (
        <>
          <Field
            label="Verticals a student may apply to"
            id="max-vertical-applications"
            className="mt-6 max-w-xs"
            hint="Set to 1 to make students choose a single vertical."
          >
            <Input
              id="max-vertical-applications"
              type="number"
              min="1"
              max={Math.max(verticals.length, 1)}
              value={maxVerticalApplications}
              onChange={(event) => onMaxApplicationsChange(Number(event.target.value))}
            />
          </Field>

          <div className="mt-6 space-y-6">
            {verticals.map((vertical, index) => (
              <VerticalEditor
                key={vertical._id || `vertical-${index}`}
                vertical={vertical}
                index={index}
                total={verticals.length}
                onChange={update}
                onMove={move}
                onRemove={remove}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-6"
            onClick={() => onVerticalsChange([...verticals, emptyVertical(verticals.length + 1)])}
          >
            + Add vertical
          </Button>
          {verticals.length < 2 && (
            <p className="mt-4 rounded-sm border-l-2 border-warn bg-warn-tint/40 px-4 py-3 text-sm text-ink-2">
              An event with verticals needs at least two. Add another, or switch verticals off.
            </p>
          )}
        </>
      ) : (
        <section className="mt-6 overflow-hidden rounded-md border-2 border-accent/25 bg-accent-tint/20">
          <div className="border-b border-accent/20 bg-accent-tint/65 px-4 py-4 sm:px-5">
            <p className="eyebrow eyebrow-accent">Application setup</p>
            <h3 className="display mt-1 text-lg">General registration</h3>
            <p className="mt-1 text-sm text-ink-3">These settings apply to the event&rsquo;s single application track.</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <RegistrationTypeFields
                registrationType={registrationType}
                minTeamSize={minTeamSize}
                maxTeamSize={maxTeamSize}
                idPrefix="event-registration"
                set={onRegistrationChange}
              />
              <Field label="Problem statement Drive link (optional)" id="problemStatementUrl" className="sm:col-span-2 lg:col-span-3" hint="Students will see this as a clickable link.">
                <Input id="problemStatementUrl" name="problemStatementUrl" type="url" value={problemStatementUrl || ""} onChange={(event) => onRegistrationChange("problemStatementUrl", event.target.value)} placeholder="https://drive.google.com/..." />
              </Field>
            </div>
            <div className="mt-6 rounded-sm border border-line bg-paper-2/60 p-4 sm:p-5">
              <RoundBuilder rounds={rounds} onChange={onRoundsChange} registrationType={registrationType} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
