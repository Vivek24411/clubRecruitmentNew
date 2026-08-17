import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate, sessionEndDate } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Meta,
  MetaGrid,
  Page,
  Skeleton,
} from "../components/ui";

export default function Session() {
  const { sessionId } = useParams();
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionDetails = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/admin/getSessionDetail`,
        { params: { sessionId } },
      );
      if (response.data.success) setSessionDetails(response.data.session);
      else toast.error(response.data.msg);
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast.error("Failed to load session details");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  if (loading) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-10 h-56 w-full" />
      </Page>
    );
  }

  if (!sessionDetails) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Session not found"
          description="This session may have been removed, or the link is incorrect."
          action={<Button to="/sessions" variant="secondary">Back to sessions</Button>}
        />
      </Page>
    );
  }

  const startsAt = sessionDate(sessionDetails.date, sessionDetails.time);
  const endsAt = sessionEndDate(sessionDetails);
  const now = new Date();
  const isPast = endsAt && endsAt <= now;
  const isOngoing = startsAt && startsAt <= now && !isPast;

  return (
    <Page width="5xl">
      <Link to="/sessions" className="link text-sm text-ink-3">
        ← All sessions
      </Link>

      <header className="reveal mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow eyebrow-accent">
              {sessionDetails.clubId?.name || "Unknown club"}
            </span>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{sessionDetails.title}</h1>
            {sessionDetails.shortDescription && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
                {sessionDetails.shortDescription}
              </p>
            )}
          </div>
          {isPast
            ? <Badge tone="neutral">Past</Badge>
            : isOngoing
              ? <Badge tone="ok" live>Live now</Badge>
              : <Badge tone="ok">Upcoming</Badge>}
        </div>
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <section className="reveal lg:col-span-2" style={{ "--d": "100ms" }}>
          <h2 className="display text-xl">Description</h2>
          <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
            {sessionDetails.longDescription || "No additional description provided."}
          </p>
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card reveal p-6" style={{ "--d": "150ms" }}>
            <h2 className="eyebrow">Session details</h2>
            <MetaGrid cols={2} className="mt-5">
              <Meta label="Starts" value={formatDateTime(startsAt)} />
              <Meta
                label="Duration"
                value={sessionDetails.duration ? `${sessionDetails.duration} min` : "—"}
              />
              <Meta label="Venue" value={sessionDetails.venue || "TBA"} />
              <Meta
                label="Capacity"
                value={sessionDetails.capacity || "Open attendance"}
              />
            </MetaGrid>
          </div>
        </aside>
      </div>
    </Page>
  );
}
