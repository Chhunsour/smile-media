import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { APP_NAME } from '@/config/app';
import { features } from '@/config/features';
import { HeroCard, openPost, PosterCard, totalsOf } from '@/components/post';
import {
  Avatar,
  Bars,
  Button,
  Card,
  EmptyState,
  Glow,
  Gradient,
  GradientIcon,
  GradientText,
  Icon,
  type IconName,
  LargeHeader,
  Press,
  Section,
  StatTile,
  Text,
  useTabSpace,
} from '@/components/ui';
import { ago, compact, dayLabel, longDate, time } from '@/lib/format';
import { change as changeLabel, dailyReach, delta, engagementRate, inLast, percent, totals } from '@/lib/insights';
import { PLATFORMS } from '@/platforms';
import { allPages, type ComposeTool, retry, startCompose, useStore } from '@/lib/store';
import type { Post } from '@/models';

const QUICK: { icon: IconName; label: string; open?: ComposeTool; onPress?: () => void }[] = [
  { icon: 'images', label: 'Media', open: 'media' },
  { icon: 'camera', label: 'Camera', open: 'camera' },
  { icon: 'bookmarks', label: 'Templates', open: 'templates' },
  { icon: 'calendar', label: 'Plan', onPress: () => router.navigate('/calendar') },
];

const enter = (i: number) => FadeInDown.delay(60 * i).duration(380);

export default function Home() {
  const posts = useStore((s) => s.posts);
  const ME = useStore((s) => s.user)!;
  const [today] = useState(() => new Date());
  const accounts = allPages(useStore((s) => s.accounts));
  const space = useTabSpace();

  const upcoming = posts
    .filter((p) => p.status === 'scheduled' && p.scheduledAt)
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const failed = posts.filter((p) => p.status === 'failed');
  const drafts = posts.filter((p) => p.status === 'draft').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const top = posts
    .filter((p) => p.status === 'published' && p.publishedAt)
    .sort((a, b) => totalsOf(b).reach - totalsOf(a).reach || b.publishedAt!.localeCompare(a.publishedAt!));

  const sentWeek = inLast(posts, 7);
  const week = totals(sentWeek);
  const lastWeek = totals(inLast(posts, 7, 1));
  const change = delta(week.reach, lastWeek.reach);
  const chart = dailyReach(posts, 7);

  const hour = today.getHours();
  const greeting = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View className="flex-1 bg-bg">
      <Glow />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: space }} showsVerticalScrollIndicator={false}>
        <LargeHeader
          eyebrow={`${longDate(today)} · ${ME.workspace ?? APP_NAME}`}
          title={`${greeting}, ${ME.name.split(' ')[0]}`}
          right={
            <Press accessibilityLabel="Profile" onPress={() => router.navigate('/profile')} className="mb-1 mr-1">
              <Avatar uri={ME.avatar} name={ME.name} size={44} glow />
            </Press>
          }
        />

        <Animated.View entering={enter(0)}>
          <Card className="mx-5 mt-5 p-2">
            <Press
              onPress={() => startCompose()}
              accessibilityRole="button"
              accessibilityLabel="Create a post"
              className="h-[60px] flex-row items-center gap-3 rounded-[20px] bg-fill pl-2.5 pr-4">
              <Gradient style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="add" size={26} tone="white" />
              </Gradient>
              <View className="flex-1">
                <Text variant="callout" className="font-semibold">
                  Create a post
                </Text>
                <Text variant="caption" tone="muted">
                  {accounts.length ? `Reach ${accounts.length} channels at once` : 'Connect a channel to get started'}
                </Text>
              </View>
              <GradientIcon name="sparkles" size={20} />
            </Press>
            <View className="mt-2 flex-row">
              {QUICK.map((q) => (
                <Press
                  key={q.label}
                  haptic
                  accessibilityRole="button"
                  onPress={q.onPress ?? (() => startCompose({ open: q.open }))}
                  className="flex-1 items-center gap-1.5 py-2.5">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-fill">
                    <GradientIcon name={q.icon} size={19} />
                  </View>
                  <Text variant="caption" tone="muted" className="font-semibold">
                    {q.label}
                  </Text>
                </Press>
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(1)} style={{ marginTop: 24 }}>
          {upcoming[0] ? (
            <HeroCard post={upcoming[0]} />
          ) : (
            <Card className="mx-5">
              <EmptyState
                icon="rocket-outline"
                title="Your queue is empty"
                body="Schedule your next drop and it’ll take the spotlight here."
                action="Schedule a post"
                onAction={() => startCompose()}
              />
            </Card>
          )}
        </Animated.View>

        {features.analytics ? (
          <Animated.View entering={enter(2)}>
            <Press onPress={() => router.push('/insights')} accessibilityLabel="Open insights" className="mx-5 mt-4">
              <Card className="p-5">
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text variant="caption" tone="muted" className="font-bold uppercase tracking-widest">
                      Reach · 7 days
                    </Text>
                    <GradientText variant="hero" className="mt-1">
                      {compact(week.reach)}
                    </GradientText>
                  </View>
                  <View className="items-end gap-1.5">
                    {change !== undefined ? (
                      <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${change >= 0 ? 'bg-success/15' : 'bg-danger/15'}`}>
                        <Icon name={change >= 0 ? 'trending-up' : 'trending-down'} size={13} tone={change >= 0 ? 'success' : 'danger'} />
                        <Text variant="caption" tone={change >= 0 ? 'success' : 'danger'} className="font-bold">
                          {changeLabel(change)}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row items-center gap-0.5">
                      <Text variant="caption" tone="muted" className="font-semibold">
                        Insights
                      </Text>
                      <Icon name="chevron-forward" size={12} tone="muted" />
                    </View>
                  </View>
                </View>
                <View className="mt-4">
                  <Bars values={chart.values} labels={chart.labels} height={72} />
                </View>
              </Card>
            </Press>
            <View className="mx-5 mt-3 flex-row gap-3">
              <StatTile icon="time" value={String(upcoming.length)} label="Scheduled" />
              <StatTile icon="paper-plane" value={String(sentWeek.length)} label="Posts · 7d" />
              <StatTile icon="heart" value={percent(engagementRate(week))} label="Engagement" />
            </View>
          </Animated.View>
        ) : null}

        {failed.length ? (
          <Section title="Needs attention">
            <View className="mx-5 gap-2.5">
              {failed.map((p) => (
                <Attention key={p.id} post={p} />
              ))}
            </View>
          </Section>
        ) : null}

        {upcoming.length > 1 ? (
          <Rail title="Coming up" action="Calendar" onAction={() => router.navigate('/calendar')}>
            {upcoming.slice(1).map((p) => {
              const d = new Date(p.scheduledAt!);
              return <PosterCard key={p.id} post={p} label={`${dayLabel(d)} · ${time(d)}`} />;
            })}
          </Rail>
        ) : null}

        {top.length ? (
          <Rail
            title={features.analytics ? 'Top performing' : 'Recently live'}
            action="All posts"
            onAction={() => router.navigate({ pathname: '/posts', params: { filter: 'published' } })}>
            {top.slice(0, 8).map((p, i) => {
              const t = totalsOf(p);
              return (
                <PosterCard
                  key={p.id}
                  post={p}
                  label={t.reach ? `${i < 3 ? `#${i + 1} · ` : ''}${compact(t.reach)} reach` : ago(p.publishedAt!)}
                />
              );
            })}
          </Rail>
        ) : null}

        {drafts.length ? (
          <Rail
            title="Drafts"
            action={String(drafts.length)}
            onAction={() => router.navigate({ pathname: '/posts', params: { filter: 'draft' } })}>
            {drafts.map((p) => (
              <Press
                key={p.id}
                onPress={() => startCompose({ postId: p.id })}
                className="w-[232px] justify-between gap-4 rounded-[24px] border border-line/70 bg-card p-4">
                <View className="flex-row items-center gap-2">
                  <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
                    <Gradient style={{ ...StyleSheet.absoluteFill, opacity: 0.18 }} />
                    <GradientIcon name="create" size={14} />
                  </View>
                  <Text variant="caption" tone="muted" className="font-semibold">
                    Edited {ago(p.updatedAt)}
                  </Text>
                </View>
                <Text variant="callout" numberOfLines={4}>
                  {p.caption || 'Empty draft'}
                </Text>
                <Text variant="footnote" tone="accent" className="font-semibold">
                  Continue editing →
                </Text>
              </Press>
            ))}
          </Rail>
        ) : null}

        <Section title="Channels" action="Manage" onAction={() => router.push('/connections')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
            {accounts.map((a) => (
              <View key={a.id} className="w-[72px] items-center">
                <Avatar uri={a.avatar} name={a.name} size={58} platform={a.platform} />
                <Text variant="caption" className="mt-2.5 text-center font-semibold" numberOfLines={1}>
                  {a.name}
                </Text>
                <Text variant="micro" tone="muted">
                  {compact(a.followers)}
                </Text>
              </View>
            ))}
            <Press onPress={() => router.push('/connections')} className="w-[72px] items-center">
              <View className="h-[58px] w-[58px] items-center justify-center rounded-full border border-dashed border-subtle">
                <Icon name="add" size={24} tone="muted" />
              </View>
              <Text variant="caption" tone="muted" className="mt-2.5 font-semibold">
                Connect
              </Text>
            </Press>
          </ScrollView>
        </Section>
      </ScrollView>
    </View>
  );
}

function Rail({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <Section title={title} action={action} onAction={onAction}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3.5 px-5">
        {children}
      </ScrollView>
    </Section>
  );
}

function Attention({ post }: { post: Post }) {
  const failed = post.destinations.filter((t) => t.status === 'failed');
  const names = [...new Set(failed.map((t) => PLATFORMS[t.platform].name))].join(', ');
  return (
    <Press
      onPress={() => openPost(post.id)}
      className="flex-row items-center gap-3 rounded-[22px] border border-danger/25 bg-danger/10 p-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-danger/15">
        <Icon name="alert-circle" size={22} tone="danger" />
      </View>
      <View className="flex-1">
        <Text variant="footnote" className="font-semibold" numberOfLines={1}>
          Failed on {names}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {failed[0]?.result?.error?.message}
        </Text>
      </View>
      <Button title="Retry" icon="refresh" size="sm" onPress={() => retry(post.id)} />
    </Press>
  );
}
