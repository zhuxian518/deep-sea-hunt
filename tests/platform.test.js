import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageAdapter, freshProfile, parseProfile, PROFILE_KEY, withTimeout } from '../src/platform/StorageAdapter.js';
import { shareImage, saveImage } from '../src/platform/ShareAdapter.js';
function legacyEnvironment(raw = null) { let value = raw; return { localStorage: { getItem: () => value, setItem: (key, data) => { value = data; } } }; }
test('browser profile survives a new adapter', async () => {
  const env = legacyEnvironment(), first = new StorageAdapter(env); const profile = await first.init(); profile.bestScore = 150; await first.save(profile);
  const second = new StorageAdapter(env); assert.equal((await second.init()).bestScore, 150);
});
test('native storage uses JSON strings and serial write ordering', async () => {
  let data = null; const writes = [];
  const env = { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9460001 } }, miniTool: { getStorage: async () => ({ data }), setStorage: async input => { assert.equal(typeof input.data, 'string'); await new Promise(r => setTimeout(r, 2)); data = input.data; writes.push(JSON.parse(data).bestScore); } } } };
  const adapter = new StorageAdapter(env); const profile = await adapter.init(); assert.equal(adapter.mode, 'native');
  const a = adapter.save({ ...profile, bestScore: 100 }), b = adapter.save({ ...profile, bestScore: 300 }); await Promise.all([a, b]); assert.deepEqual(writes, [100, 300]);
});
test('unknown version uses browser, never calls native Storage', async () => {
  const env = legacyEnvironment(); env.xhs = { miniTool: { getStorage: () => { throw Error('must not call'); }, setStorage: () => { throw Error('must not call'); } } };
  const adapter = new StorageAdapter(env); await adapter.init(); assert.equal(adapter.mode, 'browser'); assert.equal(await adapter.save(freshProfile()), true);
});
test('async launch version enables native and migrates only confirmed missing key', async () => {
  const env = legacyEnvironment(JSON.stringify({ ...freshProfile(), bestScore: 999 })); const writes = [];
  env.xhs = { miniTool: { getLaunchOptions: async () => ({ miniToolEnv: { buildVersion: 9462004 } }), getStorage: async () => ({ data: null }), setStorage: async data => writes.push(data) } };
  const adapter = new StorageAdapter(env); assert.equal((await adapter.init()).bestScore, 999); assert.equal(writes.length, 1); assert.equal(writes[0].key, PROFILE_KEY);
});
test('native read failure never migrates or overwrites unknown data', async () => {
  const env = legacyEnvironment(JSON.stringify({ ...freshProfile(), bestScore: 99 })); let writes = 0; const notices = [];
  env.xhs = { launchOptions: { miniToolEnv: { buildVersion: 9462004 } }, miniTool: { getStorage: async () => { throw Error('failure'); }, setStorage: async () => { writes++; } } };
  const adapter = new StorageAdapter(env, message => notices.push(message)); await adapter.init(); assert.equal(await adapter.save(freshProfile()), false); assert.equal(writes, 0); assert.ok(notices.length > 0);
});
test('existing native profile wins over legacy, malformed record remains protected', async () => {
  const env = legacyEnvironment(JSON.stringify({ ...freshProfile(), bestScore: 999 })); let writes = 0;
  env.xhs = { launchOptions: { miniToolEnv: { buildVersion: 9462004 } }, miniTool: { getStorage: async () => ({ data: JSON.stringify({ ...freshProfile(), bestScore: 555 }) }), setStorage: async () => { writes++; } } };
  const adapter = new StorageAdapter(env); assert.equal((await adapter.init()).bestScore, 555); assert.equal(writes, 0);
  env.xhs.miniTool.getStorage = async () => ({ data: '{broken' }); const bad = new StorageAdapter(env); await bad.init(); assert.equal(bad.writable, false);
});
test('blocked localStorage getter yields visible memory-only failure', async () => {
  const notices = [], env = {}; Object.defineProperty(env, 'localStorage', { get() { throw Error('blocked'); } });
  const adapter = new StorageAdapter(env, msg => notices.push(msg)); await adapter.init(); assert.equal(await adapter.save(freshProfile()), false); assert.ok(notices.length);
});
test('undefined native data is an invalid response, never a missing key', async () => {
  const env = { xhs: { launchOptions: { miniToolEnv: { buildVersion: 9460000 } }, miniTool: { getStorage: async () => ({ data: undefined }), setStorage: async () => {} } } };
  const adapter = new StorageAdapter(env); await adapter.init(); assert.equal(adapter.writable, false);
});
test('native write rejection stays on selected backend without legacy write', async () => {
  let legacyWrites = 0;
  const env = { localStorage: { setItem: () => legacyWrites++ }, xhs: { launchOptions: { miniToolEnv: { buildVersion: 9460000 } }, miniTool: { getStorage: async () => ({ data: JSON.stringify(freshProfile()) }), setStorage: async () => { throw Error('quota'); } } } };
  const adapter = new StorageAdapter(env); await adapter.init(); assert.equal(await adapter.save(freshProfile()), false); assert.equal(legacyWrites, 0); assert.equal(adapter.mode, 'native');
});
test('schema rejects negative scores and normalizes settings', () => {
  assert.throws(() => parseProfile(JSON.stringify({ ...freshProfile(), bestScore: -1 }))); assert.throws(() => parseProfile('{'));
  assert.equal(parseProfile({ ...freshProfile(), settings: { sfx: false, lowFx: true } }).settings.sfx, false);
});
test('unresponsive bridge has bounded wait', async () => { await assert.rejects(() => withTimeout(new Promise(() => {}), 5), /超时/); });
test('share and save without SDK do not claim success', async () => {
  assert.equal((await shareImage({}, 'data:image/png;base64,AA', 12)).ok, false); assert.equal((await saveImage({}, 'data:image/png;base64,AA')).ok, false);
});
test('share contract uses official media field and handles rejection', async () => {
  let parameters;
  const env = { xhs: { miniTool: { postNote: async p => { parameters = p; } } } };
  assert.equal((await shareImage(env, 'data:image/png;base64,AA', 123)).ok, true); assert.equal(parameters.mediaInfo.image_resources[0].url, 'data:image/png;base64,AA'); assert.equal(parameters.pageType, undefined);
  env.xhs.miniTool.postNote = async () => { throw Error('cancel'); }; assert.equal((await shareImage(env, 'data:image/png;base64,AA', 123)).ok, false);
});
test('save album passes data URI and rejects denied permission visibly', async () => {
  const image = 'data:image/png;base64,AA'; let path;
  const env = { xhs: { miniTool: { saveImageToPhotosAlbum: async p => { path = p.filePath; } } } };
  assert.equal((await saveImage(env, image)).ok, true); assert.equal(path, image);
  env.xhs.miniTool.saveImageToPhotosAlbum = async () => { throw Error('denied'); }; assert.equal((await saveImage(env, image)).ok, false);
});
