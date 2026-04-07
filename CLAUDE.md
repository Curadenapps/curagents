# Claude Code — Curadenapps Agents

## System Context

Read [`dream.md`](dream.md) FIRST — it is the shared ambient context for all agents and
replaces the need to load sibling agent specs. Then read [`README.md`](README.md) for the
full system architecture.

## Skills

The following skills are available and will auto-load based on trigger phrases:

- **`skills/curaden-communications/SKILL.md`** — RevolveNote sync, Jira-Notion BOB sync, BOB weekly broadcast

Trigger phrases are defined in each SKILL.md frontmatter. Skills load their own reference files as needed.

## Agents

All agents share a common YAML frontmatter schema (trigger, memory,
idempotency_key, dry_run, output schema). Load the relevant file for context:

**Orchestration**
- [`agents/orchestrator.md`](agents/orchestrator.md) — Master router; entry point for all activity

**Core governance**
- [`agents/truth-catcher.md`](agents/truth-catcher.md) — Notion vs Asana alignment enforcement
- [`agents/brand-asset.md`](agents/brand-asset.md) — Brand asset governance and RACI approval gates
- [`agents/asana-maintenance.md`](agents/asana-maintenance.md) — Kanban routing, update snippets, audit trail writes

**Data & integrations**
- [`agents/notion-sync.md`](agents/notion-sync.md) — Owns .truth-cache/; fetches Notion on schedule
- [`agents/figma.md`](agents/figma.md) — Figma library monitor, export validator, design diff detection
- [`agents/webflow.md`](agents/webflow.md) — Webflow publishing gate and asset sync
- [`agents/github.md`](agents/github.md) — PR/commit linkage to Jira and Asana (Curadenapps org)
- [`agents/release.md`](agents/release.md) — Release coordinator (BOB + RevolveNote); manual trigger only
- [`agents/meeting-bot.md`](agents/meeting-bot.md) — Fireflies transcript → Asana task creation (auto, no approval gate)

## Scope

Before taking any action, check [`SCOPE.md`](SCOPE.md) for hard boundaries.
Never modify `.truth-cache/` directly — it is written only by `notion-sync`.

## MCP Tools Available

| Tool prefix | Service |
|-------------|---------|
| `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__` | Jira / Atlassian |
| `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__` | Notion |
| `mcp__607b64a3-ac1e-4636-a7dd-98ed14f34e34__` | Asana |
| `mcp__github__*` | GitHub (Curadenapps org) |

## Notion Workspace

Root database ID: `86b68fc172dd43ff8ee3219a3a5435f6` (workspace: seandunne)
notion-sync discovers all child page IDs on first run and caches them.
