// Gum faction, the inflammation theme (stylised: warm glow and heat rings, never anything sore-looking).
//   r  Flare: a swollen cerise gum bulb, rooted. Throbs brighter (the tell), then pulses a heat ring.
//   n  Swell: a soft rosy mound that wanders, puffs up when you come close, and bursts into a short heat wave.
// Any hit from their heat leaves the player Inflamed for a few seconds (core status via player.inflame).
import { TAU, clamp, sign } from '../../engine/math';
import type { Entity, Game, Team } from '../types';
import { Creature, PAL, canSee, drawAlert, eyeGlow, eyeScene, hurtPlayer, playerAlive, rand } from './common';

const HEAT = '#FF5A6E';

/** An expanding ring of warmth. Hurts where the band passes (dash through it, or stay outside its reach). */
export class HeatRing implements Entity {
  id = 0; x: number; y: number; hw = 4; hh = 4; vx = 0; vy = 0; dead = false; team: Team = 'neutral'; z = 26;
  hurtable = false; contactDamage = 0; pogo = false;
  r = 6; maxR: number; speed: number; band: number; hit = false;
  constructor(x: number, y: number, maxR: number, speed: number, band: number) { this.x = x; this.y = y; this.maxR = maxR; this.speed = speed; this.band = band; }
  update(g: Game, dt: number) {
    this.r += this.speed * dt; if (this.r >= this.maxR) { this.dead = true; return; }
    const p = g.player; if (this.hit || !playerAlive(g) || p.dashing || p.invuln > 0) return;
    // nearest point of the player's box to the centre, and farthest: the band must overlap that span
    const nx = clamp(this.x, p.x - p.hw, p.x + p.hw), ny = clamp(this.y, p.y - p.hh, p.y + p.hh);
    const dn = Math.hypot(nx - this.x, ny - this.y), df = Math.hypot(Math.max(Math.abs(p.x - p.hw - this.x), Math.abs(p.x + p.hw - this.x)), Math.max(Math.abs(p.y - p.hh - this.y), Math.abs(p.y + p.hh - this.y)));
    if (this.r + this.band * 0.5 > dn && this.r - this.band * 0.5 < df && g.room.lineOfSight(this.x, this.y, p.x, p.y)) { this.hit = true; hurtPlayer(g, 1, this.x, true); }
  }
  draw() {}
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const k = this.r / this.maxR, a = (1 - k) * 0.9 + 0.1;
    ctx.save(); ctx.globalAlpha = a * 0.35; ctx.strokeStyle = HEAT; ctx.lineWidth = this.band * 1.6; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#FFD0B8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = PAL.orchid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(1, this.r - this.band * 0.6), 0, TAU); ctx.stroke();
    ctx.restore(); void g;
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: this.r + 60, color: HEAT, i: 0.4 * (1 - this.r / this.maxR) }); }
}

type FlareState = 'idle' | 'throb' | 'pulse';
const FLARE_TELL = 0.65, FLARE_R = 150;

export class Flare extends Creature {
  ceil: boolean; base: number; state: FlareState = 'idle'; st = 0; cd = 0.8; heat = 0;
  constructor(cx: number, cy: number, g: Game) {
    super('flare', cx, cy, 15, 19, 22, 'gum');
    const r = g.room, tx = Math.floor(cx / 32), ty = Math.floor(cy / 32);
    this.ceil = !r.solid(tx, ty + 1) && r.solid(tx, ty - 1);
    this.base = this.ceil ? ty * 32 : (ty + 1) * 32;
    this.y = this.ceil ? this.base + this.hh : this.base - this.hh;
    this.knockResist = 1; this.contactDamage = 0; this.heatTouch = 1; this.shine = 5; this.glowColor = HEAT; this.pogo = !this.ceil;
  }
  think(g: Game, dt: number) {
    this.st += dt; this.cd -= dt;
    const sees = canSee(g, this.x, this.y, 340);
    if (sees && !this.aware) { this.notice(g, false); this.cd = Math.max(this.cd, 0.5); }
    if (this.aware && !sees && Math.hypot(g.player.x - this.x, g.player.y - this.y) > 600) this.aware = false;
    this.lookX = this.aware ? clamp((g.player.x - this.x) / 90, -1, 1) : Math.sin(this.age * 0.6) * 0.5;
    this.lookY = this.aware ? clamp((g.player.y - this.y) / 90, -1, 1) : 0.3;
    switch (this.state) {
      case 'idle':
        this.heat = 0.15 + 0.1 * Math.sin(this.age * 2.4);
        this.sx = 1 + 0.03 * Math.sin(this.age * 2.4); this.sy = 1 - 0.03 * Math.sin(this.age * 2.4);
        if (this.aware && sees && this.cd <= 0) { this.state = 'throb'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 0.85 }); }
        break;
      case 'throb': {
        // three quickening throbs, each brighter: the tell
        const k = this.st / FLARE_TELL, beat = Math.abs(Math.sin(this.st * (8 + k * 14)));
        this.heat = 0.3 + 0.7 * k * (0.6 + 0.4 * beat); this.sx = 1 + 0.22 * k + 0.05 * beat; this.sy = 1 + 0.18 * k + 0.05 * beat;
        if (Math.random() < dt * 20) g.fx.burst(this.x + rand(-12, 12), this.y - (this.ceil ? -14 : 14), { n: 1, color: [HEAT, PAL.orchidLt], shape: 'bubble', speed: [20, 60], angle: this.ceil ? Math.PI / 2 : -Math.PI / 2, spread: 0.8, size: [1, 3], gravity: this.ceil ? 60 : -60, life: [0.4, 0.8], emissive: true });
        if (this.st >= FLARE_TELL) this.pulse(g);
        break;
      }
      case 'pulse':
        this.heat = Math.max(0.15, 1 - this.st * 1.4); this.sx = 0.85 + this.st * 0.2; this.sy = 0.88 + this.st * 0.15;
        if (this.st > 1.1) { this.state = 'idle'; this.st = 0; this.cd = 1.0 + Math.random() * 0.6; }
        break;
    }
  }
  pulse(g: Game) {
    this.state = 'pulse'; this.st = 0; this.sx = 0.8; this.sy = 0.85;
    g.spawn(new HeatRing(this.x, this.y, FLARE_R, 300, 14));
    g.audio.sfx('swoop', { x: this.x, y: this.y, pitch: 0.55 }); g.audio.sfx('spell', { x: this.x, y: this.y, pitch: 0.6, vol: 0.4 });
    g.shake(2, 0.1);
    g.fx.burst(this.x, this.y, { n: 18, color: [HEAT, PAL.orchidLt, '#FFD0B8'], speed: [120, 320], size: [1, 2.5], emissive: true, life: [0.2, 0.5], shape: 'streak' });
  }
  override stunned() {}
  override reacted(g: Game) { if (this.state === 'throb' && this.st < FLARE_TELL * 0.5) this.st = Math.max(0, this.st - 0.12); void g; }
  override dyingUpdate() { this.sx = 1 + this.dying * 1.4; this.sy = 1 - this.dying * 0.8; }
  override bloodColor() { return [PAL.cerise, HEAT, PAL.orchidLt]; }
  override deathBurst(g: Game) {
    g.fx.burst(this.x, this.y, { n: 16, color: [PAL.orchidLt, '#ffffff', PAL.sky], shape: 'bubble', speed: [60, 260], size: [2, 5], gravity: -50, life: [0.4, 1.0] });
    g.fx.burst(this.x, this.y, { n: 1, color: PAL.sky, shape: 'ring', size: [8, 8], grow: 200, emissive: true, life: [0.4, 0.4] }); // cooled off
  }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const up = this.ceil ? -1 : 1, t = this.age + this.seed, h = this.heat;
      c.save(); c.translate(this.x + jx, this.base); c.scale(1, up);
      // gum mound it grows from
      c.fillStyle = PAL.gumDk; c.beginPath(); c.ellipse(0, 0, 22, 7, 0, Math.PI, TAU); c.fill();
      c.scale(this.sx, this.sy);
      // the bulb: an onion-dome of swollen gum, warm stripes that brighten with heat
      c.beginPath(); c.moveTo(-6, -2); c.bezierCurveTo(-24, -10, -20, -34, -4, -40); c.quadraticCurveTo(0, -48 - Math.sin(t * 2) * 1.5, 4, -40); c.bezierCurveTo(20, -34, 24, -10, 6, -2); c.closePath();
      const grd = c.createRadialGradient(-5, -26, 2, 0, -20, 26); grd.addColorStop(0, '#FF9CC8'); grd.addColorStop(0.5, PAL.cerise); grd.addColorStop(1, '#9E0F52');
      c.fillStyle = grd; c.fill();
      c.save(); c.clip(); c.strokeStyle = `rgba(255,190,170,${0.25 + h * 0.5})`; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, -20, 6 + i * 6, 16 + i * 3, 0, 0, TAU); c.stroke(); }
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-8, -30, 3.2, 6, 0.4, 0, TAU); c.fill();
      // face (upright even on a ceiling)
      c.scale(1, up);
      const ey = up > 0 ? -22 : 22, eo = { r: 4.3, lx: this.lookX, ly: this.lookY * up, open: this.open, squint: this.squint, lid: this.aware ? 0.35 + h * 0.25 : 0.55, lidColor: '#B01462' };
      eyeScene(c, -6, ey, { ...eo, tilt: -1, dir: -1 }); eyeScene(c, 6, ey, { ...eo, tilt: 1, dir: 1 });
      // rosy cheeks
      c.fillStyle = 'rgba(255,170,190,0.55)'; c.beginPath(); c.ellipse(-11, ey + 6, 3.5, 2, 0, 0, TAU); c.ellipse(11, ey + 6, 3.5, 2, 0, 0, TAU); c.fill();
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 30 + this.dying * 100, PAL.sky, 0.5); return; }
    const up = this.ceil ? -1 : 1, h = this.heat, cy = this.base - up * 20 * this.sy;
    g.r.halo(ctx, this.x, cy, 40 + h * 40, HEAT, 0.2 + h * 0.5);
    if (this.state === 'throb') {
      // the reach of the coming ring, drawn faintly so the safe distance is readable
      const k = this.st / FLARE_TELL; ctx.globalAlpha = 0.12 + 0.25 * k; ctx.strokeStyle = HEAT; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.arc(this.x, this.y, FLARE_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const ey = this.base - up * 22 * this.sy, eo = { r: 4.3, lx: this.lookX, ly: this.lookY, open: this.open, squint: this.squint, lid: this.aware ? 0.35 + h * 0.25 : 0.55 };
    eyeGlow(ctx, g, this.x - 6 * this.sx, ey, { ...eo, tilt: -1, dir: -1 }, HEAT, 0.5); eyeGlow(ctx, g, this.x + 6 * this.sx, ey, { ...eo, tilt: 1, dir: 1 }, HEAT, 0.5);
    drawAlert(ctx, g, this.x, this.base - up * 66, this.alert, HEAT);
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 110 + this.heat * 90, color: HEAT, i: 0.3 + this.heat * 0.5 }); }
}

type SwellState = 'wander' | 'inflate' | 'flat';
const SWELL_TELL = 0.7;

export class Swell extends Creature {
  state: SwellState = 'wander'; st = 0; cd = 0.6; puff = 0; home: number; step = 0;
  constructor(x: number, feetY: number) {
    super('swell', x, feetY - 14, 20, 14, 26, 'gum');
    this.home = x; this.contactDamage = 0; this.heatTouch = 1; this.shine = 5; this.glowColor = HEAT; this.knockResist = 0.6; this.facing = Math.random() < 0.5 ? 1 : -1;
  }
  think(g: Game, dt: number) {
    this.st += dt; this.cd -= dt;
    const p = g.player, dx = p.x - this.x;
    const sees = canSee(g, this.x, this.y - 6, 260, { dyMax: 90 });
    if (sees && !this.aware) this.notice(g);
    switch (this.state) {
      case 'wander': {
        this.step += dt * 3; const sp = (this.aware ? 55 : 30) * (0.5 + 0.5 * Math.abs(Math.sin(this.step)));
        if (this.aware && sees && Math.abs(dx) > 10) this.facing = sign(dx) as 1 | -1;
        else if (Math.abs(this.x - this.home) > 100) this.facing = sign(this.home - this.x) as 1 | -1;
        if (this.grounded && (this.wallL && this.facing < 0 || this.wallR && this.facing > 0 || !g.room.groundAt(this.x + this.facing * (this.hw + 4), this.y + this.hh + 4))) { this.facing = -this.facing as 1 | -1; this.home = this.x; }
        this.vx = this.facing * sp; this.puff = Math.max(0, this.puff - dt * 2);
        this.sx = 1 + 0.06 * Math.sin(this.step * 2); this.sy = 1 - 0.06 * Math.sin(this.step * 2);
        if (this.aware && sees && this.cd <= 0 && Math.abs(dx) < 130) { this.state = 'inflate'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 1.1 }); }
        break;
      }
      case 'inflate': {
        this.vx *= 0.85; const k = this.st / SWELL_TELL; this.puff = k;
        this.sx = 1 + 0.55 * k + Math.sin(this.st * 70) * 0.04 * k; this.sy = 1 + 0.75 * k;
        if (Math.random() < dt * 16) g.fx.burst(this.x + rand(-14, 14), this.y - this.hh * this.sy, { n: 1, color: ['#FFD0B8', PAL.orchidLt], shape: 'bubble', speed: [20, 50], angle: -Math.PI / 2, spread: 0.6, size: [1.5, 3.5], gravity: -80, life: [0.5, 0.9], emissive: true });
        if (this.st >= SWELL_TELL) this.burst(g);
        break;
      }
      case 'flat':
        // spent: flat and steaming, an easy target
        this.vx *= 0.85; this.puff = 0; this.sx = 1.35 - Math.min(0.35, this.st * 0.25); this.sy = 0.6 + Math.min(0.4, this.st * 0.3);
        if (Math.random() < dt * 4) g.fx.burst(this.x + rand(-10, 10), this.y - 4, { n: 1, color: '#E8D8E0', shape: 'bubble', speed: [10, 30], angle: -Math.PI / 2, spread: 0.5, size: [2, 4], gravity: -60, life: [0.6, 1] });
        if (this.st > 1.5) { this.state = 'wander'; this.st = 0; this.cd = 1.2 + Math.random() * 0.6; }
        break;
    }
    this.physics(g, dt);
  }
  burst(g: Game) {
    this.state = 'flat'; this.st = 0; this.sx = 1.7; this.sy = 0.45;
    g.spawn(new HeatRing(this.x, this.y + 4, 104, 470, 18));
    g.audio.sfx('splash', { x: this.x, y: this.y, pitch: 0.6 }); g.audio.sfx('swoop', { x: this.x, y: this.y, pitch: 0.5, vol: 0.6 });
    g.shake(4, 0.14); g.hitstop(0.03);
    g.fx.burst(this.x, this.y, { n: 22, color: [HEAT, '#FFD0B8', PAL.orchidLt], speed: [160, 420], size: [1, 2.5], emissive: true, life: [0.15, 0.35], shape: 'streak' });
    g.fx.burst(this.x, this.y, { n: 12, color: ['#F0DDE6', '#ffffff'], shape: 'bubble', speed: [60, 200], angle: -Math.PI / 2, spread: 2.4, size: [2, 5], gravity: -60, life: [0.5, 1] });
  }
  override reacted(g: Game) { if (this.state === 'inflate' && this.st < SWELL_TELL * 0.4) { this.state = 'wander'; this.st = 0; this.cd = 0.5; } void g; }
  override dyingUpdate(g: Game, dt: number) { this.sx = 1 + this.dying * 1.5; this.sy = 1 + this.dying * 0.8; this.physics(g, dt); }
  override bloodColor() { return [PAL.cerise, PAL.gum, PAL.orchidLt]; }
  override deathBurst(g: Game) { g.fx.burst(this.x, this.y, { n: 18, color: [PAL.orchidLt, '#ffffff', PAL.sky], shape: 'bubble', speed: [60, 260], size: [2, 5], gravity: -50, life: [0.4, 1.0] }); }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const f = this.facing, t = this.age + this.seed, y = this.y + this.hh, k = this.puff;
      c.save(); c.translate(this.x + jx, y); c.scale(this.sx, this.sy);
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, 22, 3.5, 0, 0, TAU); c.fill();
      // soft rosy mound
      c.beginPath(); c.moveTo(-22, 0); c.bezierCurveTo(-24, -16, -10, -26, 0, -26); c.bezierCurveTo(10, -26, 24, -16, 22, 0); c.quadraticCurveTo(0, 3, -22, 0); c.closePath();
      const grd = c.createRadialGradient(-6 * f, -18, 2, 0, -12, 26); grd.addColorStop(0, k > 0.3 ? '#FFB0C8' : '#F7A9C6'); grd.addColorStop(0.6, k > 0.3 ? '#F0507E' : PAL.gum); grd.addColorStop(1, '#A33A6A');
      c.fillStyle = grd; c.fill();
      // warm blush that spreads as it puffs
      c.fillStyle = `rgba(255,90,110,${0.15 + k * 0.45})`; c.beginPath(); c.ellipse(0, -12, 14 + k * 4, 9 + k * 3, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-8 * f, -20, 5, 2.4, -0.3 * f, 0, TAU); c.fill();
      // face: content when calm, cheeks puffed and eyes scrunched while inflating, dizzy when flat
      const ey = -13;
      if (this.state === 'flat') { c.strokeStyle = PAL.ink; c.lineWidth = 1.4; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 6 + f * 2, ey, 2.6, t * 8, t * 8 + 4.5); c.stroke(); } }
      else { const eo = { r: 4, lx: this.lookX * f, ly: this.lookY, open: this.open, squint: Math.max(this.squint, k > 0.5 ? 1 : 0) }; eyeScene(c, -5 + f * 2, ey, { ...eo, dir: -1 }); eyeScene(c, 6 + f * 2, ey, { ...eo, dir: 1 }); }
      c.fillStyle = PAL.ink; c.beginPath(); c.ellipse(f * 2, -6, 1.6 + k * 1.2, 1.2 + k * 2, 0, 0, TAU); c.fill();
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.dying >= 0) { g.r.halo(ctx, this.x, this.y, 30 + this.dying * 100, PAL.sky, 0.5); return; }
    const f = this.facing, y = this.y + this.hh, k = this.puff;
    g.r.halo(ctx, this.x, y - 12 * this.sy, 34 + k * 50, HEAT, 0.16 + k * 0.5);
    if (this.state === 'inflate') { ctx.globalAlpha = 0.15 + 0.3 * k; ctx.strokeStyle = HEAT; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.arc(this.x, this.y + 4, 104, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    if (this.state !== 'flat') {
      const eo = { r: 4 * this.sx, lx: this.lookX * f, ly: this.lookY, open: this.open, squint: Math.max(this.squint, k > 0.5 ? 1 : 0) };
      eyeGlow(ctx, g, this.x + (-5 + f * 2) * this.sx, y - 13 * this.sy, { ...eo, dir: -1 }, HEAT, 0.45); eyeGlow(ctx, g, this.x + (6 + f * 2) * this.sx, y - 13 * this.sy, { ...eo, dir: 1 }, HEAT, 0.45);
    }
    drawAlert(ctx, g, this.x, y - 46 * this.sy, this.alert, HEAT);
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 90 + this.puff * 100, color: HEAT, i: 0.25 + this.puff * 0.5 }); }
}
