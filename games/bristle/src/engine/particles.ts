// Pooled particles. Lit particles draw into the scene (they catch the light map); emissive ones glow.
import { TAU } from './math';

// Dental shapes: 'sparkle' the four-point clean-tooth glint, 'drop' a mouthwash droplet along its motion,
// 'bristle' a flicked filament with a bright tip, 'crumb' a loosened lump of plaque (never a splat).
export type Shape = 'dot' | 'streak' | 'ring' | 'square' | 'bubble' | 'sparkle' | 'drop' | 'bristle' | 'crumb';
export interface BurstOpts {
  n?: number; speed?: [number, number]; angle?: number; spread?: number; life?: [number, number];
  size?: [number, number]; color?: string | string[]; gravity?: number; drag?: number; shape?: Shape;
  emissive?: boolean; grow?: number; spin?: number; vx?: number; vy?: number;
}
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; g: number; drag: number; shape: Shape; em: boolean; grow: number; rot: number; spin: number }

export class Particles {
  list: P[] = [];
  private pool: P[] = [];
  max = 2200;
  burst(x: number, y: number, o: BurstOpts = {}) {
    const n = o.n ?? 10, sp = o.speed ?? [60, 220], ang = o.angle ?? 0, spread = o.spread ?? TAU, life = o.life ?? [0.3, 0.7], size = o.size ?? [1.5, 3.5];
    const cols = Array.isArray(o.color) ? o.color : [o.color ?? '#ffffff'];
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const p = this.pool.pop() ?? ({} as P);
      const a = ang + (Math.random() - 0.5) * spread, s = sp[0] + Math.random() * (sp[1] - sp[0]);
      p.x = x; p.y = y; p.vx = Math.cos(a) * s + (o.vx ?? 0); p.vy = Math.sin(a) * s + (o.vy ?? 0);
      p.max = p.life = life[0] + Math.random() * (life[1] - life[0]); p.size = size[0] + Math.random() * (size[1] - size[0]);
      p.color = cols[(Math.random() * cols.length) | 0]; p.g = o.gravity ?? 0; p.drag = o.drag ?? 2; p.shape = o.shape ?? 'dot'; p.em = o.emissive ?? false;
      p.grow = o.grow ?? 0; p.rot = Math.random() * TAU; p.spin = (Math.random() - 0.5) * (o.spin ?? 0);
      this.list.push(p);
    }
  }
  update(dt: number) {
    const L = this.list; let j = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.life -= dt;
      if (p.life <= 0) { this.pool.push(p); continue; }
      const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt; p.rot += p.spin * dt;
      L[j++] = p;
    }
    L.length = j;
  }
  draw(ctx: CanvasRenderingContext2D, emissive: boolean) {
    for (const p of this.list) {
      if (p.em !== emissive) continue;
      const k = p.life / p.max; ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = ctx.strokeStyle = p.color;
      const s = Math.max(0.1, p.size);
      if (p.shape === 'streak') { ctx.lineWidth = s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); }
      else if (p.shape === 'ring') { ctx.lineWidth = Math.max(0.5, s * 0.25 * k); ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke(); }
      else if (p.shape === 'bubble') { ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke(); ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(p.x - s * 0.3, p.y - s * 0.3, s * 0.3, 0, TAU); ctx.fill(); }
      else if (p.shape === 'square') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore(); }
      else if (p.shape === 'sparkle') { // swells then shrinks over its life, arms thin and long
        const r = s * (0.6 + 1.6 * Math.sin(Math.PI * k)), w = r * 0.22; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.15); ctx.beginPath();
        ctx.moveTo(0, -r); ctx.quadraticCurveTo(w, -w, r, 0); ctx.quadraticCurveTo(w, w, 0, r); ctx.quadraticCurveTo(-w, w, -r, 0); ctx.quadraticCurveTo(-w, -w, 0, -r); ctx.fill(); ctx.restore(); }
      else if (p.shape === 'drop') { // round belly trailing a point back along the velocity
        const a = Math.atan2(p.vy, p.vx), tl = s * (1.6 + Math.min(2.2, Math.hypot(p.vx, p.vy) / 160)); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.beginPath();
        ctx.arc(0, 0, s, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-tl * 0.4, s * 0.6, -tl, 0); ctx.quadraticCurveTo(-tl * 0.4, -s * 0.6, 0, -s); ctx.fill();
        ctx.globalAlpha *= 0.7; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.35, s * 0.28, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (p.shape === 'bristle') { // one filament: thin shaft spinning end over end, rounded bright tip
        const L = s * 4.5, ca = Math.cos(p.rot) * L * 0.5, sa = Math.sin(p.rot) * L * 0.5; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, s * 0.35);
        ctx.beginPath(); ctx.moveTo(p.x - ca, p.y - sa); ctx.lineTo(p.x + ca, p.y + sa); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(p.x + ca, p.y + sa, Math.max(0.5, s * 0.4), 0, TAU); ctx.fill(); }
      else if (p.shape === 'crumb') { // soft five-lobed lump, seeded by its spin so each crumb keeps its shape
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU, rr = s * (0.8 + 0.25 * Math.sin(i * 2.7 + p.max * 40)); const x2 = Math.cos(a) * rr, y2 = Math.sin(a) * rr; if (i) ctx.lineTo(x2, y2); else ctx.moveTo(x2, y2); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha *= 0.45; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.3, s * 0.3, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}
