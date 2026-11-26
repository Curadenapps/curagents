// The Glutton's Maw: the first boss arena, between Gumline Hollows and Pip's fountain.
// G cells are the arena gates (the boss closes them while it lives). Q = the Glutton.
import type { RoomDef } from '../../registry';

const W = 46;
const row = (s: string) => s.padEnd(W, '.').slice(0, W);
const wall = '#'.repeat(W);
const open = (inner: string) => '#' + row(inner).slice(1, W - 1) + '#';

export const rooms: RoomDef[] = [{
  id: 'gumline-maw', biome: 'gumline', title: 'The Glutton\'s Maw', subtitle: 'Something has been eating the sugar',
  doors: { '1': { to: 'gumline-1', door: '2' }, '2': { to: 'gumline-pip', door: '1' } },
  objects: [{ type: 'lore', x: 4, y: 15, text: 'It ate every crumb that fell this way, and then it ate the crumbs that had not fallen yet.' }],
  map: [
    wall, wall,
    open(''), open(''), open(''), open(''),
    open('.................======.................'),
    open(''), open(''),
    open('......======...................======...'),
    open(''), open(''), open(''),
    '1G' + '.'.repeat(W - 4) + 'G2',
    '1G' + '.'.repeat(W - 4) + 'G2',
    '1G' + '.'.repeat(21) + 'Q' + '.'.repeat(W - 26) + 'G2',
    wall, wall,
  ],
}];
