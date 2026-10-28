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
> (asleep, Chrome not connected, Webex signed out), tell Sean exactly what to fix.
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

### Roadmap watch (Curaden)

Schedule: Mondays 08:00. Moves from a PC task to a Routine: it only uses connectors.

> Account: Curaden. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "Roadmap watch (Curaden)"; if
> its Account isn't Curaden, log `no-op` and stop.
> Then run the weekly report exactly as `agents/roadmap-watch.md` describes. A cloud
> run has no local snapshot from last week: use last Monday's report page under
> Roadmap Reports as the baseline for "Changed" and "Drift". Write the report page;
> nothing else. Last step, always: one row in the Agent run log (Agent
> `roadmap-watch`, Where Cloud, Link = the report page).

## PC scheduled tasks (Curaden desktop app)

On the `curagents` folder, with Claude in Chrome connected to the **Curaden**
desktop app and Webex signed in. One prompt for all, `{name}` from the table:

> Account: Curaden. In my curagents folder run `git fetch origin main`. If the
> checkout is on `main` and clean, `git pull --ff-only`; otherwise don't merge
> anything and read every file from `origin/main` (`git show origin/main:<path>`).
> Check the switch as `RUNTIME.md` describes, then do the "{name}" run exactly as
> `RUNTIME.md` describes under "PC runs". Live: don't ask me first.

| Task name | When (weekdays) | `{name}` |
|-----------|-----------------|----------|
| Webex keep-alive (Curaden) | 08:35 | Webex keep-alive (steps: `pc-tasks/webex-keepalive/SKILL.md`) |
| Boom Boom Derek (Curaden) | 08:45 | Boom Boom Derek |
| Webex Sweep (Curaden) | 11:40 and 16:40 | Webex Sweep |

Not moved: Boom Boom queued and the Asana ↔ Notion sync (retired), Roadmap
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
