import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { EventTeamPanel, TeamAction } from '@/components/event-team';
import { EventWorkflowPanel, InitialApplicationForm } from '@/components/event-workflow';
import { CalendarSaveButton } from '@/components/calendar-save-button';
import { ArtworkImage, Badge, Button, Card, ErrorState, Heading, LoadingState, MetaRow, Screen } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { eventDeadline, eventLifecycle, formatDateTime, titleCase } from '@/lib/date';
import type { DiscovrEvent, EventVertical } from '@/types/api';

type EventResponse = {
  success: boolean;
  event: DiscovrEvent;
  registrationOpen?: boolean;
  eligibility?: { eligible: boolean; reason?: string } | null;
};

type EventDetailsResponse = {
  success: boolean;
  verticals: EventVertical[];
  applicationCount?: number;
  maxVerticalApplications?: number | null;
};

function safeWebUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { confirm, toast } = useFeedback();
  const [workingVertical, setWorkingVertical] = useState<string | null>(null);
  const query = useApiQuery<EventResponse>(id ? `/student/getEvent?eventId=${encodeURIComponent(id)}` : null);
  const detailsQuery = useApiQuery<EventDetailsResponse>(profile && id ? `/student/getEventDetails?eventId=${encodeURIComponent(id)}` : null);
  const event = query.data?.event;

  async function runAction(vertical: EventVertical, endpoint: string, payload: Record<string, unknown>, options?: Parameters<TeamAction>[2]) {
    if (!id) return;
    if (options) {
      const accepted = await confirm(options);
      if (!accepted) return;
    }
    setWorkingVertical(vertical._id);
    try {
      const response = await apiRequest<{ success: boolean; msg?: string }>(`/student/${endpoint}`, {
        method: 'POST', body: endpoint === 'registerEvent' ? { eventId: id, ...payload } : payload,
      });
      await Promise.all([detailsQuery.reload(), query.reload()]);
      toast(response.msg || 'Application updated successfully.', 'success');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Could not update the application.', 'error');
    } finally {
      setWorkingVertical(null);
    }
  }

  async function confirmApply(vertical: EventVertical) {
    const isTeam = vertical.registrationType !== 'individual';
    await runAction(vertical, 'registerEvent', { verticalId: vertical._id }, {
      title: `Apply to ${event?.verticalsEnabled ? vertical.title : event?.title || 'this event'}?`, message: isTeam ? 'You will begin as team captain and can invite teammates afterward.' : 'This will submit your individual application.', confirmLabel: 'Apply now',
    });
  }

  const applicationVerticals = detailsQuery.data?.verticals || event?.verticals || [];
  const totalRounds = event?.verticals?.reduce((total, vertical) => total + (vertical.rounds?.length || 0), 0) || event?.numberOfRounds || 0;
  const lifecycle = event ? eventLifecycle(event) : null;
  return <Screen safeTop={false} refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
    {query.loading ? <LoadingState /> : query.error || !event ? <ErrorState message={query.error || 'Event not found'} onRetry={query.reload} /> : <>
      <ArtworkImage uri={event.eventBanner || event.clubId?.clubBanner} fallbackText={event.title} accessibilityLabel={`${event.title} banner`} style={styles.heroImage} />
      <View style={styles.titleBlock}><View style={styles.statusRow}><Badge tone="accent">{titleCase(event.eventType || 'event')}</Badge>{lifecycle ? <Badge tone={lifecycle.tone}>{lifecycle.label}</Badge> : null}</View><Text style={styles.club}>{event.clubId?.name}</Text><Heading size="xl">{event.title}</Heading>{event.shortDescription ? <Text style={styles.lead}>{event.shortDescription}</Text> : null}</View>
      <Card style={styles.metaCard}>
        {eventDeadline(event) ? <MetaRow icon="time-outline">Application deadline · {formatDateTime(eventDeadline(event))}</MetaRow> : null}
        {event.verticalsEnabled && event.verticals?.length ? <MetaRow icon="layers-outline">{event.verticals.length} vertical{event.verticals.length === 1 ? '' : 's'}</MetaRow> : null}
        {totalRounds ? <MetaRow icon="git-branch-outline">{totalRounds} recruitment round{totalRounds === 1 ? '' : 's'}</MetaRow> : null}
      </Card>
      <CalendarSaveButton sourceType="event" sourceId={id!} />
      <View style={styles.section}><Text style={styles.sectionTitle}>About this event</Text><Text style={styles.body}>{event.longDescription || event.shortDescription}</Text></View>
      {event.eligibility ? <View style={styles.section}><Text style={styles.sectionTitle}>Eligibility</Text><Text style={styles.body}>{event.eligibility}</Text></View> : null}
      {event.verticals?.length ? <View style={styles.section}><Text style={styles.sectionTitle}>{event.verticalsEnabled ? 'Verticals and rounds' : 'Selection process'}</Text>{event.verticals.map((vertical, verticalIndex) => <Card key={vertical._id} style={styles.vertical}>{event.verticalsEnabled ? <Badge tone="accent">Vertical {verticalIndex + 1}</Badge> : null}<Text style={styles.verticalTitle}>{event.verticalsEnabled ? vertical.title : 'Application track'}</Text><Text style={styles.applicationMeta}>{vertical.registrationType === 'individual' ? 'Individual registration' : `Teams of ${vertical.minTeamSize || 1}–${vertical.maxTeamSize || 1}`}</Text><Text style={styles.applicationMeta}>Registration deadline · {formatDateTime(vertical.registrationDeadlineAt || eventDeadline(event))}</Text>{vertical.shortDescription ? <Text style={styles.verticalLead}>{vertical.shortDescription}</Text> : null}{vertical.description ? <Text style={styles.body}>{vertical.description}</Text> : null}{safeWebUrl(vertical.problemStatementUrl || (!event.verticalsEnabled ? event.problemStatementUrl : '')) ? <Button label="Open problem statement" variant="secondary" icon="open-outline" onPress={() => Linking.openURL(safeWebUrl(vertical.problemStatementUrl || event.problemStatementUrl)!)} /> : null}<View style={styles.rounds}>{(vertical.rounds || []).map((round, roundIndex) => <View key={round._id || String(roundIndex)} style={styles.round}><View style={styles.roundHeader}><Text style={styles.roundNumber}>Round {roundIndex + 1}</Text><Badge tone="info">{titleCase(round.customType || round.type)}</Badge></View><Text style={styles.roundTitle}>{round.title}</Text>{round.description ? <Text style={styles.body}>{round.description}</Text> : null}{round.instructions ? <View style={styles.instructions}><Text style={styles.roundNumber}>Instructions</Text><Text style={styles.body}>{round.instructions}</Text></View> : null}{round.startsAt ? <MetaRow icon="calendar-outline">{round.type === 'submission' ? 'Submissions open' : 'Starts'} {formatDateTime(round.startsAt)}</MetaRow> : null}{round.endsAt ? <MetaRow icon="time-outline">{round.type === 'submission' ? 'Submission deadline' : 'Ends'} {formatDateTime(round.endsAt)}</MetaRow> : null}{round.type !== 'submission' && round.submissionDeadlineAt ? <MetaRow icon="cloud-upload-outline">Submit by {formatDateTime(round.submissionDeadlineAt)}</MetaRow> : null}{round.venue ? <MetaRow icon="location-outline">{round.venue}</MetaRow> : null}{safeWebUrl(round.meetingUrl) ? <Button label="Open meeting link" variant="secondary" icon="videocam-outline" onPress={() => Linking.openURL(safeWebUrl(round.meetingUrl)!)} /> : null}{round.submissionFields?.length ? <Text style={styles.requirements}>Submit: {round.submissionFields.map((field) => `${field.label}${field.required === false ? ' (optional)' : ''}`).join(' · ')}</Text> : null}</View>)}</View></Card>)}</View> : null}
      <View style={styles.applicationSection}>
        <View style={styles.section}><Text style={styles.sectionTitle}>Your application</Text>{event.maxVerticalApplications && event.verticalsEnabled ? <Text style={styles.body}>{event.maxVerticalApplications === 1 ? 'You may apply to one vertical.' : `You may apply to up to ${event.maxVerticalApplications} verticals.`}</Text> : null}</View>
        {!profile ? <Card style={styles.applicationCard}><Text style={styles.applicationTitle}>Sign in to continue</Text><Text style={styles.body}>Use your student account to apply and track the selection process.</Text><Button label="Sign in to apply" onPress={() => router.push('/login')} icon="log-in-outline" /><Button label="Create student account" variant="secondary" onPress={() => router.push('/register')} /></Card>
          : detailsQuery.loading ? <LoadingState label="Checking your applications…" />
            : detailsQuery.error ? <ErrorState message={detailsQuery.error} onRetry={detailsQuery.reload} />
              : applicationVerticals.map((vertical) => {
                const applied = vertical.show === 1 || vertical.show === 2;
                const invited = vertical.show === 3;
                const platformOpen = query.data?.registrationOpen !== false;
                const canApply = platformOpen && vertical.canApply === true;
                const status = vertical.detail?.studentOverallStatus || vertical.detail?.overallStatus || 'submitted';
                const blockedReason = !platformOpen ? 'Recruitment registrations are currently paused.' : vertical.blockedReason || vertical.eligibilityReason;
                const isTeam = vertical.registrationType !== 'individual';
                const firstRound = vertical.rounds?.[0];
                const startsWithApplicationForm = firstRound?.type === 'submission' && firstRound.submissionEnabled !== false;
                const initialApplicationForm = startsWithApplicationForm && firstRound && canApply ? <InitialApplicationForm
                  eventId={id!}
                  verticalId={vertical._id}
                  round={firstRound}
                  onSaved={async () => { await Promise.all([detailsQuery.reload(), query.reload()]); }}
                /> : undefined;
                return <Card key={vertical._id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}><View style={styles.applicationHeading}>{event.verticalsEnabled ? <Text style={styles.roundNumber}>Vertical {applicationVerticals.indexOf(vertical) + 1}</Text> : null}<Text style={styles.applicationTitle}>{event.verticalsEnabled ? vertical.title : 'Application details'}</Text><Text style={styles.applicationMeta}>{isTeam ? `Team · ${vertical.minTeamSize || 1}–${vertical.maxTeamSize || 1} members` : 'Individual application'}</Text>{vertical.deadlineAt ? <Text style={styles.applicationMeta}>{startsWithApplicationForm ? 'Application deadline' : 'Registration deadline'} · {formatDateTime(vertical.deadlineAt)}</Text> : null}</View>{applied ? <Badge tone="success">{titleCase(status)}</Badge> : invited ? <Badge tone="info">Invited</Badge> : null}</View>
                  {applied || invited ? <EventTeamPanel event={event} vertical={vertical} platformOpen={platformOpen} working={Boolean(workingVertical)} action={(endpoint, payload, options) => runAction(vertical, endpoint, payload, options)} startOwnApplication={initialApplicationForm} />
                    : <><Text style={styles.body}>{blockedReason || (startsWithApplicationForm ? isTeam ? 'Complete the form below. Submitting it registers your application and creates your team with you as captain.' : 'Complete the form below. Submitting it also registers you for the event.' : isTeam ? 'Apply as captain, then invite teammates using their IITR email.' : 'Submit your application for this event.')}</Text>{initialApplicationForm || <Button label={workingVertical === vertical._id ? 'Submitting…' : 'Apply now'} loading={workingVertical === vertical._id} disabled={!canApply || Boolean(workingVertical)} onPress={() => void confirmApply(vertical)} icon="arrow-forward" />}{vertical.deadlineAt && canApply ? <Text style={styles.deadline}>Closes {formatDateTime(vertical.deadlineAt)}</Text> : null}</>}
                </Card>;
              })}
      </View>
      {profile && !detailsQuery.loading ? <EventWorkflowPanel key={detailsQuery.loadedAt} eventId={id!} /> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg }, heroImage: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: palette.ink }, titleBlock: { gap: spacing.md },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }, club: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.85 }, lead: { color: palette.muted, fontFamily: typography.regular, fontSize: 16, lineHeight: 24 },
  metaCard: { padding: spacing.lg, gap: spacing.md }, section: { gap: spacing.md }, sectionTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 19 },
  body: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 14, lineHeight: 22 }, vertical: { padding: spacing.lg, gap: spacing.sm, borderWidth: 2, borderColor: palette.accentTint }, verticalTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 17 }, verticalLead: { color: palette.ink, fontFamily: typography.medium, fontSize: 14, lineHeight: 21 },
  rounds: { gap: spacing.md, marginTop: spacing.sm }, round: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line }, roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }, roundNumber: { color: palette.accentDark, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 }, roundTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 15 }, instructions: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: palette.surface }, requirements: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 12, lineHeight: 18 },
  applicationSection: { gap: spacing.lg }, applicationCard: { padding: spacing.lg, gap: spacing.md }, applicationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  applicationHeading: { flex: 1, gap: spacing.xs }, applicationTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 17 }, applicationMeta: { color: palette.muted, fontFamily: typography.regular, fontSize: 12 }, deadline: { color: palette.muted, fontFamily: typography.mono, fontSize: 10, textAlign: 'center' },
});
