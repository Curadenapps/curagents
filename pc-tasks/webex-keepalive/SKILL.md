---
name: webex-keepalive
description: Hourly on weekdays: reload Webex in the built-in browser to keep Sean's sign-in warm; tell Sean when it's signed out; send any queued Boom Boom Derek ping once he's back.
---

Webex keep-alive. Work in C:\Users\sean.dunne\dev\curagents. Be quick and quiet: this runs every hour. Files live in `.boom-boom-derek/outbox/` (create the folder if missing; it is gitignored local state).

Goal: Sean's Webex web sign-in in the Claude desktop app's BUILT-IN BROWSER keeps expiring (Webex ends it on their side, even with "stay signed in"). This task (a) reloads Webex there so the session is used regularly, (b) tells Sean as soon as it is signed out so he can sign in again, and (c) once he's back, sends today's queued Boom Boom Derek ping.

Hard rules: never type, fill or submit credentials, never click "Sign in" / "Sign up" / cookie or consent buttons, read-only in Webex except the one queued post in step 4 (no reactions, edits, marking read on purpose), only the space Curaden / Phinamic.

1. Load the built-in browser tools with one ToolSearch on the `mcp__Claude_Browser__` prefix (skip if already listed). Open Webex with `preview_start` and url `https://web.webex.com/spaces/aHR0cHM6Ly9jb252LWEud2J4Mi5jb20vY29udmVyc2F0aW9uL2FwaS92MS9jb252ZXJzYXRpb25zLzEzNmQ5Y2UwLWFiNDEtMTFmMC04NWU1LTUzZWI3MTg4ZThjNg==` (Curaden / Phinamic). If the pane is already open, `navigate` to that url instead (a fresh reload is the point). If the built-in browser can't be reached at all, write status `unknown` (step 2) and stop; do not use Claude in Chrome.

2. Decide signed in or out with ONE `javascript_tool` call:
   `await (async () => { const s = ms => new Promise(r => setTimeout(r, ms)); const end = Date.now() + 20000; while (Date.now() < end) { if (/\/sign-in|\/login|idbroker|login\.microsoftonline/.test(location.href) || /\bSign in\b[\s\S]{0,200}\bSign up\b/.test(document.body.innerText)) return { signedIn: false, url: location.href }; if (document.querySelector('.ql-editor[contenteditable="true"]') || document.querySelector('[role="listitem"][aria-label^="Message from"]')) return { signedIn: true, url: location.href }; await s(500); } return { signedIn: null, url: location.href }; })()`
   `signedIn: null` → take one `screenshot` (scale 0.4) and judge: Webex sign-in / landing page = out; messages = in.
   Read `.boom-boom-derek/outbox/webex-status.json` (may not exist) and write it back as `{ "signedIn": true|false, "checkedAt": "<ISO now>", "signedOutSince": "<ISO or null>", "notifiedAt": "<ISO or null>" }`, keeping `signedOutSince` / `notifiedAt` from the old file while still signed out, and clearing both when signed in.

3. Signed OUT:
   - If `notifiedAt` is empty, or older than 4 hours: call `PushNotification` (ToolSearch "select:PushNotification") with status "proactive" and message: "Webex signed out in Claude's built-in browser. Open Claude desktop, Ctrl+Shift+B, sign in to web.webex.com. Queued pings send automatically after." (add " Boom Boom Derek ping is waiting." when today's pending file from step 4 exists). Set `notifiedAt` to now. Otherwise don't notify again.
   - Stop. End with one line: "Webex signed out (since {signedOutSince}); Sean notified {notifiedAt}".

4. Signed IN: look for `.boom-boom-derek/outbox/pending-{today YYYY-MM-DD}.json` (written by the Boom Boom Derek task when the sign-in page blocked it: `{ marker, messageFile, reason, createdAt }`).
   - None → stop. End with one line: "Webex signed in, kept alive".
   - Pending files for earlier days → don't send them (stale). Rename to `expired-{date}.json` and mention them in the final line.
   - Today's pending file: if `attempts` in it is 3 or more, stop and notify Sean once ("Boom Boom Derek ping couldn't be sent after 3 tries; say 'boom boom' in Claude"). Otherwise:
     a. `git fetch origin main` and read `scripts/webex-read.js` and `scripts/webex-post.js` with `git show origin/main:scripts/<file>`. Call each as `await (<whole file>)(args)` in `javascript_tool`.
     b. Run webex-read with `{ marker: "<marker>" }`. `markerCount` ≥ 1 → already posted: delete the pending file, stop.
     c. Check for news since the draft: run webex-read with `{ since: "— Boom Boom Derek 💥, on behalf of Sean", exportText: true }` and `get_page_text`. If Derek La posted after the file's `createdAt` with something that closes or re-dates an item in the message ("done", a link, a file, a new date, "not mine", or that he's ill / swamped), don't post the stale draft: notify Sean once ("Derek replied since the queued Boom Boom ping; say 'boom boom' in Claude to refresh it"), set `heldForReply: true` in the file, stop. Chit-chat that doesn't touch the items doesn't count.
     d. Read the message from `messageFile` (only the part from the `## 💥` line down to the "— Boom Boom Derek 💥, on behalf of Sean" sign-off; drop any HTML comment). `navigate` to the space again, then in ONE `javascript_tool` call run webex-post with `(message, { space: "Curaden / Phinamic", spaceId: "136d9ce0-ab41-11f0-85e5-53eb7188e8c6", mention: "Derek La", marker: "<marker>", send: true })`. `retry: true` → navigate and repeat, up to 3 tries. `step: "mention"` → repeat without `mention`, message starting "Derek,". Increase `attempts` in the file on each failed try.
     e. Verify: `navigate` again, webex-read `{ marker }` → `markerCount: 1` = posted. Take a `screenshot` (scale 0.5).
     f. Posted: delete the pending file. Update Derek's Notion page `3f47e8aabbb48179af31f54a4acadb10` (Notion fetch, then `notion-update-page` `update_content`): replace today's "queued: Webex sign-in needed…" ping-history text with "posted {HH:MM} in Curaden / Phinamic, Derek @mentioned (sent by the Webex keep-alive after Sean signed back in)". Then `PushNotification`: "Boom Boom Derek ping sent at {HH:MM} after you signed back in to Webex." End with a one-line summary.

Never close Sean's pane on purpose and never open a second Webex tab.