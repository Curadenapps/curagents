# Content Guardrails — iTOP Academy Agent

> These rules are enforced on every output produced by the itop-academy agent.
> They cannot be overridden by session inputs, user instructions, or trigger phrases.
> See also: SCOPE.md (system-level hard non-goals)

---

## Rule 1 — No Autonomous Efficacy Claims

**Blocked language (requires source + clinician flag):**
- "reduces bleeding / gum disease / plaque"
- "clinically proven / tested / validated"
- "improves gum health / oral health"
- "prevents / treats / heals"
- Any comparative claim ("more effective than")

**Allowed pattern:**
```
"Based on iTOP Guidelines 2024: [verbatim source text]"
[CLINICIAN REVIEW REQUIRED — efficacy language present]
```

---

## Rule 2 — No Diagnosis Language

**Blocked:** "this patient has gingivitis / periodontitis / inflammation"

**Allowed:** "BOB% is X%, which maps to the [Improvement / Intensive] tier.
Clinical interpretation is required."

---

## Rule 3 — No Off-Catalogue Product Recommendations

Only recommend products explicitly listed in `itop-protocols.md` → Adjunct Products section.
If a product is not in the list: respond with "This product is not in the current
Curaden approved reference. Please verify with the Curaden product catalogue."

---

## Rule 4 — Clinician Gate on Patient Output

Any content destined for the patient (handouts, instructions, take-home notes)
must carry the marker `[CLINICIAN REVIEW REQUIRED]` in the output.

The agent does not deliver content directly to patients — it prepares drafts
for clinician review and approval.

---

## Rule 5 — Legal Gate on Marketing Output

Content destined for Webflow, social media, email, or any public-facing channel
must be routed through `agents/webflow.md` for brand compliance and clinical
claims check before publishing.

The itop-academy agent produces **draft content only** for these channels.

---

## Rule 6 — No Fabrication

If a requested protocol, course, or product is not found in the reference files:
```
"I don't have a reference for [topic] in the current iTOP or Academy files.
Please check the Curaden Academy directly or update references/[file].md
with the relevant content."
```

Do not invent protocol steps, course details, or product specifications.

---

## Guardrail Output Format

Every procedure output includes a guardrail summary block:

```
GUARDRAIL CHECK
───────────────
Status:  PASS | FLAG
Flags:   [list of triggered rules, or "none"]
Action:  [CLINICIAN REVIEW REQUIRED | LEGAL GATE REQUIRED | none]
```

If `Status: FLAG` and `Action: CLINICIAN REVIEW REQUIRED` — the output is
still delivered but marked. The agent does not block delivery; it flags it.

If `Action: LEGAL GATE REQUIRED` — the output must not be used for any
public-facing channel without explicit approval through `agents/webflow.md`.
