---
name: bob-roadmap-watch
description: Every Monday: compare the Notion BOB roadmap with Asana and Jira and write a drift report to Notion.
---

Run the BOB roadmap-watch agent for Sean Dunne (Global Product Lead, Curaden).

The full spec is in the curagents repo at agents/roadmap-watch.md (C:\Users\sean.dunne\dev\curagents\agents\roadmap-watch.md, or the latest worktree copy). Read it first and follow it exactly. Load the Notion and Asana connector tools with ToolSearch (search "notion" and "asana"); never rely on a hard-coded connector id. Summary:

READ-ONLY on Notion roadmap rows, Asana and Jira. The ONLY writes allowed: one Notion report page, and the snapshot files under .truth-cache/roadmap-watch/ in the curagents repo.

Sources:
- Notion Product Roadmap (BOB + Curaprox app; the CTP roadmap was merged in on 9 Oct 2026): database 751b6071283e43e8b1a91054319e0db6, data source collection://2ce24f93-f696-4d3b-98be-462df08c2c29. Read with notion-query-data-sources in VIEW mode on https://app.notion.com/p/751b6071283e43e8b1a91054319e0db6?v=3f47e8aabbb4818ca54e000c04b1a71b ("Agents: all rows (don't filter)"), page_size 100, paginating with start_cursor = next_cursor until has_more is false. NEVER use SQL mode: it has a workspace quota that also locks out the live dashboard. Fields: Name, Level (Milestone/Feature/Task), Epic, Status, Release, Priority, Difficulty, Date, Track, Asana Link, Jira Key, Depends on/Blocks, Notes. Time Horizon is a formula; ignore it.
- Asana: BOB App project 1204489225205419 AND "BOB-App Practice Implementation & Relaunch 2026" project 1216821262407072 (launch milestones live there); BOB V2 milestone task 1217949875186079; plus any task linked from a roadmap row's "Asana Link". Also BOB App tasks completed in the last 7 days, and open tasks past their due date in both projects.
- Jira BOB project (BA-* keys) for rows with a "Jira Key". If Jira access fails, continue with Notion + Asana and mark the run partial.

Steps:
1. ISO week = current week. If a page "Roadmap Watch — {ISO week}" already exists under Notion page 3ec7e8aabbb481c09e57c7926468235c (Roadmap Reports), stop.
2. Snapshot all items (name, level, epic, status, dates, release, priority, difficulty, links).
3. Diff against .truth-cache/roadmap-watch/last-snapshot.json. If missing, this is a baseline: report milestones, Done this week and Overdue in Asana only.
4. Classify: Done this week, Overdue in Asana, Changed, Drift (done in Asana/Jira but not Notion or reverse; dates differ by >7 days; Asana due date outside the linked row's Notion Release window), At-risk milestones (milestone within 21 days with open Depends on rows, or passed and not Done), New untracked work, Unlinked roadmap rows, Missing info (open Features with empty Priority/Difficulty/Release/Epic; count of rows whose Notes still say "DRAFT by Claude"). Never fuzzy-match names to infer status. Note: the daily task "asana-notion-sync" already fixes clear one-sided drift; list only what is still out of sync.
5. Create child page "Roadmap Watch — {ISO week}" under 3ec7e8aabbb481c09e57c7926468235c with: a callout whose first line starts "**Summary:**" and lists counts separated by " · " (done this week · overdue · changes · drift · at-risk milestones · untracked); right after the callout one plain paragraph with the big story of the week; a Milestones table (Milestone | Product | Date | Status | Blocking items open); sections Done this week, Overdue in Asana (each ends "tick it if done, or set a new date"), Changed, Drift, "## At-risk milestones", New untracked work, Unlinked roadmap rows, Missing info. Each drift item ends with a one-sentence suggested fix. Plain, direct English. The BOB roadmap dashboard parses the Summary line, the story paragraph and the At-risk bullets, so keep that structure.
6. Save the new snapshot (atomic write) to last-snapshot.json and history/{YYYY-MM-DD}.json.
7. Reply with the report link and the Summary line. Do not post to Webex unless explicitly asked.