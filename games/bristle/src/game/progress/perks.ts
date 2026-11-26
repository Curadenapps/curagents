// The Oath cards: three paths, one per Order (brushing = Vanguard, interdental = Ranger, rinse and care = Bulwark).
// Each level up deals three cards you can take next; at least one from the Order you wear (progress.ts).
export interface Perk { id: string; branch: 'brush' | 'gap' | 'care'; name: string; text: string; needs?: string }
export const BRANCHES = [
  { id: 'brush', name: 'Brushing', blurb: 'The brush and its strokes.', order: 'vanguard' },
  { id: 'gap', name: 'Interdental', blurb: 'The holder, the refills and the narrow ways between.', order: 'ranger' },
  { id: 'care', name: 'Rinse and care', blurb: 'Rinse, healing and calm gums.', order: 'bulwark' },
] as const;
export const PERKS: Perk[] = [
  { id: 'b1', branch: 'brush', name: 'Wide head', text: 'Your slashes reach 20% further.' },
  { id: 'b2', branch: 'brush', name: 'Swift strokes', text: 'Slash 15% faster.', needs: 'b1' },
  { id: 'b3', branch: 'brush', name: 'Firm filaments', text: '+2 cleaning power on every slash.', needs: 'b2' },
  { id: 'b4', branch: 'brush', name: 'Filament storm', text: 'Every third hit in a row bursts into a ring of bristles.', needs: 'b3' },
  { id: 'i1', branch: 'gap', name: 'Prime glide', text: 'Dash recovers 35% sooner.' },
  { id: 'i2', branch: 'gap', name: 'Thread the gap', text: 'Dashing through a creature loosens it.', needs: 'i1' },
  { id: 'i3', branch: 'gap', name: 'Double prime', text: 'A second dash in the air.', needs: 'i2' },
  { id: 'i4', branch: 'gap', name: 'Clean pass', text: 'Dashing through a creature refills fluor and shields you briefly.', needs: 'i3' },
  { id: 'c1', branch: 'care', name: 'Light touch', text: 'The Rinse wave costs 5 less fluor.' },
  { id: 'c2', branch: 'care', name: 'Calm gums', text: 'Inflammation lasts half as long. Focus heals faster.', needs: 'c1' },
  { id: 'c3', branch: 'care', name: 'Fluor bloom', text: 'Each slash that lands gives more fluor.', needs: 'c2' },
  { id: 'c4', branch: 'care', name: 'Second enamel', text: '+1 health.', needs: 'c3' },
];
export const FACTIONS = [
  { id: 'plaque', name: 'Plaque', colour: '#FCE300', blurb: 'Soft film. Filmlings, Sticklers, Mites.' },
  { id: 'sugar', name: 'Sugar', colour: '#F277C6', blurb: 'Sweet and fast. Sugar Imps.' },
  { id: 'tartar', name: 'Tartar', colour: '#d8cfb8', blurb: 'Hardened film. Spitters, Brutes, the Matriarch.' },
  { id: 'gum', name: 'Inflammation', colour: '#E31C79', blurb: 'Sore, swollen gums. Leeches, Flares, Swells.' },
] as const;
