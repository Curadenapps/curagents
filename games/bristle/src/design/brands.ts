// BRISTLE brand packs. The game is one dental world (plaque, gums, tartar, rinse: fixed in tokens.ts)
// dressed by one brand pack. A pack holds only what belongs to a company: its colour family, its
// signature accent, its fonts, its products and their names, and the lines it signs with.
// To pitch BRISTLE to another oral-care brand, add a pack here; nothing else should need to change.
//
// Rules of the file:
// - Pure data. Real product names, sizes and colours are placeholders until that brand verifies them.
// - Never add a pack for a real company without that company's own assets and OK.
// - Pick a pack with ?brand=<id> (style guide today; the game once it reads tokens.ts).

export interface IdbSize { name: string; col: string; /** gap width in world units the size fits (gaps.ts channel) */ channel: number }
export interface BrandPack {
  id: string;
  name: string;                 // company or product line, as it may appear in UI and credits
  colour: {
    primary: string;            // the one colour that says "us": hero cloak, primary buttons, brush grip
    primaryDark: string;        // cloak back, pressed states
    ink: string; ink2: string;  // the brand's darkest blues/neutrals for text on light and deep panels
    accent: string;             // signature accent: danger, boss rim, paste stripe
  };
  font: { display: string; body: string; canvas: string; files?: string[] };
  product: {
    brush: string;              // the hero's brush-blade is this brush
    filaments: number;          // lore: one oath per filament
    filamentsSpoken: string;    // the same number in words, for dialogue
    order: string;              // the hero's order
    handles: { id: string; name: string; handle: string; filament: string }[]; // cosmetic brush finishes
    idb: { holder: string; body: string; shade: string; hi: string; sizes: { s: IdbSize; m: IdbSize; l: IdbSize } };
    paste: { stripe: string; stripe2: string };
  };
  legal: string;
}

export const curaprox: BrandPack = {
  id: 'curaprox', name: 'CURAPROX',
  colour: { primary: '#003DA5', primaryDark: '#002E7D', ink: '#0A1F44', ink2: '#132B57', accent: '#E31C79' },
  font: {
    display: "'Futura LT Pro', Futura, 'Century Gothic', 'Avenir Next', sans-serif",
    body: "'Info Display Pro', 'Helvetica Neue', Arial, sans-serif",
    canvas: '"Futura LT Pro", Futura, "Century Gothic", sans-serif',
    files: ['FuturaLTPro-Book.otf', 'FuturaLTPro-Bold.otf', 'InfoDisplayPro-Book.otf'],
  },
  product: {
    brush: 'CS 5460', filaments: 5460, filamentsSpoken: 'Five thousand four hundred and sixty', order: 'Order of the 5,460',
    handles: [
      { id: 'curaprox-blue', name: 'Curaprox Blue', handle: '#003DA5', filament: '#E8F1FF' },
      { id: 'cerise', name: 'Cerise', handle: '#E31C79', filament: '#FFE3F0' },
      { id: 'tangerine', name: 'Tangerine', handle: '#FF8200', filament: '#FFF0DC' },
      { id: 'citrus', name: 'Citrus', handle: '#C4D600', filament: '#F6FBD8' },
      { id: 'orchid', name: 'Orchid', handle: '#F277C6', filament: '#FFE8F6' },
      { id: 'sky', name: 'Soft Sky', handle: '#8BB8E8', filament: '#FFFFFF' },
      { id: 'vivid', name: 'Vivid Yellow', handle: '#FCE300', filament: '#FFFBE0' },
      { id: 'ink', name: 'Night Ink', handle: '#132B57', filament: '#CCD8ED' },
    ],
    // Holder: translucent turquoise from the CPS prime product shot. Sizes mirror gaps.ts. All placeholders.
    idb: { holder: 'CPS prime holder', body: '#2BB7C9', shade: '#178A9C', hi: '#C4F4FA', sizes: {
      s: { name: 'S', col: '#F277C6', channel: 6 }, m: { name: 'M', col: '#FF8200', channel: 10 }, l: { name: 'L', col: '#8BB8E8', channel: 14 } } },
    paste: { stripe: '#E31C79', stripe2: '#003DA5' },
  },
  legal: 'An original game for CURAPROX',
};

/** A made-up brand that proves the system flexes. Colours and names belong to no real company. */
export const demo: BrandPack = {
  id: 'demo', name: 'Your Brand',
  colour: { primary: '#2E7D5B', primaryDark: '#1F5C42', ink: '#10261D', ink2: '#1A3A2C', accent: '#FF6B4A' },
  font: {
    display: "'Century Gothic', 'Avenir Next', 'Segoe UI', sans-serif",
    body: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    canvas: '"Century Gothic", "Avenir Next", sans-serif',
  },
  product: {
    brush: 'Soft brush', filaments: 1000, filamentsSpoken: 'A thousand', order: 'Order of the Thousand Bristles',
    handles: [
      { id: 'green', name: 'House Green', handle: '#2E7D5B', filament: '#E9F7F0' },
      { id: 'coral', name: 'Coral', handle: '#FF6B4A', filament: '#FFEDE8' },
      { id: 'sand', name: 'Sand', handle: '#E8C07A', filament: '#FFF8EA' },
      { id: 'night', name: 'Night', handle: '#1A3A2C', filament: '#D4E8DE' },
    ],
    idb: { holder: 'Interdental holder', body: '#9AD0B8', shade: '#5FA586', hi: '#E3F5EC', sizes: {
      s: { name: 'S', col: '#FF6B4A', channel: 6 }, m: { name: 'M', col: '#E8C07A', channel: 10 }, l: { name: 'L', col: '#7FB7E0', channel: 14 } } },
    paste: { stripe: '#FF6B4A', stripe2: '#2E7D5B' },
  },
  legal: 'An original game, brand placeholder',
};

export const packs: Record<string, BrandPack> = { curaprox, demo };

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('brand') : null;
/** The pack in use. Defaults to CURAPROX. */
export const pack: BrandPack = (query && packs[query]) || curaprox;
