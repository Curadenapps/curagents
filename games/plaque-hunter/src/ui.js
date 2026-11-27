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
    bell: { lucide: 'Bell', d: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0' },
    bag: { lucide: 'ShoppingBag', d: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2' },
    visit: { lucide: 'Stethoscope', d: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2M18 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    map: { lucide: 'Map', d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14' },
    lock: { lucide: 'Lock', d: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3' },
    zap: { lucide: 'Zap', d: 'M13 3L5 13h6l-1 8 8-10h-6z' },
    drops: { lucide: 'Droplets', d: 'M8 4c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8zM16 9c1.5 2 3 3.5 3 5.5a3 3 0 0 1-6 0' },
    waves: { lucide: 'Waves', d: 'M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0' },
    sparkles: { lucide: 'Sparkles', d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15v4M17 17h4M5 4v3M3.5 5.5h3' },
    cross: { lucide: 'Crosshair', d: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 2v5M12 17v5M2 12h5M17 12h5' },
    sides: { lucide: 'ArrowLeftRight', d: 'M8 4L4 8l4 4M4 8h16M16 12l4 4-4 4M20 16H4' },
    feather: { lucide: 'Feather', d: 'M20 4c-6 0-11 4-12 10l-3 6M8 14h6M11 10h7' },
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
  const starsHtml = (n, cls) => '<div class="' + cls + '">' + [0, 1, 2].map((i) => STAR.replace('<svg', '<svg class="' + (i < n ? 'on' : '') + '"')).join('') + '</div>';

  const fmtTime = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtDur = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };
  const pct = (v) => Math.round(v * 100) + '%';
  const num = (n) => n.toLocaleString('en');

  function restart(el) { el.hidden = true; void el.offsetWidth; el.hidden = false; }
  let toastT = 0, bannerT = 0;
  UI.toast = function (text) { const el = $('toast'); el.textContent = text; restart(el); clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 3600); };
  UI.banner = function (title, sub) { $('banner-title').textContent = title; $('banner-sub').textContent = sub || ''; const el = $('banner'); restart(el); clearTimeout(bannerT); bannerT = setTimeout(() => (el.hidden = true), 2100); };
  UI.countdown = function (n) { const el = $('countdown'); if (n == null) { el.hidden = true; return; } $('countdown-n').textContent = n; restart(el); };

  UI.scene = function (name) {
    PH.G.scene = name;
    const map = { title: 'title', story: 'story', home: 'home', hunt: 'hud' };
    for (const id of ['title', 'story', 'home', 'hud']) $(id).hidden = id !== map[name];
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
  const cardHtml = (id, extra) => { const c = PH.CARDS_BY_ID[id]; return '<span class="kcard-ic">' + icon(c.icon) + '</span><span class="kcard-name">' + esc(c.name) + '</span>' + (extra || ''); };

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
    $('week').innerHTML = weekCells(7);
  };

  UI.startHunt = function (mission) { A.unlock(); A.tap(); $('panel').hidden = true; UI.scene('hunt'); H.start({ mission: mission || null }); };

  // ---- HUD ----
  let jar = null, lastSecs = -1, lastTog = -1, handKey = '';
  UI.jarPos = function () { if (!jar) { const r = $('jar').getBoundingClientRect(), a = $('app').getBoundingClientRect(); jar = { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }; } return jar; };
  UI.resized = function () { jar = null; };
  UI.hudStart = function (r) {
    jar = null; lastSecs = -1; lastTog = -1; handKey = '';
    $('jar-n').textContent = '0'; $('zone-name').textContent = r.mission ? r.mission.name : 'Get ready'; UI.hudSurface(-1);
    $('clock-fill').style.width = '0%'; $('clock-marks').innerHTML = r.zones.slice(1).map((_, i) => '<span style="left:' + ((i + 1) / r.zones.length) * 100 + '%"></span>').join('');
    const total = r.zones.length * r.zoneSecs; $('clock-text').textContent = Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    UI.hudGaps(0, r.gapsTotal); UI.hudTogether(1); UI.hudHand(r); $('toast').hidden = true;
  };
  UI.hudZone = function (z) { $('zone-name').textContent = PH.QUADS[z]; };
  UI.hudSurface = function (seg) { [...$('pips').children].forEach((el, i) => { el.className = 'badge' + (i === seg ? ' on' : i < seg ? ' was' : ''); }); };
  UI.hudTime = function (frac, secs) { $('clock-fill').style.width = (frac * 100).toFixed(1) + '%'; if (secs !== lastSecs) { lastSecs = secs; $('clock-text').textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); } };
  UI.hudJar = function (n) { $('jar-n').textContent = n; const el = $('jar'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  UI.hudGaps = function (done, total) { $('gaps-n').textContent = done + ' of ' + total; };
  UI.hudTogether = function (c) { const v = Math.round(c * 20); if (v === lastTog) return; lastTog = v; const el = $('tog-fill'); el.style.transform = 'scaleX(' + Math.max(0.04, c).toFixed(2) + ')'; el.className = c < 0.45 ? 'warn' : ''; };
  UI.hudHand = function (r) {
    const key = r.hand.join(',') + '|' + r.charge + '|' + r.aim; if (key === handKey) return; handKey = key;
    $('charges').innerHTML = [0, 1, 2].map((i) => '<i class="' + (i < r.charge ? 'on' : '') + '"></i>').join('');
    $('hand').innerHTML = r.hand.map((id, i) => (id ? '<button type="button" class="kcard' + (r.aim === i ? ' aim' : '') + (r.charge < 1 ? ' dry' : '') + '" data-i="' + i + '" aria-label="' + esc(PH.CARDS_BY_ID[id].name) + '">' + cardHtml(id) + '</button>' : '<span class="kcard empty"></span>')).join('');
  };
  UI.hudEnd = function () { UI.banner('Hunt over', 'Rinse and smile.'); };
  UI.pauseShow = function (on) { $('pause').hidden = !on; };

  // ---- results ----
  function findsHtml(list) { return list.length ? '<div class="finds">' + list.map((s) => '<div class="find" data-find="' + s.id + '"><div><p class="lede-md">' + esc(s.name) + '</p><p class="copy-sm">' + esc(s.line) + '</p></div></div>').join('') + '</div>' : ''; }
  function badgesHtml(list) { return list.length ? '<div class="badges" style="justify-content:center">' + list.map((b) => '<span class="badge solid">' + esc(b.name) + '</span>').join('') + '</div>' : ''; }
  function mountFinds(root) { root.querySelectorAll('[data-find]').forEach((el) => el.prepend(plaqCanvas(el.dataset.find, 56))); }

  UI.showResults = function (res, sum) {
    UI.scene('home');
    const t = S.tide(), title = ['Rough tide', 'Good start', 'Well hunted', 'Gleaming'][res.stars], d = S.data;
    const notes = [];
    if (res.mission) notes.push('House calls pay six tenths of the shine and leave your streak alone.' + (sum.missionBest ? ' <strong>New best</strong> for this call.' : ''));
    else {
      if (sum.usedShield) notes.push('A streak shield covered the day you missed.');
      notes.push('Day <strong>' + sum.streak + '</strong> of your streak.' + (sum.gainedShield ? ' Seven in a row earns you a <strong>streak shield</strong>.' : ''));
    }
    if (res.ouch) notes.push('Too fast ' + res.ouch + (res.ouch === 1 ? ' time' : ' times') + '. Slower strokes keep the gums calm.');
    if (!res.led) notes.push('Fila led this one. Lead the swarm yourself for a Together score.');
    if (sum.rankUp) notes.push('New rank: <strong>' + esc(sum.rankUp) + '</strong>. A new colourway is waiting in Kit.');
    const offer = res.stars >= 2 && d.deck.length < PH.DECK_MAX ? PH.CARDS.map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, 3) : [];
    $('results-body').innerHTML =
      '<div class="res-head"><p class="label">' + (res.mission ? 'House call: ' + esc(res.missionName) : t.slot === 'am' ? 'Morning tide' : 'Evening tide') + '</p><h1>' + title + '</h1>' + starsHtml(res.stars, 'stars') + '<p class="lede">' + res.shine + ' shine earned</p></div>' +
      '<div class="stats four"><div class="stat"><b>' + pct(res.clean) + '</b><span class="label grey">Clean</span></div><div class="stat"><b>' + res.gapsDone + '/' + res.gapsTotal + '</b><span class="label grey">Gaps</span></div><div class="stat"><b>' + (res.led ? pct(res.gentle) : 'Auto') + '</b><span class="label grey">Together</span></div><div class="stat"><b>' + res.nCaught + '</b><span class="label grey">Caught</span></div></div>' +
      (offer.length ? '<div class="card" id="reward"><h3>Add a card to your kit</h3><p class="copy">Two stars or more earns one. It joins your deck for every hunt.</p><div class="offer">' + offer.map((id) => '<button type="button" class="kcard big" data-card="' + id + '">' + cardHtml(id, '<span class="copy-sm">' + esc(PH.CARDS_BY_ID[id].text) + '</span>') + '</button>').join('') + '</div></div>' : '') +
      '<div class="card"><h3>Round the mouth</h3><div class="quads">' + res.zones.map((q, i) => '<div><span class="label grey">' + PH.QUADS[q] + '</span><div class="bar-track"><i style="width:' + pct(res.zoneQuads[i]) + '" class="' + (res.zoneQuads[i] < 0.6 ? 'warn' : '') + '"></i></div></div>').join('') + '</div></div>' +
      '<div class="card"><h3>Mastery</h3>' + PH.MASTERY.map((m) => '<div class="kv"><span>' + m.name + '</span><b>Level ' + S.masteryLevel(m.id) + (res.xp[m.id] ? ', +' + res.xp[m.id] : '') + '</b></div>').join('') + '</div>' +
      '<div class="notes">' + notes.map((n) => '<p class="copy">' + n + '</p>').join('') + '</div>' +
      findsHtml(sum.newSpecies) + badgesHtml(sum.newBadges) +
      '<div class="card alt"><p class="label">Fila says</p><p class="lede-md">' + esc(PH.TIPS[(d.runs - 1) % PH.TIPS.length]) + '</p></div>' +
      '<div class="actions">' + (res.mission ? '<button class="btn lg block" type="button" id="res-map">Back to the route</button>' : '') + '<button class="btn lg block' + (res.mission ? ' ghost' : '') + '" type="button" id="res-done">Done</button></div>';
    mountFinds($('results-body'));
    $('results').hidden = false; $('results-body').scrollTop = 0;
    for (let i = 0; i < res.stars; i++) setTimeout(() => A.star(i), 200 + i * 250);
    document.querySelectorAll('#reward [data-card]').forEach((b) => (b.onclick = () => { if (S.addCard(b.dataset.card)) { A.fanfare(); $('reward').innerHTML = '<h3>Added to your kit</h3><div class="offer"><span class="kcard big">' + cardHtml(b.dataset.card, '<span class="copy-sm">' + esc(PH.CARDS_BY_ID[b.dataset.card].text) + '</span>') + '</span></div>'; } }));
    $('res-done').onclick = () => { A.tap(); $('results').hidden = true; UI.home(); };
    const mp = $('res-map'); if (mp) mp.onclick = () => { $('results').hidden = true; UI.home(); UI.panel('calls'); };
  };

  // ---- panels ----
  const toggleHtml = (key, label, sub) => '<button class="toggle" type="button" data-set="' + key + '" aria-pressed="' + !!S.data.settings[key] + '"><span><span class="lede-md">' + label + '</span>' + (sub ? '<span class="copy-sm">' + sub + '</span>' : '') + '</span><i></i></button>';
  const FEAT = { braces: 'Braces', bridge: 'Bridge', crown: 'Crown', hole: 'Hole', sore: 'Sore gums', wisdom: 'Wisdom tooth', sugar: 'Sugar rain' };
  let picked = null;
  const PANELS = {
    calls: { title: 'House calls', build(body) {
      const d = S.data, rows = []; PH.MISSIONS.forEach((m) => (rows[m.row] = rows[m.row] || []).push(m));
      if (!picked || !S.callOpen(picked)) picked = PH.MISSIONS.filter(S.callOpen).pop();
      const node = (m) => { const open = S.callOpen(m), st = (d.missions[m.id] || {}).stars || 0; return '<button type="button" class="node' + (open ? '' : ' locked') + (m === picked ? ' on' : '') + '" data-call="' + m.id + '"' + (open ? '' : ' disabled') + '><span class="node-dot">' + (open ? starsHtml(st, 'mini-stars') : icon('lock')) + '</span><span class="label' + (open ? '' : ' grey') + '">' + esc(m.name) + '</span></button>'; };
      const feats = [...new Set(Object.values(picked.feats).flat())], best = d.missions[picked.id];
      body.innerHTML = '<p class="lede">Other mouths, each with its own trouble. Pick your route: a call opens once one before it has a star.</p>' +
        '<div class="route">' + rows.slice().reverse().map((r) => '<div class="route-row">' + r.map(node).join('') + '</div>').join('') + '</div>' +
        '<div class="card"><p class="label">' + esc(picked.who) + '</p><h2>' + esc(picked.name) + '</h2><p class="copy">' + esc(picked.blurb) + '</p><div class="badges">' + (feats.length ? feats.map((f) => '<span class="badge">' + FEAT[f] + '</span>').join('') : '<span class="badge">Plain teeth</span>') + '<span class="badge off">' + picked.zones.length + ' sides</span></div>' + (best ? '<div class="kv"><span>Best</span><b>' + best.best + ' shine</b></div>' : '') + '<button class="btn lg block" type="button" id="call-go">Start this call</button></div>';
      body.querySelectorAll('[data-call]').forEach((b) => (b.onclick = () => { picked = PH.MISSIONS.find((m) => m.id === b.dataset.call); A.tap(); PANELS.calls.build(body); }));
      $('call-go').onclick = () => UI.startHunt(picked);
    } },
    guide: { title: 'Field guide', build(body) {
      body.innerHTML = '<p class="lede">' + S.guideCount() + ' of ' + PH.SPECIES.length + ' Plaqlings found.</p><div class="grid">' + PH.SPECIES.map((s) => { const n = S.data.guide[s.id] || 0; return '<div class="spec' + (n ? '' : ' locked') + '" data-spec="' + s.id + '"><h3>' + (n ? esc(s.name) : 'Not found yet') + '</h3><span class="badge' + (n ? '' : ' off') + '">' + s.rarity + '</span><p class="copy-sm">' + esc(n ? s.line : s.where) + '</p>' + (n ? '<p class="lede-sm">Caught ' + n + '</p>' : '') + '</div>'; }).join('') + '</div>';
      body.querySelectorAll('[data-spec]').forEach((el) => el.prepend(plaqCanvas(el.dataset.spec, 72, !S.data.guide[el.dataset.spec])));
    } },
    gear: { title: 'Kit', build(body) {
      const d = S.data, age = S.brushAge(), life = PH.TUNE.brushLifeDays, rk = S.rank().index, skin = PH.SKINS.find((s) => s.id === d.gear.skin) || PH.SKINS[0];
      const state = age >= life ? 'Tired filaments. The swarm runs thin until you swap.' : age >= 60 ? 'The swarm is starting to fray at the edges.' : 'Fresh filaments, full swarm.';
      const counts = {}; d.deck.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
      body.innerHTML = '<p class="lede">' + num(d.bank) + ' shine to spend.</p>' +
        '<div class="card"><h3>Your deck</h3><p class="copy">' + d.deck.length + ' of ' + PH.DECK_MAX + ' cards. Three are dealt at every pass. Playing one costs a charge.</p><div class="deck">' + PH.CARDS.map((c) => '<div class="deck-row' + (counts[c.id] ? '' : ' none') + '"><span class="kcard-ic">' + icon(c.icon) + '</span><div><p class="lede-md">' + esc(c.name) + '</p><p class="copy-sm">' + esc(c.product) + '. ' + esc(c.text) + '</p></div><span class="badge' + (counts[c.id] ? ' solid' : ' off') + '">' + (counts[c.id] || 0) + '</span></div>').join('') + '</div></div>' +
        '<div class="card"><h3>Upgrades</h3>' + PH.KIT.map((k) => { const lvl = d.kit[k.id], cost = PH.kitCost(lvl), max = lvl >= PH.KIT_MAX; return '<div class="up"><div><p class="lede-md">' + esc(k.name) + '</p><p class="copy-sm">' + esc(k.what) + '</p><div class="pipsrow">' + [0, 1, 2, 3, 4].map((i) => '<i class="' + (i < lvl ? 'on' : '') + '"></i>').join('') + '</div></div><button class="btn sm' + (max ? ' soft' : '') + '" type="button" data-up="' + k.id + '"' + (max || d.bank < cost ? ' disabled' : '') + '>' + (max ? 'Full' : num(cost)) + '</button></div>'; }).join('') + '</div>' +
        '<div class="card"><canvas id="brush-art" width="660" height="220"></canvas><h3>Your 5460</h3><div class="kv"><span>In use</span><b>Day ' + (age + 1) + ' of about ' + life + '</b></div><div class="bar-track"><i class="' + (age >= 75 ? 'warn' : '') + '" style="width:' + Math.min(100, (age / life) * 100) + '%"></i></div><p class="copy">' + state + ' One spark for every filament: 5,460 of them.</p><div class="row start"><button class="btn sm" type="button" id="gear-new">I have a new brush</button>' + (age >= 75 ? '<button class="btn ghost sm" type="button" id="gear-shop">Reorder</button>' : '') + '</div></div>' +
        '<div class="card"><h3>Colourways</h3><p class="copy">Your swarm wears the colours of your brush. New ones unlock with rank.</p><div class="swatches">' + PH.SKINS.map((s) => '<button type="button" class="swatch' + (s.id === skin.id ? ' on' : '') + '" data-skin="' + s.id + '"' + (s.rank > rk ? ' disabled' : '') + '><i style="background:' + s.handle + '"></i><span class="label' + (s.rank > rk ? ' grey' : '') + '">' + (s.rank > rk ? PH.RANKS[s.rank].name : s.name) + '</span></button>').join('') + '</div></div>';
      Art.brush($('brush-art').getContext('2d'), 660, 220, skin, Math.min(1, Math.max(0, (age - 45) / 60)));
      body.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => { const got = S.upgrade(b.dataset.up); if (got) { A.fanfare(); if (got.length) UI.toast('Badge: ' + got[0].name); PANELS.gear.build(body); } }));
      $('gear-new').onclick = () => { S.newBrush(); A.fanfare(); UI.toast('Fresh 5460. Full swarm.'); PANELS.gear.build(body); };
      const shop = $('gear-shop'); if (shop) shop.onclick = () => { S.emit('shop.intent', { product: 'cs-5460', reason: 'brush-age', days: age }); UI.toast('In the CURAPROX app, this opens the shop.'); };
      body.querySelectorAll('[data-skin]').forEach((b) => (b.onclick = () => { d.gear.skin = b.dataset.skin; S.save(); A.tap(); PANELS.gear.build(body); }));
    } },
    journal: { title: 'Journal', build(body) {
      const st = S.streakNow(), d = S.data;
      body.innerHTML = '<div class="card"><div class="kv"><span class="big-num">' + st.count + '</span><span>day streak</span></div><div class="kv"><span>Best streak</span><b>' + st.best + '</b></div><div class="kv"><span>Streak shields</span><b>' + st.shields + ' of 2</b></div><p class="copy">A shield covers one missed day. You earn one every seven days in a row.</p></div>' +
        '<div class="card"><h3>Mastery</h3>' + PH.MASTERY.map((m) => { const lv = S.masteryLevel(m.id), xp = d.mastery[m.id], lo = lv * lv * 40, hi = (lv + 1) * (lv + 1) * 40; return '<div class="kv"><span>' + m.name + '</span><b>Level ' + lv + '</b></div><div class="bar-track"><i style="width:' + Math.round(((xp - lo) / (hi - lo)) * 100) + '%"></i></div>'; }).join('') + '<p class="copy">Brushing grows with clean, together hunts. Interdental with gaps cleared gently. Kit work with cards, focus and calm gums.</p></div>' +
        '<div class="card"><h3>Last four weeks</h3><div class="cal">' + weekCells(28) + '</div><div class="legend"><span class="label grey"><i style="background:var(--cp-yellow)"></i>Morning tide</span><span class="label grey"><i style="background:var(--cp-blue)"></i>Evening tide</span><span class="label grey"><i style="background:var(--cp-cerise);border-color:var(--cp-cerise)"></i>Gaps done</span></div></div>' +
        '<div class="card"><h3>Badges</h3><div class="badges">' + PH.BADGES.map((b) => '<span class="badge' + (d.badges[b.id] ? ' solid' : ' off') + '" title="' + esc(b.how) + '">' + esc(b.name) + '</span>').join('') + '</div></div>' +
        '<div class="card"><div class="kv"><span>Hunts</span><b>' + d.runs + '</b></div><div class="kv"><span>Shine, all time</span><b>' + num(d.shine) + '</b></div><div class="kv"><span>House call stars</span><b>' + S.missionStars() + ' of ' + PH.MISSIONS.length * 3 + '</b></div></div>';
    } },
    link: { title: 'App link', build(body) {
      const tp = [['bell', 'The tide is the reminder', 'Morning and evening reminders open straight into a hunt. One finished hunt marks the brushing routine done.'], ['star', 'Shine becomes points', 'Every hunt pays shine. In the app, that is the routine points balance.'], ['bag', 'The brush that ages', 'The swarm frays after about three months and Kit offers a reorder, which opens the shop.'], ['sides', 'Gaps count as interdental', 'Clear three quarters of the gaps in a tide hunt and the interdental step is marked done.'], ['map', 'Your own mouth as a house call', 'With consent, a plan could add a person’s own braces, bridge or sore spots to their hunts.'], ['visit', 'Check-ups move what the swarm cannot', 'A logged visit shifts the Tartar Tot and fixes the hole.']];
      body.innerHTML = '<p class="lede">Plaque Hunter is built to sit inside the CURAPROX app. Each touch point below already works here as a demo. Nothing leaves this device.</p>' +
        '<div class="card">' + tp.map((t) => '<div class="touch"><i>' + icon(t[0]) + '</i><div><p class="lede-md">' + t[1] + '</p><p class="copy-sm">' + t[2] + '</p></div></div>').join('') + '</div>' +
        '<div class="card"><h3>What the app would hear</h3><div class="log">' + (S.data.log.length ? S.data.log.map((e) => '<div><b>' + esc(e.type) + '</b> ' + esc(JSON.stringify(e.payload)) + '</div>').join('') : '<div>Finish a hunt and its events show up here.</div>') + '</div></div>' +
        '<div class="card"><h3>Try it</h3><p class="copy">Log a check-up. On your next hunt the Tartar Tot comes loose and any hole is fixed.</p><div class="row start"><button class="btn ghost sm" type="button" id="link-checkup">Log a check-up</button></div></div>';
      $('link-checkup').onclick = () => { S.logCheckup(); UI.toast('Check-up logged. It counts on your next hunt.'); PANELS.link.build(body); };
    } },
    settings: { title: 'Settings', build(body) {
      body.innerHTML = '<div class="card">' + toggleHtml('sfx', 'Sound effects') + toggleHtml('music', 'Music') + toggleHtml('haptics', 'Vibration', 'A buzz when it is time to switch sides.') + toggleHtml('easy', 'Easy mode', 'Wider swarm, forgiving speed, and Fila clears gaps as she passes. Good for small hunters.') + '</div>' +
        '<div class="card"><h3>For demos</h3>' + toggleHtml('short', 'Short hunts', 'Each side takes 12 seconds instead of 30. For showing the game, not for brushing.') + '<div class="row start"><button class="btn ghost sm" type="button" id="set-skip">Skip ahead 12 hours</button><button class="btn ghost sm" type="button" id="set-shine">Add 5,000 shine</button><button class="btn ghost sm" type="button" id="set-intro">Replay the intro</button></div></div>' +
        '<div class="card"><h3>Progress</h3><p class="copy">Saved in this browser only.</p><div class="row start" id="set-reset-row"><button class="btn ghost sm" type="button" id="set-reset">Reset progress</button></div></div>' +
        '<p class="label grey" style="text-align:center">Plaque Hunter ' + PH.VERSION + ', prototype</p>';
      body.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => { const k = b.dataset.set; S.data.settings[k] = !S.data.settings[k]; S.save(); b.setAttribute('aria-pressed', S.data.settings[k]); A.unlock(); A.apply(); A.tap(); }));
      $('set-skip').onclick = () => { S.skip(12); UI.toast('Twelve hours later: ' + fmtTime(S.now()) + '.'); };
      $('set-shine').onclick = () => { S.data.bank += 5000; S.save(); UI.toast('5,000 shine added, for the demo.'); };
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
    $('btn-story').onclick = () => { A.tap(); if (step < STORY.length - 1) { step++; storyShow(); } else UI.startHunt(); };
    $('btn-story-skip').onclick = () => (S.data.tutorial ? UI.scene('home') : UI.startHunt());
    $('btn-hunt').onclick = () => UI.startHunt();
    $('btn-calls').onclick = () => UI.panel('calls');
    $('chip-rank').onclick = () => UI.panel('gear');
    $('chip-streak').onclick = () => UI.panel('journal');
    document.querySelectorAll('[data-panel]').forEach((b) => (b.onclick = () => UI.panel(b.dataset.panel)));
    $('btn-panel-close').onclick = () => { A.tap(); $('panel').hidden = true; if (PH.G.scene === 'home') UI.home(); };
    $('btn-pause').onclick = () => H.pause(true);
    $('btn-resume').onclick = () => H.pause(false);
    $('btn-quit').onclick = () => { $('pause').hidden = true; H.quit(); UI.scene('home'); };
    $('hand').onclick = (e) => { const b = e.target.closest('button'); if (b) H.play(+b.dataset.i); };
    $('btn-start').textContent = S.data.tutorial ? 'Continue' : 'Start';
    setInterval(() => { if (PH.G.scene === 'home' && $('results').hidden && $('panel').hidden) UI.home(); }, 30000);
  };
})();
