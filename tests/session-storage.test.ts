import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSecureSessionStorage } from '../src/services/secure-session';

const fixture = () => {
  const items = new Map<string, string>(), old = new Map<string, string>();
  let fail = '';
  const secure = {
    getItemAsync: async (k: string) => items.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      if (fail && k.includes(fail)) throw new Error('Device locked');
      items.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      items.delete(k);
    },
  };
  const legacy = {
    getItem: async (k: string) => old.get(k) ?? null,
    removeItem: async (k: string) => {
      old.delete(k);
    },
  };
  return {
    items,
    old,
    secure,
    legacy,
    setFailure: (s: string) => {
      fail = s;
    },
    store: createSecureSessionStorage(secure, legacy),
  };
};
test('native sessions are chunked, rotated and removed completely', async () => {
  const f = fixture(), value = 'private-session'.repeat(500);
  await f.store.setItem('session', value);
  assert.equal(await f.store.getItem('session'), value);
  assert([...f.items.values()].every((v) => v.length <= 1800));
  await f.store.setItem('session', 'replacement');
  assert.equal(await f.store.getItem('session'), 'replacement');
  assert.equal(f.items.size, 2);
  await f.store.removeItem('session');
  assert.equal(f.items.size, 0);
  assert.equal(await f.store.getItem('session'), null);
});
test('legacy plaintext app sessions migrate once into secure storage', async () => {
  const f = fixture();
  f.old.set('session', 'legacy-token');
  assert.equal(await f.store.getItem('session'), 'legacy-token');
  assert.equal(f.old.size, 0);
  assert(f.items.size > 0);
});
test('interrupted secure writes recover the previous session and clean orphaned fragments', async () => {
  const f = fixture();
  await f.store.setItem('session', 'previous');
  f.setFailure('.1');
  await assert.rejects(f.store.setItem('session', 'x'.repeat(4000)));
  f.setFailure('');
  const restarted = createSecureSessionStorage(f.secure, f.legacy);
  assert.equal(await restarted.getItem('session'), 'previous');
  assert.equal(f.items.size, 2);
  await restarted.removeItem('session');
  assert.equal(f.items.size, 0);
});
test('concurrent refreshes are serialized and cannot corrupt a session', async () => {
  const f = fixture();
  await Promise.all([f.store.setItem('session', 'first'.repeat(900)), f.store.setItem('session', 'second'.repeat(900))]);
  assert.equal(await f.store.getItem('session'), 'second'.repeat(900));
  await f.store.removeItem('session');
  assert.equal(f.items.size, 0);
});
