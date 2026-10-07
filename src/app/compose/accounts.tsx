import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar, Button, Card, Check, Chip, Footer, PlatformIcon, Press, SheetHeader, Text } from '@/components/ui';
import { compact, plural } from '@/lib/format';
import { audience, PLATFORM_ORDER, PLATFORMS } from '@/platforms';
import { allPages, connect, updateDraft, useStore } from '@/lib/store';
import type { PlatformId, SocialAccount as Connection } from '@/models';

export default function AccountsSheet() {
  const connections = useStore((s) => s.accounts);
  const ids = useStore((s) => s.draft.pageIds);
  const connected = PLATFORM_ORDER.flatMap((p) => connections.filter((c) => c.platform === p));
  const missing = PLATFORM_ORDER.filter((p) => !connections.some((c) => c.platform === p));
  const lastUsed = useStore((s) => s.settings.lastPageIds);
  const pages = allPages(connected);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));
  // One-tap presets; "Video" is everywhere a vertical video can go.
  const presets = [
    { label: 'Everything', ids: pages.map((a) => a.id) },
    { label: 'Last used', ids: lastUsed.filter((id) => pages.some((a) => a.id === id)) },
    { label: 'Video', ids: pages.filter((a) => ['tiktok', 'youtube', 'instagram'].includes(a.platform)).map((a) => a.id) },
  ].filter((p) => p.ids.length);

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    updateDraft({ pageIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  };
  const toggleAll = (c: Connection) => {
    Haptics.selectionAsync();
    const all = c.pages.map((a) => a.id);
    const on = all.every((id) => ids.includes(id));
    updateDraft({ pageIds: on ? ids.filter((id) => !all.includes(id)) : [...new Set([...ids, ...all])] });
  };

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <SheetHeader
        title="Post to"
        subtitle={ids.length ? `${plural(ids.length, 'channel')} selected` : 'Pick one or more channels'}
        right={
          ids.length ? (
            <Button title="Clear" variant="secondary" size="sm" onPress={() => updateDraft({ pageIds: [] })} />
          ) : null
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0" contentContainerClassName="gap-2 px-5 pb-4">
        {presets.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            count={p.ids.length}
            selected={same(ids, p.ids)}
            onPress={() => updateDraft({ pageIds: p.ids })}
          />
        ))}
      </ScrollView>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
        {connected.map((c) => {
          const p = PLATFORMS[c.platform];
          const picked = c.pages.filter((a) => ids.includes(a.id)).length;
          const multi = c.pages.length > 1;
          return (
            <View key={c.id} className="mb-5">
              <View className="mb-2 ml-1 flex-row items-center gap-2">
                <PlatformIcon platform={c.platform} size={18} />
                <Text variant="footnote" className="flex-1 font-semibold" numberOfLines={1}>
                  {p.name}
                  <Text variant="footnote" tone="muted">
                    {multi ? `  ·  ${picked} of ${plural(c.pages.length, p.noun)}` : ''}
                  </Text>
                </Text>
                {multi ? (
                  <Press onPress={() => toggleAll(c)} hitSlop={8}>
                    <Text variant="footnote" tone="accent" className="font-semibold">
                      {picked === c.pages.length ? 'Deselect all' : 'Select all'}
                    </Text>
                  </Press>
                ) : null}
              </View>
              <Card>
                {c.pages.map((a, i) => (
                  <Pressable
                    key={a.id}
                    onPress={() => toggle(a.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ids.includes(a.id) }}
                    className={`flex-row items-center gap-3 px-3.5 py-3 active:bg-fill ${i ? 'border-t border-line' : ''}`}>
                    <Avatar uri={a.avatar} name={a.name} size={40} />
                    <View className="flex-1">
                      <Text variant="callout" className="font-semibold" numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {p.noun} · {compact(a.followers)} {audience(a.platform)}
                      </Text>
                    </View>
                    <Check checked={ids.includes(a.id)} />
                  </Pressable>
                ))}
              </Card>
            </View>
          );
        })}

        {missing.length ? (
          <View>
            <Text variant="footnote" tone="muted" className="mb-2 ml-1 font-semibold">
              Not connected
            </Text>
            <Card>
              {missing.map((p, i) => (
                <ConnectRow key={p} platform={p} first={i === 0} />
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
      <Footer>
        <Button title={ids.length ? `Done · ${plural(ids.length, 'channel')}` : 'Done'} onPress={() => router.back()} />
      </Footer>
    </View>
  );
}

function ConnectRow({ platform, first }: { platform: PlatformId; first: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <View className={`flex-row items-center gap-3 px-3.5 py-3 ${first ? '' : 'border-t border-line'}`}>
      <PlatformIcon platform={platform} size={36} radius={10} />
      <Text variant="callout" className="flex-1 font-semibold">
        {PLATFORMS[platform].name}
      </Text>
      <Button
        title="Connect"
        size="sm"
        variant="secondary"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await connect(platform);
          setBusy(false);
        }}
      />
    </View>
  );
}
