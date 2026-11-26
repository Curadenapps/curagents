// The BRISTLE score: eight original pieces. Melodies are written in scale degrees (0 = tonic, 7 = octave),
// so the main theme can be heard in minor (title), dorian on music box (crown), a dark flat-two minor (boss)
// and resolved in major (ending). Chord symbols are semitones above the key plus a quality (see score.ts).
import { SCALE, H, voice, stretch, type Note, type Step, type TrackDef } from './score';
import type { PadOpts, StringOpts } from './instruments';

// ---------------------------------------------------------------- the main theme ("The Oath")
// Four-note rise (5th up to the 3rd), a falling answer, a sequence a step lower, a half cadence;
// then the rise reaches higher, sighs down, and settles on the tonic.
const THEME: Note[][] = [
  [[0, 4, 1], [1, 7, 0.5], [1.5, 8, 0.5], [2, 9, 1.5], [3.5, 8, 0.5]],
  [[0, 7, 1], [1, 6, 1], [2, 4, 2]],
  [[0, 2, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 6, 1.5], [3.5, 5, 0.5]],
  [[0, 4, 1.5], [1.5, 3, 0.5], [2, 4, 2]],
  [[0, 4, 1], [1, 7, 0.5], [1.5, 8, 0.5], [2, 9, 1.5], [3.5, 11, 0.5]],
  [[0, 10, 2], [2, 9, 1], [3, 8, 1]],
  [[0, 8, 1], [1, 9, 0.5], [1.5, 8, 0.5], [2, 7, 1], [3, 6, 1]],
  [[0, 7, 3]],
];
// Contrasting B strain (in the relative major's colours).
const THEME_B: Note[][] = [
  [[0, 9, 1.5], [1.5, 8, 0.5], [2, 7, 1], [3, 9, 1]],
  [[0, 8, 2], [2, 6, 1], [3, 4, 1]],
  [[0, 5, 1.5], [1.5, 7, 0.5], [2, 9, 2]],
  [[0, 9, 1], [1, 8, 1], [2, 7, 1], [3, 8, 1]],
  [[0, 7, 1.5], [1.5, 5, 0.5], [2, 7, 1], [3, 10, 1]],
  [[0, 9, 2], [2, 8, 1], [3, 7, 1]],
  [[0, 8, 1], [1, 7, 1], [2, 5, 1], [3, 4, 1]],
  [[0, 6.5, 2], [2, 4, 2]],
];
// Gumline lullaby (3/4).
const LULLABY: Note[][] = [
  [[0, 4, 2], [2, 2, 1]], [[0, 3, 1], [1, 2, 1], [2, 1, 1]], [[0, 2, 1.5], [1.5, 4, 0.5], [2, 7, 1]], [[0, 6, 2], [2, 4, 1]],
  [[0, 5, 2], [2, 4, 1]], [[0, 3, 1], [1, 5, 1], [2, 3, 1]], [[0, 4, 1.5], [1.5, 3, 0.5], [2, 1, 1]], [[0, 2, 1], [1, 0, 2]],
];
const LULLABY_B: Note[][] = [
  [[0, 7, 2], [2, 6, 1]], [[0, 5, 3]], [[0, 4, 1], [1, 5, 1], [2, 4, 1]], [[0, 6, 3]],
  [[0, 7, 1.5], [1.5, 6, 0.5], [2, 5, 1]], [[0, 3, 1], [1, 5, 1], [2, 7, 1]], [[0, 8, 2], [2, 7, 1]], [[0, 4, 3]],
];
// Narrows: a falling call that echoes down the shaft.
const SHAFT: Note[][] = [
  [[0, 4, 3], [3, 3, 1]], [[0, 2, 2], [2, 1, 2]], [[0, 0, 4]], [],
  [[0, 7, 1], [1, 6, 1], [2, 4, 2]], [[0, 5, 4]], [[0, 4, 2], [2, 3, 1], [3, 1, 1]], [[0, 4, 4]],
];
// Sugar Wastes: lydian glitter, ends on an augmented chord.
const GLITTER: Note[][] = [
  [[0, 4, 1], [1, 3, 1], [2, 4, 2]], [[0, 5, 1], [1, 4, 0.5], [1.5, 3, 0.5], [2, 1, 2]], [[0, 2, 1.5], [1.5, 3, 0.5], [2, 4, 2]], [[0, 6, 4]],
  [[0, 4, 1], [1, 5, 1], [2, 7, 2]], [[0, 7, 2], [2, 4, 2]], [[0, 6, 1], [1, 5, 1], [2, 4, 1], [3, 2, 1]], [[0, 0, 2], [2, 2, 2]],
];
// Calculus Deep: a slow phrygian descent in the low piano.
const DESCENT: Note[][] = [
  [[0, 2, 2], [2, 1, 2]], [[0, 0, 4]], [], [[2, 4, 1], [3, 5, 1]], [[0, 4, 4]], [[0, 3, 2], [2, 2, 2]], [[0, 1, 4]], [],
];

// ---------------------------------------------------------------- arrangement helpers
/** How many bars the current chord lasts from here (within the section). */
function chordBars(s: Step) {
  const cs = s.sec.chords, sym = cs[s.barInSec % cs.length]; let n = 1;
  while (s.barInSec + n < s.sec.bars && cs[(s.barInSec + n) % cs.length] === sym) n++;
  return n;
}
const barLen = (s: Step) => s.def.meter * s.spb;
const secLen = (s: Step) => s.sec.bars * barLen(s);
/** Pad on each chord change, held for the chord's length. */
function padChord(s: Step, center: number, vel: number, o: PadOpts = {}) {
  if (s.beat === 0 && s.newChord) s.I.pad(voice(s.ch, s.def.key, center), s.t, chordBars(s) * barLen(s), vel, o);
}
function stringsChord(s: Step, center: number, vel: number, o: StringOpts = {}, n = 3) {
  if (s.beat === 0 && s.newChord) s.I.strings(voice(s.ch, s.def.key, center, n), s.t, chordBars(s) * barLen(s), vel, o);
}
/** Left-hand broken chord in eighths: bass, then the voicing up and back. */
function brokenChord(s: Step, center: number, vel: number, pat = [0, 1, 2, 3, 2, 1, 2, 1]) {
  const v = voice(s.ch, s.def.key, center, 3), notes = [H.bassNote(s, -2), ...v];
  for (let k = 0; k < 2; k++) {
    const i = pat[(s.beat * 2 + k) % pat.length], acc = s.beat === 0 && k === 0 ? 1.25 : 1;
    s.I.piano(notes[i], H.at(s, k * 0.5) + (s.r() - 0.5) * 0.01, s.spb * 0.9, vel * acc * (0.9 + s.r() * 0.2), -0.25);
  }
}
/** A random chord tone on the music box, somewhere in this beat. */
function sparkle(s: Step, prob: number, center: number, vel: number) {
  if (s.r() < prob) { const v = voice(s.ch, s.def.key, center, 4); s.I.box(H.pick(s, v), H.at(s, s.r() < 0.5 ? 0 : 0.5), vel * (0.7 + s.r() * 0.3), s.r() * 1.2 - 0.6); }
}
function droneAtSection(s: Step, offsets: [number, number][], atk = 2.5) {
  if (s.beat === 0 && s.barInSec === 0) for (const [o, v] of offsets) s.I.drone(s.def.key + (((s.ch.bass % 12) + 12) % 12) + o, s.t, secLen(s), v, atk);
}

// ---------------------------------------------------------------- tracks
const title: TrackDef = {
  id: 'title', bpm: 66, meter: 4, key: 62, scale: SCALE.aeolian, gain: 1, reverb: 0.32, echo: 0.06, echoBeats: 0.75,
  form: [
    { name: 'intro', bars: 2, chords: ['0madd9'] },
    { name: 'A', bars: 8, chords: ['0m', '8M', '3M', '7m7', '0m', '5m', '10M', '0m'], mel: THEME },
    { name: 'B', bars: 8, chords: ['3M', '10M', '8M', '3M', '5m7', '8M', '5m', '7M'], mel: THEME_B },
    { name: 'A2', bars: 8, chords: ['0m', '8M', '3M', '7m7', '0m', '5m', '10M', '0m'], mel: THEME },
    { name: 'C', bars: 4, chords: ['0madd9', '8M7', '3M', '7sus4'] },
  ],
  loopFrom: 1,
  explore(s) {
    padChord(s, 57, 0.42, { cut: 950, atk: 1.6 });
    const n = s.sec.name;
    if (n === 'intro' || n === 'C') { droneAtSection(s, [[-24, 0.5]]); if (s.beat % 2 === 0) brokenChord(s, 55, 0.22); sparkle(s, 0.3, 81, 0.4); }
    else brokenChord(s, 55, 0.24);
    if (n === 'A') H.melody(s, (m, t, d, v) => s.I.piano(m, t, d, v, 0.1), 0, 0.6);
    if (n === 'B') { H.melody(s, (m, t, d, v) => s.I.pluck(m, t, v, 0.15, true, 0.9), 0, 0.75); if (s.beat === 2) sparkle(s, 0.5, 86, 0.35); }
    if (n === 'A2') { H.melody(s, (m, t, d, v) => s.I.piano(m, t, d, v, 0.1), 0, 0.6); H.melody(s, (m, t, _d, v) => s.I.box(m, t, v, 0.35), 1, 0.32); }
  },
  combat(s) {
    const I = s.I;
    if (s.beat === 0) I.drum('kick', s.t, 0.5);
    if (s.beat === 2) I.drum('frame', s.t, 0.35);
    if (s.beat === 3) I.drum('frame', H.at(s, 0.5), 0.22);
    I.drum('shaker', H.at(s, 0.5), 0.14, 0.3);
    const b = H.bassNote(s, -1), pat = [0, 7, 12, 7];
    for (let k = 0; k < 2; k++) I.pluck(b + pat[(s.beat * 2 + k) % 4], H.at(s, k * 0.5), k ? 0.26 : 0.34, -0.2, false, 0.22);
    stringsChord(s, 62, 0.42, { trem: 8, cut: 2200 });
  },
};

const crown: TrackDef = {
  id: 'crown', bpm: 58, meter: 4, key: 64, scale: SCALE.dorian, gain: 1, reverb: 0.4, echo: 0.12, echoBeats: 0.75,
  form: [
    { name: 'intro', bars: 2, chords: ['0madd9'] },
    { name: 'A', bars: 8, chords: ['0madd9', '8M7', '3add9', '7m7', '0madd9', '5M', '10M', '0m9'], mel: THEME },
    { name: 'B', bars: 8, chords: ['8M7', '10add9', '0madd9', '0madd9', '5M', '3add9', '7sus4', '7m'] },
  ],
  loopFrom: 1,
  explore(s) {
    padChord(s, 76, 0.5, { wave: 'triangle', cut: 3000, atk: 2.5, rel: 2.5, pan: 0.2 });
    droneAtSection(s, [[-24, 0.42], [-17, 0.16]], 3);
    if (s.beat === 0 && s.bar % 2 === 0 && s.r() < 0.75) s.I.wind(s.t, barLen(s) * 2, 0.5, 380, 1300);
    if (s.sec.name === 'A') {
      H.melody(s, (m, t, _d, v) => s.I.box(m, t, v, -0.15, 1.6), 1, 0.8);
      if (s.pass > 0) H.melody(s, (m, t, d, v) => s.I.piano(m, t, d, v, 0.2), 0, 0.22);
    } else {
      if ((s.beat === 0 || s.beat === 2) && s.r() < 0.45) s.I.box(s.m(H.pick(s, [4, 7, 8, 9]), 1), H.at(s, s.r() < 0.5 ? 0 : 0.5), 0.5, s.r() - 0.5, 1.6);
      if (s.beat === 0) s.I.piano(H.bassNote(s, -1), s.t, barLen(s), 0.26, -0.2);
    }
    if (s.sec.name === 'intro') sparkle(s, 0.3, 88, 0.35);
  },
  combat(s) {
    const I = s.I, v = voice(s.ch, s.def.key, 86, 4), pat = [0, 2, 1, 3, 2, 1, 3, 0];
    for (let k = 0; k < 2; k++) I.box(v[pat[(s.beat * 2 + k) % 8]], H.at(s, k * 0.5), k ? 0.26 : 0.34, k ? 0.4 : -0.4, 0.45);
    if (s.beat % 2 === 0) I.drum('kick', s.t, 0.45);
    I.drum('click', H.at(s, 0.5), 0.13, 0.25);
    I.bass(H.bassNote(s, -2), s.t, s.spb * 0.85, 0.32);
    stringsChord(s, 52, 0.42, { trem: 10, cut: 1600 });
  },
};

const gumline: TrackDef = {
  id: 'gumline', bpm: 84, meter: 3, key: 65, scale: SCALE.ionian, gain: 1, reverb: 0.3, echo: 0.04, echoBeats: 1,
  form: [
    { name: 'intro', bars: 2, chords: ['0M'] },
    { name: 'A', bars: 8, chords: ['0M', '5M', '0M', '7M', '9m', '5M', '7dom', '0M'], mel: LULLABY },
    { name: 'A2', bars: 8, chords: ['0M', '5M', '0M', '7M', '9m', '5M', '7dom', '0M'], mel: LULLABY },
    { name: 'B', bars: 8, chords: ['9m', '5M', '0M', '7M', '9m', '2m7', '5M', '7sus4'], mel: LULLABY_B },
  ],
  loopFrom: 1,
  explore(s) {
    const I = s.I;
    padChord(s, 60, 0.45, { wave: 'triangle', cut: 1500, atk: 1 });
    if (s.beat === 0) I.piano(H.bassNote(s, -2), s.t, s.spb * 2, 0.42, -0.2);
    else { const v = voice(s.ch, s.def.key, 59, 3); I.piano(v[1], s.t + 0.01, s.spb * 0.8, 0.2, -0.1); I.piano(v[2], s.t, s.spb * 0.8, 0.2, -0.1); }
    const n = s.sec.name;
    if (n === 'A') H.melody(s, (m, t, _d, v) => I.box(m, t, v, 0.2, 1.4), 1, 0.75);
    if (n === 'A2') { H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.15), 0, 0.58); sparkle(s, 0.12, 89, 0.3); }
    if (n === 'B') {
      H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.15), 0, 0.58);
      const v = voice(s.ch, s.def.key, 67, 4);
      for (let k = 0; k < 2; k++) I.pluck(v[(s.beat * 2 + k) % v.length], H.at(s, k * 0.5), 0.22, 0.4, true, 0.8);
    }
    if (n === 'intro') sparkle(s, 0.3, 84, 0.35);
  },
  combat(s) {
    const I = s.I, b = H.bassNote(s, -2);
    if (s.beat === 0) I.drum('frame', s.t, 0.45, 0, 0.9);
    else { I.drum('shaker', s.t, 0.15, 0.3); I.drum('shaker', H.at(s, 0.5), 0.1, 0.3); }
    if (s.beat === 2 && s.bar % 2 === 1) I.drum('tom', H.at(s, 0.5), 0.25, -0.2);
    I.pluck(b + [0, 7, 12][s.beat], s.t, 0.34, -0.15, false, 0.3);
    stringsChord(s, 60, 0.36, { cut: 2000, atk: 0.6 });
  },
};

const narrows: TrackDef = {
  id: 'narrows', bpm: 52, meter: 4, key: 69, scale: SCALE.aeolian, gain: 1, reverb: 0.45, echo: 0.32, echoBeats: 0.75,
  form: [
    { name: 'A', bars: 8, chords: ['0madd9', '0madd9', '8M7', '8M7', '5m9', '5m9', '7sus4', '7sus4'], mel: SHAFT },
    { name: 'B', bars: 8, chords: ['0madd9', '0madd9', '3M', '3M', '10add9', '10add9', '7sus4', '7M'] },
  ],
  loopFrom: 0,
  explore(s) {
    const I = s.I;
    if (s.beat === 0 && s.barInSec === 0) { I.drone(s.def.key - 36, s.t, secLen(s), 0.55, 3); I.drone(s.def.key - 29, s.t, secLen(s), 0.22, 4); }
    // vertical arpeggio climbing the shaft, on the first bar of each chord
    if (s.barInSec % 2 === 0) {
      const tones = s.ch.tones.slice(0, 3), up: number[] = [];
      for (let o = -2; o <= 1; o++) for (const tn of tones) { const m = s.def.key + (((tn % 12) + 12) % 12) + o * 12; if (m >= 45 && m <= 86) up.push(m); }
      up.sort((a, b) => a - b);
      const seq = up.filter((_, i) => i % 2 === 0 || i === up.length - 1).slice(0, 8);
      for (let k = 0; k < 2; k++) { const i = s.beat * 2 + k; if (i < seq.length) I.piano(seq[i], H.at(s, k * 0.5), s.spb * 1.5, 0.32 - i * 0.015, -0.6 + i * 0.16); }
    }
    if (s.sec.name === 'A' && s.pass % 2 === 0) H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.25), 0, 0.42);
    if (s.sec.name === 'A' && s.pass % 2 === 1) H.melody(s, (m, t, _d, v) => I.box(m, t, v, 0.25, 1.5), 1, 0.55);
    if (s.sec.name === 'B' && s.beat === 0) padChord(s, 64, 0.3, { wave: 'triangle', cut: 1200, atk: 2 });
    if (s.r() < 0.07) I.chime(s.def.key + 12 + H.pick(s, s.ch.tones.slice(0, 3)) % 12, H.at(s, s.r()), 0.28, s.r() * 1.4 - 0.7, 3);
  },
  combat(s) {
    const I = s.I, b = H.bassNote(s, -1);
    for (let k = 0; k < 2; k++) I.pluck(b, H.at(s, k * 0.5), s.beat === 0 && k === 0 ? 0.38 : 0.24, 0, false, 0.25);
    I.drum('click', H.at(s, 0.5), 0.12, 0.35);
    if (s.beat === 0) I.drum('tom', s.t, 0.4, 0, 0.85);
    if (s.beat === 2) I.drum('tom', H.at(s, 0.5), 0.25, 0.2, 0.95);
    stringsChord(s, 57, 0.38, { trem: 6, cut: 1400 });
  },
};

const sugar: TrackDef = {
  id: 'sugar', bpm: 84, meter: 4, key: 67, scale: SCALE.lydian, gain: 1, reverb: 0.3, echo: 0.1, echoBeats: 0.5,
  form: [
    { name: 'A', bars: 8, chords: ['0M7', '2M/0', '0M7', '2M/0', '9m7', '8M7', '11m7', '8aug'], mel: GLITTER },
    { name: 'B', bars: 8, chords: ['4m7', '0M7', '9m7', '2M', '8M7#11', '3M', '2sus4', '2M'] },
  ],
  loopFrom: 0,
  explore(s) {
    const I = s.I, v = voice(s.ch, s.def.key, 79, 4), seq = [0, 1, 2, 1, 2, 3, 2, 4];
    for (let k = 0; k < 4; k++) {   // 16ths grouped 3+3+2: lopsided glitter
      const i = (s.beat % 2) * 4 + k, acc = i === 0 || i === 3 || i === 6, idx = seq[i];
      I.box(idx === 4 ? v[0] + 12 : v[idx], H.at(s, k * 0.25), acc ? 0.3 : 0.16, (i / 7) * 1.0 - 0.5, 0.55);
    }
    padChord(s, 72, 0.42, { wave: 'triangle', cut: 2600, atk: 1.2, wobble: 9 });
    if (s.beat === 0) I.piano(H.bassNote(s, -2), s.t, barLen(s), 0.36, -0.2);
    if (s.sec.name === 'A') H.melody(s, (m, t, d, v2) => I.piano(m, t, d, v2, 0.1), 0, 0.5);
    if (s.sec.name === 'B' && s.beat === 2) { const w = voice(s.ch, s.def.key, 60, 3); I.piano(w[0], s.t, s.spb * 2, 0.22, -0.1); I.piano(w[2], s.t + 0.02, s.spb * 2, 0.2, -0.1); }
  },
  combat(s) {
    const I = s.I;
    for (let k = 0; k < 4; k++) { const i = (s.beat % 2) * 4 + k, acc = i === 0 || i === 3 || i === 6; I.drum('shaker', H.at(s, k * 0.25), acc ? 0.18 : 0.08, 0.3); }
    if (s.beat === 0) I.drum('kick', s.t, 0.45);
    if (s.beat === 1) I.drum('kick', H.at(s, 0.5), 0.35);
    if (s.beat === 3) I.drum('kick', s.t, 0.38);
    if (s.beat === 1 || s.beat === 3) I.drum('click', s.t, 0.16, -0.25);
    const b = H.bassNote(s, -2);
    for (let k = 0; k < 2; k++) I.pluck(b + (k ? 12 : 0), H.at(s, k * 0.5), 0.3, -0.1, false, 0.22);
    stringsChord(s, 64, 0.36, { trem: 9, cut: 2200 });
  },
};

const calculus: TrackDef = {
  id: 'calculus', bpm: 46, meter: 4, key: 60, scale: SCALE.phrygian, gain: 1, reverb: 0.42, echo: 0.08, echoBeats: 1.5,
  form: [
    { name: 'A', bars: 8, chords: ['0m', '0m', '1M/0', '1M/0', '8M/0', '8M/0', '7dim', '7dim'], mel: DESCENT },
    { name: 'B', bars: 8, chords: ['0m', '0m', '5m', '5m', '1M7', '1M7', '7sus4', '7M'] },
  ],
  loopFrom: 0,
  explore(s) {
    const I = s.I;
    if (s.beat === 0 && s.barInSec === 0) { I.drone(s.def.key - 36, s.t, secLen(s), 0.6, 4); I.drone(s.def.key - 24, s.t, secLen(s), 0.38, 4); I.drone(s.def.key - 17, s.t, secLen(s), 0.16, 5); }
    if (s.beat === 0 && s.newChord) {
      const v = voice(s.ch, s.def.key, 48, 3);
      I.piano(H.bassNote(s, -2), s.t, barLen(s) * 2, 0.42, -0.1);
      v.forEach((m, i) => I.piano(m, s.t + 0.03 * i, barLen(s) * 2, 0.24, 0));
    }
    padChord(s, 52, 0.55, { cut: 520, atk: 3, rel: 3 });
    if (s.sec.name === 'A') H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.15), -1, 0.5);
    if (s.r() < 0.06) I.chime(s.def.key + H.pick(s, [6, 12, 18]), H.at(s, s.r()), 0.26, s.r() * 1.2 - 0.6, 3.5);
  },
  combat(s) {
    const I = s.I, b = H.bassNote(s, -2);
    if (s.beat === 0) { I.drum('kick', s.t, 0.5); I.drum('tom', s.t, 0.5, 0, 0.7); }
    if (s.beat === 2) I.drum('tom', H.at(s, 0.5), 0.32, -0.2, 0.75);
    if (s.beat === 3) I.drum('tom', s.t, 0.42, 0.2, 0.7);
    if (s.beat === 3 && s.barInSec % 4 === 3) for (let k = 1; k < 4; k++) I.drum('frame', H.at(s, k * 0.25), 0.12 + k * 0.05, 0, 0.8);
    for (let k = 0; k < 2; k++) I.bass(b, H.at(s, k * 0.5), s.spb * 0.4, k ? 0.32 : 0.45);
    stringsChord(s, 45, 0.45, { trem: 7, cut: 900 });
  },
};

// Boss: the theme at half speed in the dark minor, over a driving 3+3+2 pizzicato.
const BOSS_THEME = stretch(THEME, 2, 4);
const boss: TrackDef = {
  id: 'boss', bpm: 132, meter: 4, key: 62, scale: SCALE.darkMinor, gain: 1, reverb: 0.24, echo: 0.05, echoBeats: 0.75,
  form: [
    { name: 'intro', bars: 2, chords: ['0m', '1M'] },
    { name: 'A', bars: 16, chords: ['0m', '0m', '8M', '8M', '3aug', '3aug', '7M', '7dom', '0m', '0m', '5m', '5m', '1M', '1M', '7dom', '0m'], mel: BOSS_THEME },
    { name: 'drive', bars: 8, chords: ['0m', '1M', '0m', '1M', '8M', '7M', '8M', '7dom'] },
  ],
  loopFrom: 1,
  explore(s) {
    const I = s.I, b = H.bassNote(s, -1), pat = [0, 0, 12, 0, 7, 0, 12, 1];
    for (let k = 0; k < 2; k++) {
      const i = s.beat * 2 + k, acc = i === 0 || i === 3 || i === 6;
      I.pluck(b + pat[i], H.at(s, k * 0.5), acc ? 0.42 : 0.26, -0.2, false, 0.2);
    }
    if (s.beat === 0) { I.piano(H.bassNote(s, -2), s.t, s.spb * 2, 0.45, 0); I.piano(H.bassNote(s, -1), s.t, s.spb * 2, 0.3, 0); }
    padChord(s, 57, 0.36, { cut: 900, atk: 0.6, rel: 1 });
    if (s.sec.name === 'A') {
      H.melody(s, (m, t, d, v) => I.lead(m, t, d * 0.95, v, 0.15), 0, 0.6);
      if (s.pass > 0) H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.1), -1, 0.3);
    }
    if (s.sec.name === 'drive' && s.beat === 0) {
      const v = voice(s.ch, s.def.key, 69, 3);
      I.piano(v[0], s.t, s.spb, 0.32, 0.2); I.piano(v[2], H.at(s, 0.5), s.spb, 0.26, 0.2);
      if (s.barInSec % 2 === 1) I.lead(v[2] + 12, H.at(s, 2), s.spb * 1.8, 0.35, 0.2);
    }
  },
  combat(s) {
    const I = s.I;
    if (s.beat === 0 || s.beat === 2) I.drum('kick', s.t, 0.6);
    if (s.beat === 3) I.drum('kick', H.at(s, 0.5), 0.35);
    if (s.beat === 1 || s.beat === 3) I.drum('tom', s.t, 0.3, 0.2, 1.1);
    I.drum('shaker', s.t, s.beat % 2 ? 0.1 : 0.16, 0.3); I.drum('shaker', H.at(s, 0.5), 0.09, 0.3);
    if (s.barInSec % 4 === 3 && s.beat >= 2) for (let k = 0; k < 4; k++) I.drum('frame', H.at(s, k * 0.25), 0.16 + (s.beat - 2) * 0.06 + k * 0.02, -0.2 + k * 0.1);
    stringsChord(s, 62, 0.4, { trem: 13, cut: 2400 });
    if (s.beat === 0 || s.beat === 2) I.bass(H.bassNote(s, -2), s.t, s.spb * 1.8, 0.42);
  },
};

const ending: TrackDef = {
  id: 'ending', bpm: 69, meter: 4, key: 62, scale: SCALE.ionian, gain: 1, reverb: 0.34, echo: 0.06, echoBeats: 0.75,
  form: [
    { name: 'intro', bars: 2, chords: ['0add9', '5M7'] },
    { name: 'A', bars: 8, chords: ['0M', '9m7', '4m', '7dom', '0M', '5M', '7M', '0add9'], mel: THEME },
    { name: 'B', bars: 8, chords: ['5M7', '4m7', '2m7', '7sus4', '5M', '4m', '11m7', '7dom'], mel: [...THEME_B.slice(0, 7), [[0, 6, 2], [2, 4, 2]]] },
    { name: 'A2', bars: 8, chords: ['0M', '9m7', '4m', '7dom', '0M', '5M', '7M', '0add9'], mel: THEME },
    { name: 'coda', bars: 4, chords: ['5M7', '0add9', '5M7', '0add9'] },
  ],
  loopFrom: 1,
  explore(s) {
    const I = s.I, n = s.sec.name;
    padChord(s, 62, 0.45, { wave: 'triangle', cut: 2200, atk: 1.5 });
    if (n !== 'coda') brokenChord(s, 57, 0.22);
    if (n === 'A') H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.1), 0, 0.6);
    if (n === 'B') { H.melody(s, (m, t, d, v) => I.lead(m, t, d * 0.95, v, 0.15), 0, 0.42); if (s.beat === 1 || s.beat === 3) sparkle(s, 0.4, 86, 0.3); }
    if (n === 'A2') { H.melody(s, (m, t, d, v) => I.piano(m, t, d, v, 0.1), 0, 0.6); H.melody(s, (m, t, _d, v) => I.box(m, t, v, 0.35), 1, 0.3); }
    if (n === 'coda' || n === 'intro') {
      const v = voice(s.ch, s.def.key, 69, 4);
      for (let k = 0; k < 2; k++) I.pluck(v[(s.beat * 2 + k) % v.length] + (s.beat >= 2 ? 12 : 0), H.at(s, k * 0.5), 0.24, 0.3, true, 1);
      if (s.beat === 0) I.piano(H.bassNote(s, -2), s.t, barLen(s), 0.35, -0.2);
    }
  },
  combat(s) {
    const I = s.I;
    stringsChord(s, 57, 0.4, { cut: 2400, atk: 0.8 }, 4);
    if (s.beat === 0) I.drum('tom', s.t, 0.3, 0, 0.8);
    const v = voice(s.ch, s.def.key, 74, 4);
    for (let k = 0; k < 4; k++) I.pluck(v[(s.beat * 4 + k) % v.length], H.at(s, k * 0.25), 0.16, 0.35, true, 0.5);
  },
};

export const TRACKS: Record<string, TrackDef> = { title, crown, gumline, narrows, sugar, calculus, boss, ending };
