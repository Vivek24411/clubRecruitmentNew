import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/date";
import { Badge, Button, Field, Input, Monogram } from "./ui";

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

const statusTone = (status) => status === "selected"
  ? "ok"
  : status === "rejected" ? "bad" : status === "waitlisted" ? "warn" : "info";

/**
 * The apply / team panel for a single vertical. Every mutation is addressed by
 * the registration id, because a student can hold one application per vertical
 * and (event, student) no longer identifies a single team.
 */
export default function VerticalApplication({
  vertical,
  event,
  loggedInStudent,
  platformOpen,
  working,
  action,
  onSignIn,
  onRegister,
  showHeading,
  verticalNumber,
}) {
  const [memberEmail, setMemberEmail] = useState("");
  const [teamName, setTeamName] = useState("");

  // `working` names the vertical currently acting: this card spins, the others
  // only lock, so one application never looks like two.
  const busy = Boolean(working);
  const pending = working === vertical._id;
  const registration = vertical.show === 1 || vertical.show === 2 ? vertical.detail : null;
  const studentStatus = registration?.studentOverallStatus || registration?.overallStatus;
  const isTeamVertical = vertical.registrationType !== "individual";
  const maxTeam = vertical.maxTeamSize || 1;
  const minTeam = vertical.minTeamSize || 1;
  const memberCount = 1 + (registration?.membersAccepted?.length || 0);
  const registrationId = registration?._id;
  const open = platformOpen && vertical.canApply;
  // Team edits stay available after applying, until the vertical itself closes.
  const canEdit = platformOpen
    && vertical.status !== "closed"
    && event.status === "published"
    && (!vertical.deadlineAt || new Date(vertical.deadlineAt) > new Date());

  const run = (endpoint, payload = {}, confirmation) =>
    action(endpoint, { registrationId, ...payload }, confirmation);

  return (
    <div>
      {showHeading && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-accent">{verticalNumber ? `Vertical ${verticalNumber}` : "Registration"}</p>
            <h2 className="display mt-1 text-lg">{verticalNumber ? vertical.title : "Application details"}</h2>
            <p className="mt-1 text-xs text-ink-3">
              {isTeamVertical ? `Teams of ${minTeam}–${maxTeam}` : "Individual"}
              {vertical.numberOfRounds ? ` · ${vertical.numberOfRounds} round${vertical.numberOfRounds === 1 ? "" : "s"}` : ""}
            </p>
            {vertical.deadlineAt && <p className="mt-1 text-xs font-medium text-ink-2">Registration deadline · {formatDateTime(vertical.deadlineAt)}</p>}
          </div>
          {registration
            ? <Badge tone={statusTone(studentStatus)} className="capitalize">{studentStatus?.replace("_", " ")}</Badge>
            : vertical.status === "closed" ? <Badge tone="neutral">Closed</Badge> : null}
        </div>
      )}

      {vertical.shortDescription && !registration && (
        <p className="mt-4 text-sm leading-relaxed text-ink-3">{vertical.shortDescription}</p>
      )}

      {!loggedInStudent && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-3">
            Sign in with your student account to apply and track every selection round.
          </p>
          <Button block size="lg" className="mt-5" onClick={onSignIn}>Sign in to apply</Button>
          <button
            type="button"
            onClick={onRegister}
            className="link link-accent mt-4 block w-full text-center text-sm font-semibold"
          >
            Create a student account
          </button>
        </>
      )}

      {/* Not yet applied to this vertical */}
      {loggedInStudent && vertical.show === 0 && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-3">
            {!platformOpen
              ? "The platform recruitment cycle is currently closed."
              : vertical.blockedReason
                ? vertical.blockedReason
                : isTeamVertical
                  ? "Register as captain, then invite teammates by their institute email."
                  : "Submit an individual application."}
          </p>
          <Button
            block
            size="lg"
            className="mt-5"
            disabled={!open || busy}
            loading={pending}
            onClick={() => action("registerEvent", { verticalId: vertical._id })}
          >
            {pending ? "Submitting…" : open ? "Apply now" : "Applications closed"}
          </Button>
          {vertical.deadlineAt && open && (
            <p className="mt-3 text-center text-xs text-ink-3">Closes {formatDateTime(vertical.deadlineAt)}</p>
          )}
        </>
      )}

      {/* Captain */}
      {vertical.show === 1 && registration && (
        <>
          {isTeamVertical && (
            <>
              <form
                className="mt-5"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  run("addTeamName", { teamName });
                }}
              >
                <Field label="Team name" id={`teamName-${vertical._id}`}>
                  <Input
                    id={`teamName-${vertical._id}`}
                    value={teamName}
                    onChange={(changeEvent) => setTeamName(changeEvent.target.value)}
                    placeholder={registration.teamName || "Choose a team name"}
                    minLength={2}
                    required
                  />
                </Field>
                <Button variant="secondary" size="sm" block className="mt-2.5" disabled={!canEdit || busy}>
                  {registration.teamName ? "Rename team" : "Save team name"}
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <p className="eyebrow">Members · {memberCount}/{maxTeam}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-4">
                  The captain and accepted members are counted. Pending invitations are not.
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5">
                    <StudentAvatar student={registration.studentId} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{registration.studentId?.name}</p>
                      <p className="text-xs text-ink-3">Captain</p>
                    </div>
                  </li>
                  {registration.membersAccepted?.map((member) => (
                    <li key={member._id} className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5">
                      <StudentAvatar student={member} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="truncate text-xs text-ink-3">{member.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          disabled={!canEdit || busy}
                          onClick={() => run("transferCaptain", { memberId: member._id }, `Transfer captaincy to ${member.name}? You will become a regular team member.`)}
                          className="link text-xs font-semibold text-accent disabled:opacity-40"
                        >
                          Make captain
                        </button>
                        <button
                          disabled={!canEdit || busy}
                          onClick={() => run("removeTeamMember", { memberId: member._id }, `Remove ${member.name} from the team?`)}
                          className="link text-xs font-semibold text-bad disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {memberCount < minTeam && (
                <p className="mt-4 rounded-sm border-l-2 border-warn bg-warn-tint/60 px-4 py-3 text-sm text-ink-2">
                  Invite at least {minTeam - memberCount} more teammate(s) to meet the minimum team size.
                </p>
              )}

              {registration.membersOffered?.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow">Pending invitations</p>
                  <ul className="mt-3 space-y-2">
                    {registration.membersOffered.map((member) => (
                      <li key={member._id} className="flex items-center justify-between gap-3 rounded-sm border border-dashed border-line-2 px-3 py-2.5">
                        <span className="truncate text-sm text-ink-2">{member.email}</span>
                        <button
                          onClick={() => run("cancelMemberOffer", { memberEmail: member.email })}
                          className="link text-xs font-semibold text-bad"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {vertical.invitations?.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="eyebrow">Invitations for you</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-4">
                    Accepting one will withdraw your current application in {vertical.title} and move you into that team.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {vertical.invitations.map((offer) => (
                      <li key={offer._id} className="rounded-sm border border-line p-3">
                        <p className="text-sm font-semibold">{offer.teamName || `${offer.studentId?.name}'s team`}</p>
                        <p className="mt-0.5 text-xs text-ink-3">Captain: {offer.studentId?.name}</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" disabled={!canEdit || busy} onClick={() => action("acceptMemberOffer", { registrationId: offer._id }, "Join this team? Your current application and its round work will be withdrawn.")}>Accept</Button>
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => action("declineMemberOffer", { registrationId: offer._id })}>Decline</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form
                className="mt-6 border-t border-line pt-5"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  run("addMemberOffer", { memberEmail });
                  setMemberEmail("");
                }}
              >
                <Field label="Invite by IITR email" id={`memberEmail-${vertical._id}`}>
                  <Input
                    id={`memberEmail-${vertical._id}`}
                    type="email"
                    value={memberEmail}
                    onChange={(changeEvent) => setMemberEmail(changeEvent.target.value)}
                    placeholder="student@iitr.ac.in"
                    required
                  />
                </Field>
                <Button block size="sm" className="mt-2.5" disabled={!canEdit || busy || memberCount >= maxTeam}>
                  Send invitation
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <Link to="/applications" className="link link-accent block text-sm font-semibold">Track application →</Link>
            <button
              disabled={!canEdit || busy}
              onClick={() => run("unregisterAsCaptain", {}, `Withdraw your ${vertical.title} application? Your team will be disbanded.`)}
              className="link mt-4 text-sm font-semibold text-bad disabled:opacity-40"
            >
              Withdraw application
            </button>
          </div>
        </>
      )}

      {/* Accepted member */}
      {vertical.show === 2 && registration && (
        <>
          <p className="mt-4 text-base font-semibold">{registration.teamName || "Unnamed team"}</p>
          <ul className="mt-5 space-y-2">
            <li className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5">
              <StudentAvatar student={registration.studentId} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{registration.studentId?.name}</p>
                <p className="text-xs text-ink-3">Captain</p>
              </div>
            </li>
            {registration.membersAccepted?.map((member) => (
              <li key={member._id} className="flex items-center gap-3 rounded-sm bg-paper-2 px-3 py-2.5">
                <StudentAvatar student={member} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-ink-3">{member.email}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-line pt-5">
            <Link to="/applications" className="link link-accent block text-sm font-semibold">Track application →</Link>
            <button
              disabled={!canEdit || busy}
              onClick={() => run("leaveTeam", {}, "Leave this team? You may need a new invitation to rejoin.")}
              className="link mt-4 text-sm font-semibold text-bad disabled:opacity-40"
            >
              Leave team
            </button>
          </div>
        </>
      )}

      {/* Invited, no application of their own yet */}
      {vertical.show === 3 && (
        <>
          <p className="mt-4 text-sm text-ink-3">Accept one team, or start your own application.</p>
          <ul className="mt-5 space-y-3">
            {vertical.invitations.map((offer) => (
              <li key={offer._id} className="rounded-sm border border-line p-4">
                <p className="font-semibold">{offer.teamName || `${offer.studentId?.name}'s team`}</p>
                <p className="mt-0.5 text-sm text-ink-3">Captain: {offer.studentId?.name}</p>
                <div className="mt-3.5 flex gap-2">
                  <Button size="sm" className="flex-1" disabled={!canEdit || busy} onClick={() => action("acceptMemberOffer", { registrationId: offer._id })}>Accept</Button>
                  <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => action("declineMemberOffer", { registrationId: offer._id })}>Decline</Button>
                </div>
              </li>
            ))}
          </ul>
          <button
            disabled={!open || busy}
            onClick={() => action("registerEvent", { verticalId: vertical._id })}
            className="link link-accent mt-5 text-sm font-semibold disabled:opacity-40"
          >
            Start my own application
          </button>
        </>
      )}
    </div>
  );
}
