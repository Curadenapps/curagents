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
| Milestones | 15–18 Oct iTOP Symposium soft launch (tablet build, T2T Sat 17 Oct; before/during/after plan on the milestone row `3ec7e8aabbb481949ad7c497cc88771b`; on stage only "web 9 Nov, mobile 14 Dec, official launch early 2027") · 9 Nov BOB web release · 14 Dec BOB mobile release, first partner session the same week (proposed Wed 16 Dec, internal, Webex) · early 2027 **official launch**: place and date open since 6 Nov (Milan not confirmed; Curaprox Italy may not take on a long pilot; options: Milan later with a shorter Italy start, UAE as lead full-loop market, Switzerland or the Czech Republic; 21 Jan 2027 is only a placeholder; Asana `1217552489272192`) · IDB Challenge campaign with Blanca Suarez (Marketing), timing open (Unscheduled since 28 Oct) · then the **BOB V2 Programme WBS "voice first"** (sheet `1lBKT5R5YupFX6wgrdHGv4sQCrXFYHrKNbpNyYlfe6_M`, the timing source of truth; 2-week sprints, S1 = 9–13 Nov 2026, Sn starts 16 Nov 2026 + 14·(n−2) days and ends that Friday + 11): 5 Mar 2027 recall live · 19 Mar patient web live · 16 Apr voice in English live · 11 Jun Curaprox app v1 live · 25 Jun treatment plan live · 6 Aug Shopify checkout live · 20 Aug app routine + points · **15 Oct 2027 Phase 1 complete** · 21 Jan 2028 voice in 5 languages · 18 Feb Plaque Hunter · 31 Mar OralScan · 26 May OralScan in the game · **4 Aug 2028 Phase 2 complete**. Roadmap Release options: "Phase 1 Nov-26–Oct-27", "Phase 2 Oct-27–Aug-28", "Later 2028" (follow the WBS Phase label, not the date) |
| Launch KPIs (5 Nov, reworked 10 Nov) | Markets are measured on clinics doing the loop, not sign-ups (page "Launch KPIs — BOB markets", Notion `40f7e8aabbb48114bdbfe8715c020740`, the source of truth; the playbook's old activation ladder was retired 5 Nov). Live now: K1 clinic live (5–10 clinics), K2 first BOB within 7 days (80%), K3 habit, 5+ finished BOBs a week (50%). From spring 2027: K6 back, a second BOB about 2 weeks later (Mar 2027), K4 plan sent and K5 plan opened (Apr 2027, first treatment plan version). K7 bought: a recommended IDB bought in the clinic (marked after the BOB, proposal from Japan 10 Nov, no roadmap item yet) or online with a linked order (Aug 2027). North star: **5 full-loop clinics per market within 90 days of launch**. UAE is the lead market for the full loop; Japan counts K1–K3, K6, K7 for its first 90 days. market-rollout reports them, roadmap-watch names the step a slipping item delays, the Markets edition shows them monthly |
| Jira guard (10 Nov) | If Jira returns 0 issues for project BA, or a known key (e.g. BA-8) comes back 404, the connector has lost access: mark Jira `unavailable` and say so in the run log. Never read it as "no changes", "not found" or drift, and never write to a roadmap row or ledger from it |
| Phase 1 scope (7 Oct reset) | Close one loop and make it robust: BOB + BPE assessment → treatment plan with consent → Curaprox app web edition → Shopify (practice commission) → reminders → re-BOB. Consent/GDPR and per-practice feature opt-in are Phase 1. Not doing: PMS, OralScan route A, perio charts, 3D, subscriptions, in-app checkout, a separate Web Companion app, MGI. Scope page `3f27e8aabbb481c49609dd919ce400a0` |
| Asana write proxy | `asana-maintenance` — all Asana writes route through it (exception: truth-catcher's own comments and its marking obviously done tasks complete, done by its Claude Routine or `scripts/truth-scan.ts`; and `market-rollout`'s structural edits on the BOB Market Rollouts board after Sean's go, see decision #1) |
| Approval gate owner | `brand-asset` — only it records approvals |
| Release authority | Human only — `release` agent is manual trigger, never autonomous |
| Team update | `announcements` drafts the weekly/monthly update in Notion (Team Updates) from every source; it reaches Webex (App Team; a Markets edition monthly from Dec 2026) through Webex web on Sean's sign-in, only after Sean says "post it" |
| Feedback QA flow | Inbox: Notion Tasks & Notes (`QA` column). PDF report to the Webex QA space only. Full UAT (QA = `uat`): same content to Confluence under BOB App UAT. Asana only on "promote" |
| Runtime model | Specs live in this repo (`main`, changed only by PR). Since 11 Nov: every scheduled agent runs as a cloud Claude Routine on the **Curaden** account (connectors only); anything they want in Webex goes to the Notion **Webex outbox** (`collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d`). The one PC task, the **Webex courier** on the **Personal** desktop app (IT blocks browser automation on Curaden), posts the outbox and runs Webex Sweep, weekdays 08:02, 09:02, 12:02, 17:02. Manual browser runs ("post it", "meeting notes") also stay on the PC. Every run starts from `origin/main` and never edits specs. See `RUNTIME.md` |
| Run log | Every run, PC or cloud, ends by writing one row to the Notion **Agent run log** `a4c371ee506c4d0fa5dde1fb11bd2657` (even on failure). The run log, Agent registry and Webex outbox sit together on the Notion page **Agent control room**; runs find them by ID only (`RUNTIME.md` "Where the agent tables live"). The cloud maintenance session reviews it every weekday at 10:15 Zurich and fixes specs by PR |
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
| `feedback-qa` → `asana-maintenance` | feedback-qa only reports: every Friday 10:10 it puts the PDF report in the Webex outbox for the QA space on its own when the rubric's threshold is met. A point reaches Asana only when a human says "promote", through asana-maintenance. It never changes the inbox `Status` column except `new` → `reference` on rows it claims as feedback. |
| `roadmap-watch` → all | Read-only on Notion rows, Asana and Jira. Its only writes are its weekly report page under Notion "Roadmap Reports", its own snapshot in `.truth-cache/roadmap-watch/` and one Webex outbox row with the summary and report link for App Team (Mondays, on its own). |
| `announcements` → all | Read-only on every system. Its only writes are its own Team Updates pages in Notion and, after Sean approves a draft, one Webex post through Webex web (`skills/webex-web`). It consumes other agents' outputs (roadmap-watch reports, truth-catcher escalations, release changelogs, meeting recaps); it never re-runs them. |
| `boom-boom-derek` → all | Read-only on Jira, Confluence, Asana, roadmap rows and Notion. Its only writes are the Boom Boom Derek page in Notion (under Derek's Team Directory entry) and one Webex outbox row a day (posted by the courier), in the common chat (QA space) by default or in "Curaden / Phinamic", about the Phinamic team's work only (Derek La and Khanh by name), partner-safe, no swearing. Autonomous: it posts without asking. `announcements` reads the page's "⏳ Sean picks this up" items; it never re-runs the other agents. |
| `webex-sweep` → Notion, Asana, Webex | Reads the watched Webex spaces in its spec and meeting action items. Writes only: rows in the Notion inbox Tasks & Notes as a hidden log (Source `webex`/`meeting`, Source ID = message fingerprint, never twice; Status `pushed` once its triage task exists, `reference` for decisions and answered threads, `skip` when Sean drops the task); one triage task per item that needs doing in BOB App › **Webex inbox** (no assignee, no due date, fixed headers: What, Size and route, Who and when, From the chat, Related); update comments on matching Asana tasks; all Asana writes through asana-maintenance. Sean triages: In Development → the Asana rule makes the Jira BA ticket; assigned → an internal task; completed → dropped. The sweep never moves, assigns or completes those tasks, never creates Jira tickets and never edits roadmap rows. In Webex it only posts one "New in Jira" note in the common chat when triage items became Jira tickets (keys, titles, assignees; partner-safe). Truth Catcher skips the Webex inbox section; Boom Boom Derek, announcements and feedback-qa read what it writes. |
| `market-rollout` → Notion, Asana | Writes only: the "Rollout status" section of the four market pages, rows in Training modules (Status `Draft` or `HQ check`; clinical wording → `Legal check` via brand-asset) and Onboarding tracker, and draft pages under Market Rollout Academy `4087e8aabbb481df9fa3c1662efbbe6a`. Asana only through asana-maintenance after Sean says go. Never sends messages, posts to Webex, creates accounts or grants Admin Console access: it drafts the request, Sean and Phinamic act. Feeds market lines to `announcements` for the Markets broadcast. |
| `app-support` → Asana | Form submissions on the App Tasks, Requests & Feedback board (`1200298616652229`) only. The only agent that talks to requesters: answers on its own, hourly in work hours (live since 10 Nov 2026), in the owner's voice (`docs/app-support-voice-sean.md` / `-fabian.md`) with an "(automated)" sign-off, @mentioning the submitter's guest follower (matched by the email in the form notes). Owners (BOB → Sean, everything else → Fabian) get the changes to make and the requests it holds (no source, patient data, spam, unsure) on their "App Support: needs you" task (no project). Writes only through asana-maintenance: those replies, a follower add by email, one "{Owner}: change in {system}" subtask, a move to Awaiting Feedback, marking a task complete after the owner confirms, and one dev ticket per bug or product gap in BOB App moved to In Development (BOB and Curaprox app only; the Asana→Jira sync creates the Jira issue; existing tickets get linked, not duplicated). Mail (support@ and info@bobscore.com) is planned and disabled until IT approves a connector; then drafts, sent only on the owner's "send". Never edits BOB Admin, handles passwords, writes patient data, promises dates or copies a requester's name or email out of Asana. Answers from the Notion product FAQs first (read-only), then `docs/app-support-faq.md`; it learns only from what owners write, putting anonymised FAQ candidates in its run-log row for the maintenance session to merge by PR. |
| any agent → Webex | Cloud agents never post: they write one row to the Webex outbox (Space, Mentions, Marker, message in the page body, Status `Queued`, or `Held` until Sean ticks Approved). Only the Webex courier and manual runs on Sean's PC post, through `skills/webex-web` (built-in browser, Claude in Chrome as fallback, on Sean's sign-in). Posts only to the spaces its own spec names, with a `marker` so a retry never double-posts, and verifies with `webex-read.js`. Read-only everywhere else in Webex: no reactions, edits, deletes, downloads or shares. |
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
| 1 | 2026-11-12 | **Webex triage happens in Asana.** Webex Sweep logs every item in the Notion inbox (hidden fallback, nobody reviews it there) and makes one triage task per item that needs doing in the BOB App board's **Webex inbox** section, with fixed headers so it reads in seconds; fewer items (one per topic, nothing already answered in the chat). Sean decides there: In Development (Asana rule → Jira BA, Derek), assign it, or drop it. Truth Catcher skips that section. In Webex the sweep stops posting "Logged from this chat" notes; it posts only one "New in Jira" note in the common chat when triage items became Jira tickets, nothing in Curaden / Phinamic or App Team. Replaces the Webex Sweep part of the 4 Nov decision and the "Triage Webex inbox" task | Sean: the WX notes in the common chat looked like commitments nobody had checked ("automated yap"); review once in Asana, then distribute, and only tell the developers about real Jira tickets |
| 2 | 2026-11-11 | **Market rollout calendar and board.** Every market rollout lives on the Asana board **BOB Market Rollouts** (`1220436356920176`; one card per market, a column per stage, nothing in BOB App), following the Notion **Market rollout system** (`4157e8aabbb481b697ede40fc772933c`: stages 0 Kickoff to 5 Run, then 6 Aftercare). "One, then three, then six": **UAE** launch Apr 2027 · **Italy** Jul 2027 (step by step, no Milan pilot) · **Slovenia, South Africa** Aug 2027 or earlier (on hold: don't engage yet) · **USA, Japan** Aug–Sep 2027 (compliance). Switzerland undated (Higi Berchtold), Germany self-service only (parked), Brazil parked. Launch = first clinics live (card due date); "BOB rollout [market] finished" about 90 days later. Retires the "Apr–Aug 2027 window (CH, DE, UAE, BR, USA, JP)". Separate from the WBS build dates and the official launch (place and date open). **Who maintains the board:** `market-rollout` owns what is on it and its structure (cards, stage and finished milestones, dates, followers, dependencies, descriptions; keeps Notion in step) and makes those edits itself after Sean says go, signing them "— Rock 'n' Rollout 🎸 (rollout agent, not Sean personally)"; its "rollout watch" checks the board against the calendar, roadmap and WBS. `asana-maintenance` does the routine hygiene there (move a card on a directive, Status field, update snippets, audit comments) | Sean: UAE has the fewest issues, then widen; market dates depend on the treatment plan (Jun 2027 per WBS) and compliance |
| 3 | 2026-11-11 | **Cloud thinks, PC posts.** IT blocks browser automation (built-in browser, Claude in Chrome, Remote Control) on the Curaden account and won't change it. So every scheduled agent runs as a cloud Routine on Curaden, and Webex posts go through the Notion **Webex outbox**; the one PC task, the **Webex courier** on the Personal desktop app (weekdays 08:02, 09:02, 12:02, 17:02), checks the sign-in, posts the outbox and runs Webex Sweep. Boom Boom (08:20), Roadmap watch (Mon 07:40) and Feedback QA (Fri 10:10) become Curaden Routines; the team update's outbox row is Held until Sean ticks Approved. The keep-alive is gone | Sean: IT will say no; keep what needs a browser on the Personal PC, everything else on Curaden, and make the PC side as small as possible |
| 4 | 2026-11-04 | **Scheduled agents post to Webex on their own**, the way Truth Catcher comments in Asana without asking: Webex Sweep posted one "Logged from this chat" note per space per run (replaced 12 Nov, decision 1); Feedback QA posts its PDF report to the QA space every Friday 10:40 when the rubric's threshold is met; Roadmap Watch posts a short summary with the report link to App Team every Monday. Each uses a marker so a rerun never double-posts. The team update still waits for Sean's "post it". Roadmap Watch stays a PC task (it needs Webex) | Sean: every scheduled agent can do its updates without asking; Truth Catcher does it for Asana, the others should do the same for Webex |
| 5 | 2026-10-28 | The Notion Product Roadmap and both Asana projects now follow Derek's **WBS "voice first"** (see Milestones). Old releases "V2 P1 Apr-27" and "Rollout Apr–Aug-27" are replaced by "Phase 1 Nov-26–Oct-27", "Phase 2 Oct-27–Aug-28" and "Later 2028" (old options kept until no row uses them). The Curaprox app has its own native lane (Epic "Curaprox app — native app"), tracked in Asana "Curaprox App" (`1209391102620806`) with dependencies on the BOB App tasks it needs. Rows not in the WBS (Coach Profile, translation country check, "patients use the plan" gate, IDB Challenge) are Unscheduled until Sean decides | Sean: the WBS is what Phinamic will build, so it wins over the roadmap on timing |
