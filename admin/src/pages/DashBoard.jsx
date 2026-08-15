import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { eventDeadline, formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Meta,
  MetaGrid,
  Page,
  SectionHeader,
  SkeletonList,
  Stat,
} from "../components/ui";

export default function DashBoard() {
  const [counts, setCounts] = useState({ clubs: 0, students: 0, events: 0, sessions: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashBoardData() {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getDashBoard`);
        if (response.data.success) {
          const { dashboard } = response.data;
          setCounts({
            clubs: dashboard.clubsCount,
            students: dashboard.studentsCount,
            events: dashboard.eventsCount,
            sessions: dashboard.sessionsCount,
          });

          const allEvents = dashboard.events || [];
          const allSessions = dashboard.sessions || [];

          if (allEvents.length > 0) {
            const upcoming = allEvents
              .filter((event) => (eventDeadline(event) || 0) >= new Date())
              .sort((a, b) => (eventDeadline(a) || 0) - (eventDeadline(b) || 0));
            setNextEvent(upcoming.length > 0 ? upcoming[0] : allEvents[0]);
          }

          if (allSessions.length > 0) {
            const upcoming = allSessions
              .filter((session) => (sessionDate(session.date, session.time) || 0) >= new Date())
              .sort(
                (a, b) =>
                  (sessionDate(a.date, a.time) || 0) - (sessionDate(b.date, b.time) || 0),
              );
            setNextSession(upcoming.length > 0 ? upcoming[0] : allSessions[0]);
          }
        } else {
          toast.error(response.data.msg);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashBoardData();
  }, []);

  const eventOpen = nextEvent && (eventDeadline(nextEvent) || 0) >= new Date();
  const sessionUpcoming =
    nextSession && (sessionDate(nextSession.date, nextSession.time) || 0) >= new Date();

  return (
    <Page>
      {/* ------------------------------------------------------------------ */}
      {/* Masthead                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="workspace-hero">
        <div className="flex items-center gap-3">
          <span className="eyebrow eyebrow-accent">Administration</span>
          <hr className="rule-accent animate-draw flex-none" style={{ animationDelay: "200ms" }} />
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="display text-4xl sm:text-5xl">Platform overview</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
              Accounts, listings, and the state of the current recruitment cycle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button to="/addClub" variant="accent">
              Add club
            </Button>
            <Button to="/settings" variant="secondary">
              Recruitment cycle
            </Button>
          </div>
        </div>

        <hr className="rule animate-draw mt-8" style={{ animationDelay: "300ms" }} />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Counters                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="stagger mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat index={1} label="Clubs" value={counts.clubs} tone="accent" hint="Provisioned accounts" />
        <Stat index={2} label="Students" value={counts.students} hint="Registered" />
        <Stat index={3} label="Events" value={counts.events} hint="All listings" />
        <Stat index={4} label="Sessions" value={counts.sessions} hint="All listings" />
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to="/clubs" className="link link-accent font-semibold">
          Manage clubs →
        </Link>
        <Link to="/students" className="link link-accent font-semibold">
          Manage students →
        </Link>
        <Link to="/audit-logs" className="link link-accent font-semibold">
          Audit log →
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Next up                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section>
          <SectionHeader
            title="Next event deadline"
            description="The soonest event closing across all clubs."
            action={
              <Link className="link link-accent text-sm" to="/events">
                Moderate events
              </Link>
            }
          />
          <div className="mt-5">
            {isLoading ? (
              <SkeletonList rows={1} />
            ) : !nextEvent ? (
              <EmptyState
                title="No events listed"
                description="Clubs haven't created any recruitment events yet."
              />
            ) : (
              <Card className="reveal p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow eyebrow-accent">
                      {nextEvent.clubId?.name || "Unknown club"}
                    </p>
                    <h3 className="display mt-1.5 text-xl leading-snug">{nextEvent.title}</h3>
                  </div>
                  {eventOpen ? (
                    <Badge tone="ok" live>
                      Open
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Closed</Badge>
                  )}
                </div>

                {nextEvent.shortDescription && (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
                    {nextEvent.shortDescription}
                  </p>
                )}

                <MetaGrid className="mt-6 border-t border-line pt-5">
                  <Meta
                    label="Deadline"
                    value={formatDateTime(eventDeadline(nextEvent), { dateOnly: true })}
                  />
                  <Meta label="Max participants" value={nextEvent.maxParticipants} />
                  <Meta label="Rounds" value={nextEvent.numberOfRounds} />
                  <Meta label="Eligibility" value={nextEvent.eligibility || "Open to all"} />
                </MetaGrid>

                <Button to={`/event/${nextEvent._id}`} size="sm" className="mt-6">
                  Review details
                </Button>
              </Card>
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Next session"
            description="The soonest information session on the calendar."
            action={
              <Link className="link link-accent text-sm" to="/sessions">
                Moderate sessions
              </Link>
            }
          />
          <div className="mt-5">
            {isLoading ? (
              <SkeletonList rows={1} />
            ) : !nextSession ? (
              <EmptyState
                title="No sessions listed"
                description="Clubs haven't scheduled any information sessions yet."
              />
            ) : (
              <Card className="reveal p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow eyebrow-accent">
                      {nextSession.clubId?.name || "Unknown club"}
                    </p>
                    <h3 className="display mt-1.5 text-xl leading-snug">{nextSession.title}</h3>
                  </div>
                  {sessionUpcoming ? (
                    <Badge tone="ok">Upcoming</Badge>
                  ) : (
                    <Badge tone="neutral">Past</Badge>
                  )}
                </div>

                {nextSession.shortDescription && (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
                    {nextSession.shortDescription}
                  </p>
                )}

                <MetaGrid className="mt-6 border-t border-line pt-5">
                  <Meta
                    label="Starts"
                    value={formatDateTime(sessionDate(nextSession.date, nextSession.time))}
                  />
                  <Meta label="Venue" value={nextSession.venue || "TBA"} />
                  <Meta
                    label="Duration"
                    value={nextSession.duration ? `${nextSession.duration} min` : "—"}
                  />
                  <Meta
                    label="Expires"
                    value={
                      nextSession.expiresAt ? formatDateTime(nextSession.expiresAt) : "—"
                    }
                  />
                </MetaGrid>

                <Button to={`/session/${nextSession._id}`} size="sm" className="mt-6">
                  Review details
                </Button>
              </Card>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
