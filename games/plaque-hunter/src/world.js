/* Plaque Hunter — the Smile: 28 pearls on two arches, seen from above like a dental chart.
   World units are roughly millimetres. Quadrants run in brushing order, mirror view:
   0 top right, 1 top left, 2 bottom left, 3 bottom right. */
(function () {
  const PH = window.PH, C = PH.C;
  const W = (PH.World = {});
  const A = 31, B = 45, GAP = 4.5, CELL = 1.55, TAU = Math.PI * 2;
  W.CELL = CELL;
  const SHAPES = [
    { kind: 'incisor', w: 8.6, d: 6.6 }, { kind: 'incisor', w: 6.8, d: 6.2 }, { kind: 'canine', w: 7.6, d: 8.2 },
    { kind: 'premolar', w: 7.0, d: 9.0 }, { kind: 'premolar', w: 6.8, d: 9.2 }, { kind: 'molar', w: 10.4, d: 11.2 }, { kind: 'molar', w: 9.8, d: 10.8 },
  ];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---- arch geometry: a quarter ellipse, parameterised by arc length ----
  const N = 256, tab = [0];
  { let px = 0, py = B; for (let i = 1; i <= N; i++) { const t = (i / N) * Math.PI / 2, x = A * Math.sin(t), y = B * Math.cos(t); tab.push(tab[i - 1] + Math.hypot(x - px, y - py)); px = x; py = y; } }
  const L = (W.L = tab[N]);
  function tAt(s) {
    s = clamp(s, 0, L); let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] <= s) lo = m; else hi = m; }
    return ((lo + (s - tab[lo]) / (tab[hi] - tab[lo] || 1)) / N) * Math.PI / 2;
  }
  // Point on the centre line of quadrant q at arc length s, with tangent (toward the back) and outward normal.
  W.frame = function (q, s) {
    const over = s > L ? s - L : 0, t = tAt(s), sx = q === 0 || q === 3 ? 1 : -1, sy = q < 2 ? -1 : 1;
    let tx = A * Math.cos(t), ty = -B * Math.sin(t); const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    let nx = Math.sin(t) / A, ny = Math.cos(t) / B; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const x = A * Math.sin(t) + tx * over, y = GAP + B * Math.cos(t) + ty * over;
    return { x: sx * x, y: sy * y, tx: sx * tx, ty: sy * ty, nx: sx * nx, ny: sy * ny };
  };

  function sdf(u, v, w, d, r) { const qx = Math.abs(u) - (w / 2 - r), qy = Math.abs(v) - (d / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }

  // ---- build once ----
  W.quads = []; W.teeth = []; W.gaps = [];
  W.bounds = { x0: -A - 9, x1: A + 9, y0: -(GAP + B + 8), y1: GAP + B + 8 };
  (function build() {
    const sum = SHAPES.reduce((a, t) => a + t.w, 0), gapW = 0.55, k = (L - 0.3 - gapW * 7) / sum;
    for (let q = 0; q < 4; q++) {
      const Q = { q, teeth: [], cells: [], gaps: [], p0sum: 0 };
      let s = 0.3 + gapW / 2;
      for (let i = 0; i < 7; i++) {
        const sh = SHAPES[i], w = sh.w * k, d = sh.d, f = W.frame(q, s + w / 2), m = Math.min(w, d);
        const r = sh.kind === 'canine' ? m * 0.48 : sh.kind === 'molar' ? m * 0.34 : sh.kind === 'premolar' ? m * 0.44 : d * 0.42;
        const T = { q, i, kind: sh.kind, w, d, r, cx: f.x, cy: f.y, tx: f.tx, ty: f.ty, nx: f.nx, ny: f.ny, s0: s, s1: s + w, cells: [], left: 0, clean: true, flash: 0 };
        const nu = Math.max(2, Math.round(w / CELL)), nv = Math.max(2, Math.round(d / CELL)), du = w / nu, dv = d / nv;
        for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
          const u = -w / 2 + du * (a + 0.5), v = -d / 2 + dv * (b + 0.5), e = -sdf(u, v, w, d, r);
          if (e < 0.25) continue;
          const c = { x: T.cx + T.tx * u + T.nx * v, y: T.cy + T.ty * u + T.ny * v, u, v, e, tooth: T, rim: e < CELL * 1.05, surf: v > d * 0.2 ? 0 : v < -d * 0.2 ? 1 : 2, p: 0, p0: 0, sticky: false, hard: false, nb: [], idx: Q.cells.length };
          T.cells.push(c); Q.cells.push(c);
        }
        Q.teeth.push(T); W.teeth.push(T);
        if (i < 6) { const g = W.frame(q, s + w + gapW / 2); Q.gaps.push({ q, i, x: g.x, y: g.y, nx: g.nx, ny: g.ny, tx: g.tx, ty: g.ty, d: (d + SHAPES[i + 1].d) / 2, size: i < 1 ? 0 : i < 3 ? 1 : 2 }); }
        s += w + gapW;
      }
      if (q === 0 || q === 3) { const g = W.frame(q, 0); Q.gaps.push({ q, i: -1, x: 0, y: g.y, nx: 0, ny: g.ny, tx: 1, ty: 0, d: SHAPES[0].d, size: 0 }); }
      for (const c of Q.cells) for (const o of Q.cells) if (o !== c && Math.hypot(o.x - c.x, o.y - c.y) < CELL * 1.55) c.nb.push(o);
      // lookup grid: world point -> cell under it
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const c of Q.cells) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); }
      Q.bbox = { x0: x0 - 6, y0: y0 - 6, x1: x1 + 6, y1: y1 + 6 };
      const res = CELL * 0.5, cols = Math.ceil((Q.bbox.x1 - Q.bbox.x0) / res) + 1, rows = Math.ceil((Q.bbox.y1 - Q.bbox.y0) / res) + 1;
      const grid = new Int16Array(cols * rows).fill(-1), best = new Float32Array(cols * rows).fill(1e9), reach = CELL * 0.8;
      for (const c of Q.cells) {
        const gx = Math.round((c.x - Q.bbox.x0) / res), gy = Math.round((c.y - Q.bbox.y0) / res);
        for (let j = -2; j <= 2; j++) for (let i2 = -2; i2 <= 2; i2++) {
          const X = gx + i2, Y = gy + j; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
          const dd = Math.hypot(Q.bbox.x0 + X * res - c.x, Q.bbox.y0 + Y * res - c.y);
          if (dd < reach && dd < best[Y * cols + X]) { best[Y * cols + X] = dd; grid[Y * cols + X] = c.idx; }
        }
      }
      Q.grid = grid; Q.cols = cols; Q.rows = rows; Q.res = res;
      W.gaps.push(...Q.gaps); W.quads.push(Q);
    }
  })();

  W.cellAt = function (Q, x, y) {
    const X = Math.round((x - Q.bbox.x0) / Q.res), Y = Math.round((y - Q.bbox.y0) / Q.res);
    if (X < 0 || Y < 0 || X >= Q.cols || Y >= Q.rows) return -1;
    return Q.grid[Y * Q.cols + X];
  };

  // The line Fila follows: side 1 = outside rim, -1 = inside rim, 0 = chewing surface.
  W.guidePoint = function (q, s, side) {
    const Q = W.quads[q]; let d = 8;
    for (const T of Q.teeth) if (s >= T.s0 - 0.3 && s <= T.s1 + 0.3) { d = T.d; break; }
    const f = W.frame(q, s), off = side * d * 0.33;
    return { x: f.x + f.nx * off, y: f.y + f.ny * off };
  };

  // ---- plaque ----
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // coverage and sticky are 0..1; seed varies the pattern from hunt to hunt.
  W.seed = function (q, o) {
    const Q = W.quads[q], sd = o.seed || 0; let sum = 0;
    for (const T of Q.teeth) T.left = 0;
    for (const c of Q.cells) {
      const T = c.tooth, back = T.kind === 'molar' || T.kind === 'premolar';
      let wgt = c.rim ? 0.92 : c.surf === 2 ? (back ? 0.5 : 0.18) : 0.55;
      if (Math.abs(c.u) > T.w / 2 - CELL * 1.2) wgt += 0.15;
      const on = vnoise(c.x * 0.2 + sd, c.y * 0.2 - sd) < o.coverage * wgt * 1.45;
      c.hard = false; c.p = on ? 0.72 + 0.28 * hash(c.x + sd, c.y) : 0; c.p0 = c.p;
      c.sticky = on && vnoise(c.x * 0.12 + 9.3 + sd, c.y * 0.12) < o.sticky;
      if (on) { T.left++; sum += c.p; }
    }
    for (const T of Q.teeth) { T.clean = T.left === 0; T.flash = 0; }
    Q.p0sum = sum;
  };
  W.dirty = function (c, p, sticky) { if (c.hard) return; if (c.p <= 0) c.tooth.left++; c.p = Math.max(c.p, p); if (sticky) c.sticky = true; c.tooth.clean = false; };
  W.plaqueSum = function (q) { let s = 0; for (const c of W.quads[q].cells) if (!c.hard) s += c.p; return s; };

  // ---- drawing (all in world units; the caller sets the camera transform). Flat fills, palette colours. ----
  function archPath(ctx, upper) {
    const qa = upper ? 1 : 2, qb = upper ? 0 : 3; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const f = W.frame(qa, (L + 3.5) * (1 - i / 40)); if (i) ctx.lineTo(f.x, f.y); else ctx.moveTo(f.x, f.y); }
    for (let i = 1; i <= 40; i++) { const f = W.frame(qb, (L + 3.5) * (i / 40)); ctx.lineTo(f.x, f.y); }
  }
  function toothPath(ctx, T, grow) {
    const w = T.w + grow * 2, d = T.d + grow * 2, r = Math.min(T.r + grow, w / 2, d / 2);
    ctx.beginPath(); ctx.moveTo(-w / 2 + r, -d / 2); ctx.arcTo(w / 2, -d / 2, w / 2, d / 2, r); ctx.arcTo(w / 2, d / 2, -w / 2, d / 2, r); ctx.arcTo(-w / 2, d / 2, -w / 2, -d / 2, r); ctx.arcTo(-w / 2, -d / 2, w / 2, -d / 2, r); ctx.closePath();
  }
  W.drawGums = function (ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const upper of [true, false]) {
      archPath(ctx, upper); ctx.strokeStyle = C.orchid; ctx.lineWidth = 18.4; ctx.stroke();
      archPath(ctx, upper); ctx.strokeStyle = C.gum; ctx.lineWidth = 17; ctx.stroke();
    }
    ctx.fillStyle = C.gumLight;
    for (const T of W.teeth) { ctx.save(); ctx.transform(T.tx, T.ty, T.nx, T.ny, T.cx, T.cy); toothPath(ctx, T, 0.8); ctx.fill(); ctx.restore(); }
  };
  W.drawTeeth = function (ctx, active, dim) {
    for (const T of W.teeth) {
      ctx.save(); ctx.transform(T.tx, T.ty, T.nx, T.ny, T.cx, T.cy);
      ctx.globalAlpha = active >= 0 && T.q !== active ? dim : 1;
      toothPath(ctx, T, 0); ctx.fillStyle = C.white; ctx.fill();
      ctx.strokeStyle = C.blue40; ctx.lineWidth = 0.28; ctx.stroke();
      ctx.strokeStyle = C.blue20; ctx.lineWidth = 0.36; ctx.lineCap = 'round';
      const w = T.w, d = T.d;
      ctx.beginPath();
      if (T.kind === 'molar') { ctx.moveTo(-w * 0.3, 0); ctx.lineTo(w * 0.3, 0); ctx.moveTo(0, -d * 0.28); ctx.lineTo(0, d * 0.28); }
      else if (T.kind === 'premolar') { ctx.moveTo(-w * 0.26, 0); ctx.lineTo(w * 0.26, 0); }
      else if (T.kind === 'canine') { ctx.moveTo(-w * 0.12, d * 0.06); ctx.lineTo(w * 0.12, d * 0.06); }
      else { ctx.moveTo(-w * 0.32, d * 0.08); ctx.lineTo(w * 0.32, d * 0.08); }
      ctx.stroke();
      if (T.flash > 0) { ctx.globalAlpha = Math.min(1, T.flash) * 0.6; toothPath(ctx, T, 0.4); ctx.fillStyle = C.sky; ctx.fill(); }
      ctx.restore();
    }
  };
  // Film is drawn as flat blobs that shrink as they are cleaned: Vivid Yellow when fresh, Tangerine when old and sticky.
  W.drawPlaque = function (ctx, q, alpha) {
    const Q = W.quads[q];
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (const kind of [0, 1, 2]) {
      ctx.beginPath(); let any = false;
      for (const c of Q.cells) {
        if (c.p <= 0.02 || (c.hard ? 2 : c.sticky ? 1 : 0) !== kind) continue; any = true;
        const R = CELL * (0.5 + 0.48 * c.p), x = c.x + (hash(c.x, c.y) - 0.5) * 0.5, y = c.y + (hash(c.y, c.x) - 0.5) * 0.5;
        ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU);
      }
      if (!any) continue;
      ctx.fillStyle = kind === 2 ? C.bg : kind === 1 ? C.orange : C.yellow; ctx.fill();
      if (kind === 2) { ctx.strokeStyle = C.grey; ctx.lineWidth = 0.2; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  };
})();
