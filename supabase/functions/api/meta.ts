import type { Connected, Page, Token } from './platforms.ts';
import { hex, hmac, SafeError } from './security.ts';

// Keep the existing app's pinned version. Upgrade only after format contract testing.
export const GRAPH_VERSION = 'v23.0';
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const env = (key: string) => {
  const v = Deno.env.get(key);
  if (!v) throw new Error('Missing Meta configuration');
  return v;
};
export async function metaJson(res: Response) {
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) {
    const e = d.error ?? {};
    const reconnect = [10, 102, 190, 200, 294].includes(e.code);
    const transient = [4, 17, 32, 613].includes(e.code) || e.is_transient === true || res.status === 429;
    throw new SafeError(
      reconnect
        ? 'Facebook authorization changed or expired. Reconnect Facebook.'
        : transient
        ? 'Facebook is temporarily limiting requests. Try again later.'
        : 'Facebook could not complete this request.',
      `META_${Number(e.code) || res.status}${e.error_subcode ? `_${Number(e.error_subcode)}` : ''}`,
      400,
      transient,
      reconnect,
    );
  }
  return d;
}
export async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  url.search = new URLSearchParams({ ...params, appsecret_proof: hex(await hmac(env('META_APP_SECRET'), token)) }).toString();
  return metaJson(
    await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000) }),
  );
}
export async function metaPost(path: string, token: string, body: Record<string, unknown>) {
  return metaJson(
    await fetch(`${GRAPH}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, appsecret_proof: hex(await hmac(env('META_APP_SECRET'), token)) }),
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    }),
  );
}
const required = (instagram: boolean) =>
  instagram
    ? ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement']
    : ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'];
export async function debugUser(token: string, instagram = false, expectedUser?: string) {
  const d = (await metaGet('debug_token', `${env('META_APP_ID')}|${env('META_APP_SECRET')}`, { input_token: token })).data;
  const now = Date.now() / 1000;
  if (
    !d?.is_valid || String(d.app_id) !== env('META_APP_ID') || !/^\d+$/.test(d.user_id) || (expectedUser && d.user_id !== expectedUser) ||
    [d.expires_at, d.data_access_expires_at].some((t) => t && t <= now) || required(instagram).some((s) => !d.scopes?.includes(s))
  ) throw new SafeError('Facebook authorization changed or expired. Reconnect Facebook.', 'META_RECONNECT', 400, false, true);
  return d;
}
export async function discoverPages(token: string, instagram = false): Promise<Page[]> {
  const pages: Page[] = [];
  const seen = new Set<string>();
  let after = '';
  // Never follow provider-supplied next URLs with a token. Rebuild only this known Graph endpoint.
  for (let count = 0; count < 100; count++) {
    const fields = `id,name,access_token,tasks,picture{url}${
      instagram ? ',instagram_business_account{id,username,name,profile_picture_url,followers_count}' : ''
    }`;
    const d = await metaGet('me/accounts', token, { fields, limit: '100', ...(after ? { after } : {}) });
    if (!Array.isArray(d.data)) throw new SafeError('Facebook returned an invalid Page list.');
    for (const p of d.data) {
      if (!/^\d+$/.test(p.id) || !p.access_token || !p.tasks?.includes('CREATE_CONTENT')) continue;
      const ig = instagram ? p.instagram_business_account : null;
      if (instagram && !ig) continue;
      const id = ig?.id ?? p.id;
      pages.push({
        id: `${instagram ? 'instagram' : 'facebook'}:${id}`,
        external_id: id,
        name: ig?.name ?? p.name,
        handle: ig?.username ?? p.id,
        avatar: ig?.profile_picture_url ?? p.picture?.data?.url ?? '',
        followers: ig?.followers_count ?? 0,
        kind: instagram ? 'profile' : 'page',
        token: { access_token: p.access_token },
      });
    }
    if (!d.paging?.next) return [...new Map(pages.map((p) => [p.external_id, p])).values()];
    after = d.paging?.cursors?.after;
    if (!after || seen.has(after)) throw new SafeError('Facebook Page pagination could not be completed.');
    seen.add(after);
  }
  throw new SafeError('Too many Pages to connect safely. Contact support.');
}
export async function exchangeMeta(platform: 'facebook' | 'instagram', code: string, redirect: string): Promise<Connected> {
  const tokenRequest = async (fields: Record<string, string>) =>
    metaJson(
      await fetch(`${GRAPH}/oauth/access_token`, {
        method: 'POST',
        body: new URLSearchParams({ client_id: env('META_APP_ID'), client_secret: env('META_APP_SECRET'), ...fields }),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      }),
    );
  const short = await tokenRequest({ redirect_uri: redirect, code });
  const long = await tokenRequest({ grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token });
  const debug = await debugUser(long.access_token, platform === 'instagram');
  const me = await metaGet('me', long.access_token, { fields: 'id,name,picture{url}' });
  if (me.id !== debug.user_id) throw new SafeError('Facebook account validation failed.');
  const pages = await discoverPages(long.access_token, platform === 'instagram');
  if (!pages.length) {
    throw new SafeError(
      'No eligible Pages with content creation access were granted. Check Page access and reconnect.',
      'NO_ELIGIBLE_PAGES',
    );
  }
  const expiry = [debug.expires_at, debug.data_access_expires_at, long.expires_in ? Math.floor(Date.now() / 1000) + long.expires_in : 0]
    .filter(Boolean);
  const expires_at = expiry.length ? new Date(Math.min(...expiry) * 1000).toISOString() : null;
  for (const p of pages) p.token!.expires_at = expires_at;
  return { externalId: me.id, name: me.name, avatar: me.picture?.data?.url, token: { access_token: long.access_token, expires_at }, pages };
}
export async function authorizedPageToken(userToken: Token, externalUser: string, externalPage: string, instagram = false) {
  await debugUser(userToken.access_token, instagram, externalUser);
  const page = (await discoverPages(userToken.access_token, instagram)).find((p) => p.external_id === externalPage);
  if (!page?.token) throw new SafeError('Page access was removed. Reconnect Facebook.', 'META_PAGE_REVOKED', 400, false, true);
  return page.token.access_token;
}
