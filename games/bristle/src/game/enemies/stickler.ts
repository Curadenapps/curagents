// Stickler: a sticky orange crawler that hugs terrain (floors, walls, ceilings, round every corner).
// Moves its feet point along tile edges; at each tile vertex it turns into inner corners and wraps
// around outer ones. From a ceiling it sometimes lets go and drops onto the player.
import { TAU, clamp, damp, sign } from '../../engine/math';
import type { Game } from '../types';
import { Creature, PAL, canSee, drawAlert, eyeGlow, eyeScene, rand } from './common';

const T = 32;
type V2 = { x: number; y: number };
type State = 'crawl' | 'warn' | 'fall' | 'land';

export class Stickler extends Creature {
  fx: number; fy: number;           // feet point on the surface
  d: V2 = { x: 0, y: 1 };           // into the surface ("down")
  t: V2 = { x: 1, y: 0 };           // direction of travel
  ang = 0; state: State = 'crawl'; st = 0; dropCd = 1.5; flipCd = 0; gait = 0;
  constructor(cx: number, cy: number, g: Game) {
    super('stickler', cx, cy, 12, 12, 20, 'plaque');
    this.shine = 4; this.glowColor = PAL.orange;
    const r = g.room, tx = Math.floor(cx / T), ty = Math.floor(cy / T);
    const opts: [V2, V2][] = [[{ x: 0, y: 1 }, { x: 1, y: 0 }], [{ x: 0, y: -1 }, { x: -1, y: 0 }], [{ x: -1, y: 0 }, { x: 0, y: 1 }], [{ x: 1, y: 0 }, { x: 0, y: -1 }]];
    const pick = opts.find(([d]) => r.solid(tx + d.x, ty + d.y)) ?? opts[0];
    this.d = { ...pick[0] }; this.t = { ...pick[1] };
    if (Math.random() < 0.5) this.t = { x: -this.t.x, y: -this.t.y };
    this.fx = cx + this.d.x * 16; this.fy = cy + this.d.y * 16;
    this.ang = this.targetAng(); this.syncBody();
    if (!r.solid(tx + this.d.x, ty + this.d.y)) { this.state = 'fall'; this.x = cx; this.y = cy; }
  }
  targetAng() { return Math.atan2(this.d.y, this.d.x) - Math.PI / 2; }
  syncBody() { this.x = this.fx - this.d.x * this.hh; this.y = this.fy - this.d.y * this.hh; }
  attached() { return this.state === 'crawl' || this.state === 'warn' || this.state === 'land'; }
  solidAt(g: Game, x: number, y: number) { return g.room.solidAt(x, y); }

  /** Decide at a tile vertex: turn into an inner corner, keep straight, or wrap round an outer corner. */
  turnAtVertex(g: Game) {
    for (let k = 0; k < 3; k++) {
      const vx = this.fx, vy = this.fy, t = this.t, d = this.d;
      const au = this.solidAt(g, vx + t.x * 16 - d.x * 16, vy + t.y * 16 - d.y * 16);
      const ad = this.solidAt(g, vx + t.x * 16 + d.x * 16, vy + t.y * 16 + d.y * 16);
      if (au) { this.d = { x: t.x, y: t.y }; this.t = { x: -d.x, y: -d.y }; continue; }   // inner corner: climb
      if (!ad) { this.d = { x: -t.x, y: -t.y }; this.t = { x: d.x, y: d.y }; }          // outer corner: wrap
      return;
    }
  }
  crawl(g: Game, dist: number) {
    let left = dist, guard = 0;
    while (left > 1e-4 && guard++ < 8) {
      const horiz = this.t.x !== 0, s = horiz ? this.t.x : this.t.y, along = horiz ? this.fx : this.fy, cur = along / T;
      const nextV = (s > 0 ? Math.floor(cur + 1e-6) + 1 : Math.ceil(cur - 1e-6) - 1) * T, gap = Math.abs(nextV - along);
      if (left < gap) { if (horiz) this.fx += s * left; else this.fy += s * left; left = 0; }
      else { if (horiz) this.fx = nextV; else this.fy = nextV; left -= gap; this.turnAtVertex(g); }
    }
  }
  stillStuck(g: Game) {
    const { fx, fy, d, t } = this;
    return this.solidAt(g, fx + d.x * 8 + t.x * 6, fy + d.y * 8 + t.y * 6) || this.solidAt(g, fx + d.x * 8 - t.x * 6, fy + d.y * 8 - t.y * 6);
  }
  detach(g: Game) { this.state = 'fall'; this.st = 0; this.vx = 0; this.vy = 40; this.knockResist = 0.35; this.syncBody(); this.x = this.fx - this.d.x * this.hh; void g; }

  think(g: Game, dt: number) {
    this.st += dt; this.dropCd -= dt; this.flipCd -= dt;
    const p = g.player, sees = canSee(g, this.x, this.y, 300);
    if (sees && !this.aware) this.notice(g, false);
    if (!sees && this.aware && Math.hypot(p.x - this.x, p.y - this.y) > 520) this.aware = false;
    if (this.attached() && !this.stillStuck(g)) this.detach(g);
    switch (this.state) {
      case 'crawl': {
        this.knockResist = 1;
        const speed = this.aware ? 105 : 62;
        this.gait += dt * speed * 0.16;
        // on floor or ceiling, turn toward the player now and then
        if (this.aware && this.d.x === 0 && this.flipCd <= 0 && Math.abs(p.x - this.fx) > 40 && sign(p.x - this.fx) !== this.t.x) { this.t = { x: -this.t.x, y: 0 }; this.flipCd = 1.1; this.sx = 0.8; }
        this.crawl(g, speed * dt);
        // ceiling drop
        const under = this.d.y === -1 && Math.abs(p.x - this.fx) < 46 && p.y > this.y + 20 && p.y - this.y < 380;
        if (under && this.aware && this.dropCd <= 0 && playerVisible(g, this)) { this.state = 'warn'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 1.2 }); }
        break;
      }
      case 'warn':
        this.sx = 1 + Math.sin(this.st * 70) * 0.08; this.sy = 1 - this.st * 0.4; this.lookY = 1;
        if (Math.random() < dt * 20) g.fx.burst(this.fx + rand(-8, 8), this.fy + 4, { n: 1, color: [PAL.orange, PAL.tangerine], size: [1, 2], speed: [10, 40], angle: Math.PI / 2, spread: 0.4, gravity: 900, life: [0.4, 0.7] });
        if (this.st >= 0.45) { this.detach(g); this.dropCd = 3.5; g.audio.sfx('leech-drop', { x: this.x, y: this.y, pitch: 1.2 }); this.sy = 1.35; this.sx = 0.75; }
        break;
      case 'fall':
        this.knockResist = 0.35; this.physics(g, dt);
        this.ang = damp(this.ang, 0, 12, dt) ;
        if (this.grounded) {
          this.state = 'land'; this.st = 0; this.sx = 1.5; this.sy = 0.6; this.vx = 0;
          this.d = { x: 0, y: 1 }; this.t = { x: (sign(p.x - this.x) || 1), y: 0 };
          this.fy = Math.round((this.y + this.hh) / T) * T; this.fx = this.x;
          g.audio.sfx('land', { x: this.x, y: this.y, pitch: 1.3 }); g.shake(2, 0.08);
          this.dust(g, 7, [PAL.orange, '#b85a10', PAL.tangerine]);
        }
        break;
      case 'land':
        if (this.st > 0.4) { this.state = 'crawl'; this.st = 0; }
        break;
    }
    if (this.attached()) { this.syncBody(); this.ang = lerpAngle(this.ang, this.targetAng(), 1 - Math.exp(-14 * dt)); this.vx = this.vy = 0; }
    this.lookX = this.aware ? clamp((p.x - this.x) / 80, -1, 1) : 0.6; if (this.state !== 'warn') this.lookY = this.aware ? clamp((p.y - this.y) / 80, -1, 1) : 0;
  }
  override stunned(g: Game, dt: number) { if (!this.attached()) this.physics(g, dt); }
  override dyingUpdate(g: Game, dt: number) { this.sx = 1 + this.dying * 1.6; this.sy = 1 - this.dying * 0.6; if (!this.attached()) this.physics(g, dt); }
  override bloodColor() { return [PAL.orange, PAL.tangerine, PAL.yellow]; }
  override deathBurst(g: Game) { g.fx.burst(this.x, this.y, { n: 8, color: [PAL.tangerine, '#ffffff'], shape: 'square', spin: 14, speed: [80, 260], size: [1.5, 3], gravity: 900, life: [0.4, 0.9] }); }

  /** Local frame: origin at the feet, -y away from the surface, +x the facing side. */
  frame(c: CanvasRenderingContext2D) {
    const fx = this.attached() || this.dying >= 0 && this.state !== 'fall' ? this.fx : this.x, fy = this.attached() || this.dying >= 0 && this.state !== 'fall' ? this.fy : this.y + this.hh;
    const a = this.attached() ? this.ang : this.ang, ax = Math.cos(a) * this.t.x + Math.sin(a) * this.t.y;
    const facing = this.state === 'fall' ? (this.facing) : (ax >= 0 ? 1 : -1);
    c.translate(fx, fy); c.rotate(a); c.scale(facing, 1);
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const t = this.age + this.seed;
      c.save(); this.frame(c); c.translate(jx, 0); c.scale(this.sx, this.sy);
      // sticky strands to the surface
      c.strokeStyle = 'rgba(255,170,80,0.55)'; c.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 8, -4); c.quadraticCurveTo(i * 9 + Math.sin(t * 3 + i) * 2, 0, i * 10, 1); c.stroke(); }
      // legs: three pairs of stubby goo feet
      c.fillStyle = '#B4560E';
      for (let i = 0; i < 6; i++) { const ph = this.gait * TAU + i * 1.3, lx = -12 + i * 4.8 + Math.sin(ph) * 2, lift = Math.max(0, Math.cos(ph)) * 3; c.beginPath(); c.ellipse(lx, -2 - lift, 2.6, 3.4, 0, 0, TAU); c.fill(); }
      // body: a drippy dome
      c.beginPath(); c.moveTo(-15, -3);
      c.bezierCurveTo(-16, -18, -6, -24, 2, -23); c.bezierCurveTo(12, -22, 17, -14, 15, -3);
      c.quadraticCurveTo(0, 1 + Math.sin(t * 4) * 1.2, -15, -3); c.closePath();
      const grd = c.createLinearGradient(0, -24, 0, 0); grd.addColorStop(0, '#FFB25A'); grd.addColorStop(0.6, PAL.orange); grd.addColorStop(1, '#C25E08');
      c.fillStyle = grd; c.fill();
      // sugar crystal bumps along the back
      c.fillStyle = '#FFE0B0';
      for (let i = 0; i < 4; i++) { const bx = -9 + i * 6, by = -20 + Math.abs(i - 1.5) * 2.2; c.beginPath(); c.moveTo(bx - 2.5, by + 2); c.lineTo(bx, by - 3.5 - (i % 2)); c.lineTo(bx + 2.5, by + 2); c.closePath(); c.fill(); }
      // drips
      c.fillStyle = PAL.orange; for (let i = 0; i < 2; i++) { const dx = -6 + i * 11, len = 3 + (Math.sin(t * 2 + i * 2) * 0.5 + 0.5) * 4; c.beginPath(); c.ellipse(dx, -2 + len * 0.5, 1.6, len * 0.5 + 1, 0, 0, TAU); c.fill(); }
      // gloss
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-3, -19, 5, 2, -0.2, 0, TAU); c.fill();
      // eyes
      const eo = { r: 4.2, lx: 0.5, ly: this.state === 'warn' ? 1 : 0.1, open: this.open, squint: this.squint };
      eyeScene(c, 5, -12, { ...eo, dir: -1 }); eyeScene(c, 12, -11, { ...eo, r: 3.6, dir: 1 });
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 36 + this.dying * 110, PAL.orange, 0.6); return; }
    ctx.save(); this.frame(ctx); ctx.scale(this.sx, this.sy);
    g.r.halo(ctx, 0, -11, 36, PAL.orange, 0.22 + (this.state === 'warn' ? 0.3 : 0));
    const eo = { r: 4.2, lx: 0.5, ly: this.state === 'warn' ? 1 : 0.1, open: this.open, squint: this.squint };
    eyeGlow(ctx, g, 5, -12, { ...eo, dir: -1 }, PAL.orange, 0.55); eyeGlow(ctx, g, 12, -11, { ...eo, r: 3.6, dir: 1 }, PAL.orange, 0.55);
    ctx.restore();
    drawAlert(ctx, g, this.x - this.d.x * 22, this.y - this.d.y * 22 - (this.d.y === 0 ? 20 : 0), this.alert, PAL.orange);
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 80, color: PAL.orange, i: 0.3 }); }
}

function playerVisible(g: Game, s: Stickler) { return canSee(g, s.x, s.y + 14, 420); }
function lerpAngle(a: number, b: number, k: number) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; }
