import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, NavHeader, Text } from '@/components/ui';
import { LegalLinks } from '@/components/legal-links';
import { services } from '@/services';

export default function RecoverPassword() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [note, setNote] = useState(''), [nextSend, setNextSend] = useState(0);
  const enabled = process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED === 'true' && !!services.auth.requestPasswordReset && !!services.auth.resetPassword;
  const request = async () => {
    if (Date.now() < nextSend) { setNote('Please wait one minute before requesting another code.'); return; }
    setBusy(true); setNote(''); setNextSend(Date.now() + 60_000);
    try {
      await services.auth.requestPasswordReset!(email); setSent(true); setNextSend(Date.now() + 60_000);
      setNote('If an account matches this email, a recovery code will arrive. Check your inbox and spam folder.');
    } catch (error) { setNote(error instanceof Error ? error.message : 'The recovery request could not be completed.'); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    if (password !== confirm) { setNote('The two passwords must match.'); return; }
    setBusy(true); setNote('');
    try {
      const result = await services.auth.resetPassword!(email, code, password); setDone(true); setCode(''); setPassword(''); setConfirm('');
      setNote(result.sessionsRevoked ? 'Password changed. Sign in with your new password.' : 'Password changed. Sign-out on other devices could not be confirmed.');
    } catch (error) { setNote(error instanceof Error ? error.message : 'Password recovery could not be completed.'); }
    finally { setBusy(false); }
  };
  const input = 'h-14 rounded-2xl border border-line bg-card px-4 text-fg';
  return <View className="flex-1 bg-bg"><NavHeader title="Recover your account" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 80, gap: 16 }}>
      {!enabled ? <Text>Password recovery is unavailable in this release. Use Support for account help.</Text> : done ? <>
        <Text>{note}</Text><Button title="Return to sign in" onPress={() => router.replace('/sign-in')} />
      </> : <>
        <Text>Request a recovery code, then enter it here with your new password.</Text>
        <TextInput accessibilityLabel="Account email" placeholder="Account email" value={email} onChangeText={setEmail} editable={!sent && !busy} autoCapitalize="none" keyboardType="email-address" autoComplete="email" className={input} />
        {sent ? <>
          <TextInput accessibilityLabel="Recovery code" placeholder="Six-digit recovery code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" className={input} />
          <TextInput accessibilityLabel="New password" placeholder="New password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" className={input} />
          <TextInput accessibilityLabel="Confirm new password" placeholder="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" className={input} />
          <Button title="Change password" loading={busy} disabled={busy || code.length !== 6 || password.length < 8 || !confirm} onPress={reset} />
          <Button title="Send another code" variant="secondary" disabled={busy} onPress={request} />
        </> : <Button title="Send recovery code" loading={busy} disabled={busy || !email.includes('@')} onPress={request} />}
        {note ? <Text variant="footnote" tone="muted">{note}</Text> : null}
      </>}
      <LegalLinks />
    </ScrollView>
  </View>;
}
