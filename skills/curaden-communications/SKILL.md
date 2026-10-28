---
name: curaden-communications
description: This skill should be used when the user wants to "run the weekly sync",
  "sync RevolveNote to GitHub", "push revolvenote", "sync Jira to Notion",
  "update BOB in Notion", "sync BOB issues", "run the BOB broadcast",
  "send the weekly BOB update", "post BOB status", "sync Curaden tools",
  "run the communication tasks", "process meeting notes", "summarise meeting",
  "create meeting notes", "log meeting", "post meeting recap",
  "add meeting notes", "meeting summary", "take meeting notes",
  "capture meeting", "webex recap", "get fireflies transcript", "fetch from fireflies",
  or "import from fireflies". Use this skill when working across
  Curaden's tech stack (RevolveNote, BOB/iTOP, Jira, Notion, GitHub, Webex, Fireflies).
  Covers three sub-procedures: revolve-note-weekly-sync,
  jira-notion-bob-sync and meeting-notes (the BOB weekly broadcast now runs
  through the announcements agent).
---

# Curaden Communications

This skill packages four recurring Curaden communication workflows so any Claude session can run them on demand — not just the scheduled tasks on claude.ai.

## Procedures

| Trigger phrases | Procedure |
|-----------------|-----------|
| "sync revolvenote", "push revolvenote to GitHub", "run revolvenote sync" | [1. RevolveNote Weekly Sync](#1-revolvenote-weekly-sync) |
| "sync BOB to Notion", "run jira notion sync", "sync BOB issues" | [2. Jira-Notion BOB Sync](#2-jira-notion-bob-sync) |
| "run BOB broadcast", "send weekly BOB update", "post BOB status" | [3. Moved to announcements](#3-bob-weekly-broadcast-moved-to-the-announcements-agent) |
| "process meeting notes", "summarise meeting", "create meeting notes", "log meeting", "meeting summary", "webex recap", "get fireflies transcript", "fetch from fireflies" | [4. Meeting Notes](#4-meeting-notes) |

Read `references/revolvenote-sync.md` for repo details and excluded files.
Read `references/jira-notion-bob-sync.md` for JQL patterns and Notion field mapping.

---

## 1. RevolveNote Weekly Sync

Stages and pushes the latest RevolveNote app state to `github.com/Curadenapps/revolvenote`.

### Steps

1. Read `references/revolvenote-sync.md` for the repo path, excluded files, and commit format.
2. Navigate to the RevolveNote repo directory (from the reference file).
3. Stage all modified files, excluding those listed in the reference:
   ```bash
   git add -A
   ```
4. Check for changes — if the working tree is clean, report "Nothing to sync" and stop.
5. Create a timestamped commit:
   ```bash
   git commit -m "sync: weekly revolvenote sync $(date +%Y-%m-%d)"
   ```
6. Push to the Curadenapps remote:
   ```bash
   git push origin main
   ```
7. Report the list of changed files and the push confirmation to the user.

### Output

- Push confirmation with commit hash
- List of files staged and pushed
- "Nothing to sync" if working tree was clean

---

## 2. Jira-Notion BOB Sync

Queries all open BOB project issues from Jira and creates or updates corresponding Notion pages.

### Steps

1. Read `references/jira-notion-bob-sync.md` for the JQL query, Notion database ID, and field mapping.
2. Query Jira for open BOB issues using `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__searchJiraIssuesUsingJql` with the JQL from the reference file.
3. For each issue returned:
   a. Search Notion for a page matching the Jira issue key using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search` with query `{ISSUE_KEY}`.
   b. If no page found → create one using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-pages` with fields from the mapping in the reference file.
   c. If a page exists → update status and priority using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-update-page`.
4. Track counts: pages created, pages updated, pages skipped (already up to date).
5. Report the totals to the user.

### Output

- Count of Notion pages created
- Count of Notion pages updated
- Count skipped (no changes needed)
- Any errors encountered per issue

---

## 3. BOB Weekly Broadcast (moved to the announcements agent)

The BOB weekly is now part of the consolidated team update in
`agents/announcements.md`: same Jira view (Done this week / In progress /
Blockers), plus Asana, meeting recaps, Notion and GitHub, drafted every Thursday
in Notion Team Updates and posted to the App Team space after Sean reads it.

"run BOB broadcast", "send weekly BOB update" and "post BOB status" run the
announcements agent with period `weekly`. Don't create pages under the old
"BOB Weekly Broadcast" parent any more.

---

## 4. Meeting Notes

Reads Webex's own **AI summary, action items and transcript** in Webex web
(built-in browser or Claude in Chrome, Sean's sign-in) and creates a structured Notion recap. The
reading steps are in `skills/webex-web/SKILL.md` Recipe 4; the agent flow
(meeting choice, idempotency, where the page goes) is in `agents/meeting-notes.md`.

Read `references/meeting-notes.md` for: Webex field mapping, the Fireflies
fallback (setup, GraphQL queries), owner-assignment guidance, the Notion database
schema, and the full page body template.

---

### Step 1 — Determine mode

- A browser reachable (built-in, or Claude in Chrome) → **Webex mode** (default). Do not ask the user.
- Webex has no summary or transcript for that meeting and `FIREFLIES_API_KEY` is set → **Fireflies mode**.
- Neither → paste mode: "Paste the transcript or the Webex recap and I'll condense it."

---

### Webex mode

1. Follow `agents/meeting-notes.md` "Webex mode": list → idempotency → summary →
   every transcript part → recording frames only when needed.
2. Map fields using `references/meeting-notes.md` §3a.
3. Assign owners with **judgment** (§4): the summary's action items name most
   owners; the transcript confirms them. Genuinely unclear → `TBD`.
4. Post to Notion — see below. `Source = Webex`, `Fireflies ID` → the meeting
   container id (the property keeps its name for idempotency).

---

### Fireflies mode

1. Call the Fireflies GraphQL API (query from `references/meeting-notes.md` §2):
   - If the user gave a transcript ID → fetch that specific transcript
   - Otherwise → fetch the most recent (`limit: 1`) and proceed directly — no confirmation required
2. If `summary` is null or `overview` is empty → stop and tell the user: "Fireflies is still processing. Try again in a few minutes."
3. Run the idempotency check from §7 of the reference. If the meeting already has a recap page → return the existing URL and stop.
4. Map fields using §3 of the reference.
5. Assign owners to action items using **judgment**, not pattern-matching. Read `references/meeting-notes.md` §4 for guidance. Cross-reference `meeting_attendees` to match names. Mark genuinely ambiguous items `TBD`.
6. Post to Notion — see below.

---

### Paste mode (fallback)

1. Ask the user for: meeting title, date (defaults to today), and the transcript text.
2. Scan for speaker labels (`Name: text` lines) to build the attendees list.
3. Run the idempotency check from §7 of the reference.
4. Fill **Decided**, **Still open** and **Other notes** from what was actually said (§6 of the reference).
5. Fill **Actions** — one per action item, grouped by owner. Assign owner by judgment from transcript context; if unclear, mark `TBD`.
6. Set the **Sources** line to "pasted transcript".
7. Post to Notion — see below.

---

### Post to Notion (all modes)

1. Get the database ID from `NOTION_MEETING_NOTES_DB_ID`. If not set, create the recap as a child page of Decision Log & Meeting Recaps `3f27e8aabbb481baa16ce7cb9e7514dd` (body from §6, the properties as a header block) and add its row to that page's table.
2. Create the database entry using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-pages` with the properties and body from `references/meeting-notes.md` §5 and §6.
3. Return the Notion page URL to the user.

---

## Quick Reference

| Resource | Value |
|----------|-------|
| Jira MCP prefix | `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__` |
| Notion MCP prefix | `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__` |
| RevolveNote GitHub org | `github.com/Curadenapps` |
| Jira project key | See `references/jira-notion-bob-sync.md` |
| Repo path details | See `references/revolvenote-sync.md` |
| Webex meeting summaries | `web.webex.com` → Meetings → Meeting recap (built-in browser, Sean's sign-in) |
| Fireflies GraphQL API | `https://api.fireflies.ai/graphql` |
| Fireflies env var | `FIREFLIES_API_KEY` |
| Recap pages | Decision Log & Meeting Recaps `3f27e8aabbb481baa16ce7cb9e7514dd` |
| Meeting Notes detail | See `references/meeting-notes.md` |
