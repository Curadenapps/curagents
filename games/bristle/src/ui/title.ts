// Title: an atmospheric night over Ivoria drawn on the game's own canvases (so it gets the light, bloom and
// grain of the post chain), with the logo and menu as DOM on top.
import type { GameCore } from '../game/game';
import { DEFAULT_GRADE } from '../engine/post';
import { TAU, clamp, easeOut, hash2 } from '../engine/math';
import { h, List, button, wordmark, sfx, type Screen, type Item, backTap } from './kit';

// ---------------------------------------------------------------- the scene
const STARS = Array.from({ length: 140 }, (_, i) => ({ x: hash2(i, 1), y: hash2(i, 2) * 0.6, s: 0.4 + hash2(i, 3) * 1.4, p: hash2(i, 4) * TAU }));
const MOTES = Array.from({ length: 46 }, (_, i) => ({ x: hash2(i, 11), y: hash2(i, 12), s: 1 + hash2(i, 13) * 2.4, v: 0.012 + hash2(i, 14) * 0.03, p: hash2(i, 15) * TAU }));
const GLOW_DOTS = Array.from({ length: 34 }, (_, i) => ({ x: hash2(i, 21), y: hash2(i, 22), p: hash2(i, 23) * TAU }));

/** A tooth silhouette: kind 0 molar (cusps), 1 canine (point), 2 incisor (flat). Base at y, width w, height ht. */
function tooth(c: CanvasRenderingContext2D, x: number, y: number, w: number, ht: number, kind: number) {
  const top = y - ht, r = w / 2;
  c.beginPath(); c.moveTo(x - r * 0.82, y + 4);
  c.bezierCurveTo(x - r * 0.95, y - ht * 0.45, x - r * 1.04, top + ht * 0.2, x - r * 0.9, top + ht * 0.08);
  if (kind === 0) {
    c.quadraticCurveTo(x - r * 0.72, top - ht * 0.05, x - r * 0.42, top + ht * 0.02);
    c.quadraticCurveTo(x - r * 0.2, top + ht * 0.1, x, top + ht * 0.04);
    c.quadraticCurveTo(x + r * 0.2, top - ht * 0.06, x + r * 0.45, top + ht * 0.01);
    c.quadraticCurveTo(x + r * 0.75, top - ht * 0.02, x + r * 0.9, top + ht * 0.08);
  } else if (kind === 1) {
    c.quadraticCurveTo(x - r * 0.5, top + ht * 0.02, x, top - ht * 0.06);
    c.quadraticCurveTo(x + r * 0.5, top + ht * 0.02, x + r * 0.9, top + ht * 0.08);
  } else {
    c.quadraticCurveTo(x - r * 0.6, top - ht * 0.02, x, top);
    c.quadraticCurveTo(x + r * 0.6, top - ht * 0.02, x + r * 0.9, top + ht * 0.08);
  }
  c.bezierCurveTo(x + r * 1.04, top + ht * 0.2, x + r * 0.95, y - ht * 0.45, x + r * 0.82, y + 4);
  c.closePath();
}

/** The knight, small, seen from behind-left, standing on the ledge looking at the Gate. */
function knight(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const flut = Math.sin(t * 2.1) * 3 + Math.sin(t * 3.7) * 1.5;
  // cloak streaming in the wind
  c.fillStyle = '#0a1c4a';
  c.beginPath(); c.moveTo(-5, -30); c.bezierCurveTo(-16, -24, -26 + flut, -14, -34 + flut * 1.4, -6 + flut * 0.3); c.bezierCurveTo(-22, -6, -12, -2, -6, -6); c.closePath(); c.fill();
  // body and legs
  c.fillStyle = '#071233'; c.beginPath(); c.roundRect(-8, -32, 16, 24, 6); c.fill();
  c.fillRect(-6, -10, 4.5, 10); c.fillRect(1.5, -10, 4.5, 10);
  // brush-blade held low, pointing down-right
  c.save(); c.translate(7, -18); c.rotate(0.9);
  c.fillStyle = '#0d2a6e'; c.beginPath(); c.roundRect(-1.6, 0, 3.2, 26, 1.5); c.fill();
  c.restore();
  // crown helm: molar cusps
  c.fillStyle = '#0b1838';
  c.beginPath(); c.moveTo(-9, -30); c.quadraticCurveTo(-11, -44, -7, -47); c.quadraticCurveTo(-4.5, -50, -2.5, -46.5); c.quadraticCurveTo(0, -49, 2.5, -46.5); c.quadraticCurveTo(4.5, -50, 7, -47); c.quadraticCurveTo(11, -44, 9, -30); c.closePath(); c.fill();
  c.restore();
}
function knightGlow(c: CanvasRenderingContext2D, g: GameCore, x: number, y: number, s: number, t: number) {
  // rim light on the helm and the brush tuft
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = 'rgba(160,200,255,0.55)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(9, -30); c.quadraticCurveTo(11, -44, 7, -47); c.quadraticCurveTo(4.5, -50, 2.5, -46.5); c.stroke();
  c.restore();
  const bx = x + (7 + Math.cos(0.9 + Math.PI / 2) * -26) * s, by = y + (-18 + Math.sin(0.9 + Math.PI / 2) * 26) * s;
  g.r.halo(c, bx, by, 26 * s, '#8BB8E8', 0.7 + Math.sin(t * 2) * 0.1);
  g.r.halo(c, bx, by, 7 * s, '#ffffff', 0.9);
}

export function drawTitleScene(g: GameCore, t: number, fade: number) {
  const r = g.r, sc = r.sc, em = r.em, w = r.scene.width, hgt = r.scene.height, u = hgt / 720;
  sc.setTransform(1, 0, 0, 1, 0, 0); em.setTransform(1, 0, 0, 1, 0, 0);
  r.ambient = '#808080';
  Object.assign(r.grade, DEFAULT_GRADE, { bloom: 0.7, vignette: 0.7, fade, saturation: 1.08 });
  r.grade.flash = [1, 1, 1, 0];
  const drift = Math.sin(t * 0.045) * 40 * u, horizon = hgt * 0.7;
  const px = (k: number) => drift * k;

  // sky: the dark of the Great Smile, a deep blue glow where light pours in from beyond
  const sky = sc.createLinearGradient(0, 0, 0, hgt);
  sky.addColorStop(0, '#030819'); sky.addColorStop(0.45, '#0a1b47'); sky.addColorStop(0.7, '#163a7c'); sky.addColorStop(1, '#040a1e');
  sc.fillStyle = sky; sc.fillRect(0, 0, w, hgt);
  // the palate arch: faint ridges across the top
  sc.lineWidth = 2 * u;
  for (let i = 0; i < 6; i++) {
    sc.strokeStyle = `rgba(80,120,200,${0.07 + i * 0.012})`;
    sc.beginPath(); sc.ellipse(w / 2 + px(0.1), -hgt * (0.9 - i * 0.07), w * (0.75 + i * 0.05), hgt * (1.05 - i * 0.05), 0, 0.15 * Math.PI, 0.85 * Math.PI); sc.stroke();
  }
  // light shafts
  sc.save(); sc.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x0 = w * (0.18 + i * 0.17) + px(0.15), a = 0.035 + 0.02 * Math.sin(t * 0.3 + i * 1.7);
    const gr = sc.createLinearGradient(x0, 0, x0 + hgt * 0.35, hgt * 0.8); gr.addColorStop(0, `rgba(139,184,232,${a})`); gr.addColorStop(1, 'rgba(139,184,232,0)');
    sc.fillStyle = gr; sc.beginPath(); sc.moveTo(x0 - 30 * u, 0); sc.lineTo(x0 + 40 * u, 0); sc.lineTo(x0 + hgt * 0.42, hgt * 0.85); sc.lineTo(x0 + hgt * 0.22, hgt * 0.85); sc.fill();
  }
  sc.restore();
  // stars (glints of enamel far away)
  for (const s of STARS) { const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * (0.6 + s.s) + s.p)); em.fillStyle = `rgba(200,222,255,${a})`; em.fillRect(s.x * w + px(0.05), s.y * hgt, s.s * u, s.s * u); }
  r.halo(em, w * 0.5 + px(0.05), hgt * 0.05, hgt * 0.75, '#3d6fc2', 0.22);

  // far towers
  sc.fillStyle = '#0c2154';
  for (let i = -1; i < 14; i++) { const x = i * w / 11 + px(0.25) + hash2(i, 31) * 30 * u, ht = hgt * (0.16 + hash2(i, 32) * 0.14); tooth(sc, x, horizon + 10 * u, w / 13 + hash2(i, 33) * 20 * u, ht, i % 3); sc.fill(); }
  // fog band
  let fog = sc.createLinearGradient(0, horizon - hgt * 0.12, 0, horizon + hgt * 0.05);
  fog.addColorStop(0, 'rgba(60,100,180,0)'); fog.addColorStop(0.7, 'rgba(60,100,180,0.18)'); fog.addColorStop(1, 'rgba(30,60,130,0.05)');
  sc.fillStyle = fog; sc.fillRect(0, horizon - hgt * 0.12, w, hgt * 0.2);
  // mid towers, with rim light on their left edge
  for (let i = -1; i < 9; i++) {
    const x = i * w / 6.5 + px(0.5) + hash2(i, 41) * 40 * u, ht = hgt * (0.26 + hash2(i, 42) * 0.16), tw = w / 9 + hash2(i, 43) * 30 * u, base = horizon + hgt * 0.07;
    if (x > w * 0.56 && x < w * 0.9) continue; // leave room for the Gate
    sc.fillStyle = '#081a43'; tooth(sc, x, base, tw, ht, (i + 1) % 3); sc.fill();
    sc.save(); tooth(sc, x, base, tw, ht, (i + 1) % 3); sc.clip(); sc.strokeStyle = 'rgba(120,165,230,0.35)'; sc.lineWidth = 3 * u; sc.beginPath(); sc.moveTo(x - tw * 0.45, base); sc.quadraticCurveTo(x - tw * 0.55, base - ht * 0.7, x - tw * 0.3, base - ht * 0.98); sc.stroke(); sc.restore();
  }
  // the Crown Gate: a great molar with an arched gate glowing from within
  const gx = w * 0.74 + px(0.6), gb = horizon + hgt * 0.1, gw = Math.min(w * 0.24, hgt * 0.5), gh = hgt * 0.5;
  sc.fillStyle = '#0a1d4c'; tooth(sc, gx, gb, gw, gh, 0); sc.fill();
  sc.save(); tooth(sc, gx, gb, gw, gh, 0); sc.clip();
  sc.strokeStyle = 'rgba(139,184,232,0.5)'; sc.lineWidth = 4 * u; sc.beginPath(); sc.moveTo(gx - gw * 0.42, gb); sc.quadraticCurveTo(gx - gw * 0.55, gb - gh * 0.75, gx - gw * 0.3, gb - gh * 0.99); sc.stroke();
  sc.strokeStyle = 'rgba(30,60,130,0.6)'; sc.lineWidth = 2 * u; // fissure lines on the crown
  sc.beginPath(); sc.moveTo(gx - gw * 0.2, gb - gh * 0.98); sc.quadraticCurveTo(gx, gb - gh * 0.85, gx + gw * 0.22, gb - gh * 0.98); sc.moveTo(gx, gb - gh * 0.9); sc.lineTo(gx, gb - gh * 0.78); sc.stroke();
  sc.restore();
  const aw = gw * 0.24, ah = gh * 0.34, ay = gb - hgt * 0.035;
  sc.fillStyle = '#9cc4f0'; sc.beginPath(); sc.moveTo(gx - aw / 2, ay); sc.lineTo(gx - aw / 2, ay - ah + aw / 2); sc.arc(gx, ay - ah + aw / 2, aw / 2, Math.PI, 0); sc.lineTo(gx + aw / 2, ay); sc.fill();
  r.halo(em, gx, ay - ah * 0.45, ah * 1.4, '#8BB8E8', 0.55 + 0.06 * Math.sin(t * 1.3));
  r.halo(em, gx, ay - ah * 0.4, ah * 0.5, '#ffffff', 0.35);
  // steps up to the gate
  sc.fillStyle = '#0d2457'; for (let k = 0; k < 4; k++) sc.fillRect(gx - aw * (0.9 + k * 0.25), ay + k * 6 * u, aw * (1.8 + k * 0.5), 6 * u);

  // gum hills: soft pink valleys, glowing spores
  const gum = sc.createLinearGradient(0, hgt * 0.76, 0, hgt);
  gum.addColorStop(0, '#2a0f3a'); gum.addColorStop(1, '#12061c');
  sc.fillStyle = gum; sc.beginPath(); sc.moveTo(0, hgt);
  for (let x = 0; x <= w + 40; x += 40 * u) sc.lineTo(x, hgt * 0.83 + Math.sin((x + px(0.8) * 2) / (190 * u)) * 16 * u + Math.sin(x / (73 * u)) * 6 * u);
  sc.lineTo(w, hgt); sc.fill();
  for (const d of GLOW_DOTS) { const x = d.x * w + px(0.8), y = hgt * (0.86 + d.y * 0.12), a = 0.35 + 0.3 * Math.sin(t * 1.2 + d.p); r.halo(em, x, y, 9 * u, '#F277C6', a); }

  // foreground ledge and the knight
  const lx = w * 0.2 + px(1.2), ly = hgt * 0.8;
  sc.fillStyle = '#030716'; sc.beginPath(); sc.moveTo(-10, hgt); sc.lineTo(-10, ly - 6 * u); sc.quadraticCurveTo(lx * 0.6, ly - 14 * u, lx + 40 * u, ly - 2 * u); sc.quadraticCurveTo(lx + 70 * u, ly + 6 * u, lx + 60 * u, ly + 40 * u); sc.quadraticCurveTo(lx + 40 * u, hgt * 0.95, lx + 90 * u, hgt); sc.closePath(); sc.fill();
  const ks = 1.9 * u, kx = lx + 18 * u, ky = ly - 3 * u;
  knight(sc, kx, ky, ks, t); knightGlow(em, g, kx, ky, ks, t);
  // visor glow
  r.halo(em, kx + 5 * ks, ky - 38 * ks, 8 * ks, '#8BB8E8', 0.8);

  // rising foam motes
  for (const m of MOTES) {
    const y = ((m.y - t * m.v) % 1 + 1) % 1, x = m.x * w + Math.sin(t * 0.7 + m.p) * 14 * u + px(0.9);
    const a = clamp(Math.sin(y * Math.PI) * 1.2, 0, 1) * 0.55;
    em.strokeStyle = `rgba(200,225,255,${a})`; em.lineWidth = 0.8 * u; em.beginPath(); em.arc(x, y * hgt, m.s * u, 0, TAU); em.stroke();
  }
  // low fog
  fog = sc.createLinearGradient(0, hgt * 0.78, 0, hgt); fog.addColorStop(0, 'rgba(40,70,140,0)'); fog.addColorStop(1, 'rgba(20,40,90,0.35)');
  sc.fillStyle = fog; sc.fillRect(0, hgt * 0.78, w, hgt * 0.22);
}

// ---------------------------------------------------------------- the screen
export interface TitleHooks {
  continueGame(): void;
  newGame(): void;
  settings(): void;
  controls(): void;
  credits(): void;
  confirm(question: string, yes: string, no: string): Promise<boolean>;
}

export class TitleScreen implements Screen {
  el: HTMLElement; modal = true;
  private menu: HTMLElement; private press: HTMLElement; private list!: List;
  private revealed = false; t = 0; private leaving = -1;
  constructor(private g: GameCore, private hooks: TitleHooks, skipPress = false) {
    const word = h('h1', { class: 'logo-word', 'aria-label': 'Bristle' });
    'BRISTLE'.split('').forEach((ch, i) => word.append(h('span', { style: `--i:${i}`, text: ch })));
    this.press = h('div', { class: 'title-press', text: 'Press any key' });
    this.menu = h('nav', { class: 'menu title-menu', 'aria-label': 'Main menu' });
    this.el = h('div', { class: 'scr title-scr' },
      h('div', { class: 'logo' }, word, h('div', { class: 'logo-rule' }), h('div', { class: 'logo-sub', text: 'Knight of the Crown' })),
      this.press, this.menu,
      h('footer', { class: 'title-foot' }, wordmark('wordmark title-mark'), h('span', { text: 'An original game prototype' })),
    );
    this.build();
    if (skipPress) this.reveal(false);
  }
  build() {
    const g = this.g, hasSave = g.hasSave(), items: Item[] = [];
    this.menu.replaceChildren();
    const add = (label: string, fn: () => void, sub?: string) => { const b = button(label, sub); this.menu.append(b); items.push({ el: b, confirm: () => { sfx.ok(g); fn(); } }); };
    if (hasSave) add('Continue', () => this.leave(() => this.hooks.continueGame()));
    add('New game', async () => {
      if (hasSave && !(await this.hooks.confirm('Start a new game?', 'Start over', 'Keep my journey'))) return;
      this.leave(() => this.hooks.newGame());
    });
    add('Settings', () => this.hooks.settings());
    add('Controls', () => this.hooks.controls());
    add('Credits', () => this.hooks.credits());
    this.list = new List(g, items);
  }
  onShow() { this.build(); }
  reveal(sound = true) {
    if (this.revealed) return; this.revealed = true;
    this.el.classList.add('is-revealed'); if (sound) this.g.audio.sfx('clink', { vol: 0.5, pitch: 1.2 });
    this.g.input.clear();
  }
  leave(fn: () => void) { if (this.leaving >= 0) return; this.leaving = 0; this.el.classList.add('is-leaving'); this.pending = fn; }
  private pending: (() => void) | null = null;
  /** Fade for the scene behind (1 = black). */
  sceneFade() { const intro = 1 - easeOut(clamp(this.t / 2.2, 0, 1)); return this.leaving >= 0 ? clamp(this.leaving / 0.6, 0, 1) : intro; }
  update(dt: number) {
    this.t += dt;
    if (this.leaving >= 0) { this.leaving += dt; if (this.leaving > 0.65 && this.pending) { const f = this.pending; this.pending = null; f(); } return; }
    const inp = this.g.input;
    if (!this.revealed) {
      if (this.t > 0.6 && (['confirm', 'jump', 'attack', 'interact', 'pause', 'back', 'up', 'down', 'left', 'right', 'dash', 'spell', 'focus'] as const).some((a) => inp.pressed(a, 0))) { this.g.audio.unlock(); this.reveal(); }
      return;
    }
    if (backTap(inp)) { /* root menu: nothing to go back to */ }
    this.list.update(dt);
  }
}
