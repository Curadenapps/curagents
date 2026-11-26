// BRISTLE design tokens. One source of truth for colour, type, spacing, motion, light and particles.
//
// Rules of the file:
// - Values marked `// in code: <path>` are what the game already draws today; they are the reference.
//   Migrating a module means replacing its literals with these names, nothing should change on screen.
// - Values without that note fill gaps (new biomes, materials, UI pieces) in the same house style.
// - Pure data. No DOM, no side effects, safe to import from any module (game, UI, tools, style guide).
// - Hex strings are always `#RRGGBB` (the engine's `rgb()` parser needs six digits). Alpha lives in
//   `rgba(...)` strings or in a separate number.
import type { Grade } from '../engine/post';
import type { BurstOpts } from '../engine/particles';

// ---------------------------------------------------------------------------------------------
// 1. Brand roots (CURAPROX app design system). Never re-tint these; derive with tints below.
// ---------------------------------------------------------------------------------------------
export const brand = {
  blue: '#003DA5',      // CURAPROX Blue. The hero's cloak, primary buttons, the one colour that says "us"
  blue80: '#3364B7', blue60: '#668BC9', blue40: '#99B1DB', blue20: '#CCD8ED',
  blueDark: '#002E7D',  // in code: player.ts C.blueDk (cloak back)
  ink: '#0A1F44', ink2: '#132B57',
  white: '#FFFFFF', grey10: '#EDEDED', grey: '#706F6F',
  sky: '#8BB8E8',       // Soft Sky. Light, rinse, fluor, the hero's visor
  citrus: '#C4D600', yellow: '#FCE300', tangerine: '#FF8200', orchid: '#F277C6', cerise: '#E31C79',
} as const;

// ---------------------------------------------------------------------------------------------
// 2. Ink and backgrounds. The game lives in the dark; these are the floors under every biome.
// ---------------------------------------------------------------------------------------------
export const ink = {
  black: '#000000',     // page and letterbox (styles.css html/body)
  night: '#050D24',     // in code: styles.css --night
  void: '#060C1F',      // in code: game.ts slit gap
  title: '#081430',     // in code: game.ts drawTitleBack
  deep: '#0B1633',      // solid panel fill (UI), same family as the HUD's rgba(6,14,36)
  shadow: 'rgba(0,0,0,0.25)', // in code: game.ts slab cracks
} as const;

export type BiomeId = 'crown' | 'gumline' | 'narrows' | 'sugar' | 'calculus';
export interface TerrainTokens { base: string; deep: string; edge: string; rim: string; top: string; slab: string }
export interface BiomePalette {
  name: string; anatomy: string;
  sky: [string, string];          // background gradient, top to bottom
  far: string; mid: string; near: string; // parallax silhouettes, far to near
  fog: string;                    // fog band colour (used at low alpha)
  accent: string;                 // the one saturated note of the area (flora, crystals, glows)
  accent2: string;
  terrain: TerrainTokens;         // matches registry.ts TerrainStyle
}

/** Per-biome palettes. `crown` matches the world placeholder; the rest fill the slice's other areas. */
export const biome: Record<BiomeId, BiomePalette> = {
  crown: {
    name: 'Crown Gate', anatomy: 'occlusal surface of a molar: cusps as ruined towers, wind over enamel',
    sky: ['#0B1A40', '#050B1F'], far: '#12224A', mid: '#1B2A52', near: '#0D1736', // in code: world/index.ts
    fog: '#8BB8E8', accent: '#8BB8E8', accent2: '#FFFFFF',
    terrain: { base: '#1B2A52', deep: '#0D1736', edge: '#2C4377', rim: '#7F9BD0', top: '#C9D6EE', slab: '#B9C7E3' }, // in code
  },
  gumline: {
    name: 'Gumline Hollows', anatomy: 'gum scallops around tooth necks, soft folds, bioluminescent papillae',
    sky: ['#2A0F2E', '#12061A'], far: '#3D1640', mid: '#5A1D4F', near: '#1F0A24',
    fog: '#F277C6', accent: '#F277C6', accent2: '#8BB8E8',
    terrain: { base: '#6B2352', deep: '#2A0D26', edge: '#9C3A6F', rim: '#F277C6', top: '#F6B6D6', slab: '#F0D9E6' },
  },
  narrows: {
    name: 'The Narrows', anatomy: 'interdental spaces: two enamel walls, a strip of gum far below, contact points above',
    sky: ['#0A1838', '#030817'], far: '#14254D', mid: '#22386A', near: '#08122B',
    fog: '#CCD8ED', accent: '#CCD8ED', accent2: '#F277C6',
    terrain: { base: '#2A3D6B', deep: '#101D40', edge: '#4A64A0', rim: '#B9CDF0', top: '#E8EEF9', slab: '#C9D6EE' },
  },
  sugar: {
    name: 'Sugar Wastes', anatomy: 'a stranded snack on the tongue: crystal spikes, syrup flats, orange haze',
    sky: ['#3A1A0A', '#140805'], far: '#5A2A10', mid: '#7A3A16', near: '#220E06',
    fog: '#FF8200', accent: '#FF8200', accent2: '#FCE300',
    terrain: { base: '#6A3418', deep: '#2A1208', edge: '#A85A20', rim: '#FFB060', top: '#FFE2B0', slab: '#F6D7A8' },
  },
  calculus: {
    name: 'Calculus Deep', anatomy: 'below the gumline on the back molars: hardened tartar reefs, heavy, still',
    sky: ['#1A1A1E', '#08080C'], far: '#26252A', mid: '#36332F', near: '#0F0E10',
    fog: '#B8AE96', accent: '#C4D600', accent2: '#D8CDB4',
    terrain: { base: '#4A463E', deep: '#1C1A18', edge: '#6E685A', rim: '#B8AE96', top: '#D8CDB4', slab: '#C8BEA6' },
  },
};

// ---------------------------------------------------------------------------------------------
// 3. Materials. Every surface in the mouth is one of these. Each ramp runs hi -> base -> shade -> deep.
// ---------------------------------------------------------------------------------------------
export const material = {
  enamel: {
    hi: '#FFFFFF', base: '#F3F6FC', shade: '#C7D3EA', deep: '#9FB0D0', // in code: player C.enamel/enamelShade, Fountain
    stroke: '#8FA3C9', fissure: '#AEBBD6', glaze: '#E8EEF9', slab: '#D9E2F2', // in code: helm stroke, fountain
    plinth: '#C9D4EA', // in code: Relic plinth
  },
  /** Enamel at a distance: background towers step down in value so foreground enamel and the hero stay brightest. */
  enamelFar: { hi: '#C9D6EE', base: '#9FB0D0', shade: '#6A7DA8', deep: '#2C4377', fissure: '#5F7099' },
  gum: { // gums and soft tissue: orchid/cerise roots, never red-brown
    hi: '#FFD6EA', light: '#F6A5CB', base: '#F277C6', mid: '#D95A9E', shade: '#B23A78', deep: '#6B1F4A', void: '#2A0D26',
    sore: '#F2D9EC', // in code: game.ts '^' hazard spikes
  },
  flesh: { // cheek walls, tongue, palate: dustier and calmer than gum so gums stay the accent
    cheek: '#C9648E', cheekShade: '#8E3D66', tongue: '#E58BB0', tongueShade: '#B65A86', papilla: '#F6B6D0',
    palate: '#D7779E', ridge: '#F0A8C8', ridgeShade: '#A44C78',
  },
  plaque: { // the Film: cute-creepy, glowing, yellow/citrus/orange
    core: '#FFF6A0', glow: '#FCE300', base: '#D9C400', deep: '#B89A1A', // in code: game.ts 'P' walls, Filmling
    lime: '#C4D600', hot: '#FF8200', eye: '#FFFFFF',
  },
  tartar: { // calcified plaque: bone and grey-beige, heavy, matte. No brown stains (no decay imagery)
    hi: '#F1EBDA', crust: '#E8E0C8', bone: '#D8CDB4', base: '#B8AE96', shade: '#8A826E', deep: '#4A463E', vein: '#C4D600',
  },
  sugar: { // crystals and syrup: warm, faceted, translucent
    hi: '#FFFDF5', crystal: '#FFF4E0', facet: '#FFD08A', syrup: '#FFB347', glow: '#FF8200', deep: '#C25A10', shadow: '#6A2E0C',
  },
  paste: { // CURAPROX toothpaste the hero throws: clean white with a brand stripe, glossy
    base: '#F7FBFF', shade: '#D6E2F4', gel: '#BFE3F5', stripe: '#E31C79', stripe2: '#003DA5', glint: '#FFFFFF',
  },
  foam: { // in code: RinseWave, Fountain bubbles
    white: '#FFFFFF', tint: '#CCD8ED', sky: '#8BB8E8', body: 'rgba(220,236,255,0.9)',
  },
  rinse: { // mouthwash and fountain water: cool, clear
    water: 'rgba(160,205,255,0.9)', glow: '#8BB8E8', basin: '#D9E2F2', basinShade: '#AEBBD6', rim: '#9FB0D0', // in code: Fountain
  },
  saliva: { pool: '#6FA3D8', surface: '#B4D7F5', deep: '#1E3F74', glint: '#FFFFFF' },
  stone: { base: '#4A5880', line: '#6F7FA8' }, // in code: LoreStone
} as const;

/** The hero. In code: player.ts `C` and inline literals in Player.draw / drawBlade / drawEmissive. */
export const hero = {
  helm: material.enamel.base, helmShade: material.enamel.shade, helmStroke: material.enamel.stroke, helmGloss: '#FFFFFF',
  visor: brand.ink, visorGlow: '#D8ECFF', visorHalo: brand.sky,
  cloak: brand.blue, cloakBack: brand.blueDark, cloakTrim: brand.white,
  tunic: '#18244A', legs: '#121A36',
  // Brush-blade (CS 5460 style). Today: white shaft, blue grip, pale head.
  brush: { handle: '#DFE7F6', grip: brand.blue, head: '#C9D8F2', filament: '#E8F1FF', filamentTip: '#FFFFFF' },
} as const;

/** Bold handle colours for brush variants and cosmetic unlocks (CS 5460 comes in many). */
export const brushHandles = [
  { id: 'curaprox-blue', name: 'Curaprox Blue', handle: brand.blue, filament: '#E8F1FF' },
  { id: 'cerise', name: 'Cerise', handle: brand.cerise, filament: '#FFE3F0' },
  { id: 'tangerine', name: 'Tangerine', handle: brand.tangerine, filament: '#FFF0DC' },
  { id: 'citrus', name: 'Citrus', handle: brand.citrus, filament: '#F6FBD8' },
  { id: 'orchid', name: 'Orchid', handle: brand.orchid, filament: '#FFE8F6' },
  { id: 'sky', name: 'Soft Sky', handle: brand.sky, filament: '#FFFFFF' },
  { id: 'vivid', name: 'Vivid Yellow', handle: brand.yellow, filament: '#FFFBE0' },
  { id: 'ink', name: 'Night Ink', handle: brand.ink2, filament: '#CCD8ED' },
] as const;

// ---------------------------------------------------------------------------------------------
// 4. Light colours (for g.light and halos). The light map is multiplied x2: #808080 is neutral.
// ---------------------------------------------------------------------------------------------
export const light = {
  neutral: '#808080',
  heroFill: '#5F7FB8',   // in code: Player.lights r 300 i 0.55
  visor: brand.sky,      // in code: r 80 i 0.5
  slash: '#CFE2FF',      // in code: r 160 i 0.9
  fountain: brand.sky,   // in code: r 320 i 0.85
  relic: brand.sky,      // in code: r 260 i 1
  plaque: brand.yellow, sugar: brand.tangerine, gum: brand.orchid, biolum: '#9FE3F0',
  tartar: '#D8C9A8', boss: brand.cerise, candle: '#FFD9A0', moon: '#CCD8ED',
} as const;

/** Light radius / intensity pairs, so new sources sit in the same family as the existing ones. */
export const lightSize = {
  spark: { r: 60, i: 0.6 }, eye: { r: 80, i: 0.5 }, hand: { r: 160, i: 0.9 }, torch: { r: 220, i: 0.9 },
  relic: { r: 260, i: 1 }, hero: { r: 300, i: 0.55 }, fountain: { r: 320, i: 0.85 }, room: { r: 520, i: 0.7 },
} as const;

// ---------------------------------------------------------------------------------------------
// 5. UI colours. The HUD draws on its own canvas; menus are DOM over the game.
// ---------------------------------------------------------------------------------------------
export const ui = {
  text: '#E8EEF9',                          // in code: hud.ts shine number, toasts
  textDim: 'rgba(232,238,249,0.72)',        // in code: styles.css --mist
  textFaint: 'rgba(232,238,249,0.45)',
  panel: 'rgba(6,14,36,0.82)',              // in code: hud.ts toast
  panelSolid: ink.deep,
  vessel: 'rgba(6,14,36,0.85)',             // in code: hud.ts fluor vessel
  stroke: '#E8EEF9',                        // in code: vessel ring
  ring: 'rgba(139,184,232,0.8)',            // in code: vessel outer ring
  hairline: 'rgba(204,216,237,0.18)',
  fluor: brand.sky,
  shine: brand.yellow, shineCore: '#FFF6B0', // in code: hud.ts, entity.ts Shine
  shardFull: material.enamel.base, shardGloss: 'rgba(139,184,232,0.55)',
  shardEmpty: 'rgba(6,14,36,0.75)', shardEmptyStroke: 'rgba(200,214,240,0.45)', // in code: hud.ts
  primary: brand.blue, primaryHover: brand.blue80, primaryText: brand.white,
  focus: brand.sky, danger: brand.cerise, success: brand.citrus, warning: brand.tangerine,
  scrim: 'rgba(5,13,36,0.72)',
} as const;

// ---------------------------------------------------------------------------------------------
// 6. Typography. Futura for anything the game says (uppercase, tracked); Info Display for reading.
// ---------------------------------------------------------------------------------------------
export const font = {
  display: "'Futura LT Pro', Futura, 'Century Gothic', 'Avenir Next', sans-serif", // in code: styles.css --display
  body: "'Info Display Pro', 'Helvetica Neue', Arial, sans-serif",                // in code: styles.css --body
  canvas: '"Futura LT Pro", Futura, "Century Gothic", sans-serif',                // in code: hud.ts FONT
  weight: { book: 400, bold: 700 },
} as const;

export interface TypeStyle { family: 'display' | 'body'; size: number; weight: number; tracking: number; lineHeight: number; upper: boolean; use: string }
/** Sizes are CSS px at the HUD's reference height (820 CSS px); the HUD scales 0.7x-1.4x around it. */
export const type: Record<string, TypeStyle> = {
  gameTitle:    { family: 'display', size: 64, weight: 400, tracking: 0.12, lineHeight: 1.0, upper: true,  use: 'Title screen logo word (styles.css .title)' },
  areaTitle:    { family: 'display', size: 46, weight: 400, tracking: 0.08, lineHeight: 1.1, upper: true,  use: 'Area name on first entry (hud.ts)' },
  bossName:     { family: 'display', size: 28, weight: 400, tracking: 0.24, lineHeight: 1.1, upper: true,  use: 'Boss bar name' },
  menuItem:     { family: 'display', size: 22, weight: 400, tracking: 0.18, lineHeight: 1.3, upper: true,  use: 'Pause / title menu entries' },
  heading:      { family: 'display', size: 18, weight: 700, tracking: 0.16, lineHeight: 1.3, upper: true,  use: 'Panel headings, shop item names' },
  toast:        { family: 'display', size: 17, weight: 400, tracking: 0.01, lineHeight: 1.41, upper: false, use: 'Toasts and lore stones (hud.ts, 24px line)' },
  dialogue:     { family: 'body',    size: 19, weight: 400, tracking: 0.0, lineHeight: 1.5, upper: false, use: 'NPC dialogue body' },
  body:         { family: 'body',    size: 16, weight: 400, tracking: 0.0, lineHeight: 1.5, upper: false, use: 'Descriptions, settings help' },
  hudNumber:    { family: 'display', size: 20, weight: 400, tracking: 0.04, lineHeight: 1.0, upper: false, use: 'Shine counter (hud.ts)' },
  areaSub:      { family: 'display', size: 15, weight: 400, tracking: 0.3, lineHeight: 1.2, upper: true,  use: 'Area subtitle, dialogue speaker' },
  prompt:       { family: 'display', size: 14, weight: 400, tracking: 0.2, lineHeight: 1.0, upper: true,  use: 'World prompts: REST, READ, TALK (objects.ts)' },
  caption:      { family: 'display', size: 12, weight: 400, tracking: 0.24, lineHeight: 1.3, upper: true,  use: 'Key hints, labels, legal line' },
};

// ---------------------------------------------------------------------------------------------
// 7. Spacing, radii, strokes
// ---------------------------------------------------------------------------------------------
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96 } as const;
/** HUD layout (CSS px before HUD scale). In code: hud.ts. */
export const hudLayout = {
  marginX: 34, marginY: 30, vesselR: 30, vesselRing: 4, vesselReady: 7,
  shardStart: 22, shardPitch: 30, shardY: 18, shineX: 14, shineY: 50,
  toastBottom: 70, toastMaxW: 660, toastLine: 24, toastPad: 18, toastGap: 10, titleY: 0.3,
} as const;
export const radius = { xs: 2, sm: 5, md: 8, lg: 12, xl: 20, pill: 999 } as const; // sm: ledge slabs, lg: toasts
export const stroke = { hair: 1.1, fine: 1.5, ui: 2, vessel: 3 } as const;

// ---------------------------------------------------------------------------------------------
// 8. Motion. UI in milliseconds, game feel in seconds (what g.hitstop / g.shake take).
// ---------------------------------------------------------------------------------------------
export const ease = {
  out: (t: number) => 1 - (1 - t) * (1 - t),                   // in code: math.ts easeOut
  inOut: (t: number) => t * t * (3 - 2 * t),                   // in code: math.ts easeInOut
  outBack: (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  linear: (t: number) => t,
} as const;
export const easeCss = {
  out: 'cubic-bezier(0.33, 1, 0.68, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)', outBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  in: 'cubic-bezier(0.32, 0, 0.67, 0)', linear: 'linear',
} as const;

export const duration = { // ms
  instant: 80, fast: 140, base: 250, slow: 400, slower: 650,
  toastIn: 250, toastOut: 400, toastHold: 3800, loreHold: 6500,        // in code: hud.ts, objects.ts
  titleIn: 800, titleHold: 4200, titleOut: 900, titleRule: 1200,        // in code: hud.ts
  roomFade: 280, respawnFade: 900, startFade: 600, hazardFade: 300,      // in code: game.ts, player.ts
  promptFade: 250,                                                       // in code: objects.ts (x4 per second)
} as const;

/** Game feel: the numbers that make a hit feel like a hit. Seconds and world units. */
export const feel = {
  hitstop: { plaque: 0.03, slash: 0.05, hurt: 0.14, relic: 0.2, bossStagger: 0.12, bossKill: 0.35 },
  shake: { // [amplitude in world units, seconds]
    plaque: [2, 0.08], hardLand: [3, 0.1], slash: [3.5, 0.1], spell: [4, 0.12], kill: [5, 0.15],
    relic: [8, 0.4], hurt: [11, 0.32], bossSlam: [14, 0.45],
  },
  flash: { // [rgb 0..1, strength]
    hurt: [[1, 1, 1], 0.4], relic: [[1, 1, 1], 0.6], spell: [[0.55, 0.72, 0.91], 0.12], heal: [[0.7, 0.85, 1], 0.18],
  },
  slowmo: { hurt: [0.35, 0.28], death: [0.25, 0.8] }, // [time scale, seconds]
  squash: { jump: [0.72, 1.3], dash: [1.35, 0.7], landMax: [1.35, 0.7], recover: 14 }, // [sx, sy], damp rate
  hitFlash: 0.12, invuln: 1.3, invulnBlinkHz: 9, // in code: entity.ts Enemy.flash, player.ts
  player: { // in code: player.ts constants
    run: 300, jumpV: 830, gravUp: 2500, gravDown: 3100, maxFall: 820, coyote: 0.09, jumpBuffer: 0.13,
    attackCd: 0.36, slashActive: 0.11, slashLife: 0.22, dashT: 0.19, dashV: 820, dashCd: 0.5, focusT: 0.92,
  },
  idle: { breath: 2.4, sway: 0.9, bob: 2 }, // Hz-ish periods for idle loops (fronds, relic bob, enemy breathing)
} as const;

// ---------------------------------------------------------------------------------------------
// 9. Light and grade presets per biome. `ambient` goes to Renderer.ambient, `grade` merges over
//    DEFAULT_GRADE (exactly what game.ts does with Biome.grade).
// ---------------------------------------------------------------------------------------------
export interface LightPreset { label: string; ambient: string; grade: Partial<Grade>; note: string }
export const DEFAULT_GRADE_TOKENS: Grade = { // mirror of engine/post.ts DEFAULT_GRADE
  tint: [1, 1, 1], lift: [0.0, 0.01, 0.03], saturation: 1.05, contrast: 1.06, exposure: 1,
  bloom: 0.55, bloomThreshold: 0.72, vignette: 0.55, grain: 0.035, aberration: 0.0016, fade: 0, flash: [1, 1, 1, 0],
};
export const lightPreset: Record<BiomeId | 'throne' | 'title', LightPreset> = {
  crown: { label: 'Crown Gate', ambient: '#4A5A80', note: 'Cold moonlit enamel, the brightest area. Teaches the eye.',
    grade: { tint: [0.95, 1.0, 1.08], lift: [0.0, 0.012, 0.045], saturation: 1.0, contrast: 1.06, bloom: 0.55, bloomThreshold: 0.72, vignette: 0.55 } },
  gumline: { label: 'Gumline Hollows', ambient: '#4E3A5E', note: 'Warm and soft. Biolume does the lighting, bloom up.',
    grade: { tint: [1.08, 0.96, 1.02], lift: [0.03, 0.0, 0.03], saturation: 1.12, contrast: 1.02, bloom: 0.72, bloomThreshold: 0.64, vignette: 0.6 } },
  narrows: { label: 'The Narrows', ambient: '#33405F', note: 'Tall, cold, tight. Contrast up so the walls read.',
    grade: { tint: [0.92, 0.98, 1.1], lift: [0.0, 0.015, 0.05], saturation: 0.95, contrast: 1.12, bloom: 0.5, vignette: 0.68 } },
  sugar: { label: 'Sugar Wastes', ambient: '#5A4434', note: 'Hot haze. Highest bloom and grain; crystals sparkle.',
    grade: { tint: [1.1, 1.0, 0.86], lift: [0.04, 0.02, 0.0], saturation: 1.1, contrast: 1.04, bloom: 0.78, bloomThreshold: 0.6, grain: 0.045 } },
  calculus: { label: 'Calculus Deep', ambient: '#2E3040', note: 'Heavy and quiet. Desaturated; plaque glow is the only colour.',
    grade: { tint: [1.0, 0.98, 0.92], lift: [0.01, 0.01, 0.02], saturation: 0.78, contrast: 1.14, bloom: 0.6, bloomThreshold: 0.7, vignette: 0.72, aberration: 0.002 } },
  throne: { label: 'Calculus Throne (boss)', ambient: '#2A2638', note: 'Arena: cerise rim from the boss, tighter vignette.',
    grade: { tint: [1.04, 0.95, 1.0], lift: [0.03, 0.0, 0.02], saturation: 0.9, contrast: 1.16, bloom: 0.7, bloomThreshold: 0.62, vignette: 0.78, aberration: 0.0024 } },
  title: { label: 'Title', ambient: '#909AA8', note: 'In code: game.ts drawTitleBack.', grade: {} },
};
/** Modifiers game.ts applies on top of a preset (documented here so new states follow suit). */
export const gradeModifier = {
  lowHp: { vignetteAdd: 0.25, vignettePulse: 0.08, pulseHz: 0.64, saturationMul: 0.8 }, // in code: game.ts hp === 1
  death: { desaturatePerSec: 1, fadeStart: 0.6, fadeLen: 0.7 },
  flashDecayPerSec: 3.2,
} as const;

// ---------------------------------------------------------------------------------------------
// 10. Particle presets for g.fx.burst(x, y, preset). Spread them and override per call:
//     g.fx.burst(x, y, { ...particle.dust, n: 8 })
// ---------------------------------------------------------------------------------------------
const P = (o: BurstOpts) => o;
export const particle = {
  dust: P({ n: 8, color: ['#A7B6D6', '#7E8FB7'], speed: [30, 140], angle: -Math.PI / 2, spread: 2.6, size: [2, 4.5], grow: 5, gravity: -60, drag: 4, life: [0.3, 0.6] }), // in code: Player.dust
  dashPuff: P({ n: 8, color: '#9FB4D9', speed: [40, 160], spread: 1.2, size: [2, 5], life: [0.3, 0.6], grow: 6 }),
  wallDust: P({ n: 6, color: '#C9D6EE', speed: [40, 140], size: [1.5, 3], life: [0.2, 0.4], spread: 1.5 }),
  spark: P({ n: 6, color: '#FFFFFF', shape: 'streak', speed: [250, 520], spread: 0.8, size: [1, 2], emissive: true, life: [0.08, 0.18] }), // in code: Enemy.onHit
  impactRing: P({ n: 1, color: '#FFFFFF', shape: 'ring', speed: [0, 0], size: [4, 4], grow: 300, emissive: true, life: [0.14, 0.14] }),
  plaqueSplat: P({ n: 12, color: [brand.yellow, brand.citrus, brand.tangerine], speed: [80, 300], size: [2, 4.5], gravity: 900, life: [0.3, 0.7] }), // in code: scrub
  plaqueBurst: P({ n: 26, color: [brand.yellow, brand.citrus, brand.tangerine], speed: [80, 460], size: [2, 5], gravity: 1000, life: [0.4, 1.0], drag: 1.5 }), // in code: Enemy.die
  tartarChip: P({ n: 14, color: [material.tartar.bone, material.tartar.base, material.tartar.crust], shape: 'square', speed: [120, 380], size: [1.5, 3.5], gravity: 1100, spin: 18, life: [0.4, 0.9] }),
  foam: P({ n: 26, color: ['#FFFFFF', brand.sky], shape: 'bubble', speed: [60, 320], size: [2, 6], life: [0.3, 0.9], gravity: -60 }), // in code: RinseWave.pop
  fountain: P({ n: 1, color: brand.blue20, shape: 'bubble', speed: [10, 40], angle: -Math.PI / 2, spread: 0.6, size: [1, 3], gravity: -30, life: [0.8, 1.6], emissive: true }), // in code: Fountain
  pasteSplat: P({ n: 16, color: [material.paste.base, material.paste.gel, material.paste.stripe], speed: [80, 320], size: [2, 5], gravity: 700, drag: 2.5, life: [0.35, 0.8] }),
  sugar: P({ n: 10, color: [material.sugar.crystal, material.sugar.facet, brand.tangerine], shape: 'square', speed: [60, 260], size: [1, 2.6], gravity: 500, spin: 24, life: [0.4, 1.0], emissive: true }),
  shine: P({ n: 5, color: brand.yellow, speed: [40, 120], size: [1, 2], life: [0.2, 0.4], emissive: true }), // in code: Shine pickup
  heal: P({ n: 24, color: [brand.sky, brand.white], speed: [80, 260], size: [1, 2.5], life: [0.3, 0.7], emissive: true }), // in code: focus heal
  relic: P({ n: 60, color: ['#FFFFFF', brand.sky, brand.yellow], speed: [80, 520], size: [1, 3], life: [0.4, 1.2], shape: 'streak', emissive: true }), // in code: Relic
  hurtShards: P({ n: 18, color: [material.enamel.base, brand.sky, brand.ink2], speed: [150, 420], size: [1.5, 4], gravity: 900, life: [0.3, 0.8], shape: 'square', spin: 20 }), // in code: Player.hurt
  spore: P({ n: 1, color: [brand.orchid, '#9FE3F0'], speed: [4, 18], angle: -Math.PI / 2, spread: 1.2, size: [0.8, 1.8], gravity: -8, drag: 0.4, life: [3, 6], emissive: true }),
} as const;
export type ParticleId = keyof typeof particle;

// ---------------------------------------------------------------------------------------------
// 11. Emissive budget: how much of the frame may glow (see ART-BIBLE.md "Light").
// ---------------------------------------------------------------------------------------------
export const emissiveBudget = {
  screenCoverMax: 0.08,  // share of the screen above bloom threshold in calm play
  combatCoverMax: 0.15,  // in a fight, with sparks and spells
  haloAlpha: { ambient: 0.15, prop: 0.45, actor: 0.6, hero: 0.55, burst: 0.9 },
  maxLightsPerRoom: 24,
} as const;
