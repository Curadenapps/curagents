/* Plaque Hunter — the hunting ground. One quadrant is a row of teeth seen three ways:
   pass 0 the outside faces, pass 1 the inside faces, pass 2 the chewing surfaces.
   Mouth features (braces, bridge, crown, hole, sore gums, wisdom tooth) change the rules on the teeth they touch.
   Drawing is flat fills with stepped shading, palette colours only. */
(function () {
  const PH = window.PH, C = PH.C;
  const ST = (PH.Strip = {});
  const TAU = Math.PI * 2, CELL = 1.3, GAPW = 0.9;
  ST.CELL = CELL;
  const GUM_SHADE = '#F59AD5', GUM_DEEP = '#F277C6'; // Orchid Pink at 70% and 100%
  const KINDS = [
    { kind: 'incisor', w: 8.6, h: 10.6, d: 3.4 }, { kind: 'incisor', w: 6.6, h: 9.6, d: 3.2 }, { kind: 'canine', w: 7.6, h: 11.4, d: 5.4 },
    { kind: 'premolar', w: 7.0, h: 8.8, d: 7.4 }, { kind: 'premolar', w: 7.0, h: 8.6, d: 7.6 }, { kind: 'molar', w: 10.4, h: 7.8, d: 9.6 }, { kind: 'molar', w: 9.8, h: 7.4, d: 9.2 },
  ];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ---- tooth silhouettes, side view. Local coords: u across, v up from the gumline. ----
  function rawPts(T) {
    const hw = T.w / 2, nw = hw * 0.8, h = T.h, k = T.kind;
    if (T.f.pontic) return [[-hw * 0.7, 1.25], [-hw, h * 0.45], [-hw * 0.92, h * 0.86], [-hw * 0.4, h], [hw * 0.4, h], [hw * 0.92, h * 0.86], [hw, h * 0.45], [hw * 0.7, 1.25], [0, 1.05]];
    const neck = [[-nw, -2], [-nw, 0]], end = [[nw, 0], [nw, -2]];
    let top;
    if (k === 'incisor') top = [[-hw, h * 0.42], [-hw * 0.97, h * 0.86], [-hw * 0.62, h], [hw * 0.62, h], [hw * 0.97, h * 0.86], [hw, h * 0.42]];
    else if (k === 'canine') top = [[-hw, h * 0.4], [-hw * 0.86, h * 0.74], [0, h * 1.03], [hw * 0.86, h * 0.74], [hw, h * 0.4]];
    else if (k === 'premolar') top = [[-hw, h * 0.45], [-hw * 0.9, h * 0.84], [-hw * 0.3, h], [hw * 0.3, h], [hw * 0.9, h * 0.84], [hw, h * 0.45]];
    else top = [[-hw, h * 0.45], [-hw * 0.95, h * 0.86], [-hw * 0.55, h], [0, h * 0.88], [hw * 0.55, h], [hw * 0.95, h * 0.86], [hw, h * 0.45]];
    return neck.concat(top, end);
  }
  function smooth(p, closed) {
    const out = [], n = p.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!closed) out.push(p[0]);
    const from = closed ? 0 : 1, to = closed ? n : n - 1;
    for (let i = from; i < to; i++) {
      const a = mid(p[(i - 1 + n) % n], p[i]), b = mid(p[i], p[(i + 1) % n]), c = p[i];
      for (let t = 0; t <= 1.001; t += 0.2) { const m = 1 - t; out.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]); }
    }
    if (!closed) out.push(p[n - 1]);
    return out;
  }
  function inPoly(poly, x, y) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; }
  function edgeDist(poly, x, y) {
    let best = 1e9;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j], dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
    }
    return best;
  }
  const sdf = (u, v, w, d, r) => { const qx = Math.abs(u) - (w / 2 - r), qy = Math.abs(v) - (d / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
  const topR = (T) => (T.kind === 'incisor' ? T.d * 0.45 : T.kind === 'canine' ? Math.min(T.w, T.d) * 0.48 : Math.min(T.w, T.d) * 0.36);

  // ---- build one quadrant ----
  ST.build = function (q, feats) {
    feats = feats || [];
    const upper = q < 2, dir = q === 0 || q === 3 ? 1 : -1, oy = upper ? 1 : -1;
    const teeth = KINDS.map((k, i) => Object.assign({ i, f: {}, sore: false, soothe: 0, flash: 0 }, k));
    if (feats.includes('wisdom')) teeth.push({ i: 7, kind: 'wisdom', w: 8.8, h: 4.8, d: 8.4, f: { wisdom: true }, sore: false, soothe: 0, flash: 0 });
    if (feats.includes('bridge')) { teeth[3].f.abut = true; teeth[4].f.pontic = true; teeth[5].f.abut = true; }
    if (feats.includes('crown')) { const c = teeth[feats.includes('bridge') ? 6 : 3 + ((Math.random() * 3) | 0)]; c.f.crown = true; }
    if (feats.includes('braces')) for (const T of teeth) if (T.i <= 5) T.f.bracket = Math.min(4.6, T.h * 0.52);
    if (feats.includes('hole')) { const c = teeth.filter((T) => T.kind === 'molar' && !T.f.crown && !T.f.abut); if (c.length) c[(Math.random() * c.length) | 0].f.hole = { du: (Math.random() - 0.5) * 2.4, dv: (Math.random() - 0.5) * 2 }; }
    for (const f of feats) if (f === 'sore') { const s = (Math.random() * 6) | 0; teeth[s].sore = true; teeth[s + 1].sore = true; }
    let u = 2.5; for (const T of teeth) { T.u = u + T.w / 2; u += T.w + GAPW; T.poly = smooth(rawPts(T), !!T.f.pontic); }
    const U = u - GAPW + 2.5, Q = { q, upper, dir, oy, U, teeth, feats, gaps: [], passes: [] };
    Q.X = (uu) => dir * (uu - U / 2);
    for (let i = 0; i < teeth.length - 1; i++) {
      const a = teeth[i], b = teeth[i + 1]; if (a.f.pontic || b.f.pontic) continue;
      Q.gaps.push({ k: 'gap', i, u: a.u + a.w / 2 + GAPW / 2, d: (a.d + b.d) / 2, prog: 0, done: false, flash: 0 });
    }
    const pon = teeth.find((T) => T.f.pontic); if (pon) Q.gaps.push({ k: 'tunnel', i: pon.i, u: pon.u, w: pon.w + GAPW * 2, prog: 0, done: false, flash: 0 });
    for (let s = 0; s < 3; s++) Q.passes.push(buildPass(Q, s));
    return Q;
  };

  function buildPass(Q, s) {
    const P = { s, cells: [], p0sum: 0 }, side = s < 2;
    for (const T of Q.teeth) {
      T.cells = T.cells || [[], [], []];
      const nu = Math.max(2, Math.round(T.w / CELL)), du = T.w / nu;
      const span = side ? T.h + 0.4 : T.d, nv = Math.max(2, Math.round(span / CELL)), dv = span / nv, r = topR(T);
      for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
        const cu = -T.w / 2 + du * (a + 0.5), cv = side ? dv * (b + 0.5) : -T.d / 2 + dv * (b + 0.5);
        let e;
        if (side) { if (cv < (T.f.pontic ? 1.5 : 0.4) || !inPoly(T.poly, cu, cv)) continue; e = edgeDist(T.poly, cu, cv); }
        else e = -sdf(cu, cv, T.w, T.d, r);
        if (e < 0.28) continue;
        const c = { x: Q.X(T.u + cu), y: side ? Q.oy * cv : cv, u: cu, v: cv, e, tooth: T, p: 0, p0: 0, sticky: false, hard: false, nb: [], idx: P.cells.length };
        c.gum = side ? cv < 1.9 : e < 1.15;
        c.edge = Math.abs(cu) > T.w / 2 - 1.35;
        c.pit = !side && (T.kind === 'molar' || T.kind === 'premolar' || T.kind === 'wisdom') && (Math.abs(cv) < 0.8 || Math.abs(cu) < 0.8);
        c.tight = !!T.f.wisdom || (s === 0 && T.f.bracket != null && Math.hypot(cu, cv - T.f.bracket) < 2.5);
        c.slick = !!T.f.crown && !c.gum;
        if (!side && T.f.hole && Math.hypot(cu - T.f.hole.du, cv - T.f.hole.dv) < 1.55) c.hole = true;
        T.cells[s].push(c); P.cells.push(c);
      }
    }
    for (const c of P.cells) for (const o of P.cells) if (o !== c && Math.hypot(o.x - c.x, o.y - c.y) < CELL * 1.55) c.nb.push(o);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const c of P.cells) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); }
    P.bx = x0 - 3; P.by = y0 - 3;
    const res = (P.res = CELL * 0.5), cols = (P.cols = Math.ceil((x1 - x0 + 6) / res) + 1), rows = (P.rows = Math.ceil((y1 - y0 + 6) / res) + 1);
    const grid = (P.grid = new Int16Array(cols * rows).fill(-1)), best = new Float32Array(cols * rows).fill(1e9);
    for (const c of P.cells) {
      const gx = Math.round((c.x - P.bx) / res), gy = Math.round((c.y - P.by) / res);
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const X = gx + i, Y = gy + j; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
        const dd = Math.hypot(P.bx + X * res - c.x, P.by + Y * res - c.y);
        if (dd < CELL * 0.8 && dd < best[Y * cols + X]) { best[Y * cols + X] = dd; grid[Y * cols + X] = c.idx; }
      }
    }
    return P;
  }
  ST.cellAt = function (P, x, y) {
    const X = Math.round((x - P.bx) / P.res), Y = Math.round((y - P.by) / P.res);
    return X < 0 || Y < 0 || X >= P.cols || Y >= P.rows ? -1 : P.grid[Y * P.cols + X];
  };

  // Where a gap can be reached in a given pass (a short segment the Prime travels along), or null.
  ST.gapSeg = function (Q, g, s) {
    const x = Q.X(g.u);
    if (g.k === 'tunnel') return s === 2 ? null : { x0: Q.X(g.u - g.w / 2 + 1), y0: Q.oy * 0.62, x1: Q.X(g.u + g.w / 2 - 1), y1: Q.oy * 0.62 };
    return s === 2 ? { x0: x, y0: -g.d / 2 + 0.6, x1: x, y1: g.d / 2 - 0.6 } : { x0: x, y0: Q.oy * 0.7, x1: x, y1: Q.oy * 3.5 };
  };

  // ---- film ----
  ST.seed = function (Q, s, o) {
    const P = Q.passes[s], sd = o.seed || 0, side = s < 2; let sum = 0;
    for (const c of P.cells) {
      const T = c.tooth;
      let wgt = c.gum ? 0.95 : c.pit ? 0.75 : c.edge ? 0.7 : side ? 0.45 : T.kind === 'incisor' ? 0.2 : 0.38;
      const on = c.tight || c.hole || vnoise(c.x * 0.19 + sd, c.y * 0.19 - sd) < o.coverage * wgt * 1.45;
      c.hard = !!c.hole; c.p = on ? 0.72 + 0.28 * hash(c.x + sd, c.y) : 0;
      c.sticky = on && !c.slick && (vnoise(c.x * 0.12 + 9.3 + sd, c.y * 0.12) < o.sticky * (c.gum ? 1.5 : 1) || (!!T.f.crown && c.gum));
      c.p0 = c.p; if (on && !c.hard) sum += c.p;
    }
    P.p0sum = Math.max(sum, 0.001);
  };
  ST.addFilm = function (P, c, p, sticky) { if (c.hard) return; const b = c.p; c.p = Math.max(c.p, p); if (sticky) c.sticky = true; P.p0sum += c.p - b; };
  ST.sum = function (P) { let s = 0; for (const c of P.cells) if (!c.hard) s += c.p; return s; };

  // ---- drawing ----
  // The world is the system's dark surface (ink navy), lit by the swarm. Three depths: far silhouettes, the row, a near foreground.
  const SCENE = [
    { bg: C.ink, far: C.ink2, mid: C.blueDk, fog: C.sky, line: C.blue60, ink: C.white },
    { bg: '#071634', far: C.ink, mid: C.ink2, fog: C.orchid, line: C.blue60, ink: C.white },
    { bg: C.ink2, far: C.ink, mid: C.blueDk, fog: C.sky, line: C.blue60, ink: C.white },
  ];
  ST.scene = (s) => SCENE[s];

  // Backdrop in world units. vr is the visible world rect; camX drives the parallax.
  ST.drawBack = function (ctx, Q, s, vr, time, camX) {
    const sc = SCENE[s], w = vr.x1 - vr.x0, h = vr.y1 - vr.y0, gy = s < 2 ? Q.oy : 1;
    ctx.fillStyle = sc.bg; ctx.fillRect(vr.x0 - 2, vr.y0 - 2, w + 4, h + 4);
    // far: the other side of the mouth, a line of distant pearls, moving at a quarter speed
    let off = camX * 0.75; ctx.fillStyle = sc.far;
    for (let i = -6; i <= 6; i++) { const x = i * 13 + off, hh = 15 + ((i * 7 + 21) % 5) * 2.2; ctx.beginPath(); ctx.ellipse(x, -gy * (h * 0.5 - 1), 5.6, hh, 0, 0, TAU); ctx.fill(); }
    // mid: drifting haze bands at half speed
    off = camX * 0.5; ctx.fillStyle = sc.mid;
    for (let i = -4; i <= 4; i++) { const x = i * 21 + off + Math.sin(time * 0.2 + i) * 2; ctx.beginPath(); ctx.ellipse(x, -gy * (h * 0.24) + Math.sin(i * 2.3) * 3, 15, 3.2 + (i & 1) * 1.6, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sc.fog; ctx.globalAlpha = 0.07;
    for (let i = -3; i <= 3; i++) { const x = i * 27 + camX * 0.35 + Math.sin(time * 0.13 + i * 1.7) * 4; ctx.beginPath(); ctx.ellipse(x, -gy * 3 + Math.cos(i) * 5, 19, 7, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (s === 2) { // the tongue, on the inner side of the row
      const ty = Q.upper ? -1 : 1; ctx.fillStyle = GUM_SHADE; ctx.beginPath(); ctx.ellipse(Q.dir * -6, ty * 19, Q.U * 0.62, 9.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = GUM_DEEP; ctx.beginPath(); ctx.ellipse(Q.dir * -6, ty * 22, Q.U * 0.56, 8, 0, 0, TAU); ctx.fill();
    } else { // gum body behind the teeth, so it shows through the gaps
      ctx.fillStyle = GUM_DEEP; const y = Q.oy * 2.4; ctx.fillRect(Q.X(0) - (Q.dir > 0 ? 6 : Q.U + 6), Math.min(y, -Q.oy * 60), Q.U + 12, Math.abs(y + Q.oy * 60));
    }
  };
  // Foreground, drawn over the darkness: drifting motes and big soft shapes close to the eye.
  ST.drawFront = function (ctx, Q, s, vr, time, camX) {
    const h = vr.y1 - vr.y0, w = vr.x1 - vr.x0, gy = s < 2 ? Q.oy : 1;
    ctx.fillStyle = '#040C24'; const off = -camX * 0.55;
    for (let i = -5; i <= 5; i++) { const x = i * 19 + off + 6; ctx.beginPath(); ctx.ellipse(x, gy * (h * 0.5 + 2.5) + (s < 2 ? Q.oy * 2.6 : 0), 11, 6 + ((i * 5 + 15) % 3) * 1.4, 0, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { // motes
      const px = (((i * 47.3 + time * (0.5 + (i % 5) * 0.22) - camX * 0.3) % (w + 8)) + (w + 8)) % (w + 8), py = (((i * 29.7 - time * (0.35 + (i % 3) * 0.2)) % h) + h) % h;
      const tw = 0.5 + 0.5 * Math.sin(time * (1 + (i % 4) * 0.4) + i);
      ctx.globalAlpha = 0.16 + 0.34 * tw; ctx.fillStyle = i % 4 ? C.sky : C.white; ctx.beginPath(); ctx.arc(vr.x0 - 4 + px, vr.y0 + py, 0.14 + (i % 3) * 0.1, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  function polyPath(ctx, Q, T, s) { ctx.beginPath(); T.poly.forEach((p, i) => { const x = Q.X(T.u + p[0]), y = Q.oy * p[1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); }
  function rrect(ctx, cx, cy, w, d, r) { r = Math.min(r, w / 2, d / 2); ctx.beginPath(); ctx.moveTo(cx - w / 2 + r, cy - d / 2); ctx.arcTo(cx + w / 2, cy - d / 2, cx + w / 2, cy + d / 2, r); ctx.arcTo(cx + w / 2, cy + d / 2, cx - w / 2, cy + d / 2, r); ctx.arcTo(cx - w / 2, cy + d / 2, cx - w / 2, cy - d / 2, r); ctx.arcTo(cx - w / 2, cy - d / 2, cx + w / 2, cy - d / 2, r); ctx.closePath(); }

  ST.drawTeeth = function (ctx, Q, s, time) {
    const sc = SCENE[s];
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (s === 2) {
      const dm = 9.6, x0 = Q.X(0), x1 = Q.X(Q.U), xa = Math.min(x0, x1), ww = Math.abs(x1 - x0);
      rrect(ctx, xa + ww / 2, 0, ww + 5, dm + 6.4, 7); ctx.fillStyle = C.gum; ctx.fill(); ctx.strokeStyle = GUM_DEEP; ctx.lineWidth = 0.45; ctx.stroke();
      rrect(ctx, xa + ww / 2, 1.2, ww + 2, dm + 2.2, 6); ctx.fillStyle = GUM_SHADE; ctx.fill();
      for (const T of Q.teeth) { rrect(ctx, Q.X(T.u), 0, T.w + 1.5, T.d + 1.5, topR(T) + 0.75); ctx.fillStyle = C.gumLight; ctx.fill(); }
      const br = Q.teeth.filter((T) => T.f.abut || T.f.pontic);
      if (br.length) { ctx.fillStyle = C.white; ctx.strokeStyle = sc.line; ctx.lineWidth = 0.3; rrect(ctx, Q.X(br[1].u), 0, br[1].w + 4, 2.6, 1); ctx.fill(); ctx.stroke(); }
      for (const T of Q.teeth) {
        const x = Q.X(T.u), r = topR(T), gold = T.f.crown;
        rrect(ctx, x, 0, T.w, T.d, r); ctx.fillStyle = gold ? C.yellow : C.white; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = gold ? C.orange : C.bg2; ctx.globalAlpha = gold ? 0.45 : 1; ctx.fillRect(x + T.w * 0.12, -T.d, T.w, T.d * 2); ctx.globalAlpha = gold ? 0.5 : 1; ctx.fillStyle = gold ? C.orange : C.blue20; ctx.fillRect(x + T.w * 0.36, -T.d, T.w, T.d * 2); ctx.restore(); ctx.globalAlpha = 1;
        rrect(ctx, x, 0, T.w, T.d, r); ctx.strokeStyle = sc.line; ctx.lineWidth = 0.34; ctx.stroke();
        ctx.strokeStyle = gold ? C.orange : C.blue40; ctx.lineWidth = 0.34; ctx.beginPath();
        if (T.kind === 'molar' || T.kind === 'wisdom') { ctx.moveTo(x - T.w * 0.3, 0); ctx.lineTo(x + T.w * 0.3, 0); ctx.moveTo(x, -T.d * 0.28); ctx.lineTo(x, T.d * 0.28); ctx.moveTo(x - T.w * 0.3, 0); ctx.lineTo(x - T.w * 0.38, -T.d * 0.14); ctx.moveTo(x + T.w * 0.3, 0); ctx.lineTo(x + T.w * 0.38, T.d * 0.14); }
        else if (T.kind === 'premolar') { ctx.moveTo(x - T.w * 0.26, 0); ctx.lineTo(x + T.w * 0.26, 0); }
        else { ctx.moveTo(x - T.w * 0.34, 0); ctx.lineTo(x + T.w * 0.34, 0); }
        ctx.stroke();
        if (T.f.hole) { const hx = x + Q.dir * T.f.hole.du, hy = T.f.hole.dv; ctx.fillStyle = T.f.filled ? C.sky : C.blue; ctx.beginPath(); ctx.arc(hx, hy, 1.35, 0, TAU); ctx.fill(); ctx.strokeStyle = C.blueDk; ctx.lineWidth = 0.3; ctx.stroke(); if (!T.f.filled) { ctx.fillStyle = C.blueDk; ctx.beginPath(); ctx.arc(hx + 0.25, hy + 0.3, 0.7, 0, TAU); ctx.fill(); } }
        if (T.f.wisdom) { rrect(ctx, x + Q.dir * T.w * 0.3, 0, T.w * 0.6, T.d + 1.6, 3); ctx.fillStyle = C.gum; ctx.fill(); ctx.strokeStyle = GUM_DEEP; ctx.lineWidth = 0.3; ctx.stroke(); }
        if (T.flash > 0) { ctx.globalAlpha = Math.min(1, T.flash) * 0.55; rrect(ctx, x, 0, T.w, T.d, r); ctx.fillStyle = C.sky; ctx.fill(); ctx.globalAlpha = 1; }
      }
      return;
    }
    const br = Q.teeth.filter((T) => T.f.abut || T.f.pontic);
    if (br.length) { ctx.fillStyle = C.white; ctx.strokeStyle = sc.line; ctx.lineWidth = 0.3; const y = Q.oy * br[1].h * 0.52; rrect(ctx, Q.X(br[1].u), y, br[1].w + 5, 2.2, 1); ctx.fill(); ctx.stroke(); }
    for (const T of Q.teeth) {
      const x = Q.X(T.u), gold = T.f.crown, yy = Q.oy * T.h;
      polyPath(ctx, Q, T, s); ctx.fillStyle = gold ? C.yellow : C.white; ctx.fill();
      ctx.save(); ctx.clip(); // stepped shading: light from the left, a darker band at the neck
      ctx.fillStyle = gold ? C.orange : C.bg2; ctx.globalAlpha = gold ? 0.4 : 1; ctx.fillRect(x + T.w * 0.1, Math.min(0, yy) - 3, T.w, T.h + 6);
      ctx.fillStyle = gold ? C.orange : C.blue20; ctx.globalAlpha = gold ? 0.5 : 1; ctx.fillRect(x + T.w * 0.34, Math.min(0, yy) - 3, T.w, T.h + 6);
      ctx.globalAlpha = gold ? 0.3 : 0.7; ctx.fillRect(x - T.w, Math.min(0, Q.oy * 1.5), T.w * 2, 1.5);
      ctx.globalAlpha = 1; ctx.fillStyle = C.white; ctx.beginPath(); ctx.ellipse(x - T.w * 0.24, Q.oy * T.h * 0.62, T.w * 0.07, T.h * 0.2, 0, 0, TAU); ctx.fill();
      ctx.restore();
      polyPath(ctx, Q, T, s); ctx.strokeStyle = sc.line; ctx.lineWidth = 0.36; ctx.stroke();
      ctx.strokeStyle = gold ? C.orange : C.blue40; ctx.lineWidth = 0.32; ctx.beginPath();
      if (s === 1 && (T.kind === 'incisor' || T.kind === 'canine')) ctx.arc(x, Q.oy * T.h * 0.2, T.w * 0.3, Q.oy > 0 ? 0.15 * Math.PI : 1.15 * Math.PI, Q.oy > 0 ? 0.85 * Math.PI : 1.85 * Math.PI);
      else if (T.kind === 'molar' || T.kind === 'wisdom') { ctx.moveTo(x, Q.oy * T.h * 0.86); ctx.lineTo(x, Q.oy * T.h * 0.5); }
      ctx.stroke();
      if (T.flash > 0) { ctx.globalAlpha = Math.min(1, T.flash) * 0.55; polyPath(ctx, Q, T, s); ctx.fillStyle = C.sky; ctx.fill(); ctx.globalAlpha = 1; }
    }
  };

  // Gum in front of the tooth necks: scalloped edge, papillae between teeth, flat under a bridge, a hood over a wisdom tooth.
  ST.drawGum = function (ctx, Q, s, time) {
    if (s === 2) return;
    const pts = [], oy = Q.oy, T0 = Q.teeth[0], Tn = Q.teeth[Q.teeth.length - 1];
    pts.push([T0.u - T0.w / 2 - 7, 2.0]); pts.push([T0.u - T0.w / 2 - 1.2, 2.3]);
    Q.teeth.forEach((T, i) => {
      const nx = Q.teeth[i + 1], flat = T.f.pontic;
      pts.push([T.u, flat ? 0.2 : 0.3]);
      if (nx) pts.push([T.u + T.w / 2 + GAPW / 2, flat || nx.f.pontic ? 0.25 : 2.7]);
    });
    pts.push([Tn.u + Tn.w / 2 + 1.2, 2.3]); pts.push([Tn.u + Tn.w / 2 + 7, 2.0]);
    const edge = smooth(pts, false);
    const band = (drop, fill) => { ctx.beginPath(); edge.forEach((p, i) => { const x = Q.X(p[0]), y = oy * (p[1] - drop); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.lineTo(Q.X(edge[edge.length - 1][0]), -oy * 60); ctx.lineTo(Q.X(edge[0][0]), -oy * 60); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    band(0, C.gum); band(3.2, GUM_SHADE); band(7.5, GUM_DEEP);
    ctx.beginPath(); edge.forEach((p, i) => { const x = Q.X(p[0]), y = oy * p[1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.strokeStyle = GUM_DEEP; ctx.lineWidth = 0.38; ctx.stroke();
    for (const T of Q.teeth) {
      if (T.f.wisdom) { ctx.fillStyle = C.gum; ctx.strokeStyle = GUM_DEEP; ctx.lineWidth = 0.38; ctx.beginPath(); ctx.ellipse(Q.X(T.u + T.w * 0.28), oy * 2.2, T.w * 0.5, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      if (T.sore) { const pulse = 1 + 0.06 * Math.sin(time * 5 + T.i); ctx.fillStyle = C.cerise; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(Q.X(T.u), oy * 0.2, T.w * 0.56 * pulse, 1.9 * pulse, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = C.white; ctx.beginPath(); ctx.ellipse(Q.X(T.u) - T.w * 0.2, oy * 0.5, T.w * 0.12, 0.4, 0, 0, TAU); ctx.fill(); }
    }
  };

  ST.drawPlaque = function (ctx, Q, s) {
    const P = Q.passes[s];
    for (const kind of [0, 1]) {
      ctx.beginPath(); let any = false;
      for (const c of P.cells) {
        if (c.p <= 0.02 || c.hard || (c.sticky ? 1 : 0) !== kind) continue; any = true;
        const R = CELL * (0.4 + 0.4 * c.p), x = c.x + (hash(c.x, c.y) - 0.5) * 0.5, y = c.y + (hash(c.y, c.x) - 0.5) * 0.5;
        ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU);
      }
      if (any) { ctx.fillStyle = kind ? C.orange : C.yellow; ctx.fill(); }
    }
    ctx.fillStyle = C.white; ctx.globalAlpha = 0.55; ctx.beginPath(); // small glints so the film reads as wet
    for (const c of P.cells) if (c.p > 0.6 && !c.hard && hash(c.x * 3, c.y * 7) < 0.22) { ctx.moveTo(c.x, c.y); ctx.arc(c.x - 0.25, c.y - 0.25, 0.22, 0, TAU); }
    ctx.fill(); ctx.globalAlpha = 1;
  };

  ST.drawFeatures = function (ctx, Q, s) {
    if (s !== 0) return;
    const br = Q.teeth.filter((T) => T.f.bracket != null); if (!br.length) return;
    ctx.strokeStyle = C.blue80; ctx.lineWidth = 0.42; ctx.lineCap = 'round'; ctx.beginPath();
    br.forEach((T, i) => { const x = Q.X(T.u), y = Q.oy * T.f.bracket; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    for (const T of br) {
      const x = Q.X(T.u), y = Q.oy * T.f.bracket;
      rrect(ctx, x, y, 2.5, 2.1, 0.5); ctx.fillStyle = C.sky; ctx.fill(); ctx.strokeStyle = C.blue; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.fillStyle = C.white; ctx.fillRect(x - 0.9, y - 0.75, 0.7, 0.45);
      ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.moveTo(x - 1.25, y); ctx.lineTo(x + 1.25, y); ctx.stroke();
    }
  };

  // Gaps: a wedge of film where two teeth meet (or under a bridge), until a Prime has been through.
  ST.drawGaps = function (ctx, Q, s, time, active) {
    for (const g of Q.gaps) {
      const sg = ST.gapSeg(Q, g, s); if (!sg) continue;
      const mx = (sg.x0 + sg.x1) / 2, my = (sg.y0 + sg.y1) / 2;
      if (g.done) { if (g.flash > 0) PH.Art.sparkle(ctx, mx, my, 1.4 * g.flash + 0.6, time * 2, Math.min(1, g.flash), SCENE[s].ink); continue; }
      ctx.lineCap = 'round'; ctx.strokeStyle = C.orange; ctx.lineWidth = 1.15 * (1 - g.prog * 0.6); ctx.beginPath(); ctx.moveTo(sg.x0, sg.y0); ctx.lineTo(sg.x1, sg.y1); ctx.stroke();
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 0.5 * (1 - g.prog * 0.6); ctx.stroke();
      const pulse = 1.5 + 0.35 * Math.sin(time * 4 + g.i);
      ctx.strokeStyle = SCENE[s].ink; ctx.globalAlpha = g === active ? 0.9 : 0.4; ctx.lineWidth = 0.22; ctx.beginPath(); ctx.arc(mx, my, pulse + (g.k === 'tunnel' ? 1.2 : 0), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      if (g.prog > 0) { ctx.strokeStyle = SCENE[s].ink; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(mx, my, 2.3, -Math.PI / 2, -Math.PI / 2 + TAU * g.prog); ctx.stroke(); }
    }
  };
})();
