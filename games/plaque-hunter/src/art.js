/* Plaque Hunter — drawn art: the swarm, Plaqlings, Fila, the brush and the Primes.
   Flat fills and Curaprox Blue line work only. Every colour comes from PH.C (the CURAPROX palette). */
(function () {
  const PH = window.PH, C = PH.C;
  const Art = (PH.Art = {});
  const TAU = Math.PI * 2;
  Art.FONT = '"Futura LT Pro", Futura, "Century Gothic", system-ui, sans-serif';

  // ---- backdrop (screen pixels): white canvas; the title is the one Curaprox Blue brand surface ----
  Art.backdrop = function (ctx, w, h, brand) {
    ctx.fillStyle = brand ? C.blue : C.white; ctx.fillRect(0, 0, w, h);
    if (brand) { // the CURAPROX diagonal panel: polygon(20% 0, 100% 0, 100% 100%, 0 100%), lower half
      ctx.fillStyle = C.blueDk; ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.52); ctx.lineTo(w, h * 0.52); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    }
  };

  // ---- swarm: the 5,460 ----
  Art.Swarm = function (n) {
    this.n = n; this.live = n;
    this.x = new Float32Array(n); this.y = new Float32Array(n); this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.r = new Float32Array(n); this.ph = new Float32Array(n); this.om = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.r[i] = Math.sqrt(Math.random()); this.ph[i] = Math.random() * TAU; this.om[i] = (1.6 + Math.random() * 2.6) * (Math.random() < 0.85 ? 1 : -1); }
  };
  Art.Swarm.prototype.place = function (x, y, R) { for (let i = 0; i < this.n; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R; this.x[i] = x + Math.cos(a) * r; this.y[i] = y + Math.sin(a) * r; this.vx[i] = this.vy[i] = 0; } };
  // Each spark circles its own spot inside a disc of radius R around the leader: the swarm brushes in small circles by itself.
  Art.Swarm.prototype.update = function (dt, lx, ly, R, time, fray) {
    const k = 34, damp = 7.5, vmax = 78, n = this.live;
    for (let i = 0; i < n; i++) {
      const a = this.ph[i] + this.om[i] * time, rr = this.r[i] * R * (1 + fray * Math.sin(a * 1.7 + i));
      const ax = (lx + Math.cos(a) * rr - this.x[i]) * k - this.vx[i] * damp, ay = (ly + Math.sin(a) * rr - this.y[i]) * k - this.vy[i] * damp;
      let vx = this.vx[i] + ax * dt, vy = this.vy[i] + ay * dt; const sp = Math.hypot(vx, vy);
      if (sp > vmax) { vx *= vmax / sp; vy *= vmax / sp; }
      this.vx[i] = vx; this.vy[i] = vy; this.x[i] += vx * dt; this.y[i] += vy * dt;
    }
  };
  Art.Swarm.prototype.draw = function (ctx, colors, lw, alpha) {
    ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    for (let c = 0; c < 3; c++) {
      ctx.strokeStyle = colors[c]; ctx.beginPath();
      for (let i = c; i < this.live; i += 3) { const x = this.x[i], y = this.y[i]; ctx.moveTo(x - this.vx[i] * 0.03, y - this.vy[i] * 0.03); ctx.lineTo(x + 0.01, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  Art.disc = function (ctx, x, y, R, color, alpha) { ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; };
  Art.sparkle = function (ctx, x, y, s, rot, alpha, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = color || C.blue; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, r = i % 2 ? s * 0.28 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };

  // Fila, the guide light: one filament that went ahead to show the way.
  Art.fila = function (ctx, x, y, r, time) {
    Art.disc(ctx, x, y, r * 2.1, C.sky, 0.3);
    ctx.fillStyle = C.yellow; ctx.strokeStyle = C.blue; ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.14, r * 0.13, 0, TAU); ctx.arc(x + r * 0.34, y - r * 0.14, r * 0.13, 0, TAU); ctx.fill();
    ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    Art.sparkle(ctx, x + r * 1.5, y - r * 1.3, r * 0.5, time * 2, 0.6 + 0.4 * Math.sin(time * 5), C.blue);
  };

  // ---- Plaqlings. Drawn at unit radius then scaled, so the same art serves the hunt and the field guide. ----
  Art.plaqling = function (ctx, id, x, y, r, t, o) {
    o = o || {}; const sp = PH.SPECIES_BY_ID[id], col = sp.color, lk = o.look || { x: 0, y: 0 }, seed = o.seed || 0;
    const wob = Math.sin(t * 2.6 + seed) * 0.06, line = id === 'tot' ? C.grey : C.blue;
    ctx.save(); ctx.translate(x, y); ctx.scale(r, r); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const body = () => {
      ctx.beginPath();
      if (id === 'tot') { const pts = [[-0.9, 0.5], [-0.95, -0.25], [-0.45, -0.85], [0.3, -0.95], [0.9, -0.4], [0.95, 0.45], [0.35, 0.9], [-0.4, 0.9]]; pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
      else if (id === 'gapper') ctx.ellipse(0, 0, 0.72 + wob, 1.2 - wob, 0, 0, TAU);
      else ctx.ellipse(0, 0, 1 + wob, 1 - wob, 0, 0, TAU);
    };
    if (o.silhouette) {
      body(); ctx.fillStyle = C.bg; ctx.fill();
      ctx.fillStyle = C.soft; ctx.font = '400 1px ' + Art.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 0.08);
      ctx.restore(); return;
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.fillStyle = col; ctx.strokeStyle = line; ctx.lineWidth = 0.1;
    // behind-the-body bits
    if (id === 'gumlin') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.45, -0.75); ctx.lineTo(s * 0.95, -1.35); ctx.lineTo(s * 0.95, -0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (id === 'imp') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.3, -0.85); ctx.lineTo(s * 0.62, -1.5); ctx.lineTo(s * 0.8, -0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (id === 'stickler') for (const dx of [-0.55, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(dx, 0.98 + Math.abs(Math.sin(t * 1.5 + dx * 4)) * 0.18, 0.2, 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (id === 'filmo') { ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.quadraticCurveTo(0.05, -1.35, 0.32 + wob, -1.45); ctx.stroke(); ctx.beginPath(); ctx.arc(0.36 + wob, -1.48, 0.15, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (id === 'glimmer') { ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(0, -1.3); ctx.stroke(); Art.sparkle(ctx, 0, -1.6, 0.34, t * 2, 1, C.blue); ctx.fillStyle = col; }
    body(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 0.1; ctx.stroke();
    // on-the-body bits
    if (id === 'imp') { ctx.fillStyle = C.white; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.9) * 0.62, 0.42 + Math.sin(i * 2.7) * 0.3, 0.07, 0, TAU); ctx.fill(); } }
    if (id === 'speckle') { ctx.fillStyle = C.blue; for (const p of [[-0.55, 0.42], [0.5, 0.48], [0, 0.66]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.06, 0, TAU); ctx.fill(); } }
    if (id === 'gumlin') { ctx.fillStyle = C.cerise; ctx.globalAlpha *= 0.45; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 0.64, 0.27, 0.15, 0, TAU); ctx.fill(); } ctx.globalAlpha = o.alpha != null ? o.alpha : 1; }
    if (id === 'glimmer') { Art.sparkle(ctx, 0.5, 0.45, 0.2, 0.4, 1, C.sky); }
    if (id === 'mole') { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, -0.2, 1.0, Math.PI * 1.12, Math.PI * 1.88); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0, -0.86, 0.15, 0, TAU); ctx.fill(); }
    if (id === 'goldie') { ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(-0.5, -0.82); ctx.lineTo(-0.56, -1.4); ctx.lineTo(-0.2, -1.08); ctx.lineTo(0, -1.52); ctx.lineTo(0.2, -1.08); ctx.lineTo(0.56, -1.4); ctx.lineTo(0.5, -0.82); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (id === 'nightcap') { ctx.fillStyle = C.white; ctx.beginPath(); ctx.moveTo(-0.72, -0.62); ctx.quadraticCurveTo(0.1, -1.7, 1.05, -1.0 + wob * 2); ctx.quadraticCurveTo(0.5, -1.0, 0.72, -0.62); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1.08, -0.98 + wob * 2, 0.17, 0, TAU); ctx.fill(); ctx.stroke(); }
    // face
    const ex = id === 'gapper' ? 0.26 : 0.36, ey = id === 'mole' ? 0.04 : -0.12, er = id === 'speckle' ? 0.3 : 0.27;
    const sleepy = id === 'yawnster' || o.asleep, ink = id === 'tot' ? C.grey : id === 'nightcap' || id === 'mole' || id === 'imp' ? C.white : C.blue;
    for (const s of [-1, 1]) {
      if (sleepy) { ctx.strokeStyle = C.blue; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.arc(s * ex, ey, 0.2, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); continue; }
      ctx.fillStyle = C.white; ctx.strokeStyle = line; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.arc(s * ex, ey, er, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = id === 'tot' ? C.grey : C.blue; ctx.beginPath(); ctx.arc(s * ex + lk.x * 0.11, ey + lk.y * 0.11, o.scared ? 0.09 : 0.14, 0, TAU); ctx.fill();
      if (id === 'stickler') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s * ex, ey, er + 0.03, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (id === 'tot') { ctx.strokeStyle = C.grey; ctx.lineWidth = 0.11; ctx.beginPath(); ctx.moveTo(s * 0.12, -0.38); ctx.lineTo(s * 0.62, -0.56); ctx.stroke(); }
    }
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 0.09;
    if (id === 'yawnster' || o.scared) { ctx.fillStyle = id === 'yawnster' ? C.blue : ink; ctx.beginPath(); ctx.ellipse(0, 0.44, 0.17, id === 'yawnster' ? 0.2 + 0.08 * Math.sin(t * 1.8) : 0.15, 0, 0, TAU); ctx.fill(); }
    else if (id === 'tot') { ctx.beginPath(); ctx.moveTo(-0.25, 0.48); ctx.lineTo(0.25, 0.48); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, 0.28, 0.24, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
    ctx.restore();
  };

  // ---- product drawings for menus ----
  // CS 5460-style brush: slim eight-sided handle, small head packed with fine filaments.
  Art.brush = function (ctx, w, h, skin, wear) {
    ctx.clearRect(0, 0, w, h);
    const y = h * 0.6, hx0 = w * 0.3, hx1 = w * 0.97, hh = h * 0.17;
    const bx = w * 0.04, bw = w * 0.27, by = y - hh * 0.3, rows = 30, top = h * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < rows * 8; i++) {
      const fx = bx + 6 + ((i % rows) / (rows - 1)) * (bw - 12), lean = Math.sin(i * 12.9) * wear * 10;
      ctx.strokeStyle = skin.colors[i % 3]; ctx.lineWidth = Math.max(1, w / 500);
      ctx.beginPath(); ctx.moveTo(fx, by + 2); ctx.lineTo(fx + lean, top + (Math.sin(i * 7.3) * 0.5 + 0.5) * 3 + wear * 6); ctx.stroke();
    }
    ctx.fillStyle = skin.handle;
    ctx.beginPath(); ctx.roundRect(bx, by, bw + 6, hh * 0.6, hh * 0.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx0 - 4, y - hh * 0.3); ctx.lineTo(hx0 + w * 0.12, y - hh * 0.5); ctx.lineTo(hx1 - hh * 0.5, y - hh * 0.5); ctx.arc(hx1 - hh * 0.5, y, hh * 0.5, -Math.PI / 2, Math.PI / 2); ctx.lineTo(hx0 + w * 0.12, y + hh * 0.5); ctx.lineTo(hx0 - 4, y + hh * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.white; ctx.globalAlpha = 0.28; ctx.fillRect(hx0 + w * 0.12, y - hh * 0.18, hx1 - hx0 - w * 0.12 - hh * 0.5, hh * 0.36); ctx.globalAlpha = 1;
  };
  // A Prime in world units, pointing along (dx,dy) with its tip at (x,y).
  Art.prime = function (ctx, x, y, dx, dy, len, color) {
    const bx = x - dx * len, by = y - dy * len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.grey; ctx.lineWidth = 0.24; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
    ctx.strokeStyle = C.blue40; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - dx * len * 0.55, y - dy * len * 0.55); ctx.lineTo(x - dx * 0.4, y - dy * 0.4); ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx - dx * 2.6, by - dy * 2.6); ctx.lineTo(bx, by); ctx.stroke();
  };
})();
