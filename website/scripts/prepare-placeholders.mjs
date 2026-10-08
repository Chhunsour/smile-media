import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[...['home','compose','publishing','connections','insights','templates','calendar','posts'].map(name=>`/screens/${name}.webp`),...['creator-camera','vlogger','musician','creator-team','podcaster','travel-creator'].map(name=>`/images/${name}.avif`),'/images/creator-hands.webp'];
const entries=await Promise.all(files.map(async file=>[file,`data:image/webp;base64,${(await sharp(path.join(root,'public',file)).resize({width:24}).webp({quality:45}).toBuffer()).toString('base64')}`]));
await writeFile(path.join(root,'src/lib/image-placeholders.json'),JSON.stringify(Object.fromEntries(entries),null,2)+'\n');
console.log('Prepared small inline first-paint placeholders for every phone and hero photo.');
