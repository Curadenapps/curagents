# TEST.md: cli-anything-bobqa

## Plan

Unit tests only, against `FakeBob` in `test_bobqa.py`: a small in-memory fake of
the platform API (patients, temporary patients, scores, assign-session, delete),
so the scenarios run end to end without a network. Each test checks what was
sent and what is left behind.

| Area | What is checked |
|---|---|
| Fixtures | QA patient is named QA-TEST + run ID, example.com email and no subscription without a QA inbox; score payload has the web app's shape (assessments, type p1, meta, 32-tooth fdiSchema, bobScore + flat copies) |
| Session | bob-qa uses `qa-session-<env>.json`, not bob-admin's session; login saves it and never echoes the password; "not signed in" names `bob-qa` and sends nothing |
| Safety | no write on prod even with `BOB_ADMIN_PROD_WRITES=1` (commands and scenarios); prod reads allowed; `--dry-run` sends nothing; `--json` write without `--yes` refused; `patients delete` refuses a non-QA patient; `patients cleanup` deletes only QA-TEST patients |
| Commands | products params, assign body, resend path, patient list filters, help for every group, local config set / unset / validation |
| Scenarios | `smoke` passes with no writes; `coach-loop` passes, resends the email to the QA inbox and leaves nothing behind; without an inbox the email step is skipped; a failed assign skips the rest but cleanup still deletes both patients; a temporary patient left after assign is a failure; a practice you don't coach fails before any write; `--keep` leaves the data; scenario dry run sends nothing |

Result (20 Nov 2026): 77 passed (24 bob-qa + 53 bob-admin, unchanged by the
shared-core change).

## Live checks on test

_To be filled in after Sean signs in with his own coach login on test._
