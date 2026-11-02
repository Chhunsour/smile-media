import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { databaseClient } from './db-client';
import { createHandler } from '../supabase/functions/api/server';
import { b64url, hash, hmac } from '../supabase/functions/api/security';

const U = '11111111-1111-4111-8111-111111111111', V = '22222222-2222-4222-8222-222222222222';
const S = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', T = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const connection = (name = 'Owner') =>
  JSON.stringify({
    name,
    pages: [{ external_id: '42', name: 'Shared Page', handle: '42', kind: 'page' }],
    tokens: [{ id: `${name === 'Owner' ? U : V}:facebook:7:42`, sealed: 'v1.encrypted.test' }],
  });

test('PostgreSQL migration, RLS, atomic saves, duplicate publishing and deletion', async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,storage,public to anon,authenticated,service_role;
 grant execute on all functions in schema auth to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 insert into auth.users values('${U}'),('${V}');
 insert into auth.sessions values('${S}','${U}'),('${T}','${V}');`);
  const base = (await readFile('supabase/migrations/20261007000000_init.sql', 'utf8')).split('-- Scheduler:')[0].replace(
    /create extension if not exists pg_(cron|net);/g,
    '',
  );
  await db.exec(base);
  await db.exec(await readFile('supabase/migrations/20261007000100_media_upsert.sql', 'utf8'));
  await db.exec(`insert into public.social_accounts(id,user_id,platform,name) values('facebook:7','${U}','facebook','Legacy');
 insert into public.social_pages(id,account_id,user_id,platform,external_id,name) values('facebook:42','facebook:7','${U}','facebook','42','Shared Page');
 insert into public.social_tokens(id,user_id,access_token) values('facebook:42','${U}','legacy-secret');
 insert into public.posts(id,user_id,data,status) values('legacy','${U}','{"destinations":[{"pageId":"facebook:42","status":"pending"}],"payloads":{"facebook:42":{"pageId":"42"}}}','scheduled');`);
  const migration = await readFile('supabase/migrations/20261030094002_security_isolation_oauth.sql', 'utf8');
  try {
    await db.exec(`begin;${migration}commit;`);
  } catch (e) {
    throw new Error(`Migration failed: ${(e as Error).message}`);
  }
  const q = async (sql: string, args: any[] = []) => (await db.query<any>(sql, args)).rows;
  const asUser = async (user: string, session: string) => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [
      user,
      JSON.stringify({ session_id: session, role: 'authenticated', user_metadata: { organization_id: V } }),
    ]);
    await db.exec('set role authenticated');
  };
  await t.test('backfill preserves destinations and disables unproven legacy credentials', async () => {
    const rows = await q('select * from public.social_pages');
    assert.equal(rows[0].id, `${U}:facebook:7:42`);
    assert.equal((await q('select * from public.social_tokens')).length, 0);
    assert.equal((await q("select status,data from public.posts where id='legacy'"))[0].status, 'draft');
    assert.equal((await q("select data from public.posts where id='legacy'"))[0].data.destinations[0].pageId, `${U}:facebook:7:42`);
  });
  await t.test('two users connecting the same Facebook account and Page cannot overwrite each other', async () => {
    await db.exec('set role service_role');
    await db.query('select public.save_connection($1,$2,$3,$4)', [U, 'facebook', '7', connection()]);
    await db.query('select public.save_connection($1,$2,$3,$4)', [V, 'facebook', '7', connection('Other')]);
    assert.equal((await q('select * from public.social_accounts')).length, 2);
    assert.equal((await q('select * from public.social_pages')).length, 2);
    await db.query('select public.save_connection($1,$2,$3,$4)', [U, 'facebook', '7', connection()]);
    assert.equal((await q('select * from public.social_tokens where user_id=$1', [V])).length, 1);
    assert.equal((await q('select public.session_active($1,$2) active', [U, S]))[0].active, true);
    await db.exec('reset role');
  });
  await t.test('actual RLS rejects cross-user reads, writes, ownership changes and direct credential access', async () => {
    await asUser(U, S);
    assert.equal((await q('select * from public.social_pages')).length, 1);
    assert.equal((await q('select * from public.social_accounts where user_id=$1', [V])).length, 0);
    await assert.rejects(q('select * from public.social_tokens'), /permission denied/);
    await assert.rejects(q('select * from public.oauth_states'), /permission denied/);
    await assert.rejects(q('select * from public.post_management_attempts'), /permission denied/);
    await assert.rejects(q('select public.claim_post_management($1,$2,$3,$4,$5,$6)', [U, 'any', 'any', S, 'delete', await hash('request')]), /permission denied/);
    await assert.rejects(q('delete from public.social_accounts'), /permission denied/);
    await assert.rejects(q('select public.save_connection($1,$2,$3,$4)', [V, 'facebook', '9', connection()]), /permission denied/);
    await assert.rejects(
      q("insert into public.posts(id,user_id,organization_id,data,status) values('forged',$1,$2,'{}','draft')", [U, V]),
      /check constraint|row-level security/,
    );
    await assert.rejects(q('update public.posts set user_id=$1,organization_id=$1 where user_id=$2', [V, U]), /row-level security/);
    await db.exec('reset role;set role anon');
    await assert.rejects(q('select * from public.posts'), /permission denied/);
    await db.exec('reset role');
  });
  await t.test('removed sessions cannot read data even with an otherwise unexpired JWT', async () => {
    await asUser(U, T);
    assert.equal((await q('select * from public.posts')).length, 0);
    await db.exec('reset role');
  });
  await t.test('storage denies other users folders and UPDATE cannot move objects to another owner', async () => {
    await asUser(U, S);
    await q("insert into storage.objects(bucket_id,name) values('media',$1)", [`${U}/photo.jpg`]);
    await assert.rejects(q("insert into storage.objects(bucket_id,name) values('media',$1)", [`${V}/bad.jpg`]), /row-level security/);
    await assert.rejects(q('update storage.objects set name=$1', [`${V}/photo.jpg`]), /row-level security/);
    await db.exec('reset role');
  });
  const post = {
    destinations: [{ pageId: `${U}:facebook:7:42`, status: 'pending' }, { pageId: `${V}:facebook:7:42`, status: 'pending' }],
    payloads: {},
  };
  await q("insert into public.posts(id,user_id,organization_id,data,status) values('publish',$1,$1,$2,'draft')", [U, JSON.stringify(post)]);
  await t.test('cross-account publish claim is rejected by the service-role path', async () => {
    await assert.rejects(q('select public.claim_publish($1,$2,$3)', [U, 'publish', `${V}:facebook:7:42`]), /Page unavailable/);
  });
  await t.test('concurrent and repeated publishing cannot create duplicate external calls', async () => {
    const claim = () => q('select public.claim_publish($1,$2,$3) c', [U, 'publish', `${U}:facebook:7:42`]);
    const [a, b] = await Promise.all([claim(), claim()]);
    assert.equal([a, b].filter((x) => x[0].c.post).length, 1);
    assert.equal([a, b].filter((x) => x[0].c.busy).length, 1);
    await q('select public.finish_publish($1,$2,$3,$4)', [
      U,
      'publish',
      `${U}:facebook:7:42`,
      JSON.stringify({ status: 'published', remoteId: '42_99' }),
    ]);
    assert.equal((await claim())[0].c.cached.remoteId, '42_99');
    await q("delete from public.posts where id='publish'");
    await q("insert into public.posts(id,user_id,organization_id,data,status) values('publish',$1,$1,$2,'draft')", [
      U,
      JSON.stringify(post),
    ]);
    assert.equal((await claim())[0].c.cached.remoteId, '42_99');
  });
  await t.test('real handler: connect, callback, two Pages, publish, duplicate, cross-user and signed lifecycle callbacks', async () => {
    const config: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      META_APP_ID: '123',
      META_APP_SECRET: 'test-secret',
      TOKEN_ENCRYPTION_KEY: b64url(new Uint8Array(32).fill(9)),
      OAUTH_REDIRECT_ALLOWLIST: 'outpost://oauth/callback',
      PUBLISH_MODE: 'controlled',
      PUBLISH_USER_ALLOWLIST: U,
    };
    (globalThis as any).Deno = { env: { get: (k: string) => config[k] } };
    const jwt = (u: string, s: string) => `e30.${b64url(new TextEncoder().encode(JSON.stringify({ sub: u, session_id: s })))}.test`;
    const auth = {
      getUser: async (token: string) => ({ data: { user: token === jwt(U, S) ? { id: U } : token === jwt(V, T) ? { id: V } : null } }),
      admin: {
        deleteUser: async (u: string) => {
          await q('delete from auth.users where id=$1', [u]);
          return { error: null };
        },
      },
    };
    const deleted: string[] = [];
    const storage = {
      from: () => ({
        list: async () => ({ data: [] }),
        remove: async (paths: string[]) => {
          deleted.push(...paths);
          return { data: [] };
        },
      }),
    };
    let failManagementReceipt = false;
    const client = databaseClient(db, auth, storage);
    const handler = createHandler({ ...client, rpc(name: string, args: Record<string, unknown>) {
      if (name === 'finish_post_management' && failManagementReceipt) return Promise.resolve({ data: null, error: { message: 'receipt unavailable' } });
      return client.rpc(name, args);
    } } as any);
    const call = (body: unknown, user = U, session = S) =>
      handler(
        new Request('https://test/api', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt(user, session)}` },
          body: JSON.stringify(body),
        }),
      );
    const capabilities = await call({ action: 'capabilities' });
    assert.equal(capabilities.status, 200);
    assert.equal((await capabilities.json()).schemaVersion, '2026-11-01.security.3');
    let graphWrites = 0;
    let managementWrites = 0, loseManagementResponse = false;
    let ambiguousManagementResponse: { status: number; body: unknown } | undefined;
    const remotePosts = new Map(['42_99', '43_99'].map(id => [id, 'Controlled unit test']));
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'user-token', expires_in: 3600 }));
      }
      if (url.pathname.endsWith('/debug_token')) {
        return new Response(
          JSON.stringify({
            data: {
              is_valid: true,
              app_id: '123',
              user_id: '7',
              scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
            },
          }),
        );
      }
      if (url.pathname.endsWith('/me')) return new Response(JSON.stringify({ id: '7', name: 'Test Owner' }));
      if (url.pathname.endsWith('/me/accounts')) {
        return new Response(
          JSON.stringify({
            data: [{ id: '42', name: 'First', access_token: 'page-42', tasks: ['CREATE_CONTENT'] }, {
              id: '43',
              name: 'Second',
              access_token: 'page-43',
              tasks: ['CREATE_CONTENT'],
            }],
          }),
        );
      }
      if (url.pathname.endsWith('/feed') && init?.method === 'POST') {
        graphWrites++;
        return new Response(JSON.stringify({ id: `${url.pathname.split('/')[2]}_99` }));
      }
      const remoteId = url.pathname.split('/').at(-1)!;
      if (['42_99', '43_99'].includes(remoteId)) {
        if (init?.method === 'POST' || init?.method === 'DELETE') {
          managementWrites++;
          if (init.method === 'DELETE') remotePosts.delete(remoteId);
          else remotePosts.set(remoteId, JSON.parse(String(init.body)).message);
          if (loseManagementResponse) throw new Error('Simulated lost provider response');
          if (ambiguousManagementResponse) return Response.json(ambiguousManagementResponse.body, { status: ambiguousManagementResponse.status });
          return new Response('{"success":true}');
        }
        if (!remotePosts.has(remoteId)) return new Response('{"error":{"code":100}}', { status: 400 });
        return new Response(JSON.stringify({ id: remoteId, message: remotePosts.get(remoteId), permalink_url: `https://www.facebook.com/${remoteId}`, access_token: 'must-never-reach-client' }));
      }
      throw new Error('Unexpected real network call');
    };
    try {
      const start = await call({ action: 'connect', platform: 'facebook', redirectUri: 'outpost://oauth/callback' });
      assert.equal(start.status, 200);
      const { state } = await start.json();
      assert.equal((await q('select state from public.oauth_states'))[0].state, await hash(state));
      const callback = await handler(new Request(`https://test/api/callback?state=${state}&code=valid-code`));
      assert.equal(callback.status, 302);
      assert(callback.headers.get('location')?.includes('account='));
      assert.equal((await q('select * from public.social_pages where user_id=$1', [U])).length, 2);
      const tokenRows = await q('select sealed from public.social_tokens where user_id=$1', [U]);
      assert.equal(tokenRows.length, 3);
      assert(tokenRows.every((t) => !t.sealed.includes('page-42') && !t.sealed.includes('user-token')));
      const payloads = Object.fromEntries(
        ['42', '43'].map((id) => [`${U}:facebook:7:${id}`, { pageId: id, kind: 'text', message: 'Controlled unit test', media: [] }]),
      );
      const doc = { destinations: ['42', '43'].map((id) => ({ pageId: `${U}:facebook:7:${id}`, status: 'pending' })), payloads };
      await q("insert into public.posts(id,user_id,organization_id,data,status) values('handler',$1,$1,$2,'draft')", [
        U,
        JSON.stringify(doc),
      ]);
      for (const id of ['42', '43']) {
        const r = await call({ action: 'publish', postId: 'handler', pageId: `${U}:facebook:7:${id}` });
        assert.equal(r.status, 200);
        assert.equal((await r.json()).status, 'published');
      }
      assert.equal(graphWrites, 2);
      const duplicate = await call({ action: 'publish', postId: 'handler', pageId: `${U}:facebook:7:42` });
      assert.equal((await duplicate.json()).status, 'published');
      assert.equal(graphWrites, 2);
      assert.equal((await call({ action: 'publish', postId: 'handler', pageId: `${U}:facebook:7:42` }, V, T)).status, 404);
      const management = (operation: string, extra: Record<string, unknown> = {}, page = '42', user = U, session = S) =>
        call({ action: 'facebook-post', operation, postId: 'handler', pageId: `${U}:facebook:7:${page}`, ...extra }, user, session);
      const read = await (await management('read')).json();
      assert.equal(read.message, 'Controlled unit test');
      assert.equal(read.canManage, false);
      assert(!JSON.stringify(read).includes('must-never-reach-client'));
      config.PUBLISH_MODE = 'disabled';
      assert.equal((await management('read')).status, 200);
      config.PUBLISH_MODE = 'controlled';
      assert.equal((await management('edit', { requestId: read.requestId, message: 'Updated' })).status, 409);
      assert.equal((await q('select count(*) n from public.post_management_attempts'))[0].n, 0);
      config.FACEBOOK_POST_MANAGEMENT = 'true';
      assert.equal((await management('read', {}, '42', V, T)).status, 404);
      assert.equal((await management('edit', { requestId: 'invalid', message: 'Updated' })).status, 400);
      assert.equal((await management('delete', { requestId: read.requestId })).status, 400);
      const edit = { requestId: read.requestId, message: 'Updated Page caption', remoteId: '43_99' };
      assert.equal((await (await management('edit', edit)).json()).success, true);
      assert.equal(managementWrites, 1);
      assert.equal(remotePosts.get('42_99'), edit.message);
      assert.equal(remotePosts.get('43_99'), 'Controlled unit test');
      assert.equal((await (await management('edit', edit)).json()).success, true);
      assert.equal(managementWrites, 1);
      assert.equal((await management('edit', { ...edit, message: 'Changed request' })).status, 500);
      assert.equal(managementWrites, 1);
      assert.equal((await (await management('read')).json()).message, edit.message);
      const next = await (await management('read')).json();
      const concurrent = await Promise.all([management('edit', { requestId: next.requestId, message: 'Concurrent edit' }), management('edit', { requestId: next.requestId, message: 'Concurrent edit' })]);
      assert(concurrent.every(response => [200, 409].includes(response.status)));
      assert.equal(managementWrites, 2);
      const uncertain = await (await management('read', {}, '43')).json();
      loseManagementResponse = true;
      const lost = await management('edit', { requestId: uncertain.requestId, message: 'Applied but response lost' }, '43');
      assert.equal((await lost.json()).error.code, 'POST_CHANGE_UNCERTAIN');
      loseManagementResponse = false;
      assert.equal(remotePosts.get('43_99'), 'Applied but response lost');
      const observed = await (await management('read', {}, '43')).json();
      assert.equal(observed.state, 'uncertain');
      assert.equal(observed.canManage, false);
      assert.equal((await management('edit', { requestId: uncertain.requestId, message: 'Applied but response lost' }, '43')).status, 409);
      assert.equal((await management('delete', { requestId: observed.requestId, confirm: 'DELETE_FROM_FACEBOOK' }, '43')).status, 409);
      assert.equal(managementWrites, 3);
      await assert.rejects(q('select public.begin_user_deletion($1)', [U]), /Post management in progress/);
      // Fixture-only operator resolution; no production reset/replay endpoint exists.
      await q('delete from public.post_management_attempts where user_id=$1 and page_id=$2', [U, `${U}:facebook:7:43`]);
      const receipt = await (await management('read', {}, '43')).json();
      failManagementReceipt = true;
      assert.equal((await management('edit', { requestId: receipt.requestId, message: 'Receipt lost' }, '43')).status, 409);
      failManagementReceipt = false;
      assert.equal((await (await management('read', {}, '43')).json()).state, 'uncertain');
      assert.equal((await management('edit', { requestId: receipt.requestId, message: 'Receipt lost' }, '43')).status, 409);
      assert.equal(managementWrites, 4);
      await q('delete from public.post_management_attempts where user_id=$1 and page_id=$2', [U, `${U}:facebook:7:43`]);
      for (const failure of [{ status: 500, body: {} }, { status: 503, body: { error: { code: 190 } } },
        { status: 400, body: { error: { code: 2, is_transient: true } } }, { status: 429, body: { error: { code: 4 } } }]) {
        const before = managementWrites;
        const snapshot = await (await management('read', {}, '43')).json();
        ambiguousManagementResponse = failure;
        const failed = await management('edit', { requestId: snapshot.requestId, message: 'May have applied before error' }, '43');
        ambiguousManagementResponse = undefined;
        assert.equal((await failed.json()).error.code, 'POST_CHANGE_UNCERTAIN');
        assert.equal((await (await management('read', {}, '43')).json()).state, 'uncertain');
        assert.equal((await management('delete', { requestId: crypto.randomUUID(), confirm: 'DELETE_FROM_FACEBOOK' }, '43')).status, 409);
        assert.equal(managementWrites, before + 1);
        // Fixture-only manual reconciliation, never a production retry/reset route.
        await q('delete from public.post_management_attempts where user_id=$1 and page_id=$2', [U, `${U}:facebook:7:43`]);
      }
      const deletion = await (await management('read')).json();
      const beforeDelete = managementWrites;
      const deleteRequest = { requestId: deletion.requestId, confirm: 'DELETE_FROM_FACEBOOK' };
      assert.equal((await (await management('delete', deleteRequest)).json()).success, true);
      assert.equal((await (await management('delete', deleteRequest)).json()).success, true);
      assert.equal(managementWrites, beforeDelete + 1);
      assert.equal((await (await management('read')).json()).state, 'deleted');
      const ledger = (await q('select result from public.publish_attempts where user_id=$1 and post_id=$2 and page_id=$3', [U, 'handler', `${U}:facebook:7:42`]))[0];
      assert.equal(ledger.result.remoteId, '42_99');
      assert.equal(ledger.result.status, 'published');
      assert.equal((await q('select data from public.posts where id=$1', ['handler']))[0].data.payloads[`${U}:facebook:7:42`].message, 'Controlled unit test');
      const beforeStaleCallback = await q('select id,sealed from public.social_tokens where user_id=$1 order by id', [U]);
      const staleStart = await (await call({ action: 'connect', platform: 'facebook', redirectUri: 'outpost://oauth/callback' })).json();
      await q('update public.organizations set connection_version=connection_version+1 where id=$1', [U]);
      const staleCallback = await handler(new Request(`https://test/api/callback?state=${staleStart.state}&code=valid-code`));
      assert.equal(staleCallback.status, 302);
      assert(new URL(staleCallback.headers.get('location')!).searchParams.has('error'));
      assert.deepEqual(await q('select id,sealed from public.social_tokens where user_id=$1 order by id', [U]), beforeStaleCallback);
      assert.equal((await handler(new Request(`https://test/api/callback?state=${staleStart.state}&code=valid-code`))).status, 400);
      // App account deletion uses the authenticated user; a supplied victim user ID has no effect.
      const badDelete = await call({ action: 'delete-user', userId: V });
      assert.equal(badDelete.status, 400);
      const signed = async () => {
        const data = b64url(
          new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '7', issued_at: Math.floor(Date.now() / 1000) })),
        );
        return `${b64url(await hmac('test-secret', data))}.${data}`;
      };
      const deauth = await handler(
        new Request('https://test/api/deauthorize', { method: 'POST', body: new URLSearchParams({ signed_request: await signed() }) }),
      );
      assert.equal(deauth.status, 200);
      assert.equal((await q('select * from public.social_tokens')).length, 0);
      assert.equal((await call({ action: 'publish', postId: 'handler', pageId: `${U}:facebook:7:42` })).status, 404);
      // Both app users linked this same app-scoped Facebook user. Deauthorization affects that grant only.
      assert.equal((await q('select count(*) c from auth.users'))[0].c, 2);
    } finally {
      globalThis.fetch = original;
    }
    // Restore the fixture needed by later ownership/disconnect assertions using the current generation.
    const versions = await q('select id,connection_version from public.organizations');
    for (const row of versions) {
      await q('select public.save_connection($1,$2,$3,$4,$5)', [
        row.id,
        'facebook',
        '7',
        connection(row.id === U ? 'Owner' : 'Other'),
        row.connection_version,
      ]);
    }
  });
  await t.test('signed data deletion removes only mapped user data, retries storage failure and returns truthful status', async () => {
    const C = '33333333-3333-4333-8333-333333333333';
    await q('insert into auth.users(id) values($1)', [C]);
    await q('select public.save_connection($1,$2,$3,$4)', [
      C,
      'facebook',
      '8',
      JSON.stringify({ name: 'Delete fixture', pages: [{ external_id: '99', name: 'Page', kind: 'page' }], tokens: [] }),
    ]);
    const config: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      META_APP_SECRET: 'test-secret',
      CRON_SECRET: 'cron-test',
    };
    (globalThis as any).Deno = { env: { get: (k: string) => config[k] } };
    let storageFails = true, removed = false;
    const auth = {
      admin: {
        deleteUser: async (u: string) => {
          await q('delete from auth.users where id=$1', [u]);
          return { error: null };
        },
      },
    };
    const storage = {
      from: () => ({
        list: async (u: string) => ({ data: removed ? [] : [{ id: 'object-id', name: 'photo.jpg' }] }),
        remove: async (paths: string[]) => {
          assert.deepEqual(paths, [`${C}/photo.jpg`]);
          if (storageFails) return { error: { message: 'storage unavailable' } };
          removed = true;
          return { data: paths };
        },
      }),
    };
    const handler = createHandler(databaseClient(db, auth, storage));
    const data = b64url(
      new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '8', issued_at: Math.floor(Date.now() / 1000) })),
    );
    const signed = `${b64url(await hmac('test-secret', data))}.${data}`;
    const request = () =>
      handler(new Request('https://test/api/data-deletion', { method: 'POST', body: new URLSearchParams({ signed_request: signed }) }));
    const res = await request();
    assert.equal(res.status, 200);
    const response = await res.json();
    assert.match(response.confirmation_code, /^[a-f0-9]{64}$/);
    assert.equal((await (await handler(new Request(response.url))).json()).status, 'pending');
    assert.equal((await q('select * from public.social_accounts where user_id=$1', [C])).length, 0);
    assert.equal((await q('select * from public.deletion_jobs where user_id=$1', [C])).length, 1);
    storageFails = false;
    const cron = await handler(
      new Request('https://test/api', { method: 'POST', headers: { 'x-cron-secret': 'cron-test' }, body: '{"action":"cron"}' }),
    );
    assert.equal(cron.status, 200);
    assert.equal((await q('select * from auth.users where id=$1', [C])).length, 0);
    assert(removed);
    assert.equal((await (await handler(new Request(response.url))).json()).status, 'completed');
    assert.equal((await request()).status, 200);
    assert.equal((await q('select count(*) c from auth.users'))[0].c, 2);
  });
  await t.test('deletion survives Auth success followed by a failed completion receipt', async () => {
    const D = '44444444-4444-4444-8444-444444444444';
    await q('insert into auth.users(id) values($1)', [D]);
    await q('select public.save_connection($1,$2,$3,$4)', [D, 'facebook', '9',
      JSON.stringify({ name: 'Receipt recovery fixture', pages: [{ external_id: '98', name: 'Page', kind: 'page' }], tokens: [] })]);
    const config: Record<string, string> = { META_APP_SECRET: 'test-secret', SUPABASE_URL: 'https://test.supabase.co', CRON_SECRET: 'receipt-test' };
    (globalThis as any).Deno = { env: { get: (key: string) => config[key] } };
    let failReceipt = true, authCalls = 0;
    const auth = { admin: { deleteUser: async (user: string) => {
      authCalls++;
      if (authCalls === 1) { await q('delete from auth.users where id=$1', [user]); return { error: null }; }
      return { error: authCalls === 2 ? { code: 'unexpected_failure', status: 503 } : { code: 'user_not_found', status: 404 } };
    } } };
    const base = databaseClient(db, auth, { from: () => ({ list: async () => ({ data: [] }) }) });
    const handler = createHandler({ ...base, from(table: string) {
      const chain = base.from(table);
      return table === 'deletion_receipts' && failReceipt ? { ...chain, upsert() {
        failReceipt = false;
        return Promise.resolve({ data: null, error: { message: 'receipt temporarily unavailable' } });
      } } : chain;
    } } as any);
    const data = b64url(new TextEncoder().encode(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '9', issued_at: Math.floor(Date.now() / 1000) })));
    const signed = `${b64url(await hmac('test-secret', data))}.${data}`;
    const response = await (await handler(new Request('https://test/api/data-deletion', {
      method: 'POST', body: new URLSearchParams({ signed_request: signed }),
    }))).json();
    assert.equal((await q('select count(*) n from auth.users where id=$1', [D]))[0].n, 0);
    assert.equal((await q('select count(*) n from public.deletion_jobs where user_id=$1', [D]))[0].n, 1);
    assert.equal((await (await handler(new Request(response.url))).json()).status, 'pending');
    const page = await handler(new Request(response.url, { headers: { Accept: 'text/html' } }));
    assert.match(page.headers.get('content-type')!, /text\/plain/);
    assert.match(await page.text(), /Deletion in progress/);
    const cron = () => handler(new Request('https://test/api', {
      method: 'POST', headers: { 'x-cron-secret': 'receipt-test' }, body: '{"action":"cron"}',
    }));
    await cron();
    assert.equal((await (await handler(new Request(response.url))).json()).status, 'pending');
    await cron();
    assert.equal(authCalls, 3);
    assert.equal((await q('select count(*) n from public.deletion_jobs where user_id=$1', [D]))[0].n, 0);
    assert.equal((await (await handler(new Request(response.url))).json()).status, 'completed');
    const completedPage = await handler(new Request(response.url, { headers: { Accept: 'text/html' } }));
    assert.match(await completedPage.text(), /Deletion completed/);
    const plainPage = await handler(new Request(response.url, { headers: { Accept: 'text/plain' } }));
    assert.doesNotMatch(await plainPage.text(), /<!doctype|<html|<main/i);
    const jsonPage = await handler(new Request(response.url, { headers: { Accept: 'application/json, text/plain, */*' } }));
    assert.match(jsonPage.headers.get('content-type')!, /application\/json/);
    assert.equal((await jsonPage.json()).status, 'completed');
    const unknown = await handler(new Request(`https://test/api/deletion-status?code=${'0'.repeat(64)}`, { headers: { Accept: 'text/html' } }));
    assert.equal(unknown.status, 404);
    assert.match(await unknown.text(), /not found/);
  });
  await t.test('scheduler rejects empty, duplicate and missing destinations without reporting a publication', async () => {
    const config: Record<string, string> = { CRON_SECRET: 'scheduler-test', PUBLISH_MODE: 'controlled', PUBLISH_USER_ALLOWLIST: V };
    (globalThis as any).Deno = { env: { get: (key: string) => config[key] } };
    const handler = createHandler(databaseClient(db, {}, {}));
    for (const [index, destinations] of [[], [{ pageId: 'same' }, { pageId: 'same' }], [{ pageId: '' }]].entries()) {
      const id = `invalid-schedule-${index}`;
      await q('insert into public.posts(id,user_id,organization_id,status,scheduled_at,data) values($1,$2,$2,$3,now()-interval \'1 minute\',$4)',
        [id, V, 'scheduled', JSON.stringify({ id, status: 'scheduled', destinations, scheduledAt: '2026-10-30T00:00:00Z' })]);
      config.PUBLISH_USER_ALLOWLIST = U;
      const excluded = await handler(new Request('https://test/api', {
        method: 'POST', headers: { 'x-cron-secret': 'scheduler-test' }, body: '{"action":"cron"}',
      }));
      assert.equal(excluded.status, 200);
      assert.equal((await q('select status from public.posts where id=$1', [id]))[0].status, 'scheduled');
      config.PUBLISH_USER_ALLOWLIST = V;
      const response = await handler(new Request('https://test/api', {
        method: 'POST', headers: { 'x-cron-secret': 'scheduler-test' }, body: '{"action":"cron"}',
      }));
      assert.equal(response.status, 200);
      const [post] = await q('select status,scheduled_at,data from public.posts where id=$1', [id]);
      assert.equal(post.status, 'failed');
      assert.equal(post.data.status, 'failed');
      assert.equal(post.scheduled_at, null);
      assert.equal(post.data.scheduledAt, null);
      assert.equal((await q('select count(*) n from public.publish_attempts where post_id=$1', [id]))[0].n, 0);
      await q('delete from public.posts where id=$1', [id]);
    }
  });
  await t.test('disconnect is idempotent, deletes stale tokens and never touches another user', async () => {
    await q('select public.disconnect_connection($1,$2)', [U, `${V}:facebook:7`]);
    assert.equal((await q('select * from public.social_accounts where user_id=$1', [V])).length, 1);
    await q('select public.disconnect_connection($1,$2)', [U, `${U}:facebook:7`]);
    await q('select public.disconnect_connection($1,$2)', [U, `${U}:facebook:7`]);
    await assert.rejects(q('select public.save_connection($1,$2,$3,$4)', [U, 'facebook', '7', connection()]), /Workspace unavailable/);
    assert.equal((await q('select * from public.social_tokens where user_id=$1', [U])).length, 0);
    assert.equal((await q('select * from public.social_tokens where user_id=$1', [V])).length, 1);
  });
  await t.test('deletion stops sessions, queues, credentials and isolates other users', async () => {
    await db.exec('set role service_role');
    await q('select public.begin_user_deletion($1)', [U]);
    assert.equal((await q('select * from public.posts where user_id=$1', [U])).length, 0);
    await db.exec('reset role');
    assert.equal((await q('select * from auth.sessions where user_id=$1', [U])).length, 0);
    assert.equal((await q('select * from public.social_accounts where user_id=$1', [V])).length, 1);
    await q('select public.begin_user_deletion($1)', [U]);
    await asUser(U, S);
    assert.equal((await q('select * from public.organizations')).length, 0);
    await db.exec('reset role');
  });
  await db.close();
});
