// BRISTLE hero rig: one knight body and the Orders (armour sets) that dress it.
// Used by the game (src/game/player.ts draws the live knight) and the style guide (static poses), so the
// two cannot drift. Rig space: feet at (0,0), +y down, facing right, about 61 units tall; the game draws
// it at RIG_SCALE: about 58 units tall on a 42-unit hit box, so the helm reads as big as the original hero's.
//
// The rig owns the skeleton and the draw order; an Order only fills slots:
//   back, legs (cuffs), offhand, chest, weapon, front, shoulders, helm, glow, plus a cape style for the
//   game's physics cloak. Order ids are saved in g.save.flags.order.
import { brand as B, idb } from './tokens';
import { brush, crownCap, idbHolder, idbRefill } from './kit';
import { TAU, mix, rgb } from '../engine/math';

type Ctx = CanvasRenderingContext2D;
export type V2 = [number, number];
export type OrderId = 'initiate' | 'vanguard' | 'duelist' | 'ranger' | 'lancer';
export const ORDER_IDS: OrderId[] = ['initiate', 'vanguard', 'duelist', 'ranger', 'lancer'];
/** The Orders you can earn (the Initiate is where everyone starts). */
export const EARNED_ORDERS: OrderId[] = ['vanguard', 'duelist', 'ranger', 'lancer'];
export const RIG_SCALE = 0.95;
/** Rig shoulders (front, back) and hip height. */
export const RIG = { front: [6, -34] as V2, back: [-5.5, -34] as V2, hip: -20, leg: 17, neck: [0.5, -39] as V2 };

// ---------------------------------------------------------------------------------------------
// house-style helpers
// ---------------------------------------------------------------------------------------------
export const KE = { base: '#F3F6FC', shade: '#C7D3EA', deep: '#9FB0D0', stroke: '#8FA3C9', gloss: '#FFFFFF', cloth: '#18244A', leg: '#121A36', boot: '#0B1128' };
/** Enamel plate: flat fill, one stepped shade on the back side, hairline outline, one gloss spot. */
export function plate(ctx: Ctx, path: Path2D, o: { base?: string; shade?: string; sx: number; sy: number; sr: number; gloss?: [number, number, number, number] }) {
  ctx.fillStyle = o.base ?? KE.base; ctx.fill(path);
  ctx.save(); ctx.clip(path); ctx.fillStyle = o.shade ?? KE.shade; ctx.beginPath(); ctx.rect(-200, -200, 400, 400); ctx.arc(o.sx, o.sy, o.sr, 0, TAU, true); ctx.fill('evenodd');
  if (o.gloss) { ctx.globalAlpha *= 0.85; ctx.fillStyle = KE.gloss; ctx.beginPath(); ctx.ellipse(o.gloss[0], o.gloss[1], o.gloss[2], o.gloss[3], -0.35, 0, TAU); ctx.fill(); }
  ctx.restore(); ctx.strokeStyle = KE.stroke; ctx.lineWidth = 0.9; ctx.stroke(path);
}
export function poly(pts: number[]) { const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; }
export const fnPath = (f: (p: Path2D) => void) => { const p = new Path2D(); f(p); return p; };
/** A plume of filaments: white roots, coloured tips, fanned between angles a0..a1. */
export function plume(ctx: Ctx, x: number, y: number, len: number, tip: string, n: number, a0: number, a1: number, curl: number) {
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = a0 + (a1 - a0) * t, L = len * (0.8 + 0.25 * Math.sin(i * 2.3)), ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    const cx = x + Math.cos(a - curl) * L * 0.55, cy = y + Math.sin(a - curl) * L * 0.55;
    ctx.lineWidth = 1.1; ctx.strokeStyle = i % 2 ? '#FFFFFF' : '#E3ECF8'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, (cx + ex) / 2, (cy + ey) / 2); ctx.stroke();
    ctx.strokeStyle = tip; ctx.beginPath(); ctx.moveTo((cx + ex) / 2, (cy + ey) / 2); ctx.quadraticCurveTo(ex - Math.cos(a), ey, ex, ey); ctx.stroke();
  }
}
export type HaloFn = (ctx: Ctx, x: number, y: number, r: number, color: string, a: number) => void;
/** A soft radial glow, for places without the renderer's halo sprite. */
export const softHalo: HaloFn = (ctx, x, y, r, color, a) => {
  const [cr, cg, cb] = rgb(color), g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${a * 0.55})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
};
export function visorGlow(ctx: Ctx, path: Path2D, hx: number, hy: number, r: number, halo: HaloFn = softHalo, open = 1) {
  halo(ctx, hx, hy, r * 0.7, B.sky, 0.3 * open); const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.55 * open; ctx.fillStyle = B.sky; ctx.fill(path); ctx.globalAlpha = a;
}
/** Static legs for sketches: hips at `hip`, feet planted at the given x positions. */
export function legsK(ctx: Ctx, hip: number, len: number, w: number, back: V2, front: V2, boot: string, knee: boolean) {
  for (const [hx, fx, col] of [[back[0], back[1], '#0D1430'], [front[0], front[1], KE.leg]] as [number, number, string][]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hip); ctx.quadraticCurveTo((hx + fx) / 2, hip + len * 0.5, fx, -3); ctx.stroke();
    if (knee) plate(ctx, fnPath((p) => p.ellipse((hx + fx) / 2 + 0.6, hip + len * 0.5, w * 0.62, w * 0.75, 0, 0, TAU)), { sx: (hx + fx) / 2 + 1.5, sy: hip + len * 0.5 - 1, sr: w * 0.7 });
    const b = new Path2D(); b.moveTo(fx - w * 0.75, -4.5); b.quadraticCurveTo(fx - w * 0.9, 0, fx - w * 0.6, 0); b.lineTo(fx + w * 1.7, 0); b.quadraticCurveTo(fx + w * 1.7, -2.6, fx + w * 0.5, -4.2); b.closePath();
    ctx.fillStyle = col === KE.leg ? boot : mix(boot, '#000000', 0.25); ctx.fill(b);
  }
}

// ---------------------------------------------------------------------------------------------
// the rig
// ---------------------------------------------------------------------------------------------
export interface RigPose {
  legA: number; legB: number;          // front and back leg swing (radians, + = foot back)
  lift: number;                        // upper-body lift in rig units (run bob, breathing)
  headTilt: number;
  backHand: V2; frontHand: V2;         // rig space, before lift
  game: boolean;                       // true: the live knight (brush in hand, physics cloak drawn by the game)
  aiming?: boolean;                    // Ranger: holder raised
  sway?: number;                       // plume and scarf sway, about -1..1
  open?: number;                       // visor open 0..1 (blink)
}
export interface OrderArt {
  id: OrderId; name: string; line: string; earned: string;
  stats: { health: number; speed: number; reach: number; guard: number }; // 1-5, for display bars
  boot: string; cuff?: string; knees: boolean; gauntlet: boolean;
  hands: { front: V2; back: V2 };      // static pose
  visor: V2;                           // glow centre, rig space
  cape: { color: string; edge: string; width: number } | null; // the game's physics cloak
  back?(c: Ctx, p: RigPose): void; offhand?(c: Ctx, p: RigPose): void; chest(c: Ctx, p: RigPose): void;
  weapon?(c: Ctx, p: RigPose): void; front?(c: Ctx, p: RigPose): void; shoulders?(c: Ctx, p: RigPose): void;
  helm(c: Ctx, p: RigPose): void; glow(c: Ctx, p: RigPose, halo: HaloFn): void;
}
function arm(ctx: Ctx, from: V2, to: V2, col: string, w: number, bend: number) {
  const mx = (from[0] + to[0]) / 2 + bend, my = (from[1] + to[1]) / 2 + Math.abs(bend) * 0.4;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo(mx, my, to[0], to[1]); ctx.stroke();
}
function hand(ctx: Ctx, at: V2, gauntlet: boolean, dark = false) {
  if (!gauntlet) { ctx.fillStyle = dark ? KE.shade : KE.base; ctx.beginPath(); ctx.arc(at[0], at[1], 2.6, 0, TAU); ctx.fill(); ctx.strokeStyle = KE.stroke; ctx.lineWidth = 0.7; ctx.stroke(); return; }
  plate(ctx, fnPath((p) => p.roundRect(at[0] - 2.8, at[1] - 2.7, 5.6, 5.4, 1.9)), dark ? { base: KE.shade, shade: KE.deep, sx: at[0] + 1, sy: at[1] - 1, sr: 3 } : { sx: at[0] + 1, sy: at[1] - 1, sr: 3.4 });
  ctx.strokeStyle = 'rgba(120,140,185,0.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(at[0] - 1.6, at[1] - 0.6); ctx.lineTo(at[0] + 1.8, at[1] - 0.6); ctx.stroke();
}
/** Legs swinging from the hip: thigh and shin with a slight forward knee, boot following the swing. */
function legs(ctx: Ctx, art: OrderArt, p: RigPose) {
  const L = RIG.leg, w = 4.4;
  for (const [hx, a, back] of [[-2.6, p.legB, true], [2.2, p.legA, false]] as [number, number, boolean][]) {
    const fx = hx - Math.sin(a) * L, fy = RIG.hip + Math.cos(a) * L, kx = hx - Math.sin(a) * L * 0.5 + 1.1, ky = RIG.hip + Math.cos(a) * L * 0.5;
    ctx.strokeStyle = back ? '#0D1430' : KE.leg; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, RIG.hip); ctx.quadraticCurveTo(kx, ky, fx, fy - 1.5); ctx.stroke();
    if (art.knees) plate(ctx, fnPath((q) => q.ellipse(kx - 0.4, ky, w * 0.62, w * 0.75, 0, 0, TAU)), back ? { base: KE.shade, shade: KE.deep, sx: kx + 1, sy: ky - 1, sr: w * 0.7 } : { sx: kx + 1, sy: ky - 1, sr: w * 0.7 });
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(-a * 0.35);
    const b = new Path2D(); b.moveTo(-w * 0.75, -4.5); b.quadraticCurveTo(-w * 0.9, 0, -w * 0.6, 0); b.lineTo(w * 1.7, 0); b.quadraticCurveTo(w * 1.7, -2.6, w * 0.5, -4.2); b.closePath();
    ctx.fillStyle = back ? mix(art.boot, '#000000', 0.25) : art.boot; ctx.fill(b);
    if (art.cuff) { ctx.fillStyle = back ? mix(art.cuff, '#000000', 0.25) : art.cuff; ctx.fillRect(-w * 0.8, -6, w * 1.6, 2); }
    ctx.restore();
  }
}
export interface RigHooks { blade?(ctx: Ctx): void; halo?: HaloFn }
/** Draw the knight in rig space. mode 'scene' paints the body, 'glow' the emissive parts (visor, charge). */
export function drawRig(ctx: Ctx, art: OrderArt, p: RigPose, mode: 'scene' | 'glow', hooks: RigHooks = {}) {
  const head = (f: () => void) => { ctx.save(); ctx.translate(RIG.neck[0], RIG.neck[1]); ctx.rotate(p.headTilt); ctx.translate(-RIG.neck[0], -RIG.neck[1]); f(); ctx.restore(); };
  if (mode === 'glow') { ctx.save(); ctx.translate(0, -p.lift); head(() => art.glow(ctx, p, hooks.halo ?? softHalo)); ctx.restore(); return; }
  art.back?.(ctx, p);
  legs(ctx, art, p);
  ctx.save(); ctx.translate(0, -p.lift);
  const bh: V2 = [p.backHand[0], p.backHand[1] + p.lift * 0.3], fh = p.frontHand;
  arm(ctx, RIG.back, bh, '#0D1430', 3.8, -2); hand(ctx, bh, art.gauntlet, true); art.offhand?.(ctx, { ...p, backHand: bh });
  ctx.fillStyle = KE.cloth; ctx.beginPath(); ctx.roundRect(-7.6, -38, 15.2, 19, 4); ctx.fill();
  art.chest(ctx, p);
  if (hooks.blade) hooks.blade(ctx); else art.weapon?.(ctx, p);
  arm(ctx, RIG.front, fh, KE.cloth, 4, 1.5); hand(ctx, fh, art.gauntlet);
  art.front?.(ctx, p); art.shoulders?.(ctx, p);
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -38.6, 8.6, 2.2, 0, 0, TAU); ctx.fill();
  head(() => art.helm(ctx, p));
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// the Orders
// ---------------------------------------------------------------------------------------------
const VANGUARD_VISOR = poly([-0.5, -48.6, 8.8, -48.6, 8.8, -46.6, 4.6, -46.6, 4.6, -41.8, 2.6, -41.8, 2.6, -46.6, -0.5, -46.6]);
const RANGER_SLIT = poly([0.5, -48.4, 9.4, -51.6, 9.6, -49.4, 0.5, -46.6]);
const LANCER_VISOR = poly([0, -48.4, 10, -48.4, 10, -46.8, 5.6, -46.8, 5.6, -43.4, 4.2, -43.4, 4.2, -46.8, 0, -46.8]);
const DUELIST_SLIT = fnPath((p) => p.roundRect(-0.5, -46.4, 11.5, 3, 1.5));
const INITIATE_SLIT = fnPath((p) => p.roundRect(-2.5, -49.4, 13, 3.6, 1.8));
const shield = (c: Ctx, x: number, y: number) => {
  const pr = B.blue, dk = B.blueDark;
  plate(c, fnPath((p) => p.arc(x, y, 9.5, 0, TAU)), { sx: x + 2, sy: y - 2, sr: 9 });
  const f = fnPath((p) => p.arc(x, y, 7.6, 0, TAU)); c.fillStyle = pr; c.fill(f); c.save(); c.clip(f); c.fillStyle = dk; c.beginPath(); c.arc(x - 4, y + 4, 9, 0, TAU); c.fill(); c.restore(); crownCap(c, x, y + 3.5, 9, { cusps: 3 });
};

/** The angled single-tuft brush (CS single): a long faceted handle widening toward the end, a bend near the top, a short
 *  angled head and a small round tuft in a contrasting colour. (x, y) = handle end, pointing along angle. */
export function singleTuft(ctx: Ctx, x: number, y: number, len: number, angle: number, col: string, tuft = '#D8F24A') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const shaft = len * 0.82, head = len * 0.16, lite = mix(col, '#FFFFFF', 0.35), dark = mix(col, '#000000', 0.25);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(shaft * 0.35, -2.2); ctx.lineTo(shaft, -1.2); ctx.lineTo(shaft, 1.2); ctx.lineTo(shaft * 0.35, 2.2); ctx.lineTo(0, 2.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lite; ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(shaft * 0.95, -1); ctx.lineTo(shaft * 0.95, -0.4); ctx.lineTo(1, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(shaft * 0.95, 1); ctx.lineTo(shaft * 0.95, 0.5); ctx.lineTo(1, 1.2); ctx.closePath(); ctx.fill();
  ctx.translate(shaft, 0); ctx.rotate(-1.05);
  ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(head, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(head - 1.6, -2.1, 3.4, 4.2, 1.2); ctx.fill();
  ctx.fillStyle = tuft; ctx.beginPath(); ctx.roundRect(head + 1.4, -1.9, 3.6, 3.8, [0.6, 1.9, 1.9, 0.6]); ctx.fill();
  ctx.strokeStyle = mix(tuft, '#000000', 0.15); ctx.lineWidth = 0.4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(head + 1.6, i * 1.1); ctx.lineTo(head + 4.6, i * 1.1); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(head + 3.6, -1.1, 0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
/** A sonic toothbrush (Hydrosonic) as a lance: long white body, grey grip band, slim neck, small head. glow = the buzz. */
export function sonicLance(ctx: Ctx, x: number, y: number, len: number, angle: number, glow = false, halo: HaloFn = softHalo) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const body = len * 0.62, neck = len * 0.28, head = len * 0.1;
  if (glow) { for (let i = 1; i <= 3; i++) { ctx.strokeStyle = `rgba(204,216,237,${0.5 - i * 0.12})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(body + neck + head * 0.5, 0, 3 + i * 3.2, -0.9, 0.9); ctx.stroke(); } halo(ctx, body + neck + head * 0.5, 0, 12, '#CCD8ED', 0.5); ctx.restore(); return; }
  plate(ctx, fnPath((p) => p.roundRect(0, -2.6, body, 5.2, 2.6)), { sx: body * 0.5, sy: 1, sr: body * 0.55, gloss: [body * 0.45, -1.4, body * 0.25, 0.6] });
  ctx.fillStyle = '#8E99A8'; ctx.fillRect(body * 0.18, -2.6, body * 0.12, 5.2);
  ctx.fillStyle = B.blue; ctx.beginPath(); ctx.arc(body * 0.62, -2.6, 1.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#E8EEF9'; ctx.beginPath(); ctx.moveTo(body, -1.6); ctx.lineTo(body + neck, -0.8); ctx.lineTo(body + neck, 0.8); ctx.lineTo(body, 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(body + neck, -1.4, head, 2.8, 1.2); ctx.fill();
  ctx.strokeStyle = '#DDE7F6'; ctx.lineWidth = 0.6; for (let i = 0; i < 6; i++) { const fx = body + neck + 0.6 + i * (head - 1.2) / 5; ctx.beginPath(); ctx.moveTo(fx, -1.4); ctx.lineTo(fx, -4.2); ctx.stroke(); }
  ctx.restore();
}
/** Duelist tuft colours: the pink-and-lime and blue-and-yellow pair. */
export const DUELIST_TUFTS = { front: ['#E8519A', '#D8F24A'], back: ['#2A4FBF', '#F5E03A'] } as const;

export function orderArts(): Record<OrderId, OrderArt> {
  const pr = B.blue, dk = B.blueDark, S = idb.sizes;
  const initiate: OrderArt = {
    id: 'initiate', name: 'Initiate', line: 'Today\'s hero: a round helm, a plain cloak, a short brush. Where everyone starts.', earned: 'Start of the game, Crown Gate.',
    stats: { health: 3, speed: 3, reach: 2, guard: 1 }, boot: KE.boot, knees: false, gauntlet: false, hands: { front: [10, -26], back: [-8, -25] }, visor: [5, -48],
    cape: { color: dk, edge: pr, width: 1 },
    back(c, p) { if (p.game) return; const q = fnPath((q) => { q.moveTo(-4, -37); q.quadraticCurveTo(-14, -24, -13, -8); q.lineTo(-3, -10); q.quadraticCurveTo(-2, -24, 2, -37); q.closePath(); }); c.fillStyle = dk; c.fill(q); c.strokeStyle = pr; c.lineWidth = 1.2; c.stroke(q); },
    chest(c) { c.fillStyle = pr; c.beginPath(); c.moveTo(-8, -37); c.quadraticCurveTo(-10, -27, -6.5, -20); c.lineTo(2, -22); c.quadraticCurveTo(3.5, -30, 3, -37.5); c.closePath(); c.fill(); c.fillStyle = '#FFFFFF'; c.fillRect(-6.8, -21.6, 8, 1.4); },
    weapon(c) { brush(c, 9, -24, 24, { angle: -1.15, handle: B.cerise }); },
    helm(c) {
      c.save(); c.translate(0.5, -49.2);
      const h = fnPath((q) => { q.moveTo(-10, 6); q.quadraticCurveTo(-12, -4, -9.6, -9); q.quadraticCurveTo(-8, -14, -5.2, -11.2); q.quadraticCurveTo(-3.4, -14.2, -1.2, -11.4); q.quadraticCurveTo(1, -13.8, 3.2, -11.2); q.quadraticCurveTo(5.8, -14.4, 8.2, -10.6); q.quadraticCurveTo(12, -5, 10, 6); q.quadraticCurveTo(8.5, 9.6, 0, 9.8); q.quadraticCurveTo(-8.5, 9.6, -10, 6); q.closePath(); });
      plate(c, h, { sx: 4, sy: -1, sr: 12, gloss: [4.5, -7.5, 2.6, 1.3] }); c.restore(); c.fillStyle = B.ink; c.fill(INITIATE_SLIT);
    },
    glow(c, p, halo) { visorGlow(c, INITIATE_SLIT, 5, -48, 16, halo, p.open ?? 1); },
  };
  const vanguard: OrderArt = {
    id: 'vanguard', name: 'Vanguard', line: 'The sword of the Order, master of the brush: the CS 5460 as a two-handed greatsword. Big sweeping strokes.', earned: 'When the Glutton is rinsed away: one of four Orders to choose.',
    stats: { health: 3, speed: 2, reach: 5, guard: 3 }, boot: KE.cloth, knees: true, gauntlet: true, hands: { front: [7.2, -25.4], back: [4.8, -18.6] }, visor: [4.5, -47],
    cape: { color: dk, edge: pr, width: 1.25 },
    back(c, p) { if (p.game) return; const q = fnPath((q) => { q.moveTo(-5, -38); q.quadraticCurveTo(-19, -28, -19, -6); q.lineTo(-15, -8); q.lineTo(-12, -4); q.lineTo(-9, -8); q.lineTo(-6, -5); q.quadraticCurveTo(-5, -22, 1, -37); q.closePath(); }); c.fillStyle = dk; c.fill(q); c.strokeStyle = pr; c.lineWidth = 1.2; c.stroke(q); },
    chest(c) {
      plate(c, fnPath((q) => { q.moveTo(-8.4, -37.5); q.quadraticCurveTo(-10, -29, -7, -22); q.lineTo(7.5, -22); q.quadraticCurveTo(10.2, -29, 8.4, -37.5); q.quadraticCurveTo(0, -39.6, -8.4, -37.5); }), { sx: 3, sy: -33, sr: 10.5, gloss: [4.5, -34.5, 2.4, 1.1] });
      const tab = poly([-4.6, -33, 4.6, -33, 5.6, -13, 0, -9.5, -5.6, -13]); c.fillStyle = pr; c.fill(tab);
      c.save(); c.clip(tab); c.fillStyle = dk; c.fillRect(-6, -33, 3.2, 24); c.fillStyle = '#FFFFFF'; c.fillRect(-6, -17.5, 12, 1.7); c.restore();
      c.fillStyle = B.ink; c.fillRect(-8.2, -22.4, 16.4, 2.6); crownCap(c, 0, -20, 5.4, { cusps: 3 });
    },
    weapon(c) { brush(c, 4, -14, 54, { angle: -1.3, handle: pr }); },
    shoulders(c) {
      plate(c, fnPath((q) => q.ellipse(-8.2, -35.5, 3.8, 4.6, 0.3, 0, TAU)), { base: KE.shade, shade: KE.deep, sx: -7, sy: -37, sr: 3.6 });
      plate(c, fnPath((q) => { q.moveTo(4.5, -38.5); q.quadraticCurveTo(13.5, -40, 13, -33); q.quadraticCurveTo(12.4, -30.2, 9.2, -30.4); q.quadraticCurveTo(5, -31, 4.5, -38.5); }), { sx: 10, sy: -38, sr: 5, gloss: [8.8, -37, 1.8, 0.8] });
    },
    helm(c, p) {
      const sw = (p.sway ?? 0) * 0.5;
      plume(c, -5.5, -56, 15, pr, 11, -2.2 + sw, -3.6 + sw, -0.5);
      plate(c, fnPath((q) => { q.moveTo(-9, -39.5); q.quadraticCurveTo(-11.4, -47, -9.6, -52.5); q.quadraticCurveTo(-9, -59.6, -5.6, -54.6); q.quadraticCurveTo(-3.6, -60.4, -1, -55.2); q.quadraticCurveTo(1.8, -60.4, 4.2, -55); q.quadraticCurveTo(7.6, -59.2, 9, -52.4); q.quadraticCurveTo(11.4, -46, 9.8, -39.5); q.quadraticCurveTo(0.4, -37.4, -9, -39.5); q.closePath(); }), { sx: 5, sy: -50, sr: 11.5, gloss: [5, -53.5, 2.6, 1.2] });
      c.strokeStyle = 'rgba(120,140,185,0.75)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-3.6, -55); c.quadraticCurveTo(-3, -52.5, -1.5, -51.5); c.moveTo(1.8, -55); c.quadraticCurveTo(1.2, -52.5, -0.4, -51.5); c.stroke();
      c.fillStyle = B.ink; c.fill(VANGUARD_VISOR);
    },
    glow(c, p, halo) { visorGlow(c, VANGUARD_VISOR, 4.5, -47, 18, halo, p.open ?? 1); },
  };
  const ranger: OrderArt = {
    id: 'ranger', name: 'Ranger', line: 'The bow of the Order, master of the interdental brush. Light and quick, built around the shot.', earned: 'When the Glutton is rinsed away: one of four Orders to choose.',
    stats: { health: 2, speed: 5, reach: 5, guard: 2 }, boot: KE.base, cuff: pr, knees: false, gauntlet: true, hands: { front: [16, -33.5], back: [4, -32] }, visor: [5, -49],
    cape: { color: B.cerise, edge: mix(B.cerise, '#000000', 0.2), width: 0.4 },
    back(c, p) {
      c.save(); c.translate(-7.5, -27 - p.lift); c.rotate(-0.6); c.fillStyle = dk; c.beginPath(); c.roundRect(-2.6, -12, 5.2, 18, 2); c.fill();
      [S.s, S.m, S.l].forEach((z, i) => idbRefill(c, -1.3 + i * 1.3, -11, 7, { col: z.col, angle: -0.1 + i * 0.1 })); c.restore();
      if (!p.game) { const sc = fnPath((q) => { q.moveTo(-4, -38); q.quadraticCurveTo(-14, -36, -22, -30); q.lineTo(-20, -27.5); q.quadraticCurveTo(-13, -32, -4, -35); q.closePath(); }); c.fillStyle = B.cerise; c.fill(sc); }
    },
    chest(c, p) {
      c.strokeStyle = B.ink2; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-6, -35); c.lineTo(6, -21); c.stroke();
      [S.s, S.m, S.l, S.m].forEach((z, i) => { c.fillStyle = z.col; c.beginPath(); c.roundRect(-4.6 + i * 3, -33.6 + i * 3.5, 2, 2.8, 0.6); c.fill(); });
      c.fillStyle = B.ink; c.fillRect(-7.4, -20.8, 14.8, 2.2);
      if (p.game && !p.aiming) idbHolder(c, -5.5, -17, 11, { angle: 0.25 }); // holstered at the hip
    },
    front(c, p) { if (!p.game || p.aiming) idbHolder(c, p.frontHand[0] + 5.5, p.frontHand[1] + 0.5, 22, { angle: Math.PI / 2, loaded: S.m.col }); },
    shoulders(c) {
      const m = fnPath((q) => { q.moveTo(-8.5, -38.5); q.quadraticCurveTo(-11.5, -33, -9.5, -29); for (let i = 0; i < 4; i++) q.quadraticCurveTo(-7.4 + i * 4.6, -26.4, -5 + i * 4.6, -29.2); q.quadraticCurveTo(11, -33, 8.4, -38.5); q.quadraticCurveTo(0, -41, -8.5, -38.5); q.closePath(); });
      c.fillStyle = B.orchid; c.save(); c.translate(0, 1.1); c.fill(m); c.restore(); c.fillStyle = pr; c.fill(m); c.save(); c.clip(m); c.fillStyle = dk; c.fillRect(-12, -40, 6, 14); c.restore();
    },
    helm(c) {
      plate(c, fnPath((q) => { q.moveTo(-7.5, -40); q.quadraticCurveTo(-10.5, -45, -15.5, -47.5); q.quadraticCurveTo(-12, -50, -9, -50.6); q.quadraticCurveTo(-6.5, -59.6, 1.5, -61); q.quadraticCurveTo(9, -57, 9.6, -48); q.quadraticCurveTo(10, -42, 7, -39.6); q.quadraticCurveTo(0, -38.4, -7.5, -40); q.closePath(); }), { sx: 4, sy: -49, sr: 10.5, gloss: [4.2, -55, 2.2, 1] });
      c.strokeStyle = 'rgba(120,140,185,0.75)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(1, -60); c.quadraticCurveTo(-3, -52, -9, -49.8); c.stroke();
      c.fillStyle = B.ink; c.fill(RANGER_SLIT);
    },
    glow(c, p, halo) { visorGlow(c, RANGER_SLIT, 5, -49, 16, halo, p.open ?? 1); if (!p.game || p.aiming) halo(c, p.frontHand[0] + 9, p.frontHand[1], 7, '#FFFFFF', 0.35); },
  };
  const duelist: OrderArt = {
    id: 'duelist', name: 'Duelist', line: 'The needle of the Order, master of the single tuft: one in each hand, fast precise jabs for the tight spots.', earned: 'When the Glutton is rinsed away: one of four Orders to choose.',
    stats: { health: 3, speed: 4, reach: 2, guard: 2 }, boot: KE.cloth, knees: true, gauntlet: true, hands: { front: [10.5, -26], back: [-4, -22] }, visor: [5, -45],
    cape: { color: dk, edge: pr, width: 0.8 },
    back(c, p) { if (p.game) return; const q = fnPath((q) => { q.moveTo(-6, -33); q.quadraticCurveTo(-15, -28, -17, -15); q.lineTo(-13, -16); q.lineTo(-11, -12); q.quadraticCurveTo(-8, -22, -2, -30); q.closePath(); }); c.fillStyle = dk; c.fill(q); c.strokeStyle = pr; c.lineWidth = 1.2; c.stroke(q); },
    offhand(c, p) { singleTuft(c, p.backHand[0], p.backHand[1] + 0.5, 30, -0.25, DUELIST_TUFTS.back[0], DUELIST_TUFTS.back[1]); },
    chest(c) {
      c.fillStyle = pr; c.beginPath(); c.moveTo(-8, -22); c.lineTo(8, -22); c.lineTo(9, -14); c.quadraticCurveTo(0, -12, -9, -14); c.closePath(); c.fill();
      plate(c, fnPath((q) => { q.moveTo(-8, -37); q.quadraticCurveTo(-10.5, -28, -7.5, -21); q.lineTo(7.5, -21); q.quadraticCurveTo(10.5, -28, 8, -37); q.quadraticCurveTo(0, -39.5, -8, -37); }), { sx: 3, sy: -32, sr: 9.5, gloss: [4, -33, 2, 1] });
      c.fillStyle = B.ink; c.fillRect(-8, -22.4, 16, 2.4); crownCap(c, 0, -20.2, 5, { cusps: 3 });
    },
    weapon(c, p) { singleTuft(c, p.frontHand[0], p.frontHand[1], 34, -0.95, DUELIST_TUFTS.front[0], DUELIST_TUFTS.front[1]); },
    shoulders(c) { plate(c, fnPath((q) => q.ellipse(6.5, -35.5, 4.4, 3.6, -0.3, 0, TAU)), { sx: 8, sy: -37, sr: 4, gloss: [6.5, -37, 1.4, 0.6] }); },
    helm(c) {
      plate(c, fnPath((q) => { q.moveTo(-11, -39.5); q.quadraticCurveTo(-13.5, -50, -10, -56); q.quadraticCurveTo(-8, -62, -4, -58); q.quadraticCurveTo(0.5, -60, 4.5, -58); q.quadraticCurveTo(9, -62, 10.6, -55.5); q.quadraticCurveTo(13.5, -49, 11, -39.5); q.quadraticCurveTo(0, -37, -11, -39.5); q.closePath(); }), { sx: 5, sy: -49, sr: 12.5, gloss: [5, -54, 2.6, 1.2] });
      c.fillStyle = B.ink; c.fill(DUELIST_SLIT);
    },
    glow(c, p, halo) { visorGlow(c, DUELIST_SLIT, 5, -45, 15, halo, p.open ?? 1); },
  };
  const lancer: OrderArt = {
    id: 'lancer', name: 'Lancer', line: 'The lance of the Order, master of the sonic brush. Heavy and steady: charges, pierces and holds the line.', earned: 'When the Glutton is rinsed away: one of four Orders to choose.',
    stats: { health: 5, speed: 2, reach: 4, guard: 5 }, boot: KE.cloth, knees: true, gauntlet: true, hands: { front: [12.5, -26.5], back: [1, -25.5] }, visor: [5, -46.5],
    cape: { color: dk, edge: dk, width: 1.1 },
    back(c, p) { if (p.game) return; const q = fnPath((q) => { q.moveTo(-6, -37); q.quadraticCurveTo(-15, -30, -16, -17); q.lineTo(-11, -19); q.lineTo(-9, -15); q.quadraticCurveTo(-6, -25, -1, -36); q.closePath(); }); c.fillStyle = dk; c.fill(q); },
    chest(c) {
      plate(c, fnPath((q) => { q.moveTo(-9, -37); q.quadraticCurveTo(-11, -28, -8, -19); q.lineTo(8, -19); q.quadraticCurveTo(11, -28, 9, -37); q.quadraticCurveTo(0, -39.5, -9, -37); }), { sx: 3, sy: -32, sr: 11, gloss: [4.5, -33.5, 2.2, 1] });
      c.fillStyle = pr; c.fillRect(-9.6, -30, 19.2, 5.4); c.fillStyle = '#FFFFFF'; c.fillRect(-9.6, -26, 19.2, 1.4); c.fillStyle = B.ink; c.fillRect(-8.6, -21, 17.2, 2.4);
    },
    weapon(c) { sonicLance(c, -2, -25, 52, -0.06); },
    shoulders(c) { for (const [sx, k] of [[-9, -1], [9, 1]] as V2[]) plate(c, fnPath((q) => q.ellipse(sx, -35.5, 5, 4.2, 0, 0, TAU)), k < 0 ? { base: KE.shade, shade: KE.deep, sx: sx + 1.5, sy: -37, sr: 4.5 } : { sx: sx + 1.5, sy: -37, sr: 4.8, gloss: [sx + 1, -37, 1.6, 0.8] }); },
    helm(c) {
      plume(c, 0.5, -55.5, 9, pr, 9, -2.1, -1.0, 0);
      plate(c, fnPath((q) => { q.moveTo(-9.5, -39.5); q.quadraticCurveTo(-11.5, -48, -9, -53); q.quadraticCurveTo(-6, -57.5, 0.5, -56.5); q.quadraticCurveTo(7, -57.5, 10, -53); q.quadraticCurveTo(12, -47, 10.4, -39.5); q.quadraticCurveTo(0.5, -37.2, -9.5, -39.5); q.closePath(); }), { sx: 5, sy: -48, sr: 11.5, gloss: [5, -53, 2.4, 1.1] });
      c.fillStyle = B.ink; c.fill(LANCER_VISOR);
    },
    glow(c, p, halo) { visorGlow(c, LANCER_VISOR, 5, -46.5, 16, halo, p.open ?? 1); if (!p.game) sonicLance(c, -2, -25, 52, -0.06, true, halo); },
  };
  return { initiate, vanguard, duelist, ranger, lancer };
}

/** A still pose for sheets and cards: planted stance, the Order's own hand positions. */
export function staticPose(art: OrderArt, lift = 0): RigPose {
  return { legA: -0.12, legB: 0.28, lift, headTilt: 0, backHand: art.hands.back, frontHand: art.hands.front, game: false };
}
