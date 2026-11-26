// BESTIARY (owned by the enemies agent): registers every creature's map char and exports field notes.
//   f Filmling   s Stickler   i Sugar Imp   t Tartar Spitter   b Tartar Brute   l Gum Leech   m Mite swarm
//   r Flare      n Swell      X Mother Calculus (boss of calculus-throne; gate cells G are hers to close)
import { register } from '../registry';
import { Filmling } from './filmling';
import { Stickler } from './stickler';
import { SugarImp } from './imp';
import { TartarSpitter } from './spitter';
import { TartarBrute } from './brute';
import { GumLeech } from './leech';
import { spawnSwarm } from './mites';
import { Flare, Swell } from './inflame';
import { MotherCalculus } from './calculus';
import { registerTestRooms } from './testrooms';
import type { Faction } from './common';

// x, y is the cell centre; ground creatures stand on the cell's floor (y + 16).
register.legend('f', (_g, x, y) => new Filmling(x, y + 16));
register.legend('s', (g, x, y) => new Stickler(x, y, g));
register.legend('i', (_g, x, y) => new SugarImp(x, y));
register.legend('t', (g, x, y) => new TartarSpitter(x, y, g));
register.legend('b', (_g, x, y) => new TartarBrute(x, y + 16));
register.legend('l', (g, x, y) => new GumLeech(x, y, g));
register.legend('m', (g, x, y) => spawnSwarm(g, x, y));
register.legend('r', (g, x, y) => new Flare(x, y, g));
register.legend('n', (_g, x, y) => new Swell(x, y + 16));
register.legend('X', (g, x, y) => (g.flag('calculus-defeated') ? null : new MotherCalculus(x, y, g)));

export interface BestiaryEntry { id: string; name: string; faction: Faction; blurb: string }
/** Field notes for the UI. `id` matches Enemy.type and the keys of save.killed. */
export const BESTIARY: BestiaryEntry[] = [
  { id: 'filmling', name: 'Filmling', faction: 'plaque', blurb: 'A soft blob of leftover sugar that learned to walk. Shy until it is not. It puffs itself up before it pounces, which is almost polite.' },
  { id: 'stickler', name: 'Stickler', faction: 'plaque', blurb: 'Never lets go of a floor, a wall, a grudge, or the ceiling directly above you. Look up now and then.' },
  { id: 'mite', name: 'Mite', faction: 'plaque', blurb: 'Comes in threes, fours, fives. One buzzes, one dives, the rest supervise.' },
  { id: 'sugar-imp', name: 'Sugar Imp', faction: 'sugar', blurb: 'Spun from a forgotten sweet. It sparkles right before it dives; it cannot help showing off.' },
  { id: 'tartar-spitter', name: 'Tartar Spitter', faction: 'tartar', blurb: 'A little crown that went grey and grumpy and rooted itself in place. Its mouth glows before it lobs. Swat the glob and it bursts.' },
  { id: 'tartar-brute', name: 'Tartar Brute', faction: 'tartar', blurb: 'Wears an old molar crown for a shell and a face plate for manners. Charges anything. Loses arguments with walls.' },
  { id: 'gum-leech', name: 'Gum Leech', faction: 'gum', blurb: 'Hangs from the ceiling pretending to be a drip. Drips do not usually have eyes. Usually.' },
  { id: 'flare', name: 'Flare', faction: 'gum', blurb: 'A swollen bulb of gum that runs hot. It throbs three times before it pulses, so count, and keep your distance.' },
  { id: 'swell', name: 'Swell', faction: 'gum', blurb: 'Gets worked up, puffs up, lets it all out in one warm whoosh. Afterwards it lies flat and thinks about what it did.' },
  { id: 'mother-calculus', name: 'Mother Calculus', faction: 'tartar', blurb: 'Queen of the Hardened Film. Every crumb nobody brushed away settled at her feet, and she built a throne of it.' },
];

// Test arenas (?test in the URL only, never in normal play).
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('test')) registerTestRooms();
