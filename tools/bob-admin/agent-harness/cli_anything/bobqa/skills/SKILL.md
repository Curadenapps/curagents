---
name: bob-qa
description: >
  QA of the BOB web app (the clinician app: test.bobscore.app, prod bobscore.app)
  through the bob-qa CLI: scripted scenarios with a pass / fail report (`qa run
  smoke`, `qa run coach-loop`), and the calls a coach's app makes (practices,
  patients, BOB scores, temporary patients and assign session, score email resend,
  products, recommendation templates, settings). Writes go to TEST only and every
  test patient is named QA-TEST and deleted after the run. Load it for "QA the BOB
  app", "bob-qa", "run the QA scenario", "smoke test BOB", "check the coach flow",
  "is test.bobscore.app working", "test the score email", "regression check before
  release".
---

# bob-qa

`bob-qa` ships with bob-admin in `tools/bob-admin/` (same install, same harness,
same core). It talks to the platform API exactly as the web app does, signed in as
a **coach** on test. README: `tools/bob-admin/agent-harness/cli_anything/bobqa/README.md`.

It runs on a **PC with a signed-in person** (Sean or Fabian). Cloud Routines have
no sign-in; they can only suggest the command.

If `bob-qa` isn't found, it isn't on PATH yet: call it as
`& "$env:USERPROFILE\.bob-admin\bin\bob-qa.cmd" ...` (PowerShell), or have the
person run `tools\bob-admin\install.ps1 -AddToPath` and open a new terminal.

On test, Sean signs in with the shared test admin account (a Super User who
coaches test practice 56); his own email has no account on test.

## Rules for agents

1. **Always pass `--json`.** `qa run` exits 0 when every step passed, 1 otherwise;
   the report lists each step with `pass` / `fail` / `skip` and a detail.
2. **Never sign in yourself.** On "Not signed in" or "Session expired", ask the
   person to run `bob-qa auth login` in their own terminal (their coach login on
   test). Never ask for, type or store a password.
3. **Read-only is free:** `qa run smoke` and every list/get command.
4. **Writes need a yes.** `qa run coach-loop` and the write commands create test
   data on test. Show `--dry-run` (or `qa show coach-loop`) first, run with `--yes`
   only after the person's yes in chat. One yes covers one run.
5. **Never on prod.** bob-qa refuses every write outside test; there is no override.
   Reads on prod (`--env prod qa run smoke`) are fine.
6. **Test data only.** Patients are always `QA-TEST` + run ID; the score email goes
   to the QA inbox in the person's local config (`bob-qa config show`), never to a
   real patient. `patients delete` and `patients cleanup` only touch QA-TEST or
   temporary patients.
7. If a run fails, report the failing step and its detail as a possible bug (with
   the run ID and saved report path); don't retry writes in a loop.
8. Keep practice and person data out of the public repo.

## Command map

| Need | Command |
|---|---|
| Scenarios | `qa list`, `qa show NAME`, `qa run smoke`, `qa run coach-loop [--practice ID] [--email X / --no-email] [--keep]` |
| Sign-in | `auth login`, `auth status`, `auth whoami`, `auth logout` |
| Local settings | `config show`, `config set email X`, `config set practice ID` |
| App start-up reads | `practices list`, `practices stats ID`, `app-config`, `settings`, `products [--practice ID]`, `templates`, `announcements` |
| Patients | `patients list [--practice ID] [--qa-only]`, `patients get ID`, `patients create-test`, `patients delete ID`, `patients cleanup` |
| Scores | `scores list PID`, `scores get PID SID`, `scores bob-values PID`, `scores score-base PID`, `scores create PID`, `scores temporary`, `scores assign TEMP_PID PID`, `scores resend PID SID` |
| Any other endpoint | `bob-admin call ...` (bob-admin's own sign-in) |

## Scenarios

- **smoke** (read-only): sign-in, coached practice, app-config, settings,
  products, recommendation templates, announcements, patient list.
- **coach-loop** (writes, test only): sign-in → practice → QA-TEST patient →
  BOB score with a temporary patient → assign the session to the QA patient →
  score listed and readable → temporary patient removed → score email resent to
  the QA inbox → products → templates → **cleanup** (always runs, also after a
  failure).

Reports are saved in `%USERPROFILE%\.bob-admin\qa-runs\`.
