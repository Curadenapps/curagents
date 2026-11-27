// Steady XP from progress, not only fights: every first time you read an oath stone, enter a room or area,
// meet someone, rest at a fountain or find a relic, the level bar moves. Each reward is paid once per save.
import type { Game } from './types';

export const XP = { lore: 6, room: 4, area: 12, talk: 5, rest: 4, relic: 15 } as const;

/** Pay `xp` once for `key` (saved as flag `xp:<key>`) and float the amount at (x, y). */
export function rewardOnce(g: Game, key: string, xp: number, x: number, y: number, label?: string) {
  const k = 'xp:' + key; if (g.save.flags[k]) return;
  g.save.flags[k] = true;
  g.progress?.gain(xp);
  (g as any).float?.(x, y, `+${xp} XP${label ? ' · ' + label : ''}`, '#8BB8E8');
}
