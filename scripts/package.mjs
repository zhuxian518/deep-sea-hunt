import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { createHash } from 'node:crypto';
await mkdir('release', { recursive: true });
const {version} = JSON.parse(await readFile('package.json', 'utf8'));
const gameName = `深海较量-v${version}.zip`;
const candidateName = `深海较量-v${version}-上传候选.zip`;
const promotionName = `深海较量-v${version}-推广素材.zip`;
async function packDir(root, dir = root, data = {}) {
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if ((await stat(path)).isDirectory()) await packDir(root, path, data);
    else data[relative(root, path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path));
  }
  return data;
}
const game = zipSync(await packDir('dist'), { level: 9 });
await writeFile('release/DepthChain-preview.zip', game);
await writeFile('release/' + gameName, game);
await writeFile('release/' + candidateName, game);
const docs = {};
for (const [path, data] of Object.entries(await packDir('docs'))) docs['docs/' + path] = data;
for (const name of ['WinDepth_PRD.md', 'WinDepth_Technical_Design.md', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'AGENTS.md']) docs[name] = strToU8(await readFile(name, 'utf8'));
const documents = zipSync(docs, { level: 9 });
await writeFile('release/DepthChain-documents.zip', documents);
const promotion = {};
promotion['图标/深海较量-正式图标.png'] = new Uint8Array(await readFile('docs/branding/深海较量-正式图标.png'));
for (const [path, data] of Object.entries(await packDir('docs/promotion'))) promotion[path] = path.endsWith('.md') ? strToU8(new TextDecoder().decode(data).replaceAll('../previews/', 'images/')) : data;
for (const [path, data] of Object.entries(await packDir('docs/previews'))) if (path.startsWith('promo-')) promotion['images/' + path] = data;
await writeFile('release/' + promotionName, zipSync(promotion, { level: 9 }));
await writeFile('release/深海较量-正式图标.png', await readFile('docs/branding/深海较量-正式图标.png'));
const hashes = [];
for (const file of [gameName, 'DepthChain-documents.zip', promotionName, '深海较量-正式图标.png']) hashes.push(`${createHash('sha256').update(await readFile('release/' + file)).digest('hex')}  ${file}`);
await writeFile('release/SHA256SUMS.txt', hashes.join('\n') + '\n');
console.log(`Game preview ZIP ${game.length} bytes; documentation ZIP ${documents.length} bytes.`);
