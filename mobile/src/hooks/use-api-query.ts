import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Pagination = { page: number; pages: number; hasMore?: boolean };

function pagePath(path: string, page: number) {
  if (/([?&])page=\d+/.test(path)) return path.replace(/([?&])page=\d+/, `$1page=${page}`);
  return `${path}${path.includes('?') ? '&' : '?'}page=${page}`;
}

export function useApiQuery<T extends Record<string, unknown>>(path: string | null, collectionKey?: keyof T) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (!path) return;
    const activeRequest = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const next = await apiRequest<T>(path);
      if (requestId.current !== activeRequest) return;
      setData(next);
      setLoadedAt(Date.now());
    }
    catch (caught) {
      if (requestId.current === activeRequest) setError(caught instanceof Error ? caught.message : 'Unable to load this page');
    }
    finally {
      if (requestId.current === activeRequest) { setLoading(false); setRefreshing(false); }
    }
  }, [path]);

  const loadMore = useCallback(async () => {
    if (!path || !collectionKey || loadingMore) return;
    const pagination = data?.pagination as Pagination | undefined;
    if (!pagination || !(pagination.hasMore ?? pagination.page < pagination.pages)) return;
    const activeRequest = ++requestId.current;
    setLoadingMore(true);
    try {
      const next = await apiRequest<T>(pagePath(path, pagination.page + 1));
      if (requestId.current !== activeRequest) return;
      setData((current) => current ? ({
        ...next,
        [collectionKey]: [
          ...((current[collectionKey] as unknown[] | undefined) || []),
          ...((next[collectionKey] as unknown[] | undefined) || []),
        ],
      } as T) : next);
    } catch (caught) {
      if (requestId.current === activeRequest) setError(caught instanceof Error ? caught.message : 'Unable to load more results');
    } finally {
      if (requestId.current === activeRequest) setLoadingMore(false);
    }
  }, [collectionKey, data, loadingMore, path]);

  useEffect(() => {
    const handle = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(handle);
  }, [load]);
  const pagination = data?.pagination as Pagination | undefined;
  return {
    data, error, loading, refreshing, loadingMore, loadedAt,
    hasMore: Boolean(pagination && (pagination.hasMore ?? pagination.page < pagination.pages)),
    loadMore,
    reload: () => load(false), refresh: () => load(true),
  };
}
