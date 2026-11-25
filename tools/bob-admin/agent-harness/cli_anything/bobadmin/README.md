# cli_anything.bobadmin

BOB Admin CLI harness (CLI-Anything format). Entry points: `cli-anything-bobadmin` and `bob-admin`.

- `bobadmin_cli.py`: all commands (Click)
- `core/client.py`: environments, sign-in session, refresh, write guards
- `core/spec.py`: the bundled OpenAPI spec (`openapi.json`, from the test API Swagger page)
- `core/output.py`: tables and `--json`
- `skills/SKILL.md`: agent instructions (copy of `skills/bob-admin/SKILL.md` at the repo root)
- `tests/`: unit tests with faked HTTP, see `tests/TEST.md`

Usage and setup: `tools/bob-admin/README.md`.
