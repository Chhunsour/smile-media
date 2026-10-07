import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, Text } from '@/components/ui';

import { type PreviewProps, Rail, Tall } from '../preview-kit';

export default function TikTokPreview({ page, caption, media, options }: PreviewProps) {
  return (
    <Tall media={media} empty="TikTok needs a video or photos">
      <View className="absolute left-0 right-0 top-4 flex-row justify-center gap-4">
        <Text variant="footnote" tone="white" className="font-semibold opacity-60">
          Following
        </Text>
        <View className="items-center">
          <Text variant="footnote" tone="white" className="font-bold">
            For You
          </Text>
          <View className="mt-1 h-0.5 w-5 rounded-full bg-white" />
        </View>
      </View>
      <View className="absolute bottom-20 right-2.5 items-center gap-4">
        <View className="mb-1 items-center">
          <Avatar uri={page.avatar} name={page.name} size={40} />
          <View className="-mt-2 h-4 w-4 items-center justify-center rounded-full bg-[#FE2C55]">
            <Ionicons name="add" size={12} color="#fff" />
          </View>
        </View>
        <Rail
          items={[
            ['heart', '0'],
            ['chatbubble-ellipses', options.comments === false ? 'Off' : '0'],
            ['bookmark', '0'],
            ['arrow-redo', 'Share'],
          ]}
        />
      </View>
      <View className="absolute bottom-4 left-3 right-16 gap-1">
        <Text variant="footnote" tone="white" className="font-bold">
          @{page.handle}
        </Text>
        {caption ? (
          <Text variant="caption" tone="white" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1">
          <Ionicons name="musical-notes" size={11} color="#fff" />
          <Text variant="micro" tone="white" numberOfLines={1}>
            original sound - {page.handle}
          </Text>
        </View>
      </View>
      {options.privacy !== 'public' ? (
        <View className="absolute left-3 top-12 flex-row items-center gap-1 rounded-full bg-black/50 px-2 py-1">
          <Ionicons name="lock-closed" size={10} color="#fff" />
          <Text variant="micro" tone="white" className="font-semibold">
            {options.privacy === 'friends' ? 'Friends' : 'Only me'}
          </Text>
        </View>
      ) : null}
    </Tall>
  );
}
