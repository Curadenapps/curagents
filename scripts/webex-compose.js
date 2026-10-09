// Light-DOM Webex compose helper for the announcements and boom-boom-derek agents.
// Runs in web.webex.com through Claude in Chrome's javascript_tool; no API token.
//
//   (<this function>)(message, "App Team")
//   (<this function>)(message, "Curaden / Phinamic", { prefix: "Derek La" })
//
// Pastes the whole message into the open space's compose box in one step and
// returns the space name and character count. It refuses when the open space
// isn't the expected one. With `prefix`, the box may already hold exactly that
// text (an @mention picked from Webex's list) and the message goes after it.
// It never sends: attach the PDF with file_upload on the "File attachment"
// input if needed, check a screenshot, then click "Send message".
(message, expectedSpace, opts = {}) => {
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
  editor.focus();
  if (existing) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  const data = new DataTransfer();
  data.setData('text/plain', existing ? ` ${message}` : message);
  editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  return { ok: true, space, chars: editor.innerText.trim().length };
}
