import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Glow, Gradient, GradientText, Icon, PlatformIcon, Press, Text } from '@/components/ui';
import { APP_NAME } from '@/config/app';
import { signIn, signInWith, signUp } from '@/lib/store';
import { BRAND, useColors, useScheme } from '@/lib/theme';
import { PLATFORM_ORDER } from '@/platforms';
import { services } from '@/services';

export default function SignIn() {
  const c = useColors();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  // Always offered on iOS (App Review expects it next to Google). Expo Go lacks the native module, so it explains instead.
  const apple = Platform.OS === 'ios' && !!services.auth.signInWith;
  const [appleReady, setAppleReady] = useState(false);
  useEffect(() => {
    if (apple) AppleAuthentication.isAvailableAsync().then(setAppleReady, () => setAppleReady(false));
  }, [apple]);
  const [email, setEmailOpen] = useState(!services.auth.signInWith);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  const fail = (e: unknown) => setNote({ text: e instanceof Error ? e.message : 'Something went wrong.', error: true });

  const submit = async () => {
    setBusy(true);
    setNote(null);
    try {
      if (mode === 'in') await signIn(address, password);
      else if (!(await signUp(name, address, password))) {
        setMode('in');
        setNote({ text: 'Check your inbox to confirm your email, then sign in.', error: false });
      }
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  };

  const social = async (provider: 'apple' | 'google') => {
    if (provider === 'apple' && !appleReady) {
      return setNote({ text: 'Sign in with Apple works in the installed app (Xcode or TestFlight build), not in Expo Go.', error: false });
    }
    setNote(null);
    try {
      await signInWith(provider);
    } catch (e) {
      fail(e);
    }
  };

  const field = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      placeholderTextColor={c.subtle}
      selectionColor={c.accent}
      autoCapitalize="none"
      autoCorrect={false}
      className="h-14 rounded-2xl border border-line bg-card px-4 text-[17px] text-fg"
      {...props}
    />
  );

  const ready = address.includes('@') && password.length >= 6 && (mode === 'in' || name.trim());

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-bg">
      <Glow height={640} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-grow justify-between px-6"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
        <Animated.View layout={LinearTransition.duration(260)} style={{ alignItems: 'center' }}>
          {email ? <Mark size={64} /> : <Orbit />}
          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ alignItems: 'center', marginTop: email ? 24 : 8 }}>
            {email ? (
              <Text variant="hero" className="text-center">
                {mode === 'in' ? 'Welcome back' : 'Create your account'}
              </Text>
            ) : (
              <>
                <Text variant="hero" className="text-center">
                  One post.
                </Text>
                <GradientText variant="hero" className="text-center">
                  Every platform.
                </GradientText>
              </>
            )}
            <Text variant="callout" tone="muted" className="mt-3 max-w-[300px] text-center">
              {email
                ? `${mode === 'in' ? 'Sign in' : 'Sign up'} to ${APP_NAME} with your email.`
                : 'Write it once, publish it everywhere — or schedule it for the perfect moment.'}
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(500)} layout={LinearTransition.duration(260)} style={{ gap: 12, marginTop: 32 }}>
          {email ? (
            <Animated.View entering={FadeIn.duration(220)} style={{ gap: 12 }}>
              {mode === 'up'
                ? field({ value: name, onChangeText: setName, placeholder: 'Your name', autoCapitalize: 'words', textContentType: 'name' })
                : null}
              {field({
                value: address,
                onChangeText: setAddress,
                placeholder: 'Email',
                keyboardType: 'email-address',
                textContentType: 'emailAddress',
                autoComplete: 'email',
                autoFocus: !!services.auth.signInWith,
              })}
              {field({
                value: password,
                onChangeText: setPassword,
                placeholder: 'Password (6+ characters)',
                secureTextEntry: true,
                textContentType: mode === 'in' ? 'password' : 'newPassword',
                onSubmitEditing: () => ready && submit(),
              })}
              <Button title={mode === 'in' ? 'Sign in' : 'Create account'} loading={busy} disabled={!ready} onPress={submit} className="mt-1" />
              <View className="flex-row items-center justify-center gap-1 py-1">
                <Text variant="footnote" tone="muted">
                  {mode === 'in' ? 'New here?' : 'Have an account?'}
                </Text>
                <Press onPress={() => setMode(mode === 'in' ? 'up' : 'in')} hitSlop={8}>
                  <Text variant="footnote" tone="accent" className="font-semibold">
                    {mode === 'in' ? 'Create an account' : 'Sign in'}
                  </Text>
                </Press>
              </View>
            </Animated.View>
          ) : (
            <>
              {apple ? (
                <Press
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  onPress={() => social('apple')}
                  className={`h-[54px] flex-row items-center justify-center gap-2 rounded-full ${scheme === 'dark' ? 'bg-white' : 'bg-black'}`}>
                  <Ionicons name="logo-apple" size={21} color={scheme === 'dark' ? '#000' : '#fff'} style={{ marginTop: -2 }} />
                  <Text variant="callout" className="font-semibold" style={{ color: scheme === 'dark' ? '#000' : '#fff' }}>
                    Continue with Apple
                  </Text>
                </Press>
              ) : null}
              <Press
                accessibilityRole="button"
                onPress={() => social('google')}
                className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-full border border-line bg-card">
                <Icon name="logo-google" size={18} />
                <Text variant="callout" className="font-semibold">
                  Continue with Google
                </Text>
              </Press>
              <Press
                accessibilityRole="button"
                onPress={() => setEmailOpen(true)}
                className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-full">
                <Icon name="mail-outline" size={18} tone="muted" />
                <Text variant="callout" tone="muted" className="font-semibold">
                  Continue with email
                </Text>
              </Press>
            </>
          )}

          {note ? (
            <Text variant="footnote" tone={note.error ? 'danger' : 'muted'} className="text-center">
              {note.text}
            </Text>
          ) : null}

          {email && services.auth.signInWith ? (
            <Press onPress={() => setEmailOpen(false)} className="flex-row items-center justify-center gap-1 py-2" hitSlop={8}>
              <Icon name="chevron-back" size={14} tone="subtle" />
              <Text variant="footnote" tone="subtle" className="font-semibold">
                Other ways to continue
              </Text>
            </Press>
          ) : email ? null : (
            <Text variant="caption" tone="subtle" className="mt-1 text-center">
              New or returning — one tap signs you in or creates your account.
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** The app mark: gradient tile with a paper plane and a soft brand glow. */
function Mark({ size }: { size: number }) {
  return (
    <Gradient
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: BRAND[1],
        shadowOpacity: 0.6,
        shadowRadius: size * 0.4,
        shadowOffset: { width: 0, height: size * 0.15 },
      }}>
      <Icon name="paper-plane" size={size * 0.46} tone="white" />
    </Gradient>
  );
}

const SIZE = 280;
const RADIUS = 112;
const TILE = 46;

/** Every platform slowly circling the mark: "one post, everywhere" as a picture. Respects Reduce Motion. */
function Orbit() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false));
  }, [spin]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  // Counter-rotate each tile so the logos stay upright.
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.get() * 360}deg` }] }));

  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <View className="absolute rounded-full border border-line" style={{ width: RADIUS * 2, height: RADIUS * 2 }} />
      <View className="absolute rounded-full border border-dashed border-line" style={{ width: RADIUS * 1.3, height: RADIUS * 1.3 }} />
      <Animated.View style={[{ position: 'absolute', width: SIZE, height: SIZE }, ring]}>
        {PLATFORM_ORDER.map((p, i) => {
          const a = (i / PLATFORM_ORDER.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <Animated.View
              key={p}
              style={[
                {
                  position: 'absolute',
                  left: SIZE / 2 + RADIUS * Math.cos(a) - TILE / 2,
                  top: SIZE / 2 + RADIUS * Math.sin(a) - TILE / 2,
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                },
                upright,
              ]}>
              <PlatformIcon platform={p} size={TILE} radius={15} />
            </Animated.View>
          );
        })}
      </Animated.View>
      <Mark size={84} />
    </Animated.View>
  );
}
