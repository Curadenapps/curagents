// BRISTLE audio: mixer, spatial SFX bank and the generative score, all synthesised live with Web Audio.
//
// Mixer
//   voice -> panner -> sfxBus(sfx vol) ------------------------------\
//                   \-> send(area wet x distance) -> sfxRev(sfx vol) -> reverb (generated cave IR)
//   track -> musicIn -> duck (pause lowpass) -> musicVol -> pre      |        |
//                                       \-> musicRev, musicEcho (per-track levels) -> ping-pong echo
//   pre -> glue compressor -> limiter -> soft clip (<= 0.965) -> master vol -> destination
//
// Nothing is created before unlock() (browser autoplay rules). sfx() before unlock and unknown names do nothing.
// Tests can inject an OfflineAudioContext: new Audio({ context }), then call tick() to drive the scheduler.
import type { AudioApi, Game, SfxOpts } from '../game/types';
import { makeBank, softClipCurve, clamp, type Bank } from './audio/dsp';
import { SFX, CAP, TRIM, JITTER } from './audio/sfx';
import { TrackPlayer } from './audio/score';
import { TRACKS } from './audio/tracks';

const LOOKAHEAD = 0.22;      // seconds of music scheduled ahead
const TICK_MS = 50;
const FADE = 2;              // music crossfade, seconds
const SFX_LEVEL = 0.5;       // headroom for layered voices
/** Reverb send per area for SFX (the music carries its own). */
const AREA_WET: Record<string, number> = { crown: 0.16, gumline: 0.24, narrows: 0.38, sugar: 0.2, calculus: 0.32 };

interface Voice { g: GainNode; p: StereoPannerNode; send: GainNode; end: number; start: number }

export interface AudioOptions { context?: BaseAudioContext }

export class Audio implements AudioApi {
  private ctx: BaseAudioContext | null = null;
  private readonly injected: BaseAudioContext | null;
  private realtime = true;
  private bank!: Bank;
  // buses
  private master!: GainNode; private sfxBus!: GainNode; private sfxRev!: GainNode;
  private musicIn!: GainNode; private duck!: BiquadFilterNode; private duckGain!: GainNode; private musicVol!: GainNode;
  private musicRev!: GainNode; private musicEcho!: GainNode; private revIn!: GainNode; private echoIn!: GainNode;
  private delays: DelayNode[] = [];
  private vol = { master: 0.8, music: 0.6, sfx: 0.9 };
  // sfx state
  private voices = new Map<string, Voice[]>();
  private graveyard: Voice[] = [];
  private lastSweep = 0;
  private cam = { known: false, x: 0, y: 0, w: 960, h: 544 };
  private wet = 0.22; private biome = '';
  // music state
  private want: string | null = null;
  private players: TrackPlayer[] = [];
  private current: TrackPlayer | null = null;
  private int = 0; private intApplied = -1;
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;

  constructor(opts: AudioOptions = {}) { this.injected = opts.context ?? null; }

  // ------------------------------------------------------------------ lifecycle
  unlock() {
    if (this.ctx) { const c = this.ctx as AudioContext; if (this.realtime && c.state === 'suspended' && !document.hidden) c.resume().catch(() => {}); return; }
    let c: BaseAudioContext;
    if (this.injected) { c = this.injected; this.realtime = typeof (c as AudioContext).resume === 'function' && !(typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext); }
    else {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
      try { c = new AC({ latencyHint: 'interactive' }); } catch { return; }
    }
    this.ctx = c; this.bank = makeBank(c);
    this.buildMixer(c);
    if (this.realtime) {
      const rc = c as AudioContext;
      if (rc.state === 'suspended') rc.resume().catch(() => {});
      this.timer = setInterval(() => this.tick(), TICK_MS);
      document.addEventListener('visibilitychange', () => { if (document.hidden) rc.suspend().catch(() => {}); else rc.resume().catch(() => {}); });
    }
    if (this.want) { const w = this.want; this.want = null; this.music(w); }
  }

  private buildMixer(c: BaseAudioContext) {
    const g = (v = 1) => { const n = c.createGain(); n.gain.value = v; return n; };
    this.master = g(this.vol.master); this.master.connect(c.destination);
    const shaperIn = g(0.5), shaper = c.createWaveShaper(); shaper.curve = softClipCurve(); shaper.oversample = 'none';
    // the shaper input is pre-scaled by 0.5 so its curve (absolute output values) covers peaks up to 2.0
    const shaperOut = g(1);
    shaperIn.connect(shaper); shaper.connect(shaperOut); shaperOut.connect(this.master);
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    limiter.connect(shaperIn);
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 12; glue.ratio.value = 2.2; glue.attack.value = 0.012; glue.release.value = 0.3;
    glue.connect(limiter);
    const pre = g(0.7); pre.connect(glue);

    // reverb
    this.revIn = g(1);
    const conv = c.createConvolver(); conv.normalize = true; conv.buffer = this.bank.ir;
    const revHP = c.createBiquadFilter(); revHP.type = 'highpass'; revHP.frequency.value = 140;
    const revRet = g(0.9);
    this.revIn.connect(revHP); revHP.connect(conv); conv.connect(revRet); revRet.connect(pre);
    // ping-pong echo
    this.echoIn = g(1);
    const dL = c.createDelay(2), dR = c.createDelay(2), lpL = c.createBiquadFilter(), lpR = c.createBiquadFilter(), fbL = g(0.36), fbR = g(0.36);
    lpL.type = lpR.type = 'lowpass'; lpL.frequency.value = lpR.frequency.value = 2600;
    dL.delayTime.value = dR.delayTime.value = 0.6;
    const pL = c.createStereoPanner(), pR = c.createStereoPanner(); pL.pan.value = -0.7; pR.pan.value = 0.7;
    const echoOut = g(1), echoRev = g(0.35);
    this.echoIn.connect(dL); dL.connect(lpL); lpL.connect(fbL); fbL.connect(dR); dR.connect(lpR); lpR.connect(fbR); fbR.connect(dL);
    dL.connect(pL); dR.connect(pR); pL.connect(echoOut); pR.connect(echoOut); echoOut.connect(pre); echoOut.connect(echoRev); echoRev.connect(this.revIn);
    this.delays = [dL, dR];

    // sfx
    this.sfxBus = g(this.vol.sfx); this.sfxBus.connect(pre);
    this.sfxRev = g(this.vol.sfx); this.sfxRev.connect(this.revIn);
    // music
    this.musicIn = g(1);
    this.duck = c.createBiquadFilter(); this.duck.type = 'lowpass'; this.duck.frequency.value = 20000; this.duck.Q.value = 0.5;
    this.duckGain = g(1);
    this.musicVol = g(this.vol.music);
    this.musicIn.connect(this.duck); this.duck.connect(this.duckGain); this.duckGain.connect(this.musicVol); this.musicVol.connect(pre);
    this.musicRev = g(0.3); this.musicVol.connect(this.musicRev); this.musicRev.connect(this.revIn);
    this.musicEcho = g(0); this.musicVol.connect(this.musicEcho); this.musicEcho.connect(this.echoIn);
  }

  private ready(): boolean {
    const c = this.ctx; if (!c) return false;
    return !this.realtime || c.state === 'running';
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.vol = { master: clamp(master, 0, 1), music: clamp(music, 0, 1), sfx: clamp(sfx, 0, 1) };
    const c = this.ctx; if (!c) return;
    const now = c.currentTime, set = (p: AudioParam, v: number) => { p.cancelScheduledValues(now); p.setTargetAtTime(v, now, 0.03); };
    set(this.master.gain, this.vol.master); set(this.musicVol.gain, this.vol.music); set(this.sfxBus.gain, this.vol.sfx); set(this.sfxRev.gain, this.vol.sfx);
  }

  // ------------------------------------------------------------------ sfx
  sfx(name: string, o: SfxOpts = {}) {
    const rec = SFX[name]; if (!rec || !this.ready()) return;
    const c = this.ctx!, now = c.currentTime;
    let pan = 0, att = 1, far = 0;
    if (o.x !== undefined && o.y !== undefined && this.cam.known) {
      const nx = (o.x - this.cam.x) / (this.cam.w * 0.5), ny = (o.y - this.cam.y) / (this.cam.h * 0.5);
      pan = clamp(nx * 0.7, -0.85, 0.85);
      const d = Math.hypot(nx, ny * 1.15);
      if (d > 1) { far = Math.min(1, d - 1); att = Math.pow(Math.max(0, 1 - (d - 1) * 0.6), 1.5); }
      if (att < 0.03) return;
    }
    if (now - this.lastSweep > 0.5) this.sweep(now);
    let list = this.voices.get(name); if (!list) { list = []; this.voices.set(name, list); }
    // voice limit: steal the oldest with a quick fade
    const cap = CAP[name] ?? 4;
    while (list.length >= cap) { const v = list.shift()!; v.g.gain.cancelScheduledValues(now); v.g.gain.setTargetAtTime(0, now, 0.012); v.end = now + 0.1; this.graveyard.push(v); }
    // the same sound twice in one frame: soften the second so stacks do not jump in level
    const last = list[list.length - 1];
    const stack = last && now - last.start < 0.02 ? 0.55 : 1;
    const level = (o.vol ?? 1) * (TRIM[name] ?? 1) * att * stack * SFX_LEVEL;
    const g = c.createGain(), p = c.createStereoPanner(), send = c.createGain();
    g.gain.value = level; p.pan.value = pan; send.gain.value = this.wet * (1 + far * 1.5);
    g.connect(p); p.connect(this.sfxBus); p.connect(send); send.connect(this.sfxRev);
    const j = JITTER[name] ?? 0.035, pitch = (o.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    const t = now + 0.004;
    let dur = 0.5;
    try { dur = rec({ c, t, out: g, p: pitch, r: Math.random, bank: this.bank, vol: o.vol ?? 1 }); } catch { /* never let a sound break the game */ }
    list.push({ g, p, send, end: t + dur + 0.15, start: now });
  }

  private sweep(now: number) {
    this.lastSweep = now;
    const drop = (v: Voice) => { v.g.disconnect(); v.p.disconnect(); v.send.disconnect(); };
    for (const [, list] of this.voices) for (let i = list.length - 1; i >= 0; i--) if (list[i].end < now) { drop(list[i]); list.splice(i, 1); }
    this.graveyard = this.graveyard.filter((v) => { if (v.end < now) { drop(v); return false; } return true; });
  }

  // ------------------------------------------------------------------ music
  music(track: string | null) {
    if (track === this.want) return;
    this.want = track;
    const c = this.ctx; if (!c) return;
    const now = c.currentTime;
    for (const p of this.players) if (p.stopAt === Infinity) p.fadeOut(now, FADE);
    this.current = null;
    const def = track ? TRACKS[track] : undefined;
    if (def) {
      const p = new TrackPlayer(c, this.bank, def, this.musicIn, now + 0.08);
      p.fadeIn(now, FADE); p.setIntensity(this.int, now);
      this.players.push(p); this.current = p; this.intApplied = this.int;
      const ramp = (a: AudioParam, v: number) => { a.cancelScheduledValues(now); a.setTargetAtTime(v, now, FADE / 3); };
      ramp(this.musicRev.gain, def.reverb); ramp(this.musicEcho.gain, def.echo);
      for (const d of this.delays) ramp(d.delayTime, Math.min(1.9, def.echoBeats * (60 / def.bpm)));
    }
    this.tick();
  }

  intensity(v: number) {
    this.int = clamp(v || 0, 0, 1);
    if (this.current && this.ctx && Math.abs(this.int - this.intApplied) > 0.01) { this.current.setIntensity(this.int, this.ctx.currentTime); this.intApplied = this.int; }
  }

  /** Schedule music up to the lookahead. Runs on a 50 ms interval and from update(); tests call it directly. */
  tick() {
    const c = this.ctx; if (!c) return;
    const now = c.currentTime; this.lastTick = now;
    for (let i = this.players.length - 1; i >= 0; i--) {
      const p = this.players[i];
      if (now > p.stopAt) { p.dispose(); this.players.splice(i, 1); continue; }
      p.schedule(now + LOOKAHEAD, now);
    }
    if (now - this.lastSweep > 0.5) this.sweep(now);
  }

  update(g: Game, _dt: number) {
    const cam = g.cam;
    if (cam) { this.cam.x = cam.x; this.cam.y = cam.y; const w = cam.viewW, h = cam.viewH; if (w > 0 && h > 0) { this.cam.w = w; this.cam.h = h; } this.cam.known = !!(g as any).room; }
    const c = this.ctx; if (!c) return;
    const biome: string = (g as any).room?.def?.biome ?? '';
    if (biome !== this.biome) { this.biome = biome; this.wet = AREA_WET[biome] ?? 0.22; }
    const paused = (g as any).state === 'paused';
    if (paused !== this.paused) {
      this.paused = paused; const now = c.currentTime;
      this.duck.frequency.cancelScheduledValues(now); this.duck.frequency.setTargetAtTime(paused ? 700 : 20000, now, paused ? 0.12 : 0.3);
      this.duckGain.gain.cancelScheduledValues(now); this.duckGain.gain.setTargetAtTime(paused ? 0.7 : 1, now, 0.15);
    }
    if (c.currentTime - this.lastTick > 0.03) this.tick();
  }

  /** Debug / test counters. */
  stats() { let v = 0; for (const [, l] of this.voices) v += l.length; return { players: this.players.length, voices: v + this.graveyard.length, track: this.want, time: this.ctx?.currentTime ?? 0 }; }
}
