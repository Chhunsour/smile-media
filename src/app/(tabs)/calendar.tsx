import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { mediaSource, PostRow } from '@/components/post';
import { Button, Card, EmptyState, Glow, Gradient, IconButton, LargeHeader, STATUS, Text, useTabSpace } from '@/components/ui';
import { dayDiff, longDate, plural, postDate, sameDay, startOfDay } from '@/lib/format';
import { startCompose, useStore } from '@/lib/store';
import type { Post } from '@/models';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

/** 6×7 grid of dates covering the month, starting on Sunday. */
function grid(month: Date) {
  const first = new Date(month);
  first.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}

/** Default time for a new post on `day`: 9 AM, or the next full hour (+1) if that's already past. */
function slotOn(day: Date) {
  const d = new Date(day);
  d.setHours(9, 0, 0, 0);
  if (d.getTime() > Date.now() + 30 * 60e3) return d;
  const next = new Date();
  next.setHours(next.getHours() + 2, 0, 0, 0);
  return next;
}

export default function Calendar() {
  const posts = useStore((s) => s.posts);
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [direction, setDirection] = useState(1);
  const space = useTabSpace();

  const dated = posts.flatMap((p) => {
    const d = postDate(p);
    return d ? [{ post: p, date: d }] : [];
  });
  const on = (day: Date) => dated.filter((x) => sameDay(x.date, day));
  const dayPosts: Post[] = on(selected)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((x) => x.post);
  const past = dayDiff(selected) < 0;
  const monthPosts = dated.filter((x) => x.date.getMonth() === month.getMonth() && x.date.getFullYear() === month.getFullYear());
  const monthCount = (status: Post['status']) => monthPosts.filter((x) => x.post.status === status).length;

  const shift = (delta: number) => {
    setDirection(delta);
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };
  const pick = (day: Date) => {
    Haptics.selectionAsync();
    setSelected(day);
    if (day.getMonth() !== month.getMonth()) shift(day > month ? 1 : -1);
  };
  const today = () => {
    const now = startOfDay(new Date());
    setDirection(now > month ? 1 : -1);
    setMonth(monthStart(now));
    setSelected(now);
  };

  const swipe = Gesture.Exclusive(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => shift(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => shift(-1)),
  );

  return (
    <View className="flex-1 bg-bg">
      <Glow height={320} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: space }} showsVerticalScrollIndicator={false}>
        <LargeHeader
          eyebrow="Schedule"
          title="Calendar"
          right={<Button title="Today" size="sm" variant="secondary" onPress={today} className="mb-1" />}
        />

        <GestureDetector gesture={swipe}>
          <Card className="mx-5 mt-4 rounded-[30px] px-2 pb-3 pt-3">
            <View className="mb-3 flex-row items-center justify-between pl-3">
              <Text variant="title">
                {month.toLocaleDateString([], {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View className="flex-row">
                <IconButton icon="chevron-back" label="Previous month" size={20} onPress={() => shift(-1)} />
                <IconButton icon="chevron-forward" label="Next month" size={20} onPress={() => shift(1)} />
              </View>
            </View>
            <View className="flex-row">
              {WEEKDAYS.map((d, i) => (
                <Text key={i} variant="micro" tone="subtle" className="flex-1 text-center font-semibold">
                  {d}
                </Text>
              ))}
            </View>
            <Animated.View
              key={month.toISOString()}
              entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(220)}
              style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
              {grid(month).map((day) => {
                const isSelected = sameDay(day, selected);
                const isToday = dayDiff(day) === 0;
                const inMonth = day.getMonth() === month.getMonth();
                const dots = on(day).slice(0, 3);
                const cover = on(day).find((x) => x.post.media[0])?.post.media[0];
                const thumb = cover && !isSelected ? mediaSource(cover) : undefined;
                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${longDate(day)}, ${plural(on(day).length, 'post')}`}
                    className="h-[54px] items-center pt-0.5"
                    style={{ width: `${100 / 7}%` }}>
                    <View
                      className={`h-9 w-9 items-center justify-center overflow-hidden rounded-full ${isToday && !isSelected ? 'border-[1.5px] border-accent' : ''} ${inMonth ? '' : 'opacity-40'}`}>
                      {isSelected ? <Gradient style={StyleSheet.absoluteFill} /> : null}
                      {thumb ? (
                        <>
                          <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <View className="absolute inset-0 bg-black/45" />
                        </>
                      ) : null}
                      <Text
                        variant="callout"
                        tone={isSelected || thumb ? 'white' : isToday ? 'accent' : inMonth ? 'fg' : 'subtle'}
                        className={isSelected || isToday || thumb ? 'font-bold' : ''}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View className="mt-1 h-1 flex-row gap-[3px]">
                      {dots.map(({ post }) => (
                        <View
                          key={post.id}
                          className={`h-1 w-1 rounded-full ${STATUS[post.status].dot} ${inMonth ? '' : 'opacity-40'}`}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </Card>
        </GestureDetector>

        <View className="mx-5 mt-3 flex-row gap-2">
          {(['scheduled', 'published', 'failed'] as const).map((st) => (
            <View key={st} className="flex-1 flex-row items-center gap-2 rounded-2xl border border-line/70 bg-card px-3 py-2.5">
              <View className={`h-2 w-2 rounded-full ${STATUS[st].dot}`} />
              <Text variant="footnote" className="font-bold tabular-nums">
                {monthCount(st)}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
                {STATUS[st].label}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-8 flex-row items-center justify-between pl-5 pr-4">
          <View>
            <Text variant="title">{longDate(selected)}</Text>
            <Text variant="footnote" tone="muted">
              {dayPosts.length ? plural(dayPosts.length, 'post') : past ? 'Nothing went out' : 'Free day'}
            </Text>
          </View>
          {!past ? <Button title="New" icon="add" size="sm" onPress={() => startCompose({ date: slotOn(selected) })} /> : null}
        </View>

        {dayPosts.length ? (
          <View className="mt-2">
            {dayPosts.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar-clear-outline"
            title={past ? 'Nothing posted' : 'Nothing scheduled'}
            body={past ? 'No posts went out on this day.' : 'Plan something for this day — it’ll publish automatically.'}
            action={past ? undefined : 'Schedule a post'}
            onAction={() => startCompose({ date: slotOn(selected) })}
          />
        )}
      </ScrollView>
    </View>
  );
}
