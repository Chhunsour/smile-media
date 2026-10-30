import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { decryptBackup, sha256 } from './migration-backup.mjs';

let stage='load';
const tableNames=['social_accounts','social_pages','social_tokens','oauth_states','posts'];
export async function legacyDatabase(snapshot) {
 stage='bootstrap';
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,storage,public to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid,bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`);
 for(const id of snapshot.auth_user_ids)await db.query('insert into auth.users(id) values($1)',[id]);
 const initial=(await readFile('supabase/migrations/20261007000000_init.sql','utf8')).split('-- Scheduler:')[0].replace(/create extension if not exists pg_(cron|net);/g,'');
 await db.exec(initial);
 await db.exec(await readFile('supabase/migrations/20261007000100_media_upsert.sql','utf8'));
 stage='restore-rows';
 for(const table of tableNames)await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(snapshot.tables[table])]);
 await db.query("update storage.buckets set public=$1 where id='media'",[snapshot.media_public]);
 return db;
}
const restoredData=async db=>Object.fromEntries(await Promise.all(tableNames.map(async table=>{
 const {rows}=await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by ${table==='oauth_states'?'state':'id'}),'[]') data from public.${table} t`);
 return [table,rows[0].data.sort((a,b)=>{const key=table==='oauth_states'?'state':'id';return a[key]<b[key]?-1:a[key]>b[key]?1:0;})];
})));
export async function rehearse(snapshot) {
 // PostgreSQL collation differs between the hosted cluster and embedded test engine.
 snapshot = {...snapshot,tables:Object.fromEntries(Object.entries(snapshot.tables).map(([name,rows])=>[name,[...rows].sort((a,b)=>{const key=name==='oauth_states'?'state':'id';return a[key]<b[key]?-1:a[key]>b[key]?1:0;})]))};
 const db=await legacyDatabase(snapshot);
 try {
  stage='compare-restored-rows';
  assert.deepEqual(await restoredData(db),snapshot.tables,'Application data did not restore exactly');
  const baseline=await restoredData(db),migration=await readFile('supabase/migrations/20261030094002_security_isolation_oauth.sql','utf8');
  stage='maintenance-freeze';
  await db.exec('grant select,insert,update,delete on public.posts to authenticated');
  await db.exec(await readFile('scripts/release-freeze.sql','utf8'));
  if(snapshot.auth_user_ids.length) {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[snapshot.auth_user_ids[0]]);
    await db.exec('set role authenticated');
    try {
      assert.equal((await db.query('select count(*)::integer n from public.posts')).rows[0].n,0);
      await assert.rejects(db.query("insert into public.posts(id,user_id,data,status) values('freeze-probe',$1,'{}','draft')",[snapshot.auth_user_ids[0]]),/row-level security/);
    } finally {await db.exec('reset role');}
  }
  stage='transactional-rollback';
  await db.exec(`begin;${migration}rollback;`);
  assert.deepEqual(await restoredData(db),baseline,'Transactional rollback changed original data');
  stage='apply-local-migration';
  await db.exec(`begin;${migration}commit;`);
  const counts={};
  for(const table of tableNames){const r=await db.query(`select count(*)::integer n from public.${table}`);counts[table]=r.rows[0].n;}
  assert.equal(counts.social_accounts,snapshot.tables.social_accounts.length);
  assert.equal(counts.social_pages,snapshot.tables.social_pages.length);
  assert.equal(counts.posts,snapshot.tables.posts.length);
  assert.equal(counts.social_tokens,0);assert.equal(counts.oauth_states,0);
  const bad=await db.query('select count(*)::integer n from public.social_pages p join public.social_accounts a on a.id=p.account_id where p.user_id<>a.user_id or p.organization_id<>a.organization_id');assert.equal(bad.rows[0].n,0);
  stage='verify-remapped-destinations';
  const original=Object.fromEntries(snapshot.tables.social_pages.map(p=>[`${p.user_id}:${p.id}`,p]));
  const migrated=(await db.query('select data,user_id from public.posts')).rows;
  let verifiedDestinations=0,missingLegacyDestinations=0;
  for(const before of snapshot.tables.posts){
   const after=migrated.find(p=>p.user_id===before.user_id&&p.data.id===before.data.id);
   assert(after,'A saved post disappeared');
   for(const old of before.data.destinations??[]){
    const page=original[`${before.user_id}:${old.pageId}`];
    if(!page){missingLegacyDestinations++;continue;}
    const account=snapshot.tables.social_accounts.find(a=>a.id===page.account_id);
    const external=account.id.slice(account.id.indexOf(':')+1),expected=`${before.user_id}:${account.platform}:${external}:${page.external_id}`;
    assert(after.data.destinations.some(d=>d.pageId===expected),'Destination remapping failed');verifiedDestinations++;
   }
  }
  stage='maintenance-thaw';
  await db.exec(await readFile('scripts/release-thaw.sql','utf8'));
  assert.equal((await db.query("select count(*)::integer n from pg_policies where policyname='multipostly_release_freeze'")).rows[0].n,0);
  const restored=await legacyDatabase(snapshot);
  try{assert.deepEqual(await restoredData(restored),baseline,'Post-migration recovery restore changed data');}finally{await restored.close();}
  for(const media of snapshot.media_files)assert.equal(sha256(Buffer.from(media.base64,'base64')),media.sha256);
  return {restoredApplicationTables:5,maintenanceFreezeThaw:'passed',transactionalRollback:'passed',freshDatabaseRestore:'passed',migration:'passed',countsAfterMigration:counts,verifiedDestinations,missingLegacyDestinations,mediaChecksumsVerified:snapshot.media_files.length,scope:'PostgreSQL engine rehearsal with Auth/Storage schema stubs; no hosted Auth/Vault/cron or object-store restore was performed'};
 }finally{await db.close();}
}
export async function verifyManifest(path) {
 const manifest=JSON.parse(await readFile(path,'utf8'));
 for(const file of [manifest.backupPath,manifest.keyPath])if(((await stat(file)).mode&0o077)!==0)throw new Error('Backup permissions are too broad');
 const bytes=await readFile(manifest.backupPath);assert.equal(sha256(bytes),manifest.encryptedSha256);
 const snapshot=decryptBackup(bytes,await readFile(manifest.keyPath));
 assert.equal(snapshot.project,'pdecqyjanliqocfigkvd');
 return {backupSha256Verified:true,...await rehearse(snapshot)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))verifyManifest(process.argv[2]).then(r=>console.log(JSON.stringify(r,null,2))).catch(error=>{console.error(`Migration rehearsal failed at ${stage} (${error.code||error.name}). Private rows and credentials were not printed.`);process.exitCode=1;});
