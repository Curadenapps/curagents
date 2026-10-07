---
name: feedback-qa
description: >
  Use this skill when the user wants to "triage feedback", "QA feedback",
  "process feedback", "review user comments", "what should we build next",
  "send QA report", "is this feedback useful", or "promote {item}". Reads new
  feedback notes from the Notion inbox, checks them against the current BOB build
  and a sourced change timeline, sorts them into must-have / should-have / quick
  wins / nice-to-have, and — once there is enough to be worth people's attention —
  sends a PDF report to the Webex QA channel. A full UAT is also published to
  Confluence with the same content.
---

# Feedback QA

```
You drop notes in Notion ──► agent picks up what's new and is feedback
                              │
                              ├─ checks: already fixed? matches current build? right for BOB? useful?
                              │
                              ├─ not enough yet ──► holds it for the next report
                              │
                              └─ worth reporting ─► PDF report ──► Webex QA channel
                                                     │
                                                     ├─ full UAT ──► same content published to Confluence
                                                     └─ "promote" ─► Asana (rare, through asana-maintenance)
```

Read before every run:
- `references/rubric.md`: checks, report sections, when a report is worth sending, guardrails
- `references/ledger.md`: how "already addressed" is proven
- `references/report-template.html`: the report layout (PDF and Confluence use the same content)

---

## Inbox (Notion)

Database **Tasks & Notes** (under Inbox):
`collection://35a7e8aa-bbb4-8126-9b9b-000b4b0a44db`

This database is shared with the Webex/meeting task pipeline. Its `Status`
column (new → task → approved → pushed) belongs to that pipeline. This skill
tracks its own progress in the **QA** column instead:

| QA value | Set by | Meaning |
|----------|--------|---------|
| *(empty)* | — | Not looked at yet |
| `uat` | Sean | Notes from a full UAT. Always reported, and published to Confluence |
| `feedback` | agent | Feedback, waiting to go into the next report |
| `reported` | agent | Included in a sent report |
| `not-qa` | agent | A task, plan or admin note, not feedback |

How to drop feedback: add a row, put the feedback in `Notes` or in the page
body (paste as much raw text as you like), and set `Source`. For a full UAT,
also set **QA = uat** and put the build or version in the title.

Status rule: when the agent claims a row whose `Status` is `new` as feedback,
it sets `Status = reference` so the task pipeline does not push it to Asana.
It never changes any other `Status` value.

---

## Procedure 1: QA run

Trigger: "triage feedback", "QA feedback", "what should we build next"

1. **Pick up new rows.** Query rows where QA is empty or `uat`. Read `Notes`, and
   fetch the page body when `Notes` is empty, cut short, or the row is `uat`.
2. **Classify each row.** Feedback means a person's comment about how an app
   behaves or should behave: bug reports, UAT results, customer issues, feature
   requests, praise with detail. Tasks, plans, scheduling and admin notes are
   `not-qa`. One row can hold several feedback points; split them.
   Write QA = `feedback` or `not-qa` on each row as you go (keep `uat` as is).
3. **Refresh the ledger** for the areas the feedback touches (`references/ledger.md`).
4. **Check each feedback point** with the gates in `references/rubric.md` §2,
   then score what passes (§3). Count repeats across people, including rows
   marked `reported` in the last 90 days, so recurring issues get noticed.
5. **Decide whether to report** (`references/rubric.md` §5).
   - No: tell the user what is waiting and why it is not reported yet. Stop.
   - Yes: continue.
6. **Build the report.** Fill `references/report-template.html` and save it as
   `.feedback/reports/{YYYY-MM-DD}-{app}-qa.html`. Then render the PDF:
   ```
   node scripts/qa-report.mjs pdf .feedback/reports/{file}.html
   ```
7. **Send it to Webex.** Write the short summary (format below) to
   `.feedback/reports/{file}.md`, then run:
   ```
   node scripts/qa-report.mjs webex .feedback/reports/{file}.pdf .feedback/reports/{file}.md
   ```
8. **Full UAT only** (any included row has QA = `uat`): create a Confluence page
   under **BOB App UAT** (page `1933795`, space APPS) titled
   `{App} {build}: UAT Feedback Summary ({D Month YYYY})`, using the same
   content as the PDF. Then add the Confluence link to the matching entry in
   `skills/uat/references/uat-log.md` and set its Outcome.
9. **Close the loop.** Set QA = `reported` on every row the report used, and
   tell the user: what was sent, where, and the Confluence link if there is one.

`DRY_RUN=true` stops at step 6: the PDF is built, nothing is sent, published or
written back to Notion.

## Procedure 2: Send now

Trigger: "send QA report"

Run Procedure 1 but skip the threshold in step 5.

## Procedure 3: Promote to Asana

Trigger: "promote {item}"

Normally not needed for QA. When asked, hand an `agent_call` to
`asana-maintenance` to create a task in the BOB project Backlog section (IDs in
`skills/uat/references/apps.md`) with the item, who raised it, the proposed
acceptance criteria, and a link to the report. Respect `DRY_RUN`.

## Procedure 4: Single check

Trigger: "is this feedback useful" (with pasted text)

Run the gates and score for that one input and answer in under 10 lines: where
it lands, why, and what would change that. Do not write anything.

---

## Webex summary format

Keep it short. The PDF carries the detail.

```markdown
**{App}: Feedback QA Report ({D Mon YYYY})**
{UAT {build} | Feedback round} · {n} notes from {names} · {date range}

**Must-have**
- {item} ({raised by})

**Blocker / needs attention**
- {item or "None"}

{n} should-have · {n} quick wins · {n} nice-to-have · {n} already addressed · {n} not for BOB
Full report attached.{ Confluence: {link}}
```
