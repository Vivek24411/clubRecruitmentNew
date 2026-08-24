import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { normalizeRoundsForForm } from "../components/RoundBuilder";
import VerticalBuilder, { normalizeVerticalsForForm, serializeVertical } from "../components/VerticalBuilder";
import EligibilityBuilder from "../components/EligibilityBuilder";
import { eligibilityForForm } from "../utils/eligibility";
import { Button, Card, DateTimeInput, Field, Input, Page, Select, Skeleton, Textarea } from "../components/ui";
import { uploadDirect } from "../utils/directUpload";

const allRounds = (event) => (event?.verticals || []).flatMap((vertical) => vertical.rounds || []);

export default function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [banner, setBanner] = useState(null);
  const [notifyRegistrants, setNotifyRegistrants] = useState(false);
  const [saving, setSaving] = useState(false);
  const originalDeadline = useRef("");
  const originalRoundDeadlines = useRef({});

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, { params: { eventId } })
      .then(({ data }) => {
        if (!data.success) throw new Error(data.msg);
        originalDeadline.current = data.event.registrationDeadlineAt || "";
        const verticals = normalizeVerticalsForForm(data.event.verticals || []);
        originalRoundDeadlines.current = Object.fromEntries(allRounds(data.event).map((round) => [round._id, round.submissionDeadlineAt || ""]));
        setForm({
          ...data.event,
          ...eligibilityForForm(data.event),
          registrationDeadlineAt: data.event.registrationDeadlineAt ? new Date(new Date(data.event.registrationDeadlineAt).getTime() - new Date(data.event.registrationDeadlineAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
          // The hidden default vertical is what a non-vertical event edits.
          rounds: verticals[0]?.rounds || normalizeRoundsForForm(data.event.rounds || []),
          verticals,
          verticalsEnabled: Boolean(data.event.verticalsEnabled),
          maxVerticalApplications: data.event.maxVerticalApplications ?? 1,
          ContactInfo: data.event.ContactInfo || [],
        });
      })
      .catch((error) => toast.error(error.message || "Could not load event"));
  }, [eventId]);

  if (!form) return <Page width="5xl"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-10 h-96 w-full" /></Page>;
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const editedRounds = form.verticalsEnabled
    ? form.verticals.flatMap((vertical) => vertical.rounds || [])
    : form.rounds;
  const deadlineChanged = String(originalDeadline.current || "") !== String(form.registrationDeadlineAt ? new Date(form.registrationDeadlineAt).toISOString() : "") || editedRounds.some((round) => round._id && String(originalRoundDeadlines.current[round._id] || "") !== String(round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : ""));

  const save = async (event) => {
    event.preventDefault();
    if (form.verticalsEnabled) {
      if (form.verticals.length < 2) return toast.error("An event with verticals needs at least two verticals");
      const unnamed = form.verticals.find((vertical) => !String(vertical.title || "").trim());
      if (unnamed) return toast.error("Give every vertical a name");
      const empty = form.verticals.find((vertical) => !(vertical.rounds || []).length);
      if (empty) return toast.error(`Keep at least one round in ${empty.title}`);
    } else if (!form.rounds.length) {
      return toast.error("Keep at least one event round");
    }
    setSaving(true);
    try {
      const directAsset = await uploadDirect(banner, { role: "club", kind: "eventBanner" });
      const payload = Object.fromEntries(
        ["title", "eventType", "shortDescription", "longDescription", "maxParticipants", "registrationType", "minTeamSize", "maxTeamSize", "eligibility", "eligibilityMode", "deadlineNotificationsEnabled"]
          .map((key) => [key, form[key] ?? ""]),
      );
      payload.registrationDeadlineAt = form.registrationDeadlineAt ? new Date(form.registrationDeadlineAt).toISOString() : "";
      payload.numberOfRounds = form.rounds.length;
      payload.roundsJSON = JSON.stringify(form.rounds.map((round) => ({
        ...round,
        startsAt: round.startsAt ? new Date(round.startsAt).toISOString() : null,
        endsAt: round.endsAt ? new Date(round.endsAt).toISOString() : null,
        submissionOpensAt: round.submissionOpensAt ? new Date(round.submissionOpensAt).toISOString() : null,
        submissionDeadlineAt: round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : null,
      })));
      if (form.verticalsEnabled) {
        payload.verticalsJSON = JSON.stringify(form.verticals.map(serializeVertical));
        payload.maxVerticalApplications = Math.min(
          Number(form.maxVerticalApplications) || 1,
          form.verticals.length,
        );
      }
      payload.contactInfoJSON = JSON.stringify(form.ContactInfo);
      payload.programmeEligibilityJSON = JSON.stringify(form.programmeEligibility);
      payload.notifyRegistrants = notifyRegistrants;
      if (directAsset) payload.directAsset = directAsset;
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}`, payload);
      if (!data.success) throw new Error(data.msg);
      const savedVerticals = normalizeVerticalsForForm(data.event.verticals || []);
      setForm((previous) => ({
        ...previous,
        ...data.event,
        registrationDeadlineAt: data.event.registrationDeadlineAt ? new Date(new Date(data.event.registrationDeadlineAt).getTime() - new Date(data.event.registrationDeadlineAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
        rounds: savedVerticals[0]?.rounds || normalizeRoundsForForm(data.event.rounds || []),
        verticals: savedVerticals,
        verticalsEnabled: Boolean(data.event.verticalsEnabled),
        maxVerticalApplications: data.event.maxVerticalApplications ?? 1,
      }));
      originalDeadline.current = data.event.registrationDeadlineAt || "";
      originalRoundDeadlines.current = Object.fromEntries(allRounds(data.event).map((round) => [round._id, round.submissionDeadlineAt || ""]));
      setBanner(null);
      setNotifyRegistrants(false);
      toast.success(data.msg);
      navigate(`/event/${eventId}`, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not save event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page width="5xl">
      <Link to={`/event/${eventId}`} className="link text-sm text-ink-3">Back to event</Link>
      <header className="mt-6"><p className="eyebrow eyebrow-accent">Editing event</p><h1 className="display mt-2 text-3xl sm:text-4xl">{form.title}</h1><p className="mt-3 text-sm text-ink-3">Saved changes are visible to students immediately.</p></header>
      <form onSubmit={save} className="mt-9 space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" id="title" className="sm:col-span-2" required><Input id="title" value={form.title || ""} onChange={(event) => set("title", event.target.value)} required /></Field>
            <Field label="Event type" id="eventType"><Select id="eventType" value={form.eventType || "recruitment"} onChange={(event) => set("eventType", event.target.value)}><option value="recruitment">Recruitment</option><option value="hackathon">Hackathon</option><option value="competition">Competition</option><option value="workshop">Workshop</option><option value="other">Other</option></Select></Field>
            <Field label="Registration deadline" id="deadline" className="sm:col-span-2"><DateTimeInput id="deadline" value={form.registrationDeadlineAt || ""} onChange={(value) => set("registrationDeadlineAt", value)} quickTimes={["17:00", "20:00", "23:00", "23:59"]} /></Field>
            <Field label="Short description" id="shortDescription" className="sm:col-span-2"><Input id="shortDescription" value={form.shortDescription || ""} onChange={(event) => set("shortDescription", event.target.value)} /></Field>
            <Field label="Full description" id="longDescription" className="sm:col-span-2"><Textarea id="longDescription" rows="6" value={form.longDescription || ""} onChange={(event) => set("longDescription", event.target.value)} /></Field>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Registration</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Type" id="registrationType"><Select id="registrationType" value={form.registrationType || "individual"} onChange={(event) => set("registrationType", event.target.value)}><option value="individual">Individual</option><option value="team">Team</option><option value="optional_team">Individual or team</option></Select></Field>
            <Field label="Overall participant limit (optional)" id="capacity" hint="Counts people, not teams: the captain and every accepted member count once. Pending invitations do not count."><Input id="capacity" type="number" min="1" max="10000" value={form.maxParticipants ?? ""} onChange={(event) => set("maxParticipants", event.target.value)} placeholder="Unlimited" /></Field>
            {form.registrationType !== "individual" && <><Field label="Minimum team" id="minTeam"><Input id="minTeam" type="number" min="1" value={form.minTeamSize || 1} onChange={(event) => set("minTeamSize", Number(event.target.value))} /></Field><Field label="Maximum team" id="maxTeam"><Input id="maxTeam" type="number" min={form.minTeamSize || 1} value={form.maxTeamSize || 1} onChange={(event) => set("maxTeamSize", Number(event.target.value))} /></Field></>}
          </div>
          <EligibilityBuilder
            mode={form.eligibilityMode}
            rules={form.programmeEligibility}
            onModeChange={(value) => set("eligibilityMode", value)}
            onRulesChange={(value) => set("programmeEligibility", value)}
          />
          <Field label="Additional eligibility" id="eligibility" className="mt-5"><Textarea id="eligibility" rows="3" className="min-h-0" value={form.eligibility || ""} onChange={(event) => set("eligibility", event.target.value)} /></Field>
          <Field label="Contact details, one per line" id="contacts" className="mt-5"><Textarea id="contacts" rows="3" className="min-h-0" value={(form.ContactInfo || []).join("\n")} onChange={(event) => set("ContactInfo", event.target.value.split("\n").map((item) => item.trim()))} /></Field>
          {deadlineChanged && form.deadlineNotificationsEnabled !== false && <label className="mt-5 flex items-start gap-3 rounded-sm border-l-2 border-accent bg-accent-tint/40 p-4 text-sm"><input className="mt-1" type="checkbox" checked={notifyRegistrants} onChange={(event) => setNotifyRegistrants(event.target.checked)} /><span>Email registered students and send browser notifications about changed registration or submission deadlines when this save succeeds.</span></label>}
        </Card>
        <Card className="p-5 sm:p-6">
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
        <Card className="p-5 sm:p-6"><h2 className="display text-xl">Banner</h2><p className="mt-1.5 text-sm text-ink-3">Recommended: 1080 × 1080 px (1:1 Instagram post). The complete poster is shown without cropping across student and club pages. JPG, PNG, or WebP up to 20 MB; files above 10 MB are optimized automatically.</p>{form.eventBanner && !banner && <div className="relative mx-auto mt-5 aspect-square w-full max-w-2xl overflow-hidden rounded-sm border border-line bg-ink/90"><img src={form.eventBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" /><img src={form.eventBanner} alt="Current event banner" className="relative h-full w-full object-contain" /></div>}<Field label="Replace banner" id="banner" className="mt-5"><input id="banner" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBanner(event.target.files[0] || null)} /></Field></Card>
        <div className="flex flex-wrap gap-3"><Button type="submit" size="lg" loading={saving}>{saving ? "Saving..." : "Save event"}</Button><Button to={`/event/${eventId}`} variant="secondary" size="lg">Cancel</Button></div>
      </form>
    </Page>
  );
}
