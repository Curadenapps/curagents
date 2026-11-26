// WORLD (owned by the world agent): biomes and rooms. PLACEHOLDER content so the core runs.
import { register } from '../registry';
import type { Game } from '../types';

register.biome({
  id: 'default', name: 'Crown Gate', ambient: '#4a5a80', music: 'crown',
  terrain: { base: '#1b2a52', deep: '#0d1736', edge: '#2c4377', rim: '#7f9bd0', top: '#c9d6ee', slab: '#b9c7e3' },
  drawBack(ctx: CanvasRenderingContext2D, g: Game) {
    const w = ctx.canvas.width, h = ctx.canvas.height; const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0b1a40'); grd.addColorStop(1, '#050b1f'); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    g.cam.apply(ctx, 0.35); ctx.fillStyle = '#12224a';
    for (let i = -10; i < 30; i++) { const x = i * 220, hh = 300 + ((i * 97) % 5) * 60; ctx.beginPath(); ctx.ellipse(x, 300 - hh / 2 + 400, 70, hh, 0, 0, Math.PI * 2); ctx.fill(); }
  },
});

register.room({
  id: 'crown-gate', biome: 'default', title: 'Crown Gate', subtitle: 'The Smile',
  doors: {},
  map: [
    '##############################################################',
    '#............................................................#',
    '#............................................................#',
    '#............................................................#',
    '#.......................................====.................#',
    '#............................................................#',
    '#.............................====...........................#',
    '#...................................................PPP......#',
    '#....................................f..............PPP......#',
    '#..........=====.........########.........#####.....PPP......#',
    '#........................########...........................|#',
    '#.......................#########...........................|#',
    '#...@.......S...........#########.......f...................|#',
    '#######################################^^^^####################',
    '##############################################################',
  ],
  objects: [{ type: 'relic', x: 58, y: 12, ability: 'dash', title: 'Prime Dash', text: 'Press K or Shift to dash. You slip through interdental slits.' }],
});
