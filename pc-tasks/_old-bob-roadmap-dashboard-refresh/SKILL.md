---
name: bob-roadmap-dashboard-refresh
description: Every Monday 09:15: rebuild the BOB roadmap dashboard snapshot from Notion and replace the embed at the top of Goals & Objectives.
---

Rebuild the BOB roadmap dashboard snapshot and replace the HTML embed at the top of the Notion page "Goals & Objectives". Read-only on every Notion database row; the only Notion write is swapping that one embed block (and its caption).

Folder: C:\Users\sean.dunne\Projects\App Website\Marketing\presentations\bob-roadmap-dashboard (read BRIEF.md there if anything below is unclear). Use the Notion connector tools (mcp__58bd2daa-...__notion-*; load them with ToolSearch). NEVER use SQL mode of notion-query-data-sources: it has a workspace quota that also locks out the live dashboard. Use view mode only.

1. Rows. Query the Product Roadmap in view mode on the unfiltered view "Agents: all rows (don't filter)":
   notion-query-data-sources with data = {"mode":"view","view_url":"https://app.notion.com/p/751b6071283e43e8b1a91054319e0db6?v=3f47e8aabbb4818ca54e000c04b1a71b","page_size":100} and then again with "start_cursor": <next_cursor> until has_more is false.
   Save every page as a JSON file in %TEMP%\rm\ (p1.json, p2.json, ...). Large results are saved by the harness to a tool-results file under C:\Users\sean.dunne\.claude\projects\...; that path is longer than Windows allows for Python, so copy it with Bash (cp "<that path>" "$TEMP/rm/p1.json"). If a page comes back inline (the last page is often small), write it to a file yourself with the Write tool, exactly as returned ({"results":[...],"has_more":false}).

2. Weekly report. notion-search with {"query":"Roadmap Watch","page_size":10}; pick the title "Roadmap Watch — YYYY-Wnn" with the highest year and week; notion-fetch it. Write %TEMP%\rm\report.json as {"week":"YYYY-Wnn","title":<page title>,"url":<page url>,"parsed":{"summary":[...],"story":"...","risk":[...]}}:
   summary = the "**Summary:**" line in the first callout split on " · " (plain text, no markdown);
   story = the first plain paragraph after the callout;
   risk = the bullet lines under "## At-risk milestones" (plain text; unescape \[ \] and drop ** markers; keep each under ~260 characters).

3. Build. From the folder: python _build/make_snapshot_data.py "%TEMP%\rm\p1.json" "%TEMP%\rm\p2.json" ... --report "%TEMP%\rm\report.json", then python _build/build.py. The build must print "snapshot <bytes> ... OK". If it says TOO BIG, stop and report instead of uploading.

4. Upload. notion-create-file-upload with {"filename":"bob-roadmap-dashboard.html"}, then immediately one multipart POST with curl:
   curl -sS -X POST "<upload_url>" -H "authorization: <the authorization header value it returned>" -F "file=@_snapshot/bob-roadmap-snapshot.html;type=text/html;filename=bob-roadmap-dashboard.html"
   The response's markdown_source looks like file-upload://<id>.

5. Swap the embed. notion-fetch page 29b7e8aabbb48021ba93e6ad24b3b577 (Goals & Objectives). Near the top, right after the blue "BOB roadmap dashboard" callout, there is exactly one <embed src="notion-file-block://...">BOB roadmap dashboard · snapshot of ...</embed> line. Use notion-update-page with command "update_content" and one content_update whose old_str is that whole embed line exactly as fetched and whose new_str is <embed src="file-upload://<id>">BOB roadmap dashboard · snapshot of <today, e.g. 19 Oct 2026></embed>. Change nothing else on the page. If the embed line or the callout is missing, do not add or move anything: stop and report.

6. Fetch the page again and confirm the new embed is there. Finish with a short summary: rows read, snapshot size, the week of the Roadmap Watch report used, next milestone shown, and anything that failed. Don't commit anything to git.