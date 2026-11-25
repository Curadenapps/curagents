# TEST.md: cli-anything-bobadmin

## Plan

Unit tests only, with the HTTP layer faked (`FakeHttp` in `test_bobadmin.py`), so
the suite never touches a real BOB platform. Each test checks the exact method,
URL, query and body a command sends.

| Area | What is checked |
|---|---|
| Spec | 141 operations load; `describe` returns body fields and required flags |
| Output | `{success, data}` envelope unwrapped; paginated lists found; table columns |
| Auth | login saves the session; temporary-password path; 401 → refresh → retry with the new token; not-signed-in sends nothing |
| Safety | prod writes locked without `BOB_ADMIN_PROD_WRITES=1`; prod reads allowed; `--dry-run` sends nothing; `--json` write without `--yes` refused; "no" at the prompt aborts; `users erase` needs the matching email |
| Commands | every group's `--help`; Super User / partner create bodies; approve body; members add; news defaults to inactive; product country links; Excel export saved to file; raw `api` path normalising; login never echoes the password |

## Live checks (no sign-in)

- `bob-admin health` against the test API: 200, "Service is healthy".
- Unauthenticated call: CLI says "Not signed in"; the API itself answers
  `{"success":false,"message":"Unauthorized","statusCode":401}`.

## Live signed-in pass (18 Nov 2026, test, Super User account)

Sean signed in with `auth login`. Every read command answered: practices
(list, pending, decisions), users, superusers, subsidiaries, products, product
tabs, BOB-value links, news, integrations, reports (home, dashboard,
practice-usage, bobscore, brush-usage, analytics, legacy-switch, emails),
tickets, templates, countries, languages. Table columns were then set to the
real field names, and the nested reports (home, dashboard, analytics, bobscore)
print their inner list. No write was sent.

## Live write cycle (18 Nov 2026, test, with Sean's yes)

Draft news item "[CLI TEST] bob-admin write check", CH only, inactive:
`news create` → created hidden, revision 1 → `news get` matched what was sent →
`news update --title ...` → revision 2, still hidden → `news delete` → gone from
`news list`, `news get` answers 404. Nothing left behind on test.

## 18–20 Nov 2026: prod, `call`, chaining

- Prod: the production admin's bundle makes exactly the same API calls as test;
  prod `/api/health` is healthy.
- `call`: 140 generated commands (every endpoint but health). Tests check the
  count, required-field checks, type coercion (arrays, booleans, numbers), path +
  query building, the `--body-data` rename, `--out` for exports, IDs from stdin,
  and that piped writes need `--yes`.
- Chaining: `--all` follows pages (live on test: 103/103 practices over 5 pages,
  73/73 practice-usage rows over 3 pages), `--fields`, `--ids`, and
  `--ids … | call practices find-one -` (live on test).
- Installer: `install.ps1` installs into `%USERPROFILE%\.bob-admin`; the
  installed copy carries the spec and SKILL.md and kept the existing sign-in.

## Live read-only pass on prod (23 Nov 2026, Super User account)

Sean signed in with `--env prod auth login`. Every read command answered with
`--json`: health, auth whoami / capabilities, countries, languages, practices
(list, pending, decisions, stats for one practice), users, superusers (and
`--partners`), subsidiaries, products, product tabs, BOB-value links, news,
integrations, tickets, templates, and all eight reports. Most answer in about a
second; `reports dashboard` takes about 12 s. Totals were production-sized (well
above test), so it reads the real platform. No write was sent and
`BOB_ADMIN_PROD_WRITES` was not set.

## Not yet covered

- Live writes in the other areas (test Super User, practice approval, product).
  Same request path as news, but each needs Sean's go-ahead per action.

## Results (18 Nov 2026)

```
53 passed
```
