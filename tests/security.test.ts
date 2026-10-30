import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountKey,
  authorizedPayload,
  b64url,
  hash,
  hmac,
  open,
  pageKey,
  publicError,
  returnUrl,
  SafeError,
  seal,
  signedRequest,
  validFlow,
} from '../supabase/functions/api/security.ts';
import { authorizedPageToken, debugUser, discoverPages, metaJson } from '../supabase/functions/api/meta.ts';
import { createHandler } from '../supabase/functions/api/server.ts';
import { authUrl, publish, refresh } from '../supabase/functions/api/platforms.ts';

const env: Record<string, string> = {
  SUPABASE_URL: 'https://test.supabase.co',
  META_APP_ID: '123',
  META_APP_SECRET: 'test-secret',
  OAUTH_REDIRECT_ALLOWLIST: 'outpost://oauth/callback,multipostly://oauth/callback',
};
(globalThis as any).Deno = { env: { get: (k: string) => env[k] } };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
const graphMock = async (fn: (url: URL, init?: RequestInit) => Response | Promise<Response>, task: () => Promise<void>) => {
  const old = globalThis.fetch;
  globalThis.fetch = async (input, init) => fn(new URL(String(input)), init);
  try {
    await task();
  } finally {
    globalThis.fetch = old;
  }
};

test('owner-scoped IDs separate the same Facebook account and Page', () => {
  assert.notEqual(accountKey('alice', 'facebook', '7'), accountKey('bob', 'facebook', '7'));
  assert.notEqual(pageKey(accountKey('alice', 'facebook', '7'), '42'), pageKey(accountKey('bob', 'facebook', '7'), '42'));
});
test('tokens use authenticated encryption bound to their user and record', async () => {
  const key = b64url(new Uint8Array(32).fill(9));
  const ciphertext = await seal({ access_token: 'sensitive-token', refresh_token: 'sensitive-refresh' }, key, 'alice:page');
  assert(!ciphertext.includes('sensitive'));
  assert.equal((await open<any>(ciphertext, key, 'alice:page')).access_token, 'sensitive-token');
  await assert.rejects(open(ciphertext, key, 'bob:page'));
  await assert.rejects(open(ciphertext.slice(0, -4) + 'AAAA', key, 'alice:page'));
});
test('OAuth validates exact redirects, platform and state lifetime', () => {
  for (const redirect of ['https://attacker.test', 'outpost://oauth/callback?evil=1', 'outpost://oauth/other', 'javascript:alert(1)']) {
    assert.throws(() => returnUrl(redirect, env.OAUTH_REDIRECT_ALLOWLIST));
  }
  const f = { platform: 'facebook', redirect_uri: 'outpost://oauth/callback', created_at: new Date().toISOString() };
  validFlow(f, env.OAUTH_REDIRECT_ALLOWLIST);
  assert.throws(() => validFlow({ ...f, created_at: new Date(Date.now() - 601000).toISOString() }, env.OAUTH_REDIRECT_ALLOWLIST));
  assert.throws(() => validFlow({ ...f, platform: 'attacker' }, env.OAUTH_REDIRECT_ALLOWLIST));
  assert.throws(() => validFlow(null, env.OAUTH_REDIRECT_ALLOWLIST));
});
test('PKCE is used on supported existing authentication flows', () => {
  Object.assign(env, { X_CLIENT_ID: 'x', YOUTUBE_CLIENT_ID: 'y', TIKTOK_CLIENT_KEY: 't' });
  for (const p of ['x', 'youtube', 'tiktok'] as const) {
    const u = new URL(authUrl(p, 'https://callback', 'state', 'challenge'));
    assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(u.searchParams.get('code_challenge'), 'challenge');
  }
  const fb = new URL(authUrl('facebook', 'https://callback', 'state', 'challenge'));
  assert.equal(fb.searchParams.get('response_type'), 'code');
  assert(!fb.toString().includes('test-secret'));
  assert(!fb.searchParams.get('scope')?.includes('instagram'));
});
test('forged and stale Meta deletion/deauthorization callbacks are rejected', async () => {
  const payload = b64url(
    new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '7', issued_at: Math.floor(Date.now() / 1000) })),
  );
  const signature = b64url(await hmac('test-secret', payload));
  assert.equal((await signedRequest(`${signature}.${payload}`, 'test-secret')).user_id, '7');
  await assert.rejects(signedRequest(`forged.${payload}`, 'test-secret'));
  await assert.rejects(signedRequest(`${signature}.${payload}`, 'another-secret'));
  const stale = b64url(new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '7', issued_at: 1 })));
  await assert.rejects(signedRequest(`${b64url(await hmac('test-secret', stale))}.${stale}`, 'test-secret'));
  const future = b64url(
    new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '7', issued_at: Math.floor(Date.now() / 1000) + 600 })),
  );
  await assert.rejects(signedRequest(`${b64url(await hmac('test-secret', future))}.${future}`, 'test-secret'));
});
test('payload routing, arbitrary fetches, foreign media and malformed formats are blocked', () => {
  const page = { platform: 'facebook', external_id: '42' }, p = { pageId: '42', kind: 'text', message: 'hello', media: [] };
  assert.equal(authorizedPayload(page, p, 'alice', env.SUPABASE_URL).pageId, '42');
  assert.throws(() => authorizedPayload(page, { ...p, pageId: '99' }, 'alice', env.SUPABASE_URL));
  for (
    const url of [
      'http://127.0.0.1/private',
      'https://test.supabase.co/storage/v1/object/public/media/bob/photo.jpg',
      'https://evil.test/file.jpg',
      'https://test.supabase.co/storage/v1/object/public/media/alice/%2e%2e/secret',
    ]
  ) assert.throws(() => authorizedPayload(page, { ...p, kind: 'photo', media: [{ url, type: 'image' }] }, 'alice', env.SUPABASE_URL));
  assert.throws(() => authorizedPayload(page, { ...p, kind: 'reel' }, 'alice', env.SUPABASE_URL));
  const photo = {
    ...p,
    kind: 'photo',
    media: [{ url: `${env.SUPABASE_URL}/storage/v1/object/public/media/alice/photo.jpg`, type: 'image' }],
  };
  assert.equal(authorizedPayload(page, photo, 'alice', env.SUPABASE_URL).media.length, 1);
});
test('Graph errors preserve safe codes and reconnect instructions without echoing secrets', async () => {
  const e = await metaJson(json({ error: { code: 190, error_subcode: 463, message: 'leaked access_token=secret' } }, 400)).catch((e) => e);
  assert(e instanceof SafeError);
  assert(e.reconnect);
  assert.equal(e.code, 'META_190_463');
  assert(!publicError(e).message.includes('secret'));
  const rate = await metaJson(json({ error: { code: 4, message: 'slow down' } }, 429)).catch((e) => e);
  assert(rate.retryable);
  assert(!publicError(new Error('access_token=secret')).message.includes('secret'));
});
test('expired credentials without refresh support require reconnect', async () => {
  await assert.rejects(
    refresh('facebook', { access_token: 'secret', expires_at: '2000-01-01' }),
    (e) => e instanceof SafeError && e.reconnect,
  );
});
test('multiple Facebook Pages, pagination, tasks and narrowed grants', async () => {
  let calls = 0;
  await graphMock((url, init) => {
    assert.equal(url.origin, 'https://graph.facebook.com');
    assert(!url.searchParams.has('access_token'));
    assert.equal((init?.headers as any).Authorization, 'Bearer user-token');
    assert(url.searchParams.has('appsecret_proof'));
    assert(!url.searchParams.get('fields')?.includes('instagram'));
    calls++;
    return url.searchParams.has('after')
      ? json({
        data: [{ id: '43', name: 'Second', access_token: 'page2', tasks: ['CREATE_CONTENT'] }, {
          id: '44',
          name: 'No publishing',
          access_token: 'no',
          tasks: ['ANALYZE'],
        }],
      })
      : json({
        data: [{ id: '42', name: 'First', access_token: 'page1', tasks: ['CREATE_CONTENT'] }],
        paging: { next: 'https://attacker.test/?access_token=stolen', cursors: { after: 'cursor' } },
      });
  }, async () => {
    const pages = await discoverPages('user-token');
    assert.deepEqual(pages.map((p) => p.external_id), ['42', '43']);
    assert.equal(calls, 2);
  });
  await graphMock(() => json({ data: { is_valid: true, app_id: '123', user_id: '7', scopes: ['pages_show_list'] } }), async () => {
    await assert.rejects(debugUser('token'), (e) => e instanceof SafeError && e.reconnect);
  });
});
test('Page access is revalidated immediately before publishing', async () => {
  await graphMock(
    (url) =>
      url.pathname.endsWith('debug_token')
        ? json({
          data: { is_valid: true, app_id: '123', user_id: '7', scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'] },
        })
        : json({ data: [] }),
    async () => {
      await assert.rejects(
        authorizedPageToken({ access_token: 'token' }, '7', '42'),
        (e) => e instanceof SafeError && e.code === 'META_PAGE_REVOKED',
      );
    },
  );
});
test('Facebook publishing only reports an actual confirmed Graph response', async () => {
  const payload = { pageId: '42', kind: 'text', message: 'Test', media: [] };
  await graphMock((url, init) => {
    assert(url.pathname.endsWith('/42/feed'));
    assert.equal((init?.headers as any).Authorization, 'Bearer page-token');
    return json({ id: '42_99' });
  }, async () => {
    assert.equal((await publish('facebook', payload, 'page-token', '')).remoteId, '42_99');
  });
  await graphMock(() => json({ error: { code: 190, message: 'secret' } }, 400), async () => {
    const r = await publish('facebook', payload, 'page-token', '');
    assert.equal(r.status, 'failed');
    assert(r.error?.reconnect);
    assert.equal(r.error?.retryable, false);
  });
  await graphMock(() => json({}), async () => {
    assert.equal((await publish('facebook', payload, 'page-token', '')).status, 'failed');
  });
  await graphMock(() => {
    throw new Error('network access_token=secret');
  }, async () => {
    const r = await publish('facebook', payload, 'page-token', '');
    assert.equal(r.status, 'failed');
    assert.equal(r.error?.retryable, false);
    assert(!r.error?.message.includes('secret'));
  });
});
test('maintenance gate rejects API, cron and callbacks before accessing the database or Meta', async () => {
  env.MAINTENANCE_MODE = 'true';
  const blocked = new Proxy({}, { get() { throw new Error('Database must not be accessed'); } });
  const handler = createHandler(blocked as any);
  try {
    for (const [path, method, body] of [
      ['api', 'POST', '{"action":"publish"}'],
      ['api', 'POST', '{"action":"cron"}'],
      ['callback?state=test', 'GET', undefined],
      ['data-deletion', 'POST', 'signed_request=test'],
    ] as const) {
      const response = await handler(new Request(`https://test/${path}`, { method, body }));
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, 'MAINTENANCE');
    }
  } finally { delete env.MAINTENANCE_MODE; }
});
test('HTTP handler rejects unauthenticated actions, bad methods, missing cron config and invalid state', async () => {
  const handler = createHandler({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: () => {
      throw new Error('Database must not be reached');
    },
  });
  for (const action of ['connect', 'publish', 'disconnect', 'delete-user']) {
    assert.equal((await handler(new Request('https://test/api', { method: 'POST', body: JSON.stringify({ action }) }))).status, 401);
  }
  assert.equal((await handler(new Request('https://test/api', { method: 'POST', body: '{"action":"cron"}' }))).status, 403);
  assert.equal((await handler(new Request('https://test/api'))).status, 405);
  assert.equal((await handler(new Request('https://test/api/callback?state=forged&code=secret'))).status, 400);
  assert.equal(
    (await handler(new Request('https://test/api/data-deletion', { method: 'POST', body: 'signed_request=forged' }))).status,
    403,
  );
});
test('invalid/replayed state is consumed once; a failed state insert returns no OAuth URL', async () => {
  const state = 'a'.repeat(43), jwt = `e30.${b64url(new TextEncoder().encode(JSON.stringify({ session_id: 'session' })))}.signature`;
  let flow: any = {
    platform: 'facebook',
    user_id: 'alice',
    session_id: 'session',
    redirect_uri: 'outpost://oauth/callback',
    created_at: new Date().toISOString(),
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'alice' } } }) },
    rpc: async () => ({ data: true }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { connection_version: 0 } }) }) }),
      insert: async () => ({ error: { message: 'secret db error' } }),
      delete: () => ({
        eq: (_: string, value: string) => {
          assert.equal(value, awaitHash);
          return {
            select: () => ({
              maybeSingle: async () => {
                const data = flow;
                flow = null;
                return { data };
              },
            }),
          };
        },
      }),
    }),
  };
  const awaitHash = await hash(state), handler = createHandler(db);
  const denied = await handler(new Request(`https://test/api/callback?state=${state}&error=access_denied&error_description=secret`));
  assert.equal(denied.status, 302);
  assert(!denied.headers.get('Location')?.includes('secret'));
  assert.equal((await handler(new Request(`https://test/api/callback?state=${state}&code=x`))).status, 400);
  const res = await handler(
    new Request('https://test/api', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ action: 'connect', platform: 'facebook', redirectUri: 'outpost://oauth/callback' }),
    }),
  );
  assert.equal(res.status, 500);
  const body = await res.text();
  assert(!body.includes('authUrl'));
  assert(!body.includes('secret'));
});

test('asynchronous Facebook media is not reported as published until Graph confirms it', async () => {
  const payload = {
    pageId: '42',
    kind: 'video',
    message: 'test',
    media: [{ url: 'https://test.supabase.co/media/video.mp4', type: 'video' }],
  };
  await graphMock(
    (url) => url.pathname.endsWith('/videos') ? json({ id: 'video-99' }) : json({ id: 'video-99', is_published: false }),
    async () => {
      const r = await publish('facebook', payload, 'token', '');
      assert.equal(r.status, 'failed');
      assert.equal(r.remoteId, 'video-99');
      assert.equal(r.error?.retryable, false);
      assert(!r.publishedAt);
    },
  );
  await graphMock(
    (url) => url.pathname.endsWith('/videos') ? json({ id: 'video-99' }) : json({ id: 'video-99', is_published: true }),
    async () => {
      assert.equal((await publish('facebook', payload, 'token', '')).status, 'published');
    },
  );
});
test('expired or wrong-app Facebook grants cannot be used', async () => {
  for (
    const data of [{ is_valid: false }, { is_valid: true, app_id: 'wrong', user_id: '7' }, {
      is_valid: true,
      app_id: '123',
      user_id: '7',
      expires_at: 1,
      scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
    }]
  ) {
    await graphMock(() => json({ data }), async () => {
      await assert.rejects(debugUser('token'), (e) => e instanceof SafeError && e.reconnect);
    });
  }
});
