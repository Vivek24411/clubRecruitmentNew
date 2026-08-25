import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Brand, Button, Card, Eyebrow, Field, Heading, LoadingState, Screen } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { apiRequest } from '@/lib/api';
import type { Student } from '@/types/api';

type Programme = { value: string; label: string; durationYears: number | null; branchMode: string };
type Branch = { name: string; durationYears: number };
type Year = { value: number; label: string };
type AcademicOptions = {
  success: boolean;
  academicConfiguration: { branches: Branch[] };
  programmes: Programme[];
  years: Year[];
};

type Form = {
  name: string; email: string; password: string; programme: string; branch: string;
  academicYear: string; phoneNumber: string; enrollmentNumber: string;
};

const initialForm: Form = {
  name: '', email: '', password: '', programme: 'undergraduate', branch: '',
  academicYear: '', phoneNumber: '', enrollmentNumber: '',
};

const fallbackProgrammes: Programme[] = [
  { value: 'undergraduate', label: 'Undergraduate', durationYears: null, branchMode: 'configured' },
  { value: 'mtech', label: 'M.Tech.', durationYears: 2, branchMode: 'manual' },
  { value: 'msc', label: 'M.Sc.', durationYears: 2, branchMode: 'manual' },
  { value: 'mba', label: 'MBA', durationYears: 2, branchMode: 'manual' },
  { value: 'phd', label: 'PhD', durationYears: 5, branchMode: 'manual' },
];
const fallbackYears: Year[] = [1, 2, 3, 4, 5].map((value) => ({ value, label: `${value}${value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th'} year` }));

function isIitrEmail(value: string) {
  return /^[^\s@]+@(?:[a-z0-9-]+\.)*iitr\.ac\.in$/i.test(value.trim());
}

function ChoiceField({ label, value, placeholder, options, onChange }: {
  label: string; value: string; placeholder: string; options: { label: string; value: string }[]; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.choiceField}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.choiceButton}>
      <Text style={selected ? styles.choiceValue : styles.choicePlaceholder}>{selected?.label || placeholder}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={palette.muted} />
    </Pressable>
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}><Heading size="md">{label}</Heading><Pressable accessibilityLabel="Close choices" onPress={() => setOpen(false)} style={styles.modalClose}><MaterialCommunityIcons name="close" size={21} color={palette.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.options}>
          {options.map((option) => <Pressable key={option.value} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.option, option.value === value && styles.optionSelected]}>
            <Text style={styles.optionText}>{option.label}</Text>{option.value === value ? <Badge tone="success">Selected</Badge> : null}
          </Pressable>)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
}

export default function RegisterScreen() {
  const { acceptRegistration } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState<Form>(initialForm);
  const [options, setOptions] = useState<AcademicOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<AcademicOptions>('/student/academic-options')
      .then((response) => { if (active) setOptions(response); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load academic options'); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  const programmes = options?.programmes?.length ? options.programmes : fallbackProgrammes;
  const years = options?.years?.length ? options.years : fallbackYears;
  const branches = options?.academicConfiguration?.branches || [];
  const selectedProgramme = programmes.find((item) => item.value === form.programme) || fallbackProgrammes[0];
  const selectedBranch = branches.find((item) => item.name === form.branch);
  const courseDuration = selectedProgramme.durationYears || selectedBranch?.durationYears || 5;
  const availableYears = useMemo(() => years.filter((year) => year.value <= courseDuration), [courseDuration, years]);

  function set(key: keyof Form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function validateDetails() {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.enrollmentNumber.trim() || !form.phoneNumber.trim() || !form.branch.trim() || !form.academicYear) return 'Complete every field.';
    if (!isIitrEmail(form.email)) return 'Enter a valid IITR institute email.';
    if (form.name.trim().length < 2) return 'Enter your full name.';
    if (form.password.length < 10) return 'Password must contain at least 10 characters.';
    if (form.password.length > 72) return 'Password must be at most 72 characters.';
    if (form.enrollmentNumber.trim().length < 5) return 'Enter a valid enrollment number.';
    if (form.phoneNumber.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    return '';
  }

  async function sendOtp() {
    const problem = validateDetails();
    if (problem) { setError(problem); return; }
    setWorking(true); setError(''); setMessage('');
    try {
      const response = await apiRequest<{ success: boolean; msg?: string }>('/student/sendOtp', { method: 'POST', body: { email: form.email.trim().toLowerCase(), purpose: 'signup' } });
      setMessage(response.msg || 'Code accepted for delivery. Check your inbox and spam folder.');
      setOtpStage(true);
      toast('Verification code sent. Check your inbox.', 'success');
    } catch (caught) {
      const problem = caught instanceof Error ? caught.message : 'Could not send the verification code.';
      setError(problem); toast(problem, 'error');
    } finally { setWorking(false); }
  }

  async function verifyAndRegister() {
    if (!/^\d{6}$/.test(otp)) { setError('Enter the six-digit code from your email.'); return; }
    setWorking(true); setError('');
    try {
      const verified = await apiRequest<{ success: boolean; verificationToken: string }>('/student/verifyOtp', {
        method: 'POST', body: { email: form.email.trim().toLowerCase(), otp, purpose: 'signup' },
      });
      const registered = await apiRequest<{ success: boolean; token: string; student?: Student }>('/student/register', {
        method: 'POST', body: { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), branch: form.branch.trim(), enrollmentNumber: form.enrollmentNumber.trim().toUpperCase(), academicYear: Number(form.academicYear), verificationToken: verified.verificationToken },
      });
      await acceptRegistration(registered.token, registered.student);
      toast('Your Discovr account is ready.', 'success');
      router.replace('/(tabs)/profile');
    } catch (caught) {
      const problem = caught instanceof Error ? caught.message : 'Could not create your account.';
      setError(problem); toast(problem, 'error');
    } finally { setWorking(false); }
  }

  if (optionsLoading) return <Screen safeTop={false}><LoadingState label="Loading registration options…" /></Screen>;

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen safeTop={false} contentStyle={styles.content}>
      <Brand />
      <View style={styles.intro}><Eyebrow accent>Create account</Eyebrow><Heading size="xl">{otpStage ? 'Verify your email.' : 'Join Discovr.'}</Heading><Text style={styles.copy}>{otpStage ? `Enter the code sent to ${form.email}.` : 'Register using your IITR institute email.'}</Text></View>
      <View style={styles.steps}><Badge tone={otpStage ? 'success' : 'accent'}>1 · Details</Badge><View style={styles.stepLine} /><Badge tone={otpStage ? 'accent' : 'neutral'}>2 · Verify</Badge></View>
      <Card style={styles.formCard}>
        {otpStage ? <>
          <Field label="One-time code" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" style={styles.otp} />
          {message ? <Text style={styles.success}>{message}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Verify and create account" loading={working} onPress={() => void verifyAndRegister()} icon="checkmark-circle-outline" />
          <Button label="Resend code" variant="secondary" disabled={working} onPress={() => void sendOtp()} />
          <Button label="Edit details" variant="ghost" disabled={working} onPress={() => { setOtpStage(false); setOtp(''); setError(''); setMessage(''); }} />
        </> : <>
          <Field label="Full name" value={form.name} onChangeText={(value) => set('name', value)} autoComplete="name" placeholder="Your full name" />
          <Field label="IITR email" value={form.email} onChangeText={(value) => set('email', value)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@iitr.ac.in" />
          <Field label="Password" value={form.password} onChangeText={(value) => set('password', value)} secureTextEntry autoCapitalize="none" autoComplete="new-password" placeholder="At least 10 characters" />
          <Field label="Enrollment number" value={form.enrollmentNumber} onChangeText={(value) => set('enrollmentNumber', value)} autoCapitalize="characters" placeholder="Enrollment number" />
          <Field label="Phone number" value={form.phoneNumber} onChangeText={(value) => set('phoneNumber', value)} keyboardType="phone-pad" autoComplete="tel" placeholder="10-digit phone number" />
          <ChoiceField label="Programme" value={form.programme} placeholder="Choose programme" options={programmes.map((item) => ({ label: item.label, value: item.value }))} onChange={(value) => setForm((previous) => ({ ...previous, programme: value, branch: '', academicYear: '' }))} />
          {form.programme === 'undergraduate' ? <ChoiceField label="Branch / programme" value={form.branch} placeholder="Choose branch" options={branches.map((item) => ({ label: item.name, value: item.name }))} onChange={(value) => setForm((previous) => ({ ...previous, branch: value, academicYear: '' }))} /> : <Field label="Branch or discipline" value={form.branch} onChangeText={(value) => set('branch', value)} placeholder={`${selectedProgramme.label} discipline`} />}
          <ChoiceField label="Academic year" value={form.academicYear} placeholder="Choose year" options={availableYears.map((item) => ({ label: item.label, value: String(item.value) }))} onChange={(value) => set('academicYear', value)} />
          {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="Send verification code" loading={working} onPress={() => void sendOtp()} icon="mail-outline" />
        </>}
      </Card>
      <View style={styles.signIn}><Text style={styles.copy}>Already registered?</Text><Button label="Sign in" variant="secondary" onPress={() => router.replace('/login')} /></View>
    </Screen>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.paper }, content: { paddingTop: spacing.xl }, intro: { gap: spacing.md },
  copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 }, steps: { flexDirection: 'row', alignItems: 'center' }, stepLine: { flex: 1, height: 1, backgroundColor: palette.lineStrong },
  formCard: { padding: spacing.xl, gap: spacing.lg }, error: { color: palette.danger, fontFamily: typography.medium, fontSize: 13, lineHeight: 19 }, success: { color: palette.success, fontFamily: typography.medium, fontSize: 13, lineHeight: 19 }, otp: { textAlign: 'center', fontFamily: typography.mono, fontSize: 22, letterSpacing: 8 },
  signIn: { gap: spacing.md }, choiceField: { gap: 7 }, fieldLabel: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 13 }, choiceButton: { minHeight: 52, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.sm, backgroundColor: palette.white, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  choiceValue: { color: palette.ink, fontFamily: typography.regular, fontSize: 15, flex: 1 }, choicePlaceholder: { color: palette.faint, fontFamily: typography.regular, fontSize: 15, flex: 1 }, modal: { flex: 1, backgroundColor: palette.paper },
  modalHeader: { padding: spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line }, options: { padding: spacing.lg, paddingBottom: spacing.hero, gap: spacing.sm }, option: { minHeight: 54, padding: spacing.lg, borderRadius: radius.sm, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, optionSelected: { borderColor: palette.accent, backgroundColor: palette.accentMist }, optionText: { color: palette.ink, fontFamily: typography.medium, fontSize: 14, lineHeight: 20, flex: 1 },
});
