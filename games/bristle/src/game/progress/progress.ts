// Levelling, faction mastery and the Oath screen.
//  - Every kill gives XP (by the creature's toughness) and mastery in its faction.
//  - Each Oath level gives a skill point, spent at fountains on perks (see perks.ts).
//  - Mastery levels (0-5) add 10% damage each against that faction. Inflammation mastery also
//    shortens the Inflamed status (level 2) and ends it (level 4).
import type { GameCore } from '../game';
import type { Entity, Faction, ProgressApi } from '../types';
import { PERKS, BRANCHES, FACTIONS } from './perks';

const GUESS: [RegExp, Faction][] = [[/leech|flare|swell|gum|inflam/, 'gum'], [/imp|sugar/, 'sugar'], [/tartar|spit|brute|calculus|matriarch/, 'tartar']];
export const nextXp = (level: number) => 30 + level * 30;
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
    this.gain(Math.round(3 + (e.maxHp ?? 15) / 4), f);
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
      g.ui.toast(`Oath level ${p.level}. A skill point waits at the next fountain.`, 4200);
      g.audio.sfx('levelup'); g.flash([0.8, 0.9, 1], 0.25);
      const pl = g.player; if (pl) g.fx.burst(pl.x, pl.y, { n: 36, color: ['#ffffff', '#8BB8E8', '#FCE300'], shape: 'streak', speed: [120, 420], angle: -Math.PI / 2, spread: 2.2, emissive: true, size: [1, 2], life: [0.4, 0.9] });
    }
  }
  canBuy(id: string) { const k = PERKS.find((x) => x.id === id)!; return !this.has(id) && this.p.points > 0 && (!k.needs || this.has(k.needs)); }
  buy(id: string) {
    if (!this.canBuy(id)) { this.g.audio.sfx('ui-back'); return; }
    const g = this.g; this.p.points--; this.p.perks.push(id); g.audio.sfx('buy');
    if (id === 'c4') { g.save.maxHp++; g.player.maxHp = g.save.maxHp; g.player.heal(99); }
    g.persist(); this.render();
  }

  // ---------- the Oath screen ----------
  open() {
    if (this.el) return; const g = this.g; g.modal++; this.sel = Math.max(0, PERKS.findIndex((k) => this.canBuy(k.id))); this.t = 0;
    const root = document.getElementById('ui')!; const el = document.createElement('div'); el.className = 'oath'; root.appendChild(el); this.el = el;
    el.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('[data-perk]') as HTMLElement | null; if (b) { this.sel = PERKS.findIndex((k) => k.id === b.dataset.perk); this.buy(b.dataset.perk!); } if ((e.target as HTMLElement).closest('[data-close]')) this.close(); });
    g.audio.sfx('ui-open'); this.render();
  }
  close() { if (!this.el) return; this.el.remove(); this.el = null; this.g.modal = Math.max(0, this.g.modal - 1); this.g.audio.sfx('ui-close'); this.g.input.clear(); }
  /** Runs before the UI layer each frame so the Oath screen owns input while it is open. */
  update(dt: number) {
    if (!this.el) return; this.t += dt; const i = this.g.input;
    const col = (n: number) => Math.floor(n / 4), row = (n: number) => n % 4;
    let s = this.sel;
    if (i.tap('left')) s = Math.max(0, s - 4); if (i.tap('right')) s = Math.min(PERKS.length - 1, s + 4);
    if (i.tap('up')) s = col(s) * 4 + Math.max(0, row(s) - 1); if (i.tap('down')) s = col(s) * 4 + Math.min(3, row(s) + 1);
    if (s !== this.sel) { this.sel = s; this.g.audio.sfx('ui-move'); this.render(); }
    if (i.tap('confirm') || i.tap('attack') || i.tap('interact')) this.buy(PERKS[this.sel].id);
    if (i.tap('back') || i.tap('pause') || i.tap('dash')) this.close();
    for (const a of ['jump', 'spell', 'focus'] as const) i.tap(a);
  }
  render() {
    if (!this.el) return; const p = this.p, sel = PERKS[this.sel];
    const bar = (v: number, max: number, c: string) => `<i style="width:${Math.min(100, (v / Math.max(1, max)) * 100).toFixed(1)}%;background:${c}"></i>`;
    this.el.innerHTML = `
      <div class="oath-card">
        <header><div><p class="oath-eyebrow">The Oath of the 5,460</p><h1>Level ${p.level}</h1></div>
          <div class="oath-points"><b>${p.points}</b><span>skill point${p.points === 1 ? '' : 's'}</span></div></header>
        <div class="oath-xp"><span>${p.xp} / ${nextXp(p.level)} to level ${p.level + 1}</span><div class="oath-bar">${bar(p.xp, nextXp(p.level), '#8BB8E8')}</div></div>
        <div class="oath-tree">${BRANCHES.map((b) => `<section><h2>${b.name}</h2><p>${b.blurb}</p>${PERKS.filter((k) => k.branch === b.id).map((k) => {
          const own = this.has(k.id), can = this.canBuy(k.id), locked = !own && k.needs && !this.has(k.needs), on = sel.id === k.id;
          return `<button type="button" class="perk${own ? ' own' : ''}${can ? ' can' : ''}${locked ? ' locked' : ''}${on ? ' on' : ''}" data-perk="${k.id}"><b>${k.name}</b><span>${k.text}</span><em>${own ? 'Sworn' : locked ? 'Locked' : can ? 'Take' : 'Needs a point'}</em></button>`;
        }).join('')}</section>`).join('')}</div>
        <div class="oath-mastery"><h2>Mastery</h2>${FACTIONS.map((f) => { const xp = p.mastery[f.id] || 0, lv = masteryOf(xp), lo = masteryXp(lv), hi = masteryXp(lv + 1);
          return `<div class="m"><div class="m-head"><b>${f.name}</b><span>Level ${lv}${lv ? ` · +${lv * 10}% damage` : ''}</span></div><div class="oath-bar">${bar(lv >= 5 ? 1 : xp - lo, lv >= 5 ? 1 : hi - lo, f.colour)}</div><p>${f.blurb}</p></div>`; }).join('')}</div>
        <footer><span>Arrows to choose · Enter to take · Esc to close</span><button type="button" data-close>Close</button></footer>
      </div>`;
  }
}

export function installProgress(g: GameCore) {
  const pr = new Progress(g); g.progress = pr; (g as any).openOath = () => pr.open();
  return pr;
}
