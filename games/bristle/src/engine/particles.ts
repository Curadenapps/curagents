// Pooled particles. Lit particles draw into the scene (they catch the light map); emissive ones glow.
import { TAU } from './math';

export type Shape = 'dot' | 'streak' | 'ring' | 'square' | 'bubble';
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
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}
