// The Captain's Den: the mini-boss arena at the end of the Narrows, between narrows-slits and the Sugar Wastes.
// Rest at the fountain on the left first; past the gate (G) the Crust Captain (K) wakes and the gates close.
import type { RoomDef } from '../../registry';

const W = 44;
const open = (inner = '') => '#' + inner.padEnd(W - 2, '.').slice(0, W - 2) + '#';
const wall = '#'.repeat(W);

export const rooms: RoomDef[] = [{
  id: 'narrows-den', biome: 'narrows', title: 'The Captain\'s Den', subtitle: 'Where the Narrows end',
  doors: { '1': { to: 'narrows-slits', door: '2' }, '2': { to: 'sugar-1', door: '1' } },
  objects: [{ type: 'lore', x: 7, y: 15, text: 'The Captain guards the way to the sweets. Its shield turns away a lazy stroke. Finish what you start.' }],
  map: [
    wall, wall,
    open(), open(), open(), open(), open(), open(),
    open('..............======.........======.....'),
    open(), open(), open(),
    '#' + '.'.repeat(9) + 'G' + '.'.repeat(W - 13) + 'G' + '#',
    '1' + '.'.repeat(9) + 'G' + '.'.repeat(W - 13) + 'G' + '2',
    '1' + '.'.repeat(9) + 'G' + '.'.repeat(W - 13) + 'G' + '2',
    '1...S.....G' + '.'.repeat(15) + 'K' + '.'.repeat(W - 29) + 'G2',
    wall, wall,
  ],
}];
