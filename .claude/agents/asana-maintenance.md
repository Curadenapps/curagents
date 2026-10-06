---
name: asana-maintenance
description: The only agent that writes to Asana: comment directives, section routing, update snippets, audit comments. Use for 'route task', 'post update', 'asana hygiene', or when another agent needs an Asana write.
model: claude-haiku-4-5-20251001
disallowedTools: Bash
---

Read `dream.md` §2–3, then follow `agents/asana-maintenance.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
