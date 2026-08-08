import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
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
  SkeletonList,
  Stat,
  Textarea,
} from "../components/ui";

const STATUSES = ["submitted", "in_progress", "waitlisted", "selected", "rejected", "withdrawn"];
const ACTION_STATUSES = STATUSES.filter((status) => status !== "withdrawn");

const STATUS_TONE = {
  selected: "ok",
  rejected: "bad",
  waitlisted: "warn",
  in_progress: "info",
  submitted: "neutral",
  withdrawn: "neutral",
};

export default function EventRegisteredStudents() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [eventResponse, applicationsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, { params: { eventId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEventsRegisteredStudents`, {
          params: { eventId },
        }),
      ]);
      if (!eventResponse.data.success) throw new Error(eventResponse.data.msg);
      setEvent(eventResponse.data.event);
      setApplications(applicationsResponse.data.registeredStudents || []);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      applications.filter((application) => {
        const text =
          `${application.studentId?.name} ${application.studentId?.email} ${application.teamName || ""}`.toLowerCase();
        return (
          text.includes(search.toLowerCase()) &&
          (filter === "all" || application.overallStatus === filter)
        );
      }),
    [applications, search, filter],
  );

  const counts = useMemo(() => {
    const tally = (status) =>
      applications.filter((application) => application.overallStatus === status).length;
    return {
      total: applications.length,
      inProgress: tally("in_progress"),
      selected: tally("selected"),
      rejected: tally("rejected"),
    };
  }, [applications]);

  const save = async (application, changes) => {
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/applications/${application._id}`,
        changes,
      );
      if (!data.success) throw new Error(data.msg);
      setApplications((items) =>
        items.map((item) =>
          item._id === application._id
            ? {
                ...item,
                ...data.registration,
                studentId: item.studentId,
                membersAccepted: item.membersAccepted,
                eventId: item.eventId,
              }
            : item,
        ),
      );
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const bulkUpdate = async (status) => {
    if (!selected.length) return toast.info("Select at least one application");
    if (
      ["selected", "rejected"].includes(status) &&
      !window.confirm(`Mark ${selected.length} application(s) as ${status}?`)
    )
      return;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/applications/bulk`,
        { registrationIds: selected, overallStatus: status },
      );
      if (!data.success) throw new Error(data.msg);
      setApplications((items) =>
        items.map((item) =>
          (data.updatedIds || []).includes(item._id) ? { ...item, overallStatus: status } : item,
        ),
      );
      setSelected([]);
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const roundAction = async (application, action, roundNumber, roundDate) => {
    try {
      const payload = {
        eventId,
        studentId: application.studentId?._id,
        roundNumber: Number(roundNumber),
      };
      if (roundDate) payload.roundDate = new Date(roundDate).toISOString();
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/${action}`,
        payload,
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const exportCsv = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/club/events/${eventId}/applications/export`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event?.title || "event"}-applications.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export applications");
    }
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((application) => selected.includes(application._id));

  const toggleAll = () =>
    setSelected(allVisibleSelected ? [] : visible.map((application) => application._id));

  if (loading) {
    return (
      <Page>
        <SkeletonList rows={4} />
      </Page>
    );
  }

  return (
    <Page>
      <Link to={`/event/${eventId}`} className="link text-sm text-ink-3">
        ← Event overview
      </Link>

      <header className="reveal mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow eyebrow-accent">Review</span>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{event?.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
              Review teams, record notes and scores, schedule rounds, and send decisions.
            </p>
          </div>
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      <div className="stagger mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applications" value={counts.total} />
        <Stat label="In progress" value={counts.inProgress} tone="accent" />
        <Stat label="Selected" value={counts.selected} />
        <Stat label="Rejected" value={counts.rejected} />
      </div>

      {/* Toolbar */}
      <Card className="mt-8 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <Field label="Search" id="search" className="flex-1">
            <Input
              id="search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Captain name, email, or team…"
            />
          </Field>

          <Field label="Status" id="filter" className="lg:w-48">
            <Select
              id="filter"
              className="capitalize"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={`Bulk action${selected.length ? ` (${selected.length})` : ""}`}
            id="bulk"
            className="lg:w-52"
          >
            <Select
              id="bulk"
              defaultValue=""
              className="capitalize"
              onChange={(event) => {
                if (event.target.value) bulkUpdate(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                Update selected…
              </option>
              {ACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {visible.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-sm">
            <button onClick={toggleAll} className="link text-ink-2">
              {allVisibleSelected ? "Clear selection" : `Select all ${visible.length}`}
            </button>
            {selected.length > 0 && (
              <span className="tabular text-ink-3">{selected.length} selected</span>
            )}
          </div>
        )}
      </Card>

      <div className="mt-6">
        {visible.length === 0 ? (
          <EmptyState
            title={applications.length === 0 ? "No applications yet" : "No matching applications"}
            description={
              applications.length === 0
                ? "Once students apply to this event, their teams will appear here."
                : "Try a different search term, or reset the status filter."
            }
            action={
              applications.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="stagger space-y-4">
            {visible.map((application) => (
              <ApplicationCard
                key={application._id}
                application={application}
                checked={selected.includes(application._id)}
                onCheck={(checked) =>
                  setSelected((items) =>
                    checked
                      ? [...items, application._id]
                      : items.filter((id) => id !== application._id),
                  )
                }
                onSave={save}
                onRound={roundAction}
              />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function ApplicationCard({ application, checked, onCheck, onSave, onRound }) {
  const [notes, setNotes] = useState(application.reviewerNotes || "");
  const [score, setScore] = useState(application.score ?? "");
  const [round, setRound] = useState(Math.max(application.currentRound || 1, 1));
  const [roundDate, setRoundDate] = useState("");
  const members = [application.studentId, ...(application.membersAccepted || [])].filter(Boolean);

  return (
    <article
      className={`card p-5 transition-colors duration-300 ${checked ? "border-accent" : ""}`}
    >
      <div className="flex gap-4">
        <label className="flex-none pt-1">
          <span className="sr-only">Select {application.studentId?.name}</span>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheck(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <Monogram name={application.teamName || application.studentId?.name || "?"} size="sm" />
              <div className="min-w-0">
                <h2 className="display text-lg leading-snug">
                  {application.teamName || application.studentId?.name}
                </h2>
                <p className="mt-0.5 truncate text-sm text-ink-3">
                  Captain: {application.studentId?.name} · {application.studentId?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Badge
                tone={STATUS_TONE[application.overallStatus] || "neutral"}
                className="capitalize"
              >
                {application.overallStatus?.replace("_", " ")}
              </Badge>
              <Select
                aria-label="Application status"
                className="w-40 capitalize"
                disabled={application.overallStatus === "withdrawn"}
                value={application.overallStatus}
                onChange={(event) => onSave(application, { overallStatus: event.target.value })}
              >
                {STATUSES.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={status === "withdrawn" && application.overallStatus !== "withdrawn"}
                  >
                    {status.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Team */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="eyebrow">Team · {members.length}</span>
            {members.map((member) => (
              <span
                key={member._id || member.name}
                className="rounded-xs bg-paper-2 px-2.5 py-1 text-xs font-medium"
              >
                {member.name}
              </span>
            ))}
          </div>

          {/* Review */}
          <div className="mt-5 grid gap-3 border-t border-line pt-4 lg:grid-cols-[1fr_7rem_auto] lg:items-start">
            <Textarea
              aria-label="Private reviewer notes"
              rows="2"
              className="min-h-0 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Private reviewer notes"
            />
            <Input
              aria-label="Score"
              type="number"
              min="0"
              max="100"
              className="tabular text-sm"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="Score"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                onSave(application, {
                  reviewerNotes: notes,
                  score: score === "" ? null : Number(score),
                })
              }
            >
              Save review
            </Button>
          </div>

          {/* Rounds */}
          {application.numberOfRounds > 0 && application.overallStatus !== "withdrawn" && (
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-sm bg-paper-2 p-4">
              <label className="block">
                <span className="eyebrow">Round</span>
                <Input
                  type="number"
                  min="1"
                  max={application.numberOfRounds}
                  value={round}
                  onChange={(event) => setRound(event.target.value)}
                  className="tabular mt-1.5 w-20 text-sm"
                />
              </label>
              <label className="block">
                <span className="eyebrow">Schedule</span>
                <Input
                  type="datetime-local"
                  value={roundDate}
                  onChange={(event) => setRoundDate(event.target.value)}
                  className="mt-1.5 text-sm"
                />
              </label>
              <Button
                size="sm"
                disabled={!roundDate}
                onClick={() => onRound(application, "scheduleInterview", round, roundDate)}
              >
                Schedule
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRound(application, "selectStudentForRound", round)}
              >
                Mark cleared
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
