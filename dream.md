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
| Roadmap of record | Notion Product Roadmap `751b6071283e43e8b1a91054319e0db6` (BOB + Curaprox app, split by the `Product` field; views "BOB Roadmap" and "Curaprox Roadmap"). The Curated Treatment Plan Roadmap `4eeb7d12…` was merged in on 2026-10-09 and is an archive. |
| Asana write proxy | `asana-maintenance` — all Asana writes route through it (exception: truth-catcher's own comments, posted by its Claude Routine or `scripts/truth-scan.ts`) |
| Approval gate owner | `brand-asset` — only it records approvals |
| Release authority | Human only — `release` agent is manual trigger, never autonomous |
| Team update | `announcements` drafts the weekly/monthly update in Notion (Team Updates) from every source; it reaches Webex (App Team; a Markets edition monthly from Dec 2026) through Webex web in Sean's Chrome, only after Sean says "post it" |
| Feedback QA flow | Inbox: Notion Tasks & Notes (`QA` column). PDF report to the Webex QA space only. Full UAT (QA = `uat`): same content to Confluence under BOB App UAT. Asana only on "promote" |
| Webex access | Every Webex post or read (spaces, meeting summaries, transcripts, recordings) goes through Webex web in Sean's Chrome via Claude in Chrome, following `skills/webex-web/SKILL.md` and its scripts. No bot tokens, no second Webex tab, never typed credentials |
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
| `truth-catcher` → Product Roadmap | Checks Asana BOB App tasks against the Notion Product Roadmap only (all Products). Runs as a Claude Routine reading Notion and Asana live (the manual script refreshes `.truth-cache/roadmap.json` itself); it comments on misaligned tasks and never edits tasks or rows. Also watches the App Tasks, Requests & Feedback intake board (`1200298616652229`) for untriaged, unanswered or stuck requests; it never contacts form requesters and never copies their name or email out of Asana. Rules: `agents/truth-catcher.md` "Agreed rules" and "App Tasks board". |
| `feedback-qa` → `asana-maintenance` | feedback-qa only reports. A point reaches Asana only when a human says "promote", through asana-maintenance. It never changes the inbox `Status` column except `new` → `reference` on rows it claims as feedback. |
| `roadmap-watch` → all | Read-only on Notion rows, Asana and Jira. Its only writes are its weekly report page under Notion "Roadmap Reports" and its own snapshot in `.truth-cache/roadmap-watch/`. |
| `announcements` → all | Read-only on every system. Its only writes are its own Team Updates pages in Notion and, after Sean approves a draft, one Webex post through Webex web (`skills/webex-web`). It consumes other agents' outputs (roadmap-watch reports, truth-catcher escalations, release changelogs, meeting recaps); it never re-runs them. |
| `boom-boom-derek` → all | Read-only on Jira, Confluence, Asana, the WBS sheet, roadmap rows and Notion. Its only writes are Derek's Boom Boom Derek page in Notion (under his Team Directory entry) and one Webex message a day in "Curaden / Phinamic", about Derek La's work only, partner-safe, no swearing. Autonomous: it posts without asking. `announcements` reads the page's "⏳ Sean picks this up" items; it never re-runs the other agents. |
| any agent → Webex | Only through `skills/webex-web` (Claude in Chrome on Sean's sign-in). Posts only to the spaces its own spec names, with a `marker` so a retry never double-posts, and verifies with `webex-read.js`. Read-only everywhere else in Webex: no reactions, edits, deletes, downloads or shares. |
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
| 1 | 2026-10-12 | **All Webex work goes through Webex web** in Sean's Chrome (Claude in Chrome) per the new `skills/webex-web` skill and its scripts `webex-post.js` (one-call post: space and duplicate checks, @mention from Webex's list, Enter to send), `webex-read.js` (spaces, post verification) and `webex-meetings.js` (recap list, AI summary + action items, full transcript from page data; recordings only on Sean's site sign-in). Applies to boom-boom-derek, announcements, meeting-notes (now Webex-first, Fireflies fallback) and feedback-qa (QA reports leave the bot token). Bot tokens are legacy | Webex web allows one live tab per browser, so with Sean's own Webex tab open ours is online only ~15–20 s; one-call posting proved reliable on 12 Oct (Derek ping) while typing and clicking failed. Bot tokens get culled and can't read spaces or meetings |
| 1 | 2026-10-12 | Truth Catcher also watches the Asana **App Tasks, Requests & Feedback** board (`1200298616652229`, owner Fabian): 📥 new requests in the run summary, ⏳ not triaged after 2 working days (ping Fabian), 💬 a comment waiting on us for 3 working days, ⌛ stuck for 10 working days or overdue, 🗺️ accepted product work not on the roadmap (bugs and account requests exempt). Same escalation, working-day and Sean rules as the BOB App board. Preview first: it posts nothing on this board until Sean switches it live in the spec. Same day: Truth Catcher comments are written in Sean's voice with no emoji or header, and end with "— Truth Catcher (automated check, not Sean personally) · cc @Sean Dunne" so readers know it's automated and Sean still gets notified; no "on behalf of" | Sean and Fabian want every incoming request tracked so nothing sits unanswered; Sean wants the comments to sound like him but stay clearly automated, and keep his notifications |
| 2 | 2026-10-09 | New `boom-boom-derek` agent (Boom Boom Derek): Truth Catcher for one person, Derek La (Phinamic; Jira `712020:078ef74c…`, not in Asana). Ledger of what he owes from recaps, Webex, Jira, Confluence, the WBS sheet and Sean's "Waiting on Phinamic" tasks, checked against the Product Roadmap; pings him straight in Webex "Curaden / Phinamic" (Monday rundown, Tue–Fri nudges, max one a day, Sean takes over after 3 unanswered nudges), team-update layout, funny (bánh mì tax, fruit basket, shooby) but clear; detail on a Notion page under Derek's Team Directory entry. Autonomous from day one; posts through Webex web in Sean's Chrome on a scheduled task on his computer, no Webex token | Derek forgot Tuft until another agent flagged it; his asks are spread across tools and his Jira falls behind |
| 3 | 2026-10-09 | New `announcements` agent: one consolidated team update (weekly Thu, monthly last Thu) from meeting recaps, Asana, Notion App Hub, Jira, GitHub and agent reports, drafted by the Claude Routine "Team update draft" under Notion Team Updates `3f47e8aabbb4817291e4ee86b87502f3`, with a Curaprox-styled PDF. Posting to Webex stays on Sean's machine after he reads the draft. The BOB broadcast and roadmap-watch no longer post to Webex themselves. Webex recordings are read in the browser only when a transcript exists | The team got several partial posts or none; Sean wants one lean update he checks before it goes out |
| 4 | 2026-10-09 | One **Product Roadmap** (DB `751b6071…`, renamed from BOB Roadmap) for BOB and the Curaprox app, split by a `Product` field (empty = BOB) with "BOB Roadmap" and "Curaprox Roadmap" views. The Curated Treatment Plan roadmap is merged in (Epic "Curated Treatment Plan", V2 P1 Apr-27): the planner is BOB, using the plan is the Curaprox app. Truth Catcher checks all rows. Agents read Notion with view-mode queries on the agent view, never SQL | Same team builds both apps; SQL queries share a workspace quota and were running out |
| 5 | 2026-10-08 | Truth Catcher moved to a Claude Routine (weekdays 07:58 + 13:58 Zurich) on Sean's plan with the Asana/Notion/GitHub connectors; the `sync-and-scan.yml` schedule is removed (manual only). Fully live, delay questions included. Sean's own tasks get a "📌 for Sean" note instead of being skipped. Regulatory/MDR read is not needed while the PMS route is off | GitHub Action runs failed on API credit; Sean wants reminders on his own tasks too; PMS isn't scoped for V2 or other products |
