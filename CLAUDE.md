# Claude Code — Curadenapps Agents

## System Context

Every session in this repo starts with `scripts/sync-checkout.sh` (SessionStart hook in
`.claude/settings.json`): it keeps the curagents folder on an up-to-date `main` for
both Claude accounts, and says in one "checkout sync:" line when it had to leave it alone.

Read [`RUNTIME.md`](RUNTIME.md) for where each agent runs (PC vs cloud) and the run-log rule every run follows.
Which Claude account (Curaden or Personal) runs what right now lives in the Notion
**Agent registry**, not in memory notes: check it before answering or changing a schedule.

Open work, decisions waiting on Sean and planned agent refinements are in
[`docs/handoff.md`](docs/handoff.md): read it when you pick up maintenance.

Read [`dream.md`](dream.md) FIRST — it is the shared ambient context for all agents and
replaces the need to load sibling agent specs. Then read [`README.md`](README.md) for the
full system architecture.

## Skills

The following skills are available and will auto-load based on trigger phrases:

- **`skills/feedback-qa/SKILL.md`** — Feedback QA: Notion inbox → checks → PDF report to the Webex QA space (+ Confluence for full UATs)
- **`skills/curaden-communications/SKILL.md`** — RevolveNote sync, Jira-Notion BOB sync, Meeting Notes (Webex → Notion). The BOB weekly broadcast moved to `agents/announcements.md`
- **`skills/market-rollout/SKILL.md`** — Market rollout (UAE first, Apr 2027; then Italy, Slovenia, South Africa, USA, Japan; board BOB Market Rollouts): audiences, onboarding plans, Admin Console super users, training modules, partner prep and follow-ups. Drafts and tracks in Notion; Sean sends, approves and grants
- **`skills/webex-web/SKILL.md`** — The only way to work in Webex: post (with @mentions, files), read spaces, read meetings (AI summary, action items, transcript, recording). Webex web on Sean's sign-in in the Claude desktop app's built-in browser (Claude in Chrome as fallback); no bot tokens. Load it before any Webex step

Trigger phrases are defined in each SKILL.md frontmatter. Skills load their own reference files as needed.

## Agents

All agents share a common YAML frontmatter schema (trigger, memory,
idempotency_key, dry_run, output schema). Each spec's `model:` field sets its tier
(Haiku 4.5 / Sonnet 5.5 / Opus 5.5). The same agents are registered as Claude Code
subagents in `.claude/agents/`. Use those to fan out in parallel, following the swarm
rules in `agents/orchestrator.md` §3a. Load the relevant file for context:

**Orchestration**
- [`agents/orchestrator.md`](agents/orchestrator.md) — Master router; entry point for all activity

**Core governance**
- [`agents/truth-catcher.md`](agents/truth-catcher.md) — Notion vs Asana alignment on BOB App, plus the App Tasks, Requests & Feedback intake board; comments in Sean's voice, signed Truth Catcher
- [`agents/brand-asset.md`](agents/brand-asset.md) — Brand asset governance and RACI approval gates
- [`agents/asana-maintenance.md`](agents/asana-maintenance.md) — Kanban routing, update snippets, audit trail writes

**Data & integrations**
- [`agents/notion-sync.md`](agents/notion-sync.md) — Owns .truth-cache/; fetches Notion on schedule
- [`agents/figma.md`](agents/figma.md) — Figma library monitor, export validator, design diff detection
- [`agents/webflow.md`](agents/webflow.md) — Webflow publishing gate and asset sync
- [`agents/github.md`](agents/github.md) — PR/commit linkage to Jira and Asana (Curadenapps org)
- [`agents/release.md`](agents/release.md) — Release coordinator (BOB + RevolveNote); manual trigger only
- [`agents/meeting-notes.md`](agents/meeting-notes.md) — Webex meeting (AI summary, action items, transcript, recording frames) → Notion recap page
- [`agents/roadmap-watch.md`](agents/roadmap-watch.md) — Weekly roadmap drift report (Notion roadmaps vs Asana/Jira); read-only, plus a Monday summary to Webex App Team
- [`agents/feedback-qa.md`](agents/feedback-qa.md) — Feedback QA: reads the Notion inbox, posts the PDF report to the Webex QA space on its own every Friday when there's enough; Confluence for full UATs
- [`agents/announcements.md`](agents/announcements.md) — Team update: week / two weeks / month across every tool → Notion draft → Webex after approval
- [`agents/boom-boom-derek.md`](agents/boom-boom-derek.md) — Boom Boom Derek: Truth Catcher for the Phinamic team (Derek La and Khanh); autonomous, funny-but-clear pings in the Webex common chat (QA space) or "Curaden / Phinamic", details on its Notion page
- [`agents/market-rollout.md`](agents/market-rollout.md) — Market Rollout: Sean's rollout partner for BOB (then the Curaprox app) in the rollout markets; owns the BOB Market Rollouts board's structure (asana-maintenance does routine moves); onboarding tracker, super users, training modules, HQ ↔ partner rhythm. Manual only
- [`agents/app-support.md`](agents/app-support.md) — App Support: answers "App Requests & Feedback" form submissions on the App Tasks board on its own, hourly in work hours, from the product FAQs and `docs/app-support-faq.md` (signed as automated, @mentioning the submitter's guest follower); owners (BOB → Sean, rest → Fabian) get the changes and anything it can't answer; bugs and product gaps go to Jira via In Development. Fabian's setup: [`docs/app-support-quickstart.md`](docs/app-support-quickstart.md). Mailboxes support@bobscore.com and curaprox.app@curaden.com come in through the Outlook MCP as board tasks (agreed 12 Nov; Sean and Janine send)
- [`agents/webex-sweep.md`](agents/webex-sweep.md) — Webex Sweep: reads the watched Webex spaces and meeting action items; logs every item in the Notion inbox (hidden), makes one triage task per item in BOB App › Webex inbox for Sean, comments updates onto Asana tasks; in Webex only a "New in Jira" note in the common chat

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
