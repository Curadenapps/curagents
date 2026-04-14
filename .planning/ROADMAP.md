# Roadmap: Curaden Communications Automation

## Overview

Starting from an empty skills folder, this roadmap delivers a single invokable skill that packages all three of Curaden's recurring cross-tool workflows — RevolveNote GitHub sync, Jira-to-Notion BOB issue sync, and BOB weekly broadcast — so any Claude session can trigger them by name. Phases follow the natural delivery order: scaffold the container, build each workflow in full, then ship the package.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Skill Scaffold** - Create the `skills/curaden-communications/` folder structure and SKILL.md entry point
- [ ] **Phase 2: RevolveNote Sync** - Implement the full RevolveNote-to-GitHub sync workflow including invocation trigger and references file
- [ ] **Phase 3: Jira-Notion BOB Sync** - Implement the full Jira→Notion BOB issue sync workflow including invocation trigger and JQL references file
- [ ] **Phase 4: BOB Weekly Broadcast** - Implement the full BOB weekly broadcast workflow including invocation trigger and broadcast template
- [ ] **Phase 5: Package and Ship** - Commit and push the completed skill to `github.com/Curadenapps/Agents`

## Phase Details

### Phase 1: Skill Scaffold
**Goal**: The `skills/curaden-communications/` folder exists with a working SKILL.md that Claude can load as a skill plugin
**Depends on**: Nothing (first phase)
**Requirements**: PKG-01
**Success Criteria** (what must be TRUE):
  1. `skills/curaden-communications/` folder exists in the Agents repo
  2. `SKILL.md` is present with valid YAML frontmatter and a skill body section
  3. A `references/` subdirectory exists, ready to receive per-workflow detail files
**Plans**: TBD

### Phase 2: RevolveNote Sync
**Goal**: Claude can run the RevolveNote GitHub sync on demand and get a confirmed push result with a list of changed files
**Depends on**: Phase 1
**Requirements**: SKILL-01, RNOTE-01, RNOTE-02, RNOTE-03, RNOTE-04, PKG-04
**Success Criteria** (what must be TRUE):
  1. Saying "run revolvenote sync" (or similar) causes Claude to execute the workflow without additional prompting
  2. The workflow stages all modified RevolveNote files and creates a timestamped commit in the format `sync: weekly revolvenote sync [YYYY-MM-DD]`
  3. The push reaches `github.com/Curadenapps/revolvenote` main branch
  4. Claude reports the list of changed files and confirms the push completed
  5. `references/revolvenote-sync.md` exists with repo path and excluded-files details
**Plans**: TBD

### Phase 3: Jira-Notion BOB Sync
**Goal**: Claude can run the Jira-to-Notion BOB issue sync on demand and report how many Notion pages were created and updated
**Depends on**: Phase 2
**Requirements**: SKILL-02, JIRA-01, JIRA-02, JIRA-03, JIRA-04, JIRA-05, PKG-02
**Success Criteria** (what must be TRUE):
  1. Saying "sync BOB to Notion" (or similar) causes Claude to execute the workflow without additional prompting
  2. All open BOB project Jira issues are queried using the JQL pattern from the references file
  3. New Notion pages are created for issues that have no existing page, with title, status, priority, and assignee populated
  4. Existing Notion pages have their status and priority fields updated
  5. Claude reports the count of created pages and updated pages on completion
**Plans**: TBD

### Phase 4: BOB Weekly Broadcast
**Goal**: Claude can run the BOB weekly broadcast on demand and return a live Notion page URL containing the formatted status summary
**Depends on**: Phase 3
**Requirements**: SKILL-03, BROAD-01, BROAD-02, BROAD-03, BROAD-04, BROAD-05, BROAD-06, PKG-03
**Success Criteria** (what must be TRUE):
  1. Saying "run BOB broadcast" (or similar) causes Claude to execute the workflow without additional prompting
  2. The broadcast covers Done issues (last 7 days), In Progress issues, and blocked or high-priority open issues as separate sections
  3. A new Notion page is created in the designated BOB broadcast space with all three sections formatted correctly
  4. Claude returns the URL of the created Notion broadcast page
  5. `references/bob-weekly-broadcast.md` exists with the broadcast template
**Plans**: TBD

### Phase 5: Package and Ship
**Goal**: The completed `skills/curaden-communications/` skill is committed and pushed to `github.com/Curadenapps/Agents` and accessible to any future Claude session
**Depends on**: Phase 4
**Requirements**: PKG-05
**Success Criteria** (what must be TRUE):
  1. The skill folder is committed to `github.com/Curadenapps/Agents` with all files present
  2. A Claude session that pulls the repo can locate and load the skill by referencing `skills/curaden-communications/SKILL.md`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Skill Scaffold | 0/? | Not started | - |
| 2. RevolveNote Sync | 0/? | Not started | - |
| 3. Jira-Notion BOB Sync | 0/? | Not started | - |
| 4. BOB Weekly Broadcast | 0/? | Not started | - |
| 5. Package and Ship | 0/? | Not started | - |

### Phase 6: iTOP Agent and Curaden Academy skill

**Goal:** Any Claude or Gemini session can look up iTOP protocols, generate a clinical session template pre-populated with BOB measurement data, and route to Curaden Academy content — all with enforced clinical guardrails that prevent autonomous efficacy claims, diagnosis language, or off-catalogue product recommendations
**Depends on:** Phase 5
**Requirements**: ITOP-01 through ITOP-08 (TBD — run `/gsd:plan-phase 6`)
**Success Criteria** (what must be TRUE):
  1. `agents/itop.md` exists with valid frontmatter, 3 procedures, guardrail rules, and BOB threshold mapping
  2. `skills/itop-academy/SKILL.md` exists with trigger phrases and procedure entry points
  3. `skills/itop-academy/references/` contains 4 reference files: protocols, BOB thresholds, content guardrails, academy catalogue
  4. Saying "look up Modified Bass technique" returns verbatim protocol text with a guardrail check
  5. Saying "generate session template" with a BOB result produces a populated template with all patient sections marked `[CLINICIAN REVIEW REQUIRED]`
  6. Saying "find academy course for [topic]" returns ranked Academy recommendations
  7. All outputs include a `GUARDRAIL CHECK` block — no efficacy claims pass without flagging
  8. Agent and skill are committed and pushed to `github.com/Curadenapps/Agents`
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6 to break down)
