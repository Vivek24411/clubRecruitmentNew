import { useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { EventCard, SessionCard } from '@/components/catalogue';
import { ArtworkImage, Badge, Button, Card, ErrorState, Heading, LoadingState, RemoteImage, Screen, SectionHeader } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useApiQuery } from '@/hooks/use-api-query';
import { titleCase } from '@/lib/date';
import type { Club, DiscovrEvent, Session } from '@/types/api';

function safeExternalUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQuery = useApiQuery<{ success: boolean; club: Club }>(id ? `/student/getClub?clubId=${encodeURIComponent(id)}` : null);
  const eventsQuery = useApiQuery<{ success: boolean; events: DiscovrEvent[] }>(id ? `/student/getClubEvents?clubId=${encodeURIComponent(id)}` : null);
  const sessionsQuery = useApiQuery<{ success: boolean; sessions: Session[] }>(id ? `/student/getClubSessions?clubId=${encodeURIComponent(id)}` : null);
  const club = clubQuery.data?.club;
  const links = [
    ['Website', safeExternalUrl(club?.website)],
    ['Instagram', safeExternalUrl(club?.instagram)],
    ['LinkedIn', safeExternalUrl(club?.linkedin)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <Screen safeTop={false} refreshing={clubQuery.refreshing} onRefresh={() => Promise.all([clubQuery.refresh(), eventsQuery.refresh(), sessionsQuery.refresh()]).then(() => undefined)} contentStyle={styles.content}>
    {clubQuery.loading ? <LoadingState /> : clubQuery.error || !club ? <ErrorState message={clubQuery.error || 'Club not found'} onRetry={clubQuery.reload} /> : <>
      <View style={styles.masthead}>
        <ArtworkImage uri={club.clubBanner} fallbackText={club.name} accessibilityLabel={`${club.name} banner`} style={styles.banner} />
        <View style={styles.identity}><View style={styles.logoFrame}><RemoteImage uri={club.clubLogo} fallbackText={club.name} contain style={styles.logo} /></View><View style={styles.identityText}><Badge tone="accent">{titleCase(club.category || 'student club')}</Badge><Heading>{club.name}</Heading></View></View>
      </View>
      {club.shortDescription ? <Text style={styles.lead}>{club.shortDescription}</Text> : null}
      {club.longDescription ? <View style={styles.section}><Text style={styles.sectionTitle}>About</Text><Text style={styles.body}>{club.longDescription}</Text></View> : null}
      {club.achivements ? <View style={styles.section}><Text style={styles.sectionTitle}>Achievements</Text><Text style={styles.body}>{club.achivements}</Text></View> : null}
      {club.recruitmentMethods ? <View style={styles.section}><Text style={styles.sectionTitle}>How they recruit</Text><Text style={styles.body}>{club.recruitmentMethods}</Text></View> : null}
      {(club.contactEmail || club.contactPhone || links.length) ? <Card style={styles.contactCard}>
        <Text style={styles.sectionTitle}>Get in touch</Text>
        {club.contactEmail ? <Button label={club.contactEmail} variant="secondary" icon="mail-outline" onPress={() => Linking.openURL(`mailto:${club.contactEmail}`)} /> : null}
        {club.contactPhone ? <Button label={club.contactPhone} variant="secondary" icon="call-outline" onPress={() => Linking.openURL(`tel:${club.contactPhone}`)} /> : null}
        {links.map(([label, url]) => <Button key={label} label={label} variant="ghost" icon="open-outline" onPress={() => Linking.openURL(url)} />)}
      </Card> : null}
      {eventsQuery.data?.events.length ? <View style={styles.section}><SectionHeader eyebrow="Recruitment" title="Events" />{eventsQuery.data.events.map((event) => <EventCard key={event._id} event={event} />)}</View> : null}
      {sessionsQuery.data?.sessions.length ? <View style={styles.section}><SectionHeader eyebrow="Meet the club" title="Sessions" />{sessionsQuery.data.sessions.map((session) => <SessionCard key={session._id} session={session} />)}</View> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg }, masthead: { gap: spacing.lg }, banner: { width: '100%', aspectRatio: 8 / 3, borderRadius: radius.md, backgroundColor: palette.ink },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg }, logoFrame: { width: 84, height: 84, padding: 7, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, overflow: 'hidden' }, logo: { width: '100%', height: '100%', borderRadius: radius.sm }, identityText: { flex: 1, gap: spacing.sm },
  lead: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 16, lineHeight: 25 }, section: { gap: spacing.lg }, sectionTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 19 },
  body: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 14, lineHeight: 23 }, contactCard: { padding: spacing.lg, gap: spacing.md },
});
