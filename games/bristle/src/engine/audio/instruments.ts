// Chamber/ambient instruments for the score. Each note builds a handful of nodes, schedules its envelope and
// stops its sources after the release, so nodes are collected as soon as they fall silent. Shared pieces are
// pooled per stem: one panner per stereo position and the percussion one-shots generated once in dsp.ts.
import { mtof, type Bank } from './dsp';

const PANS = [-0.55, -0.25, 0, 0.25, 0.55];
export interface PadOpts { wave?: OscillatorType; cut?: number; atk?: number; rel?: number; pan?: number; wobble?: number }
export interface StringOpts { trem?: number; cut?: number; atk?: number; pan?: number }

export class Instruments {
  private pans: StereoPannerNode[];
  constructor(readonly c: BaseAudioContext, readonly bank: Bank, readonly out: AudioNode) {
    this.pans = PANS.map((p) => { const n = c.createStereoPanner(); n.pan.value = p; n.connect(out); return n; });
  }
  /** Nearest pooled panner for a pan position -1..1. */
  private at(pan = 0) { let best = 2, bi = 0; PANS.forEach((p, i) => { const d = Math.abs(p - pan); if (d < best) { best = d; bi = i; } }); return this.pans[bi]; }
  dispose() { for (const p of this.pans) p.disconnect(); }

  /** Soft felt piano: triangle + octave sine through a lowpass that closes like a felt hammer. */
  piano(m: number, t: number, dur: number, vel: number, pan = 0) {
    const c = this.c, f = mtof(m), o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), lp = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2.001;
    g2.gain.setValueAtTime(0.35, t); g2.gain.setTargetAtTime(0, t, 0.25);
    lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(Math.min(9000, f * 3 + 900 + vel * 1600), t); lp.frequency.setTargetAtTime(Math.min(4000, f * 1.6 + 200), t + 0.01, 0.35);
    const tau = Math.max(0.35, Math.min(1.6, 1.5 - (m - 48) * 0.03)), off = t + Math.max(dur, 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.006);
    g.gain.setTargetAtTime(vel * 0.18, t + 0.006, tau * 0.35); g.gain.setTargetAtTime(0, t + 0.3, tau);
    g.gain.setTargetAtTime(0, off, 0.14);   // damper
    const end = Math.min(off + 0.8, t + 0.3 + tau * 6);
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.at(pan));
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
    // hammer
    const h = c.createBufferSource(), hg = c.createGain(); h.buffer = this.bank.thump; h.playbackRate.value = 0.8 + (m - 48) / 80; hg.gain.value = vel * 0.06;
    h.connect(hg); hg.connect(this.at(pan)); h.start(t);
  }

  /** Plucked string (harp / pizzicato): bright saw + sine body, lowpass snaps shut. `soft` = harp, else pizz. */
  pluck(m: number, t: number, vel: number, pan = 0, soft = true, decay = 0.45) {
    const c = this.c, f = mtof(m), o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o1.type = soft ? 'triangle' : 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(Math.min(10000, f * (soft ? 5 : 7)), t); lp.frequency.setTargetAtTime(f * 1.3, t, 0.06);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.45, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, decay * 0.3);
    const end = t + decay * 1.6 + 0.05;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.at(pan));
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  }

  /** Glassy music box: FM tine (ratio 4) with a short inharmonic shimmer partial. */
  box(m: number, t: number, vel: number, pan = 0, decay = 1.2) {
    const c = this.c, f = mtof(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), sh = c.createOscillator(), sg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 4; sh.frequency.value = f * 5.43;
    mg.gain.setValueAtTime(f * 1.1, t); mg.gain.setTargetAtTime(0, t, 0.08);
    sg.gain.setValueAtTime(vel * 0.06, t); sg.gain.setTargetAtTime(0, t, 0.05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.3, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, decay * 0.25);
    const end = t + decay * 1.3;
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); sh.connect(sg); sg.connect(g); g.connect(this.at(pan));
    for (const o of [car, mod, sh]) { o.start(t); o.stop(end); }
  }

  /** Deeper chime (bell partials, ratio 3.5): for distant tolls. */
  chime(m: number, t: number, vel: number, pan = 0, decay = 2.5) {
    const c = this.c, f = mtof(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.setTargetAtTime(f * 0.1, t, 0.3);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.25, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, decay * 0.22);
    const end = t + decay * 1.2;
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(this.at(pan));
    car.start(t); mod.start(t); car.stop(end); mod.stop(end);
  }

  /** Warm pad: two detuned oscillators per note into one lowpass and one slow envelope. */
  pad(ms: number[], t: number, dur: number, vel: number, o: PadOpts = {}) {
    const c = this.c, lp = c.createBiquadFilter(), g = c.createGain(), atk = o.atk ?? 1.2, rel = o.rel ?? 1.6, cut = o.cut ?? 1100;
    lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(cut * 0.45, t); lp.frequency.linearRampToValueAtTime(cut, t + atk); lp.frequency.setTargetAtTime(cut * 0.6, t + dur, rel * 0.4);
    const peak = (vel * 0.22) / Math.sqrt(ms.length);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.setValueAtTime(peak, t + Math.max(atk, dur)); g.gain.setTargetAtTime(0, t + Math.max(atk, dur), rel * 0.3);
    const end = t + Math.max(atk, dur) + rel * 1.6;
    let wob: OscillatorNode | null = null, wg: GainNode | null = null;
    if (o.wobble) { wob = c.createOscillator(); wg = c.createGain(); wob.frequency.value = 0.23; wg.gain.value = o.wobble; wob.connect(wg); wob.start(t); wob.stop(end); }
    for (const m of ms) for (const det of [-7, 6]) {
      const osc = c.createOscillator(); osc.type = o.wave ?? 'sawtooth'; osc.frequency.value = mtof(m); osc.detune.value = det;
      if (wg) wg.connect(osc.detune);
      osc.connect(lp); osc.start(t); osc.stop(end);
    }
    lp.connect(g); g.connect(this.at(o.pan ?? 0));
  }

  /** Bowed strings: saw pair with delayed vibrato; `trem` adds a soft tremolo (combat). */
  strings(ms: number[], t: number, dur: number, vel: number, o: StringOpts = {}) {
    const c = this.c, lp = c.createBiquadFilter(), g = c.createGain(), atk = o.atk ?? 0.35, rel = 0.6;
    lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = o.cut ?? 1800;
    const peak = (vel * 0.2) / Math.sqrt(ms.length);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.setValueAtTime(peak, t + Math.max(atk, dur)); g.gain.setTargetAtTime(0, t + Math.max(atk, dur), rel * 0.3);
    const end = t + Math.max(atk, dur) + rel * 1.7;
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(9, t + 0.6); vib.connect(vg); vib.start(t); vib.stop(end);
    for (const m of ms) for (const det of [-5, 5]) {
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = mtof(m); osc.detune.value = det; vg.connect(osc.detune); osc.connect(lp); osc.start(t); osc.stop(end);
    }
    if (o.trem) {
      const tg = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      tg.gain.value = 0.6; lfo.frequency.value = o.trem; lg.gain.value = 0.4; lfo.connect(lg); lg.connect(tg.gain); lfo.start(t); lfo.stop(end);
      lp.connect(tg); tg.connect(g);
    } else lp.connect(g);
    g.connect(this.at(o.pan ?? 0));
  }

  /** Low drone: sine + soft triangle octave, very slow swell. */
  drone(m: number, t: number, dur: number, vel: number, atk = 2.5) {
    const c = this.c, f = mtof(m), o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), g = c.createGain();
    o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2; o2.detune.value = 4; g2.gain.value = 0.35;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.4, t + atk); g.gain.setValueAtTime(vel * 0.4, t + Math.max(atk, dur)); g.gain.setTargetAtTime(0, t + Math.max(atk, dur), 0.9);
    const end = t + Math.max(atk, dur) + 5;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.at(0));
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  }

  /** Round bass: sine + triangle, short or held. */
  bass(m: number, t: number, dur: number, vel: number) {
    const c = this.c, f = mtof(m), o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), g = c.createGain();
    o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f; g2.gain.value = 0.3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.008); g.gain.setTargetAtTime(vel * 0.3, t + 0.008, 0.15); g.gain.setTargetAtTime(0, t + dur, 0.06);
    const end = t + dur + 0.4;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.at(0));
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  }

  /** Bowed lead line: one legato note with vibrato (boss theme). */
  lead(m: number, t: number, dur: number, vel: number, pan = 0) {
    const c = this.c, f = mtof(m), o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 3;
    lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.setValueAtTime(f * 2, t); lp.frequency.linearRampToValueAtTime(Math.min(5000, f * 4.5), t + 0.15);
    vib.frequency.value = 5.4; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(12, t + 0.35); vib.connect(vg); vg.connect(o1.detune); vg.connect(o2.detune);
    const off = t + Math.max(0.1, dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.2, t + 0.07); g.gain.setValueAtTime(vel * 0.2, off); g.gain.setTargetAtTime(0, off, 0.12);
    const end = off + 0.7;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.at(pan));
    for (const o of [o1, o2, vib]) { o.start(t); o.stop(end); }
  }

  /** Wind: filtered pink noise breathing over `dur` seconds. */
  wind(t: number, dur: number, vel: number, f1: number, f2: number) {
    const c = this.c, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.bank.pink; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(f1, t); bp.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(f1 * 0.8, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + dur * 0.45); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.at(Math.random() - 0.5));
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  /** Percussion one-shot from the pooled buffers. */
  drum(kind: 'kick' | 'tom' | 'frame' | 'shaker' | 'click', t: number, vel: number, pan = 0, rate = 1) {
    const c = this.c, src = c.createBufferSource(), g = c.createGain();
    src.buffer = this.bank[kind]; src.playbackRate.value = rate * (0.97 + Math.random() * 0.06); g.gain.value = vel;
    src.connect(g); g.connect(this.at(pan)); src.start(t);
  }
}
