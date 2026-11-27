// MOTHER CALCULUS, Queen of the Hardened Film. A towering tartar matriarch fused into the floor of
// her throne: a grey, calcified molar crown for a head, two crystal arms, a glowing plaque core.
// She is the backdrop of the arena (no body contact); her fists, shockwaves, shards and calcified floor hurt.
//   Phase 1 (320-221): core open. Fist slams (+ floor shockwaves), shard rain, coughs up Filmlings.
//   Phase 2 (220-111): plates harden over the core. Pogo the plates, or hit the core in the window after
//                      each attack. Adds the crystal rake (a claw sweeping the floor: jump it).
//   Phase 3 (110-0):   desperation. Faster tells (never under 0.4 s), double slams that pin her arms
//                      (core open), double rakes, and floor patches that calcify for a while.
import { TAU, clamp, damp, lerp, sign, easeOut } from '../../engine/math';
import { Biomes } from '../registry';
import type { Entity, Game, Hit, Team } from '../types';
import type { GameCore } from '../game';
import { Filmling } from './filmling';
import { Shard, Shockwave } from './boss-hazards';
import { PAL, emberEye, glint, playerAlive, rand, touchPlayer } from './common';

const MAX_HP = 320, P2_AT = 220, P3_AT = 110;
const FONT = '"Futura LT Pro", Futura, "Century Gothic", sans-serif';
const CORE_Y = 118, SHOULDER = { x: 108, y: 176 };
type State = 'dormant' | 'intro' | 'fight' | 'shift' | 'dying' | 'done';
type AtkKind = 'slam' | 'bigslam' | 'shards' | 'brood' | 'rake' | 'rake2';
interface Attack { kind: AtkKind; t: number; tele: number; side: 1 | -1; tx: number; tx2: number; fired: number; x0: number; x1: number }
interface Arm { side: 1 | -1; x: number; y: number; tx: number; ty: number; rate: number; glow: number; planted: boolean; raking: boolean }
interface Patch { x0: number; x1: number; t: number; warn: number; life: number }
type HudHook = (ctx: CanvasRenderingContext2D, g: GameCore) => void;

/** A hurtable piece of the boss (core, plates, fists). Hits are forwarded. */
class Part implements Entity {
  id = 0; x = 0; y = 0; hw: number; hh: number; vx = 0; vy = 0; dead = false; team: Team = 'enemy'; z = 6;
  hurtable = false; contactDamage = 0; pogo = false;
  boss: MotherCalculus; role: 'core' | 'plate' | 'fist' | 'fx'; idx: number;
  constructor(boss: MotherCalculus, role: Part['role'], idx: number, hw: number, hh: number) { this.boss = boss; this.role = role; this.idx = idx; this.hw = hw; this.hh = hh; }
  update() {}
  draw(ctx: CanvasRenderingContext2D, g: Game) { if (this.role === 'fist') this.boss.drawArm(ctx, g, this.idx); else if (this.role === 'fx') this.boss.drawPatches(ctx); }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { if (this.role === 'fist') this.boss.drawArmEmissive(ctx, g, this.idx); else if (this.role === 'fx') this.boss.drawFloorEmissive(ctx, g); }
  onHit(g: Game, hit: Hit) { return this.boss.partHit(g, this, hit); }
}

export class MotherCalculus implements Entity {
  id = 0; x: number; y: number; hw = 120; hh = 150; vx = 0; vy = 0; dead = false; team: Team = 'neutral'; z = 4;
  hurtable = false; contactDamage = 0; pogo = false;
  type = 'mother-calculus'; faction = 'tartar' as const;
  hp = MAX_HP; maxHp = MAX_HP; shownHp = MAX_HP; chipHp = MAX_HP; barA = 0; barOn = false;
  bx: number; floor: number; arenaL: number; arenaR: number;
  state: State = 'dormant'; st = 0; age = 0; phase = 0;
  gates: { x: number; y: number }[] = []; entry: { x: number; y: number } | null = null;
  atk: Attack | null = null; rest = 1.4; seq = 0; window = 0; slams = 0;
  arms: Arm[]; core!: Part; plates: Part[] = []; fists: Part[] = []; parts: Part[] = [];
  plateHp = [0, 0, 0]; plateCover = 0; coreOpen = 1; regrow = 0;
  minions: Filmling[] = []; hazards: Entity[] = []; patches: Patch[] = [];
  flash = 0; hurtSfx = 0; squint = 0; fizz = 0; rear = 0; mouth = 0; crownGlow = 0; breath = 0; eyeOpen = 0; look = 0;
  cracks: { pts: [number, number][]; at: number }[] = []; crackK = 0; shatter = 0; ended = false;
  hook: HudHook | null = null; roared = false;
  fx!: Part;

  constructor(x: number, y: number, g: Game) {
    const r = g.room, tx = Math.floor(x / 32); let ty = Math.floor(y / 32);
    while (ty < r.h - 1 && !r.solid(tx, ty + 1)) ty++;
    this.floor = (ty + 1) * 32; this.bx = x;
    const blocked = (cx: number) => cx <= 0 || cx >= r.w - 1 || r.solid(cx, ty) || r.at(cx, ty) === 'G';
    let lx = tx; while (!blocked(lx - 1)) lx--; let rx = tx; while (!blocked(rx + 1)) rx++;
    this.arenaL = lx * 32; this.arenaR = (rx + 1) * 32;
    this.x = this.bx; this.y = this.floor - 150;
    for (let yy = 0; yy < r.h; yy++) for (let xx = 0; xx < r.w; xx++) if (r.grid[yy][xx] === 'G') this.gates.push({ x: xx, y: yy });
    this.arms = [-1, 1].map((s) => ({ side: s as 1 | -1, x: this.bx + s * 150, y: this.floor - 14, tx: this.bx + s * 150, ty: this.floor - 14, rate: 6, glow: 0, planted: true, raking: false }));
    // crack network for the death sequence (stable per fight)
    for (let i = 0; i < 9; i++) {
      const pts: [number, number][] = [[0, -CORE_Y]]; let a = (i / 9) * TAU + rand(-0.2, 0.2), px = 0, py = -CORE_Y;
      for (let k = 0; k < 6; k++) { a += rand(-0.5, 0.5); const l = rand(16, 30); px += Math.cos(a) * l; py += Math.sin(a) * l * 1.1; if (py > -6) py = -6; pts.push([px, py]); }
      this.cracks.push({ pts, at: i / 9 * 0.5 });
    }
  }

  // ---------- helpers ----------
  get coreY() { return this.floor - CORE_Y + this.breath * 2 - this.rear * 10; }
  tele(base: number) { return Math.max(0.4, base * (this.phase === 3 ? 0.72 : this.phase === 2 ? 0.92 : 1)); }
  clampX(x: number, pad = 40) { return clamp(x, this.arenaL + pad, this.arenaR - pad); }
  shoulder(i: number) { const s = this.arms[i].side; return { x: this.bx + s * SHOULDER.x, y: this.floor - SHOULDER.y - this.rear * 10 + this.breath * 2 }; }
  restPos(i: number) { const s = this.arms[i].side; return { x: this.clampX(this.bx + s * 150, 30), y: this.floor - 14 }; }
  sfx(g: Game, name: string, o: { vol?: number; pitch?: number; x?: number; y?: number } = {}) { g.audio.sfx(name, { x: o.x ?? this.bx, y: o.y ?? this.coreY, vol: o.vol, pitch: o.pitch }); }
  hudList(g: Game) { return (g as unknown as GameCore).hudHooks; }

  // ---------- life cycle ----------
  update(g: Game, dt: number) {
    this.age += dt; this.st += dt; this.flash = Math.max(0, this.flash - dt); this.squint = Math.max(0, this.squint - dt); this.hurtSfx -= dt;
    this.breath = Math.sin(this.age * 1.4);
    if (!this.parts.length) this.makeParts(g);
    this.shownHp = damp(this.shownHp, this.hp, 14, dt); if (this.chipHp > this.shownHp) this.chipHp = Math.max(this.shownHp, this.chipHp - dt * 30 * (this.chipHp - this.shownHp > 30 ? 3 : 1));
    this.barA = clamp(this.barA + (this.barOn ? dt * 1.6 : -dt * 1.2), 0, 1);
    if (this.fizz > 0) { this.fizz -= dt; if (Math.random() < dt * 40) g.fx.burst(this.bx + rand(-26, 26), this.coreY + rand(-20, 20), { n: 1, color: ['#ffffff', '#CFE3FA', PAL.sky], shape: 'bubble', speed: [20, 90], angle: -Math.PI / 2, spread: 1.4, size: [2, 5], gravity: -100, life: [0.4, 0.9] }); }
    this.minions = this.minions.filter((m) => !m.dead);
    this.hazards = this.hazards.filter((h) => !h.dead);
    switch (this.state) {
      case 'dormant': this.dormant(g); break;
      case 'intro': this.intro(g); break;
      case 'fight': this.fight(g, dt); break;
      case 'shift': this.shift(g, dt); break;
      case 'dying': this.dying(g, dt); break;
      case 'done': break;
    }
    this.updatePatches(g, dt);
    this.updateArms(g, dt);
    this.updateParts(g, dt);
    this.rear = damp(this.rear, this.atk?.kind === 'shards' && this.atk.t < this.atk.tele ? 1 : 0, 6, dt);
    this.mouth = damp(this.mouth, (this.atk?.kind === 'brood' && this.atk.t < this.atk.tele + 0.3) || (this.atk?.kind === 'shards' && this.atk.t < this.atk.tele) || (this.state === 'intro' && this.st > 0.9 && this.st < 2) || this.state === 'shift' || this.state === 'dying' ? 1 : 0, 8, dt);
    this.crownGlow = damp(this.crownGlow, this.atk?.kind === 'shards' && this.atk.t < this.atk.tele + 0.2 ? 1 : this.state === 'shift' ? 0.8 : 0, 8, dt);
    this.eyeOpen = damp(this.eyeOpen, this.state === 'dormant' ? 0 : this.state === 'done' ? 0 : 1, 3, dt);
    this.look = damp(this.look, playerAlive(g) ? clamp((g.player.x - this.bx) / 300, -1, 1) : 0, 4, dt);
  }
  makeParts(g: Game) {
    this.core = g.spawn(new Part(this, 'core', 0, 24, 24));
    this.plates = [0, 1, 2].map((i) => g.spawn(new Part(this, 'plate', i, i === 2 ? 30 : 19, i === 2 ? 12 : 24)));
    this.fists = [0, 1].map((i) => g.spawn(new Part(this, 'fist', i, 28, 16)));
    this.fx = g.spawn(new Part(this, 'fx', 0, 1, 1)); this.fx.team = 'neutral';
    this.parts = [this.core, ...this.plates, ...this.fists, this.fx];
    for (const p of this.parts) p.z = p.role === 'fist' ? 7 : p.role === 'fx' ? 8 : 6;
  }
  dormant(g: Game) {
    const p = g.player; if (!playerAlive(g)) return;
    if (!this.entry) this.entry = { x: p.x, y: p.y };
    const fromGates = this.gates.length ? Math.min(...this.gates.map((c) => Math.abs(p.x - (c.x + 0.5) * 32))) : Math.abs(p.x - this.entry.x);
    const inside = p.x > this.arenaL && p.x < this.arenaR && Math.abs(p.y - (this.floor - 30)) < 260;
    if (inside && (fromGates > 6 * 32 || Math.abs(p.x - this.bx) < 260)) this.begin(g);
  }
  begin(g: Game) {
    this.state = 'intro'; this.st = 0;
    this.setGates(g, true);
    g.ui.areaTitle('Mother Calculus', 'Queen of the Hardened Film');
    g.audio.music('boss');
    this.barOn = true; this.shownHp = this.chipHp = 0;
    this.hook = (ctx, gg) => this.drawBar(ctx, gg);
    this.hudList(g)?.push(this.hook);
  }
  intro(g: Game) {
    if (this.st > 0.9 && !this.roared) { this.roared = true; this.sfx(g, 'boss-roar'); g.shake(12, 1.0); g.flash([1, 0.95, 0.7], 0.25); this.roarDust(g); }
    if (this.st > 2.4) { this.state = 'fight'; this.st = 0; this.phase = 1; this.rest = 0.8; }
  }
  setGates(g: Game, close: boolean) {
    const r = g.room; if (!this.gates.length) return;
    for (const c of this.gates) {
      r.grid[c.y][c.x] = close ? '#' : 'G';
      const cx = (c.x + 0.5) * 32, cy = (c.y + 0.5) * 32;
      g.fx.burst(cx, cy, { n: 10, color: [PAL.bone, PAL.bone2, PAL.bone3], shape: 'square', spin: 12, speed: [60, 240], size: [2, 5], gravity: 900, life: [0.5, 1.1] });
      g.fx.burst(cx, cy, { n: 6, color: ['#8c8574', '#6d6a5e'], speed: [20, 90], size: [3, 6], grow: 8, gravity: -30, drag: 3, life: [0.6, 1.2] });
    }
    r.version++; r.rebuild();
    this.sfx(g, close ? 'gate-close' : 'gate-open', { x: (this.gates[0].x + 0.5) * 32, y: (this.gates[0].y + 0.5) * 32 });
    g.shake(close ? 9 : 5, 0.35);
  }
  roarDust(g: Game) {
    for (let i = 0; i < 14; i++) g.fx.burst(rand(this.arenaL, this.arenaR), this.floor - rand(200, 420), { n: 1, color: [PAL.bone2, PAL.bone3], shape: 'square', spin: 10, speed: [0, 30], angle: Math.PI / 2, size: [1.5, 3], gravity: 600, life: [0.8, 1.4] });
    g.fx.burst(this.bx, this.floor - 172, { n: 1, color: PAL.yellow, shape: 'ring', size: [20, 20], grow: 700, emissive: true, life: [0.5, 0.5] });
  }

  // ---------- fighting ----------
  fight(g: Game, dt: number) {
    this.window = Math.max(0, this.window - dt);
    if (this.atk) { this.runAttack(g, dt); return; }
    this.rest -= dt;
    if (this.rest <= 0 && playerAlive(g)) this.startAttack(g, this.pick());
  }
  pick(): AtkKind {
    const P1: AtkKind[] = ['slam', 'slam', 'shards', 'slam', 'brood', 'slam', 'shards'];
    const P2: AtkKind[] = ['slam', 'rake', 'shards', 'rake', 'slam', 'brood'];
    const P3: AtkKind[] = ['bigslam', 'rake2', 'slam', 'shards', 'bigslam', 'rake2', 'slam'];
    const list = this.phase === 1 ? P1 : this.phase === 2 ? P2 : P3;
    let k = list[this.seq++ % list.length];
    if (k === 'brood' && this.minions.length >= 2) k = 'slam';
    return k;
  }
  startAttack(g: Game, kind: AtkKind) {
    const p = g.player, side = (sign(p.x - this.bx) || 1) as 1 | -1;
    const base: Record<AtkKind, number> = { slam: 0.75, bigslam: 0.8, shards: 0.75, brood: 0.65, rake: 0.75, rake2: 0.75 };
    const a: Attack = { kind, t: 0, tele: this.tele(base[kind]), side, tx: this.clampX(p.x, 46), tx2: 0, fired: 0, x0: 0, x1: 0 };
    this.atk = a;
    switch (kind) {
      case 'slam': this.sfx(g, 'enemy-windup', { pitch: 0.55 }); break;
      case 'bigslam': a.tx = this.clampX(this.bx - 160, 46); a.tx2 = this.clampX(this.bx + 160, 46); this.sfx(g, 'boss-roar', { pitch: 1.1 }); this.sfx(g, 'enemy-windup', { pitch: 0.5 }); break;
      case 'shards': this.sfx(g, 'boss-roar', { pitch: 0.9 }); break;
      case 'brood': this.sfx(g, 'enemy-alert', { pitch: 0.5 }); break;
      case 'rake': case 'rake2':
        a.x0 = this.bx + side * 130; a.x1 = side > 0 ? this.arenaR - 34 : this.arenaL + 34;
        this.sfx(g, 'enemy-windup', { pitch: 0.7 }); this.sfx(g, 'charge', { pitch: 0.7, vol: 0.6 }); break;
    }
  }
  armIdx(side: number) { return side < 0 ? 0 : 1; }
  endAttack(after: number) {
    const k = this.atk?.kind; this.atk = null;
    this.rest = after * (this.phase === 3 ? 0.65 : this.phase === 2 ? 0.85 : 1);
    // phase 2+: after each attack the plates part for a breath (the core window)
    if (this.phase >= 2 && k !== 'bigslam') this.window = this.phase === 2 ? 1.5 : 0.9;
  }
  runAttack(g: Game, dt: number) {
    const a = this.atk!; a.t += dt; const T = a.tele;
    switch (a.kind) {
      case 'slam': {
        const i = this.armIdx(a.side), arm = this.arms[i];
        if (a.t < T) { this.armTo(i, a.tx, this.floor - 250 - Math.sin(a.t * 6) * 6, 7); arm.glow = a.t / T; }
        else if (a.fired === 0) { this.armTo(i, a.tx, this.floor - 16, 60); arm.glow = 1; this.fistHurt(g, i); if (a.t >= T + 0.09) { this.impact(g, a.tx, 1); a.fired = 1; arm.planted = true; } }
        else if (a.t < T + 0.09 + (this.phase === 3 ? 0.4 : 0.6)) { arm.glow = Math.max(0, arm.glow - dt * 3); }
        else { arm.planted = false; this.endAttack(1.1); }
        break;
      }
      case 'bigslam': {
        const L = this.arms[0], R = this.arms[1];
        if (a.t < T) { this.armTo(0, a.tx, this.floor - 270, 7); this.armTo(1, a.tx2, this.floor - 270, 7); L.glow = R.glow = a.t / T; }
        else if (a.fired === 0) {
          this.armTo(0, a.tx, this.floor - 16, 60); this.armTo(1, a.tx2, this.floor - 16, 60); this.fistHurt(g, 0); this.fistHurt(g, 1);
          if (a.t >= T + 0.09) {
            a.fired = 1; this.impact(g, a.tx, 2); this.impact(g, a.tx2, 2); L.planted = R.planted = true; this.slams++;
            g.hitstop(0.08); g.shake(18, 0.5);
            if (this.slams % 2 === 1) this.calcify(g);
          }
        } else if (a.t < T + 0.09 + 1.9) {
          // pinned: arms stuck in the floor, plates gape, she pants. The opening.
          this.window = Math.max(this.window, 0.2); L.glow = R.glow = 0;
          if (Math.random() < dt * 8) g.fx.burst(this.bx + rand(-40, 40), this.floor - 170, { n: 1, color: '#d9d2c2', speed: [10, 40], angle: -Math.PI / 2, spread: 0.6, size: [3, 6], grow: 10, gravity: -40, drag: 2, life: [0.6, 1.1] });
        } else { L.planted = R.planted = false; this.sfx(g, 'break', { pitch: 0.6, vol: 0.7 }); this.endAttack(0.9); }
        break;
      }
      case 'shards': {
        if (a.t >= T && a.fired === 0) { a.fired = 1; this.dropShards(g); g.shake(10, 0.6); this.roarDust(g); }
        if (a.t > T + 1.5) this.endAttack(0.9);
        break;
      }
      case 'brood': {
        if (a.t >= T && a.fired === 0) {
          a.fired = 1; this.sfx(g, 'spit', { pitch: 0.6 });
          for (const s of [-1, 1]) {
            const f = new Filmling(this.bx + s * 20, this.floor - 168 + 13, true);
            f.vx = s * rand(170, 260); f.vy = -rand(260, 380); f.facing = s as 1 | -1; f.state = 'recover'; f.t = 0.2;
            g.spawn(f); this.minions.push(f);
          }
          g.fx.burst(this.bx, this.floor - 168, { n: 20, color: [PAL.yellow, PAL.citrus, '#ffffff'], speed: [60, 260], angle: -Math.PI / 2, spread: 2.6, size: [1.5, 4], gravity: 700, life: [0.4, 0.8] });
        }
        if (a.t > T + 0.8) this.endAttack(0.9);
        break;
      }
      case 'rake': case 'rake2': {
        const i = this.armIdx(a.side), arm = this.arms[i], dur = this.phase === 3 ? 0.4 : 0.5;
        const back = a.kind === 'rake2';
        if (a.t < T) { this.armTo(i, a.x0, this.floor - 22, 8); arm.glow = a.t / T; if (Math.random() < dt * 25) this.rakeSpark(g, arm.x); }
        else if (a.t < T + dur) {
          const k = easeOut((a.t - T) / dur); this.armTo(i, lerp(a.x0, a.x1, k), this.floor - 22, 80); arm.raking = true; arm.glow = 1;
          if (a.fired === 0) { a.fired = 1; this.sfx(g, 'swoop', { pitch: 0.6, x: arm.x }); }
          this.rakeSpark(g, arm.x); this.fistHurt(g, i);
        } else if (back && a.t < T + dur + 0.45) {
          // second rake: holds at the wall, glows again (tell), then drags back
          arm.raking = false; arm.glow = 0.4 + 0.6 * ((a.t - T - dur) / 0.45);
          if (a.fired === 1) { a.fired = 2; this.sfx(g, 'enemy-windup', { pitch: 0.8, x: arm.x }); }
        } else if (back && a.t < T + dur * 2 + 0.45) {
          const k = easeOut((a.t - T - dur - 0.45) / dur); this.armTo(i, lerp(a.x1, a.x0, k), this.floor - 22, 80); arm.raking = true; arm.glow = 1;
          if (a.fired === 2) { a.fired = 3; this.sfx(g, 'swoop', { pitch: 0.55, x: arm.x }); }
          this.rakeSpark(g, arm.x); this.fistHurt(g, i);
        } else {
          arm.raking = false; arm.glow = Math.max(0, arm.glow - dt * 3);
          const done = a.t - T - (back ? dur * 2 + 0.45 : dur);
          const r = this.restPos(i); this.armTo(i, lerp(arm.x, r.x, 0.5), this.floor - 240, 6);
          if (done > 0.55) this.endAttack(1.0);
        }
        break;
      }
    }
  }
  armTo(i: number, x: number, y: number, rate: number) { const a = this.arms[i]; a.rate = rate; a.tx = x; a.ty = y; }
  fistHurt(g: Game, i: number) { const a = this.arms[i]; touchPlayer(g, a.x, a.y - 4, 26, 22, 1, a.x); }
  rakeSpark(g: Game, x: number) { g.fx.burst(x, this.floor - 4, { n: 2, color: ['#ffffff', PAL.yellow, PAL.boneLt], shape: 'streak', speed: [120, 360], angle: -Math.PI / 2, spread: 2.2, size: [1, 1.8], emissive: true, gravity: 900, life: [0.1, 0.3] }); }
  impact(g: Game, x: number, k: number) {
    this.sfx(g, 'boss-slam', { x, y: this.floor }); g.shake(12 * Math.min(1.4, k), 0.35); g.hitstop(0.04);
    const sp = this.phase === 3 ? 430 : this.phase === 2 ? 370 : 330;
    for (const d of [-1, 1]) {
      // in a double slam the inner waves stop under her
      const stop = k === 2 && (x - this.bx) * d < 0 ? this.bx : null;
      this.hazards.push(g.spawn(new Shockwave(x + d * 26, this.floor, d, sp, stop)));
    }
    g.fx.burst(x, this.floor - 6, { n: 22, color: [PAL.bone, PAL.bone2, PAL.bone3], shape: 'square', spin: 16, speed: [120, 420], angle: -Math.PI / 2, spread: 2.2, size: [2, 5], gravity: 1300, life: [0.5, 1.0] });
    g.fx.burst(x, this.floor - 6, { n: 10, color: ['#8c8574', '#6d6a5e'], speed: [40, 200], angle: -Math.PI / 2, spread: 2.8, size: [4, 8], grow: 12, gravity: -40, drag: 3, life: [0.6, 1.2] });
    g.fx.burst(x, this.floor - 6, { n: 1, color: '#ffffff', shape: 'ring', size: [10, 10], grow: 420, emissive: true, life: [0.25, 0.25] });
  }
  dropShards(g: Game) {
    const n = this.phase === 3 ? 9 : this.phase === 2 ? 7 : 6, L = this.arenaL + 40, R = this.arenaR - 40;
    const cols: number[] = []; for (let x = L; x <= R; x += 58) cols.push(x);
    // keep a safe gap of at least ~3 tiles, somewhere random
    const safe = cols[Math.floor(rand(0, cols.length))];
    let pool = cols.filter((x) => Math.abs(x - safe) > 70);
    const p = g.player; pool.sort(() => Math.random() - 0.5);
    pool = pool.slice(0, n);
    if (Math.abs(p.x - safe) > 70 && !pool.some((x) => Math.abs(x - p.x) < 40)) pool[0] = this.clampX(p.x, 40); // one aimed at you
    pool.sort((a, b) => a - b); if (Math.random() < 0.5) pool.reverse();
    const camTop = g.cam.top();
    pool.forEach((x, i) => {
      const top = Math.max(this.ceilAt(g, x) + 6, camTop - 30, this.floor - 520);
      this.hazards.push(g.spawn(new Shard(x + rand(-10, 10), top, this.floor, 0.72 + i * 0.07)));
    });
  }
  ceilAt(g: Game, x: number) { const r = g.room, tx = Math.floor(x / 32); let ty = Math.floor(this.floor / 32) - 1; while (ty > 0 && !r.solid(tx, ty - 1)) ty--; return ty * 32; }
  calcify(g: Game) {
    // two or three patches; never both sides of her at once near the player, always a 4-tile gap
    const W = this.arenaR - this.arenaL, n = W > 800 ? 3 : 2, made: Patch[] = [];
    for (let k = 0; k < 20 && made.length < n; k++) {
      const w = 64 + Math.floor(rand(0, 2)) * 32, x0 = Math.floor(rand(this.arenaL + 32, this.arenaR - 32 - w) / 32) * 32, x1 = x0 + w;
      if (made.some((m) => x0 < m.x1 + 128 && x1 > m.x0 - 128)) continue;
      made.push({ x0, x1, t: 0, warn: 0.85, life: 4.6 });
    }
    this.patches.push(...made);
    this.sfx(g, 'enemy-windup', { pitch: 1.3, y: this.floor });
  }
  updatePatches(g: Game, dt: number) {
    for (const p of this.patches) {
      p.t += dt;
      if (p.t < p.warn) { if (Math.random() < dt * 20) g.fx.burst(rand(p.x0, p.x1), this.floor - 2, { n: 1, color: [PAL.yellow, '#ffffff'], shape: 'streak', speed: [40, 120], angle: -Math.PI / 2, spread: 0.6, emissive: true, size: [1, 1.5], life: [0.15, 0.3] }); continue; }
      if (p.t - dt < p.warn) { this.sfx(g, 'break', { x: (p.x0 + p.x1) / 2, y: this.floor, pitch: 1.4, vol: 0.6 }); g.fx.burst((p.x0 + p.x1) / 2, this.floor - 8, { n: 14, color: [PAL.bone, PAL.boneLt], shape: 'square', spin: 14, speed: [80, 260], angle: -Math.PI / 2, spread: 1.6, size: [1.5, 3.5], gravity: 1100, life: [0.4, 0.8] }); }
      if (p.t < p.warn + p.life) {
        const pl = g.player;
        if (playerAlive(g) && pl.x + pl.hw - 3 > p.x0 && pl.x - pl.hw + 3 < p.x1 && pl.y + pl.hh > this.floor - 18) touchPlayer(g, (p.x0 + p.x1) / 2, this.floor - 9, (p.x1 - p.x0) / 2, 9, 1, pl.x - sign(pl.vx || 1) * 30, false);
      } else if (p.t - dt < p.warn + p.life) g.fx.burst((p.x0 + p.x1) / 2, this.floor - 6, { n: 12, color: [PAL.bone2, PAL.bone3], speed: [40, 160], angle: -Math.PI / 2, spread: 2, size: [2, 4], gravity: 900, life: [0.4, 0.8] });
    }
    this.patches = this.patches.filter((p) => p.t < p.warn + p.life + 0.4);
  }
  updateArms(g: Game, dt: number) {
    for (let i = 0; i < 2; i++) {
      const a = this.arms[i];
      const busy = this.atk && (this.atk.kind === 'bigslam' || (this.armIdx(this.atk.side) === i && this.atk.kind !== 'shards' && this.atk.kind !== 'brood'));
      if (!busy) {
        const r = this.restPos(i), idle = this.state === 'dormant' ? 0 : Math.sin(this.age * 1.7 + i * 2) * 4;
        const lift = this.state === 'shift' ? -200 : 0;
        a.tx = r.x; a.ty = r.y + idle * 0.3 + lift; a.rate = this.state === 'shift' ? 4 : 5; a.glow = Math.max(0, a.glow - dt * 2);
        a.planted = Math.abs(a.y - r.y) < 8 && this.state !== 'dying';
      }
      a.x = damp(a.x, a.tx, a.rate, dt); a.y = damp(a.y, Math.min(this.floor - 14, a.ty), a.rate, dt);
    }
    void g;
  }
  updateParts(g: Game, dt: number) {
    if (!this.parts.length) return;
    const fighting = this.state === 'fight';
    // plates: cover in phase 2/3, part during windows or when all are broken
    const anyPlate = this.plateHp.some((h) => h > 0);
    if (this.phase >= 2 && !anyPlate && this.state === 'fight') { this.regrow += dt; if (this.phase === 2 && this.regrow > 8) { this.plateHp = [4, 4, 4]; this.regrow = 0; this.sfx(g, 'clink', { pitch: 0.6 }); g.fx.burst(this.bx, this.coreY, { n: 24, color: [PAL.bone, PAL.boneLt], speed: [60, 200], size: [1.5, 3], life: [0.4, 0.8], shape: 'square', spin: 10 }); } }
    const openT = this.phase <= 1 || this.window > 0 || !anyPlate || this.state === 'dying' || this.state === 'done' ? 1 : 0;
    const prevOpen = this.coreOpen;
    this.coreOpen = damp(this.coreOpen, openT, openT ? 9 : 6, dt);
    if (prevOpen < 0.5 && this.coreOpen >= 0.5 && this.phase >= 2) this.sfx(g, 'clink', { pitch: 0.7 });
    this.plateCover = damp(this.plateCover, this.phase >= 2 && this.state !== 'done' ? 1 : 0, 3, dt);
    const cy = this.coreY;
    this.core.x = this.bx; this.core.y = cy;
    this.core.hurtable = fighting && this.coreOpen > 0.6;
    const pos = this.platePos();
    this.plates.forEach((p, i) => { p.x = pos[i].x; p.y = pos[i].y; p.hurtable = p.pogo = fighting && this.phase >= 2 && this.plateHp[i] > 0 && this.coreOpen < 0.4 && this.plateCover > 0.8; });
    this.fx.x = g.cam.x; this.fx.y = g.cam.y;
    this.fists.forEach((f, i) => { const a = this.arms[i]; f.x = a.x; f.y = a.y - 4; f.hurtable = f.pogo = a.planted && !a.raking && this.state !== 'dying' && this.state !== 'done'; });
  }
  platePos() {
    const cy = this.coreY, o = this.coreOpen, c = this.plateCover;
    const lift = (1 - c) * 60;
    return [
      { x: this.bx - 19 - o * 44, y: cy + 4 + lift },
      { x: this.bx + 19 + o * 44, y: cy + 4 + lift },
      { x: this.bx, y: cy - 30 - o * 34 - lift },
    ];
  }

  // ---------- taking hits ----------
  partHit(g: Game, part: Part, hit: Hit): boolean {
    if (this.state !== 'fight') return false;
    if (part.role === 'fist') {
      // a planted fist is stone: clank, but you can pogo off it
      this.clank(g, part.x, part.y - 10, hit); return false;
    }
    if (part.role === 'plate') {
      if (hit.kind === 'pogo' || hit.kind === 'spell') {
        const i = part.idx; this.plateHp[i]--;
        g.fx.burst(part.x, part.y - part.hh, { n: 8, color: [PAL.bone, PAL.boneLt, PAL.bone2], shape: 'square', spin: 14, speed: [80, 260], angle: -Math.PI / 2, spread: 2, size: [1.5, 3.5], gravity: 1100, life: [0.4, 0.8] });
        if (this.plateHp[i] <= 0) { this.sfx(g, 'break', { x: part.x, y: part.y }); g.shake(6, 0.2); g.fx.burst(part.x, part.y, { n: 22, color: [PAL.bone, PAL.bone2, PAL.boneLt], shape: 'square', spin: 18, speed: [100, 380], size: [2, 6], gravity: 1200, life: [0.6, 1.2] }); }
        else this.sfx(g, 'clink', { x: part.x, y: part.y, pitch: 0.9 });
        return this.damage(g, hit.kind === 'spell' ? hit.damage * 0.5 : hit.damage, hit, part.x, part.y);
      }
      this.clank(g, part.x, part.y, hit); return false;
    }
    return this.damage(g, hit.damage, hit, this.bx, this.coreY);
  }
  clank(g: Game, x: number, y: number, hit: Hit) {
    this.sfx(g, 'shield-block', { x, y }); g.hitstop(0.04);
    g.fx.burst(x, y, { n: 12, color: ['#ffffff', PAL.yellow, PAL.boneLt], shape: 'streak', speed: [180, 480], angle: Math.atan2(-hit.dirY, -(hit.dirX || 1)), spread: 1.8, size: [1, 2], emissive: true, life: [0.08, 0.2], gravity: 600 });
    if (hit.kind === 'slash') { const s = sign(g.player.x - x) || 1; g.player.push(s * 300, Math.min(g.player.vy, -40)); }
  }
  damage(g: Game, n: number, hit: Hit, x: number, y: number): boolean {
    if (this.state !== 'fight' || n <= 0) return false;
    const floorHp = this.phase === 1 ? P2_AT : this.phase === 2 ? P3_AT : 0;
    this.hp = Math.max(floorHp, this.hp - n); this.flash = 0.12;
    if (this.hurtSfx <= 0) { this.sfx(g, 'boss-hurt', { pitch: 0.9 + Math.random() * 0.2 }); this.hurtSfx = 0.25; }
    this.sfx(g, 'hit', { x, y });
    g.fx.burst(x, y, { n: 12, color: [PAL.yellow, PAL.citrus, PAL.orange], speed: [120, 380], angle: Math.atan2(hit.dirY, hit.dirX || 0.001), spread: 1.6, size: [1.5, 3.5], gravity: 900, life: [0.3, 0.6] });
    g.fx.burst(x, y, { n: 6, color: '#ffffff', shape: 'streak', speed: [250, 520], spread: TAU, size: [1, 2], emissive: true, life: [0.08, 0.18] });
    if (hit.kind === 'spell') { this.squint = 1.1; this.fizz = 1.2; this.sfx(g, 'splash', { pitch: 1.3, vol: 0.6 }); }
    if (this.hp <= 0) this.die(g);
    else if (this.phase === 1 && this.hp <= P2_AT) this.toPhase(g, 2);
    else if (this.phase === 2 && this.hp <= P3_AT) this.toPhase(g, 3);
    return true;
  }
  toPhase(g: Game, n: number) {
    this.phase = n; this.state = 'shift'; this.st = 0; this.atk = null; this.window = 0;
    for (const a of this.arms) { a.planted = false; a.raking = false; a.glow = 0; }
    this.sfx(g, 'boss-phase'); this.sfx(g, 'boss-roar', { pitch: n === 3 ? 1.15 : 1 });
    g.hitstop(0.12); g.slowmo(0.45, 0.6); g.flash([1, 0.95, 0.7], 0.55); g.shake(14, 1.1);
    this.roarDust(g);
    if (n === 2) this.plateHp = [4, 4, 4];
    if (n === 3) {
      // the plates crack and grey; they still cover, but no longer grow back
      this.plateHp = [2, 2, 2];
      g.fx.burst(this.bx, this.coreY, { n: 30, color: [PAL.bone, PAL.boneLt, PAL.bone2], shape: 'square', spin: 18, speed: [100, 420], size: [2, 5], gravity: 1100, life: [0.6, 1.2] });
    }
  }
  shift(g: Game, dt: number) {
    if (Math.random() < dt * 30) g.fx.burst(this.bx + rand(-30, 30), this.coreY + rand(-30, 30), { n: 1, color: [PAL.bone, PAL.boneLt], shape: 'square', speed: [20, 80], size: [1, 2.5], spin: 8, life: [0.4, 0.8], emissive: false, gravity: 300 });
    if (this.st > 2.1) { this.state = 'fight'; this.st = 0; this.rest = 0.6; if (this.phase === 3) this.calcify(g); }
  }

  // ---------- the end ----------
  die(g: Game) {
    this.state = 'dying'; this.st = 0; this.atk = null; this.window = 0; this.patches = [];
    for (const a of this.arms) { a.planted = false; a.raking = false; a.glow = 0; }
    for (const m of this.minions) if (!m.dead && m.dying < 0) m.die(g, { damage: 99, dirX: sign(m.x - this.bx) || 1, dirY: -1, kind: 'hazard' });
    for (const h of this.hazards) h.dead = true;
    for (const p of this.parts) { p.hurtable = false; p.pogo = false; }
    this.sfx(g, 'boss-death'); g.hitstop(0.25); g.slowmo(0.3, 1.4); g.flash([1, 1, 1], 0.9); g.shake(16, 0.8);
    g.save.killed[this.type] = (g.save.killed[this.type] || 0) + 1;
  }
  dying(g: Game, dt: number) {
    this.crackK = clamp(this.st / 2.6, 0, 1);
    if (this.st < 2.8 && Math.floor(this.st * 4) !== Math.floor((this.st - dt) * 4)) {
      const x = this.bx + rand(-110, 110), y = this.floor - rand(30, 280);
      g.fx.burst(x, y, { n: 14, color: [PAL.bone, PAL.bone2, PAL.boneLt], shape: 'square', spin: 16, speed: [80, 300], size: [2, 5], gravity: 1100, life: [0.5, 1.0] });
      g.fx.burst(x, y, { n: 8, color: [PAL.yellow, '#ffffff'], shape: 'streak', speed: [150, 400], emissive: true, size: [1, 2], life: [0.1, 0.3] });
      this.sfx(g, 'break', { x, y, pitch: 0.7 + Math.random() * 0.5 }); g.shake(6 + this.st * 3, 0.2); this.flash = 0.08;
      if (Math.random() < 0.5) g.flash([1, 0.95, 0.6], 0.15 + this.st * 0.06);
    }
    if (this.st >= 2.8 && this.shatter === 0) {
      this.shatter = 0.0001;
      g.flash([1, 1, 0.9], 1); g.shake(24, 1.0); g.hitstop(0.12); this.sfx(g, 'boss-slam', { pitch: 0.6 }); this.sfx(g, 'break', { pitch: 0.5 });
      g.fx.burst(this.bx, this.coreY, { n: 80, color: [PAL.bone, PAL.bone2, PAL.bone3, PAL.boneLt], shape: 'square', spin: 20, speed: [150, 700], size: [2.5, 8], gravity: 1300, life: [0.8, 1.8] });
      g.fx.burst(this.bx, this.coreY, { n: 60, color: [PAL.yellow, PAL.citrus, '#ffffff'], speed: [100, 600], emissive: true, size: [1.5, 3.5], life: [0.6, 1.6], drag: 1.5 });
      g.fx.burst(this.bx, this.coreY, { n: 1, color: '#ffffff', shape: 'ring', size: [20, 20], grow: 1100, emissive: true, life: [0.6, 0.6] });
      g.fx.burst(this.bx, this.coreY, { n: 1, color: PAL.yellow, shape: 'ring', size: [10, 10], grow: 700, emissive: true, life: [0.8, 0.8] });
      g.dropShine(this.bx, this.coreY, 200);
      g.setFlag('calculus-defeated', true); g.persist();
      this.setGates(g, false);
      const def = g.room.def, m = def.music && def.music !== 'boss' ? def.music : (Biomes[def.biome]?.music ?? 'calculus');
      g.audio.music(m);
      this.barOn = false;
    }
    if (this.shatter > 0) this.shatter += dt;
    if (this.st >= 2.8 + 3.0 && !this.ended) {
      this.ended = true; this.removeHook(g); this.state = 'done';
      g.ui.ending();
    }
  }
  removeHook(g: Game) { const l = this.hudList(g); if (this.hook && l) { const i = l.indexOf(this.hook); if (i >= 0) l.splice(i, 1); } this.hook = null; }
  dispose(g: Game) { this.removeHook(g); for (const p of this.parts) p.dead = true; }

  // ---------- drawing ----------
  bodyPath(c: CanvasRenderingContext2D) {
    // a tower of tartar rising out of the floor, crowned by a grey molar with four cusps
    c.beginPath(); c.moveTo(-150, 0);
    c.bezierCurveTo(-140, -40, -128, -90, -124, -140);
    c.bezierCurveTo(-120, -180, -104, -200, -96, -226);
    c.bezierCurveTo(-104, -250, -96, -282, -76, -292); c.quadraticCurveTo(-58, -304, -44, -288);
    c.quadraticCurveTo(-30, -302, -14, -296); c.quadraticCurveTo(0, -310, 14, -296);
    c.quadraticCurveTo(30, -302, 44, -288); c.quadraticCurveTo(58, -304, 76, -292);
    c.bezierCurveTo(96, -282, 104, -250, 96, -226);
    c.bezierCurveTo(104, -200, 120, -180, 124, -140);
    c.bezierCurveTo(128, -90, 140, -40, 150, 0); c.closePath();
  }
  draw(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.shatter > 0) { this.drawRubble(ctx); return; }
    const pad = 340;
    const paint = (c: CanvasRenderingContext2D) => this.drawBody(c, g);
    if (this.flash > 0) {
      // flash only the core region and the plates (a full-body flash would be a wall of white)
      paint(ctx);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, this.flash * 5) * 0.5; ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); ctx.arc(this.bx, this.coreY, 40, 0, TAU); ctx.fill(); ctx.restore();
    } else paint(ctx);
    void pad;
  }
  drawBody(c: CanvasRenderingContext2D, g: Game) {
    const bx = this.bx, fl = this.floor, t = this.age, br = 1 + this.breath * 0.008;
    c.save(); c.translate(bx, fl);
    // fused roots spreading over the floor
    c.fillStyle = PAL.bone4;
    c.beginPath(); c.moveTo(-230, 2); c.quadraticCurveTo(-190, -26, -150, -30); c.lineTo(150, -30); c.quadraticCurveTo(190, -26, 230, 2); c.closePath(); c.fill();
    c.fillStyle = PAL.bone3; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(i * 52, -6, 26, 9, 0, Math.PI, TAU); c.fill(); }
    c.scale(1, br); c.translate(0, -this.rear * 10);
    // body
    this.bodyPath(c);
    const grd = c.createLinearGradient(0, -310, 0, 0);
    const p3 = this.phase === 3 && this.state !== 'dying';
    grd.addColorStop(0, PAL.boneLt); grd.addColorStop(0.18, PAL.bone); grd.addColorStop(0.55, PAL.bone2); grd.addColorStop(1, PAL.bone3);
    c.fillStyle = grd; c.fill();
    // layered sediment bands down the body
    c.save(); this.bodyPath(c); c.clip();
    c.strokeStyle = 'rgba(74,69,56,0.35)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const y = -40 - i * 26; c.beginPath(); c.moveTo(-160, y); c.bezierCurveTo(-60, y - 8 + Math.sin(i) * 6, 60, y + 8, 160, y - 4); c.stroke(); }
    // calcified speckles
    c.fillStyle = 'rgba(74,69,56,0.4)'; for (let i = 0; i < 40; i++) { const x = ((i * 53) % 240) - 120, y = -20 - ((i * 37) % 250); c.beginPath(); c.arc(x, y, 1.2 + (i % 3) * 0.6, 0, TAU); c.fill(); }
    // the enamel cap of her crown, gone grey: lighter, with fissure grooves between the cusps
    c.fillStyle = 'rgba(238,231,211,0.55)'; c.beginPath(); c.ellipse(0, -282, 92, 26, 0, 0, TAU); c.fill();
    c.strokeStyle = PAL.bone3; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-44, -288); c.quadraticCurveTo(-36, -272, -22, -268); c.quadraticCurveTo(-8, -266, 0, -276); c.quadraticCurveTo(8, -266, 22, -268); c.quadraticCurveTo(36, -272, 44, -288);
    c.moveTo(-22, -268); c.lineTo(-28, -256); c.moveTo(22, -268); c.lineTo(28, -256); c.moveTo(0, -276); c.lineTo(0, -294); c.stroke();
    if (p3) { c.strokeStyle = 'rgba(40,34,26,0.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-70, -280); c.lineTo(-58, -262); c.lineTo(-64, -246); c.moveTo(60, -284); c.lineTo(52, -266); c.lineTo(60, -250); c.stroke(); }
    // brow ridge
    c.fillStyle = PAL.bone2; c.beginPath(); c.moveTo(-74, -236); c.quadraticCurveTo(-40, -252, 0, -240); c.quadraticCurveTo(40, -252, 74, -236); c.quadraticCurveTo(40, -240, 0, -232); c.quadraticCurveTo(-40, -240, -74, -236); c.fill();
    // eye sockets
    c.fillStyle = '#2a251c'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 38, -218, 18, 12 * Math.max(0.25, this.eyeOpen), 0, 0, TAU); c.fill(); }
    // mouth seam / open mouth
    const mo = this.mouth;
    c.fillStyle = '#1f1a13'; c.beginPath(); c.moveTo(-42, -172); c.quadraticCurveTo(0, -164 + mo * 22, 42, -172); c.quadraticCurveTo(0, -176 - mo * 4, -42, -172); c.fill();
    if (mo > 0.2) { c.fillStyle = PAL.boneLt; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 10 - 4, -173); c.lineTo(i * 10, -165 + mo * 2); c.lineTo(i * 10 + 4, -173); c.fill(); } }
    // chest cavity
    c.fillStyle = '#2a251c'; c.beginPath(); c.ellipse(0, -CORE_Y, 50, 46, 0, 0, TAU); c.fill();
    c.strokeStyle = PAL.bone3; c.lineWidth = 5; c.stroke();
    // the core (lit part; the glow is emissive)
    const pulse = 1 + Math.sin(t * 3.2) * 0.05 + (this.flash > 0 ? 0.08 : 0);
    const cg = c.createRadialGradient(-6, -CORE_Y - 8, 2, 0, -CORE_Y, 28 * pulse); cg.addColorStop(0, '#FFFBD0'); cg.addColorStop(0.5, PAL.yellow); cg.addColorStop(1, '#C9A814');
    c.fillStyle = cg; c.beginPath(); c.arc(0, -CORE_Y, 26 * pulse, 0, TAU); c.fill();
    c.restore();
    // body outline
    this.bodyPath(c); c.strokeStyle = PAL.bone4; c.lineWidth = 3; c.stroke();
    // death cracks
    if (this.crackK > 0) {
      c.strokeStyle = '#1a150e'; c.lineWidth = 3; c.lineCap = 'round';
      for (const cr of this.cracks) { const k = clamp((this.crackK - cr.at) / 0.5, 0, 1); if (k <= 0) continue; const n = Math.max(1, Math.floor(k * (cr.pts.length - 1))); c.beginPath(); c.moveTo(cr.pts[0][0], cr.pts[0][1]); for (let i = 1; i <= n; i++) c.lineTo(cr.pts[i][0], cr.pts[i][1]); c.stroke(); }
    }
    c.restore();
    // plates over the core
    if (this.plateCover > 0.02) this.drawPlates(c);
    void g;
  }
  drawPlates(c: CanvasRenderingContext2D) {
    const pos = this.platePos(), cv = this.plateCover;
    c.save(); c.globalAlpha = Math.min(1, cv * 1.5);
    pos.forEach((p, i) => {
      if (this.plateHp[i] <= 0) return;
      const top = i === 2, cracked = this.phase === 3 || this.plateHp[i] <= 2;
      c.save(); c.translate(p.x, p.y);
      if (top) {
        // crown cap: four little cusps on top
        c.fillStyle = PAL.bone; c.beginPath(); c.moveTo(-32, 10); c.quadraticCurveTo(-34, -6, -24, -10); c.quadraticCurveTo(-18, -16, -12, -9); c.quadraticCurveTo(-6, -16, 0, -10); c.quadraticCurveTo(6, -16, 12, -9); c.quadraticCurveTo(18, -16, 24, -10); c.quadraticCurveTo(34, -6, 32, 10); c.closePath(); c.fill();
        c.fillStyle = PAL.boneLt; c.fillRect(-26, -7, 52, 3);
        c.strokeStyle = PAL.bone3; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, -9); c.lineTo(-10, 4); c.moveTo(0, -10); c.lineTo(0, 6); c.moveTo(12, -9); c.lineTo(10, 4); c.stroke();
      } else {
        const s = i === 0 ? -1 : 1; c.scale(s, 1);
        c.fillStyle = PAL.bone2; c.beginPath(); c.moveTo(-14, -26); c.quadraticCurveTo(8, -28, 20, -18); c.quadraticCurveTo(24, 4, 14, 26); c.quadraticCurveTo(-4, 30, -16, 24); c.quadraticCurveTo(-22, 0, -14, -26); c.fill();
        c.fillStyle = PAL.bone; c.beginPath(); c.moveTo(-12, -22); c.quadraticCurveTo(6, -24, 15, -15); c.quadraticCurveTo(17, -2, 12, 6); c.quadraticCurveTo(-4, 2, -12, -22); c.fill();
        c.strokeStyle = PAL.bone3; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, -20); c.quadraticCurveTo(0, 0, -6, 22); c.stroke();
      }
      if (cracked) { c.strokeStyle = '#2a251c'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-8, -8); c.lineTo(-2, 0); c.lineTo(-6, 8); c.moveTo(-2, 0); c.lineTo(6, 2); c.stroke(); }
      c.restore();
    });
    c.restore();
  }
  drawRubble(c: CanvasRenderingContext2D) {
    const k = clamp(this.shatter / 1.2, 0, 1), fl = this.floor;
    c.save(); c.translate(this.bx, fl);
    c.fillStyle = PAL.bone4; c.beginPath(); c.moveTo(-230, 2); c.quadraticCurveTo(-190, -26, -150, -30); c.lineTo(150, -30); c.quadraticCurveTo(190, -26, 230, 2); c.closePath(); c.fill();
    // a slumped pile of grey crown pieces
    const h = 140 * (1 - k) + 50;
    c.fillStyle = PAL.bone3; c.beginPath(); c.moveTo(-140, 0); c.quadraticCurveTo(-110, -h, -30, -h - 10); c.quadraticCurveTo(40, -h - 16, 100, -h * 0.6); c.quadraticCurveTo(130, -30, 140, 0); c.closePath(); c.fill();
    c.fillStyle = PAL.bone2; for (let i = 0; i < 6; i++) { const x = -100 + i * 38, y = -h * 0.5 - (i % 2) * 18; c.beginPath(); c.moveTo(x - 16, y + 12); c.lineTo(x - 6, y - 12); c.lineTo(x + 14, y - 6); c.lineTo(x + 12, y + 12); c.closePath(); c.fill(); }
    c.fillStyle = PAL.bone; c.beginPath(); c.moveTo(-60, -h + 4); c.quadraticCurveTo(-50, -h - 22, -36, -h - 6); c.quadraticCurveTo(-24, -h - 24, -10, -h - 4); c.closePath(); c.fill();
    c.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const bx = this.bx, fl = this.floor, t = this.age, cy = this.coreY;
    if (this.shatter > 0) { const k = Math.max(0, 1 - this.shatter / 2); g.r.halo(ctx, bx, cy, 400 * k + 40, PAL.yellow, 0.6 * k + 0.1); return; }
    // core
    const open = this.coreOpen, hurtable = this.core?.hurtable;
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.2);
    g.r.halo(ctx, bx, cy, 150 * pulse, PAL.yellow, 0.35 + 0.35 * open);
    g.r.halo(ctx, bx, cy, 48, '#ffffff', (0.3 + 0.4 * open) * pulse);
    if (hurtable && this.phase >= 2) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 12); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, cy, 34 + Math.sin(t * 6) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    for (let i = 0; i < 2; i++) { const k = ((t * 0.6 + i * 0.5) % 1); ctx.globalAlpha = (1 - k) * 0.4 * open; ctx.strokeStyle = PAL.yellow; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, cy, 28 + k * 40, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // eyes: heavy-lidded amber, hotter in desperation; squeezed shut by paste
    const eo = this.squint > 0.15 ? 0.12 : this.eyeOpen, eyeC = this.phase === 3 ? PAL.orange : PAL.yellow, tele = this.atk && this.atk.t < this.atk.tele ? 0.3 : 0;
    for (const s of [-1, 1]) {
      const ex = bx + s * 38 + this.look * 5, ey = fl - (218 + this.rear * 10) * (1 + this.breath * 0.008);
      if (eo > 0.05) emberEye(ctx, g, ex, ey, 9 + tele * 6, eyeC, 0.75 + tele, eo);
      if (eo > 0.05) { ctx.fillStyle = '#2a1e0c'; ctx.beginPath(); ctx.ellipse(ex + this.look * 3, ey + 1, 2.6, 4.4 * eo, 0, 0, TAU); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    }
    // mouth glow
    if (this.mouth > 0.1) g.r.halo(ctx, bx, fl - 168 - this.rear * 10, 40 + this.mouth * 40, PAL.yellow, this.mouth * 0.6);
    // crown glow (the shard roar tell)
    if (this.crownGlow > 0.02) { for (const x of [-60, -22, 22, 60]) g.r.halo(ctx, bx + x, fl - 296 - this.rear * 10, 40, '#fff3b0', this.crownGlow * 0.7); glint(ctx, g, bx, fl - 312 - this.rear * 10, 14 * this.crownGlow, '#fff6c0', this.crownGlow, t * 2); }
    // death: light leaking through the cracks
    if (this.crackK > 0) {
      ctx.save(); ctx.translate(bx, fl); ctx.strokeStyle = '#fff3b0'; ctx.lineCap = 'round';
      for (const cr of this.cracks) { const k = clamp((this.crackK - cr.at) / 0.5, 0, 1); if (k <= 0) continue; const n = Math.max(1, Math.floor(k * (cr.pts.length - 1))); ctx.lineWidth = 2 + this.crackK * 2; ctx.globalAlpha = 0.6 + 0.4 * Math.random(); ctx.beginPath(); ctx.moveTo(cr.pts[0][0], cr.pts[0][1]); for (let i = 1; i <= n; i++) ctx.lineTo(cr.pts[i][0], cr.pts[i][1]); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
      g.r.halo(ctx, bx, cy, 200 + this.crackK * 200, PAL.yellow, 0.3 + this.crackK * 0.4);
    }
  }
  drawFloorEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.shatter > 0) return;
    const fl = this.floor, t = this.age;
    // telegraph markers on the floor
    const a = this.atk;
    if (a && a.t < a.tele + 0.1) {
      const k = clamp(a.t / a.tele, 0, 1);
      const mark = (x: number) => { g.r.halo(ctx, x, fl - 2, 30 + 40 * k, PAL.yellow, 0.2 + 0.5 * k); ctx.globalAlpha = 0.4 + 0.5 * k; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, fl - 1, 40 - 10 * k, 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; };
      if (a.kind === 'slam') mark(a.tx);
      if (a.kind === 'bigslam') { mark(a.tx); mark(a.tx2); }
      if (a.kind === 'rake' || a.kind === 'rake2') {
        ctx.globalAlpha = 0.25 + 0.45 * k; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 60 * a.side;
        ctx.beginPath(); ctx.moveTo(a.x0, fl - 3); ctx.lineTo(a.x1, fl - 3); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }
    // calcifying floor patches
    for (const p of this.patches) {
      const warn = p.t < p.warn, k = warn ? p.t / p.warn : 1, fade = clamp((p.warn + p.life + 0.4 - p.t) / 0.4, 0, 1);
      g.r.halo(ctx, (p.x0 + p.x1) / 2, fl - 4, (p.x1 - p.x0) * 0.8, PAL.yellow, (warn ? 0.15 + 0.35 * k * (0.6 + 0.4 * Math.sin(t * 30)) : 0.12) * fade);
      if (warn) { ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = p.x0 + 6; x < p.x1 - 4; x += 12) { ctx.moveTo(x, fl - 1); ctx.lineTo(x + 6, fl - 1 - 4 * k); } ctx.stroke(); ctx.globalAlpha = 1; }
    }
  }
  drawPatches(c: CanvasRenderingContext2D) {
    for (const p of this.patches) {
      if (p.t < p.warn) continue;
      const age = p.t - p.warn, grow = clamp(age / 0.12, 0, 1), fade = clamp((p.life + 0.4 - age) / 0.4, 0, 1);
      c.save(); c.globalAlpha = fade;
      for (let x = p.x0 + 4, i = 0; x < p.x1 - 2; x += 9, i++) {
        const h = (12 + ((i * 7) % 9)) * grow * (age > p.life ? 0.6 : 1);
        c.fillStyle = i % 2 ? PAL.bone : PAL.boneLt; c.beginPath(); c.moveTo(x - 4, this.floor); c.lineTo(x + (i % 3) - 1, this.floor - h); c.lineTo(x + 4, this.floor); c.closePath(); c.fill();
      }
      c.fillStyle = PAL.bone3; c.fillRect(p.x0, this.floor - 3, p.x1 - p.x0, 3);
      c.restore();
    }
  }
  // arms are drawn by the fist parts so they stay visible wherever the hand is
  drawArm(c: CanvasRenderingContext2D, g: Game, i: number) {
    if (this.shatter > 0) return;
    const a = this.arms[i], s = this.shoulder(i), side = a.side;
    const { ex, ey } = this.elbow(i);
    const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, col: string) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      c.fillStyle = col; c.beginPath(); c.moveTo(x0 + nx * w0, y0 + ny * w0); c.lineTo(x1 + nx * w1, y1 + ny * w1); c.lineTo(x1 - nx * w1, y1 - ny * w1); c.lineTo(x0 - nx * w0, y0 - ny * w0); c.closePath(); c.fill();
      // crystal facets along the limb
      c.fillStyle = 'rgba(238,231,211,0.7)';
      for (let k = 0.2; k < 0.9; k += 0.25) { const px = x0 + dx * k, py = y0 + dy * k, w = lerp(w0, w1, k); c.beginPath(); c.moveTo(px + nx * w * 0.9, py + ny * w * 0.9); c.lineTo(px + dx / l * 10 + nx * w * 1.25, py + dy / l * 10 + ny * w * 1.25); c.lineTo(px + dx / l * 16 + nx * w * 0.7, py + dy / l * 16 + ny * w * 0.7); c.closePath(); c.fill(); }
    };
    limb(s.x, s.y, ex, ey, 22, 16, PAL.bone3);
    limb(ex, ey, a.x, a.y - 12, 16, 12, PAL.bone2);
    c.fillStyle = PAL.bone3; c.beginPath(); c.arc(ex, ey, 15, 0, TAU); c.fill();
    c.fillStyle = PAL.bone2; c.beginPath(); c.arc(s.x, s.y, 22, 0, TAU); c.fill();
    // fist: a cluster of crystal knuckles
    c.save(); c.translate(a.x, a.y); c.scale(side, 1);
    c.fillStyle = PAL.bone2; c.beginPath(); c.moveTo(-26, 12); c.lineTo(-30, -10); c.lineTo(-14, -26); c.lineTo(10, -26); c.lineTo(28, -12); c.lineTo(26, 12); c.closePath(); c.fill();
    c.fillStyle = PAL.bone; for (let k = 0; k < 4; k++) { const kx = -20 + k * 13; c.beginPath(); c.moveTo(kx - 6, 12); c.lineTo(kx - 7, -2); c.lineTo(kx, -12 - (k % 2) * 4); c.lineTo(kx + 7, -2); c.lineTo(kx + 6, 12); c.closePath(); c.fill(); }
    c.fillStyle = PAL.boneLt; for (let k = 0; k < 4; k++) { const kx = -20 + k * 13; c.beginPath(); c.moveTo(kx - 1, -10 - (k % 2) * 4); c.lineTo(kx + 5, -2); c.lineTo(kx + 1, 0); c.closePath(); c.fill(); }
    c.restore();
    void g;
  }
  drawArmEmissive(c: CanvasRenderingContext2D, g: Game, i: number) {
    if (this.shatter > 0) return;
    const a = this.arms[i];
    if (a.glow > 0.02) { g.r.halo(c, a.x, a.y - 8, 50 + a.glow * 50, PAL.yellow, a.glow * 0.7); glint(c, g, a.x + a.side * 10, a.y - 24, 6 + a.glow * 10, '#fff6c0', a.glow, this.age * 3); }
    if (a.raking) g.r.halo(c, a.x, this.floor - 6, 60, '#ffffff', 0.35);
  }
  elbow(i: number) {
    const a = this.arms[i], s = this.shoulder(i), side = a.side;
    const dx = a.x - s.x, dy = a.y - 12 - s.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.max(1, d / 250), L1 = 130 * k, L2 = 130 * k;
    const dd = clamp(d, 20, L1 + L2 - 1), cosA = clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1), al = Math.acos(cosA), base = Math.atan2(dy, dx);
    const c1 = { ex: s.x + Math.cos(base + al) * L1, ey: s.y + Math.sin(base + al) * L1 }, c2 = { ex: s.x + Math.cos(base - al) * L1, ey: s.y + Math.sin(base - al) * L1 };
    // elbow bends up and outward
    const score = (e: { ex: number; ey: number }) => side * (e.ex - s.x) - (e.ey - s.y) * 0.8;
    return score(c1) > score(c2) ? c1 : c2;
  }
  lights(g: Game) {
    if (this.shatter > 1.5) return;
    const open = this.coreOpen;
    g.light({ x: this.bx, y: this.coreY, r: 300 + 80 * open, color: PAL.yellow, i: 0.55 + 0.35 * open });
    g.light({ x: this.bx, y: this.floor - 220, r: 160, color: this.phase === 3 ? PAL.orange : '#e8d9a0', i: 0.35 * this.eyeOpen });
    for (const a of this.arms) if (a.glow > 0.05) g.light({ x: a.x, y: a.y - 10, r: 160, color: PAL.yellow, i: a.glow * 0.8 });
  }

  // ---------- boss bar (HUD hook) ----------
  drawBar(c: CanvasRenderingContext2D, g: GameCore) {
    if (this.barA <= 0.01) return;
    const m = c.getTransform(), vw = c.canvas.width / (m.a || 1), vh = c.canvas.height / (m.d || 1);
    const W = Math.min(560, vw * 0.6), x0 = vw / 2 - W / 2, y = vh - 52, H = 9, a = easeOut(this.barA);
    c.globalAlpha = a;
    // name
    c.font = '400 14px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#F3F6FC';
    const name = 'MOTHER CALCULUS'; let tx = vw / 2 - (c.measureText(name).width + name.length * 3) / 2;
    c.textAlign = 'left'; for (const ch of name) { c.fillText(ch, tx, y - 12); tx += c.measureText(ch).width + 3; }
    // frame
    c.fillStyle = 'rgba(6,14,36,0.85)'; c.beginPath(); c.roundRect(x0 - 4, y - 4, W + 8, H + 8, 7); c.fill();
    c.strokeStyle = 'rgba(139,184,232,0.9)'; c.lineWidth = 1.2; c.stroke();
    // chip (recent damage) and fill
    const fr = clamp(this.shownHp / MAX_HP, 0, 1), ch = clamp(this.chipHp / MAX_HP, 0, 1);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.roundRect(x0, y, W * ch, H, 4); c.fill();
    const grd = c.createLinearGradient(0, y, 0, y + H); grd.addColorStop(0, '#FFF7B0'); grd.addColorStop(0.5, '#FCE300'); grd.addColorStop(1, '#E0B800');
    c.fillStyle = grd; c.beginPath(); c.roundRect(x0, y, W * fr, H, 4); c.fill();
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * 5})`; c.beginPath(); c.roundRect(x0, y, W * fr, H, 4); c.fill(); }
    // phase notches
    c.fillStyle = '#003DA5'; for (const v of [P2_AT, P3_AT]) { const nx = x0 + W * v / MAX_HP; c.fillRect(nx - 1.5, y - 3, 3, H + 6); }
    c.fillStyle = '#8BB8E8'; for (const v of [P2_AT, P3_AT]) { const nx = x0 + W * v / MAX_HP; c.beginPath(); c.moveTo(nx, y - 7); c.lineTo(nx + 3, y - 3); c.lineTo(nx - 3, y - 3); c.closePath(); c.fill(); }
    // little enamel crowns on the ends
    for (const s of [-1, 1]) {
      const cx = vw / 2 + s * (W / 2 + 16), cy = y + H / 2;
      c.fillStyle = '#F3F6FC'; c.beginPath(); c.moveTo(cx - 7, cy + 5); c.lineTo(cx - 8, cy - 3); c.quadraticCurveTo(cx - 6, cy - 7, cx - 3, cy - 4); c.quadraticCurveTo(cx, cy - 7, cx + 3, cy - 4); c.quadraticCurveTo(cx + 6, cy - 7, cx + 8, cy - 3); c.lineTo(cx + 7, cy + 5); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    void g;
  }
}
