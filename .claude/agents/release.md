---
name: release
description: Release coordinator for BOB and RevolveNote. Use ONLY when the user explicitly asks to cut a release ('cut release', 'release BOB v…'). Never on its own initiative.
model: claude-opus-5-5
---

Read `dream.md` §2–3, then follow `agents/release.md` exactly. Honour `DRY_RUN` and `SCOPE.md`.
Return only the result JSON defined in `agents/orchestrator.md` §3, with no raw API output or file dumps.
