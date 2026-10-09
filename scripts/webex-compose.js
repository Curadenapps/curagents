// Light-DOM Webex compose helper for the announcements agent.
// Runs in web.webex.com through Claude in Chrome's javascript_tool; no API token.
//
//   (<this function>)(message, "App Team")
//
// Puts the whole message into the open space's compose box through the
// editor's own Quill instance (a synthetic paste event is ignored by Webex) and
// returns Webex's own character counter. It refuses when the open space isn't
// the expected one. It never sends: attach the PDF with file_upload on the
// "File attachment" input, check the attachment chip, then click "Send message".
async (message, expectedSpace) => {
  const editor = document.querySelector('.ql-editor[contenteditable="true"]');
  if (!editor) return { ok: false, error: 'no compose box; open the space first' };
  const space = (editor.getAttribute('aria-label') || '').replace(/^Write a message to /, '');
  if (space !== expectedSpace) return { ok: false, error: `open space is "${space}", expected "${expectedSpace}"` };
  if (message.length > 5000) return { ok: false, error: `${message.length} characters; Webex allows 5000, split into parts` };
  if (editor.innerText.trim()) return { ok: false, error: 'compose box is not empty; clear it first' };
  const quill = editor.closest('.ql-container')?.__quill;
  if (!quill) return { ok: false, error: 'editor API not found; Webex changed, compose by typing instead' };
  quill.focus();
  quill.setText(message, 'user');
  quill.setSelection(quill.getLength(), 0, 'user');
  await new Promise((r) => setTimeout(r, 500));
  const counter = [...document.querySelectorAll('*')]
    .map((n) => (n.childNodes.length === 1 && /^\d+\/5000$/.test(n.textContent.trim()) ? n.textContent.trim() : null))
    .find(Boolean);
  return { ok: true, space, chars: quill.getText().trim().length, counter };
}
