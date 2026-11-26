// Levelling, faction mastery and the Oath screen.
//  - Every kill gives XP (by the creature's toughness) and mastery in its faction.
//  - Each Oath level gives a skill point, spent at fountains on perks (see perks.ts).
//  - Mastery levels (0-5) add 10% damage each against that faction. Inflammation mastery also
//    shortens the Inflamed status (level 2) and ends it (level 4).
import type { GameCore } from '../game';
import type { Entity, Faction, ProgressApi } from '../types';
import { PERKS, BRANCHES, FACTIONS } from './perks';
import { brandText as BT } from '../../design/tokens';
import { applyOrder, currentOrder, ART } from '../orders';
import { brush, idbHolder, idbRefill, foamCluster } from '../../design/kit';
import { brand as BR, idb, mint } from '../../design/tokens';
import { setOrder, type OrderId } from '../orders';
import { drawRig, staticPose } from '../../design/hero';
import { EARNED_ORDERS } from '../../design/hero';

const GUESS: [RegExp, Faction][] = [[/leech|flare|swell|gum|inflam/, 'gum'], [/imp|sugar/, 'sugar'], [/tartar|spit|brute|calculus|matriarch/, 'tartar']];
export const nextXp = (level: number) => 12 + level * 14;
/** Seconds the card pick ignores input after it opens, so a button mashed in a fight cannot take or close it. */
const LOCK = 0.7;
export const masteryOf = (xp: number) => Math.min(5, Math.floor(Math.sqrt(xp / 20)));
export const masteryXp = (lvl: number) => lvl * lvl * 20;

export class Progress implements ProgressApi {
  g: GameCore; el: HTMLElement | null = null; sel = 0; t = 0;
  constructor(g: GameCore) { this.g = g; }
  get p() { return this.g.save.progress; }
  has(id: string) { return this.p.perks.includes(id); }
  masteryLevel(f: Faction) { return masteryOf(this.p.mastery[f] || 0); }
  damageMult(f: Faction) { return 1 + 0.1 * this.masteryLevel(f); }
  onKill(e: Entity & { faction?: Faction; maxHp?: number; type?: string }) {
    const f: Faction = e.faction && e.faction !== 'plaque' ? e.faction : (GUESS.find(([re]) => re.test(e.type || ''))?.[1] ?? e.faction ?? 'plaque');
    const xp = Math.round((5 + ((e as any).__baseMaxHp ?? e.maxHp ?? 15) / 3) * ((this.g as any).diff?.xp ?? 1)); this.gain(xp, f);
    this.g.float(e.x, e.y - (e.hh ?? 10) - 6, '+' + xp + ' XP', '#8BB8E8');
  }
  gain(xp: number, f?: Faction) {
    const p = this.p, g = this.g;
    if (f) {
      const before = this.masteryLevel(f); p.mastery[f] = (p.mastery[f] || 0) + xp; const after = this.masteryLevel(f);
      if (after > before) { const name = FACTIONS.find((x) => x.id === f)!.name; g.ui.toast(`${name} mastery ${after}. You strike ${name.toLowerCase()} creatures ${after * 10}% harder.` + (f === 'gum' && after === 2 ? ' Inflammation fades faster.' : f === 'gum' && after === 4 ? ' Inflammation no longer takes hold.' : ''), 4200); g.audio.sfx('mastery'); }
    }
    p.xp += xp;
    while (p.xp >= nextXp(p.level)) {
      p.xp -= nextXp(p.level); p.level++; p.points++;
      g.ui.toast(`Oath level ${p.level}. Your cards wait for a calm moment.`, 3000); this.queueOpen();
      g.audio.sfx('levelup'); g.flash([0.8, 0.9, 1], 0.25);
      const pl = g.player; if (pl) g.fx.burst(pl.x, pl.y, { n: 36, color: ['#ffffff', '#8BB8E8', '#FCE300'], shape: 'streak', speed: [120, 420], angle: -Math.PI / 2, spread: 2.2, emissive: true, size: [1, 2], life: [0.4, 0.9] });
    }
  }
  /** Open the Oath picker as soon as the moment is calm (not mid-transition or mid-dialogue). */
  pending = -1;
  /** Calm: standing, not just hit, no creature within about ten tiles. Cards never open mid-fight. */
  calm() {
    const g = this.g as any, p = g.player; if (!p || !p.grounded || p.hurtT > -0.6 || p.invuln > 0.3) return false;
    return !g.entities.some((e: any) => e.team === 'enemy' && !e.dead && Math.abs(e.x - p.x) < 340 && Math.abs(e.y - p.y) < 240);
  }
  queueOpen() { if (this.pending < 0) this.pending = 0.45; }
  canBuy(id: string) { const k = PERKS.find((x) => x.id === id)!; return !this.has(id) && this.p.points > 0 && (!k.needs || this.has(k.needs)); }
  buy(id: string) {
    if (!this.canBuy(id)) { this.g.audio.sfx('ui-back'); return; }
    const g = this.g; this.p.points--; this.p.perks.push(id); g.audio.sfx('buy');
    if (id === 'c4') { g.save.maxHp++; g.player.maxHp = g.save.maxHp; applyOrder(g as any); g.player.heal(99); }
    g.persist(); this.render();
  }

  // ---------- the Oath cards ----------
  // Level up: three cards from what you can take next, at least one from the Order you wear; take one.
  // With no points (opened from the pause menu) it shows the cards you hold.
  hand: string[] = [];
  /** 'perks' = the level-up hand; 'orders' = the pick of a set after the first boss. */
  mode: 'perks' | 'orders' = 'perks'; ordersPending = false;
  queueOrders() { this.ordersPending = true; }
  openOrders() { if (this.el) return; this.mode = 'orders'; this.open(); }
  /** Cards you could take now (ignoring points): not held, and the card before it on its path is held. */
  open_() { return PERKS.filter((k) => !this.has(k.id) && (!k.needs || this.has(k.needs))); }
  deal() {
    const pool = this.open_(), mine = BRANCHES.find((b) => b.order === currentOrder(this.g as any))?.id;
    let seed = this.p.level * 977 + this.p.perks.length * 131 + 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const shuffled = pool.map((k) => [rnd(), k] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const first = shuffled.find((k) => k.branch === mine);
    this.hand = [...(first ? [first] : []), ...shuffled.filter((k) => k !== first)].slice(0, 3).map((k) => k.id);
    this.sel = Math.min(this.sel, Math.max(0, this.hand.length - 1));
  }
  open() {
    if (this.el) return; const g = this.g; g.modal++; this.sel = 0; this.t = 0; if (this.mode === 'orders') this.hand = [...EARNED_ORDERS]; else this.deal();
    const root = document.getElementById('ui')!; const el = document.createElement('div'); el.className = 'deal locked'; root.appendChild(el); this.el = el;
    el.addEventListener('click', (e) => {
      const c = (e.target as HTMLElement).closest('[data-card]') as HTMLElement | null;
      if (c && this.t >= LOCK) { this.sel = Number(c.dataset.card); this.take(); }
      if ((e.target as HTMLElement).closest('[data-close]')) this.close();
    });
    g.audio.sfx('ui-open'); this.render();
  }
  take() {
    if (this.mode === 'orders') { const id = this.hand[this.sel] as OrderId; setOrder(this.g as any, id); this.g.persist(); this.g.audio.sfx('buy'); this.g.ui.toast(`You wear the ${ART[id].name} set. Rest again at any fountain to change it.`, 5200); this.close(); return; }
    const id = this.hand[this.sel]; if (!id || this.p.points <= 0) { this.g.audio.sfx('ui-back'); return; }
    this.buy(id); this.deal(); this.render();
    if (this.p.points <= 0) setTimeout(() => this.close(), 380);
  }
  close() { if (!this.el) return; this.el.remove(); this.el = null; this.mode = 'perks'; this.g.modal = Math.max(0, this.g.modal - 1); this.g.audio.sfx('ui-close'); this.g.input.clear(); }
  /** Runs before the UI layer each frame so the card pick owns input while it is open. */
  update(dt: number) {
    const g = this.g;
    if (!this.el && this.ordersPending && g.state === 'play' && !g.busy() && !g.ui.isOpen() && this.calm()) { this.ordersPending = false; this.openOrders(); }
    if (!this.el && this.pending >= 0 && g.state === 'play') { this.pending -= dt; if (this.pending <= 0 && !g.busy() && !g.ui.isOpen() && g.player && g.player.deadT < 0) { if (this.calm()) { this.pending = -1; if (this.p.points > 0) this.open(); } else this.pending = 0.3; } }
    if (!this.el) return; this.t += dt; const i = this.g.input, n = this.hand.length;
    let s = this.sel;
    if (n && i.tap('left')) s = (s + n - 1) % n; if (n && i.tap('right')) s = (s + 1) % n;
    if (s !== this.sel) { this.sel = s; this.g.audio.sfx('ui-move'); this.render(); }
    const locked = this.t < LOCK; this.el.classList.toggle('locked', locked);
    if (!locked && (i.tap('confirm') || i.tap('interact'))) { if (this.mode === 'orders' || this.p.points > 0) this.take(); else this.close(); }
    if (!locked && this.mode !== 'orders' && (i.tap('back') || i.tap('pause'))) this.close();
    for (const a of ['confirm', 'interact', 'back', 'pause', 'attack', 'dash', 'jump', 'spell', 'focus', 'up', 'down', 'size'] as const) i.tap(a);
  }
  /** One card: art, the Order's chip, name, one line. */
  card(id: string, i: number, small = false) {
    const k = PERKS.find((x) => x.id === id)!, br = BRANCHES.find((b) => b.id === k.branch)!, ord = ART[br.order as keyof typeof ART];
    const tier = PERKS.filter((x) => x.branch === k.branch).findIndex((x) => x.id === id) + 1;
    return `<button type="button" class="dcard b-${k.branch}${!small && i === this.sel ? ' on' : ''}${small ? ' small' : ''}" ${small ? '' : `data-card="${i}"`}>
      <canvas data-art="${k.branch}" width="360" height="220"></canvas>
      <span class="dchip">${ord.name} · ${br.name}</span>
      <b>${k.name}</b><span class="dtext">${k.text}</span>
      <i class="dtier">${[1, 2, 3, 4].map((t) => `<em class="${t <= tier ? 'on' : ''}"></em>`).join('')}</i></button>`;
  }
  render() {
    if (!this.el) return; const p = this.p, picking = p.points > 0;
    if (this.mode === 'orders') {
      this.el.innerHTML = `<div class="deal-wrap"><header><p>The Glutton is rinsed away</p><h1>Choose your Order</h1></header>
        <div class="deal-hand">${this.hand.map((id, i) => { const a = ART[id as OrderId]; return `<button type="button" class="dcard order${i === this.sel ? ' on' : ''}" data-card="${i}"><canvas data-knight="${id}" width="360" height="300"></canvas><span class="dchip">Order</span><b>${a.name}</b><span class="dtext">${a.line}</span></button>`; }).join('')}</div>
        <footer><span>← → choose · Enter take · change it later at any fountain</span></footer></div>`;
      for (const c of Array.from(this.el.querySelectorAll<HTMLCanvasElement>('canvas[data-knight]'))) drawKnightCard(c, c.dataset.knight as OrderId);
      return;
    }
    const bar = `<div class="deal-bar"><i style="width:${Math.min(100, (p.xp / Math.max(1, nextXp(p.level))) * 100).toFixed(1)}%"></i></div>`;
    this.el.innerHTML = picking ? `
      <div class="deal-wrap">
        <header><p>Level ${p.level}</p><h1>Choose a card</h1>${p.points > 1 ? `<span class="deal-more">${p.points} to choose</span>` : ''}</header>
        <div class="deal-hand">${this.hand.map((id, i) => this.card(id, i)).join('') || '<p class="deal-empty">Every card on every path is yours.</p>'}</div>
        <footer><span>← → choose · Enter take · Esc later</span></footer>
      </div>` : `
      <div class="deal-wrap">
        <header><p>Level ${p.level} · ${p.xp} / ${nextXp(p.level)} XP</p><h1>Your cards</h1></header>${bar}
        <div class="deal-hand held">${p.perks.map((id, i) => this.card(id, i, true)).join('') || '<p class="deal-empty">No cards yet. Level up to choose your first.</p>'}</div>
        <footer><span>Level up to draw new cards</span><button type="button" data-close>Close</button></footer>
      </div>`;
    for (const c of Array.from(this.el.querySelectorAll<HTMLCanvasElement>('canvas[data-art]'))) drawCardArt(c, c.dataset.art as string);
  }
}

/** An Order card: the knight in that set, standing, lit from the front. */
function drawKnightCard(cv: HTMLCanvasElement, id: OrderId) {
  const c = cv.getContext('2d')!, W = cv.width, H = cv.height, g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d3466'); g.addColorStop(1, '#070F2A'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#132B57'; c.fillRect(0, H * 0.88, W, H); const s = H / 72, art = ART[id];
  c.save(); c.translate(W * 0.46, H * 0.88); c.scale(s, s); drawRig(c, art, staticPose(art), 'scene'); c.globalCompositeOperation = 'lighter'; drawRig(c, art, staticPose(art), 'glow'); c.restore();
}

/** Card art in the house style: the brush, the interdental holder with a refill, or rinse foam and drops. */
function drawCardArt(cv: HTMLCanvasElement, branch: string) {
  const c = cv.getContext('2d')!, W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, branch === 'brush' ? '#13306e' : branch === 'gap' ? '#3a1c18' : '#0f3a44'); g.addColorStop(1, '#070F2A');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.18; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(W / 2, H * 0.55, H * 0.42, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  if (branch === 'brush') brush(c, W * 0.12, H * 0.66, W * 0.76, { angle: -0.32, handle: BR.blue });
  else if (branch === 'gap') { idbHolder(c, W * 0.38, H * 0.62, H * 0.62, { angle: Math.PI / 2, loaded: idb.sizes.m.col }); idbRefill(c, W * 0.78, H * 0.86, H * 0.5, { col: idb.sizes.s.col, angle: 0.2 }); }
  else { foamCluster(c, W * 0.5, H * 0.86, H * 0.32, { count: 16, seed: 4 }); for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? mint.base : '#FFFFFF'; c.beginPath(); c.arc(W * (0.22 + i * 0.14), H * (0.25 + (i % 2) * 0.12), 5 + (i % 3), 0, Math.PI * 2); c.fill(); } }
}

export function installProgress(g: GameCore) {
  const pr = new Progress(g); g.progress = pr; (g as any).openOath = () => pr.open();
  return pr;
}
