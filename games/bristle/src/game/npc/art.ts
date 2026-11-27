// Procedural NPC art. Each figure is drawn with its feet at (0,0), facing +x, in world units, so the same code
// draws the NPC in the room and, scaled up, its portrait in the dialogue box.
import { TAU } from '../../engine/math';

export interface Pose { t: number; f: 1 | -1; blink: number; talk: number; look: number }
/** Soft glow painter: the room passes the renderer's cached halo, the portrait a gradient. */
export type Glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) => void;

export interface NpcArt {
  accent: string;           // light colour around them
  height: number;           // for prompt placement
  portrait: { cx: number; cy: number; scale: number; bg: [string, string] };
  body(ctx: CanvasRenderingContext2D, p: Pose): void;
  glow(ctx: CanvasRenderingContext2D, p: Pose, halo: Glow): void;
}

export const gradientGlow: Glow = (ctx, x, y, r, color, a) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(0.35, color + '88'); g.addColorStop(1, color + '00');
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
};

const breathe = (t: number, k = 1.6) => Math.sin(t * k);

// ---------------------------------------------------------------- Derek, the hermit hygienist
// Tall hooded figure in a pale enamel robe and a deep-blue shawl, round spectacles glinting in the hood,
// leaning on a staff topped with a little round mirror.
const derek: NpcArt = {
  accent: '#8BB8E8', height: 66,
  portrait: { cx: 2, cy: -50, scale: 4.2, bg: ['#16336e', '#060d24'] },
  body(ctx, p) {
    const b = breathe(p.t), sway = Math.sin(p.t * 0.9) * 1.5;
    ctx.save(); ctx.scale(p.f, 1);
    // staff (behind)
    const sx = 15, tilt = 0.06 + Math.sin(p.t * 0.7) * 0.015;
    ctx.save(); ctx.translate(sx, 0); ctx.rotate(tilt);
    ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
    ctx.strokeStyle = '#8f7c66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-0.6, -4); ctx.lineTo(-0.6, -66); ctx.stroke();
    // mirror head: a little angled disc on a neck
    ctx.translate(0, -70); ctx.rotate(-0.5);
    ctx.strokeStyle = '#b7c3d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, -6); ctx.stroke();
    ctx.fillStyle = '#c9d4ea'; ctx.beginPath(); ctx.ellipse(8, -10, 7, 6, 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c79ad'; ctx.beginPath(); ctx.ellipse(8, -10, 5.2, 4.4, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
    // robe
    const hem = 0, hw = 17 + sway * 0.2;
    ctx.fillStyle = '#c3d0e8';
    ctx.beginPath(); ctx.moveTo(-hw, hem); ctx.quadraticCurveTo(-15, -26, -9, -44 - b); ctx.lineTo(9, -44 - b); ctx.quadraticCurveTo(14, -24, hw + 1, hem); ctx.quadraticCurveTo(0, 3 + sway * 0.4, -hw, hem); ctx.fill();
    ctx.fillStyle = '#93a6c9'; // fold shadows
    ctx.beginPath(); ctx.moveTo(-6, hem + 1); ctx.quadraticCurveTo(-4, -18, -2, -38 - b); ctx.lineTo(1, -38 - b); ctx.quadraticCurveTo(-1, -16, 2, hem + 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, hem + 1); ctx.quadraticCurveTo(10, -14, 7, -34 - b); ctx.lineTo(9, -34 - b); ctx.quadraticCurveTo(13, -14, 14, hem); ctx.fill();
    // hem trim
    ctx.strokeStyle = '#3b5fa3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-hw + 1, hem - 1); ctx.quadraticCurveTo(0, 2 + sway * 0.4, hw, hem - 1); ctx.stroke();
    // shawl over the shoulders
    ctx.fillStyle = '#1d3f80';
    ctx.beginPath(); ctx.moveTo(-14, -30 - b); ctx.quadraticCurveTo(-13, -46 - b, -6, -50 - b); ctx.lineTo(8, -50 - b); ctx.quadraticCurveTo(15, -44 - b, 15, -29 - b); ctx.quadraticCurveTo(4, -24 - b, -14, -30 - b); ctx.fill();
    // arm holding the staff
    ctx.fillStyle = '#c3d0e8'; ctx.beginPath(); ctx.ellipse(12, -30 - b, 4, 7, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8eef9'; ctx.beginPath(); ctx.arc(15, -25 - b, 2.6, 0, TAU); ctx.fill();
    // hood
    const hy = -58 - b * 1.2 + p.look * 1.5;
    ctx.fillStyle = '#1d3f80';
    ctx.beginPath(); ctx.moveTo(-11, -44 - b); ctx.quadraticCurveTo(-13, hy - 6, -2, hy - 11); ctx.quadraticCurveTo(10, hy - 12, 12, hy - 1); ctx.quadraticCurveTo(13, -46 - b, 9, -44 - b); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4f78c2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -46 - b); ctx.quadraticCurveTo(-10, hy - 5, -1, hy - 9); ctx.stroke();
    // face shadow inside the hood
    ctx.fillStyle = '#0a1530'; ctx.beginPath(); ctx.ellipse(3, hy + 1, 7, 8, 0.1, 0, TAU); ctx.fill();
    // spectacles (frames)
    ctx.strokeStyle = '#9fb3d8'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(1, hy, 2.6, 0, TAU); ctx.moveTo(9.4, hy); ctx.arc(7, hy, 2.4, 0, TAU); ctx.moveTo(3.6, hy); ctx.lineTo(4.6, hy); ctx.stroke();
    // a strand of grey hair escaping the hood
    ctx.strokeStyle = '#b8c2d6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, hy - 6); ctx.quadraticCurveTo(-6, hy + 2, -4, hy + 8); ctx.stroke();
    // mouth when talking
    if (p.talk > 0.05) { ctx.fillStyle = '#5c79ad'; ctx.beginPath(); ctx.ellipse(5, hy + 5.5, 1.6, 0.4 + p.talk * 1.1, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
  glow(ctx, p, halo) {
    const b = breathe(p.t), hy = -58 - b * 1.2 + p.look * 1.5;
    ctx.save(); ctx.scale(p.f, 1);
    const open = 1 - p.blink;
    ctx.fillStyle = '#d8ecff';
    if (open > 0.1) { ctx.beginPath(); ctx.ellipse(1, hy + 0.3, 1.1, 1.1 * open, 0, 0, TAU); ctx.ellipse(7, hy + 0.3, 1.1, 1.1 * open, 0, 0, TAU); ctx.fill(); }
    halo(ctx, 4, hy, 14, '#8BB8E8', 0.35);
    // the mirror catches light now and then
    const glint = Math.max(0, Math.sin(p.t * 0.8)) ** 8;
    ctx.save(); ctx.translate(15, 0); ctx.rotate(0.06 + Math.sin(p.t * 0.7) * 0.015); ctx.translate(0, -70); ctx.rotate(-0.5);
    halo(ctx, 8, -10, 16 + glint * 22, '#cfe4ff', 0.35 + glint * 0.6);
    ctx.fillStyle = `rgba(220,236,255,${0.25 + glint * 0.6})`; ctx.beginPath(); ctx.ellipse(6.5, -11.5, 2, 1.2, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Pip, the travelling merchant
// A little floss spool on stubby legs: two enamel flanges around a core wound with orchid thread, big eyes,
// a loose strand of floss for a scarf and a pack with a lantern on its back.
const PIP_THREAD = '#F277C6';
const pip: NpcArt = {
  accent: '#F277C6', height: 40,
  portrait: { cx: 0, cy: -20, scale: 5.6, bg: ['#5a1f4f', '#12071c'] },
  body(ctx, p) {
    const hop = Math.abs(Math.sin(p.t * 2.2)), lift = hop * 2.2, sq = 1 + (1 - hop) * 0.05;
    ctx.save(); ctx.scale(p.f, 1);
    // legs
    ctx.strokeStyle = '#2a1838'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -6 - lift); ctx.lineTo(-6, -0.5); ctx.moveTo(5, -6 - lift); ctx.lineTo(6, -0.5); ctx.stroke();
    ctx.fillStyle = '#2a1838'; ctx.beginPath(); ctx.ellipse(-6.5, -1, 3, 1.6, 0, 0, TAU); ctx.ellipse(6.5, -1, 3, 1.6, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -lift); ctx.scale(1 / sq, sq);
    // pack on the back
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.roundRect(-21, -31, 11, 17, 3); ctx.fill();
    ctx.fillStyle = '#8a6450'; ctx.fillRect(-21, -27, 11, 2.5);
    ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-16, -31); ctx.lineTo(-16, -38); ctx.stroke();
    ctx.fillStyle = '#C4D600'; ctx.beginPath(); ctx.roundRect(-18.5, -43, 5, 6, 1.5); ctx.fill(); // lantern
    // floss strand (scarf), swaying
    const sw = Math.sin(p.t * 2.6) * 4;
    ctx.strokeStyle = PIP_THREAD; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.bezierCurveTo(-16, -14 + sw * 0.3, -20, -8 + sw, -27, -10 + sw * 1.4); ctx.stroke();
    // spool: bottom flange, core, top flange
    ctx.fillStyle = '#cdd6e8'; ctx.beginPath(); ctx.ellipse(0, -7, 13, 3.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b06aa0'; ctx.beginPath(); ctx.roundRect(-10, -31, 20, 24, 4); ctx.fill();
    ctx.fillStyle = PIP_THREAD; ctx.beginPath(); ctx.roundRect(-10, -31, 20, 24, 4); ctx.fill();
    ctx.strokeStyle = '#c95aa6'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 7; i++) { const y = -28 + i * 3.2; ctx.beginPath(); ctx.moveTo(-10, y + 1); ctx.quadraticCurveTo(0, y - 0.5, 10, y + 1.2); ctx.stroke(); }
    ctx.fillStyle = '#e8eef9'; ctx.beginPath(); ctx.ellipse(0, -7, 13, 3.6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#e8eef9'; ctx.beginPath(); ctx.ellipse(0, -31.5, 13.5, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b9c5dc'; ctx.beginPath(); ctx.ellipse(0, -32.3, 4, 1.3, 0, 0, TAU); ctx.fill(); // spool hole
    // face on the thread
    const ex = 2.5 + p.look * 0.8, open = 1 - p.blink;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex - 4, -21, 3.4, 3.8 * Math.max(0.12, open), 0, 0, TAU); ctx.ellipse(ex + 4, -21, 3.4, 3.8 * Math.max(0.12, open), 0, 0, TAU); ctx.fill();
    if (open > 0.3) { ctx.fillStyle = '#1a0f24'; ctx.beginPath(); ctx.arc(ex - 3.2, -20.6, 1.8, 0, TAU); ctx.arc(ex + 4.8, -20.6, 1.8, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#E31C79'; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.ellipse(ex - 7.5, -16.5, 2, 1.1, 0, 0, TAU); ctx.ellipse(ex + 7.5, -16.5, 2, 1.1, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a1d4a'; ctx.beginPath();
    if (p.talk > 0.05) ctx.ellipse(ex, -15.5, 1.8, 0.6 + p.talk * 1.6, 0, 0, TAU); else { ctx.ellipse(ex, -16, 2, 1, 0, 0, Math.PI); }
    ctx.fill();
    ctx.restore();
  },
  glow(ctx, p, halo) {
    const hop = Math.abs(Math.sin(p.t * 2.2)), lift = hop * 2.2, flick = 0.85 + Math.sin(p.t * 9) * 0.08 + Math.sin(p.t * 23) * 0.05;
    ctx.save(); ctx.scale(p.f, 1); ctx.translate(0, -lift);
    halo(ctx, -16, -40, 26 * flick, '#C4D600', 0.55);
    ctx.fillStyle = '#f4ffb0'; ctx.beginPath(); ctx.arc(-16, -40, 1.6, 0, TAU); ctx.fill();
    const open = 1 - p.blink, ex = 2.5 + p.look * 0.8;
    if (open > 0.3) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex - 2.4, -21.6, 0.7, 0, TAU); ctx.arc(ex + 5.6, -21.6, 0.7, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- The Warden
// A tall, weary guard carved like a canine tooth: chipped ivory armour greyed by years, a pointed cusp helm
// with a dim amber visor slit, a crown-shaped tower shield, and a long pike he leans on.
const warden: NpcArt = {
  accent: '#FFB04A', height: 92,
  portrait: { cx: 4, cy: -70, scale: 3.4, bg: ['#3a2d1c', '#0a0705'] },
  body(ctx, p) {
    const b = breathe(p.t, 0.9) * 1.2, droop = Math.max(0, Math.sin(p.t * 0.23)) ** 6 * 3;
    ctx.save(); ctx.scale(p.f, 1);
    // pike (behind), leaning
    ctx.save(); ctx.translate(20, 0); ctx.rotate(-0.12);
    ctx.strokeStyle = '#4a3f33'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -104); ctx.stroke();
    ctx.fillStyle = '#b8ad98'; ctx.beginPath(); ctx.moveTo(0, -104); ctx.quadraticCurveTo(10, -112, 3, -126); ctx.quadraticCurveTo(-1, -115, -3, -104); ctx.fill();
    ctx.fillStyle = '#8f846f'; ctx.beginPath(); ctx.moveTo(-3, -106); ctx.quadraticCurveTo(-12, -110, -10, -98); ctx.quadraticCurveTo(-6, -101, -2, -100); ctx.fill();
    ctx.restore();
    // legs and greaves
    ctx.fillStyle = '#8a806c'; ctx.beginPath(); ctx.roundRect(-13, -26, 10, 26, 3); ctx.roundRect(3, -26, 10, 26, 3); ctx.fill();
    ctx.fillStyle = '#a69c86'; ctx.fillRect(-13, -14, 10, 3); ctx.fillRect(3, -14, 10, 3);
    // body: a tall tapering tooth
    ctx.fillStyle = '#c9bfa9';
    ctx.beginPath(); ctx.moveTo(-18, -24); ctx.quadraticCurveTo(-21, -56 - b, -14, -70 - b); ctx.lineTo(14, -70 - b); ctx.quadraticCurveTo(21, -56 - b, 18, -24); ctx.quadraticCurveTo(0, -19, -18, -24); ctx.fill();
    ctx.fillStyle = '#a79c86'; ctx.beginPath(); ctx.moveTo(6, -24); ctx.quadraticCurveTo(13, -48 - b, 10, -68 - b); ctx.lineTo(14, -70 - b); ctx.quadraticCurveTo(21, -56 - b, 18, -24); ctx.fill();
    // cracks and chips
    ctx.strokeStyle = '#7c715e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10, -62 - b); ctx.lineTo(-7, -55 - b); ctx.lineTo(-9, -48 - b); ctx.moveTo(4, -40 - b); ctx.lineTo(8, -35 - b); ctx.stroke();
    ctx.fillStyle = '#6f6553'; ctx.beginPath(); ctx.moveTo(-18, -34); ctx.lineTo(-15, -37); ctx.lineTo(-14, -31); ctx.fill();
    // belt
    ctx.fillStyle = '#4a3f33'; ctx.fillRect(-18, -31, 36, 4); ctx.fillStyle = '#b8ad98'; ctx.fillRect(-3, -32, 6, 6);
    // helm: pointed cusp, head drooping now and then
    ctx.save(); ctx.translate(0, -70 - b + droop); ctx.rotate(droop * 0.03);
    ctx.fillStyle = '#d6cdb8';
    ctx.beginPath(); ctx.moveTo(-13, 2); ctx.quadraticCurveTo(-15, -14, -6, -24); ctx.quadraticCurveTo(0, -34, 4, -24); ctx.quadraticCurveTo(15, -14, 13, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b3a891'; ctx.beginPath(); ctx.moveTo(4, -24); ctx.quadraticCurveTo(15, -14, 13, 2); ctx.lineTo(7, 2); ctx.quadraticCurveTo(9, -12, 2, -26); ctx.fill();
    ctx.fillStyle = '#16110b'; ctx.beginPath(); ctx.roundRect(-8, -11, 17, 3.6, 1.8); ctx.fill(); // visor slit
    ctx.strokeStyle = '#8a806c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-1, -30); ctx.lineTo(1, -23); ctx.stroke();
    ctx.restore();
    // shield: a crown-shaped tower shield, resting on the ground in front
    ctx.save(); ctx.translate(8, -4 + b * 0.2);
    ctx.fillStyle = '#b4aa94';
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-8, -40); ctx.quadraticCurveTo(-4, -46, 0, -41); ctx.quadraticCurveTo(5, -47, 10, -41); ctx.quadraticCurveTo(15, -46, 19, -40); ctx.lineTo(17, 4); ctx.quadraticCurveTo(6, 8, -6, 4); ctx.fill();
    ctx.strokeStyle = '#7c715e'; ctx.lineWidth = 1.4; ctx.stroke();
    // emblem: a little brush tuft, the Order's sign, worn
    ctx.fillStyle = '#8f846f'; ctx.fillRect(4.5, -30, 2.4, 22);
    ctx.fillStyle = '#d6cdb8'; for (let i = 0; i < 5; i++) ctx.fillRect(1.5 + i * 1.8, -36, 1.1, 7);
    ctx.restore();
    ctx.restore();
  },
  glow(ctx, p, halo) {
    const b = breathe(p.t, 0.9) * 1.2, droop = Math.max(0, Math.sin(p.t * 0.23)) ** 6 * 3, open = 1 - p.blink;
    ctx.save(); ctx.scale(p.f, 1); ctx.translate(0, -70 - b + droop);
    const a = (0.55 + Math.sin(p.t * 1.3) * 0.1) * Math.max(0.15, open);
    halo(ctx, 0.5, -9, 22, '#FF8200', a * 0.6);
    ctx.fillStyle = `rgba(255,190,110,${a})`; ctx.beginPath(); ctx.roundRect(-6, -10.4, 13, 2.2 * Math.max(0.3, open), 1); ctx.fill();
    ctx.restore();
  },
};

export const ART: Record<string, NpcArt> = { derek, pip, warden };
