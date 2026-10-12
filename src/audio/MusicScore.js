export const STEP_SECONDS = 0.3;
export const SCORE_STEPS = 256;
const chords = [[50,57,60,64],[46,53,57,60],[48,53,57,60],[48,55,62,64],[43,50,53,57],[46,53,57,62],[45,52,55,60],[45,52,55,61]];
const roots = [38,34,41,36,31,34,33,33];
const theme = [[69,0,72,74,0,72,69,0],[65,0,69,72,0,69,65,0],[69,72,0,76,0,74,72,0],[67,0,64,67,0,62,0,64],[65,0,69,70,0,69,65,0],[65,69,0,74,0,72,69,0],[67,0,64,60,0,64,67,0],[69,0,73,76,0,73,69,0]];
const variation = [[74,0,77,76,0,72,69,72],[72,0,74,77,0,74,72,69],[76,0,79,77,0,76,72,69],[74,0,72,67,0,64,67,0],[70,0,74,77,0,74,69,65],[74,0,77,74,0,72,69,65],[72,0,76,74,0,72,67,64],[73,0,76,79,0,76,73,0]];
// Original 32-bar score (76.8 seconds), with musical rests and four sections.
export function musicStep(step, scene = {}) {
  const n = ((step % SCORE_STEPS)+SCORE_STEPS)%SCORE_STEPS, bar = Math.floor(n/8), slot = n%8, h = bar%8;
  const calm = ['waveclear','countdown'].includes(scene.phase), intense = (scene.wave || 0)>=5 && !calm, intro = bar<4, development = bar>=16 && bar<24;
  const notes = [], add = (voice,midi,length,volume,offset=0) => notes.push({voice,midi,length,volume,offset});
  if (!slot) { for (const midi of chords[h].slice(1)) add('pad',midi,7.7,calm ? 0.005 : 0.006); add('bass',roots[h],2.8,0.024); }
  if (!calm && slot===4) add('bass',roots[h]+(development ? 7 : 12),2.3,0.017);
  if (intense && (slot===3 || slot===7)) add('bass',roots[h]+12,0.65,0.012);
  const phrase = development ? variation[h] : theme[h];
  if (!calm && !intro && phrase[slot] && (bar<28 || slot%2===0)) add('lead',phrase[slot],slot%2 ? 0.85 : 1.6,intense ? 0.02 : 0.017);
  if ((intro || calm) && (slot===2 || slot===6)) add('bell',chords[h][slot===2 ? 2 : 3]+12,3,0.01);
  if (!calm && (development || (intense && !intro)) && slot===5) add('answer',chords[h][2]+12,1.5,0.008,0.25);
  if (!calm) {
    if (slot===0 || (!intro && slot===4) || (intense && slot===7 && h%2)) add('kick',0,0.7,intro ? 0.021 : 0.03);
    if (!intro && (slot===2 || slot===6)) add('snare',0,0.45,intense ? 0.012 : 0.008);
    if (!intro && (slot%2 || intense || development)) add('hat',0,0.18,slot%2 ? 0.005 : 0.003);
  }
  return notes;
}
