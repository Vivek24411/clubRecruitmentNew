import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar, Badge, Button, Card, Eyebrow, Field, Heading, LoadingState, Screen } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { apiRequest } from '@/lib/api';
import { LocalUpload, uploadDirect } from '@/lib/direct-upload';
import { titleCase } from '@/lib/date';
import type { Student } from '@/types/api';

export default function ProfileScreen() {
  const { profile, loading, signOut, refreshProfile } = useAuth();
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [picture, setPicture] = useState<LocalUpload | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordWorking, setPasswordWorking] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const handle = setTimeout(() => {
      setName(profile.name || ''); setPhone(profile.phoneNumber || '');
      setEmailUpdates(profile.notificationPreferences?.email !== false);
      setInAppAlerts(profile.notificationPreferences?.inApp !== false);
    }, 0);
    return () => clearTimeout(handle);
  }, [profile]);

  async function choosePicture() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { toast('Allow photo access to choose a profile picture.', 'error'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (picked.canceled) return;
    try {
      const asset = picked.assets[0];
      const maxEdge = Math.max(asset.width || 0, asset.height || 0);
      const actions = maxEdge > 1024 ? [{ resize: asset.width >= asset.height ? { width: 1024 } : { height: 1024 } }] : [];
      const optimized = await manipulateAsync(asset.uri, actions, { compress: 0.82, format: SaveFormat.JPEG });
      setPicture({ uri: optimized.uri, name: 'discovr-profile.jpg', mimeType: 'image/jpeg' });
      toast('New photo selected. Save changes to upload it.', 'info');
    } catch { toast('Could not prepare this image. Try another photo.', 'error'); }
  }

  async function saveProfile() {
    if (name.trim().length < 2) { toast('Enter your full name.', 'error'); return; }
    if (phone.replace(/\D/g, '').length < 10) { toast('Enter a valid phone number.', 'error'); return; }
    setSaving(true);
    try {
      const directAsset = picture ? await uploadDirect(picture, 'profilePicture') : undefined;
      const response = await apiRequest<{ success: boolean; msg?: string; student: Student }>('/student/profile', {
        method: 'PATCH',
        body: { name: name.trim(), phoneNumber: phone.trim(), notificationPreferences: { email: emailUpdates, inApp: inAppAlerts }, ...(directAsset ? { directAsset } : {}) },
        timeoutMs: 45_000,
      });
      await refreshProfile(); setPicture(null);
      toast(response.msg || 'Profile updated successfully.', 'success');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update profile.', 'error'); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (!currentPassword) { toast('Enter your current password.', 'error'); return; }
    if (newPassword.length < 10 || newPassword.length > 72) { toast('New password must contain 10–72 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('New passwords do not match.', 'error'); return; }
    const accepted = await confirm({ title: 'Change your password?', message: 'This will sign you out on every device.', confirmLabel: 'Update password' });
    if (!accepted) return;
    setPasswordWorking(true);
    try {
      const response = await apiRequest<{ success: boolean; msg?: string }>('/student/changePassword', { method: 'POST', body: { currentPassword, newPassword } });
      toast(response.msg || 'Password changed. Sign in again.', 'success');
      await signOut(); router.replace('/login');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not change password.', 'error'); }
    finally { setPasswordWorking(false); }
  }

  async function handleSignOut() {
    const accepted = await confirm({ title: 'Sign out of Discovr?', message: 'You can sign back in at any time.', confirmLabel: 'Sign out' });
    if (!accepted) return;
    await signOut(); toast('You have been signed out.', 'info');
  }

  if (loading) return <Screen><LoadingState label="Restoring your session…" /></Screen>;
  if (!profile) return <Screen contentStyle={styles.content}><AppHeader /><View style={styles.guestHero}><Eyebrow accent>Student account</Eyebrow><Heading size="xl">Your Discovr journey starts here.</Heading><Text style={styles.copy}>Sign in to apply, build teams, RSVP, submit round work, and receive alerts.</Text><Button label="Student sign in" onPress={() => router.push('/login')} icon="log-in-outline" /><Button label="Create student account" variant="secondary" onPress={() => router.push('/register')} icon="person-add-outline" /></View></Screen>;

  return <Screen contentStyle={styles.content}>
    <AppHeader />
    <View style={styles.intro}><Eyebrow accent>Account</Eyebrow><Heading size="xl">Profile and settings</Heading><Text style={styles.copy}>Keep your recruitment contact details and notification choices accurate.</Text></View>
    <Card style={styles.identityCard}>
      <Avatar uri={picture?.uri || profile.profilePicture} name={profile.name} size={94} />
      <View style={styles.identityText}><Text style={styles.name}>{profile.name}</Text><Text style={styles.email}>{profile.email}</Text><Badge tone="success">{profile.academicStatus === 'passed_out' ? 'Alumni' : profile.year || 'Student'}</Badge></View>
      <Button label={profile.profilePicture || picture ? 'Replace photo' : 'Upload photo'} variant="secondary" icon="camera-outline" onPress={() => void choosePicture()} />
      {picture ? <Button label="Discard selected photo" variant="ghost" onPress={() => setPicture(null)} /> : null}
    </Card>
    <Card style={styles.sectionCard}>
      <SectionTitle icon="account-edit-outline" title="Personal details" description="Email, enrollment, programme, branch, and year are fixed to your institute record." />
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <View style={styles.fixedGrid}><FixedDetail label="Enrollment" value={profile.enrollmentNumber} /><FixedDetail label="Programme" value={titleCase(profile.programme)} /><FixedDetail label="Branch / discipline" value={profile.branch} /><FixedDetail label="Academic year" value={profile.year} /></View>
    </Card>
    <Card style={styles.sectionCard}>
      <SectionTitle icon="bell-cog-outline" title="Recruitment notifications" description="Choose which application and RSVP updates Discovr may send." />
      <SettingToggle icon="bell-outline" title="In-app alerts" description="Team invitations, round schedules, results, and RSVP changes." value={inAppAlerts} onChange={setInAppAlerts} />
      <SettingToggle icon="email-outline" title="Email updates" description="Important recruitment decisions and session reminders by email." value={emailUpdates} onChange={setEmailUpdates} />
      <Button label="Open alerts" variant="secondary" icon="notifications-outline" onPress={() => router.push('/notifications')} />
    </Card>
    <Button label="Save profile changes" loading={saving} icon="checkmark-circle-outline" onPress={() => void saveProfile()} />
    <Card style={styles.sectionCard}>
      <SectionTitle icon="shield-key-outline" title="Change password" description="Changing your password signs you out of every active session." />
      <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" />
      <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" placeholder="At least 10 characters" />
      <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
      <Button label="Update password" variant="secondary" loading={passwordWorking} onPress={() => void changePassword()} />
    </Card>
    <Button label="Sign out" variant="secondary" onPress={() => void handleSignOut()} icon="log-out-outline" />
  </Screen>;
}

function SectionTitle({ icon, title, description }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; description: string }) {
  return <View style={styles.sectionTitle}><View style={styles.sectionIcon}><MaterialCommunityIcons name={icon} size={22} color={palette.accentDark} /></View><View style={styles.sectionTitleText}><Text style={styles.sectionHeading}>{title}</Text><Text style={styles.sectionDescription}>{description}</Text></View></View>;
}

function SettingToggle({ icon, title, description, value, onChange }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.setting}><View style={styles.settingIcon}><MaterialCommunityIcons name={icon} size={20} color={palette.accentDark} /></View><View style={styles.settingText}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDescription}>{description}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: palette.lineStrong, true: palette.accent }} thumbColor={palette.white} /></View>;
}

function FixedDetail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <View style={styles.fixedDetail}><Text style={styles.fixedLabel}>{label}</Text><Text style={styles.fixedValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md }, intro: { gap: spacing.sm }, guestHero: { gap: spacing.lg, paddingVertical: spacing.xl }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  identityCard: { padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderTopWidth: 3, borderTopColor: palette.accent }, identityText: { alignItems: 'center', gap: spacing.sm }, name: { color: palette.ink, fontFamily: typography.semibold, fontSize: 23 }, email: { color: palette.muted, fontFamily: typography.regular, fontSize: 13 },
  sectionCard: { padding: spacing.lg, gap: spacing.lg }, sectionTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, sectionIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' }, sectionTitleText: { flex: 1, gap: 4 }, sectionHeading: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18 }, sectionDescription: { color: palette.muted, fontFamily: typography.regular, fontSize: 12.5, lineHeight: 18 },
  fixedGrid: { gap: spacing.sm }, fixedDetail: { borderRadius: radius.sm, padding: spacing.md, backgroundColor: palette.paper, gap: 4 }, fixedLabel: { color: palette.muted, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 }, fixedValue: { color: palette.ink, fontFamily: typography.medium, fontSize: 14 },
  setting: { paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, settingIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.accentMist, alignItems: 'center', justifyContent: 'center' }, settingText: { flex: 1, gap: 3 }, settingTitle: { color: palette.ink, fontFamily: typography.medium, fontSize: 14 }, settingDescription: { color: palette.muted, fontFamily: typography.regular, fontSize: 11.5, lineHeight: 16 },
});
