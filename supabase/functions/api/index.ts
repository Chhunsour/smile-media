// Single Edge Function for everything that needs secrets: connecting accounts (OAuth / Telegram),
// publishing, AI, and the scheduler (called by pg_cron). Deploy with --no-verify-jwt: it verifies
// the user's JWT itself, and the OAuth callback must be reachable without one.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { authUrl, connectTelegram, exchange, type Platform, publish, refresh, type Token } from './platforms.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const PUBLIC_URL = (Deno.env.get('PUBLIC_API_URL') ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/api`).replace(/\/+$/, '');
const CALLBACK = `${PUBLIC_URL}/callback`;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (message: string, status = 400) => reply({ error: { message } }, status);

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const challengeFor = async (verifier: string) => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));

async function saveConnection(userId: string, platform: Platform, c: Awaited<ReturnType<typeof exchange>>) {
  const accountId = `${platform}:${c.externalId}`;
  const ok = (r: { error: unknown }) => {
    if (r.error) throw new Error((r.error as { message: string }).message);
  };
  ok(await admin.from('social_accounts').upsert({ id: accountId, user_id: userId, platform, name: c.name, avatar: c.avatar ?? null, status: 'active', connected_at: new Date().toISOString() }));
  ok(await admin.from('social_pages').delete().eq('account_id', accountId));
  ok(await admin.from('social_pages').insert(c.pages.map(({ token: _t, ...p }) => ({ ...p, account_id: accountId, user_id: userId, platform }))));
  const tokens = [
    ...(c.token ? [{ id: accountId, user_id: userId, ...c.token }] : []),
    ...c.pages.filter((p) => p.token).map((p) => ({ id: p.id, user_id: userId, ...p.token! })),
  ];
  if (tokens.length) ok(await admin.from('social_tokens').upsert(tokens));
  return accountId;
}

/** Token for a page: page-scoped (Meta) or its account's (refreshed if needed). Telegram uses the bot token. */
async function tokenFor(page: { id: string; account_id: string; platform: Platform }): Promise<string | null> {
  if (page.platform === 'telegram') return null;
  const { data } = await admin.from('social_tokens').select('*').in('id', [page.id, page.account_id]);
  const row = data?.find((t) => t.id === page.id) ?? data?.find((t) => t.id === page.account_id);
  if (!row) throw new Error('This account needs to be reconnected.');
  const fresh = await refresh(page.platform, row as Token);
  if (fresh) await admin.from('social_tokens').update(fresh).eq('id', row.id);
  return (fresh ?? row).access_token;
}

async function publishDestination(userId: string, post: any, pageId: string) {
  const { data: page } = await admin.from('social_pages').select('*').eq('id', pageId).eq('user_id', userId).maybeSingle();
  if (!page) return { status: 'failed' as const, error: { message: 'This page is no longer connected.' } };
  const payload = post.payloads?.[pageId];
  if (!payload) return { status: 'failed' as const, error: { message: 'Post is missing its publish payload. Edit and save it again.' } };
  try {
    return await publish(page.platform, payload, await tokenFor(page), page.handle);
  } catch (e) {
    return { status: 'failed' as const, error: { message: e instanceof Error ? e.message : 'Publishing failed.' } };
  }
}

/** pg_cron calls this every minute: publish everything that's due, server-side. */
async function runScheduler() {
  const { data: due } = await admin.from('posts').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(20);
  for (const row of due ?? []) {
    // Claim the post so overlapping runs don't double-publish.
    const { data: claimed } = await admin.from('posts').update({ status: 'publishing' }).eq('id', row.id).eq('status', 'scheduled').select('id');
    if (!claimed?.length) continue;
    const post = row.data;
    for (const d of post.destinations) {
      if (d.status === 'published') continue;
      d.result = await publishDestination(row.user_id, post, d.pageId);
      d.status = d.result.status;
    }
    post.status = post.destinations.some((d: any) => d.status === 'failed') ? 'failed' : 'published';
    post.publishedAt = post.updatedAt = new Date().toISOString();
    await admin.from('posts').update({ data: post, status: post.status, updated_at: post.updatedAt }).eq('id', row.id);
  }
  return due?.length ?? 0;
}

async function ai(body: any) {
  const key = Deno.env.get('AI_API_KEY');
  if (!key) throw new Error('AI is not configured on the server (set AI_API_KEY).');
  const tasks: Record<string, string> = {
    improve: `Rewrite this social media caption in a ${body.tone} tone${body.tone === 'shorter' ? ' (make it much shorter)' : ''}. Variation #${body.attempt ?? 0}. Reply with the caption only.`,
    translate: `Translate this social media caption into ${({ es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese' } as Record<string, string>)[body.lang] ?? body.lang}. Keep emojis and hashtags. Reply with the translation only.`,
    hashtags: 'Suggest 10 relevant hashtags for this social media caption. Reply with the hashtags only, space separated, each starting with #.',
    shorten: `Shorten this social media caption to at most ${body.limit} characters, keeping its meaning. Reply with the caption only.`,
  };
  const prompt = `${tasks[body.kind]}\n\n${body.text}`;
  const openai = (Deno.env.get('AI_PROVIDER') ?? 'anthropic') === 'openai';
  const res = openai
    ? await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
      })
    : await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: Deno.env.get('AI_MODEL') ?? 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'AI request failed.');
  const text: string = (openai ? data.choices[0].message.content : data.content[0].text).trim();
  return body.kind === 'hashtags' ? { hashtags: text.match(/#[\p{L}\p{N}_]+/gu) ?? [] } : { text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const url = new URL(req.url);

  // OAuth redirect from the platform: exchange the code, store tokens, bounce back into the app.
  if (url.pathname.endsWith('/callback')) {
    const state = url.searchParams.get('state') ?? '';
    const { data: flow } = await admin.from('oauth_states').delete().eq('state', state).select().maybeSingle();
    if (!flow) return new Response('This sign-in link expired. Go back to the app and try again.', { status: 400 });
    const back = (q: Record<string, string>) => Response.redirect(`${flow.redirect_uri}${flow.redirect_uri.includes('?') ? '&' : '?'}${new URLSearchParams(q)}`, 302);
    const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error');
    if (denied) return back({ error: denied });
    try {
      const c = await exchange(flow.platform, url.searchParams.get('code') ?? '', CALLBACK, flow.code_verifier ?? '');
      return back({ account: await saveConnection(flow.user_id, flow.platform, c) });
    } catch (e) {
      return back({ error: e instanceof Error ? e.message : 'Connection failed.' });
    }
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === 'cron') {
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return fail('Forbidden', 403);
    return reply({ processed: await runScheduler() });
  }

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return fail('Not signed in.', 401);

  try {
    switch (body.action) {
      case 'connect': {
        const platform = body.platform as Platform;
        if (platform === 'telegram') {
          if (!body.channel) return fail('Enter the channel’s @username.');
          return reply({ account: await saveConnection(user.id, platform, await connectTelegram(body.channel)) });
        }
        const state = random();
        const verifier = random();
        const url = authUrl(platform, CALLBACK, state, await challengeFor(verifier));
        await admin.from('oauth_states').insert({ state, user_id: user.id, platform, redirect_uri: body.redirectUri, code_verifier: verifier });
        return reply({ authUrl: url });
      }
      case 'disconnect': {
        const { data: pages } = await admin.from('social_pages').select('id').eq('account_id', body.accountId).eq('user_id', user.id);
        await admin.from('social_tokens').delete().eq('user_id', user.id).in('id', [body.accountId, ...(pages ?? []).map((p) => p.id)]);
        await admin.from('social_accounts').delete().eq('id', body.accountId).eq('user_id', user.id);
        return reply({});
      }
      case 'publish': {
        const { data: row } = await admin.from('posts').select('data').eq('id', body.postId).eq('user_id', user.id).maybeSingle();
        if (!row) return fail('Post not found. Save it first.', 404);
        return reply(await publishDestination(user.id, row.data, body.pageId));
      }
      case 'ai':
        return reply(await ai(body));
      default:
        return fail('Unknown action.');
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Server error.', 500);
  }
});
