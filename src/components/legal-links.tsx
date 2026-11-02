import * as Linking from 'expo-linking';
import { Alert, View } from 'react-native';
import { Press, Text } from '@/components/ui';
import { POLICY_LINKS } from '@/config/legal';

export function openPolicy(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('Page unavailable', `Please open ${url} in your browser.`));
}
export function LegalLinks() {
  return <View className="mt-5 flex-row flex-wrap justify-center gap-x-4 gap-y-3">
    {([['Privacy', POLICY_LINKS.privacy], ['Terms', POLICY_LINKS.terms], ['Data deletion', POLICY_LINKS.deletion], ['Support', POLICY_LINKS.support]] as const).map(([label, url]) =>
      <Press key={label} accessibilityRole="link" accessibilityLabel={label} onPress={() => openPolicy(url)} hitSlop={8}>
        <Text variant="caption" tone="muted" className="underline">{label}</Text>
      </Press>
    )}
  </View>;
}
