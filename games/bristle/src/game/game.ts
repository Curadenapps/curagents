// The running game: loop, rooms, camera, combat glue, transitions, saving, drawing order.
import { Renderer, TILE } from '../engine/render';
import { Input } from '../engine/input';
import { Particles } from '../engine/particles';
import { Rng, clamp, damp, mix } from '../engine/math';
import { DEFAULT_GRADE } from '../engine/post';
import { Room } from './room';
import { Player, C } from './player';
import { Shine } from './entity';
import { Biomes, Legend, Objects, Rooms, type Biome } from './registry';
import type { AudioApi, Entity, Game, HitKind, SaveData, UiApi, ProgressApi } from './types';
import type { Light } from '../engine/render';

const SAVE_KEY = 'bristle-save-v1';
export const START_ROOM = 'crown-gate';

export function freshSave(): SaveData {
  return {
    v: 1, room: START_ROOM, door: '@', maxHp: 5, hp: 5, fluor: 0, shine: 0,
    abilities: { dash: false, grip: false, rinse: false, pulse: false }, flags: {}, killed: {}, visited: {},
    settings: { master: 0.8, music: 0.6, sfx: 0.9, shake: 1, quality: 1, aiVoices: true }, playTime: 0,
    progress: { xp: 0, level: 1, points: 0, mastery: { plaque: 0, sugar: 0, tartar: 0, gum: 0 }, perks: [] },
  };
}

export class GameCore implements Game {
  time = 0; gameTime = 0; dt = 0;
  r: Renderer; cam; fx = new Particles(); input: Input; rng = new Rng(Date.now() & 0xffff); audio: AudioApi; ui!: UiApi;
  room!: Room; player!: Player; entities: Entity[] = [];
  save: SaveData;
  progress!: ProgressApi;
  /** >0 while a core modal (the Oath screen) is open: the world freezes. */
  modal = 0;
  biome!: Biome;
  state: 'title' | 'play' | 'paused' = 'title';
  private idc = 1;
  private hitstopT = 0; private slowT = 0; private slowK = 1;
  private shakeT = 0; private shakeAmp = 0;
  private flashC: [number, number, number] = [1, 1, 1]; private flashA = 0;
  private trans: { t: number; dur: number; fn: (() => void) | null; phase: 'out' | 'in' } | null = null;
  private lookDown = 0;
  hudHooks: ((ctx: CanvasRenderingContext2D, g: GameCore) => void)[] = [];
  onRoomEnter: ((g: GameCore) => void)[] = [];

  constructor(view: HTMLCanvasElement, audio: AudioApi) {
    this.r = new Renderer(view); this.cam = this.r.cam; this.input = new Input(); this.audio = audio;
    this.save = this.load() ?? freshSave();
  }

  // ---------- Game API ----------
  nextId() { return this.idc++; }
  spawn<T extends Entity>(e: T): T { if (!e.id) e.id = this.nextId(); this.entities.push(e); return e; }
  light(l: Light) { this.r.addLight(l); }
  shake(a: number, s = 0.2) { const k = this.save.settings.shake; if (a * k > this.shakeAmp * (this.shakeT > 0 ? 1 : 0)) { this.shakeAmp = a * k; this.shakeT = s; } }
  hitstop(s: number) { this.hitstopT = Math.max(this.hitstopT, s); }
  slowmo(k: number, s: number) { this.slowK = k; this.slowT = s; }
  flash(c: [number, number, number], a: number) { this.flashC = c; this.flashA = Math.max(this.flashA, a); }
  hurtPlayer(d: number, fromX: number, kind: HitKind = 'contact') { this.player.hurt(this, d, fromX, kind); }
  dropShine(x: number, y: number, amount: number) { let left = amount; while (left > 0) { const v = left >= 10 ? 5 : 1; left -= v; this.spawn(new Shine(x, y, v)); } }
  flag(n: string) { return this.save.flags[n]; }
  setFlag(n: string, v: boolean | number | string) { this.save.flags[n] = v; }
  busy() { return !!this.trans; }
  persist() { this.save.hp = this.player?.hp ?? this.save.hp; this.save.fluor = this.player?.fluor ?? this.save.fluor; try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch { /* storage blocked */ } }
  load(): SaveData | null { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) { const f = freshSave(); return { ...f, ...s, abilities: { ...f.abilities, ...s.abilities }, settings: { ...f.settings, ...s.settings }, progress: { ...f.progress, ...(s.progress || {}), mastery: { ...f.progress.mastery, ...(s.progress?.mastery || {}) } } }; } } catch { /* corrupt */ } return null; }
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } this.save = freshSave(); }
  transition(fn: () => void, dur = 0.28) { if (this.trans) return; this.trans = { t: 0, dur, fn, phase: 'out' }; }
  goto(roomId: string, door: string) { this.transition(() => this.enter(roomId, door)); this.audio.sfx('door'); }

  // ---------- flow ----------
  startGame(fresh: boolean) {
    if (fresh) { this.wipe(); }
    this.player = new Player(0, 0); this.player.hp = this.save.hp || this.save.maxHp; this.player.maxHp = this.save.maxHp; this.player.fluor = this.save.fluor;
    this.state = 'play';
    this.enter(this.save.room, this.save.door, true);
    this.trans = { t: 0, dur: 0.6, fn: null, phase: 'in' };
  }
  enter(roomId: string, door: string, quiet = false) {
    for (const e of this.entities) e.dispose?.(this);
    const def = Rooms[roomId] ?? Rooms[START_ROOM] ?? Object.values(Rooms)[0];
    this.room = new Room(def); this.biome = Biomes[def.biome] ?? Biomes['default'] ?? Object.values(Biomes)[0];
    this.entities = []; this.fx.list.length = 0;
    const p = this.player; p.vx = 0; p.vy = 0; p.dashT = 0; p.dashing = false; p.passSlits = false; p.slash = null;
    // place the player
    let px = this.room.pw / 2, py = this.room.ph / 2, placed = false;
    const findChar = (ch: string) => { for (let y = 0; y < this.room.h; y++) for (let x = 0; x < this.room.w; x++) if (this.room.grid[y][x] === ch) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }; return null; };
    const d = this.room.doors[door];
    if (d) {
      placed = true; px = d.x; py = d.y;
      if (d.edge === 'left') { px = d.x + 44; p.facing = 1; } else if (d.edge === 'right') { px = d.x - 44; p.facing = -1; }
      else if (d.edge === 'top') { py = d.y + 48; } else if (d.edge === 'bottom') { py = d.y - 56; p.vy = -980; }
    } else {
      const s = findChar(door === 'S' ? 'S' : '@') ?? findChar('S') ?? findChar('@'); if (s) { px = s.x; py = s.y; placed = true; }
    }
    if (!placed) { px = this.room.pw / 2; py = this.room.ph / 2; }
    p.x = px; p.y = py + (TILE / 2 - p.hh) - 0.5; p.safe = { x: p.x, y: p.y }; p.resetCloak();
    if (d && (d.edge === 'left' || d.edge === 'right')) p.vx = p.facing * 300; // walk in
    // spawn map contents
    for (let y = 0; y < this.room.h; y++) for (let x = 0; x < this.room.w; x++) {
      const ch = this.room.grid[y][x], f = Legend[ch];
      if (f) { const e = f(this, (x + 0.5) * TILE, (y + 0.5) * TILE, this.room); if (e) this.spawn(e); if (ch !== 'S' && !'#=^|P'.includes(ch)) this.room.grid[y][x] = '.'; }
      else if (ch === '@') this.room.grid[y][x] = '.';
    }
    for (const o of def.objects ?? []) { const f = Objects[o.type]; if (f) { const e = f(this, o, this.room); if (e) this.spawn(e); } else console.warn('unknown object ' + o.type); }
    // camera snaps
    this.updateCamera(1, true);
    const first = !this.save.visited[def.id]; this.save.visited[def.id] = true;
    if (first && !quiet) this.progress?.gain(6);
    if (!quiet && first && def.title) this.ui.areaTitle(def.title, def.subtitle);
    if (quiet && def.title && first) this.ui.areaTitle(def.title, def.subtitle);
    this.audio.music(def.music ?? this.biome.music ?? null);
    for (const h of this.onRoomEnter) h(this);
  }
  respawn() {
    this.transition(() => {
      const p = this.player; p.deadT = -1; p.hazardT = -1; p.hp = p.maxHp; p.fluor = 0; p.invuln = 1;
      this.enter(this.save.room, this.save.door, true); this.persist();
    }, 0.9);
  }

  // ---------- frame ----------
  update(dt: number) {
    this.dt = dt;
    this.audio.update(this, dt);
    if (this.trans) {
      const tr = this.trans; tr.t += dt;
      if (tr.t >= tr.dur) { if (tr.phase === 'out') { tr.fn?.(); tr.phase = 'in'; tr.t = 0; } else this.trans = null; }
    }
    if (this.state !== 'play' || this.modal > 0) return;
    this.save.playTime += dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowK = 1; }
    if (this.hitstopT > 0) { this.hitstopT -= dt; this.fx.update(dt * 0.2); return; }
    const sdt = dt * (this.slowT > 0 ? this.slowK : 1);
    this.gameTime += sdt;
    const p = this.player;
    p.update(this, sdt);
    for (const e of this.entities) if (!e.dead) e.update(this, sdt);
    this.entities = this.entities.filter((e) => { if (e.dead) { e.dispose?.(this); return false; } return true; });
    this.fx.update(sdt);
    this.biome.update?.(this, sdt);
    // leaving through an edge
    if (!this.trans && p.deadT < 0) {
      const edge = p.x < 0 ? 'left' : p.x > this.room.pw ? 'right' : p.y < -4 ? 'top' : p.y > this.room.ph ? 'bottom' : null;
      if (edge) {
        let best: string | null = null, bd = Infinity;
        for (const [k, d] of Object.entries(this.room.doors)) if (d.edge === edge) { const dd = edge === 'left' || edge === 'right' ? Math.abs(d.y - p.y) : Math.abs(d.x - p.x); if (dd < bd) { bd = dd; best = k; } }
        const link = best ? this.room.def.doors[best] : null;
        if (link) this.goto(link.to, link.door); else { p.x = clamp(p.x, p.hw, this.room.pw - p.hw); if (p.y > this.room.ph) p.hurt(this, 1, p.x, 'hazard'); }
      }
    }
    if (p.deadT > 1.3 && !this.trans) this.respawn();
    this.updateCamera(dt, false);
    // combat music intensity: enemies awake near the player
    let threat = 0; for (const e of this.entities) if (e.team === 'enemy' && e.hurtable && Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 320) threat++;
    this.audio.intensity(Math.min(1, threat / 3));
  }
  updateCamera(dt: number, snap: boolean) {
    const p = this.player, cam = this.cam, room = this.room;
    if (p.grounded && Math.abs(p.vx) < 5 && this.input.axisY > 0.5) this.lookDown += dt; else if (p.grounded && Math.abs(p.vx) < 5 && this.input.axisY < -0.5) this.lookDown -= dt; else this.lookDown = 0;
    const look = this.lookDown > 0.45 ? 160 : this.lookDown < -0.45 ? -140 : 0;
    const tx = p.x + p.facing * 70 + p.vx * 0.12, ty = p.y - 46 + look + (p.vy > 400 ? (p.vy - 400) * 0.25 : 0);
    if (snap) { cam.x = tx; cam.y = ty; } else { cam.x = damp(cam.x, tx, 5.5, dt); cam.y = damp(cam.y, ty, p.vy > 400 ? 9 : 4.5, dt); }
    const vw = cam.viewW, vh = cam.viewH;
    cam.x = room.pw <= vw ? room.pw / 2 : clamp(cam.x, vw / 2, room.pw - vw / 2);
    cam.y = room.ph <= vh ? room.ph / 2 : clamp(cam.y, vh / 2, room.ph - vh / 2);
    if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeAmp * Math.min(1, this.shakeT * 5); cam.sx = (Math.random() - 0.5) * 2 * a; cam.sy = (Math.random() - 0.5) * 2 * a; } else { cam.sx = cam.sy = 0; this.shakeAmp = 0; }
  }

  draw() {
    const r = this.r, sc = r.sc, em = r.em, cam = this.cam;
    r.resize(); r.begin();
    if (this.state === 'title' || !this.room) { this.drawTitleBack(); r.present(this.time); return; }
    const b = this.biome, room = this.room;
    r.ambient = room.def.ambient ?? b.ambient;
    if (room.def.dark) r.ambient = mix(r.ambient, '#000000', room.def.dark);
    // background
    sc.setTransform(1, 0, 0, 1, 0, 0); b.drawBack(sc, this);
    // terrain
    cam.apply(sc); this.drawTerrain(sc);
    b.drawTerrain?.(sc, this, room);
    // actors
    const list = [...this.entities, this.player].sort((a, c) => a.z - c.z);
    for (const e of list) if (cam.visible(e.x, e.y, 200)) e.draw(sc, this);
    this.fx.draw(sc, false);
    sc.setTransform(1, 0, 0, 1, 0, 0); b.drawFront?.(sc, this);
    // emissive
    cam.apply(em);
    for (const e of list) if (e.drawEmissive && cam.visible(e.x, e.y, 260)) e.drawEmissive(em, this);
    this.drawTerrainEmissive(em);
    b.drawEmissive?.(em, this);
    this.fx.draw(em, true);
    // lights
    b.lights?.(this);
    for (const e of list) e.lights?.(this);
    // grade
    const gr = r.grade; Object.assign(gr, DEFAULT_GRADE, b.grade ?? {});
    this.flashA = Math.max(0, this.flashA - this.dt * 3.2); gr.flash = [...this.flashC, this.flashA] as [number, number, number, number];
    const tr = this.trans; gr.fade = tr ? (tr.phase === 'out' ? clamp(tr.t / tr.dur, 0, 1) : 1 - clamp(tr.t / tr.dur, 0, 1)) : 0;
    if (this.player.deadT >= 0) { gr.saturation *= Math.max(0.1, 1 - this.player.deadT); gr.fade = Math.max(gr.fade, clamp((this.player.deadT - 0.6) / 0.7, 0, 1)); }
    if (this.player.hp === 1 && this.player.deadT < 0) { gr.vignette += 0.25 + Math.sin(this.time * 4) * 0.08; gr.saturation *= 0.8; }
    r.present(this.time);
  }
  drawTerrain(ctx: CanvasRenderingContext2D) {
    const room = this.room, st = this.biome.terrain, path = room.terrain!;
    ctx.fillStyle = st.deep; ctx.fill(path, 'evenodd');
    ctx.save(); ctx.clip(path, 'evenodd');
    ctx.lineJoin = 'round'; ctx.strokeStyle = st.base; ctx.lineWidth = 64; ctx.stroke(path);
    ctx.strokeStyle = st.edge; ctx.lineWidth = 18; ctx.stroke(path);
    ctx.strokeStyle = st.rim; ctx.lineWidth = 4; ctx.stroke(path);
    ctx.restore();
    // walkable tops: a lighter lip
    ctx.fillStyle = st.top;
    for (const [x0, x1, y] of room.tops) { ctx.beginPath(); ctx.moveTo(x0 + 6, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - 4, x1 - 6, y); ctx.lineTo(x1 - 8, y + 5); ctx.lineTo(x0 + 8, y + 5); ctx.closePath(); ctx.fill(); }
    // one-way ledges: enamel slabs
    for (const [x0, x1, y] of room.slabs) {
      ctx.fillStyle = st.slab; ctx.beginPath(); ctx.roundRect(x0 + 1, y, x1 - x0 - 2, 12, 5); ctx.fill();
      ctx.fillStyle = st.top; ctx.fillRect(x0 + 5, y, x1 - x0 - 10, 2.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = x0 + 16; x < x1 - 8; x += 32) ctx.fillRect(x, y + 10, 2, 6);
    }
    // plaque walls, slits and spikes
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      const c = room.grid[ty][tx]; if (c !== 'P' && c !== '|' && c !== '^') continue;
      const x = tx * TILE, y = ty * TILE;
      if (!this.cam.visible(x + 16, y + 16, 40)) continue;
      if (c === 'P') {
        const hp = room.plaqueHp.get(ty * room.w + tx) ?? 3, s = 0.7 + hp * 0.1;
        ctx.fillStyle = '#b89a1a'; ctx.fillRect(x, y, TILE, TILE);
        for (let i = 0; i < 5; i++) { const bx = x + 6 + ((i * 7 + tx * 3) % 20), by = y + 6 + ((i * 11 + ty * 5) % 20); ctx.fillStyle = i % 2 ? C.yellow : '#d9c400'; ctx.beginPath(); ctx.arc(bx, by, 7 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,130,0,0.6)'; ctx.beginPath(); ctx.arc(x + 20, y + 22, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      } else if (c === '|') {
        ctx.fillStyle = st.slab; ctx.fillRect(x + 2, y, 11, TILE); ctx.fillRect(x + 19, y, 11, TILE);
        ctx.fillStyle = '#060c1f'; ctx.fillRect(x + 13, y, 6, TILE);
      } else {
        ctx.fillStyle = '#f2d9ec'; for (let i = 0; i < 4; i++) { const sx = x + 2 + i * 8, h = 12 + ((tx * 5 + i * 7) % 9); ctx.beginPath(); ctx.moveTo(sx, y + TILE); ctx.lineTo(sx + 4, y + TILE - h); ctx.lineTo(sx + 8, y + TILE); ctx.fill(); }
      }
    }
  }
  drawTerrainEmissive(ctx: CanvasRenderingContext2D) {
    const room = this.room;
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      const c = room.grid[ty][tx]; if (c !== 'P' && c !== '|' && c !== '^') continue;
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE; if (!this.cam.visible(x, y, 40)) continue;
      if (c === 'P') this.r.halo(ctx, x, y, 30, '#FCE300', 0.16);
      else if (c === '|') { ctx.fillStyle = 'rgba(139,184,232,' + (0.35 + 0.2 * Math.sin(this.time * 3 + ty)) + ')'; ctx.fillRect(x - 1, y - 16, 2, 32); }
      else if ((tx + ty + Math.floor(this.time * 2)) % 5 === 0) this.r.halo(ctx, x, y + 6, 10, '#ffffff', 0.5);
    }
  }
  drawTitleBack() {
    const sc = this.r.sc, w = this.r.scene.width, h = this.r.scene.height; sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.fillStyle = '#081430'; sc.fillRect(0, 0, w, h); this.r.ambient = '#909aa8';
  }
}
export { C };
