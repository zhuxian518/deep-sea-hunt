import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation } from '../src/core/Simulation.js';
import { AudioMixer } from '../src/audio/AudioMixer.js';
const config=JSON.parse(readFileSync(new URL('../src/config/game-balance.json',import.meta.url)));
const waves=JSON.parse(readFileSync(new URL('../src/config/waves.json',import.meta.url)));

test('every late wave offers a natural moving formation that chains from one hit',()=>{
  for(let wave=5;wave<10;wave++) {
    const sim=new Simulation(config,waves,123);sim.wave=wave;sim.setupWave();sim.status='playing';sim.spawn();
    assert.equal(sim.subs.length,3);
    // Advance the real spawned group into the sea; do not reposition targets.
    for(let i=0;i<210;i++)sim.step(1/60,{});
    sim.player.invincible=10;
    const target=sim.subs[0];
    sim.bombs.push({id:sim.id++,x:target.x,y:target.y,px:target.x,py:target.y,alive:true});
    for(let i=0;i<45;i++)sim.step(1/60,{});
    assert.ok(sim.maxCombo>=3,`wave ${wave+1}: ${sim.maxCombo}`);
  }
});

test('WebKit interrupted context resumes and primes output; running gestures do not accumulate sources',()=>{
  const previous=globalThis.window;let resumes=0,sources=0,starts=0;
  const c={state:'interrupted',sampleRate:44100,destination:{},resume(){resumes++;return Promise.resolve();},createBuffer(){return {};},createBufferSource(){sources++;return {connect(){},disconnect(){},start(){starts++;}};}};
  globalThis.window={navigator:{audioSession:{type:'ambient'}}};
  try {const mixer=new AudioMixer();mixer.context=c;mixer.unlock();assert.equal(resumes,1);assert.equal(starts,1);assert.equal(window.navigator.audioSession.type,'playback');c.state='running';mixer.unlock();assert.equal(sources,1);}
  finally {globalThis.window=previous;}
});
