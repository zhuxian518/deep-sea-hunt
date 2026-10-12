import { viewport } from './geometry.js';

export class CanvasRenderer {
  constructor(canvas, world) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.world = world; this.particles = []; this.labels = []; this.lowFx = false; this.time = 0; this.hitPulse = 0; this.shieldPulse = 0;
    if (!this.ctx) throw new Error('当前环境无法绘制海域');
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.view = viewport(rect.width, rect.height, this.world, window.devicePixelRatio);
    this.canvas.width = Math.round(rect.width * this.view.dpr); this.canvas.height = Math.round(rect.height * this.view.dpr);
  }
  clearEffects() { this.particles = []; this.labels = []; this.hitPulse = 0; this.shieldPulse = 0; }
  consume(events) {
    for (const e of events) if (e.type === 'kill' || e.type === 'damage' || e.type === 'shield-hit') {
      if (e.type === 'damage') this.hitPulse = 0.45;
      if (e.type === 'shield-hit') this.shieldPulse = 0.35;
      const count = this.lowFx ? 5 : 22;
      for (let i = 0; i < count && this.particles.length < 220; i++) {
        const angle = i * 2.39996 + e.id, speed = 70 + (i % 5) * 38;
        const bubble = i % 4 === 0 || e.type === 'shield-hit', smoke = e.type === 'damage' && i % 3 === 0;
        this.particles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed * (smoke ? 0.15 : 1), vy: smoke ? -35 - i * 2 : bubble ? -60 - i * 3 : Math.sin(angle) * speed, age: 0, life: smoke ? 1.2 : bubble ? 1.1 : 0.42 + (i % 3) * 0.16, bubble, smoke, angle, color: i % 3 ? '#ffc37c' : '#eef8d8' });
      }
      if (e.type === 'kill' && this.labels.length < 24) this.labels.push({ x: e.x, y: e.y - 40, points: e.points, age: 0, combo: e.combo });
    }
  }
  update(dt) {
    this.time += dt;
    this.hitPulse = Math.max(0, this.hitPulse - dt); this.shieldPulse = Math.max(0, this.shieldPulse - dt);
    for (const p of this.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.smoke ? -15 : p.bubble ? -35 : 150) * dt; if (p.bubble) p.vx *= Math.exp(-3 * dt); }
    this.particles = this.particles.filter(p => p.age < p.life);
    for (const label of this.labels) label.age += dt;
    this.labels = this.labels.filter(p => p.age < 0.95);
  }
  ship(x, y, invincible = false) {
    const c = this.ctx;
    c.save(); c.translate(x, y);
    if (invincible && Math.floor(this.time * 8) % 2) c.globalAlpha = 0.4;
    c.fillStyle = '#94c4c5'; c.fillRect(-58, -19, 109, 20);
    c.fillStyle = '#e6e1bb'; c.fillRect(-48, -25, 96, 9); c.fillRect(-15, -43, 36, 20); c.fillRect(-7, -55, 20, 13);
    c.fillStyle = '#344f5b'; c.fillRect(-58, -10, 117, 12); c.fillRect(-19, -29, 12, 9);
    c.fillStyle = '#f1a260'; c.fillRect(28, -35, 17, 11); c.fillRect(2, -51, 7, 4);
    c.fillStyle = '#d2e8d5'; c.fillRect(45, -25, 24, 5); c.fillRect(-35, -37, 5, 12); c.fillRect(-33, -38, 22, 4);
    c.fillStyle = '#547d83'; c.beginPath(); c.moveTo(-66, -13); c.lineTo(70, -13); c.lineTo(52, 7); c.lineTo(-48, 7); c.closePath(); c.fill();
    c.fillStyle = '#d1ddc2'; c.fillRect(-55, -13, 113, 5);
    c.strokeStyle = '#b9f3ef'; c.lineWidth = 3; c.beginPath(); c.moveTo(-74, 12); c.lineTo(74, 12); c.stroke();
    c.strokeStyle = '#688e89'; c.lineWidth = 2; c.beginPath(); c.moveTo(5, -54); c.lineTo(5, -78); c.stroke();
    c.fillStyle = '#ef9460'; c.fillRect(7, -77, 17, 9); c.restore();
  }
  submarine(sub, alpha = 1) {
    const c = this.ctx, fast = sub.typeId === 'S02', red = sub.typeId === 'S03', hunter = sub.typeId === 'S04', salvo = sub.typeId === 'S05', w = sub.halfW, h = sub.halfH;
    c.save(); c.translate(sub.x, sub.y); c.scale(sub.vx < 0 ? -1 : 1, 1); c.globalAlpha = alpha;
    // Analytic trails allocate no entities and stay frozen with renderer time on pause.
    const thrust = Math.min(1, Math.abs(sub.vx) / 140);
    if (thrust > 0) {
      for (let i = 0; i < (this.lowFx ? 3 : 8); i++) {
        const phase = (this.time * (0.8 + thrust * 0.4) + i / 8 + (sub.id || 0) * 0.17) % 1;
        const distance = 10 + phase * (65 + thrust * 35);
        c.strokeStyle = `rgba(161,218,215,${(1 - phase) * 0.28})`; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(-w - distance, Math.sin(phase * 9 + this.time * 2) * (3 + phase * 6), 2 + phase * 3, 1.5 + phase * 2, 0, 0, Math.PI * 2); c.stroke();
      }
      c.strokeStyle = 'rgba(147,211,211,.16)'; c.lineWidth = 2;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(-w - 8, side * 3); c.quadraticCurveTo(-w - 35, side * 8 + Math.sin(this.time * 4) * 2, -w - 80 * thrust, side * 13); c.stroke(); }
    }
    c.fillStyle = hunter ? '#d5bd83' : salvo ? '#9daec7' : red ? '#d18d78' : fast ? '#67c8b9' : '#a5bdba';
    c.beginPath(); c.moveTo(-w + 12, -h); c.lineTo(w - 16, -h); c.lineTo(w + 2, -h + 12); c.lineTo(w, h - 7); c.lineTo(w - 17, h); c.lineTo(-w + 12, h); c.lineTo(-w, h - 10); c.lineTo(-w, -h + 9); c.closePath(); c.fill();
    c.fillStyle = red ? '#745b56' : '#426c76'; c.fillRect(-w + 12, 2, w * 2 - 25, Math.max(5, h - 5));
    c.fillStyle = '#cce5d0'; c.fillRect(-w + 14, -h, w * 2 - 37, 4);
    c.fillStyle = red ? '#ab665b' : '#668e91'; c.fillRect(-13, -h - 11, fast ? 18 : 27, 12); c.fillRect(1, -h - 24, 4, 14); c.fillRect(1, -h - 24, 13, 4);
    c.fillStyle = '#122f3e'; for (let i = 0; i < (fast ? 2 : 4); i++) c.fillRect(-w + 22 + i * 16, -5, 6, 6);
    c.fillStyle = red && sub.warning ? '#fff0a5' : red ? '#ee7156' : '#d0d6a3'; c.fillRect(w - 22, -8, 8, 6);
    c.fillStyle = '#86adad'; c.fillRect(-w - 10, -5, 12, 10); c.fillRect(-w - 13, -12, 4, 24);
    if (hunter) { c.strokeStyle = sub.warning ? '#fff0a5' : '#ddc591'; c.lineWidth = 2; c.beginPath(); c.arc(8, -h - 23, 10, Math.PI, 0); c.stroke(); c.fillStyle = '#f3d594'; c.fillRect(w - 28, -h + 5, 18, 4); }
    if (salvo) { c.fillStyle = '#d9e3df'; c.fillRect(-30, -h - 9, 12, 10); c.fillRect(20, -h - 9, 12, 10); c.fillStyle = sub.warning ? '#fff0a5' : '#d78268'; for (let i = 0; i < 3; i++) c.fillRect(w - 32 + i * 8, -7, 4, 10); }
    c.restore();
  }
  depthCharge(p) {
    const c = this.ctx, age = p.age === undefined ? Math.max(0, (p.y - this.world.waterline - 20) / 300) : p.age;
    const phase = age * 5.2 + p.id * 1.7;
    c.save(); c.translate(p.x, p.y);
    if (!this.lowFx) {
      for (let i = 0; i < 5; i++) {
        const k = (age * 1.6 + i / 5) % 1;
        c.strokeStyle = `rgba(204,236,222,${(1 - k) * 0.45})`; c.lineWidth = 1.3;
        c.beginPath(); c.arc(Math.sin(phase - k * 3) * (2 + k * 4), -19 - k * 45, 1.3 + k * 2, 0, Math.PI * 2); c.stroke();
      }
    }
    c.translate(Math.sin(phase) * 1.8, 0); c.rotate(Math.sin(phase + 0.5) * 0.22);
    if (p.power > 1) { c.scale(p.power, p.power); c.strokeStyle = 'rgba(255,213,125,.45)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -2, 14, 24, 0, 0, Math.PI * 2); c.stroke(); }
    // Barrel-shaped depth charge: tail fins, brass bands and a round detonator.
    c.fillStyle = '#637e79'; c.beginPath(); c.moveTo(-4, -8); c.lineTo(-12, -19); c.lineTo(-11, -6); c.lineTo(11, -6); c.lineTo(12, -19); c.lineTo(4, -8); c.closePath(); c.fill();
    c.fillStyle = '#293e42'; c.fillRect(-10, -18, 20, 3);
    const metal = c.createLinearGradient(-8, 0, 8, 0); metal.addColorStop(0, '#986743'); metal.addColorStop(0.35, '#f1c687'); metal.addColorStop(1, '#76543e');
    c.fillStyle = metal; c.beginPath(); c.moveTo(-8, -9); c.lineTo(8, -9); c.lineTo(8, 7); c.quadraticCurveTo(7, 13, 0, 14); c.quadraticCurveTo(-7, 13, -8, 7); c.closePath(); c.fill();
    c.strokeStyle = '#263c42'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#ffe0a2'; c.fillRect(-9, -7, 18, 3); c.fillRect(-9, 5, 18, 3);
    c.fillStyle = '#76503b'; c.fillRect(-2, -3, 4, 5); c.fillStyle = '#eee1b8'; c.fillRect(-2, 12, 4, 3);
    c.restore();
  }
  torpedo(p) {
    const c = this.ctx, t = this.time;
    c.save(); c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.vx || 0, p.speed || 220));
    for (let i = 0; i < (this.lowFx ? 3 : 9); i++) {
      const k = (t * 2 + i / 9 + p.id * 0.13) % 1;
      c.strokeStyle = `rgba(190,231,222,${(1 - k) * 0.52})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(Math.sin(k * 10 + p.id) * (1 + k * 7), 21 + k * 65, 1 + k * 3, 0, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = 'rgba(184,225,218,.24)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, 20); c.quadraticCurveTo(-9, 37, -6 + Math.sin(t * 9), 60); c.moveTo(3, 20); c.quadraticCurveTo(9, 37, 6 + Math.sin(t * 9), 60); c.stroke();
    c.fillStyle = '#f0c7ae'; c.beginPath(); c.moveTo(0, -19); c.quadraticCurveTo(7, -14, 7, -6); c.lineTo(7, 13); c.lineTo(3, 19); c.lineTo(-3, 19); c.lineTo(-7, 13); c.lineTo(-7, -6); c.quadraticCurveTo(-7, -14, 0, -19); c.closePath(); c.fill();
    c.fillStyle = p.homing ? '#d9ac54' : '#d66051'; c.fillRect(-6, -6, 12, 12); c.fillStyle = '#ffe5bc'; c.fillRect(-4, -5, 2, 11);
    c.fillStyle = '#91564f'; c.beginPath(); c.moveTo(-5, 9); c.lineTo(-12, 18); c.lineTo(-4, 16); c.lineTo(4, 16); c.lineTo(12, 18); c.lineTo(5, 9); c.closePath(); c.fill();
    c.strokeStyle = '#deceb1'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5 * Math.cos(t * 35), 21); c.lineTo(5 * Math.cos(t * 35), 21); c.stroke();
    c.restore();
  }
  draw(sim, alpha = 1, demo = false) {
    const c = this.ctx, v = this.view, t = this.time;
    c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); c.fillStyle = '#08202c'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.translate(v.x, v.y); c.scale(v.scale, v.scale);
    if (this.hitPulse > 0 && !this.lowFx) c.translate(Math.sin(t * 80) * this.hitPulse * 14, Math.cos(t * 63) * this.hitPulse * 7);
    const sky = c.createLinearGradient(0, 0, 0, 155); sky.addColorStop(0, '#c9d9cc'); sky.addColorStop(1, '#88b9b8'); c.fillStyle = sky; c.fillRect(0, 0, 1000, 155);
    c.fillStyle = '#e4dfbb'; c.beginPath(); c.arc(780, 66, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6e9d9b'; c.beginPath(); c.moveTo(0, 152); c.lineTo(70, 128); c.lineTo(130, 136); c.lineTo(210, 115); c.lineTo(300, 146); c.lineTo(370, 155); c.fill();
    c.fillStyle = '#466b70'; c.fillRect(165, 112, 10, 34); c.fillRect(161, 109, 18, 5); c.fillStyle = '#efd9a2'; c.fillRect(168, 113, 4, 7);
    c.fillStyle = '#dce3d0'; c.fillRect(450, 40, 60, 5); c.fillRect(470, 34, 25, 6); c.fillRect(70, 60, 85, 5);
    const sea = c.createLinearGradient(0, 155, 0, 1200); sea.addColorStop(0, '#397e8d'); sea.addColorStop(0.22, '#20576c'); sea.addColorStop(0.6, '#113a50'); sea.addColorStop(1, '#092536'); c.fillStyle = sea; c.fillRect(0, 155, 1000, 1045);
    c.fillStyle = 'rgba(168,222,210,.045)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(70 + i * 280, 155); c.lineTo(110 + i * 280, 155); c.lineTo(380 + i * 280, 1050); c.lineTo(140 + i * 280, 1050); c.fill(); }
    c.strokeStyle = 'rgba(140,199,201,.07)'; c.lineWidth = 1;
    for (let y = 300; y < 1200; y += 150) { c.beginPath(); c.moveTo(0, y); c.lineTo(1000, y); c.stroke(); }
    for (let x = 125; x < 1000; x += 125) { c.beginPath(); c.moveTo(x, 155); c.lineTo(x, 1200); c.stroke(); }
    c.font = '16px monospace'; c.fillStyle = 'rgba(172,214,213,.35)';
    for (let y = 300; y < 1150; y += 300) c.fillText(`${(y - 150) / 3} m`, 22, y - 10);
    c.font = '16px sans-serif'; c.fillStyle = 'rgba(206,220,189,.55)'; c.fillText('深水 ×1.25', 22, 525); c.fillText('海底 ×1.5', 22, 825);
    c.strokeStyle = '#9dd5ca'; c.lineWidth = 3; c.beginPath();
    for (let x = 0; x <= 1000; x += 8) { const y = 155 + Math.sin(x * 0.025 + t) * 3; if (!x) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.strokeStyle = 'rgba(122,193,191,.3)'; c.lineWidth = 2;
    for (let i = 0; i < 20; i++) { const x = (i * 163 + Math.sin(t + i) * 10) % 1000, y = 180 + ((i * 113 - t * (8 + i % 4)) % 1000 + 1000) % 1000; c.beginPath(); c.arc(x, y, 2 + i % 4, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#08202c'; c.beginPath(); c.moveTo(0, 1200); for (let x = 0; x <= 1000; x += 30) c.lineTo(x, 1173 + Math.sin(x * 0.017) * 14); c.lineTo(1000, 1200); c.fill();
    const lerp = entity => ({ ...entity, x: entity.px + (entity.x - entity.px) * alpha, y: entity.py + (entity.y - entity.py) * alpha });
    if (demo) {
      this.ship(480 + Math.sin(t * 0.22) * 140, 147);
      for (let i = 0; i < 5; i++) this.submarine({ typeId: ['S01', 'S02', 'S03'][i % 3], x: 120 + ((i * 223 + t * (i % 2 ? -12 : 13) + 2000) % 760), y: 350 + i * 165, halfW: i % 3 === 1 ? 40 : 53, halfH: 18, vx: i % 2 ? -1 : 1 }, 0.7);
    } else {
      for (const sub of sim.subs) this.submarine(lerp(sub));
      this.ship(lerp(sim.player).x, sim.player.y, sim.player.invincible > 0);
      if (this.hitPulse > 0) { c.fillStyle = `rgba(255,191,112,${this.hitPulse})`; c.beginPath(); c.ellipse(lerp(sim.player).x, sim.player.y - 8, 70, 26, 0, 0, Math.PI * 2); c.fill(); }
      if (this.shieldPulse > 0) { c.strokeStyle = `rgba(166,249,231,${this.shieldPulse * 2})`; c.lineWidth = 4; c.beginPath(); c.ellipse(lerp(sim.player).x, sim.player.y - 18, 86 + (0.35 - this.shieldPulse) * 55, 50, 0, 0, Math.PI * 2); c.stroke(); }
      if (sim.buffs.shield > 0) {
        c.strokeStyle = `rgba(147,237,225,${0.55 + Math.sin(t * 5) * 0.15})`; c.lineWidth = 3;
        c.beginPath(); c.ellipse(lerp(sim.player).x, sim.player.y - 24, 86, 58, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(147,237,225,.07)'; c.fill();
      }
      for (const item of sim.pickups) {
        const p = lerp(item), color = item.type === 'shield' ? '#9ce7df' : item.type === 'heavy' ? '#ffc475' : '#c8df9d';
        c.save(); c.translate(p.x, p.y + Math.sin(t * 3 + item.id) * 3);
        c.strokeStyle = color; c.fillStyle = '#123c4c'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, -19); c.lineTo(19, 0); c.lineTo(0, 19); c.lineTo(-19, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = color; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(item.type === 'shield' ? '◎' : item.type === 'heavy' ? '✦' : '↓', 0, 8); c.textAlign = 'start';
        if (!this.lowFx) { c.globalAlpha = 0.35; c.beginPath(); c.arc(-5, 27 + (t * 25 % 18), 3, 0, Math.PI * 2); c.stroke(); }
        c.restore();
      }
      for (const bomb of sim.bombs) {
        this.depthCharge(lerp(bomb));
      }
      for (const torpedo of sim.torpedoes) {
        this.torpedo(lerp(torpedo));
      }
      for (const e of sim.explosions) {
        const k = 1 - e.age / 0.3; c.strokeStyle = `rgba(255,204,124,${k})`; c.lineWidth = 7 * k + 2; c.beginPath(); c.arc(e.x, e.y, Math.max(2, e.radius), 0, Math.PI * 2); c.stroke();
        if (!this.lowFx) {
          const r = 28 + e.radius * 0.65, glow = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
          glow.addColorStop(0, `rgba(255,248,207,${k * 0.95})`); glow.addColorStop(0.32, `rgba(255,183,87,${k * 0.8})`); glow.addColorStop(1, 'rgba(244,114,65,0)');
          c.fillStyle = glow; c.beginPath(); c.arc(e.x, e.y, r, 0, Math.PI * 2); c.fill();
          for (let i = 0; i < 7; i++) { const a = i * 2.39996 + e.id, distance = r * (0.3 + i % 3 * 0.08); c.fillStyle = `rgba(255,${155 + i * 10},85,${k * 0.42})`; c.beginPath(); c.arc(e.x + Math.cos(a) * distance, e.y + Math.sin(a) * distance, 8 + k * (9 + i % 3 * 3), 0, Math.PI * 2); c.fill(); }
          c.strokeStyle = `rgba(182,239,225,${k * 0.55})`; c.lineWidth = 2; c.beginPath(); c.ellipse(e.x, e.y, Math.max(2, e.radius * 0.78), Math.max(2, e.radius * 0.62), 0, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = `rgba(255,218,147,${k * 0.75})`; c.lineWidth = 3;
          for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4 + e.id; c.beginPath(); c.moveTo(e.x + Math.cos(angle) * r * 0.35, e.y + Math.sin(angle) * r * 0.35); c.lineTo(e.x + Math.cos(angle) * r * 0.9, e.y + Math.sin(angle) * r * 0.9); c.stroke(); }
        }
        c.fillStyle = `rgba(255,245,206,${k * 0.9})`; c.beginPath(); c.arc(e.x, e.y, 24 * k, 0, Math.PI * 2); c.fill();
      }
    }
    for (const p of this.particles) {
      c.globalAlpha = 1 - p.age / p.life;
      if (p.smoke) { c.fillStyle = 'rgba(63,78,79,.6)'; c.beginPath(); c.arc(p.x, p.y, 5 + p.age * 12, 0, Math.PI * 2); c.fill(); }
      else if (p.bubble) { c.strokeStyle = '#bde9de'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, 2 + p.age * 4, 0, Math.PI * 2); c.stroke(); }
      else { c.save(); c.translate(p.x, p.y); c.rotate(p.angle + p.age * 5); c.fillStyle = p.color; c.fillRect(-4, -1.5, 8, 3); c.restore(); }
    } c.globalAlpha = 1;
    c.textAlign = 'center';
    for (const label of this.labels) { c.globalAlpha = Math.min(1, (0.95 - label.age) * 3); c.fillStyle = label.combo > 1 ? '#ffd690' : '#e6f1d9'; c.font = 'bold 27px monospace'; c.fillText(`+${label.points}`, label.x, label.y - label.age * 55); if (label.combo > 1) { c.font = '18px monospace'; c.fillText(`${label.combo} 连爆`, label.x, label.y - label.age * 55 - 30); } }
    c.globalAlpha = 1; c.textAlign = 'start';
  }
  scoreCard(sim) {
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 960; const c = canvas.getContext('2d');
    c.fillStyle = '#0b2c3d'; c.fillRect(0, 0, 720, 960); c.strokeStyle = '#325263'; c.lineWidth = 1;
    for (let y = 0; y < 960; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(720, y); c.stroke(); }
    c.fillStyle = '#e8e2c9'; c.font = 'bold 58px sans-serif'; c.fillText('深海猎杀', 64, 125);
    c.font = '18px monospace'; c.fillStyle = '#8aadae'; c.fillText('炸潜艇 · 这局的成绩', 67, 165);
    c.fillStyle = '#efac70'; c.font = 'bold 105px monospace'; c.fillText(String(sim.score).padStart(6, '0'), 58, 365);
    c.fillStyle = '#e8e2c9'; c.font = '30px sans-serif'; c.fillText(`一颗最多炸 ${sim.maxCombo} 艘`, 64, 465); c.fillText(`共炸掉 ${sim.kills} 艘 · 打到第 ${sim.wave + 1} 波`, 64, 530);
    c.fillStyle = '#8aadae'; c.font = '23px sans-serif'; c.fillText(sim.reason, 64, 605);
    const old = this.ctx; this.ctx = c; c.save(); c.translate(360, 745); c.scale(2.8, 2.8); this.ship(0, 0); c.restore(); this.ctx = old;
    c.fillStyle = '#8aadae'; c.font = '20px sans-serif'; c.fillText('没炸够？再来一局。', 64, 884);
    return canvas.toDataURL('image/png');
  }
}
