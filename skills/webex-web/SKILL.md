---
name: webex-web
description: >
  The one way every agent works in Webex: posting, reading spaces, and reading
  meetings (AI summary, action items, full transcript, recordings). Load it before
  any Webex step, for "post to Webex", "ping in Webex", "read the space", "what did
  he reply", "meeting summary", "meeting transcript", "Webex recording", "post the
  update", "send QA report", "boom boom", or whenever an agent spec says Webex.
  Runs in Webex web on Sean's own sign-in, in the Claude desktop app's built-in
  browser (Claude in Chrome as fallback), with three scripts: webex-post.js,
  webex-read.js, webex-meetings.js. No bot tokens.
---

# Webex web

Every Webex action goes through Webex web on Sean's own sign-in, in the Claude
desktop app's **built-in browser** (Claude in Chrome only as a fallback), with the
scripts below. Posts come from Sean's account with real
@mentions, every space and meeting he can see is readable, and nothing expires.
**Bot tokens are not used.** They get culled after a few days, and a bot can't
read the spaces or meetings. `WEBEX_BOT_TOKEN`, `scripts/send-webex-update.ps1`
and `scripts/qa-report.mjs webex` are legacy and not part of any routine.

Proven live on 12 Oct 2026: the Boom Boom Derek ping went out with Derek La
@mentioned while Sean's own Webex tab kept taking the connection back, and the
7 Oct Curaden / Phinamic meeting read in full (summary, action items, 785
transcript lines). On 13 Oct the 08:45 scheduled run couldn't reach Claude in
Chrome at all (no browser connected to the session), so Sean signed in to Webex
once in the built-in browser and the ping went out from there, first try, with no
tab clash.

| Script | Page | Does |
|--------|------|------|
| [`scripts/webex-post.js`](../../scripts/webex-post.js) | a space | Checks the space, history and duplicates, @mentions from Webex's own list, composes, sends with Enter |
| [`scripts/webex-read.js`](../../scripts/webex-read.js) | a space | Status, messages (all, or since a marker), how many times a post landed, export for `get_page_text` |
| [`scripts/webex-meetings.js`](../../scripts/webex-meetings.js) | Meetings | Recap list, AI summary + action items, full transcript (from page data), export for `get_page_text` |

## How to run a script

`javascript_tool` returns the last expression, and a promise comes back empty
(`{}`), so always call a script as:

```js
await (<the whole file, from "async" to the closing brace>)(args)
```

Read the file, paste it between the parentheses, add the arguments. Results longer
than about 1,000 characters are cut, so the scripts return short JSON and put long
text into `<article id="webex-export">`; call `get_page_text` straight after and it
returns exactly that text (its "Source element" says `<article>`).

## Ground rules

1. **Built-in browser first** (`mcp__Claude_Browser__*`, loaded in one ToolSearch
   on that prefix). It lives in the Claude desktop app, keeps Sean's Webex sign-in
   across every session (scheduled ones included) and works with the pane hidden,
   so it doesn't depend on the Chrome extension pairing with each session. Open the
   space with `preview_start` and the space URL; `navigate` that tab to reload.
   **Fallback: Claude in Chrome** (`mcp__claude-in-chrome__*`) only when the
   built-in browser tools are missing or fail: `tabs_context_mcp`
   (`createIfEmpty: true`), your own tab, closed when done, never a tab outside your
   group. Neither reachable → stop and follow the agent's "can't post" rule. The
   scripts are the same in both.
2. **Sign-in prompts: stop.** If Webex, `curaden.webex.com` or a recording asks for
   a sign-in or a password, stop and tell Sean. Never type credentials. In the
   built-in browser, Sean signs in himself once (Ctrl+Shift+B shows the pane) and it
   persists; decline optional cookies on the way.
3. **Exact space only.** Open spaces by ID (table below) or by exact name; two
   spaces start with "Curaden / Phinamic". `webex-post.js` refuses any other space.
4. **Posting follows the agent's own rules** (approval, one message a day, partner
   safety). This skill only covers how to post, never whether to.
5. **Read-only everywhere else.** No reactions, no edits, no deletes, no marking
   read on purpose, no downloads, shares or edits of recordings and transcripts.
6. **One tab.** Don't open Webex in a second tab "to try again". Reload your own
   tab instead (see "The tab clash").

## Spaces

Open a space directly: `https://web.webex.com/spaces/{segment}`, where `segment` is
the base64 of `https://conv-a.wbx2.com/conversation/api/v1/conversations/{id}`.

| Space | ID | Used by |
|-------|----|---------|
| Curaden / Phinamic | `136d9ce0-ab41-11f0-85e5-53eb7188e8c6` | boom-boom-derek (Derek-only pings), announcements (tests) |
| The common chat: "Curaden / Phinamic — BOB App & Admin" (Webex's name; older specs call it the QA space) | `644fd150-f1e6-11f0-886e-874a9ad69e32` | boom-boom-derek (team pings, from 23 Oct), feedback-qa reports |
| App Team | look up by exact name | announcements (weekly, monthly) |
| App Team - Markets | look up by exact name | announcements (Markets edition, from Dec 2026) |

Curaden / Phinamic segment:
`aHR0cHM6Ly9jb252LWEud2J4Mi5jb20vY29udmVyc2F0aW9uL2FwaS92MS9jb252ZXJzYXRpb25zLzEzNmQ5Y2UwLWFiNDEtMTFmMC04NWU1LTUzZWI3MTg4ZThjNg==`.
Common chat segment (Sean's own link, `conv-r` host; opened and posted to on 23 Oct):
`aHR0cHM6Ly9jb252LXIud2J4Mi5jb20vY29udmVyc2F0aW9uL2FwaS92MS9jb252ZXJzYXRpb25zLzY0NGZkMTUwLWYxZTYtMTFmMC04ODZlLTg3NGE5YWQ2OWUzMg==`.
Two spaces start with "Curaden / Phinamic", so check the ID, not the name.
If a direct link doesn't open the space, search by exact name in the Messaging
list (`find` the treeitem), then add the ID's name to this table.

## The tab clash (read this before posting)

Webex web keeps **one live connection per browser**. In Claude in Chrome, when
Sean has his own Webex tab open and visible, a freshly loaded tab of ours is online
for only about **15–20 seconds** before it shows "Offline - Another tab has been
opened". The built-in browser is a separate browser, so his Chrome tab doesn't
take its connection (13 Oct: online throughout). Either way, keep the routine:

- **Do the whole post in one `javascript_tool` call** right after a reload
  (`webex-post.js` with `send: true`). Clicking and typing are too slow, and typed
  text can land in the search box instead of the compose box.
- `retry: true` in a result means the tab was offline: `navigate` to the space again
  and repeat the same call. The `marker` stops a double post, so retrying is safe.
  Give up after 3 tries and use the agent's "can't post" rule.
- **Right after a send the tab may show offline, or the list may spin.** That is not
  a failure. Never resend on that basis: reload and verify with `webex-read.js`.

**Background tab limits.** Our tab is hidden (behind Sean's window, or the hidden
browser pane), so timers can be clamped to about one second and scroll and render
work throttled. Keep each in-page call well under 45 seconds (the tool's limit).
Don't scroll virtual lists to read them; the scripts read the page's own data
instead.

**Read before you scroll.** The message list is virtual: `olderPages` loads older
messages and unloads the newest ones. For "replies since the last ping", call
`webex-read.js` without `olderPages` first; raise it only when the `since` text
isn't found, and then read the newest messages again after a reload.

## Recipe 1: post a message

1. Save the message the agent wrote (its own folder, e.g. `.boom-boom-derek/`).
2. `navigate` to the space.
3. Run `webex-post.js` with:
   `{ space, spaceId, mention, marker, send: true }`.
   - `marker` is a phrase unique to this post (its title line, e.g.
     "Boom Boom Derek: Mon 12 Oct"). If the space already shows it, the script
     returns `alreadyPosted` and sends nothing.
   - `mention` is the person's Webex display name ("Derek La"), or a list of them
     for several people (`["Derek La", "Khanh Nguyen"]`). The script picks each from
     Webex's own list, so they become real @mentions with a space between them
     (shown as "@Derek @Khanh"). If one isn't offered (`step: "mention"`),
     post without `mention` and open the message with their first names.
   - Webex markdown renders: `##` titles, `**bold**`, `-` bullets, links. Max 5,000
     characters; split longer posts at a heading into "Part 1 of N"….
4. `retry: true` → step 2. `ok: true, sent: true` → step 5. Any other `ok: false`:
   stop, report the `step` and `error`.
5. **Verify.** `navigate` to the space again and run `webex-read.js` with
   `{ marker }`. `markerCount: 1` means posted once. 0 after two reloads means not
   sent: back to step 2 (the marker guard still holds). Take a `screenshot`
   (`save_to_disk: true`) of the posted message for the run summary.

Want to check before a first post to a new space? Run step 3 with `send: false`
(compose only), `screenshot`, then clear the box: run
`document.querySelector('.ql-editor[contenteditable="true"]').closest('.ql-container').__quill.setText('', 'user')`.
Never leave a draft behind: Webex saves drafts per space.

## Recipe 2: post with a file (PDF report)

1. `navigate` to the space.
2. `find` "File attachment input" and run `file_upload` with that ref and the PDF
   path. Never click the attach button: it opens a native dialog.
3. Run `webex-post.js` with `{ space, marker, attachment: "<file name>", send: true }`.
   It refuses if the file chip isn't there.
4. Verify as in Recipe 1, step 5 (the file name should appear in the message).

If the tab goes offline between steps, the attachment is lost with the reload:
start again at step 1. Do steps 2–3 back to back, without other work in between.

## Recipe 3: read a space

1. `navigate` to the space.
2. Run `webex-read.js`:
   - replies since the agent's last post: `{ since: "<its last marker or sign-off>", exportText: true }`
   - more history: add `olderPages: n` (each loads one more screen of older messages)
3. `get_page_text`: the export lists each message as author, time, text, separated
   by `---`.

Only the messages Webex has loaded are read; if the agent's last post is older
than what's on screen, raise `olderPages` (see "Read before you scroll"). If
`get_page_text` doesn't return the export, read it in slices with `javascript_tool`:
`document.getElementById('webex-export').textContent.slice(from, to)`.

## Recipe 4: meetings (summary, action items, transcript, recording)

Webex's AI Assistant writes a summary and action items for recorded meetings, and
a transcript with speakers. These are the meeting source; Fireflies isn't used.

1. **List.** `navigate` to `https://web.webex.com/meetings/meetingContent` (the
   "Meeting recaps" tab) and run `webex-meetings.js` with
   `{ action: "list", since: "YYYY-MM-DD" }`. Each meeting comes back with title,
   date, time and `url` (its summary page).
2. **Summary + action items.** `navigate` to the meeting `url` (ends in `/summary`),
   run `{ action: "summary" }`, then `get_page_text`. You get the AI notes
   (Overview, Detailed Summary) and every action item. `ok: false` means no AI
   summary for that meeting: skip it, or use the transcript.
3. **Transcript.** Same `url` with `/transcript` instead of `/summary`. Run
   `{ action: "transcript", part: 1 }`, `get_page_text`, then part 2… up to
   `parts`. Lines read `[m:ss] Speaker: text`, with `speakers` and `languages`
   in the result. Read it when an action item is unclear, an owner or date is
   missing, or the agent needs exact wording. It is speech-to-text, so names and
   product terms can be wrong ("Bob" for BOB, "Coura" for Curaprox); never quote
   it as a decision on its own.
4. **Recording (video).** The meeting's Recordings tab lists each recording (`/recordings`).
   Playback runs on `curaden.webex.com` and needs Sean signed in to that site; if
   it asks for a recording password or a sign-in, stop (rule 2). When it plays,
   look at screen-shared content (a sheet, a design) by seeking the `<video>`
   element (`currentTime` to the transcript timestamp) and taking a `screenshot`.
   Never download, share or delete a recording.

Partner-safe and privacy rules come from the agent: a summary is internal until
the agent's spec says what may leave Notion.

## When things fail

| Symptom | What it means | Do |
|---------|---------------|----|
| `retry: true` / "Offline - Another tab has been opened" | Sean's Webex tab took the connection | Reload the space and repeat (max 3) |
| "Can't connect to Webex services. Retrying…" | Reconnecting after a reload | Wait, then re-run; the script waits for the editor |
| `{}` from `javascript_tool` | Promise not awaited | Call as `await (…)(args)` |
| "Script injection timed out" / CDP 45 s timeout | Page busy, or a loop too long in a background tab | Wait a few seconds; keep calls short |
| `step: "space"` | Wrong space open | Open the right one; never post elsewhere |
| `step: "history"` / "no messages loaded" | The space was still catching up (10–20 s in a background tab) | Reload and repeat |
| `step: "mention"` | Person not in the space's list | Post without the mention, first name instead |
| `Quill instance not found` / `transcript data not found` | Webex changed its page | Stop; fix the script, update this skill |
| Sign-in page or recording password | Session expired or protected recording | Stop and tell Sean |
| "Claude in Chrome is not connected" / no connected browsers | The extension isn't paired with this session (13 Oct, scheduled run) | Use the built-in browser; it's the default anyway |
| Built-in browser shows the Webex sign-in page | Its Webex session expired | Stop; Sean signs in once in the pane (Ctrl+Shift+B) |

## Agents that use this

| Agent | Webex use |
|-------|-----------|
| [boom-boom-derek](../../agents/boom-boom-derek.md) | Reads the common chat, Curaden / Phinamic and the Phinamic team's meetings; posts one ping a day, to the common chat by default |
| [announcements](../../agents/announcements.md) | Reads meeting summaries; posts the approved update (+ PDF) to App Team |
| [meeting-notes](../../agents/meeting-notes.md) | Meeting summary, action items and transcript → Notion recap page |
| [feedback-qa](../../agents/feedback-qa.md) | Posts the QA report (+ PDF) to the QA space |
| [webex-sweep](../../agents/webex-sweep.md) | Reads App Team, the QA space and Curaden / Phinamic, plus new meeting recaps (action items only). Never posts |
| Any new agent | Load this skill; add its spaces to the table above |
