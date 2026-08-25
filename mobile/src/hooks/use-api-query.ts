import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

export function useApiQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

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

  useEffect(() => {
    const handle = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(handle);
  }, [load]);
  return { data, error, loading, refreshing, loadedAt, reload: () => load(false), refresh: () => load(true) };
}
