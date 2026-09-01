import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, typography } from '@/constants/theme';

const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', idle: 'home-outline' },
  events: { active: 'sparkles', idle: 'sparkles-outline' },
  sessions: { active: 'people', idle: 'people-outline' },
  clubs: { active: 'grid', idle: 'grid-outline' },
  applications: { active: 'document-text', idle: 'document-text-outline' },
  calendar: { active: 'calendar-clear', idle: 'calendar-clear-outline' },
  profile: { active: 'person-circle', idle: 'person-circle-outline' },
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenListeners={{ tabPress: () => { void Haptics.selectionAsync(); } }} screenOptions={({ route }) => ({
      headerShown: false, tabBarActiveTintColor: palette.accent, tabBarInactiveTintColor: palette.muted,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        position: 'absolute', left: 10, right: 10, bottom: Math.max(insets.bottom, 8),
        backgroundColor: palette.surface, borderColor: palette.lineStrong, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22,
        height: 64, paddingTop: 7, paddingBottom: 7,
        shadowColor: palette.accentDeep, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 14,
      },
      tabBarItemStyle: { gap: 1 },
      tabBarLabelStyle: { fontFamily: typography.medium, fontSize: 9.5 },
      tabBarIconStyle: { marginBottom: 1 },
      tabBarIcon: ({ color, focused }) => {
        const icon = icons[route.name] || { active: 'ellipse', idle: 'ellipse-outline' };
        return <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <Ionicons name={focused ? icon.active : icon.idle} color={color} size={21} />
        </View>;
      },
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="clubs" options={{ title: 'Clubs' }} />
      <Tabs.Screen name="applications" options={{ title: 'Applied' }} />
      <Tabs.Screen name="profile" options={{ title: 'You', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 42, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: palette.accentTint },
});
