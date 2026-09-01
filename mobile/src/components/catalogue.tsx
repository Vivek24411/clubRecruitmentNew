import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ArtworkImage, Badge, Card, MetaRow, PressableScale, RemoteImage } from '@/components/ui';
import { palette, radius, shadowLift, spacing, typography } from '@/constants/theme';
import { eventApplicationsOpen, eventDeadline, eventLifecycle, formatDateOnly, formatSessionDate, sessionTiming, titleCase } from '@/lib/date';
import type { Club, DiscovrEvent, Session } from '@/types/api';

export function EventCard({ event }: { event: DiscovrEvent }) {
  const deadline = eventDeadline(event);
  const applicationsOpen = eventApplicationsOpen(event);
  const lifecycle = eventLifecycle(event);
  const applied = event.hasApplied || Boolean(event.application) || Boolean(event.applications?.length);
  const rounds = event.verticalsEnabled ? event.verticals?.length : event.verticals?.[0]?.rounds?.length || event.rounds?.length || event.numberOfRounds;
  return (
    <PressableScale accessibilityLabel={`Open ${event.title}`} onPress={() => router.push({ pathname: '/event/[id]', params: { id: event._id } })}>
      <Card>
        <View style={styles.media}>
          <ArtworkImage uri={event.eventBanner || event.clubId?.clubBanner} fallbackText={event.title} accessibilityLabel={`${event.title} banner`} style={styles.banner} />
          <View style={styles.mediaBadge}><Badge tone={lifecycle.tone}>{lifecycle.label}</Badge></View>
        </View>
        <View style={styles.body}>
          <View style={styles.row}><Badge tone="accent">{titleCase(event.eventType || 'event')}</Badge>{applied ? <Badge tone="success">Applied</Badge> : null}</View>
          <Text style={styles.club}>{event.clubId?.name || 'Discovr club'}</Text>
          <Text style={styles.title}>{event.title}</Text>
          {event.shortDescription ? <Text style={styles.description} numberOfLines={2}>{event.shortDescription}</Text> : null}
          <View style={styles.eventDetails}>
            <Detail label="Registration closes" value={deadline ? formatDateOnly(deadline) : 'Not set'} muted={!applicationsOpen} />
            <Detail label="Team size" value={event.registrationType === 'individual' ? 'Individual' : `${event.minTeamSize || 1}–${event.maxTeamSize || 1}`} />
            <Detail label={event.verticalsEnabled ? 'Verticals' : 'Rounds'} value={rounds ? String(rounds) : '—'} />
          </View>
          <View style={styles.cardAction}><Text style={styles.cardActionText}>{applicationsOpen && !applied ? 'Apply now' : 'View details'}</Text><Ionicons name="arrow-forward" size={16} color={palette.accentDark} /></View>
        </View>
      </Card>
    </PressableScale>
  );
}

export function SessionCard({ session }: { session: Session }) {
  const timing = sessionTiming(session);
  return (
    <PressableScale accessibilityLabel={`Open ${session.title}`} onPress={() => router.push({ pathname: '/session/[id]', params: { id: session._id } })}>
      <Card>
        <View style={styles.media}>
          <ArtworkImage uri={session.sessionThumbnail || session.clubId?.clubBanner} fallbackText={session.title} accessibilityLabel={`${session.title} banner`} style={styles.banner} />
          <View style={styles.mediaBadge}><Badge tone={timing === 'past' ? 'neutral' : timing === 'ongoing' ? 'success' : 'info'}>{timing === 'past' ? 'Past' : timing === 'ongoing' ? 'Live' : timing === 'tba' ? 'TBA' : 'Upcoming'}</Badge></View>
        </View>
        <View style={styles.body}>
          <Text style={styles.club}>{session.clubId?.name || 'Discovr club'}</Text>
          <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
          <MetaRow icon="calendar-outline">{formatSessionDate(session)}</MetaRow>
          {session.venue ? <MetaRow icon="location-outline">{session.venue}</MetaRow> : null}
          <View style={styles.cardAction}><Text style={styles.cardActionText}>View session</Text><Ionicons name="arrow-forward" size={16} color={palette.accentDark} /></View>
        </View>
      </Card>
    </PressableScale>
  );
}

export function ClubCard({ club }: { club: Club }) {
  return (
    <PressableScale accessibilityLabel={`Open ${club.name}`} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club._id } })}>
      <Card style={styles.clubCard}>
        <ArtworkImage uri={club.clubBanner} fallbackText={club.name} accessibilityLabel={`${club.name} banner`} style={styles.clubBanner} />
        <View style={styles.clubIdentity}><View style={styles.logoFrame}><RemoteImage uri={club.clubLogo} fallbackText={club.name} contain style={styles.logo} /></View><Badge tone="info">{titleCase(club.category || 'club')}</Badge></View>
        <View style={styles.clubBody}>
          <Text style={styles.title}>{club.name}</Text>
          {club.shortDescription ? <Text style={styles.description} numberOfLines={3}>{club.shortDescription}</Text> : null}
          <View style={styles.cardAction}><Text style={styles.cardActionText}>View club</Text><Ionicons name="arrow-forward" size={16} color={palette.accentDark} /></View>
        </View>
      </Card>
    </PressableScale>
  );
}

export function RecruitingClubCard({ club }: { club: Club }) {
  return <PressableScale style={styles.recruitingShell} accessibilityLabel={`Open recruiting club ${club.name}`} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club._id } })}>
    <Card style={styles.recruitingCard}>
      <ArtworkImage uri={club.clubBanner} fallbackText={club.name} style={styles.recruitingBanner} />
      <View style={styles.recruitingBody}>
        <View style={styles.recruitingHeader}><View style={styles.recruitingLogoFrame}><RemoteImage uri={club.clubLogo} fallbackText={club.name} contain style={styles.logo} /></View><Badge tone="success">Recruiting</Badge></View>
        <Text style={styles.recruitingTitle} numberOfLines={2}>{club.name}</Text>
        <Text style={styles.recruitingCategory}>{titleCase(club.category || 'student club')}</Text>
      </View>
    </Card>
  </PressableScale>;
}

function Detail({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={[styles.detailValue, muted && styles.detailMuted]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  media: { position: 'relative' }, mediaBadge: { position: 'absolute', right: spacing.md, top: spacing.md }, banner: { width: '100%', aspectRatio: 1 }, body: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  club: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.85 },
  title: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3 }, description: { color: palette.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 20 },
  eventDetails: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.sm, gap: 7 }, detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  detailLabel: { color: palette.muted, fontFamily: typography.regular, fontSize: 12.5 }, detailValue: { color: palette.ink, fontFamily: typography.medium, fontSize: 12.5, textAlign: 'right' }, detailMuted: { color: palette.faint },
  cardAction: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }, cardActionText: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13.5 },
  clubCard: { position: 'relative' }, clubBanner: { width: '100%', aspectRatio: 8 / 3 }, clubIdentity: { marginTop: -30, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  logoFrame: { width: 74, height: 74, borderRadius: radius.md, padding: 6, backgroundColor: palette.white, borderWidth: 3, borderColor: palette.surface, overflow: 'hidden', ...shadowLift }, logo: { width: '100%', height: '100%', borderRadius: radius.sm }, clubBody: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  recruitingShell: { width: 190 }, recruitingCard: { minHeight: 250 }, recruitingBanner: { width: '100%', aspectRatio: 8 / 3 }, recruitingBody: { flex: 1, padding: spacing.md, gap: 6 },
  recruitingHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }, recruitingLogoFrame: { width: 48, height: 48, marginTop: -35, borderRadius: radius.md, padding: 4, backgroundColor: palette.white, borderWidth: 2, borderColor: palette.surface, overflow: 'hidden' },
  recruitingTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 16, lineHeight: 20 }, recruitingCategory: { color: palette.muted, fontFamily: typography.mono, fontSize: 9, letterSpacing: 0.65, textTransform: 'uppercase' },
});
