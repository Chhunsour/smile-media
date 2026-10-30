import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Avatar, Button, Card, Glow, Icon, NavHeader, PlatformIcon, Press, Text } from '@/components/ui';
import { compact, plural } from '@/lib/format';
import { audience, PLATFORM_ORDER, PLATFORMS } from '@/platforms';
import { connect, disconnect, toast, useStore } from '@/lib/store';
import type { PlatformId, SocialAccount as Connection } from '@/models';

export default function Connections() {
  const connections = useStore((s) => s.accounts);
  return (
    <View className="flex-1 bg-bg">
      <Glow height={300} />
      <NavHeader title="Connected accounts" />
      <ScrollView contentContainerClassName="gap-3 px-5 pb-14" showsVerticalScrollIndicator={false}>
        <Text variant="footnote" tone="muted" className="mb-1">
          Connect an account to see destinations you are authorized to publish to. Select destinations in the composer.
        </Text>
        {PLATFORM_ORDER.map((p) => (
          <PlatformCard key={p} platform={p} connection={connections.find((c) => c.platform === p)} />
        ))}
      </ScrollView>
    </View>
  );
}

function PlatformCard({ platform, connection }: { platform: PlatformId; connection?: Connection }) {
  const p = PLATFORMS[platform];
  const [busy, setBusy] = useState(false);

  const onConnect = async () => {
    setBusy(true);
    const ok = await connect(platform);
    setBusy(false);
    if (ok) toast(`${p.name} connected`);
  };

  const onDisconnect = (c: Connection) =>
    Alert.alert(
      `Disconnect ${p.name}?`,
      `Scheduled posts to ${c.pages.length > 1 ? `these ${plural(c.pages.length, p.noun.toLowerCase())}` : 'this account'} will fail until you reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const disconnected = await disconnect(c.id);
            setBusy(false);
            if (disconnected) toast(`${p.name} disconnected`, 'info');
          },
        },
      ],
    );

  return (
    <Animated.View layout={LinearTransition.duration(220)}>
      <Card>
        <View className="flex-row items-center gap-3 p-4">
          <PlatformIcon platform={platform} size={46} radius={15} />
          <View className="flex-1">
            <Text variant="title">{p.name}</Text>
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {connection ? `Connected as ${connection.name}` : 'Not connected'}
            </Text>
          </View>
          {connection ? (
            <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2.5 py-1">
              <Icon name="checkmark-circle" size={13} tone="success" />
              <Text variant="caption" tone="success" className="font-semibold">
                {connection.status === 'expired' ? 'Reconnect needed' : 'Active'}
              </Text>
            </View>
          ) : (
            <Button title="Connect" size="sm" loading={busy} onPress={onConnect} />
          )}
        </View>

        {connection ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <View className="border-t border-line px-4">
              {connection.pages.length > 1 ? (
                <Text variant="caption" tone="muted" className="pt-3 font-semibold">
                  {plural(connection.pages.length, p.noun)}
                </Text>
              ) : null}
              {connection.pages.map((a) => (
                <View key={a.id} className="flex-row items-center gap-3 py-2.5">
                  <Avatar uri={a.avatar} name={a.name} size={36} />
                  <View className="flex-1">
                    <Text variant="callout" className="font-semibold" numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      @{a.handle} · {compact(a.followers)} {audience(platform)}
                    </Text>
                  </View>
                </View>
              ))}
              <Button title="Reconnect" size="sm" loading={busy} onPress={onConnect} />
              <Press
                onPress={() => onDisconnect(connection)}
                disabled={busy}
                className="flex-row items-center gap-1.5 self-start pb-3.5 pt-1.5">
                <Text variant="footnote" tone="danger" className="font-semibold">
                  {busy ? 'Disconnecting…' : 'Disconnect'}
                </Text>
              </Press>
            </View>
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}
