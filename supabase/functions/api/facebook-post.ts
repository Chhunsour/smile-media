import { GRAPH, metaGet, metaJson } from './meta.ts';
import { hex, hmac, SafeError } from './security.ts';

// Only app-created Page feed IDs from our durable publication ledger are accepted.
export function facebookPostId(remoteId: unknown, pageId: string): string {
  if (typeof remoteId !== 'string' || !/^\d+_\d+$/.test(remoteId) || remoteId.split('_')[0] !== pageId) {
    throw new SafeError('This publication does not have a supported Facebook Page post ID.', 'UNSUPPORTED_POST', 400);
  }
  return remoteId;
}

export async function readFacebookPost(id: string, token: string) {
  const data = await metaGet(id, token, { fields: 'id,message,created_time,permalink_url' });
  if (data.id !== id) throw new SafeError('Facebook did not confirm the requested post.', 'META_POST_UNCONFIRMED', 409);
  let url: string | undefined;
  try {
    const parsed = new URL(data.permalink_url);
    if (parsed.protocol === 'https:' && ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(parsed.hostname)) url = parsed.href;
  } catch { /* A missing/untrusted permalink is omitted; never open arbitrary provider URLs. */ }
  return { id, message: typeof data.message === 'string' ? data.message : '',
    createdAt: typeof data.created_time === 'string' ? data.created_time : undefined, url };
}

export async function changeFacebookPost(id: string, token: string, operation: 'edit' | 'delete', message: string) {
  const secret = Deno.env.get('META_APP_SECRET');
  if (!secret) throw new Error('Missing Meta configuration');
  const proof = hex(await hmac(secret, token));
  const url = new URL(`${GRAPH}/${id}`);
  if (operation === 'delete') url.searchParams.set('appsecret_proof', proof);
  const raw = await fetch(url, { method: operation === 'edit' ? 'POST' : 'DELETE',
    headers: { Authorization: `Bearer ${token}`, ...(operation === 'edit' ? { 'Content-Type': 'application/json' } : {}) },
    ...(operation === 'edit' ? { body: JSON.stringify({ message, appsecret_proof: proof }) } : {}),
    redirect: 'error', signal: AbortSignal.timeout(30_000) });
  // A server/limit response does not establish that the mutation was rejected.
  if (raw.status >= 500 || raw.status === 429) throw new SafeError('Facebook did not confirm the change.', 'META_POST_UNCONFIRMED', 409);
  const response = await metaJson(raw);
  if (response.success !== true) throw new SafeError('Facebook did not confirm this change. Check the Page before doing anything else.', 'META_POST_UNCONFIRMED', 409);
  return { success: true, operation, remoteId: id, completedAt: new Date().toISOString() };
}
