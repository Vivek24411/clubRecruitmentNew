import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Field,
  Input,
  Page,
  Select,
  Skeleton,
  Textarea,
} from "../components/ui";

const SAVED_KEYS = [
  "title",
  "shortDescription",
  "longDescription",
  "eligibility",
  "registerationDeadline",
  "maxParticipants",
  "registrationType",
  "minTeamSize",
  "maxTeamSize",
  "numberOfRounds",
];

export default function EditEvent() {
  const { eventId } = useParams();
  const [form, setForm] = useState(null);
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, { params: { eventId } })
      .then(({ data }) => {
        if (data.success) setForm(data.event);
        else toast.error(data.msg);
      })
      .catch(() => toast.error("Could not load event"));
  }, [eventId]);

  const save = async (event) => {
    event.preventDefault();
    if (
      banner &&
      (!["image/jpeg", "image/png", "image/webp"].includes(banner.type) ||
        banner.size > 5 * 1024 * 1024)
    )
      return toast.error("Choose a JPG, PNG, or WebP image smaller than 5MB");

    setSaving(true);
    try {
      const payload = new FormData();
      SAVED_KEYS.forEach((key) => form[key] != null && payload.append(key, form[key]));
      if (banner) payload.append("eventBanner", banner);
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/club/events/${eventId}`,
        payload,
      );
      if (!data.success) throw new Error(data.msg);
      setForm(data.event);
      setBanner(null);
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not save event");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-10 h-96 w-full" />
      </Page>
    );
  }

  const set = (key, value) => setForm({ ...form, [key]: value });

  return (
    <Page width="5xl">
      <Link to={`/event/${eventId}`} className="link text-sm text-ink-3">
        ← Event overview
      </Link>

      <header className="reveal mt-6">
        <span className="eyebrow eyebrow-accent">Editing</span>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{form.title || "Edit event"}</h1>
        <p className="mt-3 text-base text-ink-2">
          Changes go live for students as soon as you save.
        </p>
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      <form onSubmit={save} className="mt-10 space-y-6">
        {/* Basics ------------------------------------------------------- */}
        <Card className="reveal p-6">
          <h2 className="display text-xl">Basics</h2>
          <div className="mt-6 space-y-5">
            <Field label="Title" id="title" required>
              <Input
                id="title"
                value={form.title || ""}
                onChange={(event) => set("title", event.target.value)}
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Short description"
                id="shortDescription"
                hint="Shown on event cards and listings."
              >
                <Textarea
                  id="shortDescription"
                  rows="3"
                  className="min-h-0"
                  value={form.shortDescription || ""}
                  onChange={(event) => set("shortDescription", event.target.value)}
                />
              </Field>
              <Field label="Eligibility" id="eligibility">
                <Textarea
                  id="eligibility"
                  rows="3"
                  className="min-h-0"
                  value={form.eligibility || ""}
                  onChange={(event) => set("eligibility", event.target.value)}
                />
              </Field>
            </div>

            <Field label="Full description" id="longDescription">
              <Textarea
                id="longDescription"
                rows="8"
                value={form.longDescription || ""}
                onChange={(event) => set("longDescription", event.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Registration ------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "80ms" }}>
          <h2 className="display text-xl">Registration</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Deadline" id="deadline">
              <Input
                id="deadline"
                type="date"
                value={form.registerationDeadline || ""}
                onChange={(event) => set("registerationDeadline", event.target.value)}
              />
            </Field>

            <Field label="Registration type" id="registrationType">
              <Select
                id="registrationType"
                value={form.registrationType || "team"}
                onChange={(event) => set("registrationType", event.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="optional_team">Optional team</option>
              </Select>
            </Field>

            <Field label="Min team size" id="minTeamSize">
              <Input
                id="minTeamSize"
                type="number"
                min="1"
                className="tabular"
                value={form.minTeamSize || 1}
                onChange={(event) => set("minTeamSize", event.target.value)}
              />
            </Field>

            <Field label="Max team size" id="maxTeamSize">
              <Input
                id="maxTeamSize"
                type="number"
                min="1"
                className="tabular"
                value={form.maxTeamSize || 1}
                onChange={(event) => set("maxTeamSize", event.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Banner ------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "140ms" }}>
          <h2 className="display text-xl">Banner</h2>
          <p className="mt-1.5 text-sm text-ink-3">JPG, PNG, or WebP under 5&nbsp;MB.</p>

          {form.eventBanner && !banner && (
            <img
              src={form.eventBanner}
              alt=""
              className="mt-5 aspect-[21/7] w-full rounded-sm border border-line object-cover"
              onError={(error) => {
                error.currentTarget.style.display = "none";
              }}
            />
          )}

          <Field label="Replace banner" id="banner" className="mt-5">
            <input
              id="banner"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setBanner(event.target.files[0] || null)}
              className="block w-full text-sm text-ink-2 file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line-2 file:bg-surface file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-paper-2"
            />
          </Field>

          {banner && (
            <p className="mt-3 text-sm text-ink-2">
              Selected <span className="font-semibold">{banner.name}</span> ·{" "}
              {(banner.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={saving}>
            {saving ? "Saving…" : "Save event"}
          </Button>
          <Button to={`/event/${eventId}`} variant="secondary" size="lg">
            Cancel
          </Button>
        </div>
      </form>
    </Page>
  );
}
