// Reachability check for every room of BRISTLE.
//   node tests/reach.mjs            report
//   node tests/reach.mjs --verbose  also print each room's door matrix per ability stage
//
// Loads the room data (src/game/world/rooms) and checks:
//  1. map shape: equal row lengths, solid borders except door cells, door sizes, floor under side doors
//  2. door links: every marker linked, links resolve both ways
//  3. per room, which doors can reach which (BFS over standing / wall-cling states, using a step-by-step
//     replica of the player physics in src/game/player.ts and entity.ts), for each ability stage
//  4. the whole route from '@' with abilities picked up from relics on the way, and no soft locks:
//     from every room entry reached at a stage, the start room can be reached again with that stage's abilities
// Plaque walls (P) count as solid, but cells the player can hit from a reached spot are scrubbed and the
// search continues (so a plaque wall can sit on the main path). Pogo off spikes and plaque is modelled.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');
const res = await esbuild.build({ entryPoints: [join(here, '../src/game/world/rooms/index.ts')], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const { ROOMS } = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'));
const byId = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// ---- physics constants (keep in sync with player.ts / entity.ts)
const T = 32, RUN = 300, ACC_G = 5200, ACC_A = 3400, JUMP_V = 830, GRAV_UP = 2500, GRAV_DOWN = 3100, MAX_FALL = 820;
const COYOTE = 0.09, JUMP_BUF = 0.13, DASH_T = 0.19, DASH_V = 820, HW = 10, HH = 21, DT = 1 / 120, ATK_CD = 0.36;

const problems = [], warnings = [];
const fail = (m) => problems.push(m), warn = (m) => warnings.push(m);

// ---------------- grid ----------------
class Grid {
  constructor(def) {
    this.def = def; this.h = def.map.length; this.w = def.map[0].length; this.pw = this.w * T; this.ph = this.h * T;
    this.g = def.map.map((r) => r.split(''));
    this.doors = {};
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.g[y][x];
      if (c >= '1' && c <= '9') {
        const edge = x === 0 ? 'left' : x === this.w - 1 ? 'right' : y === 0 ? 'top' : y === this.h - 1 ? 'bottom' : 'inside';
        const d = this.doors[c] ?? (this.doors[c] = { x: 0, y: 0, n: 0, edge, cells: [] });
        d.n++; const cx = (x + 0.5) * T, cy = (y + 0.5) * T; d.x += (cx - d.x) / d.n; d.y += (cy - d.y) / d.n; d.cells.push([x, y]);
      }
    }
    this.hasPogo = def.map.some((r) => /[P^]/.test(r));
  }
  clone() { const c = Object.create(Grid.prototype); Object.assign(c, this); c.g = this.g.map((r) => r.slice()); return c; }
  at(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) {
      const cx = Math.min(this.w - 1, Math.max(0, tx)), cy = Math.min(this.h - 1, Math.max(0, ty));
      const c = this.g[cy][cx]; return c >= '1' && c <= '9' ? '.' : '#';
    }
    return this.g[ty][tx];
  }
  solid(tx, ty, pass) { const c = this.at(tx, ty); return c === '#' || c === 'P' || (c === '|' && !pass); }
  solidAt(x, y, pass) { return this.solid(Math.floor(x / T), Math.floor(y / T), pass); }
  oneWay(tx, ty) { return this.at(tx, ty) === '='; }
  hazardAt(x, y) { return this.at(Math.floor(x / T), Math.floor(y / T)) === '^'; }
}

// ---------------- player replica ----------------
function mkState(x, y) { return { x, y, vx: 0, vy: 0, grounded: false, wallL: false, wallR: false, pass: false, drop: false, dashT: 0, airDash: true, coyote: 0, jumpHeld: false, wallLock: 0, facing: 1, atkCd: 0, slashT: -1, wallSlide: 0, jumpBuf: -1, dashed: false }; }
function moveX(G, s, dx) {
  const steps = Math.ceil(Math.abs(dx) / (T * 0.45)) || 1, st = dx / steps;
  for (let i = 0; i < steps; i++) {
    s.x += st; const top = Math.floor((s.y - HH + 0.5) / T), bot = Math.floor((s.y + HH - 0.5) / T);
    const edge = st > 0 ? s.x + HW : s.x - HW, tx = Math.floor(edge / T);
    for (let ty = top; ty <= bot; ty++) if (G.solid(tx, ty, s.pass)) { s.x = st > 0 ? tx * T - HW - 0.01 : (tx + 1) * T + HW + 0.01; s.vx = 0; return; }
  }
}
function moveY(G, s, dy) {
  const steps = Math.ceil(Math.abs(dy) / (T * 0.45)) || 1, st = dy / steps; s.grounded = false;
  for (let i = 0; i < steps; i++) {
    const prevBottom = s.y + HH; s.y += st;
    const l = Math.floor((s.x - HW + 0.5) / T), rr = Math.floor((s.x + HW - 0.5) / T), edge = st > 0 ? s.y + HH : s.y - HH, ty = Math.floor(edge / T);
    for (let tx = l; tx <= rr; tx++) {
      const solid = G.solid(tx, ty, s.pass), ledge = st > 0 && !s.drop && G.oneWay(tx, ty) && prevBottom <= ty * T + 0.5;
      if (solid || ledge) { if (st > 0) { s.y = ty * T - HH - 0.01; s.grounded = true; } else s.y = (ty + 1) * T + HH + 0.01; s.vy = 0; return; }
    }
  }
  if (dy >= 0 && !s.grounded) {
    const l = Math.floor((s.x - HW + 0.5) / T), rr = Math.floor((s.x + HW - 0.5) / T), ty = Math.floor((s.y + HH + 1) / T);
    for (let tx = l; tx <= rr; tx++) if (G.solid(tx, ty, s.pass) || (!s.drop && G.oneWay(tx, ty) && Math.abs(s.y + HH - ty * T) < 1.5)) { s.grounded = true; break; }
  }
}
function physics(G, s, grav) {
  if (grav) s.vy = Math.min(MAX_FALL, s.vy + (s.vy < 0 ? GRAV_UP : GRAV_DOWN) * DT);
  moveX(G, s, s.vx * DT); moveY(G, s, s.vy * DT);
  const top = Math.floor((s.y - HH + 2) / T), bot = Math.floor((s.y + HH - 2) / T), lx = Math.floor((s.x - HW - 1) / T), rx = Math.floor((s.x + HW + 1) / T);
  s.wallL = s.wallR = false;
  for (let ty = top; ty <= bot; ty++) { if (G.solid(lx, ty, s.pass)) s.wallL = true; if (G.solid(rx, ty, s.pass)) s.wallR = true; }
}
const insideSlit = (G, s) => { for (const dx of [-HW + 1, 0, HW - 1]) for (const dy of [-HH + 1, 0, HH - 1]) if (G.at(Math.floor((s.x + dx) / T), Math.floor((s.y + dy) / T)) === '|') return true; return false; };
const approach = (v, t, st) => (v < t ? Math.min(v + st, t) : Math.max(v - st, t));
function pogoTarget(G, s) { // down-slash box: x +-28, y+42 +-34
  const x0 = Math.floor((s.x - 28) / T), x1 = Math.floor((s.x + 28) / T), y0 = Math.floor((s.y + 8) / T), y1 = Math.floor((s.y + 76) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const c = G.at(tx, ty); if (c === 'P') return 0.9; if (c === '^') return 0.95; }
  return 0;
}
const hazardHit = (G, s) => G.hazardAt(s.x, s.y + HH - 3) || G.hazardAt(s.x - HW + 2, s.y + HH - 3) || G.hazardAt(s.x + HW - 2, s.y + HH - 3) || G.hazardAt(s.x, s.y);

/** Run one policy. Returns events via cb: ('ground', s) ('cling', s) ('exit', door) ('touch', s) per step. */
function simulate(G, s, pol, ab, cb) {
  const sched = pol.dirs; let si = 0;
  let airborne = !s.grounded, groundT = 0, lastCol = -999;
  if (pol.jump) s.jumpBuf = 0;
  for (let t = 0; t < 3.2; t += DT) {
    while (si + 1 < sched.length && t >= sched[si + 1][0]) si++;
    const ax = sched[si][1];
    s.wallLock -= DT; s.atkCd -= DT; if (s.jumpBuf >= 0) { s.jumpBuf += DT; if (s.jumpBuf > JUMP_BUF) s.jumpBuf = -1; }
    if (s.grounded) { s.coyote = COYOTE; s.airDash = true; } else s.coyote -= DT;
    if (s.dashT > 0) {
      s.dashT -= DT; s.vy = 0; s.pass = true;
      if (s.dashT <= 0) { s.vx = s.facing * RUN * 0.9; if (!G.solidAt(s.x, s.y, false)) s.pass = false; }
    } else {
      if (s.pass && !insideSlit(G, s)) s.pass = false;
      if (ab.dash && pol.dash != null && !s.dashed && t >= pol.dash && (s.grounded || s.airDash || s.wallSlide)) {
        s.dashed = true; if (s.wallSlide) s.facing = -s.wallSlide; else if (ax) s.facing = Math.sign(ax);
        s.dashT = DASH_T; s.vx = s.facing * DASH_V; s.vy = 0; s.slashT = -1; if (!s.grounded) s.airDash = false;
      }
    }
    if (s.dashT <= 0) {
      if (s.wallLock <= 0) { s.vx = approach(s.vx, ax * RUN, (s.grounded ? ACC_G : ACC_A) * DT); if (ax) s.facing = Math.sign(ax); }
      const toward = (s.wallL && ax < 0) ? -1 : (s.wallR && ax > 0) ? 1 : 0;
      s.wallSlide = ab.grip && !s.grounded && toward && s.vy > -60 ? toward : 0;
      if (s.jumpBuf >= 0) {
        const onLedge = G.oneWay(Math.floor(s.x / T), Math.floor((s.y + HH + 2) / T));
        if (pol.drop && s.grounded && onLedge) { s.jumpBuf = -1; s.drop = true; s.y += 2; s.grounded = false; }
        else if (!pol.drop && s.coyote > 0) { s.jumpBuf = -1; s.vy = -JUMP_V; s.coyote = 0; s.jumpHeld = true; }
        else if (s.wallSlide) { s.jumpBuf = -1; s.vy = -JUMP_V * 0.92; s.vx = -s.wallSlide * 430; s.facing = -s.wallSlide; s.wallLock = 0.15; s.jumpHeld = true; s.airDash = true; }
      }
      if (s.drop && !G.oneWay(Math.floor(s.x / T), Math.floor((s.y + HH + 2) / T)) && !s.grounded && s.vy > 120) s.drop = false;
      if (s.jumpHeld && t >= pol.hold && s.vy < 0) { s.vy *= 0.42; s.jumpHeld = false; }
      if (s.vy >= 0) s.jumpHeld = false;
      if (s.wallSlide && s.vy > 0) s.vy = Math.min(s.vy, 170);
    }
    // pogo: down-slash when a plaque block or spikes are under us
    if (pol.pogo && s.slashT < 0 && s.atkCd <= 0 && !s.grounded && s.vy > 0 && s.dashT <= 0 && pogoTarget(G, s)) { s.slashT = 0; s.atkCd = ATK_CD; }
    if (s.slashT >= 0) { const k = pogoTarget(G, s); if (k) { s.vy = -720 * k; s.airDash = true; s.jumpHeld = false; s.slashT = -1; } else { s.slashT += DT; if (s.slashT > 0.11) s.slashT = -1; } }
    physics(G, s, s.dashT <= 0);
    if (s.grounded && s.vy >= 0) s.drop = false;
    if (hazardHit(G, s)) { if (s.slashT >= 0) { s.vy = -720 * 0.95; s.slashT = -1; } else return 'dead'; }
    // leaving the room
    const edge = s.x < 0 ? 'left' : s.x > G.pw ? 'right' : s.y < -4 ? 'top' : s.y > G.ph ? 'bottom' : null;
    if (edge) {
      let best = null, bd = Infinity;
      for (const [k, d] of Object.entries(G.doors)) if (d.edge === edge) { const dd = edge === 'left' || edge === 'right' ? Math.abs(d.y - s.y) : Math.abs(d.x - s.x); if (dd < bd) { bd = dd; best = k; } }
      if (best && G.def.doors[best]) { cb('exit', best); return 'exit'; }
      if (edge === 'bottom') return 'dead';
      s.x = Math.min(Math.max(s.x, HW), G.pw - HW);
    }
    cb('touch', s);
    if (ab.grip && s.wallSlide && s.vy > -60 && s.wallLock <= 0 && !pol.slide) { cb('cling', s); return 'cling'; }
    if (pol.slide && s.wallSlide) cb('cling', s);
    if (s.grounded) {
      const col = Math.floor(s.x / T);
      if (airborne) { cb('ground', s); return 'land'; }
      groundT += DT;
      if (pol.walk && col !== lastCol) { lastCol = col; if (cb('ground', s) === 'known' && t > 0) return 'walked'; }
      if (!pol.walk && !pol.jump && pol.dash == null && groundT > 0.05) return 'still';
      if (groundT > 0.6 && !pol.walk) return 'still';
      if (pol.walk && Math.abs(s.vx) < 1 && groundT > 0.1) return 'blocked';
    } else airborne = true;
  }
  return 'timeout';
}

// ---------------- policies ----------------
const DIRS = [[[0, -1]], [[0, 0]], [[0, 1]], [[0, 0], [0.18, -1]], [[0, 0], [0.18, 1]], [[0, -1], [0.2, 0]], [[0, 1], [0.2, 0]], [[0, -1], [0.25, 1]], [[0, 1], [0.25, -1]], [[0, -1], [0.45, 1]], [[0, 1], [0.45, -1]]];
function groundPolicies(ab, pogo, onLedge) {
  const out = [{ walk: true, dirs: [[0, -1]], hold: 9 }, { walk: true, dirs: [[0, 1]], hold: 9 }];
  for (const dirs of DIRS) for (const hold of [9, 0.07, 0.16]) for (const dash of ab.dash ? [null, 0.08, 0.25, 0.42] : [null]) for (const pg of pogo ? [false, true] : [false]) out.push({ jump: true, dirs, hold, dash, pogo: pg, run: true });
  if (ab.dash) for (const d of [-1, 1]) { out.push({ dirs: [[0, d]], hold: 9, dash: 0 }); out.push({ dirs: [[0, d], [0.2, 0]], hold: 9, dash: 0 }); }
  if (onLedge) for (const d of [-1, 0, 1]) out.push({ jump: true, drop: true, dirs: [[0, d]], hold: 9 });
  return out;
}
function airPolicies(ab, pogo) { // falling or popping up into a room
  const out = [];
  for (const dirs of DIRS) for (const dash of ab.dash ? [null, 0.15, 0.4] : [null]) for (const pg of pogo ? [false, true] : [false]) out.push({ dirs, hold: 9, dash, pogo: pg });
  return out;
}
function wallPolicies(side, ab, pogo) { // side: -1 wall on the left, 1 on the right
  const away = -side, out = [{ slide: true, dirs: [[0, side]], hold: 9 }, { dirs: [[0, away]], hold: 9 }];
  // a wall jump needs the stick toward the wall on the jump frame; the wall lock then ignores input for 0.15 s
  for (const dirs of [[[0.02, away]], [[0.02, away], [0.15, side]], [[0.02, away], [0.15, 0]], [[0.02, side]], [[0.02, away], [0.3, side]]]) for (const hold of [9, 0.1]) for (const dash of ab.dash ? [null, 0.2, 0.35] : [null]) for (const pg of pogo ? [false, true] : [false]) out.push({ jump: true, dirs: [[0, side], ...dirs], hold, dash, pogo: pg });
  if (ab.dash) out.push({ dirs: [[0, away]], hold: 9, dash: 0 });
  return out;
}

// ---------------- room search ----------------
function arrival(G, door) {
  if (door === '@' || door === 'S') {
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (G.g[y][x] === door) { const s = mkState((x + 0.5) * T, (y + 0.5) * T + (16 - HH) - 0.5); s.grounded = true; return { s, pols: 'ground' }; }
    return null;
  }
  const d = G.doors[door]; if (!d) return null;
  let px = d.x, py = d.y, vy = 0, vx = 0, facing = 1;
  if (d.edge === 'left') { px = d.x + 44; facing = 1; vx = 300; } else if (d.edge === 'right') { px = d.x - 44; facing = -1; vx = -300; }
  else if (d.edge === 'top') py = d.y + 48; else if (d.edge === 'bottom') { py = d.y - 56; vy = -980; }
  const s = mkState(px, py + (16 - HH) - 0.5); s.vx = vx; s.vy = vy; s.facing = facing;
  return { s, pols: 'air' };
}
const cloneS = (s) => ({ ...s });

/** BFS inside one room from an entry. Returns { exits:Set, relics:Set(ability), touched objects, nodes } */
function searchRoom(def, entry, ab) {
  let G = new Grid(def);
  const exits = new Set(), relics = new Set(), near = new Set();
  const objs = (def.objects ?? []).map((o, i) => ({ i, o, x: (o.x + 0.5) * T, y: (o.y + 0.5) * T }));
  const seen = new Map(); const queue = [];
  const nodeKey = (kind, s) => kind === 'g' ? `g${Math.floor(s.x / T)},${Math.floor((s.y + HH + 1) / T)}` : `w${s.wallSlide},${Math.floor(s.x / T)},${Math.floor(s.y / T)}`;
  const addNode = (kind, s) => {
    const k = nodeKey(kind, s); if (seen.has(k)) return 'known';
    const st = cloneS(s); st.vy = kind === 'g' ? 0 : Math.max(0, Math.min(st.vy, 170)); st.dashT = 0; st.dashed = false; st.jumpBuf = -1; st.slashT = -1; st.atkCd = 0; st.wallLock = 0; st.jumpHeld = false; st.drop = false;
    if (kind === 'g') { st.grounded = true; st.airDash = true; st.pass = false; }
    seen.set(k, { kind, s: st }); queue.push(k); return 'new';
  };
  const touch = (s) => {
    for (const ob of objs) {
      const o = ob.o;
      if (o.type === 'relic' && Math.abs(s.x - ob.x) < 26 && Math.abs(s.y - (ob.y - 10)) < 40) relics.add(o.ability);
      if (o.type !== 'relic' && s.grounded && Math.abs(s.x - ob.x) < 46 && Math.abs(s.y - ob.y) < 60) near.add(ob.i);
    }
  };
  const cb = (ev, v) => { if (ev === 'exit') { exits.add(v); return; } if (ev === 'touch') { touch(v); return; } if (ev === 'ground') return addNode('g', v); if (ev === 'cling') return addNode('w', v); };
  const run = (s, pol) => simulate(G, cloneS(s), pol, ab, cb);
  const a = arrival(G, entry); if (!a) return null;
  if (a.pols === 'ground') addNode('g', a.s); else for (const pol of airPolicies(ab, G.hasPogo)) run(a.s, pol);
  // explore; when the queue drains, scrub every plaque cell the player can hit and continue
  for (let pass = 0; pass < 6; pass++) {
    while (queue.length) {
      const n = seen.get(queue.shift());
      if (n.kind === 'g') { const s = n.s; const onLedge = G.oneWay(Math.floor(s.x / T), Math.floor((s.y + HH + 2) / T)); touch(s); for (const pol of groundPolicies(ab, G.hasPogo, onLedge)) run(s, pol); }
      else for (const pol of wallPolicies(n.s.wallSlide, ab, G.hasPogo)) run(n.s, pol);
    }
    let scrubbed = 0;
    for (const { kind, s } of seen.values()) {
      if (kind !== 'g') continue;
      const cx = Math.floor(s.x / T), fy = Math.floor((s.y + HH + 1) / T);
      for (const [dx, dy] of [[-1, -1], [-2, -1], [1, -1], [2, -1], [-1, -2], [-2, -2], [1, -2], [2, -2], [0, -3], [-1, -3], [1, -3], [0, 0], [-1, 0], [1, 0]]) {
        const tx = cx + dx, ty = fy + dy; if (G.at(tx, ty) === 'P') { G.g[ty][tx] = '.'; scrubbed++; }
      }
    }
    if (!scrubbed) break;
    G.hasPogo = G.g.some((r) => r.includes('P') || r.includes('^'));
    const old = [...seen.keys()]; for (const k of old) queue.push(k); // re-run from known spots on the opened grid
  }
  return { exits, relics, near, nodes: seen.size, grid: G, keys: [...seen.keys()] };
}

// Debug: node tests/reach.mjs --show <room> [entry] [abilities, e.g. DG]  draws reached standing (o) and cling (w) spots
const si = process.argv.indexOf('--show');
if (si > 0) {
  const id = process.argv[si + 1], entry = process.argv[si + 2] ?? '1', abs = process.argv[si + 3] ?? '';
  const r = searchRoom(byId[id], entry, { dash: abs.includes('D'), grip: abs.includes('G') });
  const g = r.grid.g.map((row) => row.slice());
  for (const k of r.keys) { const m = /^([gw])(-?\d+,)?(\d+),(\d+)$/.exec(k); if (!m) continue; const x = +m[3], y = +m[4]; if (m[1] === 'g' && g[y - 1]?.[x] !== undefined) g[y - 1][x] = 'o'; if (m[1] === 'w' && g[y]?.[x]) g[y][x] = 'w'; }
  console.log(g.map((row) => row.join('')).join('\n'));
  console.log('exits:', [...r.exits].join(','), ' relics:', [...r.relics].join(','), ' nodes:', r.nodes);
  process.exit(0);
}

// Debug: node tests/reach.mjs --trace-wall <room> <tx> <ty> <side>   wall jumps from a cling spot
const ti = process.argv.indexOf('--trace-wall');
if (ti > 0) {
  const [id, tx, ty, side] = process.argv.slice(ti + 1, ti + 5).map((v, i) => (i ? +v : v));
  const G = new Grid(byId[id]), ab2 = { dash: false, grip: true };
  const s0 = mkState(side > 0 ? (tx + 1) * T - HW - 0.01 : tx * T + HW + 0.01, (ty + 0.5) * T); s0.wallR = side > 0; s0.wallL = side < 0; s0.wallSlide = side; s0.vy = 100;
  for (const pol of wallPolicies(side, ab2, false)) {
    const s = { ...s0 }; let last = null;
    const r = simulate(G, s, pol, ab2, (ev, v) => { if (ev === 'cling') last = `cling ${v.wallSlide} ${Math.floor(v.x / T)},${Math.floor(v.y / T)}`; });
    console.log(JSON.stringify(pol.dirs), pol.hold, r, last, Math.round(s.x), Math.round(s.y));
  }
  process.exit(0);
}

// ---------------- 1+2. shape and links ----------------
for (const r of ROOMS) {
  const W = r.map[0].length, H = r.map.length;
  r.map.forEach((row, i) => { if (row.length !== W) fail(`${r.id}: row ${i} is ${row.length} wide, expected ${W}`); });
  const G = new Grid(r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = G.g[y][x], border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    if (border && c !== '#' && !(c >= '1' && c <= '9')) fail(`${r.id}: border cell (${x},${y}) is '${c}'`);
    if (!border && c >= '1' && c <= '9') fail(`${r.id}: door marker ${c} inside the room at (${x},${y})`);
  }
  for (const [k, d] of Object.entries(G.doors)) {
    if (!r.doors[k]) fail(`${r.id}: door marker ${k} has no link`);
    if (d.edge === 'left' || d.edge === 'right') {
      if (d.n !== 3) warn(`${r.id}: side door ${k} is ${d.n} tall (3 expected)`);
      const x = d.edge === 'left' ? 0 : W - 1, bottom = Math.max(...d.cells.map((c) => c[1]));
      if (!G.solid(x, bottom + 1) || !G.solid(d.edge === 'left' ? 1 : W - 2, bottom + 1)) fail(`${r.id}: side door ${k} has no floor beneath`);
    } else if (d.n < 2 || d.n > 3) warn(`${r.id}: vertical door ${k} is ${d.n} wide (2-3 expected)`);
  }
  for (const [k, l] of Object.entries(r.doors)) {
    if (!G.doors[k]) { fail(`${r.id}: link ${k} has no marker in the map`); continue; }
    const o = byId[l.to]; if (!o) { fail(`${r.id}: door ${k} leads to missing room ${l.to}`); continue; }
    const back = o.doors[l.door]; if (!back || back.to !== r.id || back.door !== k) fail(`${r.id}:${k} -> ${l.to}:${l.door} is not linked back`);
    const od = new Grid(o).doors[l.door], d = G.doors[k];
    const opp = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    if (od && d && opp[d.edge] !== od.edge) warn(`${r.id}:${k} (${d.edge}) -> ${l.to}:${l.door} (${od.edge}) edges do not face each other`);
  }
  if (r.map.join('').split('@').length > 2) fail(`${r.id}: more than one @`);
}

// ---------------- 3+4. route with ability progression ----------------
const cache = new Map();
const abKey = (ab) => (ab.dash ? 'D' : '-') + (ab.grip ? 'G' : '-');
function search(roomId, entry, ab) {
  const k = roomId + '|' + entry + '|' + abKey(ab);
  if (!cache.has(k)) cache.set(k, searchRoom(byId[roomId], entry, ab));
  return cache.get(k);
}
function explore(startRoom, startEntry, ab) {
  const seenE = new Set(), q = [[startRoom, startEntry]], relics = new Set(), rooms = new Set(), near = new Map();
  while (q.length) {
    const [rid, e] = q.shift(); const k = rid + ':' + e; if (seenE.has(k)) continue; seenE.add(k); rooms.add(rid);
    const r = search(rid, e, ab); if (!r) continue;
    for (const a of r.relics) relics.add(a);
    near.set(rid, new Set([...(near.get(rid) ?? []), ...r.near]));
    for (const x of r.exits) { const l = byId[rid].doors[x]; q.push([l.to, l.door]); }
  }
  return { entries: seenE, relics, rooms, near };
}
const START = 'crown-gate';
let ab = { dash: false, grip: false };
const stages = [];
for (let i = 0; i < 4; i++) {
  const ex = explore(START, '@', ab); stages.push({ ab: { ...ab }, ex });
  const nab = { dash: ab.dash || ex.relics.has('dash'), grip: ab.grip || ex.relics.has('grip') };
  if (abKey(nab) === abKey(ab)) break; ab = nab;
}
const final = stages[stages.length - 1];
for (const r of ROOMS) if (!final.ex.rooms.has(r.id)) fail(`route: room ${r.id} is never reached from '@'`);
for (const a of ['rinse', 'dash', 'grip']) if (!final.ex.relics.has(a)) fail(`route: relic ${a} is not reachable`);
// soft locks: every entry reached at a stage must lead back to the start room with that stage's abilities
for (const st of stages) for (const e of st.ex.entries) {
  const [rid, door] = e.split(':'); if (rid === START) continue;
  const back = explore(rid, door, st.ab);
  if (!back.rooms.has(START)) fail(`soft lock: entering ${rid} by ${door} with [${abKey(st.ab)}] there is no way back to ${START}`);
}
// objects the player can never stand next to
for (const r of ROOMS) {
  const n = final.ex.near.get(r.id) ?? new Set();
  (r.objects ?? []).forEach((o, i) => { if (o.type !== 'relic' && !n.has(i)) warn(`${r.id}: ${o.type}${o.id ? ' ' + o.id : ''} at (${o.x},${o.y}) cannot be reached`); });
}

// ---------------- report ----------------
console.log('BRISTLE reachability report');
console.log(`rooms: ${ROOMS.length}   stages: ${stages.map((s) => '[' + abKey(s.ab) + ']').join(' -> ')}   (D = Prime Dash, G = Floss Grip)`);
for (const r of ROOMS) {
  const doors = Object.keys(r.doors).sort(), entries = [...(r.map.join('').includes('@') ? ['@'] : []), ...doors];
  const parts = [];
  for (const st of stages) {
    const row = entries.map((e) => { const s = search(r.id, e, st.ab); return `${e}->${s ? [...s.exits].sort().join('') || '-' : '?'}`; }).join(' ');
    parts.push(`[${abKey(st.ab)}] ${row}`);
  }
  const first = stages.find((s) => s.ex.rooms.has(r.id));
  console.log(`  ${r.id.padEnd(16)} ${String(r.map[0].length).padStart(3)}x${String(r.map.length).padEnd(3)} first at [${first ? abKey(first.ab) : 'never'}]  ${VERBOSE ? '\n      ' + parts.join('\n      ') : parts[parts.length - 1]}`);
}
for (const w of warnings) console.log('  warn: ' + w);
if (problems.length) { console.log(`\nFAIL: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exitCode = 1; }
else console.log('\nOK: every room reachable, links two-way, relics on the route, no soft locks');
