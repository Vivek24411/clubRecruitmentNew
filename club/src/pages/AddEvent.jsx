import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import RoundBuilder from "../components/RoundBuilder";
import EligibilityBuilder from "../components/EligibilityBuilder";
import { allProgrammeRules } from "../utils/eligibility";
import { Button, Card, DateTimeInput, Field, Input, Page, PageHeader, Select, Textarea } from "../components/ui";

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
  status: "draft",
  deadlineNotificationsEnabled: true,
  rounds: [],
};

export default function AddEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [banner, setBanner] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const selectBanner = (event) => {
    const file = event.target.files[0] || null;
    setBanner(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (banner && (!['image/jpeg', 'image/png', 'image/webp'].includes(banner.type) || banner.size > 5 * 1024 * 1024)) {
      return toast.error("Choose a JPG, PNG, or WebP banner smaller than 5 MB");
    }
    if (!form.rounds.length) return toast.error("Add at least one event round");
    setSubmitting(true);
    try {
      const payload = new FormData();
      const normalized = {
        ...form,
        minTeamSize: form.registrationType === "individual" ? 1 : form.minTeamSize,
        maxTeamSize: form.registrationType === "individual" ? 1 : form.maxTeamSize,
      };
      ["title", "eventType", "shortDescription", "longDescription", "maxParticipants", "registrationType", "minTeamSize", "maxTeamSize", "eligibility", "status", "eligibilityMode", "deadlineNotificationsEnabled"].forEach((key) => payload.append(key, normalized[key]));
      payload.append("registrationDeadlineAt", new Date(normalized.registrationDeadlineAt).toISOString());
      payload.append("numberOfRounds", normalized.rounds.length);
      payload.append("roundsJSON", JSON.stringify(normalized.rounds.map((round) => ({
        ...round,
        startsAt: round.startsAt ? new Date(round.startsAt).toISOString() : null,
        endsAt: round.endsAt ? new Date(round.endsAt).toISOString() : null,
        submissionOpensAt: round.submissionOpensAt ? new Date(round.submissionOpensAt).toISOString() : null,
        submissionDeadlineAt: round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : null,
      }))));
      payload.append("programmeEligibilityJSON", JSON.stringify(normalized.programmeEligibility));
      normalized.ContactInfo.filter(Boolean).forEach((item, index) => payload.append(`ContactInfo[${index}]`, item));
      if (banner) payload.append("eventBanner", banner);
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/addEvent`, payload);
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      navigate(`/event/${data.event._id}`, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader eyebrow="New event" title="Build an event pipeline" description="Combine tests, submissions, discussions, presentations, and interviews in the order your event needs." />
      <form onSubmit={submit} className="mt-10 space-y-6">
        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Event details</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Event title" id="title" className="sm:col-span-2" required><Input id="title" value={form.title} onChange={(event) => set("title", event.target.value)} required /></Field>
            <Field label="Event type" id="eventType"><Select id="eventType" value={form.eventType} onChange={(event) => set("eventType", event.target.value)}><option value="recruitment">Recruitment</option><option value="hackathon">Hackathon</option><option value="competition">Competition</option><option value="workshop">Workshop</option><option value="other">Other</option></Select></Field>
            <Field label="Visibility" id="status"><Select id="status" value={form.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></Select></Field>
            <Field label="Short description" id="shortDescription" className="sm:col-span-2" required><Input id="shortDescription" maxLength="500" value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} required /></Field>
            <Field label="Full description" id="longDescription" className="sm:col-span-2" required><Textarea id="longDescription" rows="6" value={form.longDescription} onChange={(event) => set("longDescription", event.target.value)} required /></Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Registration and eligibility</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Registration deadline" id="deadline" required className="lg:col-span-2"><DateTimeInput id="deadline" value={form.registrationDeadlineAt} onChange={(value) => set("registrationDeadlineAt", value)} required quickTimes={["17:00", "20:00", "23:00", "23:59"]} /></Field>
            <Field label="Overall participant limit (optional)" id="capacity" hint="Counts people, not teams: the captain and every accepted member count once. Pending invitations do not count."><Input id="capacity" type="number" min="1" max="10000" value={form.maxParticipants} onChange={(event) => set("maxParticipants", event.target.value)} placeholder="Unlimited" /></Field>
            <Field label="Registration type" id="registrationType"><Select id="registrationType" value={form.registrationType} onChange={(event) => set("registrationType", event.target.value)}><option value="individual">Individual</option><option value="team">Team only</option><option value="optional_team">Individual or team</option></Select></Field>
            {form.registrationType !== "individual" && <Field label="Team size" id="minTeam"><div className="grid grid-cols-2 gap-2"><Input aria-label="Minimum team size" id="minTeam" type="number" min="1" value={form.minTeamSize} onChange={(event) => set("minTeamSize", Number(event.target.value))} /><Input aria-label="Maximum team size" type="number" min={form.minTeamSize} value={form.maxTeamSize} onChange={(event) => set("maxTeamSize", Number(event.target.value))} /></div></Field>}
          </div>
          <EligibilityBuilder
            mode={form.eligibilityMode}
            rules={form.programmeEligibility}
            onModeChange={(value) => set("eligibilityMode", value)}
            onRulesChange={(value) => set("programmeEligibility", value.length ? value : allProgrammeRules())}
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Additional eligibility" id="eligibility"><Textarea id="eligibility" rows="3" className="min-h-0" value={form.eligibility} onChange={(event) => set("eligibility", event.target.value)} /></Field>
            <Field label="Contact emails or phone numbers" id="contact"><Textarea id="contact" rows="3" className="min-h-0" value={form.ContactInfo.join("\n")} onChange={(event) => set("ContactInfo", event.target.value.split("\n").map((item) => item.trim()))} /></Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6"><RoundBuilder rounds={form.rounds} onChange={(rounds) => set("rounds", rounds)} registrationType={form.registrationType} /></Card>

        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Event banner</h2>
          <p className="mt-1.5 text-sm text-ink-3">Use a 16:9 image, ideally 1600 × 900 px. Keep important text away from the edges.</p>
          <Field label="JPG, PNG, or WebP under 5 MB" id="banner" className="mt-5"><input id="banner" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectBanner} className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-line file:bg-surface file:px-4 file:py-2" /></Field>
          {preview && <img src={preview} alt="Event banner preview" className="mt-5 aspect-video w-full rounded-sm border border-line bg-paper-2 object-contain" />}
          <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={form.deadlineNotificationsEnabled} onChange={(event) => set("deadlineNotificationsEnabled", event.target.checked)} />Allow deadline-change email notifications for this event</label>
        </Card>

        <Button type="submit" size="lg" loading={submitting}>{submitting ? "Creating..." : form.status === "published" ? "Create and publish" : "Save draft"}</Button>
      </form>
    </Page>
  );
}
