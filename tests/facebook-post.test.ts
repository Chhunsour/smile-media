import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeFacebookPost, facebookPostId, readFacebookPost } from '../supabase/functions/api/facebook-post';

(globalThis as any).Deno = { env: { get: () => 'test-secret' } };
async function mock(response: (input: string, init?: RequestInit) => Response | Promise<Response>, task: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => Promise.resolve(response(String(input), init));
  try { await task(); } finally { globalThis.fetch = original; }
}
test('Facebook management rejects arbitrary, malformed or other-Page remote IDs', () => {
  assert.equal(facebookPostId('42_99', '42'), '42_99');
  for (const id of ['43_99', '42_99/feed', 'https://attacker.test', '99', '', undefined]) assert.throws(() => facebookPostId(id, '42'));
});
test('Facebook readback projects only requested content and a trusted permalink', async () => {
  await mock((url, init) => {
    assert.equal(new URL(url).pathname, '/v23.0/42_99');
    assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, 'Bearer page-token');
    return Response.json({ id: '42_99', message: 'Actual Page content', permalink_url: 'https://attacker.test', access_token: 'secret' });
  }, async () => {
    const result = await readFacebookPost('42_99', 'page-token');
    assert.equal(result.message, 'Actual Page content'); assert.equal(result.url, undefined);
    assert(!JSON.stringify(result).includes('secret'));
  });
});
test('readback cannot present another post or a Graph error as current content', async () => {
  for (const response of [() => Response.json({ id: '43_99', message: 'Wrong Page' }), () => Response.json({ error: { code: 190 } }, { status: 400 })]) {
    await mock(response, async () => { await assert.rejects(readFacebookPost('42_99', 'page-token')); });
  }
});
test('editing and deletion require explicit Graph success, with no automatic retry', async () => {
  for (const operation of ['edit', 'delete'] as const) {
    for (const body of [{}, { success: false }, { success: true }]) {
      let calls = 0;
      await mock((url, init) => {
        calls++; assert.equal(new URL(url).pathname, '/v23.0/42_99');
        assert.equal(init?.method, operation === 'edit' ? 'POST' : 'DELETE');
        assert(!url.includes('page-token'));
        if (operation === 'edit') assert.equal(JSON.parse(String(init?.body)).message, 'Updated text');
        return Response.json(body);
      }, async () => {
        if (body.success === true) assert.equal((await changeFacebookPost('42_99', 'page-token', operation, 'Updated text')).success, true);
        else await assert.rejects(changeFacebookPost('42_99', 'page-token', operation, 'Updated text'));
      });
      assert.equal(calls, 1);
    }
  }
});
