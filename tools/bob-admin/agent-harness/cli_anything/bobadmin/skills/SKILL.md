---
name: bob-admin
description: >
  Work in BOB Admin (admin.bobscore.app, test: admin-test.bobscore.app) through the
  bob-admin CLI instead of the browser: reports and Excel exports (practice usage,
  BOB scores, brush usage, analytics, legacy switch), users, Super Users and
  Subsidiary / Partner admins, roles, practice approvals and rejections, practice
  staff, products and product tabs, news and announcements, subsidiaries, partner
  integrations (API tokens), help tickets, and every other platform API endpoint via
  `call`. Also runs the automatic practice approval (BA-324) and the duplicate
  sign-up check. Load it for "BOB admin", "admin console", "create a super user",
  "approve the practice", "pending registrations", "auto-approve", "practice
  approvals", "duplicate sign-ups", "add a coach", "practice usage report", "export
  BOB scores", "add a product", "post news in the app", "API token for the partner".
---

# bob-admin

The CLI lives in `tools/bob-admin/` (README there). It talks to the BOB platform
API as the signed-in person. Default environment is **test**; `--env prod` for
production. Installed with `tools/bob-admin/install.ps1`, it's `bob-admin` on PATH
(or `%USERPROFILE%\.bob-admin\bin\bob-admin.cmd`).

It runs on a **PC with a signed-in user** (Sean or Fabian). Cloud Routines have no
sign-in and can't use it; they put ready-to-run commands in their drafts instead.

## Rules for agents

1. **Always pass `--json`.** Errors come back as `{"error": ..., "status": ...}`
   with exit code 1.
2. **Never sign in yourself.** On "Not signed in" or "Session expired", stop and
   ask the person to run `bob-admin [--env prod] auth login` in their terminal.
   Never ask for, type or store a password.
3. **Reads are free. Writes need a yes.** Run the write with `--dry-run`, show what
   it will send, and re-run with `--yes` only after the person says yes in chat for
   that action. One yes covers one action (or one clearly listed batch). The one
   standing yes: `practices auto-approve` in the scheduled "Practice approvals run"
   below (Sean, 26 Nov 2026).
4. **Production writes are locked** (`BOB_ADMIN_PROD_WRITES`). Never set it
   yourself; the person unlocks their own shell. `BOB_ADMIN_AUTO_APPROVE=1` is the
   narrow unlock for `practices auto-approve` only: the person who runs the
   scheduled approvals sets it once as their own Windows user variable. Never set
   it yourself either.
5. **Invites:** `users create` / `superusers create` email an invite unless
   `--no-send-invite`. Say so in the dry run.
6. Never on your own initiative: `users erase`, `integrations revoke`, granting
   `super_admin`, deleting practices or subsidiaries.
7. Token secrets from `integrations create` are shown once. Hand them to the person
   directly; never write them to Notion, Asana, Webex, files or memory.
8. Keep practice and person data out of the public repo.

## Command map

| Need | Command |
|---|---|
| Who am I / what can I do | `auth status`, `auth whoami`, `auth capabilities` |
| Pending registrations | `reports home`, `practices pending` |
| Approve / reject | `practices approve ID --idb-office/--no-idb-office --idb-kit/--no-idb-kit --training-date YYYY-MM-DD`, `practices reject ID --reason ...` |
| Would it auto-approve? | `practices check [ID...]` (read-only: verdict and failed checks per pending registration) |
| Approve the sensible ones | `practices auto-approve` (`--dry-run` first; `--max 10`, `--country`, `--manual-country`) |
| People who signed up twice | `practices duplicates [--days 30] [--include-possible]` (read-only) |
| Decision history | `practices decisions [--practice-id ID]` |
| Practice staff | `practices members list/add/update/remove/move` |
| Users | `users list/get/create/update/deactivate/reactivate/temp-password` |
| Super Users / partner admins | `superusers list [--partners]`, `superusers create [--partner --subsidiary-id ID]` |
| Change admin roles | `users update ID --role superuser|subsidiary` (Practice Admin ↔ Coach: `practices members update PID UID --type ...`) |
| Markets | `subsidiaries list/get/create/update/assign` |
| Products | `products list/create/update/delete`, `products tabs ...`, `products bob-values` |
| News | `news list/get/create/update/delete`, `assets upload FILE` |
| Reports | `reports home/dashboard/practice-usage/bobscore/brush-usage/analytics/legacy-switch/emails` (`--export FILE.xlsx` where offered) |
| Integrations | `integrations list/create/update/revoke` |
| Anything else | `call <area> <action>` (140 generated commands; `call <area> --help`), `ops list/show`, `api METHOD PATH` |

## Chaining

Global options: `--all` (every page), `--fields a,b` (keep fields), `--ids` (IDs
one per line). Commands that take an ID accept `-` to read IDs from stdin:

```
bob-admin --ids --all practices pending | bob-admin --json call practices find-one -
```

Writes fed from a pipe need `--yes`, so dry-run them first.

Roles: `super_admin` (Super Admin), `superuser` (Super User), `subsidiary`
(Subsidiary / Partner), `practice_admin` (Practice Admin), `coach` (Coach).
Market Rollout's "Admin Console super users" for a market are usually Subsidiary /
Partner admins of that market's subsidiary; check with Sean.

In PowerShell quote paths with braces (`'/practices/{id}'`); in Git Bash drop the
leading slash (`ops show POST users`).

## Automatic approval (BA-324)

Sean decided on 10 Nov 2026 that practice approval runs without a person: checks,
approval and allocation automatically, only exceptions to a person (Stage 3 of
`Projects\BOB Onboarding\CONCEPT.md`). Until Phinamic builds it into the platform,
`practices auto-approve` does it from the CLI (Sean, 26 Nov 2026: "automatically
approve clinics that are sensible").

**The checks** (`core/approval.py`; every one must pass, else the registration stays
pending for a person):

| Check | Fails when |
|---|---|
| `complete` | Practice name, contact name, email, country, or both city and postcode are missing |
| `email` | Not an address, a throwaway or placeholder domain, or the domain can't receive mail (DNS) |
| `not_test` | "test", "demo", "qa", "asdf", "xxx" and the like as a word in the name, contact, address or email |
| `not_internal` | A Curaden, Curaprox, bobscore or Phinamic address: staff set-ups go to a person |
| `market` | No subsidiary for the country (not launched), or the country is on the manual list (empty by default: the US is approved automatically too, Sean 26 Nov 2026) |
| `not_duplicate` | It matches another practice (below), pending or approved; rejected ones don't count |

**Duplicates.** Same person or practice: the same contact name in the same country
plus one more thing in common (city, postcode, street, phone, a similar email or
practice name), or the same email for the same practice, or the same practice name
and postcode. A shared name, email or phone alone is only "possible": still a
person's call, but never put to the clinician as "you signed up twice".

**What an approval sends:** IDB office and IDB kit `false`, training date today + 14
days (the API still requires all three; they're placeholders until Phinamic moves
the checklist after approval), and a note: "Approved automatically by bob-admin …
Checks passed: …". The note is the decision log. Before each approval the practice
is read again; if someone decided it in the meantime, it's left alone.

Output never holds names, emails or phone numbers: IDs, countries, checks and match
reasons only, so it can go in run logs and task notes as it is.

## Practice approvals run (Fabian's PC)

A desktop-app scheduled task, **"Practice approvals (Fabian)"**, on Fabian's PC (he
owns support and BA-324 since 25 Nov; Sean is away until January). Setup:
`docs/app-support-quickstart.md`, "Setup details" section 4. It also runs on
"practice approvals" in any session on a PC signed in to BOB Admin prod. Each run:

1. **Switch.** Read the Agent registry row whose Started by names "Practice
   approvals (Fabian)" (Notion REST API with `NOTION_API_KEY`, as the quickstart's
   "Notion through the API" says). Account not `Fabian` → log `no-op` and stop. No
   row yet → log `no-op` "no registry row" and stop.
2. **Latest CLI.** `git fetch origin main`, `git pull --ff-only` when on a clean
   `main` (otherwise read files from `origin/main`), then
   `powershell -ExecutionPolicy Bypass -File tools\bob-admin\install.ps1` (quiet;
   updates `%USERPROFILE%\.bob-admin`). Use `%USERPROFILE%\.bob-admin\bin\bob-admin.cmd`
   if `bob-admin` isn't on PATH.
3. **Sign-in.** `bob-admin --env prod --json auth status`. Not signed in or expired:
   `PushNotification` once ("BOB Admin prod is signed out. Run `bob-admin --env prod
   auth login` in a terminal; the next run catches up."), log `partial` and stop.
   Never type a password.
4. **Approve.** `bob-admin --env prod --json --yes practices auto-approve`. If it says
   prod writes are locked, `BOB_ADMIN_AUTO_APPROVE` isn't set on this PC: run it
   again with `--dry-run` instead, log `partial` ("auto-approve not unlocked on this
   PC") and carry on with step 5 using that output.
5. **Exceptions to Fabian.** For each entry in `exceptions` that isn't a strong
   duplicate (those go to step 6): one subtask on his standing **"App Support:
   needs you (Fabian)"** task (find it as `agents/app-support.md` "Scheduled run"
   step 5 says; never create a second one), unless an open subtask already names
   that practice ID. Name: "Approve or reject: practice {id} ({country})". Notes:
   the `details` lines, where to look (https://admin.bobscore.app → Practices →
   Pending), and the two commands, filled in:
   `bob-admin --env prod practices approve {id} --no-idb-office --no-idb-kit --training-date {today+14}`
   and `bob-admin --env prod practices reject {id} --reason "…"`. No names or emails
   in the subtask: Fabian sees them in BOB Admin. When a later run finds the
   practice no longer pending, it comments "Done: decided in BOB Admin" and ticks
   the subtask. Fridays: create it without an assignee; Monday's first run assigns it.
6. **Duplicate sign-ups.** Run `bob-admin --env prod --json practices duplicates
   --days 14`. For each `strong` group that isn't `internal` and has no task yet
   (`search_tasks` on App Tasks, Requests & Feedback `1200298616652229` for the
   group's `key`, open and completed), at most 5 new ones a run:
   - Read the practices with `bob-admin --env prod --json practices get {id}` for
     the contact details. They go only into the task's notes, never a comment.
   - Create a task on `1200298616652229`, section Inbox `1200681385779294`, assigned
     to Fabian, named "Duplicate sign-up: {newest practice name} ({country})", with
     notes in the form's layout, so App Support answers it like a form request:

     ```
     Name
     {contact name of the newest practice}
     Email address
     {contact email of the newest practice}
     Title
     Duplicate sign-up: {newest practice name}
     App Country
     {country name}
     Application(s)
     BOB
     Describe your request
     Written by the practice approval run, not by the clinician. This person
     registered BOB {n} times: practice {id} ({status}, created {date}, {email}),
     practice {id} (…). Matched on: {reasons}. {When one was created 25–28 Sep 2026:
     "Practice {id} came over from the old BOB app."} Ask which email and practice
     they want to keep.

     dup key: {key}
     This task was created by the practice approval run (bob-admin)
     ```
   - App Support's next hourly run writes the reply and holds it for Fabian on the
     Asana route, so the invite run adds the clinician to the task once he ticks it
     (`agents/app-support.md`, "Duplicate sign-ups").
   - When they've answered, Fabian keeps one: reject a pending duplicate
     (`practices reject {id} --reason "duplicate of {id}"`), or for two approved
     practices move the coaches over (`practices members move`) and set the other
     inactive (`practices update {id} --status inactive`). Never delete a practice.
   `possible` and `internal` groups get no task: list their keys in the run-log row.
7. **Run log**, always, also on failure: one row as `RUNTIME.md` describes (Agent
   `practice-approvals`, or `other` if the select has no such option; Where `PC`;
   Account `Fabian`). Outcome `ok` (something approved or raised), `no-op` (nothing
   pending, no new duplicates), `partial` or `failed`. Summary: "{n} approved
   ({ids}), {m} to Fabian ({ids}), {k} duplicate tasks ({keys})". IDs only.

Hard limits: prod approvals only through `practices auto-approve` (never `practices
approve` or `call` on its own initiative), at most 10 approvals and 5 duplicate tasks
a run, never reject, deactivate, delete or erase anything, never sign in.
