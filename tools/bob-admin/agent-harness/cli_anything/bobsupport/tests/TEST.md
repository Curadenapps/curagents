# TEST.md: cli-anything-bobsupport

## Plan

Unit tests only, against `World` in `test_bobsupport.py`: an in-memory fake of the
BOB platform API (users, practices, temporary password, decisions, subsidiaries)
and of the Asana API (search, tasks, subtasks, stories), so check, do and sweep run
end to end without a network.

| Area | What is checked |
|---|---|
| Form | Fields of the current form; an old Error Request form with Jira-style `[x\|mailto:x]` and `*Label:*` |
| Types | Rename, activation (PT, ES), temporary password, delete, address, other; a learned phrase and a corrected task win |
| Links | A gid, a `/0/0/{gid}/f` link and a `/project/…/task/{gid}` link |
| comments | The requester's newest comment decides the type ("change my address from a@x to b@y" is an email change, old and new address taken from it, none of them in the note); automated replies and team comments are skipped, unless the team member sent the form |
| check | A change subtask plans the rename with the name from its notes; check never writes; a temporary-password request on a pending practice is reply-only; no account; a partner admin sees who approved their country's registrations; `--from-json` works without a token |
| do | `--dry-run` sends nothing; `--yes` renames, comments on and ticks the change subtask, records the history; prod refuses without the unlock |
| sweep | Writes one note per change and none when nothing changed; no email address in the note; preview writes nothing; without a change subtask it makes one "Admin Console check" subtask and updates it after that |
| learn, types, schedule | Phrases and task corrections saved and exported; every type listed; the scheduled-task wrapper runs `sweep --all --post --scheduled` |

## Live check (25 Nov 2026, prod, read-only)

`check --from-json` on six real board requests: a practice rename (found the
account in two practices and planned the rename of its default one), a partner admin
asking about missing registrations (none pending in their subsidiary; the
country's latest registrations were approved centrally), two "activate / new app"
requests (practice active, never signed in: plan a new temporary password) and two
"I'd like an account" requests (no account under that email). Nothing was changed.

Result (25 Nov 2026): 106 passed (28 bob-support + 24 bob-qa + 54 bob-admin).
