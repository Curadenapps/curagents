// Content registries. Content modules (enemies, world, NPCs) register into these at import time;
// the core never imports content directly except through the index files listed in main.ts.
import type { Game, Entity } from './types';
import type { Room } from './room';
import type { Grade } from '../engine/post';

/** Map character in a room map -> spawned entity. x,y are the cell centre in world units. */
export type Factory = (g: Game, x: number, y: number, room: Room) => Entity | null | void;
export const Legend: Record<string, Factory> = {};

/** Object placed by room data (NPCs, relics, signs...). x,y are tile coords of the anchor cell's centre. */
export interface RoomObject { type: string; x: number; y: number; [k: string]: unknown }
export type ObjectFactory = (g: Game, o: RoomObject, room: Room) => Entity | null | void;
export const Objects: Record<string, ObjectFactory> = {};

export interface RoomDef {
  id: string;
  biome: string;
  /** Rows of characters, all the same length. One char = one 32-unit tile.
   *  Terrain is a Path2D (room.terrain) meant for fill(path, 'evenodd') and clip(path, 'evenodd'). */
  map: string[];
  /** Door marker digit -> the room and marker it leads to. */
  doors: Record<string, { to: string; door: string }>;
  objects?: RoomObject[];
  /** Area name shown on first entry. */
  title?: string; subtitle?: string;
  music?: string;          // overrides the biome's track
  ambient?: string;        // overrides the biome's ambient light colour
  dark?: number;           // 0..1 extra darkness
}
export const Rooms: Record<string, RoomDef> = {};

export interface TerrainStyle { base: string; deep: string; edge: string; rim: string; top: string; slab: string }
export interface Biome {
  id: string; name: string;
  ambient: string;         // light-map base colour (#rrggbb). Mid grey (#808080) is neutral.
  grade?: Partial<Grade>;
  music?: string;
  terrain: TerrainStyle;
  /** Fill the screen behind the room. Called with an identity transform on the scene canvas. */
  drawBack(ctx: CanvasRenderingContext2D, g: Game): void;
  /** Optional details over the terrain fill (moss, enamel veins, plaque crust). World transform set. */
  drawTerrain?(ctx: CanvasRenderingContext2D, g: Game, room: Room): void;
  /** Foreground silhouettes and haze over everything (scene canvas, identity transform). */
  drawFront?(ctx: CanvasRenderingContext2D, g: Game): void;
  /** Emissive extras (spores, glints). World transform set on the emissive canvas. */
  drawEmissive?(ctx: CanvasRenderingContext2D, g: Game): void;
  /** Ambient lights for the room (called each frame). */
  lights?(g: Game): void;
  /** Ambient particles (called each frame). */
  update?(g: Game, dt: number): void;
}
export const Biomes: Record<string, Biome> = {};

export interface NpcDef {
  id: string; name: string; title?: string;
  /** Who they are and how they talk; fed to the AI voice. */
  persona: string;
  /** Written lines used when the AI voice is off or unavailable. Chosen by the npc module. */
  lines: string[];
}
export const Npcs: Record<string, NpcDef> = {};

export const register = {
  legend(ch: string, f: Factory) { if (Legend[ch]) console.warn('legend char reused: ' + ch); Legend[ch] = f; },
  object(type: string, f: ObjectFactory) { Objects[type] = f; },
  room(def: RoomDef) { Rooms[def.id] = def; },
  biome(b: Biome) { Biomes[b.id] = b; },
  npc(n: NpcDef) { Npcs[n.id] = n; },
};
