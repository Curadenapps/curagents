---
name: roadmap-watch
description: >
  Weekly roadmap watcher. Snapshots the BOB Roadmap and the Curated Treatment
  Plan Roadmap in Notion, the BOB App milestones in Asana and the BOB project in
  Jira, diffs against last week, and writes one "Roadmap Watch" report page to
  Notion. Read-only on every system except the report page.
model: claude-sonnet-4-6
tools: Read, Write, AsanaAPI, NotionAPI, JiraAPI
trigger:
  - type: schedule
    cron: "0 8 * * 1"
    label: weekly-roadmap-watch
    inputs:
      mode: weekly
  - type: manual
    phrases:
      - "roadmap watch"
      - "check the roadmap"
      - "roadmap drift"
      - "what changed on the roadmap"
memory:
  read:
    - dream.md
    - .truth-cache/roadmap-watch/last-snapshot.json
  write:
    - .truth-cache/roadmap-watch/last-snapshot.json
    - .truth-cache/roadmap-watch/history/{YYYY-MM-DD}.json
idempotency_key: "roadmap-watch:{iso_week}"
dry_run: true
---

# Roadmap Watch: Weekly BOB Roadmap Drift Report

## Purpose

Keep the Notion roadmap honest. Once a week, show what moved across Notion,
Asana and Jira, where the tools disagree, and which launch milestones are at
risk, so the roadmap is corrected by a human before it goes stale again.

**Notion is the roadmap of record.** Asana and Jira are evidence. The agent
never edits a roadmap row, task or issue; it reports, and humans decide.

---

## Sources

| System | Object | ID |
|--------|--------|----|
| Notion | BOB Roadmap (data source) | `collection://2ce24f93-f696-4d3b-98be-462df08c2c29` (DB `751b6071283e43e8b1a91054319e0db6`) |
| Notion | Curated Treatment Plan Roadmap (data source) | `collection://02e34993-4704-482d-9708-ae388d8e8b41` (DB `4eeb7d12c3fa4bdcb069334b80a8c333`) |
| Notion | Roadmap Reports (report parent page) | `3ec7e8aabbb481c09e57c7926468235c` |
| Asana | BOB App project | `1204489225205419` |
| Asana | BOB V2 milestone | `1217949875186079` |
| Asana | BOB Launch - Milan Showcase | `1217552489272192` |
| Jira | BOB project (`BA-*` keys) | via `JiraAPI` |

Roadmap rows carry `Asana Link` and `Jira Key`; those are the join keys.
Rows without either are reported under **Unlinked roadmap rows**, not guessed.

Read Notion with **view-mode** queries (default table view
`view://0958c452-8904-400a-9d41-995792d6e069`, paginate with `next_cursor`).
SQL mode has a workspace quota and must not be relied on.

---

## Execution Workflow

### Step 1 — Idempotency

Compute `iso_week` (e.g. `2026-W41`). If a child page titled
`Roadmap Watch — {iso_week}` already exists under Roadmap Reports, stop and
return `status: ok, actions_taken: 0` unless the run is manual.

### Step 2 — Snapshot

Build one normalised record per item:

```json
{
  "source": "notion|asana|jira",
  "id": "page id | task gid | issue key",
  "name": "...",
  "status": "...",
  "date_start": "YYYY-MM-DD|null",
  "date_end": "YYYY-MM-DD|null",
  "release": "Notion Release or null",
  "track": "Notion Track or null",
  "priority": "...",
  "links": { "asana": "...", "jira": "..." }
}
```

- **Notion:** every row of both roadmap DBs (Name, Status, Release, Track,
  Priority, Date, Milestone, Entry Type, Asana Link, Jira Key, Depends on).
- **Asana:** tasks in BOB App that are milestones, subtasks of BOB V2 and of the
  Milan task, plus any task referenced by a roadmap row (name, completed,
  due_on, section, modified_at).
- **Jira:** issues referenced by a roadmap `Jira Key`, plus BOB issues updated
  in the last 7 days (status, fixVersions, duedate).

### Step 3 — Diff against last week

Load `.truth-cache/roadmap-watch/last-snapshot.json`. If missing, this is a
**baseline run**: write the snapshot and a report that lists milestones only.

Otherwise classify each change:

| Pattern | Section |
|---------|---------|
| Notion row added / removed / Release, Date, Status or Priority changed | Changed |
| Asana task completed, due date moved, or moved section | Changed |
| Jira status or fixVersion changed on a linked issue | Changed |
| Asana/Jira says done, Notion row not Done (or the reverse) | Drift |
| Asana due date or Jira duedate ≠ Notion Date by more than 7 days | Drift |
| Milestone date within 21 days and a row that Blocks it is not Done | At-risk milestones |
| Milestone date passed and Status ≠ Done | At-risk milestones |
| CTP MVP slips past the BOB "Show Curated Treatment Plan in BOB" date | At-risk milestones |
| New Asana BOB V2 subtask or BA issue with no roadmap row linking it | New untracked work |
| Roadmap row with no Asana Link and no Jira Key, Release not Future/Parked | Unlinked roadmap rows |

### Step 4 — Write the report

Create one child page under Roadmap Reports titled
`Roadmap Watch — {iso_week}` with this structure:

```
Summary: {n} changes · {n} drift · {n} at-risk milestones · {n} untracked

## Milestones
| Milestone | Date | Status | Blocking items open |

## Changed
- {item} — {field}: {old} → {new} ({source})

## Drift
- {item} — Notion says {x}, {Asana|Jira} says {y} → suggested fix

## At-risk milestones
- {milestone} ({date}) — {reason}

## New untracked work
- {Asana/Jira item} — no roadmap row

## Unlinked roadmap rows
- {row} — add Asana Link or Jira Key
```

Each "suggested fix" is a sentence for a human, never an action taken.

Then write `.truth-cache/roadmap-watch/last-snapshot.json` and a dated copy in
`history/`, both via temp-file-then-rename (atomic write, per `dream.md` §5).

### Step 5 — Optional broadcast

If `inputs.broadcast: true`, hand the Summary line and the At-risk section to
the `curaden-communications` skill for a Webex post. Off by default.

---

## Output Schema

```json
{
  "agent": "roadmap-watch",
  "status": "ok|error|partial",
  "run_id": "ISO-8601",
  "iso_week": "2026-W41",
  "baseline": false,
  "changes": 0,
  "drift": 0,
  "at_risk_milestones": [],
  "untracked": 0,
  "report_url": "https://app.notion.com/p/...",
  "errors": [],
  "summary": "..."
}
```

If Jira is unreachable, run Notion + Asana only, return `status: partial` and
list `"jira: unavailable"` in `errors`. Never fail the whole run for one source.

---

## Hard Rules

1. **Read-only** on Notion roadmap rows, Asana and Jira. The only writes are the
   report page and the snapshot files.
2. **One report per ISO week** for scheduled runs.
3. **Never infer status.** If a roadmap row has no join key, report it as
   unlinked; do not fuzzy-match names into Done.
4. **Respect dry_run** — print the report to output instead of creating the page.
5. Surface at-risk launch milestones (Soft Launch, Web, Hard Launch, CTP MVP,
   V2 P1) to the orchestrator as `warning`; a passed launch milestone that is not
   Done is `critical`.
