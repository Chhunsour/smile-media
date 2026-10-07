import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { MediaFill } from '@/components/post';
import { Avatar, Card, Icon, Text } from '@/components/ui';
import { duration } from '@/lib/format';

import type { PreviewProps } from '../preview-kit';

export default function YouTubePreview({ page, media, options }: PreviewProps) {
  const video = media.find((m) => m.type === 'video');
  return (
    <Card>
      <View className="w-full overflow-hidden bg-neutral-900" style={{ aspectRatio: 16 / 9 }}>
        {video ? (
          <MediaFill media={video} badge={false} />
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Ionicons name="logo-youtube" size={30} color="rgba(255,255,255,0.5)" />
            <Text variant="footnote" tone="white" className="opacity-60">
              YouTube needs a video
            </Text>
          </View>
        )}
        {video?.duration ? (
          <View className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5">
            <Text variant="micro" tone="white" className="font-semibold">
              {duration(video.duration)}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row gap-3 p-3.5">
        <Avatar uri={page.avatar} name={page.name} size={36} />
        <View className="flex-1 gap-1">
          <Text variant="callout" className="font-semibold" numberOfLines={2}>
            {String(options.title || 'Untitled video')}
          </Text>
          <Text variant="caption" tone="muted">
            {page.name} · No views · Just now
          </Text>
          {options.visibility !== 'public' ? (
            <View className="mt-1 flex-row items-center gap-1 self-start rounded bg-fill px-1.5 py-0.5">
              <Icon name="lock-closed" size={10} tone="muted" />
              <Text variant="micro" tone="muted" className="font-semibold capitalize">
                {String(options.visibility)}
              </Text>
            </View>
          ) : null}
        </View>
        <Icon name="ellipsis-vertical" size={16} tone="muted" />
      </View>
    </Card>
  );
}
