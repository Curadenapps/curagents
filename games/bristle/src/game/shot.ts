// The interdental shot: the holder is the bow, the refill is the arrow. It replaces the toothpaste throw on the
// spell button (Up + spell is still the Rinse wave). Hold to load and draw, release to fire.
//   - Load: a refill clicks into the holder (LOAD s). Release earlier and nothing fires.
//   - Draw: keep holding; a short draw is slow and drops, a full draw is fast, straight and passes through
//     one creature. The Ranger draws faster and carries more; the Bulwark carries fewer.
//   - Size: S, M, L, cycled with the size button (R / Tab, a stick click on a pad). You need that size's brush
//     (S from the start, M with the Prime Dash relic, L from Pip). A shot of the right size unclogs a gap.
//   - Ammo: each size has its own count, saved as flags ammo-s/m/l. Fired refills drop where they land and can
//     be picked up again; resting at a fountain fills every size.
import { Actor, Projectile } from './entity';
import { TILE } from '../engine/render';
import { clamp, TAU } from '../engine/math';
import { idbHolder, idbRefill } from '../design/kit';
import { idb, particle as PT, font } from '../design/tokens';
import { GAP_CHARS, GAPS, hasPrime, type GapSize } from './gaps';
import type { Game } from './types';
import type { OrderId } from '../design/hero';

export const SIZES: GapSize[] = ['s', 'm', 'l'];
const COL: Record<GapSize, string> = { s: idb.sizes.s.col, m: idb.sizes.m.col, l: idb.sizes.l.col };
const NAME: Record<GapSize, string> = { s: 'S', m: 'M', l: 'L' };
/** Cleaning power per size, before the draw bonus (up to +3 at full draw). */
export const POWER: Record<GapSize, number> = { s: 5, m: 7, l: 10 }; // 5+: below 5 a hit counts as a foam tick (no shove)
export const LOAD = idb.shot.load;
/** Seconds of drawing to reach full power, and refills carried per size, by Order. */
export const DRAW: Record<OrderId, number> = { initiate: 0.6, vanguard: 0.6, ranger: 0.35, bulwark: 0.8 };
export const CARRY: Record<OrderId, number> = { initiate: 6, vanguard: 6, ranger: 9, bulwark: 3 };

export const ammo = (g: Game, s: GapSize) => { const v = g.save.flags['ammo-' + s]; return typeof v === 'number' ? v : CARRY.initiate; };
export const setAmmo = (g: Game, s: GapSize, n: number) => { g.save.flags['ammo-' + s] = Math.max(0, n); };
/** Fill every size to the Order's carry limit (fountains). */
export function refillAll(g: Game, ord: OrderId) { for (const s of SIZES) setAmmo(g, s, CARRY[ord]); }
/** Sizes the knight can fire right now. */
export const usable = (g: Game) => SIZES.filter((s) => hasPrime(g, s));
export function selectedSize(g: Game): GapSize {
  const v = g.save.flags['shot-size'] as GapSize, list = usable(g);
  return list.includes(v) ? v : list[0] ?? 's';
}
export function cycleSize(g: Game) {
  const list = usable(g); if (list.length < 2) return;
  const i = list.indexOf(selectedSize(g)); g.save.flags['shot-size'] = list[(i + 1) % list.length];
  g.audio.sfx('clink', { pitch: 1.4, vol: 0.5 });
}

/** A fired refill: flies along its velocity, drops at low power, unclogs a gap of its own size. */
export class RefillShot extends Projectile {
  size: GapSize; t = 0; ord: OrderId;
  constructor(x: number, y: number, vx: number, vy: number, size: GapSize, power: number, pierce: boolean, drop: boolean, ord: OrderId) {
    super(x, y, vx, vy, 'player', power, 6, 1.4, COL[size]); this.size = size; this.pierce = pierce; this.gravityOn = drop; this.ord = ord;
  }
  override update(g: Game, dt: number) {
    this.t += dt;
    if (Math.random() < dt * 40) g.fx.burst(this.x - this.vx * 0.02, this.y - this.vy * 0.02, PT.idbTrail);
    // a gap cell ahead: the right size unclogs it from range, the wrong size bounces off
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt, tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE), ch = g.room.grid[ty]?.[tx] ?? '#';
    if (GAP_CHARS.includes(ch)) {
      const gap = g.entities.find((e) => (e as any).cells?.some?.(([cx, cy]: [number, number]) => cx === tx && cy === ty)) as any;
      if (gap && GAPS[ch].id === this.size && gap.work < 0) { gap.clear(g); this.pop(g); return; }
      if (!g.save.flags['shot-gap-tip']) { g.save.flags['shot-gap-tip'] = true; g.ui.toast(`That gap needs a size ${GAPS[ch].name} refill. Change size with the size button.`, 4200); }
      this.pop(g); return;
    }
    super.update(g, dt);
  }
  override pop(g: Game) {
    this.dead = true; g.audio.sfx('clink', { x: this.x, y: this.y, pitch: 1.1 });
    g.fx.burst(this.x, this.y, PT.idbHit);
    g.spawn(new RefillPickup(this.x - Math.sign(this.vx) * 6, this.y - 4, this.size));
  }
  override draw(ctx: CanvasRenderingContext2D) {
    const a = Math.atan2(this.vy, this.vx);
    idbRefill(ctx, this.x - Math.cos(a) * 9, this.y - Math.sin(a) * 9, 18, { col: COL[this.size], angle: a + Math.PI / 2 });
  }
  override drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y, 14, '#FFFFFF', 0.35); }
}

/** A refill lying where it landed. Walk over it to take it back. */
export class RefillPickup extends Actor {
  size: GapSize; t = 0;
  constructor(x: number, y: number, size: GapSize) { super(x, y, 6, 6); this.size = size; this.z = 6; }
  update(g: Game, dt: number) {
    this.t += dt; if (this.t > 30) { this.dead = true; return; }
    this.physics(g, dt); if (this.grounded) this.vx *= 0.8;
    const p = g.player, ord = (p as any).ord as OrderId ?? 'initiate';
    if (this.t > 0.35 && Math.abs(p.x - this.x) < p.hw + 8 && Math.abs(p.y - this.y) < p.hh + 8 && ammo(g, this.size) < CARRY[ord]) {
      this.dead = true; setAmmo(g, this.size, ammo(g, this.size) + 1); g.audio.sfx('shine', { pitch: 1.3, vol: 0.4 }); g.fx.burst(this.x, this.y, { ...PT.shine, n: 2 });
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    const bob = this.grounded ? 0 : Math.sin(this.t * 10) * 0.2;
    idbRefill(ctx, this.x, this.y + this.hh, 14, { col: COL[this.size], angle: -0.9 + bob });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y, 10, COL[this.size], 0.25 + 0.1 * Math.sin(this.t * 4)); }
}

/** The holder in the knight's hand while loading and drawing (body space, facing f). k = draw 0..1. */
export function drawHeld(ctx: CanvasRenderingContext2D, x: number, y: number, f: number, size: GapSize, loaded: boolean, k: number) {
  ctx.save(); ctx.translate(x - f * k * 3, y); ctx.scale(f, 1);
  idbHolder(ctx, 0, 0, 20, { angle: Math.PI / 2, loaded: loaded ? COL[size] : null });
  ctx.restore();
}

/** Ammo on the HUD: three refills under the health, the selected size lifted and underlined. */
export function installShotHud(g: Game & { hudHooks: ((c: CanvasRenderingContext2D, g: any) => void)[] }) {
  g.hudHooks.push((c, gg) => {
    const game = gg as Game; if (!game.player) return;
    const list = usable(game), sel = selectedSize(game), x0 = 36, y0 = 112;
    c.font = `400 12px ${font.canvas}`; c.textBaseline = 'middle'; c.textAlign = 'left';
    list.forEach((s, i) => {
      const x = x0 + i * 52, on = s === sel, n = ammo(game, s);
      c.globalAlpha = on ? 1 : 0.55;
      idbRefill(c, x + 6, y0 + 10 - (on ? 3 : 0), 22, { col: COL[s], angle: 0.5 });
      c.fillStyle = n > 0 ? '#E8EEF9' : '#F277C6'; c.fillText(`${NAME[s]} ${n}`, x + 16, y0 + 1 - (on ? 3 : 0));
      if (on) { c.fillStyle = '#8BB8E8'; c.fillRect(x - 2, y0 + 14, 40, 2); }
    });
    c.globalAlpha = 1;
  });
}
export { clamp, TAU };

/** Cleared creatures sometimes drop a refill (about one in three), of the usable size you are lowest on. */
export function maybeDropRefill(g: Game, x: number, y: number) {
  const list = usable(g); if (!list.length || Math.random() > 0.34) return;
  const ord = ((g.player as any)?.ord ?? 'initiate') as OrderId, low = list.filter((s) => ammo(g, s) < CARRY[ord]);
  if (!low.length) return;
  const s = low.sort((a, b) => ammo(g, a) - ammo(g, b))[0], r = new RefillPickup(x, y - 6, s);
  r.vy = -260; r.vx = (Math.random() - 0.5) * 120; g.spawn(r);
}
