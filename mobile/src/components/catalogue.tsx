import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, MetaRow, PressableScale, RemoteImage } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { eventDeadline, eventIsOpen, formatDateOnly, formatSessionDate, sessionTiming, titleCase } from '@/lib/date';
import type { Club, DiscovrEvent, Session } from '@/types/api';

export function EventCard({ event }: { event: DiscovrEvent }) {
  const deadline = eventDeadline(event);
  const open = eventIsOpen(event);
  const applied = event.hasApplied || Boolean(event.application) || Boolean(event.applications?.length);
  const rounds = event.verticalsEnabled ? event.verticals?.length : event.verticals?.[0]?.rounds?.length || event.rounds?.length || event.numberOfRounds;
  return (
    <PressableScale accessibilityLabel={`Open ${event.title}`} onPress={() => router.push({ pathname: '/event/[id]', params: { id: event._id } })}>
      <Card>
        <View style={styles.media}>
          <RemoteImage uri={event.eventBanner || event.clubId?.clubBanner} style={styles.banner} />
          <View style={styles.mediaBadge}><Badge tone={open ? 'success' : 'neutral'}>{open ? 'Open' : 'Closed'}</Badge></View>
        </View>
        <View style={styles.body}>
          <View style={styles.row}><Badge tone="accent">{titleCase(event.eventType || 'event')}</Badge>{applied ? <Badge tone="success">Applied</Badge> : null}</View>
          <Text style={styles.club}>{event.clubId?.name || 'Discovr club'}</Text>
          <Text style={styles.title}>{event.title}</Text>
          {event.shortDescription ? <Text style={styles.description} numberOfLines={2}>{event.shortDescription}</Text> : null}
          <View style={styles.eventDetails}>
            <Detail label="Closes" value={deadline ? formatDateOnly(deadline) : 'Not set'} muted={!open} />
            <Detail label="Team size" value={event.registrationType === 'individual' ? 'Individual' : `${event.minTeamSize || 1}–${event.maxTeamSize || 1}`} />
            <Detail label={event.verticalsEnabled ? 'Verticals' : 'Rounds'} value={rounds ? String(rounds) : '—'} />
          </View>
          <View style={styles.cardAction}><Text style={styles.cardActionText}>{open && !applied ? 'Apply now' : 'View details'}</Text><Text style={styles.cardArrow}>→</Text></View>
        </View>
      </Card>
    </PressableScale>
  );
}

export function SessionCard({ session }: { session: Session }) {
  const timing = sessionTiming(session);
  return (
    <PressableScale accessibilityLabel={`Open ${session.title}`} onPress={() => router.push({ pathname: '/session/[id]', params: { id: session._id } })}>
      <Card style={styles.horizontalCard}>
        <RemoteImage uri={session.sessionThumbnail} style={styles.sessionImage} />
        <View style={styles.horizontalBody}>
          <View style={styles.row}><Text style={styles.club}>{session.clubId?.name || 'Discovr club'}</Text><Badge tone={timing === 'past' ? 'neutral' : timing === 'ongoing' ? 'success' : 'info'}>{timing === 'past' ? 'Past' : timing === 'ongoing' ? 'Live' : timing === 'tba' ? 'TBA' : 'Upcoming'}</Badge></View>
          <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
          <MetaRow icon="calendar-outline">{formatSessionDate(session)}</MetaRow>
          {session.venue ? <MetaRow icon="location-outline">{session.venue}</MetaRow> : null}
        </View>
      </Card>
    </PressableScale>
  );
}

export function ClubCard({ club }: { club: Club }) {
  return (
    <PressableScale accessibilityLabel={`Open ${club.name}`} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club._id } })}>
      <Card style={styles.clubCard}>
        <RemoteImage uri={club.clubBanner} style={styles.clubBanner} />
        <View style={styles.clubIdentity}><RemoteImage uri={club.clubLogo} contain style={styles.logo} /><Badge tone="info">{titleCase(club.category || 'club')}</Badge></View>
        <View style={styles.clubBody}>
          <Text style={styles.title}>{club.name}</Text>
          {club.shortDescription ? <Text style={styles.description} numberOfLines={3}>{club.shortDescription}</Text> : null}
          <View style={styles.cardAction}><Text style={styles.cardActionText}>View club</Text><Text style={styles.cardArrow}>→</Text></View>
        </View>
      </Card>
    </PressableScale>
  );
}

function Detail({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={[styles.detailValue, muted && styles.detailMuted]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  media: { position: 'relative' }, mediaBadge: { position: 'absolute', right: spacing.md, top: spacing.md }, banner: { width: '100%', height: 205 }, body: { padding: spacing.lg, gap: spacing.sm },
  horizontalCard: { flexDirection: 'row', minHeight: 166 }, sessionImage: { width: 120, alignSelf: 'stretch' }, horizontalBody: { flex: 1, padding: spacing.lg, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  club: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.85 },
  title: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3 }, description: { color: palette.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 20 },
  eventDetails: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.sm, gap: 7 }, detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  detailLabel: { color: palette.muted, fontFamily: typography.regular, fontSize: 12.5 }, detailValue: { color: palette.ink, fontFamily: typography.medium, fontSize: 12.5, textAlign: 'right' }, detailMuted: { color: palette.faint },
  cardAction: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }, cardActionText: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13.5 }, cardArrow: { color: palette.accent, fontFamily: typography.semibold, fontSize: 17 },
  clubCard: { position: 'relative' }, clubBanner: { width: '100%', height: 112 }, clubIdentity: { marginTop: -28, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  logo: { width: 70, height: 70, borderRadius: radius.md, backgroundColor: palette.white, borderWidth: 3, borderColor: palette.surface }, clubBody: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
});
