import { View } from 'react-native';

import { MediaFill } from '@/components/post';
import { Avatar, Card, Icon, type IconName, Text } from '@/components/ui';

import type { PreviewProps } from '../preview-kit';

const ICONS: IconName[] = ['chatbubble-outline', 'repeat-outline', 'heart-outline', 'stats-chart-outline', 'share-outline'];

export default function XPreview({ page, caption, media, options }: PreviewProps) {
  const shown = media.slice(0, 4);
  return (
    <Card className="px-3.5 py-3">
      <View className="flex-row gap-2.5">
        <Avatar uri={page.avatar} name={page.name} size={40} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text variant="callout" className="shrink font-bold" numberOfLines={1}>
              {page.name}
            </Text>
            <Text variant="callout" tone="muted" className="shrink" numberOfLines={1}>
              @{page.handle} · now
            </Text>
          </View>
          {caption ? (
            <Text variant="callout" className="mt-0.5">
              {caption.slice(0, 280)}
              {caption.length > 280 ? (
                <Text variant="callout" tone="danger" className="bg-danger/15">
                  {caption.slice(280)}
                </Text>
              ) : null}
            </Text>
          ) : null}
          {shown.length ? (
            <View className="mt-2.5 flex-row flex-wrap gap-0.5 overflow-hidden rounded-2xl border border-line">
              {shown.map((m) => (
                <View
                  key={m.id}
                  className="overflow-hidden bg-fill"
                  style={{ width: shown.length > 1 ? '49.6%' : '100%', aspectRatio: shown.length > 1 ? 1.1 : 16 / 9 }}>
                  <MediaFill media={m} />
                </View>
              ))}
            </View>
          ) : null}
          {options.replies !== 'everyone' ? (
            <View className="mt-2 flex-row items-center gap-1">
              <Icon name="at" size={13} tone="accent" />
              <Text variant="footnote" tone="accent">
                {options.replies === 'following' ? 'People you follow can reply' : 'Only people you mention can reply'}
              </Text>
            </View>
          ) : null}
          <View className="mt-3 flex-row justify-between pr-4">
            {ICONS.map((i) => (
              <Icon key={i} name={i} size={17} tone="muted" />
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}
