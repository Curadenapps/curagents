---
type: shared-context
scope: system-wide
updated_by: curaden-orchestrator
update_trigger: "after every dispatch cycle; manually on major decisions"
format: "Load §2–3 before your own agent file. Only load a sibling agent's spec
  if you are about to call it directly."
---

# Dream

> The ambient context document. Every agent loads this before their own spec.
> It holds the shared mental model, current system state, active cross-agent
> contracts, and rolling decision log. Keep it under ~1,000 tokens. Known gaps
> and how-to notes live in README.md, not here.

---

## 1. Vision (stable — rarely changes)

Curaden's agent system is the connective tissue between strategy and execution.

- **Notion** is the constitution. Immutable. Never overridden by anything below it.
- **Asana** is the frontier. Messy, fast-moving, human. Needs to be anchored to Notion.
- **Figma** is the design source. Assets flow out of it, not into it.
- **Webflow** is the public surface. Nothing reaches it without an approval chain.
- **GitHub** is the engineering record. Every commit should trace to a work item.
- **Jira** is the engineering backlog. BOB project. Source of sprint truth.
- **This agent system** exists to enforce those relationships automatically, without humans having to context-switch between tools.

The north star: **one trigger phrase or one webhook event should be enough to keep the whole stack in sync.**

---

## 2. Shared Mental Model (stable — update rarely)

Every agent must agree on these facts:

| Fact | Value |
|------|-------|
| Notion root database | `86b68fc172dd43ff8ee3219a3a5435f6` (workspace: seandunne) |
| Truth cache owner | `notion-sync` — only it writes `.truth-cache/` (exception: `roadmap-watch` owns `.truth-cache/roadmap-watch/`) |
| Roadmap of record | Notion BOB Roadmap `751b6071283e43e8b1a91054319e0db6` + Curated Treatment Plan Roadmap `4eeb7d12c3fa4bdcb069334b80a8c333` |
| Asana write proxy | `asana-maintenance` — all Asana writes route through it |
| Approval gate owner | `brand-asset` — only it records approvals |
| Release authority | Human only — `release` agent is manual trigger, never autonomous |
| Clinical claims rule | ANY efficacy/medical language requires `legal_approved: true` before publish, no exceptions |
| Dry run default | `DRY_RUN=true` until explicitly disabled per-agent |
| Idempotency pattern | `{resource_id}:{event_id}` — one action per event, always |

---

## 3. Cross-Agent Contracts (stable — change only by explicit decision)

These are binding agreements between agents. Violating them creates inconsistency.

| Contract | Detail |
|----------|--------|
| `brand-asset` → `asana-maintenance` | Brand asset never writes to Asana directly. Always delegates via `agent_call`. |
| `figma` → `asana-maintenance` | Figma agent never moves Asana tasks directly. Passes directive to asana-maintenance. |
| `webflow` → `brand-asset` | Webflow reads approvals from `.truth-cache/approvals.json` written by brand-asset. Never calls brand-asset at runtime. |
| `github` → `asana-maintenance` | GitHub agent never updates Asana tasks directly. Delegates routing to asana-maintenance. |
| `release` → `all` | Release coordinator calls notion-sync, curaden-communications, github, and webflow in sequence. It is the only agent that chains multiple agents. |
| `meeting-notes` → `curaden-communications` | meeting-notes delegates all Fireflies fetching, condensing, and Notion page creation to the curaden-communications skill (Procedure 4). Never calls Fireflies or Notion APIs directly. |
| `truth-catcher` → `notion-sync` | Truth-catcher reads from cache only. If cache is stale, it requests notion-sync via orchestrator — does not fetch Notion itself. |
| `roadmap-watch` → all | Read-only on Notion rows, Asana and Jira. Its only writes are its weekly report page under Notion "Roadmap Reports" and its own snapshot in `.truth-cache/roadmap-watch/`. |
| Orchestrator → all | Orchestrator never performs domain actions. Classify, dispatch, collect, report only. |

---

## 4. Active Context (dynamic — orchestrator updates after each cycle)

> Last updated: {ISO timestamp of last orchestrator run}

```
Sprint focus:       {current Jira sprint name or "none"}
Last notion-sync:   {ISO timestamp or "never"}
Last truth-catcher: {ISO timestamp or "never"}
Last figma-check:   {ISO timestamp or "never"}
Open escalations:   {count} — {brief description or "none"}
Pending approvals:  {count} — {brief description or "none"}
Dry run active:     {true|false}
```

On first run, the orchestrator should populate this section with live data
from `.truth-cache/dispatch-log.json` and `.truth-cache/notion-sync-meta.json`.

---

## 5. Decision Log (rolling — keep last 5 decisions, drop older ones)

Prevents agents from re-litigating resolved decisions in new sessions.

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-10-06 | Model tiering (Haiku 4.5 for sync/poll/route, Sonnet 5.5 for judgement, Opus 5.5 for brand-asset + release); scheduled runs moved to weekday 4h/daily cadence behind `scripts/gate.ts` change checks; ruflo removed | ~60 ungated Sonnet runs/day were spending tokens on unchanged data; CI runs had no MCP, tool allowlist or saved cache |
| 2 | 2026-10-01 | BOB roadmap reorganised around launch milestones (Soft Launch 17 Oct tablet build, Web 9 Nov, Mobile + Hard Launch 14 Dec, V2 P1 Apr-27, Rollout Apr–Aug-27); Curated Treatment Plan split to its own roadmap; `roadmap-watch` added | Notion docs were 3–4 months stale; one roadmap of record plus a weekly drift report keeps it current |
| 3 | 2026-03-26 | Design Diff Detection moved from v2 → v1 active | Scheduled figma agent makes it feasible without extra infra |
| 4 | 2026-03-26 | Asana-maintenance is the sole Asana write proxy | Prevents duplicate writes and conflicting comments from multiple agents hitting the API simultaneously |
| 5 | 2026-03-26 | `.truth-cache/` is atomic-write only | Prevents partial reads by sibling agents during notion-sync updates |
