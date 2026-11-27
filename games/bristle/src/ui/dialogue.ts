// The dialogue box: a procedurally drawn portrait, a name plate, typewriter text with blips and choices.
// Characters speak only their written lines (no AI replies).
import type { GameCore } from '../game/game';
import { Npcs } from '../game/registry';
import { ART, gradientGlow } from '../game/npc/art';
import { converse, type Choice, type TalkHost } from '../game/npc/defs';
import { h, List, button, sfx, backTap, taps, type Screen } from './kit';
import { TAU, hash2 } from '../engine/math';

const PITCH: Record<string, number> = { derek: 1.0, pip: 1.5, warden: 0.68 };
const CPS = 52;

export interface DialogueHost { pop(s: Screen): void; push(s: Screen): void; openShop(): Promise<void>; visit: number; greeted: Record<string, number> }

export class Dialogue implements Screen, TalkHost {
  el: HTMLElement; closed = false;
  private portrait: HTMLCanvasElement; private pctx: CanvasRenderingContext2D;
  private textEl: HTMLElement; private vis: HTMLElement; private hid: HTMLElement; private quoteEl: HTMLElement;
  private choicesEl: HTMLElement; private askEl: HTMLElement; private input: HTMLInputElement; private nextEl: HTMLElement;
  private mode: 'idle' | 'typing' | 'wait' | 'choose' | 'input' | 'thinking' = 'idle';
  private full = ''; private shown = 0; private acc = 0; private hold = 0; private blipK = 0;
  private sayResolve: ((ok: boolean) => void) | null = null;
  private chooseResolve: ((id: string | null) => void) | null = null;
  private inputResolve: ((q: string | null) => void) | null = null;
  private list: List | null = null;
  private t = 0; private blinkT = 2; private blink = 0; private asks = 0;
  done: Promise<void>;

  constructor(readonly g: GameCore, readonly npc: string, private host: DialogueHost) {
    const def = Npcs[npc];
    this.portrait = h('canvas', { class: 'dlg-portrait', width: 336, height: 336, 'aria-hidden': 'true' });
    this.pctx = this.portrait.getContext('2d')!;
    this.vis = h('span'); this.hid = h('span', { class: 'dlg-rest', 'aria-hidden': 'true' });
    this.quoteEl = h('div', { class: 'dlg-quote' });
    this.textEl = h('div', { class: 'dlg-text', 'aria-live': 'polite' }, this.vis, this.hid);
    this.choicesEl = h('div', { class: 'dlg-choices', role: 'menu' });
    this.input = h('input', { class: 'dlg-input', type: 'text', maxlength: 120, autocomplete: 'off', spellcheck: 'false', placeholder: `Ask ${def?.name ?? ''} something…`, 'aria-label': 'Your question' });
    this.askEl = h('div', { class: 'dlg-ask' }, this.input, h('div', { class: 'dlg-ask-hint' }, h('kbd', { text: 'Enter' }), ' Ask', h('kbd', { text: 'Esc' }), ' Never mind'));
    this.nextEl = h('div', { class: 'dlg-next', 'aria-hidden': 'true' });
    const stop = (e: KeyboardEvent) => e.stopPropagation(); // typing must not move the knight or close menus
    this.input.addEventListener('keydown', (e) => {
      stop(e);
      if (e.key === 'Enter') { e.preventDefault(); this.submitInput(this.input.value); }
      else if (e.key === 'Escape') { e.preventDefault(); this.submitInput(null); }
    });
    this.input.addEventListener('keyup', stop);
    this.el = h('div', { class: 'scr dlg-scr' },
      h('section', { class: 'dlg', role: 'dialog', 'aria-label': def?.name ?? npc },
        h('div', { class: 'dlg-frame' }, this.portrait),
        h('div', { class: 'dlg-main' },
          h('div', { class: 'dlg-name' }, h('span', { class: 'dlg-n', text: def?.name ?? npc }), def?.title ? h('span', { class: 'dlg-t', text: def.title }) : null),
          this.quoteEl, this.textEl, this.choicesEl, this.askEl, this.nextEl)));
    this.drawPortrait();
    this.done = converse(this).catch((e) => console.warn(e)).then(() => this.close());
  }

  // ---------------------------------------------------------------- TalkHost
  say(text: string): Promise<boolean> {
    if (this.closed) return Promise.resolve(false);
    this.hideChoices(); this.askEl.classList.remove('is-on');
    this.full = text; this.shown = 0; this.acc = 0; this.hold = 0.12; this.mode = 'typing';
    this.vis.textContent = ''; this.hid.textContent = text; this.el.classList.remove('is-waiting');
    return new Promise((r) => (this.sayResolve = r));
  }
  choose(options: Choice[]): Promise<string | null> {
    if (this.closed) return Promise.resolve(null);
    this.mode = 'choose'; this.el.classList.remove('is-waiting');
    this.choicesEl.replaceChildren();
    const items = options.map((o) => {
      const b = button(o.label, o.hint); b.setAttribute('role', 'menuitem'); this.choicesEl.append(b);
      return { el: b, confirm: () => { sfx.ok(this.g); this.pick(o.id); } };
    });
    this.choicesEl.classList.add('is-on');
    this.list = new List(this.g, items);
    return new Promise((r) => (this.chooseResolve = r));
  }
  async shop(): Promise<boolean> {
    this.el.classList.add('is-behind'); this.mode = 'idle';
    await this.host.openShop();
    this.el.classList.remove('is-behind');
    return !this.closed;
  }

  // ---------------------------------------------------------------- internals
  private pick(id: string | null) { this.hideChoices(); const r = this.chooseResolve; this.chooseResolve = null; this.mode = 'idle'; r?.(id); }
  private hideChoices() { this.choicesEl.classList.remove('is-on'); this.list = null; }
  private typeQuestion(): Promise<string | null> {
    this.mode = 'input'; this.hideChoices(); this.input.value = ''; this.askEl.classList.add('is-on');
    setTimeout(() => this.input.focus(), 30);
    return new Promise((r) => (this.inputResolve = r));
  }
  private submitInput(v: string | null) {
    if (this.mode !== 'input') return;
    this.askEl.classList.remove('is-on'); this.input.blur(); this.mode = 'idle';
    this.g.input.clear();
    const r = this.inputResolve; this.inputResolve = null; r?.(v);
  }
  private setThinking(on: boolean) {
    this.el.classList.toggle('is-thinking', on);
    if (on) { this.mode = 'thinking'; this.vis.textContent = ''; this.hid.textContent = ''; this.textEl.append(); } else if (this.mode === 'thinking') this.mode = 'idle';
  }
  private finishLine() { this.shown = this.full.length; this.vis.textContent = this.full; this.hid.textContent = ''; this.mode = 'wait'; this.el.classList.add('is-waiting'); }
  close() {
    if (this.closed) return; this.closed = true;
    this.sayResolve?.(false); this.chooseResolve?.(null); this.inputResolve?.(null);
    this.sayResolve = this.chooseResolve = this.inputResolve = null;
    this.g.input.clear();
    this.host.pop(this);
  }

  update(dt: number) {
    this.t += dt;
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = 2.4 + Math.random() * 3.5; } this.blink = Math.max(0, this.blink - dt);
    this.drawPortrait();
    const inp = this.g.input;
    if (this.mode === 'input') { if (inp.usingPad && backTap(inp)) this.submitInput(null); return; }
    if (backTap(inp)) { sfx.back(this.g); this.close(); return; }
    const adv = () => taps(inp, 'confirm', 'jump', 'attack', 'interact');
    if (this.mode === 'typing') {
      if (adv()) { this.finishLine(); return; }
      if (this.hold > 0) { this.hold -= dt; return; }
      this.acc += dt * CPS;
      while (this.acc >= 1 && this.shown < this.full.length) {
        this.acc -= 1; const ch = this.full[this.shown++];
        if (/[a-z0-9]/i.test(ch) && (this.blipK++ % 2 === 0)) this.g.audio.sfx('text-blip', { pitch: (PITCH[this.npc] ?? 1) * (0.94 + Math.random() * 0.12), vol: 0.32 });
        if ('.!?…'.includes(ch) && this.full[this.shown] === ' ') { this.hold = 0.22; break; }
        if (ch === ',' || ch === ';' || ch === ':') { this.hold = 0.08; break; }
      }
      this.vis.textContent = this.full.slice(0, this.shown); this.hid.textContent = this.full.slice(this.shown);
      if (this.shown >= this.full.length) this.finishLine();
    } else if (this.mode === 'wait') {
      if (adv()) { const r = this.sayResolve; this.sayResolve = null; this.mode = 'idle'; this.el.classList.remove('is-waiting'); r?.(true); }
    } else if (this.mode === 'choose') {
      this.list?.update(dt);
    } else taps(inp, 'confirm', 'jump', 'attack', 'interact');
  }

  private drawPortrait() {
    const art = ART[this.npc], c = this.pctx, W = this.portrait.width, H = this.portrait.height; if (!art) return;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    const bg = c.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, W * 0.72);
    bg.addColorStop(0, art.portrait.bg[0]); bg.addColorStop(1, art.portrait.bg[1]); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // drifting motes
    for (let i = 0; i < 14; i++) { const y = ((hash2(i, 7) - this.t * (0.02 + hash2(i, 8) * 0.03)) % 1 + 1) % 1, x = hash2(i, 9) * W + Math.sin(this.t + i) * 6; c.fillStyle = `rgba(255,255,255,${0.12 * Math.sin(y * Math.PI)})`; c.beginPath(); c.arc(x, y * H, 1.5 + hash2(i, 10) * 2, 0, TAU); c.fill(); }
    const talking = this.mode === 'typing';
    const pose = { t: this.t, f: 1 as const, blink: this.blink > 0 ? 1 : 0, talk: talking ? 0.5 + 0.5 * Math.sin(this.t * 20) : 0, look: 0 };
    const s = art.portrait.scale * (W / 336) * 1.0;
    c.translate(W / 2 - art.portrait.cx * s, H * 0.56 - art.portrait.cy * s); c.scale(s, s);
    art.body(c, pose); art.glow(c, pose, gradientGlow);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const v = c.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
}
