import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Meta,
  MetaGrid,
  Meter,
  Monogram,
  Page,
  Skeleton,
} from "../components/ui";

export default function Session() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [rsvp, setRsvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sessionResponse, rsvpResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getSession`, { params: { sessionId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/sessionRsvp`, {
          params: { sessionId },
        }),
      ]);
      if (!sessionResponse.data.success) throw new Error(sessionResponse.data.msg);
      setSession(sessionResponse.data.session);
      setRsvp(rsvpResponse.data.rsvp);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load this session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRsvp = async (cancel = false) => {
    setWorking(true);
    try {
      const endpoint = cancel ? "/student/sessionRsvp/cancel" : "/student/sessionRsvp";
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}${endpoint}`, {
        sessionId,
      });
      if (!data.success) throw new Error(data.msg);
      setRsvp(data.rsvp);
      toast.success(data.msg);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update RSVP");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-56 w-full lg:col-span-2" />
          <Skeleton className="h-56 w-full" />
        </div>
      </Page>
    );
  }

  if (!session) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Session not found"
          description="This session may have been removed, or the link is incorrect."
          action={
            <Button to="/sessions" variant="secondary">
              Back to sessions
            </Button>
          }
        />
      </Page>
    );
  }

  const startsAt = sessionDate(session.date, session.time);
  const isPast = startsAt <= new Date();
  const activeRsvp = ["confirmed", "waitlisted"].includes(rsvp?.status);
  const placesLeft = session.capacity
    ? Math.max(session.capacity - (session.confirmedRsvpCount || 0), 0)
    : null;

  return (
    <Page width="5xl">
      <Link to="/sessions" className="link text-sm text-ink-3">
        ← All sessions
      </Link>

      <header className="reveal mt-6">
        <div className="flex flex-wrap items-center gap-3">
          {session.clubId?.name && (
            <Link
              to={session.clubId._id ? `/club/${session.clubId._id}` : "/clubs"}
              className="flex items-center gap-2.5"
            >
              <Monogram name={session.clubId.name} size="sm" />
              <span className="text-sm font-semibold">{session.clubId.name}</span>
            </Link>
          )}
          {isPast ? <Badge tone="neutral">Past session</Badge> : <Badge tone="ok" live>Upcoming</Badge>}
        </div>

        <h1 className="display mt-4 max-w-3xl text-3xl sm:text-4xl lg:text-5xl">{session.title}</h1>
        {session.shortDescription && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">
            {session.shortDescription}
          </p>
        )}
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:gap-10">
        <section className="reveal lg:col-span-2" style={{ "--d": "100ms" }}>
          <h2 className="display text-xl">About this session</h2>
          <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
            {session.longDescription || "No additional description provided."}
          </p>

          <MetaGrid className="mt-8 border-t border-line pt-6">
            <Meta label="Starts" value={formatDateTime(startsAt)} />
            <Meta label="Venue" value={session.venue || "To be announced"} />
            <Meta
              label="Duration"
              value={session.duration ? `${session.duration} minutes` : "Not set"}
            />
            <Meta
              label="Availability"
              value={
                placesLeft === null
                  ? "Open attendance"
                  : placesLeft > 0
                    ? `${placesLeft} places left`
                    : "Waitlist only"
              }
            />
          </MetaGrid>

          {session.capacity > 0 && (
            <Meter
              className="mt-7"
              label="Seats filled"
              value={session.confirmedRsvpCount || 0}
              max={session.capacity}
              tone={placesLeft === 0 ? "warn" : "accent"}
            />
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="reveal p-6" style={{ "--d": "150ms" }}>
            <h2 className="display text-lg">Your RSVP</h2>

            {rsvp && (
              <div className="mt-3">
                <Badge
                  tone={
                    rsvp.status === "confirmed"
                      ? "ok"
                      : rsvp.status === "waitlisted"
                        ? "warn"
                        : "neutral"
                  }
                  className="capitalize"
                >
                  {rsvp.status}
                </Badge>
              </div>
            )}

            <p className="mt-3.5 text-sm leading-relaxed text-ink-3">
              {isPast
                ? "This session has already started."
                : activeRsvp
                  ? "We'll keep your place and post any updates here."
                  : "Reserve a place. If the room is full you'll join the waitlist automatically."}
            </p>

            {!isPast &&
              (activeRsvp ? (
                <Button
                  variant="secondary"
                  block
                  size="lg"
                  className="mt-6 border-bad/40 text-bad"
                  disabled={working}
                  loading={working}
                  onClick={() => updateRsvp(true)}
                >
                  Cancel RSVP
                </Button>
              ) : (
                <Button
                  block
                  size="lg"
                  className="mt-6"
                  disabled={working}
                  loading={working}
                  onClick={() => updateRsvp(false)}
                >
                  {working ? "Updating…" : "Reserve a place"}
                </Button>
              ))}

            {startsAt && !isPast && (
              <p className="mt-3 text-center text-xs text-ink-3">{formatDateTime(startsAt)}</p>
            )}
          </Card>
        </aside>
      </div>
    </Page>
  );
}
