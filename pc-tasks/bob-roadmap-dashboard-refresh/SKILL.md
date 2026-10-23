---
name: bob-roadmap-dashboard-refresh
description: Weekdays 09:15: rebuild the BOB roadmap dashboard snapshot from Notion and replace the embed at the top of Goals & Objectives.
---

Rebuild the BOB roadmap dashboard snapshot and replace the HTML embed at the top of the Notion page "Goals & Objectives". Read-only on every Notion database row; the only Notion write is swapping that one embed block (and its caption).

Folder: C:\Users\sean.dunne\Projects\App Website\Marketing\presentations\bob-roadmap-dashboard (read BRIEF.md there if anything below is unclear). Load the Notion connector tools with ToolSearch (search "notion"); never rely on a hard-coded connector id. NEVER use SQL mode of notion-query-data-sources: it has a workspace quota that also locks out the live dashboard. Use view mode only.

1. Rows. Query the Product Roadmap in view mode on the unfiltered view "Agents: all rows (don't filter)":
   notion-query-data-sources with data = {"mode":"view","view_url":"https://app.notion.com/p/751b6071283e43e8b1a91054319e0db6?v=3f47e8aabbb4818ca54e000c04b1a71b","page_size":100} and then again with "start_cursor": <next_cursor> until has_more is false.
   Save every page as a JSON file in %TEMP%\rm\ (p1.json, p2.json, ...; empty the folder first). Large results are saved by the harness to a tool-results file under C:\Users\sean.dunne\.claude\projects\...; that path is longer than Windows allows for Python, so copy it with Bash (cp "<that path>" "$TEMP/rm/p1.json"). If a page comes back inline, write it to a file yourself with the Write tool, exactly as returned ({"results":[...],"has_more":false}).

2. Weekly report. notion-search with {"query":"Roadmap Watch","page_size":10}; pick the title "Roadmap Watch — YYYY-Wnn" with the highest year and week; notion-fetch it. Write %TEMP%\rm\report.json as {"week":"YYYY-Wnn","title":<page title>,"url":<page url>,"parsed":{"summary":[...],"story":"...","risk":[...]}}:
   summary = the "**Summary:**" line in the first callout split on " · " (plain text, no markdown);
   story = the first plain paragraph after the callout;
   risk = the bullet lines under "## At-risk milestones" (plain text; unescape \[ \] and drop ** markers; keep each under ~260 characters).

3. Build. From the folder: python _build/make_snapshot_data.py "%TEMP%\rm\p1.json" "%TEMP%\rm\p2.json" ... --report "%TEMP%\rm\report.json", then python _build/build.py, then python _build/make_pdf.py (writes _snapshot/"BOB Roadmap Report.pdf", 8-9 A4 landscape pages). The build must print "snapshot <bytes> ... OK". If it says TOO BIG, stop and report instead of uploading.

4. Upload. notion-create-file-upload with {"filename":"bob-roadmap-dashboard.html"}, then immediately one multipart POST with curl:
   curl -sS -X POST "<upload_url>" -H "authorization: <the authorization header value it returned>" -F "file=@_snapshot/bob-roadmap-snapshot.html;type=text/html;filename=bob-roadmap-dashboard.html"
   The response's markdown_source looks like file-upload://<id>.
   Do the same for the PDF: copy it to "$TEMP/rm/report.pdf" (no spaces), notion-create-file-upload {"filename":"BOB Roadmap Report YYYY-MM-DD.pdf"}, and POST it with -F "file=@$TEMP/rm/report.pdf;type=application/pdf;filename=<that filename>".

5. Swap the embed and the PDF. On page 29b7e8aabbb48021ba93e6ad24b3b577 (Goals & Objectives), right after the blue "BOB roadmap dashboard" callout, there is one <embed> ("BOB roadmap dashboard · snapshot of <date>") and below it one <file> ("PDF report · BOB roadmap · <date> ..."). notion-update-page "update_content" cannot match the stored file addresses, so use these anchors (they worked on 23 Oct):
   - old_str "<embed source=\"" -> new_str "<embed source=\"file-upload://<html id>\" previous=\"" (Notion ignores "previous" and keeps the new source);
   - old_str "<file source=\"" -> new_str "<file source=\"file-upload://<pdf id>\" previous=\"";
   - old_str "snapshot of <old date>" -> "snapshot of <today, e.g. 26 Oct 2026>" and "PDF report · BOB roadmap · <old date>" -> "PDF report · BOB roadmap · <today>" (read the old dates from notion-fetch first).
   Change nothing else. If the callout, the embed or the file block is missing, do not add or move anything: stop and report.

6. Fetch the page again and confirm the new embed and PDF are there. Finish with a short summary: rows read, snapshot size, the week of the Roadmap Watch report used, next milestone shown, and anything that failed. Don't commit anything to git.