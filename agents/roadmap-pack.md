---
name: roadmap-pack
description: >
  Weekly roadmap pack for the App Team. After Roadmap Watch on Monday it reads the
  Product Roadmap in Notion and that week's Roadmap Watch report, builds one picture
  (numbers, coming up, scope since 3 Nov 2026, the journey) and a PDF report, writes a
  "Roadmap pack" page under Roadmap Reports, swaps the picture and PDF on Goals &
  Objectives, and puts a post in Sean's voice in the Webex outbox as Held for Sean.
  Read-only on the roadmap, Asana and Jira.
model: claude-sonnet-5-5
tools: Read, Write, Bash, NotionAPI
trigger:
  - type: schedule
    cron: "CRON_TZ=Europe/Zurich 40 8 * * 1"   # Claude Routine "Roadmap pack (Curaden)", an hour after Roadmap watch
    label: weekly-roadmap-pack
  - type: manual
    phrases:
      - "roadmap pack"
      - "weekly roadmap pack"
      - "roadmap picture"
memory:
  read:
    - dream.md
    - "notion: Product Roadmap, view mode on view://3f47e8aa-bbb4-818c-a54e-000c04b1a71b (never SQL)"
    - "notion: this week's Roadmap Watch page under Roadmap Reports (3ec7e8aabbb481c09e57c7926468235c)"
    - "notion: last week's Roadmap pack page (its roadmap-<date>.json)"
    - "notion: Roadmap pack · build files (4237e8aabbb481ecb0a8fe5e7aef6d47)"
  write:
    - "notion: one child page 'Roadmap pack — {iso_week}' under Roadmap Reports"
    - "notion: the picture and PDF blocks at the top of Goals & Objectives (29b7e8aabbb48021ba93e6ad24b3b577)"
    - "notion: one Webex outbox row, Status Held"
    - ".roadmap-pack/ (gitignored working folder)"
idempotency_key: "roadmap-pack:{iso_week}"
dry_run: false
output:
  schema:
    iso_week: string
    pack_url: string
    outbox_row: string
    scope: "{baseline, now, added, untracked}"
    warnings: "list"
    status: "ok|partial|error"
---

# Roadmap pack: the weekly picture of where BOB stands

## Purpose

Most of the team never opens the roadmap or the dashboard, so once a week the state of
BOB lands where they already are: one picture and one PDF in the App Team space. The
picture answers four questions: how far along are we, what's next and is it blocked,
how much has the scope grown since the voice-first reshape on **3 Nov 2026** (Sean's
chosen baseline), and where we are on the journey. The PDF is the full report.

Roadmap Watch (`agents/roadmap-watch.md`) stays the drift report; the pack reads it and
doesn't repeat its work. Notion is the roadmap of record: the pack never edits a row.

## Where things are

| What | ID |
|------|----|
| Product Roadmap, agent view (view mode only) | `view://3f47e8aa-bbb4-818c-a54e-000c04b1a71b` |
| Roadmap Reports (Roadmap Watch pages and the packs) | `3ec7e8aabbb481c09e57c7926468235c` |
| Roadmap pack · build files (fonts, wordmark, 3 Nov baseline) | `4237e8aabbb481ecb0a8fe5e7aef6d47` |
| Goals & Objectives (picture and PDF at the top) | `29b7e8aabbb48021ba93e6ad24b3b577` |
| Webex outbox | `collection://f73b099a-ad3e-45ed-bb7e-31da773ab08d` |
| Build tool | `tools/roadmap-pack/roadmap_pack.py` (Python 3 standard library + headless Chromium) |

The brand fonts are licensed, so they live in the build-files page in Notion and never
in Git. Don't rename, move or delete that page or its file.

## Steps

Work in `.roadmap-pack/{date}/` (gitignored). `{date}` is today, `{iso_week}` e.g. `2026-W49`.

1. **Idempotency.** If Roadmap Reports already has a child page
   `Roadmap pack — {iso_week}`, stop with `no-op` unless the run is manual (then update
   that page and its outbox row instead of making new ones).
2. **Roadmap Watch.** Fetch Roadmap Reports and open `Roadmap Watch — {iso_week}`. If
   it isn't there yet, wait 20 minutes and look once more; still missing → use the
   latest one (the build adds a "this week's hasn't been written yet" warning). Write
   `report.json`:
   `{"week","title","url","parsed":{"summary":["12 changes","9 drift","2 at-risk milestones","6 untracked"],"done":n,"story":"…","risk":["…"],"untracked":["…"]}}`
   - `summary` is the report's Summary line split on `·`, words as written.
   - `done`: how many Asana/Jira items it counts as done this week, if it says; else omit.
   - `story`: the report's opening narrative in one paragraph; `risk`: one string per
     at-risk milestone; `untracked`: one string per "New untracked work" line (name and
     source, no links).
3. **Roadmap rows.** Query the agent view in view mode, `page_size` 100, following
   `next_cursor` until `has_more` is false. Save each response as is to `p1.json`,
   `p2.json`, …. Never SQL or rows mode.
4. **Build files and last week.** Fetch the build-files page and download
   `roadmap-pack-assets.json` (`notion-get-file-download-urls` on its
   `notion-file-block://` reference, then `curl -sS -o assets.json "<url>"`; the URL
   lasts 5 minutes). Open the newest earlier `Roadmap pack — …` page under Roadmap
   Reports and download its `roadmap-<date>.json` the same way as `prev.json`. Missing
   → run without `--prev` (the build warns; the week section is then hidden).
5. **Build.**
   `python3 tools/roadmap-pack/roadmap_pack.py all --work .roadmap-pack/{date} --assets assets.json --report report.json --prev prev.json --date {date} p*.json`
   It prints a JSON summary (rows, week, since last week, scope, warnings) and writes
   `card.png`, `report.pdf` and `roadmap-{date}.json`. A non-zero exit is a failed run:
   log the message, publish nothing.
   No browser found → `npx -y playwright install chromium` once, then rerun `render`.
6. **Check before publishing.** Look at `card.png` (Read it). Stop and log `partial`
   without publishing if the picture is blank or cut off, if Notion returned fewer
   than 90% of last week's rows, or if the scope numbers look impossible (e.g. negative
   totals). Other warnings go into the pack page's callout, not the post.
7. **Pack page.** Upload `card.png` as `BOB Roadmap {iso_week}.png`, `report.pdf` as
   `BOB Roadmap Report {iso_week}.pdf` and `roadmap-{date}.json` (Notion `notion-create-file-upload`, then one
   `curl -sS -X POST "<upload_url>" -H "authorization: <header>" -F "file=@card.png;type=image/png"`;
   use the returned `file-upload://` source). Each upload can be used **once**, so
   upload the picture and the PDF again for Goals & Objectives and for the outbox row. Create `Roadmap pack — {iso_week}` under Roadmap
   Reports like the W48 page: one intro line with a mention of that week's Roadmap
   Watch page, the image, the PDF, "Webex post (App Team, held for Sean's approval)"
   with the post text, warnings in a callout if any, and "Data for next week's pack"
   with the JSON file (next week's run reads it, so it must be there).
8. **Goals & Objectives.** Fetch the page. Replace the image block right under the
   📊 callout (copy its whole `<image source="notion-file-block://…">…</image>` text
   from the fetch) with the new picture, caption `BOB roadmap · week {nn} ({d Mon yyyy})`,
   and the `<file …>PDF report · BOB roadmap · …</file>` block after it with the new
   PDF, caption `PDF report · BOB roadmap · week {nn}, {d Mon yyyy} (download, print or forward)`.
   Leave the callout and everything else alone.
9. **Webex post.** One outbox row: Title and Marker `Roadmap pack: {iso_week}`, Space
   `App Team`, Agent `other`, Status **`Held`**, Approved unticked, Source the pack
   page, Post after now, Expires Friday 23:59 that week, Attachment the picture and the
   PDF, the message in the row's body and in **Message**, starting with the bold
   marker line `**Roadmap pack: {iso_week}**`. Sean ticks Approved; the courier posts it.
10. **Run log** as `RUNTIME.md` describes: Agent `other` (Run `roadmap-pack …`),
    Outcome `ok` (the post is held, nothing went out), Link the pack page.

## The post

Written as Sean, to the team, in his voice (`docs/app-support-voice-sean.md`): long
connected sentences joined with "and", "so", "but"; first person; no headline voice,
no clipped fragments, no em-dash staccato, no corporate filler. Four or five short
paragraphs, from the build's JSON summary and the Roadmap Watch report:

1. What this is: this week's pack, picture and PDF attached (first sentence only; no
   "first of the weekly packs" after week 48).
2. What got done: the "since last week" Done count and the one or two that matter
   (milestones first).
3. Scope: baseline → now in live items, how many of the added rows went into Phase 1,
   whether anything left Phase 1, and the untracked count with two or three examples
   with their ticket keys. Say plainly if it's growing; if it shrank or held, say that.
4. Next: the next milestone, days out, and its open blocker with the ticket key.
5. "If something in the picture looks off to you, tell me and we fix it in Notion,
   since that's where all of this comes from." (or close to it)

Week 48's post on its pack page is the model. No numbers that aren't in the summary
or the report.

## Hard rules

1. **Read-only** on the roadmap, Asana and Jira. Writes: the pack page, the two blocks
   on Goals & Objectives, one outbox row, the run-log row.
2. **Held, never Queued.** The post waits for Sean's Approved tick, every week.
3. **Internal only.** The pack goes to App Team and Notion. It carries roadmap scope,
   so it never goes to a market, partner or public space.
4. **Launch facts come from Notion as written.** Don't add launch places or dates the
   roadmap doesn't say, and don't drop a warning to make the post read better.
5. **One pack per ISO week** from the schedule.
