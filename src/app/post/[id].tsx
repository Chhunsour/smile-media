import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDelete, MediaFill, platformsOf, sharePost, TargetRow, totalsOf } from '@/components/post';
import {
  Button,
  Card,
  EmptyState,
  Footer,
  Glow,
  GradientText,
  IconButton,
  NavHeader,
  Section,
  StatusPill,
  Text,
} from '@/components/ui';
import { compact, postWhen, when } from '@/lib/format';
import { issuesFor, PLATFORMS } from '@/platforms';
import { duplicatePost, publish, retry, startCompose, useStore } from '@/lib/store';
import type { Post } from '@/models';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  const insets = useSafeAreaInsets();

  if (!post) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Post" />
        <EmptyState icon="trash-outline" title="Post not found" body="It may have been deleted." />
      </View>
    );
  }

  const failed = post.destinations.filter((t) => t.status === 'failed');
  const editable = post.status === 'draft' || post.status === 'scheduled';
  const totals = totalsOf(post);
  const whenLabel = post.status === 'scheduled' && post.scheduledAt ? `Goes out ${when(post.scheduledAt)}` : postWhen(post);

  const onDelete = () => confirmDelete(post, () => router.back());

  return (
    <View className="flex-1 bg-bg">
      {post.media.length ? null : <Glow height={320} />}
      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {post.media.length ? (
          <Hero post={post} label={whenLabel} />
        ) : (
          <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 64 }}>
            <StatusPill status={post.status} />
            <Text variant="footnote" tone="muted">
              {whenLabel}
            </Text>
          </View>
        )}

        {post.caption ? (
          <Text
            variant={post.media.length ? 'body' : 'display'}
            className={`mt-5 px-5 ${post.media.length ? 'leading-[25px]' : ''}`}
            selectable>
            {post.caption}
          </Text>
        ) : null}

        {totals.reach ? (
          <Section title="Performance">
            <Card className="mx-5 flex-row py-5">
              {(
                [
                  ['Reach', totals.reach],
                  ['Likes', totals.likes],
                  ['Comments', totals.comments],
                  ['Shares', totals.shares],
                ] as const
              ).map(([label, value], i) => (
                <View key={label} className={`flex-1 items-center gap-1 ${i ? 'border-l border-line' : ''}`}>
                  <GradientText variant="title">{compact(value)}</GradientText>
                  <Text variant="caption" tone="muted" className="font-semibold">
                    {label}
                  </Text>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        <Section title="Channels">
          {post.destinations.length ? (
            <Card className="mx-5 px-4">
              {post.destinations.map((t, i) => (
                <View key={t.pageId} className={i ? 'border-t border-line' : ''}>
                  <TargetRow target={t} postId={post.id} scheduled={post.status === 'scheduled'} />
                </View>
              ))}
            </Card>
          ) : (
            <Text variant="footnote" tone="muted" className="px-5">
              No channels yet — edit the post to choose where it goes.
            </Text>
          )}
        </Section>

        <View className="mt-7 flex-row gap-3 px-5">
          {editable ? (
            <Button
              title="Edit"
              icon="create-outline"
              variant="secondary"
              size="md"
              className="flex-1"
              onPress={() => startCompose({ postId: post.id })}
            />
          ) : null}
          <Button
            title="Duplicate"
            icon="copy-outline"
            variant="secondary"
            size="md"
            className="flex-1"
            onPress={() => duplicatePost(post.id)}
          />
        </View>
      </ScrollView>

      <NavHeader
        floating
        right={
          <View className="flex-row gap-2">
            <IconButton icon="share-outline" label="Share caption" tone="white" className="bg-black/45" onPress={() => sharePost(post)} />
            <IconButton icon="trash-outline" label="Delete post" tone="white" className="bg-black/45" onPress={onDelete} />
          </View>
        }
      />
      <PrimaryAction post={post} failedCount={failed.length} />
    </View>
  );
}

/** Edge-to-edge media with paging, status and timing over a bottom shade. */
function Hero({ post, label }: { post: Post; label: string }) {
  const width = useWindowDimensions().width;
  const [index, setIndex] = useState(0);
  const height = Math.min(Math.round(width * 1.15), 470);
  return (
    <View style={{ width, height }} className="bg-card">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {post.media.map((m) => (
          <View key={m.id} style={{ width, height }}>
            <MediaFill media={m} badge="play" />
          </View>
        ))}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.22, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" className="absolute bottom-4 left-5 right-5 flex-row items-center gap-2">
        <StatusPill status={post.status} />
        <Text variant="footnote" tone="white" className="flex-1 font-semibold opacity-85" numberOfLines={1}>
          {label}
        </Text>
        {post.media.length > 1 ? (
          <View className="flex-row gap-1.5">
            {post.media.map((m, i) => (
              <View key={m.id} className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PrimaryAction({ post, failedCount }: { post: Post; failedCount: number }) {
  if (post.status === 'failed') {
    return (
      <Footer>
        <Button title={`Retry ${failedCount} failed`} icon="refresh" onPress={() => retry(post.id)} />
      </Footer>
    );
  }
  if (post.status !== 'draft' && post.status !== 'scheduled') return null;

  const publishNow = () => {
    const problems = platformsOf(post).flatMap((p) =>
      issuesFor(p, post)
        .filter((i) => i.level === 'error')
        .map((i) => `${PLATFORMS[p].name}: ${i.message}`),
    );
    if (!post.destinations.length || problems.length) {
      return Alert.alert('Needs a few fixes', post.destinations.length ? problems.join('\n') : 'Choose at least one channel first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit post', onPress: () => startCompose({ postId: post.id }) },
      ]);
    }
    publish(post.id);
    router.push({ pathname: '/publishing/[id]', params: { id: post.id } });
  };

  return (
    <Footer>
      <Button title="Publish now" icon="paper-plane" onPress={publishNow} />
    </Footer>
  );
}
