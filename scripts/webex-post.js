// Webex web: compose and send one message from Sean's own sign-in.
// Every agent that posts to Webex uses this; the routine is in skills/webex-web/SKILL.md.
// Runs in a web.webex.com space tab through javascript_tool (built-in browser or Claude in Chrome):
//
//   (<this function>)(message, { spaceId: "644fd150-f1e6-11f0-886e-874a9ad69e32",
//                                 mention: ["Derek La", "Khanh Nguyen"],
//                                 marker: "Boom Boom: Fri 23 Oct", send: true })
//
// One call does the whole post, because Webex web keeps one live connection per
// browser: when Sean's own Webex tab is open, a freshly loaded tab is online for
// only ~15-20 s. Clicking and typing are too slow for that window; the editor's
// own Quill instance is not.
//
// opts
//   space       exact space name (checked against the compose box)        } at least
//   spaceId     conversation UUID (checked against the tab URL)          } one
//   mention     display name(s) to @mention first, e.g. "Derek La" or ["Derek La", "Khanh Nguyen"]
//               (each picked from Webex's own list; one space between chips, so "@Derek @Khanh")
//   marker      text unique to this post; if the space already shows it, nothing is sent
//   attachment  file name that must already be attached (file_upload) before sending
//   send        false (default) composes only; true presses Enter after every check passes
//
// Returns { ok, step?, error?, retry?, sent?, alreadyPosted?, space, chars }.
// retry: true means the tab is offline: reload the space and call again (the marker
// stops a double post). It never clicks anything else and never touches another space.
async (message, opts = {}) => {
  const { space, spaceId, mention, marker, attachment, send = false } = opts;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wall-clock waits: in a background tab Chrome stretches each timer to ~1 s, so loops count time, not tries.
  const until = async (fn, ms) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(200); v = fn(); } return v; };
  const offline = () => (document.body.innerText.match(/Offline - Another tab[^\n]*|Can't connect to Webex[^\n]*/) || [null])[0];
  const openId = () => {
    try { return atob(decodeURIComponent(location.pathname.split('/spaces/')[1].split('/')[0])).split('/').pop(); }
    catch { return null; }
  };
  const loaded = () => !!document.querySelector('[role="listitem"][aria-label^="Message from"]')
    || [...document.querySelectorAll('[role="listitem"]')].some((n) => /\b\d{1,2}:\d{2}\b/.test(n.innerText));

  if (!space && !spaceId) return { ok: false, step: 'args', error: 'name the space or its spaceId' };
  if (!message && !attachment) return { ok: false, step: 'args', error: 'nothing to post' };

  await until(() => document.querySelector('.ql-editor[contenteditable="true"]') && loaded(), 20000); // catching up can take 10-20 s
  const ed = document.querySelector('.ql-editor[contenteditable="true"]');
  if (!ed) return { ok: false, step: 'editor', error: 'no compose box; open the space first' };
  const openName = (ed.getAttribute('aria-label') || '').replace(/^Write a message to /, '');
  if (space && openName !== space) return { ok: false, step: 'space', error: `open space is "${openName}", expected "${space}"` };
  if (spaceId && openId() !== spaceId) return { ok: false, step: 'space', error: `open space id is ${openId()}, expected ${spaceId}` };
  if (!loaded()) return { ok: false, step: 'history', retry: true, error: 'messages not loaded yet, so the marker check cannot run' };
  const q = ed.closest('.ql-container')?.__quill;
  if (!q) return { ok: false, step: 'editor', error: 'Quill instance not found; Webex changed, see skills/webex-web' };
  q.setText('', 'user'); // drop any saved draft before the duplicate check reads the page
  if (marker && document.body.innerText.includes(marker)) return { ok: true, alreadyPosted: true, space: openName };
  if (offline()) return { ok: false, step: 'offline', retry: true, error: offline() };
  q.focus();

  const mentions = mention ? [].concat(mention) : [];
  if (mentions.length) {
    const m = q.getModule('mention');
    const chips = () => q.getContents().ops.map((o) => o.insert?.mention?.displayName).filter(Boolean);
    for (const name of mentions) {
      const at = q.getLength() - 1;
      const query = name.split(' ')[0].slice(0, 4);
      q.insertText(at, `${at ? ' ' : ''}@${query}`, 'user');
      q.setSelection(q.getLength() - 1, 0, 'user');
      const li = await until(() => [...document.querySelectorAll('li.ql-mention-list-item')].find((l) => l.dataset.displayName === name), 4000);
      if (!m || !li) { q.setText('', 'user'); return { ok: false, step: 'mention', error: `"${name}" not offered; post without the mention and open with their first name` }; }
      m.itemIndex = Number(li.dataset.index);
      m.selectItem();
      await sleep(200);
      if (!chips().includes(name)) { q.setText('', 'user'); return { ok: false, step: 'mention', error: `mention chip for "${name}" did not stick` }; }
    }
    if (message) q.insertText(q.getLength() - 1, `\n${message}`, 'user');
  } else if (message) {
    q.setText(message, 'user');
  }
  q.setSelection(q.getLength(), 0, 'user');
  await sleep(300);

  const text = q.getText().trim();
  if (text.length > 5000) { q.setText('', 'user'); return { ok: false, step: 'length', error: `${text.length} characters; Webex allows 5000, split into parts` }; }
  if (marker && !text.includes(marker)) { q.setText('', 'user'); return { ok: false, step: 'marker', error: 'marker is not in the message' }; }
  if (attachment && ![...document.querySelectorAll('[aria-label]')].some((n) => /attachment/i.test(n.getAttribute('aria-label')) && n.getAttribute('aria-label').includes(attachment))) {
    return { ok: false, step: 'attachment', error: `"${attachment}" is not attached; run file_upload first` };
  }
  if (!send) return { ok: true, composed: true, space: openName, chars: text.length };

  if (offline()) return { ok: false, step: 'offline', retry: true, error: offline(), composed: true };
  q.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
  const cleared = await until(() => !q.getText().trim(), 4000);
  return { ok: cleared, sent: cleared, step: cleared ? undefined : 'send', error: cleared ? undefined : 'compose box did not clear', space: openName, chars: text.length, banner: offline() };
}
