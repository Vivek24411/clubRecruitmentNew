import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Badge, Button, Card, EmptyState, ErrorState, Eyebrow, Heading, LoadingState, Screen } from '@/components/ui';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { formatDateTime } from '@/lib/date';
import type { CalendarItem, CalendarResponse } from '@/types/api';

function dateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let day = 1; day <= total; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function googleCalendarUrl(item: CalendarItem) {
  const compact = (value: string) => new Date(value).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: item.title, dates: `${compact(item.startsAt)}/${compact(item.endsAt || item.startsAt)}`, details: 'Added from Discovr', location: item.venue || '' });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const typeLabel: Record<string, string> = { registration_deadline: 'Registration', submission_deadline: 'Submission', interview: 'Interview', session: 'Session', round_start: 'Round', round: 'Round' };

export default function CalendarScreen() {
  const { profile } = useAuth();
  const query = useApiQuery<CalendarResponse>(profile ? '/student/calendar' : null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const items = useMemo(() => query.data?.items || [], [query.data]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = dateKey(item.startsAt);
      map.set(key, [...(map.get(key) || []), item]);
    }
    return map;
  }, [items]);
  const selectedItems = byDay.get(selected) || [];

  if (!profile) return <Screen contentStyle={styles.content}><AppHeader /><View style={styles.intro}><Eyebrow accent>Your schedule</Eyebrow><Heading size="xl">Calendar</Heading></View><EmptyState title="Sign in to see your calendar" message="Applications, interviews, deadlines, and reserved sessions will appear together here." /><Button label="Student sign in" icon="log-in-outline" onPress={() => router.push('/login')} /></Screen>;

  return <Screen refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Your schedule</Eyebrow><Heading size="xl">Calendar</Heading><Text style={styles.copy}>Important dates in one place, with a reminder two hours before.</Text></View>
    {query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : <>
      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={22} color={palette.ink} /></Pressable>
          <Text accessibilityRole="header" style={styles.monthTitle}>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={22} color={palette.ink} /></Pressable>
        </View>
        <View style={styles.week}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.grid}>{monthCells(month).map((day, index) => {
          if (!day) return <View key={`blank-${index}`} style={styles.day} />;
          const key = dateKey(day);
          const dayItems = byDay.get(key) || [];
          const active = selected === key;
          const today = key === dateKey(new Date());
          return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${day.toLocaleDateString('en-IN', { dateStyle: 'full' })}, ${dayItems.length} calendar items`} onPress={() => setSelected(key)} style={[styles.day, active && styles.dayActive]}><Text style={[styles.dayText, today && styles.todayText, active && styles.dayTextActive]}>{day.getDate()}</Text>{dayItems.length ? <View style={styles.dots}>{dayItems.slice(0, 3).map((item) => <View key={item.id} style={[styles.dot, active && styles.dotActive]} />)}</View> : null}</Pressable>;
        })}</View>
      </Card>
      <View style={styles.agenda}>
        <View style={styles.agendaHeader}><View><Eyebrow accent>Selected day</Eyebrow><Text accessibilityRole="header" style={styles.agendaTitle}>{new Date(`${selected}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</Text></View><Badge tone="info">{selectedItems.length}</Badge></View>
        {!selectedItems.length ? <EmptyState title="Nothing scheduled" message="Choose a highlighted day or add an event or session to your calendar." /> : selectedItems.map((item) => <AgendaItem key={item.id} item={item} />)}
      </View>
    </>}
  </Screen>;
}

function AgendaItem({ item }: { item: CalendarItem }) {
  return <Card style={styles.item}>
    <View style={styles.itemTop}><Badge tone={item.type === 'interview' ? 'warning' : item.type === 'session' ? 'info' : 'accent'}>{typeLabel[item.type] || 'Important'}</Badge><Text style={styles.time}>{formatDateTime(item.startsAt)}</Text></View>
    <Text accessibilityRole="header" style={styles.itemTitle}>{item.title}</Text>
    {item.clubName || item.venue ? <Text style={styles.meta}>{[item.clubName, item.venue].filter(Boolean).join(' · ')}</Text> : null}
    <View style={styles.actions}><Button label="Open details" variant="secondary" icon="arrow-forward-outline" onPress={() => router.push(item.link as never)} /><Button label="Google Calendar" variant="ghost" icon="open-outline" onPress={() => Linking.openURL(googleCalendarUrl(item))} /></View>
  </Card>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  calendarCard: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, ...shadow }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18 },
  week: { flexDirection: 'row' }, weekday: { width: `${100 / 7}%`, color: palette.muted, fontFamily: typography.mono, fontSize: 9, textAlign: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, gap: 5 }, dayActive: { backgroundColor: palette.accent }, dayText: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 13 }, dayTextActive: { color: palette.white }, todayText: { color: palette.accentDark, fontFamily: typography.bold }, dots: { flexDirection: 'row', gap: 2 }, dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.accent }, dotActive: { backgroundColor: palette.white },
  agenda: { gap: spacing.md }, agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, agendaTitle: { marginTop: 3, color: palette.ink, fontFamily: typography.semibold, fontSize: 20 }, item: { padding: spacing.lg, gap: spacing.md, borderLeftWidth: 3, borderLeftColor: palette.accent }, itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, time: { color: palette.muted, fontFamily: typography.mono, fontSize: 9 }, itemTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 16, lineHeight: 21 }, meta: { color: palette.muted, fontFamily: typography.regular, fontSize: 12 }, actions: { gap: spacing.sm },
});
