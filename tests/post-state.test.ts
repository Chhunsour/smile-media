import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePost, type PublicationAttempt, type StoredPost } from '../src/services/post-state';
import { canRetryDestination } from '../src/lib/publishing-state';

const row = (): StoredPost => ({
  id: 'server-id', status: 'failed', scheduled_at: null,
  data: {
    id: 'stale-client-id', caption: 'Test', media: [], options: {}, captions: {}, status: 'scheduled', scheduledAt: '2026-10-30T00:00:00Z',
    createdAt: '', updatedAt: '', destinations: [
      { pageId: '42', platform: 'facebook', name: 'Page', handle: '', avatar: '', status: 'failed',
        result: { status: 'failed', error: { message: 'Client lost the response', retryable: true } } },
    ],
  },
});
const confirmed = (page_id = '42'): PublicationAttempt => ({
  post_id: 'server-id', page_id, status: 'finished',
  result: { status: 'published', remoteId: '42_99', publishedAt: '2026-11-01T10:00:00Z' },
});
test('a lost client response cannot hide a durable confirmed publication', () => {
  const stored = row();
  const restored = restorePost(stored, [confirmed()]);
  assert.equal(restored.id, 'server-id');
  assert.equal(restored.status, 'published');
  assert.equal(restored.publishedAt, '2026-11-01T10:00:00Z');
  assert.equal(restored.destinations[0].result?.remoteId, '42_99');
  assert.equal(canRetryDestination(restored.destinations[0]), false);
  assert.equal(stored.data.destinations[0].status, 'failed');
});
test('cancelled schedules restore canonical DB status and cleared time over stale JSON', () => {
  const restored = restorePost(row(), []);
  assert.equal(restored.status, 'failed');
  assert.equal(restored.scheduledAt, undefined);
});
test('started publication claims override a stale retryable client error', () => {
  const restored = restorePost(row(), [{ ...confirmed(), status: 'started', result: null }]);
  assert.equal(restored.status, 'failed');
  assert.equal(restored.destinations[0].result?.error?.code, 'PUBLISH_IN_PROGRESS');
  assert.equal(canRetryDestination(restored.destinations[0]), false);
});
test('partial or unrelated confirmations cannot make the whole post appear published', () => {
  const stored = row();
  stored.data.destinations.push({ ...stored.data.destinations[0], pageId: '43' });
  const restored = restorePost(stored, [confirmed(), { ...confirmed('43'), post_id: 'another-post' }]);
  assert.equal(restored.status, 'failed');
  assert.equal(restored.destinations[0].status, 'published');
  assert.equal(restored.destinations[1].status, 'failed');
  assert.equal(restorePost({ ...stored, status: 'published' }, [confirmed()]).status, 'failed');
});
test('a legacy client-written success without a matching ledger is not promoted to whole-post success', () => {
  const stored = row();
  stored.data.destinations[0].status = 'published';
  assert.equal(restorePost(stored, []).status, 'failed');
});
