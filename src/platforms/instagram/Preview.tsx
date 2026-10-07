import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Avatar, Card, Icon, Text } from '@/components/ui';

import { Dots, IG_GRADIENT, type PreviewProps, Vertical, Visual } from '../preview-kit';

export default function InstagramPreview(props: PreviewProps) {
  const { page, caption, media, options } = props;
  if (options.format === 'reel' || options.format === 'story') return <Vertical {...props} kind={options.format} />;
  return (
    <Card>
      <View className="flex-row items-center gap-2.5 px-3 py-2.5">
        <LinearGradient colors={IG_GRADIENT} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ padding: 2, borderRadius: 99 }}>
          <View className="rounded-full bg-card p-[2px]">
            <Avatar uri={page.avatar} name={page.name} size={28} />
          </View>
        </LinearGradient>
        <Text variant="footnote" className="flex-1 font-semibold">
          {page.handle}
        </Text>
        <Icon name="ellipsis-horizontal" size={18} />
      </View>
      <Visual media={media} aspect={4 / 5} empty="Instagram needs a photo or video" />
      <View className="flex-row items-center gap-4 px-3 pt-3">
        <Icon name="heart-outline" size={24} />
        <Icon name="chatbubble-outline" size={22} />
        <Icon name="paper-plane-outline" size={22} />
        <View className="flex-1 items-center">{media.length > 1 ? <Dots count={media.length} /> : null}</View>
        <Icon name="bookmark-outline" size={22} />
      </View>
      <Text variant="footnote" className="px-3 pb-3.5 pt-2" numberOfLines={3}>
        <Text variant="footnote" className="font-semibold">
          {page.handle}{' '}
        </Text>
        {caption}
      </Text>
    </Card>
  );
}
