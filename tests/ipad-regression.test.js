import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.js';
import { AudioMixer } from '../src/audio/AudioMixer.js';
import { restoreCheckpoint } from '../src/core/Checkpoint.js';
const config=JSON.parse(readFileSync(new URL('../src/config/game-balance.json',import.meta.url)));
const waves=JSON.parse(readFileSync(new URL('../src/config/waves.json',import.meta.url)));

test('late encounters vary size and spacing, retaining achievable but non-guaranteed chains',()=>{
  for(let wave=5;wave<10;wave++) {
    const sizes=new Set(),gaps=new Set();let chains=0,missedChains=0;
    for(let seed=1;seed<=80;seed++) {
      const sim=new Simulation(config,waves,seed*7919);sim.wave=wave;sim.setupWave();sim.status='playing';sim.player.invincible=100;sim.spawn();sim.nextSpawn=999;
      const size=sim.subs.length;sizes.add(size);
      if(size>1)gaps.add(Math.abs(sim.subs[0].y-sim.subs[1].y)<60?'tight':'loose');
      for(let i=0;i<210;i++)sim.step(1/60,{});
      const target=sim.subs[0];sim.bombs.push({id:sim.id++,x:target.x,y:target.y,px:target.x,py:target.y,alive:true});
      for(let i=0;i<45;i++)sim.step(1/60,{});
      if(size>1){if(sim.maxCombo>1)chains++;else missedChains++;}
    }
    assert.deepEqual([...sizes].sort(),[1,2,3]);assert.equal(gaps.size,2);
    assert.ok(chains>0,`wave ${wave+1} lost chain opportunities`);
    assert.ok(missedChains>0,`wave ${wave+1} gives every group away`);
  }
});

test('late waves increase total, arrival density and weapon pressure together',()=>{
  for(let i=6;i<10;i++) {
    assert.ok(waves[i].count>waves[i-1].count);
    assert.ok(waves[i].interval<waves[i-1].interval);
    assert.ok(waves[i].fireRate>waves[i-1].fireRate);
    assert.ok(waves[i].encounters.tight<waves[i-1].encounters.tight);
  }
  const invalid=JSON.parse(JSON.stringify(waves));invalid[5].encounters.single=1.1;
  assert.throws(()=>new Simulation(config,invalid,1));
});

test('late encounter RNG and timing remain deterministic after saving mid-wave',()=>{
  const original=new Simulation(config,waves,98765);original.wave=8;original.setupWave();original.status='playing';original.player.invincible=100;
  for(let i=0;i<400;i++)original.step(1/60,{});
  const restored=restoreCheckpoint(Simulation,config,waves,{version:1,balanceVersion:config.version,state:original.snapshot()});
  for(let i=0;i<1400;i++){original.step(1/60,{});restored.step(1/60,{});}
  assert.deepEqual(restored.snapshot(),original.snapshot());
});

test('WebKit interrupted context resumes and primes output; running gestures do not accumulate sources',()=>{
  const previous=globalThis.window;let resumes=0,sources=0,starts=0;
  const c={state:'interrupted',sampleRate:44100,destination:{},resume(){resumes++;return Promise.resolve();},createBuffer(){return {};},createBufferSource(){sources++;return {connect(){},disconnect(){},start(){starts++;}};}};
  globalThis.window={navigator:{audioSession:{type:'ambient'}}};
  try {const mixer=new AudioMixer();mixer.context=c;mixer.unlock();assert.equal(resumes,1);assert.equal(starts,1);assert.equal(window.navigator.audioSession.type,'playback');c.state='running';mixer.unlock();assert.equal(sources,1);}
  finally {globalThis.window=previous;}
});
