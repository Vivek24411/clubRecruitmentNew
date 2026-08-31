import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Badge, Brand, Button, Card, Eyebrow, Field, Heading, Screen } from '@/components/ui';
import { palette, spacing, typography } from '@/constants/theme';
import { useFeedback } from '@/context/feedback-context';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { toast } = useFeedback();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [working, setWorking] = useState(false);

  async function sendCode() {
    if (!/^[^\s@]+@(?:[a-z0-9-]+\.)*iitr\.ac\.in$/i.test(email.trim())) {
      toast('Enter a valid IITR institute email.', 'error'); return;
    }
    setWorking(true);
    try {
      const response = await apiRequest<{ success: boolean; msg?: string }>('/student/sendOtp', {
        method: 'POST', body: { email: email.trim().toLowerCase(), purpose: 'password_reset' },
      });
      setStep(2); toast(response.msg || 'If the account exists, a code has been sent.', 'success');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not send a reset code.', 'error'); }
    finally { setWorking(false); }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(code)) { toast('Enter the six-digit code from your email.', 'error'); return; }
    if (newPassword.length < 10 || newPassword.length > 72) { toast('Password must contain 10–72 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('The new passwords do not match.', 'error'); return; }
    setWorking(true);
    try {
      const verified = await apiRequest<{ success: boolean; verificationToken: string }>('/student/verifyOtp', {
        method: 'POST', body: { email: email.trim().toLowerCase(), otp: code, purpose: 'password_reset' },
      });
      await apiRequest('/student/forgotPassword', {
        method: 'POST', body: { email: email.trim().toLowerCase(), newPassword, resetToken: verified.verificationToken },
      });
      toast('Password reset. You can sign in now.', 'success'); router.replace('/login');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not reset your password.', 'error'); }
    finally { setWorking(false); }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen safeTop={false} contentStyle={styles.content}>
      <Brand />
      <View style={styles.intro}><Eyebrow accent>Account recovery</Eyebrow><Heading size="xl">{step === 1 ? 'Reset your password.' : 'Choose a new password.'}</Heading><Text style={styles.copy}>{step === 1 ? 'We’ll send a one-time code to your IITR email.' : `Enter the code sent to ${email}.`}</Text></View>
      <View style={styles.steps}><Badge tone={step === 1 ? 'accent' : 'success'}>1 · Email</Badge><View style={styles.line} /><Badge tone={step === 2 ? 'accent' : 'neutral'}>2 · Reset</Badge></View>
      <Card style={styles.card}>{step === 1 ? <>
        <Field label="IITR email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@iitr.ac.in" />
        <Button label="Send reset code" loading={working} icon="mail-outline" onPress={() => void sendCode()} />
      </> : <>
        <Field label="One-time code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" style={styles.code} />
        <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" placeholder="At least 10 characters" />
        <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
        <Button label="Reset password" loading={working} icon="shield-checkmark-outline" onPress={() => void resetPassword()} />
        <Button label="Resend code" variant="secondary" disabled={working} onPress={() => void sendCode()} />
        <Button label="Change email" variant="ghost" disabled={working} onPress={() => { setStep(1); setCode(''); }} />
      </>}</Card>
      <Button label="Back to sign in" variant="secondary" onPress={() => router.replace('/login')} />
    </Screen>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.paper }, content: { paddingTop: spacing.xl }, intro: { gap: spacing.md }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  steps: { flexDirection: 'row', alignItems: 'center' }, line: { flex: 1, height: 1, backgroundColor: palette.lineStrong }, card: { padding: spacing.xl, gap: spacing.lg }, code: { textAlign: 'center', fontFamily: typography.mono, fontSize: 22, letterSpacing: 8 },
});
