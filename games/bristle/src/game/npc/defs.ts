// What the NPCs say and sell. Written lines depend on game state and never repeat twice in a row;
// the conversation scripts drive the dialogue box through the TalkHost the UI provides.
import type { GameCore } from '../game';
import { PERSONAS, type VoiceState } from '../../../server/personas.mjs';

type Cond = (g: GameCore) => boolean;
interface Line { text: string | ((g: GameCore) => string); when?: Cond }

const ab = (k: keyof GameCore['save']['abilities']): Cond => (g) => !!g.save.abilities[k];
const boss: Cond = (g) => !!g.flag('calculus-defeated');
const notBoss: Cond = (g) => !boss(g);
export const kills = (g: GameCore) => Object.values(g.save.killed).reduce((a, b) => a + (Number(b) || 0), 0);
const relicCount = (g: GameCore) => Object.values(g.save.abilities).filter(Boolean).length;

export const RELICS: { id: keyof GameCore['save']['abilities']; name: string; text: string }[] = [
  { id: 'dash', name: 'Prime Dash', text: 'A burst of speed. Slips through the narrow interdental slits.' },
  { id: 'grip', name: 'Floss Grip', text: 'Cling to walls and leap from them.' },
  { id: 'rinse', name: 'Rinse', text: 'Up and spell sends a rolling wave of rinse foam.' },
  { id: 'pulse', name: 'Fluor Pulse', text: 'A ring of light from the vessel.' },
];

export const BRUSH_COLOURS: { id: string; name: string; hex: string }[] = [
  { id: 'blue', name: 'Curaprox Blue', hex: '#003DA5' },
  { id: 'cerise', name: 'Cerise', hex: '#E31C79' },
  { id: 'lime', name: 'Lime', hex: '#C4D600' },
  { id: 'orange', name: 'Tangerine', hex: '#FF8200' },
  { id: 'sky', name: 'Sky', hex: '#8BB8E8' },
];

interface Script { first: string[]; greet: Line[]; idle: Line[]; topics: { id: string; label: string; lines: Line[] }[]; bye: string[] }

const SCRIPTS: Record<string, Script> = {
  derek: {
    first: [
      'Easy now. You have been asleep a long time, knight. Long enough for the Film to move in and get comfortable.',
      'I am Derek. I keep the fountain here at the Gate, and I talk to it more than I would like to admit.',
      'That is a CURAPROX blade in your hand. Five thousand four hundred and sixty filaments, one for each oath of the Order. Hold it like you mean it.',
      'The Film starts soft: leftover sugar, given time and nobody to sweep it. Left long enough, it hardens into tartar, and tartar holds a grudge.',
      'Rest at the fountains when you find them. They mend you, and they remember you. A sensible knight rests at one twice a day, at least.',
      'The way on is down, through the Gumline Hollows. Follow the warm light, not the yellow one.',
    ],
    greet: [
      { text: 'Knight. Still in one piece, I see. Mostly.', when: notBoss },
      { text: 'Back again? The fountain missed you. I did not. Much.', when: notBoss },
      { text: 'There you are. The towers are humming. I think that is your doing.', when: boss },
    ],
    idle: [
      { text: 'Still empty-handed? The Hollows are below the Gate. Follow the warm light, not the yellow one.', when: (g) => relicCount(g) === 0 && notBoss(g) },
      { text: 'The Film will not sweep itself. I asked it to, once. It giggled.', when: (g) => kills(g) < 8 && notBoss(g) },
      { text: (g) => `${kills(g)} bits of Film swept so far. I have been counting. It is not as though I have other hobbies.`, when: (g) => kills(g) >= 8 },
      { text: 'You move like the wind took an apprenticeship. The Narrows suit you, I take it.', when: ab('dash') },
      { text: 'Rinse at your fingertips now. Up and spell, if I remember the old drills. Mind the furniture.', when: ab('rinse') },
      { text: 'Floss Grip. So you climb walls now. I used to climb walls. Then I discovered stairs.', when: ab('grip') },
      { text: 'Pip sold you a paste tube? Good. Throw it like it owes you shine.', when: (g) => !!g.flag('paste') },
      { text: 'New colour on the handle. The Film will not notice. I did.', when: (g) => !!g.flag('brush-colour') && g.flag('brush-colour') !== 'blue' },
      { text: 'The towers used to sing when the light hit them. Give them a reason to sing again.', when: notBoss },
      { text: 'The fountain water is free. Everything else in Ivoria costs shine, mostly to Pip.' },
      { text: 'A CURAPROX blade, 5,460 filaments, the Order\'s oath. Every one of them still standing. Unlike my knees.' },
      { text: 'Mother Calculus, gone. I shall have to find something else to worry about. I am sure I will manage.', when: boss },
      { text: 'The air is lighter now. I can hear the enamel ringing all the way down the Gate.', when: boss },
    ],
    topics: [
      { id: 'film', label: 'About the Film', lines: [
        { text: 'The Film comes from leftovers. Sugar, time, a little neglect. It is cute until it is not.' },
        { text: 'If it glows yellow and giggles, swing first. Apologise later, if you must.' },
        { text: 'Film that nobody sweeps turns to tartar. Tartar turns to beasts. And the oldest beast of all sits in the Calculus Deep.' },
      ] },
      { id: 'fountains', label: 'About the fountains', lines: [
        { text: 'Rest at a fountain and it mends your enamel. If you fall, you wake beside the last one you rested at.' },
        { text: 'The Order rested twice a day, morning and night. Old habits. Good ones.' },
      ] },
    ],
    bye: ['Go on, then. Mind the yellow light.', 'Off you go, knight. I will keep the water warm.', 'Rest when you can. Swing when you must.'],
  },
  pip: {
    first: [
      'Oh! A customer! A real one, with feet and everything! Pip, travelling merchant, spool of excellent character.',
      'I have wound my way through every gap in Ivoria. Twice! You would be amazed what people leave between things.',
      'Shine is the currency, friend. The Film drops it when you sweep it. I do not ask questions. I just count.',
    ],
    greet: [
      { text: 'Friend! My favourite customer! My only customer, but still!' },
      { text: 'Back for more? Pip always has more. Well. Pip has what Pip has.' },
      { text: 'The hero returns! I have practised my curtsey. Spools cannot curtsey. I tried anyway.', when: boss },
    ],
    idle: [
      { text: 'Business is slow. The Plaqlings browse, but they never buy. No pockets.' },
      { text: 'You look like someone who could use another enamel shard. Everyone could. That is the beauty of it.', when: (g) => !g.flag('shop-shard-2') },
      { text: 'A sharper Bristle Edge? I know a filament-smith. Well, I am the filament-smith. Keep it quiet.', when: (g) => (Number(g.flag('blade')) || 0) < 2 },
      { text: 'Is that a Rinse relic? Fancy. Keep it away from my stock, I only just dried.', when: ab('rinse') },
      { text: 'Is that a heavy purse? Do not mind me. I am not looking. I am entirely looking.', when: (g) => g.save.shine >= 300 },
      { text: 'Light on shine? Sweep a few Filmlings. They practically hand it over.', when: (g) => g.save.shine < 60 },
      { text: 'My thread is a bit frayed today. Long walk. Do not buy floss from anyone else, it makes me emotional.' },
      { text: 'Colours are in season. All five of them. Every season.' },
      { text: 'Wind me up and I talk all day. Wind me down and I still talk. It is a gift.' },
      { text: 'You beat Mother Calculus? I am putting that on a sign. "Pip: merchant to the hero." Small print: hero not included.', when: boss },
    ],
    topics: [],
    bye: ['Come back soon! Bring shine! Bring friends with shine!', 'Safe travels, friend. Mind the gaps, I live in them.', 'Pip will be right here. Or somewhere near. Probably.'],
  },
  warden: {
    first: [
      'Halt. ...No. Do not halt. Nobody has said that to me in years, and it did not sound right then either.',
      'I am the Warden of the Deep. I was white once, knight. Polished. They said I gleamed.',
      'Beyond these gates sleeps Mother Calculus. She began as a little Film nobody swept. Then she had years. Years make anything heavy.',
      'The gates close behind whoever enters. Rest first. Be sure.',
    ],
    greet: [
      { text: 'Knight. You came back. Most do not, the second time.', when: notBoss },
      { text: 'Still here. Still guarding. Still not sure what.', when: notBoss },
      { text: 'Knight. The Deep is quiet. I keep listening for her anyway.', when: boss },
    ],
    idle: [
      { text: 'She hardens whatever she touches. Strike where the light gets in. Her crust has seams.', when: notBoss },
      { text: 'I have watched knights go through those gates. I have watched fewer come back. Your brush is better than theirs was.', when: notBoss },
      { text: 'You climbed out of the Sugar Wastes. Then your hands are steadier than mine.', when: ab('grip') },
      { text: (g) => `You have swept ${kills(g)} of her children to stand here. She will know you by it.`, when: (g) => kills(g) >= 15 && notBoss(g) },
      { text: 'Every gate in the Deep is a promise. Once through, you finish what you started.', when: notBoss },
      { text: 'My post is this step. My orders were simple. I have forgotten who gave them. I keep them anyway.' },
      { text: 'It is quiet in there now. I do not know what to guard. Perhaps I will guard the quiet.', when: boss },
      { text: 'You did what the Order swore to do. Five thousand four hundred and sixty times over.', when: boss },
      { text: 'Go home, knight. Rest. Come back if the Film ever forgets the lesson.', when: boss },
    ],
    topics: [
      { id: 'calculus', label: 'Mother Calculus?', lines: [
        { text: 'She was soft once, like all of them. A little Film left in a corner. Nobody came. That is the whole story, really.', when: notBoss },
        { text: 'She does not hate you. She simply does not let go. That is worse.', when: notBoss },
        { text: 'She is gone, and the Deep feels larger for it. Strange, to miss a weight.', when: boss },
      ] },
      { id: 'gates', label: 'The gates', lines: [
        { text: 'Rest at the fountain before you pass. The gates will not open again until it is over.', when: notBoss },
        { text: 'The gates stand open now. I keep closing them out of habit.', when: boss },
      ] },
    ],
    bye: ['Go carefully, knight.', 'I will be here. I am always here.', 'Rest first. Be sure.'],
  },
};

// ---------------------------------------------------------------- line picking
const last: Record<string, string> = {};
const resolve = (g: GameCore, l: Line) => (typeof l.text === 'function' ? l.text(g) : l.text);
/** Pick an eligible line, never the same as the one this NPC said last. */
export function pick(g: GameCore, npc: string, pool: Line[] | string[]): string {
  const lines = (pool as (Line | string)[]).map((l) => (typeof l === 'string' ? { text: l } : l)).filter((l) => !l.when || l.when(g)).map((l) => resolve(g, l));
  const choices = lines.filter((t) => t !== last[npc]);
  const text = (choices.length ? choices : lines)[Math.floor(Math.random() * Math.max(1, (choices.length ? choices : lines).length))] ?? '...';
  last[npc] = text; return text;
}

// ---------------------------------------------------------------- voice state
const FOE_NAME = (id: string) => id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export function voiceState(g: GameCore, npc: string): VoiceState {
  const top = Object.entries(g.save.killed).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => FOE_NAME(k));
  return {
    area: g.room?.def.title || g.biome?.name || 'Ivoria',
    abilities: RELICS.filter((r) => g.save.abilities[r.id]).map((r) => r.name),
    kills: kills(g), foes: top, boss: boss(g), maxHp: g.save.maxHp,
    blade: Number(g.flag('blade')) || 0, paste: !!g.flag('paste'), brush: String(g.flag('brush-colour') ?? 'blue'),
    met: !!g.flag('met-' + npc),
  };
}

// ---------------------------------------------------------------- conversation
export interface Choice { id: string; label: string; hint?: string }
/** What the dialogue box offers a conversation script. Every method resolves false/null once the player closes it. */
export interface TalkHost {
  readonly g: GameCore;
  readonly npc: string;
  readonly closed: boolean;
  say(text: string): Promise<boolean>;
  choose(options: Choice[]): Promise<string | null>;
  /** An AI greeting for this visit, or null (no voice, already greeted, or too slow). */
  greeting(): Promise<string | null>;
  /** Runs the Ask flow (presets, typing, the AI reply). Hidden when there is no voice. */
  canAsk(): boolean;
  ask(): Promise<boolean>;
  shop(): Promise<boolean>;
}

export const ASK_PRESETS: Record<string, string[]> = {
  derek: ['What is the Film?', 'Where should I go next?', 'Tell me about the Order.'],
  pip: ['Where do you come from?', 'Heard any rumours?', 'What is your best ware?'],
  warden: ['Who is Mother Calculus?', 'How long have you stood guard?', 'Any advice before the gates?'],
};

export async function converse(h: TalkHost) {
  const { g, npc } = h, s = SCRIPTS[npc]; if (!s) return;
  const metKey = 'met-' + npc;
  if (!g.flag(metKey)) {
    for (const line of s.first) if (!(await h.say(line))) { if (s.first.indexOf(line) >= 2) g.setFlag(metKey, true); return; }
    g.setFlag(metKey, true); g.persist();
  } else {
    const ai = await h.greeting(); if (h.closed) return;
    if (!(await h.say(ai ?? pick(g, npc, s.greet)))) return;
  }
  const usedTopics = new Set<string>();
  for (;;) {
    const opts: Choice[] = [];
    if (npc === 'pip') opts.push({ id: 'shop', label: 'Browse wares' });
    opts.push({ id: 'talk', label: 'Talk' });
    for (const tp of s.topics) if (tp.lines.some((l) => !l.when || l.when(g))) opts.push({ id: 'topic:' + tp.id, label: tp.label, hint: usedTopics.has(tp.id) ? 'heard' : undefined });
    if (h.canAsk()) opts.push({ id: 'ask', label: 'Ask…', hint: 'Claude' });
    opts.push({ id: 'bye', label: 'Farewell' });
    const c = await h.choose(opts); if (c === null) return;
    if (c === 'bye') { await h.say(pick(g, npc + ':bye', s.bye)); return; }
    let ok = true;
    if (c === 'talk') ok = await h.say(pick(g, npc, s.idle));
    else if (c === 'shop') ok = await h.shop();
    else if (c === 'ask') ok = await h.ask();
    else if (c.startsWith('topic:')) { const tp = s.topics.find((x) => 'topic:' + x.id === c)!; usedTopics.add(tp.id); ok = await h.say(pick(g, npc + ':' + tp.id, tp.lines)); }
    if (!ok) return;
  }
}

/** Every written line, flattened (the registry's NpcDef.lines). */
export function allLines(npc: string): string[] {
  const s = SCRIPTS[npc]; const out: string[] = [...s.first, ...s.bye];
  for (const l of [...s.greet, ...s.idle, ...s.topics.flatMap((t) => t.lines)]) if (typeof l.text === 'string') out.push(l.text);
  return out;
}
export const fallbackLine = (npc: string) => { const f = PERSONAS[npc]?.fallback ?? ['...']; return f[Math.floor(Math.random() * f.length)]; };

// ---------------------------------------------------------------- Pip's wares
export interface Ware {
  id: string; name: string; icon: 'shard' | 'edge' | 'tube' | 'colour' | 'scroll';
  blurb: string; pip: string;
  price(g: GameCore): number;
  owned(g: GameCore): boolean;
  /** Why it cannot be bought yet, if so. */
  locked?(g: GameCore): string | null;
  buy(g: GameCore): void;
}

const setMaxHp = (g: GameCore, n: number) => { g.save.maxHp = n; if (g.player) { g.player.maxHp = n; g.player.heal(99); } g.save.hp = n; };
const ownedColours = (g: GameCore) => String(g.flag('brush-colours-owned') ?? 'blue').split(',').filter(Boolean);
export const colourIndex = { v: 0 }; // the swatch shown in the shop row

export const WARES: Ware[] = [
  { id: 'shard-1', name: 'Enamel Shard', icon: 'shard', blurb: 'One more shard of enamel for your crown. Raises your health by one, and mends you on the spot.', pip: 'Hand-polished! By me! With my face!',
    price: () => 150, owned: (g) => !!g.flag('shop-shard-1'), buy: (g) => { g.setFlag('shop-shard-1', true); setMaxHp(g, g.save.maxHp + 1); } },
  { id: 'shard-2', name: 'Enamel Shard', icon: 'shard', blurb: 'A second shard, thicker than the first. Raises your health by one.', pip: 'The last one I have. Probably. Pip is always finding things.',
    price: () => 300, owned: (g) => !!g.flag('shop-shard-2'), locked: (g) => (g.flag('shop-shard-1') ? null : 'After the first shard'), buy: (g) => { g.setFlag('shop-shard-2', true); setMaxHp(g, g.save.maxHp + 1); } },
  { id: 'edge-1', name: 'Bristle Edge', icon: 'edge', blurb: 'Re-tufted filaments for your brush-blade. Every swing hits harder.', pip: 'Sharp! Well. Firm. Firmly persuasive.',
    price: () => 200, owned: (g) => (Number(g.flag('blade')) || 0) >= 1, buy: (g) => g.setFlag('blade', 1) },
  { id: 'edge-2', name: 'Bristle Edge II', icon: 'edge', blurb: 'A master tuft, every filament set by hand. Your blade hits harder still.', pip: 'My finest work. I cried a little. Thread is very absorbent.',
    price: () => 400, owned: (g) => (Number(g.flag('blade')) || 0) >= 2, locked: (g) => ((Number(g.flag('blade')) || 0) >= 1 ? null : 'After the first Edge'), buy: (g) => g.setFlag('blade', 2) },
  { id: 'paste', name: 'Paste Tube', icon: 'tube', blurb: 'A roomier tube for your paste throws. Each throw costs less fluor.', pip: 'Squeeze from the bottom, friend. I insist. I am very particular.',
    price: () => 240, owned: (g) => Number(g.flag('paste')) >= 1, buy: (g) => g.setFlag('paste', 1) },
  { id: 'colour', name: 'Brush Colourway', icon: 'colour', blurb: 'A fresh colour for your brush handle. Purely for looks. Colours you own are free to switch.', pip: 'Very fetching. The Film will not notice. Everyone else will.',
    price: (g) => (ownedColours(g).includes(BRUSH_COLOURS[colourIndex.v].id) ? 0 : 60),
    owned: (g) => String(g.flag('brush-colour') ?? 'blue') === BRUSH_COLOURS[colourIndex.v].id,
    buy: (g) => { const c = BRUSH_COLOURS[colourIndex.v].id, own = ownedColours(g); if (!own.includes(c)) own.push(c); g.setFlag('brush-colours-owned', own.join(',')); g.setFlag('brush-colour', c); } },
  { id: 'ballad', name: 'Ballad of the 5,460', icon: 'scroll', blurb: 'An old song of the Order, copied out by Pip. You can read it in your field notes.', pip: 'Pip wrote it down from memory! Some of the words are even the right ones.',
    price: () => 40, owned: (g) => !!g.flag('lore-ballad'), buy: (g) => g.setFlag('lore-ballad', true) },
];
export const colourOwned = (g: GameCore, id: string) => ownedColours(g).includes(id);

export const BALLAD = [
  'Five thousand four hundred and sixty they stood,',
  'each one a filament, each one a vow:',
  'to sweep what was left where the sweet things had been,',
  'to rest by the fountains, at dawn and at dusk,',
  'and never to let the soft Film grow old.',
  'When the last of them sleeps, let the last of them wake,',
  'with the light on the towers, and the crown on their head.',
];
