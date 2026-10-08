import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/images");
export const photographs = {
  vlogger: "1758272421492-1efdb36a441f",
  podcaster: "1655947717064-d856af599bd1",
  "food-creator": "1556910103-1c02745aae4d",
  musician: "1593697821252-0c9137d9fc45",
  "shop-owner": "1556742049-0cfed4f6a45d",
  "travel-creator": "1537430802614-118bf14be50c",
  "creator-team": "1522071820081-009f0129c71c",
  "avatar-creator": "1534528741775-53994a69daeb",
  "avatar-studio": "1506794778202-cad84cf45f1d",
  "avatar-business": "1531123897727-8f129e1688ce",
};
await Promise.all(Object.entries(photographs).map(async ([name, id]) => {
  const response = await fetch(`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${name.startsWith("avatar") ? 360 : 1400}&q=85`);
  if (!response.ok) throw new Error(`Photography ${name}: ${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(directory, `${name}.jpg`), original);
  await sharp(original).resize(name.startsWith("avatar") ? { width:180,height:180,fit:"cover" } : { width:1100,withoutEnlargement:true }).webp({quality:78}).toFile(path.join(directory, `${name}.webp`));
  console.log(`Prepared ${name}`);
}));
