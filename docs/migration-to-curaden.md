# Migration to the Curaden account

One clean move of curagents and its automations from Sean's **Personal** Claude
account to the **Curaden AG** account. Started 23 Oct 2026. Personal is expected
to go within about six months.

Shortcut: `docs/migration-mega-prompts.md` has three paste-in prompts that do
Phases 1 and 2.

## What moves, what stays

| Moves to Curaden | Stays on Personal |
|------------------|-------------------|
| This repo (`Curadenapps/curagents`) and every agent in it | iTOP agent (education-agent repo) |
| All its schedules: cloud Routines and PC scheduled tasks | Marketing work |
| The Notion pieces it runs on: Agent registry, Agent run log, the inbox, Team Updates, Roadmap Reports | Website and game design projects |
| The connectors it needs (below) | Other minor personal projects |

The Notion and Asana data itself doesn't move: both accounts reach the same
workspaces. What moves is **who runs things**: the Routines, the scheduled tasks
and the connectors.

## Phase 1: extract (nothing may live only on Personal)

| What | Where it lives today | Status |
|------|----------------------|--------|
| Agent specs, skills, scripts | This repo | ✅ Already here |
| Cloud Routine prompts | Personal Routines | ✅ Archived in `docs/personal-routines-archive.md`; Curaden versions in `docs/curaden-routines.md` |
| Jira sync steps | Only in its Routine prompt | ✅ Moved to `docs/curaden-routines.md` "Jira sync steps" |
| PC scheduled task files | `~/.claude/scheduled-tasks/*/` on Sean's PC | ⬜ Run the extract prompt below |
| Personal Claude Code settings, hooks, local skills | `~/.claude/` on Sean's PC | ⬜ Same extract prompt |
| claude.ai skills (agenda-planner, asana-task-maker, curaden-webflow, my-writing-style, prd-agent, morning) | Personal claude.ai account | ⬜ Re-add on Curaden (Settings → Skills). `my-writing-style` and `curaden-webflow` matter to the agents |

**Extract prompt** (paste into Claude Code on the PC, **Personal** desktop app, in the
curagents folder):

> Branch `chore/extract-pc-tasks` from `origin/main` in my curagents folder. Copy
> into `pc-tasks/` every scheduled task file under `~/.claude/scheduled-tasks/`
> that belongs to curagents (Boom Boom, Webex keep-alive, Webex Sweep, roadmap
> watch, roadmap dashboard refresh, Asana ↔ Notion sync), one folder per task,
> plus a `pc-tasks/README.md` listing each task's name, schedule and on/off state
> from the desktop app. Skip anything for iTOP, marketing, website, game design or
> other personal projects. Before committing, read every file and remove tokens,
> passwords, cookies and personal data (replace with `<redacted>`). Open a PR with
> the list of files, and don't merge it: the maintenance session reviews it.

## Phase 2: set up on Curaden

1. **Claude account (Curaden AG):** connect Notion, Asana, Atlassian (Jira +
   Confluence), GitHub (with access to `Curadenapps/curagents`), Google Drive, and
   Figma and Webflow if those agents are used. Fireflies only if meeting-notes'
   fallback is wanted.
2. **Desktop app (Curaden):** sign in, open the `curagents` folder, and connect
   **Claude in Chrome** to this app, with Webex signed in in Chrome.
3. **Routines:** create the five from `docs/curaden-routines.md` (Truth Catcher
   scan, Roadmap ← Jira sync, Agent run log check, Team update draft, Roadmap
   watch).
4. **PC tasks:** create the three from `docs/curaden-routines.md` (Webex keep-alive
   08:35, Boom Boom Derek 08:45, Webex Sweep 11:40 + 16:40), names ending
   "(Curaden)".
5. **Registry:** for each one, set **Started by** to its exact Curaden name.

## Phase 3: switch over, one at a time

For each item, in this order (least risky first): Roadmap watch → Agent run log
check → Team update draft → Jira sync → Truth Catcher → Webex keep-alive → Boom
Boom Derek → Webex Sweep.

1. Flip **Account** to `Curaden` on its registry row.
2. Wait for its next run: one run-log row from Curaden, and a `no-op` "switch:
   assigned to Curaden" row from the Personal copy if that one fired too.
3. Delete the Personal Routine, or switch off the Personal PC task.

The switch check means nothing runs twice while both copies exist.

## Phase 4: decommission Personal (for curagents)

- [ ] No registry row has Account `Personal`.
- [ ] Personal Routines for curagents deleted: Truth Catcher scan
      (`trig_01BxmV4KaG4CPbZMU4GmMHa7`), Bob roadmap jira sync
      (`trig_01EREg8Ra4divTV2Jomidy9g`), Agent run log check
      (`trig_01AN1dTjvTV3YNhhmLAqV4tL`), App team weekly digest
      (`trig_01SSNP4LY2MGnECbNbZFouJJ`, already disabled).
- [ ] Personal PC tasks for curagents switched off: Boom Boom Derek, Boom Boom
      queued, Webex keep-alive, Roadmap watch, Roadmap dashboard refresh, Asana ↔
      Notion sync.
- [ ] A week of run-log rows from Curaden only, no misses.
- [ ] `RUNTIME.md` "Accounts" says Personal holds no curagents schedules.

Personal keeps the iTOP agent, marketing, website, game design and minor projects.
