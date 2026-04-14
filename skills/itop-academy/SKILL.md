---
name: itop-academy
description: >
  This skill should be used when the user asks to "look up an iTOP protocol",
  "generate a session template", "find a Curaden Academy course", "interpret a
  BOB result", "get iTOP recommendations", "route to Academy content", "what
  does iTOP say about", "template a patient visit", or when working with
  Curaden's oral prophylaxis methodology, BOB measurement data, or Curaden
  Academy educational content. Covers three procedures: protocol-lookup,
  session-template, and academy-routing.
---

# iTOP Academy Skill

Surfaces Curaden's iTOP methodology and Curaden Academy content in a
clinician-safe, structured way. This skill is an **information and templating
layer** — it does not diagnose, prescribe, or replace clinical judgement.

---

## When to Use Each Procedure

| Trigger | Procedure | Use when… |
|---------|-----------|-----------|
| "look up [technique/step]" | `protocol-lookup` | Clinician needs a protocol reference or guideline detail |
| "generate session template" | `session-template` | Creating pre/post-session documentation for a patient visit |
| "find academy course" | `academy-routing` | Clinician or patient needs a learning path or CPD content |

For full procedure steps, BOB threshold mappings, and guardrail rules: see [`agents/itop.md`](../../agents/itop.md).

---

## Procedure 1 — Protocol Lookup

**Trigger:** "look up iTOP protocol", "what does iTOP say about [topic]", "Modified Bass technique"

**Steps:**
1. Load `references/itop-protocols.md` — find the matching protocol section
2. Return the content verbatim — do not paraphrase clinical text
3. Tag the source section
4. Run a guardrail check if the content contains outcome language
5. Flag any section requiring clinician interpretation

**Output:** Protocol text + source citation + guardrail result (`PASS` or `FLAG`)

---

## Procedure 2 — Session Template

**Trigger:** "generate session template", "patient visit template", "create iTOP template"

**Steps:**
1. Identify session type: `initial`, `follow_up`, or `re_check`
2. If BOB result supplied: load `references/bob-thresholds.md`, map metrics to intervention tier
3. Populate template with iTOP methodology steps for the identified tier
4. Mark all patient-facing sections `[CLINICIAN REVIEW REQUIRED]`
5. Run guardrail check on any outcome or efficacy language

**Output:** Completed template markdown block + guardrail flag summary

---

## Procedure 3 — Academy Routing

**Trigger:** "find Curaden Academy course", "CPD for [topic]", "patient handout for [topic]"

**Steps:**
1. Identify role: `clinician` or `patient`
2. Load `references/academy-catalogue.md` — filter by role and topic
3. Return top 1–3 matching entries (title, format, duration, URL)
4. Always prioritise clinician-level material for clinical topics regardless of stated proficiency

**Output:** Ranked list of Academy recommendations with relevance notes

---

## Quick Reference

| Item | Value |
|------|-------|
| Agent file | `agents/itop.md` |
| Jira MCP | `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__*` |
| Notion MCP | `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__*` |
| Guardrails | `references/content-guardrails.md` |
| BOB thresholds | `references/bob-thresholds.md` |

## Guardrail Summary (always enforced)

- No efficacy claims without source + clinician flag
- No diagnosis language
- No off-catalogue product recommendations
- All patient output → `[CLINICIAN REVIEW REQUIRED]`
- Marketing channel output → must route through `agents/webflow.md`
