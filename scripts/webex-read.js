// Webex web: read the open space (status, recent messages, did a post land).
// Every agent that reads a Webex space uses this; the routine is in skills/webex-web/SKILL.md.
// Runs in a web.webex.com space tab through Claude in Chrome's javascript_tool:
//
//   (<this function>)({ marker: "Boom Boom Derek: Mon 12 Oct" })          // verify a post
//   (<this function>)({ since: "Boom Boom Derek 💥, on behalf of Sean" })  // what came after
//   (<this function>)({ olderPages: 3, exportText: true })               // load more history, then get_page_text
//
// opts
//   marker      count the messages that contain this text (1 = posted once)
//   since       only return messages after the last one that contains this text
//   olderPages  scroll the message list up this many times first (max 6 per call), to load older history
//   exportText  put the selected messages into <article id="webex-export"> so get_page_text
//               returns exactly them (javascript_tool output is cut at ~1,000 characters)
//
// Read-only: it scrolls and reads, it never clicks, reacts or marks anything.
async (opts = {}) => {
  const { marker, since, olderPages = 0, exportText = false } = opts;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wall-clock waits: in a background tab Chrome stretches each timer to ~1 s, so loops count time, not tries.
  const until = async (fn, ms) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(200); v = fn(); } return v; };
  const status = () => (document.body.innerText.match(/Offline - Another tab[^\n]*|Can't connect to Webex[^\n]*|Catching up[^\n]*/) || ['online'])[0];
  // Messages are list items labelled "Message from {author}, {time}, …"; the time test is a fallback.
  const items = () => {
    const labelled = [...document.querySelectorAll('[role="listitem"][aria-label^="Message from"]')];
    return labelled.length ? labelled : [...document.querySelectorAll('[role="listitem"]')].filter((n) => /\b\d{1,2}:\d{2}\b/.test(n.innerText));
  };

  // A space can take 10-20 s to "catch up" in a background tab.
  if (!(await until(() => items().length, 20000))) return { ok: false, status: status(), error: 'no messages loaded; reload the space and call again' };

  for (let p = 0; p < Math.min(olderPages, 6); p++) {
    let s = items()[0].parentElement;
    while (s && !(s.scrollHeight > s.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    if (!s) break;
    const before = items().length;
    s.scrollTop = 0;
    if (!(await until(() => items().length > before, 4000))) break; // nothing older loaded
  }

  const space = (document.querySelector('.ql-editor')?.getAttribute('aria-label') || '').replace(/^Write a message to /, '');
  let msgs = items().map((n) => n.innerText.replace(/\n{3,}/g, '\n\n').trim());
  const markerCount = marker ? msgs.filter((t) => t.includes(marker)).length : undefined;
  if (since) {
    const last = msgs.map((t) => t.includes(since)).lastIndexOf(true);
    msgs = last >= 0 ? msgs.slice(last + 1) : msgs;
  }

  if (exportText) {
    document.getElementById('webex-export')?.remove();
    const art = document.createElement('article');
    art.id = 'webex-export';
    art.style.cssText = 'position:fixed;left:-99999px;top:0;white-space:pre-wrap';
    art.textContent = `WEBEX SPACE EXPORT: ${space} (${msgs.length} messages)\n\n${msgs.join('\n\n---\n\n')}\n\nEND OF EXPORT`;
    document.body.appendChild(art);
  }

  return {
    ok: true,
    space,
    status: status(),
    loaded: items().length,
    returned: msgs.length,
    markerCount,
    last: msgs.length ? msgs[msgs.length - 1].slice(0, 400) : null,
    exported: exportText ? 'run get_page_text now' : undefined,
  };
}
