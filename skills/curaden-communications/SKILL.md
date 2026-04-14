---
name: curaden-communications
description: This skill should be used when the user wants to "run the weekly sync",
  "sync RevolveNote to GitHub", "push revolvenote", "sync Jira to Notion",
  "update BOB in Notion", "sync BOB issues", "run the BOB broadcast",
  "send the weekly BOB update", "post BOB status", "sync Curaden tools",
  "run the communication tasks", "process meeting notes", "summarise meeting",
  "create meeting notes", "log meeting", "post meeting recap",
  "add meeting notes", "meeting summary", "take meeting notes",
  "capture meeting", "get fireflies transcript", "fetch from fireflies",
  or "import from fireflies". Use this skill when working across
  Curaden's tech stack (RevolveNote, BOB/iTOP, Jira, Notion, GitHub, Fireflies).
  Covers four sub-procedures: revolve-note-weekly-sync,
  jira-notion-bob-sync, bob-weekly-broadcast, and meeting-notes.
---

# Curaden Communications

This skill packages four recurring Curaden communication workflows so any Claude session can run them on demand — not just the scheduled tasks on claude.ai.

## Procedures

| Trigger phrases | Procedure |
|-----------------|-----------|
| "sync revolvenote", "push revolvenote to GitHub", "run revolvenote sync" | [1. RevolveNote Weekly Sync](#1-revolvenote-weekly-sync) |
| "sync BOB to Notion", "run jira notion sync", "sync BOB issues" | [2. Jira-Notion BOB Sync](#2-jira-notion-bob-sync) |
| "run BOB broadcast", "send weekly BOB update", "post BOB status" | [3. BOB Weekly Broadcast](#3-bob-weekly-broadcast) |
| "process meeting notes", "summarise meeting", "create meeting notes", "log meeting", "meeting summary", "get fireflies transcript", "fetch from fireflies" | [4. Meeting Notes](#4-meeting-notes) |

Read `references/revolvenote-sync.md` for repo details and excluded files.
Read `references/jira-notion-bob-sync.md` for JQL patterns and Notion field mapping.
Read `references/bob-weekly-broadcast.md` for the broadcast template and target page.

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

## 3. BOB Weekly Broadcast

Generates a structured weekly status summary from Jira and posts it as a new Notion page in the BOB broadcast space.

### Steps

1. Read `references/bob-weekly-broadcast.md` for the Notion target page ID, broadcast template, and JQL variants.
2. Run three Jira queries using `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__searchJiraIssuesUsingJql`:
   - **Done this week**: issues resolved/closed in the last 7 days (JQL from reference)
   - **In Progress**: issues currently active (JQL from reference)
   - **Blockers**: issues flagged as blocked or high-priority and open (JQL from reference)
3. Format the results using the broadcast template from the reference file. Sections:
   - `## Done This Week` — issue key + summary for each resolved issue
   - `## In Progress` — issue key + summary + assignee for each active issue
   - `## Blockers / Watch` — issue key + summary + reason flagged
4. Create a new Notion page using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-pages` under the target page from the reference file. Title format: `BOB Weekly Broadcast — {YYYY-MM-DD}`.
5. Return the URL of the created Notion page to the user.

### Output

- URL of the newly created Notion broadcast page
- Summary: N done, N in progress, N blockers

---

---

## 4. Meeting Notes

Pulls the AI summary from **Fireflies.ai** — which connects to Webex and handles
multilingual transcription including German — and creates a structured entry in
the Notion **Meeting Notes database**.

Read `references/meeting-notes.md` for: Webex→Fireflies setup, GraphQL queries,
field mappings, owner-assignment guidance, Notion database schema, and the full
page body template.

---

### Step 1 — Determine mode

- If `FIREFLIES_API_KEY` is set → use **Fireflies mode** (default). Do not ask the user.
- If the key is missing → tell the user: "Set `FIREFLIES_API_KEY` in your `.env` to pull from Fireflies, or paste a transcript and I'll condense it manually."

---

### Fireflies mode

1. Call the Fireflies GraphQL API (query from `references/meeting-notes.md` §2):
   - If the user gave a transcript ID → fetch that specific transcript
   - Otherwise → fetch the most recent (`limit: 1`) and proceed directly — no confirmation required
2. If `summary` is null or `overview` is empty → stop and tell the user: "Fireflies is still processing. Try again in a few minutes."
3. Run the idempotency check from §7 of the reference. If the Fireflies ID already has a Notion page → return the existing URL and stop.
4. Map fields using §3 of the reference.
5. Assign owners to action items using **judgment**, not pattern-matching. Read `references/meeting-notes.md` §4 for guidance. Cross-reference `meeting_attendees` to match names. Mark genuinely ambiguous items `TBD`.
6. Post to Notion — see below.

---

### Paste mode (fallback)

1. Ask the user for: meeting title, date (defaults to today), and the transcript text.
2. Scan for speaker labels (`Name: text` lines) to build the attendees list.
3. Write a 2–3 sentence **Summary** from the transcript content.
4. Extract **Topics Covered** — bullet list of what was actually discussed.
5. Extract **Next Steps** — one per action item. Assign owner by judgment from transcript context; if unclear, mark `TBD`.
6. Set `Source = Manual`, `Fireflies ID = —`.
7. Post to Notion — see below.

---

### Post to Notion (both modes)

1. Get the database ID from `NOTION_MEETING_NOTES_DB_ID`. If not set, tell the user to create the database and set the env var (see `references/meeting-notes.md` §5).
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
| Notion broadcast space | See `references/bob-weekly-broadcast.md` |
| Repo path details | See `references/revolvenote-sync.md` |
| Fireflies GraphQL API | `https://api.fireflies.ai/graphql` |
| Fireflies env var | `FIREFLIES_API_KEY` |
| Meeting Notes DB env var | `NOTION_MEETING_NOTES_DB_ID` |
| Meeting Notes detail | See `references/meeting-notes.md` |
