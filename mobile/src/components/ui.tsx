import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren, ReactNode, useState } from 'react';
import {
  ActivityIndicator, ImageStyle, Pressable, RefreshControl, ScrollView, StyleProp,
  StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, shadow, spacing, typography } from '@/constants/theme';

const discovrWordmark = require('../../../student/public/discovrlogo.png');

export function Screen({ children, refreshing, onRefresh, contentStyle, safeTop = true }: PropsWithChildren<{
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  safeTop?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.screen} edges={safeTop ? ['top'] : []}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} /> : undefined}
      >
        <Animated.View entering={FadeIn.duration(320)} style={[styles.screenContent, { paddingBottom: spacing.xl + Math.max(insets.bottom, spacing.lg) }, contentStyle]}>
          {children}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <View style={[styles.brand, inverse && styles.brandInverse]} accessibilityLabel="Discovr">
      <Image source={discovrWordmark} style={compact ? styles.brandLogoCompact : styles.brandLogo} contentFit="contain" />
      {!compact ? <Text style={[styles.brandMeta, inverse && styles.brandMetaInverse]}>IIT ROORKEE</Text> : null}
    </View>
  );
}

export function Avatar({ uri, name = 'Student', size = 44 }: { uri?: string; name?: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S';
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.paper }} contentFit="cover" transition={180} cachePolicy="memory-disk" />;
  return <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.32) }]}>{initials}</Text></View>;
}

export function Eyebrow({ children, accent = false, inverse = false }: PropsWithChildren<{ accent?: boolean; inverse?: boolean }>) {
  return <Text style={[styles.eyebrow, accent && styles.eyebrowAccent, inverse && styles.eyebrowInverse]}>{children}</Text>;
}

export function Heading({ children, size = 'lg', inverse = false }: PropsWithChildren<{ size?: 'md' | 'lg' | 'xl'; inverse?: boolean }>) {
  return <Text style={[styles.heading, size === 'md' && styles.headingMd, size === 'xl' && styles.headingXl, inverse && styles.headingInverse]}>{children}</Text>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PressableScale({ children, onPress, style, accessibilityLabel, haptic = true }: PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  haptic?: boolean;
}>) {
  const scale = useSharedValue(1);
  const motionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(260)} style={[styles.pressableShell, style, motionStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => { scale.set(withSpring(0.975, { damping: 18, stiffness: 280 })); }}
        onPressOut={() => { scale.set(withSpring(1, { damping: 16, stiffness: 260 })); }}
        onPress={() => {
          if (haptic) void Haptics.selectionAsync();
          onPress?.();
        }}
        style={styles.pressableFill}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger' }>) {
  const toneStyle = { neutral: styles.badgeNeutral, accent: styles.badgeAccent, success: styles.badgeSuccess, info: styles.badgeInfo, warning: styles.badgeWarning, danger: styles.badgeDanger }[tone];
  return <View style={[styles.badge, toneStyle]}><Text style={styles.badgeText}>{children}</Text></View>;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon }: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const scale = useSharedValue(1);
  const motionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inverted = variant === 'primary' || variant === 'danger';
  return (
    <Animated.View style={[styles.buttonShell, motionStyle, (disabled || loading) && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        onPressIn={() => { scale.set(withSpring(0.975, { damping: 18, stiffness: 300 })); }}
        onPressOut={() => { scale.set(withSpring(1, { damping: 16, stiffness: 280 })); }}
        style={[styles.button, styles[`button_${variant}`]]}
      >
        {variant === 'primary' ? <LinearGradient colors={['#0A86CF', palette.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {variant === 'danger' ? <LinearGradient colors={[palette.danger, '#792B24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {loading ? <ActivityIndicator color={inverted ? palette.white : palette.ink} /> : (
          <>
            {icon ? <Ionicons name={icon} size={18} color={inverted ? palette.white : palette.ink} /> : null}
            <Text style={[styles.buttonText, inverted && styles.buttonTextInverse]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field({ label, error, onFocus, onBlur, style, multiline, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        placeholderTextColor={palette.faint}
        selectionColor={palette.accent}
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, multiline && styles.inputMultiline, style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={styles.searchWrap}>
    <Ionicons name="search-outline" size={19} color={palette.muted} />
    <TextInput
      accessibilityRole="search"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.faint}
      selectionColor={palette.accent}
      returnKeyType="search"
      style={styles.searchInput}
    />
    {value ? <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChangeText('')}><Ionicons name="close-circle" size={19} color={palette.faint} /></Pressable> : null}
  </View>;
}

export function FilterChip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={() => { void Haptics.selectionAsync(); onPress(); }}
    style={[styles.filterChip, selected && styles.filterChipSelected]}
  >
    {icon ? <Ionicons name={icon} size={15} color={selected ? palette.white : palette.inkSoft} /> : null}
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
  </Pressable>;
}

export function RemoteImage({ uri, style, contain = false }: { uri?: string; style?: StyleProp<ImageStyle>; contain?: boolean }) {
  if (!uri) return <View style={[styles.imageFallback, style]}><Text style={styles.imageFallbackText}>D</Text></View>;
  return <Image source={{ uri }} style={style} contentFit={contain ? 'contain' : 'cover'} transition={220} cachePolicy="memory-disk" />;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>{eyebrow ? <Eyebrow accent>{eyebrow}</Eyebrow> : null}<Heading size="md">{title}</Heading></View>
      {action}
    </View>
  );
}

export function LoadingState({ label = 'Loading Discovr…' }: { label?: string }) {
  return <View style={styles.state}><View style={styles.loaderRing}><ActivityIndicator color={palette.accent} /></View><Text style={styles.stateText}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={24} color={palette.danger} /></View>
      <Text style={styles.errorTitle}>Couldn’t load this</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <Card style={styles.state}><View style={styles.emptyIcon}><Ionicons name="sparkles-outline" size={23} color={palette.accent} /></View><Text style={styles.errorTitle}>{title}</Text><Text style={styles.stateText}>{message}</Text></Card>;
}

export function MetaRow({ icon, children }: PropsWithChildren<{ icon: keyof typeof Ionicons.glyphMap }>) {
  return <View style={styles.metaRow}><View style={styles.metaIcon}><Ionicons name={icon} size={15} color={palette.accentDark} /></View><Text style={styles.metaText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  scrollContent: { flexGrow: 1 },
  screenContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xl },
  brand: { alignSelf: 'flex-start', gap: 3, backgroundColor: palette.ink, borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 8 }, brandInverse: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
  brandLogo: { width: 128, height: 35 }, brandLogoCompact: { width: 104, height: 29 },
  brandMeta: { color: '#B9DDF2', fontFamily: typography.mono, fontSize: 8, marginLeft: 4, letterSpacing: 1.55 }, brandMetaInverse: { color: '#B9DDF2' },
  avatarFallback: { backgroundColor: palette.accentTint, borderWidth: 1, borderColor: 'rgba(8,120,190,0.22)', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: palette.accentDeep, fontFamily: typography.semibold },
  eyebrow: { color: palette.muted, fontFamily: typography.mono, fontSize: 10, lineHeight: 15, letterSpacing: 1.15, textTransform: 'uppercase' },
  eyebrowAccent: { color: palette.accentDark }, eyebrowInverse: { color: '#CBEAFE' },
  heading: { color: palette.ink, fontFamily: typography.display, fontSize: 27, lineHeight: 31, letterSpacing: -0.8 },
  headingMd: { fontSize: 20, lineHeight: 24, letterSpacing: -0.4 }, headingXl: { fontSize: 36, lineHeight: 39, letterSpacing: -1.35 }, headingInverse: { color: palette.white },
  card: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: radius.md, overflow: 'hidden', ...shadow },
  pressableShell: { alignSelf: 'stretch' }, pressableFill: { alignSelf: 'stretch' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeNeutral: { backgroundColor: palette.paper }, badgeAccent: { backgroundColor: palette.accentTint }, badgeSuccess: { backgroundColor: palette.successTint },
  badgeInfo: { backgroundColor: palette.infoTint }, badgeWarning: { backgroundColor: palette.warningTint }, badgeDanger: { backgroundColor: palette.dangerTint },
  badgeText: { color: palette.inkSoft, fontFamily: typography.semibold, fontSize: 10, letterSpacing: 0.35, textTransform: 'uppercase' },
  buttonShell: { alignSelf: 'stretch', borderRadius: radius.sm, ...shadow },
  button: { minHeight: 50, borderRadius: radius.sm, paddingHorizontal: spacing.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, borderWidth: 1 },
  button_primary: { backgroundColor: palette.accent, borderColor: palette.accentDark }, button_danger: { backgroundColor: palette.danger, borderColor: '#792B24' },
  button_secondary: { backgroundColor: palette.surface, borderColor: palette.lineStrong }, button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonText: { color: palette.ink, fontFamily: typography.semibold, fontSize: 15 }, buttonTextInverse: { color: palette.white }, disabled: { opacity: 0.5 },
  field: { gap: 7 }, fieldLabel: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 13 }, fieldLabelFocused: { color: palette.accentDark },
  input: { minHeight: 52, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.sm, backgroundColor: palette.white, color: palette.ink, paddingHorizontal: spacing.lg, fontFamily: typography.regular, fontSize: 16 },
  inputFocused: { borderColor: palette.accent, borderWidth: 1.5, backgroundColor: palette.accentMist }, inputError: { borderColor: palette.danger },
  inputMultiline: { minHeight: 112, paddingTop: spacing.lg, textAlignVertical: 'top' }, fieldError: { color: palette.danger, fontFamily: typography.medium, fontSize: 12 },
  searchWrap: { minHeight: 52, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.sm, backgroundColor: palette.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchInput: { flex: 1, minHeight: 50, color: palette.ink, fontFamily: typography.regular, fontSize: 15 },
  filterChip: { minHeight: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  filterChipSelected: { borderColor: palette.ink, backgroundColor: palette.ink }, filterChipText: { color: palette.inkSoft, fontFamily: typography.medium, fontSize: 13 }, filterChipTextSelected: { color: palette.white },
  imageFallback: { backgroundColor: palette.accentDeep, alignItems: 'center', justifyContent: 'center' }, imageFallbackText: { color: palette.surface, fontFamily: typography.bold, fontSize: 26 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg }, sectionHeaderText: { gap: spacing.xs, flex: 1 },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }, stateText: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loaderRing: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' },
  errorCard: { padding: spacing.xl, gap: spacing.md, alignItems: 'flex-start' }, errorIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: palette.dangerTint, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: palette.ink, fontFamily: typography.semibold, fontSize: 18 }, errorText: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, metaIcon: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' },
  metaText: { color: palette.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 19, flex: 1 },
});
