---
name: curaden-communications
description: This skill should be used when the user wants to "run the weekly sync",
  "sync RevolveNote to GitHub", "push revolvenote", "sync Jira to Notion",
  "update BOB in Notion", "sync BOB issues", "run the BOB broadcast",
  "send the weekly BOB update", "post BOB status", "sync Curaden tools",
  "run the communication tasks", "process meeting notes", "summarise meeting",
  "create meeting notes", "log meeting", "post meeting recap",
  "add meeting notes", "meeting summary", "take meeting notes",
  "capture meeting", "transcribe meeting", "fetch webex meeting",
  or "import from webex". Use this skill when working across
  Curaden's tech stack (RevolveNote, BOB/iTOP, Jira, Notion, GitHub, Webex).
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
| "process meeting notes", "summarise meeting", "create meeting notes", "log meeting", "meeting summary", "fetch webex meeting" | [4. Meeting Notes](#4-meeting-notes) |

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

Processes a meeting transcript (pasted text or fetched from Webex) and creates
a structured Notion page with 3 key points, 3 next steps, and attendee metadata.

### Input

Ask the user for these if not provided in the trigger message:

1. **Meeting title** — e.g. "BOB Sprint Retrospective"
2. **Input mode** — paste transcript text (default) OR provide a Webex meeting ID
3. **Transcript text** *(paste mode)* — raw copy-paste from Webex, Zoom, Teams, or any source
4. **Webex Meeting ID** *(Webex mode)* — from the meeting URL or invite
5. **Date** *(optional)* — defaults to today if not given
6. **Attendees** *(optional)* — comma-separated list; extracted from transcript if detectable

### Steps — Paste Mode (default)

1. Read `dream.md` — load §2 for the Notion root database ID.
2. Parse the pasted transcript to extract:
   - Attendee names (speaker labels in the transcript, or the explicit list provided)
   - Approximate meeting duration (from timestamps if present)
3. Condense the transcript into **exactly 3 key points**:
   - Each key point = one clear insight, decision, or outcome from the meeting
   - No filler — only information that changes how someone acts after the meeting
   - Max 25 words per point
4. Extract **exactly 3 next steps**:
   - Each must be a concrete, verb-led action (e.g. "Update Figma tokens by Friday")
   - Assign an owner from the attendee list when mentioned; otherwise `TBD`
   - Include a due date if mentioned; otherwise leave `—`
5. Find or create the Notion parent page:
   a. Search for a page titled "Meeting Notes" using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search` with query `"Meeting Notes"`.
   b. If found, use its ID as the parent.
   c. If not found, create a new page titled "📓 Meeting Notes" under root database `86b68fc172dd43ff8ee3219a3a5435f6`.
6. Create a new Notion page using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-pages`:
   - **Title**: `📅 {Meeting Title} — {YYYY-MM-DD}`
   - **Parent**: the Meeting Notes page ID from step 5
   - **Body**: use the output template below
7. Return the Notion page URL to the user.

### Steps — Webex Mode

1. Check that `WEBEX_ACCESS_TOKEN` is available in the environment.
   - If missing: tell the user to set it (see `.env.example`) or switch to paste mode.
2. Fetch the transcript list:
   ```
   GET https://webexapis.com/v1/meetings/transcripts?meetingId={MEETING_ID}
   Authorization: Bearer {WEBEX_ACCESS_TOKEN}
   ```
3. If one or more transcripts are returned, download the first one:
   ```
   GET https://webexapis.com/v1/meetings/transcripts/{transcriptId}/download
   Authorization: Bearer {WEBEX_ACCESS_TOKEN}
   ```
4. Parse the VTT/text into speaker-attributed paragraphs.
5. Use the API response `topic`, `scheduledStartTime`, `scheduledEndTime`,
   and `hostEmail` to fill in meeting metadata.
6. Continue from Step 3 of the Paste Mode steps above.

### Webex Error Handling

| Error | Response |
|-------|----------|
| `WEBEX_ACCESS_TOKEN` missing | "Set WEBEX_ACCESS_TOKEN in .env or paste the transcript manually." |
| Meeting not found (404) | "Webex meeting not found. Check the ID and ensure the token has `meeting:transcripts_read` scope." |
| Transcript not ready (empty list) | "Transcript not available yet — Webex can take up to 15 min after a meeting ends. Try again shortly, or paste the transcript manually." |
| Any other API error | Log error details and offer paste mode as fallback |

### Output Format (Notion page body)

```
> {1–2 sentence executive summary of the meeting outcome}

## Key Points
1. {Key point 1}
2. {Key point 2}
3. {Key point 3}

## Next Steps
| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | {action} | {owner} | {due or —} |
| 2 | {action} | {owner} | {due or —} |
| 3 | {action} | {owner} | {due or —} |

---
**Attendees:** {comma-separated list or "Not specified"}
**Duration:** {N min or "Unknown"}
**Source:** {Pasted transcript | Webex meeting {MEETING_ID}}
**Logged by:** curaden-communications › meeting-notes — {ISO timestamp}
```

### Output

- Notion page URL
- Title of the page created
- Confirmation: "3 key points and 3 next steps captured"

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
| Webex transcripts API | `https://webexapis.com/v1/meetings/transcripts` |
| Required Webex scope | `meeting:transcripts_read` or `spark:all` |
| Webex env var | `WEBEX_ACCESS_TOKEN` |
