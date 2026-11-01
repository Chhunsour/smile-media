import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRetryDestination, recoverInterrupted } from '../src/lib/publishing-state.ts';
import type { Post, PostDestination } from '../src/models';

const destination = (status: PostDestination['status'], retryable?: boolean): PostDestination => ({
  pageId: '42', platform: 'facebook', name: 'Controlled Page', handle: 'page', avatar: '', status,
  result: retryable === undefined ? undefined : { status: 'failed', error: { message: 'Result', retryable } },
});
test('retry excludes unknown, authorization and confirmed outcomes, including mixed destination results', () => {
  const destinations = [destination('failed'), destination('failed', false), destination('failed', true),
    destination('published', true), destination('publishing', true), destination('pending', true)];
  assert.deepEqual(destinations.filter(canRetryDestination), [destinations[2]]);
});
test('app interruption never turns an unknown live publication into permission to resend', () => {
  const post: Post = {
    id: 'post', caption: 'Test', media: [], captions: {}, options: {}, status: 'publishing',
    createdAt: '', updatedAt: '', destinations: [destination('publishing'), destination('published'), destination('failed', true)],
  };
  const recovered = recoverInterrupted(post);
  assert.equal(recovered.status, 'failed');
  assert.equal(recovered.destinations[0].result?.error?.code, 'PUBLISH_UNCONFIRMED');
  assert.equal(canRetryDestination(recovered.destinations[0]), false);
  assert.equal(recovered.destinations[1], post.destinations[1]);
  assert.equal(canRetryDestination(recovered.destinations[2]), true);
  assert.equal(post.destinations[0].status, 'publishing');
  assert.equal(canRetryDestination(recoverInterrupted(post, true).destinations[0]), true);
  assert.equal(recoverInterrupted({ ...post, destinations: [destination('published')] }).status, 'published');
});
