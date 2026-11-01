import type { Post, PostDestination } from '../models';

/** Only an explicit retryable response permits resending an unsuccessful destination. */
export const canRetryDestination = (destination: PostDestination) =>
  destination.status === 'failed' && destination.result?.error?.retryable === true;

/** A lost client response cannot establish whether a live request reached the platform. */
export function recoverInterrupted(post: Post, demo = false): Post {
  if (post.status !== 'publishing') return post;
  return {
    ...post,
    status: post.destinations.length > 0 && post.destinations.every(destination => destination.status === 'published') ? 'published' : 'failed',
    destinations: post.destinations.map(destination => destination.status === 'publishing' ? {
      ...destination,
      status: 'failed',
      progress: undefined,
      result: {
        status: 'failed',
        error: {
          message: demo ? 'Interrupted — the app closed before this finished.'
            : 'Publication was not confirmed before the app closed. Check the channel before creating another post.',
          code: 'PUBLISH_UNCONFIRMED',
          retryable: demo,
        },
      },
    } : destination),
  };
}
