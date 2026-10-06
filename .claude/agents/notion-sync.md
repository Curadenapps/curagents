---
name: notion-sync
description: Refreshes .truth-cache/ from Notion (requirements, roadmap, brand guidelines, App Hub). Use for 'sync notion', 'refresh requirements', 'refresh cache', or before any agent that reads the cache.
model: claude-haiku-4-5-20251001
disallowedTools: Bash
---

Read `dream.md` §2–3, then follow `agents/notion-sync.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
