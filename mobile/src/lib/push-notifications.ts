import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';

const tokenKey = 'discovr.native.push-token';

export type NativePushState = 'enabled' | 'disabled' | 'blocked' | 'simulator' | 'unavailable';

let notificationsPromise: Promise<typeof import('expo-notifications')> | null = null;

function notificationsUnsupported() {
  return Platform.OS === 'android' && isRunningInExpoGo();
}

export async function loadNotifications() {
  if (notificationsUnsupported()) return null;
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return Notifications;
    });
  }
  return notificationsPromise;
}

function projectId() {
  return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
}

export async function nativePushState(): Promise<NativePushState> {
  if (notificationsUnsupported()) return 'unavailable';
  if (!Device.isDevice) return 'simulator';
  if (!projectId()) return 'unavailable';
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unavailable';
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'denied') return 'blocked';
  return await SecureStore.getItemAsync(tokenKey) ? 'enabled' : 'disabled';
}

export async function enableNativePush() {
  if (notificationsUnsupported()) {
    throw new Error('Android push notifications require a development build and are unavailable in Expo Go.');
  }
  if (!Device.isDevice) throw new Error('Push notifications require a physical device.');
  const easProjectId = projectId();
  if (!easProjectId) throw new Error('Push notifications are not configured for this build.');
  const Notifications = await loadNotifications();
  if (!Notifications) throw new Error('Push notifications are unavailable in this app.');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recruitment', {
      name: 'Recruitment updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: '#0878BE',
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Notification permission was not granted. You can enable it in system settings.');

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
  await apiRequest('/student/push/registration', {
    method: 'PUT', body: { installationId: token, provider: 'expo' },
  });
  await SecureStore.setItemAsync(tokenKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return token;
}

export async function disableNativePush() {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (token) {
    await apiRequest('/student/push/registration', { method: 'DELETE', body: { installationId: token } });
  }
  await SecureStore.deleteItemAsync(tokenKey);
}

export function notificationPath(response: NotificationResponse) {
  const link = response.notification.request.content.data?.link;
  if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return '/notifications';
  if (link === '/profile') return '/(tabs)/profile';
  if (link === '/applications' || link.startsWith('/applications?')) return '/(tabs)/applications';
  return link;
}
