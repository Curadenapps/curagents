# bob-admin: BOB Admin from the command line

`bob-admin` (full name `cli-anything-bobadmin`) does what the BOB Admin console
does, from a terminal or from an AI agent: reports and Excel exports, users and
Super Users, roles, practice approvals, practice staff, products and product
tabs, news and announcements, subsidiaries, partner integrations (API tokens),
help tickets, recommendation templates. Through `call`, it reaches **every one of
the platform's 141 API endpoints**.

It follows the [CLI-Anything](https://github.com/HKUDS/CLI-Anything) harness
format: a Click CLI with `--json` on every command, an interactive shell, a
SKILL.md for agents, and tests. It's built from the platform API's own OpenAPI
spec (published on the test API's Swagger page), which ships inside the package.
The production admin makes exactly the same API calls as test (checked 18 Nov
2026), so everything works on both.

| `--env` | Admin site | API |
|---|---|---|
| `test` (default) | admin-test.bobscore.app | phinamic-api.quanht.site/api/v1 |
| `prod` | admin.bobscore.app | api.bobscore.app/api/v1 |

**bob-qa** ships in the same package: QA scenarios for the clinician web app
(test.bobscore.app) on a coach's sign-in, writes on test only. See
[`agent-harness/cli_anything/bobqa/README.md`](agent-harness/cli_anything/bobqa/README.md).

## Install

**Windows (Sean, Fabian):** one script. It puts bob-admin in
`%USERPROFILE%\.bob-admin` and, with `-AddToPath`, makes `bob-admin` work in
every new terminal. Run it again to update.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\bob-admin\install.ps1 -AddToPath
```

Without a curagents checkout, download `install.ps1` from the repo and run it the
same way: it then installs from GitHub.

**Mac / Linux / anyone with Python 3.10+ (Phinamic):**

```bash
pipx install "git+https://github.com/Curadenapps/curagents.git#subdirectory=tools/bob-admin/agent-harness"
# or: pip install --user "git+https://github.com/Curadenapps/curagents.git#subdirectory=tools/bob-admin/agent-harness"
```

## Sign in

Everyone signs in with their **own** BOB Admin account; the CLI can do exactly
what that account can do in the admin. The password goes into a hidden prompt (or
`BOB_ADMIN_PASSWORD`) and is never stored. Only the session tokens are saved, in
`~/.bob-admin/session-<env>.json`, and they renew themselves until the platform
expires them (then just log in again).

```powershell
bob-admin auth login                 # test
bob-admin --env prod auth login      # production
bob-admin --env prod auth whoami
```

Tip: `$env:BOB_ADMIN_ENV = "prod"` makes prod the default for that terminal.

## Production

- **Reads** on prod work as soon as you're signed in.
- **Writes** on prod are locked. To unlock them for one terminal only:
  `$env:BOB_ADMIN_PROD_WRITES = "1"`. Close the terminal to lock again.
- Every write still shows what it will send and asks first.

## Everyday commands

```powershell
# Reports
bob-admin reports home                                    # pending registrations
bob-admin reports practice-usage --usage-state dormant
bob-admin reports practice-usage --export usage.xlsx
bob-admin reports bobscore --from 2026-10-01 --to 2026-10-31 --export oct.xlsx
bob-admin reports analytics                               # per-market activation and sessions

# Super Users, partner admins, roles
bob-admin superusers list --partners
bob-admin superusers create --partner --subsidiary-id <id> --first-name A --last-name B --email a@example.com --no-send-invite
bob-admin users update 42 --role subsidiary --subsidiary-id <id>
bob-admin users temp-password 42

# Practices
bob-admin practices pending
bob-admin practices approve 12 --idb-office --idb-kit --training-date 2027-01-15
bob-admin practices reject 13 --reason "Duplicate of practice 9"
bob-admin practices check                                 # would each pending one auto-approve? (read-only)
bob-admin --dry-run practices auto-approve                # then --yes to approve the ones that pass
bob-admin practices duplicates --days 30                  # people who signed up twice (read-only)
bob-admin practices members add 12 --type coach --first-name C --last-name D --email c@example.com

# Products, news
bob-admin products create --name "CS 5460" --tab-id <tab> --url https://... --country-url CH=https://...
bob-admin assets upload banner.png
bob-admin news create --title "New in BOB" --summary "..." --content @news.md --country AE --image-asset-id 31
bob-admin news update <id> --active

# Integrations (partner API tokens)
bob-admin integrations create --name "Partner form" --source-ip 203.0.113.10
```

Run `bob-admin` with no command for the interactive shell. Every command has
`--help`.

Watch out: `users create` / `superusers create` **email an invite by default**
(the API's default). Pass `--no-send-invite` if you don't want that.

## Automatic approval and duplicate sign-ups

`practices auto-approve` approves every pending registration that passes all the
checks (complete, a real email that takes mail, not a test entry, not a Curaden or
Phinamic address, a launched market not on the manual list, not a duplicate) and
leaves the rest pending for a person, with the reasons. Each approval carries a note
saying it was automatic and which checks passed. `practices check` shows the same
verdicts without changing anything; `practices duplicates` finds people who signed up
more than once, pending or already approved. Output holds IDs and reasons only, no
names or emails. The rules are in `skills/bob-admin/SKILL.md`, "Automatic approval".

On prod, `BOB_ADMIN_AUTO_APPROVE=1` unlocks `practices auto-approve` and nothing
else; every other prod write still needs `BOB_ADMIN_PROD_WRITES=1`. The manual list
defaults to `US` (`--manual-country`, or `BOB_ADMIN_MANUAL_COUNTRIES=US,JP`).

## Every endpoint: `call`

`call` has one command per API endpoint, generated from the spec, grouped by area:

```powershell
bob-admin call --help                       # the 22 areas
bob-admin call practices --help             # every practice action
bob-admin call users create --help          # its fields, types, which are required
bob-admin call practices find-all --status pending --limit 50
bob-admin call metrics metrics-export --from 2026-10-01 --out scores.xlsx
bob-admin call users create --first-name A --last-name B --email a@example.com --roles superuser --send-invite false
```

Path parameters are arguments, query parameters and body fields are options,
required fields are checked, and `--data '{...}'` / `--data @body.json` sends a
whole body. `ops list` / `ops show METHOD PATH` describe endpoints; `api METHOD
PATH` is the raw escape hatch.

## Chaining commands

Global options that make output feed the next command:

| Option | Does |
|---|---|
| `--json` | Machine-readable output (what agents use) |
| `--all` | Follow pagination and return every record |
| `--fields id,name,status` | Keep only those fields (tables and JSON) |
| `--ids` | Print only IDs, one per line |
| `-` as an ID | Read IDs from the previous command's output |

```powershell
# Details of every pending registration
bob-admin --ids --all practices pending | bob-admin --json call practices find-one -

# Every Super User's email, as JSON
bob-admin --json --all --fields id,email users list --role superuser

# Preview temporary passwords for everyone not yet activated (swap --dry-run for --yes to send)
bob-admin --ids --all users list --activation pending | bob-admin --dry-run users temp-password -
```

A write that reads IDs from a pipe needs `--yes` (there's no keyboard to answer
the question), so preview it with `--dry-run` first.

## Safety

- Writes show what they'll send and ask first; `--dry-run` previews and sends
  nothing; `--yes` skips the question. With `--json`, a write without `--yes` is
  refused rather than guessed.
- Production writes are locked unless `BOB_ADMIN_PROD_WRITES=1`.
- `users erase` (permanent personal-data erasure) also needs `--confirm-email`.
- News is created inactive; publish with `news update <id> --active`.
- `super_admin` can't be granted with the friendly commands, only with `call`.
- Nothing in the repo holds credentials; `.venv`, `.env` and `*.xlsx` are ignored.

## For agents

`skills/bob-admin/SKILL.md` (also packaged as `cli_anything/bobadmin/skills/SKILL.md`)
tells an agent how to use it: always `--json`, never sign in itself, dry-run every
write and wait for a yes. It runs on a PC with a signed-in user, not in cloud
Routines.

## Develop and test

```powershell
cd tools\bob-admin
python -m venv .venv
.\.venv\Scripts\python -m pip install -e "agent-harness[test]"
.\.venv\Scripts\python -m pytest agent-harness\cli_anything\bobadmin\tests -q
```

The tests fake the HTTP layer and check the exact request each command sends; see
`agent-harness/cli_anything/bobadmin/tests/TEST.md`. When the API changes, refresh
`agent-harness/cli_anything/bobadmin/openapi.json` from the test Swagger page and
`call` picks up the new endpoints by itself.

## Open points for Phinamic

- The test API runs on `phinamic-api.quanht.site`, a developer-looking domain,
  not under bobscore.app. Intended?
- Production hides its Swagger page. Publishing the spec (or a stable URL for it)
  would let the CLI stay in step without copying it from test.
- The admin has no machine-to-machine admin token (the API tokens only cover the
  partner endpoints), so automations must sign in as a person. A scoped admin
  token, or the MCP server they plan, would fix that.
