// CONTRACTS. Every module talks to the game through these types. Change them only in the core.
import type { Rng, Rect } from '../engine/math';
import type { Camera, Light, Renderer } from '../engine/render';
import type { Particles } from '../engine/particles';
import type { Input } from '../engine/input';
import type { Room } from './room';

export type Team = 'player' | 'enemy' | 'neutral';
/** Enemy families. Mastery of a faction raises your damage against it. 'gum' = inflammation. */
export type Faction = 'plaque' | 'sugar' | 'tartar' | 'gum';
export type HitKind = 'slash' | 'pogo' | 'spell' | 'contact' | 'projectile' | 'hazard';
export interface Hit { damage: number; dirX: number; dirY: number; kind: HitKind; source?: Entity; /** A charged Deep Clean: breaks guards and shields. */ heavy?: boolean }

export interface Entity extends Rect {
  id: number;
  vx: number; vy: number;
  dead: boolean;
  team: Team;
  /** Draw order: lower first. Terrain is 0, most actors 10, player 20, front effects 30. */
  z: number;
  /** Can the player's attacks hit it? */
  hurtable: boolean;
  /** Damage dealt to the player on touch (0 for none). */
  contactDamage: number;
  /** Down-slash bounces off it. */
  pogo: boolean;
  update(g: Game, dt: number): void;
  draw(ctx: CanvasRenderingContext2D, g: Game): void;
  drawEmissive?(ctx: CanvasRenderingContext2D, g: Game): void;
  /** Push lights with g.light(...) each frame. */
  lights?(g: Game): void;
  /** Return true if the hit landed (for hitstop, fluor gain, pogo). */
  onHit?(g: Game, hit: Hit): boolean;
  /** Called by the room when the entity is removed or the room unloads. */
  dispose?(g: Game): void;
}

export interface SfxOpts { x?: number; y?: number; vol?: number; pitch?: number }
export interface AudioApi {
  unlock(): void;
  sfx(name: string, opts?: SfxOpts): void;
  /** Start or crossfade to a music track by id (null for silence). */
  music(track: string | null): void;
  /** 0 = exploring, 1 = full combat. The score follows it. */
  intensity(v: number): void;
  setVolumes(master: number, music: number, sfx: number): void;
  update(g: Game, dt: number): void;
}

export interface SaveData {
  v: number;
  room: string; door: string;           // where to respawn (fountain room and marker)
  maxHp: number; hp: number; fluor: number;
  shine: number;
  abilities: { dash: boolean; grip: boolean; rinse: boolean; pulse: boolean };
  flags: Record<string, boolean | number | string>;   // story and world state
  killed: Record<string, number>;       // bestiary counts by enemy type
  visited: Record<string, boolean>;
  /** difficulty: 0 Gentle, 1 Knight, 2 Veteran. brightness: exposure 0.6-1.1. */
  settings: { master: number; music: number; sfx: number; shake: number; quality: number; aiVoices: boolean; difficulty: number; brightness: number };
  playTime: number;
  progress: { xp: number; level: number; points: number; mastery: Record<Faction, number>; perks: string[] };
}

/** What NPCs and UI can ask of the game. */
export interface UiApi {
  toast(text: string, ms?: number): void;
  areaTitle(title: string, sub?: string): void;
  /** Open a conversation. Resolves when it closes. */
  talk(npcId: string): Promise<void>;
  isOpen(): boolean;
  /** Roll the ending (called by the final boss once it is defeated). */
  ending(): void;
}

export interface Game {
  time: number;                 // seconds since boot (unscaled)
  gameTime: number;             // seconds of play (scaled, stops in menus and hitstop)
  dt: number;
  r: Renderer; cam: Camera; fx: Particles; audio: AudioApi; input: Input; rng: Rng; ui: UiApi;
  room: Room;
  player: PlayerApi;
  entities: Entity[];
  save: SaveData;
  spawn<T extends Entity>(e: T): T;
  nextId(): number;
  light(l: Light): void;
  shake(amount: number, seconds?: number): void;
  hitstop(seconds: number): void;
  slowmo(scale: number, seconds: number): void;
  flash(color: [number, number, number], strength: number): void;
  /** Damage the player (respects invulnerability). */
  hurtPlayer(damage: number, fromX: number, kind?: HitKind): void;
  /** Give currency with a little fountain of coins at x,y. */
  dropShine(x: number, y: number, amount: number): void;
  /** Persist save to storage. */
  persist(): void;
  /** Story flags. */
  flag(name: string): boolean | number | string | undefined;
  setFlag(name: string, v: boolean | number | string): void;
  /** Levelling, faction mastery and Oath perks. */
  progress: ProgressApi;
  /** Switch rooms through a door marker. */
  goto(roomId: string, door: string): void;
  /** Fade out, run fn, fade back in. */
  transition(fn: () => void, seconds?: number): void;
  /** True while a fade or room change is running (input should be ignored). */
  busy(): boolean;
}

export interface ProgressApi {
  /** Award XP (and faction mastery when a faction is given). */
  gain(xp: number, faction?: Faction): void;
  /** Called by Enemy.die. */
  onKill(e: Entity & { faction?: Faction; maxHp?: number; type?: string }): void;
  /** Damage multiplier for the player's hits against a faction. */
  damageMult(faction: Faction): number;
  /** Is an Oath perk owned? */
  has(perk: string): boolean;
  masteryLevel(f: Faction): number;
  open(): void;
}

export interface PlayerApi extends Entity {
  facing: 1 | -1;
  hp: number; maxHp: number; fluor: number;
  grounded: boolean;
  invuln: number;
  dashing: boolean;
  /** Push the player (knockback, wind). */
  push(vx: number, vy: number): void;
  /** Bounce up as if pogoing. */
  bounce(strength?: number): void;
  heal(n: number): void;
  gainFluor(n: number): void;
  /** Inflame the player for some seconds (gum-faction attacks): halves fluor gain, slows healing. */
  inflame(seconds: number): void;
  inflamed: number;
}
