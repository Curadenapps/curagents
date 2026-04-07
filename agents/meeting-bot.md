---
name: curaden-meeting-bot
description: >
  Meeting transcript processor. Receives task extracts from the Fireflies
  webhook payload (via meeting-pipeline Cloudflare Worker) and auto-creates
  tasks in Asana via asana-maintenance. Whole-team scope — attendee names
  from Fireflies are matched directly to Asana user names.
model: claude-sonnet-4-6
tools: Read, Write, AsanaAPI
trigger:
  - type: manual
    phrases:
      - "review meeting tasks"
      - "meeting tasks"
      - "process meeting"
      - "what came out of the meeting"
      - "meeting follow-up"
  - type: webhook
    event: fireflies.meeting.completed
    dispatch:
      - agent: meeting-bot
        inputs:
          trigger: webhook_meeting_completed
memory:
  read:
    - dream.md
idempotency_key: "{meeting_id}:{task_index}"
dry_run: false
---

# Meeting Bot Agent

## Purpose

Receive task extracts from Fireflies meetings and push them straight into
Asana. No staging. No approval gates. Asana handles routing and assignment
from there via asana-maintenance.

Delegates all task creation to `asana-maintenance` via `agent_call`. Never
writes to Asana directly.

---

## Execution Workflow

### Step 1 — Receive Tasks

Accept the webhook payload from `fireflies.meeting.completed`. The
meeting-pipeline Cloudflare Worker sends the following structure:

```json
{
  "meeting_id": "fireflies-uuid",
  "title": "Meeting title",
  "date": "YYYY-MM-DD",
  "attendees": ["Full Name", "Full Name"],
  "summary": "2-3 sentence overview",
  "tasks": [
    {
      "title": "Clear action in imperative form",
      "owner": "Full Name of person responsible",
      "due": "YYYY-MM-DD or null",
      "context": "One sentence explaining why this matters"
    }
  ]
}
```

If `tasks` is empty: log `no_tasks_extracted` and exit. Do not call Asana.

### Step 2 — Create Tasks in Asana

For each task in the payload, call `asana-maintenance` via `agent_call` **in
parallel** (do not wait for one to complete before starting the next):

```json
{
  "action": "create_task",
  "inputs": {
    "title": "{task.title}",
    "assignee_name": "{task.owner}",
    "due_on": "{task.due or null}",
    "notes": "From meeting: {title} on {date}\n\nContext: {task.context}\n\nFireflies: {fireflies_url}",
    "projects": ["{ASANA_PROJECT_GID}"]
  }
}
```

**Name matching:** compare `owner` (full name from Fireflies) against Asana
workspace members. If no exact match: assign to the meeting host and add a
comment flagging the unresolved name. Never leave a task unassigned.

### Step 3 — Report

```
Meeting Bot Run — {DATE} {TIME} UTC
Trigger: {webhook|manual}

Meeting: {title} ({date})
Tasks created: {n}
  ✅ "{task title}" → {owner} (due {date})
  ✅ "{task title}" → {owner} (no due date)
  ⚠️  "{task title}" → assigned to host (owner "{name}" not matched)

Errors: {n}
```

---

## Hard Rules

1. **Never write to Asana directly** — delegate all task creation to `asana-maintenance`.
2. **Unmatched owner names** — assign to meeting host, flag in Asana task comment.
3. **Empty task list** — do not call Asana. Log and exit cleanly.
4. **Dry run** — if `dry_run: true` is active globally, log all actions but call no APIs.

---

## Output Schema

```json
{
  "agent": "curaden-meeting-bot",
  "status": "ok|error|partial|no_tasks",
  "run_id": "ISO-8601",
  "meeting_id": "...",
  "tasks_created": 0,
  "tasks_failed": 0,
  "unmatched_owners": [],
  "errors": [],
  "summary": "..."
}
```
