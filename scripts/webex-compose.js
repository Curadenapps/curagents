// Light-DOM Webex compose helper for the announcements and boom-boom-derek agents.
// Runs in web.webex.com through Claude in Chrome's javascript_tool; no API token.
//
//   (<this function>)(message, "App Team")
//   (<this function>)(message, "Curaden / Phinamic", { prefix: "Derek La" })
//
// Puts the whole message into the open space's compose box through the
// editor's own Quill instance (a synthetic paste event is ignored by Webex) and
// returns Webex's own character counter. It refuses when the open space isn't
// the expected one. With `prefix`, the box may already hold exactly that text
// (an @mention picked from Webex's list) and the message goes after it. It never
// sends: attach the PDF with file_upload on the "File attachment" input if
// needed, check the attachment chip, then click "Send message".
async (message, expectedSpace, opts = {}) => {
  const editor = document.querySelector('.ql-editor[contenteditable="true"]');
  if (!editor) return { ok: false, error: 'no compose box; open the space first' };
  const space = (editor.getAttribute('aria-label') || '').replace(/^Write a message to /, '');
  if (space !== expectedSpace) return { ok: false, error: `open space is "${space}", expected "${expectedSpace}"` };
  const existing = editor.innerText.trim();
  const prefix = (opts.prefix || '').trim();
  if (existing && existing !== prefix) {
    return { ok: false, error: prefix ? `compose box holds "${existing}", expected only "${prefix}"` : 'compose box is not empty; clear it first' };
  }
  const total = existing.length + (existing ? 1 : 0) + message.length;
  if (total > 5000) return { ok: false, error: `${total} characters; Webex allows 5000, split into parts` };
  const quill = editor.closest('.ql-container')?.__quill;
  if (!quill) return { ok: false, error: 'editor API not found; Webex changed, compose by typing instead' };
  quill.focus();
  if (existing) quill.insertText(quill.getLength() - 1, ` ${message}`, 'user'); // keeps the mention
  else quill.setText(message, 'user');
  quill.setSelection(quill.getLength(), 0, 'user');
  await new Promise((r) => setTimeout(r, 500));
  const counter = [...document.querySelectorAll('*')]
    .map((n) => (n.childNodes.length === 1 && /^\d+\/5000$/.test(n.textContent.trim()) ? n.textContent.trim() : null))
    .find(Boolean);
  return { ok: true, space, chars: quill.getText().trim().length, counter };
}
