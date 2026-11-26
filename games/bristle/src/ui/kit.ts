// Small UI kit: DOM builder, screen stack contract, keyboard/gamepad/mouse list navigation, UI sounds,
// settings storage and the CURAPROX wordmark.
import type { GameCore } from '../game/game';
import { clamp } from '../engine/math';
import type { Input, Action } from '../engine/input';
import { pack as PK } from '../design/tokens';

type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export interface Screen {
  el: HTMLElement;
  /** Called every frame while this screen is on top. */
  update(dt: number): void;
  /** Covers the game completely (no game update behind it). */
  modal?: boolean;
  onShow?(): void;
  onHide?(): void;
}

// ---------------------------------------------------------------- input helpers
/** Tap every action (no short-circuit) so one key that maps to several actions is fully consumed. */
export function taps(inp: Input, ...acts: Action[]) { let any = false; for (const a of acts) if (inp.tap(a)) any = true; return any; }
export const confirmTap = (inp: Input) => taps(inp, 'confirm', 'jump');
export const backTap = (inp: Input) => taps(inp, 'back', 'pause');

/** Directional presses with hold-to-repeat, for keyboard and gamepad. */
export class Nav {
  private held: Record<string, number> = {};
  dir(inp: Input, a: Action, dt: number) {
    if (inp.tap(a)) { this.held[a] = 0; return true; }
    if (inp.held(a)) { this.held[a] = (this.held[a] ?? 0) + dt; if (this.held[a] > 0.4) { this.held[a] -= 0.08; return true; } }
    else this.held[a] = 0;
    return false;
  }
  read(inp: Input, dt: number) {
    return { dy: (this.dir(inp, 'down', dt) ? 1 : 0) - (this.dir(inp, 'up', dt) ? 1 : 0), dx: (this.dir(inp, 'right', dt) ? 1 : 0) - (this.dir(inp, 'left', dt) ? 1 : 0) };
  }
}

// ---------------------------------------------------------------- sounds
export const sfx = {
  move: (g: GameCore) => g.audio.sfx('text-blip', { pitch: 1.5, vol: 0.45 }),
  ok: (g: GameCore) => g.audio.sfx('clink', { vol: 0.7 }),
  back: (g: GameCore) => g.audio.sfx('text-blip', { pitch: 0.75, vol: 0.5 }),
  deny: (g: GameCore) => g.audio.sfx('text-blip', { pitch: 0.5, vol: 0.6 }),
};

// ---------------------------------------------------------------- a focusable vertical list
export interface Item { el: HTMLElement; confirm?(): void; left?(): void; right?(): void; disabled?: boolean }
export class List {
  i = 0; nav = new Nav();
  constructor(public g: GameCore, public items: Item[], start = 0) {
    this.items.forEach((it, k) => {
      it.el.addEventListener('mouseenter', () => { if (!it.disabled && this.i !== k) this.focus(k); });
      it.el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-step]')) return; if (!it.disabled) { this.focus(k, false); it.confirm?.(); } });
    });
    this.i = this.firstEnabled(start); this.paint();
  }
  private firstEnabled(from: number) { for (let k = 0; k < this.items.length; k++) { const j = (from + k) % this.items.length; if (!this.items[j].disabled) return j; } return 0; }
  focus(k: number, sound = true) { this.i = k; this.paint(); if (sound) sfx.move(this.g); this.items[k].el.scrollIntoView?.({ block: 'nearest' }); }
  paint() { this.items.forEach((it, k) => { it.el.classList.toggle('is-focus', k === this.i); it.el.classList.toggle('is-disabled', !!it.disabled); }); }
  /** Handle input; returns true if confirm was pressed (and handled). */
  update(dt: number) {
    const inp = this.g.input, { dy, dx } = this.nav.read(inp, dt);
    if (dy) { let j = this.i; for (let k = 0; k < this.items.length; k++) { j = (j + dy + this.items.length) % this.items.length; if (!this.items[j].disabled) break; } if (j !== this.i) this.focus(j); }
    const it = this.items[this.i]; if (!it) return false;
    if (dx < 0 && it.left) it.left(); if (dx > 0 && it.right) it.right();
    if (confirmTap(inp) || inp.tap('interact')) { if (!it.disabled && it.confirm) { it.confirm(); return true; } }
    return false;
  }
}

/** A labelled button row for lists. */
export const button = (label: string, sub?: string) => h('button', { class: 'ui-item', type: 'button' }, h('span', { class: 'ui-label', text: label }), sub ? h('span', { class: 'ui-sub', text: sub }) : null);

// ---------------------------------------------------------------- settings (kept apart from the save, so New game keeps them)
const SETTINGS_KEY = 'bristle-settings-v1';
export function loadSettings(g: GameCore) {
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); if (s && typeof s === 'object') Object.assign(g.save.settings, s); } catch { /* storage blocked */ }
  applySettings(g);
}
export function applySettings(g: GameCore) {
  const s = g.save.settings;
  s.master = clamp(Number(s.master) || 0, 0, 1); s.music = clamp(Number(s.music) || 0, 0, 1); s.sfx = clamp(Number(s.sfx) || 0, 0, 1);
  s.shake = clamp(Number(s.shake) || 0, 0, 1); s.quality = clamp(Number(s.quality) || 1, 0.5, 1);
  g.audio.setVolumes(s.master, s.music, s.sfx); g.r.quality = s.quality;
}
export function saveSettings(g: GameCore) {
  applySettings(g);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(g.save.settings)); } catch { /* storage blocked */ }
  if (g.state !== 'title' && g.player) g.persist();
}

// ---------------------------------------------------------------- CURAPROX wordmark (from Plaque Hunter's config)
const WORDMARK = { viewBox: "283 208 1037 160", d: "m1257.03 288.028-44.38 77.664h19.09l34.42-61.706 34.46 61.706h19.07l-44.37-77.664 40.64-72.428h-19.14l-30.66 56.515-30.61-56.515h-19.15zm-132.78-59.482c34.42 0 61.48 28.06 61.48 62.111 0 33.821-27.44 62.089-61.48 62.089s-61.5-28.279-61.5-62.089c0-34.04 27.09-62.111 61.5-62.111m0-15.519c-42.82 0-78.24 34.828-78.24 77.827 0 43.196 35.42 77.444 78.24 77.444 42.81 0 78.25-34.27 78.25-77.444 0-42.999-35.42-77.827-78.22-77.827m-164.824 86.775h4.14l45.374 65.912h20.54L981.733 298.4c23.097-1.982 37.587-18.301 37.587-41.4 0-33.832-26.47-41.378-54.957-41.378h-21.642V365.67h16.724v-65.868zm0-68.66h4.918c20.152 0 38.226 2.387 38.226 27.063 0 23.296-19.082 26.888-37.986 26.888h-5.158zm-107.092 0h6.166c19.506 0 39.22 1.807 39.22 26.285 0 21.489-15.717 27.064-34.248 27.064h-11.138zm0 68.868h12.146c12.551 0 25.464-1.599 35.584-9.933 9.408-7.777 14.359-20.12 14.359-32.266 0-13.351-5.816-26.472-16.944-34.248-10.952-7.557-24.281-7.941-37.238-7.941h-24.676V365.67h16.758v-65.714zm-81.837 7.579h-50.753l25.683-60.084zm6.572 15.531 17.721 42.594h18.52l-67.488-157.276-69.274 157.287h18.323l18.104-42.594h64.094zm-182.708-23.318h4.151l45.387 65.912h20.503L616.679 298.4c23.077-1.982 37.6-18.301 37.6-41.4 0-33.832-26.472-41.378-54.926-41.378h-21.708V365.67h16.735v-65.868zm0-68.66h4.973c20.097 0 38.223 2.387 38.223 27.063 0 23.296-19.112 26.888-38.026 26.888h-5.17zm-143.739-15.52h-16.724v93.95c0 17.118 1.599 30.853 14.742 43.382 10.153 9.978 24.675 15.333 38.793 15.333a55.22 55.22 0 0 0 40.371-17.107c11.938-12.343 13.142-25.3 13.142-41.619v-93.939h-16.691v89.361c0 11.752.613 24.873-7.36 34.434-6.955 8.379-18.718 13.329-29.462 13.329-10.952 0-23.69-5.159-30.239-14.337-6.966-9.539-6.572-22.266-6.572-33.426zm-44.587 12.168a72.4 72.4 0 0 0-44.795-14.742 78.49 78.49 0 0 0-78.222 78.189c0 42.616 35.825 77.04 78.222 77.04a77.1 77.1 0 0 0 44.795-14.731v-20.711c-11.949 11.938-28.476 19.9-45.376 19.9-33.634 0-60.906-29.057-60.906-62.089s27.074-62.111 60.479-62.111a64.25 64.25 0 0 1 45.77 19.89z" };
export function wordmark(cls = 'wordmark') {
  // Non-CURAPROX packs: the pack's name set in the display face, until that brand supplies its own mark.
  if (PK.id !== 'curaprox') { const s = document.createElement('span'); s.className = cls; s.textContent = PK.name.toUpperCase(); s.style.cssText = 'font-family:var(--display);letter-spacing:0.18em;display:inline-block'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', PK.name); return s as unknown as SVGSVGElement; }
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
  svg.setAttribute('viewBox', WORDMARK.viewBox); svg.setAttribute('class', cls); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'CURAPROX');
  p.setAttribute('d', WORDMARK.d); p.setAttribute('fill', 'currentColor'); svg.append(p); return svg;
}

/** Keyboard or gamepad glyph for an action, for hints. */
export function keyName(g: GameCore, a: 'confirm' | 'back' | 'move' | 'jump' | 'attack' | 'spell' | 'dash' | 'interact' | 'focus' | 'size') {
  const pad = g.input.usingPad;
  const K: Record<string, [string, string]> = {
    confirm: ['Enter', 'A'], back: ['Esc', 'B'], move: ['A / D', 'Left stick'], jump: ['Space', 'A'], attack: ['J', 'X'],
    spell: ['L', 'Y'], dash: ['K', 'RB'], interact: ['E', 'Up'], focus: ['F', 'LB'], size: ['R', 'R3'],
  };
  return K[a][pad ? 1 : 0];
}
