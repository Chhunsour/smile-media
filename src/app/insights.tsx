import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PostRow, totalsOf } from '@/components/post';
import {
  Bars,
  Card,
  EmptyState,
  Glow,
  GradientText,
  Icon,
  Meter,
  NavHeader,
  PlatformIcon,
  Section,
  Segmented,
  StatTile,
  Text,
} from '@/components/ui';
import { compact } from '@/lib/format';
import { change as changeLabel, dailyReach, delta, engagementRate, inLast, percent, timing, totals } from '@/lib/insights';
import { startCompose, useStore } from '@/lib/store';
import { PLATFORM_ORDER, PLATFORMS } from '@/platforms';

type Period = '7' | '30' | '0';
const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '0', label: 'All time' },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });

export default function Insights() {
  const posts = useStore((s) => s.posts);
  const [period, setPeriod] = useState<Period>('7');
  const days = Number(period);

  const sent = inLast(posts, days);
  const t = totals(sent);
  const before = days ? totals(inLast(posts, days, 1)) : undefined;
  const change = before ? delta(t.reach, before.reach) : undefined;
  const chart = dailyReach(posts, days === 7 ? 7 : 30);
  const success = t.published + t.failed ? t.published / (t.published + t.failed) : 0;
  const platforms = PLATFORM_ORDER.map((p) => ({ p, t: totals(sent, p) }))
    .filter((x) => x.t.published + x.t.failed)
    .sort((a, b) => b.t.reach - a.t.reach);
  const maxReach = Math.max(1, ...platforms.map((x) => x.t.reach));
  const top = [...sent].sort((a, b) => totalsOf(b).reach - totalsOf(a).reach).slice(0, 5);
  const when = timing(posts);

  return (
    <View className="flex-1 bg-bg">
      <Glow height={360} />
      <NavHeader title="Insights" />
      <ScrollView contentContainerClassName="pb-16" showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <Segmented value={period} options={PERIODS} onChange={setPeriod} />
        </View>

        {!sent.length ? (
          <EmptyState
            icon="analytics-outline"
            title="No results yet"
            body="Publish a post and its reach, likes and comments will show up here."
            action="Create post"
            onAction={() => startCompose()}
          />
        ) : (
          <Animated.View key={period} entering={FadeIn.duration(220)}>
            <Card className="mx-5 mt-4 p-5">
              <Text variant="caption" tone="muted" className="font-bold uppercase tracking-widest">
                Total reach
              </Text>
              <View className="mt-1 flex-row items-end justify-between">
                <GradientText variant="hero">{compact(t.reach)}</GradientText>
                {change !== undefined ? (
                  <View className="mb-1.5 flex-row items-center gap-1">
                    <Icon name={change >= 0 ? 'trending-up' : 'trending-down'} size={15} tone={change >= 0 ? 'success' : 'danger'} />
                    <Text variant="footnote" tone={change >= 0 ? 'success' : 'danger'} className="font-bold">
                      {changeLabel(change)} vs previous
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-5">
                <Bars values={chart.values} labels={chart.values.length <= 7 ? chart.labels : undefined} height={96} />
                {chart.values.length > 7 ? (
                  <View className="mt-2 flex-row justify-between">
                    <Text variant="micro" tone="subtle" className="font-semibold">
                      30 days ago
                    </Text>
                    <Text variant="micro" tone="fg" className="font-semibold">
                      Today
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <View className="mx-5 mt-3 flex-row gap-3">
              <StatTile icon="heart" value={compact(t.likes)} label="Likes" />
              <StatTile icon="chatbubble" value={compact(t.comments)} label="Comments" />
            </View>
            <View className="mx-5 mt-3 flex-row gap-3">
              <StatTile icon="arrow-redo" value={compact(t.shares)} label="Shares" />
              <StatTile icon="pulse" value={percent(engagementRate(t))} label="Engagement" />
            </View>
            <View className="mx-5 mt-3 flex-row gap-3">
              <StatTile icon="paper-plane" value={String(sent.length)} label="Posts sent" hint={`${t.published} ${t.published === 1 ? 'delivery' : 'deliveries'}`} />
              <StatTile
                icon="shield-checkmark"
                value={percent(success)}
                label="Delivery rate"
                hint={t.failed ? `${t.failed} failed` : 'No failures'}
              />
            </View>

            <Section title="By platform">
              <Card className="mx-5 px-4">
                {platforms.map(({ p, t: pt }, i) => (
                  <View key={p} className={`gap-2.5 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                    <View className="flex-row items-center gap-3">
                      <PlatformIcon platform={p} size={30} radius={9} />
                      <Text variant="callout" className="flex-1 font-semibold">
                        {PLATFORMS[p].name}
                      </Text>
                      <View className="items-end">
                        <Text variant="callout" className="font-bold tabular-nums">
                          {compact(pt.reach)}
                        </Text>
                        <Text variant="micro" tone="muted">
                          {percent(engagementRate(pt))} engaged
                        </Text>
                      </View>
                    </View>
                    <Meter value={pt.reach / maxReach} />
                  </View>
                ))}
              </Card>
            </Section>

            {when.hasData ? (
              <Section title="Best time to post">
                <Card className="mx-5 p-5">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text variant="caption" tone="muted" className="font-semibold">
                        Best day
                      </Text>
                      <Text variant="title" className="mt-0.5">
                        {new Date(2000, 0, 2 + when.bestDay).toLocaleDateString([], { weekday: 'long' })}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text variant="caption" tone="muted" className="font-semibold">
                        Best hour
                      </Text>
                      <Text variant="title" className="mt-0.5">
                        {hourLabel(when.bestHour)}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-5">
                    <Bars values={when.byDay} labels={WEEKDAYS} highlight={when.bestDay} height={56} />
                  </View>
                  <Text variant="caption" tone="subtle" className="mt-3">
                    Average reach per post, from everything you’ve published.
                  </Text>
                </Card>
              </Section>
            ) : null}

            <Section title="Top posts">
              {top.map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </Section>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
