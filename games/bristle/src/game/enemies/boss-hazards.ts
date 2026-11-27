// Mother Calculus's hazards: floor shockwaves (jump them) and falling tartar shards (shadow first).
import { TAU, clamp } from '../../engine/math';
import type { Entity, Game, Team } from '../types';
import { PAL, rand, touchPlayer } from './common';

abstract class Hazard implements Entity {
  id = 0; x: number; y: number; hw: number; hh: number; vx = 0; vy = 0; dead = false; team: Team = 'neutral'; z = 12;
  hurtable = false; contactDamage = 0; pogo = false; t = 0;
  constructor(x: number, y: number, hw: number, hh: number) { this.x = x; this.y = y; this.hw = hw; this.hh = hh; }
  abstract update(g: Game, dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, g: Game): void;
}

/** A crest of tartar grit racing along the floor. Low: jump it. */
export class Shockwave extends Hazard {
  dir: number; speed: number; floor: number; stopX: number | null;
  constructor(x: number, floor: number, dir: number, speed: number, stopX: number | null = null) {
    super(x, floor - 13, 13, 13); this.dir = dir; this.speed = speed; this.floor = floor; this.stopX = stopX;
  }
  update(g: Game, dt: number) {
    this.t += dt; this.x += this.dir * this.speed * dt;
    const ahead = this.x + this.dir * this.hw;
    const blocked = g.room.solidAt(ahead, this.floor - 8) || !g.room.solidAt(this.x, this.floor + 6);
    if (blocked || this.t > 4 || (this.stopX !== null && (this.x - this.stopX) * this.dir > 0)) { this.fade(g); return; }
    touchPlayer(g, this.x, this.y, this.hw - 2, this.hh, 1, this.x - this.dir * 20);
    if (Math.random() < dt * 50) g.fx.burst(this.x - this.dir * 6, this.floor - 4, { n: 1, color: [PAL.bone2, PAL.bone3, '#8c8574'], speed: [40, 160], angle: -Math.PI / 2 - this.dir * 0.5, spread: 0.8, size: [1.5, 3.5], gravity: 900, life: [0.3, 0.6], shape: 'square', spin: 10 });
  }
  fade(g: Game) { this.dead = true; g.fx.burst(this.x, this.floor - 8, { n: 8, color: [PAL.bone, PAL.bone2], speed: [40, 180], angle: -Math.PI / 2, spread: 1.6, size: [1.5, 3.5], gravity: 900, life: [0.3, 0.6] }); }
  draw(ctx: CanvasRenderingContext2D) {
    const x = this.x, f = this.floor, d = this.dir, w = Math.sin(this.t * 30) * 1.5;
    ctx.save(); ctx.translate(x, f); ctx.scale(d, 1);
    ctx.fillStyle = PAL.bone2; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-8, -6, 2, -24 - w); ctx.quadraticCurveTo(10, -14, 16, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.bone; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-4, -16 - w); ctx.lineTo(2, -6); ctx.lineTo(8, -20 + w); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    g.r.halo(ctx, this.x, this.floor - 10, 34, PAL.yellow, 0.35);
    ctx.save(); ctx.translate(this.x, this.floor); ctx.scale(this.dir, 1); ctx.strokeStyle = '#fff3b0'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-22, -2); ctx.quadraticCurveTo(-6, -6, 2, -24); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
  }
  lights(g: Game) { g.light({ x: this.x, y: this.floor - 12, r: 80, color: PAL.yellow, i: 0.45 }); }
}

/** A tartar shard dropping from the ceiling. Its shadow on the floor is the warning. */
export class Shard extends Hazard {
  floor: number; top: number; warn: number; state: 'warn' | 'fall' = 'warn'; rot = rand(-0.15, 0.15); size = rand(0.85, 1.2);
  constructor(x: number, top: number, floor: number, warn: number) { super(x, top, 8, 18); this.top = top; this.floor = floor; this.warn = warn; this.y = top - 30; }
  update(g: Game, dt: number) {
    this.t += dt;
    if (this.state === 'warn') {
      if (Math.random() < dt * 14) g.fx.burst(this.x + rand(-8, 8), this.top + 4, { n: 1, color: [PAL.bone2, PAL.bone3], speed: [10, 30], angle: Math.PI / 2, spread: 0.3, size: [1, 2.2], gravity: 900, life: [0.4, 0.8], shape: 'square', spin: 8 });
      if (this.t >= this.warn) { this.state = 'fall'; this.y = this.top + 10; this.vy = 260; g.audio.sfx('shard-fall', { x: this.x, y: this.top, vol: 0.6 }); }
      return;
    }
    this.vy = Math.min(1500, this.vy + 2900 * dt); this.y += this.vy * dt;
    touchPlayer(g, this.x, this.y, this.hw * this.size, this.hh * this.size, 1, this.x, false);
    if (this.y + this.hh * this.size >= this.floor) this.shatter(g);
  }
  shatter(g: Game) {
    this.dead = true;
    g.fx.burst(this.x, this.floor - 6, { n: 16, color: [PAL.bone, PAL.boneLt, PAL.bone2], shape: 'square', spin: 18, speed: [80, 320], angle: -Math.PI / 2, spread: 2.4, size: [1.5, 4], gravity: 1200, life: [0.4, 0.9] });
    g.fx.burst(this.x, this.floor - 6, { n: 6, color: '#ffffff', shape: 'streak', speed: [120, 320], angle: -Math.PI / 2, spread: 2, size: [1, 1.6], emissive: true, life: [0.1, 0.2] });
    g.audio.sfx('break', { x: this.x, y: this.floor, vol: 0.6, pitch: 1.2 }); g.shake(2.5, 0.08);
  }
  shadowK() { return this.state === 'warn' ? clamp(this.t / this.warn, 0, 1) : 1; }
  draw(ctx: CanvasRenderingContext2D) {
    // shadow on the floor grows as it gets closer
    const k = this.shadowK(), sw = 6 + 12 * k;
    ctx.fillStyle = `rgba(10,8,6,${0.25 + 0.35 * k})`; ctx.beginPath(); ctx.ellipse(this.x, this.floor - 1, sw, 3 + 1.5 * k, 0, 0, TAU); ctx.fill();
    if (this.state === 'warn') {
      // the shard cracking loose from the ceiling
      const j = Math.sin(this.t * 50) * 1.2 * k;
      this.shardShape(ctx, this.x + j, this.top + 14 * k - 6);
      return;
    }
    this.shardShape(ctx, this.x, this.y);
  }
  shardShape(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const s = this.size; ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot); ctx.scale(s, s);
    ctx.fillStyle = PAL.bone2; ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(9, -20); ctx.lineTo(6, 4); ctx.lineTo(0, 22); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.boneLt; ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(-1, -20); ctx.lineTo(0, 22); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const k = this.shadowK();
    // a warning glow on the floor where it will land
    g.r.halo(ctx, this.x, this.floor - 4, 16 + 16 * k, PAL.yellow, 0.15 + 0.35 * k);
    ctx.globalAlpha = 0.35 + 0.5 * k; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(this.x, this.floor - 1, 6 + 12 * k, 2.5 + 1.5 * k, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (this.state === 'fall') g.r.halo(ctx, this.x, this.y, 22, '#ffffff', 0.25);
  }
}
