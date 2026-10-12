import {readFile} from 'node:fs/promises';import {unzipSync} from 'fflate';
const file='release/深海猎杀-v1.0.0-上传候选.zip',zip=unzipSync(new Uint8Array(await readFile(file))),expected=['app.js','icon.svg','index.html','style.css'];
if(JSON.stringify(Object.keys(zip).sort())!==JSON.stringify(expected))throw Error('Unexpected ZIP entry');
for(const key of expected)if(!Buffer.from(zip[key]).equals(await readFile('dist/'+key)))throw Error('ZIP differs from dist: '+key);
const alias=await readFile('release/DepthChain-preview.zip');if(!alias.equals(await readFile(file)))throw Error('Preview alias mismatch');
const promo=unzipSync(new Uint8Array(await readFile('release/深海猎杀-v1.0.0-推广素材.zip')));if(Object.keys(promo).filter(k=>k.startsWith('images/')).length!==6)throw Error('Missing promotion screenshots');
console.log('PASS ZIP: four exact release resources, identical preview alias, six promotion originals.');
