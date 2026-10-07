import { View } from 'react-native';

import { Avatar, Card, Icon, type IconName, Text } from '@/components/ui';

import { type PreviewProps, Vertical, Visual } from '../preview-kit';

const ACTIONS: [IconName, string][] = [
  ['thumbs-up-outline', 'Like'],
  ['chatbubble-outline', 'Comment'],
  ['arrow-redo-outline', 'Share'],
];

export default function FacebookPreview(props: PreviewProps) {
  const { page, caption, media, options } = props;
  if (options.format === 'reel' || options.format === 'story') return <Vertical {...props} kind={options.format} />;
  return (
    <Card>
      <View className="flex-row items-center gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <Avatar uri={page.avatar} name={page.name} size={38} />
        <View className="flex-1">
          <Text variant="callout" className="font-semibold" numberOfLines={1}>
            {page.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text variant="caption" tone="muted">
              Just now ·
            </Text>
            <Icon name="earth" size={11} tone="muted" />
          </View>
        </View>
        <Icon name="ellipsis-horizontal" size={18} tone="muted" />
      </View>
      {caption ? (
        <Text variant="callout" className="px-3.5 pb-3" numberOfLines={7}>
          {caption}
        </Text>
      ) : null}
      {media.length ? <Visual media={media} aspect={media.length > 1 ? 1 : 4 / 5} /> : null}
      <View className="mx-3.5 flex-row justify-around border-t border-line py-2.5">
        {ACTIONS.map(([icon, label]) => (
          <View key={label} className="flex-row items-center gap-1.5">
            <Icon name={icon} size={17} tone="muted" />
            <Text variant="footnote" tone="muted" className="font-semibold">
              {label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
