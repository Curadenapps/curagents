---
name: feedback-qa
description: >
  Use this skill when the user wants to "triage feedback", "QA feedback",
  "process feedback", "review user comments", "what should we build next",
  "is this feedback useful", "check this report", "feedback report",
  or "promote {cluster id}". Collects user feedback from UAT reports, documents,
  and comments, stores it in a local feedback folder (never in Git), checks each
  item against the current BOB build and a verified change timeline, scores its
  usefulness, and recommends what is worth building next and what is not for BOB.
---

# Feedback QA

Turns scattered user feedback into a short, evidence-backed list of what to
build next for BOB, and says clearly what is noise, what is already done, and
what does not belong in BOB.

Read before every run:
- `references/rubric.md`: scoring, verdicts, BOB-fit gate, guardrails
- `references/ledger.md`: how the change timeline is built and cited
- `dream.md` §2 and `SCOPE.md`: what BOB is and is not

---

## Storage (local only, never committed)

All feedback lives under `FEEDBACK_ROOT` (default `.feedback/`, gitignored).
Point `FEEDBACK_ROOT` at a OneDrive or Google Drive synced folder if the team
needs to share it. Nothing in this folder is ever pushed to Git, Webex or any
public channel.

```
{FEEDBACK_ROOT}/
├── inbox/                  ← drop raw files here (PDF, DOCX, XLSX, CSV, TXT, MD, screenshots)
│   └── _processed/         ← raw files moved here after intake
├── items/
│   ├── build/              ← recommended for the next development step
│   ├── backlog/            ← valid, but not now
│   ├── needs-info/         ← cannot judge without more detail
│   ├── already-addressed/  ← matched to a verified change in the ledger
│   ├── not-for-bob/        ← out of scope, other app, or conflicts with requirements
│   ├── escalate/           ← clinical, legal or data-protection issues
│   └── noise/              ← not actionable
├── clusters.json           ← groups of items describing the same issue
├── index.json              ← dedupe index: id, content hash, source ref, verdict
├── ledger/changes.json     ← verified change timeline (see references/ledger.md)
└── reports/YYYY-MM-DD-feedback-qa.md
```

On the first run, create any missing folders and empty JSON files.

---

## Procedure 1: Triage run

Trigger: "triage feedback", "QA feedback", "what should we build next"

1. **Refresh the ledger.** Follow `references/ledger.md` §3. Only add entries
   that have a source URL. Record the current released BOB version per platform.
2. **Collect new feedback** from every configured source (§ Sources below).
   Skip anything whose content hash or source ref is already in `index.json`.
3. **Normalise** each item into one file (format in § Item file). Quote the
   feedback verbatim, with personal data redacted (rubric §6).
4. **Cluster.** Attach each item to an existing cluster in `clusters.json` if it
   describes the same problem, or create a new cluster. Frequency counts unique
   reporters, not repeated messages.
5. **Check against reality**, in this order (rubric §2):
   a. Ledger: was this already changed after the version the reporter used?
   b. Current build: does the behaviour described match what the current
      release shows, per the latest UAT report and store listing?
   c. BOB fit: `SCOPE.md`, Notion requirements (`.truth-cache/requirements.json`),
      and which app the feedback is really about.
6. **Score and assign a verdict** using the rubric. Move the item file into the
   matching `items/` subfolder.
7. **Write the report** to `reports/` (format in § Report) and show the user
   the summary and the top 5 BUILD candidates.

Do not create tasks, tickets or messages during a triage run. The run only
recommends.

## Procedure 2: Promote

Trigger: "promote CL-007", "build CL-007"

1. Load the cluster and its items. Refuse if the verdict is not BUILD or
   BACKLOG, and say why.
2. Re-run the ledger check for that cluster only (something may have shipped
   since the report).
3. Hand an `agent_call` to `asana-maintenance`: create a task in the BOB
   project Backlog section (IDs in `skills/uat/references/apps.md`) with the
   cluster summary, redacted quotes, report count, proposed acceptance
   criteria, and the report path. Respect `DRY_RUN`.
4. Record the Asana link in the cluster and add `promoted_at` to it.

## Procedure 3: Single check

Trigger: "is this feedback useful", "check this report" (with pasted text or a file)

Run steps 3 to 6 of Procedure 1 for that one input, file it, and answer in
under 10 lines: verdict, score, why, and what would change the verdict.

---

## Sources

| Source | How | Notes |
|--------|-----|-------|
| Inbox folder | Read files in `inbox/`, then move them to `inbox/_processed/` | Primary channel for documents, exports, email dumps |
| Confluence UAT reports | Pages listed in `skills/uat/references/uat-log.md`; read the Key Issues, Recommendations and Feature Assessment rows marked Issues Found or Broken | Tester is `internal-tester` |
| Asana | Tasks and comments in the BOB project App Requests section, via the Asana MCP | Read only |
| Notion comments | Only pages the user names | Read only |
| Pasted text | Procedure 3 | Source `manual` |

A source that fails is reported in the run summary and skipped. It never
blocks the run.

## Item file

`items/{verdict}/{YYYY-MM-DD}_{source}_{slug}.md`

```markdown
---
id: FB-2026-09-0012
received: 2026-09-28          # date the reporter gave the feedback, not the run date
collected: 2026-09-29
source: confluence-uat         # inbox | confluence-uat | asana | notion | manual
source_ref: <url or inbox/_processed/filename>
reporter_role: clinician       # clinician | patient | internal-tester | unknown
app: BOB App                   # the app the feedback is actually about
app_version: 2.3.1             # "unknown" if not stated; never guess
platform: ios                  # ios | android | both | unknown
area: results-screen
cluster: CL-007
verdict: build
score: 11/15
ledger_check: "No matching change after 2.3.1 (ledger checked 2026-09-29)"
reality_check: "Matches UAT 2026-05-07 iOS observation §2"
fit_check: "Fits Notion requirement: PBE results display"
---

## Feedback (verbatim, redacted)
> …

## Assessment
One paragraph: what the problem is, who it hits, and why this verdict.

## If built (BUILD and BACKLOG only)
- Acceptance criteria 1
- Acceptance criteria 2
```

## Report

```markdown
# BOB Feedback QA — {YYYY-MM-DD}

Window: {last run date} → today · Current release: iOS {v} ({date}), Android {v} ({date})
Intake: {n} new items from {sources} · {n} duplicates skipped · {n} sources failed

## Build next (ranked)
| # | Cluster | Problem | Reporters | Score | Evidence | Why now |

## Already addressed
| Cluster | Fixed in | Ledger source |

## Needs info
| Cluster | Question to ask the reporter |

## Not for BOB
| Cluster | Reason | Where it belongs, if anywhere |

## Escalations
| Cluster | Issue | Who needs to see it |

## Noise
{count} items. One line each with the reason.

## Ledger changes this run
{new entries, each with source}
```
