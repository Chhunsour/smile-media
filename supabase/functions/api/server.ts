import type { SupabaseClient } from '@supabase/supabase-js';
import { authUrl, type Connected, exchange, type Platform, publish, refresh, type Token } from './platforms.ts';
import { authorizedPageToken } from './meta.ts';
import {
  accountKey,
  authorizedPayload,
  equal,
  hash,
  hex,
  hmac,
  mediaPath,
  open,
  pageKey,
  publicError,
  random,
  returnUrl,
  SafeError,
  seal,
  signedRequest,
  validFlow,
  validPlatform,
} from './security.ts';

// The client is injected so route tests execute the same production handler.
// Supabase's generated DB types should replace this boundary after the live schema is reconciled.
type DbPage = {
  id: string;
  account_id: string;
  user_id: string;
  organization_id: string;
  external_id: string;
  platform: Platform;
  handle: string;
};
type TokenRow = { id: string; sealed: string };
export function createHandler(admin: SupabaseClient) {
  const env = (k: string) => {
    const v = Deno.env.get(k);
    if (!v) throw new Error('Missing server configuration');
    return v;
  };
  const publicUrl = () => (Deno.env.get('PUBLIC_API_URL') ?? `${env('SUPABASE_URL')}/functions/v1/api`).replace(/\/+$/, '');
  const allowed = () => env('OAUTH_REDIRECT_ALLOWLIST');
  const must = <T extends { data: unknown; error: unknown }>(r: T): T['data'] => {
    if (r.error) throw new Error('Database operation failed');
    return r.data;
  };
  const rpc = async (name: string, args: Record<string, unknown>) => must(await admin.rpc(name, args));
  const canPublish = (user: string) => Deno.env.get('PUBLISH_MODE') === 'public' ||
    (Deno.env.get('PUBLISH_MODE') === 'controlled' &&
      (Deno.env.get('PUBLISH_USER_ALLOWLIST') ?? '').split(',').map(value => value.trim()).includes(user));
  const requirePublishing = (user: string) => {
    if (!canPublish(user)) {
      const controlled = Deno.env.get('PUBLISH_MODE') === 'controlled';
      throw new SafeError(controlled ? 'Publishing is limited to approved test accounts.' : 'Publishing is temporarily disabled.',
        controlled ? 'TEST_ACCOUNT_REQUIRED' : 'PUBLISHING_DISABLED', controlled ? 403 : 409);
    }
  };

  async function saveConnection(user: string, platform: Platform, c: Connected, version: number) {
    const id = accountKey(user, platform, c.externalId);
    const tokens = [];
    for (
      const [key, token] of [[id, c.token], ...c.pages.map((p) => [pageKey(id, p.external_id), p.token])] as [string, Token | undefined][]
    ) {
      if (token) {
        tokens.push({
          id: key,
          sealed: await seal(token, env('TOKEN_ENCRYPTION_KEY'), `${user}:${key}`),
          expires_at: token.expires_at ?? null,
        });
      }
    }
    return rpc('save_connection', {
      p_user: user,
      p_platform: platform,
      p_external: c.externalId,
      p_version: version,
      p_connection: { name: c.name, avatar: c.avatar ?? null, pages: c.pages.map(({ token: _token, ...p }) => p), tokens },
    });
  }
  async function tokenFor(page: DbPage, account: { external_id: string }): Promise<string | null> {
    if (page.platform === 'telegram') return null;
    const rows = must(
      await admin.from('social_tokens').select('*').eq('user_id', page.user_id).eq('organization_id', page.user_id).eq(
        'account_id',
        page.account_id,
      ).in('id', [page.id, page.account_id]),
    ) ?? [];
    const read = async (id: string) => {
      const row = rows.find((t: TokenRow) => t.id === id);
      if (!row) throw new SafeError('Reconnect this account to publish.', 'RECONNECT_REQUIRED', 400, false, true);
      return { row, token: await open<Token>(row.sealed, env('TOKEN_ENCRYPTION_KEY'), `${page.user_id}:${row.id}`) };
    };
    if (page.platform === 'facebook' || page.platform === 'instagram') {
      const { token } = await read(page.account_id);
      if (token.expires_at && Date.parse(token.expires_at) <= Date.now()) {
        throw new SafeError('Facebook access has expired. Reconnect Facebook.', 'TOKEN_EXPIRED', 400, false, true);
      }
      return authorizedPageToken(token, account.external_id, page.external_id, page.platform === 'instagram');
    }
    const { row, token } = await read(rows.some((t: TokenRow) => t.id === page.id) ? page.id : page.account_id);
    const fresh = await refresh(page.platform, token);
    if (fresh) {
      must(
        await admin.from('social_tokens').update({
          sealed: await seal(fresh, env('TOKEN_ENCRYPTION_KEY'), `${page.user_id}:${row.id}`),
          expires_at: fresh.expires_at,
        }).eq('id', row.id).eq('user_id', page.user_id),
      );
    }
    return (fresh ?? token).access_token;
  }
  async function publishDestination(user: string, postId: string, pageId: string) {
    requirePublishing(user);
    const claim = await rpc('claim_publish', { p_user: user, p_post: postId, p_page: pageId });
    if ('cached' in claim) return claim.cached;
    if (claim.busy) {
      return {
        status: 'failed',
        error: {
          message: 'A previous request is in progress or its result is unknown. Check the Page before trying again.',
          code: 'PUBLISH_IN_PROGRESS',
          retryable: false,
        },
      };
    }
    let result;
    let page: DbPage | null = null;
    try {
      page = must(
        await admin.from('social_pages').select('*').eq('id', pageId).eq('user_id', user).eq('organization_id', user).maybeSingle(),
      );
      const account = page &&
        must(
          await admin.from('social_accounts').select('*').eq('id', page.account_id).eq('user_id', user).eq('organization_id', user).eq(
            'status',
            'active',
          ).maybeSingle(),
        );
      if (!page || !account) {
        throw new SafeError('This Page is disconnected. Reconnect to publish.', 'RECONNECT_REQUIRED', 400, false, true);
      }
      const payload = claim.post.payloads?.[pageId];
      if (!payload) throw new SafeError('Edit and save the post before publishing.');
      const safePayload = authorizedPayload(page, payload, user, env('SUPABASE_URL'));
      // URLs stored by clients are descriptors only. Mint a fresh URL for private owned media;
      // schedules remain usable after old preview URLs expire.
      const renewMedia = async (v: unknown): Promise<unknown> => {
        if (typeof v === 'string' && v.startsWith(`${env('SUPABASE_URL')}/storage/v1/object/`)) {
          const path = mediaPath(v, user, env('SUPABASE_URL'));
          const signed = must(await admin.storage.from('media').createSignedUrl(path, 3600));
          if (!signed) throw new Error('Media signing failed');
          return signed.signedUrl;
        }
        if (Array.isArray(v)) return Promise.all(v.map(renewMedia));
        if (v && typeof v === 'object') {
          return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([k, x]) => [k, await renewMedia(x)])));
        }
        return v;
      };
      const prepared = await renewMedia(safePayload);
      const token = await tokenFor(page, account);
      // Check again after provider validation: disconnect/deauthorization may have happened meanwhile.
      const active = must(
        await admin.from('social_accounts').select('id').eq('id', page.account_id).eq('user_id', user).eq('status', 'active').maybeSingle(),
      );
      if (!active) throw new SafeError('This account was disconnected.');
      requirePublishing(user);
      result = await publish(page.platform, prepared as Record<string, unknown>, token, page.handle);
    } catch (e) {
      result = { status: 'failed', error: publicError(e) };
    }
    if (result.error?.reconnect && page) {
      must(await admin.from('social_accounts').update({ status: 'expired' }).eq('id', page.account_id).eq('user_id', user));
      must(await admin.from('social_tokens').delete().eq('account_id', page.account_id).eq('user_id', user));
    }
    // A failed result write never replays the external call: the durable claim remains started.
    await rpc('finish_publish', { p_user: user, p_post: postId, p_page: pageId, p_result: result });
    return result;
  }
  async function deleteUserData(user: string, codeHash: string) {
    await rpc('begin_user_deletion', { p_user: user });
    // Storage's API removes both the object and metadata. SQL DELETE on storage.objects does not.
    for (;;) {
      const files = must(await admin.storage.from('media').list(user, { limit: 100 })) ?? [];
      if (!files.length) break;
      if (files.some((f) => !f.id || f.name.includes('/'))) throw new Error('Unexpected media layout');
      must(await admin.storage.from('media').remove(files.map((f) => `${user}/${f.name}`)));
    }
    const deleted = await admin.auth.admin.deleteUser(user);
    // The Auth delete may have succeeded before a response/receipt failure. Only the
    // documented not-found code is an idempotent success; other failures stay queued.
    if (deleted.error && deleted.error.code !== 'user_not_found') throw new Error('Account deletion failed');
    must(await admin.from('deletion_receipts').upsert({ code_hash: codeHash }));
    must(await admin.from('deletion_jobs').delete().eq('user_id', user).eq('code_hash', codeHash));
  }
  async function scheduler() {
    must(await admin.from('oauth_states').delete().lte('created_at', new Date(Date.now() - 600_000).toISOString()));
    must(await admin.from('deletion_receipts').delete().lte('completed_at', new Date(Date.now() - 30 * 86400_000).toISOString()));
    const jobs = must(await admin.from('deletion_jobs').select('*').limit(20)) ?? [];
    for (const job of jobs) {
      try {
        await deleteUserData(job.user_id, job.code_hash);
      } catch { /* Leave the job pending for the next cron; never log credentials. */ }
    }
    // Deletion cleanup continues even when a rollout has not enabled publishing.
    if (!['controlled', 'public'].includes(Deno.env.get('PUBLISH_MODE') ?? '')) return 0;
    const due = must(
      await admin.from('posts').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(20),
    ) ?? [];
    for (const row of due) {
      if (!canPublish(row.user_id)) continue;
      const claimed = must(
        await admin.from('posts').update({ status: 'publishing' }).eq('id', row.id).eq('user_id', row.user_id).eq('status', 'scheduled')
          .select('id'),
      ) ?? [];
      if (!claimed.length) continue;
      if (
        !Array.isArray(row.data?.destinations) || !row.data.destinations.length ||
        row.data.destinations.some((d: { pageId: string; status: string }) => !d || typeof d.pageId !== 'string' || !d.pageId) ||
        new Set(row.data.destinations.map((d: { pageId: string }) => d.pageId)).size !== row.data.destinations.length
      ) {
        must(await admin.from('posts').update({
          status: 'failed', scheduled_at: null, data: { ...row.data, status: 'failed', scheduledAt: null },
        }).eq('id', row.id).eq('user_id', row.user_id));
        continue;
      }
      for (const d of row.data.destinations) {
        if (d.status === 'published') continue;
        try {
          await publishDestination(row.user_id, row.id, d.pageId);
        } catch { /* No external request follows a failed claim. */ }
      }
      const latest = must(await admin.from('posts').select('data').eq('id', row.id).eq('user_id', row.user_id).maybeSingle());
      if (!latest) continue;
      const status = latest.data.destinations?.every((d: { pageId: string; status: string }) => d.status === 'published')
        ? 'published'
        : 'failed';
      must(
        await admin.from('posts').update({ status, data: { ...latest.data, status }, updated_at: new Date().toISOString() }).eq(
          'id',
          row.id,
        ).eq('user_id', row.user_id),
      );
    }
    return due.length;
  }
  async function ai(body: { kind: string; text: string; tone: string; lang: string; limit: number }) {
    if (!['improve', 'translate', 'hashtags', 'shorten'].includes(body.kind) || typeof body.text !== 'string' || body.text.length > 10000) {
      throw new SafeError('Invalid AI request.');
    }
    const key = env('AI_API_KEY');
    const tasks: Record<string, string> = {
      improve: `Rewrite in a ${
        ['friendly', 'professional', 'playful', 'bold', 'shorter'].includes(body.tone) ? body.tone : 'friendly'
      } tone.`,
      translate: `Translate into ${
        ({ es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese' } as Record<string, string>)[body.lang] ?? 'English'
      }.`,
      hashtags: 'Suggest 10 relevant hashtags, space separated.',
      shorten: `Shorten to ${Math.max(1, Math.min(Number(body.limit) || 280, 63206))} characters.`,
    };
    const prompt = `${tasks[body.kind]} Reply with the result only.\n\n${body.text}`;
    const openai = Deno.env.get('AI_PROVIDER') === 'openai';
    const res = await fetch(openai ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: openai
        ? { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
        : { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify(
        openai ? { model: Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] } : {
          model: Deno.env.get('AI_MODEL') ?? 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
      ),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new SafeError('AI assistance is temporarily unavailable.');
    const d = await res.json();
    const text = String(openai ? d.choices[0].message.content : d.content[0].text).trim();
    return body.kind === 'hashtags' ? { hashtags: text.match(/#[\p{L}\p{N}_]+/gu) ?? [] } : { text };
  }
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');
    const cors: Record<string, string> = origin && (Deno.env.get('WEB_ORIGIN_ALLOWLIST') ?? '').split(',').includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {};
    const headers: Record<string, string> = {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    try {
      const url = new URL(req.url);
      const route = url.pathname.replace(/\/+$/, '').split('/').pop();
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      // Allows the updated function to be staged against the legacy schema without
      // touching credentials, callbacks or queued publications during migration.
      if (Deno.env.get('MAINTENANCE_MODE') === 'true') {
        return reply({ error: { message: 'MultiPostly is temporarily unavailable. Please try again later.', code: 'MAINTENANCE', retryable: true } }, 503);
      }
      if (route === 'deletion-status') {
        if (req.method !== 'GET') throw new SafeError('Method not allowed.', 'METHOD_NOT_ALLOWED', 405);
        const code = url.searchParams.get('code') ?? '';
        if (!/^[a-f0-9]{64}$/.test(code)) throw new SafeError('Invalid confirmation code.');
        const row = must(await admin.from('deletion_receipts').select('completed_at').eq('code_hash', await hash(code)).maybeSingle());
        const pending = must(await admin.from('deletion_jobs').select('user_id').eq('code_hash', await hash(code))) ?? [];
        const completed = Boolean(row) && !pending.length;
        const known = Boolean(row) || pending.length > 0;
        const status = completed ? 'completed' : known ? 'pending' : 'not_found';
        if (req.headers.get('accept')?.includes('text/html')) {
          const title = completed ? 'Deletion completed' : known ? 'Deletion in progress' : 'Confirmation code not found';
          const description = completed
            ? 'Your MultiPostly account data and uploaded media have been removed. Posts already published to social networks remain on those networks.'
            : known ? 'Your deletion request is recorded. Cleanup is still in progress. You can return to this page to check again.'
            : 'This confirmation code was not found or its status record has expired. This page cannot confirm a deletion for this code.';
          return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MultiPostly — ${title}</title><style>body{font:18px/1.6 system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.5rem;color:#222}code{overflow-wrap:anywhere;font-size:.8em}h1{line-height:1.2}</style><main><p>MultiPostly data deletion</p><h1>${title}</h1><p>${description}</p><p>Confirmation code: <code>${code}</code></p></main></html>`, {
            status: known ? 200 : 404,
            headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" },
          });
        }
        return reply({ status, ...(completed ? { completedAt: row?.completed_at } : {}) }, known ? 200 : 404);
      }
      if (route === 'deauthorize' || route === 'data-deletion') {
        if (req.method !== 'POST') throw new SafeError('Method not allowed.', 'METHOD_NOT_ALLOWED', 405);
        const raw = await req.text();
        if (raw.length > 12000) throw new SafeError('Request too large.');
        const subject = await signedRequest(new URLSearchParams(raw).get('signed_request') ?? '', env('META_APP_SECRET'));
        const code = hex(await hmac(env('META_APP_SECRET'), `deletion:${subject.user_id}`));
        const codeHash = await hash(code);
        const accounts = must(
          await admin.from('social_accounts').select('id,user_id').in('platform', ['facebook', 'instagram']).eq(
            'external_id',
            subject.user_id,
          ),
        ) ?? [];
        if (route === 'deauthorize') {
          for (const a of accounts) await rpc('disconnect_connection', { p_user: a.user_id, p_account: a.id });
          return reply({ success: true });
        }
        const users = [...new Set(accounts.map((a: { user_id: string }) => a.user_id))];
        for (const user of users) {
          must(await admin.from('deletion_jobs').upsert({ user_id: user, code_hash: codeHash }));
          try {
            await deleteUserData(user as string, codeHash);
          } catch { /* Durable worker retries incomplete deletion. */ }
        }
        if (!users.length) {
          const pending = must(await admin.from('deletion_jobs').select('user_id').eq('code_hash', codeHash)) ?? [];
          if (!pending.length) must(await admin.from('deletion_receipts').upsert({ code_hash: codeHash }));
        }
        return reply({ url: `${publicUrl()}/deletion-status?code=${code}`, confirmation_code: code });
      }
      if (route === 'callback') {
        if (req.method !== 'GET') throw new SafeError('Method not allowed.', 'METHOD_NOT_ALLOWED', 405);
        const state = url.searchParams.get('state') ?? '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(state)) throw new SafeError('Invalid OAuth state.');
        const flow = must(await admin.from('oauth_states').delete().eq('state', await hash(state)).select().maybeSingle());
        validFlow(flow, allowed());
        const back = (params: Record<string, string>) =>
          new Response(null, {
            status: 302,
            headers: { ...headers, Location: `${flow.redirect_uri}?${new URLSearchParams({ ...params, state })}` },
          });
        if (url.searchParams.has('error')) return back({ error: 'Authorization was declined. Start again when ready.' });
        const code = url.searchParams.get('code');
        if (!code || code.length > 4096) return back({ error: 'Authorization code is missing or invalid.' });
        try {
          // State is tied to the initiating session; signing out cancels the connection attempt.
          if (!await rpc('session_active', { p_user: flow.user_id, p_session: flow.session_id })) {
            throw new SafeError('Sign in again before connecting.');
          }
          const c = await exchange(flow.platform, code, `${publicUrl()}/callback`, flow.code_verifier ?? '');
          return back({ account: await saveConnection(flow.user_id, flow.platform, c, flow.connection_version) });
        } catch (e) {
          return back({ error: publicError(e).message });
        }
      }
      if (req.method !== 'POST') throw new SafeError('Method not allowed.', 'METHOD_NOT_ALLOWED', 405);
      if (origin && !('Access-Control-Allow-Origin' in cors)) throw new SafeError('Origin not allowed.', 'FORBIDDEN', 403);
      const raw = await req.text();
      if (raw.length > 64_000) throw new SafeError('Request too large.', 'REQUEST_TOO_LARGE', 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new SafeError('Invalid JSON.');
      }
      if (!body || Array.isArray(body) || typeof body !== 'object') throw new SafeError('Invalid request.');
      if (body.action === 'cron') {
        const secret = Deno.env.get('CRON_SECRET');
        if (!secret || !equal(req.headers.get('x-cron-secret') ?? '', secret)) throw new SafeError('Forbidden.', 'FORBIDDEN', 403);
        return reply({ processed: await scheduler() });
      }
      const jwt = req.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      if (!jwt) throw new SafeError('Not signed in.', 'UNAUTHORIZED', 401);
      const { data: auth, error } = await admin.auth.getUser(jwt);
      if (error || !auth?.user || auth.user.is_anonymous) throw new SafeError('Not signed in.', 'UNAUTHORIZED', 401);
      const user = auth.user.id;
      let claims;
      try {
        claims = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      } catch {
        throw new SafeError('Invalid session.', 'UNAUTHORIZED', 401);
      }
      if (!await rpc('session_active', { p_user: user, p_session: claims.session_id ?? '' })) {
        throw new SafeError('Sign in again.', 'SESSION_REVOKED', 401);
      }
      switch (body.action) {
        case 'capabilities': return reply({ schemaVersion: '2026-11-01.security.2', publishingProvider: 'meta-graph-direct' });
        case 'connect': {
          validPlatform(body.platform);
          if (body.platform === 'telegram') {
            throw new SafeError('Telegram connection requires channel-owner verification before live use.', 'OWNER_VERIFICATION_REQUIRED');
          }
          const redirect = returnUrl(body.redirectUri, allowed());
          const workspace = must(await admin.from('organizations').select('connection_version').eq('id', user).maybeSingle());
          if (!workspace) throw new SafeError('Workspace unavailable.');
          const state = random(), verifier = random();
          const authorization = authUrl(body.platform, `${publicUrl()}/callback`, state, await hash(verifier));
          must(
            await admin.from('oauth_states').insert({
              state: await hash(state),
              user_id: user,
              platform: body.platform,
              redirect_uri: redirect,
              code_verifier: verifier,
              session_id: claims.session_id,
              connection_version: workspace.connection_version,
            }),
          );
          return reply({ authUrl: authorization, state });
        }
        case 'disconnect':
          await rpc('disconnect_connection', { p_user: user, p_account: String(body.accountId) });
          return reply({});
        case 'publish': {
          if (typeof body.postId !== 'string' || typeof body.pageId !== 'string') throw new SafeError('Invalid destination.');
          const post = must(await admin.from('posts').select('id').eq('id', body.postId).eq('user_id', user).maybeSingle());
          const page = must(await admin.from('social_pages').select('id').eq('id', body.pageId).eq('user_id', user).maybeSingle());
          if (!post || !page) throw new SafeError('Post or Page not found.', 'NOT_FOUND', 404);
          return reply(await publishDestination(user, body.postId, body.pageId));
        }
        case 'delete-user': {
          if (body.confirm !== 'DELETE') throw new SafeError('Confirm account deletion.');
          const code = hex(crypto.getRandomValues(new Uint8Array(32))), codeHash = await hash(code);
          must(await admin.from('deletion_jobs').upsert({ user_id: user, code_hash: codeHash }));
          try {
            await deleteUserData(user, codeHash);
            return reply({ deleted: true });
          } catch {
            return reply({ deleted: false, pending: true, statusUrl: `${publicUrl()}/deletion-status?code=${code}` }, 202);
          }
        }
        case 'ai':
          return reply(await ai(body));
        default:
          throw new SafeError('Unknown action.');
      }
    } catch (e) {
      return reply({ error: publicError(e) }, e instanceof SafeError ? e.status : 500);
    }
  };
}
