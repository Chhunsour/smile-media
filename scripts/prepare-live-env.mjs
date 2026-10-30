import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';

// Writes only local candidates. It never calls secrets set, deploy or any mutation API.
const dir=resolve(process.argv[2]||'');
try {
 if(!dir.includes('/work/')||!process.argv[2])throw new Error('Private directory required');
 await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
 const {stdout}=await promisify(execFile)('supabase',['projects','api-keys','--project-ref','pdecqyjanliqocfigkvd','--output-format','json'],{maxBuffer:1024*1024});
 const keys=JSON.parse(stdout).keys;
 const key=keys.find(k=>k.type==='publishable'&&k.api_key?.startsWith('sb_publishable_'))?.api_key;
 if(!key)throw new Error('No publishable key found');
 await writeFile(resolve(dir,'mobile.env'),`EXPO_PUBLIC_APP_MODE=live\nEXPO_PUBLIC_APP_NAME=MultiPostly\nEXPO_PUBLIC_SUPABASE_URL=https://pdecqyjanliqocfigkvd.supabase.co\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${key}\n`,{mode:0o600,flag:'wx'});
 await writeFile(resolve(dir,'server-additions.env'),`TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\nPUBLIC_API_URL=https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api\nOAUTH_REDIRECT_ALLOWLIST=outpost://oauth/callback,multipostly://oauth/callback\nWEB_ORIGIN_ALLOWLIST=\nMAINTENANCE_MODE=true\n`,{mode:0o600,flag:'wx'});
 console.log('Prepared private mobile.env and server-additions.env. Existing Meta/cron secrets were not read, changed or rotated. Candidate values were not printed.');
} catch {
 console.error('Environment preparation stopped. Use a new private work directory and verify CLI access. No credential values were printed.');process.exitCode=1;
}
