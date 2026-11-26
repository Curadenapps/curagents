// The ending: the world dims, a few lines of epilogue over it, then the credits and the CURAPROX wordmark,
// then back to the title with the save intact.
import type { GameCore } from '../game/game';
import { h, wordmark, backTap, taps, type Screen } from './kit';

const LINE_S = 4.6;

export class EndingScreen implements Screen {
  el: HTMLElement; modal = false; t = 0;
  private lines: string[]; private lineEls: HTMLElement[]; private credits: HTMLElement; private veil: HTMLElement;
  private stage: 'epilogue' | 'credits' | 'out' = 'epilogue'; private idx = -1; private lineT = 0; private outT = 0; private creditsT = 0;
  constructor(private g: GameCore, private onDone: () => void) {
    const met = (id: string) => !!g.flag('met-' + id);
    this.lines = [
      'The last of the Calculus crumbles into quiet sand.',
      'Across Ivoria, the enamel towers catch the light again, and one by one, they begin to sing.',
      met('mira') ? 'At the Crown Gate, Mira sets a second cup beside the fountain. Just in case.' : 'At the Crown Gate, the fountain runs clear and warm, as if it had been waiting.',
      met('pip') ? 'Deep in the Hollows, Pip is already painting a new sign.' : 'Deep in the Hollows, the glowing gardens open their petals.',
      met('warden') ? 'And the Warden, for the first time in years, sits down.' : 'And the gates of the Deep stand open, with nothing left to guard.',
      'Bristle, last knight of the Order of the 5,460, rests at last. Twice a day, as the oath says.',
    ];
    this.lineEls = this.lines.map((l) => h('p', { class: 'end-line', text: l }));
    this.veil = h('div', { class: 'end-veil' });
    this.credits = h('div', { class: 'end-credits' },
      h('div', { class: 'end-logo', text: 'BRISTLE' }), h('div', { class: 'end-sub', text: 'Knight of the Crown' }),
      h('p', { class: 'end-tag', text: 'BRISTLE: Knight of the Crown. An original game prototype for CURAPROX.' }),
      h('dl', { class: 'credits-list' },
        h('dt', { text: 'World' }), h('dd', { text: 'Ivoria, inside the Great Smile' }),
        h('dt', { text: 'Characters' }), h('dd', { text: 'Bristle, Mira, Pip and the Warden' }),
        h('dt', { text: 'Art' }), h('dd', { text: 'Every shape drawn in code' }),
        h('dt', { text: 'Voices' }), h('dd', { text: 'Written lines, with optional replies by Claude' })),
      wordmark('wordmark end-mark'),
      h('p', { class: 'end-thanks', text: 'Thank you for playing' }));
    this.el = h('div', { class: 'scr end-scr', role: 'dialog', 'aria-label': 'Ending' }, this.veil, h('div', { class: 'end-lines' }, ...this.lineEls), this.credits,
      h('div', { class: 'end-skip' }, h('kbd', { text: 'Enter' }), ' Next', h('kbd', { text: 'Esc' }), ' Skip'));
    g.setFlag('calculus-defeated', true); g.persist();
    g.audio.music('ending');
    requestAnimationFrame(() => this.el.classList.add('is-on'));
  }
  private showLine(i: number) { this.lineEls.forEach((e, k) => e.classList.toggle('is-on', k === i)); }
  private toCredits() { this.stage = 'credits'; this.creditsT = 0; this.showLine(-1); this.el.classList.add('is-credits'); }
  update(dt: number) {
    this.t += dt;
    const p = this.g.player; if (p) p.invuln = Math.max(p.invuln, 0.5);
    const inp = this.g.input, next = taps(inp, 'confirm', 'jump', 'attack', 'interact'), skip = backTap(inp);
    if (this.stage === 'epilogue') {
      if (skip) return this.toCredits();
      if (this.t < 1.6) return; // let the veil fall first
      this.lineT -= dt;
      if (this.lineT <= 0 || (next && this.idx >= 0)) {
        this.idx++; if (this.idx >= this.lines.length) return this.toCredits();
        this.showLine(this.idx); this.lineT = LINE_S + this.lines[this.idx].length * 0.012;
      }
    } else if (this.stage === 'credits') {
      this.creditsT += dt;
      if ((next || skip) && this.creditsT > 1.2 || this.creditsT > 16) { this.stage = 'out'; this.el.classList.add('is-out'); }
    } else {
      this.outT += dt; if (this.outT > 1.4) this.onDone();
    }
  }
}
