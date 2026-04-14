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

Pulls a meeting summary from **Fireflies.ai** (or accepts a pasted transcript)
and creates a structured entry in the Notion **Meeting Notes database**. Fireflies
handles multilingual transcription (including German); Claude formats the output
and posts it to Notion.

### Two modes

| Mode | When to use |
|------|-------------|
| **Fireflies** (default) | Fireflies.ai has already transcribed the meeting — fetch the summary directly via API |
| **Paste** | You have a transcript from any other source — paste it and Claude condenses it |

---

### Mode A — Fireflies (fetch latest or by ID)

**What you need:** `FIREFLIES_API_KEY` set in your environment.

**Steps:**

1. If the user gave a Fireflies transcript ID, fetch it directly. If not, fetch the most recent transcript.

   ```graphql
   # Fetch by ID
   query { transcript(id: "{TRANSCRIPT_ID}") { ...fields } }

   # Fetch latest
   query { transcripts(limit: 1) { ...fields } }
   ```

   Fields to request:
   ```graphql
   id title date duration participants
   summary { overview bullet_gist action_items }
   ```

   Endpoint: `https://api.fireflies.ai/graphql`
   Header: `Authorization: Bearer {FIREFLIES_API_KEY}`

2. Map the Fireflies summary to the Notion format:
   - `summary.overview` → executive summary callout
   - `summary.bullet_gist` → take the first 3 bullets as Key Points
   - `summary.action_items` → take the first 3 items as Next Steps (parse owner from text if present)
   - `participants` → Attendees
   - `duration` → Duration (seconds → minutes)

3. Create a new entry in the Notion Meeting Notes database (step 5 below).

**If Fireflies returns no summary yet:** tell the user "Fireflies is still processing — check back in a few minutes, or paste the transcript manually."

---

### Mode B — Paste transcript

**Steps:**

1. Ask the user for: meeting title, date (defaults to today), and the transcript text.
2. Scan the transcript for speaker names (lines formatted `Name: text`) and collect as attendees.
3. Condense into **exactly 3 key points** — decisions, outcomes, or insights only. Max 25 words each.
4. Extract **exactly 3 next steps** — action verb + object + owner (if named) + due date (if stated).

---

### Step 5 — Post to Notion database (both modes)

1. Get the Meeting Notes database ID from env var `NOTION_MEETING_NOTES_DB_ID`.
   - If the var is not set, search for a Notion database titled "Meeting Notes" using
     `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search`, query `"Meeting Notes"`.
   - If still not found, tell the user: "Create a 'Meeting Notes' database in Notion and add its ID as `NOTION_MEETING_NOTES_DB_ID` in your .env."

2. Create a new database page using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-pages`:

   **Database properties to set:**
   | Property | Type | Value |
   |----------|------|-------|
   | `Name` | title | `📅 {Meeting Title} — {YYYY-MM-DD}` |
   | `Date` | date | meeting date |
   | `Attendees` | rich_text | comma-separated participant names |
   | `Source` | select | `Fireflies` or `Manual` |
   | `Duration` | number | duration in minutes |

   **Page body:**
   ```
   > {executive summary — 1–2 sentences}

   ## Key Points
   1. {key point 1}
   2. {key point 2}
   3. {key point 3}

   ## Next Steps
   | Action | Owner | Due |
   |--------|-------|-----|
   | {action 1} | {owner or TBD} | {date or —} |
   | {action 2} | {owner or TBD} | {date or —} |
   | {action 3} | {owner or TBD} | {date or —} |
   ```

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
