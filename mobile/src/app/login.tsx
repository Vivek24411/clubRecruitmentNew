import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Brand, Button, Card, Eyebrow, Field, Heading, Screen } from '@/components/ui';
import { palette, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { toast } = useFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError('Enter your IITR email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signIn(email, password);
      toast('Signed in successfully. Welcome back!', 'success');
      router.back();
    }
    catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to sign in';
      setError(message); toast(message, 'error');
    }
    finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen safeTop={false} contentStyle={styles.content}>
      <Brand />
      <View style={styles.intro}><Eyebrow accent>Student access</Eyebrow><Heading size="xl">Welcome back.</Heading><Text style={styles.copy}>Sign in with the IITR email you registered with.</Text></View>
      <Card style={styles.form}>
        <Field label="IITR email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@iitr.ac.in" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" placeholder="Enter password" />
        {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="Sign in" loading={loading} onPress={() => void submit()} icon="arrow-forward" />
      </Card>
      <View style={styles.register}><Text style={styles.note}>New to Discovr?</Text><Button label="Create student account" variant="secondary" onPress={() => router.push('/register')} icon="person-add-outline" /></View>
    </Screen>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.paper }, content: { paddingTop: spacing.xl }, intro: { gap: spacing.md },
  copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 15, lineHeight: 23 },
  form: { padding: spacing.xl, gap: spacing.lg }, error: { color: palette.danger, fontFamily: typography.medium, fontSize: 13, lineHeight: 19 }, register: { gap: spacing.md }, note: { color: palette.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
