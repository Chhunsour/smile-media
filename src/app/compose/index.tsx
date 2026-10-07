import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaThumb } from '@/components/post';
import {
  Avatar,
  Button,
  Glow,
  GradientIcon,
  Icon,
  IconButton,
  NavHeader,
  PlatformIcon,
  Press,
  Text,
  useKeyboardVisible,
} from '@/components/ui';
import { plural, when } from '@/lib/format';
import { pickMedia } from '@/lib/picker';
import { captionLimit, PLATFORM_ORDER } from '@/platforms';
import { addMedia, allPages, type ComposeTool, MAX_MEDIA, removeMedia, saveDraft, toast, updateDraft, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { MediaAsset as Media, PlatformId, SocialPage as Account } from '@/models';

export default function Compose() {
  const draft = useStore((s) => s.draft);
  const accounts = allPages(useStore((s) => s.accounts));
  const c = useColors();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const { open } = useLocalSearchParams<{ open?: ComposeTool }>();

  // Home's quick actions land here with a tool to open right away.
  useEffect(() => {
    if (open === 'camera') pickMedia('camera', MAX_MEDIA).then(addMedia);
    else if (open === 'templates') router.push({ pathname: '/templates', params: { insert: '1' } });
    else if (open === 'media') router.push('/compose/media');
  }, [open]);

  const selected = accounts.filter((a) => draft.pageIds.includes(a.id));
  const platforms = PLATFORM_ORDER.filter((p) => selected.some((a) => a.platform === p));
  const hasContent = !!draft.caption.trim() || draft.media.length > 0;

  const close = () => {
    if (!draft.dirty || !hasContent) return router.back();
    Alert.alert(draft.id ? 'Save your changes?' : 'Save as draft?', 'You can pick it up again from Posts.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      {
        text: draft.id ? 'Save changes' : 'Save draft',
        onPress: () => {
          saveDraft();
          router.back();
          toast(draft.id ? 'Changes saved' : 'Draft saved', 'info');
        },
      },
    ]);
  };

  const next = () => {
    if (!draft.pageIds.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return router.push('/compose/accounts');
    }
    router.push('/compose/review');
  };

  const ai = (mode: 'improve' | 'translate' | 'hashtags') => router.push({ pathname: '/compose/ai', params: { mode } });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-bg">
      <Glow height={260} />
      <NavHeader
        title={draft.id ? 'Edit post' : 'New post'}
        left={<IconButton icon="close" label="Close" onPress={close} />}
        right={<Button title="Next" size="sm" disabled={!hasContent} onPress={next} className="mr-1" />}
      />

      <ScrollView
        className="flex-1"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-8">
        <View className="flex-row flex-wrap items-center gap-2 px-5 pt-1">
          <Channels selected={selected} />
          {draft.scheduledAt ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-warning/15 px-3 py-2">
              <Icon name="time" size={14} tone="warning" />
              <Text variant="footnote" tone="warning" className="font-semibold">
                {when(draft.scheduledAt)}
              </Text>
            </View>
          ) : null}
        </View>
        <TextInput
          value={draft.caption}
          onChangeText={(caption) => updateDraft({ caption })}
          placeholder="What would you like to share?"
          placeholderTextColor={c.subtle}
          selectionColor={c.accent}
          multiline
          autoFocus={!draft.caption && !draft.media.length}
          scrollEnabled={false}
          textAlignVertical="top"
          className="min-h-[150px] px-5 pt-5 text-[20px] leading-[28px] text-fg"
        />
        {platforms.length && draft.caption.length ? <Limits platforms={platforms} length={draft.caption.length} media={draft.media} /> : null}
        <MediaStrip media={draft.media} />
      </ScrollView>

      <View
        className="flex-row items-center border-t border-line bg-bg px-2.5 pt-1.5"
        style={{ paddingBottom: keyboard ? 6 : Math.max(insets.bottom, 8) }}>
        <IconButton icon="images-outline" label="Add media" onPress={() => router.push('/compose/media')} />
        <IconButton
          icon="camera-outline"
          label="Camera"
          onPress={async () => addMedia(await pickMedia('camera', MAX_MEDIA - draft.media.length))}
        />
        <Press
          accessibilityRole="button"
          accessibilityLabel="Improve with AI"
          hitSlop={6}
          onPress={() => ai('improve')}
          className="h-10 w-10 items-center justify-center rounded-full">
          <GradientIcon name="sparkles" size={22} />
        </Press>
        <IconButton
          icon="bookmarks-outline"
          label="Templates"
          onPress={() => router.push({ pathname: '/templates', params: { insert: '1' } })}
        />
        <IconButton icon="pricetag-outline" label="Suggest hashtags" onPress={() => ai('hashtags')} />
        <IconButton icon="language-outline" label="Translate" onPress={() => ai('translate')} />
        <View className="flex-1" />
        <Text variant="caption" tone="subtle" className="pr-3 tabular-nums">
          {draft.caption.length ? draft.caption.length.toLocaleString() : ''}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function Channels({ selected }: { selected: Account[] }) {
  const open = () => router.push('/compose/accounts');
  if (!selected.length) {
    return (
      <Press
        onPress={open}
        className="flex-row items-center gap-1.5 rounded-full border border-dashed border-subtle px-3.5 py-2">
        <Icon name="add" size={16} tone="muted" />
        <Text variant="footnote" tone="muted" className="font-semibold">
          Choose channels
        </Text>
      </Press>
    );
  }
  return (
    <Press
      onPress={open}
      accessibilityLabel="Change channels"
      className="flex-row items-center gap-2.5 rounded-full bg-fill py-1.5 pl-1.5 pr-3">
      <View className="flex-row">
        {selected.slice(0, 5).map((a, i) => (
          <View key={a.id} className="rounded-full border-2 border-fill" style={{ marginLeft: i ? -12 : 0, zIndex: 9 - i }}>
            <Avatar uri={a.avatar} name={a.name} size={26} />
          </View>
        ))}
      </View>
      <Text variant="footnote" className="font-semibold">
        {selected.length === 1 ? selected[0].name : plural(selected.length, 'channel')}
      </Text>
      <Icon name="chevron-down" size={14} tone="muted" />
    </Press>
  );
}

/** Characters left on each selected platform, so you see X's 280 before you hit it. */
function Limits({ platforms, length, media }: { platforms: PlatformId[]; length: number; media: Media[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-2 px-5 pt-2">
      {platforms.map((p) => {
        const left = captionLimit(p, media) - length;
        const tone = left < 0 ? 'danger' : left < 20 ? 'warning' : 'muted';
        return (
          <View
            key={p}
            accessibilityLabel={`${left} characters left on ${p}`}
            className={`flex-row items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ${left < 0 ? 'bg-danger/15' : 'bg-fill'}`}>
            <PlatformIcon platform={p} size={18} />
            <Text variant="caption" tone={tone} className="font-semibold tabular-nums">
              {left < 0 ? `${(-left).toLocaleString()} over` : left.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function MediaStrip({ media }: { media: Media[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-2.5 px-5 pt-3">
      {media.map((m, i) => (
        <Animated.View
          key={m.id}
          entering={ZoomIn.springify().damping(16)}
          exiting={ZoomOut.duration(140)}
          layout={LinearTransition.springify().damping(18)}>
          <MediaThumb media={m} size={108} radius={16} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove media"
            hitSlop={8}
            onPress={() => {
              Haptics.selectionAsync();
              removeMedia(m.id);
            }}
            className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60">
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
          {i === 0 && media.length > 1 ? (
            <View className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-[1px]">
              <Text variant="micro" tone="white" className="font-semibold">
                Cover
              </Text>
            </View>
          ) : null}
        </Animated.View>
      ))}
      {media.length < MAX_MEDIA ? (
        <Animated.View layout={LinearTransition.springify().damping(18)}>
          <Press
            accessibilityLabel="Add media"
            onPress={() => router.push('/compose/media')}
            className="h-[108px] w-[108px] items-center justify-center gap-1 rounded-2xl border border-dashed border-subtle">
            <GradientIcon name="add" size={26} />
            <Text variant="caption" tone="muted" className="font-medium">
              {media.length ? 'Add more' : 'Photo / video'}
            </Text>
          </Press>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}
