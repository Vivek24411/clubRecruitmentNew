import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ClubCard } from '@/components/catalogue';
import { Button, EmptyState, ErrorState, Eyebrow, FilterChip, Heading, ListScreen, LoadingState, SearchField } from '@/components/ui';
import { palette, spacing, typography } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { titleCase } from '@/lib/date';
import type { Club } from '@/types/api';

type ClubCatalogueResponse = {
  success: boolean;
  clubs: Club[];
  pagination?: { page: number; pages: number; hasMore: boolean; total: number };
  facets?: { total: number; categories: { value: string; count: number }[] };
};

const preferredCategories = ['cultural', 'technical', 'departmental', 'others'];

export default function ClubsScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const debouncedSearch = useDebouncedValue(search.trim(), 320);
  const queryPath = `/student/getAllClubs?limit=24${debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : ''}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}`;
  const query = useApiQuery<ClubCatalogueResponse>(queryPath, 'clubs');
  const clubs = useMemo(() => query.data?.clubs || [], [query.data]);
  const categories = useMemo(() => {
    const counts = query.data?.facets?.categories || [...new Set(clubs.map((club) => club.category).filter((value): value is string => Boolean(value)))].map((value) => ({ value, count: clubs.filter((club) => club.category === value).length }));
    return [...counts].sort((a, b) => {
      const left = preferredCategories.indexOf(a.value);
      const right = preferredCategories.indexOf(b.value);
      return (left < 0 ? Number.MAX_SAFE_INTEGER : left) - (right < 0 ? Number.MAX_SAFE_INTEGER : right) || a.value.localeCompare(b.value);
    });
  }, [clubs, query.data?.facets?.categories]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clubs.filter((club) => (category === 'all' || club.category === category)
      && (!term || `${club.name} ${club.shortDescription || ''} ${club.longDescription || ''} ${club.category || ''}`.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [category, clubs, search]);
  const resultCount = query.data?.pagination?.total ?? visible.length;
  const directoryCount = query.data?.facets?.total ?? resultCount;

  return <ListScreen
    data={query.loading && !clubs.length ? [] : visible}
    keyExtractor={(club) => club._id}
    renderItem={({ item }) => <ClubCard club={item} />}
    refreshing={query.refreshing}
    onRefresh={query.refresh}
    onEndReached={query.hasMore ? () => void query.loadMore() : undefined}
    contentStyle={styles.content}
    header={<>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Campus directory</Eyebrow><Heading size="xl">Clubs</Heading><Text style={styles.copy}>Discover cultural, technical, sports, and student communities across IIT Roorkee.</Text></View>
    <View style={styles.filters}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search clubs and societies…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label={`All · ${directoryCount}`} selected={category === 'all'} onPress={() => setCategory('all')} />
        {categories.map(({ value, count }) => <FilterChip key={value} label={`${titleCase(value)} · ${count}`} selected={category === value} onPress={() => setCategory(value)} />)}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{resultCount} {resultCount === 1 ? 'club' : 'clubs'} found</Text>
    </View>
    </>}
    empty={query.loading ? <LoadingState /> : query.error && !clubs.length ? <ErrorState message={query.error} onRetry={query.reload} /> : <EmptyState title="No matching clubs" message="Try another name, keyword, or category." />}
    footer={query.loadingMore ? <LoadingState label="Loading more clubs…" /> : query.hasMore ? <Button label="Load more clubs" variant="secondary" onPress={() => void query.loadMore()} /> : null}
  />;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  filters: { gap: spacing.md }, chips: { gap: spacing.sm }, count: { color: palette.muted, fontFamily: typography.mono, fontSize: 10 },
});
