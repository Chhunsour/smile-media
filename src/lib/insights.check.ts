// Run: npx tsx src/lib/insights.check.ts
import type { Post } from '@/models';

import { change, dailyReach, delta, engagementRate, inLast, timing, totals } from './insights';

const assert = {
  equal: (a: unknown, b: unknown) => {
    if (a !== b) throw new Error(`${String(a)} !== ${String(b)}`);
  },
  deepEqual: (a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  },
};

const DAY = 864e5;
const post = (id: string, daysAgo: number, reach: number, status: 'published' | 'failed' = 'published'): Post => ({
  id,
  caption: id,
  media: [],
  captions: {},
  options: {},
  status,
  createdAt: '',
  updatedAt: '',
  publishedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
  destinations: [
    {
      pageId: `${id}-fb`,
      platform: 'facebook',
      name: '',
      handle: '',
      avatar: '',
      status,
      result: { status, metrics: { reach, likes: reach / 10, comments: 0, shares: 0 } },
    },
  ],
});

const posts = [post('today', 0, 100), post('yesterday', 1, 50), post('old', 10, 999), post('bad', 0, 0, 'failed')];

assert.equal(inLast(posts, 7).length, 3);
assert.equal(inLast(posts, 0).length, 4);
const week = totals(inLast(posts, 7));
assert.deepEqual([week.reach, week.published, week.failed], [150, 2, 1]);
assert.equal(engagementRate(week), 0.1);

const { values } = dailyReach(posts, 7);
assert.equal(values.length, 7);
assert.equal(values[6], 100);
assert.equal(values[5], 50);

assert.equal(delta(150, 0), undefined);
assert.equal(change(0.125), '+12.5%');
assert.equal(change(-0.08), '−8%');
assert.equal(change(2.2), '3.2×');

assert.equal(timing(posts).bestDay, new Date(Date.now() - 10 * DAY).getDay());

console.log('insights ok');
