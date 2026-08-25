import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Eyebrow, Heading, LoadingState, Screen, SearchField } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { formatDateTime, titleCase } from '@/lib/date';
import type { EventRound, MyApplication, RoundCandidate } from '@/types/api';

const terminalStatuses = new Set(['selected', 'rejected', 'withdrawn']);

function statusTone(status?: string): 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger' {
  if (['selected', 'advanced'].includes(status || '')) return 'success';
  if (['rejected', 'missed'].includes(status || '')) return 'danger';
  if (status === 'waitlisted') return 'warning';
  if (['in_progress', 'scheduled', 'submitted', 'under_review'].includes(status || '')) return 'info';
  return 'neutral';
}

function roundState(candidates: RoundCandidate[]) {
  if (!candidates.length) return 'locked';
  const statuses = candidates.map((candidate) => candidate.status);
  if (statuses.some((status) => ['eligible', 'scheduled', 'active', 'submitted', 'under_review'].includes(status))) return 'current';
  if (statuses.includes('waitlisted')) return 'waitlisted';
  if (statuses.includes('advanced')) return 'advanced';
  if (statuses.every((status) => ['rejected', 'missed', 'withdrawn'].includes(status))) return 'rejected';
  return 'current';
}

export default function ApplicationsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const query = useApiQuery<{ success: boolean; applications: MyApplication[] }>(profile ? '/student/myApplications' : null);
  const [search, setSearch] = useState('');
  const applications = useMemo(() => (query.data?.applications || []).filter((item) => item.registrationId), [query.data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((item) => {
      const registration = item.registrationId;
      return `${registration?.eventId?.title || ''} ${registration?.eventId?.clubId?.name || ''} ${registration?.teamName || ''} ${registration?.workflow?.studentOverallStatus || registration?.overallStatus || ''} ${item.role} ${item.verticalTitle || ''}`.toLowerCase().includes(term);
    });
  }, [applications, search]);

  if (authLoading) return <Screen><LoadingState label="Restoring your applications…" /></Screen>;
  if (!profile) return <Screen contentStyle={styles.content}><AppHeader /><View style={styles.guest}><Eyebrow accent>Your record</Eyebrow><Heading size="xl">Applications</Heading><Text style={styles.copy}>Sign in to track teams, every recruitment round, schedules, submissions, and decisions.</Text><Button label="Sign in to continue" icon="log-in-outline" onPress={() => router.push('/login')} /><Button label="Create student account" variant="secondary" onPress={() => router.push('/register')} /></View></Screen>;

  return <Screen refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Your record</Eyebrow><Heading size="xl">Applications</Heading><Text style={styles.copy}>Teams, rounds, interview dates, submissions, and final decisions.</Text></View>
    {applications.length ? <SearchField value={search} onChangeText={setSearch} placeholder="Search event, club, team, or status…" /> : null}
    {query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : !applications.length ? <EmptyState title="No applications yet" message="Once you apply to an event, its complete progress will appear here." /> : !visible.length ? <EmptyState title="No matching applications" message="Try another event, club, team, or status." /> : <View style={styles.list}>{visible.map((item) => <ApplicationCard key={item._id} item={item} />)}</View>}
  </Screen>;
}

function ApplicationCard({ item }: { item: MyApplication }) {
  const [expanded, setExpanded] = useState(false);
  const application = item.registrationId!;
  const event = application.eventId;
  const vertical = event.verticals?.find((value) => value._id === application.verticalId);
  const registrationType = vertical?.registrationType || event.registrationType;
  const rounds = vertical?.rounds || event.rounds || [];
  const candidates = (application.workflow?.candidates || []).filter((candidate) => candidate.isMine !== false);
  const status = item.history ? 'withdrawn' : application.workflow?.studentOverallStatus || application.studentOverallStatus || application.overallStatus || 'submitted';
  const states = rounds.map((round) => roundState(candidates.filter((candidate) => candidate.roundId === round._id)));
  const reached = states.filter((state) => state !== 'locked').length;
  const role = registrationType === 'individual' ? 'Individual applicant' : item.role === 'captain' ? 'Team captain' : 'Team member';
  const verticalLabel = item.verticalTitle || (event.verticalsEnabled ? vertical?.title : '');

  return <Card style={[styles.applicationCard, status === 'selected' ? styles.selectedCard : status === 'rejected' ? styles.rejectedCard : styles.activeCard]}>
    <View style={styles.applicationTop}>
      <Avatar uri={event.clubId?.clubLogo} name={event.clubId?.name || 'Club'} size={48} />
      <View style={styles.applicationTitle}><Text style={styles.club}>{event.clubId?.name || 'Club'}</Text><Text style={styles.eventTitle}>{event.title}</Text>{verticalLabel ? <Text style={styles.vertical}>{verticalLabel}</Text> : null}</View>
      <Badge tone={statusTone(status)}>{titleCase(status)}</Badge>
    </View>
    <Text style={styles.meta}>{role}{application.registeredAt ? ` · Applied ${formatDateTime(application.registeredAt)}` : ''}</Text>
    <View style={styles.summaryGrid}>
      <Summary label="Application" value={registrationType === 'individual' ? 'Individual' : application.teamName || 'Unnamed team'} />
      <Summary label="Progress" value={rounds.length ? `${reached} of ${rounds.length} rounds reached` : 'Submitted'} />
    </View>
    {rounds.length && !item.history ? <View style={styles.progress}>{states.map((state, index) => <View key={rounds[index]._id} style={[styles.progressSegment, state === 'advanced' && styles.progressAdvanced, state === 'current' && styles.progressCurrent, state === 'waitlisted' && styles.progressWaitlisted, state === 'rejected' && styles.progressRejected]} />)}</View> : null}
    {rounds.length && !item.history ? <Pressable onPress={() => setExpanded((value) => !value)} style={styles.expandButton}><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={palette.accentDark} /><Text style={styles.expandText}>{expanded ? 'Hide exact round results' : 'View exact round results'}</Text></Pressable> : null}
    {expanded ? <View style={styles.rounds}>{rounds.map((round) => <RoundResult key={round._id} round={round} candidates={candidates.filter((candidate) => candidate.roundId === round._id)} teamName={application.teamName} />)}</View> : null}
    {!terminalStatuses.has(status) && !item.history ? <Button label="Manage application" icon="arrow-forward" onPress={() => router.push({ pathname: '/event/[id]', params: { id: event._id } })} /> : <Button label="View event details" variant="secondary" onPress={() => router.push({ pathname: '/event/[id]', params: { id: event._id } })} />}
  </Card>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <View style={styles.summary}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function RoundResult({ round, candidates, teamName }: { round: EventRound; candidates: RoundCandidate[]; teamName?: string | null }) {
  return <View style={styles.round}><View style={styles.roundHeader}><View style={styles.roundNumber}><Text style={styles.roundNumberText}>{round.order}</Text></View><View style={styles.roundTitle}><Text style={styles.roundName}>{round.title}</Text><Text style={styles.roundType}>{titleCase(round.type)}</Text></View>{!candidates.length ? <Badge>Locked</Badge> : null}</View>
    {candidates.map((candidate) => <View key={candidate._id} style={styles.candidate}><View style={styles.candidateText}><Text style={styles.candidateName}>{candidate.scope === 'participant' ? candidate.studentId?.name || 'Student' : teamName || 'Team application'}</Text><Text style={styles.candidateScope}>{candidate.scope === 'participant' ? 'Individual result' : `${candidate.participantIds?.length || 1} participant(s)`}</Text></View><Badge tone={statusTone(candidate.status)}>{titleCase(candidate.status)}</Badge></View>)}
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, guest: { paddingVertical: spacing.xl, gap: spacing.lg }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 }, list: { gap: spacing.lg },
  applicationCard: { padding: spacing.lg, gap: spacing.md, borderLeftWidth: 4 }, activeCard: { borderLeftColor: palette.accent }, selectedCard: { borderLeftColor: palette.success }, rejectedCard: { borderLeftColor: palette.danger },
  applicationTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, applicationTitle: { flex: 1, gap: 3 }, club: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  eventTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 19, lineHeight: 23 }, vertical: { color: palette.accentDark, fontFamily: typography.medium, fontSize: 13 }, meta: { color: palette.muted, fontFamily: typography.regular, fontSize: 12.5, lineHeight: 18 },
  summaryGrid: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md }, summary: { flex: 1, padding: spacing.md, borderRadius: radius.sm, backgroundColor: palette.paper }, summaryLabel: { color: palette.muted, fontFamily: typography.mono, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.7 }, summaryValue: { marginTop: 5, color: palette.ink, fontFamily: typography.medium, fontSize: 13, lineHeight: 17 },
  progress: { height: 7, flexDirection: 'row', gap: 3 }, progressSegment: { flex: 1, borderRadius: 4, backgroundColor: palette.lineStrong }, progressAdvanced: { backgroundColor: palette.success }, progressCurrent: { backgroundColor: palette.accent }, progressWaitlisted: { backgroundColor: palette.warning }, progressRejected: { backgroundColor: palette.danger },
  expandButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, expandText: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13 }, rounds: { gap: spacing.md }, round: { borderWidth: 1, borderColor: palette.line, borderRadius: radius.sm, backgroundColor: palette.paperRaised, padding: spacing.md, gap: spacing.sm },
  roundHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, roundNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' }, roundNumberText: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 13 }, roundTitle: { flex: 1 }, roundName: { color: palette.ink, fontFamily: typography.semibold, fontSize: 15 }, roundType: { color: palette.muted, fontFamily: typography.regular, fontSize: 11 },
  candidate: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, candidateText: { flex: 1 }, candidateName: { color: palette.ink, fontFamily: typography.medium, fontSize: 13 }, candidateScope: { color: palette.muted, fontFamily: typography.regular, fontSize: 11 },
});
