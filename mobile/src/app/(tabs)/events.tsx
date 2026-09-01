import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { EventCard } from '@/components/catalogue';
import { Button, EmptyState, ErrorState, Eyebrow, FilterChip, Heading, ListScreen, LoadingState, SearchField } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { eventDeadline, eventIsOngoing, titleCase } from '@/lib/date';
import type { DiscovrEvent } from '@/types/api';

type StatusFilter = 'ongoing' | 'completed' | 'all';
type SortFilter = 'deadline' | 'newest' | 'title';

function listedAt(event: DiscovrEvent) {
  if (event.publishedAt || event.createdAt) return new Date(event.publishedAt || event.createdAt || 0).getTime();
  return /^[a-f\d]{24}$/i.test(event._id) ? Number.parseInt(event._id.slice(0, 8), 16) * 1000 : 0;
}

export default function EventsScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ongoing');
  const [category, setCategory] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [sortBy, setSortBy] = useState<SortFilter>('deadline');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 320);
  const queryPath = `/student/getEvents?limit=24&status=${status}&sort=${sortBy}${debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : ''}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}${eventType !== 'all' ? `&eventType=${encodeURIComponent(eventType)}` : ''}`;
  const query = useApiQuery<{ success: boolean; events: DiscovrEvent[]; pagination?: { page: number; pages: number; hasMore: boolean; total: number } }>(queryPath, 'events');
  const events = useMemo(() => query.data?.events || [], [query.data]);

  const categories = useMemo(() => [...new Set(['cultural', 'technical', 'departmental', 'others', ...events.map((event) => event.clubId?.category).filter((value): value is string => Boolean(value))])], [events]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !term || `${event.title} ${event.shortDescription || ''} ${event.eligibility || ''} ${event.clubId?.name || ''}`.toLowerCase().includes(term);
      if (!matchesSearch || (category !== 'all' && event.clubId?.category !== category) || (eventType !== 'all' && event.eventType !== eventType)) return false;
      const ongoing = eventIsOngoing(event);
      return status === 'all' || (status === 'ongoing' ? ongoing : event.status === 'closed');
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'newest') return listedAt(b) - listedAt(a);
      return (eventDeadline(a)?.getTime() || Number.MAX_SAFE_INTEGER) - (eventDeadline(b)?.getTime() || Number.MAX_SAFE_INTEGER);
    });
  }, [category, eventType, events, search, sortBy, status]);
  const searchSettled = debouncedSearch === search.trim();
  const resultCount = searchSettled ? query.data?.pagination?.total ?? visible.length : visible.length;

  const activeFilters = status !== 'ongoing' || category !== 'all' || eventType !== 'all' || sortBy !== 'deadline';
  function clearFilters() { setSearch(''); setStatus('ongoing'); setCategory('all'); setEventType('all'); setSortBy('deadline'); }

  return <ListScreen
    data={query.loading ? [] : visible}
    keyExtractor={(event) => event._id}
    renderItem={({ item }) => <EventCard event={item} />}
    refreshing={query.refreshing}
    onRefresh={query.refresh}
    onEndReached={query.hasMore ? () => void query.loadMore() : undefined}
    contentStyle={styles.content}
    header={<>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Recruitment</Eyebrow><Heading size="xl">Events</Heading><Text style={styles.copy}>Apply while registration is open and follow every selection stage from one place.</Text></View>
    <View style={styles.searchArea}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search events, clubs, or eligibility…" />
      <View style={styles.filterControls}>
        <Pressable onPress={() => setFiltersOpen((value) => !value)} style={[styles.filterButton, filtersOpen && styles.filterButtonActive]}>
          <Ionicons name="options-outline" size={18} color={filtersOpen ? palette.white : palette.ink} /><Text style={[styles.filterButtonText, filtersOpen && styles.filterButtonTextActive]}>Filters{activeFilters ? ' · On' : ''}</Text>
        </Pressable>
        {(activeFilters || search) ? <Pressable onPress={clearFilters}><Text style={styles.clear}>Clear</Text></Pressable> : null}
        <Text accessibilityLiveRegion="polite" style={styles.count}>{resultCount} {resultCount === 1 ? 'event' : 'events'}</Text>
      </View>
      {filtersOpen ? <View style={styles.filters}>
        <ChipRow label="Status" values={[['ongoing', 'Ongoing'], ['completed', 'Completed'], ['all', 'All']]} selected={status} onSelect={(value) => setStatus(value as StatusFilter)} />
        <ChipRow label="Club type" values={[['all', 'All'], ...categories.map((value) => [value, titleCase(value)] as [string, string])]} selected={category} onSelect={setCategory} />
        <ChipRow label="Event type" values={[['all', 'All'], ['recruitment', 'Recruitment'], ['competition', 'Competition'], ['hackathon', 'Hackathon'], ['other', 'Other']]} selected={eventType} onSelect={setEventType} />
        <ChipRow label="Sort" values={[['deadline', 'Deadline'], ['newest', 'Recently listed'], ['title', 'A–Z']]} selected={sortBy} onSelect={(value) => setSortBy(value as SortFilter)} />
      </View> : null}
    </View>
    </>}
    empty={query.loading ? <LoadingState /> : query.error && !events.length ? <ErrorState message={query.error} onRetry={query.reload} /> : <EmptyState title="No matching events" message="Try a different search or widen the filters." />}
    footer={query.loadingMore ? <LoadingState label="Loading more events…" /> : query.hasMore ? <Button label="Load more events" variant="secondary" onPress={() => void query.loadMore()} /> : null}
  />;
}

function ChipRow({ label, values, selected, onSelect }: { label: string; values: [string, string][]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.chipSection}><Text style={styles.chipLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{values.map(([value, title]) => <FilterChip key={value} label={title} selected={selected === value} onPress={() => onSelect(value)} />)}</ScrollView></View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  searchArea: { gap: spacing.md }, filterControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  filterButton: { minHeight: 40, borderRadius: radius.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterButtonActive: { backgroundColor: palette.accent, borderColor: palette.accentDark }, filterButtonText: { color: palette.ink, fontFamily: typography.semibold, fontSize: 13 }, filterButtonTextActive: { color: palette.white },
  clear: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13 }, count: { marginLeft: 'auto', color: palette.muted, fontFamily: typography.mono, fontSize: 10 },
  filters: { borderRadius: radius.md, paddingVertical: spacing.lg, gap: spacing.lg, backgroundColor: palette.paperRaised, borderWidth: 1, borderColor: palette.line },
  chipSection: { gap: spacing.sm }, chipLabel: { paddingHorizontal: spacing.lg, color: palette.muted, fontFamily: typography.mono, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase' }, chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  list: { gap: spacing.xl },
});
