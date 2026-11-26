// The Glutton's Maw: the boss arena at the end of the Sugar Wastes (fourth area), after the rest room.
// G cells are the arena gates (the boss closes them while it lives). Q = the Glutton.
import type { RoomDef } from '../../registry';

const W = 46;
const row = (s: string) => s.padEnd(W, '.').slice(0, W);
const wall = '#'.repeat(W);
const open = (inner: string) => '#' + row(inner).slice(1, W - 1) + '#';

export const rooms: RoomDef[] = [{
  // a quiet room before the fight: rest, save, and Pip with wares
  id: 'sugar-rest', biome: 'sugar',
  doors: { '1': { to: 'sugar-grip', door: '2' }, '2': { to: 'sugar-maw', door: '1' } },
  objects: [{ type: 'npc', id: 'pip', x: 19, y: 11 }, { type: 'lore', x: 25, y: 11, text: 'Beyond: a great hunger. Rest first. Spend your shine. Then go gently.' }],
  map: [
    '#'.repeat(30), '#'.repeat(30),
    '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#',
    '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#',
    '1' + '.'.repeat(28) + '2', '1' + '.'.repeat(28) + '2',
    '1' + '.'.repeat(9) + 'S' + '.'.repeat(18) + '2',
    '#'.repeat(30), '#'.repeat(30),
  ],
}, {
  id: 'sugar-maw', biome: 'sugar', title: 'The Glutton\'s Maw', subtitle: 'Something has been eating the sugar',
  doors: { '1': { to: 'sugar-rest', door: '2' }, '2': { to: 'calculus-1', door: '1' } },
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
