// The Orders: one hero, three earned armour sets (plus the Initiate everyone starts as), swapped at fountains.
// Art lives in src/design/hero.ts (shared with the style guide); this file owns ownership, unlocks and stats.
//   Saved as flags: `order` = the set worn, `order-<id>` = owned.
//   You play the Initiate until the Glutton (the first boss) is rinsed away; then all three sets unlock and a card
//   pick asks which to wear (progress.ts openOrders). After that, rest again at a fountain to change sets.
//   Every room stays beatable in any set: map progress is tied to relics, never to a set.
import { orderArts, ORDER_IDS, EARNED_ORDERS, type OrderId } from '../design/hero';
import type { Game } from './types';

export type { OrderId };
export const ART = orderArts();

export interface OrderStats {
  hp: number;        // added to the save's max health
  run: number;       // run speed multiplier
  atkCd: number;     // slash cooldown multiplier
  chargeT: number;   // seconds to charge the Deep Clean
  airDashes: number; // extra air dashes
  slash: number;     // extra cleaning power per slash
  guard: boolean;    // dash blocks shots (shield charge)
}
/** Proposal numbers from PLAN-v2 section 4; tune in play. */
export const ORDER_STATS: Record<OrderId, OrderStats> = {
  initiate: { hp: 0, run: 1, atkCd: 1, chargeT: 0.6, airDashes: 0, slash: 0, guard: false },
  vanguard: { hp: 0, run: 0.97, atkCd: 1.15, chargeT: 0.4, airDashes: 0, slash: 3, guard: false }, // CS 5460 greatsword: heavy sweeps
  duelist: { hp: 0, run: 1.05, atkCd: 0.7, chargeT: 0.6, airDashes: 0, slash: -1, guard: false },  // two single tufts: fast jabs
  ranger: { hp: -1, run: 1.067, atkCd: 0.92, chargeT: 0.6, airDashes: 1, slash: 0, guard: false },
  lancer: { hp: 2, run: 0.9, atkCd: 1.15, chargeT: 0.6, airDashes: 0, slash: 3, guard: true },     // Hydrosonic lance: charge blocks shots
};

/** Sets exist only after the first boss (or with the dev flag &all). Older saves that unlocked one early stay Initiate. */
export const ordersOpen = (g: Game) => !!g.save.flags['glutton-defeated'] || !!g.save.flags['orders-dev'];
export const owned = (g: Game, id: OrderId) => id === 'initiate' || (ordersOpen(g) && (!!g.save.flags['order-' + id] || (id === 'lancer' && !!g.save.flags['order-bulwark'])));
export const ownedOrders = (g: Game) => ORDER_IDS.filter((id) => owned(g, id));
export function currentOrder(g: Game): OrderId {
  const raw = g.save.flags.order as string, o = (raw === 'bulwark' ? 'lancer' : raw) as OrderId; // the Bulwark became the Lancer
  return ORDER_IDS.includes(o) && owned(g, o) ? o : 'initiate';
}
/** Max health follows the set worn. Call after anything that changes save.maxHp. */
export function applyOrder(g: Game) {
  const p = g.player; if (!p) return;
  p.maxHp = Math.max(1, g.save.maxHp + ORDER_STATS[currentOrder(g)].hp + ((g as any).diff?.hp ?? 0)); // Gentle adds health
  if (p.hp > p.maxHp) p.hp = p.maxHp;
}
export function setOrder(g: Game, id: OrderId) {
  if (!owned(g, id)) return;
  g.setFlag('order', id); applyOrder(g); g.player?.heal(99);
}
export function unlockOrder(g: Game, id: OrderId, equip = false) {
  if (owned(g, id)) return;
  g.setFlag('order-' + id, true);
  if (equip) setOrder(g, id);
  const a = ART[id];
  g.ui.toast(equip ? `You wear the ${a.name} set now. ${a.line} Rest again at any fountain to change sets.` : `New Order: ${a.name}. ${a.line} Change sets at any fountain.`, 6200);
}
/** After the first boss: own all three sets at once (no toasts); the card pick chooses which to wear. */
export function unlockAllOrders(g: Game) { for (const id of EARNED_ORDERS) g.setFlag('order-' + id, true); }
/** The next owned set after the one worn (for "rest again to change"). */
export function nextOrder(g: Game): OrderId {
  const list = ownedOrders(g), i = list.indexOf(currentOrder(g));
  return list[(i + 1) % list.length];
}
