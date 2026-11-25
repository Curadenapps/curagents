# bob-qa: QA for the BOB web app from the command line

`bob-qa` checks the clinician-facing BOB web app the way a coach uses it. The
web app (an Expo build) runs at **https://test.bobscore.app** (test) and
**https://bobscore.app** (prod). It calls the same platform API as BOB Admin:
test `https://phinamic-api.quanht.site/api/v1`, prod `https://api.bobscore.app/api/v1`.
Both builds call the same 32 endpoints (read from their JS bundles, 20 Nov 2026),
and bob-qa makes those calls, so a passing run means the backend does what the
app needs.

It ships with `bob-admin` (same package, same install) and reuses its core:
sign-in, token refresh, output. It keeps its **own** sign-in
(`%USERPROFILE%\.bob-admin\qa-session-<env>.json`), so bob-admin can stay signed
in as an admin while bob-qa is signed in as a coach.

## Install

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\bob-admin\install.ps1 -AddToPath
```

That installs both `bob-admin` and `bob-qa` (`%USERPROFILE%\.bob-admin\bin\bob-qa.cmd`).

**"bob-qa is not recognized"?** The folder isn't on your PATH yet. Either run it
by its full path:

```powershell
& "$env:USERPROFILE\.bob-admin\bin\bob-qa.cmd" auth status
```

or run the installer again with `-AddToPath` and open a new terminal.

## First run

```powershell
bob-qa auth login                         # your coach login on test (hidden password prompt)
bob-qa config set email <QA inbox>        # where test score emails go (local only)
bob-qa config set practice <practice ID>  # optional; else your default practice
bob-qa qa run smoke                       # read-only
bob-qa qa run coach-loop                  # writes on test, asks first, cleans up
```

## Scenarios

| Scenario | Writes | What it checks |
|---|---|---|
| `smoke` | no | sign-in, coached practice, app-config, settings, products, recommendation templates, announcements, patient list |
| `coach-loop` | test only | QA-TEST patient → BOB score with a temporary patient → assign session → score listed and readable → temporary patient removed → score email resent to the QA inbox → products → templates → cleanup |

`qa show <scenario>` lists the steps and the call behind each. `qa run` prints
one line per step (`PASS` / `FAIL` / `skip`), exits 0 only when nothing failed,
and saves the full report in `%USERPROFILE%\.bob-admin\qa-runs\`. `--json` for
agents, `--dry-run` to see the plan, `--keep` to leave the test data in place and
look at it in the web app (then `patients cleanup`).

## Commands

```powershell
bob-qa practices list
bob-qa products --practice 7
bob-qa templates
bob-qa patients list --qa-only
bob-qa patients create-test --practice 7
bob-qa scores temporary --practice 7
bob-qa scores assign <temporary patient ID> <patient ID>
bob-qa scores list <patient ID>
bob-qa scores resend <patient ID> <score ID>
bob-qa patients cleanup                # deletes every QA-TEST patient left over
```

## Safety

- **Writes go to test only.** bob-qa creates patient data, so it refuses every
  write on prod; `BOB_ADMIN_PROD_WRITES` does not unlock it.
- **Writes ask first** (or take `--yes`; with `--json` they need `--yes`).
- **Test data is labelled.** Every patient is `QA-TEST` + run ID; the score is a
  healthy 32-tooth mouth map with score 0 and a recommendation saying it is a QA
  session. `patients delete` and `patients cleanup` refuse anything that is not
  QA-TEST or temporary.
- **Cleanup always runs**, also after a failed step.
- **No inbox, no email.** Without a QA inbox the patient gets an
  `@example.com` address and the email step is skipped.
- No passwords are stored; only the session tokens, in your own profile.

## Develop and test

```powershell
cd tools\bob-admin\agent-harness
python -m pip install -e ".[test]"
python -m pytest -q cli_anything
```

`tests/test_bobqa.py` runs every scenario against an in-memory fake of the API.
`tests/TEST.md` has the plan and the live results.
