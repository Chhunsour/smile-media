import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ActionSheetIOS, Alert, Linking, Platform, Share, StyleSheet, View } from 'react-native';

import { ago, compact, countdown, dayLabel, duration, postWhen, time } from '@/lib/format';
import { PLATFORM_ORDER, PLATFORMS } from '@/platforms';
import { deletePost, duplicatePost, retry, startCompose, toast } from '@/lib/store';
import type { MediaAsset as Media, PlatformId, Post, PostDestination as Target } from '@/models';

import { Avatar, Button, Gradient, Icon, IconButton, PlatformStack, Press, ProgressBar, STATUS, StatusPill, Text } from './ui';

export const mediaSource = (m: Media) => (m.type === 'video' ? m.thumb : m.uri);

export const platformsOf = (post: Pick<Post, 'destinations'>): PlatformId[] =>
  PLATFORM_ORDER.filter((p) => post.destinations.some((t) => t.platform === p));

export const progressOf = (post: Post) =>
  post.destinations.reduce((sum, t) => sum + (t.status === 'published' || t.status === 'failed' ? 1 : (t.progress ?? 0)), 0) /
  Math.max(1, post.destinations.length);

export const totalsOf = (post: Post) =>
  post.destinations.reduce(
    (s, t) => ({
      reach: s.reach + (t.result?.metrics?.reach ?? 0),
      likes: s.likes + (t.result?.metrics?.likes ?? 0),
      comments: s.comments + (t.result?.metrics?.comments ?? 0),
      shares: s.shares + (t.result?.metrics?.shares ?? 0),
    }),
    { reach: 0, likes: 0, comments: 0, shares: 0 },
  );

export const openPost = (id: string) => router.push({ pathname: '/post/[id]', params: { id } });

export const sharePost = (post: Post) => Share.share({ message: post.caption || 'Check this out' }).catch(() => {});

export function confirmDelete(post: Post, after?: () => void) {
  Alert.alert(
    'Delete this post?',
    post.status === 'published' ? 'It’s removed from this app only — it stays live on each platform.' : 'This can’t be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          after?.();
          deletePost(post.id);
          toast('Post deleted', 'info');
        },
      },
    ],
  );
}

/** Long-press menu for a post anywhere it's listed. */
export function postActions(post: Post) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const actions: [string, () => void][] = [
    ...(post.status === 'draft' || post.status === 'scheduled' ? [['Edit', () => startCompose({ postId: post.id })] as [string, () => void]] : []),
    ...(post.status === 'failed' ? [['Retry failed channels', () => retry(post.id)] as [string, () => void]] : []),
    ['Duplicate', () => duplicatePost(post.id)],
    ['Share caption', () => sharePost(post)],
    ['Delete', () => confirmDelete(post)],
  ];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...actions.map(([label]) => label), 'Cancel'],
        destructiveButtonIndex: actions.length - 1,
        cancelButtonIndex: actions.length,
        title: post.caption ? post.caption.slice(0, 80) : undefined,
      },
      (i) => actions[i]?.[1](),
    );
  } else {
    // ponytail: Android alerts show at most 3 buttons; keep the first action, Duplicate and Delete.
    const keep = [actions[0], ...actions.slice(-2)];
    Alert.alert('Post', undefined, [
      { text: 'Cancel', style: 'cancel' },
      ...keep.map(([text, onPress]) => ({ text, onPress, style: text === 'Delete' ? ('destructive' as const) : undefined })),
    ]);
  }
}

const SHADE = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)'] as const;

/**
 * Fills its parent with the media's image (or a placeholder for videos without a poster frame).
 * `badge`: small duration pill, a bare play icon, a centered play button, or nothing.
 */
export function MediaFill({ media, badge = 'duration' }: { media: Media; badge?: 'duration' | 'icon' | 'play' | false }) {
  const src = mediaSource(media);
  const video = media.type === 'video';
  return (
    <>
      {src ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View className="flex-1 items-center justify-center bg-neutral-900">
          <Ionicons name="film-outline" size={22} color="rgba(255,255,255,0.6)" />
        </View>
      )}
      {video && badge === 'play' ? (
        <View className="absolute inset-0 items-center justify-center">
          <View className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35">
            <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      ) : video && badge ? (
        <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-[2px]">
          <Ionicons name="play" size={8} color="#fff" />
          {badge === 'duration' && media.duration ? (
            <Text variant="micro" tone="white" className="font-semibold">
              {duration(media.duration)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

export function MediaThumb({
  media,
  size = 56,
  height,
  radius = 14,
}: {
  media: Media;
  size?: number;
  height?: number;
  radius?: number;
}) {
  return (
    <View className="overflow-hidden bg-fill" style={{ width: size, height: height ?? size, borderRadius: radius }}>
      <MediaFill media={media} badge={size >= 64 ? 'duration' : 'icon'} />
    </View>
  );
}

/** Text-only posts get a typographic "poster" instead of a thumbnail. */
function QuotePoster({ caption, small }: { caption: string; small?: boolean }) {
  return (
    <View className="flex-1 justify-end overflow-hidden bg-fill p-2.5">
      <LinearGradient
        colors={['rgba(255,138,30,0.35)', 'rgba(255,45,122,0.35)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {small ? (
        <Ionicons
          name="text"
          size={18}
          color="rgba(255,255,255,0.85)"
          style={{ alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto' }}
        />
      ) : (
        <Text variant="headline" tone="white" numberOfLines={5}>
          {caption}
        </Text>
      )}
    </View>
  );
}

export function PostThumb({ post, width = 60, height = 76 }: { post: Post; width?: number; height?: number }) {
  return (
    <View className="overflow-hidden rounded-[18px] bg-fill" style={{ width, height }}>
      {post.media[0] ? <MediaFill media={post.media[0]} badge="icon" /> : <QuotePoster caption={post.caption} small />}
      {post.media.length > 1 ? (
        <View className="absolute right-1.5 top-1.5">
          <Ionicons name="copy" size={12} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }} />
        </View>
      ) : null}
    </View>
  );
}

export function PostRow({ post, onPress }: { post: Post; onPress?: () => void }) {
  const platforms = platformsOf(post);
  const failed = [...new Set(post.destinations.filter((t) => t.status === 'failed').map((t) => PLATFORMS[t.platform].name))];
  return (
    <Press
      onPress={onPress ?? (() => openPost(post.id))}
      onLongPress={() => postActions(post)}
      delayLongPress={300}
      className="flex-row gap-4 px-5 py-3">
      <PostThumb post={post} width={64} height={80} />
      <View className="flex-1 justify-center gap-2">
        <Text variant="callout" className="font-medium" numberOfLines={2}>
          {post.caption || 'No caption'}
        </Text>
        <View className="flex-row items-center gap-2">
          {platforms.length ? (
            <PlatformStack platforms={platforms} size={16} />
          ) : (
            <Text variant="caption" tone="subtle">
              No channels
            </Text>
          )}
          <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
            {postWhen(post)}
          </Text>
          <StatusPill status={post.status} />
        </View>
        {post.status === 'publishing' ? <ProgressBar value={progressOf(post)} className="mt-0.5" /> : null}
        {post.status === 'failed' && failed.length ? (
          <Text variant="caption" tone="danger" numberOfLines={1}>
            Failed on {failed.join(', ')} · tap to retry
          </Text>
        ) : null}
      </View>
    </Press>
  );
}

/** Streaming-style poster for horizontal rails. */
export function PosterCard({ post, label, width = 148 }: { post: Post; label?: string; width?: number }) {
  return (
    <Press onPress={() => openPost(post.id)} onLongPress={() => postActions(post)} style={{ width }} className="gap-2.5">
      <View className="overflow-hidden rounded-[20px] bg-card" style={{ width, height: Math.round(width * 1.32) }}>
        {post.media[0] ? <MediaFill media={post.media[0]} badge="play" /> : <QuotePoster caption={post.caption} />}
        {post.media[0] ? <LinearGradient colors={SHADE} locations={[0.55, 1]} style={StyleSheet.absoluteFill} /> : null}
        {label ? (
          <View className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1">
            <Text variant="micro" tone="white" className="font-bold">
              {label}
            </Text>
          </View>
        ) : null}
        <View className="absolute bottom-2.5 left-2.5">
          <PlatformStack platforms={platformsOf(post)} size={18} ring="card" />
        </View>
      </View>
      <Text variant="footnote" className="font-medium" numberOfLines={2}>
        {post.caption || 'Untitled'}
      </Text>
    </Press>
  );
}

/** Media-first grid cell for the Posts library. */
export function PostTile({ post, size }: { post: Post; size: number }) {
  const s = STATUS[post.status];
  return (
    <Press
      onPress={() => openPost(post.id)}
      onLongPress={() => postActions(post)}
      accessibilityLabel={`${s.label} post: ${post.caption}`}
      className="overflow-hidden rounded-[18px] bg-card"
      style={{ width: size, height: Math.round(size * 1.25) }}>
      {post.media[0] ? <MediaFill media={post.media[0]} badge="icon" /> : <QuotePoster caption={post.caption} small={size < 120} />}
      {post.media[0] ? <LinearGradient colors={SHADE} locations={[0.5, 1]} style={StyleSheet.absoluteFill} /> : null}
      <View className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-black/30 ${s.dot}`} />
      <View className="absolute bottom-2 left-2">
        <PlatformStack platforms={platformsOf(post)} size={15} ring="card" />
      </View>
    </Press>
  );
}

/** Cinematic "next up" banner for the soonest scheduled post. */
export function HeroCard({ post }: { post: Post }) {
  const d = new Date(post.scheduledAt ?? post.updatedAt);
  return (
    <Press
      onPress={() => openPost(post.id)}
      onLongPress={() => postActions(post)}
      className="mx-5 overflow-hidden rounded-[30px] bg-card"
      style={{ height: 280 }}>
      {post.media[0] ? <MediaFill media={post.media[0]} badge={false} /> : <Gradient style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5">
          <Gradient horizontal style={StyleSheet.absoluteFill} />
          <View className="h-1.5 w-1.5 rounded-full bg-white" />
          <Text variant="micro" tone="white" className="font-bold uppercase tracking-widest">
            Up next · {countdown(d.toISOString())}
          </Text>
        </View>
        <PlatformStack platforms={platformsOf(post)} size={22} ring="card" />
      </View>
      <View className="flex-1" />
      <View className="flex-row items-end gap-4 p-5">
        <View className="flex-1 gap-1.5">
          <Text variant="caption" tone="white" className="font-bold uppercase tracking-widest opacity-70">
            {dayLabel(d)} · {time(d)}
          </Text>
          <Text variant="title" tone="white" numberOfLines={2}>
            {post.caption}
          </Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
          <Ionicons name="play" size={20} color="#0B0B0D" style={{ marginLeft: 3 }} />
        </View>
      </View>
    </Press>
  );
}

const phase = (p: number) => (p < 0.6 ? 'Uploading…' : p < 0.9 ? 'Processing…' : 'Posting…');

/** One destination's publish state, with inline retry for failures. */
export function TargetRow({
  target,
  postId,
  scheduled,
  ring = 'card',
}: {
  target: Target;
  postId: string;
  scheduled?: boolean;
  ring?: 'bg' | 'card';
}) {
  const p = PLATFORMS[target.platform];
  const m = target.result?.metrics;
  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <Avatar uri={target.avatar} name={target.name} size={42} platform={target.platform} ring={ring} />
      <View className="flex-1 gap-1">
        <Text variant="callout" className="font-semibold" numberOfLines={1}>
          {target.name}
        </Text>
        {target.status === 'publishing' ? (
          <View className="gap-1.5 pr-1">
            <ProgressBar value={target.progress ?? 0} />
            <Text variant="caption" tone="muted">
              {phase(target.progress ?? 0)}
            </Text>
          </View>
        ) : target.status === 'failed' ? (
          <Text variant="footnote" tone="danger" numberOfLines={3}>
            {target.result?.error?.message}
          </Text>
        ) : target.status === 'published' ? (
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {m?.reach
              ? `${compact(m.likes)} likes · ${compact(m.comments)} comments · ${compact(m.reach)} reach`
              : `Live on ${p.name} · ${ago(target.result?.publishedAt ?? new Date().toISOString())}`}
          </Text>
        ) : (
          <Text variant="footnote" tone="muted">
            {p.name} {p.noun.toLowerCase()} · {scheduled ? 'Scheduled' : 'Not published'}
          </Text>
        )}
      </View>
      {target.status === 'failed' ? (
        <Button title="Retry" icon="refresh" size="sm" onPress={() => retry(postId, target.pageId)} />
      ) : target.status === 'published' && target.result?.url ? (
        <IconButton
          icon="open-outline"
          label={`Open on ${p.name}`}
          filled
          size={18}
          onPress={() => Linking.openURL(target.result!.url!).catch(() => toast('Couldn’t open the link', 'error'))}
        />
      ) : target.status === 'published' ? (
        <Icon name="checkmark-circle" size={24} tone="success" />
      ) : target.status === 'publishing' ? (
        <Text variant="footnote" tone="muted" className="w-10 text-right font-semibold">
          {Math.round((target.progress ?? 0) * 100)}%
        </Text>
      ) : (
        <Icon name="time-outline" size={20} tone="subtle" />
      )}
    </View>
  );
}
