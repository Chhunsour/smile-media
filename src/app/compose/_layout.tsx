import { Stack } from 'expo-router';

import { useColors } from '@/lib/theme';

export default function ComposeLayout() {
  const c = useColors();
  const sheet = (detent: number) => ({
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [detent],
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: c.bg },
  });
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="review" />
      <Stack.Screen name="accounts" options={sheet(0.9)} />
      <Stack.Screen name="media" options={sheet(0.9)} />
      <Stack.Screen name="ai" options={sheet(0.75)} />
      <Stack.Screen name="schedule" options={sheet(0.8)} />
    </Stack>
  );
}
