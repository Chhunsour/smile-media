import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { MediaThumb } from '@/components/post';
import { Button, Footer, Gradient, GradientIcon, type IconName, Press, SheetHeader, Text } from '@/components/ui';
import { plural } from '@/lib/format';
import { pickMedia } from '@/lib/picker';
import { addMedia, MAX_MEDIA, useStore } from '@/lib/store';
import type { MediaAsset } from '@/models';
import { services } from '@/services';

export default function MediaSheet() {
  const media = useStore((s) => s.draft.media);
  const [picked, setPicked] = useState<string[]>([]);
  const [LIBRARY, setLibrary] = useState<MediaAsset[]>([]);
  useEffect(() => {
    services.storage.library?.().then(setLibrary);
  }, []);
  const width = useWindowDimensions().width;
  const cell = Math.floor((width - 40 - 8) / 3);
  const room = MAX_MEDIA - media.length;

  const done = (items: Parameters<typeof addMedia>[0]) => {
    if (!items.length) return;
    addMedia(items);
    router.back();
  };
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < room ? [...p, id] : p));

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <SheetHeader
        title="Add media"
        subtitle={room > 0 ? `Up to ${plural(room, 'more item')}` : 'You’ve reached the 10 item limit'}
      />
      <View className="flex-row gap-3 px-5">
        <Source icon="images-outline" label="Photo library" onPress={async () => done(await pickMedia('library', room))} />
        <Source icon="camera-outline" label="Camera" onPress={async () => done(await pickMedia('camera', room))} />
      </View>
      {LIBRARY.length ? (
      <Text variant="footnote" tone="muted" className="ml-6 mt-6 pb-2 font-semibold">
        Media library
      </Text>
      ) : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-row flex-wrap gap-1 px-5 pb-6"
        showsVerticalScrollIndicator={false}>
        {LIBRARY.map((m) => {
          const n = picked.indexOf(m.id);
          const used = media.some((x) => x.id === m.id);
          return (
            <Pressable
              key={m.id}
              disabled={used}
              onPress={() => toggle(m.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: n >= 0, disabled: used }}
              accessibilityLabel={m.type === 'video' ? 'Video' : 'Photo'}>
              <MediaThumb media={m} size={cell} radius={10} />
              {used ? (
                <View className="absolute inset-0 items-center justify-center rounded-[10px] bg-black/45">
                  <Text variant="caption" tone="white" className="font-semibold">
                    Added
                  </Text>
                </View>
              ) : (
                <View className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-black/20">
                  {n >= 0 ? <Gradient style={{ position: 'absolute', inset: 0 }} /> : null}
                  {n >= 0 ? (
                    <Text variant="caption" tone="white" className="font-bold">
                      {n + 1}
                    </Text>
                  ) : null}
                </View>
              )}
              {n >= 0 ? (
                <View className="absolute inset-0 rounded-[10px] border-[3px] border-white/90" pointerEvents="none" />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {LIBRARY.length ? (
      <Footer>
        <Button
          title={picked.length ? `Add ${plural(picked.length, 'item')}` : 'Select from library'}
          disabled={!picked.length}
          onPress={() => done(picked.map((id) => LIBRARY.find((m) => m.id === id)!))}
        />
      </Footer>
      ) : null}
    </View>
  );
}

function Source({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} className="h-[84px] flex-1 justify-center gap-2 rounded-[20px] bg-card px-4">
      <GradientIcon name={icon} size={24} />
      <Text variant="footnote" className="font-semibold">
        {label}
      </Text>
    </Press>
  );
}
