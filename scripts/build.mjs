import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
const dev = process.argv.includes('--dev');
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.js'], bundle: true, outfile: 'dist/app.js', format: 'iife', target: ['chrome61', 'es2017'], minify: !dev, sourcemap: false, legalComments: 'none', define: { __DEV__: String(dev) } });
await copyFile('index.html', 'dist/index.html');
await copyFile('src/css/main.css', 'dist/style.css');
await copyFile('public/icon.svg', 'dist/icon.svg');
console.log(`Built ${dev ? 'local development' : 'release'}: dist/index.html`);
