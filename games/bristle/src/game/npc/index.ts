// NPCs: Derek (Crown Gate), Pip (Gumline Hollows), the Warden (Calculus Deep).
// Rooms place them with objects: [{ type: 'npc', id: 'derek', x, y }] (x, y = the tile they stand in).
import { register } from '../registry';
import { Npc } from './npc';
import { allLines } from './defs';
import { registerTestRoom } from './test-room';

const NPCS: Record<string, { name: string; title: string }> = {
  derek: { name: 'Derek', title: 'The hermit hygienist' },
  pip: { name: 'Pip', title: 'Travelling merchant' },
  warden: { name: 'The Warden', title: 'Guard of the Calculus Deep' },
};
for (const [id, p] of Object.entries(NPCS)) register.npc({ id, name: p.name, title: p.title, lines: allLines(id) });
register.object('npc', (_g, o) => {
  const id = String(o.id ?? ''); if (!NPCS[id]) { console.warn('unknown npc ' + id); return null; }
  return new Npc(id, (o.x + 0.5) * 32, (o.y + 1) * 32);
});

// A test hall with all three NPCs, only with ?test in the URL (e.g. ?test&room=test-hall).
if (/[?&]test(&|=|$)/.test(location.search)) registerTestRoom();
