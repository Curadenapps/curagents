// Pip's shop: wares with prices, owned and can't-afford states, a colourway picker, a buy sound, and a save.
import type { GameCore } from '../game/game';
import { WARES, BRUSH_COLOURS, colourIndex, colourOwned, type Ware } from '../game/npc/defs';
import { h, List, sfx, backTap, type Screen, type Item } from './kit';

const ICONS: Record<Ware['icon'], string> = {
  shard: '<svg viewBox="0 0 32 32"><path d="M7 12c-1-6 3-7 5-7 2 0 3 2 4 2s2-2 4-2 6 1 5 7c-.5 5-2 9-3.5 13-.5 1.5-2 1.5-2.5 0L17 19h-2l-2 6c-.5 1.5-2 1.5-2.5 0C9 21 7.5 17 7 12Z" fill="#F3F6FC"/><ellipse cx="19" cy="14" rx="2.5" ry="4.5" fill="#8BB8E8" opacity=".6"/></svg>',
  edge: '<svg viewBox="0 0 32 32"><rect x="14.5" y="11" width="3.4" height="19" rx="1.6" fill="#3364B7"/><rect x="13.5" y="7" width="5.4" height="6" rx="1.5" fill="#E8EEF9"/><g stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"><path d="M14 7V2M15.5 7V1.5M17 7V1.5M18.4 7V2"/></g></svg>',
  tube: '<svg viewBox="0 0 32 32"><path d="M8 9h16l-2 17H10Z" fill="#E8EEF9"/><path d="M8 9h16v3H8z" fill="#003DA5"/><rect x="13" y="4" width="6" height="5" rx="1" fill="#E31C79"/><path d="M11 18h10" stroke="#8BB8E8" stroke-width="2"/></svg>',
  colour: '',
  scroll: '<svg viewBox="0 0 32 32"><path d="M9 6h14a3 3 0 0 1 0 6H9Z" fill="#d8cfbd"/><path d="M9 9h13v17H11a2 2 0 0 1-2-2Z" fill="#efe7d4"/><g stroke="#8f846f" stroke-width="1.2"><path d="M12 14h8M12 17h8M12 20h6"/></g></svg>',
};
const swatch = (hex: string) => `<svg viewBox="0 0 32 32"><rect x="13.5" y="9" width="5" height="21" rx="2.3" fill="${hex}"/><rect x="12.5" y="4" width="7" height="7" rx="2" fill="#E8EEF9"/><g stroke="#ffffff" stroke-width="1"><path d="M13.5 4V1M15 4V.5M16.5 4V.5M18 4V1"/></g></svg>`;

export class ShopScreen implements Screen {
  el: HTMLElement; modal = false; list: List;
  private rows: { ware: Ware; el: HTMLElement; icon: HTMLElement; name: HTMLElement; state: HTMLElement }[] = [];
  private purse: HTMLElement; private detail: { icon: HTMLElement; name: HTMLElement; blurb: HTMLElement; pip: HTMLElement; cta: HTMLElement };
  private shownShine: number; private t = 0;
  constructor(private g: GameCore, private onClose: () => void) {
    this.shownShine = g.save.shine;
    const current = String(g.flag('brush-colour') ?? 'blue');
    colourIndex.v = Math.max(0, BRUSH_COLOURS.findIndex((c) => c.id === current));
    this.purse = h('div', { class: 'purse' }, h('span', { class: 'purse-gem', 'aria-hidden': 'true' }), h('span', { class: 'purse-n', text: String(g.save.shine) }), h('span', { class: 'purse-l', text: 'shine' }));
    const listEl = h('div', { class: 'shop-list', role: 'listbox', 'aria-label': 'Wares' });
    const items: Item[] = [];
    for (const ware of WARES) {
      const icon = h('span', { class: 'ware-icon' }), name = h('span', { class: 'ware-name' }), state = h('span', { class: 'ware-state' });
      const el = h('button', { class: 'ui-item ware', type: 'button', role: 'option' }, icon, name, state);
      if (ware.icon === 'colour') {
        const prev = h('span', { class: 'step', 'data-step': '-', role: 'button', 'aria-label': 'Previous colour', text: '‹', onclick: (e: Event) => { e.stopPropagation(); this.cycle(-1); } });
        const next = h('span', { class: 'step', 'data-step': '+', role: 'button', 'aria-label': 'Next colour', text: '›', onclick: (e: Event) => { e.stopPropagation(); this.cycle(1); } });
        el.insertBefore(prev, state); el.insertBefore(next, state);
      }
      listEl.append(el); this.rows.push({ ware, el, icon, name, state });
      items.push({ el, confirm: () => this.buy(ware, el), left: ware.icon === 'colour' ? () => this.cycle(-1) : undefined, right: ware.icon === 'colour' ? () => this.cycle(1) : undefined });
    }
    this.detail = { icon: h('div', { class: 'detail-icon' }), name: h('h3', {}), blurb: h('p', { class: 'detail-blurb' }), pip: h('p', { class: 'detail-pip' }), cta: h('div', { class: 'detail-cta' }) };
    const leave = h('button', { class: 'ui-item shop-leave', type: 'button', text: 'Leave', onclick: () => this.close() });
    this.el = h('div', { class: 'scr shop-scr' }, h('section', { class: 'shop', role: 'dialog', 'aria-label': "Pip's wares" },
      h('header', { class: 'shop-head' }, h('div', {}, h('div', { class: 'kicker', text: 'Pip\'s travelling' }), h('h2', { text: 'Wares' })), this.purse),
      h('div', { class: 'shop-body' }, listEl, h('aside', { class: 'shop-detail' }, this.detail.icon, this.detail.name, this.detail.blurb, this.detail.pip, this.detail.cta)),
      h('footer', { class: 'shop-foot' }, leave, h('div', { class: 'hints' }, h('span', {}, h('kbd', { text: 'Enter' }), ' Buy'), h('span', {}, h('kbd', { text: '←→' }), ' Colour'), h('span', {}, h('kbd', { text: 'Esc' }), ' Leave')))));
    this.list = new List(g, items);
    const focus = this.list.focus.bind(this.list);
    this.list.focus = (k: number, sound = true) => { focus(k, sound); this.paint(); };
    this.paint();
  }
  private cycle(d: number) { colourIndex.v = (colourIndex.v + d + BRUSH_COLOURS.length) % BRUSH_COLOURS.length; sfx.move(this.g); this.paint(); }
  private status(w: Ware) {
    const g = this.g, price = w.price(g), lock = w.locked?.(g) ?? null;
    if (w.icon === 'colour') { const c = BRUSH_COLOURS[colourIndex.v]; if (w.owned(g)) return { cls: 'is-owned', text: 'Equipped', price, lock }; if (colourOwned(g, c.id)) return { cls: 'is-free', text: 'Equip', price, lock }; }
    else if (w.owned(g)) return { cls: 'is-owned', text: 'Owned', price, lock };
    if (lock) return { cls: 'is-locked', text: lock, price, lock };
    if (price > g.save.shine) return { cls: 'is-poor', text: String(price), price, lock };
    return { cls: 'is-buy', text: String(price), price, lock };
  }
  private paint() {
    for (const r of this.rows) {
      const st = this.status(r.ware), col = BRUSH_COLOURS[colourIndex.v];
      r.el.className = 'ui-item ware ' + st.cls + (this.list && this.rows[this.list.i] === r ? ' is-focus' : '');
      r.icon.innerHTML = r.ware.icon === 'colour' ? swatch(col.hex) : ICONS[r.ware.icon];
      r.name.textContent = r.ware.icon === 'colour' ? `Colourway: ${col.name}` : r.ware.name;
      r.state.textContent = st.text;
    }
    const r = this.rows[this.list?.i ?? 0]; if (!r) return;
    const st = this.status(r.ware), col = BRUSH_COLOURS[colourIndex.v];
    this.detail.icon.innerHTML = r.ware.icon === 'colour' ? swatch(col.hex) : ICONS[r.ware.icon];
    this.detail.name.textContent = r.ware.icon === 'colour' ? `${r.ware.name}: ${col.name}` : r.ware.name;
    this.detail.blurb.textContent = r.ware.blurb;
    if (!this.detail.pip.dataset.locked) this.detail.pip.textContent = '“' + r.ware.pip + '”';
    this.detail.cta.className = 'detail-cta ' + st.cls;
    this.detail.cta.textContent = st.cls === 'is-owned' ? (r.ware.icon === 'colour' ? 'Equipped' : 'Already yours') : st.cls === 'is-locked' ? st.text : st.cls === 'is-free' ? 'Equip for free' : st.cls === 'is-poor' ? `${st.price} shine · you need ${st.price - this.g.save.shine} more` : `Buy for ${st.price} shine`;
  }
  private quip(text: string) { this.detail.pip.textContent = '“' + text + '”'; this.detail.pip.dataset.locked = '1'; this.detail.pip.classList.remove('pop'); void this.detail.pip.offsetWidth; this.detail.pip.classList.add('pop'); setTimeout(() => { delete this.detail.pip.dataset.locked; }, 2600); }
  private buy(w: Ware, el: HTMLElement) {
    const g = this.g, st = this.status(w);
    if (st.cls === 'is-owned') { sfx.deny(g); this.quip('You already have that one, friend! I checked twice.'); return; }
    if (st.cls === 'is-locked') { sfx.deny(g); this.quip('Patience! One thing at a time. That is my whole business model.'); return; }
    if (st.cls === 'is-poor') { sfx.deny(g); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); this.quip('Ah. A little short, friend. Sweep a few more Plaqlings and come back?'); return; }
    g.save.shine -= st.price; w.buy(g); g.persist();
    g.audio.sfx('buy'); el.classList.remove('bought'); void el.offsetWidth; el.classList.add('bought');
    this.quip(st.cls === 'is-free' ? 'Lovely. Wear it well!' : w.pip);
    if (w.id.startsWith('shard')) g.ui.toast('Your crown holds one more enamel shard.', 2600);
    this.paint();
  }
  close() { sfx.back(this.g); this.onClose(); }
  update(dt: number) {
    this.t += dt;
    const target = this.g.save.shine; if (this.shownShine !== target) { this.shownShine += Math.sign(target - this.shownShine) * Math.max(1, Math.round(Math.abs(target - this.shownShine) * dt * 8)); this.purse.querySelector('.purse-n')!.textContent = String(this.shownShine); }
    if (backTap(this.g.input)) return this.close();
    this.list.update(dt);
  }
}
