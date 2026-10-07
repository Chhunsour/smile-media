import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button, Footer, Gradient, Icon, type IconName, Press, SheetHeader, Text, useCloseComposer } from '@/components/ui';
import { dayLabel, longDate, sameDay, startOfDay, time, when } from '@/lib/format';
import { timing } from '@/lib/insights';
import { commitDraft, toast, useStore } from '@/lib/store';
import type { Post } from '@/models';
import { useColors, useScheme } from '@/lib/theme';

const at = (days: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Next `weekday` at `hour` that's at least 30 minutes away. */
function next(weekday: number, hour: number) {
  for (let i = 0; ; i++) {
    const d = at(i, hour);
    if (d.getDay() === weekday && d.getTime() > Date.now() + 30 * 60e3) return d;
  }
}

// "Best time" comes from your own results (best weekday × best hour); 6:30 PM until there's data.
function suggestions(posts: Post[]): { label: string; icon: IconName; date: Date }[] {
  const t = timing(posts);
  const evening = at(0, 18, 30);
  return [
    {
      label: t.hasData ? 'Your best time' : 'Best time',
      icon: 'trending-up',
      date: t.hasData ? next(t.bestDay, t.bestHour) : evening.getTime() > Date.now() + 30 * 60e3 ? evening : at(1, 18, 30),
    },
    { label: 'Morning', icon: 'sunny-outline', date: at(1, 9) },
    { label: 'Weekend', icon: 'cafe-outline', date: at((6 - new Date().getDay() + 7) % 7 || 7, 10) },
  ];
}

const DAYS = 30;

export default function ScheduleSheet() {
  const scheduledAt = useStore((s) => s.draft.scheduledAt);
  const c = useColors();
  const scheme = useScheme();
  const closeComposer = useCloseComposer();
  const [now] = useState(Date.now);
  const posts = useStore((s) => s.posts);
  const picks = suggestions(posts);
  const [date, setDate] = useState(() =>
    scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? new Date(scheduledAt) : picks[0].date,
  );
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + i);
    return d;
  });
  const valid = date.getTime() > now + 60e3;

  const merge = (day: Date, clock: Date) => {
    const d = new Date(day);
    d.setHours(clock.getHours(), clock.getMinutes(), 0, 0);
    setDate(d);
  };

  const confirm = () => {
    const iso = date.toISOString();
    commitDraft('schedule', iso);
    closeComposer();
    toast(`Scheduled for ${when(iso)}`);
  };

  return (
    // collapsable={false}: keeps react-native-screens from resizing our ScrollView to fill the sheet
    <View className="flex-1" collapsable={false}>
      <SheetHeader title="Schedule" subtitle={`${longDate(date)} at ${time(date)}`} />
      <ScrollView className="flex-1" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
        <Label>Suggested</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
          {picks.map((p) => {
            const on = p.date.getTime() === date.getTime();
            return (
              <Press
                key={p.label}
                haptic
                onPress={() => setDate(p.date)}
                className={`w-[136px] rounded-[20px] border p-3.5 ${on ? 'border-accent bg-accent/10' : 'border-transparent bg-card'}`}>
                <View className="flex-row items-center gap-1">
                  <Icon name={p.icon} size={13} tone={on ? 'accent' : 'muted'} />
                  <Text variant="caption" tone={on ? 'accent' : 'muted'} className="font-semibold">
                    {p.label}
                  </Text>
                </View>
                <Text variant="callout" className="mt-1.5 font-semibold" numberOfLines={1}>
                  {dayLabel(p.date)}
                </Text>
                <Text variant="footnote" tone="muted">
                  {time(p.date)}
                </Text>
              </Press>
            );
          })}
        </ScrollView>

        <Label>Day</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
          {days.map((d) => {
            const on = sameDay(d, date);
            return (
              <Press
                key={d.toISOString()}
                haptic
                onPress={() => merge(d, date)}
                accessibilityLabel={longDate(d)}
                className={`w-[54px] items-center overflow-hidden rounded-2xl py-3 ${on ? '' : 'bg-card'}`}>
                {on ? <Gradient style={{ position: 'absolute', inset: 0 }} /> : null}
                <Text variant="micro" tone={on ? 'white' : 'muted'} className="font-semibold uppercase">
                  {d.toLocaleDateString([], { weekday: 'short' })}
                </Text>
                <Text variant="headline" tone={on ? 'white' : 'fg'} className="mt-1">
                  {d.getDate()}
                </Text>
              </Press>
            );
          })}
        </ScrollView>

        <Label>Time</Label>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            minuteInterval={5}
            textColor={c.fg}
            themeVariant={scheme}
            onValueChange={(_, d) => merge(date, d)}
            style={{ height: 170 }}
          />
        ) : (
          <Press
            onPress={() => DateTimePickerAndroid.open({ value: date, mode: 'time', onValueChange: (_, d) => merge(date, d) })}
            className="mx-5 h-14 flex-row items-center justify-between rounded-2xl border border-line bg-card px-4">
            <Text variant="headline">{time(date)}</Text>
            <Icon name="time-outline" size={20} tone="muted" />
          </Press>
        )}
        <Text variant="caption" tone="subtle" className="mx-6 mt-1">
          Times are in {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}.
        </Text>
      </ScrollView>
      <Footer>
        {!valid ? (
          <Text variant="footnote" tone="danger" className="mb-2 text-center">
            Pick a time in the future
          </Text>
        ) : null}
        <Button title="Schedule post" icon="calendar-outline" disabled={!valid} onPress={confirm} />
      </Footer>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="footnote" tone="muted" className="mb-2 ml-6 mt-5 font-semibold">
      {children}
    </Text>
  );
}
