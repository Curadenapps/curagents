// The Glutton: the boss at the end of the Sugar Wastes (room sugar-maw). A huge plaque blob that gorged on sugar until it
// grew a crown of sugar crystals. Fightable with the starting kit: brush, Deep Clean, toothpaste.
//   Phase 1  hop-slam (shockwaves run along the floor: jump them) · spit three sugar globs
//   Phase 2  (below half) adds a rolling charge across the arena and calls small Filmlings
// Every attack has a readable tell: a squash, a glow and a sound.
import { Enemy, Projectile } from '../entity';
import { Legend } from '../registry';
import { TILE } from '../../engine/render';
import { TAU, clamp, sign } from '../../engine/math';
import type { Game, Hit } from '../types';
import { unlockOrder } from '../orders';
import { unlockAllOrders } from '../orders';

type State = 'dormant' | 'wake' | 'idle' | 'hopTell' | 'hop' | 'spitTell' | 'spit' | 'rollTell' | 'roll' | 'dizzy' | 'summon' | 'dying';
const FLAG = 'glutton-defeated';

class Shockwave extends Projectile {
  constructor(x: number, y: number, dir: number) { super(x, y, dir * 330, 0, 'enemy', 1, 11, 1.9, '#FCE300'); this.hh = 12; }
  override update(g: Game, dt: number) {
    super.update(g, dt);
    if (!this.dead && !g.room.solidAt(this.x, this.y + 18)) this.pop(g);
    if (!this.dead && Math.random() < 0.7) g.fx.burst(this.x, this.y + 8, { n: 1, color: ['#FCE300', '#C4D600'], speed: [40, 120], angle: -Math.PI / 2, spread: 1, size: [1.5, 3], gravity: 600, life: [0.2, 0.4] });
  }
  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#d9c400'; ctx.beginPath(); ctx.moveTo(this.x - 16, this.y + 12); ctx.quadraticCurveTo(this.x, this.y - 18, this.x + 16, this.y + 12); ctx.fill();
  }
}

export class Glutton extends Enemy {
  state: State = 'dormant'; st = 0; sx = 1; sy = 1; turn = 0; t = 0; floorY: number; homeX: number;
  gates: { x: number; y: number }[] = []; hpShown = 1; barA = 0; hook: ((ctx: CanvasRenderingContext2D, g: Game) => void) | null = null;
  rollDir = 1; spits = 0; mouth = 0; cycle = 0;
  constructor(x: number, y: number) {
    super('glutton', x, y + TILE / 2 - 40, 46, 40, 120);
    this.floorY = y + TILE / 2; this.homeX = x; this.faction = 'sugar'; this.shine = 60; this.knockResist = 1; this.contactDamage = 1; this.pogo = true;
  }
  override update(g: Game, dt: number) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.st += dt;
    this.sx += (1 - this.sx) * Math.min(1, dt * 8); this.sy += (1 - this.sy) * Math.min(1, dt * 8);
    this.mouth = Math.max(0, this.mouth - dt * 2);
    if (this.hook) this.barA = Math.min(1, this.barA + dt * 2);
    this.hpShown += (this.hp / this.maxHp - this.hpShown) * Math.min(1, dt * 6);
    this.think(g, dt);
  }
  think(g: Game, dt: number) {
    const p = g.player, dx = p.x - this.x;
    if (this.state === 'dormant') {
      this.hurtable = false; this.contactDamage = 0; this.physics(g, dt);
      if (Math.abs(dx) < 420 && p.grounded) this.wake(g);
      return;
    }
    if (this.state === 'dying') { this.vx *= 0.9; this.physics(g, dt); this.sx = 1 + Math.sin(this.st * 40) * 0.05; if (Math.random() < 0.5) g.fx.burst(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 60, { n: 3, color: ['#FCE300', '#F277C6', '#FF8200'], speed: [60, 260], size: [2, 4], gravity: 800, life: [0.3, 0.7] }); if (this.st > 1.6) this.finish(g); return; }
    const phase2 = this.hp < this.maxHp / 2;
    if (this.grounded) this.vx *= Math.exp(-6 * dt);
    switch (this.state) {
      case 'wake': if (this.st > 1.3) this.go('idle'); break;
      case 'idle': {
        this.facing = (sign(dx) || 1) as 1 | -1;
        if (this.st > (phase2 ? 0.85 : 1.15)) {
          this.cycle++;
          const r = Math.random();
          if (phase2 && this.cycle % 5 === 0) this.go('rollTell');
          else if (phase2 && this.cycle % 5 === 2 && g.entities.filter((e) => e.team === 'enemy' && (e as any).type === 'filmling').length < 2) this.go('summon');
          else if (r < 0.55) this.go('hopTell'); else this.go('spitTell');
        }
        break;
      }
      case 'hopTell': this.sy = 0.72; this.sx = 1.22; if (this.st > 0.7) { this.go('hop'); this.vy = -900; this.vx = clamp(dx * 1.3, -380, 380); this.sy = 1.3; this.sx = 0.8; this.sfx(g, 'swoop'); } break;
      case 'hop': if (this.grounded && this.st > 0.15) this.slam(g); break;
      case 'spitTell': this.mouth = Math.min(1, this.st / 0.6); this.facing = (sign(dx) || 1) as 1 | -1; if (this.st > 0.7) { this.go('spit'); this.spits = 0; } break;
      case 'spit': {
        this.mouth = 1;
        const n = phase2 ? 3 : 2; if (this.spits < n && this.st > this.spits * 0.18) {
          const d = clamp(Math.abs(dx), 120, 560), vx = this.facing * (d / 1.1) * (0.7 + this.spits * 0.2);
          const glob = new Projectile(this.x + this.facing * 30, this.y - 16, vx, -620 - this.spits * 40, 'enemy', 1, 9, 3, '#F277C6'); glob.gravityOn = true; g.spawn(glob);
          this.spits++; this.sfx(g, 'spit'); this.sx = 1.1; this.sy = 0.92;
        }
        if (this.st > n * 0.18 + 0.5) this.go('idle');
        break;
      }
      case 'rollTell': this.turn += dt * 6 * this.facing; this.sy = 0.9; this.rollDir = (sign(dx) || 1); if (this.st > 0.9) { this.go('roll'); this.sfx(g, 'charge'); } break; // 0.9 s tell
      case 'roll': {
        this.vx = this.rollDir * 420; this.turn += dt * 12 * this.rollDir; this.contactDamage = 1;
        if ((this.rollDir < 0 && this.wallL) || (this.rollDir > 0 && this.wallR)) { g.shake(10, 0.3); this.sfx(g, 'boss-slam'); this.vx = -this.rollDir * 160; this.contactDamage = 1; this.go('dizzy'); }
        if (this.st > 3) { this.contactDamage = 1; this.go('idle'); }
        break;
      }
      case 'dizzy': if (this.st > 1.6) this.go('idle'); break;
      case 'summon': {
        this.sy = 0.85 + Math.sin(this.st * 20) * 0.05;
        if (this.st > 0.7 && this.st - dt <= 0.7) { const f = Legend['f']; if (f) for (const s of [-1, 1]) { const e = f(g, this.x + s * 90, this.floorY - TILE / 2, g.room); if (e) { e.vy = -300; g.spawn(e); } } this.sfx(g, 'enemy-alert'); }
        if (this.st > 1.1) this.go('idle');
        break;
      }
    }
    this.physics(g, dt);
    if (this.state !== 'roll') this.turn *= Math.exp(-4 * dt);
  }
  go(s: State) { this.state = s; this.st = 0; }
  sfx(g: Game, n: string) { g.audio.sfx(n, { x: this.x, y: this.y }); }
  wake(g: Game) {
    this.go('wake'); this.hurtable = true; this.contactDamage = 1;
    const r = g.room; this.gates = [];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.grid[y][x] === 'G') { this.gates.push({ x, y }); r.grid[y][x] = '#'; }
    r.rebuild(); this.sfx(g, 'gate-close'); this.sfx(g, 'boss-roar'); g.shake(8, 0.5); this.sy = 1.35; this.sx = 0.8;
    g.ui.areaTitle('The Glutton', 'It ate the sugar nobody swept'); g.audio.music('boss');
    this.hook = (ctx, gg) => this.drawBar(ctx, gg); (g as any).hudHooks?.push(this.hook);
  }
  slam(g: Game) {
    this.sy = 0.6; this.sx = 1.4; g.shake(9, 0.3); this.sfx(g, 'boss-slam');
    g.fx.burst(this.x, this.floorY - 4, { n: 30, color: ['#d9c400', '#FCE300', '#9b8a3a'], speed: [80, 360], angle: -Math.PI / 2, spread: 2.6, size: [2, 5], gravity: 1100, life: [0.4, 0.9] });
    for (const d of [-1, 1]) g.spawn(new Shockwave(this.x + d * 50, this.floorY - 12, d));
    this.go('idle');
  }
  override onHit(g: Game, hit: Hit) {
    if (!this.hurtable || this.state === 'dying') return false;
    const dmg = hit.source && hit.source.team === 'player' ? Math.round(hit.damage * (g.progress?.damageMult(this.faction) ?? 1) * (hit.kind === 'spell' ? 1.4 : 1) * (this.state === 'dizzy' ? 1.5 : 1)) : hit.damage;
    this.hp -= dmg; this.flash = 0.12; (this as any).lastHitAt = g.gameTime;
    this.sx = 1.08; this.sy = 0.94;
    g.fx.burst(this.x - (hit.dirX || 0) * 30, this.y, { n: 10, color: ['#FCE300', '#C4D600', '#F277C6'], speed: [120, 380], angle: Math.atan2(hit.dirY, hit.dirX || 0.001), spread: 1.4, size: [1.5, 3.5], gravity: 900, life: [0.25, 0.6] });
    if (hit.kind === 'spell') g.fx.burst(this.x, this.y - 20, { n: 8, color: ['#ffffff', '#CCD8ED'], shape: 'bubble', speed: [40, 160], size: [2, 5], gravity: -80, life: [0.4, 0.9], emissive: true });
    this.sfx(g, 'boss-hurt');
    const half = this.maxHp / 2;
    if (this.hp + dmg >= half && this.hp < half) { this.sfx(g, 'boss-phase'); g.flash([1, 0.95, 0.7], 0.25); g.shake(8, 0.3); this.go('summon'); }
    if (this.hp <= 0) { this.hp = 0; this.go('dying'); this.hurtable = false; this.contactDamage = 0; g.slowmo(0.35, 1.0); this.sfx(g, 'boss-death'); }
    return true;
  }
  finish(g: Game) {
    this.dead = true; g.setFlag(FLAG, true); unlockAllOrders(g); (g as any).progress?.queueOrders?.();
    g.save.killed[this.type] = (g.save.killed[this.type] || 0) + 1; g.progress?.onKill(this);
    g.fx.burst(this.x, this.y, { n: 80, color: ['#FCE300', '#C4D600', '#FF8200', '#F277C6', '#ffffff'], speed: [100, 620], size: [2, 6], gravity: 900, life: [0.6, 1.6] });
    g.fx.burst(this.x, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [10, 10], grow: 900, emissive: true, life: [0.5, 0.5] });
    g.flash([1, 1, 1], 0.6); g.shake(14, 0.6); g.dropShine(this.x, this.y - 20, this.shine);
    const r = g.room; for (const c of this.gates) r.grid[c.y][c.x] = 'G'; r.rebuild(); this.sfx(g, 'gate-open');
    g.audio.music((g as any).biome?.music ?? null); g.persist();
    const hooks = (g as any).hudHooks as unknown[]; if (this.hook && hooks) hooks.splice(hooks.indexOf(this.hook), 1);
    setTimeout(() => g.ui.toast('The Glutton is gone. The way to the Calculus Deep is open.', 6000), 900);
  }
  dispose(g: Game) { const hooks = (g as any).hudHooks as unknown[]; if (this.hook && hooks && hooks.includes(this.hook)) hooks.splice(hooks.indexOf(this.hook), 1); }
  drawBar(ctx: CanvasRenderingContext2D, g: Game) {
    const W = ctx.canvas.width / (ctx.getTransform().a || 1), H = ctx.canvas.height / (ctx.getTransform().d || 1), w = Math.min(520, W - 80), x = (W - w) / 2, y = H - 54;
    ctx.globalAlpha = this.barA; ctx.font = '400 13px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#E8EEF9'; ctx.fillText('THE GLUTTON', W / 2, y - 12);
    ctx.fillStyle = 'rgba(6,14,36,0.85)'; ctx.fillRect(x - 2, y - 2, w + 4, 10); ctx.fillStyle = 'rgba(252,227,0,0.35)'; ctx.fillRect(x, y, w * this.hpShown, 6);
    ctx.fillStyle = '#FCE300'; ctx.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 6); ctx.fillStyle = 'rgba(232,238,249,0.6)'; ctx.fillRect(x + w / 2 - 0.5, y - 2, 1, 10); ctx.globalAlpha = 1; void g;
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    const x = this.x, base = this.y + this.hh, rx = 50 * this.sx, ry = 42 * this.sy, cy = base - ry;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, this.floorY, rx * 0.9, 6, 0, 0, TAU); ctx.fill();
    ctx.translate(x, cy); ctx.rotate(this.turn * 0.05);
    const blob = () => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU, w = 1 + Math.sin(a * 5 + this.t * 3) * 0.03 + Math.sin(a * 3 - this.t * 2) * 0.025; const yy = Math.sin(a) * ry * w; ctx.lineTo(Math.cos(a) * rx * w, a > 0 && a < Math.PI ? Math.min(yy, ry * 0.92) : yy); } ctx.closePath(); };
    blob(); ctx.fillStyle = this.state === 'dormant' ? '#8f8216' : '#d9c400'; ctx.fill();
    ctx.save(); blob(); ctx.clip();
    ctx.fillStyle = '#b8a400'; ctx.beginPath(); ctx.ellipse(rx * 0.35, ry * 0.45, rx, ry * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF8200'; for (const [sx, sy, r] of [[-0.5, 0.2, 7], [0.3, 0.5, 9], [0.6, -0.1, 5], [-0.2, -0.45, 6]]) { ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(sx * rx, sy * ry, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.ellipse(-rx * 0.4, -ry * 0.55, rx * 0.25, ry * 0.12, -0.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
    // crown of sugar crystals
    ctx.fillStyle = '#F277C6'; ctx.strokeStyle = '#E31C79'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { const bx = i * 14, h = 18 + (2 - Math.abs(i)) * 7; ctx.beginPath(); ctx.moveTo(bx - 6, -ry + 6); ctx.lineTo(bx, -ry - h + 6); ctx.lineTo(bx + 6, -ry + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // face
    const f = this.facing, sleepy = this.state === 'dormant', dizzy = this.state === 'dizzy' || this.state === 'dying';
    for (const s of [-1, 1]) {
      const ex = f * 10 + s * 18, ey = -ry * 0.25;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, 11, sleepy ? 1.6 : 12, 0, 0, TAU); ctx.fill();
      if (!sleepy) { ctx.fillStyle = '#0A1F44'; const px = dizzy ? Math.cos(this.t * 12 + s) * 4 : f * 4, py = dizzy ? Math.sin(this.t * 12 + s) * 4 : 2; ctx.beginPath(); ctx.arc(ex + px, ey + py, 5, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = '#3d1020'; const m = this.mouth; ctx.beginPath(); ctx.ellipse(f * 10, ry * 0.25, 16 + m * 6, 3 + m * 13, 0, 0, TAU); ctx.fill();
    if (m > 0.2) { ctx.fillStyle = '#F277C6'; ctx.beginPath(); ctx.ellipse(f * 10, ry * 0.25 + m * 6, 9, 4 * m, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.7, this.flash * 6); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    void g;
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.state === 'dormant') return;
    const cy = this.y + this.hh - 42 * this.sy;
    if (this.state === 'hopTell' || this.state === 'spitTell' || this.state === 'rollTell') g.r.halo(ctx, this.x, cy, 110, this.state === 'spitTell' ? '#F277C6' : '#FCE300', 0.25 + 0.25 * Math.sin(this.t * 30));
    for (const s of [-1, 1]) g.r.halo(ctx, this.x + this.facing * 10 + s * 18, cy - 10, 16, '#ffffff', 0.25);
  }
  lights(g: Game) { if (this.state !== 'dormant') g.light({ x: this.x, y: this.y, r: 320, color: '#FCE300', i: 0.35 }); }
}

export function registerGlutton(reg: (ch: string, f: (g: Game, x: number, y: number) => Glutton | null) => void) {
  reg('Q', (g, x, y) => (g.flag(FLAG) ? null : new Glutton(x, y)));
}
