// Light-DOM Webex compose helper for the announcements agent.
// Runs in web.webex.com through Claude in Chrome's javascript_tool; no API token.
//
//   (<this function>)(message, "App Team")
//
// Pastes the whole message into the open space's compose box in one step and
// returns the space name and character count. It refuses when the open space
// isn't the expected one. It never sends: attach the PDF with file_upload on
// the "File attachment" input, check a screenshot, then click "Send message".
(message, expectedSpace) => {
  const editor = document.querySelector('.ql-editor[contenteditable="true"]');
  if (!editor) return { ok: false, error: 'no compose box; open the space first' };
  const space = (editor.getAttribute('aria-label') || '').replace(/^Write a message to /, '');
  if (space !== expectedSpace) return { ok: false, error: `open space is "${space}", expected "${expectedSpace}"` };
  if (message.length > 5000) return { ok: false, error: `${message.length} characters; Webex allows 5000, split into parts` };
  if (editor.innerText.trim()) return { ok: false, error: 'compose box is not empty; clear it first' };
  editor.focus();
  const data = new DataTransfer();
  data.setData('text/plain', message);
  editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  return { ok: true, space, chars: editor.innerText.trim().length };
}
