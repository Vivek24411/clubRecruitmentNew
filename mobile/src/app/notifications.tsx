import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Href, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, Eyebrow, Heading, LoadingState, PressableScale, Screen } from '@/components/ui';
import { palette, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { apiRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import type { Notification } from '@/types/api';

function notificationIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type.includes('team')) return 'account-group-outline';
  if (type.includes('round') || type.includes('decision')) return 'clipboard-check-outline';
  if (type.includes('session') || type.includes('rsvp')) return 'calendar-check-outline';
  return 'bell-outline';
}

function appHref(link?: string | null): Href | null {
  if (!link) return null;
  if (link === '/applications' || link.startsWith('/applications?')) return '/(tabs)/applications';
  if (link === '/profile') return '/(tabs)/profile';
  return link as Href;
}

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const { toast } = useFeedback();
  const query = useApiQuery<{ success: boolean; notifications: Notification[]; unreadCount: number }>(profile ? '/student/notifications' : null);
  const notifications = query.data?.notifications || [];
  const unread = notifications.filter((item) => !item.readAt).length;

  async function markRead(notification: Notification, navigate = false) {
    try {
      if (!notification.readAt) await apiRequest('/student/notifications/read', { method: 'POST', body: { notificationId: notification._id } });
      if (navigate) {
        const href = appHref(notification.link);
        if (href) router.push(href);
      }
      await query.reload();
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update this alert.', 'error'); }
  }

  async function markAllRead() {
    try {
      const response = await apiRequest<{ success: boolean; msg?: string }>('/student/notifications/read-all', { method: 'POST' });
      toast(response.msg || 'All alerts marked as read.', 'success');
      await query.reload();
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update alerts.', 'error'); }
  }

  if (!profile) return <Screen safeTop={false} contentStyle={styles.content}><View style={styles.intro}><Eyebrow accent>Student updates</Eyebrow><Heading size="xl">Alerts</Heading><Text style={styles.copy}>Sign in to see team invitations, schedules, decisions, and RSVP changes.</Text></View><Button label="Sign in" onPress={() => router.replace('/login')} /></Screen>;
  return <Screen safeTop={false} refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={styles.content}>
    <View style={styles.headingRow}><View style={styles.intro}><Eyebrow accent>{unread ? `${unread} unread` : 'All caught up'}</Eyebrow><Heading size="xl">Alerts</Heading><Text style={styles.copy}>Team invitations, round schedules, decisions, and RSVP updates.</Text></View>{unread ? <Button label="Read all" variant="secondary" onPress={() => void markAllRead()} /> : null}</View>
    {query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} onRetry={query.reload} /> : !notifications.length ? <EmptyState title="Nothing here yet" message="Updates about applications and RSVPs will appear here." /> : <View style={styles.list}>{notifications.map((notification) => {
      const isUnread = !notification.readAt;
      const href = appHref(notification.link);
      return <PressableScale key={notification._id} haptic={false} onPress={() => void markRead(notification, Boolean(href))}>
        <Card style={[styles.alertCard, isUnread && styles.alertUnread]}>
          <View style={[styles.icon, isUnread && styles.iconUnread]}><MaterialCommunityIcons name={notificationIcon(notification.type)} size={22} color={isUnread ? palette.accentDark : palette.muted} /></View>
          <View style={styles.alertBody}><View style={styles.alertTop}><Text style={[styles.alertTitle, isUnread && styles.alertTitleUnread]}>{notification.title}</Text>{isUnread ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.message}>{notification.message}</Text><View style={styles.alertFooter}><Text style={styles.time}>{formatDateTime(notification.createdAt)}</Text>{href ? <Text style={styles.open}>Open details →</Text> : isUnread ? <Text style={styles.open}>Mark read</Text> : null}</View></View>
        </Card>
      </PressableScale>;
    })}</View>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg }, headingRow: { gap: spacing.lg }, intro: { gap: spacing.sm }, copy: { color: palette.muted, fontFamily: typography.regular, fontSize: 14, lineHeight: 21 }, list: { gap: spacing.md },
  alertCard: { padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, alertUnread: { backgroundColor: palette.accentMist, borderLeftWidth: 3, borderLeftColor: palette.accent },
  icon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' }, iconUnread: { backgroundColor: palette.accentTint }, alertBody: { flex: 1, gap: 7 }, alertTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  alertTitle: { flex: 1, color: palette.inkSoft, fontFamily: typography.medium, fontSize: 15, lineHeight: 19 }, alertTitleUnread: { color: palette.ink, fontFamily: typography.semibold }, unreadDot: { marginTop: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent },
  message: { color: palette.inkSoft, fontFamily: typography.regular, fontSize: 13.5, lineHeight: 20 }, alertFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, time: { color: palette.muted, fontFamily: typography.mono, fontSize: 9.5 }, open: { color: palette.accentDark, fontFamily: typography.semibold, fontSize: 12 },
});
