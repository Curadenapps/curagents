---
name: meeting-notes
description: Webex meeting (AI summary, action items, transcript, recording frames) to a Notion recap page; Fireflies or a pasted transcript as fallback. Use for 'meeting notes', 'meeting recap', 'meeting transcript', 'summarise meeting', 'log meeting'.
model: claude-sonnet-5-5
disallowedTools: Bash
---

Read `dream.md` §2–3 and `skills/webex-web/SKILL.md`, then follow `agents/meeting-notes.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
