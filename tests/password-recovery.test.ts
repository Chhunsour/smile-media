import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completePasswordRecovery, requestPasswordRecovery, type RecoveryAuth } from '../src/services/password-recovery';

function fixture() {
  const calls: { name: string; value: unknown }[] = [];
  const auth: RecoveryAuth = {
    resetPasswordForEmail: async email => { calls.push({ name: 'request', value: email }); return { error: null }; },
    verifyOtp: async params => { calls.push({ name: 'verify', value: params }); return { data: { user: { email: 'review@example.invalid' }, session: {} }, error: null }; },
    updateUser: async params => { calls.push({ name: 'update', value: params }); return { error: null }; },
    signOut: async params => { calls.push({ name: 'signOut', value: params.scope }); return { error: null }; },
  };
  return { auth, calls };
}
test('recovery requests normalize the account email and never disclose provider details', async () => {
  const { auth, calls } = fixture();
  await requestPasswordRecovery(auth, ' Review@Example.Invalid ');
  assert.equal(calls[0].value, 'review@example.invalid');
  auth.resetPasswordForEmail = async () => ({ error: { message: 'private vendor details' } });
  await assert.rejects(requestPasswordRecovery(auth, 'review@example.invalid'), error => !String(error).includes('private vendor details'));
});
test('invalid recovery inputs never reach authentication or change credentials', async () => {
  const { auth, calls } = fixture();
  await assert.rejects(requestPasswordRecovery(auth, 'invalid'));
  await assert.rejects(completePasswordRecovery(auth, 'review@example.invalid', 'wrong', 'new-password'));
  await assert.rejects(completePasswordRecovery(auth, 'review@example.invalid', '123456', 'short'));
  assert.deepEqual(calls, []);
});
test('an expired recovery code cannot change a password or echo the secret code', async () => {
  const { auth, calls } = fixture();
  auth.verifyOtp = async () => ({ data: { user: null, session: null }, error: { message: 'Expired secret 123456' } });
  await assert.rejects(completePasswordRecovery(auth, 'review@example.invalid', '123456', 'new-password'), error => !String(error).includes('123456'));
  assert.deepEqual(calls, []);
});
test('a mismatched recovery identity clears the local session without changing that account', async () => {
  const { auth, calls } = fixture();
  auth.verifyOtp = async () => ({ data: { user: { email: 'someone-else@example.invalid' }, session: {} }, error: null });
  await assert.rejects(completePasswordRecovery(auth, 'review@example.invalid', '123456', 'new-password'));
  assert.deepEqual(calls, [{ name: 'signOut', value: 'local' }]);
});
test('password change requires a verified recovery session and then requests global sign-out', async () => {
  const { auth, calls } = fixture();
  const result = await completePasswordRecovery(auth, 'review@example.invalid', '123456', 'new-password');
  assert.equal(result.sessionsRevoked, true);
  assert.deepEqual(calls.map(call => call.name), ['verify', 'update', 'signOut']);
  assert.equal((calls[0].value as { type: string }).type, 'recovery');
  assert.equal(calls[2].value, 'global');
});
test('failed password changes and partial sign-out have truthful outcomes and local cleanup', async () => {
  const { auth, calls } = fixture();
  auth.updateUser = async () => ({ error: { message: 'private password policy details' } });
  await assert.rejects(completePasswordRecovery(auth, 'review@example.invalid', '123456', 'new-password'), error => !String(error).includes('private password policy details'));
  assert.equal(calls.at(-1)?.value, 'local');
  auth.updateUser = async () => ({ error: null });
  auth.signOut = async params => { calls.push({ name: 'signOut', value: params.scope }); return { error: params.scope === 'global' ? { message: 'offline' } : null }; };
  assert.equal((await completePasswordRecovery(auth, 'review@example.invalid', '123456', 'new-password')).sessionsRevoked, false);
  assert.equal(calls.at(-1)?.value, 'local');
});
