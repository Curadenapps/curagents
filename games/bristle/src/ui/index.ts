// UI layer (title, pause, dialogue). PLACEHOLDER owned by the UI/NPC agent: replace freely, keep installUi's signature.
import type { GameCore } from '../game/game';
import type { UiApi } from '../game/types';
import type { Hud } from './hud';
import { Npcs } from '../game/registry';

export function installUi(g: GameCore, hud: Hud, root: HTMLElement): UiApi & { update(dt: number): void } {
  let open = false;
  const api = {
    toast: (t: string, ms?: number) => hud.toast(t, ms),
    areaTitle: (t: string, s?: string) => hud.areaTitle(t, s),
    async talk(id: string) { const n = Npcs[id]; if (n) hud.toast(n.name + ': ' + n.lines[0], 5000); },
    isOpen: () => open,
    ending() { hud.areaTitle('Ivoria breathes again', 'To be continued'); },
    update(_dt: number) {
      if (g.state === 'title' && (g.input.tap('confirm') || g.input.tap('jump') || g.input.tap('attack'))) { g.audio.unlock(); g.startGame(!g.hasSave()); }
      if (g.state === 'play' && g.input.tap('pause')) { g.state = 'paused'; open = true; root.innerHTML = '<div class="pause">PAUSED</div>'; }
      else if (g.state === 'paused' && (g.input.tap('pause') || g.input.tap('back'))) { g.state = 'play'; open = false; root.innerHTML = ''; }
    },
  };
  root.innerHTML = '<div class="title">BRISTLE<br><small>Press Space</small></div>';
  g.onRoomEnter.push(() => { if (g.state === 'play') root.innerHTML = ''; });
  return api;
}
