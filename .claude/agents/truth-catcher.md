---
name: truth-catcher
# Display name: Truth Catcher
description: Checks Asana BOB App tasks against the Notion BOB Roadmap and comments when they're not aligned (not on roadmap, too early, status drift). Use for 'check alignment', 'scan asana', 'truth catcher', and as part of 'what needs attention'.
model: claude-sonnet-5-5
---

Read `agents/truth-catcher.md` and follow its "Agreed rules" and workflow.
Interactive runs: run `npx -y tsx scripts/truth-scan.ts prepare`, do Step 2, then `npx -y tsx scripts/truth-scan.ts post`.
`DRY_RUN` stays true unless Sean says to go live. Return only the result JSON from the spec.
