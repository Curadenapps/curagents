# Feedback QA — Rubric and Guardrails

## 1. Verdicts

| Verdict | Folder | Meaning |
|---------|--------|---------|
| BUILD | `build/` | Passes every gate, scores 10 or more, worth doing in the next cycle |
| BACKLOG | `backlog/` | Passes every gate, valid, scores 6 to 9 |
| NEEDS-INFO | `needs-info/` | Could be valid, but the problem cannot be identified or reproduced from what was given |
| ALREADY-ADDRESSED | `already-addressed/` | A cited ledger entry changed this after the version the reporter used |
| NOT-FOR-BOB | `not-for-bob/` | Fails the BOB-fit gate |
| ESCALATE | `escalate/` | Clinical, legal or data-protection issue. Never BUILD, whatever the score |
| NOISE | `noise/` | Scores 5 or less and nothing specific can be extracted |

Duplicates are not a verdict: they join the existing cluster and raise its
reporter count.

## 2. Gates (in order, stop at the first that applies)

1. **Escalation gate.** The feedback asks for, or reports, efficacy or medical
   claims, a diagnosis, a safety problem, or exposure of patient data. Then
   ESCALATE. The clinical claims rule in `dream.md` §2 applies.
2. **Ledger gate.** A ledger entry dated after the reporter's app version (or
   after `received`, if the version is unknown) covers the same area and
   behaviour. Then ALREADY-ADDRESSED, citing the entry id and its source URL.
   If the match is partial, keep going and note it.
3. **Reality gate.** The described behaviour contradicts the current build as
   shown in the latest UAT report or store listing (for example, a screen or
   button that no longer exists). Then NEEDS-INFO with the question "Which
   version and device?", unless the version is stated and old, in which case
   use the ledger gate.
4. **BOB-fit gate.** Any of these makes it NOT-FOR-BOB:
   - It is about another app or programme (Plaquefinder, RevolveNote, iTOP
     education content; education belongs to the education-agent repo).
   - It is listed under Out of Scope or v2-deferred in `SCOPE.md`.
   - It contradicts a Notion requirement in `.truth-cache/requirements.json`.
     Quote the requirement.
   - It serves a user group BOB does not target, or turns BOB into a
     different product.

   State where it belongs, if anywhere.
5. **Score** everything that passed.

## 3. Score (0 to 15)

| Dimension | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|
| Specificity | Vague ("it's bad") | Area named | Behaviour described | Steps or exact screen and action |
| Evidence | None | Version or device stated | Screenshot or recording | Reproduced in UAT |
| Reach | 1 reporter | 2 unique reporters | 3 to 4 | 5 or more, or all testers |
| Impact | Cosmetic | Friction, has a workaround | Blocks a secondary task | Blocks measurement, results or sync |
| Requirement link | None | Loosely related | Supports a Notion requirement | Needed to meet a Notion requirement |

BUILD at 10 or more. BACKLOG at 6 to 9. NOISE at 5 or less, unless the item
is plausible but under-specified, which makes it NEEDS-INFO.

Ranking within BUILD: impact first, then reach, then evidence.

## 4. Useful or useless

An item is **useful** if at least one of these can be pulled from it: a
reproducible defect, a specific friction point with its location, a missing
capability tied to a requirement, or a confirmed repeat of an existing cluster.

It is **useless** (NOISE) when none of those can be extracted: general
sentiment, praise without detail, requests with no problem behind them, test
messages, or content about something other than the app.

Praise is not noise if it is specific ("the results screen is finally
readable"). Record it under the cluster as confirmation that a change worked.

## 5. Anti-fabrication rules

- Quote feedback verbatim. Summaries go in the Assessment section, never in the quote.
- ALREADY-ADDRESSED always cites a ledger entry id and its source URL.
- A version, date, device or reporter role that was not given is `unknown`. Never infer it.
- Every BUILD row in the report links to at least one item file.
- If sources disagree (for example, Jira says done but the latest UAT shows the bug), say so and do not pick one silently. Prefer the most recent direct observation.
- Do not re-judge an item filed in a previous run unless it gained new
  evidence, its cluster grew, or a new ledger entry touches it. When a verdict
  changes, keep the old one in a `history:` list in the item frontmatter.

## 6. Personal data

BOB feedback can contain patient or clinician details. Before writing any item:

- Replace names, emails, phone numbers, practice names and patient identifiers
  with `[redacted]`. Reporter role stays.
- Never copy measurement values tied to an identifiable patient.
- Raw files stay in `inbox/_processed/`. They are never quoted in full in
  reports, and never leave `FEEDBACK_ROOT` except as redacted quotes in a
  promoted Asana task.
