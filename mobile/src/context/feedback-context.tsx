import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { palette, radius, shadowLift, spacing, typography } from '@/constants/theme';

type ToastTone = 'success' | 'error' | 'info';
type ToastState = { id: number; message: string; tone: ToastTone } | null;
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; destructive?: boolean };
type FeedbackValue = {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toastState, setToastState] = useState<ToastState>(null);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);

  useEffect(() => {
    if (!toastState) return;
    const timer = setTimeout(() => setToastState(null), 3400);
    return () => clearTimeout(timer);
  }, [toastState]);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    setToastState({ id: Date.now(), message, tone });
    if (tone === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (tone === 'error') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else void Haptics.selectionAsync();
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setDialog(options);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }), []);

  function settle(answer: boolean) {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
    if (answer) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const toastColors = toastState ? {
    success: { background: palette.success, icon: 'check-circle-outline' as const },
    error: { background: palette.danger, icon: 'alert-circle-outline' as const },
    info: { background: palette.accentDeep, icon: 'information-outline' as const },
  }[toastState.tone] : null;

  return <FeedbackContext.Provider value={{ toast, confirm }}>
    {children}
    <View pointerEvents="box-none" style={[styles.toastLayer, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
      {toastState && toastColors ? <Animated.View key={toastState.id} entering={FadeInDown.springify().damping(17)} exiting={FadeOutUp.duration(220)} style={[styles.toast, { backgroundColor: toastColors.background }]}>
        <View style={styles.toastIcon}><MaterialCommunityIcons name={toastColors.icon} size={22} color={palette.white} /></View>
        <Text style={styles.toastText}>{toastState.message}</Text>
        <Pressable accessibilityLabel="Dismiss notification" hitSlop={12} onPress={() => setToastState(null)}><MaterialCommunityIcons name="close" size={19} color={palette.white} /></Pressable>
      </Animated.View> : null}
    </View>
    <Modal visible={Boolean(dialog)} transparent animationType="none" statusBarTranslucent onRequestClose={() => settle(false)}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} />
        {dialog ? <Animated.View entering={ZoomIn.springify().damping(18)} exiting={ZoomOut.duration(160)} style={[styles.dialog, { marginBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.dialogMark, dialog.destructive && styles.dialogMarkDanger]}><MaterialCommunityIcons name={dialog.destructive ? 'alert-outline' : 'gesture-tap-button'} size={24} color={dialog.destructive ? palette.danger : palette.accent} /></View>
          <Text style={styles.dialogTitle}>{dialog.title}</Text><Text style={styles.dialogMessage}>{dialog.message}</Text>
          <View style={styles.dialogActions}><Button label="Cancel" variant="secondary" onPress={() => settle(false)} /><Button label={dialog.confirmLabel || 'Confirm'} variant={dialog.destructive ? 'danger' : 'primary'} onPress={() => settle(true)} /></View>
        </Animated.View> : null}
      </Animated.View>
    </Modal>
  </FeedbackContext.Provider>;
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider');
  return value;
}

const styles = StyleSheet.create({
  toastLayer: { position: 'absolute', zIndex: 1000, top: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, alignItems: 'center' },
  toast: { width: '100%', maxWidth: 520, minHeight: 62, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadowLift },
  toastIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, color: palette.white, fontFamily: typography.semibold, fontSize: 14, lineHeight: 20 },
  scrim: { flex: 1, backgroundColor: 'rgba(8, 18, 26, 0.46)', justifyContent: 'flex-end', padding: spacing.lg },
  dialog: { backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', ...shadowLift },
  dialogMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' },
  dialogMarkDanger: { backgroundColor: palette.dangerTint }, dialogTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 22, letterSpacing: -0.5 },
  dialogMessage: { color: palette.muted, fontFamily: typography.regular, fontSize: 15, lineHeight: 23 }, dialogActions: { marginTop: spacing.sm, gap: spacing.sm },
});
