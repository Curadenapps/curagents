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
| Milestones | 15–18 Oct iTOP Symposium soft launch (tablet build, T2T Sat 17 Oct; before/during/after plan on the milestone row `3ec7e8aabbb481949ad7c497cc88771b`; on stage only "web 9 Nov, mobile 14 Dec, official launch early 2027") · 9 Nov BOB web release · 14 Dec BOB mobile release, first partner session the same week (proposed Wed 16 Dec, internal, Webex) · early 2027 **official launch** = Milan session (proposed Thu 21 Jan) · IDB Challenge campaign with Blanca Suarez (Marketing), timing open (Unscheduled since 28 Oct) · then the **BOB V2 Programme WBS "voice first"** (sheet `1lBKT5R5YupFX6wgrdHGv4sQCrXFYHrKNbpNyYlfe6_M`, the timing source of truth; 2-week sprints, S1 = 9–13 Nov 2026, Sn starts 16 Nov 2026 + 14·(n−2) days and ends that Friday + 11): 5 Mar 2027 recall live · 19 Mar patient web live · 16 Apr voice in English live · 11 Jun Curaprox app v1 live · 25 Jun treatment plan live · 6 Aug Shopify checkout live · 20 Aug app routine + points · **15 Oct 2027 Phase 1 complete** · 21 Jan 2028 voice in 5 languages · 18 Feb Plaque Hunter · 31 Mar OralScan · 26 May OralScan in the game · **4 Aug 2028 Phase 2 complete**. Roadmap Release options: "Phase 1 Nov-26–Oct-27", "Phase 2 Oct-27–Aug-28", "Later 2028" (follow the WBS Phase label, not the date) |
| Phase 1 scope (7 Oct reset) | Close one loop and make it robust: BOB + BPE assessment → treatment plan with consent → Curaprox app web edition → Shopify (practice commission) → reminders → re-BOB. Consent/GDPR and per-practice feature opt-in are Phase 1. Not doing: PMS, OralScan route A, perio charts, 3D, subscriptions, in-app checkout, a separate Web Companion app, MGI. Scope page `3f27e8aabbb481c49609dd919ce400a0` |
| Asana write proxy | `asana-maintenance` — all Asana writes route through it (exception: truth-catcher's own comments and its marking obviously done tasks complete, done by its Claude Routine or `scripts/truth-scan.ts`) |
| Approval gate owner | `brand-asset` — only it records approvals |
| Release authority | Human only — `release` agent is manual trigger, never autonomous |
| Team update | `announcements` drafts the weekly/monthly update in Notion (Team Updates) from every source; it reaches Webex (App Team; a Markets edition monthly from Dec 2026) through Webex web on Sean's sign-in, only after Sean says "post it" |
| Feedback QA flow | Inbox: Notion Tasks & Notes (`QA` column). PDF report to the Webex QA space only. Full UAT (QA = `uat`): same content to Confluence under BOB App UAT. Asana only on "promote" |
| Runtime model | Specs live in this repo (`main`, changed only by PR). Webex work (Boom Boom Derek, posting team updates and QA reports, meeting notes) runs on Sean's PC from Claude desktop scheduled tasks or his request; connector-only work runs as cloud Claude Routines. Every run starts from `origin/main` and never edits specs. See `RUNTIME.md` |
| Run log | Every run, PC or cloud, ends by writing one row to the Notion **Agent run log** `a4c371ee506c4d0fa5dde1fb11bd2657` (even on failure). The cloud maintenance session reviews it every weekday at 10:15 Zurich and fixes specs by PR |
| Webex access | Every Webex post or read (spaces, meeting summaries, transcripts, recordings) goes through Webex web on Sean's sign-in, in the Claude desktop app's built-in browser (Claude in Chrome as fallback), following `skills/webex-web/SKILL.md` and its scripts. No bot tokens, no second Webex tab, never typed credentials |
| Medical-device line | Nothing may move BOB into medical-device legislation (no diagnosis, no proposed treatment); BOB stays one global product, so nothing is built for one market only. No self-built PMS integration in Phase 1. Agents flag features that cross this line (decision §5, 12 Oct) |
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
| `meeting-notes` → `curaden-communications` | meeting-notes delegates condensing and Notion page creation to the curaden-communications skill (Procedure 4). Its source is Webex Meeting recap (AI summary, action items, transcript) read through `skills/webex-web`; Fireflies and a pasted transcript are fallbacks. Recaps go under Decision Log & Meeting Recaps. Never calls Notion APIs directly. |
| `truth-catcher` → Product Roadmap | Checks Asana BOB App tasks against the Notion Product Roadmap only (all Products). Runs as a Claude Routine reading Notion and Asana live (the manual script refreshes `.truth-cache/roadmap.json` itself); it comments on misaligned tasks and never edits rows; its only task edit is marking an obviously finished task complete, reported to Sean ("Closing done tasks"). Also watches the App Tasks, Requests & Feedback intake board (`1200298616652229`) for untriaged, unanswered or stuck requests; it never contacts form requesters and never copies their name or email out of Asana. Rules: `agents/truth-catcher.md` "Agreed rules" and "App Tasks board". |
| `feedback-qa` → `asana-maintenance` | feedback-qa only reports. A point reaches Asana only when a human says "promote", through asana-maintenance. It never changes the inbox `Status` column except `new` → `reference` on rows it claims as feedback. |
| `roadmap-watch` → all | Read-only on Notion rows, Asana and Jira. Its only writes are its weekly report page under Notion "Roadmap Reports" and its own snapshot in `.truth-cache/roadmap-watch/`. |
| `announcements` → all | Read-only on every system. Its only writes are its own Team Updates pages in Notion and, after Sean approves a draft, one Webex post through Webex web (`skills/webex-web`). It consumes other agents' outputs (roadmap-watch reports, truth-catcher escalations, release changelogs, meeting recaps); it never re-runs them. |
| `boom-boom-derek` → all | Read-only on Jira, Confluence, Asana, the WBS sheet, roadmap rows and Notion. Its only writes are the Boom Boom Derek page in Notion (under Derek's Team Directory entry) and one Webex message a day, in the common chat (QA space) by default or in "Curaden / Phinamic", about the Phinamic team's work only (Derek La and Khanh by name), partner-safe, no swearing. Autonomous: it posts without asking. `announcements` reads the page's "⏳ Sean picks this up" items; it never re-runs the other agents. |
| `webex-sweep` → Notion, Asana | Read-only in Webex (watched spaces in its spec, meeting action items). Writes only: new rows in the Notion inbox Tasks & Notes (Source `webex`/`meeting`, Source ID = message fingerprint, never twice), ticket fields on each row (`Ticket ID` WX-…, `Kind` Development / Asana task / Notion, Requester, Owner, Due, Priority; replies naming WX-… update that row), update comments on matching Asana tasks, tasks for inbox rows Sean set to `approved` (Status `pushed`: Development → BOB App backlog for Jira, Asana task → App Tasks, Requests & Feedback board; Notion-kind rows are not pushed), and one "Triage Webex inbox (N new)" Asana task assigned to Sean that it updates and @mentions him on, all Asana writes through asana-maintenance. Never edits roadmap rows or task status, dates or owners. Truth Catcher, Boom Boom Derek, announcements and feedback-qa read what it writes. |
| any agent → Webex | Only through `skills/webex-web` (built-in browser, Claude in Chrome as fallback, on Sean's sign-in). Posts only to the spaces its own spec names, with a `marker` so a retry never double-posts, and verifies with `webex-read.js`. Read-only everywhere else in Webex: no reactions, edits, deletes, downloads or shares. |
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
| 1 | 2026-10-28 | The Notion Product Roadmap and both Asana projects now follow Derek's **WBS "voice first"** (see Milestones). Old releases "V2 P1 Apr-27" and "Rollout Apr–Aug-27" are replaced by "Phase 1 Nov-26–Oct-27", "Phase 2 Oct-27–Aug-28" and "Later 2028" (old options kept until no row uses them). The Curaprox app has its own native lane (Epic "Curaprox app — native app"), tracked in Asana "Curaprox App" (`1209391102620806`) with dependencies on the BOB App tasks it needs. Rows not in the WBS (Coach Profile, translation country check, "patients use the plan" gate, IDB Challenge) are Unscheduled until Sean decides | Sean: the WBS is what Phinamic will build, so it wins over the roadmap on timing |
| 2 | 2026-10-28 | **Webex runs in the Claude desktop app's built-in browser** (Claude in Chrome only as fallback), on Sean's own sign-in, with the `skills/webex-web` scripts (`webex-post.js`, `webex-read.js`, `webex-meetings.js`); no bot tokens. The **Webex keep-alive** runs every 2 hours (weekdays 07:05–17:05), tells Sean once when Webex is signed out and posts a queued Boom Boom ping; "Boom Boom queued" is retired. The Boom Boom Derek Notion page is the only ping queue (no local outbox). Same on the Curaden account | What already ran on Sean's PC since 13 Oct: the built-in browser keeps its sign-in across scheduled sessions and is separate from his Chrome, so there is no tab clash; Claude in Chrome often wasn't paired with scheduled runs |
| 3 | 2026-10-23 | Truth Catcher may **mark a task complete** when it is obviously done: the assignee or Sean wrote on the task that it is finished or can close, and nothing after that reopens it. Never a task with open subtasks, a milestone or an App Tasks submission; when unsure it asks instead. Each close gets a short comment saying why and a line under "Closed by Truth Catcher" in the run summary so Sean can review and reopen. Everything else stays comments only | Sean: if a task is obviously done, close it, but tell me so I can review it |
| 4 | 2026-10-23 | `boom-boom-derek` goes **team mode**: it Boom Booms the Phinamic team, not Derek alone. It tracks Derek La (technical owner) and Khanh (Phinamic's Business Analyst; full name, Webex display name and Jira account to follow from Sean), each item under the owner its source names (unassigned = "Phinamic team", Derek decides). Team pings go to the common chat (Webex QA space `644fd150-f1e6-11f0-886e-874a9ad69e32`, where Khanh, Ky and the team are); "Curaden / Phinamic" only for Derek-only items or when Sean asks; still one message a day. Signed "— Boom Boom 💥, on behalf of Sean"; the agent, its triggers and its Notion page keep their names. `webex-post.js` takes several @mentions | Derek asked for it so he no longer forwards everything to Khanh, Ky and the team; Sean: cooking Derek alone isn't the best approach |
| 5 | 2026-10-14 | Launch sequence reset: web 9 Nov and mobile 14 Dec are **releases**, not the launch. The first partner session (internal, Webex) moves from 5 Nov to the week of 14 Dec (proposed Wed 16 Dec). The **official launch** is the Milan store session in early 2027 (proposed Thu 21 Jan; February possible), new roadmap milestone. At the Symposium say only "web 9 Nov, mobile 14 Dec, official launch early 2027". Same day: the IDB Challenge (Blanca, Marketing) is back in scope as Q1 2027 campaign support built on Phase 1 | Partners should try web and mobile before the session; a proper launch needs both live and the Milan setup, and December is too thin for a launch |
