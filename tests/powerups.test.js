import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation, validateConfig } from '../src/core/Simulation.js';
const config = JSON.parse(readFileSync(new URL('../src/config/game-balance.json', import.meta.url)));
const waves = JSON.parse(readFileSync(new URL('../src/config/waves.json', import.meta.url)));
function scene(wave = 0, seed = 42) {
  const s = new Simulation(config, waves, seed); s.wave = wave; s.setupWave(); s.status = 'playing'; s.spawned = waves[wave].count;
  const target = s.addSub('S01', 900, 1100); target.vx = 0; return s;
}
const step = (s, n = 1, input = {}) => { for (let i = 0; i < n; i++) { s.step(1/60, input); s.drainEvents(); } };
test('first five waves have no drops; later waves introduce tools and enemies gradually', () => {
  assert.ok(waves.slice(0, 5).every(w => !w.dropChance));
  assert.deepEqual(waves[5].drops, ['rapid']); assert.ok(waves[6].drops.includes('heavy')); assert.ok(waves[7].drops.includes('shield'));
  assert.ok(waves.slice(0, 5).every(w => !w.types.includes('S04') && !w.types.includes('S05')));
  const bad = structuredClone(waves); bad[5].dropChance = 2; assert.throws(() => validateConfig(config, bad));
});
test('seeded drops obey wave table and pool cap, never during warmup', () => {
  const warm = scene(); for (let i = 0; i < 100; i++) warm.dropPowerup({ x: 500, y: 500 }); assert.equal(warm.pickups.length, 0);
  const a = scene(5), b = scene(5);
  for (let i = 0; i < 100; i++) { a.dropPowerup({ x: 500, y: 700 }); b.dropPowerup({ x: 500, y: 700 }); }
  assert.equal(a.pickups.length, 1); assert.ok(a.pickups.every(p => p.type === 'rapid')); assert.deepEqual(a.snapshot(), b.snapshot());
});
test('pickup must reach surface and ship; missed pickups expire', () => {
  const s = scene(7); s.pickups.push({ id: 500, type: 'shield', x: 500, y: 400, px: 500, py: 400, age: 0 });
  step(s); assert.equal(s.buffs.shield, 0);
  step(s, 130); assert.ok(s.buffs.shield > 0); assert.equal(s.pickups.length, 0);
  s.pickups.push({ id: 501, type: 'heavy', x: 80, y: 400, px: 80, py: 400, age: 0 });
  step(s, 850); assert.equal(s.pickups.length, 0); assert.equal(s.buffs.heavy, 0);
});
test('buff does not refresh while active, expires and resets on a fresh run', () => {
  const s = scene(); s.grantPowerup('rapid'); step(s, 120); assert.ok(s.buffs.rapid < 6.01);
  const remaining=s.buffs.rapid; s.grantPowerup('rapid'); assert.equal(s.buffs.rapid, remaining); step(s, 301); assert.equal(s.buffs.rapid, 0);
  s.grantPowerup('shield'); assert.deepEqual(scene().buffs, { rapid: 0, heavy: 0, shield: 0 });
});
test('speed and heavy buffs apply to fired bombs, without changing ammo count', () => {
  const s = scene(); s.grantPowerup('rapid'); s.grantPowerup('heavy'); step(s, 1, { fireHeld: true });
  assert.equal(s.bombs[0].speed, config.bomb.speed*config.powerups.speedMultiplier); assert.equal(s.bombs[0].power, config.powerups.blastMultiplier); assert.equal(s.shots, 1);
  s.buffs.rapid = 0; s.buffs.heavy = 0; s.player.cooldown = 0; step(s, 1, { fireHeld: true });
  assert.equal(s.bombs[1].speed, 300); assert.equal(s.bombs[1].power, 1);
  const sub = s.addSub('S01', 300, 500); sub.vx = 0;
  s.kill(sub, { source: s.bombs[0], depth: 0 }); step(s, 17);
  assert.ok(s.explosions.some(e => e.power === config.powerups.blastMultiplier && e.radius > 95));
});
test('shield absorbs a hit, then expiration restores damage and invulnerability', () => {
  const s = scene(); const shot = () => ({ id: s.id++, x: 500, px: 500, y: 172, py: 172, alive: true });
  s.grantPowerup('shield'); s.torpedoes.push(shot()); s.step(1/60);
  assert.equal(s.player.lives, 3); assert.equal(s.torpedoes.length, 0); assert.ok(s.drainEvents().some(e => e.type === 'shield-hit'));
  assert.equal(s.buffs.shield,0); step(s,40); s.torpedoes.push(shot(), shot()); s.step(1/60);
  assert.equal(s.player.lives, 2); assert.ok(s.drainEvents().some(e => e.type === 'damage'));
});
test('hunter steers with a speed cap and locks direction near the surface', () => {
  const s = scene(5); const sub = s.addSub('S04', 200, 700); sub.vx = 0; sub.attack = 0;
  step(s); assert.equal(s.torpedoes.length, 1); assert.equal(s.torpedoes[0].homing, true);
  step(s, 50); assert.ok(s.torpedoes[0].x > 200); assert.ok(s.torpedoes[0].vx <= 90);
  s.torpedoes[0].y = 250; s.torpedoes[0].py = 250; const vx = s.torpedoes[0].vx; s.player.x = 80;
  step(s); assert.equal(s.torpedoes[0].vx, vx);
});
test('salvo produces three distinct spread lanes with warning and bounded pool', () => {
  const s = scene(6); const sub = s.addSub('S05', 500, 800); sub.vx = 0; sub.attack = 0.5;
  step(s); assert.equal(sub.warning, true); sub.attack = 0; step(s);
  assert.equal(s.torpedoes[1].vx-s.torpedoes[0].vx,65); assert.equal(s.torpedoes[2].vx-s.torpedoes[1].vx,65); step(s, 10);
  assert.ok(s.torpedoes[0].x < 500 && s.torpedoes[2].x > 500);
  for (let i = 0; i < 20; i++) { const target = s.addSub('S05', 300 + i * 10, 800); target.vx = 0; target.attack = 0; }
  step(s); assert.equal(s.torpedoes.length, 35);
});


test('supplies cannot snowball from chains or bypass cooldown and wave budget',()=>{
 const s=scene(7);s.waves=structuredClone(waves);s.waves[7].dropChance=1;
 const chain={id:999,kills:0,score:0,depth:0};
 for(let i=0;i<3;i++){const sub=s.addSub('S01',500,600);s.kill(sub,{chain,source:{id:999},depth:i});}
 assert.equal(s.pickups.length,1);assert.equal(s.waveStats.supplyDrops,1);
 s.pickups=[];s.dropPowerup({x:500,y:600});assert.equal(s.pickups.length,0);
 s.waveTime=20;s.buffs.rapid=1;s.dropPowerup({x:500,y:600});assert.equal(s.pickups.length,0);
 s.buffs.rapid=0;
 for(let i=0;i<10;i++){s.waveTime+=20;s.dropPowerup({x:500,y:600});s.pickups=[];}
 assert.equal(s.waveStats.supplyDrops,3);
});

test('late aimed shot threatens a stationary ship with warning before its first launch',()=>{
 const s=scene(9);s.waves=structuredClone(waves);s.waves[9].aimChance=1;const sub=s.addSub('S03',200,700);sub.vx=0;
 assert.ok(sub.attack>=.7);sub.attack=.6;step(s);assert.ok(sub.warning);
 sub.attack=0;step(s);const t=s.torpedoes[0];assert.ok(t.vx>0);assert.ok(t.speed>config.torpedo.speed);
 for(let i=0;i<200 && s.player.lives===3;i++)step(s);
 assert.ok(s.player.lives<3);
});
