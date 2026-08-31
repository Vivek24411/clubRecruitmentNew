import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Brand } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

export function AppHeader() {
  const { profile } = useAuth();
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!profile) { setUnread(0); return; }
    try {
      const response = await apiRequest<{ success: boolean; unreadCount: number }>('/student/notifications/unread-count');
      setUnread(response.unreadCount || 0);
    } catch { /* Header counts should never block navigation. */ }
  }, [profile]);

  useFocusEffect(useCallback(() => { void loadUnread(); }, [loadUnread]));
  useEffect(() => {
    if (!profile) return;
    const timer = setInterval(() => { void loadUnread(); }, 120_000);
    return () => clearInterval(timer);
  }, [loadUnread, profile]);

  return <View style={styles.header}>
    <Pressable accessibilityLabel="Discovr home" onPress={() => router.push('/(tabs)')}><Brand compact inverse /></Pressable>
    <View style={styles.actions}>
      {profile ? <Pressable accessibilityLabel={`${unread} unread alerts`} onPress={() => router.push('/notifications')} style={styles.actionButton}>
        <MaterialCommunityIcons name={unread ? 'bell' : 'bell-outline'} size={21} color={palette.accentDark} />
        {unread ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
      </Pressable> : null}
      <Pressable accessibilityLabel={profile ? 'Open profile' : 'Sign in'} onPress={() => router.push(profile ? '/(tabs)/profile' : '/login')} style={styles.profileButton}>
        {profile ? <Avatar uri={profile.profilePicture} name={profile.name} size={36} /> : <MaterialCommunityIcons name="login-variant" size={21} color={palette.accentDark} />}
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, shadowColor: palette.accentDeep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.accentMist, borderWidth: 1, borderColor: palette.accentTint, alignItems: 'center', justifyContent: 'center' },
  profileButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.paperRaised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { position: 'absolute', top: -2, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: palette.accent, borderWidth: 2, borderColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: palette.white, fontFamily: typography.bold, fontSize: 8.5 },
});
