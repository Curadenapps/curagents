# PC scheduled tasks (extracted 23 Oct 2026)

Copies of the curagents scheduled tasks from `~/.claude/scheduled-tasks/` on Sean's PC
(Personal account, Claude desktop app), saved for the move to the Curaden account
(`docs/migration-to-curaden.md`, Phase 1). One folder per task, `SKILL.md` exactly as
it is on the PC. Nothing on the PC was changed, paused or deleted.

| Task | Schedule (as the desktop app shows it) | On/off | What it does |
|------|-----------------------------------------|--------|--------------|
| [`boom-boom-derek`](boom-boom-derek/SKILL.md) | At 08:50 AM, Monday through Friday (cron `45 8 * * 1-5`, ~5 min jitter) | On | Refreshes Derek La's Notion ledger, reads Curaden / Phinamic in Webex web, posts the daily ping or queues it if Webex is signed out |
| [`webex-keepalive`](webex-keepalive/SKILL.md) | At 5 minutes past the hour, between 07:00 AM and 08:59 PM, Monday through Friday (cron `5 7-20 * * 1-5`) | On | Reloads Webex in the built-in browser to keep the sign-in warm, notifies Sean when signed out, sends a queued Boom Boom Derek ping once he's back |
| [`bob-roadmap-watch`](bob-roadmap-watch/SKILL.md) | At 08:04 AM, only on Monday (cron `0 8 * * 1`, ~4 min jitter) | On | Compares the Notion Product Roadmap with Asana and Jira and writes the weekly "Roadmap Watch" drift report to Notion |
| [`bob-roadmap-dashboard-refresh`](bob-roadmap-dashboard-refresh/SKILL.md) | At 09:16 AM, only on Monday (cron `15 9 * * 1`) | On | Rebuilds the BOB roadmap dashboard snapshot and PDF from Notion and swaps them into Goals & Objectives |
| [`asana-notion-sync`](asana-notion-sync/SKILL.md) | Not in the app's task list (its description says weekdays 08:30) | Off (folder only) | Two-way sync of done status and due dates between the Notion Product Roadmap and linked Asana tasks; conflicts go to Sean |
| [`_old-bob-roadmap-watch`](_old-bob-roadmap-watch/SKILL.md) | Not in the app's task list | Off (superseded) | Earlier version of `bob-roadmap-watch` (separate CTP roadmap, before the 9 Oct merge) |
| [`_old-bob-roadmap-dashboard-refresh`](_old-bob-roadmap-dashboard-refresh/SKILL.md) | Not in the app's task list | Off (superseded) | Earlier version of `bob-roadmap-dashboard-refresh` (HTML embed only, no PDF) |

## Not found on this PC

- **Webex Sweep** and **Boom Boom queued**: no scheduled task by either name. The
  queued-ping send is part of `webex-keepalive` (step 4).
- **`~/.claude/settings.json` / `settings.local.json`**: no hooks, and no permissions
  specific to curagents (they cover Education Hub, iTOP and other personal work), so
  there is no `claude-settings-curagents.json`.

## Paths to change on the Curaden side

The prompts point at `C:\Users\sean.dunne\dev\curagents` and, for the dashboard refresh,
`C:\Users\sean.dunne\Projects\App Website\Marketing\presentations\bob-roadmap-dashboard`.
Cloud versions read the repo instead; see `docs/curaden-routines.md`.
