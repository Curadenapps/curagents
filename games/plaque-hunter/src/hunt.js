/* Plaque Hunter — the hunt. Each side of the mouth is a row of teeth worked in three passes
   (outside faces, inside faces, chewing surfaces). One thumb does everything:
     drag on teeth      the swarm follows and lifts film (slow and together works best)
     hold still         the swarm focuses to a single tuft, for brackets, wisdom teeth and other tight spots
     drag through a gap a Prime slides between the teeth, in and out, gently
     tap a card         play a piece of kit from your hand (costs one charge) */
(function () {
  const PH = window.PH, ST = PH.Strip, W = PH.World, S = PH.Store, Art = PH.Art, A = PH.Audio, T = PH.TUNE, C = PH.C;
  const H = (PH.Hunt = { run: null });
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => t * t * (3 - 2 * t);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---- camera: world units <-> screen pixels ----
  const Cam = (PH.Cam = {
    x: 0, y: 0, s: 5, cx: 200, cy: 300,
    fit(b, r) { const s = Math.min(r.w / (b.x1 - b.x0), r.h / (b.y1 - b.y0)); return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s, cx: r.x + r.w / 2, cy: r.y + r.h / 2 }; },
    set(c) { Cam.x = c.x; Cam.y = c.y; Cam.s = c.s; Cam.cx = c.cx; Cam.cy = c.cy; },
    apply(ctx, dpr) { ctx.setTransform(dpr * Cam.s, 0, 0, dpr * Cam.s, dpr * (Cam.cx - Cam.x * Cam.s), dpr * (Cam.cy - Cam.y * Cam.s)); },
    toWorld(sx, sy) { return { x: (sx - Cam.cx) / Cam.s + Cam.x, y: (sy - Cam.cy) / Cam.s + Cam.y }; },
    toScreen(x, y) { return { x: (x - Cam.x) * Cam.s + Cam.cx, y: (y - Cam.y) * Cam.s + Cam.cy }; },
  });
  // The home screen map of the whole Smile.
  H.smileCam = (top, bottom, pad) => { const G = PH.G, b = W.bounds, p = pad || 0; return Cam.fit({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p }, { x: 10, y: top, w: G.w - 20, h: Math.max(120, G.h - top - bottom) }); };
  const field = () => { const G = PH.G; return { x: 0, y: 112, w: G.w, h: Math.max(160, G.h - 112 - 118) }; };

  // ---- setting up ----
  const HOME = { // which pass each Plaqling prefers, and which cells suit it
    filmo: { s: [0, 2], fit: (c) => c.e > 1.2 && !c.tight }, gumlin: { s: [0, 1], fit: (c) => c.gum && !c.tight }, stickler: { s: [1, 0], fit: (c) => c.e > 1.2 && !c.tight },
    speckle: { s: [2], fit: (c) => c.pit && c.e > 1.3 }, mole: { s: [2, 1], fit: (c) => c.tooth.i >= 5 && c.e > 1.3 && !c.hard },
    yawnster: { s: [0, 1], fit: (c) => c.e > 1.4 && !c.tight }, nightcap: { s: [1, 0], fit: (c) => c.e > 1.4 && !c.tight },
    glimmer: { s: [0, 1, 2], fit: (c) => c.e > 1.4 && !c.tight }, goldie: { s: [0, 1, 2], fit: (c) => c.e > 1.4 && !c.tight },
    tot: { s: [1], fit: (c) => c.gum && c.tooth.i >= 3 && !c.tight }, wirewalker: { s: [0], fit: (c) => c.tight && c.tooth.f.bracket != null },
    lurker: { s: [2], fit: (c) => c.hole },
  };
  function placeCritters(r, zi, list) {
    const Q = r.scenes[zi], mine = [];
    for (const id of list) {
      const h = HOME[id], s = pick(h.s), P = Q.passes[s];
      const cands = P.cells.filter((c) => h.fit(c) && (id === 'lurker' || !c.hard) && mine.every((m) => m.s !== s || Math.hypot(m.x - c.x, m.y - c.y) > 5));
      if (!cands.length) continue;
      const c = pick(cands), sticky = id === 'stickler';
      const mk = (cell, rad) => ({ id, zi, s, cell, x: cell.x, y: cell.y, r: rad, state: 'sit', t: Math.random() * 9, seed: Math.random() * 9, hops: 0, hopT: 0.8, stun: 0 });
      if (id !== 'lurker') { ST.addFilm(P, c, 1, sticky); for (const n of c.nb) ST.addFilm(P, n, 0.85, sticky); }
      if (id === 'tot' && !r.loose) { c.hard = true; c.p = 1; }
      mine.push(mk(c, id === 'speckle' ? 1.25 : id === 'tot' ? 2.2 : 1.95));
      if (id === 'speckle') for (const n of c.nb.filter((n) => n.e > 1.2).slice(0, 2)) mine.push(mk(n, 1.15));
    }
    for (const P of Q.passes) { let sum = 0; for (const c of P.cells) { c.p0 = c.p; if (!c.hard) sum += c.p; } P.p0sum = Math.max(sum, 0.001); }
    r.critters.push(...mine);
  }
  function randomFeats(rank, first) {
    const out = {}; if (first) return out;
    const pool = ['sore', 'crown']; if (rank >= 1) pool.push('hole', 'braces'); if (rank >= 2) pool.push('bridge', 'wisdom');
    const n = Math.min(4, 1 + rank), used = new Set();
    for (let k = 0; k < n; k++) { const q = (Math.random() * 4) | 0, f = pick(pool); if (f === 'braces' && used.has('braces')) continue; used.add(f); (out[q] = out[q] || []).push(f); }
    return out;
  }

  H.start = function (opts) {
    opts = opts || {};
    const d = S.data, tide = S.tide(), rank = S.rank().index, streak = S.streakNow().count, kit = d.kit, m = opts.mission || null;
    const first = !d.tutorial && !m, stale = S.staleness(), hrs = S.hoursSinceRun();
    const coverage = first ? 0.5 : m ? 0.62 : 0.45 + 0.25 * stale + 0.03 * rank;
    const sticky = first ? 0.08 : m ? 0.22 : clamp(0.14 + Math.max(0, hrs - 14) / 40 + 0.03 * rank, 0.1, 0.55);
    const wear = clamp((S.brushAge() - 60) / 60, 0, 1), zones = m ? m.zones : [0, 1, 2, 3];
    const feats = m ? m.feats : randomFeats(rank, first);
    const sw = new Art.Swarm(T.swarm); sw.live = Math.round(T.swarm * (1 - 0.35 * wear));
    const r = (H.run = {
      mission: m, practice: !!m, slot: tide.slot, first, easy: d.settings.easy, zones, zoneSecs: d.settings.short ? T.shortZoneSecs : T.zoneSecs,
      zi: 0, zt: 0, pi: -1, phase: 'count', countT: 3.4, countN: 9, time: 0, doneT: 0, paused: false, flip: 0,
      swarm: sw, fray: wear * 0.5, lx: 0, ly: 0, plx: 0, ply: 0, gx: 0, gy: 0, vs: 0, spread: 0, grace: 0, focus: 0, camX: 0,
      togAcc: 0, togTime: 0, idle: 99, auto: true, warnT: 0, warns: 0, skip: false, idb: null,
      critters: [], caught: {}, nCaught: 0, shown: 0, combo: 0, comboT: 0, points: 0,
      fx: [], foam: [], bubbles: [], pops: [], shots: [], rings: [], shake: 0, wave: null,
      deck: shuffle(d.deck.slice()), hand: [null, null, null], discard: [], charge: 1, aim: -1, eff: { foam: 0, single: 0, primes: 0, soft: 0 },
      sugarAt: -1, sugar: null, said: {}, ouch: 0, ouchT: 0, idbOuch: 0, gapsDone: 0, tight: 0, soothed: 0, used: 0,
      loose: d.link.checkupBoost, power: (50 / T.swarm) * (1 + 0.07 * kit.fil), slack: (1 + 0.08 * kit.soft) * (d.settings.easy ? 1.6 : 1),
      counts: new Uint16Array(512), scenes: [],
    });
    const seed = Math.random() * 50, rare = (Math.random() * zones.length) | 0;
    const totOk = !first && !m && d.runs >= 2 && (d.link.checkupBoost || !d.link.checkup || S.now() - d.link.checkup > 150 * 864e5);
    zones.forEach((q, zi) => {
      const f = (feats[q] || []).concat(feats.all || []), Q = ST.build(q, f); r.scenes.push(Q);
      Q.hot = first ? -1 : (Math.random() * 3) | 0; // one pass per side is the sticky one today
      for (let s = 0; s < 3; s++) ST.seed(Q, s, { coverage: coverage * (s === Q.hot ? 1.15 : 1), sticky: s === Q.hot ? Math.min(0.5, sticky * 1.8) : Math.min(0.3, sticky), seed: seed + q * 7.7 + s * 3.1 });
      if (r.loose) for (const t of Q.teeth) if (t.f.hole) { t.f.filled = true; for (const c of Q.passes[2].cells) if (c.hole) { c.hard = false; c.hole = false; } }
      const list = ['filmo', 'gumlin', 'stickler'];
      if (zi === 0) list.push('filmo'); if (zi === 1) list.push('speckle'); if (zi === 2 || zones.length < 3) list.push(tide.slot === 'am' ? 'yawnster' : 'nightcap'); if (zi === zones.length - 1) list.push('mole');
      for (let i = 0; i < Math.min(rank, 3); i++) list.push(['filmo', 'gumlin', 'stickler'][(zi + i) % 3]);
      if (!m && streak >= 2 && zi === rare) list.push('glimmer');
      if (!m && streak >= 6 && zi === (rare + 2) % zones.length) list.push('goldie');
      if (f.includes('braces')) list.push('wirewalker', 'wirewalker');
      if (f.includes('hole') && r.loose) list.push('lurker');
      if (zi === zones.length - 1 && totOk) list.unshift('tot');
      placeCritters(r, zi, list);
      for (const g of Q.gaps) g.germ = g.k === 'tunnel' ? 'troll' : Math.random() < 0.45 ? 'gapper' : null;
    });
    r.gapsTotal = r.scenes.reduce((n, Q) => n + Q.gaps.length, 0);
    enterPass(r, 0, 0, true);
    A.unlock(); A.music(tide.slot, 1); A.layers(1);
    PH.UI.hudStart(r);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => (H.wake = l)).catch(() => {}); } catch (e) { /* optional */ }
  };

  // ---- cards: the kit you carry. A hand of three, refilled at every pass; each play costs one charge. ----
  function deal(r) {
    for (let i = 0; i < 3; i++) {
      if (r.hand[i]) continue;
      if (!r.deck.length) { r.deck = shuffle(r.discard); r.discard = []; }
      if (r.deck.length) r.hand[i] = r.deck.pop();
    }
    PH.UI.hudHand(r);
  }
  function addCharge(r, n) { r.charge = Math.min(3, r.charge + n); PH.UI.hudHand(r); }
  H.play = function (i) {
    const r = H.run; if (!r || r.phase !== 'play') return;
    const id = r.hand[i]; if (!id) return;
    if (r.aim === i) { r.aim = -1; PH.UI.hudHand(r); return; }
    if (r.charge < 1) { A.nope(); PH.UI.toast('No charge. Catch Plaqlings to charge up.'); return; }
    if (id === 'rinse') { r.aim = i; PH.UI.hudHand(r); if (!r.said.aim) { r.said.aim = 1; PH.UI.toast('Tap where the rinse should land.'); } return; }
    spend(r, i);
    if (id === 'pulse') { r.wave = { x: r.lx, y: r.ly, rad: 0 }; A.hydro(); A.buzz(70); }
    else { r.eff[id] = id === 'foam' || id === 'single' ? 6 : 8; A.fanfare(); A.buzz(40); r.rings.push({ x: r.lx, y: r.ly, t: 0, life: 0.6, R: 9, color: C.sky }); }
    r.pops.push({ text: PH.CARDS_BY_ID[id].name, x: r.lx, y: r.ly - 4, t: 0 });
  };
  function spend(r, i) { r.discard.push(r.hand[i]); r.hand[i] = null; r.charge--; r.used++; r.aim = -1; PH.UI.hudHand(r); }

  // world position on the current row: u along the row, v up from the gumline (or across, on the chewing pass)
  const at = (Q, s, u, v) => ({ x: Q.X(u), y: s < 2 ? Q.oy * v : v });
  function guideAt(r) {
    const Q = r.Q, s = r.pi, seg = r.zoneSecs / 3, f = clamp((r.zt - s * seg - 0.5) / (seg - 0.9), 0, 1), u0 = 4, u1 = Q.U - 4;
    const u = s === 1 ? u1 + (u0 - u1) * f : u0 + (u1 - u0) * f;
    const v = s < 2 ? 3.6 + 2.6 * Math.sin(r.time * 2.6) : 1.6 * Math.sin(r.time * 2.6);
    const p = at(Q, s, u, v); p.x += Math.cos(r.time * 6.2) * 1.1; p.y += Math.sin(r.time * 6.2) * 1.1; return p;
  }
  function enterPass(r, zi, pi, first) {
    const zoneChange = zi !== r.zi || first;
    r.zi = zi; r.pi = pi; r.Q = r.scenes[zi]; r.P = r.Q.passes[pi]; r.idb = null; r.grace = 1.2; r.focus = 0;
    if (r.counts.length < r.P.cells.length) r.counts = new Uint16Array(r.P.cells.length + 64);
    const g = guideAt(r); r.gx = g.x; r.gy = g.y;
    if (zoneChange || r.auto) { r.lx = r.plx = g.x; r.ly = r.ply = g.y; r.swarm.place(g.x, g.y, 5); r.camX = g.x; }
    if (first) return;
    r.flip = 1; A.buzz(zoneChange ? [90, 70, 90] : 25);
    PH.UI.hudSurface(pi); deal(r); if (!(zi === 0 && pi === 0)) addCharge(r, 1);
    if (zoneChange) { PH.UI.hudZone(r.zones[zi]); PH.UI.banner(PH.QUADS[r.zones[zi]], zi === 0 ? 'Start your brush here.' : 'Move your brush here.'); A.gong(); A.layers(Math.min(4, zi + 1)); }
    else if (pi === r.Q.hot && !r.said.hot) { r.said.hot = 1; PH.UI.toast('Sticky side. The orange film takes longer.'); }
    if (r.first && zi === 0 && pi === 1) PH.UI.toast('Now the inside faces. Same teeth, other side.');
    if (r.first && zi === 0 && pi === 2) PH.UI.toast('Chewing surfaces. Film sits in the grooves.');
    if (r.first && zi === 1 && pi === 0) PH.UI.toast('Tap a card to use your kit. Each one costs a charge.');
  }

  function catchIt(r, cr) {
    cr.state = 'gone'; r.caught[cr.id] = (r.caught[cr.id] || 0) + 1; r.nCaught++;
    r.combo = r.comboT > 0 ? r.combo + 1 : 1; r.comboT = 2.6;
    const pts = 10 * Math.min(r.combo, 5); r.points += pts;
    A.pop(r.combo); A.buzz(18);
    const s = Cam.toScreen(cr.x, cr.y); r.bubbles.push({ id: cr.id, x: s.x, y: s.y, t: 0, r: cr.r * Cam.s, seed: cr.seed });
    r.pops.push({ text: '+' + pts, x: cr.x, y: cr.y - 2.4, t: 0 });
    for (let i = 0; i < 7; i++) r.fx.push({ x: cr.x, y: cr.y, vx: Math.cos(i * 0.9) * 9, vy: Math.sin(i * 0.9) * 9, t: 0, life: 0.45, s: 0.7, rot: i });
    if (r.nCaught % 3 === 0) addCharge(r, 1);
    if (!S.data.guide[cr.id] && !r.said[cr.id]) { r.said[cr.id] = 1; PH.UI.toast('New in your Field Guide: ' + PH.SPECIES_BY_ID[cr.id].name); }
  }
  function cellCleared(r, c) {
    r.points += 0.25; if (c.tight) r.tight++;
    if (Math.random() < 0.3) r.fx.push({ x: c.x, y: c.y, vx: 0, vy: 0, t: 0, life: 0.5, s: 0.8 + Math.random() * 0.6, rot: Math.random() * 3 });
    const t = c.tooth, cells = t.cells[r.pi];
    if (cells.every((k) => k.p <= 0 || k.hard)) { t.flash = 1; r.points += 4; A.chime(); }
  }
  function gapDone(r, g, sg) {
    g.done = true; g.prog = 1; g.flash = 1.4; r.gapsDone++; r.points += 12; r.idb = null; A.chime(); A.buzz(22);
    PH.UI.hudGaps(r.gapsDone, r.gapsTotal);
    const mx = (sg.x0 + sg.x1) / 2, my = (sg.y0 + sg.y1) / 2;
    if (g.germ) catchIt(r, { id: g.germ, x: mx, y: my, r: 1.7, seed: g.i });
    else r.pops.push({ text: '+12', x: mx, y: my - 2, t: 0 });
  }
  function ouch(r, x, y, idb) {
    if (r.ouchT > 0) return; r.ouchT = 1.1; r.ouch++; if (idb) r.idbOuch++; r.combo = 0; r.comboT = 0; r.shake = 0.18;
    r.togAcc = Math.max(0, r.togAcc - 0.6); A.nope(); A.buzz(45);
    r.rings.push({ x, y, t: 0, life: 0.5, R: 5, color: C.cerise });
    r.pops.push({ text: 'Too fast', x, y: y - 2, t: 0, warn: true });
  }
  function splash(r, x, y) {
    const R = 9.5; r.shake = 0.3; A.hydro(); A.buzz(60);
    r.rings.push({ x, y, t: 0, life: 0.6, R, color: C.sky, fill: true });
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, d = Math.random() * R * 0.8; r.foam.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vy: -(2 + Math.random() * 5), t: 0, life: 0.7 + Math.random() * 0.6, r: 0.4 + Math.random() * 0.7 }); }
    for (const c of r.P.cells) if (c.p > 0 && !c.hard && Math.hypot(c.x - x, c.y - y) < R) { c.sticky = false; c.p = Math.max(0.28, c.p * 0.5); }
    for (const cr of r.critters) if (cr.zi === r.zi && cr.s === r.pi && cr.state !== 'gone' && Math.hypot(cr.x - x, cr.y - y) < R + 1) cr.stun = 4;
  }
  H.pause = function (on) { const r = H.run; if (!r || r.phase === 'done') return; r.paused = on; if (on) A.suspend(); else A.resume(); PH.UI.pauseShow(on); };
  H.quit = function () { H.run = null; A.resume(); A.stopMusic(); A.fizz(0); if (H.wake) { try { H.wake.release(); } catch (e) { /* gone already */ } H.wake = null; } };

  function nearestGap(r, w) {
    let best = null, bd = 2.9;
    for (const g of r.Q.gaps) {
      if (g.done) continue; const sg = ST.gapSeg(r.Q, g, r.pi); if (!sg) continue;
      const dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, t = clamp(((w.x - sg.x0) * dx + (w.y - sg.y0) * dy) / (dx * dx + dy * dy), 0, 1), d = Math.hypot(w.x - sg.x0 - dx * t, w.y - sg.y0 - dy * t);
      if (d < bd) { bd = d; best = { g, sg }; }
    }
    return best;
  }

  // ---- one frame ----
  H.update = function (dt) {
    const r = H.run; if (!r || r.paused) return;
    const G = PH.G, sw = r.swarm, kit = S.data.kit, eff = r.eff; r.time += dt;
    for (const f of r.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; } r.fx = r.fx.filter((f) => f.t < f.life);
    for (const f of r.foam) { f.t += dt; f.y += f.vy * dt; } r.foam = r.foam.filter((f) => f.t < f.life);
    for (const p of r.pops) p.t += dt; r.pops = r.pops.filter((p) => p.t < 1);
    for (const g of r.rings) g.t += dt; r.rings = r.rings.filter((g) => g.t < g.life);
    r.jar = PH.UI.jarPos();
    for (const b of r.bubbles) { b.t += dt / 0.75; if (b.t >= 1 && !b.done) { b.done = true; r.shown++; PH.UI.hudJar(r.shown); } }
    r.bubbles = r.bubbles.filter((b) => !b.done);
    r.shake = Math.max(0, r.shake - dt); r.flip = Math.max(0, r.flip - dt / 0.45); r.ouchT -= dt;
    for (const k in eff) eff[k] = Math.max(0, eff[k] - dt);
    // camera: fixed scale, slides along the row with the swarm
    const fr = field(), s = Math.min(fr.h / 28, fr.w / 31), half = fr.w / s / 2, lim = Math.max(0, r.Q.U / 2 + 3 - half);
    r.camX += (clamp(r.lx, -lim, lim) - r.camX) * Math.min(1, dt * 1.7);
    Cam.set({ x: clamp(r.camX, -lim, lim) + (Math.random() - 0.5) * r.shake * 2, y: (r.pi < 2 ? r.Q.oy * 4.4 : 0) + (Math.random() - 0.5) * r.shake * 2, s, cx: fr.x + fr.w / 2, cy: fr.y + fr.h / 2 });

    if (r.phase === 'count') {
      r.countT -= dt; const n = Math.ceil(r.countT);
      if (n !== r.countN) { r.countN = n; if (n > 0 && n <= 3) { PH.UI.countdown(n); A.count(false); } else if (n <= 0) { PH.UI.countdown(null); A.count(true); r.phase = 'play'; r.zi = -1; enterPass(r, 0, 0); if (r.first) PH.UI.toast('Drag slowly. The 5,460 follow your thumb.'); } }
      sw.update(dt, r.lx, r.ly, 5, r.time, r.fray); return;
    }
    if (r.phase === 'done') {
      r.doneT += dt; r.lx += Math.cos(r.doneT * 5) * 14 * dt; r.ly += Math.sin(r.doneT * 5) * 14 * dt; sw.update(dt, r.lx, r.ly, 7, r.time, 0);
      if (r.doneT > 1.8 && !r.sent) { r.sent = true; finish(r); }
      return;
    }

    // clock: three passes per side
    r.zt += dt;
    if (r.zt >= r.zoneSecs) {
      if (r.zi < r.zones.length - 1) { r.zt = 0; enterPass(r, r.zi + 1, 0); }
      else { r.phase = 'done'; r.doneT = 0; A.fizz(0); A.fanfare(); A.buzz([60, 50, 60, 50, 160]); PH.UI.hudEnd(); return; }
    } else { const pi = Math.min(2, Math.floor(r.zt / (r.zoneSecs / 3))); if (pi !== r.pi) enterPass(r, r.zi, pi); }
    const Q = r.Q, P = r.P, side = r.pi < 2;
    const done = r.zi * r.zoneSecs + r.zt, total = r.zones.length * r.zoneSecs;
    PH.UI.hudTime(done / total, Math.ceil(total - done));

    // input: thumb on a gap slides a Prime; thumb on teeth leads the swarm; no thumb and Fila leads
    const gp = guideAt(r); r.gx = gp.x; r.gy = gp.y;
    const inp = G.input; let tx = r.lx, ty = r.ly, k = 0;
    if (inp.down) {
      const w = Cam.toWorld(inp.x, inp.y);
      if (inp.fresh) {
        inp.fresh = false; r.grace = 0.45;
        if (r.aim >= 0) { spend(r, r.aim); r.skip = true; const from = Cam.toWorld(G.w * 0.5, fr.y + fr.h); r.shots.push({ x0: from.x, y0: from.y, x1: w.x, y1: w.y, t: 0 }); }
        else { const hit = nearestGap(r, w); if (hit) { r.idb = { g: hit.g, sg: hit.sg, x: w.x, y: w.y, sp: 0 }; if (!r.said.idb) { r.said.idb = 1; PH.UI.toast('A Prime. Slide it through the gap, in and out, gently.'); } } }
      }
      if (r.skip) { /* this touch placed the rinse */ }
      else if (r.idb) {
        const b = r.idb, sg = b.sg, dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, len = Math.hypot(dx, dy);
        const t = clamp(((w.x - sg.x0) * dx + (w.y - sg.y0) * dy) / (len * len), -0.25, 1.25), px = sg.x0 + dx * t, py = sg.y0 + dy * t;
        const moved = Math.hypot(px - b.x, py - b.y), sp = moved / Math.max(dt, 0.001); b.sp += (sp - b.sp) * Math.min(1, dt * 12); b.x = px; b.y = py;
        if (t > 0 && t < 1 && r.grace <= 0) {
          if (b.sp > 46 * r.slack && eff.primes <= 0) ouch(r, px, py, true);
          else { b.g.prog += (moved / (len * 2.2)) * (1 + 0.15 * kit.glide) * (eff.primes > 0 ? 3 : 1); if (moved > 0.02 && Math.random() < 0.4) r.foam.push({ x: px, y: py, vy: -3, t: 0, life: 0.5, r: 0.35 }); if (b.g.prog >= 1) gapDone(r, b.g, sg); }
        }
      } else { tx = w.x; ty = w.y; k = Math.min(1, dt * 16); }
      r.idle = 0; if (!r.skip) r.auto = false;
    } else {
      r.skip = false; r.idb = null; r.idle += dt;
      if (r.idle > T.autoAfter && !r.auto) { r.auto = true; r.grace = 0.6; if (!r.said.auto && r.togTime > 1) { r.said.auto = 1; PH.UI.toast('Hands full? Fila leads while you brush.'); } }
      if (r.auto) { tx = gp.x; ty = gp.y; k = Math.min(1, dt * 5); }
    }
    r.lx += (tx - r.lx) * k; r.ly += (ty - r.ly) * k;
    const v = Math.hypot(r.lx - r.plx, r.ly - r.ply) / Math.max(dt, 0.001); r.plx = r.lx; r.ply = r.ly;
    r.grace = Math.max(0, r.grace - dt);
    r.vs += ((r.grace > 0 ? 0 : v) - r.vs) * Math.min(1, dt * 5);
    const want = eff.soft > 0 ? 0 : clamp((r.vs - T.vGentle * r.slack) / ((T.vFast - T.vGentle) * r.slack), 0, 1.3);
    r.spread += (want - r.spread) * Math.min(1, dt * (want > r.spread ? 7 : 2.2));
    const coh = 1 - Math.min(1, r.spread), leading = inp.down && !r.idb && !r.skip;
    if (leading) { r.togAcc += coh * dt; r.togTime += dt; }
    PH.UI.hudTogether(coh);
    r.warnT -= dt;
    if (r.spread > 0.85 && r.warnT <= 0 && leading) { r.warnT = 7; A.scatter(); A.buzz(30); if (r.warns++ < 3) PH.UI.toast('Easy. Slow and soft keeps them together.'); }
    // focus: hold still and the swarm tightens to a single tuft
    const still = leading && r.vs < 5 && r.grace <= 0;
    r.focus = eff.single > 0 ? Math.min(1, r.focus + dt * 6) : clamp(r.focus + dt * (still ? 2.1 * (1 + 0.2 * kit.focus) : -5), 0, 1);
    const R0 = (r.easy ? 5.6 : 5) * (1 + 1.5 * r.spread), R = R0 + ((eff.single > 0 ? 2.8 : 1.9) - R0) * ease(r.focus);
    sw.update(dt, r.lx, r.ly, R, r.time, r.fray + r.spread * 0.25);

    // cleaning: every spark resting on a cell lifts a little film
    const cnt = r.counts; cnt.fill(0, 0, P.cells.length);
    for (let i = 0; i < sw.live; i++) { const idx = ST.cellAt(P, sw.x[i], sw.y[i]); if (idx >= 0) cnt[idx]++; }
    const power = (r.auto ? (r.easy ? T.autoPowerEasy : T.autoPower) : 1) * r.power * (T.zoneSecs / r.zoneSecs) * (eff.foam > 0 ? 2 : 1); let work = 0;
    for (let i = 0; i < P.cells.length; i++) {
      if (!cnt[i]) continue; const c = P.cells[i];
      if (c.p <= 0 || c.hard) continue;
      const tightK = c.tight ? 0.1 + 0.9 * r.focus : 1;
      c.p -= cnt[i] * power * (c.sticky ? 0.33 : 1) * (c.slick ? 2 : 1) * tightK * dt; work += cnt[i] * tightK;
      if (c.tight && r.focus < 0.3 && !r.auto && !r.said.tight && cnt[i] > 6) { r.said.tight = 1; PH.UI.toast('Tight spot. Hold still and the swarm focuses.'); }
      if (c.p <= 0.03) { c.p = 0; cellCleared(r, c); }
      else if (Math.random() < (eff.foam > 0 ? 0.02 : 0.004) * cnt[i]) r.foam.push({ x: c.x, y: c.y, vy: -(2 + Math.random() * 3), t: 0, life: 0.6, r: 0.25 + Math.random() * 0.4 });
    }
    A.fizz(work / sw.live);
    for (const t of Q.teeth) if (t.flash > 0) t.flash -= dt * 1.4;
    for (const g of Q.gaps) if (g.flash > 0) g.flash -= dt;
    r.comboT -= dt;
    if (r.easy && r.auto) for (const g of Q.gaps) { if (g.done) continue; const sg = ST.gapSeg(Q, g, r.pi); if (sg && Math.abs((sg.x0 + sg.x1) / 2 - r.lx) < 3) { g.prog += dt * 0.6; if (g.prog >= 1) gapDone(r, g, sg); } }

    // sore gums: tender along the gumline, calm if you go slowly
    if (side) for (const t of Q.teeth) {
      if (!t.sore) continue;
      const near = Math.abs(r.lx - Q.X(t.u)) < t.w / 2 + 1 && Q.oy * r.ly < 4.2;
      if (!near || r.auto || r.idb) continue;
      if (r.vs > T.vGentle * 0.6 * r.slack && r.focus < 0.4 && r.grace <= 0 && eff.soft <= 0) { ouch(r, Q.X(t.u), Q.oy * 0.6, false); if (!r.said.sore) { r.said.sore = 1; PH.UI.toast('Sore gum. Go extra slowly along there.'); } }
      else if (leading) { t.soothe += dt; if (t.soothe > 2) { t.sore = false; r.soothed++; r.points += 10; r.pops.push({ text: 'Calmer', x: Q.X(t.u), y: Q.oy * 0.6 - 2, t: 0 }); r.rings.push({ x: Q.X(t.u), y: Q.oy * 0.6, t: 0, life: 0.6, R: 5, color: C.sky }); } }
    }
    // a hole keeps feeding film to the cells round it
    if (r.pi === 2) for (const t of Q.teeth) {
      if (!t.f.hole || t.f.filled) continue;
      t.f.clock = (t.f.clock || 0) + dt;
      if (t.f.clock > 2.6) { t.f.clock = 0; const ring = t.cells[2].filter((c) => !c.hard && c.p < 0.5 && Math.hypot(c.u - t.f.hole.du, c.v - t.f.hole.dv) < 3.4); for (let i = 0; i < 2 && ring.length; i++) ST.addFilm(P, pick(ring), 0.9, false); if (!r.said.hole) { r.said.hole = 1; PH.UI.toast('A hole keeps feeding film. Fixing it is a check-up job.'); } }
    }

    // Plaqlings
    for (const cr of r.critters) {
      if (cr.zi !== r.zi || cr.s !== r.pi || cr.state === 'gone') continue; cr.t += dt; cr.stun = Math.max(0, cr.stun - dt);
      if (cr.state === 'hop') { cr.ht += dt / 0.3; const e = ease(Math.min(1, cr.ht)); cr.x = cr.fx + (cr.cell.x - cr.fx) * e; cr.y = cr.fy + (cr.cell.y - cr.fy) * e; if (cr.ht >= 1) cr.state = 'sit'; continue; }
      if (cr.id === 'imp' && cr.stun <= 0) {
        cr.hopT -= dt; const dl = Math.hypot(cr.x - r.lx, cr.y - r.ly);
        if (dl < 8 && cr.hopT <= 0 && cr.hops < 4) {
          const far = P.cells.filter((c) => !c.hard && !c.tight && c.e > 1.1 && Math.hypot(c.x - cr.x, c.y - cr.y) > 5 && Math.hypot(c.x - cr.x, c.y - cr.y) < 13 && Math.hypot(c.x - r.lx, c.y - r.ly) > dl + 2);
          if (far.length) { const c = pick(far); cr.fx = cr.x; cr.fy = cr.y; cr.cell = c; cr.ht = 0; cr.state = 'hop'; cr.hops++; cr.hopT = 1.3; ST.addFilm(P, c, 0.95, false); for (const n of c.nb.slice(0, 3)) ST.addFilm(P, n, 0.7, false); continue; }
        }
      }
      if (cr.cell.p <= 0 && !cr.cell.hard) catchIt(r, cr);
    }

    // rinse shots, sonic pulse, sugar rain
    for (const sh of r.shots) { sh.t += dt / 0.5; if (sh.t >= 1 && !sh.hit) { sh.hit = true; splash(r, sh.x1, sh.y1); } }
    r.shots = r.shots.filter((sh) => !sh.hit);
    if (r.wave) {
      const w = r.wave, prev = w.rad; w.rad += 75 * dt;
      for (const c of P.cells) { const dd = Math.hypot(c.x - w.x, c.y - w.y); if (dd >= prev && dd < w.rad && c.p > 0 && !c.hard) { c.sticky = false; c.p = Math.max(0.3, c.p * 0.6); } }
      if (w.rad > 90) r.wave = null;
    }
    const sugary = Q.feats.includes('sugar') || (!r.mission && r.zi === 2);
    if (sugary && r.sugarAt !== r.zi && r.zt > r.zoneSecs * 0.12 && r.zt < r.zoneSecs * 0.3) {
      r.sugarAt = r.zi; const spots = [];
      for (let i = 0; i < 40 && spots.length < 3; i++) { const c = pick(P.cells); if (c.e > 1.3 && !c.hard && !c.tight && spots.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > 8)) spots.push(c); }
      r.sugar = { drops: [], pass: P };
      spots.forEach((c, i) => { for (let j = 0; j < 5; j++) r.sugar.drops.push({ c: j ? pick(c.nb.concat(c)) : c, t: -i * 0.25 - j * 0.07, imp: j === 0 && i < 2, hue: (i * 5 + j) % 3 }); });
      PH.UI.banner('Sugar rain', 'Catch the Sugar Imps.'); A.sugar();
    }
    if (r.sugar) for (const dr of r.sugar.drops) {
      if (dr.landed) continue; dr.t += dt / 0.8;
      if (dr.t >= 1) { dr.landed = true; const SP = r.sugar.pass; ST.addFilm(SP, dr.c, 0.95, false); for (const n of dr.c.nb.slice(0, 2)) ST.addFilm(SP, n, 0.75, false); if (dr.imp && SP === P) r.critters.push({ id: 'imp', zi: r.zi, s: r.pi, cell: dr.c, x: dr.c.x, y: dr.c.y, r: 1.9, state: 'sit', t: 0, seed: Math.random() * 9, hops: 0, hopT: 0.7, stun: 0 }); }
    }
  };

  function finish(r) {
    let p = 0, p0 = 0; const quads = [];
    for (const Q of r.scenes) { let a = 0, b = 0; for (const P of Q.passes) { a += ST.sum(P); b += P.p0sum; } p += a; p0 += b; quads.push(clamp(1 - a / b, 0, 1)); }
    const clean = clamp(1 - p / p0, 0, 1), led = r.togTime > 4, gentle = led ? r.togAcc / r.togTime : 0.8, gaps = r.gapsTotal ? r.gapsDone / r.gapsTotal : 1;
    const stars = clean >= 0.86 && gaps >= 0.7 && gentle >= 0.7 ? 3 : clean >= 0.7 && gaps >= 0.3 ? 2 : clean >= 0.45 ? 1 : 0;
    const shine = Math.max(0, Math.round((clean * 200 + gaps * 80 + gentle * 60 + Math.floor(r.points) - r.ouch * 5) * (r.mission ? 0.6 : 1)));
    const xp = { brush: Math.round(clean * gentle * 100), idb: Math.max(0, r.gapsDone * 8 - r.idbOuch * 3), tools: Math.round(r.tight * 0.6 + r.used * 8 + r.soothed * 8) };
    const lastQuads = [0, 0, 0, 0]; r.zones.forEach((q, i) => (lastQuads[q] = quads[i]));
    const res = { practice: r.practice, mission: r.mission ? r.mission.id : null, missionName: r.mission ? r.mission.name : null, zones: r.zones, clean, gentle, led, gaps, gapsDone: r.gapsDone, gapsTotal: r.gapsTotal, ouch: r.ouch,
      caught: r.caught, nCaught: r.nCaught, stars, shine, quads: lastQuads, zoneQuads: quads, xp, seconds: r.zones.length * r.zoneSecs };
    if (r.first) S.data.tutorial = true;
    const sum = S.record(res);
    H.quit(); PH.UI.showResults(res, sum);
  }

  // ---- drawing ----
  let shade = null; // off-screen darkness layer with holes punched where there is light
  function lights(ctx, G, r, s) {
    if (!shade) shade = document.createElement('canvas');
    const k = 0.5, w = Math.ceil(G.w * k), h = Math.ceil(G.h * k); if (shade.width !== w || shade.height !== h) { shade.width = w; shade.height = h; }
    const c = shade.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(6,16,44,' + (s === 1 ? 0.66 : 0.58) + ')'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out';
    const hole = (x, y, R, a) => { const q = Cam.toScreen(x, y), rad = R * Cam.s * k, g = c.createRadialGradient(q.x * k, q.y * k, rad * 0.15, q.x * k, q.y * k, rad); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(q.x * k - rad, q.y * k - rad, rad * 2, rad * 2); };
    hole(r.lx, r.ly, 17 * (1 - 0.3 * r.focus) + 3 * Math.sin(r.time * 2), 1);
    if (!r.auto && r.phase === 'play') hole(r.gx, r.gy, 7, 0.75);
    for (const g of r.rings) hole(g.x, g.y, g.R * 1.5, 1 - g.t / g.life);
    for (const sh of r.shots) hole(sh.x0 + (sh.x1 - sh.x0) * sh.t, sh.y0 + (sh.y1 - sh.y0) * sh.t - Math.sin(sh.t * Math.PI) * 7, 6, 0.8);
    if (r.wave) hole(r.wave.x, r.wave.y, r.wave.rad + 6, 0.6);
    for (const t of r.Q.teeth) if (t.flash > 0) hole(r.Q.X(t.u), s < 2 ? r.Q.oy * t.h * 0.5 : 0, 9, Math.min(1, t.flash));
    ctx.drawImage(shade, 0, 0, G.w, G.h);
  }

  H.draw = function (ctx) {
    const r = H.run, G = PH.G, Q = r.Q, s = r.pi < 0 ? 0 : r.pi, P = Q.passes[s];
    const skin = PH.SKINS.find((k) => k.id === S.data.gear.skin) || PH.SKINS[0], cols = Art.onDark(skin);
    Cam.apply(ctx, G.dpr);
    const a = Cam.toWorld(0, 0), b = Cam.toWorld(G.w, G.h), vr = { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
    ST.drawBack(ctx, Q, s, vr, r.time, Cam.x);
    ST.drawTeeth(ctx, Q, s, r.time);
    ST.drawGum(ctx, Q, s, r.time);
    ST.drawPlaque(ctx, Q, s);
    ST.drawFeatures(ctx, Q, s);
    ST.drawGaps(ctx, Q, s, r.time, r.idb && r.idb.g);
    for (const t of Q.teeth) if (t.cells[s].length && t.cells[s].every((k) => k.p <= 0 || k.hard)) { const cx = Q.X(t.u) - t.w * 0.22, cy = s < 2 ? Q.oy * t.h * 0.72 : -t.d * 0.2; Art.sparkle(ctx, cx, cy, 1.0, 0.4, 0.5 + 0.4 * Math.sin(r.time * 3 + t.i), C.blue60); }
    for (const cr of r.critters) {
      if (cr.zi !== r.zi || cr.s !== s || cr.state === 'gone') continue;
      const dx = r.lx - cr.x, dy = r.ly - cr.y, dl = Math.hypot(dx, dy) || 1, hidden = cr.id !== 'tot' && cr.id !== 'imp' && cr.id !== 'lurker' ? clamp(cr.cell.p, 0, 1) : 0;
      const bob = cr.state === 'hop' ? -Math.sin(Math.min(1, cr.ht) * Math.PI) * 2 : Math.sin(cr.t * 3) * 0.12;
      Art.plaqling(ctx, cr.id, cr.x, cr.y + bob, cr.r * (1 - 0.15 * hidden), cr.t, { look: { x: dx / dl, y: dy / dl }, seed: cr.seed, scared: dl < 9 && cr.id !== 'tot' && cr.id !== 'yawnster' && cr.stun <= 0, stun: cr.stun > 0, rim: dl < 16 ? { x: dx / dl, y: dy / dl, a: 1 - dl / 16 } : null });
      if (cr.stun > 0) for (let i = 0; i < 3; i++) Art.sparkle(ctx, cr.x + Math.cos(r.time * 4 + i * 2.1) * cr.r * 1.2, cr.y - cr.r * 1.25 + Math.sin(r.time * 4 + i * 2.1) * 0.4, 0.5, r.time, 0.9, C.white);
    }
    for (const g of Q.gaps) { // eyes in the dark between teeth
      if (g.done || !g.germ) continue; const sg = ST.gapSeg(Q, g, s); if (!sg) continue;
      const mx = (sg.x0 + sg.x1) / 2, my = (sg.y0 + sg.y1) / 2, blink = (r.time * 0.7 + g.i * 1.3) % 4 < 0.12;
      for (const e of [-1, 1]) { ctx.fillStyle = C.white; ctx.strokeStyle = C.blue; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.ellipse(mx + e * 0.5, my, 0.42, blink ? 0.06 : 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke(); if (!blink) { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(mx + e * 0.5 + clamp((r.lx - mx) / 30, -0.14, 0.14), my, 0.19, 0, TAU); ctx.fill(); } }
    }
    if (r.sugar && r.sugar.pass === P) for (const d of r.sugar.drops) {
      if (d.landed || d.t < 0) continue; const k = d.t, z = 0.5 + (1 - k) * 3.2;
      ctx.save(); ctx.translate(d.c.x, d.c.y - (1 - k) * 9); ctx.rotate(k * 5 + d.hue); ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillStyle = [C.white, C.cerise, C.orchid][d.hue]; ctx.strokeStyle = C.blue; ctx.lineWidth = 0.14; ctx.fillRect(-z / 2, -z / 2, z, z); ctx.strokeRect(-z / 2, -z / 2, z, z); ctx.restore();
    }

    // light and dark: the swarm is the lantern
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    lights(ctx, G, r, s);
    Cam.apply(ctx, G.dpr);
    ctx.globalCompositeOperation = 'lighter';
    { const q = ctx.createRadialGradient(r.lx, r.ly, 0, r.lx, r.ly, 15); q.addColorStop(0, 'rgba(139,184,232,0.2)'); q.addColorStop(1, 'rgba(139,184,232,0)'); ctx.fillStyle = q; ctx.beginPath(); ctx.arc(r.lx, r.ly, 15, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ST.drawFront(ctx, Q, s, vr, r.time, Cam.x);

    for (const g of r.rings) { const k = g.t / g.life; if (g.fill) { ctx.fillStyle = g.color; ctx.globalAlpha = (1 - k) * 0.3; ctx.beginPath(); ctx.arc(g.x, g.y, g.R * ease(Math.min(1, k * 2)), 0, TAU); ctx.fill(); } ctx.globalAlpha = 1 - k; ctx.strokeStyle = g.color; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(g.x, g.y, g.R * ease(Math.min(1, k * 2)), 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (r.wave) { ctx.globalAlpha = clamp(1 - r.wave.rad / 90, 0, 1); ctx.strokeStyle = C.white; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(r.wave.x, r.wave.y, r.wave.rad, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const sh of r.shots) { // the rinse drop arcs in
      const k = clamp(sh.t, 0, 1), x = sh.x0 + (sh.x1 - sh.x0) * k, y = sh.y0 + (sh.y1 - sh.y0) * k - Math.sin(k * Math.PI) * 7;
      ctx.fillStyle = C.sky; ctx.strokeStyle = C.white; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x - 0.45, y - 0.45, 0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.white; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.25; ctx.setLineDash([0.8, 0.8]); ctx.beginPath(); ctx.arc(sh.x1, sh.y1, 9.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    if (r.phase === 'play' && !r.auto) Art.fila(ctx, r.gx, r.gy, 1.25, r.time);
    if (r.focus > 0.05) { ctx.strokeStyle = C.white; ctx.globalAlpha = r.focus; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.arc(r.lx, r.ly, 2.6 + (1 - r.focus) * 5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (r.eff.soft > 0) { ctx.strokeStyle = C.sky; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.4; ctx.setLineDash([1.2, 1]); ctx.beginPath(); ctx.arc(r.lx, r.ly, 7.5, r.time, r.time + TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    r.swarm.draw(ctx, cols, 0.34, 0.92 - 0.3 * Math.min(1, r.spread));
    if (r.phase === 'play' && r.auto) Art.fila(ctx, r.lx, r.ly, 1.25, r.time);
    if (r.idb) { const b2 = r.idb, sg = b2.sg, len = Math.hypot(sg.x1 - sg.x0, sg.y1 - sg.y0), dx = (sg.x1 - sg.x0) / len, dy = (sg.y1 - sg.y0) / len; Art.prime(ctx, b2.x + dx * 1.6, b2.y + dy * 1.6, dx, dy, 6.5, C.cerise); }
    ctx.fillStyle = C.white; ctx.strokeStyle = C.sky; ctx.lineWidth = 0.14;
    for (const f of r.foam) { ctx.globalAlpha = 1 - f.t / f.life; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const f of r.fx) Art.sparkle(ctx, f.x, f.y, f.s * (0.6 + f.t / f.life), f.rot + f.t * 3, 1 - f.t / f.life, C.white);

    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    { const q = ctx.createRadialGradient(G.w / 2, G.h / 2, Math.min(G.w, G.h) * 0.38, G.w / 2, G.h / 2, Math.max(G.w, G.h) * 0.75); q.addColorStop(0, 'rgba(4,10,30,0)'); q.addColorStop(1, 'rgba(4,10,30,0.62)'); ctx.fillStyle = q; ctx.fillRect(0, 0, G.w, G.h); }
    if (r.flip > 0) { // pass change: the diagonal panel wipes across
      const k = ease(1 - r.flip), x = G.w * (1.3 - k * 2.6); ctx.fillStyle = C.blue; ctx.globalAlpha = 0.94;
      ctx.beginPath(); ctx.moveTo(x + G.w * 0.2, 0); ctx.lineTo(x + G.w * 1.1, 0); ctx.lineTo(x + G.w * 0.9, G.h); ctx.lineTo(x, G.h); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    for (const p of r.pops) { const q = Cam.toScreen(p.x, p.y); ctx.font = '400 ' + (p.warn ? 15 : 18) + 'px ' + Art.FONT; ctx.globalAlpha = 1 - p.t; ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.strokeText(p.text, q.x, q.y - p.t * 34); ctx.fillStyle = p.warn ? C.orchid : C.white; ctx.fillText(p.text, q.x, q.y - p.t * 34); }
    ctx.globalAlpha = 1;
    for (const bu of r.bubbles) {
      const e = ease(clamp(bu.t, 0, 1)), jx = r.jar ? r.jar.x : G.w - 40, jy = r.jar ? r.jar.y : 40;
      const x = bu.x + (jx - bu.x) * e + Math.sin(e * Math.PI) * 30, y = bu.y + (jy - bu.y) * e - Math.sin(e * Math.PI) * 40, rad = bu.r * (1 - 0.55 * e);
      Art.plaqling(ctx, bu.id, x, y, rad, r.time * 3, { seed: bu.seed, scared: true });
      ctx.strokeStyle = C.white; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rad * 1.45, 0, TAU); ctx.stroke();
    }
  };
})();
