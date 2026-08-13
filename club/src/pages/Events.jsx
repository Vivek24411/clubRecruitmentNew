import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { eventDeadline, formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
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

  return (
    <Page>
      <PageHeader
        eyebrow="Pipelines"
        title="Recruitment events"
        description="Draft, publish, close, and review each recruitment pipeline you run."
        actions={<Button to="/addEvent" variant="accent">Create event</Button>}
      />

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card overflow-hidden">
                <Skeleton className="aspect-[16/6] w-full rounded-none" />
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
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const deadline = eventDeadline(event);
              return (
                <article key={event._id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-[16/6] overflow-hidden bg-paper-2">
                    {event.eventBanner ? (
                      <img
                        src={event.eventBanner}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(error) => {
                          error.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Monogram name={event.title} size="md" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3">
                      <Badge tone={STATUS_TONE[event.status] || "neutral"} className="capitalize">
                        {event.status}
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
                    </label>

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm font-semibold">
                      <Link className="link link-accent" to={`/event/${event._id}`}>
                        Overview
                      </Link>
                      <Link className="link" to={`/events/${event._id}/edit`}>
                        Edit
                      </Link>
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
