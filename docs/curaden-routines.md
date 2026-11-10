# Curaden routines: paste-ready prompts

The prompts for setting up the scheduled runs on the **Curaden** Claude account
(`RUNTIME.md` → "Migration to Curaden"). Every prompt only points at this repo, so
a change merged to `main` reaches the next run without editing the Routine or task.

After each one is set up: change **Account** to `Curaden` on its row in the Agent
registry (Notion), put the exact name below in **Started by**, check that its next
run writes a run-log row, then delete the Personal copy (Routines) or switch it off
(PC tasks).

## Cloud Routines

Create each as a Claude Routine from a session on the Curaden account:

- **Repository:** `Curadenapps/curagents`
- **Connectors:** Notion, Asana, Atlassian, GitHub (Google Drive only where noted)
- **Fires:** a fresh session each time
- **Time zone:** Europe/Zurich

Every prompt starts with the same three lines:

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names this Routine; if its Account
> isn't Curaden, log `no-op` and stop.

### Truth Catcher scan (Curaden)

Schedule: weekdays 07:58 and 13:58.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "Truth Catcher scan (Curaden)";
> if its Account isn't Curaden, log `no-op` and stop.
> Then run Truth Catcher live exactly as `agents/truth-catcher.md` "Routine run"
> describes, with its "Agreed rules", "App Tasks board" and "Comment format". The
> spec is the source of truth. Never edit Notion rows; the only task edit is closing an
> obviously done task under "Closing done tasks". Don't commit or push.
> Finish with a 3–5 line summary (comments posted with links, escalations, roadmap
> rows Sean should update, "Closed by Truth Catcher", the App Tasks 📥 New list). Last step, always, also on
> failure: one row in the Agent run log as `RUNTIME.md` "Agent run log" describes
> (Agent `truth-catcher`, Where Cloud).

### Roadmap ← Jira sync (Curaden)

Schedule: Thursdays 07:30.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "Roadmap ← Jira sync (Curaden)";
> if its Account isn't Curaden, log `no-op` and stop.
> Then do the sync exactly as `docs/curaden-routines.md` "Jira sync steps"
> describes. Last step, always, also on failure: one row in the Agent run log as
> `RUNTIME.md` describes (Agent `roadmap-jira-sync`, Where Cloud).

### Agent run log check (Curaden)

Schedule: weekdays 10:15.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main`. Check the switch as `RUNTIME.md` describes: find the Agent
> registry row whose Started by names "Agent run log check (Curaden)"; if its
> Account isn't Curaden, log `no-op` and stop.
> Then do the weekday check exactly as `RUNTIME.md` "Monitoring" describes, using
> the Agent registry for what was due. If a spec, skill or script is wrong, fix it
> in a PR on `Curadenapps/curagents` and merge it once it's clean. If it's the PC
> (asleep, desktop app closed, Webex signed out), tell Sean exactly what to fix.
> Tick Reviewed on every row you looked at. Nothing wrong: no message.

### Team update draft (Curaden)

Schedule: Thursdays 14:00.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "Team update draft (Curaden)";
> if its Account isn't Curaden, log `no-op` and stop.
> Then draft this week's team update exactly as `agents/announcements.md` describes
> (weekly; monthly on the last Thursday of the month), Steps 1–5 only: write the
> Notion draft under Team Updates and stop. Never post to Webex; Sean says "post it"
> on his PC. Last step, always: one row in the Agent run log (Agent
> `announcements`, Where Cloud, Link = the draft page).

### App Support (Curaden)

Schedule: hourly 07:20–19:20 on weekdays (cron `20 6-18 * * 1-5` UTC). Connectors: Asana, Notion
only. Created 10 Nov 2026 as `trig_01NzNgUy17FxJiHFc8otT4oS`.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "App Support (Curaden)"; if its
> Account isn't Curaden, log `no-op` and stop. If `agents/app-support.md` isn't on
> `origin/main`, log `no-op` ("spec not merged") and stop.
> This Routine handles Sean's requests (BOB). It also handles Fabian's when
> `agents/app-support.md` "Two Routines, split by owner" says to cover him (Friday,
> his "App Support (Fabian)" registry row paused or missing, or its Last run empty or
> more than 2 hours old); say so in the run log.
> Write every reply in Sean's voice exactly as `docs/app-support-voice-sean.md` says,
> with its sign-off, also when covering Fabian.
> Then do the run exactly as `agents/app-support.md` "Scheduled run" describes:
> answer every request on its own from the FAQs; send bugs and
> product gaps to Jira by moving one ticket into In Development on BOB App; hold only
> what the spec says for the owner's "App Support: needs you" task; post the held
> replies the owner ticked; record anonymised FAQ candidates and voice notes. Nothing new since the
> last run: log `no-op` and stop. Never edit BOB Admin, handle passwords or write
> personal data outside Asana. Don't commit or push.
> Last step, always, also on failure: one row in the Agent run log as `RUNTIME.md`
> describes (Agent `app-support`, Where Cloud, Account Curaden), with the FAQ
> candidates, voice notes and dev tickets in its body. Use the Asana and Notion
> connectors; if either is missing, log `failed` with which one.

## PC scheduled tasks (Curaden desktop app)

On the `curagents` folder, in the **Curaden** desktop app, with Webex signed in
once in its built-in browser (Ctrl+Shift+B shows the pane; the sign-in persists). One prompt for all, `{name}` from the table:

> Account: Curaden. In my curagents folder run `git fetch origin main`. If the
> checkout is on `main` and clean, `git pull --ff-only`; otherwise don't merge
> anything and read every file from `origin/main` (`git show origin/main:<path>`).
> Check the switch as `RUNTIME.md` describes, then do the "{name}" run exactly as
> `RUNTIME.md` describes under "PC runs". Live: don't ask me first.

| Task name | When | `{name}` |
|-----------|-----------------|----------|
| Webex keep-alive (Curaden) | 07:05, then every 2 hours to 17:05 (`5 7-17/2 * * 1-5`) | Webex keep-alive |
| Boom Boom Derek (Curaden) | 08:45 | Boom Boom Derek |
| Webex Sweep (Curaden) | 11:40 and 16:40 | Webex Sweep |
| Roadmap watch (Curaden) | Mondays 08:00 | Roadmap watch |
| Feedback QA report (Curaden) | Fridays 10:40 | Feedback QA report |

Not moved: Boom Boom queued (the keep-alive posts queued pings) and the Asana ↔ Notion sync (retired), Roadmap
dashboard refresh (on click), the old App team digest (delete).

## Jira sync steps

Moved here from the Personal Routine's prompt so the steps live in the repo.

1. **Pull Jira:** Atlassian connector, cloudId
   `17835775-46a2-4e51-989d-809d887c4db5`, project "BOB App" (key BA). JQL
   `project = BA ORDER BY updated DESC`, fields summary, description, status,
   issuetype, priority, updated, created. Page through all results. Ignore Xray
   types (Xray Test, Test Set, Test Plan, Test Execution, Precondition, Sub Test
   Execution).
2. **Pull the roadmap:** Notion data source
   `collection://2ce24f93-f696-4d3b-98be-462df08c2c29` ("Product Roadmap": BOB and
   the Curaprox app, split by `Product` — "BOB" / "Curaprox App" / "Shared"; empty
   means BOB), including rows with Status Cut. If the SQL quota is used up, use
   view mode (`view://0958c452-8904-400a-9d41-995792d6e069`) and page fetches. Key
   properties: "Jira Key" for exact-match sync; Status Not Started / In Progress /
   In Review / Done / Needs refinement / Cut; Module and Product (use only existing
   options, spelled exactly).
3. **Sync** by exact Jira Key:
   - **Protected rows:** never change a row whose Status is Done, Cut or Needs
     refinement (Sean sets those; cut rows carry a "merged into" callout). Done is
     never downgraded.
   - **Other rows:** mirror Jira status (To Do/Backlog/Open → Not Started; In
     Progress/In Development → In Progress; In Review/QA/Testing → In Review;
     Done/Closed/Resolved → Done). Update Name/Description only if clearly stale.
     Never change an existing row's Product.
   - **Jira issues with no row:** skip if the key is on a Cut row or named in any
     row's "merged into" callout or Notes. Otherwise create a row: Name = summary,
     Jira Key, Status as above, Level Task (Feature for Epics), Product "BOB" (or
     "Curaprox App" when clearly about that app), best-fit Module, Description = one
     line. Skip sub-tasks.
   - **Row keys missing from Jira:** don't delete; add "Jira ticket not found as of
     {date}" to Notes.
   - Rows without a Jira Key are manual: leave them.
4. **Verify and report:** re-fetch and confirm. Summary: rows updated, created,
   flagged, errors, and "Cut in roadmap, still open in Jira" (key, Jira status, row
   title) for Sean to close in Jira.
