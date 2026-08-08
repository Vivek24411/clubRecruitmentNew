import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Meta,
  MetaGrid,
  Monogram,
  Page,
  PageHeader,
  SkeletonList,
} from "../components/ui";

const STATUS_TONE = {
  selected: "ok",
  rejected: "bad",
  waitlisted: "warn",
  in_progress: "info",
  submitted: "neutral",
  withdrawn: "neutral",
};

/**
 * Segmented round tracker. Each completed round fills in with a short,
 * staggered delay so the progress reads left to right on load.
 */
function RoundProgress({ current, total }) {
  if (!total || total < 1) return null;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Progress</span>
        <span className="tabular text-xs font-semibold text-ink-2">
          Round {Math.min(current || 0, total)} of {total}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: total }).map((_, index) => {
          const reached = index < (current || 0);
          return (
            <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
              <span
                className="block h-full rounded-full bg-accent transition-transform duration-700 ease-out"
                style={{
                  transform: `scaleX(${reached ? 1 : 0})`,
                  transformOrigin: "left",
                  transitionDelay: `${index * 90}ms`,
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/student/myApplications`)
      .then(({ data }) =>
        data.success
          ? setApplications(data.applications.filter((item) => item.registrationId))
          : toast.error(data.msg),
      )
      .catch((error) => toast.error(error.response?.data?.msg || "Could not load applications"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Your record"
        title="Applications"
        description="Every application you've submitted — team, rounds, interview dates, and the final decision."
      />

      <div className="mt-8">
        {loading ? (
          <SkeletonList rows={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Once you apply to a recruitment event, its full progress will be tracked here."
            action={<Button to="/events">Browse open events</Button>}
          />
        ) : (
          <div className="stagger space-y-4">
            {applications.map(({ _id, role, registrationId: application, history, reason }) => {
              const event = application.eventId;
              const currentRound =
                application.roundDetails?.find((round) => round.status === "scheduled") ||
                application.roundDetails?.[Math.max(application.currentRound - 1, 0)];
              const totalRounds =
                application.numberOfRounds || application.roundDetails?.length || 0;

              return (
                <article key={_id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3.5">
                      <Monogram name={event?.clubId?.name || "Club"} size="sm" />
                      <div className="min-w-0">
                        <p className="eyebrow eyebrow-accent">{event?.clubId?.name || "Club"}</p>
                        <h2 className="display mt-1 text-xl leading-snug">
                          {event?.title || "Event"}
                        </h2>
                        <p className="mt-1.5 text-sm text-ink-3">
                          {role === "captain" ? "Team captain" : "Team member"} · Applied{" "}
                          {formatDateTime(application.registeredAt, { dateOnly: true })}
                          {history
                            ? ` · ${
                                reason === "removed"
                                  ? "Removed from team"
                                  : reason === "left"
                                    ? "Left team"
                                    : "Withdrawn"
                              }`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <Badge
                      tone={STATUS_TONE[application.overallStatus] || "neutral"}
                      className="capitalize"
                      live={application.overallStatus === "in_progress"}
                    >
                      {application.overallStatus?.replace("_", " ")}
                    </Badge>
                  </div>

                  <MetaGrid cols={3} className="mt-6 border-t border-line pt-5">
                    <Meta
                      label="Team"
                      value={
                        application.teamName ||
                        (event?.registrationType === "individual" ? "Individual" : "Not named")
                      }
                    />
                    <Meta
                      label="Stage"
                      value={
                        application.currentRound
                          ? `Round ${application.currentRound}`
                          : "Submitted"
                      }
                    />
                    <Meta
                      label="Next date"
                      value={
                        currentRound?.roundDate
                          ? formatDateTime(currentRound.roundDate)
                          : "Not scheduled"
                      }
                    />
                  </MetaGrid>

                  <RoundProgress current={application.currentRound} total={totalRounds} />

                  {event && ["published", "closed"].includes(event.status) && (
                    <Link
                      to={`/event/${event._id}`}
                      className="link link-accent mt-6 inline-flex text-sm font-semibold"
                    >
                      View application and team →
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
