// Interdental gaps: narrow spaces between two teeth, clogged with build-up. Walk up, press Up or E, and
// the knight works an interdental brush (IDB) of the right size gently in and out until the clog crumbles.
// Sizes are colour-coded and shown on the gap, so the player learns the real habit: pick the brush that
// fits the space, never force a bigger one. A cleaned gap stays open for good (flag gap:<room>:x,y).
//
// Map chars: '|' small, 'I' medium, 'H' large. Real CURAPROX size names (CPS prime 06/08/011 and handle
// colours) are placeholders here and must be verified with the brand team before anything public.
import { Actor } from './entity';
import { TILE } from '../engine/render';
import type { Game } from './types';
import { particle as PT } from '../design/tokens';

export type GapSize = 's' | 'm' | 'l';
export const GAP_CHARS = '|IH';
export const GAPS: Record<string, { id: GapSize; name: string; col: string; channel: number }> = {
  '|': { id: 's', name: 'S', col: '#F277C6', channel: 6 },
  'I': { id: 'm', name: 'M', col: '#FF8200', channel: 10 },
  'H': { id: 'l', name: 'L', col: '#8BB8E8', channel: 14 },
};

/** Which interdental brushes the knight carries. S comes from Derek at the start, M with the Prime Dash relic, L from Pip. */
export function hasPrime(g: Game, s: GapSize) {
  if (s === 's') return g.save.flags['prime-s'] !== false;
  if (s === 'm') return !!g.save.flags['prime-m'] || !!g.save.abilities.dash;
  return !!g.save.flags['prime-l'];
}

const WORK = 1.05; // seconds of gentle in-and-out before the clog lets go
const wantsInteract = (g: Game) => !g.busy() && !g.ui.isOpen() && (g.input.pressed('interact', 0.05) || g.input.pressed('up', 0.05)) && g.player.grounded;

export class Gap extends Actor {
  cells: [number, number][]; ch: string; t = 0; prompt = 0; work = -1; deny = 0; side = 1; x0: number; x1: number; y0: number; y1: number;
  constructor(cells: [number, number][], ch: string) {
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const x0 = Math.min(...xs) * TILE, x1 = (Math.max(...xs) + 1) * TILE, y0 = Math.min(...ys) * TILE, y1 = (Math.max(...ys) + 1) * TILE;
    super((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2);
    this.cells = cells; this.ch = ch; this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1; this.z = 4;
    this.collide = false; this.gravity = 0;
  }
  get size() { return GAPS[this.ch]; }
  update(g: Game, dt: number) {
    this.t += dt; this.deny = Math.max(0, this.deny - dt);
    const p = g.player;
    const n = this.work < 0 && (p as any).deadT < 0 && p.x + p.hw + 14 > this.x0 && p.x - p.hw - 14 < this.x1 && p.y + p.hh > this.y0 + 2 && p.y - p.hh < this.y1 - 2;
    this.prompt = Math.min(1, Math.max(0, this.prompt + (n ? dt : -dt) * 4));
    if (this.work >= 0) { this.scrubbing(g, dt); return; }
    if (!n || !wantsInteract(g)) return;
    g.input.consume('interact'); g.input.consume('up');
    if (!hasPrime(g, this.size.id)) {
      this.deny = 1; g.audio.sfx('ui-back'); g.shake(2, 0.15);
      const where = this.size.id === 'm' ? 'Derek says the Narrows hide one.' : 'Pip sells them.';
      g.ui.toast(`Too wide for your brushes. This gap needs a size ${this.size.name} interdental brush. ${where}`, 4800);
      return;
    }
    this.side = p.x < this.x ? -1 : 1; this.work = 0; p.facing = -this.side as 1 | -1; p.vx = 0;
    g.audio.sfx('scrub', { pitch: 1.1 });
  }
  private scrubbing(g: Game, dt: number) {
    const p = g.player; this.work += dt; (p as any).workT = 0.12; p.vx = 0;
    const face = this.side < 0 ? this.x0 : this.x1;
    if (Math.floor(this.work * 6) !== Math.floor((this.work - dt) * 6)) g.audio.sfx('scrub', { pitch: 0.9 + Math.random() * 0.3, vol: 0.6 });
    if (Math.random() < dt * 30) {
      const [cx, cy] = this.cells[Math.floor(Math.random() * this.cells.length)];
      g.fx.burst(face, (cy + Math.random()) * TILE, { n: 2, color: ['#d8c48a', '#bfa863', '#FCE300'], speed: [40, 160], angle: this.side < 0 ? Math.PI : 0, spread: 1.2, size: [1.5, 3.5], gravity: 700, life: [0.3, 0.7] });
      void cx;
    }
    if (this.work >= WORK) this.clear(g);
  }
  clear(g: Game) {
    const r = g.room;
    for (const [x, y] of this.cells) { r.grid[y][x] = '.'; g.save.flags[`gap:${r.def.id}:${x},${y}`] = true; }
    r.version++; r.rebuild(); this.dead = true;
    g.audio.sfx('break'); g.hitstop(0.08); g.shake(5, 0.25);
    for (const [x, y] of this.cells) g.fx.burst((x + 0.5) * TILE, (y + 0.5) * TILE, { n: 10, color: ['#d8c48a', '#bfa863', '#ffffff'], shape: 'crumb', spin: 8, speed: [80, 300], size: [1.5, 3.6], gravity: 900, life: [0.4, 0.9] });
    g.fx.burst(this.x, this.y, { n: 24, color: ['#ffffff', this.size.col], shape: 'bubble', speed: [30, 160], angle: -Math.PI / 2, spread: 2, size: [1, 3], gravity: -60, emissive: true, life: [0.6, 1.2] }); g.fx.burst(this.x, this.y, PT.cleanGlint);
    g.progress?.gain(8); (g as any).float?.(this.x, this.y0 - 8, '+8 XP', '#8BB8E8');
    if (!g.save.flags['gap-first']) { g.save.flags['gap-first'] = true; g.ui.toast('Gap clean. The right size slides in without forcing: in and out, gently, once for every space.', 5200); }
    g.persist();
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.work < 0) return;
    // the interdental brush in the knight's hand, working in and out of the gap
    const p = g.player, f = -this.side, s = this.size;
    const hx = p.x + f * 10, hy = p.y - 2, face = this.side < 0 ? this.x0 : this.x1;
    const reach = Math.abs(face - hx), d = reach + 4 + 9 * (0.5 + 0.5 * Math.sin(this.work * 24));
    ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1);
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.roundRect(-8, -2.5, 12, 5, 2.5); ctx.fill();
    ctx.strokeStyle = '#c9d4ea'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(d - 5, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(d - 6, -2 - s.channel / 6, 9, 4 + s.channel / 3, 2); ctx.fill();
    ctx.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const s = this.size, top = this.y0 - 16, pulse = 0.55 + 0.25 * Math.sin(this.t * 3);
    // size badge above the gap, always visible so sizes become familiar
    g.r.halo(ctx, this.x, top, 18, s.col, 0.25 + this.prompt * 0.3);
    ctx.globalAlpha = Math.min(1, pulse + this.prompt * 0.4 + this.deny);
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(this.x, top, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0A1F44'; ctx.font = '700 11px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.name, this.x, top + 0.5); ctx.textBaseline = 'alphabetic';
    if (this.prompt > 0) {
      const ok = hasPrime(g, s.id);
      ctx.globalAlpha = this.prompt; ctx.fillStyle = this.deny > 0 ? '#F277C6' : '#ffffff'; ctx.font = '14px "Futura LT Pro", Futura, sans-serif';
      ctx.fillText(ok ? `CLEAN GAP · IDB ${s.name}` : `NEEDS IDB ${s.name}`, this.x, top - 18);
    }
    ctx.globalAlpha = 1;
  }
}

/** Remove gaps this save already cleaned, then spawn one Gap per connected clog. Call right after the room is built. */
export function setupGaps(g: Game & { spawn(e: Actor): void }) {
  const r = g.room, pre = `gap:${r.def.id}:`; let changed = false;
  for (const k of Object.keys(g.save.flags)) if (k.startsWith(pre)) {
    const [x, y] = k.slice(pre.length).split(',').map(Number);
    if (GAP_CHARS.includes(r.grid[y]?.[x] ?? '#')) { r.grid[y][x] = '.'; changed = true; }
  }
  if (changed) { r.version++; r.rebuild(); }
  const seen = new Set<number>();
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const ch = r.grid[y][x]; if (!GAP_CHARS.includes(ch) || seen.has(y * r.w + x)) continue;
    const cells: [number, number][] = [], stack: [number, number][] = [[x, y]]; seen.add(y * r.w + x);
    while (stack.length) {
      const [cx, cy] = stack.pop()!; cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, k = ny * r.w + nx;
        if (nx < 0 || ny < 0 || nx >= r.w || ny >= r.h || seen.has(k) || r.grid[ny][nx] !== ch) continue;
        seen.add(k); stack.push([nx, ny]);
      }
    }
    g.spawn(new Gap(cells, ch));
  }
}
