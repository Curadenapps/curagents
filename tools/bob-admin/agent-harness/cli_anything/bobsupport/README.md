# bob-support: App Support requests against the Admin Console

`bob-support` is the support command line. Its inside is the Asana board **App
Tasks, Requests & Feedback**: for every request assigned to you (the form task, or
the "Fabian: change in BOB Admin" subtask App Support makes), it looks the
requester up in the **BOB Admin Console** and tells you what's true there and
what to do: an Admin Console change, or only a reply in Asana.

It ships with bob-admin (same install, same sign-in) and defaults to **prod**,
because support requests are about real practices.

## What runs on its own, and what stays with you

| | Hourly sweep (automated) | You (`bob-support do`) |
|---|---|---|
| Admin Console | **Read-only**: finds the account by the form email, its practices, status, approval, first sign-in | Every change: rename, address, delete, new temporary password, email change |
| Asana | One internal note per request, only when what it found changed: a comment on the change subtask, or an "Admin Console check" subtask on the form task (no email addresses); closes an **Awaiting Feedback** ticket once the requester has signed in to BOB *after* asking (registration, activation, login requests), with the reason in the note | Ticks the change subtask after the change, so App Support sends the "All done" reply and closes the task |
| Replies to requesters | No. App Support's hourly Routine writes them and you check them, as before; the note gives it the facts | You check and send, as before |

Why the line is there: a change in the Admin Console acts on a real practice
because someone filled in a form. The sweep can't tell whether the form came from
the right person, whether "rename" really means a new practice (a practice shared
with colleagues), or whether "delete" is meant. Reading is safe to automate;
changing needs your eyes. Prod writes also stay locked unless you unlock them in
your own terminal (`$env:BOB_ADMIN_PROD_WRITES = "1"`).

## Request types

`bob-support types` lists them. Today:

| Type | Sweep finds | You do |
|---|---|---|
| `practice-rename` | The practices on the account, flags a shared one (a rename renames it for everyone) | `bob-support do TASK` (name from the change subtask, or `--name "…"`) |
| `practice-details` | Current address and contact | `bob-support do TASK --street … --zip … --city …` |
| `practice-delete` | Staff and sessions in the practice, anyone else still in it | Confirm with the requester, then `bob-support do TASK` (soft delete) |
| `temp-password` | Account status, first sign-in, unused temporary password, practice approved or not | `bob-support do TASK` (sends a new temporary password; never shows one) |
| `activation-status` | Pending or active; for a partner admin: what waits in their subsidiary and who approved their country's latest registrations | Approve when it's ours (`bob-admin practices approve …`), or reply with the status |
| `account-email` | The account and its practice | `bob-support do TASK --email NEW` |
| `role-access` | Roles per practice | Decide (no BOB Admin access for practices, BA-325) |
| `other` | The requester's account, for context | Reply in Asana |

## Set up (once)

1. Install or update: `powershell -ExecutionPolicy Bypass -File .\tools\bob-admin\install.ps1 -AddToPath`
2. Admin Console sign-in (your own account): `bob-admin --env prod auth login`
3. Asana: `bob-support setup` shows how to make a Personal Access Token and save it
   as the Windows user variable `ASANA_TOKEN` (never in a chat, file or the repo).
4. Check: `bob-support status`
5. The hourly sweep over every open request on the board: `bob-support schedule install` (Windows Task Scheduler, your
   user, Mon–Thu 07:30–19:30; `schedule show` for the last runs, `schedule remove`
   to stop it).

## Everyday use

```powershell
bob-support inbox                      # what's assigned to you, with the detected type
bob-support check <task id or link>    # what the Admin Console shows, and the plan (changes nothing)
bob-support --dry-run do <task>        # what the change would send
$env:BOB_ADMIN_PROD_WRITES = "1"       # unlock prod writes for this terminal only
bob-support do <task>                  # make the change (asks first), tick the change subtask
bob-support sweep                      # preview the hourly sweep; --post writes the notes
```

`check` and `do` take overrides when the form isn't enough: `--practice-id`,
`--user-id`, `--lookup-email` (they registered with another address), `--type`,
and the new values (`--name`, `--street`, `--zip`, `--city`, `--contact-*`,
`--email`).

Without an Asana token (for example from a Claude session that has the Asana
connector), `check --from-json task.json` and `do --from-json …` take the task as
JSON instead; `do` then doesn't tick the subtask.

## Getting better

- **Wrong type?** `bob-support learn task <task> <type>` fixes that request and,
  with `--phrase "…"`, teaches the words that should have matched.
- `bob-support learn phrase practice-delete "studio chiuso"` teaches a phrase on its own.
- `bob-support learn list` shows what you taught and which changes you made most.
- `bob-support learn export` prints your phrases ready for `core/playbook.py`, so
  a PR shares them with everyone. New request types go into `core/playbook.py`
  and `core/plan.py` the same way.

What it learns stays on your PC (`%USERPROFILE%\.bob-admin\support-learned.json`
and `support-history.jsonl`: task ids, types and verdicts, no names or emails).

## Files

| File | What |
|---|---|
| `%USERPROFILE%\.bob-admin\session-prod.json` | bob-admin's sign-in, shared |
| `support-sweep-state.json` | What the sweep last wrote per request (so it writes only on change) |
| `support-sweep.log` | One line per sweep run |
| `support-learned.json`, `support-history.jsonl` | What you taught, and what was handled |

With `NOTION_API_KEY` set, the scheduled sweep also checks its Agent registry row
("Support sweep (Fabian)"; `Paused` stops it) and writes one Agent run log row per
run (Agent `app-support`, Where `PC`, Account `Fabian`).
