import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { EventCard, SessionCard } from '@/components/catalogue';
import { Button, EmptyState, ErrorState, Heading, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { palette, radius, shadowLift, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { sessionStart, sessionTiming } from '@/lib/date';
import type { DashboardResponse } from '@/types/api';

export default function HomeScreen() {
  const { profile } = useAuth();
  const query = useApiQuery<DashboardResponse>('/student/getDashboard');
  const upcomingSessions = (query.data?.sessions || []).filter((session) => sessionTiming(session) !== 'past')
    .sort((a, b) => (sessionStart(a)?.getTime() || Number.MAX_SAFE_INTEGER) - (sessionStart(b)?.getTime() || Number.MAX_SAFE_INTEGER));
  return (
    <Screen refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
      <AppHeader />
      <LinearGradient colors={[palette.ink, '#18241F']} start={{ x: 0.05, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.glowLarge} /><View style={styles.glowSmall} />
        <Text style={styles.kicker}>{profile ? `WELCOME BACK, ${profile.name.split(' ')[0].toUpperCase()}` : 'CAMPUS, IN ONE PLACE'}</Text>
        <Heading size="xl" inverse>Find your people.{"\n"}Build what’s next.</Heading>
        <Text style={styles.heroCopy}>Explore IIT Roorkee clubs, recruitment events, workshops, and sessions without missing a deadline.</Text>
        {!profile ? <Button label="Student sign in" onPress={() => router.push('/login')} icon="arrow-forward" /> : <Button label="View applications" onPress={() => router.push('/(tabs)/applications')} icon="clipboard-outline" />}
      </LinearGradient>
      {query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : (
        <>
          <View style={styles.section}>
            <SectionHeader eyebrow="OPEN NOW" title="Events" action={<Pressable onPress={() => router.push('/(tabs)/events')}><Text style={styles.link}>View all</Text></Pressable>} />
            {(query.data?.events || []).slice(0, 3).map((event) => <EventCard key={event._id} event={event} />)}
          </View>
          <View style={styles.section}>
            <SectionHeader eyebrow="UPCOMING" title="Sessions" action={<Pressable onPress={() => router.push('/(tabs)/sessions')}><Text style={styles.link}>View all</Text></Pressable>} />
            {upcomingSessions.length ? upcomingSessions.slice(0, 3).map((session) => <SessionCard key={session._id} session={session} />) : <EmptyState title="No upcoming sessions" message="Past sessions are available from the Sessions tab." />}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md },
  hero: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, ...shadowLift },
  glowLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -95, top: -100, backgroundColor: 'rgba(255,255,255,0.09)' },
  glowSmall: { position: 'absolute', width: 110, height: 110, borderRadius: 55, left: -55, bottom: -62, backgroundColor: 'rgba(255,255,255,0.08)' },
  kicker: { color: '#8FD1F5', fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.15 },
  heroCopy: { color: '#D7DFDA', fontFamily: typography.regular, fontSize: 15, lineHeight: 22, maxWidth: 520 },
  section: { gap: spacing.lg }, link: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13 },
});
