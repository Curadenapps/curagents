// Webex web: meeting recaps (list, AI summary + action items, full transcript).
// Used by meeting-notes, announcements, boom-boom-derek and anyone reading a meeting;
// the routine is in skills/webex-web/SKILL.md. Runs through
// javascript_tool (built-in browser or Claude in Chrome) on the page named for each action:
//
//   web.webex.com/meetings/meetingContent                 (<this function>)({ action: "list", since: "2026-10-01" })
//   web.webex.com/meetingcontainer/{id}/summary           (<this function>)({ action: "summary" })
//   web.webex.com/meetingcontainer/{id}/transcript        (<this function>)({ action: "transcript", part: 1 })
//
// list        returns [{ title, date, time, url }]; url opens the meeting's summary page.
// summary     exports the AI notes, detailed summary and action items for get_page_text.
// transcript  reads the whole transcript from the page's own data (the on-screen list is
//             virtualised, and scrolling a background tab is throttled), then exports one
//             part of ~20,000 characters as "[m:ss] Speaker: text" lines for get_page_text.
//
// Exports go into <article id="webex-export">; call get_page_text right after.
// Read-only: never downloads, shares, edits or deletes a recording, summary or transcript.
async (opts = {}) => {
  const { action, since, part = 1, partSize = 20000 } = opts;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wall-clock waits: in a background tab Chrome stretches each timer to ~1 s, so loops count time, not tries.
  const until = async (fn, ms) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(200); v = fn(); } return v; };
  const fiber = (n) => { const k = Object.keys(n).find((x) => x.startsWith('__reactFiber') || x.startsWith('__reactInternalInstance')); return k ? n[k] : null; };
  const exportPart = (title, text) => {
    const parts = Math.max(1, Math.ceil(text.length / partSize));
    const n = Math.min(Math.max(1, part), parts);
    document.getElementById('webex-export')?.remove();
    const art = document.createElement('article');
    art.id = 'webex-export';
    art.style.cssText = 'position:fixed;left:-99999px;top:0;white-space:pre-wrap';
    art.textContent = `WEBEX ${title} — part ${n} of ${parts}\n\n${text.slice((n - 1) * partSize, n * partSize)}\n\nEND OF PART ${n} of ${parts}`;
    document.body.appendChild(art);
    return { part: n, parts, chars: text.length, exported: 'run get_page_text now' };
  };
  const header = () => {
    const t = document.body.innerText;
    const m = t.match(/\nBack\n([^\n]+)\n([A-Z][a-z]{2}, [A-Z][a-z]+ \d{1,2}, \d{4})\n([^\n]+)/);
    return m ? { title: m[1], date: m[2], time: m[3] } : {};
  };

  if (action === 'list') {
    const urlOf = (n) => { let f = fiber(n); for (let d = 0; f && d < 14; d++, f = f.return) if (f.memoizedProps?.meetingContainerUrl) return f.memoizedProps.meetingContainerUrl; return null; };
    const collect = () => {
      const rows = new Map();
      for (const n of document.querySelectorAll('mdc-text, span')) {
        if (n.childElementCount || !n.textContent.trim()) continue;
        const u = urlOf(n);
        if (!u) continue;
        if (!rows.has(u)) rows.set(u, []);
        rows.get(u).push(n.textContent.trim());
      }
      return rows;
    };
    await until(() => collect().size, 10000);
    const rows = collect();
    if (!rows.size) return { ok: false, error: 'no meeting recaps found; open web.webex.com/meetings/meetingContent' };
    const from = since ? new Date(`${since}T00:00:00`) : null; // local midnight, like the dates Webex shows
    const list = [...rows].map(([u, texts]) => {
      const t = [...new Set(texts)];
      const date = t.find((x) => /^[A-Z][a-z]{2}, [A-Z][a-z]+ \d{1,2}, \d{4}$/.test(x)) || null;
      return { title: t[0], date, time: t.find((x) => /\d{1,2}:\d{2}/.test(x) && x !== date) || null, url: `https://web.webex.com/meetingcontainer/${btoa(u)}/summary` };
    }).filter((r) => !from || !r.date || new Date(r.date) >= from);
    return { ok: true, count: list.length, meetings: list };
  }

  if (action === 'summary') {
    await until(() => /Action items/.test(document.body.innerText) && /\nNotes\n/.test(document.body.innerText), 10000);
    const t = document.body.innerText;
    const start = t.search(/\nNotes\n/);
    if (start < 0) return { ok: false, error: 'no AI summary on this page (not recorded, or Webex AI was off)', ...header() };
    const body = t.slice(start + 1).replace(/\n(Catching up|Finished catching up)[^\n]*/g, '').trim();
    return { ok: true, ...header(), hasActionItems: /\nAction items\n/.test(body), ...exportPart(`SUMMARY: ${header().title || ''} ${header().date || ''}`, body) };
  }

  if (action === 'transcript') {
    const isRow = (v) => v && typeof v === 'object' && 'content' in v && 'startTime' in v && v.speaker;
    const vl = await until(() => document.querySelector('mdc-virtualizedlist'), 10000);
    if (!vl) return { ok: false, error: 'no transcript on this page (open /transcript; the meeting may have none)', ...header() };
    let rows = null;
    const seen = new Set();
    const scan = (o, d) => {
      if (!o || rows || d > 2 || typeof o !== 'object' || seen.has(o) || o instanceof Node) return;
      seen.add(o);
      for (const v of Object.values(o)) {
        if (Array.isArray(v) && v.length && isRow(v[0])) { rows = v; return; }
        if (v && typeof v === 'object' && !Array.isArray(v)) scan(v, d + 1);
      }
    };
    for (let f = fiber(vl), d = 0; f && d < 40 && !rows; d++, f = f.return) { scan(f.memoizedProps, 0); scan(f.memoizedState, 0); }
    if (!rows) return { ok: false, error: 'transcript data not found; Webex changed, see skills/webex-web', ...header() };
    const ts = (ms) => { const s = Math.floor(Number(ms) / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`; };
    const text = rows.map((r) => `[${ts(r.startTime)}] ${r.speaker.speakerName || 'Unknown'}: ${r.content}`).join('\n');
    return { ok: true, ...header(), lines: rows.length, speakers: [...new Set(rows.map((r) => r.speaker.speakerName))], languages: [...new Set(rows.map((r) => r.language).filter(Boolean))], ...exportPart(`TRANSCRIPT: ${header().title || ''} ${header().date || ''}`, text) };
  }

  return { ok: false, error: 'action must be list, summary or transcript' };
}
