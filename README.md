# Curadenapps Agents

Automated agents and invokable skills for Curaden's BOB App and cross-tool workflows.
Works with Claude Code, Gemini CLI, and any model that reads markdown agent definitions.

---

## System Architecture

```
README.md          ← You are here. System overview and entry point.
CLAUDE.md          ← Claude Code instructions (auto-loaded by Claude)
GEMINI.md          ← Gemini CLI instructions (auto-loaded by Gemini)
SCOPE.md           ← Hard boundaries: what this system can and cannot do
│
├── skills/        ← SKILL & SCOPE — invokable on demand by any session
│   └── curaden-communications/
│       ├── SKILL.md            ← Main entry point (3 procedures)
│       └── references/         ← Procedure-level config (JQL, templates, repo details)
│
├── agents/        ← Automated agents — run on schedule or triggered
│   ├── truth-catcher.md        ← Alignment enforcer (Notion vs Asana)
│   ├── brand-asset.md          ← Brand asset governance and delivery
│   └── asana-maintenance.md    ← Asana hygiene, Kanban routing, update snippets
│
├── src/           ← API integrations (Notion sync, Asana read/write)
├── .github/       ← GitHub Actions (CRON: constitution sync, frontier scan)
└── .planning/     ← GSD project planning docs (roadmap, requirements, state)
```

---

## Skill & Scope

Skills are invokable by any Claude or Gemini session. Trigger by phrase — no manual setup.

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
or Ruflo background workers. Each has a strictly fenced domain.

### Orchestration

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Orchestrator | [`agents/orchestrator.md`](agents/orchestrator.md) | Master router — classifies every trigger and dispatches to the right agent | All schedules, webhooks, manual |

### Core Governance

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Truth Catcher | [`agents/truth-catcher.md`](agents/truth-catcher.md) | Notion vs Asana alignment — batch scan, severity tiers, idempotent verdicts | Hourly CRON |
| Brand Asset | [`agents/brand-asset.md`](agents/brand-asset.md) | RACI approval gates, taxonomy enforcement, audit trail | Asana section_changed webhook |
| Asana Maintenance | [`agents/asana-maintenance.md`](agents/asana-maintenance.md) | Kanban routing, update snippets, directive parsing, audit trail writes | Asana comment webhook / 5-min poll |

### Data & Integrations

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| Notion Sync | [`agents/notion-sync.md`](agents/notion-sync.md) | Owns `.truth-cache/` — fetches Notion requirements, roadmap, brand guidelines | Hourly CRON (50 min) |
| Figma | [`agents/figma.md`](agents/figma.md) | Library monitor, export validator, design diff detection | Every 2h CRON + Figma webhook |
| Webflow | [`agents/webflow.md`](agents/webflow.md) | Publishing gate, brand compliance, clinical claims check, asset sync | brand-asset approval event + manual |
| GitHub | [`agents/github.md`](agents/github.md) | PR/commit linkage to Jira and Asana (Curadenapps org) | GitHub PR + push webhooks |
| Release | [`agents/release.md`](agents/release.md) | Release notes, Notion changelog, GitHub tag, Webflow update | Manual only — "cut release v*" |

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
| `NOTION_API_KEY` | Notion REST API (`secret_...` internal token) | notion-sync |
| `NOTION_ROOT_DATABASE_ID` | `86b68fc172dd43ff8ee3219a3a5435f6` | notion-sync |
| `ASANA_ACCESS_TOKEN` | Asana API | truth-catcher, brand-asset, asana-maintenance |
| `ASANA_PROJECT_GID` | BOB App Asana project GID | truth-catcher, asana-maintenance |
| `ASANA_WEBHOOK_SECRET` | HMAC secret for webhook verification | asana-maintenance |
| `FIGMA_API_TOKEN` | Figma REST API token | figma |
| `FIGMA_FILE_KEY` | BOB design system Figma file key | figma |
| `WEBFLOW_API_TOKEN` | Webflow REST API v2 token | webflow |
| `WEBFLOW_SITE_ID` | Curaden Webflow site ID | webflow |

For model-specific setup: see [`CLAUDE.md`](CLAUDE.md) or [`GEMINI.md`](GEMINI.md).
