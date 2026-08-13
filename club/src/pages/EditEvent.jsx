import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import RoundBuilder, { normalizeRoundsForForm } from "../components/RoundBuilder";
import { Button, Card, Field, Input, Page, Select, Skeleton, Textarea } from "../components/ui";

const YEARS = [[1, "First"], [2, "Second"], [3, "Third"], [4, "Fourth"], [5, "Fifth"]];

export default function EditEvent() {
  const { eventId } = useParams();
  const [form, setForm] = useState(null);
  const [banner, setBanner] = useState(null);
  const [notifyRegistrants, setNotifyRegistrants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const originalDeadline = useRef("");
  const originalRoundDeadlines = useRef({});

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/student/academic-options`)
      .then(({ data }) => data.success && setBranches(data.academicConfiguration.branches || []))
      .catch(() => {});
    axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, { params: { eventId } })
      .then(({ data }) => {
        if (!data.success) throw new Error(data.msg);
        originalDeadline.current = data.event.registerationDeadline || "";
        const normalizedRounds = normalizeRoundsForForm(data.event.rounds || []);
        originalRoundDeadlines.current = Object.fromEntries(normalizedRounds.map((round) => [round._id, round.submissionDeadlineAt || ""]));
        setForm({
          ...data.event,
          rounds: normalizedRounds,
          eligibilityYears: data.event.eligibilityYears || [],
          eligibilityBranches: data.event.eligibilityBranches || [],
          ContactInfo: data.event.ContactInfo || [],
        });
      })
      .catch((error) => toast.error(error.message || "Could not load event"));
  }, [eventId]);

  if (!form) return <Page width="5xl"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-10 h-96 w-full" /></Page>;
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const deadlineChanged = originalDeadline.current !== (form.registerationDeadline || "") || form.rounds.some((round) => round._id && String(originalRoundDeadlines.current[round._id] || "") !== String(round.submissionDeadlineAt || ""));

  const save = async (event) => {
    event.preventDefault();
    if (!form.rounds.length) return toast.error("Keep at least one event round");
    setSaving(true);
    try {
      const payload = new FormData();
      ["title", "eventType", "shortDescription", "longDescription", "registerationDeadline", "maxParticipants", "registrationType", "minTeamSize", "maxTeamSize", "eligibility", "allowPassedOut", "deadlineNotificationsEnabled"].forEach((key) => payload.append(key, form[key] ?? ""));
      payload.append("numberOfRounds", form.rounds.length);
      payload.append("roundsJSON", JSON.stringify(form.rounds));
      payload.append("contactInfoJSON", JSON.stringify(form.ContactInfo));
      payload.append("eligibilityYearsJSON", JSON.stringify(form.eligibilityYears));
      payload.append("eligibilityBranchesJSON", JSON.stringify(form.eligibilityBranches || []));
      payload.append("notifyRegistrants", String(notifyRegistrants));
      if (banner) payload.append("eventBanner", banner);
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/club/events/${eventId}`, payload);
      if (!data.success) throw new Error(data.msg);
      const normalizedRounds = normalizeRoundsForForm(data.event.rounds || []);
      setForm({ ...data.event, rounds: normalizedRounds });
      originalDeadline.current = data.event.registerationDeadline || "";
      originalRoundDeadlines.current = Object.fromEntries(normalizedRounds.map((round) => [round._id, round.submissionDeadlineAt || ""]));
      setBanner(null);
      setNotifyRegistrants(false);
      toast.success(data.msg);
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
            <Field label="Registration deadline" id="deadline"><Input id="deadline" type="date" value={form.registerationDeadline || ""} onChange={(event) => set("registerationDeadline", event.target.value)} /></Field>
            <Field label="Short description" id="shortDescription" className="sm:col-span-2"><Input id="shortDescription" value={form.shortDescription || ""} onChange={(event) => set("shortDescription", event.target.value)} /></Field>
            <Field label="Full description" id="longDescription" className="sm:col-span-2"><Textarea id="longDescription" rows="6" value={form.longDescription || ""} onChange={(event) => set("longDescription", event.target.value)} /></Field>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="display text-xl">Registration</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Type" id="registrationType"><Select id="registrationType" value={form.registrationType || "individual"} onChange={(event) => set("registrationType", event.target.value)}><option value="individual">Individual</option><option value="team">Team</option><option value="optional_team">Individual or team</option></Select></Field>
            <Field label="Capacity" id="capacity"><Input id="capacity" type="number" min="1" value={form.maxParticipants || 1} onChange={(event) => set("maxParticipants", Number(event.target.value))} /></Field>
            {form.registrationType !== "individual" && <><Field label="Minimum team" id="minTeam"><Input id="minTeam" type="number" min="1" value={form.minTeamSize || 1} onChange={(event) => set("minTeamSize", Number(event.target.value))} /></Field><Field label="Maximum team" id="maxTeam"><Input id="maxTeam" type="number" min={form.minTeamSize || 1} value={form.maxTeamSize || 1} onChange={(event) => set("maxTeamSize", Number(event.target.value))} /></Field></>}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">{YEARS.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm"><input type="checkbox" checked={form.eligibilityYears?.includes(value)} onChange={(event) => set("eligibilityYears", event.target.checked ? [...form.eligibilityYears, value] : form.eligibilityYears.filter((year) => year !== value))} />{label} year</label>)}</div>
          <Field label="Additional eligibility" id="eligibility" className="mt-5"><Textarea id="eligibility" rows="3" className="min-h-0" value={form.eligibility || ""} onChange={(event) => set("eligibility", event.target.value)} /></Field>
          <Field label="Eligible branches" id="eligibleBranch" className="mt-5" hint="Leave empty for every branch."><Select id="eligibleBranch" value="" onChange={(event) => event.target.value && !form.eligibilityBranches.includes(event.target.value) && set("eligibilityBranches", [...form.eligibilityBranches, event.target.value])}><option value="">Add a branch</option>{branches.filter((branch) => !form.eligibilityBranches.includes(branch.name)).map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}</Select><div className="mt-2 flex flex-wrap gap-2">{form.eligibilityBranches.map((branch) => <button key={branch} type="button" className="badge badge-neutral" onClick={() => set("eligibilityBranches", form.eligibilityBranches.filter((item) => item !== branch))}>{branch} x</button>)}</div></Field>
          <Field label="Contact details, one per line" id="contacts" className="mt-5"><Textarea id="contacts" rows="3" className="min-h-0" value={(form.ContactInfo || []).join("\n")} onChange={(event) => set("ContactInfo", event.target.value.split("\n").map((item) => item.trim()))} /></Field>
          {deadlineChanged && form.deadlineNotificationsEnabled !== false && <label className="mt-5 flex items-start gap-3 rounded-sm border-l-2 border-accent bg-accent-tint/40 p-4 text-sm"><input className="mt-1" type="checkbox" checked={notifyRegistrants} onChange={(event) => setNotifyRegistrants(event.target.checked)} /><span>Email registered students about changed registration or submission deadlines when this save succeeds.</span></label>}
        </Card>
        <Card className="p-5 sm:p-6"><RoundBuilder rounds={form.rounds} onChange={(rounds) => set("rounds", rounds)} registrationType={form.registrationType} /></Card>
        <Card className="p-5 sm:p-6"><h2 className="display text-xl">Banner</h2>{form.eventBanner && !banner && <img src={form.eventBanner} alt="Current event banner" className="mt-5 aspect-[21/7] w-full rounded-sm border border-line bg-paper-2 object-contain" />}<Field label="Replace banner" id="banner" className="mt-5"><input id="banner" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBanner(event.target.files[0] || null)} /></Field></Card>
        <div className="flex flex-wrap gap-3"><Button type="submit" size="lg" loading={saving}>{saving ? "Saving..." : "Save event"}</Button><Button to={`/event/${eventId}`} variant="secondary" size="lg">Cancel</Button></div>
      </form>
    </Page>
  );
}
