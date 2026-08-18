import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Monogram,
  Page,
  Select,
  Skeleton,
  Textarea,
} from "../components/ui";
import { uploadDirect } from "../utils/directUpload";

const SESSION_STATUSES = ["draft", "published", "cancelled", "completed", "archived"];
const FIELD_LABELS = {
  title: "Title",
  shortDescription: "Short description",
  longDescription: "Full description",
  date: "Date",
  time: "Time",
  duration: "Duration",
  venue: "Venue",
  meetingUrl: "Meeting link",
  capacity: "Capacity",
  status: "Status",
};

const RSVP_TONE = {
  confirmed: "ok",
  attended: "ok",
  waitlisted: "warn",
  absent: "bad",
  cancelled: "neutral",
};

export default function Session() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(async () => {
    try {
      const [sessionResponse, attendeeResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/club/getSession`, { params: { sessionId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/club/sessions/${sessionId}/attendees`),
      ]);
      if (!sessionResponse.data.success) throw new Error(sessionResponse.data.msg);
      setSession(sessionResponse.data.session);
      setAttendees(attendeeResponse.data.attendees || []);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, value) => {
    setSession((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError("");
  };

  const validationError = (error) => {
    const detail = error.response?.data?.errors?.[0];
    if (!detail) {
      return { field: "", message: error.response?.data?.msg || error.message || "Could not save session" };
    }
    const field = detail.path || detail.param || "";
    const label = FIELD_LABELS[field] || field || "Field";
    return { field, message: `${label}: ${detail.msg || "Please enter a valid value"}` };
  };

  const save = async (event) => {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSaving(true);
    try {
      const directAsset = await uploadDirect(thumbnail, { role: "club", kind: "sessionThumbnail" });
      const payload = Object.fromEntries(
        ["title", "shortDescription", "longDescription", "date", "time", "duration", "venue", "meetingUrl", "capacity", "status"]
          .map((key) => [key, session[key] ?? ""]),
      );
      payload.capacity = session.capacity === "" || session.capacity == null ? null : session.capacity;
      if (directAsset) payload.directAsset = directAsset;
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/club/sessions/${sessionId}`,
        payload,
      );
      if (!data.success) throw new Error(data.msg);
      setSession(data.session);
      setThumbnail(null);
      toast.success(data.msg);
    } catch (error) {
      const { field, message } = validationError(error);
      setFormError(message);
      if (field) {
        setFieldErrors({ [field]: error.response?.data?.errors?.[0]?.msg || "Please enter a valid value" });
        window.requestAnimationFrame(() => {
          const input = document.getElementById(field);
          input?.scrollIntoView({ behavior: "smooth", block: "center" });
          input?.focus({ preventScroll: true });
        });
      }
      toast.error(message);
    } finally { setSaving(false); }
  };

  const attendance = async (studentId, status) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/club/sessions/${sessionId}/attendance`,
        { studentId, status },
      );
      if (!data.success) throw new Error(data.msg);
      setAttendees((items) =>
        items.map((item) =>
          item._id === data.rsvp._id ? { ...item, status: data.rsvp.status } : item,
        ),
      );
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const removeSession = async () => {
    if (!window.confirm(`Permanently delete “${session.title}”? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const { data } = await axios.delete(`${import.meta.env.VITE_BASE_URI}/club/sessions/${sessionId}`);
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      navigate("/sessions", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not delete session");
    } finally {
      setDeleting(false);
    }
  };

  const addWalkIn = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/club/sessions/${sessionId}/attendance`, { studentEmail: walkInEmail, status: "attended" });
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      setWalkInEmail("");
      await load();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return attendees;
    return attendees.filter((rsvp) =>
      `${rsvp.studentId?.name} ${rsvp.studentId?.email}`.toLowerCase().includes(query),
    );
  }, [attendees, search]);

  const confirmedCount = attendees.filter((item) =>
    ["confirmed", "attended"].includes(item.status),
  ).length;

  if (loading) {
    return (
      <Page>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full lg:col-span-3" />
        </div>
      </Page>
    );
  }

  if (!session) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Session not found"
          description="This session may have been removed, or the link is incorrect."
          action={<Button to="/sessions" variant="secondary">Back to sessions</Button>}
        />
      </Page>
    );
  }

  return (
    <Page>
      <Link to="/sessions" className="link text-sm text-ink-3">
        ← All sessions
      </Link>

      <header className="reveal mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow eyebrow-accent">Session</span>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{session.title}</h1>
            <p className="mt-3 text-sm text-ink-3">
              {formatDateTime(sessionDate(session.date, session.time))}
              {session.venue ? ` · ${session.venue}` : session.meetingUrl ? " · Online" : ""}
            </p>
          </div>
          <Badge tone={session.status === "published" ? "ok" : "neutral"} className="capitalize">
            {session.status}
          </Badge>
        </div>
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      {session.sessionThumbnail && (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-md border border-line bg-ink/90">
          <img src={session.sessionThumbnail} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
          <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
          <img src={session.sessionThumbnail} alt={`${session.title} banner`} className="relative h-full w-full object-contain" />
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        {/* --------------------------------------------------------------- */}
        {/* Editor                                                           */}
        {/* --------------------------------------------------------------- */}
        <Card as="form" onSubmit={save} className="reveal h-fit p-6 lg:col-span-2">
          <h2 className="display text-xl">Session details</h2>
          {formError && <div role="alert" className="mt-4 rounded-sm border border-bad/30 bg-bad-tint px-4 py-3 text-sm font-medium text-bad">{formError}</div>}

          <div className="mt-6 space-y-5">
            <Field label="Title" id="title" required error={fieldErrors.title}>
              <Input
                id="title"
                value={session.title || ""}
                onChange={(event) => set("title", event.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
                required
              />
            </Field>

            <Field label="Short description" id="shortDescription" error={fieldErrors.shortDescription}>
              <Textarea
                id="shortDescription"
                rows="2"
                className="min-h-0"
                value={session.shortDescription || ""}
                onChange={(event) => set("shortDescription", event.target.value)}
                aria-invalid={Boolean(fieldErrors.shortDescription)}
              />
            </Field>

            <Field label="Full description" id="longDescription" hint="Optional." error={fieldErrors.longDescription}>
              <Textarea id="longDescription" rows="4" value={session.longDescription || ""} onChange={(event) => set("longDescription", event.target.value)} aria-invalid={Boolean(fieldErrors.longDescription)} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" id="date" error={fieldErrors.date}>
                <Input
                  id="date"
                  type="date"
                  value={session.date || ""}
                  onChange={(event) => set("date", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.date)}
                />
              </Field>
              <Field label="Time" id="time" error={fieldErrors.time}>
                <Input
                  id="time"
                  type="time"
                  value={session.time || ""}
                  onChange={(event) => set("time", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.time)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">{["09:00", "12:00", "17:00", "20:00"].map((value) => <button key={value} type="button" className={`rounded-full border px-2 py-1 text-xs font-semibold ${session.time === value ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-3"}`} onClick={() => set("time", value)}>{new Date(`2000-01-01T${value}:00`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</button>)}</div>
              </Field>
            </div>

            <Field label="Venue" id="venue" hint="Optional for online sessions." error={fieldErrors.venue}>
              <Input
                id="venue"
                value={session.venue || ""}
                onChange={(event) => set("venue", event.target.value)}
                aria-invalid={Boolean(fieldErrors.venue)}
                placeholder="e.g. LHC 101"
              />
            </Field>

            <Field label="Meeting link" id="meetingUrl" hint="Optional. Use a full https:// link." error={fieldErrors.meetingUrl}>
              <Input
                id="meetingUrl"
                type="url"
                value={session.meetingUrl || ""}
                onChange={(event) => set("meetingUrl", event.target.value)}
                aria-invalid={Boolean(fieldErrors.meetingUrl)}
                placeholder="https://meet.google.com/..."
              />
            </Field>

            <Field label="Duration in minutes" id="duration" error={fieldErrors.duration}>
              <Input id="duration" type="number" min="1" max="1440" value={session.duration || ""} onChange={(event) => set("duration", Number(event.target.value))} aria-invalid={Boolean(fieldErrors.duration)} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacity" id="capacity" hint="Leave blank for open attendance." error={fieldErrors.capacity}>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={session.capacity || ""}
                  onChange={(event) => set("capacity", event.target.value || null)}
                  aria-invalid={Boolean(fieldErrors.capacity)}
                  placeholder="Unlimited"
                />
              </Field>
              <Field label="Status" id="status" error={fieldErrors.status}>
                <Select
                  id="status"
                  className="capitalize"
                  value={session.status}
                  onChange={(event) => set("status", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.status)}
                >
                  {SESSION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Replace thumbnail" id="sessionThumbnail" hint="1600 × 900 px (16:9) works best. Up to 20 MB; files above 10 MB are optimized automatically."><input id="sessionThumbnail" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files[0] || null; if (file && file.size > 20 * 1024 * 1024) { event.target.value = ""; setThumbnail(null); toast.error("Choose an image no larger than 20 MB"); return; } setThumbnail(file); }} /></Field>
          </div>

          <Button className="mt-7" loading={saving}>Save session</Button>
        </Card>

        {/* --------------------------------------------------------------- */}
        {/* Attendance                                                       */}
        {/* --------------------------------------------------------------- */}
        <Card className="reveal overflow-hidden lg:col-span-3" style={{ "--d": "100ms" }}>
          <div className="border-b border-line p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display text-xl">RSVPs and attendance</h2>
                <p className="mt-1.5 text-sm text-ink-3">
                  <span className="tabular font-semibold text-ink-2">{attendees.length}</span>{" "}
                  responses ·{" "}
                  <span className="tabular font-semibold text-ink-2">{confirmedCount}</span>{" "}
                  confirmed or attended
                </p>
              </div>
            </div>
            <Input
              className="mt-4"
              type="search"
              aria-label="Search attendees"
              placeholder="Search by name or email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <form onSubmit={addWalkIn} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input type="email" aria-label="Walk-in student email" placeholder="Walk-in student IITR email" value={walkInEmail} onChange={(event) => setWalkInEmail(event.target.value)} required />
              <Button size="sm" className="sm:flex-none">Add walk-in</Button>
            </form>
          </div>

          <div className="max-h-[36rem] overflow-auto">
            {visible.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-3">
                {attendees.length === 0 ? "No RSVPs yet." : "No attendees match that search."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((rsvp) => (
                  <li key={rsvp._id} className="flex flex-wrap items-center gap-3 p-4">
                    <Monogram name={rsvp.studentId?.name || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{rsvp.studentId?.name}</p>
                      <p className="truncate text-xs text-ink-3">
                        {rsvp.studentId?.email}
                        {rsvp.studentId?.branch ? ` · ${rsvp.studentId.branch}` : ""}
                        {rsvp.studentId?.year ? ` ${rsvp.studentId.year}` : ""}
                      </p>
                    </div>

                    <Badge tone={RSVP_TONE[rsvp.status] || "neutral"} className="capitalize">
                      {rsvp.status}
                    </Badge>

                    {["confirmed", "attended", "absent"].includes(rsvp.status) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => attendance(rsvp.studentId?._id, "attended")}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-bad"
                          onClick={() => attendance(rsvp.studentId?._id, "absent")}
                        >
                          Absent
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-8 flex flex-col gap-5 border-bad/30 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-lg">Delete session</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-3">
            Permanent deletion is available only before students have RSVP or attendance history. Otherwise, set the status to cancelled or archived.
          </p>
        </div>
        <Button type="button" variant="danger" loading={deleting} disabled={saving} className="shrink-0" onClick={removeSession}>
          Delete permanently
        </Button>
      </Card>
    </Page>
  );
}
