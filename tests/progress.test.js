import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/core/Simulation.js';
import {restoreCheckpoint} from '../src/core/Checkpoint.js';
import {freshProfile,parseProfile,StorageAdapter} from '../src/platform/StorageAdapter.js';
import {finishRun,scoreCurve,parseProgress} from '../src/systems/Progress.js';
import {musicStep,SCORE_STEPS,STEP_SECONDS} from '../src/audio/MusicScore.js';
const config=JSON.parse(readFileSync(new URL('../src/config/game-balance.json',import.meta.url))), waves=JSON.parse(readFileSync(new URL('../src/config/waves.json',import.meta.url)));
const save=s=>({version:1,balanceVersion:config.version,runId:'run-1',savedAt:1,state:s.snapshot()});
test('checkpoint roundtrip preserves RNG, live entities and subsequent simulation',()=>{
 const s=new Simulation(config,waves,319);s.wave=7;s.setupWave();s.status='playing';s.grantPowerup('shield');
 for(let i=0;i<360;i++){s.step(1/60,{fireHeld:true,moveAxis:i%120<60?-1:1});s.drainEvents();}
 const restored=restoreCheckpoint(Simulation,config,waves,JSON.parse(JSON.stringify(save(s))));
 assert.deepEqual(restored.snapshot(),s.snapshot());
 for(let i=0;i<180;i++){const input={fireHeld:true,moveAxis:i%60<30?1:-1};s.step(1/60,input);restored.step(1/60,input);assert.deepEqual(restored.drainEvents(),s.drainEvents());}
 assert.deepEqual(restored.snapshot(),s.snapshot());
});
test('active explosion Sets and chain Maps survive serialization',()=>{
 const s=new Simulation(config,waves,1);s.status='playing';s.addSub('S01',500,500).vx=0;s.bombs.push({id:s.id++,x:500,y:490,px:500,py:490,alive:true});s.step(1/60,{});s.drainEvents();assert.ok(s.explosions.length);
 const r=restoreCheckpoint(Simulation,config,waves,save(s));assert.ok(r.explosions[0].damaged instanceof Set);assert.ok(r.chains instanceof Map);assert.deepEqual(r.snapshot(),s.snapshot());
});
test('bad checkpoints rejected without damaging profile records',()=>{
 const s=new Simulation(config,waves,7);const record=save(s);assert.throws(()=>restoreCheckpoint(Simulation,config,waves,{...record,balanceVersion:'old'}));
 for(const alter of [r=>r.state.player.lives=0,r=>r.state.wave=10,r=>r.state.score=-1,r=>r.state.buffs.heavy=99,r=>r.state.bombs=Array(6).fill({}),r=>r.state.random=NaN]){const r=structuredClone(record);alter(r);assert.throws(()=>restoreCheckpoint(Simulation,config,waves,r));}
 const p=parseProfile({...freshProfile(),bestScore:999,checkpoint:record});assert.equal(p.bestScore,999);
});
test('history finish is idempotent and practice does not unlock or overwrite formal progress',()=>{
 const p=freshProfile(),s=new Simulation(config,waves,2);p.bestScore=3500;p.bestCombo=5;p.maxWave=6;p.checkpoint={runId:'formal'};s.score=3500;s.maxCombo=5;s.wave=5;s.kills=10;
 const unlocked=finishRun(p,s,'formal',false,100);assert.ok(unlocked.some(m=>m.id==='chain5'));assert.equal(p.checkpoint,null);assert.equal(p.stats.plays,1);assert.deepEqual(finishRun(p,s,'formal'),[]);
 p.checkpoint={runId:'keep'};const before=JSON.stringify(p.stats), medals=JSON.stringify(p.medals);finishRun(p,s,'practice',true,200);assert.equal(JSON.stringify(p.stats),before);assert.equal(JSON.stringify(p.medals),medals);assert.equal(p.checkpoint.runId,'keep');
});
test('history cap keeps lifetime stats, validates records and curves stay finite',()=>{
 const p=freshProfile(),s=new Simulation(config,waves,3);for(let i=0;i<75;i++)finishRun(p,s,'r'+i,false,i);assert.equal(p.history.length,60);assert.equal(p.stats.plays,75);assert.equal(parseProgress(p).stats.plays,75);
 for(const rows of [[],p.history,[{score:0}],[{score:7},{score:7}]])for(const pt of scoreCurve(rows).points)assert.ok(Number.isFinite(pt.x)&&Number.isFinite(pt.y));
 assert.equal(parseProgress({history:[{id:'bad',score:-1}],medals:[{id:'fake',at:1}]}).history.length,0);
});
test('progress and save survive serialized backend; old profiles migrate',async()=>{
 let raw=null;const env={localStorage:{getItem:()=>raw,setItem:(k,v)=>raw=v}};const a=new StorageAdapter(env);const p=await a.init();const s=new Simulation(config,waves,8);p.checkpoint=save(s);finishRun(p,s,'old',false,1);await a.save(p);const r=await new StorageAdapter(env).init();assert.equal(r.history.length,1);assert.equal(r.checkpoint.runId,'run-1');assert.equal(r.stats.plays,1);
 const old={schemaVersion:1,bestScore:100,bestCombo:2,maxWave:4,settings:{sfx:false}};assert.equal(parseProfile(old).bestScore,100);assert.deepEqual(parseProfile(old).history,[]);
});
test('original music has deterministic 76.8-second sections, rests and adaptive intensity',()=>{
 assert.equal(SCORE_STEPS*STEP_SECONDS,76.8);const voices=new Set();let early=0,late=0;for(let i=0;i<SCORE_STEPS;i++){const a=musicStep(i,{wave:0,phase:'playing'}),b=musicStep(i,{wave:7,phase:'playing'});assert.deepEqual(a,musicStep(i+SCORE_STEPS,{wave:0,phase:'playing'}));early+=a.length;late+=b.length;for(const n of b){voices.add(n.voice);assert.ok(n.volume>0&&n.volume<=.03&&n.length>0&&n.offset>=0);}}
 assert.ok(late>early);assert.equal(voices.size,8);assert.notDeepEqual(musicStep(32),musicStep(128));assert.ok(!musicStep(32,{phase:'countdown'}).some(n=>n.voice==='lead'||n.voice==='kick'));assert.ok(!musicStep(1).length);
});
