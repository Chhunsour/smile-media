import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { openPost, progressOf, TargetRow } from '@/components/post';
import { Button, Card, Footer, Glow, Gradient, Icon, ProgressBar, Pulse, Text } from '@/components/ui';
import { plural } from '@/lib/format';
import { retry, useStore } from '@/lib/store';
import { BRAND } from '@/lib/theme';

const ORB = { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' } as const;
const ORB_GLOW = { shadowColor: BRAND[1], shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } };

export default function Publishing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  if (!post) return null;

  const total = post.destinations.length;
  const published = post.destinations.filter((t) => t.status === 'published').length;
  const failed = post.destinations.filter((t) => t.status === 'failed').length;
  const inFlight = post.destinations.some((t) => t.status === 'publishing' || t.status === 'pending');
  const state = inFlight ? 'publishing' : !failed ? 'done' : published ? 'partial' : 'failed';

  const copy = {
    publishing: ['Publishing…', `${published + failed} of ${plural(total, 'channel')} done`],
    done: ['You’re live', `Your post is up on ${plural(total, 'channel')}.`],
    partial: ['Published with issues', `${published} of ${total} published · ${failed} failed`],
    failed: ['Couldn’t publish', 'Nothing went out. Check the errors below and retry.'],
  }[state];

  const viewPost = () => {
    router.back();
    openPost(post.id);
  };

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <Glow height={280} />
      <View className="items-center px-6 pb-6 pt-10">
        {state === 'publishing' ? (
          <View style={ORB_GLOW}>
            <Pulse
              style={{ position: 'absolute', top: -12, left: -12, right: -12, bottom: -12 }}
              className="flex-1 rounded-full bg-accent/25"
            />
            <Gradient style={ORB}>
              <ActivityIndicator color="#fff" />
            </Gradient>
          </View>
        ) : state === 'done' ? (
          <Animated.View entering={ZoomIn.springify().damping(12)} style={ORB_GLOW}>
            <Gradient style={ORB}>
              <Icon name="checkmark" size={38} tone="white" />
            </Gradient>
          </Animated.View>
        ) : (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-danger/15">
              <Icon name="alert" size={36} tone="danger" />
            </View>
          </Animated.View>
        )}
        <Text variant="display" className="mt-5 text-center">
          {copy[0]}
        </Text>
        <Text variant="footnote" tone="muted" className="mt-1.5 text-center">
          {copy[1]}
        </Text>
        {state === 'publishing' ? <ProgressBar value={progressOf(post)} className="mt-5 w-full" /> : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
        <Card className="px-4">
          {post.destinations.map((t, i) => (
            <View key={t.pageId} className={i ? 'border-t border-line' : ''}>
              <TargetRow target={t} postId={post.id} />
            </View>
          ))}
        </Card>
      </ScrollView>

      <Footer>
        {state === 'publishing' ? (
          <Button title="Continue in background" variant="secondary" onPress={() => router.back()} />
        ) : failed ? (
          <View className="flex-row gap-3">
            <Button title="View post" variant="secondary" className="flex-1" onPress={viewPost} />
            <Button title={`Retry ${failed}`} icon="refresh" className="flex-1" onPress={() => retry(post.id)} />
          </View>
        ) : (
          <View className="flex-row gap-3">
            <Button title="View post" variant="secondary" className="flex-1" onPress={viewPost} />
            <Button title="Done" className="flex-1" onPress={() => router.back()} />
          </View>
        )}
      </Footer>
    </View>
  );
}
