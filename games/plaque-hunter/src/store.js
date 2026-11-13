/* Plaque Hunter — save data, the habit clock (tides, streaks) and the bridge to a host app. */
(function () {
  const PH = window.PH;
  const KEY = 'plaque-hunter-save-v1';
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const S = (PH.Store = {});

  function fresh() {
    return {
      v: 1, created: Date.now(), offset: 0,
      shine: 0, bank: 0, runs: 0, lastRunAt: 0, lastQuads: [0, 0, 0, 0],
      kit: { fil: 0, soft: 0, glide: 0, focus: 0 }, mastery: { brush: 0, idb: 0, tools: 0 }, missions: {}, deck: PH.START_DECK.slice(),
      days: {}, streak: { count: 0, best: 0, shields: 0, lastDay: null },
      guide: {}, badges: {}, primeDays: 0,
      gear: { skin: 'blue', brushStart: Date.now() },
      settings: { sfx: true, music: true, haptics: true, easy: false, short: false },
      link: { demo: false, checkup: 0, checkupBoost: false },
      tutorial: false, log: [],
    };
  }

  let mem = null;
  function read() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* storage blocked: play without saving */ }
    return mem;
  }
  S.save = function () {
    mem = S.data;
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { /* ignore */ }
  };
  S.load = function () {
    const base = fresh();
    const d = read();
    if (d && d.v === 1) {
      S.data = Object.assign(base, d);
      for (const k of ['streak', 'gear', 'settings', 'link', 'kit', 'mastery']) S.data[k] = Object.assign(fresh()[k], d[k] || {});
    } else S.data = base;
  };
  S.reset = function () { S.data = fresh(); S.save(); };

  // ---- the habit clock -------------------------------------------------
  // A "day" runs 04:00 to 04:00. Morning tide is 04:00–15:00, evening tide the rest.
  S.now = () => Date.now() + (S.data.offset || 0);
  const pad = (n) => String(n).padStart(2, '0');
  S.dayKey = function (ts) { const d = new Date(ts - 4 * HOUR); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  S.slot = function (ts) { const h = new Date(ts).getHours(); return h >= 4 && h < 15 ? 'am' : 'pm'; };
  const noon = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12).getTime(); };
  S.dayDiff = (a, b) => Math.round((noon(a) - noon(b)) / DAY);
  S.shiftDay = (key, n) => { const d = new Date(noon(key) + n * DAY); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  S.tide = function () {
    const now = S.now(), day = S.dayKey(now), slot = S.slot(now);
    const rec = S.data.days[day] || {};
    const d = new Date(now); const h = d.getHours();
    const next = new Date(now); next.setMinutes(0, 0, 0);
    if (slot === 'am') next.setHours(15); else { if (h >= 15) next.setDate(next.getDate() + 1); next.setHours(4); }
    return { day, slot, done: !!rec[slot], primeDone: !!rec.prime, nextAt: next.getTime(), now };
  };

  S.streakNow = function () {
    const st = S.data.streak;
    if (!st.lastDay) return { count: 0, alive: false, shields: st.shields, best: st.best, atRisk: false };
    const gap = S.dayDiff(S.dayKey(S.now()), st.lastDay);
    const alive = gap <= 1 || (gap === 2 && st.shields > 0);
    return { count: alive ? st.count : 0, alive, shields: st.shields, best: st.best, atRisk: alive && gap >= 1 };
  };

  S.rank = function (shine) {
    const pts = shine == null ? S.data.shine : shine;
    let i = 0; while (i + 1 < PH.RANKS.length && pts >= PH.RANKS[i + 1].at) i++;
    const cur = PH.RANKS[i], nxt = PH.RANKS[i + 1];
    return { index: i, name: cur.name, next: nxt ? nxt.name : null, toNext: nxt ? nxt.at - pts : 0, progress: nxt ? (pts - cur.at) / (nxt.at - cur.at) : 1 };
  };

  // 0 = just cleaned, 1 = a full half-day (or more) of film has grown back.
  S.staleness = function () { if (!S.data.lastRunAt) return 1; return Math.max(0, Math.min(1, (S.now() - S.data.lastRunAt) / (13 * HOUR))); };
  S.hoursSinceRun = () => (S.data.lastRunAt ? (S.now() - S.data.lastRunAt) / HOUR : 24);
  S.brushAge = () => Math.max(0, Math.floor((S.now() - S.data.gear.brushStart) / DAY));
  S.guideCount = () => PH.SPECIES.filter((s) => S.data.guide[s.id]).length;

  function award(id, list) { if (!S.data.badges[id]) { S.data.badges[id] = S.now(); list.push(PH.BADGES.find((b) => b.id === id)); } }

  // Called once at the end of a hunt. Returns what changed so the results screen can celebrate it.
  S.record = function (res) {
    const d = S.data, now = S.now(), day = S.dayKey(now), slot = S.slot(now);
    const out = { newSpecies: [], newBadges: [], rankUp: null, usedShield: false, gainedShield: false, streak: 0, firstOfTide: false };
    const before = S.rank().index;
    for (const id in res.caught) { if (!d.guide[id]) out.newSpecies.push(PH.SPECIES_BY_ID[id]); d.guide[id] = (d.guide[id] || 0) + res.caught[id]; }
    d.shine += res.shine; d.bank += res.shine; d.runs++;
    for (const k in res.xp) d.mastery[k] += res.xp[k];
    if (res.mission) {
      const m = (d.missions[res.mission] = d.missions[res.mission] || { stars: 0, best: 0 });
      out.missionBest = res.shine > m.best; m.stars = Math.max(m.stars, res.stars); m.best = Math.max(m.best, res.shine);
      if (Object.values(d.missions).filter((x) => x.stars > 0).length >= 3) award('call3', out.newBadges);
      if (PH.MISSIONS.every((x) => (d.missions[x.id] || {}).stars === 3)) award('callAll', out.newBadges);
    }
    if (!res.practice) {
      const rec = (d.days[day] = d.days[day] || {});
      out.firstOfTide = !rec[slot];
      rec[slot] = 1;
      const st = d.streak;
      if (st.lastDay !== day) {
        const gap = st.lastDay ? S.dayDiff(day, st.lastDay) : 99;
        if (gap === 1) st.count++;
        else if (gap === 2 && st.shields > 0) { st.shields--; st.count++; out.usedShield = true; }
        else st.count = 1;
        st.lastDay = day;
        if (st.count % 7 === 0 && st.shields < 2) { st.shields++; out.gainedShield = true; }
        st.best = Math.max(st.best, st.count);
      }
      d.lastRunAt = now; d.lastQuads = res.quads.slice();
      if (res.gapsTotal && res.gapsDone / res.gapsTotal >= 0.75) { if (!rec.prime) { rec.prime = 1; d.primeDays++; S.emit('interdental.completed', { gaps: res.gapsDone, of: res.gapsTotal }); } award('prime', out.newBadges); if (d.primeDays >= 7) award('prime7', out.newBadges); }
      if (rec.am && rec.pm) award('both', out.newBadges);
      const h = new Date(now).getHours();
      if (h >= 4 && h < 7) award('early', out.newBadges);
      if (h >= 22 || h < 4) award('owl', out.newBadges);
      for (const [n, id] of [[3, 's3'], [7, 's7'], [14, 's14'], [30, 's30']]) if (st.count >= n) award(id, out.newBadges);
    }
    d.link.checkupBoost = false;
    award('first', out.newBadges);
    if (res.gentle >= 0.9) award('soft', out.newBadges);
    if (res.clean >= 0.98) award('gleam', out.newBadges);
    const g = S.guideCount();
    if (g >= 6) award('guide6', out.newBadges);
    if (g >= PH.SPECIES.length) award('guideAll', out.newBadges);
    const after = S.rank();
    if (after.index > before) out.rankUp = after.name;
    out.streak = d.streak.count;
    S.save();
    S.emit('routine.completed', { slot, practice: !!res.practice, seconds: res.seconds, clean: +res.clean.toFixed(2), gentle: +res.gentle.toFixed(2), stars: res.stars, points: res.shine });
    if (!res.practice) S.emit('streak.updated', { days: d.streak.count, shields: d.streak.shields });
    return out;
  };

  S.callOpen = (m) => !m.from.length || m.from.some((id) => (S.data.missions[id] || {}).stars > 0);
  S.addCard = function (id) { if (S.data.deck.length >= PH.DECK_MAX) return false; S.data.deck.push(id); S.save(); S.emit('kit.card', { card: id }); return true; };
  S.missionStars = () => Object.values(S.data.missions).reduce((n, m) => n + m.stars, 0);
  S.masteryLevel = (id) => Math.floor(Math.sqrt(S.data.mastery[id] / 40));
  S.upgrade = function (id) {
    const d = S.data, lvl = d.kit[id], cost = PH.kitCost(lvl), out = [];
    if (lvl >= PH.KIT_MAX || d.bank < cost) return null;
    d.bank -= cost; d.kit[id] = lvl + 1;
    if (d.kit[id] >= PH.KIT_MAX) award('kit5', out);
    S.save(); S.emit('kit.upgraded', { item: id, level: d.kit[id] });
    return out;
  };

  S.newBrush = function (skin) {
    const out = []; S.data.gear.brushStart = S.now(); if (skin) S.data.gear.skin = skin;
    award('fresh', out); S.save(); S.emit('brush.replaced', { colourway: S.data.gear.skin }); return out;
  };
  S.logCheckup = function () { S.data.link.checkup = S.now(); S.data.link.checkupBoost = true; S.save(); S.emit('checkup.logged', {}); };
  S.skip = function (hours) { S.data.offset = (S.data.offset || 0) + hours * HOUR; S.save(); };

  // ---- bridge: what a host app (the Curaprox app's web view) would hear ----
  const listeners = [];
  S.emit = function (type, payload) {
    const evt = { type, payload, at: new Date(S.now()).toISOString() };
    S.data.log.unshift(evt); if (S.data.log.length > 12) S.data.log.length = 12;
    S.save();
    for (const fn of listeners) { try { fn(evt); } catch (e) { /* host listener failed: not our problem */ } }
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'plaque-hunter', type, payload, at: evt.at }, '*'); } catch (e) { /* no host */ }
  };
  // Public surface for a host app: PlaqueHunter.on(fn) to listen, PlaqueHunter.state() to read.
  window.PlaqueHunter = {
    version: PH.VERSION,
    on(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    state() { const t = S.tide(), st = S.streakNow(); return { tide: t.slot, tideDone: t.done, interdentalDone: t.primeDone, streak: st.count, points: S.data.shine, rank: S.rank().name, brushAgeDays: S.brushAge() }; },
  };
})();
