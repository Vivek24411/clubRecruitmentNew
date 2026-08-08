import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import { daysUntil, eventDeadline, formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  CardLink,
  EmptyState,
  Monogram,
  Page,
  Reveal,
  SectionHeader,
  SkeletonList,
  useCountUp,
} from "../components/ui";

/** Days remaining, rendered as the urgency badge on every event row. */
export function DeadlinePill({ deadline }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0) return <Badge tone="neutral">Closed</Badge>;
  if (days === 0) return <Badge tone="bad" live>Closes today</Badge>;
  if (days === 1) return <Badge tone="bad">Closes tomorrow</Badge>;
  if (days <= 7) return <Badge tone="warn">{days}d left</Badge>;
  return <Badge tone="neutral">{days}d left</Badge>;
}

function HeroCount({ value, label }) {
  const shown = useCountUp(value);
  return (
    <div className="border-l border-line pl-4">
      <p className="display tabular text-3xl" data-numeric="">
        {String(shown).padStart(2, "0")}
      </p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}

export default function Home() {
  const { profile } = useContext(StudentContextData);
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/student/getDashBoard`)
      .then(({ data }) => {
        if (data.success) {
          setEvents(data.events || []);
          setSessions(data.sessions || []);
          setSettings(data.settings);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (eventDeadline(a)?.getTime() || Infinity) - (eventDeadline(b)?.getTime() || Infinity),
      ),
    [events],
  );

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => sessionDate(session.date, session.time) > new Date())
        .sort((a, b) => sessionDate(a.date, a.time) - sessionDate(b.date, b.time)),
    [sessions],
  );

  const openEvents = useMemo(
    () => sortedEvents.filter((event) => (eventDeadline(event) || 0) > new Date()),
    [sortedEvents],
  );

  const featuredClubs = useMemo(
    () => [
      ...new Map(
        sortedEvents
          .filter((event) => event.clubId?.name)
          .map((event) => [event.clubId._id || event.clubId.name, event.clubId]),
      ).values(),
    ],
    [sortedEvents],
  );

  const now = new Date();
  const cycleOpen =
    settings?.recruitmentCycle?.status !== "closed" &&
    settings?.recruitmentCycle?.status !== "draft" &&
    (!settings?.recruitmentCycle?.startAt || new Date(settings.recruitmentCycle.startAt) <= now) &&
    (!settings?.recruitmentCycle?.endAt || new Date(settings.recruitmentCycle.endAt) >= now);
  const registrationsOpen = settings?.registrationEnabled !== false && cycleOpen;
  const cycleName = settings?.recruitmentCycle?.name || "Recruitment";
  const firstName = profile?.name?.split(" ")[0];

  return (
    <Page>
      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                               */}
      {/* ----------------------------------------------------------------- */}
      <section className="reveal">
        <div className="flex items-center gap-3">
          <span className="eyebrow eyebrow-accent inline-flex items-center gap-2">
            {registrationsOpen && <span className="dot-live" aria-hidden="true" />}
            {cycleName} · {registrationsOpen ? "open" : "paused"}
          </span>
          <hr className="rule-accent animate-draw flex-none" style={{ animationDelay: "200ms" }} />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="display max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
              Find your place in IITR&rsquo;s student community.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2">
              {firstName ? `Welcome back, ${firstName}. ` : ""}
              Discover clubs, apply with a team, track every selection round, and reserve seats at
              information sessions.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button to="/events" variant="primary" size="lg">
                Explore open events
              </Button>
              <Button to="/applications" variant="secondary" size="lg">
                Track applications
              </Button>
            </div>
          </div>

          {/* At-a-glance counters, ruled like a masthead. */}
          {!loading && (
            <div className="flex gap-8 lg:flex-col lg:gap-6">
              <HeroCount value={openEvents.length} label="Open events" />
              <HeroCount value={upcomingSessions.length} label="Upcoming sessions" />
            </div>
          )}
        </div>

        <hr className="rule animate-draw mt-10" style={{ animationDelay: "300ms" }} />
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Notices                                                            */}
      {/* ----------------------------------------------------------------- */}
      {settings?.maintenanceMessage && (
        <Reveal className="mt-8 rounded-sm border-l-2 border-warn bg-warn-tint/60 px-5 py-4">
          <p className="eyebrow text-warn">{cycleName}</p>
          <p className="mt-1.5 text-sm text-ink-2">{settings.maintenanceMessage}</p>
        </Reveal>
      )}
      {settings && !registrationsOpen && (
        <Reveal className="mt-4 rounded-sm border-l-2 border-bad bg-bad-tint/60 px-5 py-4">
          <p className="text-sm font-medium text-bad">
            New applications are paused outside the active recruitment cycle.
          </p>
        </Reveal>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Deadlines and sessions                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section>
          <SectionHeader
            title="Deadlines coming up"
            description="Events with the nearest application deadlines."
            action={
              <Link className="link link-accent text-sm" to="/events">
                View all
              </Link>
            }
          />
          <div className="mt-5">
            {loading ? (
              <SkeletonList rows={3} />
            ) : sortedEvents.length === 0 ? (
              <EmptyState
                title="No open events"
                description="Nothing is accepting applications right now. Check back when the next cycle opens."
              />
            ) : (
              <div className="stagger space-y-3">
                {sortedEvents.slice(0, 4).map((event) => (
                  <CardLink key={event._id} to={`/event/${event._id}`} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="eyebrow eyebrow-accent">{event.clubId?.name}</p>
                        <h3 className="display mt-1.5 text-lg leading-snug">{event.title}</h3>
                      </div>
                      <DeadlinePill deadline={eventDeadline(event)} />
                    </div>
                    <p className="mt-3 text-sm text-ink-3">
                      Closes {formatDateTime(eventDeadline(event))}
                    </p>
                  </CardLink>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Upcoming sessions"
            description="Meet clubs and learn how their selection works."
            action={
              <Link className="link link-accent text-sm" to="/sessions">
                View all
              </Link>
            }
          />
          <div className="mt-5">
            {loading ? (
              <SkeletonList rows={3} />
            ) : upcomingSessions.length === 0 ? (
              <EmptyState
                title="No sessions scheduled"
                description="Clubs haven't posted any information sessions yet."
              />
            ) : (
              <div className="stagger space-y-3">
                {upcomingSessions.slice(0, 4).map((session) => {
                  const startsAt = sessionDate(session.date, session.time);
                  return (
                    <CardLink
                      key={session._id}
                      to={`/session/${session._id}`}
                      className="flex gap-4 p-5"
                    >
                      {/* Date block — the calendar-tear detail. */}
                      <div className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-sm border border-line bg-paper-2">
                        <span className="display tabular text-base leading-none">
                          {startsAt?.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                        <span className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-ink-3">
                          {startsAt?.toLocaleDateString("en-IN", {
                            month: "short",
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow eyebrow-accent">{session.clubId?.name}</p>
                        <h3 className="display mt-1 text-base leading-snug">{session.title}</h3>
                        <p className="mt-1.5 text-sm text-ink-3">
                          {formatDateTime(startsAt)}
                          {session.venue ? ` · ${session.venue}` : ""}
                        </p>
                      </div>
                    </CardLink>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Clubs recruiting now                                               */}
      {/* ----------------------------------------------------------------- */}
      {!loading && featuredClubs.length > 0 && (
        <Reveal className="ruled-top mt-16 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="display text-2xl">Clubs recruiting now</h2>
              <p className="mt-2 max-w-md text-sm text-ink-3">
                Every society, team, and group with an open event this cycle.
              </p>
            </div>
            <Button to="/clubs" variant="secondary">
              All clubs
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {featuredClubs.slice(0, 8).map((club) => (
              <Link
                key={club._id || club.name}
                to={club._id ? `/club/${club._id}` : "/clubs"}
                className="card card-interactive flex items-center gap-3 px-4 py-3"
              >
                <Monogram name={club.name} size="sm" />
                <span className="text-sm font-medium">{club.name}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </Page>
  );
}
