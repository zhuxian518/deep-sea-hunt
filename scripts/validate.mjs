import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { transform } from 'esbuild';
const fail = message => { throw new Error(message); };
const allowed = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);
async function walk(dir) { const result = []; for (const name of await readdir(dir)) { const path = join(dir, name); if ((await stat(path)).isDirectory()) result.push(...await walk(path)); else result.push(path); } return result; }
const files = await walk('dist');
if (!files.includes(join('dist', 'index.html'))) fail('Missing root index.html');
if (files.filter(f => extname(f) === '.html').length !== 1) fail('Expected one HTML entry');
let bytes = 0;
for (const file of files) {
  if (!allowed.has(extname(file))) fail(`Disallowed file: ${file}`);
  bytes += (await stat(file)).size;
  if (!['.html', '.css', '.js', '.svg'].includes(extname(file))) continue;
  const text = await readFile(file, 'utf8');
  if (extname(file) !== '.svg' && /https?:\/\/|\/\//.test(text)) fail(`External URL or protocol-relative reference: ${file}`);
  if (extname(file) === '.html') {
    if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(text) || /\son\w+\s*=|javascript:|type=["']module/i.test(text)) fail('Inline/module execution');
    if (/<(?:iframe|object|base)\b|http-equiv=["']Content-Security-Policy/i.test(text)) fail('Forbidden HTML');
    for (const match of text.matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g)) {
      if (!files.some(f => resolve(f) === resolve('dist', match[1]))) fail(`Missing resource ${match[1]}`);
    }
  }
  if (extname(file) === '.js') {
    if (/\b(?:fetch|XMLHttpRequest|WebSocket|Worker|SharedWorker|EventSource|WebAssembly|eval)\s*\(|new\s+Function\b|\bimport\s|\bexport\s/.test(text)) fail('Forbidden runtime API or modules');
    if (/clipboard|execCommand|window\.open\s*\(|location\.(?:assign|replace)\s*\(/.test(text)) fail('Forbidden clipboard or navigation capability');
    if (/depthchain\s*=/.test(text)) fail('Development diagnostic exposed');
    await transform(text, { target: 'chrome61', loader: 'js' });
  }
  if (extname(file) === '.css' && /@import|url\(\s*["']?(?:https?:|\/\/)/i.test(text)) fail('External stylesheet resource');
}
if (bytes > 2 * 1024 * 1024) fail('Exceeded internal 2MiB budget');
console.log(`PASS: ${files.length} packaged files, ${bytes} bytes; classic script, offline resources, baseline build.`);
console.log('Local audit only; current upload-page Skill and real-device review are still required.');
