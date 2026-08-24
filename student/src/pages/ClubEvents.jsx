import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { eventApplicationsOpen, eventDeadline, eventIsOpen, formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Meta,
  MetaGrid,
  Page,
  PageHeader,
  SkeletonList,
} from "../components/ui";

export default function ClubEvents() {
  const [clubEvents, setClubEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { clubId } = useParams();

  const fetchClubEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getClubEvents`, {
        params: { clubId },
      });
      if (response.data.success) setClubEvents(response.data.events);
      else toast.error(response.data.msg);
    } catch {
      toast.error("Failed to fetch club events");
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubEvents();
  }, [fetchClubEvents]);

  return (
    <Page width="5xl">
      <Link to={`/club/${clubId}`} className="link text-sm text-ink-3">
        ← Back to club
      </Link>

      <div className="mt-6">
        <PageHeader
          eyebrow="Recruitment"
          title="Events from this club"
          description="Every opportunity this club is currently running, newest deadline first."
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : clubEvents.length === 0 ? (
          <EmptyState
            title="No active events"
            description="This club doesn't have any open recruitment events right now."
            action={
              <Button to="/events" variant="secondary">
                Browse all events
              </Button>
            }
          />
        ) : (
          <div className="stagger space-y-4">
            {clubEvents.map((event) => {
              const deadline = eventDeadline(event);
              const open = eventIsOpen(event);
              const applicationsOpen = eventApplicationsOpen(event);
              return (
                <Link
                  key={event._id}
                  to={`/event/${event._id}`}
                  className="card card-interactive group block p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="display text-xl leading-snug">{event.title}</h2>
                      {event.shortDescription && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-3">
                          {event.shortDescription}
                        </p>
                      )}
                    </div>
                    {open ? <Badge tone="ok">Open</Badge> : <Badge tone="neutral">Closed</Badge>}
                  </div>

                  <MetaGrid cols={4} className="mt-6 border-t border-line pt-5">
                    <Meta label="Application deadline" value={formatDateTime(deadline, { dateOnly: true })} />
                    <Meta
                      label="Team size"
                      value={
                        event.registrationType === "individual"
                          ? "Individual"
                          : `Up to ${event.maxTeamSize || 1}`
                      }
                    />
                    <Meta label="Rounds" value={event.numberOfRounds || "—"} />
                    <Meta label="Eligibility" value={event.eligibility || "Open to all"} />
                  </MetaGrid>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    {applicationsOpen ? "Apply now" : "View details"}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
