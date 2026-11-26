// Tartar Brute: a heavy beetle-like mass under a calcified molar-crown shell, with a thick bone face
// plate in front. Front slashes clank off (pogo it or hit its back). Paws the ground, then charges;
// hitting a wall dazes it, plate and all.
import { TAU, clamp, sign } from '../../engine/math';
import type { Game, Hit } from '../types';
import { Creature, PAL, canSee, drawAlert, emberEye, rand } from './common';

type State = 'patrol' | 'face' | 'paw' | 'charge' | 'skid' | 'dazed' | 'recover';
const PAW = 0.6;

export class TartarBrute extends Creature {
  state: State = 'patrol'; st = 0; home: number; step = 0; chargeFrom = 0; blockT = 0; cd = 0.5;
  constructor(x: number, feetY: number) {
    super('tartar-brute', x, feetY - 22, 26, 22, 60, 'tartar');
    this.home = x; this.knockResist = 0.88; this.shine = 12; this.glowColor = PAL.orange; this.popSfx = 'break';
  }
  front(g: Game) { return sign(g.player.x - this.x) === this.facing; }
  override guard(g: Game, hit: Hit) {
    if (hit.kind !== 'slash' || this.state === 'dazed' || !this.front(g)) return false;
    // clank: sparks off the face plate, both sides shove back a little
    const px = this.x + this.facing * (this.hw + 2);
    g.audio.sfx('shield-block', { x: px, y: this.y }); g.audio.sfx('clink', { x: px, y: this.y, pitch: 0.8, vol: 0.6 });
    g.hitstop(0.045); g.shake(2.5, 0.08);
    g.fx.burst(px, this.y - 4, { n: 14, color: ['#ffffff', PAL.yellow, PAL.boneLt], shape: 'streak', speed: [180, 520], angle: this.facing > 0 ? 0 : Math.PI, spread: 1.6, size: [1, 2], emissive: true, life: [0.08, 0.22], gravity: 600 });
    g.fx.burst(px, this.y - 4, { n: 1, color: '#ffffff', shape: 'ring', size: [3, 3], grow: 150, emissive: true, life: [0.12, 0.12] });
    g.player.push(this.facing * 330, Math.min(g.player.vy, -60));
    this.vx = -this.facing * 60; this.blockT = 0.22; this.sx = 0.92;
    if (!this.aware) this.notice(g, false);
    return true;
  }
  think(g: Game, dt: number) {
    this.st += dt; this.cd -= dt; this.blockT = Math.max(0, this.blockT - dt);
    const p = g.player, dx = p.x - this.x;
    const sees = canSee(g, this.x, this.y - 8, 380, { dyMax: 110 });
    switch (this.state) {
      case 'patrol': {
        this.step += dt * 2.2; const sp = 42 * (0.6 + 0.4 * Math.abs(Math.sin(this.step * Math.PI)));
        if (Math.abs(this.x - this.home) > 120) this.facing = sign(this.home - this.x) as 1 | -1;
        if (this.grounded && (this.wallL && this.facing < 0 || this.wallR && this.facing > 0 || !g.room.groundAt(this.x + this.facing * (this.hw + 6), this.y + this.hh + 4))) { this.facing = -this.facing as 1 | -1; this.home = this.x; }
        this.vx = this.facing * sp;
        if (sees) {
          if (!this.aware) this.notice(g, false);
          this.state = 'face'; this.st = 0;
        }
        break;
      }
      case 'face':
        this.vx *= 0.8; this.facing = (sign(dx) || this.facing) as 1 | -1;
        if (this.st > 0.35 && this.cd <= 0) { this.state = 'paw'; this.st = 0; g.audio.sfx('enemy-windup', { x: this.x, y: this.y, pitch: 0.7 }); }
        if (!sees && this.st > 1.2) { this.state = 'patrol'; this.st = 0; this.aware = false; }
        break;
      case 'paw':
        // telegraph: rears back, scrapes the floor twice, eyes flare
        this.vx = 0; this.sx = 1 + Math.sin(this.st * 22) * 0.04; this.sy = 1 - 0.06 * (this.st / PAW);
        if (Math.floor(this.st * 6) !== Math.floor((this.st - dt) * 6)) { this.dust(g, 3, ['#8c8574', '#6d6a5e']); g.audio.sfx('step', { x: this.x, y: this.y, pitch: 0.6, vol: 0.6 }); }
        if (this.st >= PAW) { this.state = 'charge'; this.st = 0; this.chargeFrom = this.x; g.audio.sfx('charge', { x: this.x, y: this.y }); this.sx = 1.2; this.sy = 0.85; }
        break;
      case 'charge': {
        this.vx = this.facing * Math.min(440, 120 + this.st * 1200);
        if (Math.random() < dt * 30) this.dust(g, 1);
        const wall = this.facing > 0 ? this.wallR : this.wallL;
        if (wall) { this.hitWall(g); break; }
        const edge = !g.room.groundAt(this.x + this.facing * (this.hw + 10), this.y + this.hh + 4);
        if (edge || Math.abs(this.x - this.chargeFrom) > 640 || this.st > 2.2) { this.state = 'skid'; this.st = 0; g.audio.sfx('land', { x: this.x, y: this.y, pitch: 0.7 }); }
        break;
      }
      case 'skid':
        this.vx *= Math.exp(-7 * dt); if (Math.random() < dt * 40) this.dust(g, 1);
        if (!g.room.groundAt(this.x + this.facing * (this.hw + 2), this.y + this.hh + 4)) this.vx = 0;
        if (this.st > 0.5) { this.state = 'recover'; this.st = 0; }
        break;
      case 'dazed':
        this.vx *= Math.exp(-6 * dt);
        if (Math.random() < dt * 6) g.fx.burst(this.x + rand(-14, 14), this.y - this.hh - 8, { n: 1, color: [PAL.yellow, '#ffffff'], emissive: true, speed: [10, 40], size: [1, 2], life: [0.4, 0.8], gravity: -30 });
        if (this.st > 1.7) { this.state = 'recover'; this.st = 0; }
        break;
      case 'recover':
        this.vx *= 0.8;
        if (this.st > 0.7) { this.state = 'face'; this.st = 0; this.cd = 0.6 + Math.random() * 0.5; }
        break;
    }
    this.physics(g, dt);
  }
  hitWall(g: Game) {
    this.state = 'dazed'; this.st = 0; this.vx = -this.facing * 160; this.vy = -180;
    g.audio.sfx('boss-slam', { x: this.x, y: this.y, vol: 0.7, pitch: 1.4 }); g.audio.sfx('break', { x: this.x, y: this.y });
    g.shake(9, 0.3); g.hitstop(0.06);
    const wx = this.x + this.facing * this.hw;
    g.fx.burst(wx, this.y, { n: 18, color: [PAL.bone, PAL.bone2, '#8c8574'], shape: 'square', spin: 14, speed: [120, 380], angle: this.facing > 0 ? Math.PI : 0, spread: 1.8, size: [2, 4.5], gravity: 1100, life: [0.4, 0.9] });
    g.fx.burst(wx, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [6, 6], grow: 240, emissive: true, life: [0.2, 0.2] });
    this.sx = 0.7; this.sy = 1.2;
  }
  override reacted(g: Game, hit: Hit) { if (hit.kind === 'pogo') { this.sy = 0.78; this.sx = 1.15; } if (this.state === 'patrol') { this.state = 'face'; this.st = 0; } void g; }
  override dyingUpdate(g: Game, dt: number) { this.sy = 1 - this.dying * 0.5; this.sx = 1 + this.dying * 0.3; this.physics(g, dt); if (Math.random() < dt * 30) g.fx.burst(this.x + rand(-20, 20), this.y - 10, { n: 1, color: [PAL.bone, PAL.bone2], shape: 'square', speed: [60, 160], size: [1.5, 3], gravity: 900, life: [0.4, 0.8] }); }
  override bloodColor() { return [PAL.bone, PAL.bone2, PAL.boneLt]; }
  override deathBurst(g: Game) {
    g.fx.burst(this.x, this.y - 8, { n: 26, color: [PAL.bone, PAL.bone2, PAL.bone3, PAL.boneLt], shape: 'square', spin: 18, speed: [120, 460], size: [2.5, 6], gravity: 1200, life: [0.6, 1.3] });
    g.fx.burst(this.x, this.y, { n: 14, color: [PAL.yellow, PAL.orange], speed: [60, 260], size: [1.5, 3], emissive: true, life: [0.3, 0.8] });
    g.shake(9, 0.25);
  }
  override deathDur = 0.5;

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const jx = this.shiver();
    this.withFlash(ctx, (c = ctx) => {
      const f = this.facing, t = this.age + this.seed, x = this.x + jx, y = this.y + this.hh;
      const legPh = this.state === 'charge' ? this.st * 26 : this.state === 'patrol' ? this.step * Math.PI * 2 : this.state === 'paw' ? this.st * 22 : 0;
      c.save(); c.translate(x, y); c.scale(f * this.sx, this.sy);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, 0, 30, 4, 0, 0, TAU); c.fill();
      // legs: six stubby pegs
      c.fillStyle = PAL.bone4;
      for (let i = 0; i < 3; i++) for (const s of [0, 1]) { const ph = legPh + i * 2.1 + s * Math.PI, lx = -16 + i * 14 + Math.sin(ph) * 4, lift = Math.max(0, Math.cos(ph)) * 4; c.beginPath(); c.roundRect(lx - 3, -12 - lift, 6, 12, 3); c.fill(); }
      // body underside
      c.fillStyle = '#5c5647'; c.beginPath(); c.ellipse(0, -14, 27, 12, 0, 0, TAU); c.fill();
      // shell: a big grey molar crown with four cusps and fissure grooves
      c.beginPath(); c.moveTo(-30, -12);
      c.bezierCurveTo(-34, -30, -26, -42, -18, -41); c.quadraticCurveTo(-12, -47, -6, -41); c.quadraticCurveTo(0, -48, 6, -41); c.quadraticCurveTo(12, -47, 18, -40);
      c.bezierCurveTo(26, -38, 28, -26, 24, -12); c.closePath();
      const grd = c.createLinearGradient(0, -48, 0, -10); grd.addColorStop(0, PAL.boneLt); grd.addColorStop(0.45, PAL.bone); grd.addColorStop(1, PAL.bone2);
      c.fillStyle = grd; c.fill();
      c.strokeStyle = PAL.bone3; c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-12, -42); c.quadraticCurveTo(-10, -32, -3, -29); c.quadraticCurveTo(4, -32, 6, -41); c.moveTo(-3, -29); c.quadraticCurveTo(-4, -22, -10, -16); c.moveTo(-3, -29); c.quadraticCurveTo(6, -24, 12, -42); c.stroke();
      // calcified speckles and crack lines on the shell
      c.fillStyle = 'rgba(111,104,87,0.6)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-22 + ((i * 13) % 40), -18 - ((i * 7) % 18), 1.3, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-14, -39, 6, 2.4, -0.3, 0, TAU); c.fill();
      // front face plate (the shield)
      const blk = this.blockT > 0 ? 3 : 0;
      c.fillStyle = PAL.bone3; c.beginPath(); c.moveTo(20 + blk, -36); c.quadraticCurveTo(34 + blk, -30, 33 + blk, -14); c.quadraticCurveTo(31 + blk, -4, 22 + blk, -2); c.quadraticCurveTo(25, -18, 20 + blk, -36); c.fill();
      c.fillStyle = PAL.boneLt; c.beginPath(); c.moveTo(22 + blk, -34); c.quadraticCurveTo(31 + blk, -28, 30 + blk, -16); c.lineTo(27 + blk, -17); c.quadraticCurveTo(27 + blk, -27, 22 + blk, -34); c.fill();
      // tusks
      c.fillStyle = PAL.boneLt; c.beginPath(); c.moveTo(26, -8); c.quadraticCurveTo(36, -6, 38, -14); c.quadraticCurveTo(33, -9, 26, -12); c.fill();
      // dazed: stars of grit orbiting
      if (this.state === 'dazed') { c.fillStyle = PAL.yellow; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; c.beginPath(); c.arc(Math.cos(a) * 16, -52 + Math.sin(a) * 4, 2.2, 0, TAU); c.fill(); } }
      c.restore();
    });
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const f = this.facing, x = this.x, y = this.y + this.hh;
    if (this.dying >= 0) { g.r.halo(ctx, x, y - 20, 50 + this.dying * 120, PAL.orange, 0.5); return; }
    const hot = this.state === 'paw' ? this.st / PAW : this.state === 'charge' ? 1 : 0;
    const open = this.state === 'dazed' ? 0.25 : this.squint > 0.15 ? 0.1 : this.open;
    // eyes peering out under the shell rim, just behind the face plate
    emberEye(ctx, g, x + f * 16 * this.sx, y - 24 * this.sy, 2.8 + hot, hot > 0 ? PAL.yellow : PAL.orange, 0.7 + hot * 0.3, open);
    emberEye(ctx, g, x + f * 8 * this.sx, y - 23 * this.sy, 2.3 + hot * 0.8, hot > 0 ? PAL.yellow : PAL.orange, 0.6 + hot * 0.3, open);
    if (hot > 0) g.r.halo(ctx, x + f * 20, y - 20, 30 + hot * 20, PAL.orange, 0.25 * hot);
    drawAlert(ctx, g, x, y - 66, this.alert, PAL.orange);
  }
  lights(g: Game) { g.light({ x: this.x + this.facing * 14, y: this.y - 4, r: 110, color: PAL.orange, i: this.state === 'paw' || this.state === 'charge' ? 0.6 : 0.3 }); }
}
void clamp;
