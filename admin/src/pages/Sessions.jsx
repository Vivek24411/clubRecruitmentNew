import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDateTime, sessionDate } from "../utils/date";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonList,
} from "../components/ui";

const STATUSES = ["draft", "published", "cancelled", "completed", "archived"];

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
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => axios
      .get(`${import.meta.env.VITE_BASE_URI}/admin/getAllSessions`, { params: { limit: 24, search: search.trim() || undefined } })
      .then(({ data }) => { if (data.success) { setSessions(data.sessions); setPagination(data.pagination); } else toast.error(data.msg); })
      .catch(() => toast.error("Could not load sessions"))
      .finally(() => setLoading(false)), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadMore = async () => {
    if (loadingMore || pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllSessions`, { params: { page: pagination.page + 1, limit: 24, search: search.trim() || undefined } });
      setSessions((current) => [...current, ...(data.sessions || [])]); setPagination(data.pagination);
    } catch { toast.error("Could not load more sessions"); } finally { setLoadingMore(false); }
  };

  const updateStatus = async (session, status) => {
    if (["cancelled", "archived"].includes(status) && !window.confirm(`${status} ${session.title}?`))
      return;
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/sessions/${session._id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.msg);
      setSessions((items) =>
        items.map((item) => (item._id === session._id ? { ...item, ...data.session } : item)),
      );
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) =>
      `${session.title} ${session.clubId?.name || ""} ${session.venue || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [sessions, search]);

  return (
    <Page>
      <PageHeader
        eyebrow="Moderation"
        title="Session listings"
        description="Review information sessions and remove outdated or inappropriate listings."
        actions={
          <Input
            aria-label="Search sessions"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by session, club, or venue…"
            className="w-full sm:w-64"
          />
        }
      />

      <div className="mt-8">
        {loading ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={sessions.length === 0 ? "No sessions listed" : "No matching sessions"}
            description={
              sessions.length === 0
                ? "Clubs haven't scheduled any information sessions yet."
                : "Try a different session, club, or venue."
            }
          />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((session) => {
              const startsAt = sessionDate(session.date, session.time);
              return (
                <article key={session._id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="eyebrow eyebrow-accent">
                      {session.clubId?.name || "Unknown club"}
                    </p>
                    <Badge tone={STATUS_TONE[session.status] || "neutral"} className="capitalize">
                      {session.status || "published"}
                    </Badge>
                  </div>

                  <h2 className="display mt-2 text-lg leading-snug">{session.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-ink-3">
                    {formatDateTime(startsAt)}
                    {session.venue ? ` · ${session.venue}` : ""}
                  </p>

                  <label className="mt-5 block">
                    <span className="eyebrow">Status</span>
                    <Select
                      className="mt-1.5 capitalize"
                      value={session.status || "published"}
                      onChange={(event) => updateStatus(session, event.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <Link
                    to={`/session/${session._id}`}
                    className="link link-accent mt-5 inline-flex border-t border-line pt-4 text-sm font-semibold"
                  >
                    Review details →
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        {!loading && pagination.page < pagination.pages && <div className="mt-7 flex justify-center"><Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more sessions</Button></div>}
      </div>
    </Page>
  );
}
