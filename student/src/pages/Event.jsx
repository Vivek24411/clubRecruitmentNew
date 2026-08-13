import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { daysUntil, eventDeadline, formatDateTime } from "../utils/date";
import EventWorkflow from "../components/EventWorkflow";
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

export default function Event() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [view, setView] = useState(null);
  const [detail, setDetail] = useState(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(true);
  const [eligibility, setEligibility] = useState({ eligible: true, reason: "" });

  const load = useCallback(async () => {
    try {
      const [eventResponse, applicationResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEvent`, { params: { eventId } }),
        axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEventDetails`, {
          params: { eventId },
        }),
      ]);
      if (!eventResponse.data.success) throw new Error(eventResponse.data.msg);
      setEvent(eventResponse.data.event);
      setPlatformOpen(eventResponse.data.registrationOpen !== false);
      setEligibility(eventResponse.data.eligibility || { eligible: true, reason: "" });
      setView(Number(applicationResponse.data.Show));
      setDetail(applicationResponse.data.detail);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load event");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (endpoint, payload = {}, confirmation) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setWorking(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/${endpoint}`,
        { eventId, ...payload },
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      setMemberEmail("");
      setTeamName("");
      await load();
    } catch (error) {
      toast.error(
        error.response?.data?.msg || error.message || "Could not complete that action",
      );
    } finally {
      setWorking(false);
    }
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
  const open = platformOpen && eligibility.eligible !== false && event.status === "published" && (!deadline || deadline > new Date());
  const isTeamEvent = event.registrationType !== "individual";
  const registration = view === 1 || view === 2 ? detail : null;
  const maxTeam = event.maxTeamSize || event.maxParticipants || 1;
  const daysLeft = daysUntil(deadline);

  const statusBadge = open ? (
    <Badge tone="ok" live>
      Applications open
    </Badge>
  ) : !platformOpen ? (
    <Badge tone="warn">Recruitment paused</Badge>
  ) : (
    <Badge tone="neutral">Applications closed</Badge>
  );

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
              <Monogram name={event.clubId.name} size="sm" />
              <span className="text-sm font-semibold">{event.clubId.name}</span>
            </Link>
          )}
          {statusBadge}
          {open && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
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
        <img
          src={event.eventBanner}
          alt=""
          className="reveal mt-8 aspect-[21/7] w-full rounded-md border border-line bg-paper-2 object-contain"
          style={{ "--d": "80ms" }}
          onError={(error) => {
            error.currentTarget.style.display = "none";
          }}
        />
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
              <Meta label="Deadline" value={formatDateTime(deadline)} />
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
            </MetaGrid>

            {event.eligibility && (
              <div className="mt-6 rounded-sm border-l-2 border-accent bg-accent-tint/50 px-5 py-4">
                <p className="eyebrow eyebrow-accent">Eligibility</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{event.eligibility}</p>
              </div>
            )}
            {event.eligibilityYears?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {event.eligibilityYears.map((year) => <Badge key={year}>{["", "First", "Second", "Third", "Fourth", "Fifth"][year]} year</Badge>)}
              </div>
            )}
          </section>

          {(event.rounds?.length > 0 || event.roundDetails?.length > 0) && (
            <section className="reveal ruled-top pt-8" style={{ "--d": "180ms" }}>
              <h2 className="display text-xl">Selection process</h2>
              <p className="mt-2 text-sm text-ink-3">
                {(event.rounds || event.roundDetails).length} rounds from application to decision.
              </p>
              <RoundTimeline rounds={event.rounds || event.roundDetails} />
            </section>
          )}
          {registration && <EventWorkflow eventId={eventId} />}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Application panel                                                */}
        {/* --------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="reveal p-6" style={{ "--d": "160ms" }}>
            {/* Not yet applied */}
            {view === 0 && (
              <>
                <h2 className="display text-lg">Apply for this event</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
                  {!platformOpen
                    ? "The platform recruitment cycle is currently closed."
                    : eligibility.eligible === false
                      ? eligibility.reason
                    : isTeamEvent
                      ? "Register as captain, then invite teammates by their institute email."
                      : "Submit an individual application."}
                </p>
                <Button
                  block
                  size="lg"
                  className="mt-6"
                  disabled={!open || working}
                  loading={working}
                  onClick={() => action("registerEvent")}
                >
                  {working ? "Submitting…" : open ? "Apply now" : "Applications closed"}
                </Button>
                {deadline && open && (
                  <p className="mt-3 text-center text-xs text-ink-3">
                    Closes {formatDateTime(deadline)}
                  </p>
                )}
              </>
            )}

            {/* Captain view */}
            {view === 1 && registration && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="display text-lg">
                    {isTeamEvent ? "Your team" : "Your application"}
                  </h2>
                  <Badge tone="info" className="capitalize">
                    {registration.overallStatus?.replace("_", " ")}
                  </Badge>
                </div>

                {isTeamEvent && (
                  <>
                    <form
                      className="mt-6"
                      onSubmit={(submitEvent) => {
                        submitEvent.preventDefault();
                        action("addTeamName", { teamName });
                      }}
                    >
                      <Field label="Team name" id="teamName">
                        <Input
                          id="teamName"
                          value={teamName}
                          onChange={(changeEvent) => setTeamName(changeEvent.target.value)}
                          placeholder={registration.teamName || "Choose a team name"}
                          minLength={2}
                          required
                        />
                      </Field>
                      <Button
                        variant="secondary"
                        size="sm"
                        block
                        className="mt-2.5"
                        disabled={!open || working}
                      >
                        {registration.teamName ? "Rename team" : "Save team name"}
                      </Button>
                    </form>

                    <div className="mt-6 border-t border-line pt-5">
                      <p className="eyebrow">
                        Members · {1 + (registration.membersAccepted?.length || 0)}/{maxTeam}
                      </p>
                      <ul className="mt-3 space-y-2">
                        <li className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5">
                          <Monogram name={registration.studentId?.name || "?"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {registration.studentId?.name}
                            </p>
                            <p className="text-xs text-ink-3">Captain</p>
                          </div>
                        </li>
                        {registration.membersAccepted?.map((member) => (
                          <li
                            key={member._id}
                            className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5"
                          >
                            <Monogram name={member.name || "?"} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{member.name}</p>
                              <p className="truncate text-xs text-ink-3">{member.email}</p>
                            </div>
                            <button
                              disabled={!open || working}
                              onClick={() =>
                                action(
                                  "removeTeamMember",
                                  { memberId: member._id },
                                  `Remove ${member.name} from the team?`,
                                )
                              }
                              className="link text-xs font-semibold text-bad disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {1 + (registration.membersAccepted?.length || 0) < (event.minTeamSize || 1) && (
                      <p className="mt-4 rounded-sm border-l-2 border-warn bg-warn-tint/60 px-4 py-3 text-sm text-ink-2">
                        Invite at least{" "}
                        {(event.minTeamSize || 1) - 1 - (registration.membersAccepted?.length || 0)}{" "}
                        more teammate(s) to meet the minimum team size.
                      </p>
                    )}

                    {registration.membersOffered?.length > 0 && (
                      <div className="mt-6">
                        <p className="eyebrow">Pending invitations</p>
                        <ul className="mt-3 space-y-2">
                          {registration.membersOffered.map((member) => (
                            <li
                              key={member._id}
                              className="flex items-center justify-between gap-3 rounded-sm border border-dashed border-line-2 px-3 py-2.5"
                            >
                              <span className="truncate text-sm text-ink-2">{member.email}</span>
                              <button
                                onClick={() =>
                                  action("cancelMemberOffer", { memberEmail: member.email })
                                }
                                className="link text-xs font-semibold text-bad"
                              >
                                Cancel
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <form
                      className="mt-6 border-t border-line pt-5"
                      onSubmit={(submitEvent) => {
                        submitEvent.preventDefault();
                        action("addMemberOffer", { memberEmail });
                      }}
                    >
                      <Field label="Invite by IITR email" id="memberEmail">
                        <Input
                          id="memberEmail"
                          type="email"
                          value={memberEmail}
                          onChange={(changeEvent) => setMemberEmail(changeEvent.target.value)}
                          placeholder="student@iitr.ac.in"
                          required
                        />
                      </Field>
                      <Button
                        block
                        size="sm"
                        className="mt-2.5"
                        disabled={
                          !open ||
                          working ||
                          1 + (registration.membersAccepted?.length || 0) >= maxTeam
                        }
                      >
                        Send invitation
                      </Button>
                    </form>
                  </>
                )}

                <div className="mt-6 border-t border-line pt-5">
                  <Link to="/applications" className="link link-accent block text-sm font-semibold">
                    Track application →
                  </Link>
                  <button
                    disabled={working || ["selected", "rejected"].includes(registration.overallStatus)}
                    onClick={() =>
                      action(
                        "unregisterAsCaptain",
                        {},
                        "Withdraw this application? Your team will be disbanded.",
                      )
                    }
                    className="link mt-4 text-sm font-semibold text-bad disabled:opacity-40"
                  >
                    Withdraw application
                  </button>
                </div>
              </>
            )}

            {/* Member view */}
            {view === 2 && registration && (
              <>
                <h2 className="display text-lg">You joined this team</h2>
                <p className="mt-3 text-base font-semibold">
                  {registration.teamName || "Unnamed team"}
                </p>
                <p className="mt-1 text-sm text-ink-3">
                  Captain: {registration.studentId?.name}
                </p>
                <ul className="mt-5 space-y-2">
                  {registration.membersAccepted?.map((member) => (
                    <li
                      key={member._id}
                      className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5"
                    >
                      <Monogram name={member.name || "?"} size="sm" />
                      <span className="truncate text-sm font-medium">{member.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-line pt-5">
                  <Link to="/applications" className="link link-accent block text-sm font-semibold">
                    Track application →
                  </Link>
                  <button
                    disabled={!open || working}
                    onClick={() =>
                      action(
                        "leaveTeam",
                        {},
                        "Leave this team? You may need a new invitation to rejoin.",
                      )
                    }
                    className="link mt-4 text-sm font-semibold text-bad disabled:opacity-40"
                  >
                    Leave team
                  </button>
                </div>
              </>
            )}

            {/* Pending invitations */}
            {view === 3 && Array.isArray(detail) && (
              <>
                <h2 className="display text-lg">Team invitations</h2>
                <p className="mt-2.5 text-sm text-ink-3">
                  Accept one team, or start your own application.
                </p>
                <ul className="mt-5 space-y-3">
                  {detail.map((offer) => (
                    <li key={offer._id} className="rounded-sm border border-line p-4">
                      <p className="font-semibold">
                        {offer.teamName || `${offer.studentId?.name}'s team`}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-3">
                        Captain: {offer.studentId?.name}
                      </p>
                      <div className="mt-3.5 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!open || working}
                          onClick={() =>
                            action("acceptMemberOffer", { studentId: offer.studentId?._id })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          disabled={working}
                          onClick={() =>
                            action("declineMemberOffer", { captainId: offer.studentId?._id })
                          }
                        >
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={!open || working}
                  onClick={() => action("registerEvent")}
                  className="link link-accent mt-5 text-sm font-semibold disabled:opacity-40"
                >
                  Start my own application
                </button>
              </>
            )}
          </Card>
        </aside>
      </div>
    </Page>
  );
}
