import { readFile, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

// Local artifacts only. Explicit mode/public config and a cold cache prevent a
// prior demo transform from being mistaken for a live candidate (or vice versa).
const [mode, destination, platform = 'all', configFile] = process.argv.slice(2);
const supported = new Set(['EXPO_PUBLIC_APP_MODE', 'EXPO_PUBLIC_APP_NAME', 'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED',
  'EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED', 'EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED', 'EXPO_PUBLIC_AI_ENABLED']);
try {
  if (!['demo', 'live'].includes(mode) || !destination || !['all', 'web', 'ios', 'android'].includes(platform)) throw new Error('Usage: npm run export:candidate -- <demo|live> <new-work-directory> [all|web|ios|android] [public-mobile-env-file]');
  const output = resolve(destination);
  if (!output.includes('/work/')) throw new Error('Use a new directory under work/ for local export evidence.');
  let exists = false;
  try { await access(output); exists = true; } catch { /* New output required. */ }
  if (exists) throw new Error('Choose a new output directory; previous evidence is preserved.');
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) if (key.startsWith('EXPO_PUBLIC_')) delete environment[key];
  if (configFile) {
    for (const source of (await readFile(resolve(configFile), 'utf8')).split('\n')) {
      const line = source.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || !supported.has(match[1])) throw new Error('Candidate configuration must contain only supported public client fields; server secrets are not accepted.');
      environment[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  environment.EXPO_NO_DOTENV = '1';
  environment.EXPO_PUBLIC_APP_MODE = mode;
  environment.EXPO_PUBLIC_APP_NAME ||= 'MultiPostly';
  const key = environment.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (key && !key.startsWith('sb_publishable_')) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* invalid public key */ }
    if (role !== 'anon') throw new Error('Server keys are not accepted in any candidate mode.');
  }
  for (const key of ['EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED', 'EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED', 'EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED', 'EXPO_PUBLIC_AI_ENABLED']) environment[key] ||= 'false';
  if (mode === 'live' && (environment.EXPO_PUBLIC_SUPABASE_URL !== 'https://pdecqyjanliqocfigkvd.supabase.co' || !environment.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))) throw new Error('Live export requires the approved project URL and public publishable key in its client configuration.');
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'export', '--clear', '--platform', platform, '--output-dir', output], { env: environment, stdio: 'inherit' });
  const code = await new Promise((done, fail) => { child.once('error', fail); child.once('exit', done); });
  if (code !== 0) throw new Error('Candidate export failed; inspect the local build log.');
  await writeFile(resolve(output, 'candidate-build.json'), JSON.stringify({ requestedMode: mode, platform, coldCache: true, localArtifactOnly: true,
    createdAt: new Date().toISOString(), note: 'Validate the rendered mode and actual device/permissions before review or distribution.' }, null, 2) + '\n');
  console.log(`Exported local ${mode} candidate with a cleared cache. No configuration values were printed by this script.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Candidate export failed.');
  process.exitCode = 1;
}
