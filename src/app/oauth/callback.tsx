import { Redirect } from 'expo-router';

// OAuth redirects land here; the auth session in services/supabase.ts already handled the result.
export default function OAuthCallback() {
  return <Redirect href="/connections" />;
}
