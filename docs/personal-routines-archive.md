# Personal account Routines: archive (23 Oct 2026)

The cloud Routines on Sean's Personal Claude account, copied word for word so
nothing is lost when that account goes. The Curaden replacements are in
`docs/curaden-routines.md`; delete these on Personal once the Curaden copy has run
(`docs/migration-to-curaden.md`, Phase 4).

## Truth Catcher scan — `trig_01BxmV4KaG4CPbZMU4GmMHa7`

Weekdays 07:58 + 13:58 Zurich. Prompt:

```
Scheduled Truth Catcher scan. Run it live.

0. Housekeeping first, with ONE subagent (Agent tool): in /home/user/curagents run `git fetch origin main && git checkout --detach origin/main` (never `git pull`). Then list open PRs in Curadenapps/curagents touching agents/truth-catcher.md or .claude/agents/truth-catcher.md, and open `truth-catcher-escalation` issues whose Asana task has since been answered or closed. It reports only and never commits, pushes, merges or closes anything.

1. Then read agents/truth-catcher.md from the synced checkout and follow it: "Agreed rules", "App Tasks board", "Routine run" and "Comment format". The spec is the source of truth. Where this prompt and the spec differ, the spec wins.

Key points (the spec has the details):
- Boards: BOB App 1204489225205419 plus BOB V2 subtasks (1217949875186079), and the App Tasks, Requests & Feedback board 1200298616652229 (intake rules). Tasks modified in the last 7 days PLUS every open overdue task, plus untriaged App Tasks submissions.
- Product Roadmap: read it ONLY with a view-mode query on view://3f47e8aa-bbb4-818c-a54e-000c04b1a71b, paging with next_cursor. Never use SQL mode.
- Comments are in Sean's voice: no emoji, no header, html_text. End every comment with: <em>— Truth Catcher (automated check, not Sean personally) · cc</em> <a data-asana-gid="1207214370347608"/>
- Dedupe against earlier Truth Catcher comments (both the new sign-off and the older "🔎 Truth Catcher" ones) and against Sean's own comments. Close the loop on answered questions; escalate after 3 working days with no reply (follow-up comment plus a GitHub issue labelled truth-catcher-escalation).
- Fabian Jöhl (1196321462158324) works Mon–Thu: nothing to him Fri–Sun, and only Mon–Thu count toward his window. Sean's own tasks get "Sean, a reminder on this one:" and are never questioned or escalated. Form requesters are external: never contact them or copy their name or email out of Asana.
- Never edit tasks or Notion rows. Don't commit or push.

Finish with a 3–5 line summary: what you posted (with task links), any escalations, the roadmap rows Sean should update, the App Tasks 📥 New list and roadmap candidates, and anything from housekeeping. If nothing needed a comment, say so in one line.
```

## Bob roadmap jira sync — `trig_01EREg8Ra4divTV2Jomidy9g`

Thursdays 07:30 Paris. Model claude-sonnet-5-5. Prompt:

```
See the full text, unchanged in substance, under "Jira sync steps" in docs/curaden-routines.md. The Personal prompt also ended with: 5. LAST STEP, ALWAYS (also on failure): write one row in the Notion Agent run log (data source collection://9b260587-5c0d-4d90-947e-b6e10ba159df) as RUNTIME.md "Agent run log" describes (Run "roadmap-jira-sync {YYYY-MM-DD HH:mm}", Agent roadmap-jira-sync, Where Cloud, Link the roadmap).
```

## Agent run log check — `trig_01AN1dTjvTV3YNhhmLAqV4tL`

Weekdays 10:15 Zurich. Prompt:

```
Weekday run-log check (RUNTIME.md "Monitoring"). Read the Notion Agent run log (collection://9b260587-5c0d-4d90-947e-b6e10ba159df) for rows since the last check. Expected today: boom-boom-derek (PC, 08:45), truth-catcher (cloud, 07:58), plus any manual runs. For a missing row, say once that the run was missed. For failed or partial rows, find the cause: if a spec, skill or script in Curadenapps/curagents is wrong, fix it in a PR; if it's the PC (asleep, Chrome not connected, Webex signed out), tell Sean exactly what to fix. Tick Reviewed on every row you looked at. If everything is fine, don't message Sean.
```

## App team weekly digest — `trig_01SSNP4LY2MGnECbNbZFouJJ` (disabled, retired)

Replaced by the announcements agent's team update. Not migrated; delete.
