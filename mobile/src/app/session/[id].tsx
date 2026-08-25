import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, ErrorState, Heading, LoadingState, MetaRow, RemoteImage, Screen } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatSessionDate, sessionEnd, sessionTiming } from '@/lib/date';
import type { Session, SessionRsvp } from '@/types/api';

function safeWebUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { confirm, toast } = useFeedback();
  const [working, setWorking] = useState(false);
  const sessionQuery = useApiQuery<{ success: boolean; session: Session }>(id ? `/student/getSession?sessionId=${encodeURIComponent(id)}` : null);
  const rsvpQuery = useApiQuery<{ success: boolean; rsvp: SessionRsvp | null }>(profile && id ? `/student/sessionRsvp?sessionId=${encodeURIComponent(id)}` : null);
  const session = sessionQuery.data?.session;
  const rsvp = rsvpQuery.data?.rsvp;
  const activeRsvp = rsvp?.status === 'confirmed' || rsvp?.status === 'waitlisted';
  const timing = session ? sessionTiming(session) : 'tba';
  const durationMinutes = Number(session?.duration) || 0;
  const endsAt = session ? sessionEnd(session) : null;
  const isPast = timing === 'past';
  const isOngoing = timing === 'ongoing';
  const placesLeft = session?.capacity ? Math.max(session.capacity - (session.confirmedRsvpCount || 0), 0) : null;
  const meetingUrl = safeWebUrl(session?.meetingUrl);

  async function updateRsvp() {
    if (!profile) {
      router.push('/login');
      return;
    }
    if (!id) return;
    if (activeRsvp) {
      const accepted = await confirm({ title: 'Cancel this RSVP?', message: 'Your place may be offered to another student.', confirmLabel: 'Cancel RSVP', destructive: true });
      if (!accepted) return;
    }
    setWorking(true);
    try {
      await apiRequest(activeRsvp ? '/student/sessionRsvp/cancel' : '/student/sessionRsvp', {
        method: 'POST', body: { sessionId: id },
      });
      await Promise.all([rsvpQuery.reload(), sessionQuery.reload()]);
      toast(activeRsvp ? 'Your RSVP has been cancelled.' : placesLeft === 0 ? 'You joined the waitlist.' : 'Your place is reserved.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update RSVP. Please try again.', 'error');
    } finally {
      setWorking(false);
    }
  }

  return <Screen safeTop={false} refreshing={sessionQuery.refreshing} onRefresh={sessionQuery.refresh} contentStyle={styles.content}>
    {sessionQuery.loading ? <LoadingState /> : sessionQuery.error || !session ? <ErrorState message={sessionQuery.error || 'Session not found'} onRetry={sessionQuery.reload} /> : <>
      <RemoteImage uri={session.sessionThumbnail || session.clubId?.clubBanner} style={styles.heroImage} />
      <View style={styles.titleBlock}>
        <View style={styles.badges}><Badge tone={isPast ? 'neutral' : 'success'}>{isPast ? 'Past session' : isOngoing ? 'Live now' : timing === 'tba' ? 'Schedule TBA' : 'Upcoming'}</Badge>{rsvp?.status ? <Badge tone="info">{rsvp.status}</Badge> : null}</View>
        <Text style={styles.club}>{session.clubId?.name}</Text>
        <Heading size="xl">{session.title}</Heading>
        {session.shortDescription ? <Text style={styles.lead}>{session.shortDescription}</Text> : null}
      </View>
      <Card style={styles.metaCard}>
        <MetaRow icon="calendar-outline">Starts {formatSessionDate(session)}</MetaRow>
        {endsAt ? <MetaRow icon="time-outline">Ends {formatDateTime(endsAt)}</MetaRow> : null}
        <MetaRow icon="time-outline">{durationMinutes ? `${durationMinutes} minutes` : 'Duration to be announced'}</MetaRow>
        <MetaRow icon="location-outline">{session.venue || (meetingUrl ? 'Online' : 'Venue to be announced')}</MetaRow>
        <MetaRow icon="people-outline">{placesLeft === null ? 'Open attendance' : placesLeft > 0 ? `${placesLeft} places left` : 'Waitlist only'}</MetaRow>
        {session.capacity ? <View style={styles.capacity}><View style={styles.capacityLabels}><Text style={styles.capacityLabel}>Seats filled</Text><Text style={styles.capacityValue}>{session.confirmedRsvpCount || 0}/{session.capacity}</Text></View><View style={styles.capacityTrack}><View style={[styles.capacityFill, { width: `${Math.min(100, ((session.confirmedRsvpCount || 0) / session.capacity) * 100)}%` }]} /></View></View> : null}
      </Card>
      <View style={styles.section}><Text style={styles.sectionTitle}>About this session</Text><Text style={styles.body}>{session.longDescription || 'No additional description was provided by the club.'}</Text></View>
      {meetingUrl ? <Button label="Open meeting link" variant="secondary" icon="videocam-outline" onPress={() => Linking.openURL(meetingUrl)} /> : null}
      <Card style={styles.rsvpCard}><Text style={styles.rsvpTitle}>{profile ? 'Your RSVP' : 'Reserve a place'}</Text><Text style={styles.body}>{isPast ? 'This session has ended.' : isOngoing ? activeRsvp ? 'The session is live and your place is reserved.' : 'The session is live. You can still reserve before it ends.' : activeRsvp ? 'Your place is reserved. Updates will appear in Alerts.' : placesLeft === 0 ? 'The room is full; reserving now adds you to the waitlist.' : 'Reserve a seat and receive schedule updates.'}</Text><Button label={!profile ? 'Sign in to reserve' : activeRsvp ? 'Cancel RSVP' : isPast ? 'Session has ended' : placesLeft === 0 ? 'Join waitlist' : 'Reserve a place'} variant={activeRsvp ? 'secondary' : 'primary'} loading={working || rsvpQuery.loading} disabled={Boolean(profile && isPast && !activeRsvp)} onPress={updateRsvp} /></Card>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg }, heroImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: palette.ink }, titleBlock: { gap: spacing.md },
  badges: { flexDirection: 'row', gap: spacing.sm }, club: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.85 },
  lead: { color: palette.muted, fontFamily: typography.regular, fontSize: 16, lineHeight: 24 }, metaCard: { padding: spacing.lg, gap: spacing.md }, section: { gap: spacing.md },
  sectionTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 19 }, body: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 14, lineHeight: 22 },
  capacity: { marginTop: spacing.xs, gap: spacing.sm }, capacityLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, capacityLabel: { color: palette.muted, fontFamily: typography.regular, fontSize: 12 }, capacityValue: { color: palette.ink, fontFamily: typography.mono, fontSize: 10 }, capacityTrack: { height: 7, borderRadius: 4, backgroundColor: palette.line, overflow: 'hidden' }, capacityFill: { height: '100%', borderRadius: 4, backgroundColor: palette.accent },
  rsvpCard: { padding: spacing.lg, gap: spacing.md, borderTopWidth: 3, borderTopColor: palette.accent }, rsvpTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18 },
});
