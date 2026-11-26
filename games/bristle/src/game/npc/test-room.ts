// Test hall for the NPC/UI work: all three NPCs, a fountain and a lore stone. Registered only with ?test.
import { register } from '../registry';
import type { Game } from '../types';

export function registerTestRoom() {
  register.biome({
    id: 'test-hall', name: 'Test Hall', ambient: '#4a5a80', music: 'crown',
    terrain: { base: '#1b2a52', deep: '#0d1736', edge: '#2c4377', rim: '#7f9bd0', top: '#c9d6ee', slab: '#b9c7e3' },
    drawBack(ctx: CanvasRenderingContext2D, g: Game) {
      const w = ctx.canvas.width, h = ctx.canvas.height, grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0b1a40'); grd.addColorStop(1, '#050b1f'); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      g.cam.apply(ctx, 0.4); ctx.fillStyle = '#12224a';
      for (let i = -6; i < 24; i++) { const x = i * 180, hh = 260 + ((i * 97) % 5) * 50; ctx.beginPath(); ctx.ellipse(x, 640 - hh / 3, 60, hh, 0, 0, Math.PI * 2); ctx.fill(); }
    },
  });
  register.room({
    id: 'test-hall', biome: 'test-hall', title: 'Test Hall', subtitle: 'For testing',
    doors: {},
    map: [
      '##################################################',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#................................................#',
      '#...@....S.......................................#',
      '##################################################',
      '##################################################',
    ],
    objects: [
      { type: 'npc', id: 'mira', x: 14, y: 12 },
      { type: 'npc', id: 'pip', x: 24, y: 12 },
      { type: 'npc', id: 'warden', x: 36, y: 12 },
      { type: 'lore', x: 44, y: 12, text: 'A test stone. It says nothing of note, very politely.' },
    ],
  });
}
