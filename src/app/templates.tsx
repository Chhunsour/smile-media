import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Button, Card, EmptyState, Footer, GradientIcon, IconButton, Press, SheetHeader, Text } from '@/components/ui';
import { deleteTemplate, insertIntoCaption, saveTemplate, type Template, toast, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

/**
 * Saved captions and hashtag sets. Opened from the composer with `insert=1` (tap inserts),
 * or from Profile to manage them.
 */
export default function Templates() {
  const { insert } = useLocalSearchParams<{ insert?: string }>();
  const templates = useStore((s) => s.templates);
  const caption = useStore((s) => s.draft.caption);
  const c = useColors();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const use = (t: Template) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    insertIntoCaption(t.text);
    router.back();
  };

  const remove = (t: Template) =>
    Alert.alert(`Delete “${t.title}”?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(t.id) },
    ]);

  const startAdding = () => {
    setTitle('');
    setText(insert && caption.trim() ? caption.trim() : '');
    setAdding(true);
  };

  const save = () => {
    saveTemplate(title || text.split('\n')[0].slice(0, 32), text);
    setAdding(false);
    toast('Template saved');
  };

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <SheetHeader
        title="Templates"
        subtitle={insert ? 'Tap one to add it to your caption' : 'Reusable captions and hashtag sets'}
        right={adding ? null : <Button title="New" icon="add" size="sm" variant="secondary" onPress={startAdding} />}
      />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-2.5 px-5 pb-8"
        showsVerticalScrollIndicator={false}>
        {adding ? (
          <Animated.View entering={FadeIn.duration(180)}>
            <Card className="p-4">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Name (e.g. Launch hashtags)"
                placeholderTextColor={c.subtle}
                selectionColor={c.accent}
                autoFocus
                className="pb-2 text-[17px] font-semibold text-fg"
              />
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Text to insert — a sign-off, a call to action, #hashtags…"
                placeholderTextColor={c.subtle}
                selectionColor={c.accent}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                className="min-h-[96px] border-t border-line pt-2 text-[15px] text-fg"
              />
              <View className="mt-3 flex-row gap-2.5">
                <Button title="Cancel" variant="secondary" size="md" className="flex-1" onPress={() => setAdding(false)} />
                <Button title="Save" size="md" className="flex-1" disabled={!text.trim()} onPress={save} />
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {templates.map((t) => (
          <Animated.View key={t.id} layout={LinearTransition.duration(200)}>
            <Press
              onPress={insert ? () => use(t) : undefined}
              disabled={!insert}
              accessibilityRole={insert ? 'button' : undefined}
              accessibilityLabel={insert ? `Insert ${t.title}` : t.title}
              className="flex-row items-start gap-3 rounded-[22px] border border-line/70 bg-card p-4">
              <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-fill">
                <GradientIcon name={t.text.trim().startsWith('#') ? 'pricetags' : 'chatbox-ellipses'} size={16} />
              </View>
              <View className="flex-1 gap-1">
                <Text variant="callout" className="font-semibold" numberOfLines={1}>
                  {t.title}
                </Text>
                <Text variant="footnote" tone="muted" numberOfLines={3}>
                  {t.text}
                </Text>
              </View>
              <IconButton icon="trash-outline" label={`Delete ${t.title}`} tone="subtle" size={18} onPress={() => remove(t)} />
            </Press>
          </Animated.View>
        ))}

        {!templates.length && !adding ? (
          <EmptyState
            icon="bookmarks-outline"
            title="No templates yet"
            body="Save the things you type every time — sign-offs, links, hashtag sets."
            action="New template"
            onAction={startAdding}
          />
        ) : null}
      </ScrollView>
      {insert && caption.trim() && !adding ? (
        <Footer>
          <Button title="Save current caption as template" icon="bookmark-outline" variant="secondary" onPress={startAdding} />
        </Footer>
      ) : null}
    </View>
  );
}
