// Expo Router 57 uses query-string 7's CommonJS API. Pin the upstream fixed
// ESM decoder and adapt only its import; never copy or reimplement decoding.
// Upstream fix: https://github.com/advisories/GHSA-qr28-fpjm-wq7f
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const originalHash = 'caa3f2c8b45dfe1e91db22ae10743af68de8d96f26515132bb52485ec0f037fa';
const patchedHash = 'fc1ca6e1961ba005e554b1bc0de932d6454bf59bfaea03d02c7261dbdcafcdbd';
const hash = value => createHash('sha256').update(value).digest('hex');
function patchSource(source) {
  if (hash(source) === patchedHash) return source;
  if (hash(source) !== originalHash) throw new Error('query-string source changed; review the compatibility patch before building.');
  const patched = source.replace("const decodeComponent = require('decode-uri-component');", "const decodeComponent = require('decode-uri-component').default;");
  if (hash(patched) !== patchedHash) throw new Error('query-string patch verification failed.');
  return patched;
}
function verifyInstallation(root, checkOnly = false) {
  const parser = resolve(root, 'node_modules/query-string');
  if (JSON.parse(readFileSync(resolve(parser, 'package.json'))).version !== '7.1.3') throw new Error('Review the query-string version before building.');
  const decoder = require.resolve('decode-uri-component', { paths: [parser] });
  const decoderPackage = JSON.parse(readFileSync(resolve(decoder, '../package.json')));
  if (decoderPackage.version !== '0.5.1') throw new Error('The security-fixed decoder is required. Run npm ci.');
  const target = resolve(parser, 'index.js'), source = readFileSync(target, 'utf8');
  const patched = patchSource(source);
  if (checkOnly && source !== patched) throw new Error('Dependency patch missing. Run npm ci with lifecycle scripts enabled.');
  if (!checkOnly && source !== patched) writeFileSync(target, patched);
}
module.exports = { patchSource, verifyInstallation };
if (require.main === module) {
  try { verifyInstallation(process.cwd(), process.argv.includes('--check')); console.log('Verified query-string 7 compatibility with decoder 0.5.1.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
