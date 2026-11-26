// WORLD. Rooms are the world agent's work (rooms/). The five biomes below are interim art by the core
// so the areas read differently until the full biome art (parallax mouth anatomy) is finished.
import { register } from '../registry';
import type { Game } from '../types';
import { ROOMS } from './rooms/index';

interface Look { id: string; name: string; ambient: string; music: string; sky: [string, string]; far: string; mid: string;
  terrain: { base: string; deep: string; edge: string; rim: string; top: string; slab: string }; tint?: [number, number, number] }

const LOOKS: Look[] = [
  { id: 'crown', name: 'Crown Gate', ambient: '#3e4c6e', music: 'crown', sky: ['#0a1636', '#040915'], far: '#0f1f45', mid: '#152a57',
    terrain: { base: '#6f7fa3', deep: '#2c3756', edge: '#93a3c6', rim: '#d9e3f5', top: '#c9d5ec', slab: '#a9b8d6' } },
  { id: 'gumline', name: 'Gumline Hollows', ambient: '#4e3650', music: 'gumline', sky: ['#260a22', '#0c0410'], far: '#3d1033', mid: '#541a46',
    terrain: { base: '#7a2650', deep: '#3a0e26', edge: '#9e3a6c', rim: '#e88ab8', top: '#d9b8cc', slab: '#cdb3c6' }, tint: [1.02, 0.98, 1.0] },
  { id: 'narrows', name: 'The Narrows', ambient: '#2f3a56', music: 'narrows', sky: ['#081433', '#02050f'], far: '#0f1f47', mid: '#18305f',
    terrain: { base: '#5d6c90', deep: '#232d4a', edge: '#7f8fb4', rim: '#c9d6ee', top: '#b9c7e3', slab: '#a3b2d1' } },
  { id: 'sugar', name: 'Sugar Wastes', ambient: '#4f4244', music: 'sugar', sky: ['#2a120c', '#0c0405'], far: '#3f1c12', mid: '#552a17',
    terrain: { base: '#8f6d58', deep: '#43291c', edge: '#b28a70', rim: '#ecd3bd', top: '#d9c1aa', slab: '#c9b29c' }, tint: [1.03, 1.0, 0.96] },
  { id: 'calculus', name: 'Calculus Deep', ambient: '#34333a', music: 'calculus', sky: ['#17161b', '#060608'], far: '#24232b', mid: '#33313a',
    terrain: { base: '#6f6a5c', deep: '#2b2822', edge: '#8f8874', rim: '#d8cfb8', top: '#c4baa3', slab: '#b3aa94' }, tint: [1.0, 0.98, 0.95] },
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
