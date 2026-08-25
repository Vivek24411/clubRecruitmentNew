import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ClubCard } from '@/components/catalogue';
import { EmptyState, ErrorState, Eyebrow, FilterChip, Heading, LoadingState, Screen, SearchField } from '@/components/ui';
import { palette, spacing, typography } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { titleCase } from '@/lib/date';
import type { Club } from '@/types/api';

export default function ClubsScreen() {
  const query = useApiQuery<{ success: boolean; clubs: Club[] }>('/student/getAllClubs');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const clubs = useMemo(() => query.data?.clubs || [], [query.data]);
  const categories = useMemo(() => [...new Set(clubs.map((club) => club.category).filter((value): value is string => Boolean(value)))].sort(), [clubs]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clubs.filter((club) => (category === 'all' || club.category === category)
      && (!term || `${club.name} ${club.shortDescription || ''} ${club.longDescription || ''} ${club.category || ''}`.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [category, clubs, search]);

  return <Screen refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Campus directory</Eyebrow><Heading size="xl">Clubs</Heading><Text style={styles.copy}>Discover cultural, technical, sports, and student communities across IIT Roorkee.</Text></View>
    <View style={styles.filters}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search clubs and societies…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
        {categories.map((value) => <FilterChip key={value} label={titleCase(value)} selected={category === value} onPress={() => setCategory(value)} />)}
      </ScrollView>
      <Text style={styles.count}>{visible.length} {visible.length === 1 ? 'club' : 'clubs'}</Text>
    </View>
    {query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : !visible.length ? <EmptyState title="No matching clubs" message="Try another name, keyword, or category." /> : <View style={styles.list}>{visible.map((club) => <ClubCard key={club._id} club={club} />)}</View>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  filters: { gap: spacing.md }, chips: { gap: spacing.sm }, count: { color: palette.muted, fontFamily: typography.mono, fontSize: 10 }, list: { gap: spacing.xl },
});
