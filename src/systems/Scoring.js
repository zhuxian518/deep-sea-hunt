export function scoreFor(base, depth, rules, y = 0) {
  const waterBonus = y >= rules.depthDeep ? rules.depthDeepMultiplier : y >= rules.depthMid ? rules.depthMidMultiplier : 1;
  return Math.floor(Math.max(0, base) * Math.min(1 + Math.max(0, depth) * rules.bonus, rules.cap) * waterBonus);
}
export function efficiencyReward(shots, kills, points) {
  const efficiency = shots > 0 ? kills / shots : 0;
  const rate = efficiency >= 3 ? 0.5 : efficiency >= 2 ? 0.25 : efficiency >= 1 ? 0.1 : 0;
  return { efficiency, rate, bonus: Math.floor(Math.max(0, points) * rate), title: rate === 0.5 ? '一雷多响！' : rate === 0.25 ? '这雷扔得值！' : rate === 0.1 ? '投弹好手！' : '下波再省一点雷' };
}
