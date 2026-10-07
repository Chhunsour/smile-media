import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { MediaFill } from '@/components/post';
import { Avatar, Icon, Text } from '@/components/ui';
import type { MediaAsset, PlatformId, PlatformOptions, SocialPage } from '@/models';

/*
 * Building blocks for the per-platform look-alike previews (platforms/<id>/Preview.tsx).
 * They follow the app theme except where the real app is always dark (TikTok, Reels, Stories).
 */

export type PreviewProps = {
  platform: PlatformId;
  page: Pick<SocialPage, 'name' | 'handle' | 'avatar'>;
  caption: string;
  media: MediaAsset[];
  options: PlatformOptions;
};

export const IG_GRADIENT = ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5'] as const;
const SHADE = ['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.75)'] as const;

export function Visual({ media, aspect, empty }: { media: MediaAsset[]; aspect: number; empty?: string }) {
  return (
    <View className="w-full overflow-hidden bg-fill" style={{ aspectRatio: aspect }}>
      {media[0] ? (
        <MediaFill media={media[0]} />
      ) : (
        <View className="flex-1 items-center justify-center gap-2">
          <Icon name="image-outline" size={28} tone="subtle" />
          {empty ? (
            <Text variant="footnote" tone="subtle">
              {empty}
            </Text>
          ) : null}
        </View>
      )}
      {media.length > 1 ? (
        <View className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5">
          <Text variant="micro" tone="white" className="font-semibold">
            1/{media.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function Dots({ count }: { count: number }) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: Math.min(count, 6) }, (_, i) => (
        <View key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-accent' : 'bg-subtle/50'}`} />
      ))}
    </View>
  );
}

/** Full-bleed 9:16 frame shared by TikTok, Reels and Stories. */
export function Tall({ media, empty, children }: { media: MediaAsset[]; empty: string; children: ReactNode }) {
  return (
    <View className="self-center overflow-hidden rounded-[28px] bg-neutral-900" style={{ width: 272, aspectRatio: 9 / 16 }}>
      {media[0] ? (
        <MediaFill media={media[0]} badge={false} />
      ) : (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Ionicons name="film-outline" size={30} color="rgba(255,255,255,0.5)" />
          <Text variant="footnote" tone="white" className="text-center opacity-60">
            {empty}
          </Text>
        </View>
      )}
      <LinearGradient colors={SHADE} locations={[0, 0.18, 0.55, 1]} style={{ position: 'absolute', inset: 0 }} pointerEvents="none" />
      {children}
    </View>
  );
}

export function Rail({ items }: { items: [ComponentProps<typeof Ionicons>['name'], string][] }) {
  return (
    <>
      {items.map(([icon, label]) => (
        <View key={icon} className="items-center">
          <Ionicons name={icon} size={26} color="#fff" />
          {label ? (
            <Text variant="micro" tone="white" className="mt-0.5 font-semibold">
              {label}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

/** Reels and Stories, shared by Facebook and Instagram. */
export function Vertical({ platform, page, caption, media, kind }: PreviewProps & { kind: 'reel' | 'story' }) {
  const name = platform === 'instagram' ? page.handle : page.name;
  if (kind === 'story') {
    return (
      <Tall media={media} empty="Stories need a photo or video">
        <View className="absolute left-2.5 right-2.5 top-2.5 h-[2px] rounded-full bg-white/40">
          <View className="h-full w-1/3 rounded-full bg-white" />
        </View>
        <View className="absolute left-3 top-5 flex-row items-center gap-2">
          <Avatar uri={page.avatar} name={page.name} size={28} />
          <Text variant="footnote" tone="white" className="font-semibold">
            {name}
          </Text>
          <Text variant="footnote" tone="white" className="opacity-70">
            now
          </Text>
        </View>
        <View className="absolute bottom-4 left-3 right-3 flex-row items-center gap-3">
          <View className="h-10 flex-1 justify-center rounded-full border border-white/50 px-4">
            <Text variant="footnote" tone="white">
              Send message
            </Text>
          </View>
          <Ionicons name="heart-outline" size={24} color="#fff" />
          <Ionicons name="paper-plane-outline" size={22} color="#fff" />
        </View>
      </Tall>
    );
  }
  return (
    <Tall media={media} empty="Reels need a video">
      <Text variant="headline" tone="white" className="absolute left-4 top-4">
        Reels
      </Text>
      <View className="absolute bottom-24 right-3 items-center gap-5">
        <Rail
          items={[
            ['heart-outline', '0'],
            ['chatbubble-outline', '0'],
            ['paper-plane-outline', ''],
            ['ellipsis-horizontal', ''],
          ]}
        />
      </View>
      <View className="absolute bottom-4 left-3 right-14 gap-2">
        <View className="flex-row items-center gap-2">
          <Avatar uri={page.avatar} name={page.name} size={28} />
          <Text variant="footnote" tone="white" className="font-semibold" numberOfLines={1}>
            {name}
          </Text>
          <View className="rounded-md border border-white/60 px-2 py-0.5">
            <Text variant="micro" tone="white" className="font-semibold">
              Follow
            </Text>
          </View>
        </View>
        {caption ? (
          <Text variant="caption" tone="white" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Tall>
  );
}
