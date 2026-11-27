// Tartar Spitter: a rooted, crown-headed turret of old calcified enamel. Floor or ceiling (it checks
// which side is solid). Aims, charges a glow in its mouth, lobs arcing sugar globs.
import { Projectile } from '../entity';
import { TAU, clamp, damp, sign } from '../../engine/math';
import type { Game, Hit } from '../types';
import { Creature, PAL, canSee, drawAlert, emberEye, rand } from './common';

const GRAV = 1400; // Projectile gravity
type State = 'idle' | 'aim' | 'charge' | 'recoil';

/** An arcing glob of sticky sugar. Slash it to burst it; pogo off it if you are brave. */
export class SugarGlob extends Projectile {
  t = 0; spin = Math.random() * TAU;
  constructor(x: number, y: number, vx: number, vy: number) {
    super(x, y, vx, vy, 'enemy', 1, 7, 2.6, PAL.cerise); this.gravityOn = true; this.hurtable = true; this.pogo = true;
  }
  override update(g: Game, dt: number) {
    this.t += dt; super.update(g, dt);
    if (!this.dead && Math.random() < dt * 40) g.fx.burst(this.x, this.y, { n: 1, color: [PAL.orchid, PAL.orchidLt], size: [1, 2.4], speed: [5, 30], gravity: 300, life: [0.2, 0.45], emissive: Math.random() < 0.5 });
  }
  onHit(g: Game, _hit: Hit) {
    if (this.dead) return false;
    g.audio.sfx('clink', { x: this.x, y: this.y, pitch: 1.3 }); g.hitstop(0.03);
    g.fx.burst(this.x, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [3, 3], grow: 160, emissive: true, life: [0.14, 0.14] });
    this.pop(g); return false;
  }
  override pop(g: Game) {
    this.dead = true;
    g.fx.burst(this.x, this.y, { n: 16, color: [PAL.cerise, PAL.orchid, PAL.orchidLt], speed: [60, 260], size: [1.5, 3.5], life: [0.25, 0.6], gravity: 900, shape: 'square', spin: 12 });
    g.fx.burst(this.x, this.y, { n: 6, color: '#ffffff', speed: [40, 160], size: [1, 2], life: [0.15, 0.3], emissive: true });
    g.audio.sfx('splash', { x: this.x, y: this.y, pitch: 1.25, vol: 0.5 });
  }
  override draw(ctx: CanvasRenderingContext2D) {
    const s = 1 + Math.sin(this.t * 22) * 0.12, a = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(a); ctx.scale(s * 1.15, 1 / s);
    ctx.fillStyle = PAL.cerise; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.orchidLt; ctx.beginPath(); ctx.arc(-2, -2.5, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  override drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y, 26, PAL.cerise, 0.6); g.r.halo(ctx, this.x, this.y, 8, '#ffffff', 0.5); }
  override lights(g: Game) { g.light({ x: this.x, y: this.y, r: 90, color: PAL.cerise, i: 0.6 }); }
}

export class TartarSpitter extends Creature {
  ceil: boolean; base: number; aim = 0; st = 0; state: State = 'idle'; cd = 0.6; head = 0;
  constructor(cx: number, cy: number, g: Game) {
    super('tartar-spitter', cx, cy, 14, 16, 25, 'tartar');
    const r = g.room, tx = Math.floor(cx / 32), ty = Math.floor(cy / 32);
    this.ceil = !r.solid(tx, ty + 1) && r.solid(tx, ty - 1);
    this.base = this.ceil ? ty * 32 : (ty + 1) * 32;
    this.y = this.ceil ? this.base + this.hh : this.base - this.hh;
    this.knockResist = 1; this.pogo = !this.ceil; this.shine = 5; this.glowColor = PAL.orange; this.popSfx = 'break';
    this.aim = this.ceil ? Math.PI / 2 : -Math.PI / 2;
  }
  /** Mouth position in world space. */
  mouth() { const up = this.ceil ? 1 : -1; return { x: this.x + Math.cos(this.aim) * 10, y: this.base + up * 30 + Math.sin(this.aim) * 6 }; }
  think(g: Game, dt: number) {
    this.st += dt; this.cd -= dt;
    const p = g.player, m = this.mouth();
    const sees = canSee(g, m.x, m.y, 460);
    if (sees && !this.aware) { this.notice(g, false); this.cd = Math.max(this.cd, 0.5); }
    if (!sees && this.aware && this.state === 'idle' && Math.hypot(p.x - this.x, p.y - this.y) > 600) this.aware = false;
    const want = this.aware ? Math.atan2(p.y - 10 - m.y, p.x - m.x) : (this.ceil ? Math.PI / 2 : -Math.PI / 2) + Math.sin(this.age * 0.8) * 0.5;
    // keep the aim in the open half-plane
    const lim = this.ceil ? clamp(want, 0.15, Math.PI - 0.15) : clamp(want < Math.PI / 2 && want > -Math.PI ? want : want - TAU, -Math.PI + 0.15, -0.15);
    if (this.state !== 'charge' || this.st < 0.45) this.aim = damp(this.aim, lim, this.state === 'aim' ? 7 : 3, dt);
    this.head = damp(this.head, 0, 10, dt);
    switch (this.state) {
      case 'idle':
        if (this.aware && sees && this.cd <= 0) { this.state = 'aim'; this.st = 0; }
        break;
      case 'aim':
        if (this.st > 0.45) { this.state = 'charge'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 0.9 }); }
        break;
      case 'charge':
        // visible glow gathering in the mouth, motes drawn inward
        if (Math.random() < dt * 30) { const a = Math.random() * TAU, r = rand(26, 44); g.fx.burst(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, { n: 1, color: [PAL.orchid, PAL.yellow], vx: -Math.cos(a) * r * 3, vy: -Math.sin(a) * r * 3, speed: [0, 0], drag: 0, emissive: true, size: [1, 2], life: [0.3, 0.33], shape: 'streak' }); }
        this.sx = 1 + this.st * 0.25; this.sy = 1 - this.st * 0.15;
        if (this.st >= 0.7) { this.spit(g); this.state = 'recoil'; this.st = 0; }
        break;
      case 'recoil':
        if (this.st > 0.5) { this.state = 'idle'; this.st = 0; this.cd = 1.0 + Math.random() * 0.6; }
        break;
    }
  }
  spit(g: Game) {
    const p = g.player, m = this.mouth(), dx = p.x - m.x, dy = p.y - 6 - m.y;
    const T = clamp(Math.hypot(dx, dy) / 430, 0.55, 1.15);
    let vx = dx / T, vy = dy / T - 0.5 * GRAV * T;
    if (this.ceil) vy = Math.max(vy, 60); // from a ceiling it can only lob downward
    const sp = Math.hypot(vx, vy); if (sp > 900) { vx *= 900 / sp; vy *= 900 / sp; }
    g.spawn(new SugarGlob(m.x, m.y, vx, vy));
    g.audio.sfx('spit', { x: m.x, y: m.y });
    this.sx = 0.75; this.sy = 1.35; this.head = 1;
    g.fx.burst(m.x, m.y, { n: 10, color: [PAL.cerise, PAL.orchidLt, PAL.bone], speed: [60, 220], angle: Math.atan2(vy, vx), spread: 0.9, size: [1.5, 3], gravity: 700, life: [0.2, 0.5] });
    g.fx.burst(m.x, m.y, { n: 1, color: PAL.orchidLt, shape: 'ring', size: [4, 4], grow: 120, emissive: true, life: [0.16, 0.16] });
    void sign;
  }
  override reacted(_g: Game, hit: Hit) { if (this.state === 'charge' && hit.kind !== 'spell' && this.st < 0.5) { this.st = Math.max(0, this.st - 0.2); } }
  override stunned() {}
  override dyingUpdate() { this.sy = 1 - this.dying * 1.2; this.sx = 1 + this.dying * 0.6; }
  override bloodColor() { return [PAL.bone, PAL.bone2, PAL.boneLt]; }
  override deathBurst(g: Game) {
    g.fx.burst(this.x, this.base + (this.ceil ? 16 : -16), { n: 14, color: [PAL.bone, PAL.bone2, PAL.bone3], shape: 'square', spin: 16, speed: [100, 380], size: [2, 5], gravity: 1100, life: [0.6, 1.2] });
    g.fx.burst(this.x, this.base + (this.ceil ? 26 : -26), { n: 10, color: [PAL.cerise, PAL.orchid], speed: [40, 200], size: [1.5, 3], gravity: 600, life: [0.3, 0.7] });
  }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const up = this.ceil ? -1 : 1, t = this.age + this.seed; // draw upright, flip for ceiling
      c.save(); c.translate(this.x + jx, this.base); c.scale(this.sx, up * this.sy);
      // root crust spreading over the surface
      c.fillStyle = PAL.bone3; c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-18, -8, -12, -10); c.lineTo(12, -10); c.quadraticCurveTo(18, -8, 26, 0); c.closePath(); c.fill();
      // trunk: a tapering calcified column with growth rings
      c.fillStyle = PAL.bone2; c.beginPath(); c.moveTo(-14, -4); c.quadraticCurveTo(-11, -18, -9, -24); c.lineTo(9, -24); c.quadraticCurveTo(11, -18, 14, -4); c.closePath(); c.fill();
      c.strokeStyle = PAL.bone3; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-12 + i, -6 - i * 6); c.quadraticCurveTo(0, -4 - i * 6, 12 - i, -6 - i * 6); c.stroke(); }
      // head: a grey molar crown that turns to aim
      const aimUp = this.ceil ? -this.aim : this.aim, tilt = clamp((aimUp + Math.PI / 2), -1.1, 1.1) * 0.7;
      c.save(); c.translate(0, -24); c.rotate(tilt); c.translate(0, this.head * 3);
      c.fillStyle = PAL.bone; c.beginPath(); c.moveTo(-15, 0);
      c.quadraticCurveTo(-17, -12, -12, -16); c.quadraticCurveTo(-8, -20, -5, -15); c.quadraticCurveTo(0, -19, 5, -15); c.quadraticCurveTo(8, -20, 12, -16); c.quadraticCurveTo(17, -12, 15, 0); c.closePath(); c.fill();
      c.fillStyle = PAL.boneLt; c.beginPath(); c.ellipse(-6, -13, 4, 2, -0.3, 0, TAU); c.fill();
      // fissure lines between the cusps
      c.strokeStyle = PAL.bone3; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-5, -15); c.quadraticCurveTo(-3, -8, 0, -7); c.quadraticCurveTo(3, -8, 5, -15); c.moveTo(0, -7); c.lineTo(0, -2); c.stroke();
      // mouth: a dark socket in front of the crown
      const open = this.state === 'charge' ? 0.6 + this.st * 0.6 : this.state === 'recoil' ? 1.1 - this.st : 0.45;
      c.fillStyle = '#1b1712'; c.beginPath(); c.ellipse(0, -1, 7, 3 + open * 3.5, 0, 0, TAU); c.fill();
      c.restore();
      c.restore();
      void t;
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.base + (this.ceil ? 30 : -30), 30 + this.dying * 90, PAL.cerise, 0.6); return; }
    const up = this.ceil ? -1 : 1, aimUp = this.ceil ? -this.aim : this.aim, tilt = clamp((aimUp + Math.PI / 2), -1.1, 1.1) * 0.7;
    ctx.save(); ctx.translate(this.x, this.base); ctx.scale(this.sx, up * this.sy); ctx.translate(0, -24); ctx.rotate(tilt);
    const charge = this.state === 'charge' ? this.st / 0.7 : this.state === 'recoil' ? Math.max(0, 0.5 - this.st) : 0;
    // two ember eyes under the crown rim (squeezed shut when pasted)
    const open = this.squint > 0.15 ? 0.15 : this.open;
    emberEye(ctx, g, -6, -6, 2.4, PAL.orange, this.aware ? 0.9 : 0.5, open); emberEye(ctx, g, 6, -6, 2.4, PAL.orange, this.aware ? 0.9 : 0.5, open);
    // mouth glow
    g.r.halo(ctx, 0, -1, 10 + charge * 26, PAL.cerise, 0.2 + charge * 0.75);
    if (charge > 0) g.r.halo(ctx, 0, -1, 4 + charge * 8, '#ffffff', charge);
    ctx.restore();
    drawAlert(ctx, g, this.x, this.base + (this.ceil ? 70 : -70), this.alert, PAL.orange);
  }
  lights(g: Game) { const m = this.mouth(), k = this.state === 'charge' ? this.st / 0.7 : 0; g.light({ x: m.x, y: m.y, r: 90 + k * 80, color: PAL.cerise, i: 0.3 + k * 0.6 }); }
}
