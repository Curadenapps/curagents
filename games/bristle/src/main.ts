// Boot: build the game, load content modules, run the loop.
import './game/objects';
import './game/world/index';
import './game/enemies/index';
import './game/npc/index';
import { GameCore } from './game/game';
import { Audio } from './engine/audio';
import { Hud } from './ui/hud';
import { installUi } from './ui/index';
import { installProgress } from './game/progress/progress';
import { Tips } from './game/tips';
import { brand as BR, font as FT } from './design/tokens';
import { installShotHud } from './game/shot';
{ const rs = document.documentElement.style; rs.setProperty('--blue', BR.blue); rs.setProperty('--cerise', BR.cerise); rs.setProperty('--ink', BR.ink); rs.setProperty('--display', FT.display); rs.setProperty('--body', FT.body); }

declare const __BUILD_TIME__: string;
const view = document.getElementById('view') as HTMLCanvasElement;
const hudCv = document.getElementById('hud') as HTMLCanvasElement;
const root = document.getElementById('ui') as HTMLElement;

const g = new GameCore(view, new Audio());
const hud = new Hud(hudCv);
const progress = installProgress(g);
const tips = new Tips(g); (window as any).BRISTLE_TIPS = tips;
const ui = installUi(g, hud, root);
g.ui = ui;
(window as any).BRISTLE = { g, build: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'dev' };
window.addEventListener('pointerdown', () => g.audio.unlock());
window.addEventListener('keydown', () => g.audio.unlock());

// Dev helpers: ?room=<id>&door=<marker>&all (all abilities) &god (no damage)
installShotHud(g as any);
const qs = new URLSearchParams(location.search);
if (qs.get('room')) { g.save.room = qs.get('room')!; g.save.door = qs.get('door') ?? '@'; }
if (qs.has('all')) { Object.keys(g.save.abilities).forEach((k) => ((g.save.abilities as any)[k] = true)); for (const o of ['vanguard', 'ranger', 'bulwark']) g.save.flags['order-' + o] = true; }
if (qs.get('order')) g.save.flags.order = qs.get('order')!;
if (qs.has('room') || qs.has('play')) { g.startGame(false); }
if (qs.has('god')) { const orig = g.hurtPlayer.bind(g); g.hurtPlayer = () => {}; (window as any).BRISTLE.ungod = () => (g.hurtPlayer = orig); }

const STEP = 1 / 120;
let last = performance.now(), acc = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const real = Math.min(0.1, (now - last) / 1000); last = now; g.time += real;
  g.input.poll(g.time);
  progress.update(real);
  ui.update(real);
  acc += real; let n = 0;
  while (acc >= STEP && n < 12) { g.update(STEP); acc -= STEP; n++; }
  if (n === 12) acc = 0;
  if (!g.modal) tips.update(real);
  g.dt = real;
  g.draw();
  hud.draw(g, real);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden && g.state === 'play') { g.state = 'paused'; } });
