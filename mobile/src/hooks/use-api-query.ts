import { useCallback, useEffect, useState } from 'react';
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

  const load = useCallback(async (refresh = false) => {
    if (!path) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setData(await apiRequest<T>(path));
      setLoadedAt(Date.now());
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load this page'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [path]);

  const loadMore = useCallback(async () => {
    if (!path || !collectionKey || loadingMore) return;
    const pagination = data?.pagination as Pagination | undefined;
    if (!pagination || !(pagination.hasMore ?? pagination.page < pagination.pages)) return;
    setLoadingMore(true);
    try {
      const next = await apiRequest<T>(pagePath(path, pagination.page + 1));
      setData((current) => current ? ({
        ...next,
        [collectionKey]: [
          ...((current[collectionKey] as unknown[] | undefined) || []),
          ...((next[collectionKey] as unknown[] | undefined) || []),
        ],
      } as T) : next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load more results');
    } finally { setLoadingMore(false); }
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
