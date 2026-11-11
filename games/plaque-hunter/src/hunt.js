/* Plaque Hunter — the two-minute hunt (four quadrants) and Prime time (between the teeth). */
(function () {
  const PH = window.PH, W = PH.World, S = PH.Store, Art = PH.Art, A = PH.Audio, T = PH.TUNE, C = PH.C;
  const H = (PH.Hunt = { run: null, prime: null });
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => t * t * (3 - 2 * t);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // ---- camera: world units <-> screen pixels ----
  const Cam = (PH.Cam = {
    x: 0, y: 0, s: 5, cx: 200, cy: 300,
    fit(b, r) { const s = Math.min(r.w / (b.x1 - b.x0), r.h / (b.y1 - b.y0)); return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s, cx: r.x + r.w / 2, cy: r.y + r.h / 2 }; },
    set(c) { Cam.x = c.x; Cam.y = c.y; Cam.s = c.s; Cam.cx = c.cx; Cam.cy = c.cy; },
    mix(a, b, k) { return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k }; },
    apply(ctx, dpr) { ctx.setTransform(dpr * Cam.s, 0, 0, dpr * Cam.s, dpr * (Cam.cx - Cam.x * Cam.s), dpr * (Cam.cy - Cam.y * Cam.s)); },
    toWorld(sx, sy) { return { x: (sx - Cam.cx) / Cam.s + Cam.x, y: (sy - Cam.cy) / Cam.s + Cam.y }; },
    toScreen(x, y) { return { x: (x - Cam.x) * Cam.s + Cam.cx, y: (y - Cam.y) * Cam.s + Cam.cy }; },
  });
  const playRect = () => { const G = PH.G; return { x: 8, y: 122, w: G.w - 16, h: Math.max(120, G.h - 122 - 96) }; };
  H.playRect = playRect;
  const quadCam = (q) => Cam.fit(W.quads[q].bbox, playRect());
  H.smileCam = (top, bottom, pad) => { const G = PH.G, b = W.bounds, p = pad || 0; return Cam.fit({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p }, { x: 10, y: top, w: G.w - 20, h: Math.max(120, G.h - top - bottom) }); };

  function recount(q) {
    const Q = W.quads[q]; let sum = 0;
    for (const t of Q.teeth) t.left = 0;
    for (const c of Q.cells) { c.p0 = c.p; if (c.p > 0 && !c.hard) { c.tooth.left++; sum += c.p; } }
    for (const t of Q.teeth) t.clean = t.left === 0;
    Q.p0sum = Math.max(sum, 0.001);
  }
  function addFilm(c, p, sticky) { if (c.hard) return; const before = c.p; W.dirty(c, p, sticky); W.quads[c.tooth.q].p0sum += c.p - before; }

  // ---- setting up a hunt ----
  const FITS = {
    gumlin: (c) => c.rim && c.surf !== 2, speckle: (c) => c.surf === 2 && c.tooth.i >= 3 && c.e > 1.6, mole: (c) => c.tooth.i >= 5 && c.e > 1.3,
    tot: (c) => c.tooth.i >= 4 && c.rim && c.surf === 1,
  };
  function placeCritters(r, q, list) {
    const Q = W.quads[q], mine = [];
    for (const id of list) {
      const fit = FITS[id] || ((c) => c.e > 1.2);
      const cands = Q.cells.filter((c) => fit(c) && !c.hard && mine.every((m) => Math.hypot(m.x - c.x, m.y - c.y) > 4.6));
      if (!cands.length) continue;
      const c = pick(cands), sticky = id === 'stickler', mk = (cell, rad) => ({ id, q, cell, x: cell.x, y: cell.y, r: rad, state: 'sit', t: Math.random() * 9, seed: Math.random() * 9, hops: 0, hopT: 0.8 });
      W.dirty(c, 1, sticky); for (const n of c.nb) W.dirty(n, 0.85, sticky);
      if (id === 'tot' && !r.totLoose) { c.hard = true; c.p = 1; }
      const cr = mk(c, id === 'speckle' ? 1.15 : id === 'tot' ? 2.0 : 1.75); mine.push(cr);
      if (id === 'speckle') for (const n of c.nb.filter((n) => n.e > 1.2).slice(0, 2)) mine.push(mk(n, 1.05));
    }
    recount(q); r.critters.push(...mine);
  }

  H.start = function (opts) {
    opts = opts || {};
    const d = S.data, G = PH.G, tide = S.tide(), rank = S.rank().index, streak = S.streakNow().count;
    const first = !d.tutorial, stale = S.staleness(), hrs = S.hoursSinceRun();
    const coverage = first ? 0.62 : 0.5 + 0.3 * stale + 0.03 * rank;
    const sticky = first ? 0.1 : clamp(0.14 + Math.max(0, hrs - 14) / 40 + 0.03 * rank, 0.1, 0.6);
    const wear = clamp((S.brushAge() - 60) / 60, 0, 1), easy = d.settings.easy;
    const sw = new Art.Swarm(T.swarm); sw.live = Math.round(T.swarm * (1 - 0.35 * wear));
    const r = (H.run = {
      practice: !!opts.practice, slot: tide.slot, first, easy, zoneSecs: d.settings.short ? T.shortZoneSecs : T.zoneSecs,
      zi: 0, zt: 0, seg: -1, phase: 'count', countT: 3.4, countN: 9, time: 0, doneT: 0, paused: false,
      swarm: sw, fray: wear * 0.5, lx: 0, ly: 0, plx: 0, ply: 0, gx: 0, gy: 0, vs: 0, spread: 0, grace: 0,
      togAcc: 0, togTime: 0, idle: 99, auto: true, warnT: 0, warns: 0,
      critters: [], caught: {}, nCaught: 0, shown: 0, combo: 0, comboT: 0, points: 0, polish: 0,
      fx: [], bubbles: [], pops: [], hydro: 0, wave: null, reveal: 0, sugar: null, zoneDone: [false, false, false, false], said: {},
      totLoose: d.link.checkupBoost, counts: new Uint16Array(400), camFrom: null, camTo: null, camT: 1,
    });
    const seed = Math.random() * 50, rare = (Math.random() * 4) | 0;
    const totOk = !first && d.runs >= 2 && (d.link.checkupBoost || !d.link.checkup || S.now() - d.link.checkup > 150 * 864e5);
    for (let q = 0; q < 4; q++) {
      W.seed(q, { coverage, sticky, seed: seed + q * 7.7 });
      const list = ['filmo', 'gumlin', 'stickler'];
      if (q === 0) list.push('filmo'); if (q === 1) list.push('speckle'); if (q === 2) list.push(tide.slot === 'am' ? 'yawnster' : 'nightcap'); if (q === 3) list.push('mole');
      for (let i = 0; i < Math.min(rank, 3); i++) list.push(['filmo', 'gumlin', 'stickler'][(q + i) % 3]);
      if (streak >= 2 && q === rare) list.push('glimmer');
      if (streak >= 6 && q === (rare + 2) % 4) list.push('goldie');
      if (q === 3 && totOk) list.unshift('tot');
      placeCritters(r, q, list);
    }
    const g = W.guidePoint(0, 1.5, 1); r.lx = r.plx = g.x; r.ly = r.ply = g.y; sw.place(g.x, g.y, 5);
    r.camFrom = H.smileCam(122, 96); Cam.set(r.camFrom); r.camTo = quadCam(0); r.camT = 0;
    A.unlock(); A.music(tide.slot, 1); A.layers(1);
    PH.UI.hudStart(r);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => (H.wake = l)).catch(() => {}); } catch (e) { /* optional */ }
  };

  function beginZone(r, z) {
    r.zi = z; r.zt = 0; r.seg = -1; r.grace = 1.6; r.camFrom = { x: Cam.x, y: Cam.y, s: Cam.s, cx: Cam.cx, cy: Cam.cy }; r.camTo = quadCam(z); r.camT = 0;
    PH.UI.hudZone(z); PH.UI.banner(PH.QUADS[z], z === 0 ? 'Start your brush here.' : 'Move your brush here.');
    A.gong(); A.buzz(z === 0 ? 50 : [90, 70, 90]); A.layers(z + 1);
    if (r.first && z === 1) PH.UI.toast('Follow the light: outside, inside, chewing.');
  }

  function guideAt(r) {
    const segLen = (r.zoneSecs - 1.2) / 3, tt = Math.max(0, r.zt - 0.9), seg = Math.min(2, Math.floor(tt / segLen)), f = clamp((tt - seg * segLen) / segLen, 0, 1);
    const s0 = 1.6, s1 = W.L - 1.6, s = seg === 1 ? s1 + (s0 - s1) * f : s0 + (s1 - s0) * f;
    const p = W.guidePoint(r.zi, s, seg === 0 ? 1 : seg === 1 ? -1 : 0);
    p.x += Math.cos(r.time * 6.2) * 1.2; p.y += Math.sin(r.time * 6.2) * 1.2; p.seg = seg; return p;
  }

  function catchIt(r, cr) {
    cr.state = 'gone'; r.caught[cr.id] = (r.caught[cr.id] || 0) + 1; r.nCaught++;
    r.combo = r.comboT > 0 ? r.combo + 1 : 1; r.comboT = 2.6;
    const pts = 10 * Math.min(r.combo, 5); r.points += pts;
    A.pop(r.combo); A.buzz(18);
    const s = Cam.toScreen(cr.x, cr.y); r.bubbles.push({ id: cr.id, x: s.x, y: s.y, t: 0, r: cr.r * Cam.s, seed: cr.seed });
    r.pops.push({ text: '+' + pts, x: cr.x, y: cr.y - 2, t: 0 });
    r.hydro = Math.min(6, r.hydro + 1); PH.UI.hudHydro(r.hydro / 6);
    if (!S.data.guide[cr.id] && !r.said[cr.id]) { r.said[cr.id] = 1; PH.UI.toast('New in your Field Guide: ' + PH.SPECIES_BY_ID[cr.id].name); }
  }

  function cellCleared(r, c) {
    r.points += 0.25; const t = c.tooth; t.left--;
    if (Math.random() < 0.35) r.fx.push({ x: c.x, y: c.y, t: 0, life: 0.5, s: 0.8 + Math.random() * 0.7, rot: Math.random() * 3 });
    if (t.left <= 0 && !t.clean) {
      t.clean = true; t.flash = 1; r.points += 5; A.chime();
      const Q = W.quads[t.q];
      if (!r.zoneDone[t.q] && Q.teeth.every((x) => x.clean || x.cells.every((k) => k.p <= 0 || k.hard))) { r.zoneDone[t.q] = true; r.points += 20; PH.UI.toast('This side is gleaming. Keep polishing till the switch.'); }
    }
  }

  H.hydro = function () {
    const r = H.run; if (!r || r.phase !== 'play' || r.hydro < 6) return;
    r.hydro = 0; r.wave = { x: r.lx, y: r.ly, rad: 0 }; r.reveal = 3; A.hydro(); A.buzz(70); PH.UI.hudHydro(0);
  };
  H.pause = function (on) {
    const r = H.run; if (!r || r.phase === 'done') return;
    r.paused = on; if (on) A.suspend(); else A.resume(); PH.UI.pauseShow(on);
  };
  H.quit = function () { H.run = null; A.resume(); A.stopMusic(); A.fizz(0); if (H.wake) { try { H.wake.release(); } catch (e) { /* gone already */ } H.wake = null; } };

  // ---- one frame of the hunt ----
  H.update = function (dt) {
    const r = H.run; if (!r || r.paused) return;
    const G = PH.G, sw = r.swarm; r.time += dt;
    if (r.camT < 1) { r.camT = Math.min(1, r.camT + dt / 1.1); Cam.set(Cam.mix(r.camFrom, r.camTo, ease(r.camT))); } else Cam.set(r.camTo);
    for (const f of r.fx) f.t += dt; r.fx = r.fx.filter((f) => f.t < f.life);
    for (const p of r.pops) p.t += dt; r.pops = r.pops.filter((p) => p.t < 1);
    const jar = PH.UI.jarPos();
    for (const b of r.bubbles) { b.t += dt / 0.75; if (b.t >= 1 && !b.done) { b.done = true; r.shown++; PH.UI.hudJar(r.shown); } }
    r.bubbles = r.bubbles.filter((b) => !b.done); r.jar = jar;

    if (r.phase === 'count') {
      r.countT -= dt; const n = Math.ceil(r.countT);
      if (n !== r.countN) { r.countN = n; if (n > 0 && n <= 3) { PH.UI.countdown(n); A.count(false); } else if (n <= 0) { PH.UI.countdown(null); A.count(true); r.phase = 'play'; beginZone(r, 0); if (r.first) PH.UI.toast('Drag slowly. The 5,460 follow your thumb.'); } }
      sw.update(dt, r.lx, r.ly, 5, r.time, r.fray); return;
    }
    if (r.phase === 'done') {
      r.doneT += dt; const a = r.doneT * 2.2; r.lx = Math.cos(a) * 24; r.ly = Math.sin(a) * 30;
      sw.update(dt, r.lx, r.ly, 9, r.time, 0);
      if (r.doneT > 1.9 && !r.sent) { r.sent = true; finish(r); }
      return;
    }

    // leader: your thumb, or Fila when your hands are full
    r.zt += dt;
    const gp = guideAt(r); r.gx = gp.x; r.gy = gp.y;
    if (gp.seg !== r.seg) { r.seg = gp.seg; PH.UI.hudSurface(gp.seg); if (gp.seg > 0) A.buzz(25); }
    const inp = G.input; let tx, ty, k;
    if (inp.down) {
      const w = Cam.toWorld(inp.x, inp.y); tx = w.x; ty = w.y; k = Math.min(1, dt * 16); r.idle = 0;
      if (inp.fresh) { inp.fresh = false; r.grace = 0.45; }
      r.auto = false;
    } else {
      r.idle += dt;
      if (r.idle > T.autoAfter && !r.auto) { r.auto = true; r.grace = 0.6; if (!r.said.auto && r.togTime > 1) { r.said.auto = 1; PH.UI.toast('Hands full? Fila leads while you brush.'); } }
      if (r.auto) { tx = gp.x; ty = gp.y; k = Math.min(1, dt * 5); } else { tx = r.lx; ty = r.ly; k = 0; }
    }
    r.lx += (tx - r.lx) * k; r.ly += (ty - r.ly) * k;
    const v = Math.hypot(r.lx - r.plx, r.ly - r.ply) / Math.max(dt, 0.001); r.plx = r.lx; r.ply = r.ly;
    r.grace = Math.max(0, r.grace - dt);
    r.vs += ((r.grace > 0 ? 0 : v) - r.vs) * Math.min(1, dt * 5);
    const slack = r.easy ? 1.6 : 1, want = clamp((r.vs - T.vGentle * slack) / ((T.vFast - T.vGentle) * slack), 0, 1.3);
    r.spread += (want - r.spread) * Math.min(1, dt * (want > r.spread ? 7 : 2.2));
    const coh = 1 - Math.min(1, r.spread);
    if (!r.auto) { r.togAcc += coh * dt; r.togTime += dt; }
    PH.UI.hudTogether(coh);
    r.warnT -= dt;
    if (r.spread > 0.85 && r.warnT <= 0 && !r.auto) { r.warnT = 7; A.scatter(); A.buzz(30); if (r.warns++ < 3) PH.UI.toast('Easy. Slow and soft keeps them together.'); }
    sw.update(dt, r.lx, r.ly, (r.easy ? 5.6 : 5.0) * (1 + 1.5 * r.spread), r.time, r.fray + r.spread * 0.25);

    // cleaning: every spark resting on a cell lifts a little film
    const Q = W.quads[r.zi], cnt = r.counts; cnt.fill(0);
    for (let i = 0; i < sw.live; i++) { const idx = W.cellAt(Q, sw.x[i], sw.y[i]); if (idx >= 0) cnt[idx]++; }
    const power = (r.auto ? (r.easy ? T.autoPowerEasy : T.autoPower) : 1) * (27 / T.swarm) * (T.zoneSecs / r.zoneSecs); let work = 0;
    for (let i = 0; i < Q.cells.length; i++) {
      if (!cnt[i]) continue; const c = Q.cells[i];
      if (c.p > 0 && !c.hard) { c.p -= cnt[i] * power * (c.sticky ? 0.33 : 1) * dt; work += cnt[i]; if (c.p <= 0.03) { c.p = 0; cellCleared(r, c); } }
    }
    A.fizz(work / sw.live);
    if (r.zoneDone[r.zi] && !r.auto && v > 2) { r.polish += dt * 1.2; if (r.polish >= 1) { r.polish -= 1; r.points += 1; if (Math.random() < 0.5) r.fx.push({ x: r.lx + (Math.random() - 0.5) * 8, y: r.ly + (Math.random() - 0.5) * 8, t: 0, life: 0.5, s: 0.9, rot: Math.random() * 3 }); } }
    for (const t of Q.teeth) if (t.flash > 0) t.flash -= dt * 1.4;
    r.comboT -= dt; r.reveal = Math.max(0, r.reveal - dt);

    // Plaqlings
    for (const cr of r.critters) {
      if (cr.q !== r.zi || cr.state === 'gone') continue; cr.t += dt;
      if (cr.state === 'hop') { cr.ht += dt / 0.3; const e = ease(Math.min(1, cr.ht)); cr.x = cr.fx + (cr.cell.x - cr.fx) * e; cr.y = cr.fy + (cr.cell.y - cr.fy) * e; if (cr.ht >= 1) cr.state = 'sit'; continue; }
      if (cr.id === 'imp') {
        cr.hopT -= dt; const dl = Math.hypot(cr.x - r.lx, cr.y - r.ly);
        if (dl < 8 && cr.hopT <= 0 && cr.hops < 4) {
          const far = Q.cells.filter((c) => !c.hard && Math.hypot(c.x - cr.x, c.y - cr.y) > 4.5 && Math.hypot(c.x - cr.x, c.y - cr.y) < 12 && Math.hypot(c.x - r.lx, c.y - r.ly) > dl + 2 && c.e > 1.1);
          if (far.length) { const c = pick(far); cr.fx = cr.x; cr.fy = cr.y; cr.cell = c; cr.ht = 0; cr.state = 'hop'; cr.hops++; cr.hopT = 1.3; addFilm(c, 0.95, false); for (const n of c.nb.slice(0, 3)) addFilm(n, 0.7, false); continue; }
        }
      }
      if (cr.cell.p <= 0 && !cr.cell.hard) catchIt(r, cr);
    }
    if (r.said.gap !== 1 && r.zt > 9 && r.zi === 0 && r.first) { r.said.gap = 1; PH.UI.toast('Eyes between the pearls? Gappers. They wait for Prime time.'); }

    // Hydro wave: loosens the old sticky film it passes over
    if (r.wave) {
      const w = r.wave, prev = w.rad; w.rad += 75 * dt;
      for (const c of Q.cells) { const dd = Math.hypot(c.x - w.x, c.y - w.y); if (dd >= prev && dd < w.rad && c.p > 0 && !c.hard) { c.sticky = false; c.p = Math.max(0.3, c.p * 0.6); } }
      if (w.rad > 90) r.wave = null;
    }
    // Sugar rain, third quadrant
    if (r.zi === 2 && !r.sugar && r.zt > Math.min(6, r.zoneSecs * 0.3)) {
      const spots = []; for (let i = 0; i < 40 && spots.length < 3; i++) { const c = pick(Q.cells); if (c.e > 1.3 && !c.hard && spots.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > 7)) spots.push(c); }
      r.sugar = { drops: [] };
      spots.forEach((c, i) => { for (let j = 0; j < 5; j++) r.sugar.drops.push({ c: j ? pick(c.nb.concat(c)) : c, t: -i * 0.25 - j * 0.07, imp: j === 0 && i < 2, hue: (i * 5 + j) % 3 }); });
      PH.UI.banner('Sugar rain', 'Catch the Sugar Imps.'); A.sugar();
    }
    if (r.sugar) for (const dr of r.sugar.drops) {
      if (dr.landed) continue; dr.t += dt / 0.8;
      if (dr.t >= 1) { dr.landed = true; addFilm(dr.c, 0.95, false); for (const n of dr.c.nb.slice(0, 2)) addFilm(n, 0.75, false); if (dr.imp) r.critters.push({ id: 'imp', q: r.zi, cell: dr.c, x: dr.c.x, y: dr.c.y, r: 1.7, state: 'sit', t: 0, seed: Math.random() * 9, hops: 0, hopT: 0.7 }); }
    }

    PH.UI.hudTime((r.zi * r.zoneSecs + r.zt) / (4 * r.zoneSecs), Math.ceil(4 * r.zoneSecs - r.zi * r.zoneSecs - r.zt));
    if (r.zt >= r.zoneSecs) { if (r.zi < 3) beginZone(r, r.zi + 1); else { r.phase = 'done'; r.doneT = 0; r.camFrom = { x: Cam.x, y: Cam.y, s: Cam.s, cx: Cam.cx, cy: Cam.cy }; r.camTo = H.smileCam(122, 96); r.camT = 0; A.fizz(0); A.fanfare(); A.buzz([60, 50, 60, 50, 160]); PH.UI.hudEnd(); } }
  };

  function finish(r) {
    let p = 0, p0 = 0; const quads = [];
    for (let q = 0; q < 4; q++) { const s = W.plaqueSum(q), b = W.quads[q].p0sum; p += s; p0 += b; quads.push(clamp(1 - s / b, 0, 1)); }
    const clean = clamp(1 - p / p0, 0, 1), led = r.togTime > 4, gentle = led ? r.togAcc / r.togTime : 0.8;
    const stars = clean >= 0.93 && gentle >= 0.7 ? 3 : clean >= 0.8 ? 2 : clean >= 0.5 ? 1 : 0;
    const shine = Math.round((clean * 200 + gentle * 60 + Math.floor(r.points)) * (r.practice ? 0.25 : 1));
    const res = { practice: r.practice, clean, gentle, led, caught: r.caught, nCaught: r.nCaught, stars, shine, quads, seconds: 4 * r.zoneSecs };
    if (r.first) S.data.tutorial = true;
    const sum = S.record(res);
    H.quit(); PH.UI.showResults(res, sum);
  }

  // ---- drawing ----
  function drawCritters(ctx, r, q) {
    for (const cr of r.critters) {
      if (cr.q !== q || cr.state === 'gone') continue;
      const dx = r.lx - cr.x, dy = r.ly - cr.y, dl = Math.hypot(dx, dy) || 1, near = dl < 9;
      const hidden = cr.id !== 'tot' && cr.id !== 'imp' ? clamp(cr.cell.p, 0, 1) : 0;
      Art.plaqling(ctx, cr.id, cr.x, cr.y + (cr.state === 'hop' ? -Math.sin(Math.min(1, cr.ht) * Math.PI) * 1.6 : 0), cr.r * (1 - 0.18 * hidden), cr.t, { look: { x: dx / dl, y: dy / dl }, seed: cr.seed, scared: near && cr.id !== 'tot' && cr.id !== 'yawnster', alpha: q === r.zi ? 1 : 0.4 });
    }
  }
  function drawGappers(ctx, r, q, t) {
    for (const g of W.quads[q].gaps) {
      const x = g.x + g.nx * 0.4, y = g.y + g.ny * 0.4, dx = r.lx - x, dy = r.ly - y, dl = Math.hypot(dx, dy) || 1, blink = (t * 0.7 + g.i * 1.3) % 4 < 0.12;
      for (const s of [-1, 1]) {
        const ex = x + g.nx * s * 0.62, ey = y + g.ny * s * 0.62;
        ctx.fillStyle = C.white; ctx.strokeStyle = C.blue; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.ellipse(ex, ey, 0.42, blink ? 0.06 : 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (!blink) { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(ex + (dx / dl) * 0.14, ey + (dy / dl) * 0.14, 0.2, 0, TAU); ctx.fill(); }
      }
    }
  }

  H.draw = function (ctx) {
    const r = H.run, G = PH.G, skin = PH.SKINS.find((s) => s.id === S.data.gear.skin) || PH.SKINS[0];
    Cam.apply(ctx, G.dpr);
    W.drawGums(ctx); W.drawTeeth(ctx, r.phase === 'done' ? -1 : r.zi, 0.5);
    for (let q = 0; q < 4; q++) W.drawPlaque(ctx, q, q === r.zi || r.phase === 'done' ? 1 : 0.45);
    for (const t of W.quads[r.zi].teeth) if (t.clean) Art.sparkle(ctx, t.cx + t.nx * t.d * 0.18 - t.tx * t.w * 0.18, t.cy + t.ny * t.d * 0.18 - t.ty * t.w * 0.18, 0.9, 0.4, 0.55 + 0.35 * Math.sin(r.time * 3 + t.i), C.blue60);
    if (r.phase !== 'done') drawGappers(ctx, r, r.zi, r.time);
    for (let q = 0; q < 4; q++) drawCritters(ctx, r, q);
    if (r.sugar) for (const d of r.sugar.drops) {
      if (d.landed || d.t < 0) continue; const k = d.t, s = 0.5 + (1 - k) * 3.2;
      ctx.save(); ctx.translate(d.c.x, d.c.y - (1 - k) * 9); ctx.rotate(k * 5 + d.hue); ctx.globalAlpha = Math.min(1, k * 3);
      ctx.fillStyle = [C.white, C.cerise, C.orchid][d.hue]; ctx.strokeStyle = C.blue; ctx.lineWidth = 0.14; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.restore();
    }
    if (r.wave) { ctx.globalAlpha = clamp(1 - r.wave.rad / 90, 0, 1); ctx.strokeStyle = C.sky; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(r.wave.x, r.wave.y, r.wave.rad, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (r.phase === 'play' && !r.auto) Art.fila(ctx, r.gx, r.gy, 1.25, r.time);
    Art.disc(ctx, r.lx, r.ly, 7.5 * (1 + r.spread * 0.9), C.sky, 0.22 * (1 - r.spread * 0.5));
    r.swarm.draw(ctx, skin.colors, 0.38, 0.95 - 0.35 * Math.min(1, r.spread));
    if (r.phase === 'play' && r.auto) Art.fila(ctx, r.lx, r.ly, 1.25, r.time);
    for (const f of r.fx) Art.sparkle(ctx, f.x, f.y, f.s * (0.6 + f.t / f.life), f.rot + f.t * 3, 1 - f.t / f.life, C.blue);

    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.font = '400 17px ' + Art.FONT; ctx.textAlign = 'center';
    for (const p of r.pops) { const s = Cam.toScreen(p.x, p.y); ctx.globalAlpha = 1 - p.t; ctx.fillStyle = C.blue; ctx.fillText(p.text, s.x, s.y - p.t * 34); }
    ctx.globalAlpha = 1;
    for (const b of r.bubbles) {
      const e = ease(clamp(b.t, 0, 1)), jx = r.jar ? r.jar.x : G.w - 40, jy = r.jar ? r.jar.y : 40;
      const x = b.x + (jx - b.x) * e + Math.sin(e * Math.PI) * 30, y = b.y + (jy - b.y) * e - Math.sin(e * Math.PI) * 40, rad = b.r * (1 - 0.55 * e);
      Art.plaqling(ctx, b.id, x, y, rad, r.time * 3, { seed: b.seed, scared: true });
      ctx.strokeStyle = C.blue60; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rad * 1.45, 0, TAU); ctx.stroke();
    }
  };

  // ---- Prime time: once a day, the gaps the swarm cannot reach ----
  H.startPrime = function () {
    const items = [];
    for (let q = 0; q < 4; q++) { const gs = W.quads[q].gaps.slice().sort(() => Math.random() - 0.5); const a = gs[0], b = gs.find((g) => g.size !== a.size) || gs[1]; for (const g of [a, b]) items.push({ g, done: false, anim: 0, popped: false, shake: 0 }); }
    for (const t of W.teeth) { t.clean = true; t.flash = 0; } for (let q = 0; q < 4; q++) for (const c of W.quads[q].cells) { c.p = 0; c.hard = false; }
    H.prime = { items, sel: 0, done: 0, caught: 0, t: 0, endT: 0, bubbles: [], easy: S.data.settings.easy };
    A.unlock(); A.music(S.tide().slot, 2); A.layers(2);
    PH.UI.primeStart(H.prime);
  };
  H.primeTap = function (sx, sy) {
    const p = H.prime; if (!p || p.endT) return;
    let best = null, bd = 44;
    for (const it of p.items) { if (it.done || it.anim) continue; const m = marker(it.g), s = Cam.toScreen(m.x, m.y), d = Math.hypot(s.x - sx, s.y - sy); if (d < bd) { bd = d; best = it; } }
    if (!best) return;
    const pickd = p.easy ? best.g.size : p.sel;
    if (pickd === best.g.size) { best.anim = 0.001; if (p.easy) { p.sel = best.g.size; PH.UI.primeSelect(p.sel); } A.tap(); }
    else { best.shake = 0.4; A.nope(); A.buzz(40); PH.UI.toast(pickd > best.g.size ? 'Too big for that gap. Match the colour.' : 'Too loose there. Match the colour.'); }
  };
  const marker = (g) => ({ x: g.x + g.nx * (g.d / 2 + 4.6), y: g.y + g.ny * (g.d / 2 + 4.6) });
  H.updatePrime = function (dt) {
    const p = H.prime; if (!p) return; p.t += dt; Cam.set(H.smileCam(84, 150, 9));
    for (const it of p.items) {
      if (it.shake > 0) it.shake -= dt;
      if (!it.anim || it.done) continue;
      it.anim += dt / 0.95;
      if (it.anim >= 0.5 && !it.popped) { it.popped = true; p.caught++; A.pop(p.caught); A.buzz(18); const s = Cam.toScreen(it.g.x, it.g.y); p.bubbles.push({ x: s.x, y: s.y, t: 0, seed: Math.random() * 9 }); }
      if (it.anim >= 1) { it.done = true; p.done++; A.chime(); PH.UI.primeProgress(p.done, p.items.length); }
    }
    for (const b of p.bubbles) b.t += dt / 1.1; p.bubbles = p.bubbles.filter((b) => b.t < 1);
    if (p.done === p.items.length) { p.endT += dt; if (p.endT > 1.1 && !p.sent) { p.sent = true; const shine = p.done * 8 + p.caught * 10; const sum = S.recordPrime(p.done, p.caught, shine); H.prime = null; A.stopMusic(); A.fanfare(); PH.UI.primeDone(shine, sum); } }
  };
  H.quitPrime = function () { H.prime = null; A.stopMusic(); };
  H.drawPrime = function (ctx) {
    const p = H.prime, G = PH.G; Cam.apply(ctx, G.dpr);
    W.drawGums(ctx); W.drawTeeth(ctx, -1, 1);
    for (const it of p.items) {
      const g = it.g, m = marker(g), col = PH.PRIMES[g.size].color;
      if (!it.popped) { Art.plaqling(ctx, 'gapper', g.x, g.y, 1.7, p.t + g.i, { look: { x: g.nx, y: g.ny }, seed: g.i, scared: it.anim > 0 }); }
      if (it.anim && !it.done) {
        const depth = Math.sin(clamp(it.anim, 0, 1) * Math.PI), reach = g.d / 2 + 3 - depth * (g.d + 3.5);
        Art.prime(ctx, g.x + g.nx * reach, g.y + g.ny * reach, -g.nx, -g.ny, 7, col);
      }
      if (it.done) { Art.sparkle(ctx, m.x, m.y, 1.6, p.t, 0.9, C.blue); continue; }
      const pulse = 1 + 0.12 * Math.sin(p.t * 4 + g.i), sh = it.shake > 0 ? Math.sin(it.shake * 60) * 0.5 : 0;
      ctx.fillStyle = col; ctx.strokeStyle = C.white; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(m.x + sh, m.y, 2.9 * pulse, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PH.PRIMES[g.size].ink; ctx.font = '400 2.5px ' + Art.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PH.PRIMES[g.size].id, m.x + sh, m.y + 0.12);
    }
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    for (const b of p.bubbles) { const y = b.y - b.t * 120, x = b.x + Math.sin(b.t * 6 + b.seed) * 10; ctx.globalAlpha = 1 - b.t; Art.plaqling(ctx, 'gapper', x, y, 13, p.t * 3, { seed: b.seed, scared: true }); ctx.strokeStyle = C.blue60; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  };
})();
