import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import VerticalBuilder, { serializeVertical } from "../components/VerticalBuilder";
import EligibilityBuilder from "../components/EligibilityBuilder";
import { allProgrammeRules } from "../utils/eligibility";
import { Button, Card, DateTimeInput, Field, Input, Page, PageHeader, Select, Textarea } from "../components/ui";
import { uploadDirect } from "../utils/directUpload";

const initialForm = {
  title: "",
  eventType: "recruitment",
  shortDescription: "",
  longDescription: "",
  registrationDeadlineAt: "",
  maxParticipants: "",
  registrationType: "individual",
  minTeamSize: 1,
  maxTeamSize: 1,
  eligibility: "",
  eligibilityMode: "undergraduate",
  programmeEligibility: [{ programme: "undergraduate", years: [] }],
  ContactInfo: [],
  status: "published",
  deadlineNotificationsEnabled: true,
  rounds: [],
  verticalsEnabled: false,
  verticals: [],
  maxVerticalApplications: 1,
};

const fieldNames = {
  title: "Event title",
  eventType: "Event type",
  status: "Visibility",
  shortDescription: "Short description",
  longDescription: "Full description",
  registrationDeadlineAt: "Registration deadline",
  maxParticipants: "Participant limit",
  registrationType: "Registration type",
  minTeamSize: "Lower team limit",
  maxTeamSize: "Upper team limit",
  eligibility: "Additional eligibility",
  programmeEligibilityJSON: "Programme eligibility",
  contactInfoJSON: "Contact information",
  numberOfRounds: "Event rounds",
  roundsJSON: "Event rounds",
  roundDetailsJSON: "Event rounds",
  verticalsJSON: "Verticals",
  maxVerticalApplications: "Vertical application limit",
  banner: "Event banner",
};

const fieldRequirements = {
  title: "Enter between 2 and 150 characters",
  shortDescription: "Enter between 2 and 500 characters",
  longDescription: "Enter between 2 and 10,000 characters",
  registrationDeadlineAt: "Choose a valid registration deadline",
  maxParticipants: "Enter a number between 1 and 10,000, or leave it empty",
  minTeamSize: "Enter a team size of at least 1",
  maxTeamSize: "Enter a valid upper team limit",
  programmeEligibilityJSON: "Check the selected programmes and years",
  roundsJSON: "Check the event rounds and their required fields",
  roundDetailsJSON: "Check the event rounds and their required fields",
  verticalsJSON: "Check each vertical and its required fields",
};

function normalizeField(rawField, message = "") {
  const field = String(rawField || "");
  if (["deadline", "deadline-time", "registerationDeadline", "registrationDeadlineAt"].includes(field)) return "registrationDeadlineAt";
  if (field === "capacity") return "maxParticipants";
  if (field === "minTeam") return "minTeamSize";
  if (field === "maxTeam") return "maxTeamSize";
  if (field === "max-vertical-applications") return "maxVerticalApplications";
  if (field === "contact") return "contactInfoJSON";
  if (!field && /deadline/i.test(message)) return "registrationDeadlineAt";
  if (!field && /round/i.test(message)) return "roundsJSON";
  if (!field && /vertical/i.test(message)) return "verticalsJSON";
  return field;
}

function fieldLabel(rawField) {
  const field = normalizeField(rawField);
  if (fieldNames[field]) return fieldNames[field];
  const oneBasedIndex = (pattern) => {
    const match = field.match(pattern);
    return match ? Number(match[1]) + 1 : null;
  };
  let index = oneBasedIndex(/^round-title-(\d+)$/);
  if (index) return `Round ${index} title`;
  index = oneBasedIndex(/^custom-type-(\d+)$/);
  if (index) return `Round ${index} custom type`;
  index = oneBasedIndex(/^submission-deadline-(\d+)(?:-time)?$/);
  if (index) return `Round ${index} submission deadline`;
  index = oneBasedIndex(/^field-label-(\d+)-\d+$/);
  if (index) return `Round ${index} submission field label`;
  index = oneBasedIndex(/^vertical-title-(\d+)$/);
  if (index) return `Vertical ${index} name`;
  return field
    ? field.replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase())
    : "Event details";
}

function targetId(field) {
  return {
    registrationDeadlineAt: "deadline",
    maxParticipants: "capacity",
    minTeamSize: "minTeam",
    maxTeamSize: "maxTeam",
    programmeEligibilityJSON: "programme-eligibility",
    contactInfoJSON: "contact",
    maxVerticalApplications: "max-vertical-applications",
    numberOfRounds: "event-pipeline",
    roundsJSON: "event-pipeline",
    roundDetailsJSON: "event-pipeline",
    verticalsJSON: "event-pipeline",
  }[field] || field;
}

export default function AddEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [banner, setBanner] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const invalidShown = useRef(false);

  const clearFieldError = (key) => {
    if (!key) return;
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setFormErrors((previous) => previous.filter((error) => error.field !== key));
  };

  const set = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    clearFieldError(key);
  };

  const showErrors = (errors) => {
    const normalized = errors.filter(Boolean).map((error) => {
      const field = normalizeField(error.field, error.message);
      const detail = error.message && error.message !== "Invalid value"
        ? error.message
        : fieldRequirements[field] || "Please enter a valid value";
      return { field, message: `${fieldLabel(field)}: ${detail}` };
    });
    if (!normalized.length) return;
    setFormErrors(normalized);
    setFieldErrors(Object.fromEntries(normalized.filter(({ field }) => field).map(({ field, message }) => [field, message.replace(`${fieldLabel(field)}: `, "")])));
    toast.error(normalized[0].message);

    window.requestAnimationFrame(() => {
      const first = normalized[0];
      const target = document.getElementById(targetId(first.field));
      if (!target) return;
      if (target.matches("input, textarea, select")) target.setAttribute("aria-invalid", "true");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus?.({ preventScroll: true });
    });
  };

  const showInvalidField = (event) => {
    event.preventDefault();
    if (invalidShown.current) return;
    invalidShown.current = true;
    window.setTimeout(() => { invalidShown.current = false; }, 100);
    const input = event.target;
    const field = normalizeField(input.name || input.id);
    input.setAttribute("aria-invalid", "true");
    showErrors([{ field, message: input.validationMessage }]);
  };

  const clearInvalidAppearance = (event) => {
    event.target.removeAttribute?.("aria-invalid");
  };

  const selectBanner = (event) => {
    const file = event.target.files[0] || null;
    setBanner(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormErrors([]);
    setFieldErrors({});
    if (banner && (!['image/jpeg', 'image/png', 'image/webp'].includes(banner.type) || banner.size > 20 * 1024 * 1024)) {
      showErrors([{ field: "banner", message: "Choose a JPG, PNG, or WebP image no larger than 20 MB" }]);
      return;
    }
    if (form.verticalsEnabled) {
      if (form.verticals.length < 2) {
        showErrors([{ field: "verticalsJSON", message: "An event with verticals needs at least two verticals" }]);
        return;
      }
      const unnamedIndex = form.verticals.findIndex((vertical) => !vertical.title.trim());
      if (unnamedIndex >= 0) {
        showErrors([{ field: `vertical-title-${unnamedIndex}`, message: "Give this vertical a name" }]);
        return;
      }
      const empty = form.verticals.find((vertical) => !vertical.rounds.length);
      if (empty) {
        showErrors([{ field: "verticalsJSON", message: `Add at least one round to ${empty.title}` }]);
        return;
      }
    } else if (!form.rounds.length) {
      showErrors([{ field: "roundsJSON", message: "Add at least one event round" }]);
      return;
    }
    setSubmitting(true);
    try {
      const normalized = {
        ...form,
        minTeamSize: form.registrationType === "individual" ? 1 : form.minTeamSize,
        maxTeamSize: form.registrationType === "individual" ? 1 : form.maxTeamSize,
      };
      const directAsset = await uploadDirect(banner, { role: "club", kind: "eventBanner" });
      const payload = Object.fromEntries(
        ["title", "eventType", "shortDescription", "longDescription", "maxParticipants", "registrationType", "minTeamSize", "maxTeamSize", "eligibility", "status", "eligibilityMode", "deadlineNotificationsEnabled"]
          .map((key) => [key, normalized[key]]),
      );
      payload.registrationDeadlineAt = new Date(normalized.registrationDeadlineAt).toISOString();
      payload.numberOfRounds = normalized.rounds.length;
      payload.roundsJSON = JSON.stringify(normalized.rounds.map((round) => ({
        ...round,
        startsAt: round.startsAt ? new Date(round.startsAt).toISOString() : null,
        endsAt: round.endsAt ? new Date(round.endsAt).toISOString() : null,
        submissionOpensAt: round.submissionOpensAt ? new Date(round.submissionOpensAt).toISOString() : null,
        submissionDeadlineAt: round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : null,
      })));
      if (normalized.verticalsEnabled) {
        payload.verticalsEnabled = true;
        payload.verticalsJSON = JSON.stringify(normalized.verticals.map(serializeVertical));
        payload.maxVerticalApplications = Math.min(
          Number(normalized.maxVerticalApplications) || 1,
          normalized.verticals.length,
        );
      }
      payload.programmeEligibilityJSON = JSON.stringify(normalized.programmeEligibility);
      payload.contactInfoJSON = JSON.stringify(normalized.ContactInfo.filter(Boolean));
      if (directAsset) payload.directAsset = directAsset;
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/addEvent`, payload);
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      navigate(`/event/${data.event._id}`, { replace: true });
    } catch (error) {
      const details = Array.isArray(error.response?.data?.errors) ? error.response.data.errors : [];
      if (details.length) {
        showErrors(details.map((detail) => ({
          field: detail.path || detail.param,
          message: detail.msg,
        })));
      } else {
        showErrors([{ message: error.response?.data?.msg || error.message || "Could not create event" }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader eyebrow="New event" title="Build an event pipeline" description="Combine tests, submissions, discussions, presentations, and interviews in the order your event needs." />
      <form onSubmit={submit} onInvalidCapture={showInvalidField} onInput={clearInvalidAppearance} className="mt-10 space-y-6">
        {formErrors.length > 0 && (
          <div role="alert" className="rounded-sm border border-bad/30 bg-bad-tint px-4 py-3 text-sm text-bad">
            <p className="font-semibold">Please fix the following before creating the event:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {formErrors.map((error, index) => <li key={`${error.field || "form"}-${index}`}>{error.message}</li>)}
            </ul>
          </div>
        )}
        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Event details</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Event title" id="title" className="sm:col-span-2" required error={fieldErrors.title}><Input id="title" name="title" minLength="2" maxLength="150" value={form.title} onChange={(event) => set("title", event.target.value)} required aria-invalid={Boolean(fieldErrors.title)} /></Field>
            <Field label="Event type" id="eventType" error={fieldErrors.eventType}><Select id="eventType" name="eventType" value={form.eventType} onChange={(event) => set("eventType", event.target.value)} aria-invalid={Boolean(fieldErrors.eventType)}><option value="recruitment">Recruitment</option><option value="hackathon">Hackathon</option><option value="competition">Competition</option><option value="workshop">Workshop</option><option value="other">Other</option></Select></Field>
            <Field label="Visibility" id="status" error={fieldErrors.status}><Select id="status" name="status" value={form.status} onChange={(event) => set("status", event.target.value)} aria-invalid={Boolean(fieldErrors.status)}><option value="published">Published</option><option value="draft">Draft</option></Select></Field>
            <Field label="Short description" id="shortDescription" className="sm:col-span-2" required error={fieldErrors.shortDescription}><Input id="shortDescription" name="shortDescription" minLength="2" maxLength="500" value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} required aria-invalid={Boolean(fieldErrors.shortDescription)} /></Field>
            <Field label="Full description" id="longDescription" className="sm:col-span-2" required error={fieldErrors.longDescription}><Textarea id="longDescription" name="longDescription" minLength="2" maxLength="10000" rows="6" value={form.longDescription} onChange={(event) => set("longDescription", event.target.value)} required aria-invalid={Boolean(fieldErrors.longDescription)} /></Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Registration and eligibility</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Registration deadline" id="deadline" required className="lg:col-span-2" error={fieldErrors.registrationDeadlineAt}><DateTimeInput id="deadline" value={form.registrationDeadlineAt} onChange={(value) => set("registrationDeadlineAt", value)} required invalid={Boolean(fieldErrors.registrationDeadlineAt)} quickTimes={["17:00", "20:00", "23:00", "23:59"]} /></Field>
            <Field label="Overall participant limit (optional)" id="capacity" hint="Counts people, not teams: the captain and every accepted member count once. Pending invitations do not count." error={fieldErrors.maxParticipants}><Input id="capacity" name="maxParticipants" type="number" min="1" max="10000" value={form.maxParticipants} onChange={(event) => set("maxParticipants", event.target.value)} placeholder="Unlimited" aria-invalid={Boolean(fieldErrors.maxParticipants)} /></Field>
            <Field label="Registration type" id="registrationType" error={fieldErrors.registrationType}><Select id="registrationType" name="registrationType" value={form.registrationType} onChange={(event) => set("registrationType", event.target.value)} aria-invalid={Boolean(fieldErrors.registrationType)}><option value="individual">Individual</option><option value="team">Team only</option><option value="optional_team">Individual or team</option></Select></Field>
            {form.registrationType !== "individual" && <><Field label="Lower limit" id="minTeam" hint="Minimum students required in a team." error={fieldErrors.minTeamSize}><Input id="minTeam" name="minTeamSize" type="number" min="1" value={form.minTeamSize} onChange={(event) => set("minTeamSize", Number(event.target.value))} aria-invalid={Boolean(fieldErrors.minTeamSize)} /></Field><Field label="Upper limit" id="maxTeam" hint="Maximum students allowed in a team." error={fieldErrors.maxTeamSize}><Input id="maxTeam" name="maxTeamSize" type="number" min={form.minTeamSize} max="10000" value={form.maxTeamSize} onChange={(event) => set("maxTeamSize", Number(event.target.value))} aria-invalid={Boolean(fieldErrors.maxTeamSize)} /></Field></>}
          </div>
          <div id="programme-eligibility" className={fieldErrors.programmeEligibilityJSON ? "rounded-sm border border-bad/50" : ""}>
            <EligibilityBuilder
              mode={form.eligibilityMode}
              rules={form.programmeEligibility}
              onModeChange={(value) => { set("eligibilityMode", value); clearFieldError("programmeEligibilityJSON"); }}
              onRulesChange={(value) => { set("programmeEligibility", value.length ? value : allProgrammeRules()); clearFieldError("programmeEligibilityJSON"); }}
            />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Additional eligibility" id="eligibility" error={fieldErrors.eligibility}><Textarea id="eligibility" name="eligibility" maxLength="2000" rows="3" className="min-h-0" value={form.eligibility} onChange={(event) => set("eligibility", event.target.value)} aria-invalid={Boolean(fieldErrors.eligibility)} /></Field>
            <Field label="Contact emails or phone numbers" id="contact" error={fieldErrors.contactInfoJSON}><Textarea id="contact" name="contactInfoJSON" rows="3" className="min-h-0" value={form.ContactInfo.join("\n")} onChange={(event) => set("ContactInfo", event.target.value.split("\n").map((item) => item.trim()))} aria-invalid={Boolean(fieldErrors.contactInfoJSON)} /></Field>
          </div>
        </Card>

        <Card id="event-pipeline" className={`p-5 sm:p-6 ${fieldErrors.numberOfRounds || fieldErrors.roundsJSON || fieldErrors.roundDetailsJSON || fieldErrors.verticalsJSON ? "border-bad/50" : ""}`}>
          <VerticalBuilder
            enabled={form.verticalsEnabled}
            verticals={form.verticals}
            rounds={form.rounds}
            maxVerticalApplications={form.maxVerticalApplications}
            registrationType={form.registrationType}
            onToggle={(value) => set("verticalsEnabled", value)}
            onVerticalsChange={(verticals) => set("verticals", verticals)}
            onRoundsChange={(rounds) => set("rounds", rounds)}
            onMaxApplicationsChange={(value) => set("maxVerticalApplications", value)}
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Event banner</h2>
          <p className="mt-1.5 text-sm text-ink-3">Use a wide image, ideally 1600 × 700 px. Images above the provider&rsquo;s 10 MB limit are optimized automatically.</p>
          <Field label="JPG, PNG, or WebP up to 20 MB" id="banner" className="mt-5" error={fieldErrors.banner}><input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectBanner} aria-invalid={Boolean(fieldErrors.banner)} className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-line file:bg-surface file:px-4 file:py-2" /></Field>
          {preview && <img src={preview} alt="Event banner preview" className="mt-5 aspect-[16/7] w-full rounded-sm border border-line bg-paper-2 object-cover" />}
          <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={form.deadlineNotificationsEnabled} onChange={(event) => set("deadlineNotificationsEnabled", event.target.checked)} />Allow deadline-change email notifications for this event</label>
        </Card>

        <Button type="submit" size="lg" loading={submitting}>{submitting ? "Creating..." : form.status === "published" ? "Create and publish" : "Save draft"}</Button>
      </form>
    </Page>
  );
}
