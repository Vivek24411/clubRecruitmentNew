import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  daysUntil,
  eventApplicationsOpen,
  eventDeadline,
  eventEndDate,
  eventIsOpen,
  formatDateTime,
} from "../utils/date";
import EventWorkflow from "../components/EventWorkflow";
import VerticalApplication from "../components/VerticalApplication";
import { StudentContextData } from "../context/StudentContext";
import ClubLogo from "../components/ClubLogo";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Meta,
  MetaGrid,
  Monogram,
  Page,
  Skeleton,
} from "../components/ui";

const PROGRAMME_LABELS = {
  undergraduate: "Undergraduate",
  mtech: "M.Tech.",
  msc: "M.Sc.",
  mba: "MBA",
  phd: "PhD",
};
const YEAR_LABELS = ["", "First", "Second", "Third", "Fourth", "Fifth"];

function programmeEligibility(event) {
  if (event.programmeEligibility?.length) return event.programmeEligibility;
  return [{ programme: "undergraduate", years: event.eligibilityYears || [] }];
}

/** Vertical timeline of selection rounds, with a connecting spine. */
function RoundTimeline({ rounds }) {
  return (
    <ol className="relative mt-6 space-y-6 pl-8">
      {/* The spine sits behind the numbered markers. */}
      <span className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-line" aria-hidden="true" />
      {rounds.map((round, index) => (
        <li key={index} className="relative">
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
          {round.submissionDeadlineAt && (
            <p className="mt-2 text-sm font-medium text-ink-2">
              Submission deadline: {formatDateTime(round.submissionDeadlineAt)}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function EventSkeleton() {
  return (
    <Page width="7xl">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-6 h-10 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/2" />
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </Page>
  );
}

function contactHref(value) {
  const contact = String(value || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return `mailto:${contact}`;
  if (/^\+?[\d\s()-]{7,}$/.test(contact)) return `tel:${contact.replace(/[^+\d]/g, "")}`;
  if (/^https?:\/\//i.test(contact)) return contact;
  return null;
}

function StudentAvatar({ student }) {
  if (student?.profilePicture) {
    return (
      <img
        src={student.profilePicture}
        alt=""
        loading="lazy"
        className="h-9 w-9 flex-none rounded-full border border-line bg-surface object-cover"
      />
    );
  }
  return <Monogram name={student?.name || "?"} size="sm" />;
}

export default function Event() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { loggedInStudent } = useContext(StudentContextData);
  const [event, setEvent] = useState(null);
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  // Holds the id of the vertical whose action is in flight, so only that
  // card shows a spinner while the rest simply lock.
  const [working, setWorking] = useState(null);
  const [platformOpen, setPlatformOpen] = useState(true);
  const [eligibility, setEligibility] = useState({ eligible: true, reason: "" });

  const load = useCallback(async () => {
    try {
      const eventResponse = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEvent`, {
        params: { eventId },
      });
      if (!eventResponse.data.success) throw new Error(eventResponse.data.msg);
      setEvent(eventResponse.data.event);
      setPlatformOpen(eventResponse.data.registrationOpen !== false);
      setEligibility(eventResponse.data.eligibility || { eligible: true, reason: "" });
      if (loggedInStudent) {
        const applicationResponse = await axios.get(
          `${import.meta.env.VITE_BASE_URI}/student/getEventDetails`,
          { params: { eventId } },
        );
        setVerticals(applicationResponse.data.verticals || []);
      } else {
        setVerticals([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, loggedInStudent]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (endpoint, payload = {}, confirmation, scope = "event") => {
    if (confirmation && !window.confirm(confirmation)) return;
    setWorking(scope);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/${endpoint}`,
        { eventId, ...payload },
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      await load();
    } catch (error) {
      toast.error(
        error.response?.data?.msg || error.message || "Could not complete that action",
      );
    } finally {
      setWorking(null);
    }
  };

  const rememberEventAndNavigate = (destination) => {
    sessionStorage.setItem("studentReturnTo", `/event/${eventId}`);
    navigate(destination);
  };

  if (loading) return <EventSkeleton />;

  if (!event) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Event not found"
          description="This event may have been removed, or the link is incorrect."
          action={
            <Button to="/events" variant="secondary">
              Back to events
            </Button>
          }
        />
      </Page>
    );
  }

  const deadline = eventDeadline(event);
  const eventEndsAt = eventEndDate(event);
  const eventOpen = eventIsOpen(event);
  const applicationsOpen = eventApplicationsOpen(event);
  const canApply = platformOpen && eligibility.eligible !== false && applicationsOpen;
  const verticalsEnabled = Boolean(event.verticalsEnabled) && (event.verticals?.length || 0) > 1;
  // Signed-out visitors still see the catalogue, so fall back to the event's
  // own verticals when getEventDetails was never called.
  const shownVerticals = verticals.length
    ? verticals
    : (event.verticals || []).map((vertical) => ({ ...vertical, show: 0, invitations: [], canApply: false }));
  const primaryVertical = shownVerticals[0];
  const hasApplication = shownVerticals.some((vertical) => vertical.show === 1 || vertical.show === 2);
  const isTeamEvent = (primaryVertical?.registrationType || event.registrationType) !== "individual";
  const maxTeam = primaryVertical?.maxTeamSize || event.maxTeamSize || 1;
  const daysLeft = daysUntil(deadline);

  const applicationStatusBadge = !platformOpen
    ? <Badge tone="warn">Recruitment paused</Badge>
    : applicationsOpen
      ? <Badge tone="accent">Applications open</Badge>
      : <Badge tone="neutral">Applications closed</Badge>;

  return (
    <Page>
      <Link to="/events" className="link text-sm text-ink-3">
        ← All events
      </Link>

      {/* ----------------------------------------------------------------- */}
      {/* Masthead                                                           */}
      {/* ----------------------------------------------------------------- */}
      <header className="reveal mt-6">
        <div className="flex flex-wrap items-center gap-3">
          {event.clubId?.name && (
            <Link
              to={event.clubId._id ? `/club/${event.clubId._id}` : "/clubs"}
              className="flex items-center gap-2.5"
            >
              <ClubLogo club={event.clubId} />
              <span className="text-sm font-semibold">{event.clubId.name}</span>
            </Link>
          )}
          {eventOpen ? <Badge tone="ok" live>Event open</Badge> : <Badge tone="neutral">Event closed</Badge>}
          {applicationStatusBadge}
          {applicationsOpen && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
            <Badge tone={daysLeft <= 1 ? "bad" : "warn"}>
              {daysLeft === 0
                ? "Closes today"
                : daysLeft === 1
                  ? "Closes tomorrow"
                  : `${daysLeft} days left`}
            </Badge>
          )}
        </div>

        <h1 className="display mt-4 max-w-4xl text-3xl sm:text-4xl lg:text-5xl">{event.title}</h1>
        {event.shortDescription && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">
            {event.shortDescription}
          </p>
        )}
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      {event.eventBanner && (
        <div className="reveal relative mx-auto mt-8 aspect-square w-full max-w-3xl overflow-hidden rounded-md border border-line bg-ink/90 shadow-sm" style={{ "--d": "80ms" }}>
          <img src={event.eventBanner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
          <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
          <img src={event.eventBanner} alt={`${event.title} banner`} className="relative h-full w-full object-contain" />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Body                                                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="space-y-8 lg:col-span-2">
          <section className="reveal" style={{ "--d": "120ms" }}>
            <h2 className="display text-xl">About this opportunity</h2>
            {event.longDescription && (
              <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
                {event.longDescription}
              </p>
            )}

            <MetaGrid className="mt-8 border-t border-line pt-6">
              <Meta label="Application deadline" value={formatDateTime(deadline)} />
              {eventEndsAt && eventEndsAt.getTime() !== deadline?.getTime() && (
                <Meta label="Final round ends" value={formatDateTime(eventEndsAt)} />
              )}
              <Meta
                label="Application"
                value={
                  <span className="capitalize">
                    {event.registrationType?.replace("_", " ") || "Team"}
                  </span>
                }
              />
              <Meta
                label="Team size"
                value={isTeamEvent ? `${event.minTeamSize || 1}–${maxTeam} members` : "Individual"}
              />
              <Meta
                label="Rounds"
                value={event.numberOfRounds || event.roundDetails?.length || "Not specified"}
              />
              {event.maxParticipants && (
                <Meta label="Participant limit" value={`${event.maxParticipants} people`} />
              )}
              {event.ContactInfo?.length > 0 && (
                <Meta
                  label="Event contacts"
                  className="sm:col-span-2"
                  value={(
                    <span className="flex flex-wrap gap-x-4 gap-y-2">
                      {event.ContactInfo.map((contact, index) => {
                        const href = contactHref(contact);
                        return href ? (
                          <a key={`${contact}-${index}`} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="link link-accent break-all">
                            {contact}
                          </a>
                        ) : <span key={`${contact}-${index}`} className="break-all">{contact}</span>;
                      })}
                    </span>
                  )}
                />
              )}
            </MetaGrid>

            {event.eligibility && (
              <div className="mt-6 rounded-sm border-l-2 border-accent bg-accent-tint/50 px-5 py-4">
                <p className="eyebrow eyebrow-accent">Eligibility</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{event.eligibility}</p>
              </div>
            )}
            <div className="mt-5">
              <p className="eyebrow">Eligible programmes and years</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {programmeEligibility(event).map((rule) => (
                  <Badge key={rule.programme} tone="info">
                    {PROGRAMME_LABELS[rule.programme] || rule.programme}: {rule.years?.length
                      ? rule.years.map((year) => `${YEAR_LABELS[year]} year`).join(", ")
                      : "all years"}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-sm text-ink-3">Open to every branch or discipline within these programmes.</p>
            </div>
          </section>

          {(event.verticals?.length > 0 || event.roundDetails?.length > 0) && (
            <section className="reveal ruled-top pt-8" style={{ "--d": "180ms" }}>
              <h2 className="display text-xl">{verticalsEnabled ? "Verticals" : "Selection process"}</h2>
              {verticalsEnabled ? (
                <p className="mt-2 text-sm text-ink-3">
                  This event runs {event.verticals.length} independent verticals. Each has its own rounds and its own teams
                  {event.maxVerticalApplications === 1
                    ? ", and you may apply to one of them."
                    : event.maxVerticalApplications
                      ? `, and you may apply to up to ${event.maxVerticalApplications}.`
                      : "."}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-3">
                  {(event.verticals?.[0]?.rounds || event.roundDetails || []).length} rounds from application to decision.
                </p>
              )}
              <div className="mt-2 space-y-8">
                {(event.verticals?.length
                  ? event.verticals
                  : [{ _id: "legacy", rounds: event.roundDetails || [] }]
                ).map((vertical) => (
                  <div key={vertical._id}>
                    {verticalsEnabled && (
                      <div className="mt-6 flex flex-wrap items-baseline gap-3">
                        <h3 className="display text-lg">{vertical.title}</h3>
                        {vertical.status === "closed" && <Badge tone="neutral">Closed</Badge>}
                        <span className="text-sm text-ink-3">
                          {vertical.registrationType === "individual"
                            ? "Individual"
                            : `Teams of ${vertical.minTeamSize}–${vertical.maxTeamSize}`}
                        </span>
                      </div>
                    )}
                    {vertical.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{vertical.description}</p>
                    )}
                    <RoundTimeline rounds={vertical.rounds || []} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {hasApplication && <EventWorkflow eventId={eventId} />}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Application panel — one card per vertical                        */}
        {/* --------------------------------------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {!loggedInStudent && (
            <Card className="reveal p-6" style={{ "--d": "160ms" }}>
              <h2 className="display text-lg">{canApply ? "Ready to apply?" : "Applications closed"}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
                {canApply
                  ? verticalsEnabled
                    ? "Sign in with your student account to pick a vertical, build a team, and track every selection round."
                    : "Sign in with your student account to apply, build a team, and track every selection round."
                  : "You can still explore this event. Sign in to view your existing application, if you have one."}
              </p>
              <Button block size="lg" className="mt-6" onClick={() => rememberEventAndNavigate("/login")}>
                {canApply ? "Sign in to apply" : "Sign in"}
              </Button>
              <button
                type="button"
                onClick={() => rememberEventAndNavigate("/register")}
                className="link link-accent mt-4 block w-full text-center text-sm font-semibold"
              >
                Create a student account
              </button>
            </Card>
          )}

          {verticalsEnabled && loggedInStudent && event.maxVerticalApplications && (
            <div className="rounded-sm border-l-2 border-accent bg-accent-tint/50 px-4 py-3 text-sm text-ink-2">
              {event.maxVerticalApplications === 1
                ? "You may apply to one vertical in this event."
                : `You may apply to up to ${event.maxVerticalApplications} verticals in this event.`}
            </div>
          )}

          {loggedInStudent && shownVerticals.map((vertical, index) => (
            <Card key={vertical._id} className="reveal p-6" style={{ "--d": `${160 + index * 40}ms` }}>
              <VerticalApplication
                vertical={vertical}
                event={event}
                loggedInStudent={loggedInStudent}
                platformOpen={platformOpen}
                working={working}
                action={(endpoint, payload, confirmation) =>
                  action(endpoint, payload, confirmation, vertical._id)}
                onSignIn={() => rememberEventAndNavigate("/login")}
                onRegister={() => rememberEventAndNavigate("/register")}
                showHeading={verticalsEnabled}
              />
            </Card>
          ))}
        </aside>
      </div>
    </Page>
  );
}
