---
type: shared-context
scope: system-wide
updated_by: curaden-orchestrator
update_trigger: "after every dispatch cycle; manually on major decisions"
read_by:
  - agents/orchestrator.md
  - agents/truth-catcher.md
  - agents/brand-asset.md
  - agents/asana-maintenance.md
  - agents/notion-sync.md
  - agents/figma.md
  - agents/webflow.md
  - agents/github.md
  - agents/release.md
format: "load dream.md FIRST, before own agent file. It replaces the need to
  load sibling agent specs — only load another agent's file if you are about
  to call it directly."
---

# Dream

> The ambient context document. Every agent loads this before their own spec.
> It holds the shared mental model, current system state, active cross-agent
> contracts, and rolling decision log. Keep it concise — it must fit in ~600
> tokens so it never crowds out working context.

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
| Truth cache owner | `notion-sync` — only it writes `.truth-cache/` |
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
| `truth-catcher` → `notion-sync` | Truth-catcher reads from cache only. If cache is stale, it requests notion-sync via orchestrator — does not fetch Notion itself. |
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
| 1 | 2026-03-26 | Webex delivery added to BOB broadcast (replaces deferred Slack plan) | Posts Markdown to Webex room after Notion page creation; dry-run guard preserves safe default |
| 2 | 2026-03-26 | Design Diff Detection moved from v2 → v1 active | Ruflo background workers + figma agent make it feasible without extra infra |
| 3 | 2026-03-26 | Asana-maintenance is the sole Asana write proxy | Prevents duplicate writes and conflicting comments from multiple agents hitting the API simultaneously |
| 4 | 2026-03-26 | `.truth-cache/` is atomic-write only | Prevents partial reads by sibling agents during notion-sync updates |
| 5 | 2026-03-26 | Release agent is manual-trigger only | Releases are intentional human decisions; no autonomous release ever |

---

## 6. Known Gaps (honest accounting — remove when resolved)

| Gap | Blocking | Owner |
|-----|---------|-------|
| `.github/workflows/` not yet created | Agents run manually only; no autonomous CRON | Phase 2 |
| `src/` TypeScript implementations missing | API calls are prompt-described, not code-backed | Phase 2 |
| Figma file key not yet set | Figma agent runs in config-error state | Phase 3 (credentials) |
| Webflow site ID not yet set | Webflow agent runs in config-error state | Phase 3 (credentials) |
| Asana webhook not yet registered | asana-maintenance falls back to 5-min polling | Phase 3 (credentials) |
| `WEBEX_BOT_TOKEN` not yet set | Webex delivery step skipped (dry-run output only) | Phase 3 (credentials) |
| `DRY_RUN=true` across all agents | No live writes to any system | Phase 4 (dry-run verified) |

---

## 7. How to Use This File

**Agents:** Load `dream.md` before your own spec. Use §2 for facts you'd
otherwise repeat. Use §3 for your contract obligations. Check §4 for current
system state before deciding to fetch live data. Add to §5 after any major
decision by updating via the orchestrator.

**Orchestrator:** After every dispatch cycle, update §4 (Active Context) with
the latest timestamps and counts from `.truth-cache/dispatch-log.json`.
When a significant decision is made, prepend it to §5 and drop the oldest entry.

**Humans:** §6 is your checklist. §5 is your audit trail. §4 is the current
system heartbeat.
