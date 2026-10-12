import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.js';
import { restoreCheckpoint } from '../src/core/Checkpoint.js';
const config=JSON.parse(readFileSync(new URL('../src/config/game-balance.json',import.meta.url)));
const waves=JSON.parse(readFileSync(new URL('../src/config/waves.json',import.meta.url)));

test('mixed formations separate noticeably while keeping native fast/slow ordering',()=>{
  const table=JSON.parse(JSON.stringify(waves));table[7].encounters={single:0,triple:1,tight:1};table[7].types=['S02','S05','S03'];
  const s=new Simulation(config,table,123);s.wave=7;s.setupWave();s.status='playing';s.player.invincible=100;s.spawn();s.nextSpawn=999;
  const fast=s.subs[0],slow=s.subs[1],start=Math.abs(fast.x-slow.x);
  assert.ok(Math.abs(fast.vx)-Math.abs(slow.vx)>55*table[7].speed);
  for(let i=0;i<120;i++)s.step(1/60,{});
  assert.ok(Math.abs(fast.x-slow.x)-start>100);
});

function blast(wave,power=1) {
  const s=new Simulation(config,waves,123);s.wave=wave;s.setupWave();s.status='playing';s.spawned=waves[wave].count;
  const a=s.addSub('S01',400,500),b=s.addSub('S01',540,500);a.vx=b.vx=0;
  s.kill(a,{source:{id:s.id++,power},depth:0});
  for(let i=0;i<17;i++)s.step(1/60,{});
  return s;
}

test('later blast cannot reach an old boundary target; heavy tool still helps',()=>{
  assert.equal(blast(0).kills,2);assert.equal(blast(9).kills,1);
  const heavy=blast(9,config.powerups.blastMultiplier);assert.equal(heavy.kills,2);
  for(let wave=5;wave<10;wave++)assert.ok(Math.abs(blast(wave).explosions[0].maxRadius-config.explosion.radius*waves[wave].chainRadiusScale)<1e-9);
});

test('active smaller blast persists exactly across checkpoint recovery',()=>{
  const s=blast(9);const snapshot=s.snapshot();
  const restored=restoreCheckpoint(Simulation,config,waves,{version:1,balanceVersion:config.version,state:snapshot});
  for(let i=0;i<60;i++){s.step(1/60,{});restored.step(1/60,{});}
  assert.deepEqual(restored.snapshot(),s.snapshot());
  const bad=JSON.parse(JSON.stringify(waves));bad[9].chainRadiusScale=1.1;
  assert.throws(()=>new Simulation(config,bad,1));
});
