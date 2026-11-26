// Shared bestiary kit: palette, the Creature base (squash, blink, notice, paste fizz, death animation),
// eyes that read in the dark, a correct white hit-flash, and small sensing helpers.
import { Enemy } from '../entity';
import { TAU, clamp, damp } from '../../engine/math';
import type { Game, Hit } from '../types';
import type { BurstOpts } from '../../engine/particles';
import { particle as PT } from '../../design/tokens';

export const PAL = {
  yellow: '#FCE300', yellowSoft: '#F4DC4A', plaque: '#E9CF2E', plaqueDk: '#B89A1A', citrus: '#C4D600', orange: '#FF8200', tangerine: '#FFA040',
  cerise: '#E31C79', orchid: '#F277C6', orchidLt: '#F9B4DF', gum: '#D86A9E', gumDk: '#9C3F6C',
  bone: '#D8CFB8', bone2: '#A89F88', bone3: '#6F6857', bone4: '#4A4538', boneLt: '#EEE7D3',
  ink: '#0A1F44', ink2: '#132B57', white: '#FFFFFF', sclera: '#FBF7EC', sky: '#8BB8E8', blue: '#003DA5',
};

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** True while the player is alive and not mid-respawn. */
export const playerAlive = (g: Game) => g.player.hp > 0;

/** On camera (shrunk by `inset`), so nothing attacks from off screen. */
export const onScreen = (g: Game, x: number, y: number, inset = 24) => g.cam.visible(x, y, -inset);

/** Player within range (and a clear line), and this creature on screen. */
export function canSee(g: Game, x: number, y: number, range: number, opts: { dyMax?: number; los?: boolean } = {}) {
  if (!playerAlive(g)) return false;
  const p = g.player, dx = p.x - x, dy = p.y - y;
  if (Math.hypot(dx, dy) > range) return false;
  if (opts.dyMax !== undefined && Math.abs(dy) > opts.dyMax) return false;
  if (!onScreen(g, x, y, 8)) return false;
  if (opts.los !== false && !g.room.lineOfSight(x, y, p.x, p.y - 6)) return false;
  return true;
}

export type Faction = 'plaque' | 'sugar' | 'tartar' | 'gum';

/** Damage the player; gum-faction heat also leaves them Inflamed for a few seconds (core status). */
export function hurtPlayer(g: Game, dmg: number, fromX: number, inflame = false) {
  const p = g.player, before = p.hp;
  g.hurtPlayer(dmg, fromX);
  if (inflame && p.hp < before) (p as unknown as { inflame?: (s: number) => void }).inflame?.(3);
}

/** Hurt the player if the rect overlaps (respects the dash, like core contact damage). */
export function touchPlayer(g: Game, x: number, y: number, hw: number, hh: number, dmg: number, fromX: number, dashSafe = true, inflame = false) {
  const p = g.player; if (!playerAlive(g) || (dashSafe && p.dashing) || p.invuln > 0) return false;
  if (Math.abs(p.x - x) < hw + p.hw - 2 && Math.abs(p.y - y) < hh + p.hh - 2) { hurtPlayer(g, dmg, fromX, inflame); return true; }
  return false;
}

// ---------- hit flash on an offscreen layer (the scene canvas is opaque, so source-atop must not touch it) ----------
let layer: HTMLCanvasElement | null = null, lctx: CanvasRenderingContext2D | null = null;
export function paintFlashed(ctx: CanvasRenderingContext2D, cx: number, cy: number, pad: number, amount: number, draw: (c: CanvasRenderingContext2D) => void, tint = '#ffffff') {
  if (amount <= 0.01) { draw(ctx); return; }
  const m = ctx.getTransform(), s = Math.hypot(m.a, m.b) || 1;
  const px = Math.floor((cx - pad) * m.a + m.e), py = Math.floor((cy - pad) * m.d + m.f), size = Math.ceil(pad * 2 * s) + 2;
  if (!layer) { layer = document.createElement('canvas'); lctx = layer.getContext('2d')!; }
  if (layer.width < size || layer.height < size) { layer.width = Math.max(layer.width, size); layer.height = Math.max(layer.height, size); }
  const l = lctx!;
  l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1; l.clearRect(0, 0, size, size);
  l.setTransform(m.a, m.b, m.c, m.d, m.e - px, m.f - py);
  draw(l);
  l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-atop'; l.globalAlpha = clamp(amount, 0, 1); l.fillStyle = tint; l.fillRect(0, 0, size, size);
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0, size, size, px, py, size, size); ctx.restore();
}

// ---------- eyes ----------
export interface EyeOpts {
  r: number;            // radius
  lx?: number; ly?: number;   // look direction -1..1
  open?: number;        // 0 closed .. 1 open (blink)
  squint?: number;      // >0.15 draws happy/pained squint chevrons
  pupil?: number;       // pupil radius as a fraction of r
  lid?: number;         // 0..1 heavy upper lid (grumpy / focused)
  tilt?: number;        // lid tilt, signed (use the eye's side for an angry V)
  lidColor?: string;
  dir?: number;         // which way the squint chevron points (1 right eye, -1 left eye)
}
function squintPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number) {
  ctx.beginPath(); ctx.moveTo(x - r * 0.8 * dir, y - r * 0.55); ctx.lineTo(x + r * 0.55 * dir, y); ctx.lineTo(x - r * 0.8 * dir, y + r * 0.55);
}
/** Scene layer eye: sclera, ink pupil, highlight, optional lid. */
export function eyeScene(ctx: CanvasRenderingContext2D, x: number, y: number, o: EyeOpts) {
  const r = o.r, open = clamp(o.open ?? 1, 0.06, 1);
  if ((o.squint ?? 0) > 0.15) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = Math.max(1.2, r * 0.32); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; squintPath(ctx, x, y, r, o.dir ?? 1); ctx.stroke(); return; }
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, r, r * open, 0, 0, TAU); ctx.fillStyle = PAL.sclera; ctx.fill();
  ctx.clip();
  const px = x + (o.lx ?? 0) * r * 0.38, py = y + (o.ly ?? 0) * r * 0.32, pr = r * (o.pupil ?? 0.5);
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, Math.max(0.6, pr * 0.32), 0, TAU); ctx.fill();
  if (o.lid && o.lid > 0) {
    ctx.fillStyle = o.lidColor ?? PAL.ink2; ctx.translate(x, y); ctx.rotate((o.tilt ?? 0) * 0.35);
    ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 0.6 + r * 2 * o.lid);
  }
  ctx.restore();
}
/** Emissive layer eye: the white reads in the dark, the pupil is cut out so it stays ink. */
export function eyeGlow(ctx: CanvasRenderingContext2D, g: Game, x: number, y: number, o: EyeOpts, color: string, a: number) {
  const r = o.r, open = clamp(o.open ?? 1, 0.06, 1);
  g.r.halo(ctx, x, y, r * 3.2, color, a * 0.45);
  if ((o.squint ?? 0) > 0.15) { ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, r * 0.22); ctx.lineCap = 'round'; squintPath(ctx, x, y, r, o.dir ?? 1); ctx.stroke(); ctx.globalAlpha = 1; return; }
  ctx.save();
  ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.ellipse(x, y, r, r * open, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out';
  const px = x + (o.lx ?? 0) * r * 0.38, py = y + (o.ly ?? 0) * r * 0.32, pr = r * (o.pupil ?? 0.5);
  ctx.beginPath(); ctx.arc(px, py, pr * 1.05, 0, TAU); ctx.fill();
  if (o.lid && o.lid > 0) { ctx.translate(x, y); ctx.rotate((o.tilt ?? 0) * 0.35); ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 0.6 + r * 2 * o.lid); }
  ctx.restore();
}
/** A single glowing slit or ember eye (tartar creatures). */
export function emberEye(ctx: CanvasRenderingContext2D, g: Game, x: number, y: number, r: number, color: string, a: number, open = 1) {
  g.r.halo(ctx, x, y, r * 4, color, a * 0.6);
  ctx.globalAlpha = a; ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.ellipse(x, y, r, Math.max(0.6, r * 0.62 * open), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
}

/** A soft "!" spark over a creature that just noticed the player. */
export function drawAlert(ctx: CanvasRenderingContext2D, g: Game, x: number, y: number, t: number, color = '#ffffff') {
  if (t <= 0) return;
  const k = clamp(t / 0.7, 0, 1), pop = 1 + Math.sin(Math.min(1, (0.7 - t) / 0.15) * Math.PI) * 0.35, yy = y - (1 - k) * 8;
  ctx.globalAlpha = Math.min(1, k * 2.5); g.r.halo(ctx, x, yy, 18, color, 0.5 * k);
  ctx.globalAlpha = Math.min(1, k * 2.5); ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x - 2.4 * pop, yy - 13 * pop); ctx.lineTo(x + 2.4 * pop, yy - 13 * pop); ctx.lineTo(x + 1 * pop, yy - 2 * pop); ctx.lineTo(x - 1 * pop, yy - 2 * pop); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x, yy + 2.5 * pop, 1.8 * pop, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
}

/** Four-point glint (telegraph sparkle). */
export function glint(ctx: CanvasRenderingContext2D, g: Game, x: number, y: number, s: number, color: string, a: number, rot = 0) {
  if (a <= 0) return;
  g.r.halo(ctx, x, y, s * 2.4, color, a * 0.7);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}

/** Wobbly blob outline (soft plaque bodies). */
export function blobPath(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, t: number, wob: number, seed = 0, flatBottom = true) {
  ctx.beginPath();
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, w = 1 + wob * (Math.sin(a * 3 + t * 4 + seed) * 0.6 + Math.sin(a * 5 - t * 3 + seed * 2) * 0.4);
    let px = x + Math.cos(a) * rx * w, py = y + Math.sin(a) * ry * w;
    if (flatBottom && py > y) py = y + (py - y) * 0.45;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ---------- the base creature ----------
export abstract class Creature extends Enemy {
  sx = 1; sy = 1;            // squash and stretch (damped back to 1)
  squint = 0;                // paste reaction: eyes scrunch
  fizz = 0;                  // paste reaction: foam bubbles
  alert = 0;                 // "!" timer after noticing
  aware = false;
  dying = -1; deathDur = 0.34; killHit: Hit | null = null;
  blink = 0; blinkT = 1 + Math.random() * 3;
  lookX = 0; lookY = 0;
  jitter = 0;                // shiver offset timer
  seed = Math.random() * 100;
  glowColor = PAL.yellow;    // body glow on the emissive layer
  popSfx = 'splash';         // sound when the death pop bursts
  /** Gum-faction contact: handled here (not by the core) so a touch can also inflame. 0 = off. */
  heatTouch = 0;
  constructor(type: string, x: number, y: number, hw: number, hh: number, hp: number, faction: Faction = 'plaque') {
    super(type, x, y, hw, hh, hp); this.setFaction(faction);
  }
  /** The core's Enemy carries `faction` (mastery scaling); assigned, not redeclared, so either core version compiles. */
  setFaction(f: Faction) { (this as unknown as { faction: Faction }).faction = f; }
  get factionId(): Faction { return (this as unknown as { faction?: Faction }).faction ?? 'plaque'; }

  override update(g: Game, dt: number) {
    this.age += dt; this.flash = Math.max(0, this.flash - dt);
    this.sx = damp(this.sx, 1, 11, dt); this.sy = damp(this.sy, 1, 11, dt);
    this.squint = Math.max(0, this.squint - dt); this.alert = Math.max(0, this.alert - dt); this.jitter = Math.max(0, this.jitter - dt);
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = 2 + Math.random() * 3.5; } this.blink = Math.max(0, this.blink - dt);
    if (this.fizz > 0) {
      this.fizz -= dt;
      if (Math.random() < dt * 36) g.fx.burst(this.x + rand(-this.hw, this.hw), this.y + rand(-this.hh, this.hh) * 0.6, { n: 1, color: ['#ffffff', '#CFE3FA', PAL.sky], shape: 'bubble', speed: [20, 90], angle: -Math.PI / 2, spread: 1.6, size: [1.5, 4], gravity: -120, life: [0.3, 0.7], emissive: Math.random() < 0.4 });
    }
    if (this.dying >= 0) {
      this.dying += dt; this.pogo = false; this.vx *= Math.exp(-7 * dt);
      this.dyingUpdate(g, dt);
      if (this.dying >= this.deathDur) this.finishDeath(g);
      return;
    }
    if (this.stun > 0) { this.stun -= dt; this.vx *= Math.exp(-8 * dt); this.stunned(g, dt); }
    else this.think(g, dt);
    if (this.heatTouch > 0 && !this.dead && this.dying < 0) touchPlayer(g, this.x, this.y, this.hw - 1, this.hh - 1, this.heatTouch, this.x, true, true);
  }
  /** Stagger: slide with physics (override for fliers and wall crawlers). */
  stunned(g: Game, dt: number) { this.physics(g, dt); }
  /** While the death animation plays. */
  dyingUpdate(g: Game, dt: number) { this.physics(g, dt); }
  /** Eye openness this frame. */
  get open() { return this.blink > 0 ? 0.08 : 1; }
  /** Shiver offset (hit and fizz). */
  shiver() { const k = this.jitter * 22 + (this.fizz > 0 ? 0.8 : 0) + (this.dying >= 0 ? 2 + this.dying * 8 : 0); return k ? (Math.random() - 0.5) * k : 0; }

  /** Return true to block the hit (no damage). */
  guard(_g: Game, _hit: Hit): boolean { return false; }
  /** Hook after a landed hit (interrupt attacks, wake up...). */
  reacted(_g: Game, _hit: Hit) {}

  override onHit(g: Game, hit: Hit): boolean {
    if (this.dead || this.dying >= 0) return false;
    if (this.guard(g, hit)) return false;
    const tick = hit.kind === 'spell' && hit.damage < 5; // lingering foam: small ticks, no shove
    this.hp -= hit.damage; this.flash = tick ? 0.06 : 0.13;
    const k = (1 - this.knockResist) * (tick ? 0.12 : 1);
    if (k > 0.03) { this.vx = hit.dirX * 380 * k; if (hit.dirY) this.vy = hit.dirY * 260 * k; this.stun = Math.max(this.stun, 0.13 * k); }
    if (!tick) {
      if (hit.dirY) { this.sy = 0.7; this.sx = 1.3; } else { this.sx = 0.72; this.sy = 1.22; }
      this.jitter = 0.12;
      const ang = Math.atan2(hit.dirY, hit.dirX || 0.001);
      g.fx.burst(this.x, this.y, { n: 10, speed: [120, 380], angle: ang, spread: 1.4, color: this.bloodColor(), size: [1.5, 3.2], gravity: 900, shape: 'crumb', spin: 8, life: [0.25, 0.6] });
      g.fx.burst(this.x, this.y, { ...PT.spark, angle: ang });
    }
    if (hit.kind === 'spell') this.pasted(g, hit, tick);
    else g.audio.sfx('hit', { x: this.x, y: this.y });
    if (!this.aware) this.notice(g, false);
    this.reacted(g, hit);
    if (this.hp <= 0) this.die(g, hit);
    return true;
  }
  /** Toothpaste / rinse reaction: fizz, sputter, scrunched eyes. */
  pasted(g: Game, _hit: Hit, tick: boolean) {
    this.squint = Math.max(this.squint, tick ? 0.45 : 1.0); this.fizz = Math.max(this.fizz, tick ? 0.5 : 1.1); this.jitter = Math.max(this.jitter, 0.08);
    if (!tick || Math.random() < 0.35) g.audio.sfx('splash', { x: this.x, y: this.y, pitch: 1.5 + Math.random() * 0.3, vol: tick ? 0.25 : 0.6 });
    g.fx.burst(this.x, this.y - this.hh * 0.3, { n: tick ? 3 : 12, color: ['#ffffff', '#DDEBFB', PAL.sky], shape: 'bubble', speed: [40, 200], angle: -Math.PI / 2, spread: 2.4, size: [1.5, 4.5], gravity: -60, life: [0.3, 0.8] });
  }
  notice(g: Game, hop = true) {
    if (this.aware) return;
    this.aware = true; this.alert = 0.7; this.sy = 1.3; this.sx = 0.8;
    if (hop && this.grounded) this.vy = -210;
    g.audio.sfx('enemy-alert', { x: this.x, y: this.y, pitch: this.alertPitch() });
  }
  alertPitch() { return 1; }

  override die(g: Game, hit: Hit) {
    if (this.dead || this.dying >= 0) return;
    this.dying = 0; this.killHit = hit; this.hurtable = false; this.contactDamage = 0; this.stun = 0;
    this.flash = 0.35; this.squint = 0; this.sx = 1.25; this.sy = 0.8;
    g.hitstop(0.07); g.shake(4, 0.12); g.audio.sfx('kill', { x: this.x, y: this.y });
    g.fx.burst(this.x, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [4, 4], grow: 180, emissive: true, life: [0.16, 0.16] });
  }
  /** The pop at the end of the death animation: bursts, shine, bestiary count. */
  finishDeath(g: Game) {
    this.dead = true;
    g.save.killed[this.type] = (g.save.killed[this.type] || 0) + 1;
    g.progress?.onKill(this as any);
    const c = this.bloodColor();
    g.fx.burst(this.x, this.y, { ...PT.plaqueBurst, color: c }); g.fx.burst(this.x, this.y, PT.rinseAway); g.fx.burst(this.x, this.y - 6, PT.cleanGlint);
    g.fx.burst(this.x, this.y, { n: 1, speed: [0, 0], color: '#ffffff', shape: 'ring', size: [6, 6], grow: 260, emissive: true, life: [0.25, 0.25] });
    g.fx.burst(this.x, this.y, { n: 10, speed: [40, 200], color: Array.isArray(c) ? c[0] : c, size: [1, 2.5], emissive: true, life: [0.3, 0.7], drag: 2 });
    this.deathBurst(g);
    g.audio.sfx(this.popSfx, { x: this.x, y: this.y, pitch: 0.8 });
    g.shake(5, 0.15);
    if (this.shine) g.dropShine(this.x, this.y, this.shine);
  }
  /** Extra per-creature death particles. */
  deathBurst(_g: Game) {}

  /** Correct hit flash (offscreen layer), also used for the death glow. */
  protected override withFlash(ctx: CanvasRenderingContext2D, draw: (c?: CanvasRenderingContext2D) => void) {
    const amt = Math.min(1, this.flash * 9) + (this.dying >= 0 ? Math.min(0.85, this.dying / this.deathDur) : 0);
    paintFlashed(ctx, this.x, this.y, Math.max(this.hw, this.hh) * 3 + 24, Math.min(1, amt), (c) => draw(c));
  }
  /** Drop a few puffs of dust at the feet. */
  dust(g: Game, n: number, color: string | string[] = ['#8f8a7a', '#6d6a5e'], y = this.y + this.hh - 2) {
    g.fx.burst(this.x, y, { n, color, speed: [30, 150], angle: -Math.PI / 2, spread: 2.8, size: [2, 4.5], grow: 5, gravity: -40, drag: 4, life: [0.3, 0.7] });
  }
}

export function burst(g: Game, x: number, y: number, o: BurstOpts) { g.fx.burst(x, y, o); }
