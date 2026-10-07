# Feedback QA — Rubric and Guardrails

## 1. Where each feedback point ends up

The report follows the layout of the BOB App Overhaul UAT summary in
Confluence (page 217939969).

| Report section | What goes there |
|----------------|-----------------|
| **Must-have** | Blocks a core flow (measurement, scoring, results, sending), or is needed before the next release. Score 10+ and impact 3 |
| **Should-have** | Worth doing in the next cycle. Score 10+ |
| **Quick wins** | Wording, labels, order, small visual fixes. Any score 6+ where the fix is copy or ordering |
| **Nice-to-have / to evaluate** | Valid, but not now. Score 6 to 9 |
| **What is working (keep)** | Specific praise. Confirms a change worked |
| **Already addressed** | A ledger entry proves it changed after the version the person used |
| **Not for BOB** | Another app, out of scope, or contradicts a Notion requirement |
| **Open points** | Needs more information, needs clinical or legal input, or sources disagree |
| *(left out, counted)* | Noise: nothing specific can be pulled from it |

Every row in every section says who raised it.

## 2. Checks (in order, stop at the first that applies)

1. **Needs attention.** Efficacy or medical claims, a diagnosis, a safety
   problem, patient data exposure, or security (for example storing passwords
   in the app). Goes to Open points, flagged for clinical, legal or technical
   review. Never Must-have or Should-have on its own. The clinical claims rule
   in `dream.md` §2 applies.
2. **Already addressed.** A ledger entry dated after the person's version (or
   after `Captured at`, if the version is unknown) changed the same behaviour.
   Cite the entry and its source link. A partial match is noted, and the check
   carries on.
3. **Matches the current build.** If the described screen or behaviour does not
   exist in the current build (per the latest UAT or store listing), it goes to
   Open points with the question "Which version and device?", unless the
   version is stated and old, in which case check 2 applies.
4. **Right for BOB.** Not for BOB if any of these is true:
   - It is about another app (Curaprox app, Curaden app, Plaquefinder,
     RevolveNote) or education content (education-agent repo). Say where it belongs.
   - It is Out of Scope or v2-deferred in `SCOPE.md`.
   - It contradicts a Notion requirement. Quote the requirement.
   - It turns BOB into a different product or serves a user group BOB does not target.
5. **Score** what passed (§3) and place it (§1).

## 3. Score (0 to 15)

| Dimension | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|
| Specificity | Vague ("it's bad") | Area named | Behaviour described | Steps, or exact screen and action |
| Evidence | None | Version or device stated | Screenshot or recording | Seen in a UAT |
| Reach | 1 person | 2 people | 3 to 4 | 5 or more, or every tester |
| Impact | Cosmetic | Friction with a workaround | Blocks a secondary task | Blocks measurement, results or sending |
| Requirement link | None | Loosely related | Supports a Notion requirement | Needed to meet a Notion requirement |

Order within a section: impact, then reach, then evidence.

## 4. Useful or not

Useful when at least one of these can be pulled from it: a reproducible
problem, a specific friction point and where it happens, a missing capability
tied to a requirement, or a repeat of something others raised.

Noise when none can: general sentiment, praise without detail, requests with
no problem behind them, test messages, or content about something other than
an app. Noise is left out of the report and only counted.

## 5. When a report is worth sending

Send when any of these is true:

- A row has QA = `uat` (a full UAT is always reported).
- Anything lands in Must-have or needs attention (§2 check 1).
- 5 or more points are waiting in Must-have, Should-have or Quick wins.
- The oldest waiting feedback is more than 14 days old.
- Sean says "send QA report".

Otherwise hold everything as QA = `feedback` and say what is waiting.

## 6. Keeping it honest

- Quote feedback word for word in the Raw feedback section. Summaries go in the
  other sections, never in quotes.
- "Already addressed" always cites a ledger entry and its source link.
- A version, date or device nobody gave is "unknown". Never guess it.
- If sources disagree (Jira says done, a newer UAT still shows the bug), put it
  in Open points and say so. Prefer the most recent direct observation.
- Every point links back to its Notion row.

## 7. Personal data

Reports go to internal channels (Webex QA channel, Confluence APPS space).

- Keep the names of testers, clinicians and colleagues: "Raised by" is how
  repeats are counted.
- Remove patient names and identifiers, and any measurement values tied to an
  identifiable patient.
- Remove customer contact details (email, phone). Keep "customer" and their
  country or practice type if given.
- Never include login credentials, practice IDs or tokens that appear in notes.
