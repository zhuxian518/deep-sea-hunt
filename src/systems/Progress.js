export const MEDALS = [
  { id:'first', name:'初次出航', detail:'完成第一局', field:'plays', goal:1 },
  { id:'return', name:'又来一局', detail:'累计完成3局', field:'plays', goal:3 },
  { id:'veteran', name:'海上常客', detail:'累计完成10局', field:'plays', goal:10 },
  { id:'chain3', name:'一雷三响', detail:'一颗水雷连爆3艘', field:'bestCombo', goal:3 },
  { id:'chain5', name:'连爆好手', detail:'一颗水雷连爆5艘', field:'bestCombo', goal:5 },
  { id:'chain8', name:'连锁大师', detail:'一颗水雷连爆8艘', field:'bestCombo', goal:8 },
  { id:'score3k', name:'小试锋芒', detail:'单局达到3000分', field:'bestScore', goal:3000 },
  { id:'score10k', name:'深海王牌', detail:'单局达到10000分', field:'bestScore', goal:10000 },
  { id:'wave6', name:'驶入深海', detail:'正式局进入第六波', field:'maxWave', goal:6 },
  { id:'clear', name:'深海猎手', detail:'正式局通关十波', field:'wins', goal:1 }
];
const natural = n => Number.isSafeInteger(n) && n >= 0;
export function parseProgress(data) {
  const history = Array.isArray(data.history) ? data.history.filter(r => r && typeof r.id==='string' && r.id.length<=100 && ['score','kills','shots','combo','wave','endedAt'].every(k=>natural(r[k])) && r.wave>=1 && r.wave<=10).slice(-60).map(r=>({id:r.id,score:r.score,kills:r.kills,shots:r.shots,combo:r.combo,wave:r.wave,endedAt:r.endedAt,won:r.won===true,practice:r.practice===true})) : [];
  const stats = { plays:0, wins:0, kills:0 };
  for (const key of Object.keys(stats)) stats[key] = data.stats && natural(data.stats[key]) ? data.stats[key] : history.filter(r=>!r.practice).reduce((n,r)=>n+(key==='plays'?1:key==='wins'?Number(r.won):r.kills),0);
  const medals = Array.isArray(data.medals) ? data.medals.filter(m=>m && MEDALS.some(d=>d.id===m.id) && natural(m.at)).filter((m,i,all)=>all.findIndex(x=>x.id===m.id)===i).map(m=>({id:m.id,at:m.at})) : [];
  const checkpoint = data.checkpoint && data.checkpoint.version===1 && typeof data.checkpoint.runId==='string' && data.checkpoint.runId.length<=100 && natural(data.checkpoint.savedAt) && data.checkpoint.state && typeof data.checkpoint.state==='object' ? data.checkpoint : null;
  return { history,stats,medals,checkpoint };
}
export function medalValue(profile, medal) { return profile.stats[medal.field] === undefined ? profile[medal.field] || 0 : profile.stats[medal.field]; }
export function finishRun(profile, sim, id, practice=false, now=Date.now()) {
  if (profile.history.some(r=>r.id===id)) return [];
  const won = sim.reason==='全部波次都打完了';
  profile.history.push({id,score:sim.score,kills:sim.kills,shots:sim.shots,combo:sim.maxCombo,wave:sim.wave+1,endedAt:now,won,practice});
  profile.history = profile.history.slice(-60);
  if (profile.checkpoint && profile.checkpoint.runId===id) profile.checkpoint=null;
  if (practice) return [];
  profile.stats.plays++; profile.stats.wins+=Number(won); profile.stats.kills+=sim.kills;
  const unlocked = MEDALS.filter(m=>!profile.medals.some(u=>u.id===m.id) && medalValue(profile,m)>=m.goal);
  for (const m of unlocked) profile.medals.push({id:m.id,at:now});
  return unlocked;
}
export function scoreCurve(history) {
  const values = history.slice(-60), maximum = Math.max(1,...values.map(r=>r.score));
  return { maximum, points:values.map((r,i)=>({ x:values.length===1?150:24+i*252/(values.length-1), y:130-r.score/maximum*105, score:r.score, practice:r.practice })) };
}
