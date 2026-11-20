/* Plaque Hunter — all sound is synthesised (Web Audio). No audio files. */
(function () {
  const PH = window.PH;
  const A = (PH.Audio = {});
  let ctx = null, master, sfxBus, musicBus, fizzGain, noiseBuf;

  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    // "Fizz": a quiet filtered hiss that follows how much the swarm is cleaning.
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.7;
    fizzGain = ctx.createGain(); fizzGain.gain.value = 0;
    src.connect(bp); bp.connect(fizzGain); fizzGain.connect(sfxBus); src.start();
    A.apply();
  };
  A.apply = function () {
    if (!ctx) return;
    const s = PH.Store.data.settings;
    sfxBus.gain.value = s.sfx ? 1 : 0;
    musicBus.gain.value = s.music ? 0.5 : 0;
  };
  A.suspend = () => { if (ctx && ctx.state === 'running') ctx.suspend(); };
  A.resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };

  function tone(freq, t0, dur, type, vol, bus, glideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, freq, vol, type) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    return f;
  }
  const ok = () => ctx && ctx.state === 'running';

  A.tap = () => { if (ok()) tone(660, ctx.currentTime, 0.07, 'triangle', 0.08); };
  A.pop = (combo) => { if (!ok()) return; const t = ctx.currentTime, f = 420 * Math.pow(1.122, Math.min(combo || 1, 8)); tone(f, t, 0.16, 'sine', 0.22, null, f * 1.9); noise(t, 0.06, 3000, 0.06); };
  A.chime = () => { if (!ok()) return; const t = ctx.currentTime; tone(1318, t, 0.7, 'sine', 0.1); tone(1976, t + 0.05, 0.6, 'sine', 0.06); };
  A.gong = () => { if (!ok()) return; const t = ctx.currentTime; tone(392, t, 1.1, 'sine', 0.16); tone(587, t, 0.9, 'triangle', 0.07); tone(784, t + 0.08, 0.8, 'sine', 0.05); };
  A.scatter = () => { if (!ok()) return; const f = noise(ctx.currentTime, 0.35, 2400, 0.07); f.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.35); };
  A.hydro = () => { if (!ok()) return; const t = ctx.currentTime; const f = noise(t, 0.9, 500, 0.16); f.frequency.exponentialRampToValueAtTime(5000, t + 0.8); tone(220, t, 0.8, 'sine', 0.12, null, 880); };
  A.sugar = () => { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 7; i++) tone(1500 + Math.random() * 1800, t + i * 0.07, 0.18, 'sine', 0.05); };
  A.nope = () => { if (!ok()) return; const t = ctx.currentTime; tone(220, t, 0.14, 'triangle', 0.12, null, 160); };
  A.star = (i) => { if (!ok()) return; const t = ctx.currentTime; const f = [784, 988, 1175][i] || 784; tone(f, t, 0.5, 'triangle', 0.14); tone(f * 2, t + 0.03, 0.4, 'sine', 0.06); };
  A.count = (last) => { if (ok()) tone(last ? 880 : 587, ctx.currentTime, last ? 0.5 : 0.18, 'triangle', 0.14); };
  A.fanfare = () => { if (!ok()) return; const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.6, 'triangle', 0.12)); };
  A.fizz = (amt) => { if (ctx && fizzGain) fizzGain.gain.setTargetAtTime(Math.min(0.05, amt * 0.05), ctx.currentTime, 0.08); };

  A.buzz = function (ms) { if (PH.Store.data.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* unsupported */ } } };

  // ---- music: a four-layer loop that builds as the hunt moves round the mouth ----
  const M = { on: false, layers: 1, step: 0, next: 0, timer: 0, chords: null };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PROG = {
    am: [[48, 55, 64, 71, 74], [45, 52, 60, 67, 72], [41, 53, 60, 64, 69], [43, 55, 62, 67, 71]], // Cmaj9 Am7 Fmaj7 G
    pm: [[45, 52, 60, 64, 71], [41, 48, 57, 64, 69], [48, 55, 59, 64, 67], [40, 52, 59, 62, 67]], // Am9 Fmaj7 Cmaj7 Em7
  };
  const STEP = 60 / 84 / 4;
  function pad(notes, t0, dur) {
    for (const n of notes.slice(1)) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = midi(n);
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = midi(n) * 1.003;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.035, t0 + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t0 + dur * 1.05);
      o.connect(g); o2.connect(g); g.connect(musicBus); o.start(t0); o2.start(t0); o.stop(t0 + dur * 1.1); o2.stop(t0 + dur * 1.1);
    }
  }
  function schedule() {
    if (!M.on || !ok()) return;
    while (M.next < ctx.currentTime + 0.25) {
      const s = M.step % 64, bar = Math.floor(s / 16), b = s % 16, ch = M.chords[bar], t = M.next;
      if (b === 0) pad(ch, t, STEP * 16);
      if (M.layers >= 2 && b % 2 === 0) { const seq = [1, 2, 3, 4, 3, 2, 4, 3]; tone(midi(ch[seq[b / 2]] + 12), t, 0.32, 'triangle', 0.045, musicBus); }
      if (M.layers >= 3 && (b === 0 || b === 8 || b === 11)) tone(midi(ch[0] - 12), t, 0.5, 'sine', 0.16, musicBus);
      if (M.layers >= 3 && b % 4 === 2) { const s2 = ctx.createBufferSource(); s2.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); s2.connect(f); f.connect(g); g.connect(musicBus); s2.start(t, Math.random()); s2.stop(t + 0.1); }
      if (M.layers >= 4 && (b === 3 || b === 6 || b === 10 || b === 13) && Math.random() < 0.75) tone(midi(ch[1 + ((Math.random() * 4) | 0)] + 24), t, 0.6, 'sine', 0.03, musicBus);
      M.next += STEP; M.step++;
    }
  }
  A.music = function (mode, layers) {
    if (!ctx) return;
    M.chords = PROG[mode] || PROG.pm; M.layers = layers || 1;
    if (M.on) return;
    M.on = true; M.step = 0; M.next = ctx.currentTime + 0.08;
    clearInterval(M.timer); M.timer = setInterval(schedule, 50);
  };
  A.layers = (n) => { M.layers = n; };
  A.stopMusic = function () { M.on = false; clearInterval(M.timer); };
})();
