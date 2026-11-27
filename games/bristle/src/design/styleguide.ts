// BRISTLE living style guide. Bundled by styleguide.mjs into dist/styleguide.html (runs from file://).
// Everything on the page is drawn from the real tokens, the kit, the real Player, the real HUD, the
// real particle system and the real WebGL post pipeline, so the page cannot drift from the game.
import * as T from './tokens';
import { packs } from './brands';
import { KE, plate, poly, plume, legsK, visorGlow, fnPath, softHalo, singleTuft, sonicLance, drawRig, orderArts, staticPose, ORDER_IDS, type OrderArt } from './hero';
import { kit, idbRefill, idbHolder, blob, enamel, gumFold, glowEye, crownCap, foamCluster, crystalShard, lightShaft, fogBand, brush, pasteDollop, palateRidges, tongueSurface, salivaPool, glint, silhouetteStrip } from './kit';
import { Player } from '../game/player';
import { Hud } from '../ui/hud';
import { Particles, type BurstOpts } from '../engine/particles';
import { Post, DEFAULT_GRADE, type Grade } from '../engine/post';
import { rgb, rgba, mix, TAU } from '../engine/math';
import type { Game } from '../game/types';
import type { GameCore } from '../game/game';
import type { Light } from '../engine/render';

type Ctx = CanvasRenderingContext2D;
const PR = Math.min(2, window.devicePixelRatio || 1);
const B = T.brand, M = T.material, P = T.pack;
const famName = (f: string) => f.split(',')[0].replace(/['"]/g, '').trim();
const FD = famName(P.font.display), FB = famName(P.font.body);

// ---------------------------------------------------------------------------------------------
// canvas plumbing
// ---------------------------------------------------------------------------------------------
function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = Math.round(w * PR); c.height = Math.round(h * PR); c.style.width = w + 'px'; c.style.height = h + 'px';
  const x = c.getContext('2d')!; x.setTransform(PR, 0, 0, PR, 0, 0); return { c, x };
}
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string) {
  let c = glowCache.get(color); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const [r, gg, b] = rgb(color), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(${r},${gg},${b},1)`); grd.addColorStop(0.35, `rgba(${r},${gg},${b},0.55)`); grd.addColorStop(0.7, `rgba(${r},${gg},${b},0.15)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); glowCache.set(color, c); return c;
}
function halo(ctx: Ctx, x: number, y: number, r: number, color: string, a: number) { ctx.globalAlpha = a; ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
/** The slice of Game that Player.draw / drawEmissive / animate touch. */
const G = { r: { halo }, audio: { sfx() {} }, time: 0, save: { flags: {}, abilities: {} }, progress: { has: () => false } } as unknown as Game;

interface LitScene { ambient: string; grade?: Partial<Grade>; scene(ctx: Ctx): void; emissive?(ctx: Ctx): void; lights?: Light[]; time?: number }
/** Runs a scene through the game's own composite: scene x light map + emissive, bloom and grade (engine/post.ts). */
class Lit {
  gl = document.createElement('canvas'); post: Post | null = null;
  sc = document.createElement('canvas'); em = document.createElement('canvas'); li = document.createElement('canvas');
  constructor() { try { this.post = new Post(this.gl); } catch (e) { console.warn('style guide: WebGL post off, 2D fallback', (e as Error).message); } }
  draw(target: HTMLCanvasElement, s: LitScene) {
    const W = target.width, H = target.height;
    for (const c of [this.sc, this.em]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const lw = Math.max(1, W >> 1), lh = Math.max(1, H >> 1); if (this.li.width !== lw || this.li.height !== lh) { this.li.width = lw; this.li.height = lh; }
    const sx = this.sc.getContext('2d', { alpha: false })!, ex = this.em.getContext('2d')!, lx = this.li.getContext('2d', { alpha: false })!;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H); sx.setTransform(PR, 0, 0, PR, 0, 0); sx.save(); s.scene(sx); sx.restore();
    ex.setTransform(1, 0, 0, 1, 0, 0); ex.clearRect(0, 0, W, H); ex.setTransform(PR, 0, 0, PR, 0, 0); ex.save(); s.emissive?.(ex); ex.restore();
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.fillStyle = s.ambient; lx.fillRect(0, 0, lw, lh);
    lx.setTransform(PR * 0.5, 0, 0, PR * 0.5, 0, 0); lx.globalCompositeOperation = 'lighter';
    for (const l of s.lights ?? []) { lx.globalAlpha = Math.min(1, l.i); lx.drawImage(glowSprite(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); if (l.i > 1) { lx.globalAlpha = l.i - 1; lx.drawImage(glowSprite(l.color), l.x - l.r * 0.6, l.y - l.r * 0.6, l.r * 1.2, l.r * 1.2); } }
    lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over';
    const grade: Grade = { ...DEFAULT_GRADE, ...(s.grade ?? {}) };
    const out = target.getContext('2d')!; out.setTransform(1, 0, 0, 1, 0, 0);
    if (this.post) { this.post.resize(W, H); this.post.render(this.sc, this.em, this.li, grade, s.time ?? 1.7); out.drawImage(this.gl, 0, 0); return; }
    out.drawImage(this.sc, 0, 0); out.globalCompositeOperation = 'multiply'; out.drawImage(this.li, 0, 0, W, H);
    out.globalCompositeOperation = 'lighter'; out.drawImage(this.sc, 0, 0); out.globalCompositeOperation = 'multiply'; out.drawImage(this.li, 0, 0, W, H); // x2
    out.globalCompositeOperation = 'lighter'; out.drawImage(this.em, 0, 0); out.globalCompositeOperation = 'source-over';
  }
}
let LIT: Lit;

// ---------------------------------------------------------------------------------------------
// the hero, posed through its own fields
// ---------------------------------------------------------------------------------------------
type Pose = 'idle' | 'idleL' | 'run' | 'run2' | 'jump' | 'fall' | 'slash' | 'slash2' | 'up' | 'pogo' | 'dash' | 'focus';
const poses = new Map<Pose, Player>();
function posed(pose: Pose): Player {
  const hit = poses.get(pose); if (hit) return hit;
  const p = new Player(0, -21); p.x = 0; p.y = -21; p.invuln = 0; p.grounded = true; p.facing = pose === 'idleL' ? -1 : 1; p.resetCloak();
  const sl = (dir: 'side' | 'up' | 'down', flip = 1) => ({ dir, t: 0.06, hit: new Set<number>(), cells: new Set<number>(), flip, landed: false });
  if (pose === 'run' || pose === 'run2') p.vx = 300;
  if (pose === 'jump') { p.grounded = false; p.vy = -700; }
  if (pose === 'fall') { p.grounded = false; p.vy = 640; }
  if (pose === 'slash') p.slash = sl('side', 1);
  if (pose === 'slash2') p.slash = sl('side', -1);
  if (pose === 'up') p.slash = sl('up');
  if (pose === 'pogo') { p.grounded = false; p.vy = 200; p.slash = sl('down'); }
  if (pose === 'dash') { p.vx = 820; p.dashT = 0.1; }
  if (pose === 'focus') p.focusT = 0.6;
  for (let i = 0; i < 150; i++) p.animate(G, 1 / 60, 0);
  if (pose === 'run') p.runPhase = Math.PI / 2; if (pose === 'run2') p.runPhase = -Math.PI / 2;
  if (pose === 'dash') { p.sx = 1.35; p.sy = 0.7; p.ghosts = [{ x: -26, y: -21, f: 1, t: 0.17 }, { x: -54, y: -21, f: 1, t: 0.1 }]; }
  poses.set(pose, p); return p;
}
function hero(ctx: Ctx, pose: Pose, x: number, feet: number, s: number) { const p = posed(pose); ctx.save(); ctx.translate(x, feet); ctx.scale(s, s); p.draw(ctx, G); ctx.restore(); }
function heroEm(ctx: Ctx, pose: Pose, x: number, feet: number, s: number) { const p = posed(pose); ctx.save(); ctx.translate(x, feet); ctx.scale(s, s); p.drawEmissive(ctx, G); ctx.restore(); }
function heroLights(pose: Pose, x: number, feet: number, s: number, k = 1): Light[] {
  const p = posed(pose), L: Light[] = [{ x, y: feet - 31 * s, r: 300 * s, color: T.light.heroFill, i: 0.55 * k }, { x: x + p.facing * 4 * s, y: feet - 33 * s, r: 80 * s, color: T.light.visor, i: 0.5 * k }];
  if (p.slash) { const b = p.slashBox(); L.push({ x: x + b.x * s, y: feet + (b.y + 21) * s, r: 160 * s, color: T.light.slash, i: 0.9 * k }); }
  if (p.focusT > 0) L.push({ x, y: feet - 21 * s, r: 200 * s, color: B.sky, i: k });
  return L;
}

// ---------------------------------------------------------------------------------------------
// sample creatures (shape-language studies, not the bestiary's final designs)
// ---------------------------------------------------------------------------------------------
function plaqueling(ctx: Ctx, x: number, y: number, s: number, seed = 1) {
  blob(ctx, x, y - 12 * s, 14 * s, { color: M.plaque.base, shade: M.plaque.deep, deep: '#8A7410', rim: M.plaque.core, squash: 0.78, flat: 0.3, seed, wobble: 0.09 });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = rgba(M.plaque.lime, 0.8); ctx.beginPath(); ctx.arc(x + (i - 1.5) * 6 * s, y - (6 + (i % 2) * 8) * s, (1.6 + (i % 3) * 0.6) * s, 0, TAU); ctx.fill(); }
  glowEye(ctx, x - 4.5 * s, y - 15 * s, 3 * s, { shape: 'almond', mode: 'scene', color: M.plaque.core, look: [1, 0.3] });
  glowEye(ctx, x + 4.5 * s, y - 15 * s, 3 * s, { shape: 'almond', mode: 'scene', color: M.plaque.core, look: [1, 0.3] });
}
function plaquelingEm(ctx: Ctx, x: number, y: number, s: number) {
  halo(ctx, x, y - 12 * s, 34 * s, B.yellow, 0.22);
  glowEye(ctx, x - 4.5 * s, y - 15 * s, 3 * s, { shape: 'almond', mode: 'glow', color: B.yellow, look: [1, 0.3], halo: 0.35 });
  glowEye(ctx, x + 4.5 * s, y - 15 * s, 3 * s, { shape: 'almond', mode: 'glow', color: B.yellow, look: [1, 0.3], halo: 0.35 });
}
function tartarBrute(ctx: Ctx, x: number, y: number, s: number) {
  blob(ctx, x, y - 20 * s, 22 * s, { color: M.tartar.base, shade: M.tartar.shade, deep: M.tartar.deep, rim: M.tartar.hi, squash: 0.85, flat: 0.25, seed: 4, wobble: 0.05, points: 9 });
  crownCap(ctx, x - 2 * s, y - 34 * s, 34 * s, { calcified: true, cusps: 4, seed: 2, tilt: -0.08 });
  glowEye(ctx, x - 9 * s, y - 22 * s, 3.6 * s, { shape: 'slit', mode: 'scene', color: M.plaque.lime });
  glowEye(ctx, x + 3 * s, y - 22 * s, 3.6 * s, { shape: 'slit', mode: 'scene', color: M.plaque.lime });
}
function tartarBruteEm(ctx: Ctx, x: number, y: number, s: number) {
  glowEye(ctx, x - 9 * s, y - 22 * s, 3.6 * s, { shape: 'slit', mode: 'glow', color: B.citrus, halo: 0.45 });
  glowEye(ctx, x + 3 * s, y - 22 * s, 3.6 * s, { shape: 'slit', mode: 'glow', color: B.citrus, halo: 0.45 });
}
function folk(ctx: Ctx, x: number, y: number, s: number, hood = B.blue60) {
  blob(ctx, x, y - 16 * s, 15 * s, { color: M.enamel.base, shade: M.enamel.shade, deep: M.enamel.deep, squash: 1.15, flat: 0.25, seed: 8 });
  blob(ctx, x, y - 30 * s, 13 * s, { color: hood, shade: mix(hood, '#0A1F44', 0.3), deep: mix(hood, '#0A1F44', 0.55), squash: 1.0, seed: 3, wobble: 0.04 });
  ctx.fillStyle = '#132B57'; ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 28 * s, 8 * s, 7 * s, 0, 0, TAU); ctx.fill();
  glowEye(ctx, x - 1 * s, y - 28 * s, 1.9 * s, { mode: 'scene', color: '#D8ECFF', look: [1, 0], socket: '#132B57' });
  glowEye(ctx, x + 5 * s, y - 28 * s, 1.9 * s, { mode: 'scene', color: '#D8ECFF', look: [1, 0], socket: '#132B57' });
  crownCap(ctx, x, y - 40 * s, 12 * s, { cusps: 3 });
}
function terrain(ctx: Ctx, path: Path2D, t: T.TerrainTokens, s: number) {
  ctx.save(); ctx.fillStyle = t.deep; ctx.fill(path); ctx.clip(path); ctx.lineJoin = 'round';
  ctx.strokeStyle = t.base; ctx.lineWidth = 64 * s; ctx.stroke(path); ctx.strokeStyle = t.edge; ctx.lineWidth = 18 * s; ctx.stroke(path); ctx.strokeStyle = t.rim; ctx.lineWidth = 4 * s; ctx.stroke(path); ctx.restore();
}
function ground(w: number, h: number, top: number, seed = 1, bumps = 4) {
  const p = new Path2D(); p.moveTo(-60, h + 60); p.lineTo(-60, top);
  for (let i = 0; i < bumps; i++) { const a = -60 + ((w + 120) / bumps) * i, b = a + (w + 120) / bumps; p.quadraticCurveTo((a + b) / 2, top - 6 - ((i * 37 + seed * 13) % 9), b, top + ((i + seed) % 2) * 4); }
  p.lineTo(w + 60, h + 60); p.closePath(); return p;
}
function sky(ctx: Ctx, w: number, h: number, c: [string, string]) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }

// ---------------------------------------------------------------------------------------------
// biome dioramas (used by the light presets, the HUD stage and the do/don't pairs)
// ---------------------------------------------------------------------------------------------
type Dio = T.BiomeId | 'throne';
const far = (o: Record<string, unknown> = {}) => ({ hi: M.enamelFar.hi, base: M.enamelFar.base, shade: M.enamelFar.shade, deep: M.enamelFar.deep, fissure: M.enamelFar.fissure, ...o });
function diorama(id: Dio, w: number, h: number, o: { glowAll?: boolean; pose?: Pose } = {}): LitScene {
  const pal = T.biome[id === 'throne' ? 'calculus' : id], preset = T.lightPreset[id], s = h / 230, gy = h * 0.8, hx = w * 0.34, pose = o.pose ?? 'idle';
  const fx = w * 0.7, lights: Light[] = [...heroLights(pose, hx, gy, s)];
  const scene = (ctx: Ctx) => {
    sky(ctx, w, h, pal.sky);
    const kind = id === 'crown' ? 'towers' : id === 'gumline' ? 'folds' : id === 'sugar' ? 'crystals' : id === 'narrows' ? 'towers' : 'reef';
    silhouetteStrip(ctx, w / 2, h * 0.58, h * 0.35, { width: w + 40, color: pal.far, kind, seed: 3 });
    fogBand(ctx, w / 2, h * 0.6, h * 0.2, { width: w, color: pal.fog, alpha: 0.08 });
    silhouetteStrip(ctx, w / 2, h * 0.7, h * 0.28, { width: w + 40, color: pal.mid, kind, seed: 9 });
    if (id === 'crown') { enamel(ctx, w * 0.88, gy + 4, 70 * s, far({ shape: 'tower', height: 150 * s, seed: 3 })); enamel(ctx, w * 0.1, gy + 4, 48 * s, far({ shape: 'molar', seed: 5 })); }
    if (id === 'narrows') { enamel(ctx, w * 0.06, gy + 6, 120 * s, far({ shape: 'tower', height: h, seed: 2, light: 'right' })); enamel(ctx, w * 0.95, gy + 6, 110 * s, far({ shape: 'tower', height: h * 0.95, seed: 4 })); }
    if (id === 'sugar') { crystalShard(ctx, w * 0.86, gy + 2, 70 * s, { cluster: 3, angle: 0.1, seed: 4 }); crystalShard(ctx, w * 0.12, gy + 2, 46 * s, { cluster: 2, angle: -0.2, seed: 7 }); }
    if (id === 'calculus') { crownCap(ctx, w * 0.9, gy + 4, 70 * s, { calcified: true, cusps: 4, seed: 3 }); crownCap(ctx, w * 0.08, gy + 2, 44 * s, { calcified: true, cusps: 3, seed: 9 }); }
    if (id === 'throne') { crownCap(ctx, w * 0.72, h * 0.66, 190 * s, { calcified: true, cusps: 4, seed: 5, base: M.tartar.shade, shade: M.tartar.deep, stroke: '#2A2620' }); }
    terrain(ctx, ground(w, h, gy, id.length), pal.terrain, s);
    if (id === 'gumline') gumFold(ctx, w / 2, gy - 2, 26 * s, { width: w + 20, scallops: 7, folds: 2, seed: 2 });
    if (id === 'crown') enamel(ctx, w * 0.56, gy - 1, 70 * s, { shape: 'slab', seed: 4 });
    if (id === 'sugar') salivaPool(ctx, w * 0.56, gy + 6 * s, 80 * s, { depth: 10 * s });
    if (id === 'calculus' || id === 'throne') tartarBrute(ctx, fx, gy, s * 1.1); else if (id === 'narrows') folk(ctx, fx, gy, s); else plaqueling(ctx, fx, gy, s * 1.2, 3);
    hero(ctx, pose, hx, gy, s);
  };
  const emissive = (ctx: Ctx) => {
    if (o.glowAll) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 9; i++) halo(ctx, (i + 0.5) * w / 9, gy - (i % 3) * 30 * s, 60 * s, i % 2 ? pal.accent : B.sky, 0.3); halo(ctx, w * 0.9, gy - 60 * s, 80 * s, B.white, 0.35); ctx.globalCompositeOperation = 'source-over'; }
    if (id === 'crown') { lightShaft(ctx, w * 0.62, -10, h * 0.95, { color: B.sky, alpha: 0.16, width: 30 * s, angle: 0.25 }); glint(ctx, w * 0.86, gy - 120 * s, 5 * s); }
    if (id === 'narrows') { lightShaft(ctx, w * 0.5, -10, h, { color: '#CCD8ED', alpha: 0.2, width: 40 * s, spread: 1.6, angle: 0.02 }); }
    if (id === 'gumline') for (let i = 0; i < 26; i++) { const sx2 = (i * 97) % w, sy2 = h * 0.15 + ((i * 53) % (h * 0.6)); halo(ctx, sx2, sy2, (6 + (i % 4) * 3) * s, i % 3 ? B.orchid : T.light.biolum, 0.55); }
    if (id === 'sugar') { halo(ctx, w * 0.86, gy - 40 * s, 70 * s, B.tangerine, 0.35); halo(ctx, w * 0.12, gy - 25 * s, 40 * s, B.tangerine, 0.3); for (let i = 0; i < 4; i++) glint(ctx, w * 0.8 + i * 14 * s, gy - (60 + i * 12) * s, 3 * s); }
    if (id === 'calculus' || id === 'throne') { tartarBruteEm(ctx, fx, gy, s * 1.1); for (let i = 0; i < 10; i++) halo(ctx, (i * 131) % w, gy + 14 + (i % 3) * 8, 10 * s, B.citrus, 0.4); }
    if (id === 'throne') { halo(ctx, w * 0.69, h * 0.42, 14 * s, B.cerise, 0.8); halo(ctx, w * 0.76, h * 0.42, 14 * s, B.cerise, 0.8); halo(ctx, w * 0.72, h * 0.5, 140 * s, B.cerise, 0.12); }
    if (id === 'crown' || id === 'gumline' || id === 'sugar') plaquelingEm(ctx, fx, gy, s * 1.2);
    if (id === 'narrows') { glowEye(ctx, fx - 1 * s, gy - 28 * s, 1.9 * s, { mode: 'glow', color: '#D8ECFF', halo: 0.4 }); glowEye(ctx, fx + 5 * s, gy - 28 * s, 1.9 * s, { mode: 'glow', color: '#D8ECFF', halo: 0.4 }); }
    heroEm(ctx, pose, hx, gy, s);
  };
  if (id === 'crown') lights.push({ x: w * 0.65, y: 0, r: h * 1.1, color: T.light.moon, i: 0.3 });
  if (id === 'gumline') lights.push({ x: w * 0.2, y: h * 0.3, r: h, color: T.light.gum, i: 0.5 }, { x: fx, y: gy - 14 * s, r: 120 * s, color: T.light.plaque, i: 0.6 });
  if (id === 'narrows') lights.push({ x: w * 0.5, y: 0, r: h * 1.2, color: '#CCD8ED', i: 0.3 });
  if (id === 'sugar') lights.push({ x: w * 0.86, y: gy - 40 * s, r: 240 * s, color: T.light.sugar, i: 0.9 }, { x: fx, y: gy - 14 * s, r: 120 * s, color: T.light.plaque, i: 0.6 });
  if (id === 'calculus') lights.push({ x: fx, y: gy - 20 * s, r: 140 * s, color: B.citrus, i: 0.45 });
  if (id === 'throne') lights.push({ x: w * 0.72, y: h * 0.45, r: 260 * s, color: T.light.boss, i: 0.28 });
  if (o.glowAll) lights.push({ x: w / 2, y: h / 2, r: w, color: '#FFFFFF', i: 0.35 });
  const grade = o.glowAll ? { ...preset.grade, bloom: 1.05, bloomThreshold: 0.45 } : preset.grade;
  return { ambient: preset.ambient, grade, scene, emissive, lights };
}

// ---------------------------------------------------------------------------------------------
// page registry: placeholders are painted after layout so canvases match their boxes
// ---------------------------------------------------------------------------------------------
type Painter =
  | { k: '2d'; h: number; fn: (ctx: Ctx, w: number, h: number) => void }
  | { k: 'lit'; h: number; fn: (w: number, h: number) => LitScene }
  | { k: 'live'; h: number; fn: (ctx: Ctx, w: number, h: number) => (dt: number) => void }
  | { k: 'el'; h: number; fn: (el: HTMLElement, w: number, h: number) => void };
const painters: Record<string, Painter> = {}; let pid = 0;
function art(p: Painter, cls = 'art') { const id = 'p' + pid++; painters[id] = p; return `<div class="${cls}" data-art="${id}" style="height:${p.h}px"></div>`; }
const a2d = (h: number, fn: (ctx: Ctx, w: number, h: number) => void, cls?: string) => art({ k: '2d', h, fn }, cls);
const aLit = (h: number, fn: (w: number, h: number) => LitScene, cls?: string) => art({ k: 'lit', h, fn }, cls);
const live: ((dt: number) => void)[] = [];

// ---------------------------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------------------------
const SECTIONS: [string, string][] = [['principles', 'Principles'], ['colour', 'Colour'], ['type', 'Typography'], ['components', 'UI components'], ['materials', 'Materials'], ['kit', 'Drawing kit'], ['hero', 'The hero'], ['options', 'Hero options'], ['orders', 'Orders'], ['idb', 'Interdental kit'], ['light', 'Light and grade'], ['particles', 'Particles'], ['motion', 'Motion and feel'], ['dodont', 'Do and don\'t']];
const head = (n: number, title: string, lead: string) => `<p class="eyebrow">${String(n).padStart(2, '0')} &nbsp;/&nbsp; ${SECTIONS[n - 1][1]}</p><h2>${title}</h2><p class="lead">${lead}</p>`;

function cover() {
  return `<section class="cover" id="top"><div class="cover-art">${aLit(760, (w, h) => coverScene(w, h), 'cover-canvas')}
  <div class="cover-text" style="top:92px;bottom:auto;display:block">
    <div class="t1">${P.name} &nbsp;&middot;&nbsp; Design system v0.1</div>
    <h1>BRISTLE</h1><div class="t2">Knight of the Crown</div>
    <p style="max-width:460px;color:var(--mist);margin-top:26px;font-size:16px">The art direction, tokens, drawing kit and rules for a quiet, beautiful action-platformer set inside the Great Smile. Everything on this page is drawn live by the game's own code.</p>
  </div>
  <div class="cover-meta" style="position:absolute;left:72px;bottom:56px">
    <b>Tokens</b><span>src/design/tokens.ts</span><b>Kit</b><span>src/design/kit.ts</span><b>Rules</b><span>design/ART-BIBLE.md</span><b>Backlog</b><span>design/BACKLOG.md</span>
  </div></div></section>`;
}
function coverScene(w: number, h: number): LitScene {
  const s = 3.1, gy = h * 0.68, hx = w * 0.62, pal = T.biome.crown, fx = w * 0.83;
  return {
    ambient: '#4A5A80', grade: { ...T.lightPreset.crown.grade, vignette: 0.62, bloom: 0.62 },
    lights: [...heroLights('slash', hx, gy, s), { x: w * 0.78, y: h * 0.12, r: h * 1.1, color: T.light.moon, i: 0.22 }, { x: fx, y: h * 0.84, r: 260, color: T.light.plaque, i: 0.55 }, { x: w * 0.35, y: h, r: 600, color: T.light.gum, i: 0.2 }],
    scene(ctx) {
      sky(ctx, w, h, pal.sky);
      silhouetteStrip(ctx, w / 2, h * 0.62, h * 0.4, { width: w + 60, color: '#0F1D44', kind: 'towers', seed: 12 });
      fogBand(ctx, w / 2, h * 0.62, h * 0.18, { width: w, color: B.sky, alpha: 0.07 });
      silhouetteStrip(ctx, w / 2, h * 0.74, h * 0.3, { width: w + 60, color: pal.mid, kind: 'towers', seed: 4 });
      enamel(ctx, w * 0.97, h * 0.9, 300, far({ shape: 'tower', height: 560, seed: 8, hi: '#8EA2CC', base: '#6F84B4', shade: '#465A8A', deep: '#1B2A52' }));
      enamel(ctx, w * 0.42, h * 0.92, 170, far({ shape: 'molar', seed: 2, height: 150, hi: '#8EA2CC', base: '#6F84B4', shade: '#465A8A', deep: '#1B2A52' }));
      gumFold(ctx, w / 2, h * 0.86, 140, { width: w + 60, scallops: 8, folds: 3, seed: 5 });
      enamel(ctx, hx + 10, gy + 30, 250, { shape: 'slab', height: 30, seed: 6 });
      plaqueling(ctx, fx, h * 0.865, 2.2, 5);
      foamCluster(ctx, w * 0.36, h * 0.87, 34, { seed: 3 });
      hero(ctx, 'slash', hx, gy, s);
    },
    emissive(ctx) {
      halo(ctx, w * 0.8, h * 0.13, 230, B.sky, 0.3); halo(ctx, w * 0.8, h * 0.13, 40, B.white, 0.7);
      lightShaft(ctx, w * 0.7, -20, h, { color: B.sky, alpha: 0.12, width: 70, angle: 0.3, motes: 22, seed: 4 });
      lightShaft(ctx, w * 0.86, -20, h * 0.8, { color: B.sky, alpha: 0.08, width: 40, angle: 0.22, seed: 9 });
      glint(ctx, w * 0.93, h * 0.3, 9); glint(ctx, w * 0.44, h * 0.8, 6, { alpha: 0.8 });
      plaquelingEm(ctx, fx, h * 0.865, 2.2);
      heroEm(ctx, 'slash', hx, gy, s);
    },
  };
}

function principles() {
  const P = [
    ['Inside a mouth, never gross', 'Cheek walls, palate ridges, tongue landscapes, gum scallops around enamel towers, saliva pools. Stylised, soft and lit like a cathedral. No wetness, no blood, no decay.'],
    ['Dark world, bright accent', 'Backgrounds sit in ink and biome deeps. Actors carry one bright note (eyes, visor, plaque glow) that reads before anything else.'],
    ['The crown is our motif', 'Molar crowns everywhere: the hero\'s helm, NPC circlets, calcified crowns on tartar creatures, the boss\'s throne. Two cusps for the hero, three for royalty, four for tartar.'],
    ['Light is earned', 'Emissive is for real light sources: eyes, plaque, sparks, relics, fountains. Under 8% of the screen in calm play, 15% in a fight.'],
    ['Soft shapes, stepped shade', 'Quadratic curves, flat fills, one or two hard-edged shade bands, a back rim light and one gloss spot. Hairlines only for fissures and folds.'],
    ['Brand first, world second', `The brand pack's primary is the hero's cloak and the primary button; the mouth keeps its own colours. ${FD} uppercase tracked for anything the game says; ${FB} for reading. Pill buttons. No emoji.`],
  ];
  return `<section id="principles">${head(1, 'Principles', 'Six rules that decide every pixel. When in doubt, re-read these before reaching for a colour or a glow.')}
  <div class="grid g3">${P.map(([t, d], i) => `<div class="card principle"><div class="n">${String(i + 1).padStart(2, '0')}</div><h4>${t}</h4><p>${d}</p></div>`).join('')}</div>
  <h3>Shape language by faction</h3>
  <div class="card">${aLit(330, (w, h) => factions(w, h))}<div class="grid g4 pad" style="gap:24px">
    <div><h4>The Order</h4><p>Verticals and crowns. Upright, light, a single blue. The hero, fountains, relics.</p></div>
    <div><h4>The Film (plaque)</h4><p>Round, droopy, bouncy. Almond eyes, yellow and citrus glow. Cute-creepy, never slimy.</p></div>
    <div><h4>Tartar</h4><p>Heavy blocks, flat bases, calcified crowns, slit eyes. Bone and grey-beige, matte. Slow and loud.</p></div>
    <div><h4>Ivoria folk</h4><p>Soft ovals with enamel faces, hooded, small crown circlets, round friendly eyes in pale sky.</p></div>
  </div></div></section>`;
}
function factions(w: number, h: number): LitScene {
  const col = w / 4, gy = h * 0.8, s = 2.3, cx = (i: number) => col * (i + 0.5);
  return {
    ambient: '#4C5670', grade: { vignette: 0.35, bloom: 0.5 },
    lights: [...heroLights('idle', cx(0), gy, s), { x: cx(1), y: gy - 30, r: 180, color: B.yellow, i: 0.5 }, { x: cx(2), y: gy - 40, r: 180, color: B.citrus, i: 0.35 }, { x: cx(3), y: gy - 60, r: 180, color: B.sky, i: 0.4 }],
    scene(ctx) {
      sky(ctx, w, h, ['#0C1B42', '#060E28']);
      ctx.strokeStyle = 'rgba(139,184,232,0.16)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.rect(cx(0) - 28, gy - 150, 56, 150); ctx.stroke();                                  // vertical
      ctx.beginPath(); ctx.arc(cx(1), gy - 48, 58, 0, TAU); ctx.stroke();                                       // circle
      ctx.beginPath(); ctx.rect(cx(2) - 70, gy - 120, 140, 120); ctx.stroke();                                  // block
      ctx.beginPath(); ctx.ellipse(cx(3), gy - 70, 46, 72, 0, 0, TAU); ctx.stroke();                              // oval
      ctx.setLineDash([]);
      ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = 'rgba(204,216,237,0.25)'; ctx.fillRect(0, gy, w, 2);
      hero(ctx, 'idle', cx(0), gy, s); plaqueling(ctx, cx(1), gy, s * 1.35, 2); tartarBrute(ctx, cx(2), gy, s * 1.15); folk(ctx, cx(3), gy, s * 1.3);
    },
    emissive(ctx) { heroEm(ctx, 'idle', cx(0), gy, s); plaquelingEm(ctx, cx(1), gy, s * 1.35); tartarBruteEm(ctx, cx(2), gy, s * 1.15);
      glowEye(ctx, cx(3) - 1 * s * 1.3, gy - 28 * s * 1.3, 1.9 * s * 1.3, { mode: 'glow', color: '#D8ECFF', halo: 0.4 }); glowEye(ctx, cx(3) + 5 * s * 1.3, gy - 28 * s * 1.3, 1.9 * s * 1.3, { mode: 'glow', color: '#D8ECFF', halo: 0.4 }); },
  };
}

// ---- colour ----
const lum = (hex: string) => { const c = rgb(hex).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const onColor = (hex: string) => (hex.startsWith('#') && lum(hex) > 0.35 ? '#0A1F44' : '#FFFFFF');
function swatch(name: string, hex: string, token: string, big = false) {
  const solid = hex.startsWith('#'), bg = solid ? hex : `linear-gradient(45deg, #1a2550 25%, transparent 25%, transparent 75%, #1a2550 75%), linear-gradient(45deg, #1a2550 25%, #0d1736 25%, #0d1736 75%, #1a2550 75%)`;
  const on = solid ? `<span class="on" style="color:${onColor(hex)}">${contrast(hex, '#FFFFFF') >= 4.5 ? 'AA on white' : contrast(hex, '#0A1F44') >= 4.5 ? 'AA on ink' : ''}</span>` : '';
  return `<div class="sw${big ? ' big' : ''}"><div class="chip" style="background:${bg};${solid ? '' : 'background-size:14px 14px;background-position:0 0,7px 7px'}">${solid ? '' : `<div style="position:absolute;inset:0;background:${hex}"></div>`}${on}</div><div class="meta"><div class="nm">${name}</div><div class="hx">${hex.toUpperCase()}</div><div class="tk">${token}</div></div></div>`;
}
function ramp(name: string, desc: string, obj: Record<string, string>, path: string) {
  const entries = Object.entries(obj).filter(([, v]) => typeof v === 'string');
  return `<div class="ramp"><div class="label"><h4>${name}</h4><p>${desc}</p><p class="mono" style="margin-top:6px">${path}</p></div><div class="chips">${entries.map(([k, v]) => `<div style="background:${v}"><span style="color:${v.startsWith('#') ? onColor(v) : '#fff'}">${k}<br>${v.startsWith('#') ? v.toUpperCase() : ''}</span></div>`).join('')}</div></div>`;
}
function colour() {
  const brandList: [string, string, string][] = [[P.name + ' primary', B.blue, 'brand.blue'], ['Ink', B.ink, 'brand.ink'], ['Ink 2', B.ink2, 'brand.ink2'], ['White', B.white, 'brand.white'], ['Soft Sky', B.sky, 'brand.sky']];
  const tints: [string, string, string][] = [['Blue 80', B.blue80, 'brand.blue80'], ['Blue 60', B.blue60, 'brand.blue60'], ['Blue 40', B.blue40, 'brand.blue40'], ['Blue 20', B.blue20, 'brand.blue20'], ['Blue Dark', B.blueDark, 'brand.blueDark'], ['Light grey', B.grey10, 'brand.grey10'], ['Grey', B.grey, 'brand.grey']];
  const support: [string, string, string][] = [['Citrus', B.citrus, 'brand.citrus'], ['Vivid Yellow', B.yellow, 'brand.yellow'], ['Tangerine', B.tangerine, 'brand.tangerine'], ['Orchid', B.orchid, 'brand.orchid'], ['Brand accent', B.cerise, 'brand.cerise']];
  const biomes = (Object.keys(T.biome) as T.BiomeId[]).map((id) => {
    const b = T.biome[id], t = b.terrain;
    const strip = (o: Record<string, string>) => `<div class="strip">${Object.entries(o).map(([k, v]) => `<div style="background:${v}"><span style="color:${onColor(v)}">${k} ${v}</span></div>`).join('')}</div>`;
    return `<div class="card biome"><div class="sky" style="background:linear-gradient(180deg, ${b.sky[0]}, ${b.sky[1]})"><h4>${b.name}</h4><p>${b.anatomy}</p><p class="mono" style="margin-top:8px">biome.${id}</p></div>
      <div class="rows"><div class="row"><b>Parallax</b>${strip({ far: b.far, mid: b.mid, near: b.near })}</div><div class="row"><b>Terrain</b>${strip(t as unknown as Record<string, string>)}</div><div class="row"><b>Accents</b>${strip({ fog: b.fog, accent: b.accent, accent2: b.accent2 })}</div></div></div>`;
  }).join('');
  const lights = Object.entries(T.light).map(([k, v]) => `<div class="card">${a2d(110, (ctx, w, h) => { ctx.fillStyle = '#050B1F'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; halo(ctx, w / 2, h / 2, h * 0.9, v, 0.9); halo(ctx, w / 2, h / 2, h * 0.18, '#FFFFFF', 0.3); ctx.globalCompositeOperation = 'source-over'; })}<div class="pad" style="padding:12px 14px"><div class="nm" style="font-family:var(--display);font-size:11px;letter-spacing:.18em;text-transform:uppercase">${k}</div><div class="mono">${v}</div></div></div>`).join('');
  const uiRows: [string, string][] = [['text', T.ui.text], ['primary', T.ui.primary], ['focus', T.ui.focus], ['shine', T.ui.shine], ['danger', T.ui.danger], ['success', T.ui.success]];
  return `<section id="colour">${head(2, 'Colour', 'Brand roots from the ' + P.name + ' pack, then the world colours every brand shares, then the dark the game lives in, then a ramp for every material in the mouth. Each chip shows its token path; contrast badges mark brand colours that pass WCAG AA for text on white or ink.')}
  <h3>Brand roots</h3><div class="grid g5">${brandList.map(([n, x, t]) => swatch(n, x, t, true)).join('')}</div>
  <div class="grid g7" style="grid-template-columns:repeat(7,1fr);margin-top:18px">${tints.map(([n, x, t]) => swatch(n, x, t)).join('')}</div>
  <h3>Supporting colours</h3><div class="grid g5">${support.map(([n, x, t]) => swatch(n, x, t)).join('')}</div>
  <h3>Ink and backgrounds</h3><div class="grid g6">${Object.entries(T.ink).map(([k, v]) => swatch(k, v, 'ink.' + k)).join('')}</div>
  <h3>Biome palettes</h3><div class="grid" style="gap:14px">${biomes}</div>
  <h3>Material ramps</h3>
  ${ramp('Enamel', 'Teeth, towers, the helm, slabs', M.enamel, 'material.enamel')}
  ${ramp('Gum', 'Gumline, papillae, soft hazards', M.gum, 'material.gum')}
  ${ramp('Flesh', 'Cheek walls, tongue, palate', M.flesh, 'material.flesh')}
  ${ramp('Plaque', 'The Film: glowing, yellow-citrus', M.plaque, 'material.plaque')}
  ${ramp('Tartar', 'Calcified, bone, matte', M.tartar, 'material.tartar')}
  ${ramp('Sugar', 'Crystals and syrup', M.sugar, 'material.sugar')}
  ${ramp('Paste', 'CURAPROX toothpaste throw', M.paste, 'material.paste')}
  ${ramp('Saliva', 'Pools and drips of light', M.saliva, 'material.saliva')}
  <h3>Light colours</h3><div class="grid g8" style="grid-template-columns:repeat(7,1fr)">${lights}</div>
  <p class="note">The light map is multiplied by two: #808080 is neutral. Dark caves use ambients around #2A3350 to #4A5A80.</p>
  <h3>UI colours and contrast</h3><div class="grid g6">${uiRows.map(([k, v]) => `<div class="sw"><div class="chip" style="background:${T.ui.panelSolid};display:grid;place-items:center"><span style="font-family:var(--display);font-size:26px;letter-spacing:.1em;color:${v}">AA</span></div><div class="meta"><div class="nm">ui.${k}</div><div class="hx">${v} &nbsp;${contrast(v, T.ui.panelSolid).toFixed(1)}:1</div><div class="tk">on ui.panelSolid</div></div></div>`).join('')}</div>
  </section>`;
}

// ---- type ----
function typeSection() {
  const sample: Record<string, string> = {
    gameTitle: 'Bristle', areaTitle: 'Gumline Hollows', bossName: 'Mother Calculus', menuItem: 'Continue', heading: 'Floss Grip', toast: 'Rested. The fountain will bring you back here.',
    dialogue: 'You slept a long time, little knight. The towers kept their shine without you. Barely.', body: 'Cling to walls and leap between them. Some say the old knights could climb the Narrows in one breath.',
    hudNumber: '214', areaSub: 'The soft country', prompt: 'Rest', caption: 'Hold F to focus',
  };
  const rows = Object.entries(T.type).map(([k, t]) => {
    const fam = t.family === 'display' ? 'var(--display)' : 'var(--body)';
    return `<div class="type-row"><div class="spec"><b>${k}</b>${t.family === 'display' ? FD : FB} ${t.weight === 700 ? 'Bold' : 'Book'}<br>${t.size}px / ${t.lineHeight} &middot; tracking ${t.tracking}em${t.upper ? ' &middot; UPPER' : ''}<br><span style="color:var(--faint)">${t.use}</span></div>
      <div style="font-family:${fam};font-size:${t.size}px;font-weight:${t.weight};letter-spacing:${t.tracking}em;line-height:${t.lineHeight};text-transform:${t.upper ? 'uppercase' : 'none'}">${sample[k] ?? k}</div></div>`;
  }).join('');
  return `<section id="type">${head(3, 'Typography', FD + ' speaks for the game: uppercase, generously tracked, Book weight. ' + FB + ' is for reading: dialogue and descriptions in sentence case. Sizes are CSS px at the HUD\'s 820 px reference height; the HUD scales between 0.7x and 1.4x.')}
  <div class="grid g2"><div class="card family"><div class="aa" style="font-family:var(--display)">Aa</div><div><h4>${FD}</h4><p class="glyphs" style="font-family:var(--display);text-transform:uppercase;letter-spacing:.12em">ABCDEFGHIJKLM NOPQRSTUVWXYZ 0123456789</p><p class="mono">font.display &middot; titles, menus, HUD, prompts</p></div></div>
  <div class="card family"><div class="aa" style="font-family:var(--body)">Aa</div><div><h4>${FB}</h4><p class="glyphs" style="font-family:var(--body)">Abcdefghijklm nopqrstuvwxyz 0123456789 .,;:?!</p><p class="mono">font.body &middot; dialogue, descriptions, help</p></div></div></div>
  <h3>Scale</h3>${rows}</section>`;
}

// ---- components ----
function charmIcon(kind: string) {
  return (ctx: Ctx, w: number, h: number) => {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6); g.addColorStop(0, '#16306A'); g.addColorStop(1, '#0A1636'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (kind === 'foam') foamCluster(ctx, cx, cy + r * 0.18, r * 0.3, { count: 9, seed: 4 });
    if (kind === 'shard') crystalShard(ctx, cx, cy + r * 0.32, r * 0.62, { cluster: 3, seed: 3 });
    if (kind === 'crown') crownCap(ctx, cx, cy + r * 0.2, r * 0.56, { cusps: 3 });
    if (kind === 'brush') brush(ctx, cx - r * 0.38, cy + r * 0.28, r * 0.86, { angle: -0.6, handle: B.cerise });
    if (kind === 'paste') pasteDollop(ctx, cx, cy + r * 0.26, r * 0.5);
    if (kind === 'tuft') { brush(ctx, cx - r * 0.34, cy + r * 0.3, r * 0.8, { angle: -0.7, handle: B.citrus, tufts: 6 }); }
    ctx.globalCompositeOperation = 'lighter'; halo(ctx, cx, cy, r * 0.5, B.sky, 0.18); ctx.globalCompositeOperation = 'source-over';
  };
}
function components() {
  const shop = [['Interdental Spool', 'Charm. Pogo hits chain into a second bounce.', 'tuft', 180], ['Cerise Handle', 'Brush finish. Purely for looks; Pip swears it is faster.', 'brush', 90], ['Paste Satchel', 'Carry two more paste throws.', 'paste', 240]] as const;
  return `<section id="components">${head(4, 'UI components', 'The game\'s UI is quiet and premium: dark translucent panels, hairline rings, Futura labels and brand pill buttons. Glow only marks focus and readiness.')}
  <h3>Buttons</h3><div class="card"><div class="stage">
    <button class="btn primary">Continue</button><button class="btn primary hover">Hover</button><button class="btn primary focus">Focused</button>
    <button class="btn secondary">Settings</button><button class="btn ghost">Back</button><button class="btn danger">Erase save</button><button class="btn primary" disabled>Disabled</button><button class="btn secondary sm">Small</button>
  </div><div class="stage" style="border-top:1px solid var(--hair)">
    <span class="hint"><span class="key">J</span><span class="key pad">X</span> Blade</span><span class="hint"><span class="key">K</span><span class="key pad">B</span> Dash</span><span class="hint"><span class="key">Space</span><span class="key pad">A</span> Jump</span><span class="hint"><span class="key">F</span> hold &nbsp;Focus</span><span class="hint"><span class="key">E</span> Talk</span>
  </div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card menu"><div class="ttl">PAUSED</div><ul><li class="on">Resume</li><li>Map</li><li>Charms</li><li>Settings</li><li>Quit to title</li></ul></div>
    <div class="card"><div class="bossbar"><div class="nm"><small>The heart of the Deep</small>Mother Calculus</div><div class="bar"><i style="width:calc(64% - 6px);background:linear-gradient(90deg,#B8AE96,#E8E0C8)"></i><i style="left:calc(64% - 3px);width:9%;background:${B.cerise};box-shadow:0 0 12px ${B.cerise}"></i></div></div>
      <div class="pad" style="border-top:1px solid var(--hair)"><h4 style="margin-bottom:14px">Charm slots</h4><div class="charms">${['crown', 'foam', 'shard'].map((k) => `<div class="slot">${a2d(64, charmIcon(k), 'art charm')}</div>`).join('')}<div class="slot empty"></div><div class="slot empty"></div></div>
      <p>Filled slots show the charm on a deep disc with a sky hairline; empty slots are a faint ring.</p></div></div>
  </div>
  <h3>Dialogue</h3><div class="card"><div class="dialogue"><div class="portrait">${a2d(124, portrait)}</div><div><div class="who">Derek<small>Hermit hygienist</small></div>
    <div class="line">You slept a long time, little knight. The towers kept their shine without you. Barely. Twice a day the old Order swept them, morning and night. Habit is a kind of armour.</div>
    <div class="choices"><button class="btn primary sm">Ask about the Film</button><button class="btn secondary sm">Rest a while</button><button class="btn ghost sm">Leave</button></div></div><span class="next"></span></div></div>
  <h3>Shop panel</h3><div class="grid g2"><div class="panel"><h4 style="margin-bottom:6px">Pip's Pocket</h4><p class="note" style="margin:0 0 6px">Shine buys charms, finishes and paste. Selected row gets a blue wash.</p>
    ${shop.map(([n, d, k, p], i) => `<div class="shopitem${i === 0 ? ' sel' : ''}">${a2d(76, charmIcon(k))}<div><h4>${n}</h4><p style="margin:2px 0 0;color:var(--mist);font-size:14px">${d}</p></div><div class="price"><i></i>${p}</div></div>`).join('')}</div>
    <div class="panel" style="display:grid;gap:16px;align-content:start"><h4>Toasts and prompts</h4>
      <div style="background:${T.ui.panel};border-radius:12px;padding:14px 22px;text-align:center;font-family:var(--display);font-size:17px">Rested. The fountain will bring you back here.</div>
      <div style="background:${T.ui.panel};border-radius:12px;padding:14px 22px;text-align:center;font-family:var(--display);font-size:17px">The carving reads: &ldquo;Sweep the towers at sunrise and at dusk.&rdquo;</div>
      <div style="display:flex;gap:28px;justify-content:center;font-family:var(--display);letter-spacing:.2em;font-size:14px;padding-top:6px"><span>REST</span><span>READ</span><span>TALK</span><span style="color:var(--sky)">ENTER</span></div>
      <p class="note">Toasts: ui.panel, radius lg (12), 17 px Futura, 24 px line, fade in 250 ms, hold 3.8 s, fade out 400 ms. World prompts: 14 px, fade with proximity.</p></div></div>
  <h3>HUD (the real hud.ts, fed a stub game)</h3>
  <div class="card" style="position:relative">${art({ k: 'el', h: 500, fn: hudStage })}</div>
  <div class="grid g2" style="margin-top:18px"><div class="card">${art({ k: 'el', h: 150, fn: hudMini(5, 5, 99, 1480) })}<div class="pad"><h4>Full, focus ready</h4><p>The pulsing white ring appears once fluor is at 33 or more (one Focus or one Rinse).</p></div></div>
    <div class="card">${art({ k: 'el', h: 150, fn: hudMini(1, 6, 12, 37) })}<div class="pad"><h4>Last shard</h4><p>Empty shards are an ink fill with a faint ring. At 1 HP the game adds vignette and drops saturation.</p></div></div></div>
  </section>`;
}
function portrait(ctx: Ctx, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#5A1D4F'); g.addColorStop(1, '#1F0A24'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  gumFold(ctx, w / 2, h * 0.86, 30, { width: w + 20, scallops: 4, folds: 1 });
  folk(ctx, w / 2, h * 1.02, 2.6, B.blue60);
  ctx.globalCompositeOperation = 'lighter';
  glowEye(ctx, w / 2 - 2.6, h * 1.02 - 28 * 2.6, 1.9 * 2.6, { mode: 'glow', color: '#D8ECFF', halo: 0.3 }); glowEye(ctx, w / 2 + 5 * 2.6, h * 1.02 - 28 * 2.6, 1.9 * 2.6, { mode: 'glow', color: '#D8ECFF', halo: 0.3 });
  ctx.globalCompositeOperation = 'source-over';
}
function hudFake(hp: number, maxHp: number, fluor: number, shine: number) { return { state: 'play', player: { hp, maxHp, fluor, inflamed: 0 }, save: { shine, flags: {}, progress: { level: 3, xp: 30, points: 1, mastery: {}, perks: [] } }, hudHooks: [], time: 1.6 } as unknown as GameCore; }
function hudMini(hp: number, maxHp: number, fluor: number, shine: number) {
  return (el: HTMLElement, w: number, h: number) => {
    el.style.background = 'radial-gradient(500px 200px at 20% 0%, #1B2A52, #070F2A)';
    const c = document.createElement('canvas'); c.style.cssText = `position:absolute;inset:0;width:${w}px;height:${h}px`; el.style.position = 'relative'; el.appendChild(c);
    const hud = new Hud(c), g = hudFake(hp, maxHp, fluor, shine); for (let i = 0; i < 160; i++) hud.draw(g, 1 / 60);
  };
}
function hudStage(el: HTMLElement, w: number, h: number) {
  el.style.position = 'relative';
  const { c } = canvas(w, h); c.style.position = 'absolute'; el.appendChild(c); LIT.draw(c, diorama('gumline', w, h));
  const hc = document.createElement('canvas'); hc.style.cssText = `position:absolute;inset:0;width:${w}px;height:${h}px`; el.appendChild(hc);
  const hud = new Hud(hc), g = hudFake(3, 5, 62, 214);
  hud.areaTitle('Gumline Hollows', 'The soft country'); hud.toast('Rested. The fountain will bring you back here.');
  for (let i = 0; i < 150; i++) hud.draw(g, 1 / 60);
}

// ---- materials ----
function materials() {
  const cards: [string, string, (ctx: Ctx, w: number, h: number) => void, Record<string, string>][] = [
    ['Enamel', 'Towers, slabs, the helm. Cool white with a sky shade; fissures and growth lines in hairline.', (c, w, h) => { bg(c, w, h, '#0D1736'); enamel(c, w * 0.3, h * 0.95, 64, { shape: 'tower', height: 150, seed: 2 }); enamel(c, w * 0.72, h * 0.95, 96, { shape: 'molar', seed: 3, height: 90 }); }, M.enamel],
    ['Gum', 'Scalloped gumlines with interdental papillae, soft folds. Orchid to cerise.', (c, w, h) => { bg(c, w, h, '#2A0D26'); enamel(c, w * 0.27, h * 0.62, 60, { shape: 'tower', height: 100, seed: 1 }); enamel(c, w * 0.7, h * 0.62, 62, { shape: 'tower', height: 94, seed: 6 }); gumFold(c, w / 2, h * 0.52, h * 0.5, { width: w + 10, scallops: 3, folds: 3 }); }, M.gum],
    ['Cheek wall', 'The soft side walls of the world: dustier, calmer pink so gums stay the accent.', (c, w, h) => { bg(c, w, h, '#2A0D26'); for (let i = 0; i < 3; i++) gumFold(c, w / 2, h * (0.05 + i * 0.32), h * 0.36, { width: w + 20, palette: 'cheek', scallops: 1, folds: 2, seed: i + 2 }); }, { cheek: M.flesh.cheek, shade: M.flesh.cheekShade, ridge: M.flesh.ridge }],
    ['Tongue', 'Rolling landscape: domes, a centre groove, papillae as light freckles.', (c, w, h) => { bg(c, w, h, '#1F0A24'); tongueSurface(c, w / 2, h * 0.32, h * 0.7, { width: w + 10, humps: 3, seed: 2 }); }, { papilla: M.flesh.papilla, tongue: M.flesh.tongue, shade: M.flesh.tongueShade }],
    ['Palate', 'The ceiling: a soft vault with wavy rugae ridges and a centre raphe.', (c, w, h) => { bg(c, w, h, '#1F0A24'); palateRidges(c, w / 2, h / 2, h * 0.7, { width: w - 24, ridges: 5, seed: 3 }); }, { palate: M.flesh.palate, ridge: M.flesh.ridge, shade: M.flesh.ridgeShade }],
    ['Plaque', 'The Film. Glowing, soft, bouncy. Yellow core, citrus spots, tangerine when hot.', (c, w, h) => { bg(c, w, h, '#14101E'); plaqueling(c, w * 0.32, h * 0.86, 2.6, 2); blob(c, w * 0.74, h * 0.62, 30, { color: M.plaque.glow, shade: M.plaque.base, deep: M.plaque.deep, seed: 6, wobble: 0.12, squash: 0.9 }); c.globalCompositeOperation = 'lighter'; halo(c, w * 0.74, h * 0.62, 70, B.yellow, 0.25); plaquelingEm(c, w * 0.32, h * 0.86, 2.6); c.globalCompositeOperation = 'source-over'; }, { core: M.plaque.core, glow: M.plaque.glow, base: M.plaque.base, deep: M.plaque.deep, lime: M.plaque.lime, hot: M.plaque.hot }],
    ['Tartar', 'Calcified plaque. Bone and grey-beige, matte strata, crust nodules, lime glints.', (c, w, h) => { bg(c, w, h, '#1C1A18'); crownCap(c, w * 0.3, h * 0.82, 96, { calcified: true, cusps: 4, seed: 3 }); crownCap(c, w * 0.74, h * 0.82, 70, { calcified: true, cusps: 3, seed: 8 }); }, M.tartar],
    ['Sugar', 'Faceted crystals with a warm syrup core. Sparkle, never sticky-looking.', (c, w, h) => { bg(c, w, h, '#220E06'); c.globalCompositeOperation = 'source-over'; crystalShard(c, w * 0.35, h * 0.92, 120, { cluster: 3, seed: 2 }); crystalShard(c, w * 0.74, h * 0.92, 80, { cluster: 2, seed: 5, angle: 0.2 }); glint(c, w * 0.36, h * 0.2, 7); }, M.sugar],
    ['Paste', 'The brand\'s toothpaste: glossy white with its stripes. The hero\'s thrown weapon.', (c, w, h) => { bg(c, w, h, '#0B1A40'); pasteDollop(c, w * 0.36, h * 0.86, 90); pasteDollop(c, w * 0.74, h * 0.8, 54, { stripe: B.tangerine, stripe2: B.sky, tilt: 0.15 }); }, M.paste],
    ['Foam', 'Paste and rinse foam: bubble domes with a sky edge and a white gloss.', (c, w, h) => { bg(c, w, h, '#0B1A40'); foamCluster(c, w * 0.35, h * 0.8, 52, { seed: 2, count: 18 }); foamCluster(c, w * 0.76, h * 0.8, 32, { seed: 8 }); }, M.foam],
    ['Rinse and saliva', 'Cool clear water: fountains, pools, the Rinse wave. Bright surface line.', (c, w, h) => { bg(c, w, h, '#0A1838'); salivaPool(c, w / 2, h * 0.52, w * 0.8, { depth: 50, seed: 3 }); }, { pool: M.saliva.pool, surface: M.saliva.surface, deep: M.saliva.deep, glow: M.rinse.glow }],
    ['Brush (' + P.product.brush + ' style)', 'Slim octagonal handle in a bold colour, compact head, dense fine filaments.', (c, w, h) => { bg(c, w, h, '#0B1A40'); brush(c, w * 0.08, h * 0.38, w * 0.86, { handle: B.blue }); brush(c, w * 0.08, h * 0.72, w * 0.86, { handle: B.cerise }); }, T.hero.brush as unknown as Record<string, string>],
  ];
  return `<section id="materials">${head(5, 'Materials', 'Every surface in the mouth is one of these materials, drawn with the kit. The chips under each card are the material ramp from tokens.ts.')}
  <div class="grid g4">${cards.map(([n, d, fn, r]) => `<div class="card">${a2d(190, fn)}<div class="ramp" style="display:block;padding:0;border:0"><div class="chips" style="border-radius:0;height:26px">${Object.values(r).filter((v) => typeof v === 'string').map((v) => `<div style="background:${v}"></div>`).join('')}</div></div><div class="pad"><h4>${n}</h4><p>${d}</p></div></div>`).join('')}</div></section>`;
}
function bg(ctx: Ctx, w: number, h: number, c: string) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, mix(c, '#FFFFFF', 0.06)); g.addColorStop(1, c); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }

// ---- kit ----
function kitSection() {
  const K: [string, string, string, (c: Ctx, w: number, h: number) => void][] = [
    ['blob', 'soft blob, stepped shade, rim', 'blob(ctx, x, y, r, { color, squash, light, seed })', (c, w, h) => { bg(c, w, h, '#0B1633'); blob(c, w * 0.22, h * 0.55, 34, { color: M.plaque.glow, seed: 2 }); blob(c, w * 0.52, h * 0.6, 28, { color: M.gum.base, squash: 0.75, flat: 0.3, seed: 5 }); blob(c, w * 0.8, h * 0.55, 30, { color: B.sky, squash: 1.2, seed: 9 }); }],
    ['enamel', 'tower, molar, slab with fissures', 'enamel(ctx, x, yBottom, width, { shape, height, cusps })', (c, w, h) => { bg(c, w, h, '#0B1633'); enamel(c, w * 0.2, h * 0.92, 50, { shape: 'tower', height: 120 }); enamel(c, w * 0.52, h * 0.92, 74, { shape: 'molar', height: 70 }); enamel(c, w * 0.82, h * 0.6, 80, { shape: 'slab' }); }],
    ['gumFold', 'scalloped gum and flesh folds', 'gumFold(ctx, x, yTop, height, { width, scallops, palette })', (c, w, h) => { bg(c, w, h, '#0B1633'); gumFold(c, w / 2, h * 0.12, h * 0.34, { width: w - 30, scallops: 4 }); gumFold(c, w / 2, h * 0.56, h * 0.34, { width: w - 30, scallops: 3, palette: 'calculus' }); }],
    ['glowEye', 'round, almond, slit; scene + glow', 'glowEye(ctx, x, y, r, { shape, color, look, blink, mode })', (c, w, h) => { bg(c, w, h, '#050B1F'); glowEye(c, w * 0.2, h / 2, 16, { color: '#D8ECFF', look: [0.6, 0] }); glowEye(c, w * 0.5, h / 2, 16, { shape: 'almond', color: B.yellow, look: [-0.5, 0.4] }); glowEye(c, w * 0.8, h / 2, 16, { shape: 'slit', color: B.citrus }); }],
    ['crownCap', 'the molar-crown motif', 'crownCap(ctx, x, yBottom, width, { cusps, calcified })', (c, w, h) => { bg(c, w, h, '#0B1633'); crownCap(c, w * 0.18, h * 0.72, 56, { cusps: 2 }); crownCap(c, w * 0.48, h * 0.72, 66, { cusps: 3 }); crownCap(c, w * 0.8, h * 0.74, 76, { cusps: 4, calcified: true }); }],
    ['foamCluster', 'bubble domes', 'foamCluster(ctx, x, yBase, r, { count, seed })', (c, w, h) => { bg(c, w, h, '#0B1633'); foamCluster(c, w * 0.3, h * 0.78, 46, { count: 18 }); foamCluster(c, w * 0.75, h * 0.78, 30, { seed: 7, tint: B.orchid }); }],
    ['crystalShard', 'faceted shards and clusters', 'crystalShard(ctx, x, yBase, length, { angle, cluster })', (c, w, h) => { bg(c, w, h, '#1A0B05'); crystalShard(c, w * 0.18, h * 0.9, 100); crystalShard(c, w * 0.52, h * 0.9, 110, { cluster: 3, seed: 4 }); crystalShard(c, w * 0.84, h * 0.9, 90, { lit: M.tartar.hi, dark: M.tartar.base, core: B.citrus, angle: -0.2, glow: false }); }],
    ['lightShaft', 'beams with drifting motes', 'lightShaft(ctx, x, yTop, length, { angle, width, color })', (c, w, h) => { bg(c, w, h, '#050B1F'); lightShaft(c, w * 0.3, -6, h + 10, { width: 26, alpha: 0.45, motes: 14 }); lightShaft(c, w * 0.7, -6, h + 10, { width: 20, alpha: 0.4, color: B.orchid, angle: -0.2, seed: 6 }); }],
    ['fogBand', 'wavy haze between planes', 'fogBand(ctx, x, yCentre, height, { width, color, alpha })', (c, w, h) => { bg(c, w, h, '#050B1F'); silhouetteStrip(c, w / 2, h * 0.7, h * 0.5, { width: w, color: '#12224A', seed: 2 }); fogBand(c, w / 2, h * 0.62, h * 0.4, { width: w, alpha: 0.3 }); fogBand(c, w / 2, h * 0.9, h * 0.25, { width: w, color: B.orchid, alpha: 0.25, seed: 9 }); }],
    ['brush', P.product.brush + ' style brush-blade', 'brush(ctx, x, y, length, { angle, handle, filament })', (c, w, h) => { bg(c, w, h, '#0B1633'); brush(c, w * 0.1, h * 0.35, w * 0.8, { handle: B.tangerine }); brush(c, w * 0.1, h * 0.75, w * 0.8, { handle: B.citrus }); }],
    ['pasteDollop', 'the thrown toothpaste', 'pasteDollop(ctx, x, yBase, width, { stripe, stripe2 })', (c, w, h) => { bg(c, w, h, '#0B1633'); pasteDollop(c, w * 0.3, h * 0.85, 70); pasteDollop(c, w * 0.72, h * 0.85, 56, { stripe: B.citrus, stripe2: B.orchid }); }],
    ['palateRidges', 'rugae ceiling', 'palateRidges(ctx, x, y, height, { width, ridges })', (c, w, h) => { bg(c, w, h, '#1F0A24'); palateRidges(c, w / 2, h / 2, h * 0.6, { width: w - 30 }); }],
    ['tongueSurface', 'tongue landscape', 'tongueSurface(ctx, x, yTop, height, { width, humps })', (c, w, h) => { bg(c, w, h, '#1F0A24'); tongueSurface(c, w / 2, h * 0.4, h * 0.6, { width: w, humps: 2 }); }],
    ['salivaPool', 'shallow clear pool', 'salivaPool(ctx, x, ySurface, width, { depth, time })', (c, w, h) => { bg(c, w, h, '#0A1838'); salivaPool(c, w / 2, h * 0.45, w * 0.8, { depth: 44 }); }],
    ['glint', 'four-point sparkle', 'glint(ctx, x, y, arm, { color, rot })', (c, w, h) => { bg(c, w, h, '#050B1F'); glint(c, w * 0.25, h / 2, 18); glint(c, w * 0.5, h / 2, 12, { color: B.yellow, rot: 0.3 }); glint(c, w * 0.75, h / 2, 22, { color: B.sky }); }],
    ['silhouetteStrip', 'parallax silhouettes', 'silhouetteStrip(ctx, x, yBase, height, { kind, color })', (c, w, h) => { bg(c, w, h, '#0B1A40'); silhouetteStrip(c, w / 2, h * 0.45, h * 0.35, { width: w, kind: 'towers', color: '#1B2A52' }); silhouetteStrip(c, w / 2, h * 0.75, h * 0.35, { width: w, kind: 'crystals', color: '#5A2A10', seed: 3 }); silhouetteStrip(c, w / 2, h * 1.02, h * 0.3, { width: w, kind: 'reef', color: '#36332F', seed: 6 }); }],
  ];
  return `<section id="kit">${head(6, 'Drawing kit', 'Pure functions in src/design/kit.ts: (ctx, x, y, size, opts). Deterministic by seed, state-safe, usable in world units or CSS px. These cards are drawn by the kit itself; the nine core helpers come first.')}
  <div class="grid g4">${K.map(([n, d, sig, fn], i) => `<div class="card kitcard">${a2d(170, fn)}<div class="pad"><h4>${n}<em>${i < 9 ? 'core' : 'extra'}</em></h4><p>${d}</p><code>${sig}</code></div></div>`).join('')}</div>
  <p class="note">Rule of thumb: draw the body with the kit on the scene canvas, then call the same helper with mode 'glow' (eyes) or draw halos on the emissive canvas. Kit functions never call Math.random. Kit exported names: ${Object.keys(kit).join(', ')}.</p></section>`;
}

// ---- hero ----
function heroSection() {
  const P: [Pose, string, string][] = [['idle', 'Idle', 'bladeA 2.3'], ['idleL', 'Idle, left', 'facing -1'], ['run', 'Run A', 'runPhase π/2'], ['run2', 'Run B', 'runPhase -π/2'], ['jump', 'Jump', 'vy -700 stretch'], ['fall', 'Fall', 'vy 640'],
    ['slash', 'Slash', 'side, flip +1'], ['slash2', 'Slash return', 'side, flip -1'], ['up', 'Up-slash', 'dir up'], ['pogo', 'Pogo', 'dir down'], ['dash', 'Prime dash', 'sx 1.35 sy 0.7'], ['focus', 'Focus', 'focusT 0.6']];
  const tile = (pose: Pose) => (w: number, h: number): LitScene => {
    const s = 2.6, x = w / 2 - (pose === 'dash' ? -14 : 0), gy = h * 0.86 - (pose === 'jump' || pose === 'fall' || pose === 'pogo' ? 18 : 0);
    return { ambient: '#4A5068', grade: { vignette: 0.45, bloom: 0.4, bloomThreshold: 0.82 }, lights: heroLights(pose, x, gy, s / 2.6, 0.35),
      scene(ctx) { const g = ctx.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w); g.addColorStop(0, '#1B2A52'); g.addColorStop(1, '#070F2A'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#132B57'; ctx.fillRect(0, h * 0.86, w, h); ctx.fillStyle = 'rgba(201,214,238,0.35)'; ctx.fillRect(0, h * 0.86, w, 1.5); hero(ctx, pose, x, gy, s); },
      emissive(ctx) { heroEm(ctx, pose, x, gy, s); } };
  };
  const brushes = T.brushHandles.map((b) => `<div style="display:grid;grid-template-columns:1fr 130px;align-items:center;gap:12px">${a2d(44, (c, w, h) => brush(c, 6, h * 0.62, w - 12, { handle: b.handle, filament: b.filament }))}<span class="mono">${b.name}<br>${b.handle}</span></div>`).join('');
  const chips = Object.entries(T.hero).filter(([, v]) => typeof v === 'string').map(([k, v]) => `<div style="display:flex;align-items:center;gap:10px;font-size:12.5px"><span class="chipdot" style="background:${v};width:22px;height:22px;border-radius:6px"></span><span>${k}</span><span class="mono" style="margin-left:auto">${v}</span></div>`).join('');
  return `<section id="hero">${head(7, 'The hero', 'Bristle, last knight of the ' + T.pack.product.order + '. Drawn by the real Player class from src/game/player.ts, posed by setting its fields (facing, velocity, slash, focus, squash) and run through the game\'s lighting. Enamel crown helm with two cusps, brand-primary cloak, sky visor, the brush-blade.')}
  <h3>Pose sheet</h3><div class="grid g6">${P.map(([p, n, d]) => `<div class="card pose">${aLit(200, tile(p))}<div class="lbl">${n}<small>${d}</small></div></div>`).join('')}</div>
  <h3>Proportions and hit boxes</h3>
  <div class="grid" style="grid-template-columns:1.25fr 1fr;gap:18px;align-items:start"><div class="card">${a2d(470, proportions)}<div class="pad"><p>One tile is 32 units; the camera shows 17 tiles of height. The hero is 42 units of body plus a 10-unit crown: about 1.6 tiles. The helm is a third of the height, which keeps the crown readable at any zoom. Blue box: hurt box (10 x 21 half extents). Sky: side slash reach (42 forward, 40 x 26). Dashed: up and down slash.</p></div></div>
  <div class="card"><div class="pad"><h4>Hero palette</h4><div style="display:grid;gap:8px;margin-top:12px">${chips}</div></div><div class="pad" style="border-top:1px solid var(--hair)"><h4>Brush handle variants</h4><p>${T.pack.product.brush} comes in many bold colours: handle finishes are a natural cosmetic unlock (tokens.brushHandles).</p><div style="display:grid;gap:4px;margin-top:10px">${brushes}</div></div></div></div>
  </section>`;
}
function proportions(ctx: Ctx, w: number, h: number) {
  const s = 3.6, gy = h * 0.84, x = w * 0.42;
  bg(ctx, w, h, '#070F2A');
  ctx.strokeStyle = 'rgba(139,184,232,0.1)'; ctx.lineWidth = 1;
  for (let gx = x % (32 * s); gx < w; gx += 32 * s) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
  for (let yy = gy; yy > 0; yy -= 32 * s) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
  ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy);
  hero(ctx, 'idle', x, gy, s);
  ctx.globalCompositeOperation = 'lighter'; heroEm(ctx, 'idle', x, gy, s); ctx.globalCompositeOperation = 'source-over';
  const box = (bx: number, by: number, hw: number, hh: number, col: string, dash = false) => { ctx.setLineDash(dash ? [5, 5] : []); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(x + (bx - hw) * s, gy + (by - hh) * s, hw * 2 * s, hh * 2 * s); ctx.setLineDash([]); };
  box(0, -21, 10, 21, '#3364B7'); box(42, -23, 40, 26, 'rgba(139,184,232,0.8)'); box(0, -65, 30, 36, 'rgba(204,216,237,0.3)', true);
  ctx.font = `12px ${T.font.display}`; ctx.fillStyle = 'rgba(232,238,249,0.8)'; ctx.textAlign = 'left';
  const mark = (y0: number, y1: number, xx: number, label: string) => { ctx.strokeStyle = 'rgba(232,238,249,0.6)'; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.moveTo(xx - 4, y0); ctx.lineTo(xx + 4, y0); ctx.moveTo(xx - 4, y1); ctx.lineTo(xx + 4, y1); ctx.stroke(); ctx.fillText(label, xx + 8, (y0 + y1) / 2 + 4); };
  mark(gy, gy - 52 * s, x - 190, '52 u ≈ 1.6 tiles'); mark(gy - 52 * s, gy - 32 * s - 1, x - 76, 'helm');
  ctx.fillStyle = 'rgba(139,184,232,0.9)'; ctx.fillText('SIDE SLASH', x + 4 * s, gy - 52 * s); ctx.fillStyle = '#668BC9'; ctx.fillText('HURT BOX', x - 12 * s, gy + 20); ctx.fillStyle = 'rgba(204,216,237,0.6)'; ctx.fillText('UP SLASH', x - 28 * s, gy - 104 * s);
  ctx.fillText('1 TILE = 32 U', 14, 22);
}

// ---- hero options ----
// Six deviations of today's knight. Same crown helm and visor glow, no face. What changes is the body
// (knight proportions: about 2.5-3 heads instead of 1.6), the helm's silhouette and the dental gear.
// Feet at (0,0), facing right, about 58 units tall. mode 'scene' draws the body, 'glow' the emissive parts.
type KMode = 'scene' | 'glow';
// A. Vanguard: today's hero grown up. Taller coronet helm with a T-visor, a bristle plume, incisor pauldrons,
//    brand tabard with the white stripe, half cape, the brush-blade carried as a longsword.
function knightVanguard(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  const visor = poly([-0.5, -48.6, 8.8, -48.6, 8.8, -46.6, 4.6, -46.6, 4.6, -41.8, 2.6, -41.8, 2.6, -46.6, -0.5, -46.6]);
  if (mode === 'glow') { visorGlow(ctx, visor, 4.5, -47, 18); halo(ctx, 18.5, -66, 12, B.sky, 0.4); return; }
  const cape = new Path2D(); cape.moveTo(-5, -38); cape.quadraticCurveTo(-19, -28, -19, -6); cape.lineTo(-15, -8); cape.lineTo(-12, -4); cape.lineTo(-9, -8); cape.lineTo(-6, -5); cape.quadraticCurveTo(-5, -22, 1, -37); cape.closePath();
  ctx.fillStyle = dk; ctx.fill(cape); ctx.strokeStyle = pr; ctx.lineWidth = 1.2; ctx.stroke(cape);
  legsK(ctx, -20, 17, 4.6, [-3.2, -5.5], [2.6, 4.5], KE.cloth, true);
  ctx.fillStyle = KE.cloth; ctx.beginPath(); ctx.roundRect(-8, -38, 16, 19, 4); ctx.fill();
  plate(ctx, (() => { const p = new Path2D(); p.moveTo(-8.4, -37.5); p.quadraticCurveTo(-10, -29, -7, -22); p.lineTo(7.5, -22); p.quadraticCurveTo(10.2, -29, 8.4, -37.5); p.quadraticCurveTo(0, -39.6, -8.4, -37.5); return p; })(), { sx: 3, sy: -33, sr: 10.5, gloss: [4.5, -34.5, 2.4, 1.1] });
  const tab = poly([-4.6, -33, 4.6, -33, 5.6, -13, 0, -9.5, -5.6, -13]); ctx.fillStyle = pr; ctx.fill(tab);
  ctx.save(); ctx.clip(tab); ctx.fillStyle = dk; ctx.fillRect(-6, -33, 3.2, 24); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-6, -17.5, 12, 1.7); ctx.restore();
  ctx.fillStyle = B.ink; ctx.fillRect(-8.2, -22.4, 16.4, 2.6); crownCap(ctx, 0, -20, 5.4, { cusps: 3 });
  plate(ctx, (() => { const p = new Path2D(); p.ellipse(-8.2, -35.5, 3.8, 4.6, 0.3, 0, TAU); return p; })(), { base: KE.shade, shade: KE.deep, sx: -7, sy: -37, sr: 3.6 });
  // the CS 5460 as a two-handed greatsword: upright in guard, both gauntlets on the handle
  brush(ctx, 4, -14, 54, { angle: -1.3, handle: pr });
  ctx.lineCap = 'round'; ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(-5.5, -34); ctx.quadraticCurveTo(-4, -22, 4.2, -18.2); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(2, -21, 5.6, 5.4, 1.9)), { base: KE.shade, shade: KE.deep, sx: 5, sy: -20.5, sr: 3.2 });
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(7.5, -34); ctx.quadraticCurveTo(10, -29, 7, -25.2); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(4.2, -28, 5.6, 5.4, 1.9)), { sx: 7.2, sy: -27.5, sr: 3.4 });
  plate(ctx, (() => { const p = new Path2D(); p.moveTo(4.5, -38.5); p.quadraticCurveTo(13.5, -40, 13, -33); p.quadraticCurveTo(12.4, -30.2, 9.2, -30.4); p.quadraticCurveTo(5, -31, 4.5, -38.5); return p; })(), { sx: 10, sy: -38, sr: 5, gloss: [8.8, -37, 1.8, 0.8] });
  plume(ctx, -5.5, -56, 15, pr, 11, -2.2, -3.6, -0.5);
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -38.6, 8.6, 2.2, 0, 0, TAU); ctx.fill();
  const helm = new Path2D(); helm.moveTo(-9, -39.5); helm.quadraticCurveTo(-11.4, -47, -9.6, -52.5); helm.quadraticCurveTo(-9, -59.6, -5.6, -54.6); helm.quadraticCurveTo(-3.6, -60.4, -1, -55.2);
  helm.quadraticCurveTo(1.8, -60.4, 4.2, -55); helm.quadraticCurveTo(7.6, -59.2, 9, -52.4); helm.quadraticCurveTo(11.4, -46, 9.8, -39.5); helm.quadraticCurveTo(0.4, -37.4, -9, -39.5); helm.closePath();
  plate(ctx, helm, { sx: 5, sy: -50, sr: 11.5, gloss: [5, -53.5, 2.6, 1.2] });
  ctx.strokeStyle = 'rgba(120,140,185,0.75)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-3.6, -55); ctx.quadraticCurveTo(-3, -52.5, -1.5, -51.5); ctx.moveTo(1.8, -55); ctx.quadraticCurveTo(1.2, -52.5, -0.4, -51.5); ctx.stroke();
  ctx.fillStyle = B.ink; ctx.fill(visor);
}

// B. Ranger: the archer of the Order. A swept canine-tooth sallet with an angled slit, a short hooded mantle
//    lined in gum pink, a bandolier of refills, a quiver on the back, the ring holder raised like a bow.
function knightRanger(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark, S = T.idb.sizes;
  const slit = poly([0.5, -48.4, 9.4, -51.6, 9.6, -49.4, 0.5, -46.6]);
  if (mode === 'glow') { visorGlow(ctx, slit, 5, -49, 16); halo(ctx, 24, -33, 12, '#FFFFFF', 0.3); return; }
  ctx.save(); ctx.translate(-7.5, -27); ctx.rotate(-0.6); ctx.fillStyle = dk; ctx.beginPath(); ctx.roundRect(-2.6, -12, 5.2, 18, 2); ctx.fill();
  [S.s, S.m, S.l].forEach((z, i) => idbRefill(ctx, -1.3 + i * 1.3, -11, 7, { col: z.col, angle: -0.1 + i * 0.1 })); ctx.restore();
  const scarf = new Path2D(); scarf.moveTo(-4, -38); scarf.quadraticCurveTo(-14, -36, -22, -30); scarf.lineTo(-20, -27.5); scarf.quadraticCurveTo(-13, -32, -4, -35); scarf.closePath(); ctx.fillStyle = B.cerise; ctx.fill(scarf);
  legsK(ctx, -21, 18, 3.8, [-2.6, -7.5], [2.2, 6], KE.base, false);
  ctx.fillStyle = pr; ctx.fillRect(-9.4, -8.5, 4, 2); ctx.fillRect(4.2, -8.5, 4, 2);
  const jer = new Path2D(); jer.moveTo(-6.5, -36); jer.quadraticCurveTo(-8, -28, -6.5, -19); jer.lineTo(6.5, -19); jer.quadraticCurveTo(8, -28, 6.5, -36); jer.closePath(); ctx.fillStyle = KE.cloth; ctx.fill(jer);
  ctx.strokeStyle = B.ink2; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, -35); ctx.lineTo(6, -21); ctx.stroke();
  [S.s, S.m, S.l, S.m].forEach((z, i) => { ctx.fillStyle = z.col; ctx.beginPath(); ctx.roundRect(-4.6 + i * 3, -33.6 + i * 3.5, 2, 2.8, 0.6); ctx.fill(); });
  ctx.fillStyle = B.ink; ctx.fillRect(-6.8, -20.8, 13.6, 2.2);
  const mantle = new Path2D(); mantle.moveTo(-8.5, -38.5); mantle.quadraticCurveTo(-11.5, -33, -9.5, -29); for (let i = 0; i < 4; i++) mantle.quadraticCurveTo(-7.4 + i * 4.6, -26.4, -5 + i * 4.6, -29.2); mantle.quadraticCurveTo(11, -33, 8.4, -38.5); mantle.quadraticCurveTo(0, -41, -8.5, -38.5); mantle.closePath();
  ctx.fillStyle = B.orchid; ctx.save(); ctx.translate(0, 1.1); ctx.fill(mantle); ctx.restore(); ctx.fillStyle = pr; ctx.fill(mantle);
  ctx.save(); ctx.clip(mantle); ctx.fillStyle = dk; ctx.fillRect(-12, -40, 6, 14); ctx.restore();
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -35); ctx.lineTo(16, -33.5); ctx.stroke();
  idbHolder(ctx, 21, -33, 22, { angle: Math.PI / 2, loaded: S.m.col });
  plate(ctx, (() => { const p = new Path2D(); p.roundRect(14.5, -35.6, 5, 4.6, 1.8); return p; })(), { sx: 17, sy: -35, sr: 3 });
  const helm = new Path2D(); helm.moveTo(-7.5, -40); helm.quadraticCurveTo(-10.5, -45, -15.5, -47.5); helm.quadraticCurveTo(-12, -50, -9, -50.6); helm.quadraticCurveTo(-6.5, -59.6, 1.5, -61);
  helm.quadraticCurveTo(9, -57, 9.6, -48); helm.quadraticCurveTo(10, -42, 7, -39.6); helm.quadraticCurveTo(0, -38.4, -7.5, -40); helm.closePath();
  plate(ctx, helm, { sx: 4, sy: -49, sr: 10.5, gloss: [4.2, -55, 2.2, 1] });
  ctx.strokeStyle = 'rgba(120,140,185,0.75)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(1, -60); ctx.quadraticCurveTo(-3, -52, -9, -49.8); ctx.stroke();
  ctx.fillStyle = B.ink; ctx.fill(slit);
}

// C. Bulwark: the shield of the Order. Short and broad, a flat-cusped molar helm with a bristle-bar visor,
//    molar-cusp pauldrons, a round crown shield in the brand colour, the brush-blade slung across the back.
function knightBulwark(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  const bars = new Path2D(); for (let i = 0; i < 5; i++) bars.roundRect(-0.6 + i * 2.2, -48.5, 1.2, 6.4, 0.6);
  if (mode === 'glow') { visorGlow(ctx, bars, 4, -45.5, 17); return; }
  brush(ctx, -14, -16, 40, { angle: -0.95, handle: pr });
  const cape = new Path2D(); cape.moveTo(-10, -37); cape.quadraticCurveTo(-15, -22, -13, -8); cape.lineTo(9, -8); cape.quadraticCurveTo(11, -22, 9, -37); cape.closePath(); ctx.fillStyle = dk; ctx.fill(cape);
  legsK(ctx, -17, 13, 5.6, [-4, -6.5], [3.6, 5], KE.cloth, true);
  const chest = new Path2D(); chest.moveTo(-10.5, -37); chest.quadraticCurveTo(-13, -27, -9.5, -17.5); chest.lineTo(9.5, -17.5); chest.quadraticCurveTo(13, -27, 10.5, -37); chest.quadraticCurveTo(0, -40, -10.5, -37); chest.closePath();
  plate(ctx, chest, { sx: 4, sy: -31, sr: 13, gloss: [5, -33.5, 2.6, 1.2] });
  ctx.save(); ctx.clip(chest); ctx.fillStyle = pr; ctx.fillRect(-14, -27.5, 28, 6); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-14, -23.2, 28, 1.4); ctx.restore();
  for (const [sx, k] of [[-11, -1], [11, 1]] as [number, number][]) { // molar-cusp pauldrons
    const p = new Path2D(); p.moveTo(sx - 5.5, -33); p.quadraticCurveTo(sx - 6.5, -40, sx - 3, -40); p.quadraticCurveTo(sx - 1.5, -42.6, sx, -40.2); p.quadraticCurveTo(sx + 1.6, -42.6, sx + 3, -40); p.quadraticCurveTo(sx + 6.5, -40, sx + 5.5, -33); p.quadraticCurveTo(sx, -31, sx - 5.5, -33); p.closePath();
    plate(ctx, p, k < 0 ? { base: KE.shade, shade: KE.deep, sx: sx + 2, sy: -38, sr: 5 } : { sx: sx + 1.5, sy: -38, sr: 5.5, gloss: [sx + 1.5, -38.6, 1.6, 0.8] });
  }
  const shield = new Path2D(); shield.arc(10, -20, 9.5, 0, TAU);
  plate(ctx, shield, { sx: 12, sy: -22, sr: 9 }); const field = new Path2D(); field.arc(10, -20, 7.6, 0, TAU); ctx.fillStyle = pr; ctx.fill(field);
  ctx.save(); ctx.clip(field); ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(6, -16, 9, 0, TAU); ctx.fill(); ctx.restore(); crownCap(ctx, 10, -16.5, 9, { cusps: 3 });
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -38.4, 9.2, 2.2, 0, 0, TAU); ctx.fill();
  const helm = new Path2D(); helm.moveTo(-10.5, -39); helm.quadraticCurveTo(-12.5, -46, -10.5, -51); helm.quadraticCurveTo(-8.5, -55.4, -5.4, -52.8); helm.quadraticCurveTo(-3, -55.6, -0.4, -53);
  helm.quadraticCurveTo(2.4, -55.6, 5, -52.8); helm.quadraticCurveTo(8.6, -55.2, 10.6, -50.6); helm.quadraticCurveTo(12.6, -45, 10.8, -39); helm.quadraticCurveTo(0, -36.6, -10.5, -39); helm.closePath();
  plate(ctx, helm, { sx: 5, sy: -47, sr: 12.5, gloss: [6, -51, 2.6, 1.1] });
  ctx.fillStyle = B.ink; ctx.beginPath(); ctx.roundRect(-1.8, -49.4, 12, 8.2, 2.2); ctx.fill();
  ctx.fillStyle = mix(B.ink, '#FFFFFF', 0.25); ctx.fill(bars);
}
// D. Sentinel: tall and calm. Long legs, a long tabard to the knee, a wide-brimmed crown helm (three tall cusps above
//    the brim, the slit in its shadow), one round pauldron, and the long angled interdental handle carried as a scythe.
const SENTINEL_SLIT = poly([0, -45.6, 10.5, -45.6, 10.5, -44, 0, -44]);
function knightSentinel(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  if (mode === 'glow') { visorGlow(ctx, SENTINEL_SLIT, 5, -45, 16); return; }
  legsK(ctx, -24, 21, 4, [-2.5, -4], [2.5, 3.5], KE.cloth, true);
  const tab = poly([-7, -40, 7, -40, 8.5, -9, 3, -12, 0, -7, -3, -12, -8.5, -9]); ctx.fillStyle = pr; ctx.fill(tab);
  ctx.save(); ctx.clip(tab); ctx.fillStyle = dk; ctx.fillRect(-9, -40, 5, 34); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-9, -16, 18, 1.6); ctx.restore();
  plate(ctx, fnPath((p) => { p.moveTo(-6.5, -40); p.quadraticCurveTo(-7.5, -33, -5.5, -27); p.lineTo(5.5, -27); p.quadraticCurveTo(7.5, -33, 6.5, -40); p.quadraticCurveTo(0, -42, -6.5, -40); }), { sx: 3, sy: -36, sr: 8, gloss: [3.5, -37, 1.8, 0.9] });
  ctx.fillStyle = B.ink; ctx.fillRect(-6.4, -28, 12.8, 2.2); crownCap(ctx, 0, -25.8, 4.6, { cusps: 3 });
  // back arm hangs, front hand holds the spear upright
  ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, -38); ctx.quadraticCurveTo(-8, -31, -7, -25); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(-9.5, -26.5, 5, 5, 1.8)), { base: KE.shade, shade: KE.deep, sx: -6, sy: -26, sr: 3 });
  idbHolder(ctx, 9.5, -12, 60, { kind: 'angled', angle: -0.1, loaded: T.idb.sizes.l.col, refillSize: 25 }); // the angled IDB handle as a scythe, held high so the blade arcs over the helm
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(5, -38); ctx.quadraticCurveTo(9, -35, 10.5, -30); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(8, -32.5, 5.6, 5.4, 1.9)), { sx: 11, sy: -32, sr: 3.4 });
  plate(ctx, fnPath((p) => p.ellipse(6.5, -38.5, 5, 4, 0.2, 0, TAU)), { sx: 8, sy: -40, sr: 4.5, gloss: [6.5, -40, 1.5, 0.7] });
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -41.2, 7, 1.9, 0, 0, TAU); ctx.fill();
  // helm: dome with three tall cusps, then a wide brim that shades the slit
  plate(ctx, fnPath((p) => { p.moveTo(-8, -46); p.quadraticCurveTo(-9.5, -55, -7.5, -60); p.quadraticCurveTo(-6.5, -67, -3.6, -61.5); p.quadraticCurveTo(-1, -68.5, 1.6, -61.6); p.quadraticCurveTo(4.6, -67, 6.6, -60); p.quadraticCurveTo(9.4, -55, 8.6, -46); p.closePath(); }), { sx: 4, sy: -55, sr: 9.5, gloss: [3.5, -59, 1.8, 0.9] });
  plate(ctx, fnPath((p) => p.ellipse(0.5, -46.6, 13.5, 2.6, 0, 0, TAU)), { sx: 3, sy: -48, sr: 12, gloss: [5, -47.5, 3, 0.6] });
  plate(ctx, fnPath((p) => { p.moveTo(-7.4, -45.5); p.lineTo(8.6, -45.5); p.quadraticCurveTo(9.2, -41.5, 6.6, -40.6); p.lineTo(-5.4, -40.6); p.quadraticCurveTo(-8, -41.5, -7.4, -45.5); }), { base: KE.shade, shade: KE.deep, sx: 3, sy: -44, sr: 8 });
  ctx.fillStyle = B.ink; ctx.fill(SENTINEL_SLIT);
}

/** A toothbrush travel case as a shield: a bright rounded box, a clear lid seam with a clasp, a carry loop on top. */
function travelCase(ctx: Ctx, x: number, y: number, w: number, h: number, col: string) {
  ctx.save(); ctx.translate(x, y);
  const lid = mix(col, '#FFFFFF', 0.25), shade = mix(col, '#000000', 0.22);
  ctx.strokeStyle = '#F3F6FC'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -h / 2, w * 0.22, Math.PI, 0); ctx.stroke(); // carry loop
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.28); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.28); ctx.clip();
  ctx.fillStyle = lid; ctx.fillRect(-w / 2, -h / 2, w, h * 0.42); ctx.fillStyle = shade; ctx.fillRect(w * 0.18, -h / 2, w * 0.4, h); ctx.restore();
  ctx.strokeStyle = shade; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2 + h * 0.42); ctx.lineTo(w / 2, -h / 2 + h * 0.42); ctx.stroke();
  ctx.fillStyle = '#F3F6FC'; ctx.beginPath(); ctx.roundRect(-w * 0.12, -h / 2 + h * 0.36, w * 0.24, h * 0.14, 1); ctx.fill(); // clasp
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-w * 0.24, -h * 0.32, w * 0.14, h * 0.05, -0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

// E. Duelist (the Squire Knight body): stout and quick, the closest to today's hero. A round two-cusp helm with a closed
//    slit, a short flared cape, and a single-tuft brush in each hand.
const SQUIRE_SLIT = fnPath((p) => p.roundRect(-0.5, -46.4, 11.5, 3, 1.5));
function knightSquire(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  if (mode === 'glow') { visorGlow(ctx, SQUIRE_SLIT, 5, -45, 15); return; }
  const cape = fnPath((p) => { p.moveTo(-6, -33); p.quadraticCurveTo(-15, -28, -17, -15); p.lineTo(-13, -16); p.lineTo(-11, -12); p.quadraticCurveTo(-8, -22, -2, -30); p.closePath(); }); ctx.fillStyle = dk; ctx.fill(cape); ctx.strokeStyle = pr; ctx.lineWidth = 1.2; ctx.stroke(cape);
  legsK(ctx, -17, 14, 5, [-3, -7], [3, 6.5], KE.cloth, true);
  ctx.fillStyle = pr; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(8, -22); ctx.lineTo(9, -14); ctx.quadraticCurveTo(0, -12, -9, -14); ctx.closePath(); ctx.fill();
  plate(ctx, fnPath((p) => { p.moveTo(-8, -34); p.quadraticCurveTo(-10.5, -26, -7.5, -20.5); p.lineTo(7.5, -20.5); p.quadraticCurveTo(10.5, -26, 8, -34); p.quadraticCurveTo(0, -36.5, -8, -34); }), { sx: 3, sy: -30, sr: 9.5, gloss: [4, -31, 2, 1] });
  ctx.fillStyle = B.ink; ctx.fillRect(-8, -22.4, 16, 2.4); crownCap(ctx, 0, -20.2, 5, { cusps: 3 });
  // front hand: the single-tuft sword, raised and ready
  singleTuft(ctx, 10.5, -25, 38, -0.95, '#E8519A', '#D8F24A');
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -32); ctx.quadraticCurveTo(10, -30, 10.5, -26); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(7.8, -28.4, 5.6, 5.4, 1.9)), { sx: 10.5, sy: -28, sr: 3.4 });
  plate(ctx, fnPath((p) => p.ellipse(6.5, -32.5, 4.4, 3.6, -0.3, 0, TAU)), { sx: 8, sy: -34, sr: 4, gloss: [6.5, -34, 1.4, 0.6] });
  // back hand: the travel case held across the body as a shield
  // the second single tuft in the back hand, low and forward, ready to follow up
  ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(-6, -32); ctx.quadraticCurveTo(-8, -26, -4, -22); ctx.stroke();
  singleTuft(ctx, -4, -21.5, 34, -0.25, '#2A4FBF', '#F5E03A');
  plate(ctx, fnPath((p) => p.roundRect(-6.8, -24.4, 5.4, 5.2, 1.8)), { base: KE.shade, shade: KE.deep, sx: -4, sy: -24, sr: 3 });
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -35, 8, 2.1, 0, 0, TAU); ctx.fill();
  // helm: big round two-cusp crown with a closed slit, like today's hero grown up
  plate(ctx, fnPath((p) => { p.moveTo(-11, -37); p.quadraticCurveTo(-13.5, -48, -10, -54); p.quadraticCurveTo(-8, -60, -4, -56); p.quadraticCurveTo(0.5, -58, 4.5, -56); p.quadraticCurveTo(9, -60, 10.6, -53.5); p.quadraticCurveTo(13.5, -47, 11, -37); p.quadraticCurveTo(0, -34.5, -11, -37); p.closePath(); }), { sx: 5, sy: -47, sr: 12.5, gloss: [5, -52, 2.6, 1.2] });
  ctx.strokeStyle = 'rgba(120,140,185,0.75)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-1.5, -56); ctx.quadraticCurveTo(-1, -53, 0.5, -52); ctx.stroke();
  ctx.fillStyle = B.ink; ctx.fill(SQUIRE_SLIT);
}

/** A tongue cleaner as a crescent glaive: a thick translucent arc with rounded tips and a grip at its middle. */
function crescent(ctx: Ctx, x: number, y: number, r: number, angle: number) {
  const col = '#F6A5CB', shade = '#D95A9E', a0 = -1.7, a1 = 1.7;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const arc = fnPath((p) => { p.arc(0, 0, r, a0, a1); p.arc(0, 0, r * 0.68, a1, a0, true); p.closePath(); });
  ctx.globalAlpha = 0.88; ctx.fillStyle = col; ctx.fill(arc); ctx.globalAlpha = 1;
  ctx.save(); ctx.clip(arc); ctx.fillStyle = shade; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.95, 0, TAU); ctx.arc(-r * 0.3, 0, r * 1.2, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
  ctx.strokeStyle = shade; ctx.lineWidth = 0.8; ctx.stroke(arc);
  for (const t of [a0, a1]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.cos(t) * r * 0.84, Math.sin(t) * r * 0.84, r * 0.17, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, -0.9, -0.2); ctx.stroke();
  ctx.fillStyle = B.blue; ctx.beginPath(); ctx.roundRect(-r * 1.05, -2.2, r * 0.42, 4.4, 2); ctx.fill(); // grip wrap where the hand holds it
  ctx.restore();
}

// F. Crescent: lean, in a lunge. A sleek elongated helm with a long bristle horsetail down the back, one shoulder
//    plate on the back shoulder, a half cape off that shoulder, and a tongue cleaner held like a crescent glaive.
const DUELIST_SLIT = poly([1.5, -50, 11.5, -50, 11.5, -48.4, 6.8, -48.4, 6.8, -44.6, 5.4, -44.6, 5.4, -48.4, 1.5, -48.4]);
function knightDuelist(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  if (mode === 'glow') { ctx.save(); ctx.translate(1, -19); ctx.rotate(0.16); ctx.translate(-1, 19); visorGlow(ctx, DUELIST_SLIT, 6, -48, 16); for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(159,216,240,${0.45 - i * 0.12})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(23, -66, 11 + i * 3, 1.8, 3.4); ctx.stroke(); } ctx.restore(); return; }
  ctx.save(); ctx.translate(0, 0);
  const cape = fnPath((p) => { p.moveTo(-6, -38); p.quadraticCurveTo(-20, -34, -25, -22); p.lineTo(-20, -23); p.lineTo(-22, -16); p.quadraticCurveTo(-12, -25, -3, -33); p.closePath(); }); ctx.fillStyle = dk; ctx.fill(cape); ctx.strokeStyle = pr; ctx.lineWidth = 1.1; ctx.stroke(cape);
  // lunge: back leg straight behind, front knee bent far forward
  ctx.lineCap = 'round'; ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(-2, -19); ctx.lineTo(-13, -3); ctx.stroke();
  ctx.fillStyle = mix(KE.base, '#000000', 0.22); ctx.beginPath(); ctx.ellipse(-14, -1.8, 4.4, 1.9, -0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = KE.leg; ctx.beginPath(); ctx.moveTo(2.5, -19); ctx.quadraticCurveTo(12, -15, 11.5, -3); ctx.stroke();
  ctx.fillStyle = KE.base; ctx.beginPath(); ctx.ellipse(13.5, -1.8, 5, 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = pr; ctx.fillRect(9.4, -6.5, 4.4, 1.8);
  // body leans into the thrust
  ctx.translate(1, -19); ctx.rotate(0.16); ctx.translate(-1, 19);
  ctx.fillStyle = KE.cloth; ctx.beginPath(); ctx.roundRect(-6.4, -38, 12.8, 20, 4); ctx.fill();
  ctx.fillStyle = pr; ctx.beginPath(); ctx.moveTo(-6.4, -36); ctx.lineTo(6.4, -36); ctx.lineTo(5, -20); ctx.lineTo(-5, -20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-6, -27, 12, 1.4); ctx.fillStyle = B.ink; ctx.fillRect(-6.6, -21.4, 13.2, 2.2);
  plate(ctx, fnPath((p) => { p.moveTo(-10.5, -33); p.quadraticCurveTo(-11, -40.5, -5, -40.5); p.quadraticCurveTo(-1, -40.5, -1.5, -36); p.quadraticCurveTo(-4, -32, -10.5, -33); }), { base: KE.shade, shade: KE.deep, sx: -6, sy: -38, sr: 5 });
  ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-5, -36); ctx.quadraticCurveTo(-11, -39, -13, -44); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(-15.6, -47.5, 5, 5, 1.8)), { base: KE.shade, shade: KE.deep, sx: -13, sy: -47, sr: 3 });
  teether(ctx, 26, -34, 8.5, 0.2, '#F4C6D7'); // held ready in the front hand
  teether(ctx, 23, -66, 8.5, 0.9, '#CFE3F6'); // thrown, spinning up and out
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(4.5, -35.5); ctx.quadraticCurveTo(12, -35, 19, -33); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(17.4, -35.5, 5.6, 5.2, 1.9)), { sx: 20, sy: -35, sr: 3.4 });
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(1, -39, 6.6, 1.8, 0, 0, TAU); ctx.fill();
  // sleek helm with a long horsetail of bristles flowing back from the crest
  plume(ctx, -2, -58, 22, pr, 13, -2.6, -3.2, 0.9);
  plate(ctx, fnPath((p) => { p.moveTo(-6.5, -39.5); p.quadraticCurveTo(-9.5, -50, -5, -56.5); p.quadraticCurveTo(-1, -60.5, 4.5, -58.5); p.quadraticCurveTo(12, -55, 12.5, -46); p.quadraticCurveTo(12.6, -41, 9, -39.4); p.quadraticCurveTo(1, -38, -6.5, -39.5); p.closePath(); }), { sx: 6, sy: -49, sr: 10, gloss: [5, -55, 2.2, 1] });
  ctx.fillStyle = B.ink; ctx.fill(DUELIST_SLIT);
  ctx.restore();
}

/** The baby teether (after the product photo): a soft heart-shaped loop with bumps and small dots, a clear rattle window
 *  with five coloured beads across the top, and a nubbed brush pad hanging from the bottom tip. r = half its width. */
function teether(ctx: Ctx, x: number, y: number, r: number, spin: number, col = '#CFE3F6') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const k = r / 16, dark = mix(col, '#5A3A5C', 0.25), hi = mix(col, '#FFFFFF', 0.5), dot = mix(col, '#C2185B', 0.45);
  const at = (t: number): [number, number] => { const st = Math.sin(t); return [16 * st * st * st * k, -(12 * Math.cos(t) - 4 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k * 0.82]; };
  // brush pad below the tip, drawn first so the loop sits over its root
  const [, ty] = at(Math.PI);
  ctx.fillStyle = mix(col, '#E91E63', 0.18); ctx.beginPath(); ctx.ellipse(0, ty + 3.6 * k, 3.2 * k, 5.2 * k, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = dark; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(((i % 3) - 1) * 1.6 * k, ty + (1.6 + Math.floor(i / 3) * 1.9) * k, 0.45 * k, 0, TAU); ctx.fill(); }
  // the loop: a thick soft stroke along a heart, with a darker underside
  const loop = new Path2D(); for (let i = 0; i <= 64; i++) { const [px, py] = at((i / 64) * TAU); if (i) loop.lineTo(px, py); else loop.moveTo(px, py); }
  ctx.strokeStyle = dark; ctx.lineWidth = 5.2 * k; ctx.save(); ctx.translate(0.5 * k, 0.6 * k); ctx.stroke(loop); ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = 4.6 * k; ctx.stroke(loop);
  ctx.strokeStyle = hi; ctx.lineWidth = 1.2 * k; ctx.globalAlpha = 0.8; ctx.save(); ctx.translate(-0.7 * k, -0.9 * k); ctx.stroke(loop); ctx.restore(); ctx.globalAlpha = 1;
  // bumps and the little dots along the sides
  for (let i = 3; i <= 29; i++) { if (i > 13 && i < 19) continue; const [px, py] = at((i / 32) * TAU); ctx.fillStyle = i % 3 ? hi : dot; ctx.beginPath(); ctx.arc(px, py, (i % 3 ? 1.1 : 0.7) * k, 0, TAU); ctx.fill(); }
  // the rattle window across the top with its five beads
  const wy = at(0)[1] - 1 * k;
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-8.5 * k, wy - 3.6 * k, 17 * k, 7.2 * k, 2.4 * k); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.roundRect(-6.8 * k, wy - 2.4 * k, 13.6 * k, 4.8 * k, 1.4 * k); ctx.fill();
  ['#2F6FD6', '#E53935', '#FF8F1F', '#7CC243', '#F5D31B'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc((-4.8 + i * 2.4) * k, wy + 0.5 * k, 1 * k, 0, TAU); ctx.fill(); });
  ctx.restore();
}

// G. Lancer: planted and charging, the sonic brush levelled from the hip in both hands like a lance. Round shoulder
//    plates, a short cape, a helm with a short upright crest of bristles and a cross visor. The lance head buzzes.
const LANCER_VISOR = poly([0, -48.4, 10, -48.4, 10, -46.8, 5.6, -46.8, 5.6, -43.4, 4.2, -43.4, 4.2, -46.8, 0, -46.8]);
function knightLancer(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  if (mode === 'glow') { visorGlow(ctx, LANCER_VISOR, 5, -46.5, 16); sonicLance(ctx, -2, -25, 52, -0.06, true); return; }
  const cape = fnPath((p) => { p.moveTo(-6, -37); p.quadraticCurveTo(-15, -30, -16, -17); p.lineTo(-11, -19); p.lineTo(-9, -15); p.quadraticCurveTo(-6, -25, -1, -36); p.closePath(); }); ctx.fillStyle = dk; ctx.fill(cape);
  legsK(ctx, -19, 16, 4.8, [-3, -8], [3, 7], KE.cloth, true);
  plate(ctx, fnPath((p) => { p.moveTo(-9, -37); p.quadraticCurveTo(-11, -28, -8, -19); p.lineTo(8, -19); p.quadraticCurveTo(11, -28, 9, -37); p.quadraticCurveTo(0, -39.5, -9, -37); }), { sx: 3, sy: -32, sr: 11, gloss: [4.5, -33.5, 2.2, 1] });
  ctx.save(); ctx.clip(fnPath((p) => p.rect(-12, -30, 24, 6))); ctx.fillStyle = pr; ctx.fillRect(-12, -30, 24, 6); ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-9.6, -26, 19.2, 1.4); ctx.fillStyle = B.ink; ctx.fillRect(-8.6, -21, 17.2, 2.4);
  // both hands on the lance at the hip
  sonicLance(ctx, -2, -25, 52, -0.06);
  ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, -34); ctx.quadraticCurveTo(-6, -28, 1, -25.5); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(-1.5, -28, 5.4, 5.2, 1.8)), { base: KE.shade, shade: KE.deep, sx: 1, sy: -27.5, sr: 3 });
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(6, -34); ctx.quadraticCurveTo(10, -30, 12.5, -26.5); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(10.4, -29, 5.6, 5.4, 1.9)), { sx: 13, sy: -28.5, sr: 3.4 });
  for (const [sx, k] of [[-9, -1], [9, 1]] as [number, number][]) plate(ctx, fnPath((p) => p.ellipse(sx, -35.5, 5, 4.2, 0, 0, TAU)), k < 0 ? { base: KE.shade, shade: KE.deep, sx: sx + 1.5, sy: -37, sr: 4.5 } : { sx: sx + 1.5, sy: -37, sr: 4.8, gloss: [sx + 1, -37, 1.6, 0.8] });
  ctx.fillStyle = B.orchid; ctx.beginPath(); ctx.ellipse(0.5, -38.6, 8.6, 2.2, 0, 0, TAU); ctx.fill();
  plume(ctx, 0.5, -55.5, 9, pr, 9, -2.1, -1.0, 0);
  plate(ctx, fnPath((p) => { p.moveTo(-9.5, -39.5); p.quadraticCurveTo(-11.5, -48, -9, -53); p.quadraticCurveTo(-6, -57.5, 0.5, -56.5); p.quadraticCurveTo(7, -57.5, 10, -53); p.quadraticCurveTo(12, -47, 10.4, -39.5); p.quadraticCurveTo(0.5, -37.2, -9.5, -39.5); p.closePath(); }), { sx: 5, sy: -48, sr: 11.5, gloss: [5, -53, 2.4, 1.1] });
  ctx.fillStyle = B.ink; ctx.fill(LANCER_VISOR);
}

// H. Kunoichi: low and quick, crouched to spring. A narrow crown helm wrapped in a long scarf, light boots, and teething
//    rings as ring blades: one held back ready, one already spinning out ahead.
const KUNOICHI_SLIT = poly([1.5, -38.6, 10, -40, 10, -38.6, 1.5, -37.4]);
function knightKunoichi(ctx: Ctx, mode: KMode) {
  const pr = B.blue, dk = B.blueDark;
  if (mode === 'glow') { visorGlow(ctx, KUNOICHI_SLIT, 6, -38.5, 14); for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(159,216,240,${0.45 - i * 0.12})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(30, -26, 8 + i * 3, 2.4, 3.9); ctx.stroke(); } return; }
  // long scarf streaming back
  const scarf = fnPath((p) => { p.moveTo(-4, -33); p.quadraticCurveTo(-16, -34, -27, -27); p.lineTo(-25, -24); p.quadraticCurveTo(-15, -29, -5, -30); p.closePath(); p.moveTo(-5, -31); p.quadraticCurveTo(-14, -26, -22, -18); p.lineTo(-19, -17); p.quadraticCurveTo(-12, -24, -4, -29); p.closePath(); });
  ctx.fillStyle = B.cerise; ctx.fill(scarf);
  // crouch: knees bent wide
  ctx.lineCap = 'round'; ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.quadraticCurveTo(-12, -11, -9, -3); ctx.stroke();
  ctx.strokeStyle = KE.leg; ctx.beginPath(); ctx.moveTo(3, -14); ctx.quadraticCurveTo(13, -14, 10, -3); ctx.stroke();
  for (const [bx, d] of [[-9.5, true], [10.5, false]] as [number, boolean][]) { ctx.fillStyle = d ? mix(KE.base, '#000000', 0.22) : KE.base; ctx.beginPath(); ctx.ellipse(bx + 1.5, -1.8, 4.6, 1.9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = pr; ctx.fillRect(bx - 1.6, -6.2, 4.2, 1.6); }
  // light body, wrapped
  ctx.fillStyle = KE.cloth; ctx.beginPath(); ctx.roundRect(-6.5, -31, 13, 18, 4); ctx.fill();
  ctx.fillStyle = pr; ctx.beginPath(); ctx.moveTo(-6.5, -29); ctx.lineTo(6.5, -29); ctx.lineTo(5.5, -15); ctx.lineTo(-5.5, -15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = B.ink2; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -27); ctx.lineTo(6, -18); ctx.moveTo(6, -27); ctx.lineTo(-6, -18); ctx.stroke();
  ctx.fillStyle = B.ink; ctx.fillRect(-6.6, -16.4, 13.2, 2);
  // back hand holds a ring ready behind; front arm follows through from the throw
  ctx.strokeStyle = '#0D1430'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-5, -28); ctx.quadraticCurveTo(-12, -31, -14, -36); ctx.stroke();
  teether(ctx, -16, -40, 5.5, 0.4, '#F6A5CB');
  plate(ctx, fnPath((p) => p.roundRect(-16.5, -38.6, 5, 4.8, 1.8)), { base: KE.shade, shade: KE.deep, sx: -14, sy: -38, sr: 3 });
  ctx.strokeStyle = KE.cloth; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(5, -28); ctx.quadraticCurveTo(12, -28, 17, -25); ctx.stroke();
  plate(ctx, fnPath((p) => p.roundRect(15.6, -27.6, 5.4, 5, 1.9)), { sx: 18, sy: -27, sr: 3.2 });
  teether(ctx, 30, -26, 6.2, 1.2, '#9FD8F0');
  // narrow crown helm, the scarf wrapped round its lower edge
  plate(ctx, fnPath((p) => { p.moveTo(-7, -33); p.quadraticCurveTo(-9, -41, -7, -45.5); p.quadraticCurveTo(-5.5, -49.5, -2.6, -46.5); p.quadraticCurveTo(0.5, -50, 3.4, -46.5); p.quadraticCurveTo(6.5, -49.5, 8.4, -45); p.quadraticCurveTo(10.6, -40, 9.4, -33); p.quadraticCurveTo(1, -31.4, -7, -33); p.closePath(); }), { sx: 5, sy: -41, sr: 9, gloss: [4.5, -45, 2, 0.9] });
  ctx.fillStyle = B.ink; ctx.fill(KUNOICHI_SLIT);
  ctx.fillStyle = B.cerise; ctx.beginPath(); ctx.moveTo(-7.4, -36); ctx.quadraticCurveTo(1, -33.6, 9.8, -35.6); ctx.lineTo(9.6, -32.4); ctx.quadraticCurveTo(1, -30.4, -7.2, -32.6); ctx.closePath(); ctx.fill();
}

function heroOptions() {
  const tile = (fn: (c: Ctx, m: KMode) => void) => (ctx: Ctx, w: number, h: number) => { // flat sketch: no bloom, so shapes and slits stay readable
    const s = Math.min(3.6, w / 46), x = w * 0.44, gy = h * 0.9, tx = w - 26;
    const put = (m: KMode, px: number, k: number) => { ctx.save(); ctx.translate(px, gy); ctx.scale(k, k); fn(ctx, m); ctx.restore(); };
    const g = ctx.createRadialGradient(x, h * 0.45, 10, x, h * 0.45, w); g.addColorStop(0, '#22365F'); g.addColorStop(1, '#070F2A'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = 'rgba(201,214,238,0.35)'; ctx.fillRect(0, gy, w, 1.5);
    put('scene', x, s); ctx.globalCompositeOperation = 'lighter'; put('glow', x, s); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(204,216,237,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(tx - 16, gy - 32, 32, 32); put('scene', tx, 1);
    ctx.fillStyle = 'rgba(232,238,249,0.6)'; ctx.font = `10px ${T.font.display}`; ctx.textAlign = 'center'; ctx.fillText('1 TILE', tx, gy + 14);
  };
  const today = (w: number, h: number): LitScene => { const s = Math.min(3.6, w / 46), x = w * 0.5, gy = h * 0.9; return { ambient: '#4A5068', grade: { vignette: 0.45, bloom: 0.4, bloomThreshold: 0.82 }, lights: heroLights('idle', x, gy, s / 2.6, 0.35),
    scene(ctx) { const g = ctx.createRadialGradient(x, h * 0.45, 10, x, h * 0.45, w); g.addColorStop(0, '#1A2747'); g.addColorStop(1, '#070F2A'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy); hero(ctx, 'idle', x, gy, s); },
    emissive(ctx) { heroEm(ctx, 'idle', x, gy, s); } }; };
  const O: [string, string, (c: Ctx, m: KMode) => void, string, string][] = [
    ['A', 'Vanguard', knightVanguard, 'The hero of today grown up, master of the brush. The helm keeps its four cusps but rises into a coronet, with a T-visor and a bristle plume off the back cusp. Incisor-shaped shoulder plates, a breastplate over the brand tabard with the white stripe, a half cape, and the CS 5460 wielded two-handed as a greatsword.', 'The safest step: everyone still reads the same hero. Big sweeping strokes and the strongest Deep Clean; slower between swings.'],
    ['B', 'Ranger', knightRanger, 'The archer of the Order, built around the interdental bow. A swept canine-tooth sallet with an angled slit, a short hooded mantle lined in gum pink, a bandolier and quiver of colour-coded refills, tall boots, and the ring holder raised to shoot.', 'Most original silhouette and the best fit for the shot mechanic. The slimmest build, so it needs strong poses to feel heroic.'],
    ['C', 'Lancer (the Bulwark)', knightLancer, 'Sean, 26 Nov: replaces the Bulwark. Planted and charging, a sonic toothbrush levelled from the hip in both hands like a lance, its head humming. Round shoulder plates, a short cape, a helm with a short upright crest of bristles and a cross visor.', 'Heavy, direct and easy to read: charge, pierce, hold the line. Based on the Hydrosonic; product shape and name are placeholders until the brand team checks them.'],
    ['D', 'Sentinel', knightSentinel, 'Tall and calm. Long legs, a long brand tabard to the knee, a wide-brimmed crown helm with three tall cusps (the slit sits in the shadow of the brim), one round shoulder plate, and the long angled interdental handle carried as a scythe, a large refill at the bend for the blade.', 'The most noble silhouette and the easiest to read from far away. The tallest, so low gaps and crawling need care.'],
    ['E', 'Duelist', knightSquire, 'Stout and quick, the closest to the hero of today: a big round two-cusp helm with a closed slit, a short flared cape, and a single-tuft brush in each hand, one raised, one low and ready to follow up.', 'Fast, precise jabs for the tight spots the big brush cannot reach. Small reach, so it lives up close. Product shape is a placeholder until the brand team checks it.'],
    ['F', 'Crescent (the Kunoichi)', knightDuelist, 'Lean, in a lunge, the one ninja class. A sleek long helm with a horsetail of bristles from the crest, one plate on the back shoulder, a half cape off it, and teething rings as ring blades: one held ready, one thrown spinning up and out.', 'The fastest and most playful, with a ranged weapon that comes back. Based on the baby teething ring: keep it clearly a soft toy, never sharp. Product shape is a placeholder until the brand team checks it.'],
  ];
  return `<section id="options">${head(8, 'Hero options', 'Six deviations of today\'s knight. The crown helm and visor glow stay; there is no face. Each one fixes the body (knight proportions, about 2.5-3 heads tall instead of 1.6, real armour) and gives the helm its own silhouette, with dental gear in place of borrowed shapes. Large figure for the look, small one at 1 tile for the read in game. Sketches, not final art.')}
  <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:18px">
  <div class="card">${aLit(380, today)}<div class="pad"><h4>Today</h4><p>For comparison: 1.6 tiles, helm about a third of the height on a small body. The round helm and horizontal visor are what read as a mask.</p></div></div>
  ${O.map(([k, n, fn, d, trade]) => `<div class="card">${a2d(380, tile(fn))}<div class="pad"><h4>${k} &nbsp;&middot;&nbsp; ${n}</h4><p>${d}</p><p><b>Trade-off</b> ${trade}</p></div></div>`).join('')}</div></section>`;
}

// ---- orders ----
// The rig and the Orders live in src/design/hero.ts, shared with the game.
function ordersSection() {
  const ART = orderArts(), sets = ORDER_IDS.map((id) => ART[id]);
  const stage = (ctx: Ctx, w: number, h: number, gy: number) => {
    const g = ctx.createRadialGradient(w * 0.45, h * 0.45, 10, w * 0.45, h * 0.45, w); g.addColorStop(0, '#22365F'); g.addColorStop(1, '#070F2A'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = 'rgba(201,214,238,0.35)'; ctx.fillRect(0, gy, w, 1.5);
  };
  const figure = (set: OrderArt) => (ctx: Ctx, w: number, h: number) => {
    const s = Math.min(3.4, w / 44), x = w * 0.42, gy = h * 0.9; stage(ctx, w, h, gy);
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); drawRig(ctx, set, staticPose(set), 'scene'); ctx.globalCompositeOperation = 'lighter'; drawRig(ctx, set, staticPose(set), 'glow'); ctx.restore();
    const tx = w - 24; ctx.strokeStyle = 'rgba(204,216,237,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(tx - 16, gy - 32, 32, 32); ctx.save(); ctx.translate(tx, gy); drawRig(ctx, set, staticPose(set), 'scene'); ctx.restore();
  };
  // the swap: one rig, the set changes at a fountain with a rinse of bubbles and a clean-tooth glint
  const swap = (ctx: Ctx, w: number, h: number) => {
    const fx = new Particles(), gy = h * 0.88, s = Math.min(3.8, h / 72), x = w * 0.5; let t = 0, i = 1, flash = 0;
    return (dt: number) => {
      t += dt; flash = Math.max(0, flash - dt * 2.5);
      if (t > 1.6) { t = 0; i = (i + 1) % sets.length; flash = 1; fx.burst(x, gy - 30 * s, { ...T.particle.rinseAway, n: 26, speed: [60, 240], spread: TAU }); fx.burst(x + 6 * s, gy - 48 * s, { ...T.particle.cleanGlint, n: 4 }); }
      fx.update(dt);
      ctx.setTransform(PR, 0, 0, PR, 0, 0); stage(ctx, w, h, gy);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; halo(ctx, x, gy, 90 * (1 + flash), B.sky, 0.12 + flash * 0.35); ctx.restore();
      const bob = Math.sin(performance.now() / 1000 * 2.4) * 0.6;
      ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); drawRig(ctx, sets[i], staticPose(sets[i], bob), 'scene'); ctx.globalCompositeOperation = 'lighter'; drawRig(ctx, sets[i], staticPose(sets[i], bob), 'glow'); ctx.restore();
      fx.draw(ctx, false); ctx.globalCompositeOperation = 'lighter'; fx.draw(ctx, true); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(232,238,249,0.9)'; ctx.font = `15px ${T.font.display}`; ctx.textAlign = 'left'; ctx.fillText(sets[i].name.toUpperCase(), 22, 34);
      ctx.fillStyle = 'rgba(232,238,249,0.5)'; ctx.font = `11px ${T.font.display}`; ctx.fillText('SAME RIG  ·  SWAP AT A FOUNTAIN', 22, 54);
    };
  };
  const bars = (st: OrderArt['stats']) => (['health', 'speed', 'reach', 'guard'] as const).map((k) => `<div class="ostat"><span>${k}</span><i>${[1, 2, 3, 4, 5].map((n) => `<b class="${n <= st[k] ? 'on' : ''}"></b>`).join('')}</i></div>`).join('');
  const slots: [string, string][] = [['Helm', 'The silhouette. Each Order has its own helm and visor glow.'], ['Shoulders', 'Plates or mantle. They set how broad the knight reads.'], ['Chest', 'Breastplate, tabard or bandolier, in the brand primary.'], ['Back', 'Cape, quiver or a slung brush. Moves after the body.'], ['Weapon / front', 'Brush longsword, the interdental bow, or the crown shield.'], ['Boots', 'Colour and knee plates; light boots for the Ranger.']];
  const moves: string[][] = [
    ['Weapon', 'Short brush', 'CS 5460 greatsword (two hands)', 'Two single tufts', 'Brush + interdental bow', 'Hydrosonic lance'],
    ['Slash', 'Base', 'Slower, +3 cleaning power', 'Fastest jabs, -1 cleaning power', 'Base', 'Slower, +3 cleaning power'],
    ['Deep Clean (hold slash)', '0.6 s charge', '0.4 s charge, wider arc', 'Base', 'Base', 'Base'],
    ['Interdental shot', `Base, ${T.idb.shot.carry} refills`, `Base, ${T.idb.shot.carry} refills`, `Quicker draw, ${T.idb.shot.carry} refills`, 'Fast draw, 9 refills, pierces from half draw', 'Slow draw, 3 refills'],
    ['Dash', 'Base', 'Base', 'Base', '+1 air dash', 'Lance charge: blocks shots while dashing'],
    ['Health / run speed', '5 / 300', '5 / 290', '5 / 315', '4 / 320', '7 / 270'],
  ];
  return `<section id="orders">${head(9, 'Orders', 'One hero, four armour sets, one product each. The knight always has the same body and the same core moves (run, jump, dash, brush slash). Each Order is earned on the route and swapped at a fountain: it changes the helm and gear and a few moves, never whether a room can be finished. Today\'s hero is the Initiate everyone plays until the first boss; then a card pick chooses an Order.')}
  <div class="grid" style="grid-template-columns:1.25fr 1fr;gap:18px;align-items:stretch">
    <div class="card">${art({ k: 'live', h: 420, fn: swap })}</div>
    <div class="card pad"><h4>One rig, six slots</h4><p>A set fills slots on a shared skeleton, so walk, run, jump and slash are animated once for every Order.</p>
      <div class="oslots">${slots.map(([n, d]) => `<div><b>${n}</b><span>${d}</span></div>`).join('')}</div>
      <p class="mono" style="margin-top:14px">Draw order: back, legs, back arm, torso, chest, weapon, front arm, front, shoulders, collar, helm. Glow pass: visor and charge.</p></div>
  </div>
  <h3>The start and the four Orders</h3><div class="grid g5">${sets.map((st, i) => `<div class="card">${a2d(330, figure(st))}<div class="pad"><p class="eyebrow" style="margin:0 0 6px">${i === 0 ? 'Start' : 'Order ' + i}</p><h4>${st.name}</h4><p>${st.line}</p><p><b>Earned</b> ${st.earned}</p><div class="ostats">${bars(st.stats)}</div></div></div>`).join('')}</div>
  <h3>What each set changes (proposal, numbers to tune)</h3>
  <div class="card"><table class="otable"><thead><tr><th>Move</th>${sets.map((s) => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>${moves.map((r) => `<tr>${r.map((c, j) => j ? `<td>${c}</td>` : `<th>${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="nolist" style="margin-top:18px">
    <div><b>Any set, any room</b>Progress through the map is tied to relics, never to a set. A set changes how a room plays, not whether it can be done.</div>
    <div><b>Swap at fountains</b>Choosing happens at rest points, so a fight is never paused for a menu. The swap is a rinse of bubbles and a glint.</div>
    <div><b>Brands can add a set</b>A brand pack can dress a fourth Order in its own product line, on the same rig.</div>
  </div></section>`;
}

// ---- interdental kit ----
function idbSection() {
  const S = T.idb.sizes, sizes = [S.s, S.m, S.l];
  const dark = (c: Ctx, w: number, h: number) => bg(c, w, h, '#0B1633');
  const products: [string, string, (c: Ctx, w: number, h: number) => void][] = [
    ['Ring holder', `${P.product.idb.holder}. The short bow: quick to load, quick to fire. Translucent body in the brand's holder colour.`, (c, w, h) => { dark(c, w, h); idbHolder(c, w * 0.3, h * 0.62, h * 0.72); idbHolder(c, w * 0.7, h * 0.62, h * 0.72, { loaded: S.m.col }); }],
    ['Angled handle', 'The long bow: slower draw, longer reach. Refill mounts sideways at the bend.', (c, w, h) => { dark(c, w, h); idbHolder(c, w * 0.38, h * 0.92, h * 0.82, { kind: 'angled', angle: 0.35, loaded: S.s.col }); }],
    ['Refills', 'The arrows. Base colour = size, as on the real refills. Placeholders until the brand verifies sizes and colours.', (c, w, h) => { dark(c, w, h); sizes.forEach((z, i) => { idbRefill(c, w * (0.27 + i * 0.23), h * 0.88, h * (0.56 + i * 0.1), { col: z.col }); c.fillStyle = 'rgba(232,238,249,0.75)'; c.font = `11px ${T.font.display}`; c.textAlign = 'center'; c.fillText(`${z.name} · ${z.channel} U`, w * (0.27 + i * 0.23), h * 0.97); }); }],
  ];
  // the shot in four frames, holder horizontal (pointing right)
  const frame = (k: 0 | 1 | 2 | 3) => (c: Ctx, w: number, h: number) => {
    dark(c, w, h); const hx = w * 0.26 - (k === 1 ? 8 : 0), hy = h * 0.55, H = h * 0.62, col = S.m.col, A = Math.PI / 2;
    c.fillStyle = '#132B57'; c.fillRect(0, h * 0.86, w, h);
    idbHolder(c, hx, hy, H, { angle: A, loaded: k === 1 ? col : null });
    if (k === 0) { idbRefill(c, hx + H * 0.66, hy - 16, H * 0.42, { col, angle: A }); c.strokeStyle = 'rgba(204,216,237,0.6)'; c.lineWidth = 1.2; for (const d of [0, 6]) { c.beginPath(); c.moveTo(hx + H * 0.7 - d, hy - 6); c.lineTo(hx + H * 0.63 - d, hy - 2); c.stroke(); } }
    if (k === 1) { c.strokeStyle = rgba(B.sky, 0.8); c.lineWidth = 2.5; c.beginPath(); c.arc(hx, hy, H * 0.33, -Math.PI * 0.75, Math.PI * 0.75); c.stroke(); c.globalCompositeOperation = 'lighter'; halo(c, hx + H * 0.75, hy, 28, '#FFFFFF', 0.5); c.globalCompositeOperation = 'source-over'; glint(c, hx + H * 0.95, hy - 10, 5); }
    if (k === 2) { const rx = w * 0.72; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const tx = rx - 18 - i * 11, ty = hy + Math.sin(i * 1.9) * 3; c.lineWidth = 1; c.beginPath(); c.moveTo(tx - 3, ty - 2 + (i % 2) * 4); c.lineTo(tx + 3, ty + 2 - (i % 2) * 4); c.stroke(); } idbRefill(c, rx - H * 0.2, hy, H * 0.42, { col, angle: A, glow: 0.6 }); }
    if (k === 3) { const px = w * 0.74, py = h * 0.86; plaqueling(c, px, py, 2.4, 5); idbRefill(c, px - 46, py - 30, H * 0.42, { col, angle: A + 0.12 }); c.fillStyle = B.yellow; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(px - 30 + i * 9, py - 50 - (i % 3) * 8, 2 + (i % 2), 0, TAU); c.fill(); } glint(c, px - 12, py - 40, 9); }
  };
  const ammo = (c: Ctx, w: number, h: number) => { // HUD: three refill icons with counts, the selected one lifted
    bg(c, w, h, '#050D24'); c.fillStyle = T.ui.panel; c.beginPath(); c.roundRect(w / 2 - 118, h / 2 - 34, 236, 68, 34); c.fill(); c.strokeStyle = T.ui.hairline; c.lineWidth = 1; c.stroke();
    sizes.forEach((z, i) => { const x = w / 2 - 70 + i * 70, sel = i === 1; idbRefill(c, x - 10, h / 2 + 22 - (sel ? 4 : 0), 40, { col: z.col, angle: 0.35 });
      c.fillStyle = sel ? '#FFFFFF' : 'rgba(232,238,249,0.6)'; c.font = `${sel ? 15 : 13}px ${T.font.canvas}`; c.textAlign = 'left'; c.fillText(`${z.name} ${[6, 4, 2][i]}`, x + 2, h / 2 + 6); if (sel) { c.fillStyle = B.sky; c.fillRect(x - 14, h / 2 + 26, 36, 2); } });
  };
  return `<section id="idb">${head(10, 'Interdental kit', 'The interdental brush is the hero\'s bow. Load a refill into the holder, draw, and shoot it out. The right size also unclogs a gap from range. Drawn by kit.idbHolder and kit.idbRefill; colours from the brand pack.')}
  <div class="grid g3">${products.map(([n, d, fn]) => `<div class="card">${a2d(220, fn)}<div class="pad"><h4>${n}</h4><p>${d}</p></div></div>`).join('')}</div>
  <h3>The shot</h3><div class="grid g4">${(['Load', 'Draw', 'Release', 'Hit'] as const).map((n, i) => `<div class="card">${a2d(170, frame(i as 0 | 1 | 2 | 3))}<div class="pad" style="padding:12px 16px"><h4>${String(i + 1).padStart(2, '0')} &nbsp;${n}</h4><p>${['The refill clicks into the socket (' + T.idb.shot.load + ' s).', 'Hold to draw, up to ' + T.idb.shot.drawMax + ' s. The refill glows as it charges.', 'Short draw: slower, arcs, drops. Full draw: fast, straight, passes through one enemy.', 'Plaque loosens into crumbs and a clean-tooth sparkle. The refill drops and can be picked up again.'][i]}</p></div></div>`).join('')}</div>
  <div class="grid g2" style="margin-top:18px"><div class="card">${a2d(150, ammo)}<div class="pad"><h4>Ammo on the HUD</h4><p>Three sizes, a count each, the loaded size lifted and underlined. Carry ${T.idb.shot.carry} of each; fountains refill, Pip sells packs.</p></div></div>
  <div class="card pad"><h4>How the sizes play (proposal)</h4><p><b>S</b> light and quick: short draw, fires fast, small knock-back. Fits narrow gaps.</p><p><b>M</b> the all-rounder. Standard draw and damage.</p><p><b>L</b> heavy: slow draw, big knock-back, cracks tartar. Fits wide gaps.</p><p class="mono" style="margin-top:10px">Open question: does the shot replace the toothpaste throw, or sit next to it?</p></div></div></section>`;
}

// ---- light ----
function lightSection() {
  const ids = ['crown', 'gumline', 'narrows', 'sugar', 'calculus', 'throne'] as const;
  const fmt = (v: unknown) => Array.isArray(v) ? v.map((n) => (+n).toFixed(2)).join(' ') : typeof v === 'number' ? String(v) : '';
  return `<section id="light">${head(11, 'Light and grade', 'Each biome gets an ambient (the light-map base: #808080 is neutral) and a grade that merges over DEFAULT_GRADE, exactly as game.ts does. Previews run through engine/post.ts: lighting composite, bloom, fringe, grade, vignette and grain.')}
  <div class="grid g3">${ids.map((id) => { const p = T.lightPreset[id], g = { ...T.DEFAULT_GRADE_TOKENS, ...p.grade };
    return `<div class="card">${aLit(220, (w, h) => diorama(id, w, h))}<div class="pad"><h4>${p.label}</h4><p>${p.note}</p><div class="vals">
      <div>ambient<b><span class="chipdot" style="background:${p.ambient}"></span>${p.ambient}</b></div><div>tint<b>${fmt(g.tint)}</b></div><div>lift<b>${fmt(g.lift)}</b></div><div>saturation<b>${g.saturation}</b></div>
      <div>contrast<b>${g.contrast}</b></div><div>bloom<b>${g.bloom} / ${g.bloomThreshold}</b></div><div>vignette<b>${g.vignette}</b></div><div>grain<b>${g.grain}</b></div></div><p class="mono" style="margin-top:12px">lightPreset.${id}</p></div></div>`; }).join('')}</div>
  <h3>Light sizes</h3><div class="grid g8">${Object.entries(T.lightSize).map(([k, v]) => `<div class="card">${a2d(120, (c, w, h) => { c.fillStyle = '#050B1F'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'lighter'; const r = Math.min(h * 0.48, v.r * 0.16); halo(c, w / 2, h / 2, r, B.sky, Math.min(1, v.i)); c.globalCompositeOperation = 'source-over'; })}<div class="pad" style="padding:10px 12px"><h4 style="font-size:11px">${k}</h4><span class="mono">r ${v.r} &middot; i ${v.i}</span></div></div>`).join('')}</div>
  <p class="note">Emissive budget: under ${T.emissiveBudget.screenCoverMax * 100}% of the screen above the bloom threshold in calm play, ${T.emissiveBudget.combatCoverMax * 100}% in a fight, at most ${T.emissiveBudget.maxLightsPerRoom} lights per room.</p></section>`;
}

// ---- particles ----
function particleSection() {
  const ids = Object.keys(T.particle) as T.ParticleId[];
  const tile = (id: T.ParticleId) => (ctx: Ctx, w: number, h: number) => {
    const fx = new Particles(), o = T.particle[id] as BurstOpts, life = o.life?.[1] ?? 0.7, single = (o.n ?? 10) <= 1 && o.shape !== 'ring';
    const up = (o.angle ?? 0) < 0 || (o.gravity ?? 0) < 0, falls = (o.gravity ?? 0) > 300, k = 0.9;
    const cx = w / 2 / k, cy = (up ? h * 0.78 : falls ? h * 0.32 : h * 0.5) / k;
    const every = single ? 0.03 : Math.min(0.45, Math.max(0.16, life * 0.45)); let acc = every;
    const angleFor = () => (o.angle !== undefined ? o.angle : id === 'dashPuff' ? Math.PI : id === 'wallDust' ? 0 : falls ? -Math.PI / 2 : 0);
    const emit = () => fx.burst(cx + (single ? (Math.random() - 0.5) * w / k * 0.8 : (Math.random() - 0.5) * 30), single ? (h * (0.35 + Math.random() * 0.55)) / k : cy, { ...o, angle: angleFor(), spread: falls && o.spread === undefined ? 2.2 : o.spread });
    const step = (dt: number) => { acc += dt; if (acc >= every) { acc = 0; emit(); } fx.update(dt); };
    for (let i = 0; i < 90; i++) step(1 / 60);
    const lo = document.createElement('canvas'); lo.width = Math.ceil(w / 4); lo.height = Math.ceil(h / 4); const lx = lo.getContext('2d')!;
    return (dt: number) => {
      step(dt);
      ctx.setTransform(PR, 0, 0, PR, 0, 0); const g = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, w * 0.8); g.addColorStop(0, '#1A2C5C'); g.addColorStop(1, '#060C1F'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.scale(k, k); fx.draw(ctx, false);
      // cheap bloom: emissive particles at quarter resolution, upscaled with smoothing, added under the sharp pass
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lo.width, lo.height); lx.setTransform(k / 4, 0, 0, k / 4, 0, 0); fx.draw(lx, true);
      ctx.globalCompositeOperation = 'lighter'; ctx.setTransform(PR, 0, 0, PR, 0, 0); ctx.globalAlpha = 0.9; ctx.drawImage(lo, 0, 0, w, h); ctx.globalAlpha = 1; ctx.scale(k, k); fx.draw(ctx, true); ctx.globalCompositeOperation = 'source-over';
    };
  };
  return `<section id="particles">${head(12, 'Particles', 'Presets for g.fx.burst(x, y, { ...particle.id, n }). Lit particles catch the light map; emissive ones glow. Running live on the engine\'s own particle pool.')}
  <div class="grid g6">${ids.map((id) => { const o = T.particle[id] as BurstOpts; return `<div class="card">${art({ k: 'live', h: 170, fn: tile(id) })}<div class="pad" style="padding:12px 14px"><h4 style="font-size:11.5px">${id}</h4><span class="mono">${o.shape ?? 'dot'} &middot; n ${o.n ?? 10}${o.emissive ? ' &middot; emissive' : ''}${o.gravity ? ' &middot; g ' + o.gravity : ''}</span></div></div>`; }).join('')}</div></section>`;
}

// ---- motion ----
function motionSection() {
  const curve = (name: keyof typeof T.ease) => (ctx: Ctx, w: number, h: number) => {
    bg(ctx, w, h, '#070F2A'); const pad = 22, f = T.ease[name];
    ctx.strokeStyle = 'rgba(139,184,232,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.strokeStyle = B.sky; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const t = i / 80, px = pad + t * (w - pad * 2), py = h - pad - f(t) * (h - pad * 2); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(w - pad, pad, 4, 0, TAU); ctx.fill();
  };
  const D = T.duration, maxD = 4200;
  const durBars = (Object.entries(D) as [string, number][]).map(([k, v]) => `<div class="bar-row"><span>${k}</span><div class="track"><i style="width:${Math.max(2, (v / maxD) * 100)}%"></i></div><span class="v">${v} ms</span></div>`).join('');
  const hs = Object.entries(T.feel.hitstop).map(([k, v]) => `<div class="bar-row"><span>${k}</span><div class="track"><i style="width:${(v / 0.35) * 100}%;background:linear-gradient(90deg,#E31C79,#F277C6)"></i></div><span class="v">${Math.round(v * 1000)} ms</span></div>`).join('');
  const sh = Object.entries(T.feel.shake).map(([k, v]) => `<div class="bar-row"><span>${k}</span><div class="track"><i style="width:${(v[0] / 14) * 100}%;background:linear-gradient(90deg,#FF8200,#FCE300)"></i></div><span class="v">${v[0]} u / ${Math.round(v[1] * 1000)}</span></div>`).join('');
  return `<section id="motion">${head(13, 'Motion and feel', 'UI moves softly and quickly (ease out, 140-400 ms). The game feels crisp: short hitstops, small shakes that scale with weight, squash and stretch on every jump, land and dash. Numbers are from the code, so tuning here means tuning there.')}
  <div class="grid g4">${(['out', 'inOut', 'outBack', 'linear'] as const).map((n) => `<div class="card">${a2d(150, curve(n))}<div class="pad"><h4>ease.${n}</h4><span class="mono">${T.easeCss[n]}</span></div></div>`).join('')}</div>
  <div class="grid g3" style="margin-top:18px"><div class="card pad"><h4 style="margin-bottom:14px">UI durations</h4><div class="bars">${durBars}</div></div>
    <div class="card pad"><h4 style="margin-bottom:14px">Hitstop (seconds of freeze)</h4><div class="bars">${hs}</div><h4 style="margin:22px 0 14px">Shake (amplitude / ms)</h4><div class="bars">${sh}</div></div>
    <div class="card pad"><h4 style="margin-bottom:14px">Squash and stretch</h4>${a2d(190, squash)}<p>Jump 0.72 x 1.30, dash 1.35 x 0.70, land up to 1.35 x 0.70, recovering at rate 14. Enemies follow the same rule at half strength.</p>
      <h4 style="margin:18px 0 6px">Player timing</h4><p class="mono" style="line-height:1.8">coyote ${T.feel.player.coyote}s &middot; jump buffer ${T.feel.player.jumpBuffer}s<br>attack cd ${T.feel.player.attackCd}s &middot; slash active ${T.feel.player.slashActive}s<br>dash ${T.feel.player.dashT}s at ${T.feel.player.dashV} u/s &middot; focus ${T.feel.player.focusT}s<br>invulnerable ${T.feel.invuln}s after a hit</p></div></div></section>`;
}
function squash(ctx: Ctx, w: number, h: number) {
  bg(ctx, w, h, '#070F2A'); const gy = h * 0.82; ctx.fillStyle = '#132B57'; ctx.fillRect(0, gy, w, h - gy);
  const S: [number, number, string][] = [[1, 1, 'rest'], [0.72, 1.3, 'jump'], [1.35, 0.7, 'land'], [1.35, 0.7, 'dash']];
  S.forEach(([sx, sy, n], i) => { const x = w * (0.14 + i * 0.24); ctx.save(); ctx.translate(x, gy); ctx.scale(sx, sy); blob(ctx, 0, -22, 20, { color: B.blue, shade: B.blueDark, deep: '#001E5A', rim: B.sky, seed: 3, flat: 0.2 }); ctx.restore();
    ctx.fillStyle = 'rgba(232,238,249,0.7)'; ctx.font = `11px ${T.font.display}`; ctx.textAlign = 'center'; ctx.fillText(n.toUpperCase(), x, gy + 22); });
}

// ---- do / don't ----
function chipsX(cols: string[]) {
  return (ctx: Ctx, w: number, h: number) => {
    bg(ctx, w, h, '#0B1633'); const cw = (w - 20) / cols.length;
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(10 + i * cw + 4, 14, cw - 8, h - 28, 8); ctx.fill(); });
    ctx.strokeStyle = B.cerise; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(w - 12, h - 12); ctx.moveTo(w - 12, 12); ctx.lineTo(12, h - 12); ctx.stroke();
  };
}
function doDont() {
  const pair = (title: string, doTxt: string, doArt: string, dontTxt: string, dontArt: string) => `<div class="card"><div class="pad" style="padding-bottom:0"><h4>${title}</h4></div><div class="dd"><div><span class="tag do">Do</span><p>${doTxt}</p>${doArt}</div><div><span class="tag dont">Don't</span><p>${dontTxt}</p>${dontArt}</div></div></div>`;
  return `<section id="dodont">${head(14, 'Do and don\'t', 'The fastest way to keep the world on-brand. Pairs show the rule; the no-go list is absolute.')}
  <div class="grid g2">
  ${pair('Glow is earned', 'Glow for real light sources only: eyes, plaque, sparks, relics, fountains.', aLit(170, (w, h) => diorama('calculus', w, h)), 'Glow everything and raise bloom: the world turns to fog and the hero disappears.', aLit(170, (w, h) => diorama('calculus', w, h, { glowAll: true })))}
  ${pair('Gums and flesh', 'Orchid to cerise, soft folds, a light lip, dry and clean.', a2d(170, (c, w, h) => { bg(c, w, h, '#2A0D26'); enamel(c, w * 0.3, h * 0.62, 60, { height: 110 }); enamel(c, w * 0.7, h * 0.62, 60, { height: 110, seed: 3 }); gumFold(c, w / 2, h * 0.52, h * 0.5, { width: w + 10, scallops: 3 }); }), 'Raw red, brown or purple-black flesh, wet sheen, drips, bleeding gums.', a2d(170, chipsX(['#8B1A1A', '#5A1E14', '#3A0E18', '#A0522D'])))}
  ${pair('Tartar and teeth', 'Tartar is bone and grey-beige, matte, layered like a reef. Teeth are always clean white enamel.', a2d(170, (c, w, h) => { bg(c, w, h, '#1C1A18'); crownCap(c, w * 0.32, h * 0.86, 90, { calcified: true, cusps: 4 }); enamel(c, w * 0.72, h * 0.95, 70, { shape: 'molar', height: 80 }); }), 'Brown or black stains, holes, cracks, broken or rotten teeth, anything that reads as decay.', a2d(170, chipsX(['#3B2A14', '#1A120A', '#5C4A1E', '#2B2B2B'])))}
  ${pair('Silhouette and value', 'Dark ground, the hero\'s enamel helm and sky visor carry the read. Keep a full value step between actor and background.', aLit(170, (w, h) => ({ ambient: '#3E465E', lights: heroLights('idle', w / 2, h * 0.86, 2.4), scene(c) { sky(c, w, h, ['#0B1A40', '#050B1F']); c.fillStyle = '#0D1736'; c.fillRect(0, h * 0.86, w, h); hero(c, 'idle', w / 2, h * 0.86, 2.4); }, emissive(c) { heroEm(c, 'idle', w / 2, h * 0.86, 2.4); } })), 'Mid-blue hero on a mid-blue busy background: the cloak and blade vanish.', aLit(170, (w, h) => ({ ambient: '#9AA8C8', grade: { bloom: 0.2 }, scene(c) { c.fillStyle = '#3364B7'; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { c.fillStyle = i % 2 ? '#2C4377' : '#668BC9'; c.fillRect((i * 53) % w, (i * 31) % h, 30, 20); } hero(c, 'idle', w / 2, h * 0.86, 2.4); } })))}
  ${pair('Copy tone', 'Gentle in-world habit flavour, a little funny, never a promise.', `<p class="ex">&ldquo;Twice a day the old knights swept the towers, at sunrise and at dusk. The towers remembered.&rdquo;</p><p class="ex">&ldquo;Pip insists the cerise handle is faster. It is not.&rdquo;</p>`, 'Clinical or medical claims, fear about real teeth, lecturing.', `<p class="ex strike">&ldquo;Removes 99% of plaque. Clinically proven.&rdquo;</p><p class="ex strike">&ldquo;Brush or your teeth will rot.&rdquo;</p>`)}
  ${pair('Originality', 'Our own names, creatures and places: Plaqlings, Mother Calculus, the ' + P.product.order + ', Ivoria, the Great Smile.', `<p class="ex">A brush-blade, a crown helm, a rinse fountain: the genre's verbs in a world nobody else has.</p>`, 'Borrowed characters, masks, bug knights, lore, music, maps or layouts from any existing game.', `<p class="ex strike">Hollow-eyed masks, insect knights, look-alike HUDs.</p>`)}
  </div>
  <h3>No-go list</h3><div class="nolist">
    <div><b>No gore</b>No blood, wounds, organs or body horror. Hits are sparks and plaque splats.</div><div><b>No decay imagery</b>No cavities, stains, rot, black teeth or bad breath gags.</div><div><b>No clinical claims</b>No "prevents", "cures", "removes 99%", no dental advice.</div>
    <div><b>No copying</b>The genre is fair game; another game's characters, art, music or layouts are not.</div><div><b>No fear</b>No scaring players about their real teeth, dentists or treatments.</div><div><b>No emoji, no brand abuse</b>No emoji in UI. Never recolour the brand primary; no logos in-world.</div>
  </div></section>`;
}

// ---------------------------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------------------------
async function boot() {
  try { await Promise.all([document.fonts.load(`400 20px ${T.font.display}`), document.fonts.load(`700 20px ${T.font.display}`), document.fonts.load(`400 20px ${T.font.body}`)]); } catch { /* fallback fonts */ }
  const rs = document.documentElement.style; rs.setProperty('--blue', B.blue); rs.setProperty('--blue80', B.blue80); rs.setProperty('--ink', B.ink); rs.setProperty('--cerise', B.cerise); rs.setProperty('--display', T.font.display); rs.setProperty('--body', T.font.body);
  LIT = new Lit();
  const nav = `<nav class="side"><div class="mark">BRISTLE<small>Design system v0.1</small></div><ol>${SECTIONS.map(([id, n], i) => `<li><a href="#${id}"><span>${String(i + 1).padStart(2, '0')}</span>${n}</a></li>`).join('')}</ol><label class="brandpick">Brand pack<select id="brandpick">${Object.values(packs).map((p) => `<option value="${p.id}"${p.id === P.id ? ' selected' : ''}>${p.name}</option>`).join('')}</select></label><div class="foot">Living style guide, drawn by the game's own code.<br>Build: node styleguide.mjs</div></nav>`;
  const main = `<main>${cover()}${principles()}${colour()}${typeSection()}${components()}${materials()}${kitSection()}${heroSection()}${heroOptions()}${ordersSection()}${idbSection()}${lightSection()}${particleSection()}${motionSection()}${doDont()}<footer><span>BRISTLE: Knight of the Crown &middot; ${P.legal}</span><span>tokens.ts &middot; kit.ts &middot; ART-BIBLE.md &middot; BACKLOG.md</span></footer></main>`;
  document.body.innerHTML = `<div class="layout">${nav}${main}</div>`;
  document.getElementById('brandpick')?.addEventListener('change', (ev) => { // remembered in this browser, so it also works where ?brand= cannot be passed
    const v = (ev.target as HTMLSelectElement).value; try { localStorage.setItem('bristle-brand', v); } catch { /* storage blocked */ }
    const u = new URL(location.href); if (u.searchParams.has('brand')) { u.searchParams.delete('brand'); location.href = u.toString(); } else location.reload();
  });
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const liveTicks: { tick: (dt: number) => void }[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-art]'))) {
    const p = painters[el.dataset.art!]; const w = Math.max(10, Math.floor(el.clientWidth)), h = p.h;
    try {
      if (p.k === 'el') { p.fn(el, w, h); continue; }
      const { c, x } = canvas(w, h); el.appendChild(c);
      if (p.k === '2d') p.fn(x, w, h); else if (p.k === 'lit') LIT.draw(c, p.fn(w, h)); else { el.dataset.live = String(liveTicks.length); liveTicks.push({ tick: p.fn(x, w, h) }); }
    } catch (e) { console.error('style guide painter failed', el.dataset.art, e); }
  }
  for (const t of liveTicks) live.push(t.tick);
  // animate only what is on screen
  const onScreen = new Set<number>(); const io = new IntersectionObserver((es) => es.forEach((e) => { const i = Number((e.target as HTMLElement).dataset.live); if (e.isIntersecting) onScreen.add(i); else onScreen.delete(i); }));
  document.querySelectorAll<HTMLElement>('[data-live]').forEach((el) => io.observe(el));
  let last = performance.now();
  const frame = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; for (const i of onScreen) live[i](dt); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  document.documentElement.dataset.ready = '1';
}
boot();
