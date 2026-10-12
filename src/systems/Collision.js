export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function circleBox(x, y, radius, box) {
  const dx = x - clamp(x, box.x - box.halfW, box.x + box.halfW);
  const dy = y - clamp(y, box.y - box.halfH, box.y + box.halfH);
  return dx * dx + dy * dy <= radius * radius;
}
// Relative swept segment against an expanded target box, returning time of impact.
export function sweptHit(projectile, target, radius) {
  const x = projectile.px - target.px, y = projectile.py - target.py;
  const dx = projectile.x - target.x - x, dy = projectile.y - target.y - y;
  let near = 0, far = 1;
  for (const [p, d, half] of [[x, dx, target.halfW + radius], [y, dy, target.halfH + radius]]) {
    if (Math.abs(d) < 1e-12) { if (p < -half || p > half) return null; }
    else {
      const a = (-half - p) / d, b = (half - p) / d;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) return null;
    }
  }
  return near;
}
export function sortHits(a, b) {
  return a.time - b.time || a.priority - b.priority || a.source.id - b.source.id || a.target.id - b.target.id;
}
