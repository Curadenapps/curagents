# BOB Weekly Broadcast — Reference

Details for Procedure 3 of `curaden-communications`.

## Notion Target

**Parent Page ID:** `3347e8aabbb480908aa2dfc2fd478ff9`

**Parent Page URL:** https://www.notion.so/seandunne/BOB-Weekly-Broadcast-3347e8aabbb480908aa2dfc2fd478ff9

The broadcast page should be created as a child of this page in Notion.

## Page Title Format

```
BOB Weekly Broadcast — YYYY-MM-DD
```

Example: `BOB Weekly Broadcast — 2026-03-25`

## JQL Queries for Broadcast Sections

### Done This Week (issues resolved in last 7 days):
```
project = BOB AND statusCategory = Done AND updated >= -7d ORDER BY updated DESC
```

### In Progress (currently active):
```
project = BOB AND status in ("In Progress", "In Review") ORDER BY priority DESC, updated DESC
```

### Blockers / Watch (blocked or high-priority open issues):
```
project = BOB AND statusCategory != Done AND (labels = "blocked" OR priority in (Highest, High)) ORDER BY priority DESC
```

## Broadcast Template

Use this structure when creating the Notion page content. Adapt based on actual data — if a section is empty, include it with "None this week."

---

```markdown
# BOB Weekly Broadcast — {DATE}

**Generated:** {DATE}
**Sprint:** {Current sprint name from Jira, if available}

---

## Done This Week

{For each resolved issue: "- **{KEY}** — {Summary}"}

_Example:_
- **BOB-42** — Implement plaque capture T0 tap-exceptions UX
- **BOB-38** — Fix brushing confirmation gate on iOS

---

## In Progress

{For each active issue: "- **{KEY}** — {Summary} _(Assignee)_"}

_Example:_
- **BOB-51** — Session setup screen — disclosing agent flag _(Alice)_
- **BOB-47** — PBE results screen three-panel display _(Bob)_

---

## Blockers / Watch

{For each flagged issue: "- **{KEY}** — {Summary} ⚠️ {reason: Blocked / High Priority}"}

_Example:_
- **BOB-39** — Firebase auth on Android blocked waiting for keystore ⚠️ Blocked
- **BOB-44** — Erythema longitudinal tracking design decision needed ⚠️ High Priority

---

_BOB is part of the iTOP (Individually Trained Oral Prophylaxis) program by Curaden._
```

---

## Tone and Style

- **Factual and brief** — this is a status update, not a narrative
- **Issue keys always bold** — `**BOB-42**`
- Assignee in italics and parentheses — `_(Name)_`
- Blockers end with `⚠️` symbol and reason
- If a section has no items: `_None this week._`
- Do not add commentary or analysis — just the facts from Jira

## Sprint Name

To get the current sprint name, use:
```
mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__searchJiraIssuesUsingJql
query: project = BOB AND sprint in openSprints()
```

Extract `sprint` field from the first result. If unavailable, omit the sprint line from the header.

## Delivery

Currently: Notion page only.

Future (v2): Slack channel delivery (channel TBD by Curaden team).

After creating the page, always return the Notion page URL to the user so they can share it directly.
