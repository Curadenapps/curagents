// Types for personas.mjs (the game bundle imports it).
export interface Persona { name: string; title: string; persona: string; voice: string; fallback: string[] }
export interface VoiceState {
  area: string; abilities: string[]; kills: number; foes: string[]; boss: boolean;
  maxHp: number; blade: number; paste: boolean; brush: string; met: boolean;
}
export const PERSONAS: Record<string, Persona>;
export const NPC_IDS: string[];
export const GREET_PROMPT: string;
export function cleanState(s: unknown): VoiceState;
export function buildSystemPrompt(npcId: string, state: unknown): string;
export function quoteKnight(text: string): string;
export function sanitizeReply(text: unknown, npcId: string): string | null;
