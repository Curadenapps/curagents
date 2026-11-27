// Audio measurement: bundles src/engine/audio.ts with esbuild, loads it into headless Chromium and renders
// every SFX and 20 s of every music track (exploration and combat intensity) through an OfflineAudioContext.
// Reports peak, RMS, short-term loudness, DC offset, NaN, tail length and a spectral sanity check (band energy,
// spectral flatness, strongest pitch classes); also runs behaviour checks (unlock gate, unknown names, voice
// limit, crossfade, same-id no-op, fade to silence, spatial pan) and writes a few WAVs.
//   node tests/audio.cjs [outDir=/tmp/bristle-audio] [--quick]
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/bristle-audio';
const QUICK = process.argv.includes('--quick');
const MUSIC_SECS = QUICK ? 8 : 20;
const SFX = ['slash', 'hit', 'kill', 'jump', 'land', 'walljump', 'dash', 'hurt', 'death', 'heal', 'focus', 'spell', 'throw', 'splat', 'empty',
  'splash', 'scrub', 'break', 'clink', 'shine', 'rest', 'relic', 'read', 'door', 'step',
  'enemy-alert', 'enemy-windup', 'spit', 'swoop', 'charge', 'shield-block', 'leech-drop', 'buzz', 'boss-roar', 'boss-slam', 'boss-hurt',
  'boss-phase', 'boss-death', 'gate-close', 'gate-open', 'shard-fall',
  'ui-move', 'ui-select', 'ui-back', 'ui-open', 'ui-close', 'text-blip', 'buy'];
const QUIET = new Set(['step', 'text-blip', 'ui-move', 'empty']);   // meant to sit lower
const TRACKS = { title: ['D', 'F', 'A'], crown: ['E', 'G', 'B'], gumline: ['F', 'A', 'C'], narrows: ['A', 'C', 'E'], sugar: ['G', 'B', 'D'], calculus: ['C', 'D#', 'G'], boss: ['D', 'F', 'A'], ending: ['D', 'F#', 'A'] };

// ------------------------------------------------------------------ in-page harness
const HARNESS = `
const PCS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
const db = (x) => x > 0 ? 20 * Math.log10(x) : -Infinity;
function analyze(buf, from = 0, to = Infinity) {
  const sr = buf.sampleRate, L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const s0 = Math.floor(from * sr), s1 = Math.min(L.length, Math.floor(to * sr));
  let peak = 0, sum = 0, sl = 0, sr2 = 0, dc = 0, nan = 0, last = -1, eL = 0, eR = 0;
  for (let i = s0; i < s1; i++) { const a = L[i], b = R[i]; if (!Number.isFinite(a) || !Number.isFinite(b)) { nan++; continue; }
    const m = Math.max(Math.abs(a), Math.abs(b)); if (m > peak) peak = m; if (m > 0.001) last = i; sum += (a * a + b * b) / 2; dc += (a + b) / 2; eL += a * a; eR += b * b; }
  const n = Math.max(1, s1 - s0);
  // short-term loudness: max RMS over 50 ms windows
  const w = Math.floor(0.05 * sr); let st = 0, minWin = Infinity; const wins = [];
  for (let i = s0; i + w <= s1; i += w) { let s = 0; for (let k = i; k < i + w; k++) s += (L[k] * L[k] + R[k] * R[k]) / 2; const r = Math.sqrt(s / w); wins.push(r); if (r > st) st = r; }
  // spectrum (mono mix), 4096-point frames
  const N = 4096, pow = new Float64Array(N / 2); let frames = 0; const hop = Math.max(N, Math.floor((s1 - s0 - N) / 120));
  for (let i = s0; i + N <= s1 && frames < 120; i += hop) { const re = new Float64Array(N), im = new Float64Array(N);
    for (let k = 0; k < N; k++) re[k] = (L[i + k] + R[i + k]) * 0.5 * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / N)); fft(re, im);
    for (let k = 0; k < N / 2; k++) pow[k] += re[k] * re[k] + im[k] * im[k]; frames++; }
  const edges = [0, 60, 250, 1000, 4000, 12000, sr / 2], bands = [0, 0, 0, 0, 0, 0]; let tot = 0, lg = 0, ar = 0, cnt = 0; const chroma = new Array(12).fill(0);
  for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = pow[k]; tot += p; for (let b = 0; b < 6; b++) if (f >= edges[b] && f < edges[b + 1]) bands[b] += p;
    if (f > 50 && f < 10000) { lg += Math.log(p + 1e-20); ar += p; cnt++; }
    if (f > 60 && f < 2000) { const pc = ((Math.round(12 * Math.log2(f / 440)) + 9) % 12 + 12) % 12; chroma[pc] += p; } }
  const flat = cnt ? Math.exp(lg / cnt) / (ar / cnt + 1e-30) : 0;
  const top = chroma.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 4).map((x) => PCS[x[1]]);
  return { peak, peakDb: db(peak), rmsDb: db(Math.sqrt(sum / n)), stDb: db(st), dc: dc / n, nan, tail: last < 0 ? 0 : (last - s0) / sr,
    endDb: db(wins.length ? wins[wins.length - 1] : 0), minWinDb: db(wins.length ? Math.min(...wins.slice(1, -1).concat(wins.length > 2 ? [] : wins)) : 0),
    bands: bands.map((b) => tot ? b / tot : 0), flat, top, balance: db(Math.sqrt(eR / Math.max(1e-20, eL))) };
}
function wav64(buf, from = 0, to = Infinity) {
  const sr = buf.sampleRate, L = buf.getChannelData(0), R = buf.getChannelData(1), s0 = Math.floor(from * sr), s1 = Math.min(L.length, Math.floor(to * sr));
  const pcm = new Int16Array((s1 - s0) * 2); for (let i = s0, j = 0; i < s1; i++) { pcm[j++] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[j++] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  const u8 = new Uint8Array(pcm.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
}
const SR = 44100;
const fakeGame = (x = 0, y = 0, biome = 'gumline') => ({ cam: { x, y, viewW: 960, viewH: 544 }, room: { def: { biome } }, state: 'play' });
function countNodes(c) { const box = { n: 0 }; for (const m of ['createOscillator', 'createGain', 'createBiquadFilter', 'createBufferSource', 'createStereoPanner']) { const f = c[m].bind(c); c[m] = (...a) => { box.n++; return f(...a); }; } return box; }
window.lab = {
  async sfx(name, secs = 7, opts = {}) {
    const c = new OfflineAudioContext(2, secs * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1); a.update(fakeGame(), 0);
    a.sfx(name, opts); const buf = await c.startRendering(); return analyze(buf);
  },
  async music(id, secs, intensity, wav) {
    const c = new OfflineAudioContext(2, secs * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1);
    const nodes = countNodes(c); a.music(id); a.intensity(intensity);
    for (let i = 1; i * 0.1 < secs; i++) c.suspend(i * 0.1).then(() => { a.tick(); c.resume(); });
    const t0 = performance.now(); const buf = await c.startRendering(); const ms = performance.now() - t0;
    const r = analyze(buf, 4); r.whole = analyze(buf).peakDb; r.renderMs = ms; r.nodesPerSec = nodes.n / secs;
    if (wav) r.wav = wav64(buf); return r;
  },
  async behaviour() {
    const out = {};
    // 1. nothing before unlock, unknown names ignored
    { const c = new OfflineAudioContext(2, SR, SR), a = new AudioLab.Audio({ context: c }); let threw = false;
      try { a.sfx('hit'); a.music('crown'); a.intensity(1); a.update(fakeGame(), 0.01); a.setVolumes(1, 1, 1); } catch (e) { threw = String(e); }
      const buf = await c.startRendering(); out.beforeUnlock = { threw, peak: analyze(buf).peak }; }
    { const rt = new AudioLab.Audio(); let threw = false; try { rt.sfx('hit'); rt.music('title'); rt.intensity(0.5); } catch (e) { threw = String(e); } out.realtimeBeforeUnlock = { threw }; }
    { const c = new OfflineAudioContext(2, SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); let threw = false; try { a.sfx('no-such-sound'); a.sfx(''); a.music('no-such-track'); } catch (e) { threw = String(e); }
      const buf = await c.startRendering(); out.unknown = { threw, peak: analyze(buf).peak }; }
    // 2. voice limit: 24 hits in the same instant
    { const c = new OfflineAudioContext(2, 2 * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1);
      for (let i = 0; i < 24; i++) a.sfx('hit'); const v = a.stats().voices; const buf = await c.startRendering(); const r = analyze(buf);
      out.voiceLimit = { live: v, peakDb: r.peakDb, stDb: r.stDb }; }
    // 3. spatial: far right of the camera pans right and attenuates
    { const c = new OfflineAudioContext(2, 2 * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1); a.update(fakeGame(0, 0), 0);
      a.sfx('hit', { x: 420, y: 0 }); const buf = await c.startRendering(); const r = analyze(buf);
      const c2 = new OfflineAudioContext(2, 2 * SR, SR), b = new AudioLab.Audio({ context: c2 }); b.unlock(); b.setVolumes(1, 1, 1); b.update(fakeGame(0, 0), 0);
      b.sfx('hit', { x: 1300, y: 0 }); const r2 = analyze(await c2.startRendering());
      const c3 = new OfflineAudioContext(2, 2 * SR, SR), d = new AudioLab.Audio({ context: c3 }); d.unlock(); d.update(fakeGame(0, 0), 0); d.sfx('hit', { x: 5000, y: 0 }); const r3 = analyze(await c3.startRendering());
      out.spatial = { nearRightBalanceDb: r.balance, nearStDb: r.stDb, farStDb: r2.stDb, offscreenPeak: r3.peak }; }
    // 4. crossfade crown -> gumline at 8 s, same id again at 9 s (no-op), null at 16 s
    { const secs = 24, c = new OfflineAudioContext(2, secs * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1); a.music('crown');
      const log = [];
      for (let i = 1; i * 0.1 < secs; i++) { const t = +(i * 0.1).toFixed(1); c.suspend(t).then(() => {
        if (t === 8) a.music('gumline'); if (t === 9) { a.music('gumline'); log.push(['afterSameId', a.stats().players]); } if (t === 12) log.push(['at12', a.stats().players]);
        if (t === 16) a.music(null); if (t === 20) log.push(['at20', a.stats().players]); a.tick(); c.resume(); }); }
      const buf = await c.startRendering();
      out.crossfade = { log, before: analyze(buf, 4, 8).rmsDb, during: analyze(buf, 8, 10).rmsDb, after: analyze(buf, 10, 16).rmsDb, minWinDuringDb: analyze(buf, 7, 11).minWinDb, silenceEndDb: analyze(buf, 22, 24).rmsDb }; }
    // 5. intensity rises smoothly (boss: explore 0-8 s, combat after)
    { const secs = 16, c = new OfflineAudioContext(2, secs * SR, SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1); a.music('boss');
      for (let i = 1; i * 0.1 < secs; i++) { const t = +(i * 0.1).toFixed(1); c.suspend(t).then(() => { if (t === 8) a.intensity(1); a.tick(); c.resume(); }); }
      const buf = await c.startRendering(); out.intensity = { exploreDb: analyze(buf, 3, 8).rmsDb, combatDb: analyze(buf, 10, 16).rmsDb, transitionMaxDb: analyze(buf, 7.5, 10).stDb }; }
    return out;
  },
  async reel(names, gap) {
    const secs = names.length * gap + 3, c = new OfflineAudioContext(2, Math.ceil(secs * SR), SR), a = new AudioLab.Audio({ context: c }); a.unlock(); a.setVolumes(1, 1, 1); a.update(fakeGame(), 0);
    names.forEach((n, i) => { if (i === 0) a.sfx(n); else c.suspend(+(i * gap).toFixed(2)).then(() => { a.sfx(n); c.resume(); }); });
    const buf = await c.startRendering(); return { wav: wav64(buf), r: analyze(buf) };
  },
};
`;

function writeWav(file, b64, sr = 44100) {
  const pcm = Buffer.from(b64, 'base64'), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-inf').padStart(6);
const pct = (b) => b.map((x) => String(Math.round(x * 100)).padStart(3)).join(' ');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const bundle = await esbuild.build({
    stdin: { contents: "import { Audio } from './audio'; window.AudioLab = { Audio };", resolveDir: path.join(__dirname, '..', 'src', 'engine'), loader: 'ts' },
    bundle: true, format: 'iife', target: 'es2022', write: false,
  });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setContent('<!DOCTYPE html><html><body></body></html>');
  await p.addScriptTag({ content: bundle.outputFiles[0].text }); await p.addScriptTag({ content: HARNESS });
  const problems = [];

  // ---------------- SFX
  console.log('\nSFX (rendered alone, volumes 1/1/1, 7 s window incl. reverb)');
  console.log('name           peak dB  RMS dB  ST dB   DC        tail s  sub low lmid mid high air  flat');
  const stVals = [];
  for (const n of SFX) {
    const r = await p.evaluate(([n]) => lab.sfx(n), [n]);
    const flags = [];
    if (r.nan) flags.push('NaN'); if (r.peak > 0.98) flags.push('CLIP'); if (r.peak < 0.003) flags.push('SILENT');
    if (Math.abs(r.dc) > 0.002) flags.push('DC'); if (r.tail > 6.5 || r.endDb > -55) flags.push('LONG-TAIL');
    if (!QUIET.has(n)) { stVals.push(r.stDb); if (r.stDb < -26 || r.stDb > -8) flags.push('LEVEL'); }
    if (flags.length) problems.push(n + ': ' + flags.join(','));
    console.log(`${n.padEnd(14)} ${f1(r.peakDb)}  ${f1(r.rmsDb)} ${f1(r.stDb)}  ${r.dc.toExponential(1).padStart(8)}  ${r.tail.toFixed(2).padStart(5)}  ${pct(r.bands)}  ${r.flat.toFixed(2)} ${flags.join(' ')}`);
  }
  const sm = stVals.reduce((a, b) => a + b, 0) / stVals.length, sd = Math.sqrt(stVals.reduce((a, b) => a + (b - sm) ** 2, 0) / stVals.length);
  console.log(`SFX short-term loudness (excluding quiet UI/step): mean ${sm.toFixed(1)} dB, spread (sd) ${sd.toFixed(1)} dB, range ${Math.min(...stVals).toFixed(1)}..${Math.max(...stVals).toFixed(1)}`);

  // ---------------- music
  console.log(`\nMUSIC (${MUSIC_SECS} s, stats from 4 s on; volumes 1/1/1)`);
  console.log('track     int peak dB  RMS dB  ST dB   DC       sub low lmid mid high air  flat  top pitch classes   key ok  nodes/s render ms');
  const musicRms = [];
  const wavs = { title: 0, crown: 0, gumline: 0, boss: 1, narrows: 0, calculus: 1 };
  for (const id of Object.keys(TRACKS)) for (const it of [0, 1]) {
    const wantWav = wavs[id] === it && !QUICK;
    const r = await p.evaluate(([id, s, it, w]) => lab.music(id, s, it, w), [id, MUSIC_SECS, it, wantWav]);
    if (r.wav) { writeWav(path.join(OUT, `${id}-${it ? 'combat' : 'explore'}.wav`), r.wav); delete r.wav; }
    const flags = [], keyHits = TRACKS[id].filter((pc) => r.top.includes(pc)).length;
    if (r.nan) flags.push('NaN'); if (r.peak > 0.98) flags.push('CLIP'); if (r.rmsDb < -45) flags.push('SILENT'); if (Math.abs(r.dc) > 0.002) flags.push('DC');
    if (r.flat > 0.3) flags.push('NOISY'); if (keyHits < 2) flags.push('KEY?');
    if (flags.length) problems.push(`${id}/${it}: ` + flags.join(','));
    musicRms.push(r.rmsDb);
    console.log(`${id.padEnd(9)} ${it}  ${f1(r.peakDb)}  ${f1(r.rmsDb)} ${f1(r.stDb)}  ${r.dc.toExponential(1).padStart(8)}  ${pct(r.bands)}  ${r.flat.toFixed(3)}  ${r.top.join(' ').padEnd(18)} ${keyHits}/3   ${String(Math.round(r.nodesPerSec)).padStart(5)}  ${String(Math.round(r.renderMs)).padStart(6)} ${flags.join(' ')}`);
  }
  const mm = musicRms.reduce((a, b) => a + b, 0) / musicRms.length;
  console.log(`music RMS mean ${mm.toFixed(1)} dB (range ${Math.min(...musicRms).toFixed(1)}..${Math.max(...musicRms).toFixed(1)}); SFX short-term mean ${sm.toFixed(1)} dB -> SFX sit ${(sm - mm).toFixed(1)} dB above the music before the default music 0.6 / sfx 0.9 sliders (+${(20 * Math.log10(0.9 / 0.6)).toFixed(1)} dB more).`);

  // ---------------- behaviour
  const bh = await p.evaluate(() => lab.behaviour());
  console.log('\nBEHAVIOUR'); console.log(JSON.stringify(bh, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v), 1).replace(/\n\s*/g, ' '));
  if (bh.beforeUnlock.threw || bh.beforeUnlock.peak > 0) problems.push('sound before unlock');
  if (bh.realtimeBeforeUnlock.threw) problems.push('realtime pre-unlock threw');
  if (bh.unknown.threw || bh.unknown.peak > 0) problems.push('unknown names not silent');
  if (bh.voiceLimit.live > 5 || bh.voiceLimit.peakDb > -0.2) problems.push('voice limit');
  if (!(bh.spatial.nearRightBalanceDb > 3 && bh.spatial.farStDb < bh.spatial.nearStDb - 3 && bh.spatial.offscreenPeak === 0)) problems.push('spatial');
  const cf = bh.crossfade, players = Object.fromEntries(cf.log);
  if (players.afterSameId !== 2 || players.at12 !== 1 || players.at20 !== 0 || cf.minWinDuringDb < cf.before - 14 || cf.silenceEndDb > -60) problems.push('crossfade');
  if (!(bh.intensity.combatDb > bh.intensity.exploreDb + 1)) problems.push('intensity');

  // ---------------- WAVs
  if (!QUICK) {
    const reel = ['slash', 'hit', 'kill', 'jump', 'land', 'dash', 'hurt', 'heal', 'spell', 'clink', 'shine', 'scrub', 'break', 'shield-block', 'enemy-alert', 'boss-slam', 'relic', 'ui-select', 'buy'];
    const rr = await p.evaluate(([n, g]) => lab.reel(n, g), [reel, 0.7]);
    writeWav(path.join(OUT, 'sfx-reel.wav'), rr.wav);
    console.log(`\nwrote ${fs.readdirSync(OUT).filter((f) => f.endsWith('.wav')).map((f) => path.join(OUT, f)).join(', ')}`);
  }
  if (errs.length) problems.push('page errors: ' + errs.join(' | '));
  console.log(problems.length ? '\nFLAGS:\n  ' + problems.join('\n  ') : '\nOK: no clipping, silence, NaN, DC or long tails; behaviour checks pass');
  process.exitCode = problems.length ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
