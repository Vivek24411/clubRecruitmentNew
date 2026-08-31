import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, typography } from '@/constants/theme';

const icons: Record<string, { active: keyof typeof MaterialCommunityIcons.glyphMap; idle: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  index: { active: 'home-variant', idle: 'home-variant-outline' },
  events: { active: 'calendar-star', idle: 'calendar-star-outline' },
  sessions: { active: 'account-group', idle: 'account-group-outline' },
  clubs: { active: 'view-grid', idle: 'view-grid-outline' },
  applications: { active: 'clipboard-text', idle: 'clipboard-text-outline' },
  profile: { active: 'account-circle', idle: 'account-circle-outline' },
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenListeners={{ tabPress: () => { void Haptics.selectionAsync(); } }} screenOptions={({ route }) => ({
      headerShown: false, tabBarActiveTintColor: palette.accent, tabBarInactiveTintColor: palette.muted,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        backgroundColor: palette.surface, borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth,
        height: 58 + Math.max(insets.bottom, 8), paddingTop: 7, paddingBottom: Math.max(insets.bottom, 8),
        shadowColor: palette.accentDeep, shadowOffset: { width: 0, height: -7 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 12,
      },
      tabBarItemStyle: { gap: 1 },
      tabBarLabelStyle: { fontFamily: typography.medium, fontSize: 10.5 },
      tabBarIconStyle: { marginBottom: 1 },
      tabBarIcon: ({ color, focused }) => {
        const icon = icons[route.name] || { active: 'circle', idle: 'circle-outline' };
        return <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <MaterialCommunityIcons name={focused ? icon.active : icon.idle} color={color} size={23} />
        </View>;
      },
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Tabs.Screen name="clubs" options={{ title: 'Clubs' }} />
      <Tabs.Screen name="applications" options={{ title: 'Applications' }} />
      <Tabs.Screen name="profile" options={{ title: 'You', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 42, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: palette.accentTint },
});
