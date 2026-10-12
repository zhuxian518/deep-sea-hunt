export class Clock {
  constructor() { this.reset(); }
  reset() { this.last = null; this.accumulator = 0; }
  advance(ms, running, step) {
    if (this.last === null) this.last = ms;
    const elapsed = Math.max(0, Math.min((ms - this.last) / 1000, 0.25));
    this.last = ms;
    if (!running) { this.accumulator = 0; return 0; }
    this.accumulator += elapsed;
    let steps = 0;
    while (this.accumulator + 1e-10 >= 1 / 60 && steps < 5) {
      step(1 / 60); this.accumulator -= 1 / 60; steps++;
    }
    if (steps === 5 && this.accumulator >= 1 / 60) this.accumulator = 0;
    return Math.max(0, this.accumulator * 60);
  }
}
