import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const dev = process.argv.includes('--dev');
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.js'], bundle: true, outfile: 'dist/app.js', format: 'iife', target: ['chrome61', 'es2017'], minify: !dev, sourcemap: false, legalComments: 'none', define: { __DEV__: String(dev) } });
// Preserve the approved 1.0.0 text bytes regardless of Git checkout line endings.
async function copyReleaseText(source, target) {
  const text = await readFile(source, 'utf8');
  await writeFile(target, text.replace(/\r\n|\r|\n/g, '\r\n'));
}
await copyReleaseText('index.html', 'dist/index.html');
await copyReleaseText('src/css/main.css', 'dist/style.css');
await copyFile('public/icon.svg', 'dist/icon.svg');
console.log(`Built ${dev ? 'local development' : 'release'}: dist/index.html`);
