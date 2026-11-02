import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { encryptBackup, decryptBackup } from '../scripts/migration-backup.mjs';

const require=createRequire(resolve('package.json'));
const config=require('./app.config.js');
const base=JSON.parse(readFileSync('app.json','utf8')).expo;

test('demo configuration rejects privileged keys even when its live provider is unused',()=>{
 const previousMode=process.env.EXPO_PUBLIC_APP_MODE,previousKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
 try {
  process.env.EXPO_PUBLIC_APP_MODE='demo';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY=`e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.private-test`;
  assert.throws(()=>config({config:base}),/Only a publishable or anon key/);
 } finally {
  if(previousMode===undefined)delete process.env.EXPO_PUBLIC_APP_MODE;else process.env.EXPO_PUBLIC_APP_MODE=previousMode;
  if(previousKey===undefined)delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY=previousKey;
 }
});
test('candidate exporter refuses secret fields and privileged values before building or printing them',async()=>{
 const root=await mkdtemp(resolve(tmpdir(),'multipostly-export-'));
 try {
  for(const content of ['TOKEN_ENCRYPTION_KEY=private-test-value',`EXPO_PUBLIC_SUPABASE_ANON_KEY=e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.private-test-value`]) {
   const file=resolve(root,'config.env');await writeFile(file,content);
   const result=spawnSync(process.execPath,['scripts/export-candidate.mjs','demo',resolve(root,'work/output'),'web',file],{encoding:'utf8'});
   assert.equal(result.status,1);assert(!`${result.stdout}${result.stderr}`.includes('private-test-value'));
  }
 } finally {await rm(root,{recursive:true,force:true});}
});
test('candidate exporter preserves existing build evidence',async()=>{
 const root=await mkdtemp(resolve(tmpdir(),'multipostly-export-'));
 try {
  const output=resolve(root,'work/output');await mkdir(output,{recursive:true});await writeFile(resolve(output,'evidence.txt'),'preserve');
  const result=spawnSync(process.execPath,['scripts/export-candidate.mjs','demo',output,'web'],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/previous evidence is preserved/);
  assert.equal(await readFile(resolve(output,'evidence.txt'),'utf8'),'preserve');
 } finally {await rm(root,{recursive:true,force:true});}
});

test('encrypted migration backups reject tampering and wrong keys',()=>{
 const key=randomBytes(32),fixture={project:'pdecqyjanliqocfigkvd',tables:{social_tokens:[{access_token:'private-test-token'}]}};
 const encrypted=encryptBackup(fixture,key);
 assert(!encrypted.toString().includes('private-test-token'));
 assert.deepEqual(decryptBackup(encrypted,key),fixture);
 const changed=Buffer.from(encrypted);changed[changed.length-1]^=1;
 assert.throws(()=>decryptBackup(changed,key));assert.throws(()=>decryptBackup(encrypted,randomBytes(32)));
});
test('device configuration preserves existing IDs and schemes',()=>{
 delete process.env.EXPO_PUBLIC_APP_MODE;
 const result=config({config:base});
 assert.equal(result.ios.bundleIdentifier,'com.chhunsour.outpost');
 assert.equal(result.android.package,result.ios.bundleIdentifier);
 assert.deepEqual(result.scheme,['outpost','multipostly']);
 assert(result.plugins.some(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-dev-client'));
});
test('live build configuration rejects missing keys, another project and privileged keys',()=>{
 const old={...process.env};
 try {
  process.env.EXPO_PUBLIC_APP_MODE='live';process.env.EXPO_PUBLIC_SUPABASE_URL='https://pdecqyjanliqocfigkvd.supabase.co';
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;assert.throws(()=>config({config:base}));
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY=`e30.${Buffer.from('{"role":"service_role"}').toString('base64url')}.test`;
  assert.throws(()=>config({config:base}));
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_test';process.env.EXPO_PUBLIC_SUPABASE_URL='https://rcfpzphrdjlekldfcjlk.supabase.co';
  assert.throws(()=>config({config:base}));
  process.env.EXPO_PUBLIC_SUPABASE_URL='https://pdecqyjanliqocfigkvd.supabase.co';assert(config({config:base}));
 } finally {for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});
test('demo device builds cannot silently become live and EAS excludes server/private files',async()=>{
 const eas=JSON.parse(await readFile('eas.json','utf8')),ignore=await readFile('.easignore','utf8');
 assert.equal(eas.build['preview-demo'].env.EXPO_PUBLIC_APP_MODE,'demo');
 assert.equal(eas.build.development.env.EXPO_PUBLIC_APP_MODE,'demo');
 assert.equal(eas.build['preview-live'].env.EXPO_PUBLIC_APP_MODE,'live');
 for(const rule of ['.env*','supabase/','scripts/','work/','*.mpb','*.key'])assert(ignore.split('\n').includes(rule));
});
