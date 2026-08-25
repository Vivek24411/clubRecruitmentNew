import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { eventDeadline, eventEndDate, eventIsOpen, formatDateTime } from "../utils/date";
import { eligibilitySummary } from "../utils/eligibility";
import { useContext } from "react";
import { ClubContextData } from "../context/ClubContext.jsx";
import ShareQrModal from "../components/ShareQrModal";
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

const ROUND_TYPE_LABELS = {
  test: "Test",
  submission: "Submission",
  interview: "Interview",
  group_discussion: "Group discussion",
  presentation: "Presentation",
  hackathon: "Hackathon",
  custom: "Custom",
};

function RoundDetail({ round, index }) {
  const type = round.customType || ROUND_TYPE_LABELS[round.type] || round.Type || "Round";
  const fields = round.submissionFields || [];
  const submissionUsesRoundWindow = round.type === "submission";
  return (
    <li className="relative rounded-sm border border-line bg-surface p-4 sm:p-5">
      <span className="absolute -left-9 top-4 grid h-7 w-7 place-items-center rounded-full border border-line bg-ink text-[0.6875rem] font-bold text-white">{index + 1}</span>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow">Round {index + 1}</p><p className="mt-1 font-semibold">{round.title || round.Type || `Round ${index + 1}`}</p></div>
        <Badge tone="info">{type}</Badge>
      </div>
      {(round.Description || round.description) && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{round.Description || round.description}</p>}
      {round.instructions && <div className="mt-3 rounded-sm bg-paper-2 px-3.5 py-3"><p className="eyebrow">Instructions</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{round.instructions}</p></div>}
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {round.startsAt && <div><p className="eyebrow">{submissionUsesRoundWindow ? "Submissions open" : "Starts"}</p><p className="mt-1 font-medium text-ink-2">{formatDateTime(round.startsAt)}</p></div>}
        {round.endsAt && <div><p className="eyebrow">{submissionUsesRoundWindow ? "Submission deadline" : "Ends"}</p><p className="mt-1 font-medium text-ink-2">{formatDateTime(round.endsAt)}</p></div>}
        {!submissionUsesRoundWindow && round.submissionDeadlineAt && <div><p className="eyebrow">Submission deadline</p><p className="mt-1 font-medium text-ink-2">{formatDateTime(round.submissionDeadlineAt)}</p></div>}
        {round.venue && <div><p className="eyebrow">Venue</p><p className="mt-1 font-medium text-ink-2">{round.venue}</p></div>}
      </div>
      {round.meetingUrl && <a href={round.meetingUrl} target="_blank" rel="noreferrer" className="link link-accent mt-3 inline-block break-all text-sm font-semibold">Open meeting link ↗</a>}
      {round.interviewMode && <p className="mt-3 text-sm capitalize text-ink-3">{round.interviewMode} interview · {round.scheduleMode === "slots" ? `${round.slotDurationMinutes || 20}-minute slots` : "common schedule"}</p>}
      {fields.length > 0 && <div className="mt-4 border-t border-line pt-4"><p className="eyebrow">Students submit</p><ul className="mt-2 flex flex-wrap gap-2">{fields.map((field) => <li key={field.key} className="rounded-full border border-line bg-paper-2 px-3 py-1.5 text-xs font-medium text-ink-2">{field.label}{field.required === false ? " · optional" : " · required"}</li>)}</ul></div>}
    </li>
  );
}

export default function Event() {
  const { clubProfile } = useContext(ClubContextData);
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

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
  const eventEndsAt = eventEndDate(event);
  const effectiveStatus = event.status === "published"
    ? (eventIsOpen(event) ? "open" : "closed")
    : event.status;
  const verticalCount = event.verticalsEnabled ? event.verticals?.length || 0 : 1;
  const roundCount = event.verticals?.reduce((total, vertical) => total + (vertical.rounds?.length || 0), 0)
    || event.roundDetails?.length
    || 0;

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
            <div className="flex items-center gap-3">
              {clubProfile?.clubLogo && <img src={clubProfile.clubLogo} alt="" className="h-11 w-11 rounded-md border border-line bg-white object-contain p-1" />}
              <span className="eyebrow eyebrow-accent capitalize">{event.eventType || "Event"} event</span>
            </div>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{event.title}</h1>
            {event.shortDescription && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
                {event.shortDescription}
              </p>
            )}
          </div>
          <Badge tone={effectiveStatus === "open" ? "ok" : STATUS_TONE[effectiveStatus] || "neutral"} className="capitalize">
            {effectiveStatus}
          </Badge>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button to={`/event-applications/${event._id}`} variant="accent">
            Manage applications
          </Button>
          <Button to={`/events/${event._id}/edit`} variant="secondary">
            Edit event
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowQr(true)}>
            Share QR
          </Button>
        </div>

        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      {event.eventBanner && <div className="relative mx-auto mt-9 aspect-square w-full max-w-3xl overflow-hidden rounded-md border border-line bg-ink/90 shadow-sm"><img src={event.eventBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" /><div className="absolute inset-0 bg-ink/15" aria-hidden="true" /><img src={event.eventBanner} alt={`${event.title} banner`} className="relative h-full w-full object-contain" /></div>}

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="reveal" style={{ "--d": "100ms" }}>
            <h2 className="display text-xl">Event details</h2>
            <MetaGrid cols={2} className="mt-6">
              <Meta
                label="Application deadline"
                value={deadline ? formatDateTime(deadline) : "Not set"}
              />
              {eventEndsAt && eventEndsAt.getTime() !== deadline?.getTime() && (
                <Meta label="Final round ends" value={formatDateTime(eventEndsAt)} />
              )}
              <Meta label="Participant limit" value={event.maxParticipants ? `${event.maxParticipants} people` : "Unlimited"} />
              <Meta label="Verticals" value={verticalCount} />
              <Meta label="Rounds" value={roundCount} />
              <Meta
                label="Created"
                value={event.createdAt ? formatDateTime(event.createdAt) : "—"}
              />
              <Meta label="Eligibility" value={eligibilitySummary(event)} />
              <Meta label="Branches/disciplines" value="All within the selected programmes" />
              {event.eligibility && <Meta label="Additional note" value={event.eligibility} />}
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

          {(event.verticals?.length > 0 || event.roundDetails?.length > 0) && (
            <section className="reveal ruled-top pt-8" style={{ "--d": "200ms" }}>
              <h2 className="display text-xl">
                {event.verticalsEnabled ? "Verticals and rounds" : "Selection rounds"}
              </h2>
              {event.verticalsEnabled && (
                <p className="mt-2 text-sm text-ink-3">
                  Students apply to each vertical separately. Every vertical runs its own rounds and forms its own teams.
                </p>
              )}
              <div className="mt-6 space-y-8">
                {(event.verticals?.length
                  ? event.verticals
                  : [{ _id: "legacy", title: "", rounds: event.roundDetails || [] }]
                ).map((vertical, verticalIndex) => (
                  <div key={vertical._id} className={event.verticalsEnabled ? "overflow-hidden rounded-md border-2 border-accent/20 bg-accent-tint/15" : ""}>
                    {event.verticalsEnabled && (
                      <div className="border-b border-accent/20 bg-accent-tint/60 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><p className="eyebrow eyebrow-accent">Vertical {verticalIndex + 1} of {event.verticals.length}</p><h3 className="display mt-1 text-lg">{vertical.title}</h3></div>
                          {vertical.status === "closed" && <Badge tone="neutral">Closed</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-ink-2">
                          <span className="rounded-full bg-surface px-3 py-1.5">{vertical.registrationType === "individual" ? "Individual registration" : vertical.registrationType === "optional_team" ? `Individual or teams · ${vertical.minTeamSize}–${vertical.maxTeamSize}` : `Teams of ${vertical.minTeamSize}–${vertical.maxTeamSize}`}</span>
                          <span className="rounded-full bg-surface px-3 py-1.5">Registration deadline · {formatDateTime(vertical.registrationDeadlineAt || deadline)}</span>
                          <span className="rounded-full bg-surface px-3 py-1.5">{vertical.rounds?.length || 0} rounds</span>
                        </div>
                      </div>
                    )}
                    <div className={event.verticalsEnabled ? "p-4 sm:p-5" : ""}>
                    {(vertical.shortDescription || vertical.description) && <div className="mb-5"><p className="eyebrow">What this vertical does</p>{vertical.shortDescription && <p className="mt-2 font-medium text-ink-2">{vertical.shortDescription}</p>}{vertical.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-3">{vertical.description}</p>}</div>}
                    {(vertical.problemStatementUrl || (!event.verticalsEnabled && event.problemStatementUrl)) && <a href={vertical.problemStatementUrl || event.problemStatementUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm mb-5">Open problem statement ↗</a>}
                    <ol className="relative space-y-4 pl-9">
                      <span
                        className="absolute bottom-2 left-[0.8125rem] top-2 w-px bg-line"
                        aria-hidden="true"
                      />
                      {(vertical.rounds || []).map((round, index) => (
                        <RoundDetail key={round._id || index} round={round} index={index} />
                      ))}
                    </ol>
                    </div>
                  </div>
                ))}
              </div>
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
      <ShareQrModal
        open={showQr}
        onClose={() => setShowQr(false)}
        kind="event"
        itemId={event._id}
        title={event.title}
        published={["published", "closed"].includes(event.status)}
      />
    </Page>
  );
}
