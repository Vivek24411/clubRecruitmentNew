import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { eventDeadline, formatDateTime, sessionDate, sessionEndDate } from "../utils/date";
import {
  Badge,
  Button,
  Card,
  CardLink,
  EmptyState,
  Meta,
  MetaGrid,
  Page,
  SectionHeader,
  SkeletonList,
  Stat,
} from "../components/ui";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/club/getDashBoard`)
      .then(({ data }) => {
        if (data.success) {
          setEvents(data.events || []);
          setSessions(data.sessions || []);
        }
      })
      .catch((error) => console.error("Error fetching dashboard data:", error))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((event) => (eventDeadline(event) || 0) >= now)
        .sort((a, b) => (eventDeadline(a) || 0) - (eventDeadline(b) || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events],
  );

  const upcomingSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => (sessionEndDate(session) || 0) > now)
        .sort(
          (a, b) =>
            (sessionDate(a.date, a.time) || 0) - (sessionDate(b.date, b.time) || 0),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions],
  );

  const nextEvent = upcomingEvents[0] || events[0];
  const nextSession = upcomingSessions[0] || sessions[0];
  const nextSessionStartsAt = nextSession && sessionDate(nextSession.date, nextSession.time);
  const nextSessionEndsAt = nextSession && sessionEndDate(nextSession);
  const nextSessionOngoing = nextSessionStartsAt && nextSessionStartsAt <= now && nextSessionEndsAt > now;
  const nextSessionEnded = nextSessionEndsAt && nextSessionEndsAt <= now;
  const publishedEvents = events.filter((event) => event.status === "published").length;

  return (
    <Page>
      {/* ------------------------------------------------------------------ */}
      {/* Masthead                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="workspace-hero">
        <div className="flex items-center gap-3">
          <span className="eyebrow eyebrow-accent">Club workspace</span>
          <hr className="rule-accent animate-draw flex-none" style={{ animationDelay: "200ms" }} />
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="display text-4xl sm:text-5xl">Recruitment at a glance</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
              What&rsquo;s live, what closes next, and who you still need to review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button to="/addEvent" variant="accent">
              New event
            </Button>
            <Button to="/addSession" variant="secondary">
              New session
            </Button>
          </div>
        </div>

        <hr className="rule animate-draw mt-8" style={{ animationDelay: "300ms" }} />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Counters                                                            */}
      {/* ------------------------------------------------------------------ */}
      {!loading && (
        <div className="stagger mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat index={1} label="Events" value={events.length} hint="All time" />
          <Stat index={2} label="Published" value={publishedEvents} tone="accent" hint="Visible to students" />
          <Stat index={3} label="Open deadlines" value={upcomingEvents.length} hint="Still accepting" />
          <Stat index={4} label="Sessions ahead" value={upcomingSessions.length} hint="Scheduled" />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Next up                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-12 grid items-stretch gap-12 lg:grid-cols-2 lg:gap-10">
        {/* Events ------------------------------------------------------- */}
        <section className="flex h-full flex-col">
          <SectionHeader
            title="Next event"
            description="The closest deadline you're running."
            action={
              <Link className="link link-accent text-sm" to="/events">
                All events
              </Link>
            }
          />
          <div className="mt-5 flex flex-1">
            {loading ? (
              <SkeletonList rows={1} />
            ) : !nextEvent ? (
              <EmptyState
                title="No events yet"
                description="Create your first recruitment event to start accepting applications."
                action={<Button to="/addEvent">Create an event</Button>}
              />
            ) : (
              <Card className="reveal flex w-full flex-col p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="display text-xl leading-snug">{nextEvent.title}</h3>
                  <Badge
                    tone={nextEvent.status === "published" ? "ok" : "neutral"}
                    className="capitalize"
                  >
                    {nextEvent.status || "draft"}
                  </Badge>
                </div>
                <div className="mt-2.5 lg:min-h-[4.5rem]">
                  {nextEvent.shortDescription && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-3">
                      {nextEvent.shortDescription}
                    </p>
                  )}
                </div>

                <MetaGrid className="mt-6 border-t border-line pt-5">
                  <Meta
                    label="Deadline"
                    value={formatDateTime(eventDeadline(nextEvent), { dateOnly: true })}
                  />
                  <Meta label="Rounds" value={nextEvent.numberOfRounds || "—"} />
                  <Meta label="Participant limit" value={nextEvent.maxParticipants ? `${nextEvent.maxParticipants} people` : "Unlimited"} />
                  <Meta label="Eligibility" value={nextEvent.eligibility || "Open to all"} />
                </MetaGrid>

                <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
                  <Button to={`/event/${nextEvent._id}`} size="sm">
                    Overview
                  </Button>
                  <Button
                    to={`/event-applications/${nextEvent._id}`}
                    size="sm"
                    variant="secondary"
                  >
                    Applications
                  </Button>
                  <Button to={`/events/${nextEvent._id}/edit`} size="sm" variant="ghost">
                    Edit
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </section>

        {/* Sessions ----------------------------------------------------- */}
        <section className="flex h-full flex-col">
          <SectionHeader
            title="Next session"
            description="Your soonest scheduled information session."
            action={
              <Link className="link link-accent text-sm" to="/sessions">
                All sessions
              </Link>
            }
          />
          <div className="mt-5 flex flex-1">
            {loading ? (
              <SkeletonList rows={1} />
            ) : !nextSession ? (
              <EmptyState
                title="No sessions yet"
                description="Schedule an information session so students can meet your club."
                action={<Button to="/addSession">Create a session</Button>}
              />
            ) : (
              <Card className="reveal flex w-full flex-col p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="display text-xl leading-snug">{nextSession.title}</h3>
                  <Badge
                    tone={nextSessionEnded ? "neutral" : "ok"}
                    live={nextSessionOngoing}
                  >
                    {nextSessionEnded ? "Past" : nextSessionOngoing ? "Live now" : "Upcoming"}
                  </Badge>
                </div>
                <div className="mt-2.5 lg:min-h-[4.5rem]">
                  {nextSession.shortDescription && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-3">
                      {nextSession.shortDescription}
                    </p>
                  )}
                </div>

                <MetaGrid className="mt-6 border-t border-line pt-5">
                  <Meta
                    label="Starts"
                    value={formatDateTime(sessionDate(nextSession.date, nextSession.time))}
                  />
                  <Meta label="Location" value={nextSession.venue || (nextSession.meetingUrl ? "Online" : "TBA")} />
                  <Meta
                    label="Duration"
                    value={nextSession.duration ? `${nextSession.duration} min` : "—"}
                  />
                  <Meta
                    label="Confirmed"
                    value={`${nextSession.confirmedRsvpCount || 0}${
                      nextSession.capacity ? ` / ${nextSession.capacity}` : ""
                    }`}
                  />
                </MetaGrid>

                <div className="mt-auto pt-6">
                  <Button to={`/session/${nextSession._id}`} size="sm">
                    Manage session
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Everything else                                                     */}
      {/* ------------------------------------------------------------------ */}
      {!loading && upcomingEvents.length > 1 && (
        <section className="ruled-top mt-16 pt-10">
          <SectionHeader
            title="Also open"
            description="Other events still accepting applications."
          />
          <div className="stagger mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(1, 7).map((event) => (
              <CardLink key={event._id} to={`/event/${event._id}`} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display text-base leading-snug">{event.title}</h3>
                  <Badge tone="neutral" className="capitalize">
                    {event.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-ink-3">
                  Closes {formatDateTime(eventDeadline(event), { dateOnly: true })}
                </p>
              </CardLink>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
