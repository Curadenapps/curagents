// Mite swarm: three to five tiny plaque flies orbiting a drifting centre. Weak but busy: one at a
// time breaks orbit, buzzes in place (the tell), then darts at where you were.
import { TAU, clamp, damp, vnoise } from '../../engine/math';
import type { Game } from '../types';
import { Creature, PAL, canSee, playerAlive } from './common';

/** Shared state for one swarm (not an entity). */
export class Swarm {
  x: number; y: number; hx: number; hy: number; aware = false; token = 1.2; members: Mite[] = []; seed = Math.random() * 50;
  constructor(x: number, y: number) { this.x = this.hx = x; this.y = this.hy = y; }
  alive() { return this.members.filter((m) => !m.dead && m.dying < 0); }
}

type State = 'orbit' | 'tell' | 'dart' | 'back';

export class Mite extends Creature {
  sw: Swarm; ph: number; rad: number; spd: number; state: State = 'orbit'; st = 0; tx = 0; ty = 0; wing = 0; leader = false;
  constructor(sw: Swarm, i: number, n: number) {
    super('mite', sw.x, sw.y, 7, 7, 5, 'plaque');
    this.sw = sw; this.ph = (i / n) * TAU; this.rad = 26 + Math.random() * 18; this.spd = 2.2 + Math.random() * 1.4;
    this.shine = 1; this.knockResist = 0; this.glowColor = PAL.citrus;
    this.x = sw.x + Math.cos(this.ph) * this.rad; this.y = sw.y + Math.sin(this.ph) * this.rad * 0.6;
  }
  think(g: Game, dt: number) {
    const sw = this.sw, p = g.player; this.st += dt; this.wing += dt * 60;
    // the first living member steers the shared centre
    this.leader = sw.alive()[0] === this;
    if (this.leader) {
      const sees = canSee(g, sw.x, sw.y, 300);
      if (sees && !sw.aware) { sw.aware = true; for (const m of sw.alive()) { m.aware = true; m.alert = 0.5; } g.audio.sfx('buzz', { x: sw.x, y: sw.y }); g.audio.sfx('enemy-alert', { x: sw.x, y: sw.y, pitch: 1.8, vol: 0.6 }); }
      if (sw.aware && (!playerAlive(g) || Math.hypot(p.x - sw.x, p.y - sw.y) > 640)) sw.aware = false;
      const n = g.gameTime * 0.6 + sw.seed;
      const gx = sw.aware ? p.x + (vnoise(n, 3) - 0.5) * 160 : sw.hx + (vnoise(n, 9) - 0.5) * 120;
      const gy = sw.aware ? p.y - 70 + (vnoise(n, 5) - 0.5) * 60 : sw.hy + (vnoise(n, 1) - 0.5) * 60;
      const sp = sw.aware ? 2.0 : 0.8;
      let nx = sw.x + (gx - sw.x) * Math.min(1, sp * dt), ny = sw.y + (gy - sw.y) * Math.min(1, sp * dt);
      if (g.room.solidAt(nx, ny)) { nx = sw.x; ny = sw.y; }
      sw.x = nx; sw.y = ny;
      sw.token -= dt;
      // hand the dart to one orbiting mite
      if (sw.aware && sw.token <= 0) {
        const cands = sw.alive().filter((m) => m.state === 'orbit' && canSee(g, m.x, m.y, 320));
        if (cands.length) { const m = cands[Math.floor(Math.random() * cands.length)]; m.state = 'tell'; m.st = 0; g.audio.sfx('buzz', { x: m.x, y: m.y, pitch: 1.5 }); }
        sw.token = 0.75 + Math.random() * 0.7;
      }
    }
    switch (this.state) {
      case 'orbit': {
        this.ph += dt * this.spd * (sw.aware ? 1.6 : 1);
        const r = this.rad * (sw.aware ? 0.85 : 1) + Math.sin(this.age * 3 + this.seed) * 6;
        const tx = sw.x + Math.cos(this.ph) * r, ty = sw.y + Math.sin(this.ph) * r * 0.6 + Math.sin(this.age * 9 + this.seed) * 3;
        this.vx = damp(this.vx, (tx - this.x) * 9, 10, dt); this.vy = damp(this.vy, (ty - this.y) * 9, 10, dt);
        this.physics(g, dt, false);
        break;
      }
      case 'tell':
        // stop and buzz in place, wings a blur
        this.vx *= Math.exp(-16 * dt); this.vy *= Math.exp(-16 * dt); this.physics(g, dt, false);
        this.sx = 1 + Math.sin(this.st * 80) * 0.15;
        if (this.st >= 0.42) { this.state = 'dart'; this.st = 0; this.tx = p.x; this.ty = p.y; const d = Math.hypot(this.tx - this.x, this.ty - this.y) || 1; this.vx = (this.tx - this.x) / d * 540; this.vy = (this.ty - this.y) / d * 540; g.audio.sfx('swoop', { x: this.x, y: this.y, pitch: 2, vol: 0.5 }); }
        break;
      case 'dart':
        this.physics(g, dt, false);
        if (Math.random() < 0.8) g.fx.burst(this.x, this.y, { n: 1, color: PAL.citrus, shape: 'streak', speed: [10, 30], size: [1, 1.5], emissive: true, life: [0.1, 0.2] });
        if (this.st > 0.36 || this.wallL || this.wallR || this.grounded || this.ceiling) { this.state = 'back'; this.st = 0; }
        break;
      case 'back': {
        const dx = sw.x - this.x, dy = sw.y - this.y;
        this.vx = damp(this.vx, dx * 3, 5, dt); this.vy = damp(this.vy, dy * 3, 5, dt); this.physics(g, dt, false);
        if (Math.hypot(dx, dy) < 40 || this.st > 1.4) { this.state = 'orbit'; this.st = 0; this.ph = Math.atan2(dy * -1, dx * -1); }
        break;
      }
    }
    this.facing = this.vx >= 0 ? 1 : -1; this.lookX = clamp((p.x - this.x) / 60, -1, 1);
  }
  override stunned(g: Game, dt: number) { this.physics(g, dt, false); }
  override dyingUpdate(g: Game, dt: number) { this.vy += 600 * dt; this.physics(g, dt, false); this.sx = this.sy = 1 + this.dying * 2; }
  override bloodColor() { return [PAL.citrus, PAL.yellow, '#E6F07A']; }
  override deathDur = 0.18;
  override notice(g: Game) { if (!this.sw.aware) { this.sw.aware = true; } super.notice(g, false); }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const f = this.facing, t = this.age + this.seed;
      c.save(); c.translate(this.x + jx, this.y); c.scale(f * this.sx, this.sy);
      // wings (flicker)
      c.fillStyle = 'rgba(230,240,180,0.55)'; const w = Math.sin(this.wing) * 0.5 + 0.5;
      c.beginPath(); c.ellipse(-2, -6, 4.5, 2 + w * 2.2, -0.6, 0, TAU); c.fill(); c.beginPath(); c.ellipse(2, -6.5, 4, 1.8 + w * 2, 0.5, 0, TAU); c.fill();
      // body: a round citrus speck with a little tail
      c.fillStyle = '#8E9A00'; c.beginPath(); c.ellipse(-4, 1, 3.5, 2.5, 0.3, 0, TAU); c.fill();
      c.fillStyle = PAL.citrus; c.beginPath(); c.arc(1, 0, 5.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(-0.5, -2.5, 1.6, 0, TAU); c.fill();
      // one big eye
      const tell = this.state === 'tell';
      c.fillStyle = PAL.sclera; c.beginPath(); c.ellipse(3, -0.5, 2.8, 2.8 * (this.squint > 0.15 ? 0.2 : this.open), 0, 0, TAU); c.fill();
      c.fillStyle = PAL.ink; c.beginPath(); c.arc(3.6 + this.lookX * f * 0.6, -0.3, tell ? 1 : 1.5, 0, TAU); c.fill();
      // antennae
      c.strokeStyle = '#8E9A00'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(3, -5); c.quadraticCurveTo(5, -9, 7 + Math.sin(t * 8), -10); c.stroke();
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 16 + this.dying * 120, PAL.citrus, 0.7); return; }
    const tell = this.state === 'tell' ? this.st / 0.42 : 0;
    g.r.halo(ctx, this.x, this.y, 16 + tell * 14, tell ? PAL.yellow : PAL.citrus, 0.3 + tell * 0.5);
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(this.x + this.facing * 3 * this.sx, this.y - 0.5, 1.4 + tell, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (tell) { ctx.strokeStyle = PAL.yellow; ctx.globalAlpha = 0.6 * tell; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, 10 + Math.sin(this.st * 60) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  lights(g: Game) { if (this.leader) g.light({ x: this.sw.x, y: this.sw.y, r: 120, color: PAL.citrus, i: 0.35 }); }
}

/** Legend factory: spawn the other members directly, return one. */
export function spawnSwarm(g: Game, x: number, y: number): Mite {
  const sw = new Swarm(x, y), n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) sw.members.push(new Mite(sw, i, n));
  for (let i = 1; i < n; i++) g.spawn(sw.members[i]);
  return sw.members[0];
}
