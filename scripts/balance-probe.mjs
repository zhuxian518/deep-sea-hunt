import { readFile, writeFile } from 'node:fs/promises';
import { Simulation } from '../src/core/Simulation.js';
const config=JSON.parse(await readFile('src/config/game-balance.json','utf8'));
const waves=JSON.parse(await readFile('src/config/waves.json','utf8'));
const rows=[];
for(let wave=5;wave<10;wave++) {
  let totalTime=0,totalTorpedoes=0,totalPeak=0;
  for(let seed=1;seed<=20;seed++) {
    const sim=new Simulation(config,waves,seed*7919);sim.wave=wave;sim.setupWave();sim.status='playing';sim.player.invincible=10000;
    let peak=0,lastTorpedo=0,ticks=0;
    while(sim.status==='playing' && ticks<60*240) {
      sim.step(1/60,{});sim.drainEvents();ticks++;
      peak=Math.max(peak,sim.subs.length);
      for(const torpedo of sim.torpedoes)if(torpedo.id>lastTorpedo){totalTorpedoes++;lastTorpedo=torpedo.id;}
    }
    if(sim.status==='playing')throw Error('Wave failed to settle');
    totalTime+=ticks/60;totalPeak+=peak;
  }
  rows.push({wave:wave+1,count:waves[wave].count,meanSeconds:+(totalTime/20).toFixed(2),meanPeakSubs:totalPeak/20,torpedoesPerSecond:+(totalTorpedoes/totalTime).toFixed(3)});
}
const report={scope:'20 deterministic seeds per wave; no firing, invincible ship; measures generated pressure, not player difficulty or real-device performance',rows};
await writeFile('docs/test-reports/difficulty-probe.json',JSON.stringify(report,null,2)+'\n');
console.table(rows);
