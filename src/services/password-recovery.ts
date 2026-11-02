type AuthError = { message: string } | null;
export type RecoveryAuth = {
  resetPasswordForEmail(email: string): Promise<{ error: AuthError }>;
  verifyOtp(params: { email: string; token: string; type: 'recovery' }): Promise<{
    data: { user?: { email?: string } | null; session?: unknown }; error: AuthError;
  }>;
  updateUser(params: { password: string }): Promise<{ error: AuthError }>;
  signOut(params: { scope: 'global' | 'local' }): Promise<{ error: AuthError }>;
};
const emailAddress = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter your account email.');
  return email;
};
export async function requestPasswordRecovery(auth: RecoveryAuth, address: string) {
  const email = emailAddress(address);
  try {
    const result = await auth.resetPasswordForEmail(email);
    if (result.error) throw new Error();
  } catch { throw new Error('The recovery request could not be confirmed. Check your inbox before trying again.'); }
}
export async function completePasswordRecovery(auth: RecoveryAuth, address: string, token: string, password: string) {
  const email = emailAddress(address);
  if (!/^\d{6}$/.test(token.trim())) throw new Error('Enter the six-digit recovery code from your email.');
  if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
  let verified;
  try { verified = await auth.verifyOtp({ email, token: token.trim(), type: 'recovery' }); }
  catch { throw new Error('The recovery code is invalid or expired. Request a new one.'); }
  if (verified.error || !verified.data.session || verified.data.user?.email?.toLowerCase() !== email) {
    if (verified.data.session) await auth.signOut({ scope: 'local' }).catch(() => {});
    throw new Error('The recovery code is invalid or expired. Request a new one.');
  }
  try {
    const updated = await auth.updateUser({ password });
    if (updated.error) throw new Error();
  } catch {
    await auth.signOut({ scope: 'local' }).catch(() => {});
    throw new Error('The password change could not be confirmed. Try signing in with your chosen password or request a new recovery code.');
  }
  let sessionsRevoked = false;
  try { sessionsRevoked = !(await auth.signOut({ scope: 'global' })).error; } catch { /* Report partial success accurately. */ }
  if (!sessionsRevoked) await auth.signOut({ scope: 'local' }).catch(() => {});
  return { sessionsRevoked };
}
