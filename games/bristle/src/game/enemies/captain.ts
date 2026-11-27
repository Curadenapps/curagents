// The Crust Captain: the mini-boss at the end of the Narrows (room narrows-den), before the Sugar Wastes.
// A squat tartar sentry with a calcified shield on its front. It teaches the combos:
//   - Plain slashes from the front clink off the shield. A finisher, a combo move or a Deep Clean cracks it
//     (the Captain staggers and takes extra cleaning power); hits from behind always land.
//   - Shield Rush: scrapes its feet (tell), then charges across the arena. Jump over it to get behind.
//   - Crust Slam: rears up (tell), slams; two small shockwaves run along the floor. Jump them.
//   - Below half: it throws a tartar chunk in an arc between moves.
// Defeat opens the gates, pays a level-up card and the way on to the Sugar Wastes.
import { Enemy, Projectile } from '../entity';
import { TILE } from '../../engine/render';
import { TAU, clamp, sign } from '../../engine/math';
import type { Game, Hit } from '../types';

type State = 'dormant' | 'wake' | 'idle' | 'walk' | 'rushTell' | 'rush' | 'slamTell' | 'slam' | 'tossTell' | 'stagger' | 'dying';
export const CAPTAIN_FLAG = 'captain-defeated';

class Ripple extends Projectile {
  constructor(x: number, y: number, dir: number) { super(x, y, dir * 290, 0, 'enemy', 1, 9, 1.4, '#d8cfb8'); this.hh = 9; }
  override update(g: Game, dt: number) {
    super.update(g, dt);
    if (!this.dead && !g.room.solidAt(this.x, this.y + 16)) this.pop(g);
    if (!this.dead && Math.random() < 0.6) g.fx.burst(this.x, this.y + 6, { n: 1, color: ['#d8cfb8', '#b8ad92'], speed: [40, 110], angle: -Math.PI / 2, spread: 1, size: [1.5, 3], gravity: 600, life: [0.2, 0.4] });
  }
  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#cfc4a6'; ctx.beginPath(); ctx.moveTo(this.x - 12, this.y + 9); ctx.quadraticCurveTo(this.x, this.y - 12, this.x + 12, this.y + 9); ctx.fill();
  }
}

export class CrustCaptain extends Enemy {
  state: State = 'dormant'; st = 0; sx = 1; sy = 1; t = 0; floorY: number; cycle = 0; rushDir = 1;
  shield = 1; // 1 = up, 0 = cracked (comes back after the stagger)
  gates: { x: number; y: number }[] = []; hpShown = 1; barA = 0; hook: ((ctx: CanvasRenderingContext2D, g: Game) => void) | null = null;
  constructor(x: number, y: number) {
    super('crust-captain', x, y + TILE / 2 - 30, 30, 30, 75);
    this.floorY = y + TILE / 2; this.faction = 'tartar'; this.shine = 30; this.knockResist = 1; this.contactDamage = 1; this.pogo = true;
  }
  override update(g: Game, dt: number) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.st += dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 8); this.sy += (1 - this.sy) * Math.min(1, dt * 8);
    if (this.hook) this.barA = Math.min(1, this.barA + dt * 2);
    this.hpShown += (this.hp / this.maxHp - this.hpShown) * Math.min(1, dt * 6);
    this.think(g, dt);
  }
  think(g: Game, dt: number) {
    const p = g.player, dx = p.x - this.x;
    if (this.state === 'dormant') { this.hurtable = false; this.contactDamage = 0; this.physics(g, dt); if (Math.abs(dx) < 360 && p.grounded) this.wake(g); return; }
    if (this.state === 'dying') { this.vx *= 0.9; this.physics(g, dt); this.sx = 1 + Math.sin(this.st * 40) * 0.05; if (Math.random() < 0.5) g.fx.burst(this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 40, { n: 3, color: ['#d8cfb8', '#FF8200', '#ffffff'], speed: [60, 240], size: [2, 4], gravity: 800, life: [0.3, 0.7] }); if (this.st > 1.4) this.finish(g); return; }
    const phase2 = this.hp < this.maxHp / 2;
    if (this.grounded && this.state !== 'rush') this.vx *= Math.exp(-7 * dt);
    switch (this.state) {
      case 'wake': if (this.st > 1.2) this.go('idle'); break;
      case 'idle':
        this.facing = (sign(dx) || 1) as 1 | -1;
        if (this.st > (phase2 ? 0.7 : 1.0)) {
          this.cycle++;
          if (phase2 && this.cycle % 3 === 0) this.go('tossTell');
          else if (Math.abs(dx) > 170 && Math.random() < 0.6) this.go('rushTell');
          else if (Math.abs(dx) < 220) this.go('slamTell');
          else this.go('walk');
        }
        break;
      case 'walk':
        this.facing = (sign(dx) || 1) as 1 | -1; this.vx = this.facing * 90; this.sy = 1 + Math.sin(this.st * 14) * 0.03;
        if (this.st > 1.1 || Math.abs(dx) < 120) this.go(Math.abs(dx) < 160 ? 'slamTell' : 'idle');
        break;
      case 'rushTell': // feet scrape, sparks behind: 0.85 s
        this.rushDir = sign(dx) || 1; this.facing = this.rushDir as 1 | -1; this.sx = 1.12; this.sy = 0.9;
        if (Math.random() < 0.5) g.fx.burst(this.x - this.facing * 26, this.floorY - 2, { n: 1, color: ['#d8cfb8', '#ffffff'], speed: [60, 160], angle: this.facing > 0 ? Math.PI + 0.4 : -0.4, spread: 0.6, size: [1, 2.5], gravity: 600, life: [0.2, 0.4] });
        if (this.st > 0.85) { this.go('rush'); this.sfx(g, 'charge'); }
        break;
      case 'rush':
        this.vx = this.rushDir * 430; this.contactDamage = 1;
        if ((this.rushDir < 0 && this.wallL) || (this.rushDir > 0 && this.wallR)) { g.shake(8, 0.25); this.sfx(g, 'boss-slam'); this.vx = -this.rushDir * 140; this.shield = 0; this.go('stagger'); this.st = 0.4; } // bonks the wall: an opening
        if (this.st > 2.2) this.go('idle');
        break;
      case 'slamTell': // rears up, glows: 0.75 s
        this.facing = (sign(dx) || 1) as 1 | -1; this.sy = 1.25; this.sx = 0.86;
        if (this.st > 0.75) this.slam(g);
        break;
      case 'slam': if (this.st > 0.55) this.go('idle'); break;
      case 'tossTell':
        this.facing = (sign(dx) || 1) as 1 | -1; this.sy = 1.12;
        if (this.st > 0.6) {
          const d = clamp(Math.abs(dx), 100, 520), chunk = new Projectile(this.x + this.facing * 20, this.y - 26, this.facing * d / 1.05, -640, 'enemy', 1, 8, 3, '#d8cfb8');
          chunk.gravityOn = true; g.spawn(chunk); this.sfx(g, 'spit'); this.go('idle');
        }
        break;
      case 'stagger': // shield cracked: dizzy, takes extra cleaning power
        this.contactDamage = 0;
        if (this.st > 1.9) { this.shield = 1; this.contactDamage = 1; this.go('idle'); this.sfx(g, 'shield-block'); }
        break;
    }
    this.physics(g, dt);
  }
  go(s: State) { this.state = s; this.st = 0; }
  sfx(g: Game, n: string) { g.audio.sfx(n, { x: this.x, y: this.y }); }
  wake(g: Game) {
    this.go('wake'); this.hurtable = true; this.contactDamage = 1;
    const r = g.room; this.gates = [];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.grid[y][x] === 'G') { this.gates.push({ x, y }); r.grid[y][x] = '#'; }
    r.rebuild(); this.sfx(g, 'gate-close'); this.sfx(g, 'boss-roar'); g.shake(6, 0.4); this.sy = 1.3; this.sx = 0.82;
    g.ui.areaTitle('The Crust Captain', 'Plain strokes clink off its shield. Finish a combo to crack it.'); g.audio.music('boss');
    this.hook = (ctx, gg) => this.drawBar(ctx, gg); (g as any).hudHooks?.push(this.hook);
  }
  slam(g: Game) {
    this.go('slam'); this.sy = 0.62; this.sx = 1.35; g.shake(7, 0.25); this.sfx(g, 'boss-slam');
    g.fx.burst(this.x, this.floorY - 4, { n: 22, color: ['#d8cfb8', '#b8ad92', '#ffffff'], speed: [80, 320], angle: -Math.PI / 2, spread: 2.6, size: [2, 4.5], gravity: 1100, life: [0.4, 0.8] });
    for (const d of [-1, 1]) g.spawn(new Ripple(this.x + d * 40, this.floorY - 9, d));
  }
  /** The shield faces the knight while it is up: plain front hits clink; heavy hits (finishers, combos, Deep Clean) crack it. */
  override onHit(g: Game, hit: Hit) {
    if (!this.hurtable || this.state === 'dying') return false;
    const fromFront = sign(g.player.x - this.x) === this.facing;
    if (this.shield && fromFront && hit.kind !== 'spell' && this.state !== 'stagger') {
      if (!hit.heavy) {
        const px = this.x + this.facing * (this.hw + 4);
        this.sfx(g, 'shield-block'); g.audio.sfx('clink', { x: px, y: this.y, pitch: 0.8, vol: 0.6 }); g.hitstop(0.04); g.shake(2, 0.08);
        g.fx.burst(px, this.y - 4, { n: 12, color: ['#ffffff', '#FCE300', '#d8cfb8'], shape: 'streak', speed: [180, 480], angle: this.facing > 0 ? 0 : Math.PI, spread: 1.6, size: [1, 2], emissive: true, life: [0.08, 0.2], gravity: 600 });
        g.player.push(this.facing * 300, Math.min(g.player.vy, -60));
        if (!g.save.flags['tip-captain']) { g.save.flags['tip-captain'] = true; g.ui.toast('It clinks off the shield. Chain three strokes for a finisher, or hold slash for a Deep Clean, to crack it. Or jump over and strike from behind.', 6000); }
        return true;
      }
      this.shield = 0; this.go('stagger'); g.audio.sfx('break', { x: this.x, y: this.y }); g.shake(8, 0.22); g.flash([1, 0.95, 0.85], 0.12);
      g.fx.burst(this.x + this.facing * this.hw, this.y - 6, { n: 26, color: ['#d8cfb8', '#ffffff', '#b8ad92'], speed: [120, 420], size: [2, 5], gravity: 1000, shape: 'crumb', spin: 8, life: [0.4, 0.9] });
    }
    const mult = this.state === 'stagger' ? 1.5 : 1;
    const dmg = hit.source && hit.source.team === 'player' ? Math.round(hit.damage * (g.progress?.damageMult(this.faction) ?? 1) * mult) : hit.damage;
    this.hp -= dmg; this.flash = 0.12; (this as any).lastHitAt = g.gameTime; this.sx = 1.08; this.sy = 0.94;
    g.fx.burst(this.x - (hit.dirX || 0) * 20, this.y, { n: 10, color: ['#d8cfb8', '#FF8200', '#ffffff'], speed: [120, 360], angle: Math.atan2(hit.dirY, hit.dirX || 0.001), spread: 1.4, size: [1.5, 3.5], gravity: 900, life: [0.25, 0.6] });
    this.sfx(g, 'boss-hurt');
    const half = this.maxHp / 2;
    if (this.hp + dmg >= half && this.hp < half) { this.sfx(g, 'boss-phase'); g.shake(6, 0.25); }
    if (this.hp <= 0) { this.hp = 0; this.go('dying'); this.hurtable = false; this.contactDamage = 0; g.slowmo(0.35, 0.9); this.sfx(g, 'boss-death'); }
    return true;
  }
  finish(g: Game) {
    this.dead = true; g.setFlag(CAPTAIN_FLAG, true);
    g.save.killed[this.type] = (g.save.killed[this.type] || 0) + 1; g.progress?.onKill(this);
    // the reward: a level-up card on top of the XP
    g.save.progress.points++; (g as any).progress?.queueOpen?.();
    g.fx.burst(this.x, this.y, { n: 60, color: ['#d8cfb8', '#FF8200', '#ffffff', '#8BB8E8'], speed: [100, 560], size: [2, 5], gravity: 900, life: [0.6, 1.4] });
    g.fx.burst(this.x, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [10, 10], grow: 800, emissive: true, life: [0.5, 0.5] });
    g.flash([1, 1, 1], 0.5); g.shake(12, 0.5); g.dropShine(this.x, this.y - 20, this.shine);
    const r = g.room; for (const c of this.gates) r.grid[c.y][c.x] = 'G'; r.rebuild(); this.sfx(g, 'gate-open');
    g.audio.music((g as any).biome?.music ?? null); g.persist();
    const hooks = (g as any).hudHooks as unknown[]; if (this.hook && hooks) hooks.splice(hooks.indexOf(this.hook), 1);
    setTimeout(() => g.ui.toast('The Captain crumbles. You earned a card, and the Sugar Wastes lie ahead.', 5200), 900);
  }
  dispose(g: Game) { const hooks = (g as any).hudHooks as unknown[]; if (this.hook && hooks && hooks.includes(this.hook)) hooks.splice(hooks.indexOf(this.hook), 1); }
  drawBar(ctx: CanvasRenderingContext2D, g: Game) {
    const W = ctx.canvas.width / (ctx.getTransform().a || 1), H = ctx.canvas.height / (ctx.getTransform().d || 1), w = Math.min(420, W - 80), x = (W - w) / 2, y = H - 54;
    ctx.globalAlpha = this.barA; ctx.font = '400 13px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#E8EEF9';
    ctx.fillText('THE CRUST CAPTAIN' + (this.shield ? '' : ' · SHIELD CRACKED'), W / 2, y - 12);
    ctx.fillStyle = 'rgba(6,14,36,0.85)'; ctx.fillRect(x - 2, y - 2, w + 4, 10); ctx.fillStyle = 'rgba(216,207,184,0.35)'; ctx.fillRect(x, y, w * this.hpShown, 6);
    ctx.fillStyle = '#d8cfb8'; ctx.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 6); ctx.globalAlpha = 1; void g;
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const f = this.facing, base = this.floorY, w = 34 * this.sx, h = 56 * this.sy, sleepy = this.state === 'dormant', dizzy = this.state === 'stagger' || this.state === 'dying';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(this.x, base, w * 0.95, 6, 0, 0, TAU); ctx.fill();
    ctx.translate(this.x, base); ctx.scale(f, 1);
    // stubby legs
    ctx.fillStyle = '#6f6650'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * 14 - 6, -12, 12, 12, 4); ctx.fill(); }
    // body: a squat block of tartar, ridged
    ctx.fillStyle = sleepy ? '#8d846c' : '#bfb497'; ctx.beginPath(); ctx.roundRect(-w, -h, w * 2, h - 8, 14); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(-w + 6, -h + 12 + i * 11, w * 2 - 12, 3, 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-w * 0.45, -h + 12, w * 0.35, 4, -0.2, 0, TAU); ctx.fill();
    // captain's crest: a crust of molar cusps on top
    ctx.fillStyle = '#e9e1c8'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 13 - 8, -h + 2); ctx.quadraticCurveTo(i * 13, -h - 14 - (i === 0 ? 6 : 0), i * 13 + 8, -h + 2); ctx.fill(); }
    // eyes under a heavy brow
    ctx.fillStyle = '#5a5240'; ctx.fillRect(-4, -h + 16, w + 2, 5);
    for (const ex of [6, 20]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, -h + 28, 6, sleepy ? 1.2 : 6, 0, 0, TAU); ctx.fill();
      if (!sleepy) { ctx.fillStyle = '#0A1F44'; const px = dizzy ? Math.cos(this.t * 12 + ex) * 2.5 : 2, py = dizzy ? Math.sin(this.t * 12 + ex) * 2.5 : 1; ctx.beginPath(); ctx.arc(ex + px, -h + 28 + py, 2.6, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = '#3d3628'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -h + 42); ctx.lineTo(22, -h + 40); ctx.stroke();
    // the shield: a calcified slab held in front
    if (this.shield) {
      const sx = w - 2, raise = this.state === 'rush' || this.state === 'rushTell' ? -4 : 0;
      ctx.fillStyle = '#d8cfb8'; ctx.beginPath(); ctx.roundRect(sx, -h + 6 + raise, 14, h - 16, 6); ctx.fill();
      ctx.strokeStyle = '#a99e82'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#FF8200'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(sx + 7, -h / 2 + raise, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#a99e82'; for (const [ox, oy] of [[w + 2, -h + 30], [w + 6, -h + 44]]) { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 8, oy + 4); ctx.lineTo(ox + 2, oy + 9); ctx.fill(); }
    }
    ctx.restore();
    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.7, this.flash * 6); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(this.x - w, base - h, w * 2, h - 8, 14); ctx.fill(); ctx.restore(); }
    void g;
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.state === 'dormant') return;
    const cy = this.floorY - 30;
    if (this.state === 'rushTell' || this.state === 'slamTell' || this.state === 'tossTell') g.r.halo(ctx, this.x, cy, 90, this.state === 'rushTell' ? '#FF8200' : '#FCE300', 0.25 + 0.25 * Math.sin(this.t * 30));
    if (this.state === 'stagger') g.r.halo(ctx, this.x, cy - 30, 30, '#8BB8E8', 0.4 + 0.2 * Math.sin(this.t * 10));
  }
  lights(g: Game) { if (this.state !== 'dormant') g.light({ x: this.x, y: this.y, r: 260, color: '#FF8200', i: 0.25 }); }
}

export function registerCaptain(reg: (ch: string, f: (g: Game, x: number, y: number) => CrustCaptain | null) => void) {
  reg('K', (g, x, y) => (g.flag(CAPTAIN_FLAG) ? null : new CrustCaptain(x, y)));
}
