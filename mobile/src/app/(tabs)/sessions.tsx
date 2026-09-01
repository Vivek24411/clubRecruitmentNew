import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { SessionCard } from '@/components/catalogue';
import { Button, EmptyState, ErrorState, Eyebrow, FilterChip, Heading, ListScreen, LoadingState, SearchField } from '@/components/ui';
import { palette, spacing, typography } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { sessionStart, sessionTiming } from '@/lib/date';
import type { Session } from '@/types/api';

type TimingFilter = 'upcoming' | 'past' | 'all';
type SortFilter = 'date' | 'newest';

export default function SessionsScreen() {
  const [search, setSearch] = useState('');
  const [timing, setTiming] = useState<TimingFilter>('upcoming');
  const [sort, setSort] = useState<SortFilter>('date');
  const debouncedSearch = useDebouncedValue(search.trim(), 320);
  const queryPath = `/student/getSessions?limit=24&timing=${timing}&sort=${sort}${debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : ''}`;
  const query = useApiQuery<{ success: boolean; sessions: Session[]; pagination?: { page: number; pages: number; hasMore: boolean; total: number } }>(queryPath, 'sessions');
  const sessions = useMemo(() => query.data?.sessions || [], [query.data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    return sessions.filter((session) => {
      if (term && !`${session.title} ${session.shortDescription || ''} ${session.clubId?.name || ''} ${session.venue || ''}`.toLowerCase().includes(term)) return false;
      const state = sessionTiming(session, now);
      if (timing === 'past') return state === 'past';
      if (timing === 'upcoming') return state !== 'past';
      return true;
    }).sort((a, b) => sort === 'newest'
      ? new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      : (sessionStart(a)?.getTime() || Number.MAX_SAFE_INTEGER) - (sessionStart(b)?.getTime() || Number.MAX_SAFE_INTEGER));
  }, [search, sessions, sort, timing]);
  const searchSettled = debouncedSearch === search.trim();
  const resultCount = searchSettled ? query.data?.pagination?.total ?? visible.length : visible.length;

  return <ListScreen
    data={query.loading ? [] : visible}
    keyExtractor={(session) => session._id}
    renderItem={({ item }) => <SessionCard session={item} />}
    refreshing={query.refreshing}
    onRefresh={query.refresh}
    onEndReached={query.hasMore ? () => void query.loadMore() : undefined}
    contentStyle={styles.content}
    header={<>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Information sessions</Eyebrow><Heading size="xl">Sessions</Heading><Text style={styles.copy}>Reserve your place at talks, workshops, and club introductions.</Text></View>
    <View style={styles.filters}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search sessions, clubs, or venues…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="Upcoming" selected={timing === 'upcoming'} onPress={() => setTiming('upcoming')} />
        <FilterChip label="Past" selected={timing === 'past'} onPress={() => setTiming('past')} />
        <FilterChip label="All" selected={timing === 'all'} onPress={() => setTiming('all')} />
        <View style={styles.divider} />
        <FilterChip label="Session date" selected={sort === 'date'} onPress={() => setSort('date')} />
        <FilterChip label="Recently listed" selected={sort === 'newest'} onPress={() => setSort('newest')} />
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{resultCount} {resultCount === 1 ? 'session' : 'sessions'}</Text>
    </View>
    </>}
    empty={query.loading ? <LoadingState /> : query.error && !sessions.length ? <ErrorState message={query.error} onRetry={query.reload} /> : <EmptyState title={timing === 'upcoming' ? 'No upcoming sessions' : 'No matching sessions'} message={search ? 'Try another session, club, or venue.' : timing === 'upcoming' ? 'Published future sessions will appear here.' : 'There are no sessions in this view.'} />}
    footer={query.loadingMore ? <LoadingState label="Loading more sessions…" /> : query.hasMore ? <Button label="Load more sessions" variant="secondary" onPress={() => void query.loadMore()} /> : null}
  />;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  filters: { gap: spacing.md }, chips: { gap: spacing.sm, alignItems: 'center' }, divider: { width: 1, height: 26, backgroundColor: palette.lineStrong, marginHorizontal: 2 },
  count: { color: palette.muted, fontFamily: typography.mono, fontSize: 10 }, list: { gap: spacing.lg },
});
