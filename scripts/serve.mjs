import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2), lan = args.includes('--lan');
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? Number(portArg.slice(7)) : 4173;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
const build = spawnSync(process.execPath, ['scripts/build.mjs', ...(args.includes('--release') ? [] : ['--dev'])], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
const base = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (file !== base && !file.startsWith(base + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) { response.writeHead(403); response.end(); return; }
  try { const data = await readFile(file); response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data); }
  catch (_) { response.writeHead(404); response.end('Not found'); }
}).listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => console.log(`DepthChain ${lan ? 'LAN' : 'local'} preview: port ${port}`));
