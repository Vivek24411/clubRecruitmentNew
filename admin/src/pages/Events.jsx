import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { eventDeadline, formatDateTime } from "../utils/date";
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

const STATUSES = ["draft", "published", "closed", "archived", "cancelled"];

const STATUS_TONE = {
  published: "ok",
  draft: "neutral",
  closed: "warn",
  archived: "neutral",
  cancelled: "bad",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => axios
      .get(`${import.meta.env.VITE_BASE_URI}/admin/getAllEvents`, { params: { limit: 24, search: search.trim() || undefined } })
      .then(({ data }) => { if (data.success) { setEvents(data.events); setPagination(data.pagination); } else toast.error(data.msg); })
      .catch(() => toast.error("Could not load events"))
      .finally(() => setLoading(false)), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadMore = async () => {
    if (loadingMore || pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllEvents`, { params: { page: pagination.page + 1, limit: 24, search: search.trim() || undefined } });
      setEvents((current) => [...current, ...(data.events || [])]); setPagination(data.pagination);
    } catch { toast.error("Could not load more events"); } finally { setLoadingMore(false); }
  };

  const updateStatus = async (event, status) => {
    if (
      ["cancelled", "archived"].includes(status) &&
      !window.confirm(`${status === "cancelled" ? "Cancel" : "Archive"} ${event.title}?`)
    )
      return;
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/events/${event._id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.msg);
      setEvents((items) =>
        items.map((item) => (item._id === event._id ? { ...item, ...data.event } : item)),
      );
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      `${event.title} ${event.clubId?.name || ""}`.toLowerCase().includes(query),
    );
  }, [events, search]);

  return (
    <Page>
      <PageHeader
        eyebrow="Moderation"
        title="Event listings"
        description="Review what clubs have published and control what students can see or apply to."
        actions={
          <Input
            aria-label="Search events"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by event or club…"
            className="w-full sm:w-64"
          />
        }
      />

      <div className="mt-8">
        {loading ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={events.length === 0 ? "No events listed" : "No matching events"}
            description={
              events.length === 0
                ? "Clubs haven't created any recruitment events yet."
                : "Try a different event or club name."
            }
          />
        ) : (
          <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <article key={event._id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow eyebrow-accent">{event.clubId?.name || "Unknown club"}</p>
                  <Badge tone={STATUS_TONE[event.status] || "neutral"} className="capitalize">
                    {event.status || "published"}
                  </Badge>
                </div>

                <h2 className="display mt-2 text-lg leading-snug">{event.title}</h2>
                {event.shortDescription && (
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-3">
                    {event.shortDescription}
                  </p>
                )}
                <p className="mt-3 text-sm text-ink-3">
                  Closes{" "}
                  <span className="font-medium text-ink-2">
                    {formatDateTime(eventDeadline(event), { dateOnly: true })}
                  </span>
                </p>

                <label className="mt-5 block">
                  <span className="eyebrow">Status</span>
                  <Select
                    className="mt-1.5 capitalize"
                    value={event.status || "published"}
                    onChange={(changeEvent) => updateStatus(event, changeEvent.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </label>

                <Link
                  to={`/event/${event._id}`}
                  className="link link-accent mt-5 inline-flex border-t border-line pt-4 text-sm font-semibold"
                >
                  Review details →
                </Link>
              </article>
            ))}
          </div>
        )}
        {!loading && pagination.page < pagination.pages && <div className="mt-7 flex justify-center"><Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more events</Button></div>}
      </div>
    </Page>
  );
}
