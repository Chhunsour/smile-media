import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Chip, EmptyState, Footer, GradientIcon, Pulse, Segmented, SheetHeader, Text } from '@/components/ui';
import { type Lang, LANGS, services, type Tone, TONES } from '@/services';
import { plural } from '@/lib/format';
import { updateDraft, useStore } from '@/lib/store';

type Mode = 'improve' | 'translate' | 'hashtags';

const MODES: { value: Mode; label: string }[] = [
  { value: 'improve', label: 'Improve' },
  { value: 'translate', label: 'Translate' },
  { value: 'hashtags', label: 'Hashtags' },
];

export default function AiSheet() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const caption = useStore((s) => s.draft.caption);
  const [mode, setMode] = useState<Mode>(params.mode ?? 'improve');
  const [tone, setTone] = useState<Tone>('friendly');
  const [lang, setLang] = useState<Lang>('es');
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<{ key: string; text: string; tags: string[] } | null>(null);
  const [source] = useState(caption); // generate from the caption as it was when the sheet opened

  // Identifies the request the visible result should answer; anything else means we're still writing.
  const key = mode === 'improve' ? `improve:${tone}:${attempt}` : mode === 'translate' ? `translate:${lang}` : 'hashtags';
  const loading = !!source.trim() && result?.key !== key;
  const text = result?.key === key ? result.text : '';
  const tags = result?.key === key ? result.tags : [];

  useEffect(() => {
    if (!source.trim()) return;
    let current = true;
    const job =
      mode === 'hashtags'
        ? services.ai.hashtags(source)
        : mode === 'translate'
          ? services.ai.translate(source, lang)
          : services.ai.improve(source, tone, attempt);
    job.then((out) => {
      if (!current) return;
      const list = Array.isArray(out) ? out : [];
      setResult({ key, text: Array.isArray(out) ? '' : out, tags: list });
      if (list.length) setChosen(list.slice(0, 5));
    });
    return () => {
      current = false;
    };
  }, [key, mode, tone, lang, attempt, source]);

  const apply = (next: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateDraft({ caption: next });
    router.back();
  };

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <SheetHeader title="Assist" subtitle="Mock AI — suggestions are simulated" />
      <View className="px-5">
        <Segmented value={mode} options={MODES} onChange={setMode} />
      </View>

      {!source.trim() ? (
        <EmptyState
          icon="sparkles"
          title="Write something first"
          body="Assist works from your caption. Add a few words, then come back."
        />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-4" showsVerticalScrollIndicator={false}>
          {mode !== 'hashtags' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
              {mode === 'improve'
                ? TONES.map((t) => <Chip key={t.id} label={t.label} selected={tone === t.id} onPress={() => setTone(t.id)} />)
                : LANGS.map((l) => <Chip key={l.id} label={l.label} selected={lang === l.id} onPress={() => setLang(l.id)} />)}
            </ScrollView>
          ) : null}

          <View className="mx-5 mt-4 min-h-[150px] rounded-[22px] bg-card p-4">
            <View className="mb-2.5 flex-row items-center gap-1.5">
              <GradientIcon name="sparkles" size={14} />
              <Text variant="caption" tone="accent" className="font-semibold">
                {loading ? 'Writing…' : mode === 'hashtags' ? 'Tap to toggle' : 'Suggestion'}
              </Text>
            </View>
            {loading ? (
              <View className="gap-2.5 pt-1">
                {['w-full', 'w-11/12', 'w-2/3'].map((w) => (
                  <Pulse key={w} className={`h-3 rounded-full bg-fill ${w}`} />
                ))}
              </View>
            ) : mode === 'hashtags' ? (
              <View className="flex-row flex-wrap gap-2">
                {tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={chosen.includes(t)}
                    onPress={() => setChosen((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}
                  />
                ))}
              </View>
            ) : (
              <Typewriter key={text} text={text} />
            )}
          </View>
        </ScrollView>
      )}

      {source.trim() ? (
        <Footer>
          {mode === 'improve' ? (
            <View className="flex-row gap-3">
              <Button
                title="Try again"
                icon="refresh"
                variant="secondary"
                className="flex-1"
                disabled={loading}
                onPress={() => setAttempt((a) => a + 1)}
              />
              <Button title="Use this" className="flex-1" disabled={loading || !text} onPress={() => apply(text)} />
            </View>
          ) : mode === 'translate' ? (
            <View className="flex-row gap-3">
              <Button
                title="Add below"
                variant="secondary"
                className="flex-1"
                disabled={loading || !text}
                onPress={() => apply(`${source}\n\n${text}`)}
              />
              <Button title="Replace" className="flex-1" disabled={loading || !text} onPress={() => apply(text)} />
            </View>
          ) : (
            <Button
              title={chosen.length ? `Add ${plural(chosen.length, 'hashtag')}` : 'Select hashtags'}
              disabled={loading || !chosen.length}
              onPress={() => apply(`${source.trimEnd()}\n\n${chosen.join(' ')}`)}
            />
          )}
        </Footer>
      ) : null}
    </View>
  );
}

/** Reveals text a few characters at a time, like a streamed model response. */
function Typewriter({ text }: { text: string }) {
  const chars = Array.from(text);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const total = Array.from(text).length;
    const t = setInterval(() => setShown((n) => (n >= total ? (clearInterval(t), n) : n + 3)), 16);
    return () => clearInterval(t);
  }, [text]);
  return (
    <Animated.View entering={FadeIn.duration(150)}>
      <Text variant="callout" selectable>
        {chars.slice(0, shown).join('')}
      </Text>
    </Animated.View>
  );
}
