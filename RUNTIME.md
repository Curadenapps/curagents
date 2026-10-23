# Runtime

Where each agent runs, what starts it, and how runs are checked. Agreed with Sean on
16 Oct 2026.

## The model

| Layer | Lives in | Owned by |
|-------|----------|----------|
| **What** an agent does (specs, skills, scripts) | This repo, `main` | The cloud maintenance session: every change goes through a PR |
| **When** it runs (schedules, triggers) | Claude on Sean's PC (desktop app scheduled tasks) for browser work; Claude Routines in the cloud for connector-only work | Sean sets each one up once |
| **The run** | A fresh session that reads the specs from `origin/main` and follows them | Automatic |
| **Checking and fixing** | The Agent run log in Notion, read by the cloud maintenance session every weekday | The cloud session: it fixes specs by PR; the next run picks the fix up |

Why the split: Webex has no connector, so anything that posts to or reads Webex
needs Sean's Chrome (`skills/webex-web/SKILL.md`), and only a session on his PC has
it. Everything else (Notion, Asana, Jira, Confluence, GitHub, Drive) has a connector
and runs more reliably in the cloud, without the PC being on.

## Where each agent runs

| Agent | Where | Started by | Notes |
|-------|-------|------------|-------|
| `boom-boom-derek` | **PC** | Desktop app scheduled tasks "Boom Boom Derek" (weekdays 08:45 Zurich) and "Boom Boom queued" (weekdays 14:00, posts a ping a cloud run queued); "boom boom" any time | Posts to the common chat (QA space) for the Phinamic team, or Curaden / Phinamic for Derek-only items. A cloud "boom boom" refreshes the page and queues the ping there; the next PC run posts it |
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
  it's the PC (asleep, Chrome not connected, signed out), tell Sean what to fix.
- Tick **Reviewed** on every row it has looked at.
- Nothing wrong: no message.

## Scheduled task prompts (PC)

Set these up once in the Claude desktop app as scheduled tasks on the `curagents`
folder. Each run starts a fresh session, so nothing piles up. The prompts only
point here: what a run does lives in this file and the agent specs on `main`, so a
change merged here reaches the next run without touching the scheduled task.

**Paste-once prompt** (replace `{name}` with the run's name below):

> In my curagents folder run `git fetch origin main`. If the checkout is on `main`
> and clean, `git pull --ff-only`; otherwise don't merge anything and read every
> file from `origin/main` (`git show origin/main:<path>`). Then do the "{name}" run
> exactly as `RUNTIME.md` describes under "PC runs". Live: don't ask me first.

| Scheduled task | When (Zurich) | `{name}` |
|----------------|---------------|----------|
| Boom Boom Derek | Weekdays 08:45 | Boom Boom Derek |
| Boom Boom queued | Weekdays 14:00 | Boom Boom queued |
| Webex Sweep | Weekdays 11:40 and 16:40 | Webex Sweep |

## PC runs

Every PC run reads `RUNTIME.md` and `dream.md` §2–3 first and ends with one row in
the Agent run log. Runs never edit specs or push.

### Boom Boom Derek

Read `skills/webex-web/SKILL.md` and `agents/boom-boom-derek.md`, and follow the
agent spec exactly: refresh the Boom Boom Derek page, read the common chat, the
Curaden / Phinamic space and the team's meetings in Webex web, and post today's ping
(or the page's queued ping) in the space the spec's "Channel" rule names, through
Claude in Chrome with `scripts/webex-post.js` if the rules say so. If you can't post
after the skill's retries, log it on the page and in the run log.

### Boom Boom queued

Open the Boom Boom Derek page. No "📤 Queued ping", or a Boom Boom message already
posted today (ping history): log `no-op` and stop. Otherwise read
`skills/webex-web/SKILL.md` and the "Workflow" step 7 of `agents/boom-boom-derek.md`,
check the queued ping against the space (anything it asks for already answered
there gets dropped), post it in the space the queued section names, record it in the
ping history and delete the queued section.

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
