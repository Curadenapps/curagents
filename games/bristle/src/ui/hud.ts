// In-play HUD on its own crisp canvas: enamel shards (health), the fluor vessel, shine, area titles, toasts.
import type { GameCore } from '../game/game';
import { TAU, clamp } from '../engine/math';

const FONT = '"Futura LT Pro", Futura, "Century Gothic", sans-serif';

export class Hud {
  cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  title: { text: string; sub: string; t: number } | null = null;
  toasts: { text: string; t: number; ms: number }[] = [];
  shown = { hp: 5, shine: 0, fluor: 0 }; hpFlash = 0; shineT = 0;
  constructor(cv: HTMLCanvasElement) { this.cv = cv; this.ctx = cv.getContext('2d')!; }
  areaTitle(text: string, sub = '') { this.title = { text, sub, t: 0 }; }
  toast(text: string, ms = 3800) { this.toasts.push({ text, t: 0, ms }); if (this.toasts.length > 3) this.toasts.shift(); }
  draw(g: GameCore, dt: number) {
    const cv = this.cv, pr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    const W = Math.round(r.width * pr), H = Math.round(r.height * pr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    if (g.state === 'title' || !g.player) return;
    const s = Math.max(0.7, Math.min(1.4, H / pr / 820)) * pr; c.setTransform(s, 0, 0, s, 0, 0);
    const p = g.player;
    if (p.hp < this.shown.hp) this.hpFlash = 0.5; this.hpFlash = Math.max(0, this.hpFlash - dt);
    this.shown.hp = p.hp; this.shown.fluor += (p.fluor - this.shown.fluor) * Math.min(1, dt * 8);
    if (g.save.shine !== this.shown.shine) { this.shineT = 1.2; this.shown.shine += Math.sign(g.save.shine - this.shown.shine) * Math.max(1, Math.round(Math.abs(g.save.shine - this.shown.shine) * dt * 6)); }
    this.shineT = Math.max(0, this.shineT - dt);
    const ox = 34, oy = 30;
    // vessel
    const vr = 30, vx = ox + vr, vy = oy + vr, lvl = this.shown.fluor / 99;
    c.save(); c.beginPath(); c.arc(vx, vy, vr, 0, TAU); c.fillStyle = 'rgba(6,14,36,0.85)'; c.fill(); c.clip();
    const wave = Math.sin(g.time * 3) * 2.5, top = vy + vr - lvl * vr * 2;
    c.fillStyle = '#8BB8E8'; c.beginPath(); c.moveTo(vx - vr, top + wave); c.quadraticCurveTo(vx, top - wave * 2, vx + vr, top + wave); c.lineTo(vx + vr, vy + vr); c.lineTo(vx - vr, vy + vr); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 4; i++) { const by = vy + vr - ((g.time * 18 + i * 17) % (lvl * vr * 2 + 1)); c.beginPath(); c.arc(vx - 12 + i * 8, by, 1.6, 0, TAU); c.fill(); }
    c.restore();
    c.lineWidth = 3; c.strokeStyle = '#E8EEF9'; c.beginPath(); c.arc(vx, vy, vr, 0, TAU); c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(139,184,232,0.8)'; c.beginPath(); c.arc(vx, vy, vr + 4, 0, TAU); c.stroke();
    if (p.fluor >= 33) { c.globalAlpha = 0.5 + 0.3 * Math.sin(g.time * 5); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.arc(vx, vy, vr + 7, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    // enamel shards (health)
    for (let i = 0; i < p.maxHp; i++) {
      const x = ox + vr * 2 + 22 + i * 30, y = oy + 18, full = i < p.hp;
      c.save(); c.translate(x, y);
      const shard = () => { c.beginPath(); c.moveTo(-9, -4); c.quadraticCurveTo(-10, -13, -4.5, -13); c.quadraticCurveTo(-2, -10, 0, -12); c.quadraticCurveTo(2, -10, 4.5, -13); c.quadraticCurveTo(10, -13, 9, -4); c.quadraticCurveTo(8, 6, 5, 12); c.quadraticCurveTo(3, 13, 1.5, 6); c.lineTo(-1.5, 6); c.quadraticCurveTo(-3, 13, -5, 12); c.quadraticCurveTo(-8, 6, -9, -4); c.closePath(); };
      shard();
      if (full) { c.fillStyle = '#F3F6FC'; c.fill(); c.fillStyle = 'rgba(139,184,232,0.55)'; c.beginPath(); c.ellipse(3, 2, 4, 7, 0.3, 0, TAU); c.fill(); }
      else { c.fillStyle = 'rgba(6,14,36,0.75)'; c.fill(); c.strokeStyle = 'rgba(200,214,240,0.45)'; c.lineWidth = 1.4; c.stroke(); }
      if (full && this.hpFlash > 0 && i === p.hp - 1) { /* last remaining shard pulses */ }
      c.restore();
    }
    if (this.hpFlash > 0) { const x = ox + vr * 2 + 22 + p.hp * 30, y = oy + 18; c.globalAlpha = this.hpFlash * 2; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 18 * (1 - this.hpFlash), 0, TAU); c.fill(); c.globalAlpha = 1; }
    // shine
    c.font = '400 20px ' + FONT; c.textBaseline = 'middle'; c.textAlign = 'left';
    const sx = ox + vr * 2 + 14, sy = oy + 50; c.fillStyle = '#FCE300'; c.beginPath(); c.moveTo(sx, sy - 7); c.lineTo(sx + 5, sy); c.lineTo(sx, sy + 7); c.lineTo(sx - 5, sy); c.fill();
    c.fillStyle = '#E8EEF9'; c.fillText(String(this.shown.shine), sx + 14, sy + 1);
    // area title
    const vw = r.width * pr / s, vh = r.height * pr / s;
    if (this.title) {
      const t = (this.title.t += dt), a = clamp(t / 0.8, 0, 1) * clamp((4.2 - t) / 0.9, 0, 1);
      if (t > 4.2) this.title = null; else {
        c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = '400 15px ' + FONT; c.fillText(this.title.sub.toUpperCase(), vw / 2, vh * 0.3 - 34);
        c.font = '400 46px ' + FONT; c.fillText(this.title.text.toUpperCase(), vw / 2, vh * 0.3); c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
        const w = 120 * clamp(t / 1.2, 0, 1); c.beginPath(); c.moveTo(vw / 2 - w, vh * 0.3 + 34); c.lineTo(vw / 2 + w, vh * 0.3 + 34); c.stroke(); c.globalAlpha = 1;
      }
    }
    // toasts
    c.textAlign = 'center'; c.font = '400 17px ' + FONT; let ty = vh - 70;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i]; t.t += dt * 1000; if (t.t > t.ms) { this.toasts.splice(i, 1); continue; }
      const a = clamp(t.t / 250, 0, 1) * clamp((t.ms - t.t) / 400, 0, 1); c.globalAlpha = a;
      const lines = wrap(c, t.text, Math.min(620, vw - 80)); const h = lines.length * 24 + 18;
      c.fillStyle = 'rgba(6,14,36,0.82)'; c.beginPath(); c.roundRect(vw / 2 - Math.min(660, vw - 40) / 2, ty - h, Math.min(660, vw - 40), h, 12); c.fill();
      c.fillStyle = '#E8EEF9'; lines.forEach((l, k) => c.fillText(l, vw / 2, ty - h + 21 + k * 24)); ty -= h + 10; c.globalAlpha = 1;
    }
  }
}
export function wrap(c: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
