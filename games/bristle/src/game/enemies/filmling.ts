// Filmling: a soft blob of plaque that patrols ledges. Spots you, puffs up, hop-lunges.
import { TAU, clamp, sign } from '../../engine/math';
import type { Game } from '../types';
import { Creature, PAL, blobPath, canSee, drawAlert, eyeGlow, eyeScene } from './common';

type State = 'patrol' | 'puff' | 'lunge' | 'recover';

export class Filmling extends Creature {
  state: State = 'patrol'; t = 0; cd = 0; crawl = 0; minion = false;
  constructor(x: number, feetY: number, minion = false) {
    super('filmling', x, feetY - 13, 16, 13, 15, 'plaque');
    this.shine = minion ? 1 : 3; this.minion = minion; this.facing = Math.random() < 0.5 ? 1 : -1;
    if (minion) { this.aware = true; this.cd = 0.8; }
  }
  edgeAhead(g: Game, dir: number) {
    return this.wallL && dir < 0 || this.wallR && dir > 0 || !g.room.groundAt(this.x + dir * (this.hw + 4), this.y + this.hh + 4);
  }
  think(g: Game, dt: number) {
    this.t += dt; this.cd -= dt;
    const p = g.player, dx = p.x - this.x;
    const sees = canSee(g, this.x, this.y - 6, 250, { dyMax: 90 });
    switch (this.state) {
      case 'patrol': {
        // inch-worm crawl: speed pulses with the body ripple
        this.crawl += dt * 5.2; const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(this.crawl));
        const sp = this.aware ? 90 : 55;
        if (this.aware && sees && Math.abs(dx) > 20) this.facing = sign(dx) as 1 | -1;
        this.vx = this.facing * sp * pulse; this.sx = 1 + 0.08 * Math.sin(this.crawl); this.sy = 1 - 0.07 * Math.sin(this.crawl);
        if (this.grounded && this.edgeAhead(g, this.facing)) { this.facing = -this.facing as 1 | -1; this.vx = 0; }
        this.lookX = this.facing * 0.6; this.lookY = 0.2;
        if (sees) {
          if (!this.aware) { this.notice(g); this.cd = 0.55; this.facing = sign(dx) as 1 | -1 || this.facing; }
          else if (this.cd <= 0 && this.grounded && Math.abs(dx) < 210) { this.state = 'puff'; this.t = 0; this.facing = (sign(dx) || this.facing) as 1 | -1; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 1.3 }); }
        } else if (this.aware && Math.abs(dx) > 420) this.aware = false;
        break;
      }
      case 'puff': {
        // telegraph: swell up and quiver, eyes locked on
        this.vx *= 0.8; const k = clamp(this.t / 0.5, 0, 1);
        this.sx = 1 + 0.3 * k + Math.sin(this.t * 60) * 0.03 * k; this.sy = 1 + 0.22 * k;
        this.lookX = sign(dx) * 0.9; this.lookY = clamp((p.y - this.y) / 120, -0.6, 0.6);
        if (this.t >= 0.5) {
          this.state = 'lunge'; this.t = 0;
          const dist = clamp(Math.abs(dx), 60, 200);
          this.vx = this.facing * (160 + dist * 0.9); this.vy = -470; this.sx = 0.7; this.sy = 1.35; this.grounded = false;
          g.audio.sfx('jump', { x: this.x, y: this.y, pitch: 1.6, vol: 0.6 });
          this.dust(g, 5, [PAL.plaqueDk, PAL.citrus]);
        }
        break;
      }
      case 'lunge':
        this.sx = 0.85; this.sy = 1.15;
        if (this.grounded && this.t > 0.08) { this.state = 'recover'; this.t = 0; this.sx = 1.45; this.sy = 0.6; this.vx *= 0.2; g.audio.sfx('land', { x: this.x, y: this.y, pitch: 1.4 }); this.dust(g, 6, [PAL.plaqueDk, PAL.citrus, PAL.yellowSoft]); }
        break;
      case 'recover':
        this.vx *= 0.85; this.lookX = 0; this.lookY = 0.4;
        if (this.t > 0.65) { this.state = 'patrol'; this.t = 0; this.cd = 0.9 + Math.random() * 0.6; }
        break;
    }
    this.physics(g, dt);
  }
  override reacted() { if (this.state === 'puff') { this.state = 'recover'; this.t = 0.2; } }
  override dyingUpdate(g: Game, dt: number) { this.sx = 1 + this.dying * 1.8; this.sy = 1 + this.dying * 0.9; this.physics(g, dt); }
  override deathBurst(g: Game) { g.fx.burst(this.x, this.y, { n: 14, color: [PAL.yellow, '#ffffff'], shape: 'bubble', speed: [60, 260], size: [2, 5], gravity: -40, life: [0.4, 0.9] }); }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const x = this.x + jx, y = this.y + this.hh, f = this.facing, t = this.age + this.seed;
      c.save(); c.translate(x, y); c.scale(this.sx, this.sy);
      // contact shadow
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, 17, 3.5, 0, 0, TAU); c.fill();
      // film skirt (little ripples at the base)
      c.fillStyle = PAL.plaqueDk; for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(i * 7 + Math.sin(t * 6 + i) * 1.5, -2, 5, 3, 0, 0, TAU); c.fill(); }
      // body
      blobPath(c, 0, -11, 17, 13, t, this.state === 'puff' ? 0.07 : 0.04, this.seed);
      const grd = c.createRadialGradient(-4 * f, -18, 2, 0, -10, 20); grd.addColorStop(0, '#FFF38A'); grd.addColorStop(0.55, PAL.plaque); grd.addColorStop(1, '#C9A814');
      c.fillStyle = grd; c.fill();
      // citrus speckles
      c.fillStyle = 'rgba(196,214,0,0.55)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-9 + i * 6, -6 - (i % 2) * 6, 1.6, 0, TAU); c.fill(); }
      // gloss
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.ellipse(-6 * f, -19, 4.5, 2.2, -0.4 * f, 0, TAU); c.fill();
      // little sprout on top that wobbles
      c.strokeStyle = PAL.plaque; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(1, -23); c.quadraticCurveTo(3 + Math.sin(t * 3) * 3, -29, 1 + Math.sin(t * 3 + 1) * 5, -32); c.stroke();
      c.fillStyle = PAL.yellowSoft; c.beginPath(); c.arc(1 + Math.sin(t * 3 + 1) * 5, -32, 2.6, 0, TAU); c.fill();
      // eyes
      const eo = { r: 5, lx: this.lookX, ly: this.lookY, open: this.open, squint: this.squint, pupil: this.state === 'puff' ? 0.36 : 0.52 };
      eyeScene(c, -5 + f * 3, -13, { ...eo, dir: -1 }); eyeScene(c, 6 + f * 3, -13, { ...eo, dir: 1 });
      // mouth: a tiny o when puffing, a wobbly line otherwise
      c.strokeStyle = PAL.ink; c.lineWidth = 1.2;
      if (this.state === 'puff') { c.fillStyle = PAL.ink; c.beginPath(); c.ellipse(f * 3, -5, 2, 2.6, 0, 0, TAU); c.fill(); }
      else { c.beginPath(); c.moveTo(f * 3 - 3, -6); c.quadraticCurveTo(f * 3, -4 + Math.sin(t * 2), f * 3 + 3, -6); c.stroke(); }
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 40 + this.dying * 120, PAL.yellow, 0.6); return; }
    const x = this.x, y = this.y + this.hh, f = this.facing, puff = this.state === 'puff' ? clamp(this.t / 0.5, 0, 1) : 0;
    g.r.halo(ctx, x, y - 11, 34 + puff * 16, PAL.yellow, 0.22 + puff * 0.25 + 0.05 * Math.sin(this.age * 3));
    const eo = { r: 5 * this.sx, lx: this.lookX, ly: this.lookY, open: this.open, squint: this.squint, pupil: puff ? 0.36 : 0.52 };
    eyeGlow(ctx, g, x + (-5 + f * 3) * this.sx, y - 13 * this.sy, { ...eo, dir: -1 }, PAL.yellow, 0.55);
    eyeGlow(ctx, g, x + (6 + f * 3) * this.sx, y - 13 * this.sy, { ...eo, dir: 1 }, PAL.yellow, 0.55);
    drawAlert(ctx, g, x, y - 42, this.alert, PAL.yellow);
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 90, color: PAL.yellow, i: 0.35 }); }
}
