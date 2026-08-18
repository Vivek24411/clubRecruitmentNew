import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui";
import { uploadDirect } from "../utils/directUpload";

export default function AddSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("published");
  const [thumbnail, setThumbnail] = useState(null);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const invalidShown = useRef(false);

  const fieldLabel = (name) => ({
    title: "Session title",
    shortDescription: "Short description",
    longDescription: "Detailed description",
    date: "Date",
    time: "Start time",
    duration: "Duration",
    venue: "Venue",
    meetingUrl: "Meeting link",
    capacity: "Capacity",
  }[name] || name || "Field");

  const validationError = (error) => {
    const detail = error.response?.data?.errors?.[0];
    if (!detail) return error.response?.data?.msg || error.message || "Failed to create session";
    const field = detail.path || detail.param;
    return `${fieldLabel(field)}: ${detail.msg || "Please enter a valid value"}`;
  };

  const showInvalidField = (event) => {
    event.preventDefault();
    if (invalidShown.current) return;
    invalidShown.current = true;
    window.setTimeout(() => { invalidShown.current = false; }, 100);
    const input = event.target;
    const message = `${fieldLabel(input.name || input.id)}: ${input.validationMessage}`;
    setFormError(message);
    toast.error(message);
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setIsLoading(true);
    try {
      const directAsset = await uploadDirect(thumbnail, { role: "club", kind: "sessionThumbnail" });
      const payload = {
        title, shortDescription, date, time, duration, longDescription, venue, meetingUrl,
        capacity: capacity || null,
        status,
        ...(directAsset ? { directAsset } : {}),
      };
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/addSession`, payload);

      if (response.data.success) {
        toast.success(response.data.msg);
        navigate(`/session/${response.data.session._id}`, { replace: true });
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error adding session:", error);
      const message = validationError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="New session"
        title="Schedule an information session"
        description="Give students a chance to meet your club and understand how selection works."
      />

      <form onSubmit={handleSubmit} onInvalidCapture={showInvalidField} className="mt-10 space-y-6">
        {formError && <div role="alert" className="rounded-sm border border-bad/30 bg-bad-tint px-4 py-3 text-sm font-medium text-bad">{formError}</div>}
        {/* About ---------------------------------------------------------- */}
        <Card className="reveal p-6">
          <h2 className="display text-xl">About</h2>
          <div className="mt-6 space-y-5">
            {/* This was previously a date input by mistake — it is free text. */}
            <Field label="Session title" id="title" required>
              <Input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="e.g. Intro to Design at IITR"
              />
            </Field>

            <Field
              label="Short description"
              id="shortDescription"
              required
              hint="One line. Appears in listings."
            >
              <Input
                id="shortDescription"
                name="shortDescription"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                required
                placeholder="Brief description"
              />
            </Field>

            <Field
              label="Detailed description"
              id="longDescription"
              hint="Optional. Include special instructions, requirements, or what attendees should expect."
            >
              <Textarea
                id="longDescription"
                name="longDescription"
                rows={6}
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
                placeholder="Provide detailed information about this session"
              />
            </Field>
          </div>
        </Card>

        {/* Schedule ------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "80ms" }}>
          <h2 className="display text-xl">Schedule and access</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date" id="date" required>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </Field>

            <Field label="Start time" id="time" required>
              <Input
                id="time"
                name="time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
              <div className="mt-2 flex flex-wrap gap-1.5">{["09:00", "12:00", "17:00", "20:00"].map((value) => <button key={value} type="button" className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${time === value ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-3"}`} onClick={() => setTime(value)}>{new Date(`2000-01-01T${value}:00`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</button>)}</div>
            </Field>

            <Field label="Duration" id="duration" required hint="In minutes.">
              <Input
                id="duration"
                name="duration"
                type="number"
                min="1"
                className="tabular"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
                placeholder="60"
              />
            </Field>

            <Field label="Capacity" id="capacity" hint="Blank means unlimited.">
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                className="tabular"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="Unlimited"
              />
            </Field>

            <Field label="Venue" id="venue" hint="Optional for online sessions." className="sm:col-span-2">
              <Input
                id="venue"
                name="venue"
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
                placeholder="e.g. LHC 101"
              />
            </Field>

            <Field label="Meeting link" id="meetingUrl" hint="Optional. Use a full https:// link for online or hybrid sessions." className="sm:col-span-2">
              <Input
                id="meetingUrl"
                name="meetingUrl"
                type="url"
                value={meetingUrl}
                onChange={(event) => setMeetingUrl(event.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </Field>
          </div>
        </Card>

        <Card className="reveal p-6" style={{ "--d": "120ms" }}>
          <h2 className="display text-xl">Session thumbnail</h2>
          <p className="mt-1.5 text-sm text-ink-3">Recommended: 1600 × 900 px (16:9), JPG, PNG, or WebP up to 20 MB. Images above the provider&rsquo;s 10 MB limit are optimized automatically.</p>
          <Field label="Choose image" id="sessionThumbnail" className="mt-5"><input id="sessionThumbnail" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files[0] || null; if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)) { event.target.value = ""; setThumbnail(null); setPreview(""); toast.error("Choose a JPG, PNG, or WebP image no larger than 20 MB"); return; } setThumbnail(file); setPreview(file ? URL.createObjectURL(file) : ""); }} /></Field>
          {preview && (
            <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-sm border border-line bg-ink/90">
              <img src={preview} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
              <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
              <img src={preview} alt="Session thumbnail preview" className="relative h-full w-full object-contain" />
            </div>
          )}
        </Card>

        {/* Publish -------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "150ms" }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <Field
              label="Visibility"
              id="status"
              className="sm:w-56"
              hint="Published sessions are visible to every student."
            >
              <Select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="published">Publish now</option>
                <option value="draft">Save as draft</option>
              </Select>
            </Field>

            <Button type="submit" size="lg" loading={isLoading}>
              {isLoading
                ? "Creating…"
                : status === "published"
                  ? "Create and publish"
                  : "Create draft"}
            </Button>
          </div>
        </Card>
      </form>
    </Page>
  );
}
