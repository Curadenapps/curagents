// The Oath cards: each level up deals three; take one. Most cards unlock a combo (a new move built from a chain
// of key presses), the rest are big upgrades you feel at once. Three paths, one per Order (progress.ts favours yours).
// Card text uses key tokens filled from the chosen layout: {A} slash, {U} up, {D} down, {DASH}, {SHOT}, {F} focus.
export interface Perk { id: string; branch: 'brush' | 'gap' | 'care'; name: string; text: string; needs?: string; combo?: boolean }
export const BRANCHES = [
  { id: 'brush', name: 'Brushing', blurb: 'Strokes and finishers.', order: 'vanguard' },
  { id: 'gap', name: 'Interdental', blurb: 'The dash, the holder and the narrow ways between.', order: 'ranger' },
  { id: 'care', name: 'Rinse and care', blurb: 'Rinse, health and calm gums.', order: 'lancer' },
] as const;
export const PERKS: Perk[] = [
  { id: 'k-circle', branch: 'brush', combo: true, name: 'Circle Stroke', text: '{A}, then press and hold {A}: the second stroke becomes a full spin that clears everything around you.' },
  { id: 'k-rise', branch: 'brush', combo: true, name: 'Rising Sweep', text: '{A} {A}, then {U} + {A}: a rising finisher that lifts creatures off their feet. Made for Sugar Imps.' },
  { id: 'k-flurry', branch: 'brush', combo: true, name: 'Air Flurry', text: 'Chain {A} in the air: every stroke holds you aloft, the third is a finisher.' },
  { id: 'k-slam', branch: 'brush', combo: true, name: 'Gumline Slam', text: 'In the air, hold {D} + {A}: plunge down and send a shockwave both ways.', needs: 'k-flurry' },
  { id: 'k-firm', branch: 'brush', name: 'Firm Filaments', text: 'Finishers clean 40% harder and reach further.', needs: 'k-circle' },
  { id: 'k-dash', branch: 'gap', combo: true, name: 'Dash Strike', text: '{A}, then {DASH}: the dash cleans every creature it passes through.' },
  { id: 'k-thrust', branch: 'gap', combo: true, name: 'Interdental Thrust', text: '{A} {A}, then {SHOT}: a quick piercing thrust with the holder. Costs no refill.' },
  { id: 'k-prime', branch: 'gap', name: 'Double Prime', text: 'A second dash in the air.', needs: 'k-dash' },
  { id: 'k-glide', branch: 'gap', name: 'Prime Glide', text: 'Your dash comes back 35% sooner.' },
  { id: 'k-burst', branch: 'care', combo: true, name: 'Rinse Burst', text: '{F} right after a finisher: a burst of rinse that pushes creatures back and refills fluor.' },
  { id: 'k-enamel1', branch: 'care', name: 'Second Enamel', text: '+1 health, healed at once.' },
  { id: 'k-enamel2', branch: 'care', name: 'Third Enamel', text: '+1 health, healed at once.', needs: 'k-enamel1' },
  { id: 'k-calm', branch: 'care', name: 'Calm Gums', text: 'Inflammation lasts half as long and focus heals faster.' },
];
/** Fill a card's key tokens from the layout in use. */
export function cardText(text: string, key: (a: 'attack' | 'up' | 'down' | 'dash' | 'spell' | 'focus') => string) {
  return text.replace(/\{A\}/g, key('attack')).replace(/\{U\}/g, key('up')).replace(/\{D\}/g, key('down')).replace(/\{DASH\}/g, key('dash')).replace(/\{SHOT\}/g, key('spell')).replace(/\{F\}/g, key('focus'));
}
export const FACTIONS = [
  { id: 'plaque', name: 'Plaque', colour: '#FCE300', blurb: 'Soft film. Filmlings, Sticklers, Mites.' },
  { id: 'sugar', name: 'Sugar', colour: '#F277C6', blurb: 'Sweet and fast. Sugar Imps.' },
  { id: 'tartar', name: 'Tartar', colour: '#d8cfb8', blurb: 'Hardened film. Spitters, Brutes, the Matriarch.' },
  { id: 'gum', name: 'Inflammation', colour: '#E31C79', blurb: 'Sore, swollen gums. Leeches, Flares, Swells.' },
] as const;
