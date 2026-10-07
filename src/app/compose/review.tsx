import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PlatformPreview } from '@/platforms/previews';
import {
  Button,
  Card,
  Footer,
  Gradient,
  Icon,
  NavHeader,
  PlatformIcon,
  Press,
  Segmented,
  Switch,
  Text,
  useCloseComposer,
} from '@/components/ui';
import { plural, when } from '@/lib/format';
import { autoTitle } from '@/platforms/youtube';
import { services } from '@/services';
import { captionLimit, issuesFor, type Option, PLATFORM_ORDER, PLATFORMS, resolveContent } from '@/platforms';
import { allPages, commitDraft, type Draft, saveDraft, setPlatformOption, toast, updateDraft, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { OptionValue, PlatformId } from '@/models';

export default function Review() {
  const draft = useStore((s) => s.draft);
  const accounts = allPages(useStore((s) => s.accounts)).filter((a) => draft.pageIds.includes(a.id));
  const platforms = PLATFORM_ORDER.filter((p) => accounts.some((a) => a.platform === p));
  const [active, setActive] = useState<PlatformId | undefined>(platforms[0]);
  const closeComposer = useCloseComposer();

  const current = active && platforms.includes(active) ? active : platforms[0];
  const blocking = platforms.filter((p) => issuesFor(p, draft).some((i) => i.level === 'error'));

  if (!current) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Preview" />
        <View className="flex-1 items-center justify-center px-10">
          <Text variant="headline">No channels selected</Text>
          <Button title="Choose channels" size="md" className="mt-4" onPress={() => router.push('/compose/accounts')} />
        </View>
      </View>
    );
  }

  const destinations = accounts.filter((a) => a.platform === current);
  const p = PLATFORMS[current];

  const publishNow = () => {
    const id = commitDraft('publish');
    closeComposer();
    router.push({ pathname: '/publishing/[id]', params: { id } });
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Preview"
        right={
          <Button
            title="Save"
            variant="ghost"
            size="sm"
            onPress={() => {
              saveDraft();
              closeComposer();
              toast(draft.id ? 'Changes saved' : 'Draft saved', 'info');
            }}
          />
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName="gap-2 px-5 pb-3">
        {platforms.map((id) => (
          <Press
            key={id}
            haptic
            onPress={() => setActive(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: id === current }}
            className={`h-10 flex-row items-center gap-2 overflow-hidden rounded-full pl-1.5 pr-3.5 ${id === current ? '' : 'bg-fill'}`}>
            {id === current ? <Gradient horizontal style={{ position: 'absolute', inset: 0 }} /> : null}
            <PlatformIcon platform={id} size={28} />
            <Text variant="footnote" tone={id === current ? 'white' : 'fg'} className="font-semibold">
              {PLATFORMS[id].name}
            </Text>
            {blocking.includes(id) ? (
              <View className={`h-2 w-2 rounded-full ${id === current ? 'bg-white' : 'bg-danger'}`} />
            ) : null}
          </Press>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-10 pt-1">
          <Text variant="footnote" tone="muted" className="mb-3" numberOfLines={2}>
            {destinations.length > 1
              ? `Posting to ${plural(destinations.length, p.noun)}: ${destinations.map((a) => a.name).join(', ')}`
              : `Posting to ${destinations[0].name}`}
          </Text>
          <Animated.View key={current} entering={FadeIn.duration(220)}>
            <PlatformPreview platform={current} page={destinations[0]} {...resolveContent(draft, current)} />
            <Issues platform={current} draft={draft} />
            <Customize platform={current} draft={draft} />
          </Animated.View>
        </ScrollView>

        <Footer>
          {blocking.length ? (
            <Text variant="footnote" tone="danger" className="mb-2.5 text-center font-medium">
              Fix {blocking.map((id) => PLATFORMS[id].name).join(', ')} to continue
            </Text>
          ) : null}
          <View className="flex-row gap-3">
            <Button
              title={draft.scheduledAt ? when(draft.scheduledAt) : 'Schedule'}
              icon="calendar-outline"
              variant="secondary"
              className="flex-1"
              disabled={blocking.length > 0}
              onPress={() => router.push('/compose/schedule')}
            />
            <Button title="Publish now" className="flex-1" disabled={blocking.length > 0} onPress={publishNow} />
          </View>
        </Footer>
      </KeyboardAvoidingView>
    </View>
  );
}

function setCaption(draft: Draft, platform: PlatformId, text: string | undefined) {
  const captions = { ...draft.captions };
  if (text === undefined) delete captions[platform];
  else captions[platform] = text;
  updateDraft({ captions });
}

function Issues({ platform, draft }: { platform: PlatformId; draft: Draft }) {
  const [busy, setBusy] = useState(false);
  const issues = issuesFor(platform, draft);
  if (!issues.length) return null;

  const fit = async () => {
    setBusy(true);
    const text = await services.ai.shorten(resolveContent(draft, platform).caption, captionLimit(platform, draft.media));
    setCaption(useStore.getState().draft, platform, text);
    setBusy(false);
  };

  return (
    <View className="mt-4 gap-2">
      {issues.map((issue) => (
        <View
          key={issue.message}
          className={`flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 ${issue.level === 'error' ? 'bg-danger/10' : 'bg-warning/10'}`}>
          <Icon
            name={issue.level === 'error' ? 'alert-circle' : 'warning'}
            size={18}
            tone={issue.level === 'error' ? 'danger' : 'warning'}
          />
          <Text variant="footnote" className="flex-1">
            {issue.message}
          </Text>
          {issue.fix === 'shorten' ? (
            <Button title="Shorten" icon="sparkles" size="sm" variant="secondary" loading={busy} onPress={fit} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Customize({ platform, draft }: { platform: PlatformId; draft: Draft }) {
  const c = useColors();
  const p = PLATFORMS[platform];
  const custom = draft.captions[platform] !== undefined;
  const content = resolveContent(draft, platform);
  const limit = captionLimit(platform, draft.media);

  return (
    <View className="mt-7">
      <Text variant="title" className="mb-3">
        Customize for {p.name}
      </Text>
      <Card>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="flex-1">
            <Text variant="callout" className="font-medium">
              Custom caption
            </Text>
            <Text variant="caption" tone="muted">
              {custom ? `Only used on ${p.name}` : 'Using your main caption'}
            </Text>
          </View>
          <Switch value={custom} onValueChange={(on) => setCaption(draft, platform, on ? draft.caption : undefined)} />
        </View>
        {custom ? (
          <View className="border-t border-line px-4 pb-3 pt-2">
            <TextInput
              value={draft.captions[platform]}
              onChangeText={(text) => setCaption(draft, platform, text)}
              placeholder={`Caption for ${p.name}`}
              placeholderTextColor={c.subtle}
              selectionColor={c.accent}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              className="min-h-[96px] text-[15px] text-fg"
            />
            <Text
              variant="caption"
              tone={content.caption.length > limit ? 'danger' : 'subtle'}
              className="text-right tabular-nums">
              {content.caption.length.toLocaleString()} / {limit.toLocaleString()}
            </Text>
          </View>
        ) : null}
        {p.options.map((o) => (
          <OptionRow
            key={o.key}
            option={o}
            value={o.type === 'text' ? (draft.options[platform]?.[o.key] ?? '') : content.options[o.key]}
            placeholder={platform === 'youtube' && o.key === 'title' ? autoTitle(content.caption) || undefined : undefined}
            onChange={(v) => setPlatformOption(platform, o.key, v)}
          />
        ))}
      </Card>
    </View>
  );
}

function OptionRow({
  option,
  value,
  placeholder,
  onChange,
}: {
  option: Option;
  value: OptionValue;
  placeholder?: string;
  onChange: (v: OptionValue) => void;
}) {
  const c = useColors();
  if (option.type === 'toggle') {
    return (
      <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
        <View className="flex-1">
          <Text variant="callout" className="font-medium">
            {option.label}
          </Text>
          {option.hint ? (
            <Text variant="caption" tone="muted">
              {option.hint}
            </Text>
          ) : null}
        </View>
        <Switch value={!!value} onValueChange={onChange} />
      </View>
    );
  }
  if (option.type === 'choice') {
    return (
      <View className="gap-2.5 border-t border-line px-4 py-3">
        <Text variant="callout" className="font-medium">
          {option.label}
        </Text>
        <Segmented value={String(value)} options={option.choices} onChange={onChange} />
      </View>
    );
  }
  return (
    <View className="gap-1 border-t border-line px-4 py-3">
      <View className="flex-row justify-between">
        <Text variant="callout" className="font-medium">
          {option.label}
        </Text>
        {String(value).length > option.max * 0.8 ? (
          <Text variant="caption" tone="muted" className="tabular-nums">
            {String(value).length}/{option.max}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={String(value)}
        onChangeText={onChange}
        placeholder={placeholder ?? option.placeholder}
        placeholderTextColor={c.subtle}
        selectionColor={c.accent}
        maxLength={option.max}
        multiline
        scrollEnabled={false}
        className="py-1 text-[15px] text-fg"
      />
    </View>
  );
}
