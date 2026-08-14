import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { eventDeadline, formatDateTime } from "../utils/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Meta,
  MetaGrid,
  Page,
  Skeleton,
} from "../components/ui";

const STATUS_TONE = {
  published: "ok",
  draft: "neutral",
  closed: "warn",
  archived: "neutral",
  cancelled: "bad",
};

function eligibilitySummary(event) {
  const parts = [];
  if (event.eligibilityYears?.length) {
    const labels = ["", "First", "Second", "Third", "Fourth", "Fifth"];
    parts.push(`${event.eligibilityYears.map((year) => labels[year]).join(", ")} year`);
  }
  if (event.allowPassedOut) parts.push("Passed-out students");
  if (event.eligibilityBranches?.length) {
    parts.push(`${event.eligibilityBranches.length} selected branch${event.eligibilityBranches.length === 1 ? "" : "es"}`);
  }
  if (event.eligibility) parts.push(event.eligibility);
  return parts.length ? parts.join(" · ") : "Open to all current students";
}

export default function Event() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, {
        params: { eventId },
      });
      if (response.data.success) setEvent(response.data.event);
      else toast.error(response.data.msg);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Could not load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  if (isLoading) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-10 h-64 w-full" />
      </Page>
    );
  }

  if (!event) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Event not found"
          description="This event may have been removed, or the link is incorrect."
          action={<Button to="/events" variant="secondary">Back to events</Button>}
        />
      </Page>
    );
  }

  const deadline = eventDeadline(event);

  return (
    <Page width="5xl">
      <Link to="/events" className="link text-sm text-ink-3">
        ← All events
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* Masthead                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="reveal mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow eyebrow-accent capitalize">{event.eventType || "Event"} event</span>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{event.title}</h1>
            {event.shortDescription && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
                {event.shortDescription}
              </p>
            )}
          </div>
          <Badge tone={STATUS_TONE[event.status] || "neutral"} className="capitalize">
            {event.status}
          </Badge>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button to={`/event-applications/${event._id}`} variant="accent">
            Manage applications
          </Button>
          <Button to={`/events/${event._id}/edit`} variant="secondary">
            Edit event
          </Button>
        </div>

        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      {event.eventBanner && <img src={event.eventBanner} alt="" className="mt-9 aspect-video w-full rounded-md border border-line bg-paper-2 object-contain shadow-sm" />}

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="reveal" style={{ "--d": "100ms" }}>
            <h2 className="display text-xl">Event details</h2>
            <MetaGrid cols={2} className="mt-6">
              <Meta
                label="Deadline"
                value={deadline ? formatDateTime(deadline) : "Not set"}
              />
              <Meta label="Participant limit" value={event.maxParticipants ? `${event.maxParticipants} people` : "Unlimited"} />
              <Meta label="Rounds" value={event.numberOfRounds} />
              <Meta
                label="Created"
                value={event.createdAt ? formatDateTime(event.createdAt) : "—"}
              />
              <Meta
                label="Registration"
                value={
                  <span className="capitalize">
                    {event.registrationType?.replace("_", " ") || "Team"}
                  </span>
                }
              />
              <Meta label="Eligibility" value={eligibilitySummary(event)} />
              <Meta label="Eligible years" value={event.eligibilityYears?.length ? event.eligibilityYears.map((year) => `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"}`).join(", ") : "All current years"} />
              <Meta label="Eligible branches" value={event.eligibilityBranches?.length ? event.eligibilityBranches.join(", ") : "All branches"} />
            </MetaGrid>
          </section>

          {event.longDescription && (
            <section className="reveal ruled-top pt-8" style={{ "--d": "150ms" }}>
              <h2 className="display text-xl">Full description</h2>
              <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
                {event.longDescription}
              </p>
            </section>
          )}

          {(event.rounds?.length > 0 || event.roundDetails?.length > 0) && (
            <section className="reveal ruled-top pt-8" style={{ "--d": "200ms" }}>
              <h2 className="display text-xl">Selection rounds</h2>
              <ol className="relative mt-6 space-y-6 pl-8">
                <span
                  className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-line"
                  aria-hidden="true"
                />
                {(event.rounds || event.roundDetails).map((round, index) => (
                  <li key={round._id || index} className="relative">
                    <span className="absolute -left-8 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-[0.6875rem] font-semibold text-ink-2">
                      {index + 1}
                    </span>
                    <p className="font-semibold">
                      {round.title || round.Type || round.type || `Round ${index + 1}`}
                    </p>
                    {(round.Description || round.description) && (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-3">
                        {round.Description || round.description}
                      </p>
                    )}
                    {round.interviewMode && <p className="mt-1 text-xs capitalize text-ink-3">{round.interviewMode} interview</p>}
                    {round.submissionDeadlineAt && <p className="mt-1 text-xs text-ink-3">Submission due {formatDateTime(round.submissionDeadlineAt)}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Contact rail */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          {event.ContactInfo?.length > 0 && (
            <Card className="reveal p-6" style={{ "--d": "120ms" }}>
              <h2 className="eyebrow">Contact information</h2>
              <ul className="mt-4 space-y-2.5">
                {event.ContactInfo.map((info, index) => (
                  <li
                    key={index}
                    className="rounded-sm bg-paper-2 px-3.5 py-2.5 text-sm break-words"
                  >
                    {info}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </Page>
  );
}
