import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(website, process.env.SITE_DIRECTORY || 'out');
const port = Number(process.env.PORT || 3000);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.png':'image/png', '.webp':'image/webp', '.avif':'image/avif', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.mp4':'video/mp4' };
async function isFile(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
const server = http.createServer(async (request,response) => {
  try {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const urlPath = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const requested = path.resolve(root, `.${urlPath}`);
    if (!requested.startsWith(`${root}${path.sep}`) && requested !== root) { response.writeHead(400); response.end(); return; }
    let file;
    for (const candidate of [requested, path.join(requested,'index.html'), `${requested}.html`]) {
      if (await isFile(candidate)) { file=candidate; break; }
    }
    let status=200;
    // Existing /app assets win. Only unresolved app routes receive the Expo SPA shell.
    if (!file && /^\/app(?:\/|$)/.test(urlPath) && !path.extname(urlPath)) file=path.join(root,'app/index.html');
    if (!file || !await isFile(file)) { status=404; file=path.join(root,'404.html'); }
    if (!await isFile(file)) { response.writeHead(404); response.end('Not found'); return; }
    const contentType=mime[path.extname(file)] || 'application/octet-stream';
    let body=await readFile(file);
    const headers={'Content-Type':contentType,'Cache-Control':contentType.startsWith('text/html')?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'};
    if (/\bgzip\b/.test(request.headers['accept-encoding'] || '') && /^(text\/|application\/(json|xml)|image\/svg)/.test(contentType)) {
      body=gzipSync(body); headers['Content-Encoding']='gzip'; headers.Vary='Accept-Encoding';
    }
    headers['Content-Length']=body.length;
    response.writeHead(status,headers); response.end(request.method==='HEAD'?undefined:body);
  } catch { response.writeHead(500); response.end('Unable to serve this file'); }
});
server.listen(port,()=>console.log(`MultiPostly static preview: http://localhost:${port} (including /app deep links)`));
