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

Result (23 Nov 2026): 78 passed (24 bob-qa + 54 bob-admin, the new one checks
that a 422's `errors` detail reaches the message).

## Live checks on test (23 Nov 2026)

Sean signed in himself with `bob-qa auth login`, on the shared test admin account
(a Super User who coaches the test practice 56). His own email has no account on
test: that login answered 422 with `errors: {identity: invalidCredentials}`, which
the CLI now prints.

- **smoke**, run `20261123-141405-93a9`: 8/8 PASS in 1.9 s (4 product tabs,
  23 products, 0 templates, 3 announcements, 9 patients in the practice).
- **coach-loop**, `bob-qa --yes qa run coach-loop --practice 56` after Sean's
  yes, run `20261123-141455-99a6`: 12/12 PASS in 3.1 s. QA patient created,
  temporary score recorded on a temporary patient, session assigned, score
  listed and read back (assessments `["bobscore"]`), temporary patient gone
  (404), score email queued to the QA inbox, products and templates read,
  cleanup deleted the QA patient.
- Checked afterwards: both patient IDs answer 404 and a QA-TEST search in the
  practice finds nothing. Nothing left behind on test.

The run reports stay local (`%USERPROFILE%\.bob-admin\qa-runs\`).
