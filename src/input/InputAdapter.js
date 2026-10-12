export class InputAdapter {
  constructor(root, onPause) {
    this.root = root; this.keys = new Set(); this.pointers = new Map(); this.onPause = onPause; this.enabled = false;
    const prevent = event => { if (event.cancelable) event.preventDefault(); };
    const controlAt = (x, y) => this.control(document.elementFromPoint(x, y));
    for (const type of ['contextmenu', 'selectstart', 'dragstart']) root.addEventListener(type, prevent);
    // iOS callouts and synthetic mouse events must not compete with held controls.
    for (const type of ['touchstart', 'touchmove']) root.addEventListener(type, prevent, { passive: false });
    if (typeof window.PointerEvent === 'function') {
      root.addEventListener('pointerdown', event => {
        const button = this.control(event.target);
        if (!button || !this.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        prevent(event);
        this.pointers.set(event.pointerId, button.dataset.control);
        try { if (button.setPointerCapture) button.setPointerCapture(event.pointerId); } catch (_) { /* Global release still works without capture. */ }
        this.paint();
      });
      window.addEventListener('pointermove', event => {
        if (!this.pointers.has(event.pointerId)) return;
        prevent(event); const button = controlAt(event.clientX, event.clientY);
        this.pointers.set(event.pointerId, button ? button.dataset.control : null); this.paint();
      }, { passive: false });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) window.addEventListener(name, event => { this.pointers.delete(event.pointerId); this.paint(); });
    } else {
      // Older Android/iOS WebViews may expose TouchEvent but no PointerEvent.
      const touches = event => {
        prevent(event); if (!this.enabled) return;
        for (const touch of Array.from(event.changedTouches || [])) {
          const button = controlAt(touch.clientX, touch.clientY);
          this.pointers.set(`touch-${touch.identifier}`, button ? button.dataset.control : null);
        }
        this.paint();
      };
      root.addEventListener('touchstart', touches, { passive: false });
      root.addEventListener('touchmove', touches, { passive: false });
      for (const name of ['touchend', 'touchcancel']) window.addEventListener(name, event => {
        for (const touch of Array.from(event.changedTouches || [])) this.pointers.delete(`touch-${touch.identifier}`);
        this.paint();
      }, { passive: false });
      root.addEventListener('mousedown', event => {
        const button = this.control(event.target);
        if (!this.enabled || event.button !== 0 || !button) return;
        prevent(event); this.pointers.set('mouse', button.dataset.control); this.paint();
      });
      window.addEventListener('mousemove', event => {
        if (!this.pointers.has('mouse')) return;
        const button = controlAt(event.clientX, event.clientY);
        this.pointers.set('mouse', button ? button.dataset.control : null); this.paint();
      });
      window.addEventListener('mouseup', () => { this.pointers.delete('mouse'); this.paint(); });
    }
    window.addEventListener('keydown', event => {
      if (!this.enabled || (event.target.matches && event.target.matches('input,textarea,select,[contenteditable="true"]'))) return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'Escape', 'KeyP'].includes(event.code)) {
        prevent(event);
        if (event.code === 'Escape' || event.code === 'KeyP') { if (!event.repeat) this.onPause(); }
        else this.keys.add(event.code);
        this.paint();
      }
    });
    window.addEventListener('keyup', event => { this.keys.delete(event.code); this.paint(); });
    window.addEventListener('blur', () => this.release());
    window.addEventListener('pagehide', () => this.release());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.release(); });
  }
  control(element) {
    const button = element && element.closest && element.closest('[data-control]');
    return button && this.root.contains(button) ? button : null;
  }
  setEnabled(value) { this.enabled = value; this.release(); }
  release() { this.keys.clear(); this.pointers.clear(); this.paint(); }
  sample() {
    if (!this.enabled) return { moveAxis: 0, fireHeld: false };
    const values = [...this.pointers.values()];
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA') || values.includes('left');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD') || values.includes('right');
    return { moveAxis: Number(right) - Number(left), fireHeld: this.keys.has('Space') || values.includes('fire') };
  }
  paint() {
    const sample = this.sample();
    for (const button of this.root.querySelectorAll('[data-control]')) {
      const active = button.dataset.control === 'fire' ? sample.fireHeld : sample.moveAxis === (button.dataset.control === 'left' ? -1 : 1);
      button.classList.toggle('held', active);
    }
  }
}
