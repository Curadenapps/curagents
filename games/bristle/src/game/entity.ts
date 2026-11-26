// Base classes. Actor = a body that moves against the tile grid. Enemy = an Actor with health,
// hit reactions, death and drops. Content modules extend these.
import { TILE } from '../engine/render';
import { clamp, sign, TAU } from '../engine/math';
import type { Entity, Faction, Game, Hit, Team } from './types';
import { particle as PT } from '../design/tokens';

export abstract class Actor implements Entity {
  id = 0; x: number; y: number; hw: number; hh: number; vx = 0; vy = 0;
  dead = false; team: Team = 'neutral'; z = 10; hurtable = false; contactDamage = 0; pogo = false;
  grounded = false; wasGrounded = false; wallL = false; wallR = false; ceiling = false;
  gravity = 2400; maxFall = 900; collide = true; passSlits = false; dropThrough = false;
  constructor(x: number, y: number, hw: number, hh: number) { this.x = x; this.y = y; this.hw = hw; this.hh = hh; }
  abstract update(g: Game, dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, g: Game): void;

  /** Apply gravity and move against the grid, axis by axis. */
  physics(g: Game, dt: number, useGravity = true) {
    if (useGravity) this.vy = Math.min(this.maxFall, this.vy + this.gravity * dt);
    this.wasGrounded = this.grounded;
    if (!this.collide) { this.x += this.vx * dt; this.y += this.vy * dt; return; }
    this.moveX(g, this.vx * dt); this.moveY(g, this.vy * dt);
    // wall probes
    const r = g.room, top = Math.floor((this.y - this.hh + 2) / TILE), bot = Math.floor((this.y + this.hh - 2) / TILE);
    const lx = Math.floor((this.x - this.hw - 1) / TILE), rx = Math.floor((this.x + this.hw + 1) / TILE);
    this.wallL = this.wallR = false;
    for (let ty = top; ty <= bot; ty++) { if (r.solid(lx, ty, this.passSlits)) this.wallL = true; if (r.solid(rx, ty, this.passSlits)) this.wallR = true; }
  }
  moveX(g: Game, dx: number) {
    const r = g.room, steps = Math.ceil(Math.abs(dx) / (TILE * 0.45)) || 1, s = dx / steps;
    for (let i = 0; i < steps; i++) {
      this.x += s;
      const top = Math.floor((this.y - this.hh + 0.5) / TILE), bot = Math.floor((this.y + this.hh - 0.5) / TILE);
      const edge = s > 0 ? this.x + this.hw : this.x - this.hw, tx = Math.floor(edge / TILE);
      for (let ty = top; ty <= bot; ty++) if (r.solid(tx, ty, this.passSlits)) {
        this.x = s > 0 ? tx * TILE - this.hw - 0.01 : (tx + 1) * TILE + this.hw + 0.01; this.vx = 0; this.onWall(g, sign(s)); return;
      }
    }
  }
  moveY(g: Game, dy: number) {
    const r = g.room, steps = Math.ceil(Math.abs(dy) / (TILE * 0.45)) || 1, s = dy / steps;
    this.grounded = false; this.ceiling = false;
    for (let i = 0; i < steps; i++) {
      const prevBottom = this.y + this.hh; this.y += s;
      const l = Math.floor((this.x - this.hw + 0.5) / TILE), rr = Math.floor((this.x + this.hw - 0.5) / TILE);
      const edge = s > 0 ? this.y + this.hh : this.y - this.hh, ty = Math.floor(edge / TILE);
      for (let tx = l; tx <= rr; tx++) {
        const solid = r.solid(tx, ty, this.passSlits), ledge = s > 0 && !this.dropThrough && r.oneWay(tx, ty) && prevBottom <= ty * TILE + 0.5;
        if (solid || ledge) {
          if (s > 0) { this.y = ty * TILE - this.hh - 0.01; this.grounded = true; } else { this.y = (ty + 1) * TILE + this.hh + 0.01; this.ceiling = true; }
          this.vy = 0; return;
        }
      }
    }
    // standing still on the ground: probe one unit below so grounded stays true
    if (dy >= 0 && !this.grounded) {
      const l = Math.floor((this.x - this.hw + 0.5) / TILE), rr = Math.floor((this.x + this.hw - 0.5) / TILE), ty = Math.floor((this.y + this.hh + 1) / TILE);
      for (let tx = l; tx <= rr; tx++) if (r.solid(tx, ty, this.passSlits) || (!this.dropThrough && r.oneWay(tx, ty) && Math.abs(this.y + this.hh - ty * TILE) < 1.5)) { this.grounded = true; break; }
    }
  }
  onWall(_g: Game, _dir: number) {}
}

/** A hostile creature. Subclasses implement think() and draw(); everything else is shared. */
export abstract class Enemy extends Actor {
  hp: number; maxHp: number;
  type: string;            // bestiary id
  faction: Faction = 'plaque';
  shine = 3;               // currency dropped on death
  flash = 0;               // white hit flash timer
  stun = 0;                // seconds of hit-stagger
  knockResist = 0;         // 0 = full knockback, 1 = none
  facing: 1 | -1 = -1;
  age = 0;
  override team: Team = 'enemy';
  override hurtable = true;
  override contactDamage = 1;
  override pogo = true;
  constructor(type: string, x: number, y: number, hw: number, hh: number, hp: number) { super(x, y, hw, hh); this.type = type; this.hp = this.maxHp = hp; }
  update(g: Game, dt: number) {
    this.age += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.stun > 0) { this.stun -= dt; this.vx *= Math.exp(-8 * dt); this.physics(g, dt); return; }
    this.think(g, dt);
  }
  abstract think(g: Game, dt: number): void;
  onHit(g: Game, hit: Hit): boolean {
    if (this.dead) return false;
    const dmg = hit.source && (hit.source.team === 'player') ? Math.round(hit.damage * (g.progress?.damageMult(this.faction) ?? 1)) : hit.damage;
    this.hp -= dmg; this.flash = 0.12;
    (this as any).lastHitAt = g.gameTime;
    const k = (1 - this.knockResist) * (hit.heavy ? 1.6 : 1);
    if (k > 0) { this.vx = hit.dirX * 380 * k; if (hit.dirY) this.vy = hit.dirY * 260 * k; this.stun = 0.12 * k; }
    g.fx.burst(this.x, this.y, { n: 10, speed: [120, 380], angle: Math.atan2(hit.dirY, hit.dirX || 0.001), spread: 1.4, color: this.bloodColor(), size: [1.5, 3.2], gravity: 900, shape: 'crumb', spin: 8, life: [0.25, 0.6] });
    g.fx.burst(this.x, this.y, { ...PT.spark, angle: Math.atan2(hit.dirY, hit.dirX || 0.001) });
    g.audio.sfx('hit', { x: this.x, y: this.y });
    if (this.hp <= 0) this.die(g, hit);
    return true;
  }
  /** Splatter colour: plaque is yellow-green, tartar is bone. Override per type. */
  bloodColor(): string | string[] { return ['#FCE300', '#C4D600', '#FF8200']; }
  die(g: Game, hit: Hit) {
    this.dead = true;
    g.save.killed[this.type] = (g.save.killed[this.type] || 0) + 1;
    g.progress?.onKill(this);
    g.fx.burst(this.x, this.y, { n: 26, speed: [80, 460], color: this.bloodColor(), size: [2, 4.5], gravity: 1000, shape: 'crumb', spin: 10, life: [0.4, 1.0], drag: 1.5 });
    g.fx.burst(this.x, this.y, { n: 1, speed: [0, 0], color: '#ffffff', shape: 'ring', size: [6, 6], grow: 260, emissive: true, life: [0.25, 0.25] });
    g.audio.sfx('kill', { x: this.x, y: this.y });
    g.shake(5, 0.15);
    if (this.shine) g.dropShine(this.x, this.y, this.shine);
    void hit;
  }
  /** Draw helper: tint the whole silhouette white while flashing. Wrap your draw in begin/endFlash. */
  protected withFlash(ctx: CanvasRenderingContext2D, draw: () => void) {
    draw();
    if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = Math.min(1, this.flash * 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x - this.hw * 3, this.y - this.hh * 3, this.hw * 6, this.hh * 6); ctx.restore(); }
  }
  /** Distance to the player along x (signed) and y. */
  toPlayer(g: Game) { return { dx: g.player.x - this.x, dy: g.player.y - this.y, d: Math.hypot(g.player.x - this.x, g.player.y - this.y) }; }
}

/** Shine: the currency. Pops out, bounces, then flies to the player. */
export class Shine extends Actor {
  value: number; t = 0;
  constructor(x: number, y: number, value: number) { super(x, y, 5, 5); this.value = value; this.vx = (Math.random() - 0.5) * 360; this.vy = -260 - Math.random() * 280; this.z = 15; this.gravity = 1700; }
  update(g: Game, dt: number) {
    this.t += dt; const p = g.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    if (this.t > 0.45 && d < 150) { this.collide = false; this.vx += (dx / d) * 2600 * dt; this.vy += (dy / d) * 2600 * dt; this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt; }
    else { const vy = this.vy; this.physics(g, dt); if (this.grounded && vy > 120) this.vy = -vy * 0.45; this.vx *= this.grounded ? 0.86 : 0.995; }
    if (d < 20 && this.t > 0.3) { this.dead = true; g.save.shine += this.value; g.audio.sfx('shine', { pitch: 0.9 + Math.random() * 0.25, vol: 0.5 }); g.fx.burst(this.x, this.y, PT.shine); }
    if (this.t > 20) this.dead = true;
  }
  draw() {}
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const s = 4 + Math.sin(this.t * 9) * 0.8; g.r.halo(ctx, this.x, this.y, 16, '#FCE300', 0.5);
    ctx.fillStyle = '#FFF6B0'; ctx.beginPath(); ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x + s * 0.7, this.y); ctx.lineTo(this.x, this.y + s); ctx.lineTo(this.x - s * 0.7, this.y); ctx.closePath(); ctx.fill();
  }
}

/** Short-lived damaging thing: enemy spit, player spell. Override draw/emissive as needed. */
export class Projectile extends Actor {
  life: number; damage: number; radius: number; color: string; pierce = false; hitIds = new Set<number>(); gravityOn = false; kind: 'spell' | 'projectile';
  constructor(x: number, y: number, vx: number, vy: number, team: Team, damage: number, radius: number, life: number, color: string) {
    super(x, y, radius, radius); this.vx = vx; this.vy = vy; this.team = team; this.damage = damage; this.radius = radius; this.life = life; this.color = color; this.z = 25;
    this.kind = team === 'player' ? 'spell' : 'projectile';
  }
  update(g: Game, dt: number) {
    this.life -= dt; if (this.life <= 0) { this.pop(g); return; }
    if (this.gravityOn) this.vy += 1400 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (g.room.solidAt(this.x, this.y)) { this.pop(g); return; }
    if (this.team === 'enemy') {
      const p = g.player; if (Math.abs(p.x - this.x) < p.hw + this.radius && Math.abs(p.y - this.y) < p.hh + this.radius) { g.hurtPlayer(this.damage, this.x, 'projectile'); this.pop(g); }
    } else {
      for (const e of g.entities) {
        if (e.dead || !e.hurtable || e.team !== 'enemy' || this.hitIds.has(e.id)) continue;
        if (Math.abs(e.x - this.x) < e.hw + this.radius && Math.abs(e.y - this.y) < e.hh + this.radius) {
          this.hitIds.add(e.id); e.onHit?.(g, { damage: this.damage, dirX: sign(this.vx) || 1, dirY: 0, kind: 'spell', source: this });
          if (!this.pierce) { this.pop(g); return; }
        }
      }
    }
  }
  pop(g: Game) { this.dead = true; g.fx.burst(this.x, this.y, { n: 12, color: this.color, speed: [60, 240], size: [1.5, 3], life: [0.2, 0.5], gravity: 600 }); }
  draw(ctx: CanvasRenderingContext2D) { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, TAU); ctx.fill(); }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y, this.radius * 4, this.color, 0.55); }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: this.radius * 9, color: this.color, i: 0.8 }); }
}

export const clampToRoom = (g: Game, e: Entity) => { e.x = clamp(e.x, e.hw, g.room.pw - e.hw); };
