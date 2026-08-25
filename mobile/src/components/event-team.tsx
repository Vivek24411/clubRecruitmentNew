import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Button, Field, MetaRow } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { titleCase } from '@/lib/date';
import type { DiscovrEvent, EventVertical, StudentSummary } from '@/types/api';

export type TeamAction = (endpoint: string, payload: Record<string, unknown>, options?: { title: string; message: string; confirmLabel?: string; destructive?: boolean }) => Promise<void>;

export function EventTeamPanel({ event, vertical, platformOpen, working, action }: { event: DiscovrEvent; vertical: EventVertical; platformOpen: boolean; working: boolean; action: TeamAction }) {
  const registration = vertical.detail;
  const [teamName, setTeamName] = useState(registration?.teamName || '');
  const [memberEmail, setMemberEmail] = useState('');
  if (!vertical.show) return null;

  const isTeam = vertical.registrationType !== 'individual';
  const canEdit = platformOpen && event.status === 'published' && vertical.status !== 'closed' && (!vertical.deadlineAt || new Date(vertical.deadlineAt) > new Date());
  const registrationId = registration?._id;
  const run = (endpoint: string, payload: Record<string, unknown> = {}, options?: Parameters<TeamAction>[2]) => action(endpoint, { registrationId, ...payload }, options);

  if (vertical.show === 3) return <View style={styles.panel}>
    <Text style={styles.panelTitle}>Team invitations</Text><Text style={styles.body}>Accept a team invitation or start your own application.</Text>
    {(vertical.invitations || []).map((offer) => <View key={offer._id} style={styles.invitation}><View style={styles.memberMain}><Avatar uri={offer.studentId?.profilePicture} name={offer.studentId?.name || 'Captain'} size={40} /><View style={styles.memberText}><Text style={styles.memberName}>{offer.teamName || `${offer.studentId?.name || 'Student'}’s team`}</Text><Text style={styles.memberMeta}>Captain: {offer.studentId?.name || 'Student'}</Text></View></View><View style={styles.actions}><Button label="Accept" disabled={!canEdit || working} onPress={() => void action('acceptMemberOffer', { registrationId: offer._id }, { title: 'Join this team?', message: 'This invitation will become your application for this vertical.', confirmLabel: 'Join team' })} /><Button label="Decline" variant="secondary" disabled={working} onPress={() => void action('declineMemberOffer', { registrationId: offer._id })} /></View></View>)}
    <Button label="Start my own application" variant="secondary" disabled={!vertical.canApply || working} onPress={() => void action('registerEvent', { verticalId: vertical._id })} />
  </View>;

  if (!registration || !registrationId) return null;
  const captain = registration.studentId;
  const accepted = registration.membersAccepted || [];
  const offered = registration.membersOffered || [];
  const memberCount = 1 + accepted.length;
  const isCaptain = vertical.show === 1;

  return <View style={styles.panel}>
    <View style={styles.panelHeader}><View style={styles.panelHeading}><Text style={styles.panelTitle}>{isTeam ? registration.teamName || 'Your team' : 'Your application'}</Text><Text style={styles.body}>{isTeam ? `${isCaptain ? 'Team captain' : 'Team member'} · ${memberCount}/${vertical.maxTeamSize || 1} members` : 'Individual application'}</Text></View><Badge tone="info">{titleCase(registration.studentOverallStatus || registration.overallStatus || 'submitted')}</Badge></View>
    {isTeam ? <>
      {isCaptain ? <View style={styles.rename}><Field label="Team name" value={teamName} onChangeText={setTeamName} placeholder="Choose a team name" /><Button label={registration.teamName ? 'Rename team' : 'Save team name'} variant="secondary" disabled={!canEdit || working || teamName.trim().length < 2} onPress={() => void run('addTeamName', { teamName: teamName.trim() })} /></View> : null}
      <View style={styles.teamSection}><Text style={styles.eyebrow}>Members · {memberCount}/{vertical.maxTeamSize || 1}</Text>{captain ? <MemberRow student={captain} label="Captain" /> : null}{accepted.map((member) => <MemberRow key={member._id} student={member} label={member._id === captain?._id ? 'Captain' : 'Team member'} actions={isCaptain && member._id !== captain?._id ? <View style={styles.memberActions}><TextAction label="Make captain" disabled={!canEdit || working} onPress={() => void run('transferCaptain', { memberId: member._id }, { title: `Make ${member.name} captain?`, message: 'You will become a regular team member.', confirmLabel: 'Transfer captaincy' })} /><TextAction label="Remove" danger disabled={!canEdit || working} onPress={() => void run('removeTeamMember', { memberId: member._id }, { title: `Remove ${member.name}?`, message: 'They will lose access to this team application.', confirmLabel: 'Remove member', destructive: true })} /></View> : undefined} />)}</View>
      {isCaptain && memberCount < (vertical.minTeamSize || 1) ? <View style={styles.warning}><Text style={styles.warningText}>Invite at least {(vertical.minTeamSize || 1) - memberCount} more teammate(s) to meet the minimum team size.</Text></View> : null}
      {isCaptain && offered.length ? <View style={styles.teamSection}><Text style={styles.eyebrow}>Pending invitations</Text>{offered.map((member) => <View key={member._id} style={styles.pending}><View style={styles.memberMain}><Avatar uri={member.profilePicture} name={member.name} size={36} /><View style={styles.memberText}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberMeta}>{member.email}</Text></View></View><TextAction label="Cancel" danger disabled={working} onPress={() => void run('cancelMemberOffer', { memberEmail: member.email })} /></View>)}</View> : null}
      {isCaptain ? <View style={styles.invite}><Field label="Invite by IITR email" value={memberEmail} onChangeText={setMemberEmail} keyboardType="email-address" autoCapitalize="none" placeholder="student@iitr.ac.in" /><Button label="Send invitation" icon="person-add-outline" disabled={!canEdit || working || memberCount >= (vertical.maxTeamSize || 1) || !memberEmail.includes('@')} onPress={() => { void run('addMemberOffer', { memberEmail: memberEmail.trim().toLowerCase() }).then(() => setMemberEmail('')); }} /></View> : null}
    </> : null}
    <MetaRow icon="clipboard-outline">Track every exact round result and schedule below.</MetaRow>
    <Button label="Open all applications" variant="secondary" onPress={() => router.push('/(tabs)/applications')} />
    {isCaptain ? <Button label="Withdraw application" variant="danger" disabled={!canEdit || working} onPress={() => void run('unregisterAsCaptain', {}, { title: `Withdraw from ${vertical.title}?`, message: isTeam ? 'Your team will be disbanded and round work withdrawn.' : 'Your application and round work will be withdrawn.', confirmLabel: 'Withdraw', destructive: true })} /> : <Button label="Leave team" variant="danger" disabled={!canEdit || working} onPress={() => void run('leaveTeam', {}, { title: 'Leave this team?', message: 'You may need a new invitation to rejoin.', confirmLabel: 'Leave team', destructive: true })} />}
  </View>;
}

function MemberRow({ student, label, actions }: { student: StudentSummary; label: string; actions?: React.ReactNode }) {
  return <View style={styles.member}><View style={styles.memberMain}><Avatar uri={student.profilePicture} name={student.name} size={40} /><View style={styles.memberText}><Text style={styles.memberName}>{student.name}</Text><Text style={styles.memberMeta}>{label}{student.email ? ` · ${student.email}` : ''}</Text></View></View>{actions}</View>;
}

function TextAction({ label, onPress, danger = false, disabled = false }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} hitSlop={8}><Text style={[styles.textAction, danger && styles.textActionDanger, disabled && styles.disabled]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.lg }, panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, panelHeading: { flex: 1, gap: 3 }, panelTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18 }, body: { color: palette.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 19 }, rename: { gap: spacing.md },
  teamSection: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md }, eyebrow: { color: palette.muted, fontFamily: typography.mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.75 },
  member: { minHeight: 58, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: palette.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, memberText: { flex: 1, gap: 2 }, memberName: { color: palette.ink, fontFamily: typography.medium, fontSize: 13.5 }, memberMeta: { color: palette.muted, fontFamily: typography.regular, fontSize: 10.5 }, memberActions: { alignItems: 'flex-end', gap: 5 }, textAction: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 11.5 }, textActionDanger: { color: palette.danger }, disabled: { opacity: 0.4 },
  warning: { borderLeftWidth: 3, borderLeftColor: palette.warning, borderRadius: radius.sm, backgroundColor: palette.warningTint, padding: spacing.md }, warningText: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 12.5, lineHeight: 18 },
  pending: { minHeight: 54, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.lineStrong, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, invite: { gap: spacing.md },
  invitation: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, gap: spacing.md }, actions: { gap: spacing.sm },
});
