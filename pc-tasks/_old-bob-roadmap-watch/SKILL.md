---
name: bob-roadmap-watch
description: Every Monday: compare the Notion BOB + Curated Treatment Plan roadmaps with Asana and Jira and write a drift report to Notion.
---

Run the BOB roadmap-watch agent for Sean Dunne (Global Product Lead, Curaden).

The full spec is in the curagents repo at agents/roadmap-watch.md (C:\Users\sean.dunne\dev\curagents\agents\roadmap-watch.md, or the latest worktree copy). Read it first and follow it exactly. Summary:

READ-ONLY on Notion roadmap rows, Asana and Jira. The ONLY writes allowed: one Notion report page, and the snapshot files under .truth-cache/roadmap-watch/ in the curagents repo.

Sources:
- Notion BOB Roadmap: database 751b6071283e43e8b1a91054319e0db6, data source collection://2ce24f93-f696-4d3b-98be-462df08c2c29. Read with view mode on view://0958c452-8904-400a-9d41-995792d6e069 ("All rows", paginate with next_cursor). Do NOT use SQL mode (quota). Fields: Name, Level (Milestone/Feature/Task), Epic, Status, Release, Priority, Difficulty, Date, Track, Asana Link, Jira Key, Depends on/Blocks, CTP link, Notes. Time Horizon is a formula; ignore it.
- Notion Curated Treatment Plan Roadmap: database 4eeb7d12c3fa4bdcb069334b80a8c333, data source collection://02e34993-4704-482d-9708-ae388d8e8b41.
- Asana BOB App project 1204489225205419; BOB V2 milestone task 1217949875186079; Milan task 1217552489272192; plus any task linked from a roadmap row's "Asana Link". Also BOB App tasks completed in the last 7 days, and open BOB App tasks past their due date.
- Jira BOB project (BA-* keys) for rows with a "Jira Key". If Jira access fails, continue with Notion + Asana and mark the run partial.

Steps:
1. ISO week = current week. If a page "Roadmap Watch — {ISO week}" already exists under Notion page 3ec7e8aabbb481c09e57c7926468235c (Roadmap Reports), stop.
2. Snapshot all items (name, level, epic, status, dates, release, priority, difficulty, links).
3. Diff against .truth-cache/roadmap-watch/last-snapshot.json. If missing, this is a baseline: report milestones, Done this week and Overdue in Asana only.
4. Classify: Done this week (BOB App tasks completed in the last 7 days), Overdue in Asana (open BOB App tasks past due), Changed, Drift (done in Asana/Jira but not Notion or reverse; dates differ by >7 days; Asana due date outside the linked row's Notion Release window), At-risk milestones (milestone within 21 days with open blocking rows, or passed and not Done; CTP MVP later than the BOB interface row), New untracked work, Unlinked roadmap rows, Missing info (open Features with empty Priority/Difficulty/Release/Epic; count of rows whose Notes still say "DRAFT by Claude"). Never fuzzy-match names to infer status.
5. Create child page "Roadmap Watch — {ISO week}" under 3ec7e8aabbb481c09e57c7926468235c with: a Summary line (counts: done this week, overdue, changes, drift, at-risk, untracked); Milestones table (Milestone | Date | Status | Blocking items open); sections Done this week, Overdue in Asana (each ends "tick it if done, or set a new date"), Changed, Drift, At-risk milestones, New untracked work, Unlinked roadmap rows, Missing info. Each drift item ends with a one-sentence suggested fix. Plain, direct English.
6. Save the new snapshot (atomic write) to last-snapshot.json and history/{YYYY-MM-DD}.json.
7. Reply with the report link and the Summary line. Do not post to Webex unless explicitly asked.