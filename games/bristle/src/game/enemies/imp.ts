// Sugar Imp: a candy-bright flier. Hovers erratically, glints and pauses (the tell), then swoops
// through the spot where you stood in a smooth arc, and flutters off to catch its breath.
import { TAU, clamp, damp, sign, vnoise } from '../../engine/math';
import type { Game } from '../types';
import { Creature, PAL, canSee, drawAlert, eyeGlow, eyeScene, glint, playerAlive } from './common';

type State = 'idle' | 'stalk' | 'tell' | 'swoop' | 'retreat';
const TELL = 0.7, SWOOP = 0.8;

export class SugarImp extends Creature {
  state: State = 'idle'; st = 0; hx: number; hy: number; flap = 0; next = 1.6;
  p0 = { x: 0, y: 0 }; c1 = { x: 0, y: 0 }; p2 = { x: 0, y: 0 }; side = 1;
  constructor(x: number, y: number) {
    super('sugar-imp', x, y, 13, 12, 12, 'sugar');
    this.hx = x; this.hy = y; this.shine = 4; this.glowColor = PAL.cerise; this.knockResist = 0.2;
  }
  hoverTo(g: Game, tx: number, ty: number, dt: number, accel = 5) {
    const n = this.age * 0.9 + this.seed;
    const ox = (vnoise(n, 1.3) - 0.5) * 70, oy = (vnoise(n * 1.3, 7.7) - 0.5) * 50;
    this.vx = damp(this.vx, (tx + ox - this.x) * 2.2, accel, dt); this.vy = damp(this.vy, (ty + oy - this.y) * 2.2 + Math.sin(this.age * 5) * 20, accel, dt);
    this.physics(g, dt, false);
  }
  think(g: Game, dt: number) {
    this.st += dt; this.flap += dt * (this.state === 'tell' ? 34 : this.state === 'swoop' ? 8 : 18);
    const p = g.player, sees = canSee(g, this.x, this.y, 340);
    switch (this.state) {
      case 'idle':
        this.hoverTo(g, this.hx, this.hy, dt, 3);
        this.lookX = Math.sin(this.age * 0.7) * 0.6; this.lookY = 0.2;
        if (sees) { this.notice(g, false); this.state = 'stalk'; this.st = 0; this.next = 1.4 + Math.random() * 0.8; }
        break;
      case 'stalk': {
        // keep a perch up and to one side of the player, re-pick the side now and then
        if (this.st > 2.4 || Math.random() < dt * 0.25) { this.side = Math.random() < 0.5 ? -1 : 1; }
        const tx = p.x + this.side * 150, ty = p.y - 95;
        this.hoverTo(g, tx, ty, dt, 4);
        this.facing = (sign(p.x - this.x) || 1) as 1 | -1; this.lookX = this.facing * 0.8; this.lookY = 0.6;
        this.next -= dt;
        if (!playerAlive(g) || Math.hypot(p.x - this.x, p.y - this.y) > 620) { this.state = 'idle'; this.aware = false; break; }
        if (this.next <= 0 && canSee(g, this.x, this.y, 330) && Math.abs(p.x - this.x) > 70) {
          this.state = 'tell'; this.st = 0; this.p0 = { x: this.x, y: this.y };
          g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 1.5 });
        }
        break;
      }
      case 'tell': {
        // freeze in the air, a sugar glint flares: lock the target now (fair: it aims where you were)
        this.vx *= Math.exp(-14 * dt); this.vy *= Math.exp(-14 * dt); this.physics(g, dt, false);
        this.sx = 1 - 0.15 * (this.st / TELL); this.sy = 1 + 0.12 * (this.st / TELL);
        this.lookX = sign(p.x - this.x) * 1; this.lookY = 0.9;
        if (this.st >= TELL) {
          const tx = p.x, ty = Math.min(p.y, this.y + 260), p0 = { x: this.x, y: this.y };
          const p2 = { x: tx + (tx - p0.x) * 0.9, y: p0.y - 20 };
          this.p0 = p0; this.p2 = p2; this.c1 = { x: 2 * tx - (p0.x + p2.x) / 2, y: 2 * ty - (p0.y + p2.y) / 2 };
          this.state = 'swoop'; this.st = 0; this.contactDamage = 1;
          g.audio.sfx('swoop', { x: this.x, y: this.y });
        }
        break;
      }
      case 'swoop': {
        const k = clamp(this.st / SWOOP, 0, 1), e = k * k * (3 - 2 * k), u = 1 - e;
        const nx = u * u * this.p0.x + 2 * u * e * this.c1.x + e * e * this.p2.x, ny = u * u * this.p0.y + 2 * u * e * this.c1.y + e * e * this.p2.y;
        this.vx = (nx - this.x) / dt; this.vy = (ny - this.y) / dt; this.physics(g, dt, false);
        this.facing = (sign(this.vx) || this.facing) as 1 | -1; this.sx = 1.25; this.sy = 0.8;
        if (Math.random() < 0.7) g.fx.burst(this.x, this.y, { n: 1, color: [PAL.orchid, PAL.orchidLt, '#ffffff'], shape: 'square', spin: 10, speed: [10, 50], size: [1, 2.2], gravity: 400, emissive: true, life: [0.3, 0.6] });
        if (k >= 1 || ((this.wallL || this.wallR || this.ceiling || this.grounded) && this.st > 0.1)) { this.state = 'retreat'; this.st = 0; this.vx *= 0.4; this.vy = -120; }
        break;
      }
      case 'retreat':
        // tired flutter up and away: the opening
        this.hoverTo(g, this.x + this.facing * 40, p.y - 110, dt, 2.5);
        this.lookX = 0; this.lookY = -0.3;
        if (this.st > 1.7) { this.state = 'stalk'; this.st = 0; this.next = 1.3 + Math.random() * 1.0; }
        break;
    }
  }
  override reacted(_g: Game, hit: { kind: string }) { if (this.state === 'tell' && hit.kind !== 'spell') { this.state = 'retreat'; this.st = 0.4; } }
  override stunned(g: Game, dt: number) { this.vy *= Math.exp(-6 * dt); this.physics(g, dt, false); }
  override dyingUpdate(g: Game, dt: number) { this.vy += 900 * dt; this.physics(g, dt, false); this.sx = 1 - this.dying; this.sy = 1 + this.dying; }
  override bloodColor() { return [PAL.cerise, PAL.orchid, PAL.orchidLt]; }
  override deathBurst(g: Game) { g.fx.burst(this.x, this.y, { n: 16, color: [PAL.orchidLt, '#ffffff', PAL.orchid], shape: 'square', spin: 18, speed: [80, 320], size: [1.5, 3.5], gravity: 700, emissive: true, life: [0.4, 1.0] }); }

  wings(c: CanvasRenderingContext2D, alpha: number) {
    const w = Math.sin(this.flap) ;
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 5, -6); c.scale(s, 1); c.rotate(-0.5 + w * 0.6);
      c.globalAlpha = alpha; c.fillStyle = PAL.orchidLt;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(9, -14); c.lineTo(19, -10); c.lineTo(16, -2); c.closePath(); c.fill();
      c.fillStyle = PAL.orchid; c.beginPath(); c.moveTo(0, 0); c.lineTo(16, -2); c.lineTo(12, 5); c.closePath(); c.fill();
      c.globalAlpha = 1; c.restore();
    }
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const t = this.age + this.seed, f = this.facing;
      c.save(); c.translate(this.x + jx, this.y); c.rotate(clamp(this.vx / 900, -0.4, 0.4)); c.scale(this.sx * f, this.sy);
      this.wings(c, 0.85);
      // curly candy tail
      c.strokeStyle = PAL.cerise; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-8, 6);
      c.bezierCurveTo(-16, 10, -20 + Math.sin(t * 4) * 2, 2, -15, -1); c.stroke();
      c.fillStyle = PAL.orchidLt; c.beginPath(); c.arc(-15, -1, 2, 0, TAU); c.fill();
      // body: a faceted candy drop
      c.beginPath(); c.moveTo(0, -13); c.bezierCurveTo(11, -13, 14, -2, 11, 6); c.bezierCurveTo(8, 13, -8, 13, -11, 6); c.bezierCurveTo(-14, -2, -11, -13, 0, -13); c.closePath();
      const grd = c.createRadialGradient(-3, -6, 1, 0, 0, 15); grd.addColorStop(0, '#FF8FC4'); grd.addColorStop(0.6, PAL.cerise); grd.addColorStop(1, '#8E0E4B');
      c.fillStyle = grd; c.fill();
      c.strokeStyle = 'rgba(255,220,240,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -11); c.lineTo(0, 0); c.lineTo(9, -9); c.moveTo(0, 0); c.lineTo(0, 11); c.stroke();
      // little sugar horns
      c.fillStyle = PAL.orchidLt; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4, -12); c.lineTo(s * 7, -19); c.lineTo(s * 8, -11); c.closePath(); c.fill(); }
      // gloss
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-5, -8, 3, 1.6, -0.6, 0, TAU); c.fill();
      // eyes (big, a touch mischievous)
      const eo = { r: 4.6, lx: this.lookX * f, ly: this.lookY, open: this.open, squint: this.squint, lid: this.state === 'tell' ? 0.35 : 0.12, lidColor: '#A3125A' };
      eyeScene(c, -1, -3, { ...eo, tilt: -1, dir: -1 }); eyeScene(c, 7, -3, { ...eo, tilt: 1, r: 4.2, dir: 1 });
      // grin
      c.strokeStyle = PAL.ink; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, 5); c.quadraticCurveTo(4, 8, 8, 4.5); c.stroke();
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 30 + this.dying * 120, PAL.cerise, 0.7); return; }
    const f = this.facing, tell = this.state === 'tell' ? this.st / TELL : 0;
    g.r.halo(ctx, this.x, this.y, 38 + tell * 20, PAL.cerise, 0.25 + tell * 0.25);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(clamp(this.vx / 900, -0.4, 0.4)); ctx.scale(this.sx * f, this.sy);
    this.wings(ctx, 0.25);
    const eo = { r: 4.6, lx: this.lookX * f, ly: this.lookY, open: this.open, squint: this.squint, lid: this.state === 'tell' ? 0.35 : 0.12 };
    eyeGlow(ctx, g, -1, -3, { ...eo, tilt: -1, dir: -1 }, PAL.orchid, 0.6); eyeGlow(ctx, g, 7, -3, { ...eo, tilt: 1, r: 4.2, dir: 1 }, PAL.orchid, 0.6);
    ctx.restore();
    // the tell: a bright four-point glint on its horn
    if (this.state === 'tell') glint(ctx, g, this.x + f * 7, this.y - 19, 6 + 12 * Math.sin(Math.min(1, tell * 1.6) * Math.PI * 0.5), PAL.orchidLt, 1 - Math.max(0, tell - 0.85) * 4, tell * 2);
    drawAlert(ctx, g, this.x, this.y - 34, this.alert, PAL.orchid);
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 110, color: PAL.cerise, i: this.state === 'tell' ? 0.7 : 0.35 }); }
}
