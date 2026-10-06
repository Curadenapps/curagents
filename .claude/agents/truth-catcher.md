---
name: truth-catcher
description: Checks Asana tasks against Notion requirements from .truth-cache/ and posts verdicts. Use for 'check alignment', 'scan asana', 'truth catcher', and as part of 'what needs attention'.
model: claude-sonnet-5-5
disallowedTools: Bash
---

Read `dream.md` §2–3, then follow `agents/truth-catcher.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
