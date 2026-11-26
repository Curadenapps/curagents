// The frame: three 2D layers (scene, emissive, light) composed by Post, or by a 2D fallback.
// World units: one tile is 32 units. The camera shows VIEW_H units of height; width follows the aspect.
import { Post, Grade, DEFAULT_GRADE } from './post';
import { rgb } from './math';

export const TILE = 32;
export const VIEW_H = 17 * TILE;

export interface Light { x: number; y: number; r: number; color: string; i: number }

export class Camera {
  x = 0; y = 0;          // centre, world units
  zoom = 1;              // >1 zooms in
  shakeT = 0; shakeAmp = 0; sx = 0; sy = 0;
  scale = 1;             // device px per world unit (set by renderer)
  w = 0; h = 0;          // device px
  get viewW() { return this.w / this.scale; }
  get viewH() { return this.h / this.scale; }
  left() { return this.x + this.sx - this.viewW / 2; }
  top() { return this.y + this.sy - this.viewH / 2; }
  toScreen(x: number, y: number) { return { x: (x - this.left()) * this.scale, y: (y - this.top()) * this.scale }; }
  toWorld(px: number, py: number) { return { x: px / this.scale + this.left(), y: py / this.scale + this.top() }; }
  /** Apply world transform to ctx, with parallax factor p (1 = world, 0 = fixed to screen). */
  apply(ctx: CanvasRenderingContext2D, p = 1, k = 1) {
    const s = this.scale * k; const cx = (this.x + this.sx) * p, cy = (this.y + this.sy) * p;
    ctx.setTransform(s, 0, 0, s, this.w * k / 2 - cx * s, this.h * k / 2 - cy * s);
  }
  visible(x: number, y: number, pad: number) { const l = this.left(), t = this.top(); return x > l - pad && x < l + this.viewW + pad && y > t - pad && y < t + this.viewH + pad; }
}

export class Renderer {
  view: HTMLCanvasElement;
  scene = document.createElement('canvas');
  emissive = document.createElement('canvas');
  light = document.createElement('canvas');
  sc: CanvasRenderingContext2D; em: CanvasRenderingContext2D; li: CanvasRenderingContext2D;
  post: Post | null = null;
  out2d: CanvasRenderingContext2D | null = null;
  cam = new Camera();
  grade: Grade = { ...DEFAULT_GRADE };
  ambient = '#3a4a6e';
  lights: Light[] = [];
  quality = 1;            // 0.5..1 multiplies pixel ratio
  readonly lightScale = 0.5;
  private sprites = new Map<string, HTMLCanvasElement>();
  cssW = 0; cssH = 0; pr = 1;

  constructor(view: HTMLCanvasElement) {
    this.view = view;
    this.sc = this.scene.getContext('2d', { alpha: false })!;
    this.em = this.emissive.getContext('2d')!;
    this.li = this.light.getContext('2d', { alpha: false })!;
    try { this.post = new Post(view); } catch (e) { console.warn('Post-processing off:', (e as Error).message); this.out2d = view.getContext('2d'); }
  }
  resize() {
    const r = this.view.getBoundingClientRect(); this.cssW = Math.max(1, r.width); this.cssH = Math.max(1, r.height);
    this.pr = Math.min(window.devicePixelRatio || 1, 2) * this.quality;
    const w = Math.round(this.cssW * this.pr), h = Math.round(this.cssH * this.pr);
    if (this.scene.width !== w || this.scene.height !== h) {
      this.scene.width = this.emissive.width = w; this.scene.height = this.emissive.height = h;
      this.light.width = Math.max(1, Math.round(w * this.lightScale)); this.light.height = Math.max(1, Math.round(h * this.lightScale));
      if (this.post) this.post.resize(w, h); else { this.view.width = w; this.view.height = h; }
    }
    this.cam.w = w; this.cam.h = h; this.cam.scale = (h / VIEW_H) * this.cam.zoom;
  }
  begin() {
    this.cam.scale = (this.cam.h / VIEW_H) * this.cam.zoom;
    this.sc.setTransform(1, 0, 0, 1, 0, 0); this.em.setTransform(1, 0, 0, 1, 0, 0);
    this.em.clearRect(0, 0, this.emissive.width, this.emissive.height);
    this.lights.length = 0;
  }
  addLight(l: Light) { if (this.cam.visible(l.x, l.y, l.r)) this.lights.push(l); }
  /** A soft radial sprite in the given colour, cached. */
  glow(color: string): HTMLCanvasElement {
    let c = this.sprites.get(color); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const [r, gg, b] = rgb(color); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, `rgba(${r},${gg},${b},1)`); grd.addColorStop(0.35, `rgba(${r},${gg},${b},0.55)`); grd.addColorStop(0.7, `rgba(${r},${gg},${b},0.15)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128); this.sprites.set(color, c); return c;
  }
  /** Draw a glow sprite into a context in world space (for emissive halos). */
  /** Global multiplier for emissive halos (keeps glows from washing the screen). */
  glowScale = 0.7;
  halo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
    ctx.globalAlpha = Math.min(1, a * this.glowScale); ctx.drawImage(this.glow(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
  }
  private drawLights() {
    const li = this.li, k = this.lightScale; li.setTransform(1, 0, 0, 1, 0, 0);
    li.globalCompositeOperation = 'source-over'; li.fillStyle = this.ambient; li.fillRect(0, 0, this.light.width, this.light.height);
    this.cam.apply(li, 1, k); li.globalCompositeOperation = 'lighter';
    for (const l of this.lights) { li.globalAlpha = Math.min(1, l.i); li.drawImage(this.glow(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); if (l.i > 1) { li.globalAlpha = l.i - 1; li.drawImage(this.glow(l.color), l.x - l.r * 0.6, l.y - l.r * 0.6, l.r * 1.2, l.r * 1.2); } }
    li.globalAlpha = 1; li.globalCompositeOperation = 'source-over';
  }
  present(time: number) {
    this.drawLights();
    if (this.post) { this.post.render(this.scene, this.emissive, this.light, this.grade, time); return; }
    const o = this.out2d!; o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.drawImage(this.scene, 0, 0);
    o.globalCompositeOperation = 'multiply'; o.drawImage(this.light, 0, 0, this.view.width, this.view.height);
    o.globalCompositeOperation = 'lighter'; o.drawImage(this.emissive, 0, 0); o.globalCompositeOperation = 'source-over';
    const g = this.grade; if (g.flash[3] > 0) { o.globalAlpha = g.flash[3]; o.fillStyle = `rgb(${g.flash[0] * 255},${g.flash[1] * 255},${g.flash[2] * 255})`; o.fillRect(0, 0, this.view.width, this.view.height); }
    if (g.fade > 0) { o.globalAlpha = g.fade; o.fillStyle = '#000'; o.fillRect(0, 0, this.view.width, this.view.height); }
    o.globalAlpha = 1;
  }
}
