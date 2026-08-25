import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Avatar, Badge, Button, Card, ErrorState, Field, LoadingState, MetaRow } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useFeedback } from '@/context/feedback-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { LocalUpload, uploadDirect } from '@/lib/direct-upload';
import { formatDateTime, titleCase } from '@/lib/date';
import type { EventRound, EventWorkflowResponse, RoundCandidate, RoundSubmission, ScheduleSlot, WorkflowApplication } from '@/types/api';

function tone(status?: string): 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger' {
  if (['selected', 'advanced'].includes(status || '')) return 'success';
  if (['rejected', 'missed', 'revoked'].includes(status || '')) return 'danger';
  if (status === 'waitlisted') return 'warning';
  if (['active', 'scheduled', 'submitted', 'under_review'].includes(status || '')) return 'info';
  return 'neutral';
}

function inferMimeType(name: string, provided?: string | null) {
  if (provided) return provided;
  const extension = name.split('.').pop()?.toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' } as Record<string, string>)[extension || ''] || 'application/octet-stream';
}

export function EventWorkflowPanel({ eventId }: { eventId: string }) {
  const query = useApiQuery<EventWorkflowResponse>(`/student/events/${encodeURIComponent(eventId)}/workflow`);
  if (query.loading) return <LoadingState label="Loading your round progress…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;
  if (!query.data?.applications.length) return null;
  return <View style={styles.workflow}>
    <View style={styles.sectionHeading}><Text style={styles.heading}>Your event progress</Text><Text style={styles.sectionCopy}>Exact results, schedules, submissions, and decisions for every round.</Text></View>
    {query.data.applications.map((application) => {
      const vertical = query.data?.event.verticals?.find((item) => item._id === application.verticalId);
      return <ApplicationProgress key={application.registration._id} eventId={eventId} application={application} rounds={vertical?.rounds || query.data?.event.rounds || []} onReload={query.reload} />;
    })}
  </View>;
}

function ApplicationProgress({ eventId, application, rounds, onReload }: { eventId: string; application: WorkflowApplication; rounds: EventRound[]; onReload: () => Promise<void> }) {
  const submissions = new Map((application.submissions || []).map((submission) => [submission.candidateId, submission]));
  const slots = new Map((application.slots || []).map((slot) => [slot.candidateId, slot]));
  return <View style={styles.application}>
    <View style={styles.applicationHeader}><Text style={styles.applicationTitle}>{application.verticalTitle}</Text><Badge tone={tone(application.studentOverallStatus)}>{titleCase(application.studentOverallStatus || application.registration.overallStatus)}</Badge></View>
    {rounds.map((round) => <RoundCard key={round._id} eventId={eventId} round={round} candidates={application.candidates.filter((candidate) => candidate.roundId === round._id)} registration={application} submissions={submissions} slots={slots} onReload={onReload} />)}
  </View>;
}

function RoundCard({ eventId, round, candidates, registration, submissions, slots, onReload }: {
  eventId: string; round: EventRound; candidates: RoundCandidate[]; registration: WorkflowApplication;
  submissions: Map<string, RoundSubmission>; slots: Map<string, ScheduleSlot>; onReload: () => Promise<void>;
}) {
  return <Card style={[styles.roundCard, !candidates.length && styles.roundLocked]}>
    <View style={styles.roundHeader}><View style={styles.roundIndex}><Text style={styles.roundIndexText}>{round.order}</Text></View><View style={styles.roundHeading}><Text style={styles.roundTitle}>{round.title}</Text><Text style={styles.roundType}>{titleCase(round.customType || round.type)}</Text></View>{!candidates.length ? <Badge>Locked</Badge> : null}</View>
    {round.description ? <Text style={styles.body}>{round.description}</Text> : null}
    {round.instructions ? <View style={styles.instructions}><Text style={styles.instructionsLabel}>Instructions</Text><Text style={styles.body}>{round.instructions}</Text></View> : null}
    <View style={styles.roundMeta}>
      {round.startsAt ? <MetaRow icon="calendar-outline">{round.type === 'submission' ? 'Submissions open' : 'Starts'} {formatDateTime(round.startsAt)}</MetaRow> : null}
      {round.endsAt ? <MetaRow icon="time-outline">{round.type === 'submission' ? 'Submission deadline' : 'Ends'} {formatDateTime(round.endsAt)}</MetaRow> : null}
      {round.venue ? <MetaRow icon="location-outline">{round.venue}</MetaRow> : null}
      {round.type !== 'submission' && round.submissionDeadlineAt ? <MetaRow icon="cloud-upload-outline">Submit by {formatDateTime(round.submissionDeadlineAt)}</MetaRow> : null}
    </View>
    {round.meetingUrl ? <Button label="Open meeting link" variant="secondary" icon="videocam-outline" onPress={() => Linking.openURL(round.meetingUrl!)} /> : null}
    {candidates.map((candidate) => {
      const slot = slots.get(candidate._id);
      const submission = submissions.get(candidate._id);
      const person = candidate.scope === 'participant' ? candidate.studentId?.name || 'Team member' : registration.registration.teamName || 'Team application';
      const terminal = ['advanced', 'rejected', 'waitlisted', 'missed', 'withdrawn', 'revoked'].includes(candidate.status);
      const deadlinePassed = Boolean(round.submissionDeadlineAt && new Date(round.submissionDeadlineAt) < new Date());
      const editable = Boolean(round.submissionEnabled && candidate.canAct && !terminal && !deadlinePassed && (!submission || round.allowResubmission));
      return <View key={candidate._id} style={styles.candidate}>
        <View style={styles.candidateHeader}><Avatar uri={candidate.studentId?.profilePicture} name={person} size={38} /><View style={styles.candidateTitle}><Text style={styles.candidateName}>{person}</Text><Text style={styles.candidateScope}>{candidate.scope === 'participant' ? 'Individual result' : `${candidate.participantIds?.length || 1} participant(s) · Team result`}</Text></View><Badge tone={tone(candidate.status)}>{titleCase(candidate.status)}</Badge></View>
        {candidate.scope === 'application' && candidate.participantIds?.length ? <View style={styles.memberChips}>{candidate.participantIds.map((student) => <View key={student._id} style={styles.memberChip}><Avatar uri={student.profilePicture} name={student.name} size={24} /><Text style={styles.memberChipText}>{student.name}</Text></View>)}</View> : null}
        {slot ? <SlotCard slot={slot} /> : null}
        {submission && !editable ? <SubmissionReadOnly submission={submission} /> : null}
        {editable ? <SubmissionForm eventId={eventId} round={round} candidate={candidate} existing={submission} onSaved={onReload} /> : null}
      </View>;
    })}
  </Card>;
}

function SlotCard({ slot }: { slot: ScheduleSlot }) {
  return <View style={styles.slot}><MaterialCommunityIcons name="calendar-clock" size={21} color={palette.accentDark} /><View style={styles.slotText}><Text style={styles.slotTitle}>{formatDateTime(slot.startAt)}</Text>{slot.venue ? <Text style={styles.slotMeta}>{slot.venue}</Text> : null}</View>{slot.meetingUrl ? <Button label="Join" variant="ghost" onPress={() => Linking.openURL(slot.meetingUrl!)} /> : null}</View>;
}

function SubmissionReadOnly({ submission }: { submission: RoundSubmission }) {
  return <View style={styles.submission}><View style={styles.submissionHeader}><Text style={styles.submissionTitle}>Your submitted work</Text><Badge tone="info">Revision {submission.revision || 1}</Badge></View>{submission.submittedAt ? <Text style={styles.submissionTime}>{formatDateTime(submission.submittedAt)}</Text> : null}
    {(submission.answers || []).map((answer) => <View key={answer.key} style={styles.answer}><Text style={styles.answerKey}>{titleCase(answer.key)}</Text><Text style={styles.answerValue}>{answer.value}</Text></View>)}
    {(submission.files || []).map((file) => <Button key={file.publicId} label={file.originalName || file.fieldKey} variant="secondary" icon="document-outline" onPress={() => Linking.openURL(file.url)} />)}
  </View>;
}

function SubmissionForm({ eventId, round, candidate, existing, onSaved }: { eventId: string; round: EventRound; candidate: RoundCandidate; existing?: RoundSubmission; onSaved: () => Promise<void> }) {
  const { toast } = useFeedback();
  const initial = useMemo(() => Object.fromEntries((existing?.answers || []).map((answer) => [answer.key, answer.value])), [existing]);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [files, setFiles] = useState<Record<string, LocalUpload | undefined>>({});
  const [working, setWorking] = useState(false);
  async function chooseFile(field: NonNullable<EventRound['submissionFields']>[number]) {
    const mimeTypes = field.type === 'video' ? ['video/mp4', 'video/webm', 'video/quicktime'] : field.type === 'pdf' ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = inferMimeType(asset.name, asset.mimeType);
    const sourceLimit = mimeType.startsWith('image/') ? 25 * 1024 * 1024 : mimeType === 'application/pdf' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (asset.size && asset.size > sourceLimit) { toast(`This ${mimeType.startsWith('image/') ? 'image' : mimeType === 'application/pdf' ? 'PDF' : 'video'} is too large.`, 'error'); return; }
    try {
      if (mimeType.startsWith('image/') && (asset.size || 0) > 9 * 1024 * 1024) {
        const optimized = await manipulateAsync(asset.uri, [{ resize: { width: 2048 } }], { compress: 0.78, format: SaveFormat.WEBP });
        setFiles((current) => ({ ...current, [field.key]: { uri: optimized.uri, name: `${asset.name.replace(/\.[^.]+$/, '')}.webp`, mimeType: 'image/webp' } }));
      } else {
        setFiles((current) => ({ ...current, [field.key]: { uri: asset.uri, name: asset.name, mimeType, size: asset.size } }));
      }
    } catch { toast('Could not prepare this file for upload.', 'error'); }
  }

  async function submit() {
    const fields = round.submissionFields || [];
    for (const field of fields) {
      const existingFile = existing?.files?.some((file) => file.fieldKey === field.key);
      if (field.required && ['file', 'pdf', 'video'].includes(field.type) && !files[field.key] && !existingFile) { toast(`${field.label} is required.`, 'error'); return; }
      if (field.required && !['file', 'pdf', 'video'].includes(field.type) && !answers[field.key]?.trim()) { toast(`${field.label} is required.`, 'error'); return; }
    }
    setWorking(true);
    try {
      const entries = Object.entries(files).filter((entry): entry is [string, LocalUpload] => Boolean(entry[1]));
      const directAssets = await Promise.all(entries.map(([, file]) => uploadDirect(file, 'submission')));
      const response = await apiRequest<{ success: boolean; msg?: string }>(`/student/events/${encodeURIComponent(eventId)}/rounds/${encodeURIComponent(round._id)}/submission`, {
        method: 'PUT', timeoutMs: 120_000,
        body: { candidateId: candidate._id, answersJSON: JSON.stringify(Object.entries(answers).map(([key, value]) => ({ key, value }))), fileKeysJSON: JSON.stringify(entries.map(([key]) => key)), directAssets },
      });
      toast(response.msg || 'Submission saved.', 'success'); setFiles({}); await onSaved();
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not submit your work.', 'error'); }
    finally { setWorking(false); }
  }

  const beforeOpen = Boolean(round.submissionOpensAt && new Date(round.submissionOpensAt) > new Date());
  return <View style={styles.submissionForm}><Text style={styles.submissionTitle}>{existing ? 'Update submission' : 'Submit your work'}</Text>{(round.submissionFields || []).map((field) => ['file', 'pdf', 'video'].includes(field.type)
    ? <View key={field.key} style={styles.fileField}><Text style={styles.fileLabel}>{field.label}{field.required ? ' *' : ''}</Text>{field.helpText ? <Text style={styles.fileHelp}>{field.helpText}</Text> : null}<Button label={files[field.key]?.name || `Choose ${field.type === 'video' ? 'video' : field.type === 'pdf' ? 'PDF' : 'file'}`} variant="secondary" icon="attach-outline" onPress={() => void chooseFile(field)} /></View>
    : <Field key={field.key} label={field.label} value={answers[field.key] || ''} onChangeText={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))} multiline={['text', 'long_text'].includes(field.type)} keyboardType={['url', 'drive_link', 'github'].includes(field.type) ? 'url' : 'default'} autoCapitalize="none" placeholder={field.type === 'github' ? 'https://github.com/…' : field.type === 'drive_link' ? 'https://drive.google.com/…' : field.type === 'url' ? 'https://…' : field.helpText || ''} />)}
    {beforeOpen ? <Text style={styles.warning}>Submissions open {formatDateTime(round.submissionOpensAt)}.</Text> : null}<Button label={existing ? 'Update submission' : 'Submit work'} loading={working} disabled={beforeOpen} icon="cloud-upload-outline" onPress={() => void submit()} />
  </View>;
}

const styles = StyleSheet.create({
  workflow: { gap: spacing.lg, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.xl }, sectionHeading: { gap: spacing.sm }, heading: { color: palette.ink, fontFamily: typography.semibold, fontSize: 21 }, sectionCopy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  application: { gap: spacing.md }, applicationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, applicationTitle: { flex: 1, color: palette.ink, fontFamily: typography.semibold, fontSize: 18 },
  roundCard: { padding: spacing.lg, gap: spacing.md }, roundLocked: { opacity: 0.72 }, roundHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, roundIndex: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' }, roundIndexText: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 14 }, roundHeading: { flex: 1 }, roundTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 17 }, roundType: { color: palette.muted, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 },
  body: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 13.5, lineHeight: 21 }, instructions: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: palette.paper }, instructionsLabel: { marginBottom: 5, color: palette.muted, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase' }, roundMeta: { gap: spacing.sm },
  candidate: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md, gap: spacing.md }, candidateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, candidateTitle: { flex: 1 }, candidateName: { color: palette.ink, fontFamily: typography.medium, fontSize: 14 }, candidateScope: { color: palette.muted, fontFamily: typography.regular, fontSize: 11.5 },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, memberChip: { minHeight: 32, borderRadius: 16, paddingRight: spacing.md, paddingLeft: 3, backgroundColor: palette.paper, flexDirection: 'row', alignItems: 'center', gap: 6 }, memberChipText: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 11.5 },
  slot: { padding: spacing.md, borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: palette.accent, backgroundColor: palette.accentMist, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, slotText: { flex: 1 }, slotTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 13 }, slotMeta: { color: palette.muted, fontFamily: typography.regular, fontSize: 11.5 },
  submission: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: palette.paper, gap: spacing.sm }, submissionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, submissionTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 15 }, submissionTime: { color: palette.muted, fontFamily: typography.mono, fontSize: 9 }, answer: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: palette.surface, gap: 4 }, answerKey: { color: palette.muted, fontFamily: typography.mono, fontSize: 9 }, answerValue: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 13, lineHeight: 19 },
  submissionForm: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: palette.accentMist, gap: spacing.md }, fileField: { gap: 6 }, fileLabel: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 13 }, fileHelp: { color: palette.muted, fontFamily: typography.regular, fontSize: 11.5, lineHeight: 17 }, warning: { color: palette.warning, fontFamily: typography.medium, fontSize: 12 },
});
