import { Simulation } from '../core/Simulation.js';
import { Clock } from '../core/Clock.js';
import { InputAdapter } from '../input/InputAdapter.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';
import { AudioMixer } from '../audio/AudioMixer.js';
import { StorageAdapter } from '../platform/StorageAdapter.js';
import { shareImage, saveImage } from '../platform/ShareAdapter.js';
import config from '../config/game-balance.json';
import waves from '../config/waves.json';
import { restoreCheckpoint } from '../core/Checkpoint.js';
import { MEDALS, finishRun, scoreCurve, medalValue } from '../systems/Progress.js';
import author from '../config/author.json';
import { openFeedback } from '../platform/FeedbackAdapter.js';

const el = id => document.getElementById(id);
const digits = value => String(value).padStart(6, '0');
export class AppController {
  constructor() {
    const practiceWave = new URLSearchParams(window.location.search).get('practice');
    this.practiceStart = practiceWave === '8' ? 7 : practiceWave === '6' ? 5 : 0;
    this.runCounter = 0; this.lastAutoSave = 0; this.newMedals = [];
    this.state = 'boot'; this.sim = null; this.clock = new Clock(); this.audio = new AudioMixer();
    this.renderer = new CanvasRenderer(el('sea'), config.world);
    this.input = new InputAdapter(el('controls'), () => this.pause());
    this.storage = new StorageAdapter(window, message => this.toast(message));
    this.frame = this.frame.bind(this); this.lastVisual = null; this.lastHud = '';
    this.overlay = el('overlay');
    this.overlay.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (button && !button.disabled) this.action(button.dataset.action, button);
    });
    el('pause').addEventListener('click', () => this.pause());
    el('help').addEventListener('click', () => { if (this.state === 'game') this.pause(); else if (this.state === 'home') this.tutorial(); });
    el('sound').addEventListener('click', () => { this.audio.unlock(); this.profile.settings.sfx = !this.profile.settings.sfx; this.applySettings(); this.persist(); });
    el('music').addEventListener('click', () => { this.audio.unlock(); this.profile.settings.music = !this.profile.settings.music; this.applySettings(); this.persist(); });
    el('low-fx').addEventListener('change', event => { this.profile.settings.lowFx = event.target.checked; this.applySettings(); this.persist(); });
    document.querySelector('.wordmark').addEventListener('click', event => { event.preventDefault(); if (this.state === 'game') this.pause(); });
    window.addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    const unlockAudio = () => { if (this.profile && (this.profile.settings.sfx || this.profile.settings.music)) this.audio.unlock(); };
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    document.addEventListener('keydown', unlockAudio);
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.pause(); this.audio.suspend(); } });
    window.addEventListener('pagehide', () => this.saveProgress());
    el('sound').disabled = true; el('music').disabled = true; el('low-fx').disabled = true;
    this.panel('<div class="eyebrow">深海较量</div><h2>马上就好</h2><p>找找你上次的纪录…</p>');
    this.resize(); requestAnimationFrame(this.frame);
  }
  async boot() {
    this.profile = await this.storage.init(); this.applySettings();
    if (this.profile.checkpoint) {
      try { restoreCheckpoint(Simulation, config, waves, this.profile.checkpoint); }
      catch (_) { this.profile.checkpoint = null; this.persist(); this.toast('上次进度暂时无法接上，历史成绩仍然保留'); }
    }
    el('sound').disabled = false; el('music').disabled = false; el('low-fx').disabled = false;
    this.home();
  }
  resize() { document.documentElement.style.setProperty('--viewport-height', `${window.visualViewport ? window.visualViewport.height : window.innerHeight}px`); this.renderer.resize(); }
  applySettings() {
    this.audio.enabled = this.profile.settings.sfx;
    this.audio.setMusic(this.profile.settings.music, this.state === 'game');
    this.renderer.lowFx = this.profile.settings.lowFx;
    el('low-fx').checked = this.profile.settings.lowFx;
    el('sound').textContent = this.audio.enabled ? '音效开' : '音效关';
    el('sound').setAttribute('aria-label', this.audio.enabled ? '关闭音效' : '开启音效');
    el('sound').setAttribute('aria-pressed', String(this.audio.enabled));
    el('music').textContent = this.profile.settings.music ? '音乐开' : '音乐关';
    el('music').setAttribute('aria-label', this.profile.settings.music ? '关闭背景音乐' : '开启背景音乐');
    el('music').setAttribute('aria-pressed', String(this.profile.settings.music));
    el('best-score').textContent = digits(this.profile.bestScore);
    el('best-combo').textContent = this.profile.bestCombo ? `最多 ${this.profile.bestCombo} 连爆 · 打到第 ${this.profile.maxWave} 波` : '第一份纪录，等你来写';
  }
  persist() { return this.storage.save(this.profile); }
  saveProgress(manual = false) {
    if (!this.sim || this.sim.status === 'ended' || this.practiceStart) { if (manual) this.toast('练习局不覆盖正式存档'); return Promise.resolve(false); }
    this.profile.checkpoint = { version: 1, balanceVersion: config.version, runId: this.runId, savedAt: Date.now(), state: this.sim.snapshot() };
    this.lastAutoSave = this.sim.elapsed;
    return this.persist().then(ok => { if (manual && ok) this.toast(`已保存到第 ${this.sim.wave + 1} 波，下次可以接着玩`); return ok; });
  }
  continueRun() {
    try { this.sim = restoreCheckpoint(Simulation, config, waves, this.profile.checkpoint); }
    catch (_) { this.toast('上次进度无法读取，请重新开始'); return; }
    this.runId = this.profile.checkpoint.runId; this.lastAutoSave = this.sim.elapsed;
    this.clock.reset(); this.renderer.clearEffects(); this.lastHud = ''; this.state = 'game'; this.pause();
  }
  panel(html, compact = false) {
    this.overlay.className = 'overlay'; this.overlay.innerHTML = `<div class="panel${compact ? ' compact' : ''}">${html}</div>`;
    requestAnimationFrame(() => { const button = this.overlay.querySelector('button.primary'); if (button && this.overlay.contains(button)) button.focus({ preventScroll: true }); });
  }
  home() {
    this.audio.setMusic(this.profile.settings.music, false);
    this.state = 'home'; this.sim = null; this.input.setEnabled(false); this.clock.reset(); this.renderer.clearEffects(); this.lastHud = '';
    el('pause').disabled = true; el('wave-notice').hidden = true;
    const save = !this.practiceStart && this.profile.checkpoint;
    this.panel(`<div class="eyebrow">炸潜艇 · 连爆挑战</div><h2>深海较量</h2><p class="gold">驾驶舰船投下水雷，对抗敌方潜艇</p><p>炸掉一艘，带上旁边的。<br>试试一颗炸弹能炸几艘？</p>${save ? `<button class="primary" data-action="continue">继续上次 · 第 ${save.state.wave + 1} 波 →</button><button class="secondary" data-action="start">重新开始</button>` : '<button class="primary" data-action="start">开炸！ &nbsp; →</button>'}<div class="menu-grid"><button class="minor" data-action="help">怎么玩？</button><button class="minor" data-action="history">历史成绩</button><button class="minor" data-action="medals">我的勋章</button><button class="minor" data-action="author">关注作者 / 反馈</button></div><p class="tiny">${this.practiceStart ? `后 ${waves.length - this.practiceStart} 波练习 · 第 ${this.practiceStart + 1} 波起步 · 不计正式纪录` : `你的最高分 ${digits(this.profile.bestScore)} · 一共十波`}</p>`);
  }
  tutorial() {
    this.state = 'tutorial'; this.input.setEnabled(false);
    this.panel('<div class="eyebrow">十几秒就能学会</div><h2>看准了再扔</h2><div class="tutorial-row"><b>← →</b><span>按住两边，船就会左右移动。<br>电脑用方向键或 A / D。</span></div><div class="tutorial-row"><b>↓</b><span>按住中间投弹，电脑按空格。<br>炸弹慢慢沉，记得往前一点扔。</span></div><div class="tutorial-row"><b>◎</b><span>潜艇凑近时，一炸就是一串。<br>红色鱼雷会往上冲，别被碰到。</span></div><button class="primary" data-action="launch">懂了，开炸！ →</button><button class="minor" data-action="home">回首页</button>', true);
  }
  launch(seed) {
    this.audio.unlock(); this.profile.tutorialSeen = true; this.persist();
    const random = new Uint32Array(1);
    if (seed === undefined) {
      try { window.crypto.getRandomValues(random); } catch (_) { random[0] = Date.now() >>> 0; }
    }
    this.sim = new Simulation(config, waves, seed === undefined ? random[0] : seed);
    if (this.practiceStart) { this.sim.wave = this.practiceStart; this.sim.setupWave(); }
    this.runId = `${Date.now()}-${this.sim.seed}-${++this.runCounter}`; this.newMedals = []; this.lastAutoSave = 0;
    this.saveProgress();
    this.state = 'game'; this.clock.reset(); this.renderer.clearEffects(); this.input.setEnabled(true); this.lastHud = '';
    this.audio.setMusic(this.profile.settings.music, true);
    this.overlay.innerHTML = ''; this.overlay.className = 'overlay empty'; el('pause').disabled = false;
  }
  pause() {
    if (this.state !== 'game') return;
    this.saveProgress();
    this.state = 'paused'; this.input.setEnabled(false); this.clock.reset(); el('pause').disabled = true;
    this.audio.setMusic(this.profile.settings.music, false);
    this.panel(`<div class="eyebrow">已暂停</div><h2>歇一会儿</h2><p>放心，潜艇也暂停了。</p><button class="primary" data-action="resume">接着炸 →</button>${this.practiceStart ? '<p class="tiny">练习局不覆盖正式存档</p>' : '<button class="secondary" data-action="save-progress">保存进度</button>'}<button class="minor" data-action="restart-confirm">这局重来</button><button class="minor" data-action="low-fx">低特效：${this.profile.settings.lowFx ? '开启' : '关闭'}</button><button class="minor" data-action="quit-confirm">退出这局</button>`);
  }
  resume() {
    this.audio.setMusic(this.profile.settings.music, true);
    this.state = 'game'; this.input.setEnabled(true); this.clock.reset(); this.audio.unlock(); this.overlay.innerHTML = ''; this.overlay.className = 'overlay empty'; el('pause').disabled = false;
  }
  finish() {
    this.audio.setMusic(this.profile.settings.music, false);
    this.state = 'result'; this.input.setEnabled(false); this.clock.reset(); el('pause').disabled = true;
    this.isBest = !this.practiceStart && this.sim.score > this.profile.bestScore;
    if (!this.practiceStart) {
      this.profile.bestScore = Math.max(this.profile.bestScore, this.sim.score);
      this.profile.bestCombo = Math.max(this.profile.bestCombo, this.sim.maxCombo);
      this.profile.maxWave = Math.max(this.profile.maxWave, this.sim.wave + 1);
    }
    this.newMedals = finishRun(this.profile, this.sim, this.runId, Boolean(this.practiceStart));
    this.persist(); this.applySettings();
    this.showResult();
  }
  showResult() {
    this.state = 'result';
    this.panel(`<div class="eyebrow">${this.isBest ? '新纪录！比上次更厉害了' : '这局的成绩'}</div><h2>${this.sim.reason === '全部波次都打完了' ? this.practiceStart ? '练习完成了！' : '十波全过了！' : '这局炸得怎么样？'}</h2><div class="result-score">${digits(this.sim.score)}</div><div class="result-stats"><span><b>${this.sim.maxCombo}</b>最多连爆</span><span><b>${this.sim.kills}</b>炸掉潜艇</span><span><b>${this.sim.wave + 1}/${waves.length}</b>打到第几波</span></div><p class="tiny">用了 ${this.sim.shots} 颗雷 · 效率奖励 +${this.sim.bonusTotal}${this.practiceStart ? "<br>练习局 · 不计正式纪录" : ""}</p>${this.newMedals.length ? `<p class="gold">新勋章：${this.newMedals.map(m => m.name).join("、")}</p>` : ""}<button class="primary" data-action="replay">再炸一波 →</button><button class="secondary" data-action="card">看看成绩卡 / 晒一下</button><button class="minor" data-action="wave-details">看看每波战报</button><div class="menu-grid"><button class="minor" data-action="history">历史成绩</button><button class="minor" data-action="medals">我的勋章</button><button class="minor" data-action="author">关注作者 / 反馈</button><button class="minor" data-action="same-seed">原样再挑战</button></div><button class="minor" data-action="home">回首页</button>`, true);
  }
  showCard() {
    this.state = 'card'; this.cardImage = this.renderer.scoreCard(this.sim);
    this.panel('<div class="eyebrow">深海较量 · 你的成绩卡</div><h2>这成绩，晒一下</h2><img class="score-preview" id="score-preview" alt="深海较量本局成绩卡"><button class="primary" data-action="share">分享到小红书</button><button class="secondary" data-action="save-image">存到相册</button><button class="minor" data-action="result">回去看成绩</button>', true);
    el('score-preview').src = this.cardImage;
  }
  collection(name) {
    this.collectionBack = this.sim && this.sim.status === 'ended' ? 'result' : 'home';
    this.state = name; this.input.setEnabled(false);
    const back = `<button class="primary" data-action="${this.collectionBack}">返回${this.collectionBack === 'home' ? '首页' : '成绩'} →</button>`;
    if (name === 'history') {
      const rows = this.profile.history.slice().reverse(), curve = scoreCurve(this.profile.history);
      const graph = rows.length ? `<svg class="score-curve" viewBox="0 0 300 155" role="img" aria-label="最近${rows.length}局分数曲线，最高${curve.maximum}分"><path d="M24 20V130H276" fill="none" stroke="#506770"/><polyline points="${curve.points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#e9c980" stroke-width="2"/>${curve.points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${p.practice ? '#7db7c2' : '#e9c980'}"/>`).join('')}<text x="24" y="150" fill="#9bb4ba" font-size="11">较早</text><text x="250" y="150" fill="#9bb4ba" font-size="11">最近</text></svg>` : '<p>第一条成绩曲线，等你来画。</p>';
      this.panel(`<div class="eyebrow">每次出航，都算进步</div><h2>历史成绩</h2><p class="tiny">正式完成 ${this.profile.stats.plays} 局 · 通关 ${this.profile.stats.wins} 局<br>保留最近60局；金色正式局，蓝色练习局。</p>${graph}${back}${rows.map(r => `<div class="wave-report"><strong>${digits(r.score)} 分 <span>${r.practice ? '练习' : r.won ? '通关' : '正式'}</span></strong><p>第 ${r.wave} 波 · ${r.combo} 连爆 · ${r.shots} 雷 / ${r.kills} 艘<br>${new Date(r.endedAt).toLocaleString('zh-CN')}</p></div>`).join('')}`, true);
    }
    if (name === 'medals') this.panel(`<div class="eyebrow">每一点进步，都值得记住</div><h2>我的勋章</h2><p class="tiny">已解锁 ${this.profile.medals.length} / ${MEDALS.length} · 练习局不解锁勋章</p><div class="medal-grid">${MEDALS.map((m, i) => { const earned = this.profile.medals.some(u => u.id === m.id); return `<div class="medal ${earned ? 'earned' : ''}"><b>${earned ? '★' : '◇'} ${String(i + 1).padStart(2, '0')}</b><strong>${m.name}</strong><small>${m.detail}</small><small>${earned ? '已解锁' : `${Math.min(medalValue(this.profile, m), m.goal)} / ${m.goal}`}</small></div>`; }).join('')}</div>${back}`, true);
    if (name === 'author') {
      this.panel(`<div class="eyebrow">一起把这片海做得更好玩</div><h2>找作者聊聊</h2><p>回到这篇笔记，点作者头像就能关注、私信。<br>Bug 和建议也欢迎在笔记下留言。喜欢的话，点赞收藏支持一下。</p><p class="tiny">打开评论区会离开游戏。请检查草稿后自行发布。</p><label class="tiny" for="feedback-draft">先写下问题或建议</label><textarea id="feedback-draft" class="author-link" rows="4" maxlength="500" placeholder="手机型号、系统版本、发生在哪一波、具体问题…"></textarea><button class="secondary" data-action="feedback">带草稿去评论区</button>${!__DEV__ || window.xhs ? '' : '<label class="tiny" for="author-link">作者的小红书主页</label><textarea id="author-link" class="author-link" readonly rows="2"></textarea>'}${back}`, true);
      if (__DEV__ && el('author-link')) el('author-link').value = author.profileUrl;
    }
  }
  async action(name, button) {
    if (name === 'continue') this.continueRun();
    if (name === 'save-progress') { button.disabled = true; await this.saveProgress(true); button.disabled = false; }
    if (['history', 'medals', 'author'].includes(name)) this.collection(name);
    if (name === 'feedback') {
      const draft = el('feedback-draft').value.trim();
      if (!draft) { this.toast('先写一点问题或建议，再去留言吧'); return; }
      button.disabled = true;
      const saved = await this.persist();
      if (!saved) this.toast('记录暂未保存，留在这里再试一次');
      else this.toast((await openFeedback(window, `《深海较量》反馈：${draft}`)).message);
      button.disabled = false;
    }
    if (name === 'start') { this.audio.unlock(); if (!this.profile.tutorialSeen) this.tutorial(); else this.launch(); }
    if (name === 'help') this.tutorial();
    if (name === 'launch' || name === 'replay') this.launch();
    if (name === 'same-seed') this.launch(this.sim.seed);
    if (name === 'home') this.home();
    if (name === 'resume') this.resume();
    if (name === 'restart-confirm' || name === 'quit-confirm') {
      const restarting = name === 'restart-confirm';
      this.panel(`<div class="eyebrow">这局还没打完</div><h2>${restarting ? '这局重来？' : '先不玩了？'}</h2><p>${restarting ? '重新开始会替换这局的存档。' : this.practiceStart ? '练习进度不保存，正式存档仍然保留。' : '已尝试自动保存，也可以返回暂停页手动保存。'}<br>未完成的局不会计入历史成绩。</p><button class="primary" data-action="${restarting ? 'launch' : 'home'}">${restarting ? '重来！' : '退出这局'}</button><button class="secondary" data-action="back-pause">先不退</button>`);
    }
    if (name === 'back-pause') { this.state = 'game'; this.pause(); }
    if (name === 'low-fx') { this.profile.settings.lowFx = !this.profile.settings.lowFx; this.applySettings(); this.persist(); this.state = 'game'; this.pause(); }
    if (name === 'card') this.showCard();
    if (name === 'result') this.showResult();
    if (name === 'wave-details') {
      const rows = this.sim.waveResults.map(r => `<div class="wave-report"><strong>第 ${r.wave} 波 <span>+${r.bonus}</span></strong><p>${r.shots} 雷 / ${r.kills} 艘 · 每雷 ${r.efficiency.toFixed(2)} 艘<br>${r.rate ? `效率奖励 ${Math.round(r.rate * 100)}% · ${r.title}` : '未达到效率奖励'}</p></div>`).join('');
      const unfinished = this.sim.reason !== '全部波次都打完了' ? `<p class="tiny">第 ${this.sim.wave + 1} 波未完成：${this.sim.waveStats.shots} 雷 / ${this.sim.waveStats.kills} 艘，不结算效率奖励。</p>` : '';
      this.panel(`<div class="eyebrow">用少一点的雷，炸多一点的艇</div><h2>每波战报</h2>${rows}${unfinished}<p class="tiny">每雷 ≥1 / 2 / 3 艘：奖励 10% / 25% / 50%<br>奖励按当波击沉得分计算，通关该波才发放。</p><button class="primary" data-action="result">回去看成绩</button>`, true);
    }
    if (name === 'share' || name === 'save-image') {
      if (this.cardBusy) return;
      this.cardBusy = true; button.disabled = true;
      const result = name === 'share' ? await shareImage(window, this.cardImage, this.sim.score) : await saveImage(window, this.cardImage);
      this.toast(result.message); this.cardBusy = false; button.disabled = false;
    }
  }
  toast(message) {
    el('toast').textContent = message; el('toast').hidden = false;
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { el('toast').hidden = true; }, 5500);
  }
  hud() {
    const s = this.sim, signature = s ? `${s.score}/${s.wave}/${s.player.lives}/${s.bombs.length}/${s.maxCombo}/${s.status}/${s.shots}/${Object.values(s.buffs).map(Math.ceil).join('/')}` : 'home';
    if (signature !== this.lastHud) {
      el('score').textContent = digits(s ? s.score : 0); el('wave').textContent = String(s ? s.wave + 1 : 1).padStart(2, '0');
      const lives = s ? s.player.lives : 3;
      el('lives').textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '▰' : '▱').join(' '); el('lives').setAttribute('aria-label', `剩余${lives}条生命`);
      el('ammo').textContent = Array.from({ length: 5 }, (_, i) => i < 5 - (s ? s.bombs.length : 0) ? '●' : '○').join(' ');
      el('mission-tag').textContent = s ? `第 ${s.wave + 1} 波 · ${waves[s.wave].name}` : '准备好就开炸';
      el('status-text').textContent = s ? (s.bombs.length === 5 ? '五枚都在水里，稍等一下' : `这波 ${s.waveStats.shots} 雷 / ${s.waveStats.kills} 艘`) : '按住投弹，就能连着扔';
      el('combo-tag').textContent = s && s.maxCombo > 1 ? `最多 ${s.maxCombo} 连爆` : '';
      const buffNames = { rapid: '水雷加速', heavy: '强化水雷', shield: '舰船护盾' };
      const active = s ? Object.keys(s.buffs).filter(type => s.buffs[type] > 0).map(type => `${buffNames[type]} ${Math.ceil(s.buffs[type])}秒`) : [];
      el('buff-status').textContent = active.join(' · '); el('buff-status').hidden = !active.length || !['game', 'paused'].includes(this.state);
      this.lastHud = signature;
    }
    const notice = el('wave-notice');
    notice.hidden = !(this.state === 'game' && s && (s.status === 'countdown' || s.status === 'waveclear'));
    if (!notice.hidden) {
      const text = s.status === 'countdown' ? `准备开炸 · ${Math.ceil(Math.max(0, s.timer))}` : `第 ${s.wave + 1} 波过了！`;
      if (notice.dataset.text !== text) { const r = s.waveResults[s.waveResults.length - 1]; notice.innerHTML = `${text}<small>${s.status === 'countdown' ? waves[s.wave].subtitle : `${r.shots} 颗雷炸了 ${r.kills} 艘 · ${r.title}<br>效率奖励 +${r.bonus} 分`}</small>`; notice.dataset.text = text; }
    }
  }
  frame(ms) {
    const dt = this.lastVisual === null ? 0 : Math.min((ms - this.lastVisual) / 1000, 0.05); this.lastVisual = ms;
    const running = this.state === 'game';
    const alpha = this.clock.advance(ms, running, step => {
      if (this.state !== 'game') return;
      this.sim.step(step, this.input.sample());
      const events = this.sim.drainEvents(); this.renderer.consume(events);
      for (const e of events) {
        if (['bomb', 'kill', 'damage'].includes(e.type)) this.audio.play(e.type, e.depth);
        if (e.type === 'damage') { el('damage-flash').classList.add('active'); setTimeout(() => el('damage-flash').classList.remove('active'), 220); }
        if (e.type === 'end') this.finish();
      }
      if (this.sim.status !== 'ended' && (this.sim.elapsed - this.lastAutoSave >= 15 || events.some(e => e.type === 'waveclear'))) this.saveProgress();
    });
    if (this.state !== 'paused' && this.state !== 'result' && this.state !== 'card') this.renderer.update(dt);
    this.audio.update({ wave: this.sim ? this.sim.wave : 0, phase: this.sim ? this.sim.status : 'home' });
    this.renderer.draw(this.sim, running ? alpha : 1, !this.sim); this.hud();
    requestAnimationFrame(this.frame);
  }
}
