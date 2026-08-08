import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Meter,
  Page,
  PageHeader,
  SkeletonList,
} from "../components/ui";

const STATUS_TONE = {
  published: "ok",
  draft: "neutral",
  cancelled: "bad",
  completed: "info",
  archived: "neutral",
};

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/club/getSessions`)
      .then(({ data }) => (data.success ? setSessions(data.sessions) : toast.error(data.msg)))
      .catch(() => toast.error("Could not load sessions"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page>
      <PageHeader
        eyebrow="Outreach"
        title="Information sessions"
        description="Manage schedules, capacity, RSVPs, and attendance."
        actions={<Button to="/addSession" variant="accent">Create session</Button>}
      />

      <div className="mt-8">
        {loading ? (
          <SkeletonList rows={3} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Schedule an information session so students can meet your club."
            action={<Button to="/addSession">Create a session</Button>}
          />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => {
              const startsAt = sessionDate(session.date, session.time);
              const confirmed = session.confirmedRsvpCount || 0;
              return (
                <article key={session._id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-sm border border-line bg-paper-2">
                      <span className="display tabular text-base leading-none">
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
                    <Badge tone={STATUS_TONE[session.status] || "neutral"} className="capitalize">
                      {session.status}
                    </Badge>
                  </div>

                  <h2 className="display mt-4 text-lg leading-snug">{session.title}</h2>
                  <p className="mt-2 text-sm text-ink-3">{formatDateTime(startsAt)}</p>
                  <p className="mt-0.5 text-sm text-ink-3">
                    {session.venue || "Venue TBA"}
                    {session.duration ? ` · ${session.duration} min` : ""}
                  </p>

                  {session.capacity ? (
                    <Meter
                      className="mt-5"
                      label="Confirmed"
                      value={confirmed}
                      max={session.capacity}
                      tone={confirmed >= session.capacity ? "warn" : "accent"}
                    />
                  ) : (
                    <p className="mt-5 text-sm">
                      <span className="tabular font-semibold">{confirmed}</span>{" "}
                      <span className="text-ink-3">confirmed · open attendance</span>
                    </p>
                  )}

                  <Link
                    to={`/session/${session._id}`}
                    className="link link-accent mt-5 inline-flex text-sm font-semibold"
                  >
                    Manage session →
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
