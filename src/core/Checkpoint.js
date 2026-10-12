const integer = n => Number.isSafeInteger(n) && n>=0;
const finite = n => typeof n==='number' && Number.isFinite(n);
export function restoreCheckpoint(Simulation, config, waves, save) {
  if (!save || save.version!==1 || save.balanceVersion!==config.version) throw Error('存档版本暂不兼容');
  const s=save.state;
  if (!s || !integer(s.wave) || s.wave>=waves.length || !['playing','countdown','waveclear'].includes(s.status)) throw Error('存档波次无效');
  for (const k of ['tick','seed','random','score','kills','maxCombo','escaped','shots','bonusTotal','spawned','nextId','eventId']) if (!integer(s[k])) throw Error('存档数值无效');
  for (const k of ['elapsed','nextSpawn','waveTime','timer']) if (!finite(s[k]) || s[k]<-1) throw Error('存档时间无效');
  if (s.spawned>waves[s.wave].count || s.nextId<1 || !s.player || !integer(s.player.lives) || s.player.lives<1 || s.player.lives>config.player.lives) throw Error('存档舰船无效');
  const point=p=>p && ['x','y','px','py'].every(k=>finite(p[k]) && Math.abs(p[k])<=2500);
  if (!point(s.player) || !finite(s.player.cooldown) || !finite(s.player.invincible)) throw Error('存档坐标无效');
  const box = p => finite(p.halfW) && p.halfW>0 && p.halfW<=200 && finite(p.halfH) && p.halfH>0 && p.halfH<=200;
  if (!box(s.player)) throw Error('存档碰撞区域无效');
  const limits={subs:100,bombs:5,torpedoes:35,explosions:100,pickups:4}; const ids=new Set();
  for (const [key,limit] of Object.entries(limits)) {
    if (!Array.isArray(s[key]) || s[key].length>limit) throw Error('存档实体无效');
    for (const entity of s[key]) {
      if (!integer(entity.id) || !entity.id || entity.id>=s.nextId || ids.has(entity.id)) throw Error('存档标识无效'); ids.add(entity.id);
      if (key==='explosions') { if (!finite(entity.x)||!finite(entity.y)||!finite(entity.radius)||entity.radius<0||entity.radius>200||!finite(entity.age)||entity.age<0||entity.age>1||!Array.isArray(entity.damaged)||entity.damaged.length>200||entity.damaged.some(id=>!integer(id))) throw Error('存档爆炸无效'); }
      else if (!point(entity)) throw Error('存档实体坐标无效');
      if (['subs','bombs','torpedoes'].includes(key) && entity.alive!==true) throw Error('存档实体状态无效');
      if (key==='subs' && !box(entity)) throw Error('存档潜艇区域无效');
      if (key==='subs' && (!config.enemies[entity.typeId] || !finite(entity.vx) || Math.abs(entity.vx)>1000 || !finite(entity.attack))) throw Error('存档潜艇无效');
      if (key==='pickups' && (!['rapid','heavy','shield'].includes(entity.type) || !finite(entity.age))) throw Error('存档补给无效');
      if (entity.speed!==undefined && (!finite(entity.speed)||entity.speed<=0||entity.speed>1000)) throw Error('存档速度无效');
      if (entity.power!==undefined && (!finite(entity.power)||entity.power<=0||entity.power>2)) throw Error('存档武器无效');
      if (entity.maxRadius!==undefined && (!finite(entity.maxRadius)||entity.maxRadius<=0||entity.maxRadius>200)) throw Error('存档爆炸范围无效');
      if (entity.vx!==undefined && (!finite(entity.vx)||Math.abs(entity.vx)>1000)) throw Error('存档航向无效');
    }
  }
  if (!s.buffs || !['rapid','heavy','shield'].every(k=>finite(s.buffs[k]) && s.buffs[k]>=0 && s.buffs[k]<=8)) throw Error('存档强化无效');
  if (!s.waveStats || !['shots','kills','points'].every(k=>integer(s.waveStats[k]))) throw Error('存档战报无效');
  if (s.waveStats.supplyDrops !== undefined && (!integer(s.waveStats.supplyDrops) || s.waveStats.supplyDrops>100)) throw Error('存档补给无效');
  if (s.waveStats.supplyReadyAt !== undefined && (!finite(s.waveStats.supplyReadyAt) || s.waveStats.supplyReadyAt<0 || s.waveStats.supplyReadyAt>300)) throw Error('存档补给时间无效');
  if (!Array.isArray(s.waveResults)||s.waveResults.length>waves.length||s.waveResults.some(r=>!integer(r.wave)||r.wave<1||r.wave>waves.length||!['shots','kills','points','bonus'].every(k=>integer(r[k]))||!finite(r.efficiency)||!finite(r.rate))) throw Error('存档奖励无效');
  if (!Array.isArray(s.chains)||s.chains.length>100||s.chains.some(c=>!['id','kills','score','depth'].every(k=>integer(c[k])))) throw Error('存档连爆无效');
  if (new Set(s.chains.map(c=>c.id)).size!==s.chains.length || s.explosions.some(e=>!integer(e.depth)||!s.chains.some(c=>c.id===e.chainId))) throw Error('存档连爆关联无效');
  if (s.waveResults.some(r=>typeof r.title!=='string' || r.title.length>50 || /[<>]/.test(r.title))) throw Error('存档战报文本无效');
  const restored=new Simulation(config,waves,s.seed), copy=JSON.parse(JSON.stringify(s));
  for (const key of ['tick','elapsed','score','kills','maxCombo','escaped','shots','bonusTotal','wave','status','spawned','nextSpawn','waveTime','timer','reason','player','subs','bombs','torpedoes','pickups','buffs','waveStats','waveResults']) restored[key]=copy[key];
  restored.id=s.nextId; restored.eventId=s.eventId; restored.rng.state=s.random;
  restored.bombs = restored.bombs.slice(0,config.bomb.max);
  for (const type of ['rapid','heavy','shield']) restored.buffs[type] = Math.min(restored.buffs[type],config.powerups[type+'Duration']);
  restored.explosions=copy.explosions.map(e=>({...e,damaged:new Set(e.damaged)})); restored.chains=new Map(copy.chains.map(c=>[c.id,c])); restored.events=[];
  return restored;
}
