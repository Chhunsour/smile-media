import '@/global.css';

import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toaster } from '@/components/ui';
import { bootstrap, useStore } from '@/lib/store';
import { palette, themeVars, useScheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useSyncExternalStore(useStore.persist.onFinishHydration, useStore.persist.hasHydrated);
  const [fontsLoaded] = useFonts({ Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold });
  const user = useStore((s) => s.user);
  const ready = hydrated && fontsLoaded && user !== undefined;
  const theme = useStore((s) => s.settings.theme);
  const scheme = useScheme();
  const c = palette[scheme];

  useEffect(() => {
    colorScheme.set(theme);
  }, [theme]);

  useEffect(() => {
    if (hydrated) bootstrap();
  }, [hydrated]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const nav = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={{
          ...nav,
          colors: { ...nav.colors, background: c.bg, card: c.card, text: c.fg, border: c.line, primary: c.accent },
        }}>
        <View style={themeVars[scheme]} className="flex-1">
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Protected guard={!!user}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="compose" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen
                name="publishing/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.7],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 28,
                }}
              />
              <Stack.Screen name="connections" />
              <Stack.Screen name="insights" />
              <Stack.Screen
                name="templates"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.85],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 28,
                }}
              />
              <Stack.Screen name="post/[id]" />
              <Stack.Screen name="oauth/callback" />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
          <Toaster />
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
