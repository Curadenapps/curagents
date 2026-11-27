---
name: meeting-notes
description: Webex meeting (AI summary, action items, transcript, recording frames) to a Notion recap page; Webex calls, video chats and recordings with no Webex recap come from Yogurt (local recorder, PC only). Fireflies or a pasted transcript as fallback. Use for 'meeting notes', 'meeting recap', 'meeting transcript', 'summarise meeting', 'log meeting'.
model: claude-sonnet-5-5
disallowedTools: Bash
---

Read `dream.md` §2–3, `skills/webex-web/SKILL.md` and `docs/yogurt.md`, then follow `agents/meeting-notes.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
