/* Plaque Hunter — menus, HUD and results. Plain DOM over the canvas, built from the Curaprox Apps Design System:
   Futura caps headings, Lead for short text, Info Display copy, pill buttons, hairline cards, Lucide icons. */
(function () {
  const PH = window.PH, S = PH.Store, A = PH.Audio, H = PH.Hunt, Art = PH.Art, C = PH.C;
  const UI = (PH.UI = {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Icons are Lucide (24px canvas, 1.5px stroke). `lucide` is the Lucide name; `d` is a stand-in stroke glyph used until Lucide has loaded.
  const ICON = {
    pause: { lucide: 'Pause', d: 'M9 5v14M15 5v14' },
    close: { lucide: 'X', d: 'M6 6l12 12M18 6L6 18' },
    book: { lucide: 'BookOpen', d: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z' },
    brush: { lucide: 'Brush', d: 'M3 9h9v4H3zM12 11h9M5 9V5M7.5 9V5M10 9V5' },
    calendar: { lucide: 'Calendar', d: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4' },
    link: { lucide: 'Link', d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
    settings: { lucide: 'Settings', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1' },
    bug: { lucide: 'Bug', d: 'M8 8a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0zM12 12v6M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2' },
    flame: { lucide: 'Flame', d: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z' },
    star: { lucide: 'Star', d: 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z' },
    shield: { lucide: 'Shield', d: 'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z' },
    bell: { lucide: 'Bell', d: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0' },
    bag: { lucide: 'ShoppingBag', d: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2' },
    visit: { lucide: 'Stethoscope', d: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2M18 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    prime: { lucide: 'Target', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01' },
  };
  function svgFor(n) {
    const def = ICON[n];
    try {
      const L = window.lucide;
      if (L && L.icons && L.icons[def.lucide] && L.createElement) {
        const el = L.createElement(L.icons[def.lucide]);
        el.setAttribute('class', 'ic'); el.setAttribute('stroke-width', '1.5'); el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-ic', n);
        return el.outerHTML;
      }
    } catch (e) { /* fall through to the stand-in glyph */ }
    return '<svg class="ic" data-ic="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + def.d + '"/></svg>';
  }
  const icon = svgFor;
  function paintIcons(root) { (root || document).querySelectorAll('[data-ic]').forEach((el) => { if (ICON[el.dataset.ic]) el.outerHTML = svgFor(el.dataset.ic); }); }
  UI.lucide = () => paintIcons(document); // called when the Lucide script arrives
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON.star.d + '"/></svg>';

  const fmtTime = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtDur = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };
  const pct = (v) => Math.round(v * 100) + '%';

  function restart(el) { el.hidden = true; void el.offsetWidth; el.hidden = false; }
  let toastT = 0, bannerT = 0;
  UI.toast = function (text) { const el = $('toast'); el.textContent = text; restart(el); clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 3600); };
  UI.banner = function (title, sub) { $('banner-title').textContent = title; $('banner-sub').textContent = sub || ''; const el = $('banner'); restart(el); clearTimeout(bannerT); bannerT = setTimeout(() => (el.hidden = true), 2100); };
  UI.countdown = function (n) { const el = $('countdown'); if (n == null) { el.hidden = true; return; } $('countdown-n').textContent = n; restart(el); };

  UI.scene = function (name) {
    PH.G.scene = name;
    const map = { title: 'title', story: 'story', home: 'home', hunt: 'hud', prime: 'primehud' };
    for (const id of ['title', 'story', 'home', 'hud', 'primehud']) $(id).hidden = id !== map[name];
    if (name === 'home') UI.home();
  };

  function plaqCanvas(id, px, locked) {
    const cv = document.createElement('canvas'), dpr = 2; cv.width = cv.height = px * dpr;
    const c = cv.getContext('2d'); Art.plaqling(c, id, px * dpr / 2, px * dpr * (id === 'gapper' ? 0.54 : 0.6), px * dpr * (id === 'speckle' ? 0.2 : 0.25), 1.2, { silhouette: locked, look: { x: 0.3, y: -0.2 }, seed: 2 });
    return cv;
  }
  function weekCells(n) {
    const today = S.dayKey(S.now()), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const key = S.shiftDay(today, -i), rec = S.data.days[key] || {}, d = new Date(key + 'T12:00:00');
      out.push('<div class="day' + (i === 0 ? ' today' : '') + '"><span>' + (n > 7 ? d.getDate() : 'SMTWTFS'[d.getDay()]) + '</span><div class="halves"><i class="' + (rec.am ? 'on' : '') + '"></i><i class="' + (rec.pm ? 'on' : '') + '"></i></div><div class="dot' + (rec.prime ? ' on' : '') + '"></div></div>');
    }
    return out.join('');
  }

  // ---- home ----
  UI.home = function () {
    const t = S.tide(), st = S.streakNow(), rk = S.rank(), d = S.data, stale = S.staleness();
    PH.Main.ambient();
    $('chip-rank').innerHTML = icon('star') + rk.name;
    $('chip-streak').innerHTML = icon('flame') + st.count + (st.count === 1 ? ' day' : ' days');
    $('tide-eyebrow').textContent = t.slot === 'am' ? 'Morning tide' : 'Evening tide';
    const hunt = $('btn-hunt');
    if (!t.done) {
      $('tide-title').textContent = 'The tide is in';
      $('tide-sub').textContent = !d.runs ? 'Twenty-eight pearls are waiting for their first hunt.' : stale > 0.75 ? 'The Plaqlings have moved back in. Film on every pearl.' : stale > 0.3 ? 'A little film is settling back in.' : 'Still gleaming from last time. Ride anyway.';
      hunt.disabled = false; hunt.textContent = 'Ride the tide';
    } else {
      $('tide-title').textContent = 'Tide ridden';
      $('tide-sub').textContent = 'The ' + (t.slot === 'am' ? 'evening' : 'morning') + ' tide comes in at ' + fmtTime(t.nextAt) + ', in ' + fmtDur(t.nextAt - t.now) + '.';
      hunt.disabled = true; hunt.textContent = 'Next tide at ' + fmtTime(t.nextAt);
    }
    const pr = $('btn-prime'); pr.disabled = t.primeDone; pr.textContent = t.primeDone ? 'Prime time done' : 'Prime time';
    $('week').innerHTML = weekCells(7);
  };

  UI.startHunt = function (practice) { A.unlock(); A.tap(); UI.scene('hunt'); H.start({ practice }); };

  // ---- HUD ----
  let jar = null, lastSecs = -1, lastTog = -1;
  UI.jarPos = function () { if (!jar) { const r = $('jar').getBoundingClientRect(), a = $('app').getBoundingClientRect(); jar = { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }; } return jar; };
  UI.resized = function () { jar = null; };
  UI.hudStart = function () { jar = null; lastSecs = -1; lastTog = -1; $('jar-n').textContent = '0'; $('zone-name').textContent = 'Get ready'; UI.hudSurface(-1); $('clock-fill').style.width = '0%'; $('clock-text').textContent = S.data.settings.short ? '0:40' : '2:00'; UI.hudHydro(0); UI.hudTogether(1); $('toast').hidden = true; };
  UI.hudZone = function (z) { $('zone-name').textContent = PH.QUADS[z]; UI.hudSurface(-1); };
  UI.hudSurface = function (seg) { [...$('pips').children].forEach((el, i) => { el.className = 'badge' + (i === seg ? ' on' : i < seg ? ' was' : ''); }); };
  UI.hudTime = function (frac, secs) { $('clock-fill').style.width = (frac * 100).toFixed(1) + '%'; if (secs !== lastSecs) { lastSecs = secs; $('clock-text').textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); } };
  UI.hudJar = function (n) { $('jar-n').textContent = n; const el = $('jar'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  UI.hudTogether = function (c) { const v = Math.round(c * 20); if (v === lastTog) return; lastTog = v; const el = $('tog-fill'); el.style.transform = 'scaleX(' + Math.max(0.04, c).toFixed(2) + ')'; el.className = c < 0.45 ? 'warn' : ''; };
  UI.hudHydro = function (f) { $('hydro-ring').style.strokeDashoffset = (119.4 * (1 - f)).toFixed(1); $('btn-hydro').disabled = f < 1; };
  UI.hudEnd = function () { UI.banner('Tide ridden', 'Rinse and smile.'); };
  UI.pauseShow = function (on) { $('pause').hidden = !on; };

  // ---- results ----
  function findsHtml(list) { return list.length ? '<div class="finds">' + list.map((s) => '<div class="find" data-find="' + s.id + '"><div><p class="lede-md">' + esc(s.name) + '</p><p class="copy-sm">' + esc(s.line) + '</p></div></div>').join('') + '</div>' : ''; }
  function badgesHtml(list) { return list.length ? '<div class="badges" style="justify-content:center">' + list.map((b) => '<span class="badge solid">' + esc(b.name) + '</span>').join('') + '</div>' : ''; }
  function mountFinds(root) { root.querySelectorAll('[data-find]').forEach((el) => el.prepend(plaqCanvas(el.dataset.find, 56))); }

  UI.showResults = function (res, sum) {
    UI.scene('home');
    const t = S.tide(), title = ['Rough tide', 'Good start', 'Tide ridden', 'Gleaming'][res.stars];
    const notes = [];
    if (res.practice) notes.push('Practice pays a quarter of the shine and leaves your streak alone.');
    else {
      if (sum.usedShield) notes.push('A streak shield covered the day you missed.');
      notes.push('Day <strong>' + sum.streak + '</strong> of your streak.' + (sum.gainedShield ? ' Seven in a row earns you a <strong>streak shield</strong>.' : ''));
    }
    if (!res.led) notes.push('Fila led this one. Lead the swarm yourself for a Together score.');
    if (sum.rankUp) notes.push('New rank: <strong>' + esc(sum.rankUp) + '</strong>. A new colourway is waiting in Gear.');
    const prime = !t.primeDone;
    $('results-body').innerHTML =
      '<div class="res-head"><p class="label">' + (res.practice ? 'Practice run' : t.slot === 'am' ? 'Morning tide' : 'Evening tide') + '</p><h1>' + title + '</h1><div class="stars">' + [0, 1, 2].map((i) => STAR.replace('<svg', '<svg class="' + (i < res.stars ? 'on' : '') + '"')).join('') + '</div><p class="lede">' + res.shine + ' shine earned</p></div>' +
      '<div class="stats"><div class="stat"><b>' + pct(res.clean) + '</b><span class="label grey">Clean</span></div><div class="stat"><b>' + (res.led ? pct(res.gentle) : 'Auto') + '</b><span class="label grey">Together</span></div><div class="stat"><b>' + res.nCaught + '</b><span class="label grey">Caught</span></div></div>' +
      '<div class="card"><h3>Round the mouth</h3><div class="quads">' + res.quads.map((q, i) => '<div><span class="label grey">' + PH.QUADS[i] + '</span><div class="bar-track"><i style="width:' + pct(q) + '" class="' + (q < 0.6 ? 'warn' : '') + '"></i></div></div>').join('') + '</div></div>' +
      '<div class="notes">' + notes.map((n) => '<p class="copy">' + n + '</p>').join('') + '</div>' +
      findsHtml(sum.newSpecies) + badgesHtml(sum.newBadges) +
      '<div class="card alt"><p class="label">Fila says</p><p class="lede-md">' + esc(PH.TIPS[(S.data.runs - 1) % PH.TIPS.length]) + '</p></div>' +
      '<div class="actions">' + (prime ? '<button class="btn lg block" type="button" id="res-prime">Go to Prime time</button>' : '') + '<button class="btn lg block' + (prime ? ' ghost' : '') + '" type="button" id="res-done">Done</button></div>';
    mountFinds($('results-body'));
    $('results').hidden = false; $('results-body').scrollTop = 0;
    for (let i = 0; i < res.stars; i++) setTimeout(() => A.star(i), 200 + i * 250);
    $('res-done').onclick = () => { A.tap(); $('results').hidden = true; UI.home(); };
    const p = $('res-prime'); if (p) p.onclick = () => { $('results').hidden = true; UI.startPrime(); };
  };

  // ---- Prime time ----
  UI.startPrime = function () { A.unlock(); A.tap(); UI.scene('prime'); H.startPrime(); };
  UI.primeStart = function (p) {
    $('quiver').innerHTML = PH.PRIMES.map((pr, i) => '<button type="button" data-i="' + i + '" aria-label="Prime ' + pr.id + '"><i style="background:' + pr.color + '"></i>' + pr.id + '</button>').join('');
    $('quiver').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; p.sel = +b.dataset.i; UI.primeSelect(p.sel); A.tap(); };
    $('prime-hint').textContent = p.easy ? 'Tap each dot. The right Prime goes in and out, once.' : 'Pick the Prime that matches the dot, then tap the gap. In and out, once.';
    UI.primeSelect(0); UI.primeProgress(0, p.items.length);
  };
  UI.primeSelect = function (i) { [...$('quiver').children].forEach((b, k) => b.classList.toggle('on', k === i)); };
  UI.primeProgress = function (done, total) { $('prime-count').textContent = done + ' of ' + total + ' gaps'; $('prime-jar').textContent = done; };
  UI.primeDone = function (shine, sum) {
    UI.scene('home');
    $('results-body').innerHTML = '<div class="res-head"><p class="label">Prime time</p><h1>Gaps cleared</h1><p class="lede">' + shine + ' shine earned</p></div><div class="notes"><p class="copy">Eight Gappers rehomed. That is today’s Prime time done.</p></div>' + findsHtml(sum.newSpecies) + badgesHtml(sum.newBadges) + '<div class="actions"><button class="btn lg block" type="button" id="res-done">Done</button></div>';
    mountFinds($('results-body')); $('results').hidden = false;
    $('res-done').onclick = () => { A.tap(); $('results').hidden = true; UI.home(); };
  };

  // ---- panels ----
  const toggleHtml = (key, label, sub) => '<button class="toggle" type="button" data-set="' + key + '" aria-pressed="' + !!S.data.settings[key] + '"><span><span class="lede-md">' + label + '</span>' + (sub ? '<span class="copy-sm">' + sub + '</span>' : '') + '</span><i></i></button>';
  const PANELS = {
    guide: { title: 'Field guide', build(body) {
      body.innerHTML = '<p class="lede">' + S.guideCount() + ' of ' + PH.SPECIES.length + ' Plaqlings found.</p><div class="grid">' + PH.SPECIES.map((s) => { const n = S.data.guide[s.id] || 0; return '<div class="spec' + (n ? '' : ' locked') + '" data-spec="' + s.id + '"><h3>' + (n ? esc(s.name) : 'Not found yet') + '</h3><span class="badge' + (n ? '' : ' off') + '">' + s.rarity + '</span><p class="copy-sm">' + esc(n ? s.line : s.where) + '</p>' + (n ? '<p class="lede-sm">Caught ' + n + '</p>' : '') + '</div>'; }).join('') + '</div>';
      body.querySelectorAll('[data-spec]').forEach((el) => el.prepend(plaqCanvas(el.dataset.spec, 72, !S.data.guide[el.dataset.spec])));
    } },
    gear: { title: 'Gear', build(body) {
      const age = S.brushAge(), life = PH.TUNE.brushLifeDays, rk = S.rank().index, skin = PH.SKINS.find((s) => s.id === S.data.gear.skin) || PH.SKINS[0];
      const state = age >= life ? 'Tired filaments. The swarm runs thin until you swap.' : age >= 60 ? 'The swarm is starting to fray at the edges.' : 'Fresh filaments, full swarm.';
      body.innerHTML = '<div class="card"><canvas id="brush-art" width="660" height="220"></canvas><h3>Your 5460</h3><div class="kv"><span>In use</span><b>Day ' + (age + 1) + ' of about ' + life + '</b></div><div class="bar-track"><i class="' + (age >= 75 ? 'warn' : '') + '" style="width:' + Math.min(100, (age / life) * 100) + '%"></i></div><p class="copy">' + state + ' One spark for every filament: 5,460 of them.</p><div class="row start"><button class="btn sm" type="button" id="gear-new">I have a new brush</button>' + (age >= 75 ? '<button class="btn ghost sm" type="button" id="gear-shop">Reorder</button>' : '') + '</div></div>' +
        '<div class="card"><h3>Colourways</h3><p class="copy">Your swarm wears the colours of your brush. New ones unlock with rank.</p><div class="swatches">' + PH.SKINS.map((s) => '<button type="button" class="swatch' + (s.id === skin.id ? ' on' : '') + '" data-skin="' + s.id + '"' + (s.rank > rk ? ' disabled' : '') + '><i style="background:' + s.handle + '"></i><span class="label' + (s.rank > rk ? ' grey' : '') + '">' + (s.rank > rk ? PH.RANKS[s.rank].name : s.name) + '</span></button>').join('') + '</div></div>' +
        '<div class="card"><h3>Primes</h3><div class="dots">' + PH.PRIMES.map((p) => '<i style="background:' + p.color + ';color:' + p.ink + '">' + p.id + '</i>').join('') + '</div><p class="copy">Slim brushes for the gaps between teeth, where the swarm cannot go. When your plan is linked, these are the sizes your dental professional picked for you.</p></div>' +
        '<div class="card"><h3>Hydro wave</h3><p class="copy">Catch six Plaqlings to charge it. One wave loosens the old, sticky film across the whole side.</p></div>';
      Art.brush($('brush-art').getContext('2d'), 660, 220, skin, Math.min(1, Math.max(0, (age - 45) / 60)));
      $('gear-new').onclick = () => { S.newBrush(); A.fanfare(); UI.toast('Fresh 5460. Full swarm.'); PANELS.gear.build(body); };
      const shop = $('gear-shop'); if (shop) shop.onclick = () => { S.emit('shop.intent', { product: 'cs-5460', reason: 'brush-age', days: age }); UI.toast('In the CURAPROX app, this opens the shop.'); };
      body.querySelectorAll('[data-skin]').forEach((b) => (b.onclick = () => { S.data.gear.skin = b.dataset.skin; S.save(); A.tap(); PANELS.gear.build(body); }));
    } },
    journal: { title: 'Journal', build(body) {
      const st = S.streakNow(), d = S.data;
      body.innerHTML = '<div class="card"><div class="kv"><span class="big-num">' + st.count + '</span><span>day streak</span></div><div class="kv"><span>Best streak</span><b>' + st.best + '</b></div><div class="kv"><span>Streak shields</span><b>' + st.shields + ' of 2</b></div><p class="copy">A shield covers one missed day. You earn one every seven days in a row.</p></div>' +
        '<div class="card"><h3>Last four weeks</h3><div class="cal">' + weekCells(28) + '</div><div class="legend"><span class="label grey"><i style="background:var(--cp-yellow)"></i>Morning tide</span><span class="label grey"><i style="background:var(--cp-blue)"></i>Evening tide</span><span class="label grey"><i style="background:var(--cp-cerise);border-color:var(--cp-cerise)"></i>Prime time</span></div></div>' +
        '<div class="card"><h3>Badges</h3><div class="badges">' + PH.BADGES.map((b) => '<span class="badge' + (d.badges[b.id] ? ' solid' : ' off') + '" title="' + esc(b.how) + '">' + esc(b.name) + '</span>').join('') + '</div></div>' +
        '<div class="card"><div class="kv"><span>Hunts</span><b>' + d.runs + '</b></div><div class="kv"><span>Shine</span><b>' + d.shine.toLocaleString('en') + '</b></div><div class="kv"><span>Prime time days</span><b>' + d.primeDays + '</b></div></div>';
    } },
    link: { title: 'App link', build(body) {
      const tp = [['bell', 'The tide is the reminder', 'Morning and evening reminders open straight into a hunt. One finished hunt marks the brushing routine done.'], ['star', 'Shine becomes points', 'Every hunt pays shine. In the app, that is the routine points balance.'], ['bag', 'The brush that ages', 'The swarm frays after about three months and Gear offers a reorder, which opens the shop.'], ['prime', 'Primes from the plan', 'Prime time uses the sizes from your own plan, so the game drills the ones you were given.'], ['visit', 'Check-ups move the Tartar Tot', 'A logged visit shifts the one Plaqling the swarm cannot.']];
      body.innerHTML = '<p class="lede">Plaque Hunter is built to sit inside the CURAPROX app. Each touch point below already works here as a demo. Nothing leaves this device.</p>' +
        '<div class="card">' + tp.map((t) => '<div class="touch"><i>' + icon(t[0]) + '</i><div><p class="lede-md">' + t[1] + '</p><p class="copy-sm">' + t[2] + '</p></div></div>').join('') + '</div>' +
        '<div class="card"><h3>What the app would hear</h3><div class="log">' + (S.data.log.length ? S.data.log.map((e) => '<div><b>' + esc(e.type) + '</b> ' + esc(JSON.stringify(e.payload)) + '</div>').join('') : '<div>Finish a hunt and its events show up here.</div>') + '</div></div>' +
        '<div class="card"><h3>Try it</h3><p class="copy">Log a check-up and the Tartar Tot comes loose on your next hunt.</p><div class="row start"><button class="btn ghost sm" type="button" id="link-checkup">Log a check-up</button></div></div>';
      $('link-checkup').onclick = () => { S.logCheckup(); UI.toast('Check-up logged. The Tartar Tot is loose next hunt.'); PANELS.link.build(body); };
    } },
    settings: { title: 'Settings', build(body) {
      body.innerHTML = '<div class="card">' + toggleHtml('sfx', 'Sound effects') + toggleHtml('music', 'Music') + toggleHtml('haptics', 'Vibration', 'A buzz when it is time to switch sides.') + toggleHtml('easy', 'Easy mode', 'Wider swarm, forgiving speed, Primes pick themselves. Good for small hunters.') + '</div>' +
        '<div class="card"><h3>For demos</h3>' + toggleHtml('short', 'Short hunts', 'Four sides of 10 seconds instead of 30. For showing the game, not for brushing.') + '<div class="row start"><button class="btn ghost sm" type="button" id="set-skip">Skip ahead 12 hours</button><button class="btn ghost sm" type="button" id="set-intro">Replay the intro</button></div></div>' +
        '<div class="card"><h3>Progress</h3><p class="copy">Saved in this browser only.</p><div class="row start" id="set-reset-row"><button class="btn ghost sm" type="button" id="set-reset">Reset progress</button></div></div>' +
        '<p class="label grey" style="text-align:center">Plaque Hunter ' + PH.VERSION + ', prototype</p>';
      body.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => { const k = b.dataset.set; S.data.settings[k] = !S.data.settings[k]; S.save(); b.setAttribute('aria-pressed', S.data.settings[k]); A.unlock(); A.apply(); A.tap(); }));
      $('set-skip').onclick = () => { S.skip(12); UI.toast('Twelve hours later: ' + fmtTime(S.now()) + '.'); };
      $('set-intro').onclick = () => { $('panel').hidden = true; UI.story(); };
      $('set-reset').onclick = () => { $('set-reset-row').innerHTML = '<button class="btn sm" type="button" id="set-reset-yes">Erase everything</button><button class="btn ghost sm" type="button" id="set-reset-no">Keep it</button>'; $('set-reset-yes').onclick = () => { S.reset(); A.apply(); $('panel').hidden = true; $('btn-start').textContent = 'Start'; UI.scene('title'); }; $('set-reset-no').onclick = () => PANELS.settings.build(body); };
    } },
  };
  UI.panel = function (name) { A.unlock(); A.tap(); const p = PANELS[name]; $('panel-title').textContent = p.title; p.build($('panel-body')); $('panel').hidden = false; $('panel-body').scrollTop = 0; };

  // ---- intro ----
  const STORY = [
    ['Your mouth is a small world', 'Twenty-eight pearls on a pink shore. From up here it looks peaceful.'],
    ['Then the Plaqlings move in', 'Every few hours they drift back and lay down film. They are not villains. They just cannot stay.'],
    ['You lead the 5,460', 'One soft spark for every filament on a CS 5460. Keep them slow and together and they lift film without a scratch.'],
    ['The tide comes twice a day', 'Two minutes, morning and evening. Brush with one hand and hunt with the other thumb. Hands full? Fila leads for you.'],
  ];
  let step = 0;
  function storyArt(i) {
    const cv = $('story-art'), c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 240, 120);
    if (i === 0) for (let k = 0; k < 5; k++) { const x = 40 + k * 40; c.fillStyle = C.gum; c.beginPath(); c.arc(x, 60, 21, 0, 7); c.fill(); c.fillStyle = C.white; c.strokeStyle = C.blue40; c.lineWidth = 1.5; c.beginPath(); c.arc(x, 60, 16, 0, 7); c.fill(); c.stroke(); Art.sparkle(c, x + 6, 53, 5, k, 0.9, C.blue60); }
    if (i === 1) ['filmo', 'gumlin', 'stickler'].forEach((id, k) => Art.plaqling(c, id, 60 + k * 60, 70, 24, 1 + k, { look: { x: 0.2, y: -0.3 }, seed: k }));
    if (i === 2) { Art.brush(c, 240, 80, PH.SKINS[0], 0); for (let k = 0; k < 90; k++) { c.fillStyle = PH.SKINS[0].colors[k % 3]; c.beginPath(); c.arc(30 + ((k * 61) % 180), 88 + ((k * 37) % 26), 1.3, 0, 7); c.fill(); } }
    if (i === 3) { c.fillStyle = C.yellow; c.beginPath(); c.arc(70, 60, 26, 0, 7); c.fill(); c.fillStyle = C.blue; c.beginPath(); c.arc(170, 60, 26, 0, 7); c.fill(); c.fillStyle = C.white; c.beginPath(); c.arc(182, 52, 22, 0, 7); c.fill(); c.fillStyle = C.blue; c.font = '400 16px ' + Art.FONT; c.textAlign = 'center'; c.fillText('2:00', 120, 66); }
  }
  function storyShow() { $('story-step').textContent = step + 1 + ' of ' + STORY.length; $('story-title').textContent = STORY[step][0]; $('story-text').textContent = STORY[step][1]; $('btn-story').textContent = step === STORY.length - 1 ? 'Start the first hunt' : 'Next'; storyArt(step); }
  UI.story = function () { step = 0; UI.scene('story'); storyShow(); };

  UI.init = function () {
    paintIcons(document);
    document.querySelectorAll('[data-wordmark]').forEach((el) => (el.innerHTML = '<svg viewBox="' + PH.WORDMARK.viewBox + '" role="img" aria-label="CURAPROX"><path fill="currentColor" d="' + PH.WORDMARK.d + '"/></svg>'));
    $('btn-start').onclick = () => { A.unlock(); A.tap(); if (S.data.tutorial) UI.scene('home'); else UI.story(); };
    $('btn-story').onclick = () => { A.tap(); if (step < STORY.length - 1) { step++; storyShow(); } else UI.startHunt(false); };
    $('btn-story-skip').onclick = () => (S.data.tutorial ? UI.scene('home') : UI.startHunt(false));
    $('btn-hunt').onclick = () => UI.startHunt(false);
    $('btn-practice').onclick = () => UI.startHunt(true);
    $('btn-prime').onclick = () => UI.startPrime();
    $('chip-rank').onclick = () => UI.panel('gear');
    $('chip-streak').onclick = () => UI.panel('journal');
    document.querySelectorAll('[data-panel]').forEach((b) => (b.onclick = () => UI.panel(b.dataset.panel)));
    $('btn-panel-close').onclick = () => { A.tap(); $('panel').hidden = true; if (PH.G.scene === 'home') UI.home(); };
    $('btn-pause').onclick = () => H.pause(true);
    $('btn-resume').onclick = () => H.pause(false);
    $('btn-quit').onclick = () => { $('pause').hidden = true; H.quit(); UI.scene('home'); };
    $('btn-hydro').onclick = () => H.hydro();
    $('btn-prime-quit').onclick = () => { H.quitPrime(); UI.scene('home'); };
    $('btn-start').textContent = S.data.tutorial ? 'Continue' : 'Start';
    setInterval(() => { if (PH.G.scene === 'home' && $('results').hidden && $('panel').hidden) UI.home(); }, 30000);
  };
})();
