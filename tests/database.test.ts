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
    const handler = createHandler(databaseClient(db, auth, storage));
    const call = (body: unknown, user = U, session = S) =>
      handler(
        new Request('https://test/api', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt(user, session)}` },
          body: JSON.stringify(body),
        }),
      );
    let graphWrites = 0;
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
        return new Response(JSON.stringify({ id: `${url.pathname.split('/')[2]}_published` }));
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
