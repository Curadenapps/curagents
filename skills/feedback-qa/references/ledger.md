# Feedback QA — Change Ledger

The ledger is the agent's memory of what has already changed in BOB and when.
It exists so the agent never claims something was fixed, shipped or planned
without proof, and so every feedback item can be placed on a timeline.

File: `{FEEDBACK_ROOT}/ledger/changes.json`

## 1. Rules

- **No source, no entry.** Every entry has a URL or an ID that someone can open.
- **Append only.** To correct an entry, add a new one with `supersedes`
  pointing to the old id.
- **Dates are what the source says.** `date` is when the change happened per
  the source. `retrieved_at` is when the agent read it.
- **Re-check web sources** (store listings, release notes) if `retrieved_at`
  is more than 14 days old.

## 2. Entry format

```json
{
  "id": "LG-0042",
  "date": "2026-08-14",
  "type": "release",
  "app": "BOB App",
  "platform": "ios",
  "version": "2.4.0",
  "area": "results-screen",
  "summary": "Results screen redesigned to three-panel PBE layout",
  "source": "https://curaden-apps.atlassian.net/browse/BOB-47",
  "source_kind": "jira",
  "retrieved_at": "2026-09-29T09:10:00Z",
  "supersedes": null
}
```

`type`: `release` | `fix` | `feature` | `decision` | `uat` | `planned`

`planned` entries (open Jira issues, roadmap items) can support a BACKLOG or
BUILD note such as "already planned in BOB-51". They never justify
ALREADY-ADDRESSED.

## 3. Sources to refresh on each run

| Source | What to read | Tool |
|--------|--------------|------|
| App stores | Current version, release date and "What's new" text; URLs in `skills/uat/references/apps.md` | WebFetch |
| Jira BOB | Issues resolved since the last run: `project = BOB AND statusCategory = Done AND resolved >= "{last_run}"` | Atlassian MCP |
| Jira BOB (planned) | Open issues, so feedback can be matched to work already in flight | Atlassian MCP |
| GitHub | Releases and tags in the BOB repos of the Curadenapps org | GitHub MCP |
| UAT log | New or updated entries in `skills/uat/references/uat-log.md`, plus the linked Confluence outcomes | Read and Atlassian MCP |
| Notion changelog | Pages created by the `release` agent | Notion MCP |
| Decisions | `dream.md` §5 Decision Log | Read |

Record `last_run` at the top of `changes.json`:

```json
{ "last_run": "2026-09-29T09:12:00Z", "current_release": { "ios": "2.4.0", "android": "2.4.1" }, "entries": [ ] }
```

## 4. Using the ledger in a verdict

1. Find entries for the same `app` and `area`, dated after the feedback's
   `app_version` release date (or after `received` if the version is unknown).
2. Read the entry summary and source. A match needs the same behaviour, not
   just the same screen.
3. Cite it in the item's `ledger_check`:
   `"Addressed by LG-0042 (BOB 2.4.0, 2026-08-14) — <source URL>"`.
4. If nothing matches, write `"No matching change after {version} (ledger checked {date})"`.
