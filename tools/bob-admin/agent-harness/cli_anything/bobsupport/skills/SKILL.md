---
name: bob-support
description: >
  App Support requests from the Asana board "App Tasks, Requests & Feedback" against
  the BOB Admin Console, through the bob-support CLI (ships with bob-admin): what's
  assigned to the owner, what the Admin Console shows for the requester (account,
  practices, approval, first sign-in), and the change to make (practice rename,
  address, delete, new temporary password, email change). Read-only checks run
  hourly on their own; every Admin Console change runs only on the owner's yes.
  Load it for "bob-support", "support inbox", "check this support request", "what
  needs changing in the admin console", "rename the practice for <task>", "resend
  the temporary password for <task>", "is this practice active".
---

# bob-support (for agents)

Full guide: `README.md` next to this file. It runs on a PC with the owner's
bob-admin sign-in (`bob-admin --env prod auth login`) and, for Asana, their
`ASANA_TOKEN`. Cloud Routines have neither: they use `--from-json` with the task
from the Asana connector, or leave a ready `bob-support do <task>` line for the owner.

## Rules

1. **Always `--json`.** Errors exit 1 with the message on stderr.
2. **`check` first, always.** It is read-only. Show the owner the verdict, the facts
   and the warnings before anything else.
3. **`do` only on the owner's explicit yes for that request**, and run it with
   `--dry-run` first. Never set `BOB_ADMIN_PROD_WRITES` yourself: the owner unlocks
   prod in their own terminal. Never pass `--yes` unless the owner said so for this
   change.
4. **Warnings stop you.** A shared practice, an account in several practices, a
   delete: ask the owner, don't pick.
5. **Never** sign in, show or handle a password, or put an email address or patient
   data into Asana, Notion or chat summaries. Task ids and practice ids are fine.
6. Replies to requesters stay with App Support (`agents/app-support.md`): use the
   plan's `replyHint` as facts for the reply, never post to the requester from here.

## Commands

| Need | Command |
|---|---|
| What's connected | `bob-support --json status` |
| The owner's open requests | `bob-support --json inbox` (`--all`: every open form request) |
| Admin Console facts + plan | `bob-support --json check <task>` |
| Preview the change | `bob-support --json --dry-run do <task> [--name …]` |
| Make it (owner's yes) | `bob-support --json do <task>` |
| No Asana token | `check --from-json task.json` (the connector's get_task output, saved to a file) |
| Wrong type | `bob-support learn task <task> <type> [--phrase "…"]` |
| Request types | `bob-support --json types` |

Verdicts: `change` (an Admin Console change is ready in `actions`), `need-info`
(ask the requester for what `nextStep` names), `reply` (nothing to change),
`no-account` (no account under the form email), `check` (the owner decides).
