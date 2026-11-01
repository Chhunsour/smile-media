import type { Post, PostStatus, PublishResult } from '../models';

export type StoredPost = { id: string; data: Post; status: PostStatus; scheduled_at: string | null };
export type PublicationAttempt = {
  post_id: string;
  page_id: string;
  status: 'started' | 'finished';
  result: PublishResult | null;
};

/** Restore DB routing/status fields and durable provider results over a stale client snapshot. */
export function restorePost(row: StoredPost, attempts: PublicationAttempt[]): Post {
  let uncertain = false;
  const destinations = row.data.destinations.map(destination => {
    const attempt = attempts.find(item => item.post_id === row.id && item.page_id === destination.pageId);
    if (attempt?.status === 'started') {
      uncertain = true;
      return {
        ...destination,
        status: 'failed' as const,
        progress: undefined,
        result: {
          status: 'failed' as const,
          error: {
            code: 'PUBLISH_IN_PROGRESS',
            message: 'A publication is in progress or its result is unknown. Check the channel before creating another post.',
            retryable: false,
          },
        },
      };
    }
    return attempt?.status === 'finished' && attempt.result
      ? { ...destination, status: attempt.result.status, progress: undefined, result: attempt.result }
      : destination;
  });
  const confirmed = destinations.length > 0 && destinations.every(destination =>
    attempts.some(attempt => attempt.post_id === row.id && attempt.page_id === destination.pageId &&
      attempt.status === 'finished' && attempt.result?.status === 'published')
  );
  const publishedAt = confirmed
    ? destinations.map(destination => destination.result?.publishedAt).filter((date): date is string => Boolean(date)).sort().at(-1)
    : row.data.publishedAt;
  return {
    ...row.data,
    id: row.id,
    status: confirmed ? 'published' : uncertain || (row.status === 'published' && destinations.some(destination => destination.status === 'failed'))
      ? 'failed' : row.status,
    scheduledAt: row.scheduled_at ?? undefined,
    publishedAt: publishedAt ?? row.data.publishedAt,
    destinations,
  };
}
