import sharp from "sharp";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const images = path.join(root, "public/images");
for (const name of await readdir(images)) {
  if (!name.endsWith(".jpg")) continue;
  const avatar=name.startsWith("avatar-");
  await sharp(path.join(images, name)).resize(avatar ? {width:180,height:180,fit:"cover"} : { width: name === "studio.jpg" ? 1400 : 1100, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(images, name.replace(".jpg", ".webp")));
  if (["creator-camera", "vlogger", "musician", "creator-team", "podcaster", "travel-creator"].includes(name.replace(".jpg", ""))) {
    await sharp(path.join(images, name)).resize({width:1100,withoutEnlargement:true}).avif({quality:50,effort:4}).toFile(path.join(images, name.replace(".jpg", ".avif")));
  }
}
await sharp(path.join(images, "logo.png")).resize(128,128).webp({ quality: 90 }).toFile(path.join(images, "logo.webp"));
for (const size of [192, 512]) await sharp(path.join(images, "logo.png")).resize(size, size).png().toFile(path.join(root, `public/icon-${size}.png`));
await sharp(path.join(images, "logo.png")).resize(180, 180).png().toFile(path.join(root, "public/apple-touch-icon.png"));
const png = await sharp(path.join(images, "logo.png")).resize(32,32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1,2); header.writeUInt16LE(1,4); header[6]=32; header[7]=32;
header.writeUInt16LE(1,10); header.writeUInt16LE(32,12); header.writeUInt32LE(png.length,14); header.writeUInt32LE(22,18);
await writeFile(path.join(root,"public/favicon.ico"), Buffer.concat([header,png]));
for (const name of await readdir(path.join(root,"public/screens"))) {
  if (!name.endsWith(".png")) continue;
  await sharp(path.join(root,"public/screens",name)).resize(780,1688,{fit:"fill"}).webp({quality:82}).toFile(path.join(root,"public/screens",name.replace(".png",".webp")));
  for (const width of [390,480]) await sharp(path.join(root,"public/screens",name)).resize(width,Math.round(width*844/390),{fit:"fill"}).webp({quality:82}).toFile(path.join(root,"public/screens",name.replace(".png",`-${width}.webp`)));
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="brand"><stop stop-color="#ffad42"/><stop offset=".5" stop-color="#ff7048"/><stop offset="1" stop-color="#fa3788"/></linearGradient><radialGradient id="glow"><stop stop-color="#fc50754d"/><stop offset="1" stop-color="#111115"/></radialGradient></defs><rect width="1200" height="630" fill="#111115"/><circle cx="990" cy="300" r="390" fill="url(#glow)"/><circle cx="1030" cy="360" r="210" fill="none" stroke="#fc848133"/><circle cx="1030" cy="360" r="290" fill="none" stroke="#fc848119"/><text x="125" y="85" fill="#f9f8f6" font-family="sans-serif" font-size="27" font-weight="bold">MultiPostly</text><text x="65" y="234" fill="#f9f8f6" font-family="sans-serif" font-size="77" font-weight="bold" letter-spacing="-4">Create once.</text><text x="65" y="322" fill="#f9f8f6" font-family="sans-serif" font-size="77" font-weight="bold" letter-spacing="-4">Show up</text><text x="65" y="410" fill="url(#brand)" font-family="sans-serif" font-size="77" font-weight="bold" letter-spacing="-4">everywhere.</text><text x="68" y="479" fill="#b3b1bc" font-family="sans-serif" font-size="20">Six platforms. One beautifully simple app.</text><rect x="65" y="530" width="192" height="43" rx="22" fill="url(#brand)"/><text x="93" y="558" fill="#211317" font-family="sans-serif" font-size="16" font-weight="bold">multipostly.app</text></svg>`;
const logo = await sharp(path.join(images,"logo.png")).resize(42,42).toBuffer();
const composites = [{input:logo,left:65,top:52}];
const files = await readdir(path.join(root,"public/screens"));
if(files.includes("compose.webp")) {
  const frame = await sharp({create:{width:260,height:550,channels:4,background:"#5f5b66"}}).png().composite([{input:await sharp(path.join(root,"public/screens/compose.webp")).resize(246,536).png().toBuffer(),left:7,top:7}]).toBuffer();
  const tilted = await sharp(frame).rotate(8,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  composites.push({input:tilted,left:800,top:24});
}
await sharp(Buffer.from(svg)).png().composite(composites).toFile(path.join(root,"public/og.png"));
console.log("Prepared local WebP photography, app screens, icons, favicon, and OG image.");
