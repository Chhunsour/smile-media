import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { totalsOf } from '@/components/post';
import { Avatar, Card, Glow, Gradient, GradientText, Group, Icon, PlatformStack, Row, Segmented, Switch, Text, useTabSpace } from '@/components/ui';
import { features } from '@/config/features';
import { compact } from '@/lib/format';
import { PLATFORM_ORDER } from '@/platforms';
import { APP_MODE, APP_NAME } from '@/config/app';
import { allPages, type FailureMode, resetDemo, setSettings, signOut, type ThemePref, toast, useStore } from '@/lib/store';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const FAILURES: { value: FailureMode; label: string }[] = [
  { value: 'off', label: 'Never' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'always', label: 'Always' },
];

/** A row of film-strip sprocket holes — the brand's film motif. */
function Sprockets() {
  return (
    <View className="flex-row justify-between px-3">
      {Array.from({ length: 16 }, (_, i) => (
        <View key={i} className="h-[9px] w-[14px] rounded-[3px] bg-white/25" />
      ))}
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const ME = useStore((s) => s.user)!;
  const connections = useStore((s) => s.accounts);
  const posts = useStore((s) => s.posts);
  const platforms = PLATFORM_ORDER.filter((p) => connections.some((c) => c.platform === p));
  const reach = posts.reduce((s, p) => s + totalsOf(p).reach, 0);
  const templates = useStore((s) => s.templates.length);
  const space = useTabSpace();

  const confirmReset = () =>
    Alert.alert('Reset demo data?', 'Posts, drafts and connected accounts go back to the original sample data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetDemo();
          toast('Demo data restored', 'info');
        },
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: space }} showsVerticalScrollIndicator={false}>
      <Gradient style={{ paddingTop: insets.top + 14, paddingBottom: 14, gap: 54 }}>
        <Sprockets />
        <Sprockets />
      </Gradient>
      <View className="h-0">
        <Glow height={260} />
      </View>

      <View className="-mt-12 px-5">
        <Avatar uri={ME.avatar} name={ME.name} size={92} ring="bg" glow />
        <Text variant="display" className="mt-4">
          {ME.name}
        </Text>
        <Text variant="footnote" tone="muted" className="mt-1">
          {ME.role ? `${ME.role} · ` : ''}{ME.email}
        </Text>
        {ME.workspace ? (
          <View className="mt-3 flex-row items-center gap-1.5 self-start rounded-full bg-fill px-3 py-1.5">
            <Icon name="play-circle" size={14} tone="accent" />
            <Text variant="caption" className="font-semibold">
              {ME.workspace} workspace
            </Text>
          </View>
        ) : null}
      </View>

      <Card className="mx-5 mt-6 flex-row py-4">
        <Stat value={String(posts.length)} label="Posts" />
        <View className="w-px bg-line" />
        <Stat value={String(allPages(connections).length)} label="Channels" />
        <View className="w-px bg-line" />
        <Stat value={compact(reach)} label="Total reach" />
      </Card>

      <Group title="Workspace">
        <Row
          icon="link-outline"
          title="Connected accounts"
          onPress={() => router.push('/connections')}
          right={
            <View className="flex-row items-center gap-2">
              <PlatformStack platforms={platforms} size={18} ring="card" />
              <Icon name="chevron-forward" size={16} tone="subtle" />
            </View>
          }
        />
        {features.analytics ? <Row icon="analytics-outline" title="Insights" onPress={() => router.push('/insights')} /> : null}
        <Row icon="bookmarks-outline" title="Caption templates" detail={String(templates)} onPress={() => router.push('/templates')} last />
      </Group>

      <Group title="Appearance">
        <View className="p-3">
          <Segmented value={settings.theme} options={THEMES} onChange={(theme) => setSettings({ theme })} />
        </View>
      </Group>

      <Group title="Notifications" footer="Get a banner when a post finishes publishing or fails.">
        <Row
          icon="notifications-outline"
          title="Publishing alerts"
          right={<Switch value={settings.notifications} onValueChange={(notifications) => setSettings({ notifications })} />}
          last
        />
      </Group>

      {APP_MODE === 'demo' ? (
      <Group title="Testing" footer="Mock publishing fails at this rate so you can try the retry and error states.">
        <View className="gap-3 border-b border-line p-4">
          <Text variant="callout" className="font-medium">
            Simulate API failures
          </Text>
          <Segmented value={settings.failures} options={FAILURES} onChange={(failures) => setSettings({ failures })} />
        </View>
        <Row icon="refresh" title="Reset demo data" tone="danger" onPress={confirmReset} last />
      </Group>
      ) : (
        <Group title="Account">
          <Row
            icon="log-out-outline"
            title="Sign out"
            tone="danger"
            onPress={() =>
              Alert.alert('Sign out?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
              ])
            }
            last
          />
        </Group>
      )}

      <Text variant="caption" tone="subtle" className="mt-10 text-center">
        {APP_NAME} · v1.0{APP_MODE === 'demo' ? ' · Demo mode — nothing leaves this device' : ''}
      </Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <GradientText variant="title">{value}</GradientText>
      <Text variant="caption" tone="muted" className="font-semibold">
        {label}
      </Text>
    </View>
  );
}
