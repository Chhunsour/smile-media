import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
import { type BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, Gradient, GradientIcon, Icon, type IconName, Press, Text } from '@/components/ui';
import { startCompose, useStore } from '@/lib/store';
import { BRAND, useColors, useScheme } from '@/lib/theme';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  posts: { label: 'Posts', icon: 'albums-outline', active: 'albums' },
  calendar: { label: 'Calendar', icon: 'calendar-clear-outline', active: 'calendar-clear' },
  profile: { label: 'You', icon: 'person-circle-outline', active: 'person-circle' },
};

export default function TabLayout() {
  const segments = useSegments();
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="posts" />
        <Tabs.Screen name="calendar" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {/* Profile's gradient banner runs under the status bar on purpose. */}
      {segments.at(-1) === 'profile' ? null : <StatusScrim />}
    </View>
  );
}

/** Fades scrolled content out under the status bar. */
function StatusScrim() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[c.bg, `${c.bg}E6`, `${c.bg}00`]}
      locations={[0, 0.55, 1]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 18 }}
    />
  );
}

/** Floating glass pill with a raised gradient "create" button in the middle. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const dark = useScheme() === 'dark';
  const failed = useStore((s) => s.posts.some((p) => p.status === 'failed'));

  const tabs = state.routes.map((route, i) => {
    const tab = TABS[route.name];
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (focused || event.defaultPrevented) return;
          Haptics.selectionAsync();
          navigation.navigate(route.name, route.params);
        }}
        className="flex-1 items-center justify-center gap-[3px]">
        <View>
          {focused ? <GradientIcon name={tab.active} size={24} /> : <Icon name={tab.icon} size={24} tone="muted" />}
          {route.name === 'posts' && failed ? (
            <View className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-danger" />
          ) : null}
        </View>
        <Text variant="micro" tone={focused ? 'fg' : 'muted'} className="font-semibold">
          {tab.label}
        </Text>
      </Pressable>
    );
  });

  tabs.splice(
    2,
    0,
    <View key="create" className="flex-1 items-center justify-center">
      <Press
        haptic
        accessibilityRole="button"
        accessibilityLabel="Create post"
        onPress={() => startCompose()}
        style={{ shadowColor: BRAND[1], shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        className="h-[52px] w-[52px] items-center justify-center">
        <Gradient style={{ ...StyleSheet.absoluteFill, borderRadius: 26 }} />
        <Ionicons name="add" size={30} color="#fff" />
      </Press>
    </View>,
  );

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom - 6, 12) }}>
      <View
        style={{
          borderRadius: 36,
          shadowColor: '#000',
          shadowOpacity: dark ? 0.5 : 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
        }}>
        <Glass style={{ borderRadius: 36 }}>
          <View className="h-[68px] flex-row px-1.5">{tabs}</View>
        </Glass>
      </View>
    </View>
  );
}
