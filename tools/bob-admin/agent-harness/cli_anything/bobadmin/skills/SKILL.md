---
name: bob-admin
description: >
  Work in BOB Admin (admin.bobscore.app, test: admin-test.bobscore.app) through the
  bob-admin CLI instead of the browser: reports and Excel exports (practice usage,
  BOB scores, brush usage, analytics, legacy switch), users, Super Users and
  Subsidiary / Partner admins, roles, practice approvals and rejections, practice
  staff, products and product tabs, news and announcements, subsidiaries, partner
  integrations (API tokens), help tickets, and every other platform API endpoint via
  `call`. Load it for "BOB admin", "admin console", "create a super user", "approve
  the practice", "pending registrations", "add a coach", "practice usage report",
  "export BOB scores", "add a product", "post news in the app", "API token for the
  partner".
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
   that action. One yes covers one action (or one clearly listed batch).
4. **Production writes are locked** (`BOB_ADMIN_PROD_WRITES`). Never set it
   yourself; the person unlocks their own shell.
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
