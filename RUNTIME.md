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

Why the split (11 Nov): Webex and Outlook have no connector we may use, and IT blocks
browser automation (built-in browser, Claude in Chrome, Remote Control) on the Curaden
account. So **Curaden runs everything that only needs connectors** (Notion, Asana, Jira,
Confluence, GitHub, Drive) as cloud Routines, and **one task on the Personal desktop
app, the Webex courier, does all the Webex work**: it posts what the cloud agents left
in the Notion **Webex outbox** and reads the watched spaces (Webex Sweep). The PC
side stays as small as possible, so losing it costs one task, not the system.

## Accounts and the switch

Sean has two Claude accounts on the same PC (agreed 23 Oct 2026):

| Account | Job | Future |
|---------|-----|--------|
| **Curaden** | Runs every automation that only needs connectors, as cloud Routines | Stays. Everything durable lives here |
| **Personal** | The Webex courier (the one PC task) and anything else that needs a browser (manual "post it", "meeting notes", Outlook web later); building specs and PRs | Kept while IT blocks browser automation on Curaden. Nothing may live only here: its work lands in this repo or Notion |

Both desktop apps read the same task files in `~/.claude/scheduled-tasks/`, but each
app keeps its own schedule and on/off state, and each account has its own cloud
Routines. So a task registered on both accounts would run twice. The switch stops that.

**Agent registry** `49feb8b53b6c41838cf4cb916fcbb205`
(data source `collection://ca4bcf81-b541-49e6-9da5-1fc8bfd38418`), in the
**Agent control room** next to the Agent run log and the Webex outbox ("Where the agent
tables live" below). One row per agent run, with **Account**
(`Curaden`, `Personal`, `Paused`, `On request`), Where, Started by, Schedule, Spec,
Run log name, and **Last run** (rolled up from the run log). It is the full list of
what runs where; the table below is the background.

**The switch.** Every scheduled run starts by checking its registry row:

1. Its prompt names the account it runs on (`Account: Curaden`, `Account: Personal`,
   or `Account: Fabian` for a Routine on Fabian Jöhl's Claude account, see the
   paste-once prompt below). A prompt that names no account is from before 23 Oct:
   skip the check, run as before, and log Account `unknown`.
2. Find the row whose **Started by** names this task or Routine (read the registry in
   view mode, "Reading Notion" below; never SQL). If **Account** is
   `Paused`, or names another account, write a run-log row with Outcome `no-op` and
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

**Curaden runs every connector-only schedule. Personal carries Webex.** (Revised
11 Nov: IT blocks browser automation on Curaden and won't change that.)

- **Curaden** holds every cloud Routine, including the "thinking" half of the Webex
  agents: Boom Boom writes its ping, Roadmap watch its summary, Feedback QA its PDF
  report and the team update its message, each as a row in the Webex outbox.
- **Personal** holds one scheduled task, the **Webex courier**, plus the on-request
  browser runs ("post it", "meeting notes"). It also stays the build seat.
- Move one item at a time: set it up with the `Account:` prompt, flip **Account** on
  its Agent registry row, check its next run-log row, then delete or switch off the
  old copy.

| Item | Today | Decision | On Curaden as |
|------|-------|----------|---------------|
| Webex courier | — | **New** (11 Nov): the only PC task. Checks the Webex sign-in, posts the outbox, runs Webex Sweep | Personal PC task "Webex courier (Personal)", weekdays 08:02, 09:02, 12:02, 17:02 |
| Webex Sweep | — | **Keep**, inside the courier | Personal PC task "Webex courier (Personal)" (reads at every run) |
| Boom Boom Derek | Personal PC, 08:45 | **Move to Curaden as a Routine** (11 Nov): refreshes the page and writes the ping to the outbox; the courier posts it | Routine "Boom Boom Derek (Curaden)", weekdays 08:20 |
| Truth Catcher scan | Personal Routine | **Keep, move** | Routine, 07:58 + 13:58 |
| Roadmap ← Jira sync | Personal Routine | **Keep, move** | Routine, Thu 07:30 |
| Agent run log check | Personal Routine (`trig_01AN1dTjvTV3YNhhmLAqV4tL`) | **Keep, move** (it is the monitoring) | Routine, weekdays 10:15 |
| Team update draft | Missing (Routine gone) | **Keep, recreate**: drafts in Notion and puts the Webex message in the outbox as Held; Sean ticks Approved | Routine, Thu 14:00 |
| Roadmap watch | Personal PC, Mon 08:00 | **Move to Curaden as a Routine** (11 Nov): writes the report and puts the App Team summary in the outbox | Routine "Roadmap watch (Curaden)", Mon 07:40 |
| Feedback QA report | On request | **Weekly on Curaden** (11 Nov): builds the PDF and puts the post (PDF attached) in the outbox when the threshold is met | Routine "Feedback QA report (Curaden)", Fri 10:10 |
| App Support | — | **New** (10 Nov): answers form submissions on its own, hourly in work hours; bugs and gaps to Jira. Split by owner: Sean's Routine (BOB, Mon–Fri, covers Fabian on Fridays and when his is down) + Fabian's Routine on his own account (the rest, Mon–Thu) | Routine "App Support (Curaden)" `trig_01NzNgUy17FxJiHFc8otT4oS`, created 10 Nov |
| Roadmap dashboard refresh | Personal PC, 09:15 | **On request** (Sean, 23 Oct): switch its schedule off and run it on click | — |
| Boom Boom queued | Personal PC, 14:00 | **Retire**: the courier posts the outbox | — |
| Webex keep-alive | Personal PC, hourly 07–20 | **Retire** (11 Nov): the courier checks the sign-in at every run | — (switch off the Personal task) |
| Asana ↔ Notion sync | Paused | **Retire**: Webex Sweep makes the Asana triage tasks itself; running both would duplicate tasks | — |
| App team weekly digest | Personal Routine, disabled | **Delete**: replaced by the team update | — |
| Everything "On request" | — | Stays on request, run from whichever account Sean is in | — |

## Where each agent runs

| Agent | Where | Started by | Notes |
|-------|-------|------------|-------|
| `boom-boom-derek` | Cloud + courier | Claude Routine "Boom Boom Derek (Curaden)" (weekdays 08:20 Zurich); "boom boom" any time | Refreshes Derek's page from Notion, Asana, Jira, Confluence, the WBS and the Webex messages Webex Sweep captured; writes the ping to the Webex outbox (common chat by default). The courier posts it at 09:02 |
| `announcements` (post) | Courier | Sean ticks **Approved** on the Held outbox row (or says "post it") | The courier posts it on its next run |
| `announcements` (draft) | Cloud | Claude Routine "Team update draft" (Thu 14:00 Zurich) | Writes the Notion draft and a Held outbox row |
| `feedback-qa` (report) | Cloud + courier | Claude Routine "Feedback QA report (Curaden)" (Fri 10:10 Zurich); "send QA report" any time | Builds the PDF in the cloud and puts the post with the PDF attached in the outbox; the courier posts it to the QA space |
| `meeting-notes` | **PC** | "meeting notes" | Reads Webex meeting summaries and transcripts |
| `app-support` | Cloud | Claude Routine "App Support (Curaden)" (`trig_01NzNgUy17FxJiHFc8otT4oS`), hourly 07:20–19:20 Zurich Mon–Fri, BOB requests (and Fabian's on Fridays or when his Routine is down); Claude Routine "App Support (Fabian)" on Fabian's account, hourly Mon–Thu, the rest (prompt in `docs/app-support-quickstart.md`) (cron in UTC, so an hour later in summer time); "app support" any time | Asana + Notion connectors. Answers on its own; what it can't answer goes to each owner's "App Support: needs you" task in Asana. Most runs are `no-op` (nothing new). Spec "Scheduled run" |
| `truth-catcher` | Cloud | Claude Routine "Truth Catcher scan" (`trig_01BxmV4KaG4CPbZMU4GmMHa7`), weekdays 07:58 + 13:58 Zurich | Asana, Notion, GitHub connectors |
| Roadmap ← Jira sync | Cloud | Claude Routine "Bob roadmap jira sync" (`trig_01EREg8Ra4divTV2Jomidy9g`), Thu 07:30 Paris | The only automation that writes roadmap rows from Jira |
| `roadmap-watch` | Cloud + courier | Claude Routine "Roadmap watch (Curaden)" (Mon 07:40 Zurich); "roadmap watch" any time | Writes the report page and puts the App Team summary in the outbox |
| Webex courier | **PC (Personal)** | Desktop app scheduled task "Webex courier (Personal)", weekdays 08:02, 09:02, 12:02, 17:02 Zurich | The only scheduled PC task: sign-in check, outbox, Webex Sweep ("PC runs" below) |
| `webex-sweep` | **PC (courier)** | Inside the Personal task "Webex courier (Personal)" (weekdays 08:02, 09:02, 12:02, 17:02); "check webex" any time | Reads the watched spaces and meeting action items; Inbox log rows (the check-up log), triage tasks in BOB App › Webex inbox, Asana comments, a "New in Jira" note in the common chat |
| Everything else | Wherever Sean asks | Trigger phrases in each spec | |

## Rules for every run

0. **Scheduled runs check the switch first** (above). A run that isn't its account's
   turn logs `no-op` and stops before reading anything else.
1. **Fresh session, latest specs.** Start with `git fetch origin main`. If the
   checkout is on `main` and clean, `git pull --ff-only`; otherwise read the files
   from `origin/main` (`git show origin/main:<path>`). Never merge or rebase. On the
   PC the SessionStart hook (`scripts/sync-checkout.sh`) usually has done this
   already, for every session on either account; the steps above are the fallback.
2. **Runs never edit agent specs, skills or scripts.** If a spec is wrong or a step
   fails, say so in the run log's Error column. Fixes go through a PR from the
   maintenance session, so there is only ever one version.
3. **Always write one run-log row, even on failure** (below). A run with no row
   counts as missed.
4. **Never type credentials.** A sign-in prompt is a failed run with the reason
   logged.
5. **Read Notion databases in view mode only** (below). Never SQL or rows mode.

## Where the agent tables live

The **Agent registry**, **Agent run log** and **Webex outbox** sit together on the
Notion page **⚙️ Agent control room** `4157e8aabbb48194bb25e351664b6462` (App Hub ›
Agents & Other Projects), moved there on 11 Nov 2026. Before that they sat directly on
Agents & Other Projects; the registry and run log earlier still under Goals & Objectives.

- Every run, on either account (Curaden, Personal, and Fabian's App Support), finds
  them **by their IDs**: the `collection://` and `view://` IDs in this file. Moving a
  database in Notion keeps all of them, so the move changed nothing for any run.
- Never find them by page path or by searching their title, and never create a new
  registry, run log or outbox because one "isn't where it used to be". If an ID stops
  resolving, log `failed` with that ID in the Error column and stop.
- Don't rename, duplicate, delete or move them again without a PR to this section.

The **🚩 Inbox** (`collection://35a7e8aa-bbb4-8126-9b9b-000b4b0a44db`) lives elsewhere
in the workspace but shows on the control room page as the linked view "Inbox check-up:
last 7 days" (13 Nov). It is the check-up log: one row per item the agents captured or
flagged (Webex Sweep's log, feedback for feedback-qa, and Source `agent` rows for what
needs Sean; `agents/orchestrator.md` §5). Same rules: found by ID, never recreated.

## Reading Notion (view mode only)

Notion's SQL and rows-mode queries share one small hourly allowance across the whole
workspace (no Notion Business, Sean 11 Nov). App Support runs every hour, the courier
four times a day, and Sean's own sessions spend from the same allowance. It was used
up by mid-morning on 11 Nov; from then on, a run that reads that way can't even read
its registry row and has to log `failed`. View mode and page fetches don't count
against it (checked 11 Nov: view mode still worked with the allowance used up).

- **Read a database** with `notion-query-data-sources` in **view mode** on the view
  below, paging with `next_cursor` (`page_size` 100). Filter and sort the rows
  yourself. Never SQL mode, never rows mode, not even as a fallback.
- **Read one page or row** with `notion-fetch`.
- **Writing is fine**: creating and updating pages doesn't use the allowance.
- A database not in the table: fetch the database, pick a view with no filter, and
  use view mode on it. If it only has filtered views, say so in the run log's Error
  column so the maintenance session adds an "Agents: … (don't filter)" view.
- The "Agents: … (don't filter)" views are for the agents. Nobody adds filters or
  hides rows there; to look at a slice, use another view.

| Database | View for agents (view mode) |
|----------|-----------------------------|
| Agent registry | `view://4157e8aa-bbb4-8151-9c1a-000c4e4613fc` "Agents: all rows (don't filter)" |
| Agent run log | `view://4027e8aa-bbb4-816e-b040-000cbf51881b` "Command center: latest first (don't filter)"; the newest rows come first, so stop paging once you're past the window you need |
| Webex outbox | `view://4157e8aa-bbb4-813c-a25e-000c3f1f159d` "Agents: all rows, newest first (don't filter)" |
| 🚩 Inbox (Tasks & Notes) | `view://4157e8aa-bbb4-815b-b0a6-000cb183ca38` "Agents: all rows, newest first (don't filter)" |
| Product Roadmap | `view://3f47e8aa-bbb4-818c-a54e-000c04b1a71b` "Agents: all rows (don't filter)" |
| Education Hub Markets | `view://4157e8aa-bbb4-81a8-ac7d-000ccdcaaf8a` "Agents: all rows (don't filter)"; over 100 rows, so page with `next_cursor` |

The registry's **Last run** rollup comes back as a `rollupResult://` reference, not a
date, in view mode and in page fetches. For a row's last run, use its **Runs** relation
(empty = never ran) or the run-log view, newest first.

## Agent run log

Notion database **Agent run log** `a4c371ee506c4d0fa5dde1fb11bd2657`
(data source `collection://9b260587-5c0d-4d90-947e-b6e10ba159df`), in the
**Agent control room**. One row per run, written as the run's last step:

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
- A registry row whose last run (its **Runs** relation or the run-log view; the
  **Last run** rollup can't be read through the connector) is older than its schedule
  allows is a missed run.
- A `failed` row whose Error mentions the Notion query or usage limit means some step
  used SQL or rows mode: find the spec, skill or prompt that told it to and switch it
  to view mode ("Reading Notion") in the PR.
- `app-support` rows with **FAQ candidates** in their body: fold them into
  `docs/app-support-faq.md` in one PR (merge duplicates, keep them anonymised, drop
  anything a product FAQ already answers), and list the row's `faq_page_gaps` for
  Sean. Remove or rewrite entries a product FAQ now covers or a shipped fix made
  wrong (`agents/app-support.md`, "FAQ: answering and getting smarter"). Fold their
  **voice notes** into the "Learned" section of that owner's voice file
  (`docs/app-support-voice-sean.md` / `-fabian.md`) in the same PR.
- **Inbox check** (the 🚩 Inbox, view mode, last 7 days): a `new` row with Source
  `webex`/`meeting` older than one courier run is a stuck sweep (fix the spec or tell
  Sean); `pushed` rows without an Asana link; open `agent` rows older than 5 working
  days get one dated "still open" line in Notes, no new row.
- **Telling Sean** means one Inbox row with Source `agent`, Requester `run-log-check`
  (`agents/orchestrator.md` §5: one open row per issue, Source ID
  `agent:run-log-check:{agent or task}:{reason}`), not only the session's chat, which
  nobody reads for a cloud Routine. A PR it opened goes in the row's Source link.
  When the cause is gone (the run worked again), set the row to `reference` with a
  dated line.
- Tick **Reviewed** on every row it has looked at.
- Nothing wrong: no message and no Inbox row.

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
| Webex courier (Personal) | Weekdays 08:02, 09:02, 12:02, 17:02 (cron `2 8,9,12,17 * * 1-5`) | Webex courier |

That is the only PC task. Boom Boom Derek, Roadmap watch, Feedback QA report and the
team update run as cloud Routines on Curaden (`docs/curaden-routines.md`).

## PC runs

Every PC run reads `RUNTIME.md` and `dream.md` §2–3 first and ends with one row in
the Agent run log. Runs never edit specs or push.

### Webex courier

The one scheduled PC task (Personal desktop app, built-in browser). In order:

1. **Sign-in.** Open Webex in the built-in browser (`skills/webex-web/SKILL.md`) and
   check the sign-in. Never type credentials or click sign-in, cookie or consent
   buttons. Signed out: try Claude in Chrome (the skill's fallback). Neither works:
   tell Sean once (`PushNotification`: "Webex signed out in Claude's built-in
   browser. Open Claude desktop, Ctrl+Shift+B, sign in to web.webex.com.") unless a
   run-log row from the last 4 hours already says "Webex signed out"; log `partial`
   with "Webex signed out" and stop. Nothing is lost: the outbox waits.
2. **Outbox.** Read the Webex outbox (`collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d`) in view mode on
   `view://4157e8aa-bbb4-813c-a25e-000c3f1f159d` ("Reading Notion"). For every row with
   Status `Queued`, or `Held` with **Approved** ticked, whose **Post after** has passed:
   - **Expires** passed → Status `Dropped`, Courier note "expired".
   - Otherwise post it with `scripts/webex-post.js` exactly as the skill's Recipe 1
     says: the row's **Space** (IDs in the skill), **Mentions**, **Marker**, the message
     from the row's page body (the **Message** property is only a preview). With an
     **Attachment**, download it (Notion file URL) and attach it first (Recipe 2).
     Verify with `webex-read.js` (`markerCount: 1`).
   - Posted → Status `Posted`, **Posted at** now. Failed after the skill's retries →
     Status stays `Queued`, Courier note with the reason (3 failed runs → `Failed`).
   - Boom Boom rows: before posting, check the space for replies since the row was
     written that answer an item; if one does, set the row to `Held`, Courier note
     "team replied since; say boom boom to refresh", and tell Sean once.
   - After a Boom Boom post, add "posted {HH:MM} in {space}" to the ping history on
     Derek's page. Never post from old local `.boom-boom-derek/outbox/` files.
3. **Webex Sweep.** Run `agents/webex-sweep.md` as its spec says (window from its last
   run-log row; Inbox log rows, triage tasks in BOB App › Webex inbox, Asana
   comments, its "New in Jira" note in the common chat). A space it can't read →
   `partial` with the space name.
4. **Run log.** One row: Agent `webex-courier` (or `other`), Where `PC`, Account
   `Personal`, Outcome `posted` (anything went out) / `ok` / `partial` / `failed`,
   Summary "{n} posted, {m} held/expired; sweep: {sweep summary}". Webex Sweep keeps
   its own `webex-sweep` row.

### Manual PC runs

"post it" (posts a Held team-update row now, same as the courier), "send QA report",
"roadmap watch", "boom boom" and "meeting notes" work from any session on the PC; the
Webex part follows the courier's steps 1–2. Start with the paste-once prompt's fetch
step, read the agent's spec, and end like every PC run (run-log row, no spec edits).
