import type { PlatformId, Post } from '@/models';

import { startOfDay } from './format';

const DAY = 864e5;

const live = (p: Post) => (p.status === 'published' || p.status === 'failed') && !!p.publishedAt;

/** Engagement totals over the destinations of the given posts, optionally for one platform. */
export function totals(posts: Post[], platform?: PlatformId) {
  const t = { reach: 0, likes: 0, comments: 0, shares: 0, published: 0, failed: 0 };
  for (const p of posts)
    for (const d of p.destinations) {
      if (platform && d.platform !== platform) continue;
      const m = d.result?.metrics;
      t.reach += m?.reach ?? 0;
      t.likes += m?.likes ?? 0;
      t.comments += m?.comments ?? 0;
      t.shares += m?.shares ?? 0;
      if (d.status === 'published') t.published++;
      if (d.status === 'failed') t.failed++;
    }
  return t;
}

export const engagementRate = (t: ReturnType<typeof totals>) => (t.reach ? (t.likes + t.comments + t.shares) / t.reach : 0);

/** Posts that went out in the `days` days ending today (all time when days is 0). */
export function inLast(posts: Post[], days: number, offset = 0) {
  const end = startOfDay(new Date()).getTime() + DAY - offset * days * DAY;
  const start = days ? end - days * DAY : 0;
  return posts.filter((p) => {
    if (!live(p)) return false;
    const t = new Date(p.publishedAt!).getTime();
    return t >= start && t < end;
  });
}

/** Reach per day for the last `days` days, oldest first, plus single-letter weekday labels. */
export function dailyReach(posts: Post[], days: number) {
  const today = startOfDay(new Date()).getTime();
  const values = Array.from({ length: days }, () => 0);
  for (const p of inLast(posts, days)) {
    const i = days - 1 - Math.round((today - startOfDay(new Date(p.publishedAt!)).getTime()) / DAY);
    if (i >= 0) values[i] += totals([p]).reach;
  }
  const labels = values.map((_, i) => new Date(today - (days - 1 - i) * DAY).toLocaleDateString([], { weekday: 'narrow' }));
  return { values, labels };
}

/** Change from the previous period as a fraction, or undefined when there's nothing to compare. */
export function delta(now: number, before: number) {
  return before ? (now - before) / before : undefined;
}

export const percent = (x: number) => `${Math.round(x * 1000) / 10}%`;

/** "+12.5%", "−8%", or "3.2×" once growth passes 100%. */
export const change = (x: number) => (x >= 1 ? `${Math.round((x + 1) * 10) / 10}×` : `${x >= 0 ? '+' : '−'}${percent(Math.abs(x))}`);

/** Average reach by weekday (Sun–Sat) and by hour, from everything that went out. */
export function timing(posts: Post[]) {
  const day = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  const hour = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
  for (const p of posts.filter(live)) {
    const d = new Date(p.publishedAt!);
    const r = totals([p]).reach;
    day[d.getDay()].sum += r;
    day[d.getDay()].n++;
    hour[d.getHours()].sum += r;
    hour[d.getHours()].n++;
  }
  const avg = (xs: { sum: number; n: number }[]) => xs.map((x) => (x.n ? x.sum / x.n : 0));
  const best = (xs: number[]) => xs.reduce((b, v, i) => (v > xs[b] ? i : b), 0);
  const byDay = avg(day);
  const byHour = avg(hour);
  return { byDay, bestDay: best(byDay), bestHour: best(byHour), hasData: byDay.some(Boolean) };
}
