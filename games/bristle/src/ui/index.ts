// UI layer: title, pause, settings, controls, credits, field notes, dialogue, Pip's shop and the ending.
// Screens live on a stack inside #ui; only the top one reads input. installUi keeps the core's signature.
import type { GameCore } from '../game/game';
import type { UiApi } from '../game/types';
import type { Hud } from './hud';
import { Npcs } from '../game/registry';
import { loadSettings, keyName, type Screen } from './kit';
import { TitleScreen, drawTitleScene } from './title';
import { SettingsPanel, FieldNotes, Confirm, PauseScreen, controlsPanel, creditsPanel } from './panels';
import { Dialogue } from './dialogue';
import { ShopScreen } from './shop';
import { EndingScreen } from './ending';

export function installUi(g: GameCore, hud: Hud, root: HTMLElement): UiApi & { update(dt: number): void } {
  const stack: Screen[] = [];
  const top = () => stack[stack.length - 1];
  const push = (s: Screen) => {
    top()?.onHide?.(); stack.push(s); root.append(s.el);
    s.el.classList.add('is-entering'); requestAnimationFrame(() => requestAnimationFrame(() => s.el.classList.remove('is-entering')));
    s.onShow?.(); g.input.clear();
  };
  const pop = (s: Screen) => {
    const i = stack.indexOf(s); if (i < 0) return;
    stack.splice(i, 1); s.onHide?.();
    s.el.classList.add('is-closing'); setTimeout(() => s.el.remove(), 220);
    top()?.onShow?.(); g.input.clear();
  };
  const clear = () => { while (stack.length) pop(stack[stack.length - 1]); };
  const panelHost = { push, pop };
  const confirm = (q: string, yes: string, no: string) => new Promise<boolean>((res) => push(new Confirm(g, panelHost, q, yes, no, res)));

  loadSettings(g);

  // ---------------------------------------------------------------- title
  let title: TitleScreen | null = null, titleMusic = false;
  const showTitle = (skipPress: boolean) => {
    clear(); title = new TitleScreen(g, {
      continueGame: () => { clear(); title = null; g.startGame(false); loadSettings(g); g.input.clear(); },
      newGame: () => { clear(); title = null; g.startGame(true); loadSettings(g); g.input.clear(); startHints(); },
      settings: () => push(new SettingsPanel(g, panelHost)),
      controls: () => push(controlsPanel(g, panelHost)),
      credits: () => push(creditsPanel(g, panelHost)),
      confirm,
    }, skipPress);
    push(title); titleMusic = false;
  };
  g.drawTitleBack = () => drawTitleScene(g, g.time, title ? title.sceneFade() : 0);

  // ---------------------------------------------------------------- pause
  let pauseScreen: PauseScreen | null = null;
  const resume = () => { if (pauseScreen) pop(pauseScreen); pauseScreen = null; if (g.state === 'paused') g.state = 'play'; g.input.clear(); };
  const pause = () => {
    if (pauseScreen) return; g.state = 'paused';
    const progress = (g as any).progress; // core progression (Oath tree), when present
    pauseScreen = new PauseScreen(g, {
      resume,
      oath: typeof progress?.open === 'function' ? () => { resume(); progress.open(); } : undefined,
      notes: () => push(new FieldNotes(g, panelHost)),
      settings: () => push(new SettingsPanel(g, panelHost)),
      controls: () => push(controlsPanel(g, panelHost)),
      quit: () => { g.persist(); pauseScreen = null; g.state = 'title'; showTitle(true); },
    });
    push(pauseScreen);
  };

  // ---------------------------------------------------------------- dialogue and shop
  const dialogueHost = {
    push, pop, visit: 0, greeted: {} as Record<string, number>,
    openShop: () => new Promise<void>((res) => { const s: ShopScreen = new ShopScreen(g, () => { pop(s); res(); }); push(s); }),
  };
  g.onRoomEnter.push(() => { dialogueHost.visit++; });
  let dialogue: Dialogue | null = null;

  // ---------------------------------------------------------------- first-minute hints
  let hintT = -1, hintI = 0;
  const startHints = () => { hintT = 0; hintI = 0; };
  const HINTS: [number, () => string][] = [
    [1.2, () => g.input.usingPad ? 'Move with the left stick.' : 'Move with A and D, or the arrow keys.'],
    [7, () => `Jump with ${keyName(g, 'jump')}. Hold it to jump higher.`],
    [13, () => `Swing your brush-blade with ${keyName(g, 'attack')}.`],
    [20, () => `In the air, hold down and strike to pogo off the Film.`],
    [28, () => `Sweeping fills your vessel with fluor. Hold ${keyName(g, 'focus')} to mend, or press ${keyName(g, 'spell')} to throw paste.`],
  ];

  // ---------------------------------------------------------------- the API
  const api = {
    toast: (t: string, ms?: number) => hud.toast(t, ms),
    areaTitle: (t: string, s?: string) => hud.areaTitle(t, s),
    talk(id: string): Promise<void> {
      if (dialogue || stack.length || !Npcs[id]) return Promise.resolve();
      const d = new Dialogue(g, id, dialogueHost); dialogue = d; push(d);
      return d.done.finally(() => { if (dialogue === d) dialogue = null; });
    },
    isOpen: () => stack.length > 0,
    ending() {
      if (stack.some((s) => s instanceof EndingScreen)) return;
      dialogue?.close(); clear();
      const e: EndingScreen = new EndingScreen(g, () => { pop(e); g.persist(); g.state = 'title'; showTitle(true); });
      push(e);
    },
    update(dt: number) {
      if (g.state === 'title') {
        if (!title) showTitle(false);
        if (!titleMusic) { titleMusic = true; g.audio.music('title'); }
      } else if (g.state === 'paused') {
        if (!pauseScreen && !stack.some((s) => s instanceof EndingScreen)) pause();
      } else if (g.state === 'play') {
        if (title) { pop(title); title = null; }
        if (!stack.length && !g.busy() && g.input.tap('pause')) { g.input.consume('back'); pause(); }
        if (stack.length && g.player) g.player.invuln = Math.max(g.player.invuln, 0.25); // nothing hurts you mid-sentence
        if (hintT >= 0 && !stack.length && !g.busy()) {
          hintT += dt;
          if (hintI < HINTS.length && hintT >= HINTS[hintI][0]) { hud.toast(HINTS[hintI][1](), 4200); hintI++; }
          if (hintI >= HINTS.length) hintT = -1;
        }
      }
      top()?.update(dt);
    },
  };
  return api;
}
