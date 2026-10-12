import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation, validateConfig } from '../src/core/Simulation.js';
import { Clock } from '../src/core/Clock.js';
import { Random } from '../src/core/Random.js';
import { circleBox, sweptHit } from '../src/systems/Collision.js';
import { scoreFor, efficiencyReward } from '../src/systems/Scoring.js';
import { viewport, toScreen, toWorld } from '../src/render/geometry.js';
const balance = JSON.parse(readFileSync(new URL('../src/config/game-balance.json', import.meta.url)));
const waves = JSON.parse(readFileSync(new URL('../src/config/waves.json', import.meta.url)));
const dt = 1 / 60;
function isolated(seed = 123, config = balance) { const sim = new Simulation(config, waves, seed); sim.status = 'playing'; sim.spawned = waves[0].count; return sim; }
function advance(sim, ticks, input = {}) { const events = []; for (let i = 0; i < ticks; i++) { sim.step(dt, input); events.push(...sim.drainEvents()); } return events; }
function stationary(sim, x, y, type = 'S01') { const sub = sim.addSub(type, x, y); sub.vx = 0; return sub; }
function bomb(sim, x, y) { const b = { id: sim.id++, x, y, px: x, py: y, alive: true }; sim.bombs.push(b); return b; }

test('configuration rejects unknown types, invalid speeds and world depth', () => {
  assert.doesNotThrow(() => validateConfig(balance, waves));
  const bad = structuredClone(balance); bad.enemies.S01.speed = NaN;
  assert.throws(() => validateConfig(bad, waves));
  const w = structuredClone(waves); w[0].types = ['missing']; assert.throws(() => validateConfig(balance, w));
  w[0].types = ['S01']; w[0].depths = [1201]; assert.throws(() => validateConfig(balance, w));
});
test('player clamps at both borders', () => {
  const sim = new Simulation(balance, waves); sim.status = 'playing';
  advance(sim, 300, { moveAxis: -1 }); assert.equal(sim.player.x, 80);
  advance(sim, 300, { moveAxis: 1 }); assert.equal(sim.player.x, 920);
});
test('held fire respects cooldown and five-bomb cap', () => {
  const sim = new Simulation(balance, waves); sim.status = 'playing';
  advance(sim, 120, { fireHeld: true }); assert.equal(sim.bombs.length, 5);
  const events = advance(sim, 30, { fireHeld: true }); assert.equal(events.filter(e => e.type === 'bomb').length, 0);
});
test('live bombs eventually recycle and can be fired again', () => {
  const sim = isolated(); stationary(sim, 900, 1100); advance(sim, 360, { fireHeld: true });
  assert.ok(sim.bombs.length <= 5); assert.ok(sim.id > 10);
});
test('swept projectile catches high-speed crossing and relative ship movement', () => {
  const target = { x: 500, px: 500, y: 147, py: 147, halfW: 66, halfH: 18 };
  assert.notEqual(sweptHit({ x: 500, px: 500, y: 50, py: 300 }, target, 7), null);
  assert.equal(sweptHit({ x: 700, px: 700, y: 50, py: 300 }, target, 7), null);
  assert.notEqual(sweptHit({ x: 500, px: 500, y: 147, py: 147 }, { ...target, px: 300, x: 700 }, 7), null);
});
test('explosion touches AABB exact edge inclusively', () => {
  assert.equal(circleBox(0, 0, 95, { x: 105, y: 0, halfW: 10, halfH: 10 }), true);
  assert.equal(circleBox(0, 0, 95, { x: 105.001, y: 0, halfW: 10, halfH: 10 }), false);
});
test('scoring multiplier caps at three and floors integers', () => {
  assert.equal(scoreFor(101, 1, balance.scoring), 151); assert.equal(scoreFor(100, 100, balance.scoring), 300); assert.equal(scoreFor(-5, -2, balance.scoring), 0);
});
for (const name of ['one-hit', 'simple-chain', 'simultaneous-hits', 'ship-torpedo', 'last-enemy-wave-clear']) test(`replay fixture: ${name}`, () => {
  const f = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
  const sim = isolated(f.seed);
  if (f.finalWave) { sim.wave = waves.length - 1; sim.spawned = waves[sim.wave].count; }
  for (const s of f.subs || []) stationary(sim, s.x, s.y, s.type);
  for (const b of f.bombs || (f.bomb ? [f.bomb] : [])) bomb(sim, b.x, b.y);
  if (f.torpedoes) { stationary(sim, 100, 1100); sim.torpedoes = f.torpedoes.map(t => ({ id: sim.id++, ...t, px: t.x, py: t.y, alive: true })); }
  advance(sim, f.torpedoes ? 1 : 100);
  for (const [key, value] of Object.entries(f.expected)) assert.equal(key === 'lives' ? sim.player.lives : sim[key], value, key);
});
test('new explosions only expand next tick; A→B→C has depths 0,1,2', () => {
  const sim = isolated(); stationary(sim, 400, 450); stationary(sim, 530, 450); stationary(sim, 660, 450); bomb(sim, 400, 425);
  sim.step(dt); const first = sim.drainEvents(); assert.equal(first.filter(e => e.type === 'kill').length, 1); assert.equal(sim.explosions[0].radius, 0);
  const events = advance(sim, 40); assert.deepEqual(events.filter(e => e.type === 'kill').map(e => e.depth), [1, 2]);
});
test('overlapping direct hits form independent chains with stable IDs', () => {
  const sim = isolated(); stationary(sim, 250, 450); stationary(sim, 750, 450); const a = bomb(sim, 250, 425), b = bomb(sim, 750, 425);
  sim.step(dt); assert.deepEqual(sim.drainEvents().filter(e => e.type === 'kill').map(e => e.chainId), [a.id, b.id]);
});
test('overlapping explosions award a third target once with stable attribution', () => {
  const sim = isolated(); const a = stationary(sim, 400, 450); const b = stationary(sim, 600, 450); const third = stationary(sim, 500, 450);
  const ba = bomb(sim, a.x, 425), bb = bomb(sim, b.x, 425); sim.step(dt); sim.drainEvents();
  const events = advance(sim, 40).filter(e => e.type === 'kill');
  assert.equal(events.length, 1); assert.equal(events[0].chainId, ba.id); assert.equal(sim.kills, 3); assert.equal(third.alive, false); assert.notEqual(ba.id, bb.id);
});
test('expired explosion never kills a later arrival', () => {
  const sim = isolated(); stationary(sim, 400, 450); stationary(sim, 900, 1100); bomb(sim, 400, 425); advance(sim, 30);
  stationary(sim, 400, 450); advance(sim, 20); assert.equal(sim.kills, 1); assert.equal(sim.explosions.length, 0);
});
test('non-explodable enemy terminates propagation', () => {
  const cfg = structuredClone(balance); cfg.enemies.S02.chainExplodable = false;
  const sim = isolated(10, cfg); stationary(sim, 400, 450); stationary(sim, 530, 450, 'S02'); stationary(sim, 660, 450); bomb(sim, 400, 425);
  advance(sim, 50); assert.equal(sim.kills, 2); assert.equal(sim.subs.length, 1);
});
test('invulnerability blocks repeated hits; damage resumes after window', () => {
  const sim = isolated(); stationary(sim, 900, 1100);
  const torpedo = () => ({ id: sim.id++, x: sim.player.x, px: sim.player.x, y: 172, py: 172, alive: true });
  sim.torpedoes.push(torpedo(), torpedo()); advance(sim, 1); assert.equal(sim.player.lives, 2);
  sim.torpedoes.push(torpedo()); advance(sim, 1); assert.equal(sim.player.lives, 2);
  advance(sim, 95); sim.torpedoes.push(torpedo()); advance(sim, 1); assert.equal(sim.player.lives, 1);
  advance(sim, 95); sim.torpedoes.push(torpedo()); advance(sim, 1); assert.equal(sim.status, 'ended'); assert.equal(sim.player.lives, 0);
});
test('wave waits for hazardous torpedoes and active damage fields', () => {
  const sim = isolated(); sim.torpedoes = [{ id: sim.id++, x: 100, y: 600, px: 100, py: 600, alive: true }];
  advance(sim, 1); assert.equal(sim.status, 'playing'); advance(sim, 300); assert.equal(sim.wave, 1);
});
test('all 188 enemies resolve across ten waves without firing, no deadlock', () => {
  const config = structuredClone(balance); config.player.lives = 999;
  const sim = new Simulation(config, waves, 78421); let largest = 0;
  for (let i = 0; i < 60 * 1000 && sim.status !== 'ended'; i++) { sim.step(dt, { moveAxis: sim.tick % 240 < 120 ? 1 : -1 }); sim.drainEvents(); largest = Math.max(largest, sim.subs.length); }
  assert.equal(sim.status, 'ended'); assert.equal(sim.wave, 9); assert.equal(sim.escaped, 188); assert.equal(sim.reason, '全部波次都打完了'); assert.ok(largest < 30); assert.equal(sim.chains.size, 0); assert.equal(sim.waveResults.length, 10); assert.equal(sim.bonusTotal, 0);
});
test('seed and tick input replay deterministically', () => {
  const a = new Simulation(balance, waves, 42), b = new Simulation(balance, waves, 42);
  for (let i = 0; i < 5000; i++) { const input = { moveAxis: i % 300 < 150 ? -1 : 1, fireHeld: i % 19 < 12 }; for (const sim of [a, b]) { sim.step(dt, input); sim.drainEvents(); } }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test('30Hz and 60Hz render clocks produce identical simulation ticks and state', () => {
  const simulate = fps => { const sim = new Simulation(balance, waves, 8), clock = new Clock(); for (let i = 0; i <= fps * 12; i++) clock.advance(i * 1000 / fps, true, step => { sim.step(step, { moveAxis: sim.tick % 120 < 60 ? 1 : -1, fireHeld: true }); sim.drainEvents(); }); return sim.snapshot(); };
  assert.deepEqual(simulate(30), simulate(60));
});
test('clock freezes when paused and caps catchup on long frames', () => {
  const clock = new Clock(); let ticks = 0; clock.advance(0, true, () => ticks++); clock.advance(5000, false, () => ticks++); assert.equal(ticks, 0);
  clock.advance(10000, true, () => ticks++); assert.equal(ticks, 5); clock.reset(); clock.advance(20000, true, () => ticks++); assert.equal(ticks, 5);
});
test('world coordinates round-trip and uniform scale at multiple sizes and DPRs', () => {
  for (const [width, height] of [[360, 430], [390, 550], [900, 400]]) for (const dpr of [1, 2, 3]) {
    const view = viewport(width, height, balance.world, dpr), point = { x: 712.4, y: 1038.6 }, back = toWorld(toScreen(point, view), view);
    assert.ok(Math.abs(point.x - back.x) < 1e-9 && Math.abs(point.y - back.y) < 1e-9); assert.ok(view.dpr <= 2);
  }
});
test('PRNG zero seed remains nonzero and repeats exactly', () => {
  const a = new Random(0), b = new Random(0); for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next()); assert.notEqual(a.state, 0);
});
test('step rejects variable dt', () => { assert.throws(() => isolated().step(1 / 30)); });
test('dense scene: 20 targets, 25 projectiles and 12 fields never duplicate scoring', () => {
  const sim = isolated();
  for (let i = 0; i < 20; i++) stationary(sim, 450 + i * 5, 500);
  for (let i = 0; i < 5; i++) bomb(sim, 30, 500 + i * 30);
  for (let i = 0; i < 20; i++) sim.torpedoes.push({ id: sim.id++, x: 950, px: 950, y: 1100, py: 1100, alive: true });
  for (let i = 0; i < 12; i++) {
    const id = sim.id++; sim.chains.set(id, { id, kills: 0, score: 0, depth: 0 });
    sim.explosions.push({ id, x: 500, y: 500, age: 0, radius: 0, chainId: id, depth: 0, damaged: new Set() });
  }
  const events = advance(sim, 100); assert.equal(events.filter(e => e.type === 'kill').length, 20); assert.equal(sim.kills, 20); assert.equal(sim.score, 3740); assert.equal(sim.chains.size, 0);
});
test('20 simulated minutes of repeat games keep entity collections bounded', () => {
  const cfg = structuredClone(balance); cfg.player.lives = 999;
  let sim = new Simulation(cfg, waves, 55), runs = 1;
  for (let i = 0; i < 60 * 1200; i++) {
    sim.step(dt, { moveAxis: i % 240 < 120 ? 1 : -1, fireHeld: true }); sim.drainEvents();
    assert.ok(sim.subs.length < 30 && sim.bombs.length <= 5 && sim.torpedoes.length <= 35 && sim.explosions.length < 30 && sim.chains.size < 30 && sim.pickups.length <= 4);
    if (sim.status === 'ended') { runs++; sim = new Simulation(cfg, waves, 55 + runs); }
  }
  assert.ok(runs >= 3);
});
