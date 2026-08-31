import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import {
  daysUntil,
  eventApplicationsOpen,
  eventDeadline,
  eventIsOngoing,
  formatDateTime,
  sessionDate,
  sessionEndDate,
} from "../utils/date";
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
export function DeadlinePill({ event }) {
  const deadline = eventDeadline(event);
  const days = daysUntil(deadline);
  if (!eventApplicationsOpen(event)) return <Badge tone="ok">Selection ongoing</Badge>;
  if (days === null) return <Badge tone="ok">Registration open</Badge>;
  if (days === 0) return <Badge tone="bad" live>Closes today</Badge>;
  if (days === 1) return <Badge tone="bad">Closes tomorrow</Badge>;
  if (days <= 7) return <Badge tone="warn">{days}d left</Badge>;
  return <Badge tone="neutral">{days}d left</Badge>;
}

function HeroCount({ value, label }) {
  const shown = useCountUp(value);
  return (
    <div className="hero-count">
      <p className="display tabular text-3xl" data-numeric="">
        {String(shown).padStart(2, "0")}
      </p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}

export default function Home() {
  const { loggedInStudent, profile } = useContext(StudentContextData);
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
        .filter((session) => sessionEndDate(session) > new Date())
        .sort((a, b) => sessionDate(a.date, a.time) - sessionDate(b.date, b.time)),
    [sessions],
  );

  const ongoingEvents = useMemo(
    () => sortedEvents.filter((event) => eventIsOngoing(event)),
    [sortedEvents],
  );

  const featuredClubs = useMemo(
    () => [
      ...new Map(
        ongoingEvents
          .filter((event) => event.eventType === "recruitment")
          .filter((event) => event.clubId?.name)
          .map((event) => [event.clubId._id || event.clubId.name, event.clubId]),
      ).values(),
    ],
    [ongoingEvents],
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
      <section className="home-hero">
        <div className="relative z-[1] grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="hero-kicker">
              {registrationsOpen ? `${cycleName} · applications open` : "IITR student network"}
            </p>
            <h1 className="display mt-6 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
              Find your place in IITR&rsquo;s student community.
            </h1>
            <p className="hero-copy mt-5 max-w-xl text-base leading-relaxed">
              {firstName && <strong className="font-bold">Welcome back, {firstName}. </strong>}
              Discover clubs, apply with a team, track every selection round, and reserve seats at information sessions.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button to="/events" variant="primary" size="lg">
                Explore ongoing events
              </Button>
              <Button to={loggedInStudent ? "/applications" : "/register"} variant="secondary" size="lg">
                {loggedInStudent ? "Track applications" : "Create account to apply"}
              </Button>
            </div>
          </div>

          {/* At-a-glance counters, ruled like a masthead. */}
          {!loading && (
            <div className="flex gap-8 lg:flex-col lg:gap-6">
              <HeroCount value={ongoingEvents.length} label="Ongoing events" />
              <HeroCount value={upcomingSessions.length} label="Upcoming sessions" />
            </div>
          )}
        </div>

        <hr className="hero-rule rule animate-draw relative z-[1] mt-10" style={{ animationDelay: "300ms" }} />
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
            title="Ongoing events"
            description="Applications and selection processes currently running."
            action={
              <Link className="link link-accent text-sm" to="/events">
                View all
              </Link>
            }
          />
          <div className="mt-5">
            {loading ? (
              <SkeletonList rows={3} />
            ) : ongoingEvents.length === 0 ? (
              <EmptyState
                title="No ongoing events"
                description="No event or selection process is currently running."
              />
            ) : (
              <div className="stagger space-y-3">
                {ongoingEvents.slice(0, 4).map((event) => (
                  <CardLink key={event._id} to={`/event/${event._id}`} className="group overflow-hidden p-0">
                    <div className="grid min-w-0 sm:grid-cols-[13rem_minmax(0,1fr)]">
                      <div className="relative aspect-square min-w-0 overflow-hidden bg-paper-2">
                        {event.eventBanner || event.clubId?.clubBanner ? <><img src={event.eventBanner || event.clubId.clubBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" /><img src={event.eventBanner || event.clubId.clubBanner} alt={`${event.title} banner`} className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" /></> : <div className="grid h-full min-h-32 place-items-center"><Monogram name={event.clubId?.name || event.title} size="sm" /></div>}
                      </div>
                      <div className="min-w-0 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                        <p className="eyebrow eyebrow-accent">{event.clubId?.name}</p>
                        <h3 className="display mt-1.5 text-lg leading-snug">{event.title}</h3>
                          </div>
                          <DeadlinePill event={event} />
                        </div>
                        <p className="mt-3 text-sm text-ink-3">Applications close {formatDateTime(eventDeadline(event))}</p>
                        <p className="mt-2 text-xs font-semibold text-accent">{event.hasApplied || !eventApplicationsOpen(event) ? "View details" : "Apply now"} →</p>
                      </div>
                    </div>
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
                  const endsAt = sessionEndDate(session);
                  const isOngoing = startsAt && startsAt <= new Date() && endsAt > new Date();
                  return (
                    <CardLink
                      key={session._id}
                      to={`/session/${session._id}`}
                      className="group grid min-w-0 overflow-hidden p-0 sm:grid-cols-[13rem_minmax(0,1fr)]"
                    >
                      <div className="relative aspect-square min-w-0 overflow-hidden bg-paper-2">
                        {session.sessionThumbnail ? <><img src={session.sessionThumbnail} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl" /><img src={session.sessionThumbnail} alt={`${session.title} thumbnail`} className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" /></> : null}
                        <div className={`${session.sessionThumbnail ? "absolute bottom-2 left-2 bg-surface/90 shadow-sm" : "grid h-full place-items-center"} rounded-sm border border-line px-2.5 py-2 text-center backdrop-blur`}>
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
                      </div>
                      <div className="min-w-0 p-4">
                        <p className="eyebrow eyebrow-accent">{session.clubId?.name}</p>
                        <h3 className="display mt-1 text-base leading-snug">{session.title}</h3>
                        <Badge className="mt-2" tone="ok" live={isOngoing}>{isOngoing ? "Live now" : "Open"}</Badge>
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
          <div className="stagger mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredClubs.slice(0, 8).map((club) => (
              <Link
                key={club._id || club.name}
                to={club._id ? `/club/${club._id}` : "/clubs"}
                className="card card-interactive group overflow-hidden text-center"
              >
                <span className="relative block aspect-[16/7] overflow-hidden bg-gradient-to-br from-ink via-ink-2 to-accent">
                  {club.clubBanner && <img src={club.clubBanner} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2">{club.clubLogo ? <img src={club.clubLogo} alt="" className="h-16 w-16 rounded-lg border border-white/80 bg-white object-contain p-1.5 shadow-md" /> : <Monogram name={club.name} size="lg" />}</span>
                </span>
                <span className="display block px-4 py-4 text-base">{club.name}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </Page>
  );
}
