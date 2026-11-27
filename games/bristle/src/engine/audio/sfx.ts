// The SFX bank. Every sound is layered live from noise, oscillators, envelopes and filters.
// Material language: blade = airy filament swish; hits = soft wet thock + bright tick; enamel = glassy clinks;
// plaque = squelchy-cute; tartar = stony crunch; rinse = fizzy bubbly wash.
// A recipe builds its nodes into `s.out` starting at `s.t` and returns its length in seconds.
import type { Bank } from './dsp';

export interface Sx {
  c: BaseAudioContext;
  t: number;              // start time (context seconds)
  out: AudioNode;         // voice input (gain -> panner -> buses)
  p: number;              // pitch multiplier
  r: () => number;        // 0..1 random
  bank: Bank;
  vol: number;            // caller volume (some recipes shape by it, e.g. land)
}

interface Env { t?: number; a?: number; h?: number; d: number; v: number; to?: AudioNode }

/** Attack (linear), hold, then a smooth exponential decay that is ~-46 dB after `d`. Returns end time. */
function env(g: AudioParam, T: number, a: number, h: number, d: number, v: number) {
  g.setValueAtTime(0, T);
  g.linearRampToValueAtTime(v, T + a);
  if (h > 0) g.setValueAtTime(v, T + a + h);
  g.setTargetAtTime(0, T + a + h, d / 5);
  return T + a + h + d;
}

/** Oscillator voice with optional exponential glide. */
function tone(s: Sx, o: Env & { type?: OscillatorType; f: number; f2?: number; gl?: number; lfo?: number; depth?: number }) {
  const c = s.c, T = s.t + (o.t ?? 0), a = o.a ?? 0.002, h = o.h ?? 0;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f * s.p, T);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.f2 * s.p), T + (o.gl ?? a + h + o.d * 0.6));
  let lfo: OscillatorNode | null = null;
  if (o.lfo) { lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = o.lfo; lg.gain.value = (o.depth ?? 0.03) * o.f * s.p; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(T); }
  const end = env(g.gain, T, a, h, o.d, o.v);
  osc.connect(g); g.connect(o.to ?? s.out); osc.start(T); osc.stop(end + 0.05); lfo?.stop(end + 0.05);
  return end;
}

/** Filtered noise burst with an optional filter sweep. */
function noise(s: Sx, o: Env & { ft?: BiquadFilterType; f: number; f2?: number; gl?: number; q?: number; pink?: boolean; am?: number }) {
  const c = s.c, T = s.t + (o.t ?? 0), a = o.a ?? 0.002, h = o.h ?? 0;
  const src = c.createBufferSource(), bq = c.createBiquadFilter(), g = c.createGain();
  src.buffer = o.pink ? s.bank.pink : s.bank.white; src.loop = true;
  bq.type = o.ft ?? 'bandpass'; bq.Q.value = o.q ?? 1;
  bq.frequency.setValueAtTime(Math.min(18000, o.f * s.p), T);
  if (o.f2) bq.frequency.exponentialRampToValueAtTime(Math.min(18000, Math.max(20, o.f2 * s.p)), T + (o.gl ?? a + h + o.d * 0.6));
  const end = env(g.gain, T, a, h, o.d, o.v);
  src.connect(bq); bq.connect(g);
  if (o.am) {   // fizz: amplitude flutter
    const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    am.gain.value = 0.55; lfo.frequency.value = o.am; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
    g.connect(am); am.connect(o.to ?? s.out); lfo.start(T); lfo.stop(end + 0.05);
  } else g.connect(o.to ?? s.out);
  src.start(T, s.r() * 1.5); src.stop(end + 0.05);
  return end;
}

/** Two-operator FM bell. ratio 2 = clean chime, 2.76 / 3.5 = glassy, 1.41 = stony. */
function bell(s: Sx, o: Env & { f: number; ratio?: number; idx?: number }) {
  const c = s.c, T = s.t + (o.t ?? 0), a = o.a ?? 0.001, f = o.f * s.p;
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.value = f; mod.frequency.value = f * (o.ratio ?? 2);
  const idx = (o.idx ?? 1) * f;
  mg.gain.setValueAtTime(idx, T); mg.gain.setTargetAtTime(idx * 0.08, T, o.d * 0.12);
  mod.connect(mg); mg.connect(car.frequency);
  const end = env(g.gain, T, a, o.h ?? 0, o.d, o.v);
  car.connect(g); g.connect(o.to ?? s.out);
  car.start(T); mod.start(T); car.stop(end + 0.05); mod.stop(end + 0.05);
  return end;
}

/** A single bubble: sine with a fast upward chirp. */
function bubble(s: Sx, t: number, f: number, v: number) {
  return tone(s, { t, f, f2: f * (1.8 + s.r() * 0.6), gl: 0.045, a: 0.003, d: 0.06, v });
}
/** Stony grain: tiny resonant noise tick. */
function grain(s: Sx, t: number, f: number, v: number) {
  return noise(s, { t, ft: 'bandpass', f, q: 3.5, a: 0.001, d: 0.025 + s.r() * 0.02, v });
}

const rr = (s: Sx, a: number, b: number) => a + (b - a) * s.r();
const max = Math.max;

export const SFX: Record<string, (s: Sx) => number> = {
  // ---------------------------------------------------------------- hero
  slash: (s) => max(
    noise(s, { ft: 'bandpass', f: 1400, f2: 6800, gl: 0.11, q: 1.3, a: 0.012, d: 0.17, v: 0.9 }),
    noise(s, { t: 0.01, ft: 'highpass', f: 5200, q: 0.7, a: 0.008, d: 0.09, v: 0.32 }),
    tone(s, { f: 2600, f2: 1300, gl: 0.12, a: 0.01, d: 0.1, v: 0.045 }),
    tone(s, { type: 'triangle', f: 520, f2: 260, gl: 0.1, a: 0.004, d: 0.07, v: 0.09 }),
  ) - s.t,
  hit: (s) => max(
    tone(s, { f: 190, f2: 68, gl: 0.09, d: 0.17, v: 0.9 }),
    tone(s, { type: 'triangle', f: 380, f2: 140, gl: 0.05, a: 0.001, d: 0.05, v: 0.22 }),
    noise(s, { ft: 'lowpass', f: 950, f2: 280, gl: 0.06, q: 1.2, a: 0.001, d: 0.07, v: 0.55 }),
    bubble(s, 0.012, rr(s, 480, 600), 0.18),
    noise(s, { ft: 'highpass', f: 7000, q: 0.8, a: 0.0005, d: 0.02, v: 0.32 }),
    tone(s, { f: 3200, a: 0.0005, d: 0.03, v: 0.1 }),
  ) - s.t,
  kill: (s) => {
    let e = max(
      tone(s, { f: 165, f2: 48, gl: 0.22, d: 0.32, v: 1 }),
      noise(s, { ft: 'lowpass', f: 1500, f2: 200, gl: 0.3, q: 1, d: 0.36, v: 0.5 }),
      noise(s, { ft: 'bandpass', f: 3000, q: 2, d: 0.05, v: 0.25 }),
    );
    for (let i = 0; i < 4; i++) e = max(e, bubble(s, rr(s, 0.01, 0.16), rr(s, 380, 900), 0.22));
    const notes = [1318.5, 1568, 1975.5, 2349.3];
    e = max(e, bell(s, { t: 0.05, f: notes[Math.floor(s.r() * 4)], ratio: 2, idx: 0.7, d: 0.5, v: 0.1 }), bell(s, { t: 0.12, f: notes[Math.floor(s.r() * 4)], ratio: 2, idx: 0.7, d: 0.55, v: 0.08 }));
    return e - s.t;
  },
  jump: (s) => max(
    tone(s, { f: 240, f2: 420, gl: 0.08, d: 0.1, v: 0.32 }),
    noise(s, { ft: 'bandpass', f: 900, f2: 2400, gl: 0.1, q: 0.8, a: 0.01, d: 0.1, v: 0.32 }),
  ) - s.t,
  land: (s) => max(
    tone(s, { f: 120, f2: 48, gl: 0.08, d: 0.13, v: 0.9 }),
    noise(s, { ft: 'lowpass', f: 520, q: 0.8, d: 0.07, v: 0.6 }),
    noise(s, { ft: 'bandpass', f: 2500, q: 1, d: 0.03, v: 0.1 * s.vol }),
  ) - s.t,
  walljump: (s) => max(
    noise(s, { ft: 'bandpass', f: 3200, q: 3, d: 0.04, v: 0.35 }),
    tone(s, { f: 200, f2: 380, gl: 0.09, d: 0.1, v: 0.3 }),
    noise(s, { ft: 'bandpass', f: 1000, f2: 3000, gl: 0.1, q: 0.8, a: 0.008, d: 0.12, v: 0.32 }),
    tone(s, { f: 140, f2: 60, gl: 0.06, d: 0.07, v: 0.45 }),
  ) - s.t,
  dash: (s) => max(
    noise(s, { ft: 'bandpass', f: 700, f2: 4200, gl: 0.12, q: 1.2, a: 0.02, d: 0.26, v: 1 }),
    noise(s, { ft: 'lowpass', f: 420, q: 0.7, a: 0.01, d: 0.2, v: 0.4 }),
    tone(s, { f: 170, f2: 55, gl: 0.2, d: 0.22, v: 0.35 }),
    tone(s, { f: 1800, f2: 900, gl: 0.2, a: 0.02, d: 0.15, v: 0.035 }),
  ) - s.t,
  hurt: (s) => max(
    tone(s, { f: 150, f2: 45, gl: 0.2, d: 0.26, v: 1 }),
    noise(s, { ft: 'lowpass', f: 1300, f2: 300, gl: 0.2, q: 1, d: 0.22, v: 0.65 }),
    tone(s, { type: 'triangle', f: 560, f2: 330, gl: 0.3, a: 0.004, d: 0.36, v: 0.16 }),
    tone(s, { type: 'triangle', f: 594, f2: 350, gl: 0.3, a: 0.004, d: 0.36, v: 0.12 }),
  ) - s.t,
  death: (s) => {
    let e = max(
      tone(s, { f: 110, f2: 40, gl: 1, d: 1.3, v: 0.7 }),
      noise(s, { ft: 'lowpass', f: 900, f2: 150, gl: 1.5, pink: true, a: 0.3, d: 1.8, v: 0.4 }),
      bell(s, { f: 880, ratio: 3.5, idx: 0.6, d: 1.6, v: 0.1 }),
    );
    for (const f of [220, 261.6, 329.6]) e = max(e, tone(s, { type: 'triangle', f, f2: f * 0.75, gl: 1.7, a: 0.06, h: 0.2, d: 1.9, v: 0.13 }));
    return e - s.t;
  },
  heal: (s) => {
    let e = 0;
    [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => { e = max(e, bell(s, { t: i * 0.06, f, ratio: 2, idx: 0.5, d: 0.8, v: 0.15 })); });
    e = max(e, tone(s, { type: 'triangle', f: 261.6, a: 0.15, d: 0.8, v: 0.12 }), tone(s, { type: 'triangle', f: 392, a: 0.15, d: 0.8, v: 0.1 }),
      noise(s, { ft: 'highpass', f: 6000, a: 0.2, d: 0.5, v: 0.05 }));
    return e - s.t;
  },
  focus: (s) => max(
    tone(s, { f: 220, f2: 440, gl: 0.9, a: 0.45, h: 0.3, d: 0.4, v: 0.2 }),
    tone(s, { f: 330, f2: 660, gl: 0.9, a: 0.45, h: 0.3, d: 0.4, v: 0.09 }),
    noise(s, { ft: 'bandpass', f: 600, f2: 2400, gl: 0.9, q: 2, a: 0.5, h: 0.25, d: 0.35, v: 0.28 }),
  ) - s.t,
  spell: (s) => {   // Rinse: fizzy bubbly wash
    let e = max(
      noise(s, { ft: 'highpass', f: 2600, q: 0.7, a: 0.05, h: 0.2, d: 0.5, v: 0.42, am: 27 }),
      noise(s, { ft: 'bandpass', f: 400, f2: 1800, gl: 0.4, q: 0.8, a: 0.05, d: 0.5, v: 0.6 }),
      tone(s, { f: 300, f2: 620, gl: 0.3, a: 0.01, d: 0.4, v: 0.13 }),
    );
    for (let i = 0; i < 12; i++) e = max(e, bubble(s, i * 0.04 + s.r() * 0.03, rr(s, 300, 1200), 0.14));
    return e - s.t;
  },
  throw: (s) => max(
    noise(s, { ft: 'bandpass', f: 900, f2: 2600, gl: 0.12, q: 1, a: 0.01, d: 0.13, v: 0.55 }),
    tone(s, { f: 300, f2: 720, gl: 0.08, d: 0.09, v: 0.25 }),
  ) - s.t,
  splat: (s) => {
    let e = max(
      noise(s, { ft: 'lowpass', f: 1500, f2: 400, gl: 0.1, q: 1.2, d: 0.13, v: 0.7 }),
      tone(s, { f: 260, f2: 110, gl: 0.1, d: 0.13, v: 0.5 }),
      noise(s, { t: 0.01, ft: 'bandpass', f: 1200, q: 4, d: 0.05, v: 0.3 }),
    );
    for (let i = 0; i < 3; i++) e = max(e, bubble(s, rr(s, 0.02, 0.12), rr(s, 500, 1000), 0.15));
    return e - s.t;
  },
  empty: (s) => max(
    tone(s, { type: 'triangle', f: 220, f2: 180, gl: 0.08, d: 0.09, v: 0.28 }),
    tone(s, { type: 'triangle', f: 233, f2: 190, gl: 0.08, d: 0.09, v: 0.22 }),
    noise(s, { ft: 'lowpass', f: 420, d: 0.05, v: 0.25 }),
  ) - s.t,
  splash: (s) => {
    let e = max(noise(s, { ft: 'highpass', f: 3000, d: 0.16, v: 0.38 }), noise(s, { ft: 'lowpass', f: 800, d: 0.1, v: 0.35 }));
    for (let i = 0; i < 6; i++) e = max(e, bubble(s, rr(s, 0, 0.15), rr(s, 400, 1300), 0.17));
    return e - s.t;
  },
  scrub: (s) => max(   // plaque: squelchy-cute
    noise(s, { ft: 'bandpass', f: 1100, q: 4, a: 0.01, d: 0.08, v: 0.75 }),
    tone(s, { f: 320, f2: 190, gl: 0.07, d: 0.08, v: 0.35 }),
    bubble(s, 0.03, rr(s, 600, 800), 0.18),
    noise(s, { t: 0.05, ft: 'bandpass', f: 1600, q: 4, d: 0.05, v: 0.45 }),
  ) - s.t,
  break: (s) => {
    let e = max(
      tone(s, { f: 200, f2: 60, gl: 0.25, d: 0.3, v: 0.9 }),
      noise(s, { ft: 'lowpass', f: 2000, f2: 300, gl: 0.4, q: 1, d: 0.45, v: 0.7 }),
      bell(s, { t: 0.1, f: 1568, ratio: 2, idx: 0.6, d: 0.6, v: 0.08 }),
    );
    for (let i = 0; i < 6; i++) e = max(e, bubble(s, rr(s, 0, 0.25), rr(s, 300, 900), 0.18));
    for (let i = 0; i < 3; i++) e = max(e, noise(s, { t: rr(s, 0, 0.2), ft: 'bandpass', f: rr(s, 800, 1600), q: 5, d: 0.06, v: 0.4 }));
    return e - s.t;
  },
  clink: (s) => max(   // enamel: glassy
    bell(s, { f: 2100, ratio: 2.76, idx: 1.4, d: 0.38, v: 0.45 }),
    tone(s, { f: 3400, d: 0.12, v: 0.12 }),
    noise(s, { ft: 'highpass', f: 6000, d: 0.015, v: 0.3 }),
  ) - s.t,
  shine: (s) => max(
    bell(s, { f: 1318.5, ratio: 2, idx: 0.8, d: 0.35, v: 0.32 }),
    bell(s, { t: 0.055, f: 1975.5, ratio: 2, idx: 0.8, d: 0.4, v: 0.3 }),
    noise(s, { ft: 'highpass', f: 8000, d: 0.02, v: 0.1 }),
  ) - s.t,
  rest: (s) => {
    let e = 0;
    for (const f of [174.6, 261.6, 440, 659.3]) e = max(e, tone(s, { type: 'triangle', f, a: 0.5, h: 0.4, d: 1.7, v: 0.09 }), tone(s, { f: f * 2, a: 0.6, h: 0.3, d: 1.4, v: 0.03 }));
    [880, 1046.5, 1318.5, 1568].forEach((f, i) => { e = max(e, bell(s, { t: 0.3 + i * 0.18, f, ratio: 3.5, idx: 0.5, d: 1.3, v: 0.11 })); });
    for (let i = 0; i < 3; i++) e = max(e, bubble(s, rr(s, 0.1, 0.9), rr(s, 300, 600), 0.06));
    return e - s.t;
  },
  relic: (s) => {
    let e = max(
      tone(s, { f: 70, f2: 35, gl: 0.6, d: 1.1, v: 0.85 }),
      noise(s, { ft: 'bandpass', f: 400, f2: 3500, gl: 1, q: 1, pink: true, a: 0.05, d: 1.4, v: 0.35 }),
      noise(s, { ft: 'highpass', f: 7000, a: 0.3, h: 0.3, d: 1.2, v: 0.06 }),
    );
    for (const f of [293.7, 370, 440, 659.3]) e = max(e, tone(s, { type: 'triangle', f, a: 0.1, h: 0.4, d: 2, v: 0.09 }));
    [1174.7, 1760, 1480, 2349.3].forEach((f, i) => { e = max(e, bell(s, { t: 0.2 + i * 0.11, f, ratio: 2, idx: 0.6, d: 1.2, v: 0.12 })); });
    return e - s.t;
  },
  read: (s) => max(
    noise(s, { ft: 'bandpass', f: 3000, q: 1.5, a: 0.01, d: 0.05, v: 0.3 }),
    noise(s, { t: 0.07, ft: 'bandpass', f: 2600, q: 1.5, a: 0.01, d: 0.06, v: 0.25 }),
    bell(s, { t: 0.05, f: 880, ratio: 2, idx: 0.4, d: 0.6, v: 0.14 }),
  ) - s.t,
  door: (s) => max(
    noise(s, { ft: 'lowpass', f: 300, f2: 1400, gl: 0.3, q: 0.9, pink: true, a: 0.15, d: 0.45, v: 0.7 }),
    tone(s, { f: 90, f2: 60, gl: 0.5, a: 0.1, d: 0.5, v: 0.3 }),
  ) - s.t,
  step: (s) => max(
    noise(s, { ft: 'lowpass', f: 650, q: 0.7, d: 0.035, v: 0.5 }),
    tone(s, { f: 95, f2: 60, gl: 0.03, d: 0.045, v: 0.4 }),
    noise(s, { ft: 'bandpass', f: 3000, q: 2, d: 0.012, v: 0.07 }),
  ) - s.t,

  // ---------------------------------------------------------------- creatures and boss
  'enemy-alert': (s) => max(   // cute squeak
    tone(s, { f: 650, f2: 1150, gl: 0.07, a: 0.005, d: 0.12, v: 0.3, lfo: 30, depth: 0.03 }),
    tone(s, { type: 'triangle', f: 325, f2: 575, gl: 0.07, a: 0.005, d: 0.1, v: 0.12 }),
    tone(s, { t: 0.09, f: 800, f2: 1300, gl: 0.06, a: 0.005, d: 0.1, v: 0.22 }),
  ) - s.t,
  'enemy-windup': (s) => max(
    tone(s, { type: 'triangle', f: 180, f2: 520, gl: 0.45, a: 0.05, h: 0.35, d: 0.12, v: 0.3, lfo: 14, depth: 0.04 }),
    tone(s, { f: 360, f2: 1040, gl: 0.45, a: 0.05, h: 0.35, d: 0.1, v: 0.08 }),
    noise(s, { ft: 'bandpass', f: 500, f2: 1500, gl: 0.45, q: 3, a: 0.3, h: 0.1, d: 0.1, v: 0.25 }),
  ) - s.t,
  spit: (s) => max(
    noise(s, { ft: 'bandpass', f: 1400, q: 2, d: 0.06, v: 0.6 }),
    tone(s, { f: 520, f2: 200, gl: 0.08, d: 0.1, v: 0.45 }),
    bubble(s, 0.02, rr(s, 500, 700), 0.15),
  ) - s.t,
  swoop: (s) => max(
    noise(s, { ft: 'bandpass', f: 2200, f2: 600, gl: 0.35, q: 2, a: 0.08, d: 0.3, v: 0.75 }),
    tone(s, { f: 900, f2: 400, gl: 0.35, a: 0.05, d: 0.25, v: 0.07 }),
  ) - s.t,
  charge: (s) => {
    let e = max(
      noise(s, { ft: 'lowpass', f: 260, q: 1, pink: true, a: 0.1, h: 0.3, d: 0.3, v: 0.9 }),
      tone(s, { type: 'triangle', f: 75, f2: 95, gl: 0.5, a: 0.05, h: 0.3, d: 0.25, v: 0.3 }),
    );
    for (let i = 0; i < 4; i++) e = max(e, tone(s, { t: i * 0.15, f: 62, f2: 40, gl: 0.06, d: 0.09, v: 0.45 }), grain(s, i * 0.15, rr(s, 800, 1100), 0.3));
    return e - s.t;
  },
  'shield-block': (s) => {   // tartar: stony crunch
    let e = max(
      noise(s, { ft: 'bandpass', f: 1600, q: 1.5, d: 0.05, v: 0.7 }),
      tone(s, { f: 140, f2: 70, gl: 0.08, d: 0.13, v: 0.7 }),
      bell(s, { f: 900, ratio: 1.41, idx: 3, d: 0.16, v: 0.1 }),
    );
    for (let i = 0; i < 4; i++) e = max(e, grain(s, rr(s, 0, 0.06), rr(s, 2500, 4500), 0.3));
    return e - s.t;
  },
  'leech-drop': (s) => max(
    tone(s, { f: 1100, f2: 240, gl: 0.26, a: 0.005, d: 0.3, v: 0.22 }),
    noise(s, { t: 0.28, ft: 'lowpass', f: 1000, q: 1.2, d: 0.08, v: 0.5 }),
    tone(s, { t: 0.28, f: 200, f2: 90, gl: 0.08, d: 0.1, v: 0.5 }),
  ) - s.t,
  buzz: (s) => {   // mite swarm
    const c = s.c, T = s.t, bq = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    bq.type = 'bandpass'; bq.frequency.value = 1200 * s.p; bq.Q.value = 2;
    lfo.frequency.value = 31; lg.gain.value = 22;
    const end = env(g.gain, T, 0.05, 0.2, 0.15, 0.32);
    for (const f of [170, 176]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * s.p; lg.connect(o.frequency); o.connect(bq); o.start(T); o.stop(end + 0.05); }
    lfo.connect(lg); bq.connect(g); g.connect(s.out); lfo.start(T); lfo.stop(end + 0.05);
    return end - T;
  },
  'boss-roar': (s) => {
    const c = s.c, T = s.t, lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(250, T); lp.frequency.exponentialRampToValueAtTime(900, T + 0.35); lp.frequency.exponentialRampToValueAtTime(260, T + 1.6);
    lfo.frequency.value = 5; lg.gain.value = 2.2;
    const end = env(g.gain, T, 0.15, 0.7, 0.75, 0.4);
    for (const f of [55, 58.3, 82.4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * s.p; lg.connect(o.frequency); o.connect(lp); o.start(T); o.stop(end + 0.05); }
    lfo.connect(lg); lp.connect(g); g.connect(s.out); lfo.start(T); lfo.stop(end + 0.05);
    return max(end,
      noise(s, { ft: 'lowpass', f: 700, q: 0.8, pink: true, a: 0.2, h: 0.5, d: 0.6, v: 0.5 }),
      tone(s, { f: 45, a: 0.1, h: 0.8, d: 0.5, v: 0.55 }),
    ) - T;
  },
  'boss-slam': (s) => {
    let e = max(
      tone(s, { f: 75, f2: 28, gl: 0.5, d: 0.85, v: 1 }),
      noise(s, { ft: 'lowpass', f: 1600, f2: 200, gl: 0.5, q: 1, d: 0.6, v: 0.85 }),
      tone(s, { type: 'triangle', f: 110, f2: 55, gl: 0.2, d: 0.3, v: 0.3 }),
    );
    for (let i = 0; i < 8; i++) e = max(e, grain(s, rr(s, 0.02, 0.35), rr(s, 1500, 4000), 0.25));
    return e - s.t;
  },
  'boss-hurt': (s) => {
    let e = max(
      tone(s, { f: 130, f2: 55, gl: 0.15, d: 0.22, v: 0.9 }),
      noise(s, { ft: 'bandpass', f: 1800, q: 1.2, d: 0.07, v: 0.6 }),
      tone(s, { type: 'triangle', f: 330, f2: 250, gl: 0.15, d: 0.16, v: 0.14 }),
    );
    for (let i = 0; i < 3; i++) e = max(e, grain(s, rr(s, 0, 0.08), rr(s, 2000, 4000), 0.25));
    return e - s.t;
  },
  'boss-phase': (s) => {
    let e = max(
      noise(s, { ft: 'bandpass', f: 300, f2: 2500, gl: 1, q: 1, pink: true, a: 1, d: 0.25, v: 0.5 }),
      tone(s, { t: 1, f: 60, f2: 30, gl: 0.8, d: 1.3, v: 1 }),
      noise(s, { t: 1, ft: 'lowpass', f: 1200, f2: 200, gl: 0.6, d: 0.7, v: 0.6 }),
      tone(s, { t: 1, type: 'triangle', f: 73.4, a: 0.02, d: 1.6, v: 0.2 }),
      tone(s, { t: 1, type: 'triangle', f: 77.8, a: 0.02, d: 1.6, v: 0.18 }),
    );
    for (const f of [523.3, 554.4, 740]) e = max(e, bell(s, { t: 1, f, ratio: 3.5, idx: 0.8, d: 1.5, v: 0.08 }));
    return e - s.t;
  },
  'boss-death': (s) => {
    let e = max(
      tone(s, { f: 70, f2: 28, gl: 1, d: 1.6, v: 1 }),
      noise(s, { ft: 'lowpass', f: 2500, f2: 150, gl: 1.5, q: 0.8, pink: true, d: 2, v: 0.75 }),
    );
    for (let i = 0; i < 14; i++) e = max(e, grain(s, rr(s, 0.05, 1.3), rr(s, 1200, 4000), 0.22));
    for (const f of [146.8, 220, 293.7, 370, 440]) e = max(e, tone(s, { t: 0.8, type: 'triangle', f, a: 0.6, h: 0.8, d: 2.4, v: 0.085 }));
    [1174.7, 1480, 1760, 2349.3].forEach((f, i) => { e = max(e, bell(s, { t: 1.2 + i * 0.22, f, ratio: 2, idx: 0.6, d: 1.5, v: 0.11 })); });
    return e - s.t;
  },
  'gate-close': (s) => {
    let e = max(
      tone(s, { f: 65, f2: 35, gl: 0.3, d: 0.55, v: 1 }),
      noise(s, { ft: 'lowpass', f: 900, f2: 150, gl: 0.4, q: 1, d: 0.5, v: 0.85 }),
      noise(s, { ft: 'lowpass', f: 200, q: 0.8, pink: true, a: 0.05, h: 0.2, d: 0.5, v: 0.5 }),
    );
    for (let i = 0; i < 5; i++) e = max(e, grain(s, rr(s, 0, 0.2), rr(s, 1500, 3500), 0.25));
    return e - s.t;
  },
  'gate-open': (s) => max(
    noise(s, { ft: 'bandpass', f: 200, f2: 520, gl: 1, q: 1.5, pink: true, a: 0.2, h: 0.6, d: 0.35, v: 0.9, am: 11 }),
    tone(s, { type: 'triangle', f: 50, f2: 65, gl: 1, a: 0.2, h: 0.6, d: 0.3, v: 0.3 }),
    bell(s, { t: 1, f: 880, ratio: 2, idx: 0.5, d: 1, v: 0.14 }),
    bell(s, { t: 1.08, f: 1318.5, ratio: 2, idx: 0.5, d: 1, v: 0.12 }),
  ) - s.t,
  'shard-fall': (s) => {
    let e = max(
      tone(s, { f: 3200, f2: 1200, gl: 0.45, a: 0.02, d: 0.45, v: 0.1 }),
      tone(s, { f: 4800, f2: 1800, gl: 0.45, a: 0.02, d: 0.45, v: 0.04 }),
      bell(s, { t: 0.45, f: 1800, ratio: 2.76, idx: 1.4, d: 0.4, v: 0.4 }),
      noise(s, { t: 0.45, ft: 'highpass', f: 5000, d: 0.03, v: 0.3 }),
    );
    for (let i = 0; i < 3; i++) e = max(e, grain(s, 0.45 + rr(s, 0, 0.08), rr(s, 3000, 6000), 0.2));
    return e - s.t;
  },

  // ---------------------------------------------------------------- UI
  'ui-move': (s) => max(tone(s, { f: 1320, a: 0.001, d: 0.035, v: 0.25 }), tone(s, { type: 'triangle', f: 660, d: 0.03, v: 0.12 })) - s.t,
  'ui-select': (s) => max(bell(s, { f: 659.3, ratio: 2, idx: 0.6, d: 0.3, v: 0.3 }), bell(s, { t: 0.06, f: 987.8, ratio: 2, idx: 0.6, d: 0.35, v: 0.3 })) - s.t,
  'ui-back': (s) => max(tone(s, { type: 'triangle', f: 987.8, d: 0.2, v: 0.25 }), tone(s, { t: 0.06, type: 'triangle', f: 659.3, d: 0.25, v: 0.25 })) - s.t,
  'ui-open': (s) => max(
    noise(s, { ft: 'bandpass', f: 600, f2: 2400, gl: 0.2, q: 1, a: 0.05, d: 0.15, v: 0.25 }),
    bell(s, { t: 0.08, f: 880, ratio: 2, idx: 0.5, d: 0.5, v: 0.2 }), bell(s, { t: 0.14, f: 1318.5, ratio: 2, idx: 0.5, d: 0.5, v: 0.16 }),
  ) - s.t,
  'ui-close': (s) => max(
    noise(s, { ft: 'bandpass', f: 2400, f2: 600, gl: 0.2, q: 1, a: 0.02, d: 0.15, v: 0.22 }),
    bell(s, { f: 1318.5, ratio: 2, idx: 0.5, d: 0.4, v: 0.15 }), bell(s, { t: 0.06, f: 880, ratio: 2, idx: 0.5, d: 0.4, v: 0.15 }),
  ) - s.t,
  'text-blip': (s) => max(tone(s, { type: 'triangle', f: 620 * (0.94 + s.r() * 0.12), a: 0.002, d: 0.03, v: 0.32 }), tone(s, { f: 1240, d: 0.02, v: 0.07 })) - s.t,
  buy: (s) => {
    let e = max(noise(s, { ft: 'highpass', f: 7000, d: 0.04, v: 0.1 }), tone(s, { type: 'triangle', f: 659.3, a: 0.02, d: 0.5, v: 0.1 }), tone(s, { type: 'triangle', f: 987.8, a: 0.02, d: 0.5, v: 0.08 }));
    [1318.5, 1661.2, 1975.5, 2637].forEach((f, i) => { e = max(e, bell(s, { t: i * 0.05, f, ratio: 2, idx: 0.6, d: 0.4, v: 0.18 })); });
    return e - s.t;
  },
};

/** Per-name trim (linear), concurrency cap and spread of random pitch. Tuned from tests/audio.cjs measurements. */
export const TRIM: Record<string, number> = {};
export const CAP: Record<string, number> = {
  step: 2, 'text-blip': 2, 'ui-move': 2, shine: 6, hit: 5, buzz: 3, death: 1, relic: 1, rest: 1, 'boss-death': 1,
  'boss-roar': 1, 'boss-phase': 1, 'gate-open': 1, 'gate-close': 1, focus: 1, heal: 2,
};
export const JITTER: Record<string, number> = { 'ui-select': 0.005, 'ui-back': 0.005, 'ui-open': 0.005, 'ui-close': 0.005, buy: 0.005, relic: 0, rest: 0, death: 0, 'boss-death': 0 };
