import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { sessionDate, sessionEndDate } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonList,
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

/** Groups sessions under a date heading, newspaper-listing style. */
function groupByDay(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const startsAt = sessionDate(session.date, session.time);
    const key = startsAt
      ? startsAt.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Asia/Kolkata",
        })
      : "Date to be announced";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ session, startsAt });
  }
  return [...groups.entries()];
}

function listedTimestamp(item) {
  if (item.createdAt) return new Date(item.createdAt).getTime();
  if (/^[a-f\d]{24}$/i.test(item._id || "")) return Number.parseInt(item._id.slice(0, 8), 16) * 1000;
  return new Date(item.updatedAt || 0).getTime();
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [sortBy, setSortBy] = useState("session_date");

  useEffect(() => {
    async function fetchSessions() {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getSessions`);
        if (response.data.success) setSessions(response.data.sessions);
        else toast.error(response.data.msg);
      } catch {
        toast.error("Failed to load sessions");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const grouped = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const now = new Date();
    const filtered = sessions
      .filter((session) => {
        const endsAt = sessionEndDate(session);
        if (!showPast && endsAt && endsAt <= now) return false;
        if (!query) return true;
        return (
          session.title?.toLowerCase().includes(query) ||
          session.shortDescription?.toLowerCase().includes(query) ||
          session.clubId?.name?.toLowerCase().includes(query) ||
          session.venue?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === "listed_newest") return listedTimestamp(b) - listedTimestamp(a);
        if (sortBy === "listed_oldest") return listedTimestamp(a) - listedTimestamp(b);
        return (sessionDate(a.date, a.time)?.getTime() || 0) - (sessionDate(b.date, b.time)?.getTime() || 0);
      });
    return groupByDay(filtered);
  }, [sessions, searchTerm, showPast, sortBy]);

  const total = grouped.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Information sessions"
        title="Sessions calendar"
        description="Talks, walkthroughs, and open houses where clubs explain what they do and how they select."
      />

      <div className="mt-8 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="search">
            Search sessions
          </label>
          <SearchIcon />
          <Input
            id="search"
            type="search"
            className="pl-9"
            placeholder="Search by session, club, or venue…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <Field label="Order" id="session-order" className="sm:w-48">
          <Select id="session-order" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="session_date">Session date</option>
            <option value="listed_newest">Recently listed</option>
            <option value="listed_oldest">Oldest listed</option>
          </Select>
        </Field>
        <Button
          variant={showPast ? "primary" : "secondary"}
          onClick={() => setShowPast((value) => !value)}
        >
          {showPast ? "Showing all" : "Include past"}
        </Button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <SkeletonList rows={4} />
        ) : total === 0 ? (
          <EmptyState
            title={searchTerm ? "No matching sessions" : "No upcoming sessions"}
            description={
              searchTerm
                ? "Try a different search term, or include past sessions."
                : "Clubs haven't scheduled any sessions yet. Check back soon."
            }
            action={
              !showPast && (
                <Button variant="secondary" onClick={() => setShowPast(true)}>
                  Include past sessions
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-10">
            {grouped.map(([day, items]) => (
              <section key={day}>
                {/* Day heading with a rule running to the edge. */}
                <div className="flex items-center gap-4">
                  <h2 className="eyebrow whitespace-nowrap">{day}</h2>
                  <hr className="rule flex-1" />
                  <span className="tabular text-xs text-ink-4">{items.length}</span>
                </div>

                <div className="stagger mt-4 space-y-3">
                  {items.map(({ session, startsAt }) => {
                    const now = new Date();
                    const endsAt = sessionEndDate(session);
                    const isPast = endsAt && endsAt <= now;
                    const isOngoing = startsAt && startsAt <= now && !isPast;
                    return (
                      <Link
                        key={session._id}
                        to={`/session/${session._id}`}
                        className="card card-interactive group grid min-w-0 overflow-hidden p-0 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-stretch"
                      >
                        <div className="relative aspect-video min-w-0 overflow-hidden bg-paper-2 sm:aspect-auto sm:min-h-32">
                          {session.sessionThumbnail ? <img src={session.sessionThumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full min-h-32 place-items-center text-center"><div><p className="display text-2xl">{startsAt?.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }) || "—"}</p><p className="eyebrow mt-1">{startsAt?.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }) || "Date TBA"}</p></div></div>}
                        </div>

                        <div className="min-w-0 p-5 sm:py-5">
                          <p className="eyebrow eyebrow-accent">{session.clubId?.name}</p>
                          <h3 className="display mt-1 text-lg leading-snug">{session.title}</h3>
                          <p className="mt-2 text-sm font-medium text-ink-2">{startsAt ? startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "Time TBA"}{session.duration ? ` · ${session.duration} min` : ""}</p>
                          {session.shortDescription && (
                            <p className="mt-1.5 line-clamp-1 text-sm text-ink-3">
                              {session.shortDescription}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-none items-center gap-3 px-5 pb-5 sm:flex-col sm:items-end sm:justify-center sm:p-5">
                          {isPast ? (
                            <Badge tone="neutral">Past</Badge>
                          ) : isOngoing ? (
                            <Badge tone="ok" live>Live now</Badge>
                          ) : (
                            <Badge tone="ok">Upcoming</Badge>
                          )}
                          {session.venue && (
                            <span className="truncate text-xs text-ink-3">{session.venue}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
