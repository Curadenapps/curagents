// Gum Leech: hangs from a ceiling looking exactly like a drip of gum. Pass beneath and it opens its
// eyes (the tell), lets go, then wriggles after you with little hop-lunges.
import { TAU, clamp, sign } from '../../engine/math';
import type { Game } from '../types';
import { Creature, PAL, canSee, drawAlert, eyeGlow, eyeScene, playerAlive } from './common';

type State = 'hang' | 'wake' | 'fall' | 'land' | 'wriggle' | 'coil' | 'hop';

export class GumLeech extends Creature {
  state: State = 'hang'; st = 0; ceilY: number; wig = 0; cd = 1; stretch = 0;
  constructor(cx: number, cy: number, g: Game) {
    super('gum-leech', cx, cy, 9, 14, 12, 'gum');
    // find the ceiling above (up to six tiles)
    const r = g.room, tx = Math.floor(cx / 32); let ty = Math.floor(cy / 32);
    for (let i = 0; i < 6 && !r.solid(tx, ty - 1); i++) ty--;
    this.ceilY = ty * 32; this.y = this.ceilY + this.hh + 4;
    this.shine = 3; this.glowColor = PAL.orchid; this.contactDamage = 0; this.pogo = true;
  }
  think(g: Game, dt: number) {
    this.st += dt; this.cd -= dt;
    const p = g.player, dx = p.x - this.x;
    switch (this.state) {
      case 'hang': {
        // a gum drip: barely sways, stretches a little when someone is near
        const near = playerAlive(g) && Math.abs(dx) < 140 && p.y > this.y && p.y - this.y < 420;
        this.stretch = clamp(this.stretch + (near ? dt : -dt) * 1.5, 0, 1);
        this.x += Math.sin(this.age * 1.3 + this.seed) * 0.05;
        if (Math.abs(dx) < 46 && p.y > this.y && p.y - this.y < 400 && canSee(g, this.x, this.y + 10, 420)) {
          this.state = 'wake'; this.st = 0; this.aware = true; this.alert = 0.5;
          g.audio.sfx('leech-drop', { x: this.x, y: this.y });
        }
        break;
      }
      case 'wake':
        this.sx = 1 + Math.sin(this.st * 60) * 0.08; this.sy = 1 + this.st * 0.5; this.lookY = 1;
        if (this.st > 0.32) { this.state = 'fall'; this.st = 0; this.vy = 60; this.heatTouch = 1; this.sy = 1.4; this.sx = 0.7; }
        break;
      case 'fall':
        this.physics(g, dt);
        if (this.grounded) { this.state = 'land'; this.st = 0; this.sx = 1.6; this.sy = 0.5; g.audio.sfx('land', { x: this.x, y: this.y, pitch: 1.5 }); g.fx.burst(this.x, this.y + this.hh, { n: 10, color: [PAL.gum, PAL.orchid], speed: [60, 200], angle: -Math.PI / 2, spread: 2.4, size: [1.5, 3], gravity: 900, life: [0.3, 0.6] }); }
        break;
      case 'land':
        this.physics(g, dt); if (this.st > 0.35) { this.state = 'wriggle'; this.st = 0; }
        break;
      case 'wriggle': {
        // inch-worm: surges forward on each squeeze
        this.wig += dt * 7; const surge = Math.max(0, Math.sin(this.wig));
        if (Math.abs(dx) > 8 && playerAlive(g)) this.facing = sign(dx) as 1 | -1;
        this.vx = this.facing * 150 * surge; this.sx = 1 + 0.25 * surge; this.sy = 1 - 0.2 * surge;
        if (this.grounded && !g.room.groundAt(this.x + this.facing * (this.hw + 4), this.y + this.hh + 4)) this.vx = 0;
        this.lookX = this.facing; this.lookY = 0.2;
        if (this.cd <= 0 && Math.abs(dx) < 150 && Math.abs(p.y - this.y) < 60 && canSee(g, this.x, this.y, 200)) { this.state = 'coil'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 1.6 }); }
        this.physics(g, dt);
        break;
      }
      case 'coil':
        this.vx *= 0.7; this.sx = 1.35; this.sy = 0.65 + Math.sin(this.st * 50) * 0.05;
        if (this.st > 0.4) { this.state = 'hop'; this.st = 0; this.vy = -380; this.vx = this.facing * 300; this.sx = 0.7; this.sy = 1.4; }
        this.physics(g, dt);
        break;
      case 'hop':
        this.physics(g, dt);
        if (this.grounded && this.st > 0.08) { this.state = 'wriggle'; this.st = 0; this.cd = 1.1 + Math.random() * 0.6; this.sx = 1.4; this.sy = 0.65; }
        break;
    }
  }
  override reacted(g: Game) { if (this.state === 'hang' || this.state === 'wake') { this.state = 'fall'; this.st = 0; this.heatTouch = 1; g.audio.sfx('leech-drop', { x: this.x, y: this.y }); } }
  override stunned(g: Game, dt: number) { if (this.state !== 'hang') this.physics(g, dt); }
  override dyingUpdate(g: Game, dt: number) { this.sx = 1 + this.dying * 1.5; this.sy = 1 - this.dying * 1.2; if (this.state !== 'hang') this.physics(g, dt); }
  override bloodColor() { return [PAL.gum, PAL.orchid, PAL.orchidLt]; }
  override deathBurst(g: Game) { g.fx.burst(this.x, this.y, { n: 10, color: [PAL.orchidLt, '#ffffff'], shape: 'bubble', speed: [40, 200], size: [2, 4], gravity: -40, life: [0.3, 0.8] }); }
  hanging() { return this.state === 'hang' || this.state === 'wake'; }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const t = this.age + this.seed;
      if (this.hanging()) {
        // a drip: thin neck from the ceiling, round drop at the end
        const len = 18 + this.stretch * 6 + (this.state === 'wake' ? this.st * 18 : 0), bx = this.x + jx + Math.sin(t * 1.2) * 1.5;
        c.fillStyle = PAL.gumDk; c.beginPath(); c.ellipse(this.x, this.ceilY + 2, 9, 4, 0, 0, TAU); c.fill();
        c.fillStyle = PAL.gum; c.beginPath(); c.moveTo(this.x - 5, this.ceilY); c.quadraticCurveTo(bx - 3, this.ceilY + len * 0.6, bx - 8 * this.sx, this.ceilY + len);
        c.arc(bx, this.ceilY + len + 1, 8.5 * this.sx, Math.PI, 0, true); c.quadraticCurveTo(bx + 3, this.ceilY + len * 0.6, this.x + 5, this.ceilY); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(bx - 3, this.ceilY + len - 1, 2, 3.5, 0, 0, TAU); c.fill();
        const ey = this.ceilY + len + 3;
        if (this.state === 'wake') { const eo = { r: 3.4, lx: 0, ly: 1, open: clamp(this.st * 6, 0.1, 1), squint: this.squint }; eyeScene(c, bx - 3.5, ey, { ...eo, dir: -1 }); eyeScene(c, bx + 3.5, ey, { ...eo, dir: 1 }); }
        else { c.strokeStyle = PAL.gumDk; c.lineWidth = 1; c.beginPath(); c.moveTo(bx - 5, ey); c.lineTo(bx - 2, ey + 0.6); c.moveTo(bx + 2, ey + 0.6); c.lineTo(bx + 5, ey); c.stroke(); }
        return;
      }
      // on the ground: a segmented pink worm with a gum-drop head
      const f = this.facing, y = this.y + this.hh;
      c.save(); c.translate(this.x + jx, y); c.scale(f * this.sx, this.sy);
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, 14, 3, 0, 0, TAU); c.fill();
      for (let i = 3; i >= 0; i--) {
        const sx = -12 + i * 6, sy = -6 - Math.max(0, Math.sin(this.wig - i * 0.9)) * 4 - (this.state === 'hop' ? 2 : 0), r = 5 + i * 0.7;
        c.fillStyle = i % 2 ? PAL.gum : '#E57FB0'; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
      }
      c.fillStyle = PAL.gum; c.beginPath(); c.ellipse(9, -11, 8, 7.5, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(6, -15, 3, 1.6, -0.3, 0, TAU); c.fill();
      const eo = { r: 3.4, lx: this.lookX * f, ly: this.lookY, open: this.open, squint: this.squint };
      eyeScene(c, 7, -12, { ...eo, dir: -1 }); eyeScene(c, 13, -11.5, { ...eo, r: 3, dir: 1 });
      c.strokeStyle = PAL.gumDk; c.lineWidth = 1; c.beginPath(); c.moveTo(9, -6); c.quadraticCurveTo(12, -4.5 + Math.sin(t * 6) * 0.6, 15, -6); c.stroke();
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 26 + this.dying * 90, PAL.orchid, 0.6); return; }
    if (this.hanging()) {
      // camouflaged: only a faint drip-glint until the eyes open
      const len = 18 + this.stretch * 6 + (this.state === 'wake' ? this.st * 18 : 0), y = this.ceilY + len;
      g.r.halo(ctx, this.x, y, 14, PAL.orchidLt, 0.12 + 0.06 * Math.sin(this.age * 2));
      if (this.state === 'wake') { const eo = { r: 3.4, lx: 0, ly: 1, open: clamp(this.st * 6, 0.1, 1) }; eyeGlow(ctx, g, this.x - 3.5, y + 3, eo, PAL.orchid, 0.8); eyeGlow(ctx, g, this.x + 3.5, y + 3, eo, PAL.orchid, 0.8); drawAlert(ctx, g, this.x, y - 36 - len * 0.2, this.alert + 0.2, PAL.orchid); }
      return;
    }
    const f = this.facing, y = this.y + this.hh;
    g.r.halo(ctx, this.x, y - 8, 26, PAL.orchid, 0.18);
    const eo = { r: 3.4 * this.sx, lx: this.lookX, ly: this.lookY, open: this.open, squint: this.squint };
    eyeGlow(ctx, g, this.x + f * 7 * this.sx, y - 12 * this.sy, { ...eo, dir: -1 }, PAL.orchid, 0.55); eyeGlow(ctx, g, this.x + f * 13 * this.sx, y - 11.5 * this.sy, { ...eo, dir: 1 }, PAL.orchid, 0.55);
  }
  lights(g: Game) { if (!this.hanging()) g.light({ x: this.x, y: this.y, r: 70, color: PAL.orchid, i: 0.25 }); }
}
