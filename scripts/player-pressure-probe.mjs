import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Simulation } from '../src/core/Simulation.js';
const baseline='8200a01';
const previous=path=>execFileSync('git',['show',`${baseline}:${path}`],{encoding:'utf8'});
const source=previous('src/core/Simulation.js').replace(/from '([^']+)'/g,(_,ref)=>`from '${new URL(ref,pathToFileURL(resolve('src/core/Simulation.js'))).href}'`);
const OldSimulation=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).Simulation;
const variants=[['previous',OldSimulation,JSON.parse(previous('src/config/game-balance.json')),JSON.parse(previous('src/config/waves.json'))],['revised',Simulation,JSON.parse(await readFile('src/config/game-balance.json','utf8')),JSON.parse(await readFile('src/config/waves.json','utf8'))]];
const rows=[];
for(const [version,Constructor,config,waves] of variants)for(const strategy of ['stationary-fire','sweep-fire','reactive-fire'])for(let wave=4;wave<10;wave++) {
  let clears=0,damage=0,buffs=0,time=0,kills=0,shieldSeconds=0;
  for(let seed=1;seed<=20;seed++) {
    const sim=new Constructor(config,waves,seed*7919);sim.wave=wave;sim.setupWave();sim.status='playing';let direction=1;
    for(let tick=0;tick<60*180 && sim.status==='playing';tick++) {
      if(sim.player.x>910)direction=-1;if(sim.player.x<90)direction=1;
      let move=strategy==='stationary-fire'?0:direction;
      if(strategy==='reactive-fire') {
        let best=-Infinity;
        for(const candidate of [-1,0,1]) {
          let score=candidate===direction?1:0;
          for(const torpedo of sim.torpedoes) {
            const t=(torpedo.y-sim.player.y)/(torpedo.speed||config.torpedo.speed);
            if(t<0||t>1.3)continue;
            const x=Math.max(80,Math.min(920,sim.player.x+candidate*config.player.speed*t));
            const tx=torpedo.x+(torpedo.vx||0)*t;
            const separation=Math.abs(x-tx);
            score-=Math.max(0,150-separation)*(1.4-t);
          }
          if(score>best){best=score;move=candidate;}
        }
      }
      sim.step(1/60,{moveAxis:move,fireHeld:true});time+=1/60;
      if(sim.buffs.shield>0)shieldSeconds+=1/60;
      for(const event of sim.drainEvents()){if(event.type==='damage')damage++;if(event.type==='powerup')buffs++;}
    }
    kills+=sim.kills;if(sim.status==='waveclear'||sim.reason==='全部波次都打完了')clears++;
  }
  rows.push({version,strategy,wave:wave+1,clearsOutOf20:clears,meanDamage:+(damage/20).toFixed(2),meanBuffs:+(buffs/20).toFixed(2),meanKills:+(kills/20).toFixed(2),shieldCoverage:+(shieldSeconds/time).toFixed(3)});
}
await writeFile('docs/test-reports/player-pressure-probe.json',JSON.stringify({baseline,scope:'Real three-life simulations with firing and naturally collected supplies; fixed simple policies, not human play or certification',rows},null,2)+'\n');
console.table(rows);
