// Bristle, the last knight of the Order of the 5,460. Movement, blade, Prime dash, Floss grip,
// rinse spell, focus heal, and the procedural drawing (enamel helm, Curaprox-blue cloak, brush-blade).
import { Actor, Projectile } from './entity';
import { TILE } from '../engine/render';
import { approach, clamp, damp, sign, TAU, lerp } from '../engine/math';
import type { Game, PlayerApi, Hit, HitKind } from './types';
import { brand as BR, particle as PT } from '../design/tokens';
import { ART, ORDER_STATS, currentOrder, type OrderId } from './orders';
import { drawRig, RIG, RIG_SCALE, type RigPose } from '../design/hero';
import { RefillShot, LOAD, DRAW, POWER, ammo, setAmmo, selectedSize, usable, cycleSize, drawHeld } from './shot';
import { singleTuft, sonicLance, DUELIST_TUFTS } from '../design/hero';

export const C = { blue: BR.blue, blueDk: BR.blueDark, blue80: BR.blue80, blue60: BR.blue60, sky: '#8BB8E8', white: '#FFFFFF', enamel: '#F3F6FC', enamelShade: '#C7D3EA', ink: '#0A1F44', ink2: '#132B57', cerise: BR.cerise, yellow: '#FCE300', orange: '#FF8200', orchid: '#F277C6', lime: '#C4D600' };

export const BRUSH: Record<string, string> = { cerise: BR.cerise, blue: BR.blue80, lime: '#C4D600', orange: '#FF8200', sky: '#8BB8E8' };
const brushColour = (g: Game) => BRUSH[String(g.save.flags['brush-colour'] ?? 'cerise')] ?? BRUSH.cerise;

const RUN = 300, ACC_G = 5200, ACC_A = 3400, JUMP_V = 830, GRAV_UP = 2500, GRAV_DOWN = 3100, MAX_FALL = 820;
const COYOTE = 0.09, JUMP_BUF = 0.13, ATK_CD = 0.36, DASH_T = 0.19, DASH_V = 820, DASH_CD = 0.5;
const FOCUS_COST = 33, SPELL_COST = 33, PASTE_COST = 25, FOCUS_T = 0.92, CHARGE_T = 0.6;

type SlashDir = 'side' | 'up' | 'down';
interface Slash { dir: SlashDir; t: number; hit: Set<number>; cells: Set<number>; flip: number; landed: boolean; heavy?: boolean }

/** Crawl pose: torso tip (radians), hip height above the floor and how far the hip sits behind centre (px). */
const CRAWL_A = 1.0, CRAWL_HIP = 9, CRAWL_BACK = 12;

export class Player extends Actor implements PlayerApi {
  facing: 1 | -1 = 1;
  hp = 5; maxHp = 5; fluor = 0;
  /** Seconds of post-hit blinking. Separate from invuln, which menus and dialogue also hold up (you stay visible). */
  hurtBlink = 0;
  invuln = 0; dashing = false; inflamed = 0; combo = 0; comboT = 0; airDashes = 1; dashHits = new Set<number>();
  override team = 'player' as const; override z = 20;
  // timers
  coyote = 0; atkCd = 0; dashT = 0; dashCd = 0; airDash = true; hurtT = 0; recoilT = 0; wallLock = 0; landT = 0; focusT = 0; spellT = 0; stepT = 0;
  slash: Slash | null = null; throwT = 0;
  /** Seconds the shot has been held (load, then draw); -1 when not aiming. */
  shotT = -1;
  /** Aim angle of the shot in world space (radians; 0 = right, negative = up). */
  aimA = 0;
  /** The Order worn (armour set), refreshed every update from the save. */
  ord: OrderId = 'initiate';
  /** Seconds the blade button has been held after a slash (charges the Deep Clean). */
  charge = 0; charged = false;
  /** Without the Floss Grip relic you still get one wall jump per jump; the relic makes it unlimited and adds the slide. */
  wallJumps = 1; lastWall = 0; workT = 0;
  /** Crouching: hold Down on the ground to duck under low gaps (hitbox 26 tall instead of 42). */
  crouching = false; crouchK = 1; lastSlash: SlashDir = 'side'; slashFlip = 1;
  wallSlide = 0; // -1 left wall, 1 right wall
  jumpHeld = false; deadT = -1; hazardT = -1;
  safe = { x: 0, y: 0 };
  // look
  sx = 1; sy = 1; runPhase = 0; lean = 0; bladeA = 0;
  cloak: { x: number; y: number; px: number; py: number }[] = [];
  ghosts: { x: number; y: number; f: number; t: number }[] = [];

  constructor(x: number, y: number) { super(x, y, 10, 21); this.maxFall = MAX_FALL; this.safe = { x, y }; for (let i = 0; i < 6; i++) this.cloak.push({ x, y: y - 6 + i * 4, px: x, py: y - 6 + i * 4 }); }

  // ---- PlayerApi ----
  push(vx: number, vy: number) { this.vx = vx; this.vy = vy; this.recoilT = 0.12; }
  bounce(strength = 1) { this.vy = -720 * strength; this.airDash = true; this.jumpHeld = false; }
  heal(n: number) { this.hp = Math.min(this.maxHp, this.hp + n); }
  gainFluor(n: number) { const d = (this.g as any)?.diff?.fluor ?? 1; this.fluor = clamp(this.fluor + (n > 0 ? n * d * (this.inflamed > 0 ? 0.5 : 1) : n), 0, 99); }
  inflame(seconds: number) { if (!this.g) return; const g = this.g, m = g.progress.masteryLevel('gum'); const k = (g.progress.has('c2') ? 0.5 : 1) * (m >= 4 ? 0 : m >= 2 ? 0.6 : 1); if (k <= 0) return; this.inflamed = Math.max(this.inflamed, seconds * k); }
  private g: Game | null = null;
  resetCloak() { for (let i = 0; i < this.cloak.length; i++) { const c = this.cloak[i]; c.x = c.px = this.x; c.y = c.py = this.y - 6 + i * 4; } }

  hurt(g: Game, dmg: number, fromX: number, kind: HitKind = 'contact') {
    if (this.invuln > 0 || this.deadT >= 0 || this.hazardT >= 0) return;
    if (kind === 'projectile' && this.dashing && ORDER_STATS[this.ord].guard) { g.audio.sfx('clink'); g.fx.burst(this.x + this.facing * 12, this.y - 6, { ...PT.cleanGlint, n: 2 }); return; }
    this.hp -= dmg; this.invuln = (g as any).diff?.invuln ?? 1.3; this.charge = 0; this.hurtT = 0.24; this.slash = null; this.focusT = 0; this.dashT = 0; this.dashing = false;
    const dir = sign(this.x - fromX) || -this.facing; this.vx = dir * 340; this.vy = -430;
    g.hitstop(0.14); g.shake(11, 0.32); g.flash([1, 1, 1], 0.4); g.slowmo(0.35, 0.28); g.audio.sfx('hurt');
    g.fx.burst(this.x, this.y, PT.hurtShards);
    g.fx.burst(this.x, this.y, { n: 1, color: '#ffffff', shape: 'ring', size: [8, 8], grow: 420, emissive: true, life: [0.3, 0.3] });
    if (kind === 'hazard') { this.hazardT = 0; this.invuln = 1.6; }
    this.hurtBlink = this.invuln;
    if (this.hp <= 0) { this.hp = 0; this.deadT = 0; g.slowmo(0.25, 0.8); g.audio.sfx('death'); }
  }

  update(g: Game, dt: number) {
    this.g = g; this.ord = currentOrder(g); const inp = g.input, busy = g.busy() || g.ui.isOpen() || this.workT > 0; const perk = (id: string) => g.progress.has(id);
    this.inflamed = Math.max(0, this.inflamed - dt); this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    if (this.inflamed > 0 && Math.random() < dt * 10) g.fx.burst(this.x + (Math.random() - 0.5) * 18, this.y - 10 + (Math.random() - 0.5) * 30, { n: 1, color: ['#E31C79', '#F277C6'], speed: [10, 40], angle: -Math.PI / 2, spread: 1, size: [1, 2.2], life: [0.4, 0.8], gravity: -60, emissive: true });
    this.invuln = Math.max(0, this.invuln - dt); this.hurtBlink = Math.max(0, this.hurtBlink - dt); this.atkCd -= dt; this.dashCd -= dt; this.hurtT -= dt; this.recoilT -= dt; this.wallLock -= dt; this.landT -= dt; this.spellT -= dt; this.workT -= dt; this.throwT -= dt;
    for (const gh of this.ghosts) gh.t -= dt; this.ghosts = this.ghosts.filter((gh) => gh.t > 0);

    if (this.deadT >= 0) { this.deadT += dt; this.vx *= Math.exp(-4 * dt); this.physics(g, dt); this.animate(g, dt, 0); return; }
    if (this.hazardT >= 0) {
      this.hazardT += dt; this.vx *= 0.9; this.vy = Math.min(this.vy, 200); this.physics(g, dt);
      if (this.hazardT > 0.45 && this.hazardT - dt <= 0.45) g.transition(() => { this.x = this.safe.x; this.y = this.safe.y; this.vx = this.vy = 0; this.resetCloak(); g.cam.x = this.x; g.cam.y = this.y; this.hazardT = -1; }, 0.3);
      this.animate(g, dt, 0); return;
    }

    const ax = busy || this.hurtT > 0 ? 0 : g.input.axisX, ay = busy ? 0 : g.input.axisY;
    // ---- crouch: duck while holding down on the ground; stay down while something is overhead
    const wantCrouch = this.grounded && ay > 0.5 && this.dashT <= 0 && !this.onLedgeDrop(g);
    if (wantCrouch && !this.crouching) { this.crouching = true; this.y += 21 - 13; this.hh = 13; }
    else if (this.crouching && (!wantCrouch || !this.grounded) && this.headroom(g)) { this.crouching = false; this.y -= 21 - 13; this.hh = 21; }
    const want = (k: Parameters<typeof inp.pressed>[0], buf = 0) => !busy && this.hurtT <= 0 && inp.pressed(k, buf);

    // ---- grounded bookkeeping
    if (this.grounded) { this.coyote = COYOTE; this.airDash = true; this.airDashes = (perk('i3') ? 2 : 1) + ORDER_STATS[this.ord].airDashes; this.wallJumps = 1; this.lastWall = 0; } else { this.coyote -= dt; if ((this.wallL && this.lastWall === 1) || (this.wallR && this.lastWall === -1)) this.wallJumps = 1; }

    // ---- dash (Prime)
    if (this.dashT > 0) {
      this.dashT -= dt; this.vy = 0;
      if (perk('i2')) for (const e of g.entities) {
        if (e.dead || !e.hurtable || e.team !== 'enemy' || this.dashHits.has(e.id)) continue;
        if (Math.abs(e.x - this.x) < e.hw + this.hw && Math.abs(e.y - this.y) < e.hh + this.hh) { this.dashHits.add(e.id); if (e.onHit?.(g, { damage: 6, dirX: this.facing, dirY: 0, kind: 'slash', source: this })) { g.hitstop(0.03); if (perk('i4')) { this.gainFluor(8); this.invuln = Math.max(this.invuln, 0.3); } } }
      }
      if (Math.random() < 0.9) this.ghosts.push({ x: this.x, y: this.y, f: this.facing, t: 0.22 });
      g.fx.burst(this.x - this.facing * 8, this.y + (Math.random() - 0.5) * 30, { n: 1, color: C.sky, shape: 'streak', speed: [40, 80], angle: this.facing > 0 ? Math.PI : 0, spread: 0.3, emissive: true, size: [1, 2], life: [0.15, 0.3] });
      if (this.dashT <= 0) { this.dashing = false; this.vx = this.facing * RUN * ORDER_STATS[this.ord].run * 0.9; }
    } else {
      if (want('dash', 0.08) && this.dashCd <= 0 && (this.grounded || this.airDash || this.wallSlide)) {
        inp.consume('dash'); if (this.wallSlide) this.facing = -this.wallSlide as 1 | -1; else if (ax) this.facing = sign(ax) as 1 | -1;
        this.dashT = DASH_T; this.dashing = true; this.invuln = Math.max(this.invuln, 0.12); this.charge = 0; this.dashCd = DASH_CD * (perk('i1') ? 0.65 : 1); this.vx = this.facing * DASH_V; this.vy = 0; this.slash = null; this.focusT = 0; this.dashHits.clear();
        if (!this.grounded) { this.airDashes--; if (this.airDashes <= 0) this.airDash = false; } this.sx = 1.35; this.sy = 0.7;
        g.audio.sfx('dash'); g.fx.burst(this.x, this.y + 12, { ...PT.dashPuff, angle: this.facing > 0 ? Math.PI : 0 });
      }
    }

    if (this.dashT <= 0) {
      // ---- horizontal
      if (this.recoilT <= 0 && this.wallLock <= 0) {
        const target = ax * RUN * ORDER_STATS[this.ord].run * (this.focusT > 0 ? 0 : this.shotT >= 0 ? 0.45 : this.charge > 0.2 ? 0.55 : this.crouching ? 0.42 : 1);
        this.vx = approach(this.vx, target, (this.grounded ? ACC_G : ACC_A) * dt);
        if (ax && !this.slash) this.facing = sign(ax) as 1 | -1;
      }
      // ---- wall grip (Floss grip)
      const toward = (this.wallL && ax < 0) ? -1 : (this.wallR && ax > 0) ? 1 : 0;
      this.wallSlide = g.save.abilities.grip && !this.grounded && toward && this.vy > -60 ? toward : 0;
      // ---- jump
      if (want('jump', JUMP_BUF)) {
        if (ay > 0.5 && this.grounded && this.onLedge(g)) { inp.consume('jump'); this.dropThrough = true; this.y += 2; this.grounded = false; }
        else if (this.coyote > 0) { inp.consume('jump'); this.vy = -JUMP_V; this.coyote = 0; this.jumpHeld = true; this.sx = 0.72; this.sy = 1.3; g.audio.sfx('jump'); this.dust(g, 6); }
        else if (this.wallSlide || (!this.grounded && this.wallJumps > 0 && (this.wallL || this.wallR))) { if (!this.wallSlide) { this.wallSlide = this.wallL ? -1 : 1; if (!g.save.abilities.grip) this.wallJumps--; } this.lastWall = this.wallSlide; inp.consume('jump'); this.vy = -JUMP_V * 0.92; this.vx = -this.wallSlide * 430; this.facing = -this.wallSlide as 1 | -1; this.wallLock = 0.15; this.jumpHeld = true; this.airDash = true; g.audio.sfx('walljump'); g.fx.burst(this.x + this.wallSlide * 10, this.y, { n: 6, color: '#c9d6ee', speed: [40, 140], size: [1.5, 3], life: [0.2, 0.4], angle: this.wallSlide > 0 ? Math.PI : 0, spread: 1.5 }); }
      }
      if (this.dropThrough && !g.room.oneWay(Math.floor(this.x / TILE), Math.floor((this.y + this.hh + 2) / TILE)) && !this.grounded && this.vy > 120) this.dropThrough = false;
      if (this.jumpHeld && !inp.held('jump') && this.vy < 0) { this.vy *= 0.42; this.jumpHeld = false; }
      if (this.vy >= 0) this.jumpHeld = false;
      // ---- gravity
      this.gravity = this.vy < 0 ? GRAV_UP : GRAV_DOWN;
      if (this.wallSlide && this.vy > 0) { this.vy = Math.min(this.vy, 170); if (Math.random() < 0.3) g.fx.burst(this.x + this.wallSlide * 10, this.y + 10, { n: 1, color: '#9fb4d9', speed: [10, 40], size: [1, 2], life: [0.2, 0.4], gravity: 300 }); }
    }

    // ---- attack
    if (want('attack', 0.1) && this.atkCd <= 0 && this.dashT <= 0) {
      inp.consume('attack');
      const dir: SlashDir = ay < -0.5 ? 'up' : ay > 0.5 && !this.grounded ? 'down' : 'side';
      this.slashFlip = dir === 'side' && this.lastSlash === 'side' && this.slash === null && this.atkCd > -0.25 ? -this.slashFlip : 1;
      this.slash = { dir, t: 0, hit: new Set(), cells: new Set(), flip: this.slashFlip, landed: false }; this.lastSlash = dir; this.atkCd = ATK_CD * ORDER_STATS[this.ord].atkCd * (perk('b2') ? 0.85 : 1); this.focusT = 0;
      g.audio.sfx('slash', { pitch: 0.92 + Math.random() * 0.16 });
    }
    // hold the blade button to charge a Deep Clean; release to unleash it
    if (!busy && inp.held('attack') && this.dashT <= 0 && this.hurtT <= 0) {
      this.charge += dt;
      if (!this.charged && this.charge >= ORDER_STATS[this.ord].chargeT) { this.charged = true; g.audio.sfx('charge'); g.fx.burst(this.x, this.y - 10, { n: 14, color: ['#ffffff', C.sky], shape: 'streak', speed: [60, 160], emissive: true, size: [1, 1.6], life: [0.2, 0.4] }); }
    } else {
      if (this.charged && !busy) this.deepClean(g);
      this.charge = 0; this.charged = false;
    }
    if (this.slash) { this.slash.t += dt; if (this.slash.t < 0.11) this.slashHits(g); if (this.slash.t > (this.slash.heavy ? 0.3 : 0.22)) this.slash = null; }

    // ---- spell: Up + spell = Rinse wave (after the rinse relic); spell alone = the interdental shot (src/game/shot.ts)
    const rinseWant = ay < -0.5 && g.save.abilities.rinse && !inp.spellFromMouse; // right-click always shoots
    if (want('spell', 0.08) && this.dashT <= 0 && rinseWant) {
      const cost = SPELL_COST - (perk('c1') ? 5 : 0);
      inp.consume('spell');
      if (this.fluor >= cost) {
        this.fluor -= cost; this.spellT = 0.3; this.slash = null; this.shotT = -1;
        g.spawn(new RinseWave(this.x + this.facing * 18, this.y - 2, this.facing)); this.vx = -this.facing * 220; this.recoilT = 0.12;
        g.audio.sfx('spell'); g.shake(4, 0.12); g.flash([0.55, 0.72, 0.91], 0.12);
      } else g.audio.sfx('empty');
    } else if (want('spell', 0.08) && this.dashT <= 0 && this.shotT < 0 && !busy) {
      inp.consume('spell'); const sz = selectedSize(g);
      if (usable(g).length && ammo(g, sz) > 0) { this.shotT = 0; this.slash = null; g.audio.sfx('clink', { pitch: 1.2, vol: 0.45 }); }
      else { g.audio.sfx('empty'); g.ui.toast(`No size ${sz.toUpperCase()} refills left. Pick fired ones back up, or rest at a fountain.`, 3200); }
    }
    if (this.shotT >= 0) this.aim(g, ay);
    if (this.shotT >= 0) {
      if (busy || this.hurtT > 0 || this.dashT > 0 || this.deadT >= 0) this.shotT = -1;
      else if (inp.held('spell')) {
        const before = this.shotT; this.shotT += dt;
        if (before < LOAD && this.shotT >= LOAD) g.audio.sfx('scrub', { pitch: 1.4, vol: 0.5 }); // the refill clicks in
        const full = LOAD + DRAW[this.ord]; if (before < full && this.shotT >= full) { g.audio.sfx('charge', { pitch: 1.3, vol: 0.5 }); g.fx.burst(this.x + this.facing * 26, this.y - 8, { ...PT.cleanGlint, n: 1 }); }
      } else {
        if (this.shotT >= LOAD) {
          const sz = selectedSize(g), k = clamp((this.shotT - LOAD) / DRAW[this.ord], 0, 1), sh = this.shot(k);
          g.spawn(new RefillShot(sh.x, sh.y, sh.vx, sh.vy, sz, POWER[sz] + Math.round(6 * k), k >= (this.ord === 'ranger' ? 0.5 : 1), sh.drop, this.ord));
          setAmmo(g, sz, ammo(g, sz) - 1); this.throwT = 0.18; this.vx -= Math.cos(this.aimA) * 80 * k; this.sx = 1.1; this.sy = 0.94;
          g.audio.sfx('throw', { pitch: 1.3 }); g.shake(1 + 2 * k, 0.08);
          if (!g.save.flags['shot-tip']) { g.save.flags['shot-tip'] = true; g.ui.toast('Hold right-click (or L) to draw, aim with the mouse (or Up / Down), let go to shoot. Mouse wheel or R changes the size. Walk over fired refills to take them back; fountains fill them.', 6400); }
        }
        this.shotT = -1;
      }
    }
    if (!busy && inp.pressed('size', 0.05)) { inp.consume('size'); cycleSize(g); }

    // ---- focus (heal)
    if (!busy && inp.held('focus') && this.grounded && this.fluor >= FOCUS_COST && this.hp < this.maxHp && this.hurtT <= 0 && !this.slash && this.dashT <= 0) {
      if (this.focusT === 0) g.audio.sfx('focus');
      this.focusT += dt; this.vx = approach(this.vx, 0, ACC_G * dt);
      const a = Math.random() * TAU, r = 60 + Math.random() * 30;
      g.fx.burst(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, { n: 1, color: [C.sky, C.white], vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, speed: [0, 0], drag: 0, emissive: true, size: [1, 2], life: [0.4, 0.45], shape: 'streak' });
      if (this.focusT >= FOCUS_T * (perk('c2') ? 0.78 : 1) * (this.inflamed > 0 ? 1.45 : 1) * ((g as any).diff?.focus ?? 1)) {
        this.focusT = 0.0001; this.fluor -= FOCUS_COST; this.heal(1); g.audio.sfx('heal'); g.flash([0.7, 0.85, 1], 0.18);
        g.fx.burst(this.x, this.y, PT.heal);
      }
    } else this.focusT = 0;

    // ---- move
    const vyBefore = this.vy, was = this.grounded;
    this.physics(g, dt, this.dashT <= 0);
    if (this.grounded && !was) { this.land(g, vyBefore); }
    if (this.grounded && this.vy >= 0) this.dropThrough = false;

    // hazards
    if (g.room.hazardAt(this.x, this.y + this.hh - 3) || g.room.hazardAt(this.x - this.hw + 2, this.y + this.hh - 3) || g.room.hazardAt(this.x + this.hw - 2, this.y + this.hh - 3) || g.room.hazardAt(this.x, this.y)) {
      if (this.slash?.dir === 'down' && this.slash.t < 0.11) this.bounce(0.95);
      else this.hurt(g, 1, this.x - this.facing, 'hazard');
    } else if (this.grounded && this.safeGround(g)) { this.safe.x = this.x; this.safe.y = this.y; }

    // contact damage
    if (this.invuln <= 0 && this.dashT <= 0) for (const e of g.entities) {
      if (e.dead || e.team !== 'enemy' || !e.contactDamage) continue;
      if (Math.abs(e.x - this.x) < e.hw + this.hw - 3 && Math.abs(e.y - this.y) < e.hh + this.hh - 3) { this.hurt(g, e.contactDamage, e.x); break; }
    }
    this.animate(g, dt, ax);
  }

  land(g: Game, vy: number) {
    const k = clamp(vy / MAX_FALL, 0, 1); this.sx = 1 + 0.35 * k; this.sy = 1 - 0.3 * k; this.landT = 0.1;
    if (vy > 300) { g.audio.sfx('land', { vol: k }); this.dust(g, 4 + Math.round(k * 8)); }
    if (vy > 780) g.shake(3, 0.1);
  }
  dust(g: Game, n: number) { g.fx.burst(this.x, this.y + this.hh - 2, { ...PT.dust, n }); }
  /** Down + jump on a ledge drops through it, so don't crouch while jump is held on one. */
  onLedgeDrop(g: Game) { return this.onLedge(g) && g.input.held('jump'); }
  /** Is there room to stand up (42 units tall) from a crouch? */
  headroom(g: Game) { const top = this.y + this.hh - 42 + 1; for (const dx of [-this.hw + 1, 0, this.hw - 1]) if (g.room.solidAt(this.x + dx, top) || g.room.solidAt(this.x + dx, top + 14)) return false; return true; }
  onLedge(g: Game) { const ty = Math.floor((this.y + this.hh + 2) / TILE); return g.room.oneWay(Math.floor(this.x / TILE), ty); }
  safeGround(g: Game) { const r = g.room, y = this.y + this.hh + 4; for (const dx of [-24, 0, 24]) { if (!r.solidAt(this.x + dx, y)) return false; if (r.hazardAt(this.x + dx, this.y) || r.hazardAt(this.x + dx * 2, this.y + this.hh - 4)) return false; } return true; }

  wide = 1;
  slashBox(): { x: number; y: number; hw: number; hh: number } {
    const s = this.slash!, k = this.wide * (s.heavy ? 1.5 : 1); if (s.dir === 'up') return { x: this.x, y: this.y - 44 * k, hw: 30 * k, hh: 36 * k };
    if (s.dir === 'down') return { x: this.x, y: this.y + 42 * k, hw: 28 * k, hh: 34 * k };
    return { x: this.x + this.facing * 42 * k, y: this.y - 2, hw: 40 * k, hh: 26 * k };
  }
  slashHits(g: Game) {
    this.wide = g.progress.has('b1') ? 1.2 : 1;
    const s = this.slash!, b = this.slashBox();
    const dirX = s.dir === 'side' ? this.facing : 0, dirY = s.dir === 'up' ? -1 : s.dir === 'down' ? 1 : 0;
    for (const e of g.entities) {
      if (e.dead || !e.hurtable || e.team === 'player' || s.hit.has(e.id)) continue;
      if (Math.abs(e.x - b.x) < e.hw + b.hw && Math.abs(e.y - b.y) < e.hh + b.hh) {
        s.hit.add(e.id);
        const hit: Hit = { damage: 5 + ORDER_STATS[this.ord].slash + 2 * (Number(g.save.flags.blade) || 0) + (g.progress.has('b3') ? 2 : 0), dirX: dirX || sign(e.x - this.x) || this.facing, dirY, kind: s.dir === 'down' ? 'pogo' : 'slash', source: this, heavy: s.heavy };
        if (s.heavy) hit.damage = Math.round(hit.damage * 2.5 + 3);
        if (e.onHit?.(g, hit)) {
          s.landed = true; this.gainFluor(g.progress.has('c3') ? 15 : 11); g.hitstop(s.heavy ? 0.11 : 0.05); g.shake(s.heavy ? 8 : 3.5, s.heavy ? 0.2 : 0.1);
          this.combo++; this.comboT = 1.2;
          if (g.progress.has('b4') && this.combo % 3 === 0) this.filamentStorm(g, b.x, b.y);
          const ix = (e.x + this.x + this.facing * 30) / 2;
          g.fx.burst(ix, b.y, { n: 1, color: '#ffffff', shape: 'ring', size: [4, 4], grow: 300, emissive: true, life: [0.14, 0.14] });
          if (s.dir === 'side') { this.vx = -this.facing * 260; this.recoilT = 0.08; }
          if (s.dir === 'down' && e.pogo) this.bounce();
        } else if (s.dir === 'down' && e.pogo) { this.bounce(); }
      }
    }
    // scrub plaque walls, pogo off spikes and solid plaque
    const r = g.room, x0 = Math.floor((b.x - b.hw) / TILE), x1 = Math.floor((b.x + b.hw) / TILE), y0 = Math.floor((b.y - b.hh) / TILE), y1 = Math.floor((b.y + b.hh) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = r.at(tx, ty), k = ty * 10000 + tx;
      if (c === 'P' && !s.cells.has(k)) {
        s.cells.add(k); const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE; g.hitstop(0.03); g.shake(2, 0.08); this.gainFluor(3);
        g.fx.burst(cx, cy, PT.plaqueSplat);
        g.audio.sfx('scrub', { x: cx, y: cy });
        if (r.scrub(tx, ty)) { g.dropShine(cx, cy, 2); g.fx.burst(cx, cy, { ...PT.plaqueBurst, n: 20 }); g.fx.burst(cx, cy, PT.rinseAway); g.audio.sfx('break'); }
        if (s.dir === 'side') { this.vx = -this.facing * 200; this.recoilT = 0.06; }
        if (s.dir === 'down') this.bounce(0.9);
      }
      if (c === '^' && s.dir === 'down' && !s.cells.has(k)) { s.cells.add(k); this.bounce(0.95); g.audio.sfx('clink'); g.fx.burst((tx + 0.5) * TILE, ty * TILE, { n: 6, color: '#ffffff', emissive: true, shape: 'streak', speed: [100, 300], angle: -Math.PI / 2, spread: 1.6, size: [1, 1.5], life: [0.1, 0.2] }); }
    }
  }

  /** The charged strike: a wide, heavy sweep that breaks guards and shields. */
  deepClean(g: Game) {
    const ay = g.input.axisY, dir: SlashDir = ay < -0.5 ? 'up' : ay > 0.5 && !this.grounded ? 'down' : 'side';
    this.slash = { dir, t: 0, hit: new Set(), cells: new Set(), flip: 1, landed: false, heavy: true }; this.atkCd = ATK_CD;
    if (dir === 'side') { this.vx = this.facing * 420; this.recoilT = 0.1; }
    g.audio.sfx('slash', { pitch: 0.7 }); g.audio.sfx('storm', { vol: 0.6 }); g.flash([0.8, 0.9, 1], 0.12); g.shake(4, 0.12);
  }

  /** Oath perk: every third hit in a row releases a ring of filament sparks. */
  filamentStorm(g: Game, x: number, y: number) {
    g.audio.sfx('storm', { x, y }); g.shake(5, 0.14);
    g.fx.burst(x, y, { n: 40, color: ['#ffffff', C.sky], shape: 'streak', speed: [300, 620], emissive: true, size: [1, 2], life: [0.15, 0.3] });
    g.fx.burst(x, y, { n: 1, color: '#ffffff', shape: 'ring', size: [10, 10], grow: 520, emissive: true, life: [0.22, 0.22] });
    for (const e of g.entities) if (!e.dead && e.hurtable && e.team === 'enemy' && Math.hypot(e.x - x, e.y - y) < 90 + e.hw) e.onHit?.(g, { damage: 8, dirX: sign(e.x - x) || 1, dirY: 0, kind: 'slash', source: this });
  }

  // ---- look ----
  animT = 0; bob = 0; breath = 0; blinkT = 2.5; blink = 0; headTilt = 0; legA = 0; legB = 0;
  animate(g: Game, dt: number, ax: number) {
    this.animT += dt; this.crouchK = damp(this.crouchK, this.crouching ? 0.62 : 1, 22, dt);
    this.sx = damp(this.sx, 1, 14, dt); this.sy = damp(this.sy, 1, 14, dt);
    if (!this.grounded && this.dashT <= 0) { const k = clamp(-this.vy / JUMP_V, -1, 1); this.sy = damp(this.sy, 1 + k * 0.12, 20, dt); this.sx = damp(this.sx, 1 - k * 0.08, 20, dt); }
    const running = this.grounded && Math.abs(this.vx) > 20;
    if (running) { this.runPhase += Math.abs(this.vx) * dt * (this.crouching ? 0.09 : 0.055); this.stepT -= dt; if (this.stepT <= 0) { this.stepT = 0.27; g.audio.sfx('step', { vol: 0.35, pitch: 0.9 + Math.random() * 0.2 }); } }
    else this.runPhase = damp(this.runPhase, Math.round(this.runPhase / Math.PI) * Math.PI, 10, dt);
    // body: run bob, idle breathing, lunges and flinches
    this.bob = damp(this.bob, running ? Math.abs(Math.sin(this.runPhase)) * 2.4 : 0, 18, dt);
    this.breath = Math.sin(this.animT * 2.3) * (running ? 0 : 0.7);
    let lean = clamp(this.vx / RUN, -1, 1) * 0.12 * (this.grounded ? 1 : 0.5);
    if (this.slash && this.slash.t < 0.1) lean += this.facing * (this.slash.dir === 'side' ? 0.26 : 0.08);
    if (this.hurtT > 0) lean -= this.facing * 0.28;
    if (this.focusT > 0) lean *= 0.2;
    this.lean = damp(this.lean, lean, 12, dt);
    this.headTilt = damp(this.headTilt, (this.grounded ? 0 : clamp(this.vy / 900, -1, 1) * 0.12 * this.facing) + (this.hurtT > 0 ? -this.facing * 0.2 : 0) + Math.sin(this.animT * 1.1) * 0.02, 10, dt);
    // legs: swing from the hip when running, tuck when rising, dangle when falling
    const sw = Math.sin(this.runPhase), rising = !this.grounded && this.vy < 0;
    const crawling = this.crouching, crawlSw = Math.sin(this.runPhase * 1.6);
    const sl = this.slash, lunge = sl && this.grounded && sl.dir === 'side' && sl.t < 0.22;
    const la = crawling ? -0.12 + crawlSw * 0.16 : lunge ? -0.5 : sl && sl.dir === 'down' ? 0.6 : running ? sw * 0.85 : !this.grounded ? (rising ? 0.45 : -0.25) : 0, lb = crawling ? 0.1 - crawlSw * 0.16 : lunge ? 0.55 : sl && sl.dir === 'down' ? -0.4 : running ? -sw * 0.85 : !this.grounded ? (rising ? -0.15 : 0.3) : 0;
    this.legA = damp(this.legA, la, 20, dt); this.legB = damp(this.legB, lb, 20, dt);
    // visor blink
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = 2.5 + Math.random() * 3; } this.blink = Math.max(0, this.blink - dt);
    // the brush: held in the hand; resting pose depends on what the knight is doing
    const s = this.slash;
    const rest = this.crouching ? -CRAWL_A - 0.12 + Math.sin(this.runPhase * 1.6) * 0.08 : this.focusT > 0 ? -1.45 : running ? 2.55 + Math.sin(this.runPhase * 2) * 0.12 : !this.grounded ? (rising ? 2.85 : 1.95) : 1.8 + this.breath * 0.04;
    const target = s ? (s.dir === 'up' ? -1.9 : s.dir === 'down' ? 1.6 : (s.flip > 0 ? 0.9 : -0.8)) : this.throwT > 0 ? -1.2 : this.charge > 0.15 ? 2.9 : rest;
    if (s) {
      const arc = s.dir === 'up' ? [0.9, -1.95] : s.dir === 'down' ? [-1.3, 1.65] : s.flip > 0 ? [-2.0, 0.95] : [1.7, -0.85];
      const k = 1 - Math.pow(1 - clamp(s.t / 0.13, 0, 1), 3); // ease-out cubic
      this.bladeA = arc[0] + (arc[1] - arc[0]) * k;
    } else this.bladeA = damp(this.bladeA, target, 12, dt);
    // cloak: verlet chain hanging from the shoulders
    const ax0 = this.x - this.facing * 2, ay0 = this.y - 7 + this.bob * 0.5, wind = -this.vx * 0.012;
    const c = this.cloak; c[0].x = ax0; c[0].y = ay0;
    for (let i = 1; i < c.length; i++) { const p = c[i], vx = (p.x - p.px) * 0.9, vy = (p.y - p.py) * 0.9; p.px = p.x; p.py = p.y; p.x += vx + wind * dt * 60 * 0.5 - this.facing * 0.15 + Math.sin(this.animT * 3 + i) * 0.04; p.y += vy + 900 * dt * dt; }
    for (let it = 0; it < 3; it++) for (let i = 1; i < c.length; i++) { const a = c[i - 1], b = c[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - 4.2) / d; b.x -= dx * k; b.y -= dy * k; }
    void ax;
  }

  /** 0 standing .. 1 fully down on hands and knees. */
  crawlK() { return clamp((1 - this.crouchK) / 0.38, 0, 1); }
  /** Body transform. Standing: pivot at the feet. Crawling: pivot at the hip, held up at knee height, torso tipped
   *  forward by CRAWL_A so the knight is on hands and knees (legs kneel behind, head stays up). */
  bodyXf() {
    const f = this.facing, c = this.crawlK(), hipY = RIG.hip * RIG_SCALE;
    return { px: this.x - f * CRAWL_BACK * c, py: this.y + this.hh - CRAWL_HIP * c, a: this.lean + f * CRAWL_A * c, oy: -hipY * c };
  }
  /** Body-space point (origin at the feet) to world space, through crawl tilt and squash. */
  bodyToWorld(lx: number, ly: number) {
    const t = this.bodyXf(), X = lx * this.sx, Y = ly * this.sy + t.oy;
    return { x: t.px + X * Math.cos(t.a) - Y * Math.sin(t.a), y: t.py + X * Math.sin(t.a) + Y * Math.cos(t.a) };
  }
  /** Shoulder and hand in body space (origin at the feet, +y down), and the brush's angle. */
  grip() {
    const f = this.facing, a = this.bladeA * f + (f < 0 ? Math.PI : 0);
    const sx = f * RIG.front[0] * RIG_SCALE, sy = RIG.front[1] * RIG_SCALE - this.bob - this.breath * 0.5;
    // the arm reaches toward the brush; slashes extend it, idle keeps it close
    const reach = this.slash ? 9 + 6 * Math.sin(Math.PI * clamp(this.slash.t / 0.18, 0, 1)) : this.focusT > 0 ? 10 : 9;
    return { sx, sy, hx: sx + Math.cos(a) * reach, hy: sy + Math.sin(a) * reach, a };
  }

  draw(ctx: CanvasRenderingContext2D, g: Game) {
    if (this.hurtBlink > 0 && this.deadT < 0 && Math.floor(this.hurtBlink * 18) % 2 === 0 && this.hurtT <= 0) return;
    const f = this.facing, x = this.x, y = this.y + this.hh, art = ART[this.ord];
    ctx.save();
    // cape, or the Ranger's scarf: the verlet chain hanging from the shoulders, styled by the Order
    const cape = art.cape;
    if (cape) {
      const c = this.cloak, w = cape.width, off = (i: number) => (2.5 + i * 1.7) * w; ctx.beginPath();
      ctx.moveTo(c[0].x + f * 4 * Math.min(1, w), c[0].y);
      for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x + f * off(i) * 0.6, c[i].y);
      for (let i = c.length - 1; i >= 0; i--) ctx.lineTo(c[i].x - f * off(i), c[i].y + (i === c.length - 1 ? 2 : 0));
      ctx.closePath(); ctx.fillStyle = cape.color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = cape.edge; ctx.stroke();
    }
    // body: crawl tilt and squash, then the rig (mirrored for facing, at rig scale)
    const t = this.bodyXf(); ctx.translate(t.px, t.py); ctx.rotate(t.a); ctx.translate(0, t.oy); ctx.scale(this.sx, this.sy);
    const K = RIG_SCALE, pose = this.rigPose(), gr = this.grip(), col = brushColour(g);
    ctx.scale(f * K, K);
    // the brush stays the game's own blade, drawn in body space between the chest and the front arm
    drawRig(ctx, art, pose, 'scene', { blade: (c) => { if (this.shotT >= 0) return; c.save(); c.translate(0, pose.lift); c.scale(f / K, 1 / K); this.drawWeapon(c, gr.hx, gr.hy, gr.a, col); c.restore(); } });
    if (this.shotT >= 0 && this.ord !== 'ranger') { const rel = pose.aim ?? 0; ctx.translate(0, -pose.lift); drawHeld(ctx, pose.frontHand[0] + Math.cos(rel) * 7, pose.frontHand[1] + Math.sin(rel) * 7, 1, selectedSize(g), this.shotT >= LOAD, clamp((this.shotT - LOAD) / DRAW[this.ord], 0, 1), rel); }
    ctx.restore();
  }
  /** Aim while drawing: at the mouse when it is in use, else Up / Down (Down only in the air), else the right stick.
   *  The knight turns to face the aim. Angle in world space, from the front shoulder. */
  aim(g: Game, ay: number) {
    const inp = g.input as any, from = this.shoulderWorld();
    let a: number;
    if (inp.mouseAim && (g as any).mouseWorld) { const m = (g as any).mouseWorld(); a = m ? Math.atan2(m.y - from.y, m.x - from.x) : this.aimA; }
    else if (Math.hypot(inp.aimX ?? 0, inp.aimY ?? 0) > 0.4) a = Math.atan2(inp.aimY, inp.aimX);
    else { const up = ay < -0.5, down = ay > 0.5 && !this.grounded, rel = up ? -0.95 : down ? 0.8 : 0; a = this.facing > 0 ? rel : Math.PI - rel; }
    const side = Math.cos(a) >= 0 ? 1 : -1; if (side !== this.facing && Math.abs(Math.cos(a)) > 0.05) this.facing = side as 1 | -1;
    this.aimA = a;
  }
  /** Aim relative to the knight's facing (0 = straight ahead, negative = up), as the rig draws it. */
  aimRel() { return Math.atan2(Math.sin(this.aimA), Math.abs(Math.cos(this.aimA))); }
  shoulderWorld() { return this.bodyToWorld(this.facing * RIG.front[0] * RIG_SCALE, RIG.front[1] * RIG_SCALE - this.bob); }
  /** Where and how fast a shot at draw k leaves: along the aim from the shoulder; weak draws lob and drop. */
  shot(k: number) {
    const from = this.shoulderWorld(), c = Math.cos(this.aimA), s = Math.sin(this.aimA), sp = 520 + 460 * k, drop = k < 0.6;
    return { x: from.x + c * 20, y: from.y + s * 20, vx: c * sp, vy: s * sp - (drop ? 140 * (1 - k) : 0), drop };
  }
  /** The rig pose from the animation state (rig space: facing right, at RIG_SCALE). */
  rigPose(): RigPose {
    const f = this.facing, K = RIG_SCALE, gr = this.grip(), lift = (this.bob + this.breath * 0.5) / K;
    const ba = this.slash && this.slash.t < 0.25 ? 2.7 : 1.9 + Math.sin(this.runPhase) * 0.75 * (this.grounded ? 1 : 0) + (this.throwT > 0 ? -2.6 : 0);
    return {
      legA: this.legA, legB: this.legB, lift, headTilt: this.headTilt * f - CRAWL_A * 0.75 * this.crawlK(),
      backHand: this.crawlK() > 0.5 ? [RIG.back[0] + Math.sin(CRAWL_A) * 15 + Math.sin(this.runPhase * 1.6) * 2, RIG.back[1] + Math.cos(CRAWL_A) * 15] : [RIG.back[0] - Math.cos(ba) * 12, RIG.back[1] + Math.sin(ba) * 12],
      frontHand: this.shotT >= 0 ? [RIG.front[0] + Math.cos(this.aimRel()) * 11, RIG.front[1] + Math.sin(this.aimRel()) * 11] : [(gr.hx * f) / K, gr.hy / K + lift],
      game: true, aiming: this.shotT >= 0, aim: this.aimRel(), sway: clamp((-this.vx * f) / 500, -1, 1), open: this.blink > 0 ? 0.25 : 1,
    };
  }
  /** The weapon in hand, by Order: the CS 5460 as a greatsword (Vanguard), a single tuft (Duelist), the Hydrosonic
   *  as a lance (Lancer), else the brush. Same grip and angle, so slashes read the same for every set. */
  drawWeapon(ctx: CanvasRenderingContext2D, hx: number, hy: number, a: number, col: string) {
    if (this.ord === 'vanguard') { ctx.save(); ctx.translate(hx, hy); ctx.scale(1.5, 1.5); this.drawBlade(ctx, 0, 0, a, BR.blue); ctx.restore(); return; }
    if (this.ord === 'duelist') { singleTuft(ctx, hx - Math.cos(a) * 6, hy - Math.sin(a) * 6, 30, a, DUELIST_TUFTS.front[0], DUELIST_TUFTS.front[1]); return; }
    if (this.ord === 'lancer') { sonicLance(ctx, hx - Math.cos(a) * 12, hy - Math.sin(a) * 12, 46, a); return; }
    this.drawBlade(ctx, hx, hy, a, col);
  }
  /** A CURAPROX CS 5460-style brush held at (hx, hy): slim faceted handle, clear neck, compact head, dense filaments. */
  drawBlade(ctx: CanvasRenderingContext2D, hx: number, hy: number, a: number, col = BRUSH.cerise) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-6, -1.9, 24, 3.8, 1.9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-4.5, -1.4, 21, 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-4.5, 0.7, 21, 0.8);
    ctx.fillStyle = 'rgba(230,240,255,0.85)'; ctx.beginPath(); ctx.moveTo(17, -1.6); ctx.lineTo(25, -2.4); ctx.lineTo(25, 0.6); ctx.lineTo(17, 1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(24, -2.2, 9.5, 3.4, 1.6); ctx.fill();
    for (let i = 0; i < 9; i++) { const x = 24.8 + i * 1.0; ctx.strokeStyle = i % 2 ? '#ffffff' : '#dbe8fb'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x, -2.2); ctx.lineTo(x + (i - 4) * 0.08, -7.4 - (i % 3) * 0.25); ctx.stroke(); }
    ctx.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const f = this.facing;
    for (const gh of this.ghosts) { const a = gh.t / 0.22; ctx.globalAlpha = a * 0.35; ctx.fillStyle = C.sky; ctx.beginPath(); ctx.ellipse(gh.x, gh.y - 4, 11, 22, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (this.hurtBlink > 0 && Math.floor(this.hurtBlink * 18) % 2 === 0 && this.hurtT <= 0 && this.deadT < 0) return;
    if (this.inflamed > 0) g.r.halo(ctx, this.x, this.y - 6, 40, '#E31C79', 0.25 + 0.12 * Math.sin(g.time * 9));
    // aim preview while drawing: the shot's path (gravity as RefillShot), brighter with the draw, and a ring at the cursor
    if (this.shotT >= LOAD && this.deadT < 0) {
      const k = clamp((this.shotT - LOAD) / DRAW[this.ord], 0, 1), sh = this.shot(k); let x = sh.x, y = sh.y, vx = sh.vx, vy = sh.vy;
      ctx.fillStyle = '#D8ECFF';
      for (let i = 1; i <= 36; i++) { const dt2 = 1 / 60; if (sh.drop) vy += 1400 * dt2; x += vx * dt2; y += vy * dt2; if (g.room.solidAt(x, y)) break; if (i % 3 === 0) { ctx.globalAlpha = (0.2 + 0.5 * k) * (1 - i / 40); ctx.beginPath(); ctx.arc(x, y, 1.6 + k, 0, TAU); ctx.fill(); } }
      ctx.globalAlpha = 1;
    }
    if (this.shotT >= 0 && (g.input as any).mouseAim && (g as any).mouseWorld) { const m = (g as any).mouseWorld(); if (m) { ctx.strokeStyle = 'rgba(216,236,255,0.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, TAU); ctx.stroke(); } }
    // visor glow
    const vp = this.bodyToWorld(f * 4.5, -(32 + this.bob + this.breath * 0.5) + 1.6), vx = vp.x, vy = vp.y, open = this.blink > 0 ? 0.25 : 1;
    void vx; void vy; void open;
    { const t = this.bodyXf(); ctx.save(); ctx.translate(t.px, t.py); ctx.rotate(t.a); ctx.translate(0, t.oy); ctx.scale(this.sx * f * RIG_SCALE, this.sy * RIG_SCALE);
      drawRig(ctx, ART[this.ord], this.rigPose(), 'glow', { halo: (c, hx, hy, r, color, a) => g.r.halo(c, hx, hy, r, color, a) }); ctx.restore(); }
    // bristle tuft on the blade tip
    const gp = this.grip(), a = gp.a, lx = gp.hx + Math.cos(a) * 29 + Math.sin(a) * 5, ly = gp.hy - this.bob + Math.sin(a) * 29 - Math.cos(a) * 5, tp = this.bodyToWorld(lx, ly), bx = tp.x, by = tp.y;
    g.r.halo(ctx, bx, by, 14, C.sky, 0.4);
    // slash arc
    const s = this.slash; if (s) this.drawSlash(ctx, g, s);
    if (this.focusT > 0) { const k = this.focusT / FOCUS_T; g.r.halo(ctx, this.x, this.y, 30 + k * 40, C.sky, 0.25 + k * 0.4); }
    if (this.charge > 0.15) { const k = Math.min(1, this.charge / ORDER_STATS[this.ord].chargeT); g.r.halo(ctx, bx, by, 10 + k * 26, this.charged ? '#ffffff' : C.sky, 0.3 + k * 0.6 + (this.charged ? Math.sin(g.time * 30) * 0.15 : 0)); }
  }
  drawSlash(ctx: CanvasRenderingContext2D, g: Game, s: Slash) {
    const t = clamp(s.t / 0.16, 0, 1), fade = 1 - clamp((s.t - 0.06) / 0.16, 0, 1); if (fade <= 0) return;
    const f = this.facing; let cx = this.x, cy = this.y - 2, base = 0;
    if (s.dir === 'side') { cx += f * 10; base = f > 0 ? 0 : Math.PI; } else if (s.dir === 'up') { cy -= 8; base = -Math.PI / 2; } else { cy += 8; base = Math.PI / 2; }
    const span = 2.3, a0 = base - (span / 2) * s.flip * (s.dir === 'side' ? f : 1), dir = s.flip * (s.dir === 'side' ? f : 1);
    const head = a0 + dir * span * (0.25 + 0.75 * t), tail = a0 + dir * span * Math.max(0, t - 0.55);
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const r = (26 + i * 4.2 + (s.dir === 'side' ? 6 : 2)) * (s.heavy ? 1.45 : 1), w = (i === 6 ? 3.2 : 1.1 + (i % 3) * 0.5) * (s.heavy ? 1.4 : 1);
      ctx.globalAlpha = fade * (0.25 + 0.75 * (1 - Math.abs(i - 6) / 7)); ctx.strokeStyle = i > 4 ? '#ffffff' : C.sky; ctx.lineWidth = w;
      ctx.beginPath(); if (dir > 0) ctx.arc(cx, cy, r, tail, head); else ctx.arc(cx, cy, r, head, tail); ctx.stroke();
    }
    ctx.globalAlpha = fade * 0.55; g.r.halo(ctx, cx + Math.cos(head) * 46, cy + Math.sin(head) * 46, 26, '#ffffff', fade * 0.6);
    ctx.globalAlpha = 1;
  }
  lights(g: Game) {
    g.light({ x: this.x, y: this.y - 10, r: 300, color: '#5f7fb8', i: 0.32 });
    g.light({ x: this.x + this.facing * 4, y: this.y - 12, r: 80, color: C.sky, i: 0.5 });
    if (this.slash && this.slash.t < 0.15) { const b = this.slashBox(); g.light({ x: b.x, y: b.y, r: 160, color: '#cfe2ff', i: 0.9 }); }
    if (this.focusT > 0) g.light({ x: this.x, y: this.y, r: 200, color: C.sky, i: 0.4 + this.focusT });
  }
}

/** The rinse spell: a rolling, piercing wave of mouthwash foam. */
export class RinseWave extends Projectile {
  f: number; t = 0;
  constructor(x: number, y: number, f: number) { super(x, y, f * 980, 0, 'player', 15, 16, 0.62, '#8BB8E8'); this.f = f; this.pierce = true; this.hh = 22; }
  override update(g: Game, dt: number) {
    this.t += dt; super.update(g, dt);
    if (!this.dead) g.fx.burst(this.x - this.f * 10, this.y + (Math.random() - 0.5) * 34, { n: 2, color: ['#ffffff', '#8BB8E8', '#CCD8ED'], shape: 'bubble', speed: [20, 120], angle: this.f > 0 ? Math.PI : 0, spread: 1.4, size: [1.5, 4.5], life: [0.25, 0.7], gravity: -80, emissive: Math.random() < 0.5 });
  }
  override pop(g: Game) { this.dead = true; g.fx.burst(this.x, this.y, { n: 26, color: ['#ffffff', '#8BB8E8'], shape: 'bubble', speed: [60, 320], size: [2, 6], life: [0.3, 0.9], gravity: -60 }); g.audio.sfx('splash', { x: this.x, y: this.y }); }
  override draw() {}
  override drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const k = Math.min(1, this.t * 8), wob = Math.sin(this.t * 40) * 2;
    g.r.halo(ctx, this.x, this.y, 60, '#8BB8E8', 0.6 * k);
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.f, 1);
    ctx.fillStyle = 'rgba(220,236,255,0.9)'; ctx.beginPath(); ctx.moveTo(-30, -20 - wob); ctx.quadraticCurveTo(14, -30, 20, 0); ctx.quadraticCurveTo(14, 30, -30, 20 + wob); ctx.quadraticCurveTo(-8, 0, -30, -20 - wob); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  override lights(g: Game) { g.light({ x: this.x, y: this.y, r: 220, color: '#8BB8E8', i: 0.9 }); }
}
/** A glob of CURAPROX toothpaste: lobbed in an arc, splats into foam. */
export class PasteGlob extends Projectile {
  t = 0; spin = 0;
  constructor(x: number, y: number, vx: number, vy: number) { super(x, y, vx, vy, 'player', 10, 7, 1.6, '#ffffff'); this.gravityOn = true; }
  override update(g: Game, dt: number) {
    this.t += dt; this.spin += dt * 14;
    if (Math.random() < 0.6) g.fx.burst(this.x, this.y, { n: 1, color: ['#ffffff', '#CCD8ED'], shape: 'bubble', speed: [5, 30], size: [1, 2.5], life: [0.2, 0.45], gravity: -40 });
    super.update(g, dt);
  }
  override pop(g: Game) {
    this.dead = true; g.audio.sfx('splat', { x: this.x, y: this.y }); g.shake(2.5, 0.1);
    g.fx.burst(this.x, this.y, { n: 18, color: ['#ffffff', '#8BB8E8', '#E31C79'], speed: [80, 300], size: [1.5, 4], gravity: 900, life: [0.3, 0.7] });
    g.fx.burst(this.x, this.y, { n: 14, color: ['#ffffff', '#CCD8ED'], shape: 'bubble', speed: [30, 160], size: [2, 5], gravity: -50, life: [0.4, 1.1], emissive: true });
    // land the foam on the floor below if there is one close by
    let fy = this.y; for (let k = 0; k < 6; k++) { if (g.room.solidAt(this.x, fy + 10)) break; fy += 10; }
    g.spawn(new PasteFoam(this.x - Math.sign(this.vx) * 4, fy));
  }
  override draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.strokeStyle = '#8BB8E8'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0.2, 2.4); ctx.stroke();
    ctx.strokeStyle = '#E31C79'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 3.3, 5.4); ctx.stroke();
    ctx.restore();
  }
  override drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y, 22, '#ffffff', 0.35); }
  override lights(g: Game) { g.light({ x: this.x, y: this.y, r: 120, color: '#CCD8ED', i: 0.5 }); }
}

/** A lingering puddle of foam that fizzes away at plaque. */
export class PasteFoam extends Actor {
  life = 2.6; tick = 0; t = 0;
  constructor(x: number, y: number) { super(x, y - 12, 34, 14); this.team = 'player'; this.z = 26; }
  update(g: Game, dt: number) {
    this.t += dt; this.life -= dt; this.tick -= dt; if (this.life <= 0) { this.dead = true; return; }
    if (Math.random() < dt * 22) g.fx.burst(this.x + (Math.random() - 0.5) * 60, this.y + 6, { n: 1, color: ['#ffffff', '#CCD8ED', '#8BB8E8'], shape: 'bubble', speed: [10, 50], angle: -Math.PI / 2, spread: 0.8, size: [1.5, 4], gravity: -60, life: [0.4, 0.9], emissive: Math.random() < 0.4 });
    if (this.tick <= 0) {
      this.tick = 0.35;
      for (const e of g.entities) if (!e.dead && e.hurtable && e.team === 'enemy' && Math.abs(e.x - this.x) < e.hw + this.hw && Math.abs(e.y - this.y) < e.hh + this.hh) e.onHit?.(g, { damage: 3, dirX: 0, dirY: 0, kind: 'spell', source: this });
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    const k = Math.min(1, this.life / 0.6) * Math.min(1, this.t * 6), base = this.y + this.hh;
    ctx.globalAlpha = k;
    for (let i = 0; i < 11; i++) { const x = this.x - 30 + i * 6, r = 5 + ((i * 7) % 4) + Math.sin(this.t * 5 + i) * 0.8; ctx.fillStyle = i % 3 ? '#f4f8ff' : '#dfeaf9'; ctx.beginPath(); ctx.arc(x, base - r * 0.7, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) { g.r.halo(ctx, this.x, this.y + 6, 50, '#CCD8ED', 0.25 * Math.min(1, this.life)); }
}
export { lerp };
