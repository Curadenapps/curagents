# Runtime

Where each agent runs, what starts it, and how runs are checked. Agreed with Sean on
16 Oct 2026.

## The model

| Layer | Lives in | Owned by |
|-------|----------|----------|
| **What** an agent does (specs, skills, scripts) | This repo, `main` | The cloud maintenance session: every change goes through a PR |
| **When** it runs (schedules, triggers) | Claude on Sean's PC (desktop app scheduled tasks) for browser work; Claude Routines in the cloud for connector-only work | Sean sets each one up once |
| **Who** runs it (which Claude account) | The **Agent registry** in Notion (below, "The switch") | Sean flips one field |
| **The run** | A fresh session that reads the specs from `origin/main` and follows them | Automatic |
| **Checking and fixing** | The Agent run log in Notion, read by the cloud maintenance session every weekday | The cloud session: it fixes specs by PR; the next run picks the fix up |

Why the split: Webex has no connector, so anything that posts to or reads Webex
needs Sean's Webex sign-in in the Claude desktop app's built-in browser (`skills/webex-web/SKILL.md`), and only a session on his PC has
it. Everything else (Notion, Asana, Jira, Confluence, GitHub, Drive) has a connector
and runs more reliably in the cloud, without the PC being on.

## Accounts and the switch

Sean has two Claude accounts on the same PC (agreed 23 Oct 2026):

| Account | Job | Future |
|---------|-----|--------|
| **Curaden** | Runs the automations: cloud Routines and PC scheduled tasks | Stays. Everything durable moves here |
| **Personal** | Builds: specs, PRs, design, heavy one-off work | Goes away later. Nothing may live only here: its work lands in this repo or Notion |

Both desktop apps read the same task files in `~/.claude/scheduled-tasks/`, but each
app keeps its own schedule and on/off state, and each account has its own cloud
Routines. So a task registered on both accounts would run twice. The switch stops that.

**Agent registry** `49feb8b53b6c41838cf4cb916fcbb205`
(data source `collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418`), under Goals &
Objectives, next to the Agent run log. One row per agent run, with **Account**
(`Curaden`, `Personal`, `Paused`, `On request`), Where, Started by, Schedule, Spec,
Run log name, and **Last run** (rolled up from the run log). It is the full list of
what runs where; the table below is the background.

**The switch.** Every scheduled run starts by checking its registry row:

1. Its prompt names the account it runs on (`Account: Curaden` or `Account: Personal`,
   see the paste-once prompt below). A prompt that names no account is from before
   23 Oct: skip the check, run as before, and log Account `unknown`.
2. Find the row whose **Started by** names this task or Routine. If **Account** is
   `Paused`, or names the other account, write a run-log row with Outcome `no-op` and
   Summary `switch: assigned to {Account}`, and stop.
3. If the registry can't be read, write a `failed` row with the reason and stop.
   Running blind could double a run.

Moving an agent to the other account: set up its scheduled task or Routine there with
the account-aware prompt, then change **Account** on its row. The next run on each
side follows the row. Neither account's copy has to be deleted. Runs Sean starts by
asking ("boom boom", "post it") skip the switch and run wherever he asks.

## Migration to Curaden (decided 23 Oct 2026)

The step-by-step runbook is `docs/migration-to-curaden.md`; paste-ready Curaden prompts are in
`docs/curaden-routines.md`. iTOP agent, marketing, website, game design and other
personal projects stay on Personal; curagents and its automations move.

**Curaden runs everything on a schedule. Personal builds.** The Personal account
is expected to go within about six months, so from now on:

- **Curaden** holds every scheduled task and Routine, and the on-request ops runs
  ("boom boom", "post it", "check webex").
- **Personal** holds no schedules once the move is done. It is the build and
  maintenance seat: spec and skill changes by PR, design, analysis, testing a new
  agent before it gets a schedule on Curaden. Nothing may live only on Personal.
- Move one item at a time: set it up on Curaden with the `Account: Curaden` prompt,
  flip **Account** on its Agent registry row, check its next run-log row, then
  delete the Personal copy (Routines) or switch it off (PC tasks).

| Item | Today | Decision | On Curaden as |
|------|-------|----------|---------------|
| Webex Sweep | — | **Keep** (new) | PC task "Webex Sweep (Curaden)", 11:40 + 16:40 |
| Boom Boom Derek | Personal PC | **Keep, move** | PC task "Boom Boom Derek (Curaden)", 08:45 |
| Truth Catcher scan | Personal Routine | **Keep, move** | Routine, 07:58 + 13:58 |
| Roadmap ← Jira sync | Personal Routine | **Keep, move** | Routine, Thu 07:30 |
| Agent run log check | Personal Routine (`trig_01AN1dTjvTV3YNhhmLAqV4tL`) | **Keep, move** (it is the monitoring) | Routine, weekdays 10:15 |
| Team update draft | Missing (Routine gone) | **Keep, recreate** | Routine, Thu 14:00 |
| Roadmap watch | Personal PC, Mon 08:00 | **Keep, move to the cloud**: it only uses connectors, so it shouldn't need the PC | Routine, Mon 08:00 |
| Roadmap dashboard refresh | Personal PC, 09:15 | **On request** (Sean, 23 Oct): switch its schedule off and run it on click | — |
| Boom Boom queued | Personal PC, 14:00 | **Retire**: the Webex keep-alive posts queued pings now (28 Oct) | — |
| Webex keep-alive | Personal PC, hourly 07–20 | **Every 2 hours**, weekdays 07:05–17:05 (28 Oct). It runs in the desktop app's built-in browser, a separate browser from Sean's Chrome, so it no longer knocks his own Webex tab offline. It keeps the sign-in warm, tells Sean once when Webex is signed out, and posts a queued Boom Boom ping | PC task "Webex keep-alive (Curaden)", `5 7-17/2 * * 1-5` |
| Asana ↔ Notion sync | Paused | **Retire**: Webex Sweep now pushes approved inbox rows to Asana; running both would duplicate tasks | — |
| App team weekly digest | Personal Routine, disabled | **Delete**: replaced by the team update | — |
| Everything "On request" | — | Stays on request, run from whichever account Sean is in | — |

## Where each agent runs

| Agent | Where | Started by | Notes |
|-------|-------|------------|-------|
| `boom-boom-derek` | **PC** | Desktop app scheduled task "Boom Boom Derek" (weekdays 08:45 Zurich); "boom boom" any time | Posts to the common chat (QA space) for the Phinamic team, or Curaden / Phinamic for Derek-only items. A ping that can't go out (or a cloud "boom boom") is queued on its Notion page; the next Webex keep-alive posts it |
| `announcements` (post) | **PC** | Sean's "post it" | Posting stays behind Sean's approval of each draft |
| `announcements` (draft) | Cloud | Claude Routine "Team update draft" (Thu 14:00 Zurich) | The routine `trig_01Pi2NPoRWRP6MStWHVzzkDm` named in the spec no longer appears in the Routines list: recreate it or draft on "team update" |
| `feedback-qa` (report) | **PC** | "send QA report" | The PDF goes to the Webex QA space |
| `meeting-notes` | **PC** | "meeting notes" | Reads Webex meeting summaries and transcripts |
| `truth-catcher` | Cloud | Claude Routine "Truth Catcher scan" (`trig_01BxmV4KaG4CPbZMU4GmMHa7`), weekdays 07:58 + 13:58 Zurich | Asana, Notion, GitHub connectors |
| Roadmap ← Jira sync | Cloud | Claude Routine "Bob roadmap jira sync" (`trig_01EREg8Ra4divTV2Jomidy9g`), Thu 07:30 Paris | The only automation that writes roadmap rows from Jira |
| `roadmap-watch` | Cloud | "roadmap watch" (no schedule yet) | Weekly Monday report once a routine exists |
| `webex-sweep` | **PC** | Desktop app scheduled task "Webex Sweep" (weekdays 11:40 + 16:40 Zurich); "check webex" any time | Reads the watched Webex spaces and new meeting action items; writes Notion inbox rows, Asana update comments and approved inbox rows to Asana. Never posts in Webex |
| Everything else | Wherever Sean asks | Trigger phrases in each spec | |

## Rules for every run

0. **Scheduled runs check the switch first** (above). A run that isn't its account's
   turn logs `no-op` and stops before reading anything else.
1. **Fresh session, latest specs.** Start with `git fetch origin main`. If the
   checkout is on `main` and clean, `git pull --ff-only`; otherwise read the files
   from `origin/main` (`git show origin/main:<path>`). Never merge or rebase.
2. **Runs never edit agent specs, skills or scripts.** If a spec is wrong or a step
   fails, say so in the run log's Error column. Fixes go through a PR from the
   maintenance session, so there is only ever one version.
3. **Always write one run-log row, even on failure** (below). A run with no row
   counts as missed.
4. **Never type credentials.** A sign-in prompt is a failed run with the reason
   logged.

## Agent run log

Notion database **Agent run log** `a4c371ee506c4d0fa5dde1fb11bd2657`
(data source `collection://9b260587-5c0d-4d90-947e-b6e10ba159df`), under Goals &
Objectives. One row per run, written as the run's last step:

| Column | Value |
|--------|-------|
| Run | `{agent} {YYYY-MM-DD HH:mm}` (Zurich time) |
| Agent | The agent's name (`other` if not listed) |
| When | Date and time of the run |
| Where | `PC` or `Cloud` |
| Account | `Curaden` or `Personal`, from the prompt; `unknown` if the prompt names none |
| Registry | The agent's row in the Agent registry (this fills its **Last run**) |
| Outcome | `posted` (something went out), `ok` (work done, nothing to post), `no-op` (nothing to do), `partial`, `failed` |
| Summary | One or two lines: what it did, with ids |
| Error | The exact error or blocker, or empty |
| Spec commit | `git rev-parse --short origin/main` at the start of the run |
| Link | The page, post or PR the run produced |
| Reviewed | Left empty; the maintenance session ticks it |

## Monitoring

The cloud maintenance session ("Boom Boom Derek agent") checks the run log every
weekday at 10:15 Zurich:

- Every PC and cloud run due since the last check has a row. A missing row is a
  missed run: say so to Sean once.
- Rows with `failed` or `partial`: find the cause. If the spec, skill or script is
  wrong, open a PR with the fix; the next run picks it up through `git fetch`. If
  it's the PC (asleep, desktop app closed, Webex signed out), tell Sean what to fix.
- Two rows for the same scheduled run from different accounts is a double run: say
  so to Sean once, naming the account that should pause its copy.
- A registry row whose **Last run** is older than its schedule allows is a missed run.
- Tick **Reviewed** on every row it has looked at.
- Nothing wrong: no message.

## Scheduled task prompts (PC)

Set these up once in the Claude desktop app as scheduled tasks on the `curagents`
folder. Each run starts a fresh session, so nothing piles up. The prompts only
point here: what a run does lives in this file and the agent specs on `main`, so a
change merged here reaches the next run without touching the scheduled task.

**Paste-once prompt** (replace `{name}` with the run's name below and `{account}`
with `Curaden` or `Personal`, the account whose desktop app holds the task):

> Account: {account}. In my curagents folder run `git fetch origin main`. If the
> checkout is on `main` and clean, `git pull --ff-only`; otherwise don't merge
> anything and read every file from `origin/main` (`git show origin/main:<path>`).
> Check the switch as `RUNTIME.md` describes, then do the "{name}" run exactly as
> `RUNTIME.md` describes under "PC runs". Live: don't ask me first.

The task files are shared on disk, so give each account's task its own name, e.g.
"Boom Boom Derek (Curaden)", and put that name in the registry row's **Started by**.
Cloud Routine prompts take the same `Account:` first line.

| Scheduled task | When (Zurich) | `{name}` |
|----------------|---------------|----------|
| Boom Boom Derek | Weekdays 08:45 | Boom Boom Derek |
| Webex keep-alive | Weekdays 07:05, then every 2 hours to 17:05 | Webex keep-alive |
| Webex Sweep | Weekdays 11:40 and 16:40 | Webex Sweep |

## PC runs

Every PC run reads `RUNTIME.md` and `dream.md` §2–3 first and ends with one row in
the Agent run log. Runs never edit specs or push.

### Boom Boom Derek

Read `skills/webex-web/SKILL.md` and `agents/boom-boom-derek.md`, and follow the
agent spec exactly: refresh the Boom Boom Derek page, read the common chat, the
Curaden / Phinamic space and the team's meetings in Webex web, and post today's ping
(or the page's queued ping) in the space the spec's "Channel" rule names, through
the desktop app's built-in browser with `scripts/webex-post.js` if the rules say so. If you can't post
after the skill's retries, log it on the page and in the run log.

### Webex keep-alive

Steps that ran on the Personal PC are archived in `pc-tasks/webex-keepalive/SKILL.md`;
this section is what runs now. Quick and quiet: it runs every 2 hours.

1. Open Curaden / Phinamic in the desktop app's built-in browser (`preview_start`,
   or `navigate` to reload if the pane is open; `skills/webex-web/SKILL.md`). No
   built-in browser: log `failed` and stop (never fall back to Chrome here).
2. Signed in or out: the sign-in check in the archived steps (step 2). Never type
   credentials or click sign-in, cookie or consent buttons.
3. **Signed out:** tell Sean (`PushNotification`: "Webex signed out in Claude's
   built-in browser. Open Claude desktop, Ctrl+Shift+B, sign in to web.webex.com.")
   unless a keep-alive row in the Agent run log from the last 4 hours already says
   "signed out". Log `partial` with "signed out", stop.
4. **Signed in:** open the Boom Boom Derek page. No "📤 Queued ping", or a Boom Boom
   message already posted today (ping history): log `ok` ("kept alive") and stop.
   Otherwise follow "Workflow" step 7 of `agents/boom-boom-derek.md`: check the queued
   ping against the space (anything already answered there gets dropped; if the team
   replied in a way that changes it, leave it queued and tell Sean), post it in the
   space the queued section names, record it in the ping history and delete the
   queued section. A queued ping from an earlier day is stale: delete it and note it.

### Manual PC runs

For "post it" (announcements), "send QA report" (feedback-qa) and "meeting notes",
start with the paste-once prompt's fetch step, read the agent's spec, and end like
every PC run (run-log row, no spec edits).

### Webex Sweep

Read `skills/webex-web/SKILL.md` and `agents/webex-sweep.md`, and follow the agent
spec exactly: read each watched space and the new meeting recaps since the last
`webex-sweep` row in the Agent run log, write the Notion inbox rows and Asana
update comments it describes, push approved inbox rows to Asana, and never post in
Webex. A space you can't read after the skill's retries goes in the run log as
`partial` with its name.
