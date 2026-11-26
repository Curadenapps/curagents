// NPCs: Mira (Crown Gate), Pip (Gumline Hollows), the Warden (Calculus Deep).
// Rooms place them with objects: [{ type: 'npc', id: 'mira', x, y }] (x, y = the tile they stand in).
import { register } from '../registry';
import { PERSONAS } from '../../../server/personas.mjs';
import { Npc } from './npc';
import { allLines } from './defs';
import { registerTestRoom } from './test-room';
import './voice';

for (const id of Object.keys(PERSONAS)) {
  const p = PERSONAS[id];
  register.npc({ id, name: p.name, title: p.title, persona: `${p.persona} ${p.voice}`, lines: allLines(id) });
}
register.object('npc', (_g, o) => {
  const id = String(o.id ?? ''); if (!PERSONAS[id]) { console.warn('unknown npc ' + id); return null; }
  return new Npc(id, (o.x + 0.5) * 32, (o.y + 1) * 32);
});

// A test hall with all three NPCs, only with ?test in the URL (e.g. ?test&room=test-hall).
if (/[?&]test(&|=|$)/.test(location.search)) registerTestRoom();
