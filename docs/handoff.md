# Handoff: state of curagents (5 Nov 2026, latest section 25 Nov)

Read this after `CLAUDE.md`, `RUNTIME.md` and `dream.md` when you pick up maintenance
in a new session. Update it (or delete the lines that are done) by PR whenever you
finish one of the items, so the next session starts from the truth.

## Where things stand

- **`main`** has everything up to #54: built-in browser for Webex (#48), keep-alive
  every 2 hours with run-log rows (#50), voice-first WBS dates (#49), market-rollout
  agent (#51), scheduled agents posting to Webex on their own (#52), launch KPIs
  (#54).
- **All schedules still run on the Personal account.** The Curaden migration has
  done Phase 1 only (extract, #44). Prompts 2 and 3 in
  `docs/migration-mega-prompts.md` haven't been run.
- **Live scheduled tasks (Personal):** Truth Catcher scan (cloud, weekdays 07:58 +
  13:58), Bob roadmap jira sync (cloud, Thu 07:30), Agent run log check (cloud,
  weekdays 10:15), and on the PC Boom Boom Derek (08:45), the old hourly Webex
  keep-alive, Roadmap watch (Mon 08:00) and Roadmap dashboard refresh (Mon, should
  be off).
- **Not running anywhere yet:** Webex Sweep, Team update draft, Feedback QA report
  (Fri), the new Roadmap watch summary post. They start with mega prompts 2 and 3.

## 26 Nov: orchestrator runs daily, automatic practice approval, duplicate sign-ups

Sean asked for the orchestrator to run on its own and for the bob-admin CLI to approve
sensible practice registrations automatically (BA-324), with people who signed up
twice turned into an Asana conversation.

- **CLI** (`tools/bob-admin`): `practices check` (read-only verdicts),
  `practices auto-approve` (approves only what passes every check, notes it as
  automatic; `--max 10` a run) and `practices duplicates` (read-only). Rules and the
  run: `skills/bob-admin/SKILL.md` "Automatic approval" and "Practice approvals run".
  `BOB_ADMIN_AUTO_APPROVE=1` unlocks only auto-approve on prod. 103 tests pass (bob-admin + bob-qa).
- **First read-only run on prod (26 Nov):** 1 pending (84008, BR), held as a strong
  duplicate of the approved 84007 (the double sign-up Sean spotted). 13 duplicate
  groups with a practice from the last 30 days, all strong; 3 are internal (Curaden
  staff addresses), several pair a migrated old-app practice (25–28 Sep) with a new
  sign-up, so those people registered again instead of logging in.
- **Runs on Fabian's PC** ("Practice approvals (Fabian)", weekdays 08:50/12:50/16:50,
  setup `docs/app-support-quickstart.md` section 4): he owns support and BA-324, and
  Sean is away. Exceptions go on his "needs you" task; duplicates become App Tasks
  board tasks that App Support answers through his Review and invite flow.
- **Orchestrator daily** (cloud, weekdays 07:45, `agents/orchestrator.md` §8): moves
  tasks only by rules M1–M3 (completed but in an open column; Jira Done; assigned
  Webex Inbox tasks after 2 working days), the rest on a weekly "Board moves to
  decide" Inbox row.
- **Open (Sean or Fabian):** create the Routine "Orchestrator daily (Curaden)"
  (`docs/curaden-routines.md`) and the Agent registry rows "Orchestrator daily
  (Curaden)" and "Practice approvals (Fabian)"; Fabian does section 4 (install, prod
  sign-in, `BOB_ADMIN_AUTO_APPROVE`, the task). Training date and IDB fields are
  placeholders until Phinamic moves that checklist after approval (BA-324). The
  old BOB App task "Practice validation after sign-up: agree the approval logic with
  Suncica" (1220306765390995, In Development) is superseded by 1220905863349438: the
  first daily run will list it under moves to decide.

## 25 Nov: OralScan, escalations, Fabian's work, courier

Decisions (Sean, 25 Nov):
- **OralScan moves to Phinamic.** UDevHub won't continue on it. The spike report
  (`4237e8aabbb48193acd1f35ea0155506`, under the roadmap row "Curaprox app: OralScan
  discovery") found the production AI unreliable (score inflated, accuracy 0.40 vs the
  claimed 0.90, unstable scores, no training data or test set handed over). It also found
  patient photos, children's included, some with GPS, in the repository, and photos sent
  to OpenAI: take that to Tino now. A separate session drafts the options, the UDevHub
  hand-over checklist for Thu 26 Nov, the privacy note and a Phinamic brief, as child
  pages of the report. Drafts only until Sean says go.
- **Gently: no escalation.** Fabian handles it. Issue #97 is closed; Truth Catcher
  doesn't re-escalate it.
- **Shopify recommendation** (Asana 1219269079724491, Sony Nguyen, due 17 Nov):
  Phinamic should answer. Boom Boom chases it in the common chat from Thu 26 Nov (noted
  on its Notion page).
- **Fabian** runs the form requests with his own App Support agent (#101: his runs reach
  Notion through the API, once his key is set up). Sean's App Support covers him only
  while his registry row has no runs, and stops by itself after his first run. He also
  takes **automatic practice approval (BA-324)** with the bob-admin CLI (Asana
  1220905863349438).
- **Team update:** one round-up from 5 Nov to 26 Nov on Thu 26 Nov, replacing the two
  held drafts (Sean's notes are on Inbox row `4237e8aabbb4814e928bfb5c7a4302d5`).
  Marketing isn't taking BOB on for now; the Product Roadmap covers it. Say it neutrally.
- **Gisèle's account change** was answered by Fabian on 24 Nov; the held Review subtask
  1220715857418450 is closed.

- **New agent: Growth** (`agents/growth.md`, `skills/growth/`). Marketing no longer
  supports BOB, so user acquisition runs from it. Notion home is BOB Growth
  `4237e8aabbb4810f80ede5c7f3decc1f`, with the Growth experiments and Content calendar
  databases. It drafts only. Open for Sean: create the "Growth pulse (Curaden)" Routine
  (prompt in `docs/curaden-routines.md`), then flip its registry row to Curaden. The
  first useful run is "growth plan UAE".
- **Courier double firing is expected** (Sean switches sessions): step 0 in `RUNTIME.md`
  "Webex courier" now claims the slot, and a second copy stops before opening Webex.

Courier and Boom Boom should run on their own. Open on the Personal PC:
- Two courier sessions fired for the 25 Nov 09:02 slot. That's fine now: the slot
  claim (RUNTIME step 0) stops the second copy before it opens Webex.
- The old `boom-boom-derek` PC task still runs (24 and 25 Nov, no double posts). Switch
  it off.
- The 17:02 and 08:02 slots are often missed (PC asleep or app closed).

## 23 Nov: product overviews and the BOB App / Curaprox App pages

Done (all with Sean's OK):
- **Two overview decks** (EN, HTML + PDF), committed to `main` of the local
  App Website repo (`773ac12`, `0f62876`):
  - `Marketing/presentations/bob-overview`: Curaprox - BOB, 16 slides. Screens from
    the current build with test data anonymised, the chair screens in a real
    iPad Pro 11 frame.
  - `Marketing/presentations/curaprox-app-overview`: the Curaprox app and the
    treatment plan, 14 slides. Concept screens from the patient loop prototype
    (made-up names) in a real iPhone 18 Pro frame.
  - DE and IT versions are parked (Sean: "can wait for another time").
- **Notion hub pages revamped:**
  - **BOB App** (`1f37e8aabbb480efb62ac97d457cdf94`): "Today: live and in use in
    practices", the deck, key facts, what's next, getting started, a roadmap
    timeline filtered to BOB, boards.
  - **Curaprox App** (`1f37e8aabbb4800fa12fcc02fce98c69`): "The future: just about
    to start" (the 20 Nov direction), the deck, what's next, the current app's facts
    (maintenance), boards, and the old pre-merge roadmap view in a toggle.
  - A synced "Two apps, one loop" box sits on both (original on BOB App).
  - **App Overview** (`3957e8aabbb48098816df88ccd47f083`) only links to both pages.
  - "What is the Curaprox App" has a box on top: live today and staying like this
    for now, what's coming, and that how the two come together is still open.

Open:
- The [VERIFY] lists in both decks' `HANDOFF.md` (e.g. the concept screens still
  show the BOB logo, the final patient sign-in flow, the Curaprox app support
  channel once the plan is live).
- After any deck change: rebuild, then re-upload the PDF on its hub page.
- The session that switched the BOB mark to blue on curaprox-apps.com was archived
  before it reported back. It had published the blue mark; the coat-badge photo
  on the BOB pages was still open.

## 20–23 Nov: BOB Direction and the website

Done:
- **BOB Direction** (Sean approved 20 Nov): the synced block on 🎯 Goals & Objectives
  (`29b7e8aabbb48021ba93e6ad24b3b577`, shown in the BOB Kit) now says:
  - BOB is the core product, on the clinician side.
  - The Curaprox app goes ahead as the patient's treatment-plan app. Nothing is
    folded into BOB, and the Product Roadmap rows stay as they are.
  - BOB is for every clinician and taught through iTOP; iTOP isn't required.
  - Still no medical device and no PMS.
  The same iTOP line is on "What is the BOB App?" and "BOB: FAQ".
- **Website** (curaprox-apps.com, published 23 Nov): the English, German and Italian
  BOB app pages (`/app-pages/bob-app`, `/de/bob-app`, `/it/bob-app`) match the Notion
  "BOB: FAQ":
  - the iTOP line
  - "Curaprox - BOB" in the stores
  - the phone version on 14 Dec
  - Portuguese (Brazil)
  - users and practice details managed by the Practice Admin in BOB Admin
  - info@bobscore.com
  - Trend / First vs latest
  - assigning anonymous sessions
  The German and Italian feature sections and screenshots were brought up to the
  English page. The FAQ schema on the English page (what Google shows) matches too.
  The old Help & Support screenshot is gone.
- **Scheduled tasks on this PC:** `bob-roadmap-watch`, `asana-notion-sync` and
  `bob-roadmap-dashboard-refresh` are disabled (checked 23 Nov).

Website gaps left:
- the German and Italian pages have no "Open web app" buttons and no FAQ schema
- the German and Italian app labels used on the website weren't checked against the
  app: "Patientendetails anzeigen", "Patient zuweisen", "Visualizza dettagli
  paziente", "Assegna al paziente"
- the image alt texts on the German and Italian pages are still in English

## 18–20 Nov: Curaden switch, merges, BOB Kit and how-tos

The "Where things stand" list above dates from 5 Nov. On scheduling, this section and
the Notion Agent registry take precedence over it.

Done:
- **Agent registry:** Truth Catcher, Boom Boom Derek, Roadmap watch, Roadmap ← Jira
  sync and the Agent run log check are now Account = Curaden. These Personal cloud
  Routines are disabled: `trig_01BxmV4KaG4CPbZMU4GmMHa7` (Truth Catcher),
  `trig_01EREg8Ra4divTV2Jomidy9g` (Jira sync) and `trig_01AN1dTjvTV3YNhhmLAqV4tL`
  (run-log check). The Webex courier and Webex Sweep stay on Personal (PC, built-in
  browser).
- **Merged:**
  - #83: Inbox statuses `info only` and `done`.
  - #80: App Support playbook with info@bobscore.com + curaden.apps@curaden.ch,
    "Curaprox - BOB", the T5 partner onboarding template and the support-flow diagram.
  - #87: #85 rebased (attach screenshots before moving to In Development). #85 is
    closed.
- **BOB Kit** (`1fb7e8aabbb480d29c88cbd43aaee5fc`): restructured. The Legal toggle
  and Sabina were removed (Sean).
- **How-tos:**
  - Approve a practice is merged with the Subsidiary approval section.
  - System Requirements is merged into "BOB: Get access and devices".
  - Roles and permissions is the single roles reference.
  - Moved to Trash: System Requirements, Legacy Sign-Up, Mobile User Guide and
    IDB & BOB FAQs. Its clinical IDB facts moved into How to BOB.
  - 12 pages renamed "BOB: …" / "BOB Admin: …".
  - support@ became info@bobscore.com.
  - Practice Admin manages coaches.
- **Analytics page:** a BOB Admin section and the "BOB Admin — Monthly market stats"
  database.

Open for Sean:
1. Switch off the Personal PC task boom-boom-derek. It isn't in this PC's task list
   (23 Nov), so check the other account's PC. bob-roadmap-watch is already off.
2. Live build audit of bobscore.app / admin.bobscore.app (running locally on the PC):
   apply its findings. The how-tos were written from Notion, not checked against the
   build.
3. Access: the Notion workspace has only Sean (personal account) and integrations, so
   partners can't open the Kit or Academy pages unless they're published or shared by
   link. The options are:
   - publish the External pages as a read-only site (recommended now)
   - guest-invite Janine, Fabian and Blanca
   - move the App Hub to a Curaden workspace (raise with IT)
4. ~~Comparing BOB Scores~~: closed 20 Nov. Step 5 of "BOB: Patient record and
   progress" covers it, with a Compare BOB Score clip.
5. ~~Website FAQ (Webflow)~~: done 23 Nov (see 20–23 Nov).
6. The Legacy walkthrough video went to Trash with the Legacy page. Restore it if
   wanted.
7. The Audience of "BOB Admin: Approve a practice" is still Internal. Should it be
   External?
8. Check the score band labels in How to BOB (no inflammation / mild / moderate /
   severe) with Tino.
9. Questions for Phinamic:
   - when the approval checklist becomes optional
   - how Reject works
   - the phone minimum versions
   - the "BOB Admin access: None" label on Practice Admins
   These are queued in the Webex outbox for the common chat (23 Nov).
10. **Automatic practice approval (BA-324): coming soon, no date yet.** Sean decided on
    10 Nov to fully automate it (Suncica didn't answer): checks, approval and allocation
    to the market's subsidiary without a person, only exceptions to the subsidiary. It
    needs the IDB office / kit / training date checklist moved after approval, an
    exceptions queue and a decision log (`Projects\BOB Onboarding\CONCEPT.md` Stage 3).
    Marked 23 Nov on the roadmap row (renamed, P1, Admin Overhaul, Phase 1) and on
    "BOB Admin: Approve a practice". Still open: the Jira title says "agree the approval
    logic with Suncica", and Phinamic owes the plan and date. When it ships, rewrite
    Approve a practice, the Subsidiary guide and the BOB Academy approval module.
11. Open PRs from other sessions (as of 23 Nov):
    - #77 (App Support email drafts, learning from sent mail): draft. It was rebuilt on
      20 Nov on top of #79 and #80, so review it rather than close it. It needs the
      mail connector IT hasn't approved yet.
    - #78 is closed, not merged.
    - #81: a draft (Webex Sweep marker).
    - #88 (bob-admin CLI) and #89 (bob-qa CLI): merged 23 Nov.
    - #69 (rollout dates v2): open since 12 Nov.
    - #66 (Market Rollout Academy → BOB Academy) and #71 (Plaque Hunter game): drafts.
12. Earlier items:
    - tick Approved on the 5–12 Nov team update
    - decide on the external Task and Note Pipeline (it needs the Inbox statuses
      `task`/`approved` kept)
    - the duplicate App Support "needs you" task 1220619032608553

## 18 Nov: bob-admin CLI for BOB Admin

Sean asked for a CLI-Anything CLI for BOB Admin (reports, users, Super Users,
permissions, approvals, products, news, integrations). Built in `tools/bob-admin/`
from the platform API's own OpenAPI spec (141 endpoints, published on the test API's
Swagger page; prod hides it). Skill: `skills/bob-admin/SKILL.md`. Defaults to test
(admin-test.bobscore.app → API on `phinamic-api.quanht.site`); prod writes are
locked behind `BOB_ADMIN_PROD_WRITES=1`. Sean signed in on test (Super User
account) and every read command answered; a live write cycle on test (draft news:
create, read, edit, delete) worked and left nothing behind.

20 Nov (Sean: "make it for prod, really extensive, share with Phinamic and
Fabian, give it to the agents"): the prod admin makes the same API calls as test,
so it works on prod as-is; `call` adds 140 generated commands (every endpoint);
`--all` / `--fields` / `--ids` / `-` chain commands; `install.ps1` installs it
per user (`%USERPROFILE%\.bob-admin`, `-AddToPath`), pip/pipx from GitHub for
Phinamic. Wired in: orchestrator route (PC only), market-rollout (reads + a
dry-run grant command for Sean), app-support (owner's change task carries the
`bob-admin` line), `RUNTIME.md` row. 53 unit tests pass.

23 Nov: #88 merged, then #89 (`bob-qa`, the CLI for the BOB web app, for QA).
Sean signed in on prod (Super User) and a read-only pass answered on every read
command (practices, users, Super Users, subsidiaries, products, tabs, BOB values,
news, integrations, tickets, templates, all eight reports); nothing written, prod
writes still locked. Sean's install had no `-AddToPath`, so `bob-admin` wasn't
found by name: run the installer with `-AddToPath` and open a new terminal.

Still open:
- Fabian: run `install.ps1 -AddToPath` and sign in with his own admin account.
- Live writes in the other areas on test, one at a time with Sean's yes.
- Ask Phinamic: is the test API meant to sit on `quanht.site`? Can prod publish
  its spec, or offer a scoped admin token so automations needn't sign in as a
  person? Their planned MCP can use this CLI's command map as its scope.

## 13 Nov: the Inbox is the check-up log

Sean: the 🚩 Inbox wasn't used. It is now where he checks up on what the agents picked
up (`dream.md` §5 decision 1): Webex Sweep's item log, feedback for feedback-qa, and
Source `agent` rows for whatever needs him (orchestrator escalations, run-log check
findings). Done in Notion on 13 Nov: Source option `agent`, a database description,
the first tab "📥 Open" (only Status `new`: pushed, answered and dropped rows are
hidden, as Sean asked), "✅ Handled: last 7 days" (proof the agents work), "🤖 Agent
flags", "🗂️ Decisions & answers", and the linked view "Inbox: open" on the Agent
control room page. The one old `task` row (Blanca catch-up, already in Asana) was set
to `pushed`. The orchestrator spec was brought up to date (schedules,
outbox, live state from Notion instead of `dream.md` §4).

Still open:
- Old views "Awaiting approval" (Status `task`) and "Tickets by Kind" belong to the
  retired pipeline. Sean said delete them (13 Nov), but the Notion connector can't
  delete views: Sean removes them in Notion (right-click the view tab → Delete).
- Test and junk rows: moved to Trash on 13 Nov at Sean's request (the "QA 29 Sep"
  heuristic row, "s", "Hi All,", and the duplicate "- We have to start updating…";
  the two "[LIVE TEST]" rows were already in Trash; "Hello Sean" and "Morning hommies"
followed at Sean's request). Restorable from Notion Trash.
  Agents still never delete Inbox rows on their own.
- The Agent run log's **Agent** select may lack `orchestrator` and `run-log-check`;
  rows use `other` until Sean adds them.
- First Curaden "Agent run log check" after the merge: check it writes an Inbox row
  instead of only a chat message when something is wrong.

## 11 Nov (afternoon): Agent control room

Sean asked to tidy Agents & Other Projects. The Agent registry, Agent run log and Webex
outbox now sit together on **⚙️ Agent control room** `4157e8aabbb48194bb25e351664b6462`
(App Hub › Agents & Other Projects), above Agentic Models and Tuft. All `collection://`
and `view://` IDs are unchanged (each one checked after the move), so no Routine, PC
task or spec needed a change. `RUNTIME.md` "Where the agent tables live" says so for
every run. Still open: the Agentic Models page describes the 9 Oct setup (GitHub
Actions, old broadcast; no Boom Boom, App Support, Market Rollout or courier).

## 11 Nov (later): cloud thinks, PC posts

IT blocks browser automation on Curaden, so: every scheduled agent is a Curaden
Routine; Webex posts go through the Notion **Webex outbox**
(`collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d`, in the Agent control room);
the one PC task is the **Webex courier (Personal)** (weekdays 08:02, 09:02, 12:02,
17:02): sign-in check, post the outbox, Webex Sweep. Prompts: `docs/curaden-routines.md`
and `docs/migration-mega-prompts.md` (prompt 2 = seven Routines on Curaden, prompt 3 =
the courier on Personal). Sean runs prompt 2, then prompt 3.

## 11 Nov

- **Jira works again** (BA visible, no reconnect needed). BA-12 and BA-263 are still
  To Do: the BA workflow only allows To Do → In Progress, so Sean or Derek closes them.
- **Webex keep-alive retired** (Sean): every Webex run checks the sign-in itself, tells
  Sean once when signed out and posts a queued Boom Boom ping (`RUNTIME.md` "Webex
  sign-in"). Switch off the Personal keep-alive task.
- **Migration started.** App Support already runs on Curaden (10 Nov). Next: prompts 2
  and 3, then Phase 3 one switch a day (`docs/migration-to-curaden.md`).

## Synced 10 Nov

- **Jira guard** is now a shared rule in `dream.md` §2: 0 issues for BA or a 404 on a
  known key means the connector lost access, never "no changes". Boom Boom (9 Nov) and
  Roadmap Watch W45 had read the empty result as "no updates".
- **Official launch**: Sean's Asana task (6 Nov) says place and date are open (Milan not
  confirmed). `dream.md`, roadmap-watch, market-rollout and SCOPE now say so; the Notion
  milestone row and the launch KPIs page were renamed to match.
- **Boom Boom queue**: the old PC keep-alive still writes `.boom-boom-derek/outbox/`
  files and posts to Curaden / Phinamic with Derek only. Specs now say: never post from
  the outbox, move it onto the page, the space comes from the "Channel" rule. The real
  fix is Sean updating the PC keep-alive task (below).
- New in Asana: two curaden.de BOB tasks for Sascha Märtsch (Germany, due 16 Nov). If
  Germany starts, it's a light-touch partner (`skills/market-rollout/references/markets.md`).

## Synced 6 Nov (from the other instance's Notion work)

- **Partner onboarding** is one flow for every partner and internal team: Notion
  page `4107e8aabbb481c9a15fe680c321efd2` plus the email template
  `4107e8aabbb48125b595c2d72a33ff7d` (first sent to Curaden Czech, 6 Nov). The
  Training modules DB ("The School of BOB") now links each module's How-To pages.
  The market-rollout skill uses both (workflow 8b) and knows light-touch partners
  (Czech Republic) in `references/markets.md`.
- **Not synced: Agent 25 / App Website.** That work lives only in the local Marketing
  project on Sean's PC (Windows, not reachable from cloud sessions). To share it, have
  that session commit it to a repo or write a summary page in Notion.

## Needs Sean (he can't be done by an agent)

1. **Reconnect Atlassian** with the curaden-apps account that can see Jira project
   BA. The current login sees no projects: the 5 Nov Jira sync failed ("project = BA
   returned 0 issues") and BA-12 / BA-263 couldn't be closed.
2. **Webex sign-in** in the desktop app's built-in browser keeps dropping (signed out
   29 Oct–5 Nov most mornings). Sign in with Ctrl+Shift+B; Boom Boom fell back to
   Chrome on most days.
3. **Update the Personal PC tasks:** keep-alive to the paste-once prompt, every 2
   hours (`5 7-17/2 * * 1-5`); switch off `bob-roadmap-dashboard-refresh`. Prompt in
   the 30 Oct chat, same as `RUNTIME.md` "Scheduled task prompts (PC)".
4. **Run migration prompts 2 and 3** (`docs/migration-mega-prompts.md`), then flip
   Account one registry row at a time (`docs/migration-to-curaden.md` Phase 3).
5. **Decisions in Asana** ("Decide the open WBS items and close BA-12 / BA-263",
   `1220062777709329`): Coach Profile / translations check / "patients use the plan"
   gate, IDB Challenge timing with Blanca, "DP near me" date, and whether the Phase 1
   scope line in `dream.md` should include in-app checkout and OralScan (the WBS
   does).
6. **Launch KPIs** (Notion `40f7e8aabbb48114bdbfe8715c020740`): confirm the targets
   with Fabian and Niklas Strom; decide whether a simple per-clinic step count
   (K1–K6) moves into Phase 1 (reporting is Phase 2, Sep 2027).
7. **Italy rollout page** `4097e8aabbb4800d8cf5ffb8c45bc397`: two sessions wrote it on
   30 Oct; the live version has unsourced market facts. Pick the version.
8. Truth Catcher (5 Nov) suggests updating the Referral Program roadmap row's release
   to match the UAE referral MVP (Mar 2027).

## Agent refinements to do (maintenance session)

| # | What | Why | Where |
|---|------|-----|-------|
| 1 | **App Support** is replaced by the 10 Nov spec (#58) and made autonomous by #59: answers on its own hourly 07:20–19:20 weekdays (Routine `trig_01NzNgUy17FxJiHFc8otT4oS`, Curaden), learns into `docs/app-support-faq.md`, sends bugs and gaps to Jira via In Development. Close PR #53 once #58 merges. Then: check the first live runs in the run log, write `skills/dev-triage/SKILL.md` (the spec inlines its rules until then), and walk Fabian through `docs/app-support-quickstart.md`. **13 Nov:** Sean put a check back in ("we need to validate"): App Support writes every reply on the task, where only the team sees it, and holds a `Review` subtask; the owner edits it if needed and adds the submitter (untick "Also invite to project") to send it, and the next run @mentions them. It never invites or adds followers itself (the connector can't invite new guests anyway). **18 Nov:** each reply now picks a route: one-off answers go by email (the owner sends the ready email from Outlook), anything that needs an answer back stays on the Asana route; runs log whether submitters reply by email or in Asana (`replies_in`) to see if the Asana route works for people who don't log in. **18 Nov:** Fabian owns every request, BOB included, and deploys it on his side (Sean: "I cannot handle this many agents"): his Routine plus a PC task "App Support invites (Fabian)" that adds requesters once he ticks their Review subtask (Claude in Chrome). Sean's Routine only covers Fridays and outages. Setup is one prompt in `docs/app-support-quickstart.md`. Open: does Fabian have BOB Admin access (else BOB Admin change subtasks go back to Sean)? It also researches the board history, Jira BA and Notion before replying, and learns from owner replies. Mail (support@ / info@bobscore.com) waits for IT to approve a mail connector: then fill in the spec's "Mailboxes" status line | #53's email-draft model was superseded by Sean's 10 Nov brief | `agents/app-support.md`, `skills/dev-triage/` |
| 3 | Webex sign-out keeps happening even with a keep-alive. After the PC task is updated, check a week of `webex-keepalive` rows: if it still drops daily, make Claude in Chrome an accepted fallback for scheduled runs (not an error) and say so in the skill | Built-in browser signed out most days; Chrome fallback did the work | `skills/webex-web/SKILL.md`, `RUNTIME.md` |
| 4 | Webex Sweep triage moved to Asana (12 Nov): Sean adds the section **Webex inbox** on the BOB App board once (no API tool creates sections). Until then the sweep files triage tasks in Backlog with a `[Webex] ` prefix and says so in its run-log row. After the first run, check that the open WX rows became a few merged tasks, not twenty | Sean: review in Asana, fewer items, Webex only for Jira tickets | `agents/webex-sweep.md` |
| 5 | Run-log rows from Truth Catcher say Account `unknown`: the Personal routine prompt names no account. Fixed by the Curaden prompt; no action on Personal (its prompt can only be edited from its own session) | Monitoring | `docs/curaden-routines.md` |
| 6 | The Personal "Agent run log check" prompt only expects Truth Catcher and Boom Boom, so it won't flag missed Webex Sweep / team update / Jira sync runs. Fixed by the Curaden version (reads the registry) | Monitoring gap until migration | `docs/curaden-routines.md` |
| 7 | Sean's PC checkout of curagents isn't on `main` (Boom Boom logs it daily). Runs read `origin/main` so it's safe; tidy it when on the PC | Noise in run logs | PC |
| 8 | market-rollout's 30 Oct run edited `skills/market-rollout/references/markets.md` in a local worktree, not committed. Check it's in #51 or redo it | Possible lost Italy edits | `skills/market-rollout/references/markets.md` |
| 9 | Team update draft hasn't run since the Routine went missing; the Markets edition now also needs the launch KPIs from market-rollout. First Curaden run: check the draft picks them up | New dependency (#54) | `agents/announcements.md` |

## Useful IDs

- Agent control room `4157e8aabbb48194bb25e351664b6462`: Agent registry `collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418` · Agent run log `collection://9b260587-5c0d-4d90-947e-b6e10ba159df` · Webex outbox `collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d`
- Product Roadmap `collection://2ce24f93-f696-4d3b-98be-462df08c2c29` · Inbox `collection://35a7e8aa-bbb4-8126-9b9b-000b4b0a44db` (📥 Open `view://35a7e8aa-bbb4-81b0-ad04-000ce39a2df1`, ✅ Handled `view://4177e8aa-bbb4-8111-848f-000ce8c2e1f6`)
- Markets playbook `4087e8aabbb481e69b5cc1744133076b` · Launch KPIs `40f7e8aabbb48114bdbfe8715c020740`
- Personal Routines: Truth Catcher `trig_01BxmV4KaG4CPbZMU4GmMHa7`, Jira sync `trig_01EREg8Ra4divTV2Jomidy9g`, Run log check `trig_01AN1dTjvTV3YNhhmLAqV4tL`
- Jira cloudId `17835775-46a2-4e51-989d-809d887c4db5` (project BA) · Asana BOB App `1204489225205419`, App Tasks `1200298616652229`, Sean `1207214370347608`
