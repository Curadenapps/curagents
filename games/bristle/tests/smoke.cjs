// Smoke test: boots the built game in headless Chromium (WebGL via SwiftShader), plays a few seconds,
// saves screenshots and fails on any page error.
//   node tests/smoke.cjs [outDir] [query]      e.g. node tests/smoke.cjs /tmp/shots "room=crown-gate&all"
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', 'dist', 'shots'); require('fs').mkdirSync(out, { recursive: true });
  const q = process.argv[3] || 'play';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?' + q);
  await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, 'smoke-1.png') });
  await p.keyboard.down('KeyD'); await p.waitForTimeout(600); await p.keyboard.press('Space'); await p.waitForTimeout(200); await p.keyboard.press('KeyJ');
  await p.waitForTimeout(120); await p.screenshot({ path: path.join(out, 'smoke-2.png') }); await p.waitForTimeout(800); await p.keyboard.up('KeyD');
  const st = await p.evaluate(() => { const g = window.BRISTLE.g; return { state: g.state, room: g.room && g.room.id, entities: g.entities.length, hp: g.player && g.player.hp }; });
  console.log(JSON.stringify(st)); if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1; } else console.log('OK, no page errors');
  await b.close();
})();
