// Expo supplies app.json as config, preserving the existing iOS identity and URL schemes.
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_APP_MODE === 'live') {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    const ref = process.env.MULTIPOSTLY_TEST_PROJECT_REF || 'pdecqyjanliqocfigkvd';
    if (url !== `https://${ref}.supabase.co` || !key) throw new Error('Live builds require the explicitly selected MultiPostly project and its public key.');
    if (!key.startsWith('sb_publishable_')) {
      let role;
      try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* invalid public key */ }
      if (role !== 'anon') throw new Error('Only a publishable or anon key can be included in the app.');
    }
  }
  return {
    ...config,
    plugins: [...(config.plugins || []), ['expo-dev-client', { launchMode: 'launcher' }]],
    android: { ...config.android, package: process.env.MULTIPOSTLY_ANDROID_PACKAGE || config.ios.bundleIdentifier },
  };
};
