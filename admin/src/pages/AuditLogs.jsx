import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateTime } from "../utils/date";
import { Button, EmptyState, Input, Page, PageHeader, Skeleton } from "../components/ui";

/** Rough tone by action keyword, so destructive entries read at a glance. */
function actionAccent(action = "") {
  const value = action.toLowerCase();
  if (/(delete|remove|suspend|reject|cancel|revoke)/.test(value)) return "bg-bad";
  if (/(create|add|select|publish|approve|restore)/.test(value)) return "bg-ok";
  if (/(update|patch|edit|change|reset)/.test(value)) return "bg-warn";
  return "bg-line-2";
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${import.meta.env.VITE_BASE_URI}/admin/audit-logs`, {
          params: { action: filter, limit: 50 },
        })
        .then(({ data }) => { if (data.success) { setLogs(data.logs); setPagination(data.pagination); } else toast.error(data.msg); })
        .catch(() => toast.error("Could not load audit log"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [filter]);

  const loadMore = async () => {
    if (loadingMore || pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/audit-logs`, { params: { action: filter, page: pagination.page + 1, limit: 50 } });
      setLogs((current) => [...current, ...(data.logs || [])]); setPagination(data.pagination);
    } catch { toast.error("Could not load more audit entries"); } finally { setLoadingMore(false); }
  };

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Traceability"
        title="Audit log"
        description="A trace of sensitive account, event, team, and selection actions."
        actions={
          <Input
            aria-label="Filter by action"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter action, e.g. application"
            className="w-full sm:w-64"
          />
        }
      />

      <div className="mt-8">
        {loading ? (
          <div className="card divide-y divide-line">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No matching entries"
            description={
              filter
                ? "No audit entries match that action filter."
                : "Nothing has been recorded yet."
            }
          />
        ) : (
          <>
            {/* A timeline rail rather than a plain list — easier to scan. */}
            <ol className="card divide-y divide-line overflow-hidden">
              {logs.map((log) => (
                <li
                  key={log._id}
                  className="grid gap-3 p-4 transition-colors duration-200 hover:bg-paper sm:grid-cols-[1.2fr_1fr_1.4fr] sm:items-start"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${actionAccent(log.action)}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{log.action}</p>
                      <time className="tabular mt-0.5 block text-xs text-ink-3">
                        {formatDateTime(log.createdAt)}
                      </time>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="eyebrow">Actor</p>
                    <p className="mt-1 font-medium capitalize">{log.actorRole || "system"}</p>
                    <p className="break-all text-xs text-ink-3">{log.actorId || "—"}</p>
                  </div>

                  <div className="text-sm">
                    <p className="eyebrow">Target</p>
                    <p className="mt-1 font-medium capitalize">{log.targetType || "—"}</p>
                    <p className="break-all text-xs text-ink-3">{log.targetId || "—"}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3" role="status">Showing <span className="tabular font-semibold text-ink">{logs.length}</span> of <span className="tabular font-semibold text-ink">{pagination.total}</span> entries.</p>{pagination.page < pagination.pages && <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more</Button>}</div>
          </>
        )}
      </div>
    </Page>
  );
}
