import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function encryptBackup(value, key) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
  return Buffer.concat([Buffer.from('MPB1'),iv,cipher.getAuthTag(),ciphertext]);
}
export function decryptBackup(envelope,key) {
  if(envelope.subarray(0,4).toString()!=='MPB1') throw new Error('Invalid backup format');
  const decipher=createDecipheriv('aes-256-gcm',key,envelope.subarray(4,16));
  decipher.setAuthTag(envelope.subarray(16,32));
  return JSON.parse(Buffer.concat([decipher.update(envelope.subarray(32)),decipher.final()]).toString());
}
export async function captureBackup(destination) {
  const dir=resolve(destination);
  if(dir.startsWith(resolve('outputs'))||!dir.includes('/work/'))throw new Error('Choose a private work directory');
  await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
  const readSnapshot = async () => {
    const {stdout}=await exec('supabase',['db','query','--linked','--project-ref','pdecqyjanliqocfigkvd','--file','scripts/migration-backup.sql','--output-format','json'],{maxBuffer:64*1024*1024});
    return JSON.parse(stdout).rows?.[0]?.snapshot;
  };
  const snapshot=await readSnapshot();
  if(snapshot?.project!=='pdecqyjanliqocfigkvd')throw new Error('Wrong backup project');
  if(snapshot.migrations.some(m=>m.version==='20261030094002'))throw new Error('The migration is already applied; re-audit required');
  snapshot.media_files=[];
  // The live bucket must be public for this read-only capture. Never switch its visibility here.
  if(snapshot.storage.objects.length && !snapshot.media_public)throw new Error('Private media requires an approved authenticated backup transport');
  for(const object of snapshot.storage.objects) {
    const url=`https://pdecqyjanliqocfigkvd.supabase.co/storage/v1/object/public/media/${object.name.split('/').map(encodeURIComponent).join('/')}`;
    const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw new Error('A media object could not be backed up');
    const bytes=Buffer.from(await res.arrayBuffer());
    const expected=object.metadata?.size;
    if(typeof expected==='number'&&expected!==bytes.length)throw new Error('Media size verification failed');
    snapshot.media_files.push({name:object.name,sha256:sha256(bytes),size:bytes.length,base64:bytes.toString('base64')});
  }
  // Object downloads cannot share the SQL snapshot. Reject captures whose application
  // rows or object metadata changed during the download window. Deployment still needs a write freeze.
  const rechecked=await readSnapshot();
  for(const field of ['auth_user_ids','tables','storage','migrations','media_public']) {
    if(JSON.stringify(snapshot[field])!==JSON.stringify(rechecked?.[field]))throw new Error('Data changed during backup; freeze writes and retry');
  }
  const key=randomBytes(32),name=`migration-${new Date().toISOString().replace(/[:.]/g,'-')}`;
  const keyPath=resolve(dir,`${name}.key`),backupPath=resolve(dir,`${name}.mpb`);
  const envelope=encryptBackup(snapshot,key);
  await writeFile(keyPath,key,{mode:0o600,flag:'wx'});
  await writeFile(backupPath,envelope,{mode:0o600,flag:'wx'});
  const manifest={format:'MPB1',project:snapshot.project,capturedAt:snapshot.captured_at,recheckedAt:rechecked.captured_at,stableDuringCapture:true,backupPath,keyPath,encryptedSha256:sha256(envelope),counts:Object.fromEntries(Object.entries(snapshot.tables).map(([k,v])=>[k,v.length])),authUserIds:snapshot.auth_user_ids.length,mediaObjects:snapshot.media_files.length,mediaBytes:snapshot.media_files.reduce((n,f)=>n+f.size,0),scope:'migration-affected application data, public media objects and schema metadata; not a complete Auth/Vault/platform disaster-recovery backup'};
  const roundTrip=decryptBackup(await readFile(backupPath),await readFile(keyPath));
  if(JSON.stringify(roundTrip)!==JSON.stringify(snapshot))throw new Error('Backup round-trip failed');
  for(const file of roundTrip.media_files)if(sha256(Buffer.from(file.base64,'base64'))!==file.sha256)throw new Error('Media checksum failed');
  await writeFile(resolve(dir,`${name}.manifest.json`),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv[2]){console.error('Usage: node scripts/migration-backup.mjs <private-work-directory>');process.exitCode=1;}
  else captureBackup(process.argv[2]).then(m=>console.log(JSON.stringify(m,null,2))).catch(()=>{console.error('Backup failed. No credentials or private rows were printed. Inspect transport/configuration and retry with a new destination.');process.exitCode=1;});
}
