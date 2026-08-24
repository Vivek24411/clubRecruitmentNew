import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate, sessionEndDate } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Meter,
  Monogram,
  Page,
  PageHeader,
  Select,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("published");
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/club/getSessions`)
      .then(({ data }) => (data.success ? setSessions(data.sessions) : toast.error(data.msg)))
      .catch(() => toast.error("Could not load sessions"))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return sessions.filter((session) => {
      const endsAt = sessionEndDate(session);
      const upcoming = endsAt && endsAt > now;
      return (statusFilter === "all" || session.status === statusFilter)
        && (timeFilter === "all" || (timeFilter === "upcoming" ? upcoming : !upcoming))
        && (!query || `${session.title} ${session.venue || ""} ${session.shortDescription || ""}`.toLowerCase().includes(query));
    });
  }, [search, sessions, statusFilter, timeFilter]);

  return (
    <Page>
      <PageHeader
        eyebrow="Outreach"
        title="Information sessions"
        description="Manage schedules, capacity, RSVPs, and attendance."
        actions={<Button to="/addSession" variant="accent">Create session</Button>}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label><span className="eyebrow">Search</span><Input className="mt-1.5" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, venue, description…" /></label>
        <label><span className="eyebrow">Status</span><Select className="mt-1.5" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{Object.keys(STATUS_TONE).map((status) => <option key={status} value={status} className="capitalize">{status}</option>)}</Select></label>
        <label><span className="eyebrow">Schedule</span><Select className="mt-1.5" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="past">Past</option></Select></label>
      </div>

      <div className="mt-6">
        {loading ? (
          <SkeletonList rows={3} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Schedule an information session so students can meet your club."
            action={<Button to="/addSession">Create a session</Button>}
          />
        ) : filteredSessions.length === 0 ? (
          <EmptyState title="No matching sessions" description="Try changing the search or filters." action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); setTimeFilter("all"); }}>Clear filters</Button>} />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((session) => {
              const startsAt = sessionDate(session.date, session.time);
              const confirmed = session.confirmedRsvpCount || 0;
              return (
                <article key={session._id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-square overflow-hidden bg-paper-2">
                    {session.sessionThumbnail ? (
                      <>
                        <img
                          src={session.sessionThumbnail}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
                        />
                        <img
                          src={session.sessionThumbnail}
                          alt={`${session.title} thumbnail`}
                          loading="lazy"
                          className="relative h-full w-full object-contain"
                        />
                      </>
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Monogram name={session.title} size="lg" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3">
                      <Badge tone={STATUS_TONE[session.status] || "neutral"} className="capitalize">
                        {session.status}
                      </Badge>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
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
                      className="link link-accent mt-auto inline-flex pt-5 text-sm font-semibold"
                    >
                      Manage session →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
