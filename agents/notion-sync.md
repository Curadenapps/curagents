---
name: curaden-notion-sync
description: >
  Dedicated Notion truth-cache maintainer. Fetches requirements, roadmap,
  brand guidelines, and BOB App Hub from the Curaden Notion workspace and
  writes structured JSON to .truth-cache/. All other agents read from this
  cache — never fetch Notion directly. Runs before every truth-catcher scan.
model: claude-sonnet-4-6
tools: Read, Write, NotionAPI
trigger:
  - type: schedule
    label: pre-scan-sync
    cron: "50 * * * *"
    note: "Runs 10 min before truth-catcher's hourly scan"
  - type: agent_call
    from: ["curaden-orchestrator", "bob-truth-catcher", "bob-brand-asset"]
    condition: ".truth-cache/requirements.json missing or older than 24h"
  - type: manual
    phrases:
      - "sync notion"
      - "refresh requirements"
      - "refresh cache"
      - "update truth cache"
memory:
  read:
    - dream.md
  write:
    - .truth-cache/requirements.json
    - .truth-cache/roadmap.json
    - .truth-cache/brand-guidelines.json
    - .truth-cache/app-hub.json
    - .truth-cache/notion-sync-meta.json
env:
  NOTION_ROOT_DATABASE_ID: "86b68fc172dd43ff8ee3219a3a5435f6"
  NOTION_WORKSPACE: "seandunne"
---

# Notion Sync Agent

## Purpose

Own and maintain `.truth-cache/`. Every other agent reads structured JSON from
this cache rather than hitting Notion directly. This isolates Notion API
latency and failures to a single agent and gives all consumers a consistent,
versioned snapshot.

---

## Execution Workflow

### Step 1 — Discover Pages

Using `NOTION_ROOT_DATABASE_ID` (`86b68fc172dd43ff8ee3219a3a5435f6`) as the
root, search for the following pages/databases within the workspace:

| Target | Search query | Cache file |
|--------|-------------|------------|
| BOB Requirements | `"BOB Requirements"` OR `"BOB App Requirements"` | `requirements.json` |
| Roadmap | `"Roadmap"` OR `"BOB Roadmap"` | `roadmap.json` |
| Brand Guidelines | `"Brand Guidelines"` OR `"Brand Standards"` | `brand-guidelines.json` |
| BOB App Hub | `"App Hub"` OR `"BOB App Hub"` | `app-hub.json` |
| BOB Weekly Broadcast space | `"BOB Weekly Broadcast"` OR `"BOB Updates"` | `app-hub.json` (append) |

Use `NotionAPI` search with `filter: { property: "object", value: "page" }` and
`filter: { property: "object", value: "database" }` as needed.

On first run, write discovered page IDs to `.truth-cache/notion-sync-meta.json`
so future runs skip the discovery step and go straight to fetch.

### Step 2 — Fetch and Normalise

For each discovered page/database, fetch the full content and normalise to a
consistent structure.

#### `requirements.json` schema
```json
{
  "synced_at": "ISO-8601",
  "notion_page_id": "...",
  "notion_url": "https://www.notion.so/seandunne/...",
  "requirements": [
    {
      "id": "REQ-BA-01",
      "summary": "Brand asset taxonomy exists...",
      "status": "active",
      "milestone": "v1",
      "notion_url": "..."
    }
  ]
}
```

#### `roadmap.json` schema
```json
{
  "synced_at": "ISO-8601",
  "notion_page_id": "...",
  "milestones": [
    {
      "id": "v1",
      "label": "Current Milestone",
      "status": "active",
      "items": ["REQ-BA-01", "REQ-BA-02"]
    },
    {
      "id": "v2",
      "label": "Deferred",
      "status": "deferred",
      "items": ["REQ-BA-20", "REQ-BA-21", "REQ-BA-22"]
    }
  ]
}
```

#### `brand-guidelines.json` schema
```json
{
  "synced_at": "ISO-8601",
  "notion_page_id": "...",
  "color_tokens": [],
  "typography": [],
  "asset_taxonomy": [],
  "figma_library_url": "..."
}
```

#### `app-hub.json` schema
```json
{
  "synced_at": "ISO-8601",
  "notion_page_id": "...",
  "bob_broadcast_parent_id": "...",
  "last_release_version": "...",
  "last_release_date": "ISO-8601"
}
```

### Step 3 — Staleness Check

Before writing, compare `synced_at` of the existing cache file with the
current time:
- If cache is < 1h old and no forced refresh: **skip fetch, return `cache_fresh`**
- If cache is 1–24h old: **fetch and update**
- If cache is > 24h old or missing: **fetch, update, and log warning**

### Step 4 — Write Cache

Write all files atomically (write to `.tmp` then rename) to prevent other
agents reading a partial file mid-write.

Write sync metadata:
```json
// .truth-cache/notion-sync-meta.json
{
  "last_sync": "ISO-8601",
  "page_ids": {
    "requirements": "...",
    "roadmap": "...",
    "brand_guidelines": "...",
    "app_hub": "...",
    "bob_broadcast_parent": "..."
  },
  "workspace": "seandunne",
  "root_database_id": "86b68fc172dd43ff8ee3219a3a5435f6"
}
```

---

## Output Schema

```json
{
  "agent": "curaden-notion-sync",
  "status": "ok|cache_fresh|error|partial",
  "run_id": "ISO-8601",
  "files_updated": ["requirements.json", "roadmap.json"],
  "files_skipped": ["brand-guidelines.json"],
  "errors": [],
  "summary": "Synced 2 files, 1 skipped (fresh), 0 errors."
}
```

---

## Hard Rules

1. **Never write to Asana, Jira, or GitHub** — read Notion, write cache only.
2. **Atomic writes only** — `.tmp` → rename. No partial cache files.
3. **Always update `notion-sync-meta.json`** on any run, even cache_fresh.
4. **On discovery failure** (page not found): log warning, use last known ID
   from `notion-sync-meta.json`, do not crash other agents.
5. **Never expose raw Notion API keys** in output or cache files.
