---
name: roadmap-watch
description: >
  Weekly roadmap watcher. Snapshots the Product Roadmap in Notion (BOB +
  Curaprox app), the BOB App milestones in Asana and the BOB project in
  Jira, diffs against last week, and writes one "Roadmap Watch" report page to
  Notion. Read-only on every system except the report page.
model: claude-sonnet-5-5
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
dry_run: false  # live: only writes the weekly report page + its own snapshot
---

# Roadmap Watch: Weekly Product Roadmap Drift Report

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
| Notion | Product Roadmap (data source) | `collection://2ce24f93-f696-4d3b-98be-462df08c2c29` (DB `751b6071283e43e8b1a91054319e0db6`) |
| Notion | Roadmap Reports (report parent page) | `3ec7e8aabbb481c09e57c7926468235c` |
| Asana | BOB App project | `1204489225205419` |
| Asana | BOB V2 milestone | `1217949875186079` |
| Asana | BOB Launch - Milan Showcase | `1217552489272192` |
| Jira | BOB project (`BA-*` keys) | via `JiraAPI` |

One database holds both apps. The `Product` field says which (BOB / Curaprox app /
Shared; empty = BOB). The Curated Treatment Plan Roadmap (`4eeb7d12…`) was merged
into it on 2026-10-09 (Epic "Curated Treatment Plan") and is an archive: don't read it.

Roadmap rows carry `Asana Link` and `Jira Key`; those are the join keys.
Rows without either are reported under **Unlinked roadmap rows**, not guessed.

Read Notion with **view-mode** queries on the unfiltered agent view
`view://3f47e8aa-bbb4-818c-a54e-000c04b1a71b` ("Agents: all rows (don't filter)"), paginating with
`next_cursor`. Don't use "All rows": it hides Done and Cut rows, which drift checks need.
Never use SQL mode: it has a workspace quota and must not be relied on.

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

- **Notion:** every Product Roadmap row. Fields: Name, Product, Level
  (Milestone / Feature / Task), Epic, Status, Release, Priority, Difficulty,
  Date, Track, Asana Link, Jira Key, Depends on / Blocks, Notes. Add
  `"product"` to each Notion record.
  `Time Horizon` is a formula and is not snapshotted.
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
| "CTP MVP: rules-based plan engine" or "Treatment plan builder in BOB" slips past V2 P1 Apr-27 | At-risk milestones |
| New Asana BOB V2 subtask or BA issue with no roadmap row linking it | New untracked work |
| Roadmap row with no Asana Link and no Jira Key, Release not Future/Parked | Unlinked roadmap rows |
| Open Feature (Status not Done/Cut) with empty Priority, Difficulty, Release or Epic | Missing info |
| Notes still contain "DRAFT by Claude" (priority/difficulty not yet confirmed) | Missing info (count only) |

### Step 4 — Write the report

Create one child page under Roadmap Reports titled
`Roadmap Watch — {iso_week}` with this structure:

```
Summary: {n} changes · {n} drift · {n} at-risk milestones · {n} untracked
By product: BOB {n} · Curaprox app {n} · Shared {n}

## Milestones
| Milestone | Product | Date | Status | Blocking items open |

## Changed
- [{product}] {item} — {field}: {old} → {new} ({source})

## Drift
- {item} — Notion says {x}, {Asana|Jira} says {y} → suggested fix

## At-risk milestones
- {milestone} ({date}) — {reason}

## New untracked work
- {Asana/Jira item} — no roadmap row

## Unlinked roadmap rows
- {row} — add Asana Link or Jira Key

## Truth Catcher escalations
- {task} — waiting on {person} since {date}: {question}   (open GitHub issues labelled `truth-catcher-escalation`)

## Missing info
- {feature} — missing {Priority|Difficulty|Release|Epic}
- {n} rows still marked "DRAFT by Claude" — review in the "Review drafts" view
```

Prefix every Notion item with its product (`[BOB]`, `[Curaprox app]`, `[Shared]`)
so the report reads as one product roadmap with two apps.

Each "suggested fix" is a sentence for a human, never an action taken.

Then write `.truth-cache/roadmap-watch/last-snapshot.json` and a dated copy in
`history/`, both via temp-file-then-rename (atomic write, per `dream.md` §5).

### Step 5 — Team update

No Webex post of its own. The `announcements` agent reads this report and puts
the Summary line and at-risk milestones into the weekly team update.

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
5. Surface at-risk launch milestones (Soft Launch, Web, Hard Launch, V2 P1
   incl. CTP MVP) to the orchestrator as `warning`; a passed launch milestone that is not
   Done is `critical`.
