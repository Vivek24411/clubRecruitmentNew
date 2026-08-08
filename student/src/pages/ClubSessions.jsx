import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";
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

export default function ClubSessions() {
  const [clubSessions, setClubSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { clubId } = useParams();

  const fetchClubSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getClubSessions`, {
        params: { clubId },
      });
      if (response.data.success) setClubSessions(response.data.sessions);
      else toast.error(response.data.msg);
    } catch {
      toast.error("Failed to fetch club sessions");
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubSessions();
  }, [fetchClubSessions]);

  return (
    <Page width="5xl">
      <Link to={`/club/${clubId}`} className="link text-sm text-ink-3">
        ← Back to club
      </Link>

      <div className="mt-6">
        <PageHeader
          eyebrow="Information sessions"
          title="Sessions from this club"
          description="Talks and open houses where this club explains what they do and how they select."
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : clubSessions.length === 0 ? (
          <EmptyState
            title="No sessions scheduled"
            description="This club hasn't posted any information sessions right now."
            action={
              <Button to="/sessions" variant="secondary">
                Browse all sessions
              </Button>
            }
          />
        ) : (
          <div className="stagger space-y-4">
            {clubSessions.map((session) => {
              const startsAt = sessionDate(session.date, session.time);
              const isPast = startsAt && startsAt <= new Date();
              return (
                <Link
                  key={session._id}
                  to={`/session/${session._id}`}
                  className="card card-interactive group flex gap-5 p-6"
                >
                  {/* Date block */}
                  <div className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-sm border border-line bg-paper-2">
                    <span className="display tabular text-lg leading-none">
                      {startsAt?.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        timeZone: "Asia/Kolkata",
                      }) || "—"}
                    </span>
                    <span className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-ink-3">
                      {startsAt?.toLocaleDateString("en-IN", {
                        month: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="display text-lg leading-snug">{session.title}</h2>
                      {isPast ? (
                        <Badge tone="neutral">Past</Badge>
                      ) : (
                        <Badge tone="ok">Upcoming</Badge>
                      )}
                    </div>
                    {session.shortDescription && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-3">
                        {session.shortDescription}
                      </p>
                    )}

                    <MetaGrid cols={3} className="mt-5 border-t border-line pt-4">
                      <Meta label="Starts" value={formatDateTime(startsAt)} />
                      <Meta label="Venue" value={session.venue || "TBA"} />
                      <Meta
                        label="Duration"
                        value={session.duration ? `${session.duration} min` : "—"}
                      />
                    </MetaGrid>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      View session
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
