---
name: asana-notion-sync
description: Weekdays 08:30: two-way sync of done status and due dates between the Notion Product Roadmap and linked Asana tasks; conflicts go to Sean.
---

Two-way sync between the Notion "Product Roadmap" database and Asana, for Sean Dunne (Global Product Lead, Curaden). Goal: when someone finishes a task or moves a date in one system, the other system follows, so Notion, Asana and the BOB roadmap dashboard agree. Be conservative: only apply a change you are sure about; everything else goes to Sean as a question.

Tools: load the Notion and Asana connector tools with ToolSearch (search "notion" and "asana"). Never rely on a hard-coded connector id.

State file: C:\Users\sean.dunne\dev\curagents\.truth-cache\asana-notion-sync\state.json (create the folder if missing). It holds, per synced pair, the values both sides had after the last successful run: {"pairs": {"<notion page id>": {"asana_gid": "...", "name": "...", "notion_done": bool, "asana_done": bool, "notion_date": "YYYY-MM-DD"|null, "asana_due": "YYYY-MM-DD"|null}}, "last_run": "<ISO time>"}. Write it atomically at the end (write to state.tmp, then rename). Keep a dated copy in history/{YYYY-MM-DD}.json.

1. Read Notion. notion-query-data-sources in VIEW mode on https://app.notion.com/p/751b6071283e43e8b1a91054319e0db6?v=3f47e8aabbb4818ca54e000c04b1a71b ("Agents: all rows (don't filter)"), page_size 100, paginate with start_cursor = next_cursor until has_more is false. NEVER use SQL mode (workspace quota; it locks out the live dashboard). Keep rows whose "Asana Link" holds an Asana task URL; the task gid is the last long number in the URL (for /task/<gid> URLs, that gid). Skip rows with Status "Cut".
   Notion "done" = Status "Done". Notion date = the end of "Date" if it is a range, else its start (null if empty).

2. Read Asana. For each linked gid, get the task: completed (bool), due_on (YYYY-MM-DD or null), name, and whether it still exists.

3. Decide per pair, field by field (done, date), comparing each side with its value in state.json:
   - Same on both sides: nothing to do.
   - Only ONE side changed since the last run: copy that value to the other side (this is the sync).
     • Asana completed, Notion not Done → set the Notion row's Status to "Done".
     • Notion set to Done, Asana open → mark the Asana task complete.
     • Asana un-completed (reopened), Notion Done → set Notion Status to "In Progress".
     • Notion moved off Done, Asana completed → reopen the Asana task (completed = false).
     • Date moved on one side → set the same date on the other side (Notion: if Date is a range, move the END; keep the start unless the new end would be before it, then set a single date).
   - BOTH sides changed to different values, or there is no previous state for the pair: do NOT write. List it as a conflict.
   - The Asana task is missing or deleted, or the Notion row has "Cut": no write; list it.
   - Milestone rows (Level = Milestone): never write their dates automatically; list date differences as conflicts. Done status may sync.
   Never change any other field (Release, Priority, Epic, names, notes, assignees, Depends on). Never create or delete rows or tasks. Never fuzzy-match names: a pair exists only through the Asana Link.
   FIRST RUN (no state.json): write nothing. Record the current values of both sides as the baseline, and list every pair where they differ as a conflict, so Sean can decide once.

4. After writing, re-read each changed item once to confirm the change took. If a write failed, don't update that pair's state (it will be retried tomorrow) and report it.

5. Report. Append today's entry at the top of the Notion page "Asana ↔ Notion sync log" (a child page of Roadmap Reports, 3ec7e8aabbb481c09e57c7926468235c; create it on the first run if it doesn't exist, and change nothing else in Roadmap Reports). The entry: a "## <weekday, D Mon YYYY>" heading, then "Synced" (each change: item name, field, old → new, which direction, links to both), then "Needs your call" (each conflict: item, the Notion value, the Asana value, one-sentence suggestion), then "Not linked" count (open Features/Milestones in launch releases with no Asana Link). If nothing changed and there are no conflicts, write one line "No changes." Plain, direct English, no emoji.

6. Reply in under 120 words: how many pairs checked, synced changes, conflicts, failures, and the sync log link. Do not post to Webex or email.