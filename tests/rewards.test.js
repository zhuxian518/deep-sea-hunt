import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.js';
import { scoreFor, efficiencyReward } from '../src/systems/Scoring.js';
import { freshProfile, parseProfile } from '../src/platform/StorageAdapter.js';
const config = JSON.parse(readFileSync(new URL('../src/config/game-balance.json', import.meta.url)));
const waves = JSON.parse(readFileSync(new URL('../src/config/waves.json', import.meta.url)));
test('depth boundaries stack with type and chain multipliers, rounding once', () => {
  assert.equal(scoreFor(100, 0, config.scoring, 499.99), 100);
  assert.equal(scoreFor(100, 0, config.scoring, 500), 125);
  assert.equal(scoreFor(100, 0, config.scoring, 799.99), 125);
  assert.equal(scoreFor(100, 0, config.scoring, 800), 150);
  assert.equal(scoreFor(180, 1, config.scoring, 850), 405);
  assert.equal(scoreFor(150, 9, config.scoring, 850), 675);
});
test('efficiency tiers reward fewer bombs, with safe empty and miss cases', () => {
  for (const [shots, kills, rate] of [[0,0,0],[0,5,0],[10,0,0],[10,9,0],[10,10,0.1],[10,19,0.1],[10,20,0.25],[10,29,0.25],[10,30,0.5],[10,50,0.5]]) {
    const r = efficiencyReward(shots, kills, 999); assert.equal(r.rate, rate); assert.equal(r.bonus, Math.floor(999 * rate));
  }
});
test('actual emissions count shots, blocked cooldown and five-bomb cap do not', () => {
  const s = new Simulation(config, waves); s.status = 'playing';
  for (let i = 0; i < 100; i++) s.step(1/60, { fireHeld: true });
  assert.equal(s.shots, 5); assert.equal(s.waveStats.shots, 5);
});
test('last wave settles after explosions, exactly once, before final score', () => {
  const s = new Simulation(config, waves); s.wave = waves.length - 1; s.setupWave(); s.status = 'playing'; s.spawned = waves[s.wave].count;
  const sub = s.addSub('S01', 500, 350); sub.vx = 0;
  s.step(1/60, { fireHeld: true });
  s.bombs[0].y = 325; s.bombs[0].py = 325;
  for (let i = 0; i < 35; i++) s.step(1/60);
  assert.equal(s.status, 'ended'); assert.equal(s.waveStats.kills, 1); assert.equal(s.waveStats.shots, 1);
  assert.equal(s.waveResults.length, 1); assert.equal(s.bonusTotal, 10); assert.equal(s.score, 110);
  s.settleWave(); s.step(1/60); assert.equal(s.score, 110); assert.equal(s.waveResults.length, 1);
});
test('wave stats reset, previous result retained, failure does not award bonus', () => {
  const s = new Simulation(config, waves); s.waveStats = { shots: 2, kills: 4, points: 600 };
  s.settleWave(); assert.equal(s.score, 150); s.wave++; s.setupWave();
  assert.deepEqual(s.waveStats, { shots: 0, kills: 0, points: 0 }); assert.equal(s.waveResults[0].bonus, 150);
  s.waveStats = { shots: 1, kills: 3, points: 800 }; s.end('被鱼雷击中了');
  assert.equal(s.score, 150); assert.equal(s.waveResults.length, 1);
});
test('music preference migrates old records and round-trips independently of SFX', () => {
  const old = freshProfile(); delete old.settings.music; old.bestScore = 123;
  assert.equal(parseProfile(JSON.stringify(old)).settings.music, false);
  old.settings.music = true; old.settings.sfx = false;
  const parsed = parseProfile(JSON.stringify(old)); assert.equal(parsed.settings.music, true); assert.equal(parsed.settings.sfx, false); assert.equal(parsed.bestScore, 123);
});
