import { parseProgress } from '../systems/Progress.js';
export const PROFILE_KEY = 'depthchain-profile-v1';
export function freshProfile() { return { schemaVersion: 1, bestScore: 0, bestCombo: 0, maxWave: 0, tutorialSeen: false, settings: { sfx: true, music: false, lowFx: false }, history:[], stats:{plays:0,wins:0,kills:0}, medals:[], checkpoint:null }; }
export function parseProfile(raw) {
  if (raw === null || raw === undefined) return null;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.schemaVersion !== 1) throw new Error('记录格式无法识别');
  for (const key of ['bestScore', 'bestCombo', 'maxWave']) if (!Number.isSafeInteger(data[key]) || data[key] < 0) throw new Error('记录数值无效');
  return { ...freshProfile(), ...parseProgress(data), bestScore: data.bestScore, bestCombo: data.bestCombo, maxWave: Math.min(data.maxWave, 10), tutorialSeen: data.tutorialSeen === true, settings: { sfx: !data.settings || data.settings.sfx !== false, music: Boolean(data.settings && data.settings.music === true), lowFx: Boolean(data.settings && data.settings.lowFx) } };
}
export function withTimeout(promise, ms = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('客户端响应超时')), ms);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export class StorageAdapter {
  constructor(environment, notice = () => {}) {
    this.env = environment; this.notice = notice; this.mode = 'memory'; this.writable = false; this.queue = Promise.resolve(); this.profile = freshProfile();
  }
  async init() {
    const xhs = this.env.xhs, api = xhs && xhs.miniTool;
    let options = xhs && xhs.launchOptions;
    let build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion) || 0;
    if (!build && api && typeof api.getLaunchOptions === 'function') {
      try { options = await withTimeout(api.getLaunchOptions()); build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion) || 0; } catch (_) { build = 0; }
    }
    this.mode = Math.floor(build / 1000) >= 9460 ? 'native' : 'browser';
    try {
      let raw;
      if (this.mode === 'native') {
        if (!api || typeof api.getStorage !== 'function' || typeof api.setStorage !== 'function') throw new Error('原生存储不可用');
        this.api = api;
        const result = await withTimeout(api.getStorage({ key: PROFILE_KEY }));
        if (!result || (result.data !== null && typeof result.data !== 'string')) throw new Error('原生存储响应无效');
        raw = result.data;
        if (raw === null) {
          let legacy = null;
          try { legacy = parseProfile(this.env.localStorage.getItem(PROFILE_KEY)); } catch (_) { /* Missing legacy storage does not block a new native profile. */ }
          if (legacy) { await withTimeout(api.setStorage({ key: PROFILE_KEY, data: JSON.stringify(legacy) })); raw = legacy; }
        }
      } else { raw = this.env.localStorage.getItem(PROFILE_KEY); }
      this.profile = parseProfile(raw) || freshProfile(); this.writable = true;
      if (xhs && this.mode === 'browser') this.notice('这个版本的纪录可能会被清理，升级小红书后更稳妥');
    } catch (_) {
      this.writable = false;
      this.notice('没读到上次的纪录，先玩吧。重新打开时再试试');
    }
    return this.profile;
  }
  save(profile) {
    this.profile = profile;
    const serialized = JSON.stringify(profile);
    this.queue = this.queue.then(async () => {
      if (!this.writable) { this.notice('这次纪录还没存好，重新打开后可以再试'); return false; }
      try {
        if (this.mode === 'native') await withTimeout(this.api.setStorage({ key: PROFILE_KEY, data: serialized }));
        else this.env.localStorage.setItem(PROFILE_KEY, serialized);
        return true;
      } catch (_) { this.notice('纪录没存上，这局成绩还在，先别急着关掉'); return false; }
    });
    return this.queue;
  }
}
