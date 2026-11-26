// WORLD. Rooms are the world agent's work (rooms/). The five biomes below are interim art by the core
// so the areas read differently until the full biome art (parallax mouth anatomy) is finished.
import { register } from '../registry';
import type { Game } from '../types';
import { ROOMS } from './rooms/index';

interface Look { id: string; name: string; ambient: string; music: string; sky: [string, string]; far: string; mid: string;
  terrain: { base: string; deep: string; edge: string; rim: string; top: string; slab: string }; tint?: [number, number, number] }

const LOOKS: Look[] = [
  { id: 'crown', name: 'Crown Gate', ambient: '#566a96', music: 'crown', sky: ['#0d1d48', '#050b1f'], far: '#14285a', mid: '#1c3570',
    terrain: { base: '#cdd8ee', deep: '#7f92bd', edge: '#e6edf9', rim: '#ffffff', top: '#ffffff', slab: '#dfe7f6' } },
  { id: 'gumline', name: 'Gumline Hollows', ambient: '#6a4a68', music: 'gumline', sky: ['#3a0f33', '#14061a'], far: '#5a1849', mid: '#7a2463',
    terrain: { base: '#b8336f', deep: '#5e1239', edge: '#e0569a', rim: '#ffb3d9', top: '#f2e6f4', slab: '#f2e9f7' }, tint: [1.04, 0.98, 1.0] },
  { id: 'narrows', name: 'The Narrows', ambient: '#3c4a6c', music: 'narrows', sky: ['#081433', '#02050f'], far: '#0f1f47', mid: '#18305f',
    terrain: { base: '#9fb0d4', deep: '#41507a', edge: '#c9d6ee', rim: '#eef3fb', top: '#ffffff', slab: '#d9e2f2' } },
  { id: 'sugar', name: 'Sugar Wastes', ambient: '#6e5a5a', music: 'sugar', sky: ['#3d1a12', '#120607'], far: '#5a2617', mid: '#7a3a1c',
    terrain: { base: '#e9c7a8', deep: '#8f5a3c', edge: '#f6dcc4', rim: '#fff4e6', top: '#fff1e2', slab: '#f7e6d6' }, tint: [1.05, 1.0, 0.95] },
  { id: 'calculus', name: 'Calculus Deep', ambient: '#45444c', music: 'calculus', sky: ['#17161b', '#060608'], far: '#24232b', mid: '#33313a',
    terrain: { base: '#a89f88', deep: '#4b463b', edge: '#d8cfb8', rim: '#eee6d2', top: '#e6dcc4', slab: '#d8cfb8' }, tint: [1.0, 0.98, 0.95] },
];

for (const L of LOOKS) {
  const cache: { key: string; cv: HTMLCanvasElement | null } = { key: '', cv: null };
  register.biome({
    id: L.id, name: L.name, ambient: L.ambient, music: L.music, terrain: L.terrain,
    grade: L.tint ? { tint: L.tint } : undefined,
    drawBack(ctx: CanvasRenderingContext2D, g: Game) {
      const w = ctx.canvas.width, h = ctx.canvas.height, key = w + 'x' + h;
      if (cache.key !== key) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d')!; const grd = c.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, L.sky[0]); grd.addColorStop(1, L.sky[1]); c.fillStyle = grd; c.fillRect(0, 0, w, h); cache.cv = cv; cache.key = key; }
      ctx.drawImage(cache.cv!, 0, 0);
      // far: a row of giant teeth; mid: gum folds
      g.cam.apply(ctx, 0.3); ctx.fillStyle = L.far;
      for (let i = -12; i < 40; i++) { const x = i * 190, hh = 220 + ((i * 37) % 4) * 50, y = 520; ctx.beginPath(); ctx.moveTo(x - 70, y + 300); ctx.lineTo(x - 70, y - hh + 60); ctx.quadraticCurveTo(x - 60, y - hh, x - 30, y - hh + 14); ctx.quadraticCurveTo(x, y - hh - 8, x + 30, y - hh + 14); ctx.quadraticCurveTo(x + 60, y - hh, x + 70, y - hh + 60); ctx.lineTo(x + 70, y + 300); ctx.fill(); }
      g.cam.apply(ctx, 0.55); ctx.fillStyle = L.mid;
      for (let i = -10; i < 40; i++) { const x = i * 260 + 90, y = 760 + ((i * 53) % 3) * 30; ctx.beginPath(); ctx.ellipse(x, y, 180, 90, 0, 0, Math.PI * 2); ctx.fill(); }
    },
  });
}
// The placeholder 'default' biome stays as a fallback for rooms with an unknown biome id.
ROOMS.forEach((r) => register.room(r));
