// Shared DSP helpers for the BRISTLE audio engine: buffers generated once per context (noise, percussion
// one-shots, the cave impulse response), the output soft-clip curve, a seeded RNG and pitch maths.
// Everything here is plain math on Float32Arrays, so it costs nothing per note at run time.

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** mulberry32: tiny seeded RNG returning 0..1. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Buffers every voice can share. Built once on unlock. */
export interface Bank {
  white: AudioBuffer;   // 2 s white noise
  pink: AudioBuffer;    // 2 s pink-ish noise (softer top end)
  kick: AudioBuffer; tom: AudioBuffer; frame: AudioBuffer; shaker: AudioBuffer; click: AudioBuffer; thump: AudioBuffer;
  ir: AudioBuffer;      // cave impulse response (stereo)
}

function mono(c: BaseAudioContext, secs: number, fn: (t: number, i: number, sr: number) => number) {
  const sr = c.sampleRate, n = Math.max(1, Math.floor(secs * sr)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = fn(i / sr, i, sr);
  return b;
}

export function makeBank(c: BaseAudioContext): Bank {
  const r = rng(5460);
  const white = mono(c, 2, () => r() * 2 - 1);
  // Paul Kellet's economy pink filter
  let b0 = 0, b1 = 0, b2 = 0;
  const pink = mono(c, 2, () => { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; return (b0 + b1 + b2 + w * 0.1848) * 0.2; });

  // Soft kick: a sine dropping 105 -> 44 Hz, gentle click, ~0.45 s.
  let ph = 0;
  const kick = mono(c, 0.5, (t, _i, sr) => {
    const f = 44 + 61 * Math.exp(-t / 0.035); ph += (2 * Math.PI * f) / sr;
    const a = Math.min(1, t / 0.002) * Math.exp(-t / 0.16);
    return Math.sin(ph) * a * 0.95 + (r() * 2 - 1) * Math.exp(-t / 0.003) * 0.08;
  });
  // Tom / timpani-ish: 150 -> 92 Hz body plus a puff of low noise.
  let ph2 = 0, lp = 0;
  const tom = mono(c, 0.7, (t, _i, sr) => {
    const f = 92 + 58 * Math.exp(-t / 0.05); ph2 += (2 * Math.PI * f) / sr; lp += 0.08 * ((r() * 2 - 1) - lp);
    return (Math.sin(ph2) * Math.exp(-t / 0.22) * 0.8 + lp * Math.exp(-t / 0.04) * 1.6) * Math.min(1, t / 0.003);
  });
  // Frame drum: dull hand hit, lowpassed noise with a 180 Hz knock.
  let ph3 = 0, lp3 = 0;
  const frame = mono(c, 0.35, (t, _i, sr) => {
    ph3 += (2 * Math.PI * 178) / sr; lp3 += 0.18 * ((r() * 2 - 1) - lp3);
    return (Math.sin(ph3) * Math.exp(-t / 0.07) * 0.6 + lp3 * Math.exp(-t / 0.025) * 1.4) * Math.min(1, t / 0.002);
  });
  // Shaker: highpassed noise with a short swell.
  let prev = 0;
  const shaker = mono(c, 0.11, (t) => { const w = r() * 2 - 1, h = w - prev; prev = w; return h * 0.5 * Math.min(1, t / 0.012) * Math.exp(-Math.max(0, t - 0.012) / 0.028); });
  // Rim click: a short 1.9 kHz ping plus a tick.
  const click = mono(c, 0.05, (t) => (Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t / 0.007) * 0.7 + (r() * 2 - 1) * Math.exp(-t / 0.002) * 0.3));
  // Felt hammer thump for the piano.
  let lp4 = 0;
  const thump = mono(c, 0.05, (t) => { lp4 += 0.12 * ((r() * 2 - 1) - lp4); return lp4 * 3 * Math.exp(-t / 0.01); });

  return { white, pink, kick, tom, frame, shaker, click, thump, ir: caveIR(c, 3.2, 2.7) };
}

/** A generated cave impulse response: pre-delay, sparse early reflections off rock, then a dense tail that
 *  darkens as it decays (one-pole lowpass whose cutoff falls over time). Decorrelated per channel. */
export function caveIR(c: BaseAudioContext, secs: number, rt60: number): AudioBuffer {
  const sr = c.sampleRate, n = Math.floor(secs * sr), b = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch), r = rng(91 + ch * 7);
    const pre = Math.floor(0.018 * sr);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr;
      const env = Math.exp((-6.9 * t) / rt60) * Math.min(1, t / 0.03);
      const k = 0.55 * Math.exp(-t / 0.9) + 0.06;          // brightness falls over time
      lp += k * ((r() * 2 - 1) - lp);
      d[i] = lp * env;
    }
    // early reflections: 9 taps in the first 90 ms
    for (let j = 0; j < 9; j++) {
      const at = pre + Math.floor((0.006 + r() * 0.085) * sr), g = (0.5 - j * 0.04) * (r() < 0.5 ? -1 : 1);
      for (let k = 0; k < 24 && at + k < n; k++) d[at + k] += g * Math.exp(-k / 6);
    }
  }
  return b;
}

/** Output soft clip: unity below 0.6, smoothly saturating towards 0.965. The shaper's input is pre-scaled by
 *  0.5, so the curve covers amplitudes up to 2.0 before it holds at its end value. */
export function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 4096, cur = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = ((i / (n - 1)) * 2 - 1) * 2, a = Math.abs(x);
    const y = a < 0.6 ? a : 0.6 + 0.365 * Math.tanh((a - 0.6) / 0.365);
    cur[i] = Math.sign(x) * y;
  }
  return cur;
}
