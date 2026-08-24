import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { eventDeadline, eventIsOpen, formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Monogram,
  Page,
  PageHeader,
  Select,
  Skeleton,
} from "../components/ui";

const STATUSES = ["draft", "published", "closed", "archived", "cancelled"];

const STATUS_TONE = {
  published: "ok",
  draft: "neutral",
  closed: "warn",
  archived: "neutral",
  cancelled: "bad",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("published");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/club/getEvents`)
      .then(({ data }) => (data.success ? setEvents(data.events) : toast.error(data.msg)))
      .catch(() => toast.error("Could not load events"))
      .finally(() => setLoading(false));
  }, []);

  const changeStatus = async (event, status) => {
    if (["cancelled", "archived"].includes(status) && !window.confirm(`${status} ${event.title}?`))
      return;
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/club/events/${event._id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.msg);
      setEvents((items) => items.map((item) => (item._id === event._id ? data.event : item)));
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const deleteEvent = async (event) => {
    const confirmation = window.prompt(
      `Permanently delete “${event.title}” and ALL associated applications, teams, submissions, schedules, and student history?\n\nThis cannot be undone. Type the exact event title to continue:`,
    );
    if (confirmation === null) return;
    if (confirmation !== event.title) {
      toast.error("The event title did not match. Nothing was deleted.");
      return;
    }
    setDeleting(event._id);
    try {
      const { data } = await axios.delete(`${import.meta.env.VITE_BASE_URI}/club/events/${event._id}`, {
        data: { confirmation },
      });
      if (!data.success) throw new Error(data.msg);
      setEvents((items) => items.filter((item) => item._id !== event._id));
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not delete event");
    } finally {
      setDeleting("");
    }
  };

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) =>
      (statusFilter === "all" || event.status === statusFilter)
      && (typeFilter === "all" || event.eventType === typeFilter)
      && (!query || `${event.title} ${event.shortDescription || ""}`.toLowerCase().includes(query)));
  }, [events, search, statusFilter, typeFilter]);

  return (
    <Page>
      <PageHeader
        eyebrow="Pipelines"
        title="Events"
        description="Draft, publish, close, and review every opportunity your club runs."
        actions={<Button to="/addEvent" variant="accent">Create event</Button>}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label><span className="eyebrow">Search</span><Input className="mt-1.5" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Event title or description…" /></label>
        <label><span className="eyebrow">Status</span><Select className="mt-1.5" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status} className="capitalize">{status}</option>)}</Select></label>
        <label><span className="eyebrow">Type</span><Select className="mt-1.5" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option><option value="recruitment">Recruitment</option><option value="hackathon">Hackathon</option><option value="competition">Competition</option><option value="workshop">Workshop</option><option value="other">Other</option></Select></label>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-4 h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Create your first recruitment event to start accepting applications."
            action={<Button to="/addEvent">Create an event</Button>}
          />
        ) : filteredEvents.length === 0 ? (
          <EmptyState title="No matching events" description="Try changing the search, status, or event type filter." action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); }}>Clear filters</Button>} />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => {
              const deadline = eventDeadline(event);
              const effectiveStatus = event.status === "published"
                ? (eventIsOpen(event) ? "open" : "closed")
                : event.status;
              return (
                <article key={event._id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-square overflow-hidden bg-paper-2">
                    {event.eventBanner ? (
                      <>
                        <img src={event.eventBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" />
                        <img
                          src={event.eventBanner}
                          alt={`${event.title} banner`}
                          loading="lazy"
                          className="relative h-full w-full object-contain transition-transform duration-500 hover:scale-[1.02]"
                          onError={(error) => {
                            error.currentTarget.style.display = "none";
                          }}
                        />
                      </>
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Monogram name={event.title} size="md" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3">
                      <Badge tone={effectiveStatus === "open" ? "ok" : STATUS_TONE[effectiveStatus] || "neutral"} className="capitalize">
                        {effectiveStatus}
                      </Badge>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="display text-lg leading-snug">{event.title}</h2>
                    {event.shortDescription && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-3">
                        {event.shortDescription}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-ink-3">
                      Deadline{" "}
                      <span className="font-medium text-ink-2">
                        {deadline ? formatDateTime(deadline, { dateOnly: true }) : "Not set"}
                      </span>
                    </p>

                    <label className="mt-5 block">
                      <span className="eyebrow">Lifecycle</span>
                      <Select
                        className="mt-1.5 capitalize"
                        value={event.status}
                        onChange={(changeEvent) => changeStatus(event, changeEvent.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                      <span className="hint block">Archive hides a finished event from active workspaces while preserving its applications, rounds, and audit history.</span>
                    </label>

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm font-semibold">
                      <Link className="link link-accent" to={`/event/${event._id}`}>
                        Overview
                      </Link>
                      <Link className="link" to={`/events/${event._id}/edit`}>
                        Edit
                      </Link>
                      <button type="button" disabled={deleting === event._id} onClick={() => deleteEvent(event)} className="link text-bad disabled:opacity-50">
                        {deleting === event._id ? "Deleting…" : "Delete all data"}
                      </button>
                      <Link className="link ml-auto" to={`/event-applications/${event._id}`}>
                        Applications →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
