"""cli-anything-bobqa (alias: bob-qa): QA checks for the BOB web app.

The clinician-facing web app (test.bobscore.app, prod bobscore.app) is an
Expo build that talks to the same platform API as BOB Admin. bob-qa signs in
as a coach, makes the same calls the app makes, and runs scripted scenarios
that report pass / fail. It shares bob-admin's core (session, refresh,
output); it keeps its own sign-in (qa-session-<env>.json) so bob-admin and
bob-qa can be signed in as different people.

Writes go to the test platform only (they create patient data), need a yes
(or --yes), and every patient bob-qa creates is named QA-TEST and deleted
at the end of the run.
"""

from __future__ import annotations

import getpass
import json
import os
import shlex
import sys
from typing import Any

import click

from cli_anything.bobadmin.core.client import DEFAULT_ENV, ENVIRONMENTS, BobAdminError, Client, Request, unwrap
from cli_anything.bobadmin.core.output import emit, extract_rows
from cli_anything.bobqa.core import fixtures, qaconfig, scenarios

CLI_NAME = "bob-qa"
SESSION_NAME = "qa-session"
WEB_APP = {"test": "https://test.bobscore.app", "prod": "https://bobscore.app"}
PATIENT_COLS = ["id", "firstName", "lastName", "practiceId", "isTemporary", "status", "lastSessionAt", "createdAt"]
SCORE_COLS = ["id", "type", "assessments", "status", "createdAt", "timestamp"]


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def client(ctx: click.Context) -> Client:
    if "client" not in ctx.obj:
        ctx.obj["client"] = Client(env=ctx.obj["env"], lang=ctx.obj.get("lang"),
                                   session_name=SESSION_NAME, cli_name=CLI_NAME)
    return ctx.obj["client"]


def confirm_write(ctx: click.Context, what: Any) -> bool:
    """Dry run, --yes or an interactive yes. Returns False on dry run."""
    c = client(ctx)
    scenarios.guard_write(c)
    if ctx.obj.get("dry_run"):
        emit(ctx, {"dryRun": True, "env": c.env, **(what if isinstance(what, dict) else {"plan": what})})
        return False
    if ctx.obj.get("yes"):
        return True
    if ctx.obj.get("json") or not sys.stdin.isatty():
        raise BobAdminError("This changes data on test. Re-run with --yes (or --dry-run to preview).")
    click.echo(json.dumps({"env": c.env, **(what if isinstance(what, dict) else {"plan": what})},
                          indent=2, ensure_ascii=False))
    click.confirm(f"Send this to {c.env}?", abort=True)
    return True


def run(ctx: click.Context, req: Request, columns: list[str] | None = None) -> Any:
    c = client(ctx)
    if req.is_write and not confirm_write(ctx, req.describe(c.base)):
        return None
    result = c.call(req)
    emit(ctx, result, columns)
    return result


def page_opts(f):
    f = click.option("--limit", type=int, help="Page size.")(f)
    f = click.option("--page", type=int, help="Page number (1-based).")(f)
    return f


def clean(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


def practice_or_config(practice: int | None) -> int:
    practice = practice or qaconfig.load().get("practice")
    if not practice:
        raise click.UsageError("Pass --practice ID (or set one: bob-qa config set practice ID).")
    return int(practice)


# --------------------------------------------------------------------------
# root
# --------------------------------------------------------------------------
@click.group(invoke_without_command=True, context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--env", type=click.Choice(sorted(ENVIRONMENTS)),
              default=lambda: os.environ.get("BOB_QA_ENV", DEFAULT_ENV), show_default="test",
              help="Which BOB platform. Writes only ever go to test.")
@click.option("--json", "as_json", is_flag=True, help="Machine-readable JSON output.")
@click.option("--yes", "-y", is_flag=True, help="Send writes without asking.")
@click.option("--dry-run", is_flag=True, help="Show what a write or scenario would send, send nothing.")
@click.option("--lang", help="x-custom-lang header (response language), e.g. en, de.")
@click.option("--fields", help="Comma-separated fields to keep, e.g. id,firstName.")
@click.option("--ids", "ids_only", is_flag=True, help="Print only record IDs, one per line.")
@click.pass_context
def cli(ctx, env, as_json, yes, dry_run, lang, fields, ids_only) -> None:
    """QA for the BOB web app (test.bobscore.app) from the command line.

    Signs in as a coach and makes the calls the web app makes: practices,
    patients, BOB scores, temporary patients, products, templates. `qa run`
    plays a whole scenario and reports pass / fail.

    Runs against TEST unless you pass --env prod (reads only there).
    With no command it opens an interactive shell.
    """
    ctx.ensure_object(dict)
    ctx.obj.update(env=env, json=as_json, yes=yes, dry_run=dry_run, lang=lang, ids=ids_only,
                   fields=[f.strip() for f in fields.split(",") if f.strip()] if fields else None)
    if ctx.invoked_subcommand is None:
        repl(ctx)


def repl(ctx: click.Context) -> None:
    env = ctx.obj["env"]
    click.echo(f"bob-qa shell ({env}). Type 'help', a command such as 'qa run smoke', or 'exit'.")
    while True:
        try:
            line = input(f"bob-qa[{env}]> ").strip()
        except (EOFError, KeyboardInterrupt):
            click.echo()
            return
        if not line:
            continue
        if line in ("exit", "quit"):
            return
        args = ["--help"] if line == "help" else shlex.split(line)
        flags = ["--env", env] + (["--json"] if ctx.obj.get("json") else [])
        try:
            cli.main(args=flags + args, prog_name=CLI_NAME, standalone_mode=False)
        except click.exceptions.Abort:
            click.echo("Cancelled.")
        except click.ClickException as e:
            e.show()
        except BobAdminError as e:
            click.echo(f"Error: {e}", err=True)
        except SystemExit:
            pass


# --------------------------------------------------------------------------
# auth
# --------------------------------------------------------------------------
@cli.group()
def auth() -> None:
    """Sign in (as a coach on test), sign out, who am I."""


@auth.command("login")
@click.option("--identity", "-u", help="Email or username. Default: $BOB_QA_IDENTITY or a prompt.")
@click.pass_context
def auth_login(ctx, identity):
    """Sign in. The password comes from $BOB_QA_PASSWORD or a hidden prompt."""
    c = client(ctx)
    identity = identity or os.environ.get("BOB_QA_IDENTITY") or click.prompt("Email or username")
    password = os.environ.get("BOB_QA_PASSWORD") or getpass.getpass("Password: ")
    result = c.login(identity, password)
    if result.get("requiresPasswordChange"):
        raise BobAdminError("This account has a temporary password. Set a new one in the web app first, "
                            f"then run {CLI_NAME} auth login again.")
    user = result.get("user") or {}
    emit(ctx, {"signedIn": True, "env": c.env, "api": c.base,
               "user": user.get("email") or user.get("username") or identity,
               "roles": user.get("roles") or user.get("role")})


@auth.command("logout")
@click.pass_context
def auth_logout(ctx):
    """Sign out and forget the saved bob-qa session for this environment."""
    c = client(ctx)
    c.logout()
    emit(ctx, {"signedIn": False, "env": c.env})


@auth.command("status")
@click.pass_context
def auth_status(ctx):
    """Environment, addresses and saved sign-in (no network call)."""
    c = client(ctx)
    u = c.session.user
    emit(ctx, {"env": c.env, "api": c.base, "webApp": WEB_APP.get(c.env), "signedIn": bool(c.session.access_token),
               "user": u.get("email") or u.get("username"), "roles": u.get("roles") or u.get("role"),
               "writesAllowed": c.env == "test"})


@auth.command("whoami")
@click.pass_context
def auth_whoami(ctx):
    """The signed-in user, from the API (GET /auth/me)."""
    run(ctx, Request("GET", "/auth/me"))


# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------
@cli.group()
def config() -> None:
    """Local QA settings: the QA inbox and the default practice (kept on this PC only)."""


@config.command("show")
@click.pass_context
def config_show(ctx):
    emit(ctx, {"file": str(qaconfig.path()), **{k: qaconfig.load().get(k) for k in qaconfig.KEYS}})


@config.command("set")
@click.argument("key", type=click.Choice(sorted(qaconfig.KEYS)))
@click.argument("value")
@click.pass_context
def config_set(ctx, key, value):
    """email: QA inbox for score emails. practice: default practice ID."""
    data = qaconfig.load()
    if key == "practice":
        if not value.isdigit():
            raise click.BadParameter("practice must be a numeric ID")
        data[key] = int(value)
    else:
        if "@" not in value:
            raise click.BadParameter("email must be an email address")
        data[key] = value
    qaconfig.save(data)
    emit(ctx, {"saved": key, "value": data[key]})


@config.command("unset")
@click.argument("key", type=click.Choice(sorted(qaconfig.KEYS)))
@click.pass_context
def config_unset(ctx, key):
    data = qaconfig.load()
    data.pop(key, None)
    qaconfig.save(data)
    emit(ctx, {"removed": key})


# --------------------------------------------------------------------------
# reads the web app makes on start
# --------------------------------------------------------------------------
@cli.group()
def practices() -> None:
    """Practices you coach in."""


@practices.command("list")
@page_opts
@click.pass_context
def practices_list(ctx, page, limit):
    """GET /practices/my-coached"""
    run(ctx, Request("GET", "/practices/my-coached", params=clean({"page": page, "limit": limit})),
        ["id", "name", "status", "countryCode", "role", "memberType"])


@practices.command("stats")
@click.argument("practice_id", type=int)
@click.pass_context
def practices_stats(ctx, practice_id):
    """Weekly statistics the home screen shows."""
    run(ctx, Request("GET", f"/practices/{practice_id}/statistics"))


@cli.command("products")
@click.option("--practice", type=int, help="Practice ID (the app sends it).")
@click.option("--search", "-q")
@click.pass_context
def products(ctx, practice, search):
    """Product tabs and active products, as the app's catalogue shows them."""
    run(ctx, Request("GET", "/products", params=clean({"practiceId": practice, "q": search, "lang": ctx.obj.get("lang")})))


@cli.command("templates")
@click.pass_context
def templates(ctx):
    """Recommendation templates (system ones plus your own)."""
    run(ctx, Request("GET", "/recommendation-templates", params=clean({"lang": ctx.obj.get("lang")})))


@cli.command("settings")
@click.pass_context
def settings(ctx):
    """Your user settings (GET /settings)."""
    run(ctx, Request("GET", "/settings"))


@cli.command("app-config")
@click.pass_context
def app_config(ctx):
    """Runtime app settings (GET /app-config)."""
    run(ctx, Request("GET", "/app-config"))


@cli.command("announcements")
@click.pass_context
def announcements(ctx):
    """Live, undismissed news announcements for this account."""
    run(ctx, Request("GET", "/news/announcements"))


# --------------------------------------------------------------------------
# patients
# --------------------------------------------------------------------------
@cli.group()
def patients() -> None:
    """Patients: list, read, create a QA test patient, delete QA test patients."""


@patients.command("list")
@click.option("--practice", type=int)
@click.option("--search", "-q")
@click.option("--temporary/--not-temporary", default=None)
@click.option("--qa-only", is_flag=True, help="Only QA-TEST patients (left over from runs).")
@page_opts
@click.pass_context
def patients_list(ctx, practice, search, temporary, qa_only, page, limit):
    """GET /patients"""
    params = clean({"practiceId": practice, "search": fixtures.QA_FIRST_NAME if qa_only else search,
                    "isTemporary": None if temporary is None else str(temporary).lower(),
                    "page": page, "limit": limit})
    run(ctx, Request("GET", "/patients", params=params), PATIENT_COLS)


@patients.command("get")
@click.argument("patient_id", type=int)
@click.pass_context
def patients_get(ctx, patient_id):
    run(ctx, Request("GET", f"/patients/{patient_id}"))


@patients.command("create-test")
@click.option("--practice", type=int, help="Practice ID. Default: bob-qa config practice.")
@click.option("--email", help="Patient email. Default: the QA inbox from bob-qa config, else example.com.")
@click.pass_context
def patients_create_test(ctx, practice, email):
    """Create a QA test patient (first name QA-TEST). Delete it with `patients delete`."""
    body = fixtures.qa_patient(practice_or_config(practice), fixtures.new_run_id(),
                               email or qaconfig.load().get("email"))
    run(ctx, Request("POST", "/patients", body=body), PATIENT_COLS)


@patients.command("delete")
@click.argument("patient_id", type=int)
@click.pass_context
def patients_delete(ctx, patient_id):
    """Soft-delete a QA-TEST patient. Refuses any other patient."""
    c = client(ctx)
    p = unwrap(c.call(Request("GET", f"/patients/{patient_id}")))
    if not (isinstance(p, dict) and (fixtures.is_qa_patient(p) or p.get("isTemporary"))):
        raise BobAdminError(f"Patient {patient_id} is not a QA-TEST or temporary patient; bob-qa only deletes its own test data.")
    run(ctx, Request("DELETE", f"/patients/{patient_id}"))


@patients.command("cleanup")
@click.option("--practice", type=int)
@click.pass_context
def patients_cleanup(ctx, practice):
    """Delete every QA-TEST patient left over from earlier runs."""
    c = client(ctx)
    data = unwrap(c.call(Request("GET", "/patients", params=clean(
        {"practiceId": practice, "search": fixtures.QA_FIRST_NAME, "limit": 100}))))
    rows, _ = extract_rows(data)
    left = [r for r in rows or [] if fixtures.is_qa_patient(r)]
    if not left:
        emit(ctx, {"deleted": [], "note": "no QA-TEST patients found"})
        return
    if not confirm_write(ctx, {"delete": [{"id": r.get("id"), "lastName": r.get("lastName")} for r in left]}):
        return
    for r in left:
        c.call(Request("DELETE", f"/patients/{r['id']}"))
    emit(ctx, {"deleted": [r["id"] for r in left]})


# --------------------------------------------------------------------------
# scores
# --------------------------------------------------------------------------
@cli.group()
def scores() -> None:
    """BOB scores: list, read, record (QA fixture), temporary patient, assign, resend email."""


@scores.command("list")
@click.argument("patient_id", type=int)
@page_opts
@click.pass_context
def scores_list(ctx, patient_id, page, limit):
    run(ctx, Request("GET", f"/patients/{patient_id}/scores", params=clean({"page": page, "limit": limit})), SCORE_COLS)


@scores.command("get")
@click.argument("patient_id", type=int)
@click.argument("score_id", type=int)
@click.pass_context
def scores_get(ctx, patient_id, score_id):
    run(ctx, Request("GET", f"/patients/{patient_id}/scores/{score_id}"))


@scores.command("bob-values")
@click.argument("patient_id", type=int)
@click.option("--score", "score_id", type=int)
@click.pass_context
def scores_bob_values(ctx, patient_id, score_id):
    """BOB values the patient already had on an earlier chart."""
    run(ctx, Request("GET", f"/patients/{patient_id}/bob-values", params=clean({"scoreId": score_id})))


@scores.command("score-base")
@click.argument("patient_id", type=int)
@click.pass_context
def scores_base(ctx, patient_id):
    run(ctx, Request("GET", f"/patients/{patient_id}/score-base"))


@scores.command("create")
@click.argument("patient_id", type=int)
@click.pass_context
def scores_create(ctx, patient_id):
    """Record a QA BOB score (healthy 32-tooth mouth, score 0) on a patient."""
    run(ctx, Request("POST", f"/patients/{patient_id}/scores", body=fixtures.score_payload(fixtures.new_run_id())))


@scores.command("temporary")
@click.option("--practice", type=int, help="Practice ID. Default: bob-qa config practice.")
@click.pass_context
def scores_temporary(ctx, practice):
    """Record a QA BOB score with a temporary patient (no patient details yet)."""
    body = fixtures.temporary_score_payload(practice_or_config(practice), fixtures.new_run_id())
    run(ctx, Request("POST", "/patients/scores", body=body))


@scores.command("assign")
@click.argument("temporary_patient_id", type=int)
@click.argument("patient_id", type=int)
@click.pass_context
def scores_assign(ctx, temporary_patient_id, patient_id):
    """Move a temporary patient's session onto an existing patient."""
    run(ctx, Request("POST", "/patients/assign-session",
                     body={"sourcePatientId": temporary_patient_id, "targetPatientId": patient_id}))


@scores.command("resend")
@click.argument("patient_id", type=int)
@click.argument("score_id", type=int)
@click.pass_context
def scores_resend(ctx, patient_id, score_id):
    """Queue the score-report email again (goes to the patient's email)."""
    run(ctx, Request("POST", f"/patients/{patient_id}/scores/{score_id}/resend-mail"))


# --------------------------------------------------------------------------
# qa
# --------------------------------------------------------------------------
@cli.group()
def qa() -> None:
    """Scripted QA scenarios with a pass / fail report."""


@qa.command("list")
@click.pass_context
def qa_list(ctx):
    rows = [{"scenario": k, "writes": scenarios.scenario_writes(k), "steps": len(v["steps"]), "what": v["doc"]}
            for k, v in scenarios.SCENARIOS.items()]
    if ctx.obj.get("json"):
        click.echo(json.dumps(rows, indent=2))
        return
    for r in rows:
        click.echo(f"{r['scenario']:<12} {'writes' if r['writes'] else 'read-only':<9} {r['steps']:>2} steps  {r['what']}")


@qa.command("show")
@click.argument("scenario", type=click.Choice(sorted(scenarios.SCENARIOS)))
@click.pass_context
def qa_show(ctx, scenario):
    """The steps a scenario runs and the call behind each."""
    emit(ctx, scenarios.plan(scenario), ["step", "writes", "call"])


@qa.command("run")
@click.argument("scenario", type=click.Choice(sorted(scenarios.SCENARIOS)))
@click.option("--practice", type=int, help="Practice ID. Default: config, then your default practice.")
@click.option("--email", help="QA inbox for the score email. Default: bob-qa config email.")
@click.option("--no-email", is_flag=True, help="Skip the score-email step.")
@click.option("--keep", is_flag=True, help="Leave the QA test data in place (for checking it in the web app).")
@click.pass_context
def qa_run(ctx, scenario, practice, email, no_email, keep):
    """Run a scenario. Exit code 0 = all passed, 1 = something failed."""
    c = client(ctx)
    cfg = qaconfig.load()
    email = None if no_email else (email or cfg.get("email"))
    if scenarios.scenario_writes(scenario):
        if not email and not no_email and not ctx.obj.get("json") and sys.stdin.isatty() and not ctx.obj.get("dry_run"):
            email = click.prompt("QA inbox for the score email (Enter to skip)", default="", show_default=False) or None
        what = {"scenario": scenario, "practice": practice or cfg.get("practice") or "default",
                "qaInbox": email, "keep": keep, "steps": scenarios.plan(scenario)}
        if not confirm_write(ctx, what):
            return
    r = scenarios.Run(client=c, scenario=scenario, practice=practice or cfg.get("practice"), email=email, keep=keep)
    report = r.execute(scenarios.SCENARIOS[scenario]["steps"])
    report["savedTo"] = str(qaconfig.save_report(report))
    if ctx.obj.get("json"):
        click.echo(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    else:
        mark = {"pass": "PASS", "fail": "FAIL", "skip": "skip"}
        click.echo(f"{scenario} on {report['env']} (run {report['runId']}, practice {report['practiceId']})")
        for s in report["steps"]:
            ms = f"{s['ms']:>5} ms" if "ms" in s else " " * 8
            click.echo(f"  {mark[s['status']]:<4}  {s['step']:<26} {ms}  {s['detail']}")
        n = report["counts"]
        click.echo(f"\n{'PASSED' if report['passed'] else 'FAILED'}: {n['pass']} passed, {n['fail']} failed, "
                   f"{n['skip']} skipped in {report['seconds']} s. Report: {report['savedTo']}")
    if not report["passed"]:
        ctx.exit(1)


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    try:
        cli(prog_name=CLI_NAME)
    except BobAdminError as e:
        if "--json" in sys.argv:
            click.echo(json.dumps({"error": str(e), "status": e.status, "details": e.payload}, ensure_ascii=False, default=str))
        else:
            click.echo(f"Error: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
