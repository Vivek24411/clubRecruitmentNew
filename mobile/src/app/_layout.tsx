import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans/700Bold';
import { useFonts } from 'expo-font';
import { router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { palette, typography } from '@/constants/theme';
import { AuthProvider } from '@/context/auth-context';
import { FeedbackProvider } from '@/context/feedback-context';
import { loadNotifications, notificationPath } from '@/lib/push-notifications';

void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  dark: false,
  colors: { primary: palette.accent, background: palette.paper, card: palette.surface, text: palette.ink, border: palette.line, notification: palette.accent },
  fonts: {
    regular: { fontFamily: typography.regular, fontWeight: '400' as const }, medium: { fontFamily: typography.medium, fontWeight: '500' as const },
    bold: { fontFamily: typography.semibold, fontWeight: '600' as const }, heavy: { fontFamily: typography.bold, fontWeight: '700' as const },
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
    InstrumentSans_700Bold, IBMPlexMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;

    void (async () => {
      const Notifications = await loadNotifications();
      if (!active || !Notifications) return;

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        router.push(notificationPath(response) as never);
      });
      const response = await Notifications.getLastNotificationResponseAsync();
      if (active && response) router.push(notificationPath(response) as never);
    })().catch((error) => console.warn('Could not initialize notification routing.', error));

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <FeedbackProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{
              animation: 'slide_from_right', headerBackButtonDisplayMode: 'minimal',
              headerStyle: { backgroundColor: palette.surface }, headerTintColor: palette.ink,
              headerTitleStyle: { fontFamily: typography.semibold, fontSize: 17 },
              headerShadowVisible: false, contentStyle: { backgroundColor: palette.paper },
            }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: 'Student sign in', presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="register" options={{ title: 'Create account', presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="forgot-password" options={{ title: 'Reset password', presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
              <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
              <Stack.Screen name="club/[id]" options={{ title: 'Club' }} />
              <Stack.Screen name="notifications" options={{ title: 'Alerts' }} />
              <Stack.Screen name="applications" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
