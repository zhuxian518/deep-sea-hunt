import test from 'node:test';
import assert from 'node:assert/strict';
import { InputAdapter } from '../src/input/InputAdapter.js';
function fixture(t, pointer = true) {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  class Surface {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback, options) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push({ callback, options }); }
    emit(type, fields = {}) { const event = { cancelable: true, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...fields }; for (const listener of this.listeners.get(type) || []) listener.callback(event); return event; }
  }
  const root = new Surface(), win = new Surface(), doc = new Surface(), buttons = ['left', 'fire', 'right'].map(control => ({ dataset: { control }, held: false, closest() { return this; }, classList: { toggle() {} }, setPointerCapture() {} }));
  root.contains = button => buttons.includes(button); root.querySelectorAll = () => buttons;
  doc.elementFromPoint = x => buttons[x] || null;
  win.PointerEvent = pointer ? function PointerEvent() {} : undefined;
  globalThis.window = win; globalThis.document = doc;
  t.after(() => { globalThis.window = oldWindow; globalThis.document = oldDocument; });
  let pauses = 0; const input = new InputAdapter(root, () => pauses++); input.setEnabled(true);
  return { root, win, doc, buttons, input, pauses: () => pauses };
}
test('pointer input holds two controls independently and releases outside root', t => {
  const f = fixture(t);
  f.root.emit('pointerdown', { pointerId: 1, target: f.buttons[0] }); f.root.emit('pointerdown', { pointerId: 2, target: f.buttons[1] });
  assert.deepEqual(f.input.sample(), { moveAxis: -1, fireHeld: true });
  f.win.emit('pointerup', { pointerId: 1 }); assert.deepEqual(f.input.sample(), { moveAxis: 0, fireHeld: true });
  f.win.emit('pointercancel', { pointerId: 2 }); assert.deepEqual(f.input.sample(), { moveAxis: 0, fireHeld: false });
});
test('capture failure cannot strand a pointer and foreign controls are ignored', t => {
  const f = fixture(t); f.buttons[0].setPointerCapture = () => { throw Error('unsupported capture'); };
  assert.doesNotThrow(() => f.root.emit('pointerdown', { pointerId: 1, target: f.buttons[0] }));
  f.win.emit('pointermove', { pointerId: 1, clientX: 9, clientY: 0 }); assert.equal(f.input.sample().moveAxis, 0);
  f.win.emit('pointermove', { pointerId: 1, clientX: 2, clientY: 0 }); assert.equal(f.input.sample().moveAxis, 1);
  f.win.emit('lostpointercapture', { pointerId: 1 }); assert.equal(f.input.pointers.size, 0);
  f.root.emit('pointerdown', { pointerId: 5, target: { closest() { return { dataset: { control: 'left' } }; } } }); assert.equal(f.input.pointers.size, 0);
});
test('TouchEvent fallback supports movement plus fire and individual cancellation', t => {
  const f = fixture(t, false), touch = (identifier, clientX) => ({ identifier, clientX, clientY: 0 });
  const start = f.root.emit('touchstart', { changedTouches: [touch(12, 0), touch(29, 1)] });
  assert.equal(start.defaultPrevented, true); assert.deepEqual(f.input.sample(), { moveAxis: -1, fireHeld: true });
  f.root.emit('touchmove', { changedTouches: [touch(12, 2)] }); assert.deepEqual(f.input.sample(), { moveAxis: 1, fireHeld: true });
  f.win.emit('touchcancel', { changedTouches: [touch(29, 1)] }); assert.deepEqual(f.input.sample(), { moveAxis: 1, fireHeld: false });
  f.win.emit('touchend', { changedTouches: [touch(12, 2)] }); assert.equal(f.input.pointers.size, 0);
});
test('mouse fallback accepts only primary button and releases outside controls', t => {
  const f = fixture(t, false);
  f.root.emit('mousedown', { button: 2, target: f.buttons[0] }); assert.equal(f.input.pointers.size, 0);
  f.root.emit('mousedown', { button: 0, target: f.buttons[2] }); assert.equal(f.input.sample().moveAxis, 1);
  f.win.emit('mousemove', { clientX: 0, clientY: 0 }); assert.equal(f.input.sample().moveAxis, -1);
  f.win.emit('mouseup'); assert.equal(f.input.sample().moveAxis, 0);
});
test('background and disable release all held inputs without firing pause repeatedly', t => {
  const f = fixture(t);
  for (const action of [() => f.win.emit('blur'), () => f.win.emit('pagehide'), () => { f.doc.hidden = true; f.doc.emit('visibilitychange'); }, () => f.input.setEnabled(false)]) {
    f.input.setEnabled(true); f.win.emit('keydown', { code: 'Space', target: {} }); f.root.emit('pointerdown', { pointerId: 1, target: f.buttons[0] }); action();
    assert.deepEqual(f.input.sample(), { moveAxis: 0, fireHeld: false }); assert.equal(f.input.pointers.size, 0);
  }
  f.input.setEnabled(true); f.win.emit('keydown', { code: 'Escape', target: {} }); f.win.emit('keydown', { code: 'Escape', repeat: true, target: {} }); assert.equal(f.pauses(), 1); assert.equal(f.input.keys.size, 0);
});
test('selection/callout blockers are cancelable and touch listeners explicitly non-passive', t => {
  const f = fixture(t);
  for (const type of ['selectstart', 'contextmenu', 'dragstart', 'touchstart', 'touchmove']) assert.equal(f.root.emit(type).defaultPrevented, true, type);
  assert.equal(f.root.listeners.get('touchstart')[0].options.passive, false);
  assert.equal(f.root.listeners.get('touchmove')[0].options.passive, false);
  assert.equal(f.root.emit('touchstart', { cancelable: false }).defaultPrevented, false);
});
