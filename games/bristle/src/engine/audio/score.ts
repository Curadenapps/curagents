// Score engine: music theory helpers, the track format and the TrackPlayer that schedules a track beat by
// beat with a short lookahead. A track is a written form (sections with chords and melodies) plus two
// arrangement callbacks, one per stem: `explore` (always on) and `combat` (faded in by intensity).
import { Instruments } from './instruments';
import { rng, type Bank } from './dsp';

export const SCALE = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  /** Harmonic minor with a flat second: the boss's dark variant of the theme. */
  darkMinor: [0, 1, 3, 5, 7, 8, 11],
};

/** Scale degree -> semitones. 7 = octave. A .5 degree is raised a semitone (6.5 = leading tone). */
export function deg(scale: number[], d: number) {
  const raise = d % 1 !== 0 ? 1 : 0, di = Math.floor(d), o = Math.floor(di / 7), i = ((di % 7) + 7) % 7;
  return scale[i] + 12 * o + raise;
}

const QUAL: Record<string, number[]> = {
  M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], dom: [0, 4, 7, 10], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], M9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], aug: [0, 4, 8],
  m6: [0, 3, 7, 9], '6': [0, 4, 7, 9], 'M7#11': [0, 4, 7, 11, 18], m7b5: [0, 3, 6, 10],
};
export interface Chord { root: number; tones: number[]; bass: number }
/** "8M7" = root 8 semitones above the key, major seventh. "2M/0" = D major over a key-note pedal. */
export function chord(sym: string): Chord {
  const [main, over] = sym.split('/'), mt = /^(-?\d+)(.*)$/.exec(main)!;
  const root = +mt[1], q = QUAL[mt[2] || 'M'] ?? QUAL.M;
  return { root, tones: q.map((x) => x + root), bass: over !== undefined ? +over : root };
}
/** Close voicing of a chord's tones around `center` (midi), lowest note first. */
export function voice(ch: Chord, key: number, center: number, n = 4) {
  const out: number[] = [];
  for (const tone of ch.tones.slice(0, n)) {
    let m = key + tone; while (m < center - 6) m += 12; while (m >= center + 6) m -= 12; out.push(m);
  }
  return out.sort((a, b) => a - b);
}
/** Melody note: [beat in bar, degree or null for a rest, length in beats, velocity 0..1]. */
export type Note = [number, number | null, number, number?];
/** Stretch a melody (bars of `meter` beats) by k, keeping `meter`-beat bars. */
export function stretch(bars: Note[][], k: number, meter: number): Note[][] {
  const out: Note[][] = [];
  bars.forEach((bar, bi) => bar.forEach(([b, d, l, v]) => {
    const at = (bi * meter + b) * k, nb = Math.floor(at / meter);
    (out[nb] ??= []).push([at - nb * meter, d, l * k, v]);
  }));
  for (let i = 0; i < bars.length * k; i++) out[i] ??= [];
  return out;
}

export interface Section { name: string; bars: number; chords: string[]; mel?: Note[][] }
export interface TrackDef {
  id: string; bpm: number; meter: number;
  key: number;                 // midi of the tonic in the melody octave
  scale: number[];
  gain: number;                // stem trim so every track sits at the same loudness
  reverb: number; echo: number; // send levels on the shared music bus (crossfaded with the track)
  echoBeats: number;           // ping-pong echo time in beats
  form: Section[]; loopFrom: number;
  explore(s: Step): void;
  combat(s: Step): void;
}
export interface Step {
  def: TrackDef;
  t: number; spb: number;      // beat start time, seconds per beat
  bar: number; beat: number;   // global bar, beat in bar
  sec: Section; secIdx: number; barInSec: number; pass: number;
  ch: Chord; newChord: boolean;
  I: Instruments;
  r: () => number;
  /** Melody notes starting in this beat (beat offsets inside the bar). */
  mel: Note[];
  /** midi for a scale degree in the melody octave (plus octave shift). */
  m(d: number, oct?: number): number;
}

/** Plays one track: owns its stem gains, schedules beats until `until`. */
export class TrackPlayer {
  readonly out: GainNode; readonly exploreGain: GainNode; readonly combatGain: GainNode;
  private ie: Instruments; private ic: Instruments;
  nextT: number; private beatN = 0; private secIdx = 0; private barInSec = 0; private bar = 0; private pass = 0; private beat = 0;
  private lastChord = '';
  private r: () => number;
  combatOn = false;
  dead = false; stopAt = Infinity;

  constructor(readonly c: BaseAudioContext, bank: Bank, readonly def: TrackDef, dest: AudioNode, start: number) {
    this.out = c.createGain(); this.out.gain.value = 0;
    this.exploreGain = c.createGain(); this.combatGain = c.createGain(); this.combatGain.gain.value = 0;
    const trim = c.createGain(); trim.gain.value = def.gain;
    this.exploreGain.connect(trim); this.combatGain.connect(trim); trim.connect(this.out);
    this.out.connect(dest);
    this.ie = new Instruments(c, bank, this.exploreGain); this.ic = new Instruments(c, bank, this.combatGain);
    this.nextT = start;
    this.r = rng((Math.random() * 1e9) | 0);
  }
  get spb() { return 60 / this.def.bpm; }

  fadeIn(now: number, secs: number) { const g = this.out.gain; g.cancelScheduledValues(now); g.setValueAtTime(0, now); g.linearRampToValueAtTime(1, now + secs); }
  fadeOut(now: number, secs: number) {
    const g = this.out.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(now); else { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); }
    g.setTargetAtTime(0, now, secs / 4.5);
    this.stopAt = now + secs + 0.6;
  }
  /** 0..1, smoothed: rises over about a second, falls over a few. */
  setIntensity(v: number, now: number) {
    const k = v * v * (3 - 2 * v);
    const cur = this.combatGain.gain;
    cur.cancelScheduledValues(now); cur.setTargetAtTime(k, now, k > 0.01 ? 0.45 : 1.4);
    this.exploreGain.gain.cancelScheduledValues(now); this.exploreGain.gain.setTargetAtTime(1 - 0.22 * k, now, 0.8);
    if (k > 0.01) this.combatOn = true;
    this.combatOffAt = k > 0.01 ? Infinity : now + 6;
  }
  private combatOffAt = Infinity;

  /** Schedule every beat that starts before `until`. Beats that fell far behind (tab hidden) are skipped. */
  schedule(until: number, now: number) {
    if (this.dead) return;
    if (now > this.combatOffAt) { this.combatOn = false; this.combatOffAt = Infinity; }
    while (this.nextT < until) {
      if (this.nextT >= now - 0.03 && this.nextT < this.stopAt - 0.3) this.step(this.nextT);
      this.advance();
    }
  }
  private advance() {
    this.nextT += this.spb; this.beatN++; this.beat++;
    if (this.beat >= this.def.meter) {
      this.beat = 0; this.bar++; this.barInSec++;
      if (this.barInSec >= this.def.form[this.secIdx].bars) {
        this.barInSec = 0; this.secIdx++;
        if (this.secIdx >= this.def.form.length) { this.secIdx = this.def.loopFrom; this.pass++; }
      }
    }
  }
  private step(t: number) {
    const d = this.def, sec = d.form[this.secIdx], sym = sec.chords[this.barInSec % sec.chords.length];
    const ch = chord(sym), newChord = this.beat === 0 && (sym !== this.lastChord || this.barInSec === 0);
    if (this.beat === 0) this.lastChord = sym;
    const bar = sec.mel?.[this.barInSec % sec.mel.length] ?? [];
    const mel = bar.filter((n) => n[0] >= this.beat && n[0] < this.beat + 1);
    const base = { def: d, t, spb: this.spb, bar: this.bar, beat: this.beat, sec, secIdx: this.secIdx, barInSec: this.barInSec, pass: this.pass, ch, newChord, r: this.r, mel,
      m: (dg: number, oct = 0) => d.key + deg(d.scale, dg) + oct * 12 };
    d.explore({ ...base, I: this.ie });
    if (this.combatOn) d.combat({ ...base, I: this.ic });
  }
  dispose() { this.dead = true; this.out.disconnect(); this.ie.dispose(); this.ic.dispose(); }
}

/** Helpers for arrangements. */
export const H = {
  /** Play the melody notes of this beat on `play(midi, time, lengthSec, vel)`, humanised. */
  melody(s: Step, play: (m: number, t: number, dur: number, vel: number) => void, oct = 0, vel = 0.6) {
    for (const [b, dg, l, v] of s.mel) if (dg !== null) play(s.m(dg, oct), s.t + (b - s.beat) * s.spb + (s.r() - 0.5) * 0.012, l * s.spb, vel * (v ?? 1) * (0.92 + s.r() * 0.16));
  },
  /** Time of a sub-beat position inside this beat (0..1). */
  at(s: Step, frac: number) { return s.t + frac * s.spb; },
  bassNote(s: Step, oct = -2) { return s.def.key + ((s.ch.bass % 12) + 12) % 12 + oct * 12; },
  pick<T>(s: Step, a: T[]) { return a[Math.floor(s.r() * a.length)]; },
};
