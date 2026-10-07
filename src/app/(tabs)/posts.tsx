import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, SectionList, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PostRow, PostTile } from '@/components/post';
import { Chip, EmptyState, Glow, Icon, LargeHeader, Press, SearchField, STATUS, Text, useTabSpace } from '@/components/ui';
import { dayLabel, postDate } from '@/lib/format';
import { publishDuePosts, startCompose, useStore } from '@/lib/store';
import { sleep } from '@/demo/persist';
import type { Post, PostStatus } from '@/models';
import { useColors } from '@/lib/theme';

type Filter = 'all' | 'scheduled' | 'published' | 'draft' | 'failed';

const FILTERS: { id: Filter; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled', dot: STATUS.scheduled.dot },
  { id: 'published', label: 'Published', dot: STATUS.published.dot },
  { id: 'draft', label: 'Drafts', dot: STATUS.draft.dot },
  { id: 'failed', label: 'Failed', dot: STATUS.failed.dot },
];

const EMPTY: Record<Filter, { title: string; body: string }> = {
  all: { title: 'No posts yet', body: 'Create your first post and send it everywhere at once.' },
  scheduled: { title: 'Nothing scheduled', body: 'Schedule posts to keep your channels busy while you’re not.' },
  published: { title: 'Nothing published yet', body: 'Posts you publish will show up here with their results.' },
  draft: { title: 'No drafts', body: 'Close the composer mid-thought and we’ll keep it here.' },
  failed: { title: 'All clear', body: 'No failed posts. Anything that needs a retry will show up here.' },
};

type Group = { title: string; data: Post[] };

function byDay(posts: Post[], newestFirst: boolean): Group[] {
  const sorted = [...posts].sort((a, b) => {
    const diff = (postDate(a)?.getTime() ?? 0) - (postDate(b)?.getTime() ?? 0);
    return newestFirst ? -diff : diff;
  });
  const groups: Group[] = [];
  for (const p of sorted) {
    const title = dayLabel(postDate(p) ?? new Date(p.updatedAt));
    const last = groups.at(-1);
    if (last?.title === title) last.data.push(p);
    else groups.push({ title, data: [p] });
  }
  return groups;
}

function groupsFor(filter: Filter, posts: Post[]): Group[] {
  const only = (...s: PostStatus[]) => posts.filter((p) => s.includes(p.status));
  const drafts = () => only('draft').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  switch (filter) {
    case 'scheduled':
      return byDay(only('scheduled'), false);
    case 'published':
      return byDay(only('published', 'publishing'), true);
    case 'failed':
      return byDay(only('failed'), true);
    case 'draft':
      return [{ title: 'Drafts', data: drafts() }].filter((g) => g.data.length);
    default:
      return [
        { title: 'Publishing now', data: only('publishing') },
        { title: 'Up next', data: byDay(only('scheduled'), false).flatMap((g) => g.data) },
        { title: 'Drafts', data: drafts() },
        ...byDay(only('published', 'failed'), true),
      ].filter((g) => g.data.length);
  }
}

export default function Posts() {
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  const [seenParam, setSeenParam] = useState(params.filter);
  if (params.filter !== seenParam) {
    setSeenParam(params.filter);
    if (params.filter) setFilter(params.filter);
  }
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [grid, setGrid] = useState(false);
  const all = useStore((s) => s.posts);
  const c = useColors();
  const space = useTabSpace();
  const width = useWindowDimensions().width;
  const tile = Math.floor((width - 40 - 16) / 3);

  const q = query.trim().toLowerCase();
  const posts = q
    ? all.filter((p) => p.caption.toLowerCase().includes(q) || p.destinations.some((d) => d.name.toLowerCase().includes(q)))
    : all;
  const count = (f: Filter) => (f === 'all' ? posts.length : posts.filter((p) => p.status === f).length);
  const groups = groupsFor(filter, posts);
  const flat = groups.flatMap((g) => g.data);
  const empty = q ? { title: 'No matches', body: `Nothing found for “${query.trim()}”.` } : EMPTY[filter];

  const refresh = async () => {
    setRefreshing(true);
    publishDuePosts();
    await sleep(900);
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-bg">
      <Glow height={300} />
      <LargeHeader eyebrow={q ? `${posts.length} of ${all.length} posts` : `${all.length} posts`} title="Posts" />
      <View className="flex-row items-center gap-2.5 px-5 pt-4">
        <SearchField value={query} onChangeText={setQuery} placeholder="Search captions or channels" className="flex-1" />
        <Press
          haptic
          accessibilityRole="button"
          accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
          onPress={() => setGrid(!grid)}
          className="h-12 w-12 items-center justify-center rounded-full border border-line bg-card">
          <Icon name={grid ? 'list' : 'grid-outline'} size={20} />
        </Press>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName="gap-2 px-5 pb-2 pt-3.5">
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            dot={f.dot}
            count={count(f.id)}
            selected={filter === f.id}
            onPress={() => setFilter(f.id)}
          />
        ))}
      </ScrollView>
      <Animated.View key={`${filter}:${grid}`} entering={FadeIn.duration(180)} style={{ flex: 1 }}>
        {grid ? (
          <FlatList
            data={flat}
            keyExtractor={(p) => p.id}
            numColumns={3}
            renderItem={({ item }) => <PostTile post={item} size={tile} />}
            columnWrapperStyle={{ gap: 8 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: space }}
            keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
            ListEmptyComponent={<EmptyState icon="images-outline" {...empty} />}
          />
        ) : (
          <SectionList
            sections={groups}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <PostRow post={item} />}
            renderSectionHeader={({ section }) => (
              <View className="px-5 pb-1.5 pt-6">
                <Text variant="caption" tone="subtle" className="font-bold uppercase tracking-widest">
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: space }}
            keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
            ListEmptyComponent={
              <EmptyState
                icon={q ? 'search' : filter === 'failed' ? 'checkmark-done' : 'albums-outline'}
                {...empty}
                action={q || filter === 'failed' ? undefined : 'Create post'}
                onAction={() => startCompose()}
              />
            }
          />
        )}
      </Animated.View>
    </View>
  );
}
