// BRISTLE living style guide. Bundled by styleguide.mjs into dist/styleguide.html (runs from file://).
// Everything on the page is drawn from the real tokens, the kit, the real Player, the real HUD, the
// real particle system and the real WebGL post pipeline, so the page cannot drift from the game.
import * as T from './tokens';
import { kit, blob, enamel, gumFold, glowEye, crownCap, foamCluster, crystalShard, lightShaft, fogBand, brush, pasteDollop, palateRidges, tongueSurface, salivaPool, glint, silhouetteStrip } from './kit';
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
const B = T.brand, M = T.material;

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
const G = { r: { halo }, audio: { sfx() {} }, time: 0 } as unknown as Game;

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
const SECTIONS: [string, string][] = [['principles', 'Principles'], ['colour', 'Colour'], ['type', 'Typography'], ['components', 'UI components'], ['materials', 'Materials'], ['kit', 'Drawing kit'], ['hero', 'The hero'], ['light', 'Light and grade'], ['particles', 'Particles'], ['motion', 'Motion and feel'], ['dodont', 'Do and don\'t']];
const head = (n: number, title: string, lead: string) => `<p class="eyebrow">${String(n).padStart(2, '0')} &nbsp;/&nbsp; ${SECTIONS[n - 1][1]}</p><h2>${title}</h2><p class="lead">${lead}</p>`;

function cover() {
  return `<section class="cover" id="top"><div class="cover-art">${aLit(760, (w, h) => coverScene(w, h), 'cover-canvas')}
  <div class="cover-text" style="top:92px;bottom:auto;display:block">
    <div class="t1">CURAPROX &nbsp;&middot;&nbsp; Design system v0.1</div>
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
    ['CURAPROX first', 'Curaprox Blue is the hero and the primary button. Futura uppercase tracked for anything the game says; Info Display for reading. Pill buttons. No emoji.'],
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
  const brandList: [string, string, string][] = [['Curaprox Blue', B.blue, 'brand.blue'], ['Ink', B.ink, 'brand.ink'], ['Ink 2', B.ink2, 'brand.ink2'], ['White', B.white, 'brand.white'], ['Soft Sky', B.sky, 'brand.sky']];
  const tints: [string, string, string][] = [['Blue 80', B.blue80, 'brand.blue80'], ['Blue 60', B.blue60, 'brand.blue60'], ['Blue 40', B.blue40, 'brand.blue40'], ['Blue 20', B.blue20, 'brand.blue20'], ['Blue Dark', B.blueDark, 'brand.blueDark'], ['Light grey', B.grey10, 'brand.grey10'], ['Grey', B.grey, 'brand.grey']];
  const support: [string, string, string][] = [['Citrus', B.citrus, 'brand.citrus'], ['Vivid Yellow', B.yellow, 'brand.yellow'], ['Tangerine', B.tangerine, 'brand.tangerine'], ['Orchid', B.orchid, 'brand.orchid'], ['Cerise', B.cerise, 'brand.cerise']];
  const biomes = (Object.keys(T.biome) as T.BiomeId[]).map((id) => {
    const b = T.biome[id], t = b.terrain;
    const strip = (o: Record<string, string>) => `<div class="strip">${Object.entries(o).map(([k, v]) => `<div style="background:${v}"><span style="color:${onColor(v)}">${k} ${v}</span></div>`).join('')}</div>`;
    return `<div class="card biome"><div class="sky" style="background:linear-gradient(180deg, ${b.sky[0]}, ${b.sky[1]})"><h4>${b.name}</h4><p>${b.anatomy}</p><p class="mono" style="margin-top:8px">biome.${id}</p></div>
      <div class="rows"><div class="row"><b>Parallax</b>${strip({ far: b.far, mid: b.mid, near: b.near })}</div><div class="row"><b>Terrain</b>${strip(t as unknown as Record<string, string>)}</div><div class="row"><b>Accents</b>${strip({ fog: b.fog, accent: b.accent, accent2: b.accent2 })}</div></div></div>`;
  }).join('');
  const lights = Object.entries(T.light).map(([k, v]) => `<div class="card">${a2d(110, (ctx, w, h) => { ctx.fillStyle = '#050B1F'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; halo(ctx, w / 2, h / 2, h * 0.9, v, 0.9); halo(ctx, w / 2, h / 2, h * 0.18, '#FFFFFF', 0.3); ctx.globalCompositeOperation = 'source-over'; })}<div class="pad" style="padding:12px 14px"><div class="nm" style="font-family:var(--display);font-size:11px;letter-spacing:.18em;text-transform:uppercase">${k}</div><div class="mono">${v}</div></div></div>`).join('');
  const uiRows: [string, string][] = [['text', T.ui.text], ['primary', T.ui.primary], ['focus', T.ui.focus], ['shine', T.ui.shine], ['danger', T.ui.danger], ['success', T.ui.success]];
  return `<section id="colour">${head(2, 'Colour', 'CURAPROX roots, then the dark the game lives in, then a ramp for every material in the mouth. Each chip shows its token path; contrast badges mark brand colours that pass WCAG AA for text on white or ink.')}
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
    return `<div class="type-row"><div class="spec"><b>${k}</b>${t.family === 'display' ? 'Futura LT Pro' : 'Info Display Pro'} ${t.weight === 700 ? 'Bold' : 'Book'}<br>${t.size}px / ${t.lineHeight} &middot; tracking ${t.tracking}em${t.upper ? ' &middot; UPPER' : ''}<br><span style="color:var(--faint)">${t.use}</span></div>
      <div style="font-family:${fam};font-size:${t.size}px;font-weight:${t.weight};letter-spacing:${t.tracking}em;line-height:${t.lineHeight};text-transform:${t.upper ? 'uppercase' : 'none'}">${sample[k] ?? k}</div></div>`;
  }).join('');
  return `<section id="type">${head(3, 'Typography', 'Futura LT Pro speaks for the game: uppercase, generously tracked, Book weight. Info Display Pro is for reading: dialogue and descriptions in sentence case. Sizes are CSS px at the HUD\'s 820 px reference height; the HUD scales between 0.7x and 1.4x.')}
  <div class="grid g2"><div class="card family"><div class="aa" style="font-family:var(--display)">Aa</div><div><h4>Futura LT Pro</h4><p class="glyphs" style="font-family:var(--display);text-transform:uppercase;letter-spacing:.12em">ABCDEFGHIJKLM NOPQRSTUVWXYZ 0123456789</p><p class="mono">font.display &middot; titles, menus, HUD, prompts</p></div></div>
  <div class="card family"><div class="aa" style="font-family:var(--body)">Aa</div><div><h4>Info Display Pro</h4><p class="glyphs" style="font-family:var(--body)">Abcdefghijklm nopqrstuvwxyz 0123456789 .,;:?!</p><p class="mono">font.body &middot; dialogue, descriptions, help</p></div></div></div>
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
  return `<section id="components">${head(4, 'UI components', 'The game\'s UI is quiet and premium: dark translucent panels, hairline rings, Futura labels and CURAPROX pill buttons. Glow only marks focus and readiness.')}
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
  <h3>Dialogue</h3><div class="card"><div class="dialogue"><div class="portrait">${a2d(124, portrait)}</div><div><div class="who">Mira<small>Hermit hygienist</small></div>
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
function hudFake(hp: number, maxHp: number, fluor: number, shine: number) { return { state: 'play', player: { hp, maxHp, fluor }, save: { shine }, time: 1.6 } as unknown as GameCore; }
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
    ['Paste', 'CURAPROX toothpaste: glossy white with a brand stripe. The hero\'s thrown weapon.', (c, w, h) => { bg(c, w, h, '#0B1A40'); pasteDollop(c, w * 0.36, h * 0.86, 90); pasteDollop(c, w * 0.74, h * 0.8, 54, { stripe: B.tangerine, stripe2: B.sky, tilt: 0.15 }); }, M.paste],
    ['Foam', 'Paste and rinse foam: bubble domes with a sky edge and a white gloss.', (c, w, h) => { bg(c, w, h, '#0B1A40'); foamCluster(c, w * 0.35, h * 0.8, 52, { seed: 2, count: 18 }); foamCluster(c, w * 0.76, h * 0.8, 32, { seed: 8 }); }, M.foam],
    ['Rinse and saliva', 'Cool clear water: fountains, pools, the Rinse wave. Bright surface line.', (c, w, h) => { bg(c, w, h, '#0A1838'); salivaPool(c, w / 2, h * 0.52, w * 0.8, { depth: 50, seed: 3 }); }, { pool: M.saliva.pool, surface: M.saliva.surface, deep: M.saliva.deep, glow: M.rinse.glow }],
    ['Brush (CS 5460 style)', 'Slim octagonal handle in a bold colour, compact head, dense fine filaments.', (c, w, h) => { bg(c, w, h, '#0B1A40'); brush(c, w * 0.08, h * 0.38, w * 0.86, { handle: B.blue }); brush(c, w * 0.08, h * 0.72, w * 0.86, { handle: B.cerise }); }, T.hero.brush as unknown as Record<string, string>],
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
    ['brush', 'CS 5460 style brush-blade', 'brush(ctx, x, y, length, { angle, handle, filament })', (c, w, h) => { bg(c, w, h, '#0B1633'); brush(c, w * 0.1, h * 0.35, w * 0.8, { handle: B.tangerine }); brush(c, w * 0.1, h * 0.75, w * 0.8, { handle: B.citrus }); }],
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
  return `<section id="hero">${head(7, 'The hero', 'Bristle, last knight of the Order of the 5,460. Drawn by the real Player class from src/game/player.ts, posed by setting its fields (facing, velocity, slash, focus, squash) and run through the game\'s lighting. Enamel crown helm with two cusps, Curaprox-blue cloak, sky visor, the brush-blade.')}
  <h3>Pose sheet</h3><div class="grid g6">${P.map(([p, n, d]) => `<div class="card pose">${aLit(200, tile(p))}<div class="lbl">${n}<small>${d}</small></div></div>`).join('')}</div>
  <h3>Proportions and hit boxes</h3>
  <div class="grid" style="grid-template-columns:1.25fr 1fr;gap:18px;align-items:start"><div class="card">${a2d(470, proportions)}<div class="pad"><p>One tile is 32 units; the camera shows 17 tiles of height. The hero is 42 units of body plus a 10-unit crown: about 1.6 tiles. The helm is a third of the height, which keeps the crown readable at any zoom. Blue box: hurt box (10 x 21 half extents). Sky: side slash reach (42 forward, 40 x 26). Dashed: up and down slash.</p></div></div>
  <div class="card"><div class="pad"><h4>Hero palette</h4><div style="display:grid;gap:8px;margin-top:12px">${chips}</div></div><div class="pad" style="border-top:1px solid var(--hair)"><h4>Brush handle variants</h4><p>CS 5460 comes in many bold colours: handle finishes are a natural cosmetic unlock (tokens.brushHandles).</p><div style="display:grid;gap:4px;margin-top:10px">${brushes}</div></div></div></div>
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

// ---- light ----
function lightSection() {
  const ids = ['crown', 'gumline', 'narrows', 'sugar', 'calculus', 'throne'] as const;
  const fmt = (v: unknown) => Array.isArray(v) ? v.map((n) => (+n).toFixed(2)).join(' ') : typeof v === 'number' ? String(v) : '';
  return `<section id="light">${head(8, 'Light and grade', 'Each biome gets an ambient (the light-map base: #808080 is neutral) and a grade that merges over DEFAULT_GRADE, exactly as game.ts does. Previews run through engine/post.ts: lighting composite, bloom, fringe, grade, vignette and grain.')}
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
  return `<section id="particles">${head(9, 'Particles', 'Presets for g.fx.burst(x, y, { ...particle.id, n }). Lit particles catch the light map; emissive ones glow. Running live on the engine\'s own particle pool.')}
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
  return `<section id="motion">${head(10, 'Motion and feel', 'UI moves softly and quickly (ease out, 140-400 ms). The game feels crisp: short hitstops, small shakes that scale with weight, squash and stretch on every jump, land and dash. Numbers are from the code, so tuning here means tuning there.')}
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
  return `<section id="dodont">${head(11, 'Do and don\'t', 'The fastest way to keep the world on-brand. Pairs show the rule; the no-go list is absolute.')}
  <div class="grid g2">
  ${pair('Glow is earned', 'Glow for real light sources only: eyes, plaque, sparks, relics, fountains.', aLit(170, (w, h) => diorama('calculus', w, h)), 'Glow everything and raise bloom: the world turns to fog and the hero disappears.', aLit(170, (w, h) => diorama('calculus', w, h, { glowAll: true })))}
  ${pair('Gums and flesh', 'Orchid to cerise, soft folds, a light lip, dry and clean.', a2d(170, (c, w, h) => { bg(c, w, h, '#2A0D26'); enamel(c, w * 0.3, h * 0.62, 60, { height: 110 }); enamel(c, w * 0.7, h * 0.62, 60, { height: 110, seed: 3 }); gumFold(c, w / 2, h * 0.52, h * 0.5, { width: w + 10, scallops: 3 }); }), 'Raw red, brown or purple-black flesh, wet sheen, drips, bleeding gums.', a2d(170, chipsX(['#8B1A1A', '#5A1E14', '#3A0E18', '#A0522D'])))}
  ${pair('Tartar and teeth', 'Tartar is bone and grey-beige, matte, layered like a reef. Teeth are always clean white enamel.', a2d(170, (c, w, h) => { bg(c, w, h, '#1C1A18'); crownCap(c, w * 0.32, h * 0.86, 90, { calcified: true, cusps: 4 }); enamel(c, w * 0.72, h * 0.95, 70, { shape: 'molar', height: 80 }); }), 'Brown or black stains, holes, cracks, broken or rotten teeth, anything that reads as decay.', a2d(170, chipsX(['#3B2A14', '#1A120A', '#5C4A1E', '#2B2B2B'])))}
  ${pair('Silhouette and value', 'Dark ground, the hero\'s enamel helm and sky visor carry the read. Keep a full value step between actor and background.', aLit(170, (w, h) => ({ ambient: '#3E465E', lights: heroLights('idle', w / 2, h * 0.86, 2.4), scene(c) { sky(c, w, h, ['#0B1A40', '#050B1F']); c.fillStyle = '#0D1736'; c.fillRect(0, h * 0.86, w, h); hero(c, 'idle', w / 2, h * 0.86, 2.4); }, emissive(c) { heroEm(c, 'idle', w / 2, h * 0.86, 2.4); } })), 'Mid-blue hero on a mid-blue busy background: the cloak and blade vanish.', aLit(170, (w, h) => ({ ambient: '#9AA8C8', grade: { bloom: 0.2 }, scene(c) { c.fillStyle = '#3364B7'; c.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { c.fillStyle = i % 2 ? '#2C4377' : '#668BC9'; c.fillRect((i * 53) % w, (i * 31) % h, 30, 20); } hero(c, 'idle', w / 2, h * 0.86, 2.4); } })))}
  ${pair('Copy tone', 'Gentle in-world habit flavour, a little funny, never a promise.', `<p class="ex">&ldquo;Twice a day the old knights swept the towers, at sunrise and at dusk. The towers remembered.&rdquo;</p><p class="ex">&ldquo;Pip insists the cerise handle is faster. It is not.&rdquo;</p>`, 'Clinical or medical claims, fear about real teeth, lecturing.', `<p class="ex strike">&ldquo;Removes 99% of plaque. Clinically proven.&rdquo;</p><p class="ex strike">&ldquo;Brush or your teeth will rot.&rdquo;</p>`)}
  ${pair('Originality', 'Our own names, creatures and places: Plaqlings, Mother Calculus, the Order of the 5,460, Ivoria, the Great Smile.', `<p class="ex">A brush-blade, a crown helm, a rinse fountain: the genre's verbs in a world nobody else has.</p>`, 'Borrowed characters, masks, bug knights, lore, music, maps or layouts from any existing game.', `<p class="ex strike">Hollow-eyed masks, insect knights, look-alike HUDs.</p>`)}
  </div>
  <h3>No-go list</h3><div class="nolist">
    <div><b>No gore</b>No blood, wounds, organs or body horror. Hits are sparks and plaque splats.</div><div><b>No decay imagery</b>No cavities, stains, rot, black teeth or bad breath gags.</div><div><b>No clinical claims</b>No "prevents", "cures", "removes 99%", no dental advice.</div>
    <div><b>No copying</b>The genre is fair game; another game's characters, art, music or layouts are not.</div><div><b>No fear</b>No scaring players about their real teeth, dentists or treatments.</div><div><b>No emoji, no brand abuse</b>No emoji in UI. Never recolour CURAPROX Blue; no logos in-world.</div>
  </div></section>`;
}

// ---------------------------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------------------------
async function boot() {
  try { await Promise.all([document.fonts.load(`400 20px ${T.font.display}`), document.fonts.load(`700 20px ${T.font.display}`), document.fonts.load(`400 20px ${T.font.body}`)]); } catch { /* fallback fonts */ }
  LIT = new Lit();
  const nav = `<nav class="side"><div class="mark">BRISTLE<small>Design system v0.1</small></div><ol>${SECTIONS.map(([id, n], i) => `<li><a href="#${id}"><span>${String(i + 1).padStart(2, '0')}</span>${n}</a></li>`).join('')}</ol><div class="foot">Living style guide, drawn by the game's own code.<br>Build: node styleguide.mjs</div></nav>`;
  const main = `<main>${cover()}${principles()}${colour()}${typeSection()}${components()}${materials()}${kitSection()}${heroSection()}${lightSection()}${particleSection()}${motionSection()}${doDont()}<footer><span>BRISTLE: Knight of the Crown &middot; an original game for CURAPROX</span><span>tokens.ts &middot; kit.ts &middot; ART-BIBLE.md &middot; BACKLOG.md</span></footer></main>`;
  document.body.innerHTML = `<div class="layout">${nav}${main}</div>`;
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
