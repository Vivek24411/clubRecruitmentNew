import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { daysUntil, eventApplicationsOpen, eventDeadline, eventIsOpen, formatDateTime } from "../utils/date";
import { sortClubCategories } from "../utils/clubCategories";
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

function StatusBadge({ event }) {
  return eventIsOpen(event)
    ? <Badge tone="ok" live>Open</Badge>
    : <Badge tone="neutral">Closed</Badge>;
}

function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}

function listedTimestamp(item) {
  if (item.publishedAt) return new Date(item.publishedAt).getTime();
  if (item.createdAt) return new Date(item.createdAt).getTime();
  if (/^[a-f\d]{24}$/i.test(item._id || "")) return Number.parseInt(item._id.slice(0, 8), 16) * 1000;
  return 0;
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("open");
  const [category, setCategory] = useState("all");
  const [eventType, setEventType] = useState("all");
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

      if (category !== "all" && event.clubId?.category !== category) return false;
      if (eventType !== "all" && event.eventType !== eventType) return false;
      const isOpen = eventIsOpen(event, now);
      if (filter === "open") return isOpen;
      if (filter === "closed") return !isOpen;
      return true;
    });

    return matched.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "club") return (a.clubId?.name || "").localeCompare(b.clubId?.name || "");
      if (sortBy === "listed_newest") return listedTimestamp(b) - listedTimestamp(a);
      if (sortBy === "listed_oldest") return listedTimestamp(a) - listedTimestamp(b);
      return (eventDeadline(a)?.getTime() || Infinity) - (eventDeadline(b)?.getTime() || Infinity);
    });
    // `now` is intentionally read fresh on each render rather than tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, searchQuery, filter, category, eventType, sortBy]);

  const counts = useMemo(() => {
    const openList = events.filter((event) => eventIsOpen(event, now));
    const soon = openList.filter((event) => {
      const days = daysUntil(eventDeadline(event));
      return eventApplicationsOpen(event, now) && days !== null && days <= 3;
    });
    return {
      total: events.length,
      open: openList.length,
      soon: soon.length,
      closed: events.length - openList.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);
  const categories = useMemo(
    () => sortClubCategories(events.map((event) => event.clubId?.category)),
    [events],
  );

  const filtersActive = searchQuery !== "" || filter !== "open" || category !== "all" || eventType !== "all";

  return (
    <Page>
      <PageHeader
        eyebrow="Discover"
        title="Events and opportunities"
        description="Recruitment, competitions, hackathons, workshops, and other club opportunities."
      />

      {/* Summary strip */}
      {!isLoading && events.length > 0 && (
        <div className="stagger mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat index={1} label="Listed" value={counts.total} />
          <Stat index={2} label="Open events" value={counts.open} tone="accent" />
          <Stat index={3} label="Applications closing soon" value={counts.soon} />
          <Stat index={4} label="Closed" value={counts.closed} />
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

        <Field label="Status" id="filter" className="md:w-40">
          <Select id="filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="open">Open events</option>
            <option value="closed">Closed events</option>
            <option value="all">All events</option>
          </Select>
        </Field>

        <Field label="Club" id="category" className="md:w-40"><Select id="category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All clubs</option>{categories.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</Select></Field>

        <Field label="Type" id="eventType" className="md:w-44"><Select id="eventType" value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="all">All types</option><option value="recruitment">Recruitment</option><option value="competition">Competition</option><option value="hackathon">Hackathon</option><option value="workshop">Workshop</option><option value="other">Other</option></Select></Field>

        <Field label="Sort by" id="sort" className="md:w-52">
          <Select id="sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="deadline">Deadline, soonest</option>
            <option value="title">Title, A–Z</option>
            <option value="club">Club, A–Z</option>
            <option value="listed_newest">Recently listed</option>
            <option value="listed_oldest">Oldest listed</option>
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
                  setFilter("open");
                  setCategory("all");
                  setEventType("all");
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
                    setFilter("open");
                    setCategory("all");
                    setEventType("all");
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
              const applicationsOpen = eventApplicationsOpen(event, now);
              return (
                <Link
                  key={event._id}
                  to={`/event/${event._id}`}
                  className="card card-interactive group flex flex-col overflow-hidden"
                >
                  {/* Media */}
                  <div className="relative aspect-square overflow-hidden bg-paper-2">
                    {event.eventBanner ? (
                      <>
                        <img src={event.eventBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" />
                        <img
                          src={event.eventBanner}
                          alt={`${event.title} banner`}
                          loading="lazy"
                          className="relative h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                          onError={(error) => {
                            error.currentTarget.style.display = "none";
                          }}
                        />
                      </>
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Monogram name={event.clubId?.name || event.title} size="lg" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3">
                      <StatusBadge event={event} />
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
                        <dt className="text-ink-3">Applications close</dt>
                        <dd className={`text-right font-medium ${applicationsOpen ? "" : "text-ink-4"}`}>
                          {formatDateTime(deadline, { dateOnly: true })}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">Team size</dt>
                        <dd className="font-medium">
                          {event.registrationType === "individual"
                            ? "Individual"
                            : `Up to ${event.maxTeamSize || 1}`}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">{event.verticalsEnabled ? "Verticals" : "Rounds"}</dt>
                        <dd className="tabular font-medium">
                          {event.verticalsEnabled
                            ? event.verticals.length
                            : event.verticals?.[0]?.numberOfRounds || event.numberOfRounds || event.roundDetails?.length || "—"}
                        </dd>
                      </div>
                    </dl>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      {!applicationsOpen || event.application ? "View details" : "Apply now"}
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
