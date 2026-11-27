// Keyboard, mouse and gamepad, mapped to named actions. Presses are buffered so a jump pressed a few
// frames early still counts (see Input.pressed(action, buffer)).
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'dash' | 'spell' | 'focus' | 'interact' | 'pause' | 'confirm' | 'back' | 'size';

const KEYS: Record<string, Action[]> = {
  ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'], ArrowUp: ['up'], KeyW: ['up'], ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump', 'confirm'], KeyZ: ['jump'], KeyJ: ['attack'], KeyX: ['attack'], KeyK: ['dash'], KeyC: ['dash'], ShiftLeft: ['dash'], ShiftRight: ['dash'],
  KeyL: ['spell'], KeyV: ['spell'], KeyF: ['focus'], KeyQ: ['focus'], KeyE: ['interact'], Enter: ['confirm', 'interact'], KeyR: ['size'], Tab: ['size'],
  Escape: ['pause', 'back'], KeyP: ['pause'], Backspace: ['back'],
};
// Standard gamepad layout: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 9 Start, 12-15 d-pad
const PAD: Record<number, Action[]> = { 0: ['jump', 'confirm'], 1: ['dash', 'back'], 2: ['attack'], 3: ['spell'], 4: ['focus'], 5: ['dash'], 6: ['focus'], 7: ['dash'], 9: ['pause'], 8: ['interact'], 12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'], 10: ['size'], 11: ['size'] };

export class Input {
  private down = new Set<Action>();
  private padDown = new Set<Action>();
  private pressT = new Map<Action, number>(); // time of last press
  private consumed = new Map<Action, number>();
  private pending = new Set<Action>(); // presses since the last poll; stamped with the poll time
  time = 0;
  axisX = 0; axisY = 0;
  usingPad = false;
  lastKey = '';
  /** Mouse position (page CSS px). mouseAim turns on when the mouse moves and off when a pad is used. */
  mouseX = 0; mouseY = 0; mouseAim = false;
  /** True when the last spell press came from the right mouse button (it always shoots, never Rinses). */
  spellFromMouse = false;
  /** Right stick (gamepad axes 2, 3) when pushed past 0.4, else 0. */
  aimX = 0; aimY = 0;

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const acts = KEYS[e.code]; this.lastKey = e.code; this.usingPad = false; if (acts?.includes('spell')) this.spellFromMouse = false;
      if (!acts) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      for (const a of acts) { this.down.add(a); this.pending.add(a); }
    });
    target.addEventListener('keyup', (e) => { const acts = KEYS[e.code]; if (acts) for (const a of acts) this.down.delete(a); });
    target.addEventListener('blur', () => { this.down.clear(); });
    target.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement)?.closest?.('#ui button, #ui input, #ui a')) return;
      // left = slash, right = interdental shot (hold to draw; Up + right = Rinse), middle = refill size
      const a: Action = e.button === 2 ? 'spell' : e.button === 1 ? 'size' : 'attack'; this.down.add(a); this.pending.add(a); if (a === 'spell') this.spellFromMouse = true;
    });
    target.addEventListener('mouseup', (e) => this.down.delete(e.button === 2 ? 'spell' : e.button === 1 ? 'size' : 'attack'));
    // the wheel cycles the refill size: one press per notch, ignored over menus
    target.addEventListener('wheel', (e) => { if ((e.target as HTMLElement)?.closest?.('#ui')) return; if (Math.abs(e.deltaY) > 0) this.pending.add('size'); }, { passive: true });
    target.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; this.mouseAim = true; });
    target.addEventListener('contextmenu', (e) => { if ((e.target as HTMLElement)?.tagName === 'CANVAS') e.preventDefault(); });
  }

  /** Call once per frame before game update. */
  poll(time: number) {
    this.time = time;
    for (const a of this.pending) this.pressT.set(a, time);
    this.pending.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set<Action>(); let ax = 0, ay = 0;
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b.pressed && PAD[i]) for (const a of PAD[i]) now.add(a); });
      if (Math.abs(p.axes[0]) > 0.3) ax = p.axes[0];
      if (Math.abs(p.axes[1]) > 0.3) ay = p.axes[1];
      const rx = p.axes[2] ?? 0, ry = p.axes[3] ?? 0; if (Math.hypot(rx, ry) > 0.4) { this.aimX = rx; this.aimY = ry; this.mouseAim = false; } else { this.aimX = 0; this.aimY = 0; }
    }
    if (ax < -0.3) now.add('left'); if (ax > 0.3) now.add('right'); if (ay < -0.5) now.add('up'); if (ay > 0.5) now.add('down');
    for (const a of now) if (!this.padDown.has(a)) { this.pressT.set(a, time); this.usingPad = true; this.mouseAim = false; }
    this.padDown = now;
    const k = (a: Action) => this.down.has(a) || now.has(a);
    this.axisX = ax || (k('right') ? 1 : 0) - (k('left') ? 1 : 0);
    this.axisY = ay || (k('down') ? 1 : 0) - (k('up') ? 1 : 0);
  }
  held(a: Action) { return this.down.has(a) || this.padDown.has(a); }
  /** True if `a` was pressed within the last `buffer` seconds and not yet consumed. */
  pressed(a: Action, buffer = 0) {
    const t = this.pressT.get(a); if (t === undefined) return false;
    if ((this.consumed.get(a) ?? -1) >= t) return false;
    return this.time - t <= buffer + 1e-6;
  }
  consume(a: Action) { const t = this.pressT.get(a); if (t !== undefined) this.consumed.set(a, t); }
  /** Pressed this frame (no buffer) and consume it. Handy for menus. */
  tap(a: Action) { if (this.pressed(a, 0)) { this.consume(a); return true; } return false; }
  clear() { this.down.clear(); this.pending.clear(); for (const [a, t] of this.pressT) this.consumed.set(a, t); }
}
