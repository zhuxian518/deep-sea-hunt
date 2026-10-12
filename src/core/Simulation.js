import { Random } from './Random.js';
import { clamp, circleBox, sweptHit, sortHits } from '../systems/Collision.js';
import { scoreFor, efficiencyReward } from '../systems/Scoring.js';

export function validateConfig(config, waves) {
  const positive = n => Number.isFinite(n) && n > 0;
  if (!config || !config.world || !positive(config.world.width) || !positive(config.world.height)) throw new Error('海域配置无效');
  if (!(config.world.waterline > config.player.halfH && config.world.waterline < config.world.height)) throw new Error('海平面配置无效');
  for (const [name, object] of Object.entries(config)) {
    if (object && typeof object === 'object' && name !== 'enemies') {
      for (const value of Object.values(object)) if (typeof value === 'number' && !positive(value)) throw new Error('数值必须为正数');
    }
  }
  if (!Number.isInteger(config.player.lives) || !Number.isInteger(config.bomb.max)) throw new Error('生命与弹量必须为整数');
  for (const type of Object.values(config.enemies)) {
    for (const key of ['speed', 'score', 'halfW', 'halfH']) if (!positive(type[key])) throw new Error('潜艇配置无效');
    if (type.attackCooldown !== undefined && !positive(type.attackCooldown)) throw new Error('鱼雷冷却无效');
  }
  if (!Array.isArray(waves) || !waves.length) throw new Error('缺少关卡');
  for (const wave of waves) {
    if (!Number.isInteger(wave.count) || wave.count < 1 || wave.count > 100 || !positive(wave.interval) || !positive(wave.speed)) throw new Error('波次配置无效');
    if (!wave.types.length || wave.types.some(t => !config.enemies[t])) throw new Error('未知潜艇');
    if (!wave.depths.length || wave.depths.some(d => d < config.world.waterline + 80 || d > config.world.height - 80)) throw new Error('深度配置无效');
    if (wave.dropChance !== undefined && (!Number.isFinite(wave.dropChance) || wave.dropChance < 0 || wave.dropChance > 1 || !wave.drops || !wave.drops.length || wave.drops.some(type => !['rapid', 'heavy', 'shield'].includes(type)))) throw new Error('补给配置无效');
  }
}

export class Simulation {
  constructor(config, waves, seed = 12345) {
    validateConfig(config, waves);
    this.config = config; this.waves = waves; this.seed = seed >>> 0; this.rng = new Random(seed);
    this.id = 1; this.eventId = 0; this.tick = 0; this.elapsed = 0;
    this.score = 0; this.kills = 0; this.maxCombo = 0; this.escaped = 0;
    this.shots = 0; this.bonusTotal = 0; this.waveResults = [];
    this.pickups = []; this.buffs = { rapid: 0, heavy: 0, shield: 0 };
    this.bombs = []; this.subs = []; this.torpedoes = []; this.explosions = []; this.chains = new Map(); this.events = [];
    this.player = { id: 0, x: 500, y: config.world.waterline - 8, px: 500, py: config.world.waterline - 8, halfW: config.player.halfW, halfH: config.player.halfH, lives: config.player.lives, invincible: 0, cooldown: 0 };
    this.wave = 0; this.status = 'countdown'; this.timer = 2.4; this.reason = ''; this.setupWave();
  }
  emit(type, data = {}) { this.events.push({ id: ++this.eventId, tick: this.tick, type, ...data }); }
  drainEvents() { const result = this.events; this.events = []; return result; }
  setupWave() { this.spawned = 0; this.waveTime = 0; this.nextSpawn = 0.6; this.waveStats = { shots: 0, kills: 0, points: 0 }; }
  settleWave() {
    if (this.waveResults.some(result => result.wave === this.wave + 1)) return;
    const result = { wave: this.wave + 1, ...this.waveStats, ...efficiencyReward(this.waveStats.shots, this.waveStats.kills, this.waveStats.points) };
    this.waveResults.push(result); this.score += result.bonus; this.bonusTotal += result.bonus;
    return result;
  }
  grantPowerup(type) {
    if (!Object.prototype.hasOwnProperty.call(this.buffs, type)) return;
    this.buffs[type] = this.config.powerups[type + 'Duration'];
    this.emit('powerup', { powerup: type, duration: this.buffs[type] });
  }
  dropPowerup(sub) {
    const wave = this.waves[this.wave];
    if (!wave.dropChance || this.pickups.length >= this.config.powerups.maxPickups || this.rng.next() >= wave.dropChance) return;
    const type = wave.drops[Math.floor(this.rng.next() * wave.drops.length)];
    this.pickups.push({ id: this.id++, type, x: clamp(sub.x, 80, this.config.world.width - 80), y: sub.y, px: clamp(sub.x, 80, this.config.world.width - 80), py: sub.y, age: 0 });
  }
  addSub(typeId, x, y, direction = 1, speed = 1) {
    const def = this.config.enemies[typeId];
    const sub = { id: this.id++, typeId, x, y, px: x, py: y, vx: direction * def.speed * speed, halfW: def.halfW, halfH: def.halfH, alive: true, attack: (def.attackCooldown || 1000) * (0.65 + this.rng.next() * 0.35) / (this.waves[this.wave].fireRate || 1), warning: false };
    this.subs.push(sub); return sub;
  }
  spawn() {
    const wave = this.waves[this.wave];
    const group = wave.formation ? Math.min(3, wave.count - this.spawned) : 1;
    const side = Math.floor(this.spawned / group) % 2 ? -1 : 1;
    for (let i = 0; i < group; i++) {
      const n = this.spawned++;
      const depth = wave.depths[n % wave.depths.length] + (wave.formation ? 0 : (this.rng.next() - 0.5) * 24);
      this.addSub(wave.types[n % wave.types.length], side > 0 ? -75 - i * 45 : 1075 + i * 45, depth, side, wave.speed);
    }
    this.nextSpawn += wave.interval;
  }
  kill(sub, cause) {
    if (!sub.alive) return;
    sub.alive = false;
    let chain = cause.chain;
    if (!chain) { chain = { id: cause.source.id, kills: 0, score: 0, depth: 0 }; this.chains.set(chain.id, chain); }
    const depth = cause.depth || 0, def = this.config.enemies[sub.typeId];
    const points = scoreFor(def.score, depth, this.config.scoring, sub.y);
    this.waveStats.kills++; this.waveStats.points += points;
    this.score += points; this.kills++; chain.kills++; chain.score += points; chain.depth = Math.max(chain.depth, depth);
    this.maxCombo = Math.max(this.maxCombo, chain.kills);
    this.emit('kill', { x: sub.x, y: sub.y, points, depth, combo: chain.kills, chainId: chain.id });
    this.dropPowerup(sub);
    if (def.chainExplodable) {
      this.explosions.push({ id: this.id++, x: sub.x, y: sub.y, radius: 0, age: 0, chainId: chain.id, depth, power: cause.source.power || 1, damaged: new Set() });
    }
  }
  step(dt, input = {}) {
    if (this.status === 'ended') return;
    if (Math.abs(dt - 1 / 60) > 1e-8) throw new Error('模拟仅接收1/60固定步长');
    this.tick++;
    if (this.status === 'countdown' || this.status === 'waveclear') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.status === 'waveclear') { this.wave++; this.setupWave(); }
        this.status = 'playing'; this.emit('wave', { wave: this.wave + 1 });
      }
      return;
    }
    this.elapsed += dt; this.waveTime += dt;
    const c = this.config, p = this.player;
    const activeExplosions = this.explosions.slice();
    p.px = p.x; p.py = p.y;
    p.invincible = Math.max(0, p.invincible - dt); p.cooldown = Math.max(0, p.cooldown - dt);
    p.x = clamp(p.x + clamp(Number(input.moveAxis) || 0, -1, 1) * c.player.speed * dt, p.halfW + 14, c.world.width - p.halfW - 14);
    for (const type of Object.keys(this.buffs)) this.buffs[type] = Math.max(0, this.buffs[type] - dt);
    this.pickups = this.pickups.filter(item => {
      item.px = item.x; item.py = item.y; item.age += dt;
      item.y = Math.max(c.world.waterline + 18, item.y - c.powerups.riseSpeed * dt);
      if (item.y <= c.world.waterline + 35 && Math.abs(item.x - p.x) <= p.halfW + 12) { this.grantPowerup(item.type); return false; }
      return item.age < c.powerups.pickupLifetime;
    });
    if (input.fireHeld && p.cooldown < 1e-9 && this.bombs.length < c.bomb.max) {
      this.bombs.push({ id: this.id++, x: p.x, y: c.world.waterline + 20, px: p.x, py: c.world.waterline + 20, alive: true, age: 0, speed: c.bomb.speed * (this.buffs.rapid > 0 ? c.powerups.speedMultiplier : 1), power: this.buffs.heavy > 0 ? c.powerups.blastMultiplier : 1 });
      this.shots++; this.waveStats.shots++;
      p.cooldown = c.bomb.cooldown; this.emit('bomb', { x: p.x, y: c.world.waterline + 20 });
    }
    if (this.spawned < this.waves[this.wave].count && this.waveTime >= this.nextSpawn) this.spawn();
    const newTorpedoes = [];
    for (const sub of this.subs) {
      sub.px = sub.x; sub.py = sub.y; sub.x += sub.vx * dt;
      if ((sub.vx > 0 && sub.x > c.world.width + 100) || (sub.vx < 0 && sub.x < -100)) { sub.alive = false; this.escaped++; continue; }
      const def = c.enemies[sub.typeId];
      if (def.attackCooldown && sub.x > 65 && sub.x < c.world.width - 65) {
        sub.attack -= dt; sub.warning = sub.attack < 0.7;
        if (sub.attack <= 0) {
          const lanes = def.weapon === 'salvo' ? [-65, 0, 65] : [0];
          for (const vx of lanes) if (this.torpedoes.length + newTorpedoes.length < 35) newTorpedoes.push({ id: this.id++, x: sub.x, y: sub.y - 24, px: sub.x, py: sub.y - 24, alive: true, vx, speed: def.torpedoSpeed || c.torpedo.speed, homing: def.weapon === 'homing' });
          sub.attack = def.attackCooldown / (this.waves[this.wave].fireRate || 1); sub.warning = false; this.emit('torpedo', { x: sub.x, y: sub.y });
        }
      }
    }
    for (const bomb of this.bombs) { bomb.px = bomb.x; bomb.py = bomb.y; bomb.age = (bomb.age || 0) + dt; bomb.y += (bomb.speed || c.bomb.speed) * dt; }
    for (const torpedo of this.torpedoes) {
      torpedo.px = torpedo.x; torpedo.py = torpedo.y;
      if (torpedo.homing && torpedo.y > c.world.waterline + 100) {
        const desired = clamp((p.x - torpedo.x) * 1.2, -90, 90);
        torpedo.vx = (torpedo.vx || 0) + clamp(desired - (torpedo.vx || 0), -120 * dt, 120 * dt);
      }
      torpedo.x += (torpedo.vx || 0) * dt; torpedo.y -= (torpedo.speed || c.torpedo.speed) * dt;
    }
    const hits = [];
    for (const bomb of this.bombs) {
      for (const sub of this.subs) if (sub.alive) {
        const time = sweptHit(bomb, sub, c.bomb.radius * (bomb.power || 1));
        if (time !== null) hits.push({ time, priority: 0, source: bomb, target: sub, depth: 0 });
      }
    }
    for (const ex of activeExplosions) {
      ex.age += dt; ex.radius = Math.min(c.explosion.radius * (ex.power || 1), ex.radius + c.explosion.growth * (ex.power || 1) * dt);
      if (ex.age > c.explosion.lifetime + 1e-9) continue;
      for (const sub of this.subs) if (sub.alive && !ex.damaged.has(sub.id) && circleBox(ex.x, ex.y, ex.radius, sub)) {
        ex.damaged.add(sub.id);
        hits.push({ time: 1, priority: 1, source: ex, target: sub, depth: ex.depth + 1, chain: this.chains.get(ex.chainId) });
      }
    }
    hits.sort(sortHits);
    for (const hit of hits) {
      if (!hit.target.alive || (hit.priority === 0 && !hit.source.alive)) continue;
      if (hit.priority === 0) hit.source.alive = false;
      this.kill(hit.target, hit);
    }
    const playerHits = this.torpedoes.map(t => ({ t, time: sweptHit(t, p, c.torpedo.radius) })).filter(h => h.time !== null).sort((a, b) => a.time - b.time || a.t.id - b.t.id);
    for (const hit of playerHits) {
      hit.t.alive = false;
      if (this.buffs.shield > 0) { this.emit('shield-hit', { x: p.x, y: p.y }); continue; }
      if (p.invincible > 0) continue;
      p.lives--; p.invincible = c.player.invincible; this.emit('damage', { x: p.x, y: p.y });
      if (p.lives <= 0) { this.end('被鱼雷击中了'); break; }
    }
    this.subs = this.subs.filter(s => s.alive);
    this.bombs = this.bombs.filter(b => b.alive && b.y < c.world.height + 25);
    this.torpedoes = this.torpedoes.filter(t => t.alive && t.y > c.world.waterline - 55 && t.x > -40 && t.x < c.world.width + 40).concat(newTorpedoes);
    this.explosions = this.explosions.filter(e => e.age < c.explosion.lifetime - 1e-9);
    for (const [id, chain] of this.chains) if (!this.explosions.some(e => e.chainId === id)) {
      this.emit('chain', { combo: chain.kills, points: chain.score }); this.chains.delete(id);
    }
    if (this.status === 'ended') return;
    if (this.spawned >= this.waves[this.wave].count && !this.subs.length && !this.torpedoes.length && !this.explosions.length) {
      this.bombs = [];
      this.emit('waveclear', this.settleWave());
      if (this.wave === this.waves.length - 1) this.end('全部波次都打完了');
      else { this.status = 'waveclear'; this.timer = 2.6; }
    }
    if (this.waveTime > 180) this.end('这一波出了点问题，请重新开一局');
  }
  end(reason) { this.status = 'ended'; this.reason = reason; this.emit('end', { reason }); }
  snapshot() {
    return { buffs: { ...this.buffs }, pickups: this.pickups.map(item => ({ ...item })), tick: this.tick, seed: this.seed, random: this.rng.state, wave: this.wave, status: this.status, score: this.score, kills: this.kills, maxCombo: this.maxCombo, escaped: this.escaped, shots: this.shots, bonusTotal: this.bonusTotal, waveStats: { ...this.waveStats }, waveResults: this.waveResults.map(result => ({ ...result })), elapsed: this.elapsed, player: { ...this.player }, subs: this.subs.map(s => ({ ...s })), bombs: this.bombs.map(b => ({ ...b })), torpedoes: this.torpedoes.map(t => ({ ...t })), explosions: this.explosions.map(e => ({ ...e, damaged: [...e.damaged] })), chains: [...this.chains.values()].map(c => ({ ...c })), spawned: this.spawned, nextSpawn: this.nextSpawn, waveTime: this.waveTime, timer: this.timer, nextId: this.id, eventId: this.eventId, reason: this.reason };
  }
}
