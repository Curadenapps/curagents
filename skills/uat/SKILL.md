---
name: uat
description: >
  Full UAT (User Acceptance Testing) workflow for Curaden/Curaprox apps and major features.
  Use this skill whenever the user mentions UAT, testing a new build, a new app version is out,
  or a large feature needs sign-off before going to production. Triggers on phrases like
  "UAT [app]", "run UAT for [feature]", "new build of [app]", "test the new version",
  "we have a new build", or "set up UAT". Also triggers when the user wants to test a specific
  feature across Android and iOS before publishing. Creates Asana tasks, Confluence UAT pages,
  optionally a Notion user guide draft, and always updates the UAT log — systematically applied
  every single time without exception.
---

# UAT Workflow

This skill automates the full UAT setup process: checking the latest app version, creating
Asana tasks with platform subtasks, building structured Confluence UAT pages, optionally
drafting a Notion user guide, and logging the UAT to the running audit trail.

**Every UAT run must complete all applicable steps. Nothing is optional except the Notion guide.**

---

## Reference files — read these first

Before starting, read these two files:

- `references/apps.md` — IDs for every app (Asana, Confluence, Notion). Always pull IDs from
  here rather than guessing or using hardcoded values.
- `references/uat-log.md` — the running UAT audit trail. You must append to this at the end
  of every run.

If an app is not listed in `references/apps.md`, ask the user for the missing IDs and add
them to the file before proceeding.

---

## Step 1 — Understand what is being tested

Determine:

1. **App or Feature?**
   - Full app release: proceed to Step 2 to check store versions
   - Specific feature: skip Step 2, ask for feature name and brief description

2. **App name** — look it up in `references/apps.md`. If not found, check https://www.curaprox-apps.com/

3. **Platform(s)** — Android, iOS, or both (default: both)

4. **Notion user guide needed?** — only if build/feature is heading to PROD after passing UAT.
   Ask if not clear.

If the user says "UAT BOB App" with no other context, that is enough — use defaults, do not
ask unnecessary questions.

---

## Step 2 — Check app store versions (full app releases only)

Fetch the Play Store and App Store pages from `references/apps.md` in parallel.
Extract the current published version number.

- Play Store: look for version in the "Additional information" section
- App Store: look for "Version X.X.X" in the page body

Confirm with the user before proceeding:
> "Found BOB App v2.3.1 on Android and v2.3.0 on iOS. Shall I proceed with UAT setup?"

If versions differ between platforms, flag this — it affects UAT scope.
For feature UATs, use the feature name in place of a version number in all titles.

---

## Step 3 — Create Asana tasks

Pull the project GID and Backlog section GID from `references/apps.md`.

Default assignee: Sean Dunne (GID: 1207214370347615) — see Named assignees in references/apps.md
Default due date: 7 days from today

### Task structure — create in this order

**1. Parent task**
- Name: "UAT - [App Name] v[version] (Android & iOS)" or "UAT - [Feature Name]"
- Project: from apps.md, Backlog section
- Assignee: Sean Dunne (default) — override from Named assignees in references/apps.md if needed
- Due: 7 days from today
- Notes: what is being tested + links to Confluence pages (add after Step 4)

**2. Android subtask** (parent = parent task GID)
- Name: "UAT - [App Name] v[version] - Android"
- Notes: link to Android Confluence page

**3. iOS subtask** (parent = parent task GID)
- Name: "UAT - [App Name] v[version] - iOS"
- Notes: link to iOS Confluence page

After Step 4, go back and update the parent task notes with both Confluence page links.

---

## Step 4 — Create Confluence UAT pages

Create two child pages under the app's UAT parent page (from `references/apps.md`).

Cloud: curaden-apps.atlassian.net | Space: APPS

Page titles:
- "[App Name] v[version] UAT - Android"
- "[App Name] v[version] UAT - iOS"

### Page template (use for both, adjust platform label)

```
# User Acceptance Testing (UAT) Report

**Product**: [App Name]
**Test Type**: Functional & UX Evaluation
**Platform**: [Android / iOS]
**Tester**: [Assignee name from references/apps.md — default: Sean Dunne]
**Test Date**: To be completed
**App Version**: [version]
**Asana Task**: [link to parent Asana task]

---

## Overview
[Brief description of what the app/feature does and what this UAT is assessing.]

---

## Feature Assessment

| Feature | Status | Notes |
| --- | --- | --- |
| Onboarding / Registration | Not tested | |
| Login / Authentication | Not tested | |
| Home / Dashboard | Not tested | |
| [Core feature 1] | Not tested | |
| [Core feature 2] | Not tested | |
| Push Notifications | Not tested | |
| Settings / Profile | Not tested | |
| Navigation & Flow | Not tested | |
| Performance / Load Times | Not tested | |

Status Key: Working / Issues Found / Broken (Blocker) / Not tested

---

## Test Observations

### 1. Onboarding & Authentication
[Describe the experience. Note friction points, missing validations, UX issues.]

### 2. Core Features
[Walk through each feature. Capture what works, what does not, unexpected behaviour.]

### 3. UI & Navigation
[Visual consistency, layout, responsiveness, navigation flows. Platform-specific quirks.]

### 4. Performance
[Load times, crashes, freezes, degraded performance.]

### 5. Platform-Specific Notes
[Anything unique to this platform — OS behaviour, hardware differences, store-specific flows.]

---

## Key Issues Identified

| Area | Issue Summary |
| --- | --- |
| | |

---

## Recommendations

| Area | Suggestion |
| --- | --- |
| | |

---

## UAT Outcome

| | |
| --- | --- |
| Overall Result | Approved / Approved with conditions / Rejected |
| Sign-off | |
| Date | |
| Notes | |

---

## Conclusion
[Overall outcome. Clear recommendation on whether to proceed to PROD.]
```

For feature UATs, tailor the Feature Assessment table to the feature's specific components
rather than generic app screens.

---

## Step 5 — Notion user guide draft (only if confirmed in Step 1)

Parent: collection://1f97e8aa-bbb4-81c1-8277-000b39b5c1b2

Properties:
- Name: "[App Name] - User Guide" or "[Feature Name] - How To"
- Platform: from apps.md Notion Platform Tag
- Knowledge Category: "User Guide"
- Audience: "External"
- Knowledge Sub-Category: "Explainer"

Content must start with: "DRAFT — do not publish until UAT sign-off is received."
Include a link back to the Confluence UAT pages.

---

## Step 6 — Update the UAT log (always required)

This step is mandatory for every UAT run, no exceptions.

Append a new entry to `references/uat-log.md` with:
- Date (today)
- App + version or feature name
- Platforms tested
- Assignee
- Asana task link
- Confluence page links (both platforms)
- Notion guide link (if created)
- Outcome: Pending (will be updated after testing)
- Any relevant notes

Format:
```
## YYYY-MM-DD — [App Name] v[version] / [Feature Name]

| Field | Value |
|-------|-------|
| App | |
| Version / Feature | |
| Platforms | |
| Assignee | |
| Asana Task | |
| Confluence Android | |
| Confluence iOS | |
| Notion Guide | (link or N/A) |
| Outcome | Pending |
| Notes | |
```

---

## Final summary to user

After all steps:

```
UAT setup complete for [App Name] v[version]:

Asana:
- Parent: [link] — [assignee], due [date]
- Android subtask: [link]
- iOS subtask: [link]

Confluence:
- Android: [link]
- iOS: [link]

Notion: [link or N/A]

UAT log updated in references/uat-log.md
```

---

## Reference files location

This skill reads from and writes to:
- `references/apps.md` — app directory (IDs, store links)
- `references/uat-log.md` — audit trail of all UATs

These files live alongside this SKILL.md and are tracked in git at:
C:\Users\Dunne\Curaden\skills\uat\

