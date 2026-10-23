# Migration mega prompts

Three prompts that do the whole move from `docs/migration-to-curaden.md`. Paste
each one where it says, in this order. Each prompt reads the details from this repo
(`docs/curaden-routines.md`, `RUNTIME.md`), so nothing here goes stale.

| # | Paste into | Does |
|---|-----------|------|
| 1 | **Personal** desktop app, curagents folder, on the PC | Phase 1: saves the PC task files into the repo (PR, not merged) |
| 2 | **Curaden** claude.ai/code, new session on `Curadenapps/curagents` | Phase 2: the five cloud Routines + registry Started by |
| 3 | **Curaden** desktop app, curagents folder, on the PC | Phase 2: the three PC tasks + Chrome/Webex check |

Then Phase 3 (flip **Account** one row at a time) stays with Sean: prompt 2 and 3
never flip it, so nothing runs twice.

---

## 1. Extract (Personal desktop app, PC)

```text
Migration step 1 of 3 for curagents (docs/migration-to-curaden.md, Phase 1).

In my curagents folder: git fetch origin main, then create branch
chore/extract-pc-tasks from origin/main.

Copy into pc-tasks/ every scheduled task under ~/.claude/scheduled-tasks/ that
belongs to curagents (Boom Boom Derek, Boom Boom queued, Webex keep-alive, Webex
Sweep, Roadmap watch, Roadmap dashboard refresh, Asana <-> Notion sync, and any
other task whose prompt mentions curagents, Webex, Asana, Notion or Jira for BOB).
One folder per task, files as they are. Also copy, if they exist, the curagents
parts of ~/.claude/settings.json (hooks, permissions) into
pc-tasks/claude-settings-curagents.json.

Skip everything for iTOP, marketing, website, game design and other personal
projects: those stay on Personal.

Write pc-tasks/README.md: one row per task with name, schedule (as the desktop
app shows it), on/off, and what it does in one line.

Before committing, read every copied file and replace tokens, passwords, cookies,
emails and phone numbers with <redacted>. Commit, push, and open a PR to main
titled "chore: extract PC scheduled tasks for the Curaden move" listing the files.
Do NOT merge it. Don't change, pause or delete any scheduled task.
```

## 2. Cloud Routines (Curaden, claude.ai/code)

Start a new session on the **Curaden** account with repository
`Curadenapps/curagents` and the Notion, Asana, Atlassian and GitHub connectors on.

```text
Migration step 2 of 3 for curagents. I'm on the Curaden AG Claude account; you
set up its cloud scheduled tasks. Read from origin/main: RUNTIME.md ("Accounts
and the switch", "Migration to Curaden"), docs/migration-to-curaden.md and
docs/curaden-routines.md. Don't change any repo file; don't merge or push.

1. Check the connectors: make one read call each to Notion (fetch the Agent
   registry, collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418), Asana (project
   1204489225205419), Atlassian (Jira project BA, cloudId
   17835775-46a2-4e51-989d-809d887c4db5) and GitHub (Curadenapps/curagents). Any
   that fails: stop and tell me which connector to add.

2. List the scheduled tasks already on this account. For each of the five below
   that doesn't exist yet, create it: a fresh session on every run, repository
   Curadenapps/curagents, connectors Notion, Asana, Atlassian, GitHub, and the
   prompt copied word for word from its section in docs/curaden-routines.md.
   Times are Europe/Zurich (use CRON_TZ=Europe/Zurich):
   - "Truth Catcher scan (Curaden)"      weekdays 07:58 and 13:58
   - "Roadmap ← Jira sync (Curaden)"     Thursdays 07:30
   - "Agent run log check (Curaden)"     weekdays 10:15
   - "Team update draft (Curaden)"       Thursdays 14:00
   - "Roadmap watch (Curaden)"           Mondays 08:00
   If a run needs a separate scheduled task per time, create two with the same
   name plus " (am)" / " (pm)".

3. In the Agent registry, on each matching row, set Started by to the exact name
   you created (keep any Personal name there too, separated by " / ", until the
   Personal copy is gone). Leave Account as it is: I flip it one row at a time.
   If a row is missing (e.g. Team update draft), tell me; don't create it.

4. Report a table: name, schedule, next run, trigger id, registry row updated
   (yes/no). Then the Phase 3 order from docs/migration-to-curaden.md so I know
   which Account to flip first.
```

## 3. PC tasks (Curaden desktop app, PC)

Sign in to the desktop app with the **Curaden** account, open the curagents
folder, and connect Claude in Chrome to this app (Webex signed in in Chrome).

```text
Migration step 3 of 3 for curagents. This desktop app is on the Curaden AG
account. In my curagents folder: git fetch origin main; if on main and clean,
git pull --ff-only, else read files with git show origin/main:<path>. Read
RUNTIME.md ("PC runs", "Accounts and the switch"), docs/curaden-routines.md
("PC scheduled tasks") and skills/webex-web/SKILL.md. Don't merge or push.

1. Check the setup: Claude in Chrome answers, a Webex web tab can be opened and
   is signed in (never type credentials; if it asks to sign in, stop and tell me),
   and the Notion and Asana connectors work. Anything missing: stop and say what.

2. If pc-tasks/ exists on origin/main (from the extract PR), use the Webex
   keep-alive steps from pc-tasks/; otherwise tell me the keep-alive needs its
   steps copied into the repo first and skip that one task.

3. Create these desktop scheduled tasks (Europe/Zurich, weekdays), each with the
   shared PC prompt from docs/curaden-routines.md, {name} filled in:
   - "Webex keep-alive (Curaden)"  08:35
   - "Boom Boom Derek (Curaden)"   08:45
   - "Webex Sweep (Curaden)"       11:40 and 16:40
   If you have no tool to create desktop scheduled tasks, give me the exact
   name, time and prompt for each to paste in by hand.

4. Agent registry (Notion, collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418):
   set Started by on each matching row to the name above (keep the Personal name
   after " / " until that copy is off). Leave Account as it is.

5. Do one supervised dry check: run "check webex" in dry-run (read the watched
   spaces, show what Webex Sweep would write, write nothing). Report it with a
   table of the three tasks and their next run.
```

## After the three prompts

Switch over in the order in `docs/migration-to-curaden.md` Phase 3: flip
**Account** to `Curaden` on one registry row, check the next run-log row, then
delete or switch off the Personal copy. Phase 4 is the decommission checklist.
