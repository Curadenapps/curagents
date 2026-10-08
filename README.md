# Curadenapps Agents

Automated agents and invokable skills for Curaden's BOB App and cross-tool workflows.
Works with Claude Code and any model that reads markdown agent definitions.

---

## System Architecture

```
README.md          ← You are here. System overview and entry point.
CLAUDE.md          ← Claude Code instructions (auto-loaded by Claude)
SCOPE.md           ← Hard boundaries: what this system can and cannot do
│
├── skills/        ← SKILL & SCOPE — invokable on demand by any session
│   └── curaden-communications/
│       ├── SKILL.md            ← Main entry point (3 procedures)
│       └── references/         ← Procedure-level config (JQL, templates, repo details)
│
├── agents/        ← Agent specs (single source of truth, incl. model tier)
├── .claude/agents/← Thin Claude Code subagent wrappers → agents/*.md (for parallel swarming)
│
├── src/           ← API integrations (Notion sync, Asana read/write, Figma poll)
├── scripts/       ← gate.ts (cheap pre-run change checks), run-agent.sh (headless CI runner)
├── .github/       ← GitHub Actions: sync-and-scan, figma-diff, bob-broadcast
└── .planning/     ← GSD project planning docs (roadmap, requirements, state)
```

---

## Skill & Scope

Skills are invokable by any Claude session. Trigger by phrase — no manual setup.

### `curaden-communications` → [`skills/curaden-communications/SKILL.md`](skills/curaden-communications/SKILL.md)

| Trigger phrase | Procedure | What it does |
|----------------|-----------|-------------|
| "sync revolvenote" | RevolveNote Weekly Sync | Stage + push latest RevolveNote app to `github.com/Curadenapps/revolvenote` |
| "sync BOB to Notion" | Jira-Notion BOB Sync | Mirror all open BOB Jira issues into Notion pages (create or update) |
| "run BOB broadcast" | BOB Weekly Broadcast | Generate weekly sprint summary (Done / In Progress / Blockers) and post to Notion |

Config details for each procedure: [`skills/curaden-communications/references/`](skills/curaden-communications/references/)

---

## Agent Roster

Agents share a common YAML frontmatter schema (trigger, memory, idempotency_key,
dry_run, output schema) and are invokable by the orchestrator, GitHub Actions,
or Claude Code subagents (`.claude/agents/`). Each has a strictly fenced domain.

### Orchestration

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Orchestrator | [`agents/orchestrator.md`](agents/orchestrator.md) | Master router — classifies every trigger and dispatches to the right agent | All schedules, webhooks, manual |

### Core Governance

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Truth Catcher | [`agents/truth-catcher.md`](agents/truth-catcher.md) | Notion vs Asana alignment — batch scan, severity tiers, idempotent verdicts | Claude Routine, weekdays 07:58 + 13:58 Zurich |
| Brand Asset | [`agents/brand-asset.md`](agents/brand-asset.md) | RACI approval gates, taxonomy enforcement, audit trail | Asana section_changed webhook |
| Asana Maintenance | [`agents/asana-maintenance.md`](agents/asana-maintenance.md) | Kanban routing, update snippets, directive parsing, audit trail writes | Asana comment webhook / 5-min poll |

### Data & Integrations

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Notion Sync | [`agents/notion-sync.md`](agents/notion-sync.md) | Owns `.truth-cache/` — fetches Notion requirements, roadmap, brand guidelines | Weekdays every 4h, before truth-catcher (gated on Notion edits) |
| Figma | [`agents/figma.md`](agents/figma.md) | Library monitor, export validator, design diff detection | Weekday CRON (gated) + Figma webhook |
| Webflow | [`agents/webflow.md`](agents/webflow.md) | Publishing gate, brand compliance, clinical claims check, asset sync | brand-asset approval event + manual |
| GitHub | [`agents/github.md`](agents/github.md) | PR/commit linkage to Jira and Asana (Curadenapps org) | GitHub PR + push webhooks |
| Release | [`agents/release.md`](agents/release.md) | Release notes, Notion changelog, GitHub tag, Webflow update | Manual only — "cut release v*" |
| Roadmap Watch | [`agents/roadmap-watch.md`](agents/roadmap-watch.md) | Weekly drift report: Notion BOB + Curated Treatment Plan roadmaps vs Asana and Jira | Weekly CRON (Mon 08:00) + manual "roadmap watch" |

### Model tiers and swarming

Each agent's `model:` frontmatter is the single source for its tier. Workflows, `package.json`
scripts and `.claude/agents/` wrappers all use the same tier.

| Tier | Agents | Why |
|------|--------|-----|
| Haiku 4.5 | notion-sync, figma, github, asana-maintenance | Mechanical work: poll, diff, link, route |
| Sonnet 5.5 | orchestrator, truth-catcher, roadmap-watch, webflow, meeting-notes, broadcast | Judgement on structured data |
| Opus 5.5 | brand-asset, release | Approval gates, clinical claims, releases |

Parallel fan-out rules are in [`agents/orchestrator.md`](agents/orchestrator.md) §3a.

### Scheduled runs and token budget

| Workflow | Schedule (UTC) | Change check (no LLM) | Claude run |
|----------|----------------|-----------------------|------------|
| `sync-and-scan.yml` | Manual (scheduled scan moved to the Claude Routine) | Notion edits since last sync → Asana events since last token | notion-sync (Haiku) → truth-catcher: `scripts/truth-scan.ts` does the checks and posting, Sonnet only judges unlinked tasks |
| `figma-diff.yml` | Weekdays 07:00 | Figma file `lastModified` | figma (Haiku) |
| `bob-broadcast.yml` | Mon 09:00 | — | broadcast (Sonnet) |

`.truth-cache/` is saved between runs with `actions/cache`. Every run writes model, turns
and cost to the job summary. Dispatch with `force: true` to skip the change checks.

---

## Core Philosophy

| Layer | Tool | Role |
|-------|------|------|
| **The Constitution** | Notion | Immutable strategic requirements and brand guidelines. Source of truth. |
| **The Frontier** | Asana | Execution layer — feedback, comments, tasks, moving parts. |
| **The Engine** | This repo | Bridges the two. Enforces Notion's truth onto Asana's chaos. Stays self-documented. |

The Truth Catcher exists because the gap between strategy (Notion) and execution (Asana) is where scope creep lives.
Skills exist because recurring sync/broadcast workflows should not require human context-switching.

---

## Governance

See [`SCOPE.md`](SCOPE.md) for hard boundaries — what this system can and cannot do.

Key rules:
- Clinical/medical claims require Legal gate before any asset ships
- Truth Catcher cannot take destructive Asana actions — comments only
- `.truth-cache/` is auto-synced from Notion — never edit manually
- Brand assets need `[Agent Audit: Approved by {Name} on {Date}]` before Done transition

---

## Setup

```bash
git clone https://github.com/Curadenapps/curagents.git
cd curagents
npm install
cp .env.example .env   # populate credentials
```

Required environment variables:

| Variable | Purpose | Agent |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | Claude model access | All |
| `NOTION_API_KEY` | Notion REST API (`ntn_...` internal integration token) | notion-sync |
| `NOTION_ROOT_DATABASE_ID` | `86b68fc172dd43ff8ee3219a3a5435f6` | notion-sync |
| `ASANA_ACCESS_TOKEN` | Asana API | truth-catcher, brand-asset, asana-maintenance |
| `ASANA_PROJECT_GID` | BOB App project GID — App Requests is a section within this project | truth-catcher, asana-maintenance |
| `ASANA_WEBHOOK_SECRET` | HMAC secret for webhook verification | asana-maintenance |
| `FIGMA_API_TOKEN` | Figma REST API token | figma |
| `FIGMA_FILE_KEY` | BOB design system Figma file key | figma |
| `WEBFLOW_API_TOKEN` | Webflow REST API v2 token | webflow |
| `WEBFLOW_SITE_ID` | Curaden Webflow site ID | webflow |

For Claude Code setup: see [`CLAUDE.md`](CLAUDE.md).

---

## Known Gaps

| Gap | Impact |
|-----|--------|
| Figma file key / Webflow site ID not set | figma and webflow agents run in config-error state |
| Asana webhook not registered | asana-maintenance and brand-asset webhooks don't fire; scheduled scan uses the Asana events gate |
| `DRY_RUN=true` everywhere | No live writes to any system |
| Jira secrets exist in CI (`JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`) but no workflow passes them yet | bob-broadcast reads Jira only in interactive sessions |
| roadmap-watch has no CI workflow | Weekly report runs only when triggered manually |
| `FIREFLIES_API_KEY` / `NOTION_MEETING_NOTES_DB_ID` not set | meeting-notes uses paste mode / searches for the DB by name |
