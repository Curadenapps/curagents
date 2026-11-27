// Test arenas for the bestiary. Registered only when the URL has ?test (see index.ts), never in normal play.
//   ?test&room=test-bestiary      every creature in one long room
//   ?test&room=test-<char>        one creature (f s i t b l m r n, plus test-tc: a ceiling spitter)
//   ?test&room=test-boss&door=1   Mother Calculus behind G gates
import { register } from '../registry';
import type { Game } from '../types';

function testBiome() {
  register.biome({
    id: 'test-lab', name: 'Test Lab', ambient: '#4a5068', music: 'calculus',
    terrain: { base: '#3b372e', deep: '#1d1b16', edge: '#5d574a', rim: '#a89f88', top: '#d8cfb8', slab: '#bfb6a0' },
    drawBack(ctx: CanvasRenderingContext2D, g: Game) {
      const w = ctx.canvas.width, h = ctx.canvas.height, grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#1a1a22'); grd.addColorStop(1, '#0c0c10'); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      g.cam.apply(ctx, 0.4); ctx.fillStyle = '#24232a';
      for (let i = -10; i < 40; i++) { const x = i * 190, hh = 260 + ((i * 97) % 5) * 50; ctx.beginPath(); ctx.ellipse(x, 520 - hh / 3, 60, hh, 0, 0, Math.PI * 2); ctx.fill(); }
    },
  });
}

const W = 34;
const wall = '#'.repeat(W), open = '#' + '.'.repeat(W - 2) + '#';
/** A plain arena: player on the left, the creature at the given cell, a block to crawl around. */
function solo(id: string, place: [string, number, number][], extra: (rows: string[][]) => void = () => {}) {
  const rows = [wall, ...Array.from({ length: 12 }, () => open), wall, wall].map((r) => r.split(''));
  rows[12][4] = '@';
  extra(rows);
  for (const [ch, x, y] of place) rows[y][x] = ch;
  register.room({ id, biome: 'test-lab', map: rows.map((r) => r.join('')), doors: {}, title: id.toUpperCase(), subtitle: 'Bestiary test' });
}

export function registerTestRooms() {
  testBiome();
  const block = (rows: string[][]) => { for (let y = 8; y <= 9; y++) for (let x = 16; x <= 20; x++) rows[y][x] = '#'; };
  solo('test-f', [['f', 18, 12], ['f', 24, 12]]);
  solo('test-s', [['s', 18, 7], ['s', 14, 12]], (r) => { block(r); for (let x = 22; x <= 26; x++) r[5][x] = '#'; r[6][24] = 's'; });
  solo('test-i', [['i', 20, 6]]);
  solo('test-t', [['t', 20, 12], ['t', 28, 12]]);
  solo('test-tc', [['t', 14, 1]]);
  solo('test-b', [['b', 20, 12]]);
  solo('test-l', [['l', 14, 2], ['l', 22, 2]]);
  solo('test-m', [['m', 20, 7]]);
  solo('test-r', [['r', 18, 12], ['r', 26, 1]]);
  solo('test-n', [['n', 16, 12]]);

  // every creature in one long walk
  const L = 140, rows: string[][] = [];
  for (let y = 0; y < 15; y++) rows.push((y === 0 || y >= 13 ? '#'.repeat(L) : '#' + '.'.repeat(L - 2) + '#').split(''));
  rows[12][3] = '@'; rows[12][L - 1] = '1'; rows[11][L - 1] = '1';
  for (let y = 8; y <= 9; y++) for (let x = 40; x <= 44; x++) rows[y][x] = '#';
  const put: [string, number, number][] = [['f', 14, 12], ['f', 20, 12], ['s', 42, 7], ['i', 54, 6], ['t', 64, 12], ['t', 70, 1], ['b', 82, 12], ['l', 94, 2], ['m', 104, 7], ['r', 116, 12], ['n', 128, 12]];
  for (const [c, x, y] of put) rows[y][x] = c;
  register.room({ id: 'test-bestiary', biome: 'test-lab', map: rows.map((r) => r.join('')), doors: { '1': { to: 'test-boss', door: '1' } }, title: 'Bestiary', subtitle: 'Test hall' });

  // the boss arena: doors on both sides, gate cells G just inside them
  const B = 34, H = 17, arena: string[][] = [];
  for (let y = 0; y < H; y++) arena.push((y === 0 || y >= H - 2 ? '#'.repeat(B) : '#' + '.'.repeat(B - 2) + '#').split(''));
  for (const y of [12, 13, 14]) { arena[y][0] = '1'; arena[y][1] = 'G'; arena[y][B - 1] = '2'; arena[y][B - 2] = 'G'; }
  for (let x = 4; x <= 7; x++) arena[10][x] = '='; for (let x = B - 8; x <= B - 5; x++) arena[10][x] = '=';
  arena[14][17] = 'X';
  register.room({ id: 'test-boss', biome: 'test-lab', map: arena.map((r) => r.join('')), doors: { '1': { to: 'test-bestiary', door: '1' }, '2': { to: 'test-bestiary', door: '1' } }, ambient: '#3a3d52' });
}
