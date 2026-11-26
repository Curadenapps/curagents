// Placeholder synth so the core is playable. The audio agent replaces this file with the full score and SFX bank.
import type { AudioApi, Game, SfxOpts } from '../game/types';

export class Audio implements AudioApi {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private sfxBus!: GainNode; private musicBus!: GainNode;
  private vol = { master: 0.8, music: 0.6, sfx: 0.9 };
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master); this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.apply();
  }
  private apply() { if (!this.ctx) return; this.master.gain.value = this.vol.master; this.sfxBus.gain.value = this.vol.sfx; this.musicBus.gain.value = this.vol.music; }
  setVolumes(m: number, mu: number, s: number) { this.vol = { master: m, music: mu, sfx: s }; this.apply(); }
  sfx(name: string, o: SfxOpts = {}) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const t = c.currentTime, osc = c.createOscillator(), g = c.createGain(), p = o.pitch ?? 1, v = (o.vol ?? 1) * 0.15;
    const f: Record<string, [number, number, OscillatorType, number]> = { slash: [900, 300, 'sawtooth', 0.08], hit: [220, 80, 'square', 0.12], jump: [300, 520, 'triangle', 0.1], land: [140, 60, 'sine', 0.08], hurt: [180, 60, 'sawtooth', 0.3], dash: [600, 200, 'sawtooth', 0.15], shine: [1400, 1900, 'sine', 0.12] };
    const [a, b, type, dur] = f[name] || [500, 400, 'sine', 0.08];
    osc.type = type; osc.frequency.setValueAtTime(a * p, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, b * p), t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); osc.connect(g); g.connect(this.sfxBus); osc.start(t); osc.stop(t + dur + 0.02);
  }
  music(_track: string | null) {}
  intensity(_v: number) {}
  update(_g: Game, _dt: number) {}
}
