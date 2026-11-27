// A room: tile grid, collision, door markers and the cached terrain outline.
//
// Core map characters (content modules register the rest through Legend):
//   #  solid rock            =  one-way ledge (jump up through, hold down + jump to drop)
//   ^  hazard (sugar spikes: hurts, then returns you to safe ground)
//   |  interdental slit: solid, but a Prime dash passes through
//   P  plaque wall: solid until scrubbed away with the blade (drops shine, can hide a path)
//   S  rinse fountain (save point)       @  start position for a new game
//   1-9 door markers. Put them in the edge row or column; walking off that edge uses the nearest one.
//   .  or space: empty
import { TILE } from '../engine/render';
import { hash2 } from '../engine/math';
import type { RoomDef } from './registry';

export const SOLID = new Set(['#', '|', 'I', 'H', 'P']);

export class Room {
  def: RoomDef;
  id: string;
  w: number; h: number;              // tiles
  grid: string[][];
  pw: number; ph: number;            // world units
  doors: Record<string, { x: number; y: number; edge: 'left' | 'right' | 'top' | 'bottom' | 'inside' }> = {};
  plaqueHp = new Map<number, number>();
  terrain: Path2D | null = null;     // smoothed outline of '#'
  tops: [number, number, number][] = []; // walkable top edges: x0, x1, y (world)
  slabs: [number, number, number][] = []; // one-way ledges: x0, x1, y
  version = 0;                        // bumps when the grid changes (plaque scrubbed)

  constructor(def: RoomDef) {
    this.def = def; this.id = def.id;
    this.h = def.map.length; this.w = Math.max(...def.map.map((r) => r.length));
    this.grid = def.map.map((r) => r.padEnd(this.w, '.').split(''));
    this.pw = this.w * TILE; this.ph = this.h * TILE;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.grid[y][x];
      if (c >= '1' && c <= '9') {
        const edge = x === 0 ? 'left' : x === this.w - 1 ? 'right' : y === 0 ? 'top' : y === this.h - 1 ? 'bottom' : 'inside';
        const prev = this.doors[c]; // a door can span several cells: keep the middle
        const cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
        if (!prev) this.doors[c] = { x: cx, y: cy, edge }; else { (prev as any).n = ((prev as any).n || 1) + 1; prev.x += (cx - prev.x) / (prev as any).n; prev.y += (cy - prev.y) / (prev as any).n; }
      }
      if (c === 'P') this.plaqueHp.set(y * this.w + x, 3);
    }
    this.rebuild();
  }

  at(tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) {
      const cx = Math.min(this.w - 1, Math.max(0, tx)), cy = Math.min(this.h - 1, Math.max(0, ty));
      const c = this.grid[cy][cx]; return c >= '1' && c <= '9' ? '.' : '#';
    }
    return this.grid[ty][tx];
  }
  atWorld(x: number, y: number) { return this.at(Math.floor(x / TILE), Math.floor(y / TILE)); }
  /** Solid for movement. Clogged interdental gaps ('|' 'I' 'H') stay solid until cleaned with the right IDB. */
  solid(tx: number, ty: number, _passSlits = false) { const c = this.at(tx, ty); return c === '#' || c === 'P' || c === '|' || c === 'I' || c === 'H'; }
  solidAt(x: number, y: number, passSlits = false) { return this.solid(Math.floor(x / TILE), Math.floor(y / TILE), passSlits); }
  oneWay(tx: number, ty: number) { return this.at(tx, ty) === '='; }
  hazardAt(x: number, y: number) { return this.atWorld(x, y) === '^'; }
  /** Is there floor under (x, y+1)? Useful for patrolling enemies. */
  groundAt(x: number, y: number) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return this.solid(tx, ty) || this.oneWay(tx, ty); }
  /** March from (x0,y0) to (x1,y1); true if no solid tile blocks the line. */
  lineOfSight(x0: number, y0: number, x1: number, y1: number) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / (TILE / 3));
    for (let i = 1; i < n; i++) { const t = i / n; if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
  /** Damage a plaque wall cell. Returns true when it breaks. */
  scrub(tx: number, ty: number) {
    const k = ty * this.w + tx, hp = this.plaqueHp.get(k); if (hp === undefined) return false;
    if (hp > 1) { this.plaqueHp.set(k, hp - 1); return false; }
    this.plaqueHp.delete(k); this.grid[ty][tx] = '.'; this.version++; this.rebuild(); return true;
  }

  /** Smoothed outline of all '#' cells as one Path2D, plus the list of walkable tops and ledges. */
  rebuild() {
    const T = TILE, W = this.w, H = this.h, s = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? true : this.grid[y][x] === '#');
    // 1. boundary edges between solid and empty cells, oriented so solid is on the left
    type E = [number, number, number, number];
    const edges: E[] = [];
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
      if (!s(x, y)) continue;
      if (!s(x, y - 1)) edges.push([x + 1, y, x, y]);
      if (!s(x, y + 1)) edges.push([x, y + 1, x + 1, y + 1]);
      if (!s(x - 1, y)) edges.push([x, y, x, y + 1]);
      if (!s(x + 1, y)) edges.push([x + 1, y + 1, x + 1, y]);
    }
    // 2. chain into loops
    const byStart = new Map<string, E[]>();
    for (const e of edges) { const k = e[0] + ',' + e[1]; (byStart.get(k) || byStart.set(k, []).get(k)!).push(e); }
    const used = new Set<E>(); const loops: [number, number][][] = [];
    for (const e of edges) {
      if (used.has(e)) continue; const loop: [number, number][] = []; let cur: E | undefined = e;
      while (cur && !used.has(cur)) { used.add(cur); loop.push([cur[0], cur[1]]); const nx = byStart.get(cur[2] + ',' + cur[3]); cur = nx?.find((n) => !used.has(n)); }
      if (loop.length > 2) loops.push(loop);
    }
    // 3. drop collinear points, then round corners (Chaikin) with a little stable wobble
    const p = new Path2D();
    p.rect(-640, -640, this.pw + 1280, this.ph + 1280); // fill with 'evenodd': the room's open space is the hole
    for (const raw of loops) {
      const pts = raw.filter((q, i) => { const a = raw[(i - 1 + raw.length) % raw.length], b = raw[(i + 1) % raw.length]; return !((a[0] === q[0] && q[0] === b[0]) || (a[1] === q[1] && q[1] === b[1])); });
      if (pts.length < 3) continue;
      let poly = pts.map(([x, y]) => [x * T, y * T] as [number, number]);
      for (let it = 0; it < 2; it++) {
        const out: [number, number][] = []; const r = it === 0 ? 0.22 : 0.25;
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r], [a[0] + (b[0] - a[0]) * (1 - r), a[1] + (b[1] - a[1]) * (1 - r)]); }
        poly = out;
      }
      poly.forEach(([x, y], i) => { const j = (hash2(x * 0.13, y * 0.17) - 0.5) * 2.2; if (i) p.lineTo(x + j, y + j); else p.moveTo(x + j, y + j); });
      p.closePath();
    }
    this.terrain = p;
    // 4. tops and ledges
    this.tops = []; this.slabs = [];
    for (let y = 0; y < H; y++) {
      let run = -1, runS = -1;
      for (let x = 0; x <= W; x++) {
        const top = x < W && s(x, y) && !s(x, y - 1) && y > 0;
        if (top && run < 0) run = x; if (!top && run >= 0) { this.tops.push([run * T, x * T, y * T]); run = -1; }
        const slab = x < W && this.grid[y][x] === '=';
        if (slab && runS < 0) runS = x; if (!slab && runS >= 0) { this.slabs.push([runS * T, x * T, y * T]); runS = -1; }
      }
    }
  }
}
