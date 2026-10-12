export function viewport(width, height, world, dpr = 1) {
  const scale = Math.min(width / world.width, height / world.height);
  return { scale, x: (width - world.width * scale) / 2, y: 0, dpr: Math.min(2, dpr || 1) };
}
export function toScreen(point, view) { return { x: point.x * view.scale + view.x, y: point.y * view.scale + view.y }; }
export function toWorld(point, view) { return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale }; }
