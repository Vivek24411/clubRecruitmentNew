import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { daysUntil, eventDeadline, formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Monogram,
  Page,
  PageHeader,
  Select,
  Skeleton,
  Stat,
} from "../components/ui";

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StatusBadge({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return <Badge tone="neutral">No deadline</Badge>;
  if (days < 0) return <Badge tone="neutral">Closed</Badge>;
  if (days === 0) return <Badge tone="bad" live>Closes today</Badge>;
  if (days === 1) return <Badge tone="bad">Closes tomorrow</Badge>;
  if (days <= 7) return <Badge tone="warn">{days}d left</Badge>;
  return <Badge tone="ok">Open</Badge>;
}

function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEvents`);
        if (response.data.success) setEvents(response.data.events);
        else toast.error(response.data.msg);
      } catch {
        toast.error("Failed to fetch events");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const now = new Date();

  const visibleEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = events.filter((event) => {
      const searchMatch =
        !query ||
        event.title?.toLowerCase().includes(query) ||
        event.shortDescription?.toLowerCase().includes(query) ||
        event.eligibility?.toLowerCase().includes(query) ||
        event.clubId?.name?.toLowerCase().includes(query);
      if (!searchMatch) return false;

      const isOpen = (eventDeadline(event) || 0) > now;
      if (filter === "active") return isOpen;
      if (filter === "closed") return !isOpen;
      return true;
    });

    return matched.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "club") return (a.clubId?.name || "").localeCompare(b.clubId?.name || "");
      return (eventDeadline(a)?.getTime() || Infinity) - (eventDeadline(b)?.getTime() || Infinity);
    });
    // `now` is intentionally read fresh on each render rather than tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, searchQuery, filter, sortBy]);

  const counts = useMemo(() => {
    const openList = events.filter((event) => (eventDeadline(event) || 0) > now);
    const soon = openList.filter((event) => daysUntil(eventDeadline(event)) <= 3);
    return {
      total: events.length,
      open: openList.length,
      soon: soon.length,
      closed: events.length - openList.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const filtersActive = searchQuery !== "" || filter !== "all";

  return (
    <Page>
      <PageHeader
        eyebrow="Recruitment"
        title="Open events"
        description="Every club currently recruiting, ordered by how soon applications close."
      />

      {/* Summary strip */}
      {!isLoading && events.length > 0 && (
        <div className="stagger mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Listed" value={counts.total} />
          <Stat label="Accepting applications" value={counts.open} tone="accent" />
          <Stat label="Closing within 3 days" value={counts.soon} />
          <Stat label="Closed" value={counts.closed} />
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-4 border-y border-line py-4 md:flex-row md:items-end">
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="search">
            Search events
          </label>
          <SearchIcon />
          <Input
            id="search"
            type="search"
            className="pl-9"
            placeholder="Search by event, club, or eligibility…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <Field label="Status" id="filter" className="md:w-48">
          <Select id="filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All events</option>
            <option value="active">Open only</option>
            <option value="closed">Closed only</option>
          </Select>
        </Field>

        <Field label="Sort by" id="sort" className="md:w-52">
          <Select id="sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="deadline">Deadline, soonest</option>
            <option value="title">Title, A–Z</option>
            <option value="club">Club, A–Z</option>
          </Select>
        </Field>
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="mt-4 text-sm text-ink-3" role="status">
          <span className="tabular font-semibold text-ink">{visibleEvents.length}</span>{" "}
          {visibleEvents.length === 1 ? "event" : "events"}
          {filtersActive && (
            <>
              {" "}·{" "}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="link link-accent"
              >
                Clear filters
              </button>
            </>
          )}
        </p>
      )}

      {/* Grid */}
      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            title={filtersActive ? "No matching events" : "No events yet"}
            description={
              filtersActive
                ? "Try a different search term, or widen the status filter."
                : "There are no recruitment events right now. Check back when the next cycle opens."
            }
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button to="/clubs" variant="secondary">
                  Browse clubs
                </Button>
              )
            }
          />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => {
              const deadline = eventDeadline(event);
              const closed = !deadline || deadline < now;
              return (
                <Link
                  key={event._id}
                  to={`/event/${event._id}`}
                  className="card card-interactive group flex flex-col overflow-hidden"
                >
                  {/* Media */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-paper-2">
                    {event.eventBanner ? (
                      <img
                        src={event.eventBanner}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                        onError={(error) => {
                          error.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Monogram name={event.clubId?.name || event.title} size="lg" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3">
                      <StatusBadge deadline={deadline} />
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="eyebrow eyebrow-accent">{event.clubId?.name || "Club"}</p>
                    <h2 className="display mt-1.5 text-lg leading-snug">{event.title}</h2>
                    {event.shortDescription && (
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-3">
                        {event.shortDescription}
                      </p>
                    )}

                    <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">Closes</dt>
                        <dd className={`text-right font-medium ${closed ? "text-ink-4" : ""}`}>
                          {formatDateTime(deadline, { dateOnly: true })}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">Team size</dt>
                        <dd className="font-medium">
                          {event.registrationType === "individual"
                            ? "Individual"
                            : `Up to ${event.maxTeamSize || event.maxParticipants || 1}`}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">Rounds</dt>
                        <dd className="tabular font-medium">
                          {event.numberOfRounds || event.roundDetails?.length || "—"}
                        </dd>
                      </div>
                    </dl>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      {closed ? "View details" : "Apply now"}
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
