# Handoff: state of curagents (5 Nov 2026)

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
| 1 | **App Support** is replaced by the 10 Nov spec (#58) and made autonomous by #59: answers on its own hourly 07:20–19:20 weekdays (Routine `trig_01NzNgUy17FxJiHFc8otT4oS`, Curaden), learns into `docs/app-support-faq.md`, sends bugs and gaps to Jira via In Development. Close PR #53 once #58 merges. Then: check the first live runs in the run log, write `skills/dev-triage/SKILL.md` (the spec inlines its rules until then), and walk Fabian through `docs/app-support-quickstart.md`. **13 Nov:** the connector can't invite new guests ("Not a valid actor ID"), so the spec now replies anyway and holds an `Invite` subtask for the owner (untick "Also invite to project"); the next run @mentions them. It also researches the board history, Jira BA and Notion before replying, and learns from owner replies. Mail (support@ / info@bobscore.com) waits for IT to approve a mail connector: then fill in the spec's "Mailboxes" status line | #53's email-draft model was superseded by Sean's 10 Nov brief | `agents/app-support.md`, `skills/dev-triage/` |
| 3 | Webex sign-out keeps happening even with a keep-alive. After the PC task is updated, check a week of `webex-keepalive` rows: if it still drops daily, make Claude in Chrome an accepted fallback for scheduled runs (not an error) and say so in the skill | Built-in browser signed out most days; Chrome fallback did the work | `skills/webex-web/SKILL.md`, `RUNTIME.md` |
| 4 | Webex Sweep triage moved to Asana (12 Nov): Sean adds the section **Webex inbox** on the BOB App board once (no API tool creates sections). Until then the sweep files triage tasks in Backlog with a `[Webex] ` prefix and says so in its run-log row. After the first run, check that the open WX rows became a few merged tasks, not twenty | Sean: review in Asana, fewer items, Webex only for Jira tickets | `agents/webex-sweep.md` |
| 5 | Run-log rows from Truth Catcher say Account `unknown`: the Personal routine prompt names no account. Fixed by the Curaden prompt; no action on Personal (its prompt can only be edited from its own session) | Monitoring | `docs/curaden-routines.md` |
| 6 | The Personal "Agent run log check" prompt only expects Truth Catcher and Boom Boom, so it won't flag missed Webex Sweep / team update / Jira sync runs. Fixed by the Curaden version (reads the registry) | Monitoring gap until migration | `docs/curaden-routines.md` |
| 7 | Sean's PC checkout of curagents isn't on `main` (Boom Boom logs it daily). Runs read `origin/main` so it's safe; tidy it when on the PC | Noise in run logs | PC |
| 8 | market-rollout's 30 Oct run edited `skills/market-rollout/references/markets.md` in a local worktree, not committed. Check it's in #51 or redo it | Possible lost Italy edits | `skills/market-rollout/references/markets.md` |
| 9 | Team update draft hasn't run since the Routine went missing; the Markets edition now also needs the launch KPIs from market-rollout. First Curaden run: check the draft picks them up | New dependency (#54) | `agents/announcements.md` |

## Useful IDs

- Agent control room `4157e8aabbb48194bb25e351664b6462`: Agent registry `collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418` · Agent run log `collection://9b260587-5c0d-4d90-947e-b6e10ba159df` · Webex outbox `collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d`
- Product Roadmap `collection://2ce24f93-f696-4d3b-98be-462df08c2c29` · Inbox `collection://35a7e8aa-bbb4-8126-9b9b-000b4b0a44db`
- Markets playbook `4087e8aabbb481e69b5cc1744133076b` · Launch KPIs `40f7e8aabbb48114bdbfe8715c020740`
- Personal Routines: Truth Catcher `trig_01BxmV4KaG4CPbZMU4GmMHa7`, Jira sync `trig_01EREg8Ra4divTV2Jomidy9g`, Run log check `trig_01AN1dTjvTV3YNhhmLAqV4tL`
- Jira cloudId `17835775-46a2-4e51-989d-809d887c4db5` (project BA) · Asana BOB App `1204489225205419`, App Tasks `1200298616652229`, Sean `1207214370347608`
