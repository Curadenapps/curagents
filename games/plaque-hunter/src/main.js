/* Plaque Hunter — boot, input and the frame loop. */
(function () {
  const PH = window.PH, S = PH.Store, W = PH.World, Art = PH.Art, H = PH.Hunt, Cam = PH.Cam, UI = PH.UI, A = PH.Audio, C = PH.C;
  const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
  const G = (PH.G = { w: 400, h: 700, dpr: 1, input: { down: false, x: 0, y: 0, fresh: false }, scene: 'title', mode: 'pm', time: 0, reduce: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  const amb = { swarm: new Art.Swarm(240), lx: 0, ly: 0, placed: false };

  function resize() {
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    G.w = r.width; G.h = r.height; G.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(G.w * G.dpr); cv.height = Math.round(G.h * G.dpr);
    UI.resized();
  }

  // The home screen shows the real state of the Smile: film creeps back in the hours after a hunt.
  PH.Main = {
    ambient() {
      if (H.run) return;
      const st = S.staleness();
      for (let q = 0; q < 4; q++) W.seed(q, { coverage: st * 0.85, sticky: st > 0.95 ? 0.35 : 0.08, seed: 3.1 + q * 5.3 });
    },
  };

  const TITLE_SPARKS = [C.white, C.sky, C.blue20];
  function drawAmbient(dt) {
    const title = G.scene === 'title';
    Cam.set(title ? H.smileCam(G.h * 0.48, 132) : G.scene === 'story' ? H.smileCam(G.h * 0.2, G.h * 0.2) : H.smileCam(168, Math.min(270, G.h * 0.4)));
    const a = G.time * (G.reduce ? 0.12 : 0.42); amb.lx = Math.cos(a) * 30; amb.ly = Math.sin(a) * 36;
    if (!amb.placed) { amb.swarm.place(amb.lx, amb.ly, 6); amb.placed = true; }
    amb.swarm.update(dt, amb.lx, amb.ly, 6, G.time, 0.1);
    Cam.apply(ctx, G.dpr);
    W.drawGums(ctx); W.drawTeeth(ctx, -1, 1);
    if (!title) {
      for (let q = 0; q < 4; q++) W.drawPlaque(ctx, q, 1);
      for (const t of W.teeth) if (t.clean && (t.i * 3 + t.q * 5 + Math.floor(G.time * 0.8)) % 6 === 0) Art.sparkle(ctx, t.cx, t.cy, 1.3, G.time, 0.5 + 0.5 * Math.sin(G.time * 2.5 + t.i), C.blue60);
    }
    const skin = PH.SKINS.find((s) => s.id === S.data.gear.skin) || PH.SKINS[0];
    if (!title) Art.disc(ctx, amb.lx, amb.ly, 8, C.sky, 0.22);
    amb.swarm.draw(ctx, title ? TITLE_SPARKS : skin.colors, 0.46, 0.95);
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; G.time += dt;
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    Art.backdrop(ctx, G.w, G.h, G.scene === 'title' && !H.run);
    if (H.run) { H.update(dt); if (H.run) H.draw(ctx); else drawAmbient(dt); }
    else drawAmbient(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function pos(e) { const r = cv.getBoundingClientRect(); G.input.x = e.clientX - r.left; G.input.y = e.clientY - r.top; }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); A.unlock(); pos(e);
    G.input.down = true; G.input.fresh = true;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  });
  cv.addEventListener('pointermove', (e) => { if (G.input.down) pos(e); });
  const up = () => { G.input.down = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  window.addEventListener('keydown', (e) => {
    if (!H.run) return;
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') H.play(+e.code.slice(5) - 1);
    if (e.code === 'Escape' || e.code === 'KeyP') H.pause(!H.run.paused);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && H.run && H.run.phase === 'play') H.pause(true); });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);

  S.load(); UI.init(); resize();
  PH.Main.ambient();
  if (document.fonts && document.fonts.load) { document.fonts.load('400 16px "Futura LT Pro"').catch(() => {}); }
  requestAnimationFrame(frame);
})();
