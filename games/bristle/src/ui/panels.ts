// Panels: settings, controls, credits, field notes, the confirm modal and the pause menu.
import type { GameCore } from '../game/game';
import { clamp } from '../engine/math';
import * as Enemies from '../game/enemies/index';
import { RELICS, BALLAD, BRUSH_COLOURS, kills } from '../game/npc/defs';
import { h, List, Nav, button, wordmark, sfx, saveSettings, backTap, confirmTap, type Screen, type Item } from './kit';
import { brandText as BT } from '../design/tokens';
import { applyOrder } from '../game/orders';

export interface PanelHost { pop(s: Screen): void; push(s: Screen): void }

const hints = (...pairs: [string, string][]) => h('footer', { class: 'hints' }, ...pairs.map(([k, v]) => h('span', {}, h('kbd', { text: k }), ' ' + v)));

function frame(cls: string, kicker: string, title: string, body: HTMLElement, foot?: HTMLElement) {
  return h('div', { class: 'scr panel-scr ' + cls }, h('section', { class: 'panel', role: 'dialog', 'aria-label': title },
    h('header', { class: 'panel-head' }, h('div', { class: 'kicker', text: kicker }), h('h2', { text: title })), body, foot ?? null));
}

/** A panel that is just content to read: up/down scroll, Esc back. */
class ReadPanel implements Screen {
  el: HTMLElement; modal = true; nav = new Nav(); body: HTMLElement;
  constructor(protected g: GameCore, protected host: PanelHost, cls: string, kicker: string, title: string, body: HTMLElement) {
    this.body = body; body.classList.add('panel-body');
    const back = button('Back'); back.classList.add('panel-back'); back.addEventListener('click', () => this.close());
    this.el = frame(cls, kicker, title, body, h('div', { class: 'panel-foot' }, back, hints(['Esc', 'Back'])));
  }
  close() { sfx.back(this.g); this.host.pop(this); }
  update(dt: number) {
    const inp = this.g.input, { dy } = this.nav.read(inp, dt);
    if (dy) this.body.scrollBy({ top: dy * 90, behavior: 'smooth' });
    if (backTap(inp) || confirmTap(inp)) this.close();
  }
}

// ---------------------------------------------------------------- settings
export class SettingsPanel implements Screen {
  el: HTMLElement; modal = true; list: List;
  constructor(private g: GameCore, private host: PanelHost) {
    const s = g.save.settings, items: Item[] = [], body = h('div', { class: 'panel-body settings' });
    const slider = (label: string, get: () => number, set: (v: number) => void, fmt = (v: number) => Math.round(v * 100) + '%') => {
      const fill = h('span', { class: 'slider-fill' }), val = h('span', { class: 'row-value' }), track = h('span', { class: 'slider' }, fill);
      const paint = () => { fill.style.width = get() * 100 + '%'; val.textContent = fmt(get()); };
      const step = (d: number) => { const v = clamp(Math.round((get() + d) * 10) / 10, 0, 1); if (v !== get()) { set(v); saveSettings(g); paint(); sfx.move(g); } };
      track.addEventListener('pointerdown', (e) => { const r = track.getBoundingClientRect(); set(clamp(Math.round(((e.clientX - r.left) / r.width) * 20) / 20, 0, 1)); saveSettings(g); paint(); sfx.move(g); });
      const el = h('div', { class: 'ui-item row', role: 'slider', 'aria-label': label }, h('span', { class: 'ui-label', text: label }),
        h('span', { class: 'row-ctl' }, h('button', { class: 'step', 'data-step': '-', type: 'button', 'aria-label': 'Less', onclick: () => step(-0.1) }, '‹'), track, h('button', { class: 'step', 'data-step': '+', type: 'button', 'aria-label': 'More', onclick: () => step(0.1) }, '›'), val));
      paint(); body.append(el); items.push({ el, left: () => step(-0.1), right: () => step(0.1) });
    };
    const choice = (label: string, opts: { v: number | boolean; t: string }[], get: () => number | boolean, set: (v: any) => void, note?: () => string) => {
      const val = h('span', { class: 'row-value choice' }), noteEl = h('span', { class: 'row-note' });
      const idx = () => Math.max(0, opts.findIndex((o) => o.v === get()));
      const paint = () => { val.textContent = opts[idx()].t; noteEl.textContent = note ? note() : ''; };
      const step = (d: number) => { const i = clamp(idx() + d, 0, opts.length - 1); if (i !== idx()) { set(opts[i].v); saveSettings(g); paint(); sfx.move(g); } };
      const el = h('div', { class: 'ui-item row', 'aria-label': label }, h('span', { class: 'ui-label' }, label, note ? noteEl : null),
        h('span', { class: 'row-ctl' }, h('button', { class: 'step', 'data-step': '-', type: 'button', 'aria-label': 'Previous', onclick: () => step(-1) }, '‹'), val, h('button', { class: 'step', 'data-step': '+', type: 'button', 'aria-label': 'Next', onclick: () => step(1) }, '›')));
      paint(); body.append(el); items.push({ el, left: () => step(-1), right: () => step(1), confirm: () => step(idx() >= opts.length - 1 ? -(opts.length - 1) : 1) });
      return paint;
    };
    body.append(h('div', { class: 'group-label', text: 'Sound' }));
    slider('Master volume', () => s.master, (v) => (s.master = v));
    slider('Music', () => s.music, (v) => (s.music = v));
    slider('Effects', () => s.sfx, (v) => (s.sfx = v));
    body.append(h('div', { class: 'group-label', text: 'Display' }));
    choice('Difficulty', [{ v: 0, t: 'Gentle' }, { v: 1, t: 'Knight' }, { v: 2, t: 'Veteran' }], () => s.difficulty ?? 1, (v) => { s.difficulty = v; applyOrder(g as any); g.player?.heal(0); }, () => ['Two extra health, fewer hits to clear creatures, longer recovery, faster healing.', 'The intended challenge.', 'Tougher creatures and heavier blows. Applies from the next room.'][s.difficulty ?? 1]);
    slider('Brightness', () => ((s.brightness ?? 0.85) - 0.55) / 0.55, (v) => (s.brightness = 0.55 + v * 0.55), (v) => Math.round((0.55 + v * 0.55) * 100) + '%');
    choice('Screen shake', [{ v: 0, t: 'Off' }, { v: 0.5, t: 'Gentle' }, { v: 1, t: 'Full' }], () => (s.shake >= 0.75 ? 1 : s.shake >= 0.25 ? 0.5 : 0), (v) => (s.shake = v));
    choice('Quality', [{ v: 0.5, t: 'Performance' }, { v: 0.75, t: 'Balanced' }, { v: 1, t: 'Sharp' }], () => (s.quality >= 0.9 ? 1 : s.quality >= 0.65 ? 0.75 : 0.5), (v) => (s.quality = v));
    const back = button('Back'); body.append(back); items.push({ el: back, confirm: () => this.close() });
    this.list = new List(g, items);
    this.el = frame('settings-scr', 'Options', 'Settings', body, hints(['↑↓', 'Select'], ['←→', 'Adjust'], ['Esc', 'Back']));
  }
  close() { sfx.back(this.g); this.host.pop(this); }
  update(dt: number) { if (backTap(this.g.input)) return this.close(); this.list.update(dt); }
}

// ---------------------------------------------------------------- controls
export function controlsPanel(g: GameCore, host: PanelHost) {
  const inGame = g.state !== 'title' && !!g.player, a = g.save.abilities;
  const lock = (have: boolean, where: string) => (inGame && !have ? h('span', { class: 'lock', text: where }) : null);
  const keys = (...k: string[]) => h('span', { class: 'keys' }, ...k.map((x) => h('kbd', { text: x })));
  const row = (label: string, kb: HTMLElement, pad: HTMLElement, extra?: HTMLElement | null) => h('div', { class: 'ctl-row' }, h('span', { class: 'ctl-label' }, label, extra ?? null), kb, pad);
  const body = h('div', { class: 'controls' },
    h('div', { class: 'ctl-row ctl-head' }, h('span', {}), h('span', { text: 'Keyboard' }), h('span', { text: 'Gamepad' })),
    row('Move', keys('A', 'D'), keys('Stick'), h('span', { class: 'ctl-or', text: 'or arrows' })),
    row('Jump', keys('Space', 'Z'), keys('A')),
    row('Crouch', keys('Hold S'), keys('Hold down'), h('span', { class: 'ctl-or', text: 'duck under low gaps' })),
    row('Deep Clean', keys('Hold J'), keys('Hold X'), h('span', { class: 'ctl-or', text: 'charge, then release' })),
    row('Brush-blade', keys('J', 'X'), keys('X'), h('span', { class: 'ctl-or', text: 'or left click' })),
    row('Up-slash, pogo', keys('W', 'S'), keys('Stick'), h('span', { class: 'ctl-or', text: 'hold up or down while striking' })),
    row('Throw paste', keys('L', 'V'), keys('Y'), h('span', { class: 'ctl-or', text: 'spends fluor' })),
    row('Rinse wave', keys('W', '+ L'), keys('Up', '+ Y'), lock(a.rinse, 'Find the Rinse relic')),
    row('Dash', keys('K', 'Shift'), keys('B', 'RB'), lock(a.dash, 'Find the Prime Dash')),
    row('Wall jump', keys('Space', 'at a wall'), keys('A', 'at a wall'), h('span', { class: 'ctl-or', text: 'once per jump; the Floss Grip makes it unlimited' })),
    row('Focus (heal)', keys('Hold F', 'Q'), keys('Hold LB')),
    row('Talk, rest, read', keys('E', 'W'), keys('Up')),
    row('Pause', keys('Esc'), keys('Start')),
  );
  return new ReadPanel(g, host, 'controls-scr', 'How to play', 'Controls', body);
}

// ---------------------------------------------------------------- credits
export function creditsPanel(g: GameCore, host: PanelHost) {
  const body = h('div', { class: 'credits' },
    h('div', { class: 'credits-logo', text: 'BRISTLE' }), h('div', { class: 'credits-sub', text: 'Knight of the Crown' }),
    h('p', { class: 'credits-line', text: BT.credit }),
    h('dl', { class: 'credits-list' },
      h('dt', { text: 'World' }), h('dd', { text: 'Ivoria, the kingdom inside the Great Smile' }),
      h('dt', { text: 'Art' }), h('dd', { text: 'Every shape drawn in code. No image files.' }),
      h('dt', { text: 'Voices' }), h('dd', { text: 'Written lines' }),
      h('dt', { text: 'Type' }), h('dd', { text: 'Futura LT Pro' }),
    ),
    wordmark('wordmark credits-mark'),
    h('p', { class: 'credits-thanks', text: 'Thank you for playing.' }),
  );
  return new ReadPanel(g, host, 'credits-scr', 'BRISTLE', 'Credits', body);
}

// ---------------------------------------------------------------- field notes
interface BestiaryEntry { id: string; name: string; blurb?: string }
const titleCase = (id: string) => id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
function bestiary(g: GameCore): BestiaryEntry[] {
  const mod: Record<string, unknown> = Enemies; // BESTIARY is optional: read it without assuming the export exists
  const list = mod.BESTIARY as BestiaryEntry[] | undefined;
  const known = Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string') : [];
  const out: BestiaryEntry[] = known.map((e) => ({ id: e.id, name: String(e.name ?? titleCase(e.id)), blurb: e.blurb ? String(e.blurb) : undefined }));
  for (const id of Object.keys(g.save.killed)) if (!out.some((e) => e.id === id)) out.push({ id, name: titleCase(id) });
  return out;
}

export class FieldNotes implements Screen {
  el: HTMLElement; modal = true; nav = new Nav(); tab = 0; tabs: { name: string; render(): HTMLElement }[]; tabEls: HTMLElement[]; body: HTMLElement;
  constructor(private g: GameCore, private host: PanelHost) {
    const prog = (g.save as any).progress;
    this.tabs = [{ name: 'Knight', render: () => this.knight() }, { name: 'Relics', render: () => this.relics() }, { name: 'Bestiary', render: () => this.beasts() }];
    if (prog && typeof prog === 'object') this.tabs.splice(1, 0, { name: 'Oath', render: () => this.mastery(prog) });
    if (g.flag('lore-ballad')) this.tabs.push({ name: 'Pages', render: () => this.pages() });
    this.tabEls = this.tabs.map((t, i) => h('button', { class: 'tab', type: 'button', text: t.name, onclick: () => this.show(i) }));
    this.body = h('div', { class: 'panel-body notes' });
    const back = button('Back'); back.classList.add('panel-back'); back.addEventListener('click', () => this.close());
    this.el = frame('notes-scr', 'The knight\'s', 'Field notes', h('div', { class: 'notes-wrap' }, h('nav', { class: 'tabs' }, ...this.tabEls), this.body),
      h('div', { class: 'panel-foot' }, back, hints(['←→', 'Page'], ['↑↓', 'Scroll'], ['Esc', 'Back'])));
    this.show(0, false);
  }
  show(i: number, sound = true) {
    this.tab = (i + this.tabs.length) % this.tabs.length; this.tabEls.forEach((t, k) => t.classList.toggle('is-active', k === this.tab));
    this.body.replaceChildren(this.tabs[this.tab].render()); this.body.scrollTop = 0; if (sound) sfx.move(this.g);
  }
  stat(label: string, value: string, note?: string) { return h('div', { class: 'stat' }, h('span', { class: 'stat-label', text: label }), h('span', { class: 'stat-value', text: value }), note ? h('span', { class: 'stat-note', text: note }) : null); }
  knight() {
    const g = this.g, s = g.save, blade = Number(g.flag('blade')) || 0, mins = Math.floor(s.playTime / 60);
    const colour = BRUSH_COLOURS.find((c) => c.id === String(g.flag('brush-colour') ?? 'blue')) ?? BRUSH_COLOURS[0];
    return h('div', { class: 'stats' },
      this.stat('Enamel', `${g.player?.hp ?? s.hp} / ${s.maxHp}`, 'shards of health'),
      this.stat('Brush-blade', blade ? `Bristle Edge ${blade === 1 ? 'I' : 'II'}` : 'Standard tuft', `${BT.name}, ${BT.filaments} filaments`),
      this.stat('Paste', g.flag('paste') ? 'Paste Tube' : 'Standard', g.flag('paste') ? 'throws cost less fluor' : 'thrown with spell'),
      this.stat('Colourway', colour.name),
      this.stat('Shine', String(s.shine)),
      this.stat('Film swept', String(kills(g))),
      this.stat('Rooms explored', String(Object.keys(s.visited).length)),
      this.stat('Time in Ivoria', mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`),
      this.stat('Mother Calculus', g.flag('calculus-defeated') ? 'Defeated' : 'Sleeping'),
    );
  }
  /** Oath level, points and faction mastery from the core's progression (g.save.progress, g.progress). */
  mastery(p: any) {
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const api = (this.g as any).progress;
    const factions: { id: string; name: string }[] = [{ id: 'plaque', name: 'Plaque' }, { id: 'sugar', name: 'Sugar' }, { id: 'tartar', name: 'Tartar' }, { id: 'gum', name: 'Inflammation' }];
    const wrap = h('div', { class: 'stats' }, this.stat('Oath level', String(num(p.level)), num(p.xp) + ' xp'), this.stat('Oath points', String(num(p.points)), 'spend them at a fountain: Rest, then Oath'));
    const m = p.mastery && typeof p.mastery === 'object' ? p.mastery : {};
    for (const f of factions) {
      let lvl = 0; try { lvl = typeof api?.masteryLevel === 'function' ? num(api.masteryLevel(f.id)) : 0; } catch { /* not ready */ }
      const pips = '●'.repeat(Math.min(5, lvl)) + '○'.repeat(Math.max(0, 5 - lvl));
      wrap.append(this.stat(f.name + ' mastery', pips, `level ${lvl} of 5 · ${num(m[f.id])} xp`));
    }
    if (Array.isArray(p.perks) && p.perks.length) wrap.append(this.stat('Oaths taken', String(p.perks.length)));
    return wrap;
  }
  relics() {
    const a = this.g.save.abilities;
    return h('div', { class: 'cards' }, ...RELICS.filter((r) => r.id !== 'pulse' || a.pulse).map((r) => h('div', { class: 'card' + (a[r.id] ? '' : ' is-unknown') },
      h('span', { class: 'card-icon', 'aria-hidden': 'true' }), h('span', { class: 'card-name', text: a[r.id] ? r.name : 'Not yet found' }), h('span', { class: 'card-text', text: a[r.id] ? r.text : 'Somewhere in Ivoria.' }))));
  }
  beasts() {
    const list = bestiary(this.g), killed = this.g.save.killed;
    if (!list.length) return h('p', { class: 'empty', text: 'No Film swept yet. The notes are waiting.' });
    return h('div', { class: 'beasts' }, ...list.map((e) => { const n = killed[e.id] || 0; return h('div', { class: 'beast' + (n ? '' : ' is-unknown') },
      h('span', { class: 'beast-name', text: n ? e.name : '???' }), h('span', { class: 'beast-count', text: n ? '× ' + n : '' }),
      h('span', { class: 'beast-blurb', text: n ? e.blurb ?? '' : 'Sweep one to learn more.' })); }));
  }
  pages() { return h('div', { class: 'ballad' }, h('h3', { text: `Ballad of the ${BT.orderShort}` }), ...BALLAD.map((l) => h('p', { text: l })), h('p', { class: 'ballad-sign', text: 'copied out by Pip, from memory' })); }
  close() { sfx.back(this.g); this.host.pop(this); }
  update(dt: number) {
    const inp = this.g.input, { dx, dy } = this.nav.read(inp, dt);
    if (dx) this.show(this.tab + dx);
    if (dy) this.body.scrollBy({ top: dy * 90, behavior: 'smooth' });
    if (backTap(inp)) this.close();
  }
}

// ---------------------------------------------------------------- confirm
export class Confirm implements Screen {
  el: HTMLElement; modal = true; list: List; done = false;
  constructor(private g: GameCore, private host: PanelHost, question: string, yes: string, no: string, private resolve: (v: boolean) => void, note = 'Your current journey will be lost.') {
    const y = button(yes), n = button(no);
    this.el = h('div', { class: 'scr confirm-scr' }, h('section', { class: 'confirm', role: 'alertdialog', 'aria-label': question },
      h('h2', { text: question }), h('p', { text: note }), h('div', { class: 'menu confirm-menu' }, n, y)));
    this.list = new List(g, [{ el: n, confirm: () => this.finish(false) }, { el: y, confirm: () => this.finish(true) }], 0);
  }
  finish(v: boolean) { if (this.done) return; this.done = true; (v ? sfx.ok : sfx.back)(this.g); this.host.pop(this); this.resolve(v); }
  update(dt: number) { if (backTap(this.g.input)) return this.finish(false); this.list.update(dt); }
}

// ---------------------------------------------------------------- pause
export interface PauseHooks { resume(): void; notes(): void; settings(): void; controls(): void; quit(): void; oath?: () => void }
export class PauseScreen implements Screen {
  el: HTMLElement; list: List; modal = true;
  constructor(private g: GameCore, hooks: PauseHooks) {
    const items: Item[] = [], menu = h('nav', { class: 'menu pause-menu', 'aria-label': 'Pause menu' });
    const add = (label: string, fn: () => void) => { const b = button(label); menu.append(b); items.push({ el: b, confirm: () => { sfx.ok(g); fn(); } }); };
    add('Resume', hooks.resume);
    if (hooks.oath) add('Oath', hooks.oath);
    add('Field notes', hooks.notes); add('Settings', hooks.settings); add('Controls', hooks.controls); add('Quit to title', hooks.quit);
    this.list = new List(g, items);
    const area = g.room?.def.title || g.biome?.name || '';
    const mins = Math.floor(g.save.playTime / 60);
    this.el = h('div', { class: 'scr pause-scr' },
      h('div', { class: 'pause-side' },
        h('div', { class: 'kicker', text: area ? area : 'Ivoria' }), h('h2', { class: 'pause-title', text: 'Paused' }), menu,
        h('div', { class: 'pause-meta' }, h('span', { text: `${kills(g)} Film swept` }), h('span', { text: `${g.save.shine} shine` }), h('span', { text: mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min` }))),
      hints(['↑↓', 'Select'], ['Enter', 'Confirm'], ['Esc', 'Resume']));
    this.resume = hooks.resume;
  }
  private resume: () => void;
  update(dt: number) { if (backTap(this.g.input)) { sfx.back(this.g); return this.resume(); } this.list.update(dt); }
}
