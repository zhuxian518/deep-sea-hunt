import { musicStep, STEP_SECONDS } from './MusicScore.js';
export class AudioMixer {
  constructor() { this.enabled=true; this.context=null; this.voices=0; this.musicEnabled=false; this.musicActive=false; this.musicNotes=new Set(); this.nextBeat=0; this.beat=0; this.musicBus=null; this.noise=null; this.duckUntil=0; }
  unlock() {
    try { const Constructor=window.AudioContext || window.webkitAudioContext; if (!this.context && Constructor) this.context=new Constructor(); if (this.context && this.context.state==='suspended') this.context.resume().catch(()=>{}); } catch (_) { this.context=null; }
  }
  play(type,depth=0) {
    if (!this.enabled || !this.context || this.context.state!=='running' || this.voices>=6) return;
    try {
      const c=this.context, oscillator=c.createOscillator(), gain=c.createGain();
      if (type==='kill' || type==='damage') this.duckUntil=c.currentTime+0.22;
      const frequency=type==='bomb' ? 160 : type==='damage' ? 85 : 220*Math.pow(1.16,Math.min(depth,8)), duration=type==='bomb' ? 0.1 : 0.23;
      oscillator.type=type==='kill' ? 'triangle' : 'square'; oscillator.frequency.setValueAtTime(frequency,c.currentTime); oscillator.frequency.exponentialRampToValueAtTime(type==='kill' ? frequency*0.5 : 40,c.currentTime+duration);
      gain.gain.setValueAtTime(0.035,c.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,c.currentTime+duration); oscillator.connect(gain); gain.connect(c.destination); this.voices++;
      oscillator.onended=()=>{this.voices--; oscillator.disconnect(); gain.disconnect();}; oscillator.start(); oscillator.stop(c.currentTime+duration);
    } catch (_) { /* Audio must not affect simulation. */ }
  }
  setMusic(enabled,active) {
    this.musicEnabled=enabled; this.musicActive=active;
    if (!enabled || !active) { for (const note of this.musicNotes) { try { note.stop(); } catch (_) {} } this.musicNotes.clear(); this.nextBeat=0; }
  }
  update(scene={}) {
    const c=this.context; if (!this.musicEnabled || !this.musicActive || !c || c.state!=='running') return;
    if (!this.nextBeat || this.nextBeat<c.currentTime-0.2) this.nextBeat=c.currentTime+0.025;
    try { this.ensureMusicBus(); this.musicBus.gain.setTargetAtTime(c.currentTime<this.duckUntil ? 0.3 : 0.65,c.currentTime,0.035); while (this.nextBeat<c.currentTime+0.12) { this.scheduleStep(this.beat,this.nextBeat,scene); this.beat++; this.nextBeat+=STEP_SECONDS; } } catch (_) { this.setMusic(false,false); }
  }
  ensureMusicBus() { if (!this.musicBus) { this.musicBus=this.context.createGain(); this.musicBus.gain.value=0.65; this.musicBus.connect(this.context.destination); } }
  scheduleStep(step,time,scene) { this.ensureMusicBus(); for (const note of musicStep(step,scene)) this.musicVoice(note,time+note.offset*STEP_SECONDS,note.length*STEP_SECONDS); }
  musicVoice(note,start,duration) {
    if (this.musicNotes.size>=32) return;
    const c=this.context, gain=c.createGain(), filter=c.createBiquadFilter(), percussion=note.voice==='hat' || note.voice==='snare', source=percussion ? c.createBufferSource() : c.createOscillator();
    if (percussion) {
      if (!this.noise) { this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*0.25),c.sampleRate); const data=this.noise.getChannelData(0); let seed=18273; for (let i=0;i<data.length;i++) { seed^=seed<<13; seed^=seed>>>17; seed^=seed<<5; data[i]=(seed>>>0)/2147483648-1; } }
      source.buffer=this.noise; filter.type=note.voice==='hat' ? 'highpass' : 'bandpass'; filter.frequency.value=note.voice==='hat' ? 6000 : 1800; filter.Q.value=0.6;
    } else {
      source.type=['bass','kick','bell'].includes(note.voice) ? 'sine' : 'triangle'; source.frequency.setValueAtTime(note.voice==='kick' ? 115 : 440*Math.pow(2,(note.midi-69)/12),start);
      if (note.voice==='kick') source.frequency.exponentialRampToValueAtTime(38,start+duration); if (note.voice==='pad') source.detune.value=note.midi%2 ? -5 : 5;
      filter.type='lowpass'; filter.frequency.value=note.voice==='pad' ? 950 : note.voice==='bass' ? 450 : 2800;
    }
    const attack=note.voice==='pad' ? 0.22 : percussion || note.voice==='kick' ? 0.004 : 0.015;
    gain.gain.setValueAtTime(0.0001,start); gain.gain.linearRampToValueAtTime(note.volume,start+attack); if (note.voice==='pad') gain.gain.setValueAtTime(note.volume,start+duration*0.55); gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.musicBus); this.musicNotes.add(source); source.onended=()=>{this.musicNotes.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect();}; source.start(start); source.stop(start+duration+0.01);
  }
  suspend() { this.setMusic(this.musicEnabled,false); if (this.context && this.context.state==='running') this.context.suspend().catch(()=>{}); }
}
