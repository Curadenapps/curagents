// BRISTLE drawing kit: procedural helpers in the house style.
//
// Every helper is a pure function `(ctx, x, y, size, opts)`:
// - draws only into `ctx`, and leaves its state exactly as it found it (save/restore);
// - is deterministic: any variation comes from `opts.seed`, never from Math.random, so a prop drawn
//   every frame does not flicker (pass `opts.time` for motion);
// - works in any transform (world units in game, CSS px in the style guide).
//
// House style in one breath: soft organic silhouettes built from quadratic curves, flat fills with
// one or two *stepped* (hard-edged) shade bands, a thin rim light on the side away from the key
// light, one small gloss highlight, hairline strokes only for fissures and folds. Glow is a separate
// pass: draw the `glow`/`emissive` parts on the emissive canvas.
import { material, brand, hero, biome, idb } from './tokens';
import { TAU, rgba, mix } from '../engine/math';

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------------------------
/** Small seeded PRNG (mulberry32), local so the kit has no state. */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 0x5460;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Closed smooth path through points (quadratic curves via midpoints). */
function smoothClosed(p: Path2D | Ctx, pts: [number, number][]) {
  const n = pts.length, mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
  p.closePath();
}
/** A wobbly ellipse outline as points. */
function blobPoints(x: number, y: number, rx: number, ry: number, wobble: number, seed: number, n = 14, flat = 0): [number, number][] {
  const r = rng(seed), out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, k = 1 + (r() - 0.5) * 2 * wobble;
    let py = y + Math.sin(a) * ry * k; if (flat > 0 && py > y + ry * (1 - flat)) py = y + ry * (1 - flat) + (py - (y + ry * (1 - flat))) * 0.25;
    out.push([x + Math.cos(a) * rx * k, py]);
  }
  return out;
}
const lightVec = (a: number) => [Math.cos(a), Math.sin(a)] as const;
/** Fill `shape` with a stepped shade: everything outside an ellipse pushed toward the light. */
function steppedShade(ctx: Ctx, shape: Path2D, cx: number, cy: number, rx: number, ry: number, la: number, push: number, grow: number, color: string) {
  const [lx, ly] = lightVec(la), cut = new Path2D();
  cut.rect(cx - rx * 4, cy - ry * 4, rx * 8, ry * 8);
  cut.ellipse(cx + lx * rx * push, cy + ly * ry * push, rx * grow, ry * grow, 0, 0, TAU);
  ctx.save(); ctx.clip(shape); ctx.fillStyle = color; ctx.fill(cut, 'evenodd'); ctx.restore();
}
/** Thin rim light along the edge facing away from the key light (the back light every actor gets). */
function rimLight(ctx: Ctx, shape: Path2D, cx: number, cy: number, rx: number, ry: number, la: number, color: string, width: number, alpha = 0.9) {
  const [lx, ly] = lightVec(la), keep = new Path2D();
  keep.rect(cx - rx * 4, cy - ry * 4, rx * 8, ry * 8);
  keep.ellipse(cx + lx * rx * 0.28, cy + ly * ry * 0.28, rx * 1.02, ry * 1.02, 0, 0, TAU);
  ctx.save(); ctx.clip(shape); ctx.clip(keep, 'evenodd');
  ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width * 2; ctx.stroke(shape); ctx.restore();
}
function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, alpha = 0.85, color = '#FFFFFF') {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); ctx.restore();
}
function radial(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.35, rgba(color, alpha * 0.55)); g.addColorStop(0.7, rgba(color, alpha * 0.15)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------------------------------------------------------------------------------------
// 1. Soft blob with rim light and stepped shade. The base of every creature and soft prop.
// ---------------------------------------------------------------------------------------------
export interface BlobOpts {
  color?: string; shade?: string; deep?: string; rim?: string; gloss?: string | null; stroke?: string | null;
  /** Key light direction in radians (default up-left). */
  light?: number; squash?: number; wobble?: number; seed?: number; flat?: number; points?: number;
}
/** size = radius. A soft body: base fill, two stepped shade bands, a back rim light, a gloss spot. */
export function blob(ctx: Ctx, x: number, y: number, size: number, o: BlobOpts = {}) {
  const color = o.color ?? material.plaque.glow, shade = o.shade ?? mix(color, '#0A1F44', 0.28), deep = o.deep ?? mix(color, '#0A1F44', 0.55);
  const la = o.light ?? -2.3, sq = o.squash ?? 1, rx = size * (2 - sq) ** 0.5, ry = size * sq ** 0.5;
  const shape = new Path2D(); smoothClosed(shape, blobPoints(x, y, rx, ry, o.wobble ?? 0.06, o.seed ?? 1, o.points ?? 14, o.flat ?? 0));
  ctx.save();
  ctx.fillStyle = color; ctx.fill(shape);
  steppedShade(ctx, shape, x, y, rx, ry, la, 0.32, 1.0, shade);
  steppedShade(ctx, shape, x, y, rx, ry, la, 0.12, 1.12, deep);
  rimLight(ctx, shape, x, y, rx, ry, la, o.rim ?? mix(color, '#FFFFFF', 0.55), Math.max(0.6, size * 0.05), 0.8);
  if (o.gloss !== null) { const [lx, ly] = lightVec(la); gloss(ctx, x + lx * rx * 0.45, y + ly * ry * 0.5, rx * 0.2, ry * 0.11, la + Math.PI / 2 + 0.4, 0.8, o.gloss ?? '#FFFFFF'); }
  if (o.stroke) { ctx.lineWidth = Math.max(0.6, size * 0.03); ctx.strokeStyle = o.stroke; ctx.stroke(shape); }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 2. Enamel surface: a tooth tower, a slab or a molar block, with fissures and a highlight.
// ---------------------------------------------------------------------------------------------
export interface EnamelOpts {
  shape?: 'tower' | 'slab' | 'molar'; height?: number; cusps?: number; seed?: number;
  hi?: string; base?: string; shade?: string; deep?: string; fissure?: string; light?: 'left' | 'right';
}
/** size = width. x,y = bottom centre. Towers taper into the gum; slabs are ledges; molars are squat. */
export function enamel(ctx: Ctx, x: number, y: number, size: number, o: EnamelOpts = {}) {
  const E = material.enamel, shape = o.shape ?? 'tower', r = rng(o.seed ?? 7);
  const w = size, h = o.height ?? (shape === 'slab' ? size * 0.28 : shape === 'molar' ? size * 0.9 : size * 1.9);
  const cusps = o.cusps ?? (shape === 'molar' ? 3 : shape === 'tower' ? 2 : 0), side = o.light === 'right' ? 1 : -1;
  const top = y - h, p = new Path2D();
  if (shape === 'slab') {
    p.roundRect(x - w / 2, top, w, h, Math.min(h * 0.45, 8));
  } else {
    const neck = shape === 'tower' ? 0.36 : 0.42, bulge = shape === 'tower' ? 0.04 : 0.06;
    p.moveTo(x - w * neck, y);
    p.bezierCurveTo(x - w * (0.5 + bulge), y - h * 0.35, x - w * (0.52 + bulge), top + h * 0.3, x - w * 0.47, top + h * 0.1);
    const cw = (w * 0.94) / cusps;
    for (let i = 0; i < cusps; i++) {
      const cx0 = x - w * 0.47 + i * cw, peak = top - (shape === 'molar' ? h * 0.05 : h * 0.03) * (0.6 + r() * 0.8);
      p.quadraticCurveTo(cx0 + cw * 0.1, peak, cx0 + cw * 0.5, peak + h * 0.005);
      p.quadraticCurveTo(cx0 + cw * 0.9, peak, cx0 + cw, top + h * (i === cusps - 1 ? 0.1 : 0.06));
    }
    p.bezierCurveTo(x + w * (0.52 + bulge), top + h * 0.3, x + w * (0.5 + bulge), y - h * 0.35, x + w * neck, y);
    p.closePath();
  }
  ctx.save();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  const hi = o.hi ?? E.hi, base = o.base ?? E.base, shade = o.shade ?? E.shade, deep = o.deep ?? E.deep;
  if (side < 0) { g.addColorStop(0, base); g.addColorStop(0.35, hi); g.addColorStop(0.7, base); g.addColorStop(1, shade); }
  else { g.addColorStop(0, shade); g.addColorStop(0.3, base); g.addColorStop(0.65, hi); g.addColorStop(1, base); }
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  // stepped side shade, then a deep band at the neck (where the tooth meets the gum)
  ctx.fillStyle = shade; ctx.beginPath();
  const sx = x - side * w * 0.5;
  ctx.moveTo(sx, top - 4); ctx.quadraticCurveTo(x - side * w * 0.2, top + h * 0.5, sx + side * w * 0.04, y + 4); ctx.lineTo(sx - side * w, y + 4); ctx.lineTo(sx - side * w, top - 4); ctx.closePath(); ctx.fill();
  if (shape !== 'slab') { const ng = ctx.createLinearGradient(0, y - h * 0.22, 0, y); ng.addColorStop(0, rgba(deep, 0)); ng.addColorStop(1, rgba(deep, 0.7)); ctx.fillStyle = ng; ctx.fillRect(x - w, y - h * 0.22, w * 2, h * 0.22 + 1); }
  // perikymata: faint horizontal growth lines
  ctx.strokeStyle = rgba(o.fissure ?? E.fissure, 0.35); ctx.lineWidth = Math.max(0.4, w * 0.006);
  const lines = shape === 'slab' ? 0 : 5;
  for (let i = 1; i <= lines; i++) { const ly = top + h * (0.2 + i * 0.12); ctx.beginPath(); ctx.moveTo(x - w * 0.45, ly); ctx.quadraticCurveTo(x, ly + h * 0.02, x + w * 0.45, ly - h * 0.01); ctx.stroke(); }
  // fissures: from the valleys between cusps (or across slabs) in a soft zigzag
  ctx.strokeStyle = o.fissure ?? E.stroke; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, w * 0.014);
  const fissures = shape === 'slab' ? 2 : Math.max(1, cusps - 1);
  for (let i = 0; i < fissures; i++) {
    let fx = shape === 'slab' ? x - w * 0.3 + i * w * 0.45 + r() * w * 0.1 : x - w * 0.47 + (i + 1) * ((w * 0.94) / cusps), fy = shape === 'slab' ? top + h * 0.25 : top + h * 0.04;
    ctx.beginPath(); ctx.moveTo(fx, fy);
    const steps = shape === 'slab' ? 2 : 3, len = shape === 'slab' ? h * 0.55 : h * 0.26;
    for (let s = 0; s < steps; s++) { const nx = fx + (r() - 0.5) * w * 0.08, ny = fy + len / steps; ctx.quadraticCurveTo(fx + (r() - 0.5) * w * 0.06, fy + len / steps / 2, nx, ny); fx = nx; fy = ny; }
    ctx.stroke();
  }
  // glaze streak and gloss spot on the lit side
  const gx = x + side * w * 0.22;
  ctx.globalAlpha = 0.7; ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
  if (shape === 'slab') ctx.roundRect(x - w * 0.42, top + h * 0.18, w * 0.84, Math.max(1.2, h * 0.14), h * 0.07);
  else ctx.ellipse(gx, top + h * 0.38, w * 0.045, h * 0.2, side * -0.06, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.95; gloss(ctx, gx + side * w * 0.03, top + h * (shape === 'slab' ? 0.3 : 0.13), w * 0.06, Math.min(h * 0.05, w * 0.035), side * 0.5, 1);
  ctx.restore();
  ctx.lineWidth = Math.max(0.6, w * 0.012); ctx.strokeStyle = rgba(E.stroke, 0.8); ctx.stroke(p);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 3. Gum / flesh fold: scalloped gumline with soft folds below.
// ---------------------------------------------------------------------------------------------
export interface FoldOpts { width?: number; scallops?: number; folds?: number; seed?: number; palette?: 'gum' | 'cheek' | 'tongue' | 'calculus'; time?: number }
/** x,y = top centre of the band, size = band height. Scallops peak between teeth (interdental papillae). */
export function gumFold(ctx: Ctx, x: number, y: number, size: number, o: FoldOpts = {}) {
  const G = material.gum, F = material.flesh, T = material.tartar, pal = o.palette ?? 'gum';
  const ramp = pal === 'cheek' ? [F.ridge, F.cheek, F.cheekShade, G.deep] : pal === 'tongue' ? [F.papilla, F.tongue, F.tongueShade, G.deep]
    : pal === 'calculus' ? [T.crust, T.base, T.shade, T.deep] : [G.light, G.base, G.shade, G.deep];
  const w = o.width ?? size * 4, n = o.scallops ?? Math.max(1, Math.round(w / (size * 1.1))), folds = o.folds ?? 3, r = rng(o.seed ?? 3), t = o.time ?? 0;
  const x0 = x - w / 2, sw = w / n, lip = size * 0.22;
  ctx.save();
  // the body
  const body = new Path2D(); body.moveTo(x0, y + size);
  body.lineTo(x0, y);
  for (let i = 0; i < n; i++) { const a = x0 + i * sw; body.quadraticCurveTo(a + sw * 0.08, y + lip * 1.4, a + sw * 0.5, y + lip * 1.45); body.quadraticCurveTo(a + sw * 0.92, y + lip * 1.4, a + sw, y); }
  body.lineTo(x0 + w, y + size); body.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + size); g.addColorStop(0, ramp[1]); g.addColorStop(0.55, ramp[2]); g.addColorStop(1, ramp[3]);
  ctx.fillStyle = g; ctx.fill(body);
  ctx.clip(body);
  // folds: stacked soft lobes, each with a lit lip and a stepped shadow under it
  for (let f = 0; f < folds; f++) {
    const fy = y + lip * 1.5 + (f + 0.6) * ((size - lip * 1.5) / (folds + 0.4)), amp = size * 0.07, k = 1 - f / (folds + 1);
    const segs = Math.max(2, Math.round(w / (size * 0.9))), sx = w / segs, ph = r() * TAU;
    const path = new Path2D(); path.moveTo(x0 - 2, fy);
    for (let i = 0; i < segs; i++) { const a = x0 + i * sx, wob = Math.sin(ph + i * 1.7 + t * 0.6) * amp; path.quadraticCurveTo(a + sx * 0.5, fy - amp * 1.6 + wob, a + sx, fy + wob * 0.3); }
    ctx.strokeStyle = rgba(ramp[3], 0.45 * k + 0.15); ctx.lineWidth = Math.max(1, size * 0.07); ctx.save(); ctx.translate(0, size * 0.05); ctx.stroke(path); ctx.restore();
    ctx.strokeStyle = rgba(ramp[0], 0.55 * k); ctx.lineWidth = Math.max(0.6, size * 0.025); ctx.stroke(path);
  }
  // the gumline lip: a light rim along the scallops
  ctx.restore(); ctx.save();
  ctx.beginPath(); ctx.moveTo(x0, y);
  for (let i = 0; i < n; i++) { const a = x0 + i * sw; ctx.quadraticCurveTo(a + sw * 0.08, y + lip * 1.4, a + sw * 0.5, y + lip * 1.45); ctx.quadraticCurveTo(a + sw * 0.92, y + lip * 1.4, a + sw, y); }
  ctx.strokeStyle = ramp[0]; ctx.lineWidth = Math.max(1, size * 0.06); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = rgba('#FFFFFF', 0.45); ctx.lineWidth = Math.max(0.5, size * 0.018); ctx.stroke();
  // papilla tips catch the light
  for (let i = 0; i <= n; i++) gloss(ctx, x0 + i * sw, y + lip * 0.25, size * 0.05, size * 0.025, 0, 0.6);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 4. Glowing eye. Draw the socket on the scene and the glow on the emissive canvas (mode).
// ---------------------------------------------------------------------------------------------
export interface EyeOpts { color?: string; look?: [number, number]; blink?: number; shape?: 'round' | 'almond' | 'slit'; mode?: 'scene' | 'glow' | 'both'; halo?: number; socket?: string }
/** size = eye radius. Friendly creatures: round. Plaque: almond. Tartar: slit, low and heavy-lidded. */
export function glowEye(ctx: Ctx, x: number, y: number, size: number, o: EyeOpts = {}) {
  const color = o.color ?? brand.yellow, mode = o.mode ?? 'both', [lx, ly] = o.look ?? [0, 0], open = 1 - Math.min(1, Math.max(0, o.blink ?? 0));
  const ry = size * (o.shape === 'slit' ? 0.45 : o.shape === 'almond' ? 0.72 : 1) * Math.max(0.08, open);
  ctx.save();
  const eye = new Path2D();
  if (o.shape === 'almond' || o.shape === 'slit') { eye.moveTo(x - size, y); eye.quadraticCurveTo(x, y - ry * 2, x + size, y); eye.quadraticCurveTo(x, y + ry * 1.5, x - size, y); eye.closePath(); }
  else eye.ellipse(x, y, size, ry, 0, 0, TAU);
  if (mode !== 'glow') { ctx.fillStyle = o.socket ?? '#0A1F44'; ctx.beginPath(); ctx.ellipse(x, y + size * 0.1, size * 1.3, ry * 1.25 + size * 0.15, 0, 0, TAU); ctx.fill(); }
  if (mode !== 'scene') radial(ctx, x, y, size * 4.2, color, o.halo ?? 0.5);
  ctx.fillStyle = color; ctx.fill(eye);
  ctx.save(); ctx.clip(eye);
  ctx.fillStyle = mix(color, '#FFFFFF', 0.6); ctx.beginPath(); ctx.ellipse(x - size * 0.15, y - ry * 0.35, size * 0.7, ry * 0.45, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0A1F44'; ctx.beginPath(); ctx.ellipse(x + lx * size * 0.35, y + ly * ry * 0.3, size * (o.shape === 'slit' ? 0.18 : 0.38), ry * 0.62, 0, 0, TAU); ctx.fill();
  ctx.restore();
  if (open > 0.3) gloss(ctx, x + lx * size * 0.35 - size * 0.2, y + ly * ry * 0.3 - ry * 0.3, size * 0.16, size * 0.16, 0, 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 5. Crown cap: the molar-crown motif (the hero's helm; calcified crowns on tartar creatures).
// ---------------------------------------------------------------------------------------------
export interface CrownOpts { cusps?: number; calcified?: boolean; light?: number; seed?: number; base?: string; shade?: string; stroke?: string; tilt?: number }
/** size = width; x,y = bottom centre. Cusps 2 = the hero helm, 3-4 = molars and royalty. */
export function crownCap(ctx: Ctx, x: number, y: number, size: number, o: CrownOpts = {}) {
  const calc = !!o.calcified, E = material.enamel, T = material.tartar, r = rng(o.seed ?? 11);
  const base = o.base ?? (calc ? T.base : E.base), shade = o.shade ?? (calc ? T.shade : E.shade), stroke = o.stroke ?? (calc ? T.deep : E.stroke);
  const n = o.cusps ?? 3, w = size, h = size * 0.72, top = y - h, la = o.light ?? -2.2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt ?? 0); ctx.translate(-x, -y);
  const p = new Path2D();
  p.moveTo(x - w * 0.48, y - h * 0.12);
  p.quadraticCurveTo(x - w * 0.56, top + h * 0.35, x - w * 0.4, top + h * 0.08);
  const cw = (w * 0.8) / n;
  for (let i = 0; i < n; i++) {
    const cx0 = x - w * 0.4 + i * cw, peak = top - h * (0.12 + r() * 0.06);
    p.quadraticCurveTo(cx0 + cw * 0.15, peak, cx0 + cw * 0.5, peak + h * 0.02);
    p.quadraticCurveTo(cx0 + cw * 0.85, peak, cx0 + cw, top + h * (i === n - 1 ? 0.08 : 0.12));
  }
  p.quadraticCurveTo(x + w * 0.56, top + h * 0.35, x + w * 0.48, y - h * 0.12);
  p.quadraticCurveTo(x + w * 0.44, y + h * 0.04, x, y + h * 0.06);
  p.quadraticCurveTo(x - w * 0.44, y + h * 0.04, x - w * 0.48, y - h * 0.12);
  p.closePath();
  ctx.fillStyle = base; ctx.fill(p);
  steppedShade(ctx, p, x, y - h * 0.45, w * 0.55, h * 0.7, la, 0.35, 1.0, shade);
  ctx.save(); ctx.clip(p);
  if (calc) {
    // strata: layered deposits, matte; lime glints where plaque is still alive
    ctx.strokeStyle = rgba(T.hi, 0.35); ctx.lineWidth = Math.max(0.6, w * 0.016);
    for (let i = 1; i < 3; i++) { const sy = top + h * (0.3 + i * 0.22); ctx.beginPath(); ctx.moveTo(x - w * 0.6, sy); ctx.bezierCurveTo(x - w * 0.2, sy - h * (0.05 + r() * 0.06), x + w * 0.2, sy + h * (0.02 + r() * 0.05), x + w * 0.6, sy - h * 0.03); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = rgba(T.vein, 0.85); ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * w * 0.6, top + h * (0.35 + r() * 0.45), w * 0.025, w * 0.018, 0, 0, TAU); ctx.fill(); }
  } else {
    // central fissure between the cusps, the occlusal "smile"
    ctx.strokeStyle = rgba(E.stroke, 0.7); ctx.lineWidth = Math.max(0.5, w * 0.018); ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) { const fx = x - w * 0.4 + i * cw; ctx.beginPath(); ctx.moveTo(fx, top + h * 0.14); ctx.quadraticCurveTo(fx + w * 0.02, top + h * 0.3, fx - w * 0.01, top + h * 0.42); ctx.stroke(); }
  }
  ctx.restore();
  // calcified crowns get crust nodules around their silhouette
  if (calc) for (let i = 0; i < 4; i++) { const a = -Math.PI * (0.82 - i * 0.21), bx = x + Math.cos(a) * w * 0.42, by = top + h * 0.38 + Math.sin(a) * h * 0.5; blob(ctx, bx, by, w * (0.035 + r() * 0.025), { color: T.bone, shade: T.base, deep: T.shade, gloss: null, seed: i + 3, wobble: 0.15 }); }
  rimLight(ctx, p, x, y - h * 0.45, w * 0.55, h * 0.7, la, calc ? T.hi : '#FFFFFF', Math.max(0.6, w * 0.025), 0.9);
  const [lx, ly] = lightVec(la); gloss(ctx, x + lx * w * 0.2, top + h * 0.28 + ly * h * 0.05, w * 0.11, w * 0.05, -0.3, calc ? 0.35 : 0.85);
  ctx.lineWidth = Math.max(0.6, w * 0.025); ctx.strokeStyle = stroke; ctx.stroke(p);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 6. Foam bubble cluster (paste foam, rinse, fountain froth).
// ---------------------------------------------------------------------------------------------
export interface FoamOpts { count?: number; seed?: number; color?: string; tint?: string; spread?: number; time?: number }
/** size = cluster radius. A dome of bubbles, big in the middle, small at the edge. */
export function foamCluster(ctx: Ctx, x: number, y: number, size: number, o: FoamOpts = {}) {
  const r = rng(o.seed ?? 5), n = o.count ?? 16, white = o.color ?? material.foam.white, tint = o.tint ?? material.foam.sky, t = o.time ?? 0;
  const bubbles: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.05 + r() * 0.9), d = Math.sqrt(r()) * size * (o.spread ?? 1), bob = Math.sin(t * 2 + i) * size * 0.015;
    bubbles.push([x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d * 0.75 + bob, size * (0.14 + 0.3 * (1 - d / size) * (0.5 + r() * 0.5))]);
  }
  bubbles.sort((a, b) => b[2] - a[2]);
  ctx.save();
  for (const [bx, by, br] of bubbles) {
    const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br);
    g.addColorStop(0, rgba(white, 0.95)); g.addColorStop(0.6, rgba(mix(white, tint, 0.35), 0.75)); g.addColorStop(1, rgba(tint, 0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(white, 0.95); ctx.lineWidth = Math.max(0.5, br * 0.08); ctx.stroke();
    ctx.strokeStyle = rgba(tint, 0.9); ctx.lineWidth = Math.max(0.4, br * 0.06); ctx.beginPath(); ctx.arc(bx, by, br * 0.86, 0.2, 1.4); ctx.stroke();
    gloss(ctx, bx - br * 0.35, by - br * 0.4, br * 0.22, br * 0.13, -0.6, 0.95);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 7. Crystal shard (sugar crystals; tinted, the boss's tartar spines).
// ---------------------------------------------------------------------------------------------
export interface ShardOpts { angle?: number; width?: number; seed?: number; hi?: string; lit?: string; dark?: string; core?: string; glow?: boolean; cluster?: number }
/** size = length; x,y = base. Two facets (lit and dark), a ridge, a bright tip. */
export function crystalShard(ctx: Ctx, x: number, y: number, size: number, o: ShardOpts = {}) {
  const S = material.sugar, r = rng(o.seed ?? 9), count = o.cluster ?? 1;
  ctx.save();
  for (let c = 0; c < count; c++) {
    const ang = (o.angle ?? 0) + (count > 1 ? (c - (count - 1) / 2) * 0.42 + (r() - 0.5) * 0.15 : 0);
    const len = size * (count > 1 ? (c === Math.floor(count / 2) ? 1 : 0.55 + r() * 0.3) : 1), w = (o.width ?? 0.3) * len;
    ctx.save(); ctx.translate(x + (count > 1 ? (c - (count - 1) / 2) * w * 0.35 : 0), y); ctx.rotate(ang);
    const tipX = (r() - 0.5) * w * 0.12;
    if (o.glow !== false) { ctx.globalCompositeOperation = 'lighter'; radial(ctx, 0, -len * 0.5, len * 0.65, o.core ?? S.glow, 0.18); ctx.globalCompositeOperation = 'source-over'; }
    // left (lit) facet
    ctx.fillStyle = o.lit ?? S.crystal; ctx.beginPath(); ctx.moveTo(-w / 2 * 0.85, 0); ctx.lineTo(-w / 2, -len * 0.68); ctx.lineTo(tipX, -len); ctx.lineTo(0, -len * 0.62); ctx.lineTo(w * 0.04, 0); ctx.closePath(); ctx.fill();
    // right (dark) facet
    ctx.fillStyle = o.dark ?? S.facet; ctx.beginPath(); ctx.moveTo(w * 0.04, 0); ctx.lineTo(0, -len * 0.62); ctx.lineTo(tipX, -len); ctx.lineTo(w / 2, -len * 0.68); ctx.lineTo(w / 2 * 0.85, 0); ctx.closePath(); ctx.fill();
    // inner core
    const cg = ctx.createLinearGradient(0, 0, 0, -len); cg.addColorStop(0, rgba(o.core ?? S.syrup, 0.7)); cg.addColorStop(0.7, rgba(o.core ?? S.syrup, 0)); ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(-w * 0.22, 0); ctx.lineTo(-w * 0.05, -len * 0.7); ctx.lineTo(w * 0.15, 0); ctx.closePath(); ctx.fill();
    // ridge and tip
    ctx.strokeStyle = rgba(o.hi ?? S.hi, 0.95); ctx.lineWidth = Math.max(0.5, w * 0.05); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-w / 2, -len * 0.68); ctx.lineTo(tipX, -len); ctx.lineTo(0, -len * 0.62); ctx.stroke();
    gloss(ctx, -w * 0.22, -len * 0.55, w * 0.06, len * 0.1, 0.12, 0.9, o.hi ?? S.hi);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 8. Light shaft: a soft beam from a gap above (between teeth, through the lips).
// ---------------------------------------------------------------------------------------------
export interface ShaftOpts { angle?: number; width?: number; spread?: number; color?: string; alpha?: number; additive?: boolean; time?: number; motes?: number; seed?: number }
/** size = length; x,y = source. Draw on the scene (soft) or the emissive canvas (glowing). */
export function lightShaft(ctx: Ctx, x: number, y: number, size: number, o: ShaftOpts = {}) {
  const ang = o.angle ?? 0.18, w0 = o.width ?? size * 0.16, w1 = w0 * (o.spread ?? 2.6), color = o.color ?? brand.sky, a = o.alpha ?? 0.35, t = o.time ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  if (o.additive !== false) ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.28, flick = 1 + Math.sin(t * 0.7 + i * 2) * 0.06;
    const g = ctx.createLinearGradient(0, 0, 0, size); g.addColorStop(0, rgba(color, a * 0.5 * flick)); g.addColorStop(0.35, rgba(color, a * 0.32 * flick)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w0 / 2 * k, 0); ctx.lineTo(w0 / 2 * k, 0); ctx.lineTo(w1 / 2 * k, size); ctx.lineTo(-w1 / 2 * k, size); ctx.closePath(); ctx.fill();
  }
  // dust motes drifting in the beam
  const r = rng(o.seed ?? 2), motes = o.motes ?? 10;
  for (let i = 0; i < motes; i++) {
    const v = (r() + t * 0.04 * (0.5 + r())) % 1, my = v * size, half = (w0 + (w1 - w0) * v) / 2, mx = (r() - 0.5) * 2 * half * 0.8 + Math.sin(t + i) * 2;
    ctx.fillStyle = rgba('#FFFFFF', a * 1.6 * (1 - v)); ctx.beginPath(); ctx.arc(mx, my, Math.max(0.5, size * 0.006), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 9. Fog band: a horizontal haze layer between parallax planes.
// ---------------------------------------------------------------------------------------------
export interface FogOpts { width?: number; color?: string; alpha?: number; seed?: number; time?: number; layers?: number }
/** size = band height; x,y = band centre. Wavy top and bottom, transparent edges. */
export function fogBand(ctx: Ctx, x: number, y: number, size: number, o: FogOpts = {}) {
  const w = o.width ?? size * 8, color = o.color ?? brand.sky, a = o.alpha ?? 0.22, t = o.time ?? 0, r = rng(o.seed ?? 4), layers = o.layers ?? 3;
  ctx.save();
  for (let l = 0; l < layers; l++) {
    const ph = r() * TAU, sp = (0.15 + r() * 0.2) * (l % 2 ? -1 : 1), dy = (l - (layers - 1) / 2) * size * 0.18, hh = size * (0.5 - l * 0.08);
    const g = ctx.createLinearGradient(0, y + dy - hh, 0, y + dy + hh);
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a * (1 - l * 0.2))); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath();
    const seg = 24, x0 = x - w / 2;
    ctx.moveTo(x0, y + dy + hh);
    for (let i = 0; i <= seg; i++) { const px = x0 + (i / seg) * w; ctx.lineTo(px, y + dy - hh + Math.sin(ph + i * 0.55 + t * sp) * hh * 0.35 + Math.sin(ph * 2 + i * 1.3) * hh * 0.12); }
    ctx.lineTo(x0 + w, y + dy + hh); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// 10. Extras the client direction asks for: the brush, a paste dollop, palate, tongue, saliva.
// ---------------------------------------------------------------------------------------------
export interface BrushOpts { angle?: number; handle?: string; filament?: string; neck?: string; tufts?: number }
/** size = total length; x,y = handle end. CS 5460 style: slim octagonal handle, compact head, dense fine filaments. */
export function brush(ctx: Ctx, x: number, y: number, size: number, o: BrushOpts = {}) {
  const handle = o.handle ?? brand.blue, fil = o.filament ?? hero.brush.filament, L = size, th = L * 0.045;
  const hL = L * 0.6, nL = L * 0.22, headL = L * 0.18, headH = th * 1.05;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.angle ?? 0);
  // handle: octagonal reads as three flat facets (top light, face, bottom shade), tapering slightly
  const facet = (y0: number, h: number, col: string) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y0 * 0.92); ctx.lineTo(hL, y0); ctx.lineTo(hL, y0 + h); ctx.lineTo(0, (y0 + h) * 0.92); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.beginPath(); ctx.roundRect(-th * 0.2, -th * 0.55, hL + th * 0.2, th * 1.1, th * 0.45); ctx.clip();
  facet(-th * 0.55, th * 1.1, handle);
  facet(-th * 0.55, th * 0.3, mix(handle, '#FFFFFF', 0.35));
  facet(th * 0.25, th * 0.3, mix(handle, '#000000', 0.3));
  ctx.fillStyle = rgba('#FFFFFF', 0.55); ctx.fillRect(th * 0.6, -th * 0.42, hL * 0.55, th * 0.09);
  ctx.restore();
  // neck: slim, tapering, slightly translucent
  ctx.fillStyle = mix(handle, '#FFFFFF', 0.12); ctx.beginPath(); ctx.moveTo(hL - 1, -th * 0.5); ctx.quadraticCurveTo(hL + nL * 0.5, -th * 0.28, hL + nL, -th * 0.22); ctx.lineTo(hL + nL, th * 0.24); ctx.quadraticCurveTo(hL + nL * 0.5, th * 0.32, hL - 1, th * 0.5); ctx.closePath(); ctx.fill();
  // head: compact, rounded
  const hx = hL + nL;
  ctx.fillStyle = handle; ctx.beginPath(); ctx.roundRect(hx - th * 0.1, -headH * 0.15, headL, headH * 0.55, headH * 0.25); ctx.fill();
  ctx.fillStyle = rgba('#FFFFFF', 0.35); ctx.fillRect(hx + th * 0.2, -headH * 0.1, headL * 0.7, headH * 0.1);
  // filaments: dense, fine, a flat trimmed field rising off the head
  const n = o.tufts ?? Math.max(16, Math.round(headL / 0.9)), fh = headH * 1.55;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const fx = hx + headL * 0.06 + (i / (n - 1)) * headL * 0.88, edge = Math.min(i, n - 1 - i) / 3, hk = Math.min(1, 0.8 + edge * 0.2);
    ctx.strokeStyle = i % 2 ? fil : mix(fil, '#9FB4D9', 0.25); ctx.lineWidth = Math.max(0.35, headL / n * 0.75);
    ctx.beginPath(); ctx.moveTo(fx, -headH * 0.12); ctx.lineTo(fx, -headH * 0.12 - fh * hk); ctx.stroke();
  }
  ctx.fillStyle = rgba('#FFFFFF', 0.9); ctx.fillRect(hx + headL * 0.06, -headH * 0.12 - fh - 0.4, headL * 0.88, Math.max(0.6, fh * 0.08));
  ctx.restore();
}

/** size = width; x,y = bottom centre. A glossy swirl of CURAPROX paste with a brand stripe (the hero's throw). */
export function pasteDollop(ctx: Ctx, x: number, y: number, size: number, o: { stripe?: string; stripe2?: string; tilt?: number } = {}) {
  const Pm = material.paste, w = size;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt ?? 0);
  const tiers = [[0, w * 0.5, w * 0.2], [-w * 0.22, w * 0.38, w * 0.17], [-w * 0.4, w * 0.25, w * 0.14]] as const;
  tiers.forEach(([ty, rx, ry], i) => {
    const shape = new Path2D(); shape.ellipse(0, ty - ry, rx, ry, 0, 0, TAU);
    ctx.fillStyle = Pm.base; ctx.fill(shape);
    steppedShade(ctx, shape, 0, ty - ry, rx, ry, -2.0, 0.3, 1.0, Pm.shade);
    ctx.save(); ctx.clip(shape); ctx.strokeStyle = i % 2 ? (o.stripe2 ?? Pm.stripe2) : (o.stripe ?? Pm.stripe); ctx.lineWidth = ry * 0.42;
    ctx.beginPath(); ctx.moveTo(-rx, ty - ry * 0.9); ctx.quadraticCurveTo(0, ty - ry * 0.1, rx, ty - ry * 1.3); ctx.stroke(); ctx.restore();
    gloss(ctx, -rx * 0.35, ty - ry * 1.45, rx * 0.25, ry * 0.18, -0.2, 0.95);
  });
  // curl on top
  ctx.fillStyle = Pm.base; ctx.beginPath(); ctx.moveTo(-w * 0.1, -w * 0.62); ctx.quadraticCurveTo(w * 0.05, -w * 0.85, w * 0.16, -w * 0.78); ctx.quadraticCurveTo(w * 0.04, -w * 0.72, w * 0.1, -w * 0.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** size = band height; x,y = centre. The palate seen as a ceiling: a soft vault whose rugae hang down as
 *  rounded ridges, each with a lit lip, a stepped shadow and fine transverse lines. */
export function palateRidges(ctx: Ctx, x: number, y: number, size: number, o: { width?: number; ridges?: number; seed?: number; time?: number } = {}) {
  const F = material.flesh, w = o.width ?? size * 4, n = o.ridges ?? 5, r = rng(o.seed ?? 6), x0 = x - w / 2, y0 = y - size / 2;
  const bumps: [number, number, number][] = []; let px = x0;
  for (let i = 0; i < n; i++) { const bw = (w / n) * (0.75 + r() * 0.5); bumps.push([px, Math.min(x0 + w, px + bw), size * (0.62 + r() * 0.3)]); px += bw; }
  bumps[bumps.length - 1][1] = x0 + w;
  const outline = (p: Path2D | Ctx, grow = 0) => { p.moveTo(x0, y0); p.lineTo(x0, y0 + size * 0.5); for (const [a, b, d] of bumps) p.bezierCurveTo(a + (b - a) * 0.08, y0 + d + grow, b - (b - a) * 0.08, y0 + d + grow, b, y0 + size * 0.5); p.lineTo(x0 + w, y0); p.closePath(); };
  ctx.save();
  const shadow = new Path2D(); outline(shadow, size * 0.08); ctx.fillStyle = rgba(F.ridgeShade, 0.55); ctx.fill(shadow);
  const body = new Path2D(); outline(body);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + size); g.addColorStop(0, F.ridgeShade); g.addColorStop(0.45, F.palate); g.addColorStop(1, F.ridge);
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  for (const [a, b, d] of bumps) {
    // stepped shade on the right flank of each ridge, transverse lines across it
    ctx.fillStyle = rgba(F.ridgeShade, 0.45); ctx.beginPath(); ctx.ellipse(b - (b - a) * 0.12, y0 + d * 0.62, (b - a) * 0.2, d * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(F.ridgeShade, 0.4); ctx.lineWidth = Math.max(0.6, size * 0.025);
    for (let k = 1; k <= 3; k++) { const ly = y0 + d * (0.25 + k * 0.17); ctx.beginPath(); ctx.moveTo(a + (b - a) * 0.15, ly); ctx.quadraticCurveTo((a + b) / 2, ly + size * 0.06, b - (b - a) * 0.2, ly - size * 0.02); ctx.stroke(); }
  }
  ctx.restore();
  // lit lip along the hanging edge
  const lip = new Path2D(); lip.moveTo(x0, y0 + size * 0.5); for (const [a, b, d] of bumps) lip.bezierCurveTo(a + (b - a) * 0.08, y0 + d, b - (b - a) * 0.08, y0 + d, b, y0 + size * 0.5);
  ctx.strokeStyle = rgba('#FFFFFF', 0.55); ctx.lineWidth = Math.max(0.8, size * 0.035); ctx.lineCap = 'round'; ctx.stroke(lip);
  for (const [a, b, d] of bumps) gloss(ctx, a + (b - a) * 0.38, y0 + d * 0.82, (b - a) * 0.12, size * 0.035, 0, 0.6);
  ctx.restore();
}

/** size = band height; x,y = top centre. Tongue landscape: soft rolling dome, papillae, a centre groove. */
export function tongueSurface(ctx: Ctx, x: number, y: number, size: number, o: { width?: number; seed?: number; humps?: number } = {}) {
  const F = material.flesh, w = o.width ?? size * 4, r = rng(o.seed ?? 8), x0 = x - w / 2, humps = o.humps ?? 3;
  ctx.save();
  const body = new Path2D(); body.moveTo(x0, y + size); body.lineTo(x0, y + size * 0.25);
  for (let i = 0; i < humps; i++) { const a = x0 + (i / humps) * w, b = a + w / humps; body.quadraticCurveTo((a + b) / 2, y - size * (0.08 + r() * 0.08), b, y + size * 0.22 + (i === humps - 1 ? 0.03 : 0) * size); }
  body.lineTo(x0 + w, y + size); body.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + size); g.addColorStop(0, F.papilla); g.addColorStop(0.18, F.tongue); g.addColorStop(1, F.tongueShade);
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // median groove
  ctx.strokeStyle = rgba(F.tongueShade, 0.8); ctx.lineWidth = size * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + size * 0.05, y + size * 0.5, x, y + size); ctx.stroke();
  // papillae: tiny light bumps, denser near the top surface
  const n = Math.round((w / size) * 70);
  for (let i = 0; i < n; i++) { const px = x0 + r() * w, py = y + Math.pow(r(), 1.8) * size, s = size * (0.012 + r() * 0.018); ctx.fillStyle = rgba(F.papilla, 0.5 + r() * 0.4); ctx.beginPath(); ctx.arc(px, py, s, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = rgba('#FFFFFF', 0.5); ctx.lineWidth = Math.max(0.6, size * 0.02);
  ctx.beginPath(); ctx.moveTo(x0, y + size * 0.25); const r2 = rng(o.seed ?? 8); for (let i = 0; i < humps; i++) { const a = x0 + (i / humps) * w, b = a + w / humps; ctx.quadraticCurveTo((a + b) / 2, y - size * (0.08 + r2() * 0.08), b, y + size * 0.22 + (i === humps - 1 ? 0.03 : 0) * size); } ctx.stroke();
  ctx.restore();
}

/** size = width; x,y = surface centre. A shallow saliva pool: clear, cool, a bright surface line and glints. */
export function salivaPool(ctx: Ctx, x: number, y: number, size: number, o: { depth?: number; time?: number; seed?: number } = {}) {
  const S = material.saliva, w = size, d = o.depth ?? size * 0.16, t = o.time ?? 0, r = rng(o.seed ?? 12);
  ctx.save();
  const body = new Path2D(); body.moveTo(x - w / 2, y); body.quadraticCurveTo(x - w * 0.42, y + d, x, y + d); body.quadraticCurveTo(x + w * 0.42, y + d, x + w / 2, y); body.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + d); g.addColorStop(0, rgba(S.surface, 0.85)); g.addColorStop(0.4, rgba(S.pool, 0.8)); g.addColorStop(1, rgba(S.deep, 0.9));
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  for (let i = 0; i < 5; i++) { const bx = x + (r() - 0.5) * w * 0.7, by = y + d * (0.3 + ((r() + t * 0.2) % 1) * 0.6); ctx.strokeStyle = rgba('#FFFFFF', 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(bx, by, Math.max(0.8, d * 0.06), 0, TAU); ctx.stroke(); }
  ctx.restore();
  // surface line with a slow ripple
  ctx.strokeStyle = rgba(S.glint, 0.85); ctx.lineWidth = Math.max(0.8, d * 0.07); ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const px = x - w / 2 + (i / 20) * w, py = y + Math.sin(i * 0.9 + t * 2) * d * 0.03; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.stroke();
  for (let i = 0; i < 3; i++) gloss(ctx, x - w * 0.3 + i * w * 0.28 + Math.sin(t + i) * 2, y + d * 0.12, w * 0.05, d * 0.04, 0, 0.8);
  ctx.restore();
}

/** A four-point glint for enamel, shine and relics. size = arm length. */
export function glint(ctx: Ctx, x: number, y: number, size: number, o: { color?: string; alpha?: number; rot?: number } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color ?? '#FFFFFF';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU, b = a + TAU / 8; ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size); ctx.lineTo(Math.cos(b) * size * 0.18, Math.sin(b) * size * 0.18); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/** A layered parallax silhouette strip (towers, folds or crystals) for backgrounds. size = height. */
export function silhouetteStrip(ctx: Ctx, x: number, y: number, size: number, o: { width?: number; color?: string; kind?: 'towers' | 'folds' | 'crystals' | 'reef'; seed?: number } = {}) {
  const w = o.width ?? size * 6, r = rng(o.seed ?? 21), kind = o.kind ?? 'towers', x0 = x - w / 2;
  ctx.save(); ctx.fillStyle = o.color ?? biome.crown.far; ctx.beginPath(); ctx.moveTo(x0, y);
  let px = x0;
  while (px < x0 + w) {
    const sw = size * (kind === 'crystals' ? 0.18 + r() * 0.25 : 0.4 + r() * 0.5), sh = size * (0.4 + r() * 0.6);
    if (kind === 'towers') { ctx.lineTo(px + sw * 0.1, y - sh); ctx.quadraticCurveTo(px + sw * 0.3, y - sh - sw * 0.25, px + sw * 0.5, y - sh); ctx.quadraticCurveTo(px + sw * 0.7, y - sh - sw * 0.25, px + sw * 0.9, y - sh); ctx.lineTo(px + sw, y); }
    else if (kind === 'crystals') { ctx.lineTo(px + sw * 0.5, y - sh); ctx.lineTo(px + sw, y); }
    else if (kind === 'reef') { ctx.lineTo(px + sw * 0.15, y - sh * 0.7); ctx.quadraticCurveTo(px + sw * 0.4, y - sh * 1.05, px + sw * 0.6, y - sh * 0.8); ctx.quadraticCurveTo(px + sw * 0.9, y - sh * 0.6, px + sw, y); }
    else ctx.quadraticCurveTo(px + sw / 2, y - sh * 0.6, px + sw, y - sh * 0.05);
    px += sw;
  }
  ctx.lineTo(x0 + w, y + size); ctx.lineTo(x0, y + size); ctx.closePath(); ctx.fill(); ctx.restore();
}

/** Every helper by name, for tools and the style guide. */
// ---------------------------------------------------------------------------------------------
// Interdental kit. The holder is the bow, the refill is the arrow.
// ---------------------------------------------------------------------------------------------
export interface RefillOpts { col?: string; angle?: number; glow?: number }
/** size = full length; x,y = bottom centre of the plug foot; angle 0 points up. A refill as on the shelf:
 *  size-coloured plug with a foot flange, short wire stem, bottle-brush filaments tapering to a wire tip. */
export function idbRefill(ctx: Ctx, x: number, y: number, size: number, o: RefillOpts = {}) {
  const L = size, col = o.col ?? idb.sizes.m.col, ink = mix(col, '#000000', 0.28), lite = mix(col, '#FFFFFF', 0.4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.angle ?? 0); ctx.lineCap = 'round';
  // foot flange with two tabs, then the plug
  ctx.fillStyle = ink; ctx.beginPath(); ctx.roundRect(-L * 0.15, -L * 0.05, L * 0.3, L * 0.05, L * 0.012); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-L * 0.08, -L * 0.25, L * 0.16, L * 0.21, [L * 0.05, L * 0.05, L * 0.01, L * 0.01]); ctx.fill();
  ctx.fillStyle = ink; ctx.fillRect(L * 0.025, -L * 0.23, L * 0.045, L * 0.18);
  ctx.fillStyle = lite; ctx.fillRect(-L * 0.06, -L * 0.22, L * 0.025, L * 0.16);
  // wire stem
  ctx.strokeStyle = idb.wire; ctx.lineWidth = Math.max(0.6, L * 0.022); ctx.beginPath(); ctx.moveTo(0, -L * 0.25); ctx.lineTo(0, -L * 0.98); ctx.stroke();
  // filaments: short strokes either side of the wire, tapering, every other row offset (the twist)
  const y0 = -L * 0.36, y1 = -L * 0.95, rows = Math.max(10, Math.round(L / 3.2));
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1), yy = y0 + (y1 - y0) * t, r = L * (0.11 - 0.075 * t), off = (i % 2 ? 0.35 : -0.35) * L * 0.012;
    ctx.lineWidth = Math.max(0.45, L * 0.012);
    ctx.strokeStyle = idb.filament; ctx.beginPath(); ctx.moveTo(-r, yy + off); ctx.lineTo(0, yy); ctx.stroke();
    ctx.strokeStyle = idb.filamentShade; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(r, yy - off); ctx.stroke();
  }
  ctx.fillStyle = idb.wire; ctx.beginPath(); ctx.arc(0, -L * 0.985, Math.max(0.6, L * 0.018), 0, TAU); ctx.fill();
  if (o.glow) { radial(ctx, 0, -L * 0.65, L * 0.45, '#FFFFFF', 0.35 * o.glow); }
  ctx.restore();
}

export interface HolderOpts { kind?: 'ring' | 'angled'; angle?: number; loaded?: string | null; refillSize?: number; body?: string; shade?: string; hi?: string }
/** Ring holder: x,y = ring centre, size = height. Angled handle: x,y = handle end, size = length.
 *  Translucent coloured plastic with a gloss line. `loaded` = refill colour to seat one in the socket. */
export function idbHolder(ctx: Ctx, x: number, y: number, size: number, o: HolderOpts = {}) {
  const H = size, body = o.body ?? idb.holder.body, shade = o.shade ?? idb.holder.shade, hi = o.hi ?? idb.holder.hi, a = idb.holder.alpha;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.angle ?? 0); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  let socket: [number, number, number];
  if ((o.kind ?? 'ring') === 'ring') {
    const R = H * 0.26, r = H * 0.12, top = -R - H * 0.36, s = new Path2D();
    s.moveTo(-H * 0.05, -R * 0.86); s.quadraticCurveTo(-H * 0.045, top + H * 0.12, -H * 0.03, top + H * 0.02); s.lineTo(H * 0.03, top + H * 0.02);
    s.quadraticCurveTo(H * 0.045, top + H * 0.12, H * 0.05, -R * 0.86); s.arc(0, 0, R, -Math.PI / 2 + 0.2, Math.PI * 1.5 - 0.2); s.closePath();
    s.moveTo(-H * 0.035, R * 0.997); s.lineTo(-H * 0.03, R + H * 0.07); s.lineTo(H * 0.03, R + H * 0.07); s.lineTo(H * 0.035, R * 0.997); s.closePath();
    const hole = new Path2D(); hole.arc(0, 0, r, 0, TAU); s.addPath(hole);
    socket = [0, top + H * 0.02, -Math.PI / 2];
    ctx.globalAlpha *= a; ctx.fillStyle = body; ctx.fill(s, 'evenodd'); ctx.globalAlpha /= a;
    ctx.save(); ctx.clip(s, 'evenodd'); ctx.globalAlpha *= 0.55; ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(R * 0.35, R * 0.3, R * 1.05, 0, TAU); ctx.arc(-R * 0.2, -R * 0.25, R * 1.1, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = shade; ctx.lineWidth = Math.max(0.8, H * 0.012); ctx.stroke(s);
    ctx.strokeStyle = rgba(hi, 0.9); ctx.lineWidth = Math.max(0.8, H * 0.014); ctx.beginPath(); ctx.arc(0, 0, (R + r) / 2 + R * 0.12, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-H * 0.022, -R * 1.05); ctx.lineTo(-H * 0.018, top + H * 0.07); ctx.stroke();
    ctx.strokeStyle = rgba(hi, 0.5); ctx.beginPath(); ctx.arc(0, 0, r + 0.5, Math.PI * 0.1, Math.PI * 0.6); ctx.stroke();
  } else {
    // angled handle: a long flat bar, a bend near the top, a head that holds the refill sideways
    const bend: [number, number] = [H * 0.08, -H * 0.72], head: [number, number] = [H * 0.24, -H * 0.9], w = H * 0.07;
    const path = new Path2D(); path.moveTo(0, 0); path.lineTo(bend[0], bend[1]); path.lineTo(head[0], head[1]);
    ctx.globalAlpha *= a; ctx.strokeStyle = body; ctx.lineWidth = w; ctx.stroke(path); ctx.globalAlpha /= a;
    ctx.strokeStyle = rgba(shade, 0.6); ctx.lineWidth = w * 0.3; ctx.save(); ctx.translate(w * 0.22, 0); ctx.stroke(path); ctx.restore();
    ctx.strokeStyle = rgba(hi, 0.85); ctx.lineWidth = Math.max(0.8, w * 0.14); ctx.save(); ctx.translate(-w * 0.22, 0); ctx.stroke(path); ctx.restore();
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(head[0], head[1], w * 0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(head[0], head[1], w * 0.44, 0, TAU); ctx.fill();
    socket = [head[0] - w * 0.2, head[1] - w * 0.1, -Math.PI * 0.95];
  }
  if (o.loaded) {
    const [sx, sy, sa] = socket, rl = o.refillSize ?? H * 0.42;
    idbRefill(ctx, sx + Math.cos(sa) * rl * 0.04, sy + Math.sin(sa) * rl * 0.04, rl, { col: o.loaded, angle: sa + Math.PI / 2 });
    ctx.globalAlpha *= a; ctx.fillStyle = body; ctx.beginPath(); ctx.arc(sx, sy, H * 0.038, 0, TAU); ctx.fill(); ctx.globalAlpha /= a;
  }
  ctx.restore();
}

export const kit = { idbRefill, idbHolder, blob, enamel, gumFold, glowEye, crownCap, foamCluster, crystalShard, lightShaft, fogBand, brush, pasteDollop, palateRidges, tongueSurface, salivaPool, glint, silhouetteStrip } as const;
