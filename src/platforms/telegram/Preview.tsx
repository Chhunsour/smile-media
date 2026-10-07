import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { MediaFill } from '@/components/post';
import { Text } from '@/components/ui';
import { time } from '@/lib/format';
import { useScheme } from '@/lib/theme';

import type { PreviewProps } from '../preview-kit';

export default function TelegramPreview({ page, caption, media, options }: PreviewProps) {
  const dark = useScheme() === 'dark';
  const meta = dark ? '#7D8B99' : '#8E9AA6';
  return (
    <View className="overflow-hidden rounded-2xl p-3" style={{ backgroundColor: dark ? '#0E1621' : '#CFE0BC' }}>
      {options.pin ? (
        <View className="mb-3 flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: dark ? '#17212B' : '#FFFFFFCC' }}>
          <View className="h-7 w-[2px] rounded-full bg-[#3390EC]" />
          <View className="flex-1">
            <Text variant="caption" className="font-semibold" style={{ color: '#3390EC' }}>
              Pinned message
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ color: dark ? '#fff' : '#000' }}>
              {caption || 'Photo'}
            </Text>
          </View>
          <Ionicons name="pin-outline" size={14} color={meta} />
        </View>
      ) : null}
      <View
        className="self-start overflow-hidden rounded-[18px] rounded-bl-[6px]"
        style={{ backgroundColor: dark ? '#182533' : '#FFFFFF', ...(media.length ? { width: '88%' } : { maxWidth: '88%' }) }}>
        {media[0] ? (
          <View className="w-full bg-fill" style={{ aspectRatio: 4 / 3 }}>
            <MediaFill media={media[0]} />
          </View>
        ) : null}
        <View className="px-3 pb-1.5 pt-2">
          <Text variant="footnote" className="font-semibold" style={{ color: dark ? '#6AB3F3' : '#3390EC' }}>
            {page.name}
          </Text>
          {caption ? (
            <Text variant="callout" className="mt-0.5" style={{ color: dark ? '#F5F5F5' : '#000000' }}>
              {caption}
            </Text>
          ) : null}
          <View className="mt-1 flex-row items-center justify-end gap-1">
            {options.silent ? <Ionicons name="notifications-off-outline" size={11} color={meta} /> : null}
            <Ionicons name="eye-outline" size={12} color={meta} />
            <Text variant="micro" style={{ color: meta }}>
              1 · {time(new Date())}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
