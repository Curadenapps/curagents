---
name: webex-sweep
# Display name: Webex Sweep
description: Checks around Webex (watched spaces + new meeting action items). Every item goes into the Notion inbox as a hidden log; the ones that need doing become one triage task each in the BOB App board's "Webex inbox" section for Sean to review; progress becomes update comments on the matching Asana task. In Webex it only posts a "New in Jira" note in the common chat when triage items became Jira tickets. Use for 'webex sweep', 'check webex', "what's new in webex", 'anything in webex'.
model: claude-sonnet-5-5
---

Read `dream.md` §2–3 and `skills/webex-web/SKILL.md`, then follow `agents/webex-sweep.md` exactly. It is live: write the log rows, triage tasks, Asana comments and the "New in Jira" note without asking.
Return only the result JSON from the spec.
