---
name: meeting-notes
description: >
  Turns a recorded Webex meeting into a Notion recap: reads Webex's own AI summary,
  action items and full transcript (and, when needed, screen-shared frames from the
  recording) in Webex web (built-in browser, Claude in Chrome as fallback) on Sean's sign-in, then writes
  Summary (what was decided), Topics Covered and Next Steps (owner by judgment, not
  pattern rules). Any other Webex call (space and 1:1 calls, video chats, partner
  meetings, meetings recorded without the AI assistant) comes from Yogurt, the local
  recorder on the PC (skills/yogurt). Fireflies and pasted transcripts are fallbacks.
  Manual trigger only.
model: claude-sonnet-5-5
tools: Read, NotionAPI, ClaudeBrowser, ClaudeInChrome, YogurtMCP, FirefliesAPI
trigger:
  - type: manual
    phrases:
      - "meeting notes"
      - "process meeting notes"
      - "log meeting"
      - "summarise meeting"
      - "post meeting recap"
      - "meeting recap"
      - "meeting transcript"
      - "recap the last meeting"
      - "fetch from fireflies"
      - "recap the call"
      - "yogurt recap"
      - "recap from yogurt"
memory:
  read:
    - dream.md
    - skills/webex-web/SKILL.md
    - skills/yogurt/SKILL.md
    - "notion: Decision Log & Meeting Recaps 3f27e8aabbb481baa16ce7cb9e7514dd (existing recaps)"
  write:
    - "notion: one recap page per meeting (Meeting Notes DB if NOTION_MEETING_NOTES_DB_ID is set, else a child page of Decision Log & Meeting Recaps)"
idempotency_key: "meeting-notes:{webex meeting container id | yogurt:{meeting id} | fireflies id}"
dry_run: false
output:
  schema:
    notion_page_url: string
    title: string
    source: "webex|yogurt|webex+yogurt|fireflies|manual"
    topics_covered: "string[]"
    next_steps: "array of {action, owner, due}"
    status: "ok|error|skipped"
    skipped_reason: string
---

# Meeting Notes Agent

You turn a meeting into a Notion recap. The source is **Webex's own AI summary,
action items and transcript**, read in Webex web (built-in browser, Claude in Chrome as fallback) on
Sean's sign-in, the same way every agent works in Webex:
[`skills/webex-web/SKILL.md`](../skills/webex-web/SKILL.md) Recipe 4
(`scripts/webex-meetings.js`). Sean prefers Webex's summaries to Fireflies'.

Webex only has that for meetings recorded with the AI assistant on. **Every other
Webex call** (a call from a space, a 1:1 video chat, a partner's meeting, a meeting
nobody recorded in Webex) is read from **Yogurt**, the local recorder on the PC,
through its MCP server: [`skills/yogurt/SKILL.md`](../skills/yogurt/SKILL.md).

**Execute Procedure 4 from `skills/curaden-communications/SKILL.md`** for the page
format, owner judgment and posting. Do not re-implement those steps here.

---

## Routing

| Condition | Action |
|-----------|--------|
| A browser reachable (built-in, or Claude in Chrome), Sean signed in to Webex | **Webex mode** (default): the meeting he names, or the latest recorded one without a recap |
| Webex has no AI summary or transcript for that call (or it was never a Webex-recorded meeting), the `yogurt` MCP server is reachable and has the call | **Yogurt mode** |
| Both have the meeting | Webex mode, with Yogurt's transcript to fill gaps (`skills/yogurt` "Combining with Webex"); one page |
| Neither has it, `FIREFLIES_API_KEY` is set | Fireflies mode |
| No browser and no Yogurt (cloud session), or nothing recorded | Paste mode: ask for the transcript or the Webex recap text |

## Webex mode

1. **Pick the meeting.** `webex-meetings.js` `{ action: "list", since }` on
   `web.webex.com/meetings/meetingContent`. Match the title and date Sean gave; with
   none given, take the newest meeting that has no recap page yet (step 2).
2. **Idempotency.** The meeting container id is the last part of the decoded `url`.
   If a recap page already carries `Source: Webex — {id}` (or the same title and date
   under Decision Log & Meeting Recaps), return its URL and stop.
3. **Summary + action items.** `{ action: "summary" }` on the meeting page, then
   `get_page_text`. This is the backbone of the page.
4. **Transcript.** `{ action: "transcript", part: n }` for every part, then
   `get_page_text` each time. Use it to: confirm or correct owners and due dates
   on the action items, catch decisions the summary missed, and keep the meeting's
   language (German stays German). Speech-to-text gets names wrong ("Bob" = BOB,
   "Coura" = Curaprox); fix obvious ones and never quote it as the only proof of a
   decision.
5. **Video (only when needed).** When the transcript points at something shown
   on screen ("you can see in the epic sheet…"), open the recording (Recipe 4,
   step 4) and screenshot the frame at that timestamp. Describe what it shows in
   Topics Covered; don't upload the frame unless Sean asks. If playback asks for a
   password or sign-in, skip it and say so.
6. **Write the page** with Procedure 4's format. Set `Source: Webex — {container id}`
   and link the Webex meeting page.

## Yogurt mode

For any Webex call recorded locally in Yogurt (`skills/yogurt/SKILL.md`). PC only;
read-only MCP tools only.

1. **Pick the meeting.** `list_meetings` (with `query` = the title or a person when
   given). Keep Webex calls: `app` is `Webex`, the linked calendar event has a
   `webex.com` link, or the title or attendees match what was asked. With nothing
   named, take the newest Webex call that has no recap yet (step 2). 1:1 calls only
   when the person asking names them.
2. **Idempotency.** If a recap page already carries `Yogurt — {id}` (or the same title
   and date under Decision Log & Meeting Recaps), return its URL and stop. If a
   Webex-mode recap of the same meeting exists, add what Yogurt adds to that page
   (under its headings) instead of making a second one.
3. **Summary.** `get_meeting` `{ id }`: Yogurt's summary, the person's own notes
   (`myNotes`, which outrank the summary: they are what the person thought mattered),
   attendees and the calendar event.
4. **Transcript.** `get_transcript` `{ id, format: "text" }`. Yogurt's summary comes
   from a small local model: treat the transcript as the source and the summary as a
   guide. Read the whole transcript for decisions, owners and dates, as in Webex
   mode step 4. On Windows the other side is often "Them": work out who said what
   from context and the attendees, and write "(speaker unclear)" when you can't.
5. **Write the page** with Procedure 4's format. Set `Source: Yogurt — {id}` (both
   sources when combined: `Source: Webex — {container id} · Yogurt — {id}`). No
   audio and no Yogurt links on the page (they only work on that PC).

## Where the page goes

- `NOTION_MEETING_NOTES_DB_ID` set → a row in that database (Procedure 4).
- Otherwise → a child page of **Decision Log & Meeting Recaps**
  `3f27e8aabbb481baa16ce7cb9e7514dd` titled `{D Mon YYYY} — {meeting}: {main topics}`,
  plus a row in that page's Date / Meeting / Key decision table. Actions that
  need tracking go to Asana only when Sean asks (through `asana-maintenance`).

---

## Hard Rules

- Never fabricate content: only what the Webex summary, transcript, recording,
  Yogurt, Fireflies or the pasted text contains.
- Yogurt: read-only tools only (`skills/yogurt` "Rules"); never `get_audio` or any
  tool that changes a meeting.
- Read-only in Webex: never download, share, edit or delete a recording, summary or
  transcript. If a sign-in or recording password appears, stop and tell Sean.
- Assign owners by reading context and using judgment. Never use regex-style patterns.
- Output the Notion page in the **same language as the meeting** (German stays German) unless the user asks for a translation.
- If `DRY_RUN=true`, print the formatted Notion page to the console; do not write to Notion.
- If clinical or medical efficacy language is detected, add a `⚠️ Clinical language detected` callout to the page body.
- Partner meetings (Phinamic and others): nothing on the page that the partner shouldn't
  read if it is later shared, unless it sits under a clearly internal heading.
