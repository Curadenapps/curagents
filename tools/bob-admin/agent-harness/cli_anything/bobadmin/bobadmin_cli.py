"""cli-anything-bobadmin (alias: bob-admin) — agent-native CLI for BOB Admin.

Built in the CLI-Anything harness format from the BOB platform API's own
OpenAPI spec. Every command supports --json. Writes support --dry-run,
ask before sending (or take --yes), and production writes stay locked
unless BOB_ADMIN_PROD_WRITES=1 is set in the shell.
"""

from __future__ import annotations

import getpass
import json
import os
import shlex
import sys
from pathlib import Path
from typing import Any

import click

from cli_anything.bobadmin.core import approval, spec
from cli_anything.bobadmin.core.client import (
    DEFAULT_ENV,
    ENVIRONMENTS,
    BobAdminError,
    Client,
    Request,
)
from cli_anything.bobadmin.core.generated import build_group, read_ids
from cli_anything.bobadmin.core.output import emit, unwrap

ROLES = ["superuser", "subsidiary", "practice_admin", "coach"]  # reactivate accepts all four
ADMIN_ROLES = ["superuser", "subsidiary"]  # /users create + update; practice roles go via practices members
USER_COLS = ["id", "firstName", "lastName", "email", "roles", "subsidiaryId", "status", "createdAt"]
ROLE_LABELS = {
    "super_admin": "Super Admin",
    "superuser": "Super User",
    "subsidiary": "Subsidiary / Partner",
    "practice_admin": "Practice Admin",
    "coach": "Coach",
}
EMAIL_LANGS = ["en", "de", "fr", "it", "ar", "sl", "es", "ja", "pt"]
PRACTICE_STATUS = ["pending", "new", "active", "inactive", "rejected"]


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def client(ctx: click.Context) -> Client:
    if "client" not in ctx.obj:
        ctx.obj["client"] = Client(env=ctx.obj["env"], lang=ctx.obj.get("lang"))
    return ctx.obj["client"]


def clean(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None and v != () and v != []}


def parse_value(raw: str) -> Any:
    try:
        return json.loads(raw)
    except ValueError:
        return raw


def load_data(data: str | None) -> dict[str, Any]:
    """--data '{...}' or --data @file.json"""
    if not data:
        return {}
    text = Path(data[1:]).read_text(encoding="utf8") if data.startswith("@") else data
    try:
        loaded = json.loads(text)
    except ValueError as e:
        raise click.BadParameter(f"--data is not valid JSON: {e}")
    if not isinstance(loaded, dict):
        raise click.BadParameter("--data must be a JSON object")
    return loaded


def parse_pairs(pairs: tuple[str, ...], what: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for p in pairs:
        if "=" not in p:
            raise click.BadParameter(f"{what} must look like key=value, got '{p}'")
        k, v = p.split("=", 1)
        out[k.strip()] = parse_value(v)
    return out


def body_from(fields: dict[str, Any], data: str | None = None, sets: tuple[str, ...] = ()) -> dict[str, Any]:
    body = load_data(data)
    body.update(clean(fields))
    body.update(parse_pairs(sets, "--set"))
    return body


def run(ctx: click.Context, req: Request, columns: list[str] | None = None, out: str | None = None,
        rows_key: str | None = None) -> Any:
    """Send a request with the write guards, then print or save the result."""
    c = client(ctx)
    if req.is_write:
        c.check_write_allowed()
        if ctx.obj.get("dry_run"):
            emit(ctx, {"dryRun": True, "env": c.env, **req.describe(c.base)})
            return None
        if not ctx.obj.get("yes"):
            if ctx.obj.get("json") or not sys.stdin.isatty():
                raise BobAdminError("This changes data. Re-run with --yes (or --dry-run to preview).")
            click.echo(json.dumps({"env": c.env, **req.describe(c.base)}, indent=2, ensure_ascii=False))
            label = "PRODUCTION" if c.env == "prod" else c.env
            click.confirm(f"Send this to {label}?", abort=True)
    if out:
        r = c.call(req, raw=True)
        Path(out).write_bytes(r.content)
        emit(ctx, {"saved": str(Path(out).resolve()), "bytes": len(r.content), "contentType": r.headers.get("content-type")})
        return None
    result = c.call(req)
    if ctx.obj.get("all") and req.method.upper() == "GET":
        result = fetch_all(c, req, result)
    emit(ctx, result, columns, rows_key)
    return result


MAX_PAGES = 200


def fetch_all(c: Client, req: Request, first: Any) -> Any:
    """Follow pagination to the end. Handles {items, meta} and {rows, pagination}."""
    data = unwrap(first)
    if not isinstance(data, dict):
        return first
    if isinstance(data.get("items"), list) and isinstance(data.get("meta"), dict):
        key, total_pages = "items", int(data["meta"].get("totalPages") or 1)
        current = int(data["meta"].get("currentPage") or 1)
    elif isinstance(data.get("rows"), list) and isinstance(data.get("pagination"), dict):
        pg = data["pagination"]
        size = int(pg.get("pageSize") or len(data["rows"]) or 1)
        key, current = "rows", int(pg.get("page") or 1)
        total_pages = -(-int(pg.get("total") or 0) // size)
    else:
        return first
    rows = list(data[key])
    for page in range(current + 1, min(total_pages, MAX_PAGES) + 1):
        nxt = unwrap(c.call(Request("GET", req.path, params={**(req.params or {}), "page": page})))
        rows += list(nxt.get(key) or []) if isinstance(nxt, dict) else []
    merged = {k: v for k, v in data.items() if k not in ("links",)}
    merged[key] = rows
    merged["fetchedAll"] = {"records": len(rows), "pages": max(total_pages, 1)}
    return merged


def write_opts(f):
    """--data / --set for fields without a dedicated option."""
    f = click.option("--set", "sets", multiple=True, metavar="KEY=VALUE", help="Extra body field (value parsed as JSON when it can be).")(f)
    f = click.option("--data", metavar="JSON|@FILE", help="Body as JSON or @file.json; options override it.")(f)
    return f


def page_opts(f):
    f = click.option("--limit", type=int, help="Page size.")(f)
    f = click.option("--page", type=int, help="Page number (1-based).")(f)
    return f


# --------------------------------------------------------------------------
# root
# --------------------------------------------------------------------------
@click.group(invoke_without_command=True, context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--env", type=click.Choice(sorted(ENVIRONMENTS)), default=lambda: os.environ.get("BOB_ADMIN_ENV", DEFAULT_ENV), show_default="test", help="Which BOB platform to talk to.")
@click.option("--json", "as_json", is_flag=True, help="Machine-readable JSON output.")
@click.option("--yes", "-y", is_flag=True, help="Send writes without asking.")
@click.option("--dry-run", is_flag=True, help="Show what a write would send, send nothing.")
@click.option("--lang", help="x-custom-lang header (response language), e.g. en, de.")
@click.option("--all", "fetch_all_pages", is_flag=True, help="Follow pagination and return every record.")
@click.option("--fields", help="Comma-separated fields to keep, e.g. id,name,email (tables and JSON).")
@click.option("--ids", "ids_only", is_flag=True, help="Print only record IDs, one per line (pipe into '-').")
@click.pass_context
def cli(ctx: click.Context, env: str, as_json: bool, yes: bool, dry_run: bool, lang: str | None,
        fetch_all_pages: bool, fields: str | None, ids_only: bool) -> None:
    """BOB Admin from the command line: users, Super Users, practices,
    approvals, products, news, subsidiaries, integrations and reports.
    `call` reaches every one of the API's endpoints.

    Runs against the TEST platform unless you pass --env prod.
    With no command it opens an interactive shell.
    """
    ctx.ensure_object(dict)
    ctx.obj.update(env=env, json=as_json, yes=yes, dry_run=dry_run, lang=lang, all=fetch_all_pages,
                   fields=[f.strip() for f in fields.split(",") if f.strip()] if fields else None,
                   ids=ids_only)
    if ctx.invoked_subcommand is None:
        repl(ctx)


def repl(ctx: click.Context) -> None:
    env = ctx.obj["env"]
    click.echo(f"bob-admin shell ({env}). Type 'help', a command such as 'users list', or 'exit'.")
    while True:
        try:
            line = input(f"bob-admin[{env}]> ").strip()
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
            cli.main(args=flags + args, prog_name="bob-admin", standalone_mode=False)
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
    """Sign in, sign out, who am I."""


@auth.command("login")
@click.option("--identity", "-u", help="Email or username. Default: $BOB_ADMIN_IDENTITY or a prompt.")
@click.pass_context
def auth_login(ctx: click.Context, identity: str | None) -> None:
    """Sign in. The password comes from $BOB_ADMIN_PASSWORD or a hidden prompt."""
    c = client(ctx)
    identity = identity or os.environ.get("BOB_ADMIN_IDENTITY") or click.prompt("Email or username")
    password = os.environ.get("BOB_ADMIN_PASSWORD") or getpass.getpass("Password: ")
    result = c.login(identity, password)
    if result.get("requiresPasswordChange"):
        if ctx.obj.get("json") or not sys.stdin.isatty():
            raise BobAdminError("This account must set a new password first. Run auth login in a terminal.")
        click.echo("This account has a temporary password and must set a new one.")
        new = getpass.getpass("New password: ")
        if new != getpass.getpass("Repeat new password: "):
            raise BobAdminError("Passwords did not match.")
        c.complete_temporary_password(result["passwordChangeToken"], new)
        click.echo("Password set. Signing in again...")
        result = c.login(identity, new)
    user = result.get("user") or {}
    emit(ctx, {
        "signedIn": True,
        "env": c.env,
        "api": c.base,
        "user": user.get("email") or user.get("username") or identity,
        "roles": user.get("roles") or user.get("role"),
    })


@auth.command("logout")
@click.pass_context
def auth_logout(ctx: click.Context) -> None:
    """Sign out and forget the saved session for this environment."""
    c = client(ctx)
    c.logout()
    emit(ctx, {"signedIn": False, "env": c.env})


@auth.command("status")
@click.pass_context
def auth_status(ctx: click.Context) -> None:
    """Show environment, API address and saved sign-in (no network call)."""
    c = client(ctx)
    u = c.session.user
    emit(ctx, {
        "env": c.env,
        "api": c.base,
        "admin": ENVIRONMENTS.get(c.env, {}).get("admin"),
        "signedIn": bool(c.session.access_token),
        "user": u.get("email") or u.get("username"),
        "roles": u.get("roles") or u.get("role"),
        "prodWritesUnlocked": os.environ.get("BOB_ADMIN_PROD_WRITES") == "1",
    })


@auth.command("whoami")
@click.pass_context
def auth_whoami(ctx: click.Context) -> None:
    """The signed-in user, from the API."""
    run(ctx, Request("GET", "/auth/me"))


@auth.command("capabilities")
@click.pass_context
def auth_capabilities(ctx: click.Context) -> None:
    """What the signed-in user may do in the admin."""
    run(ctx, Request("GET", "/auth/me/capabilities"))


# --------------------------------------------------------------------------
# users
# --------------------------------------------------------------------------
@cli.group()
def users() -> None:
    """Admin users: list, create, edit, deactivate, temporary passwords."""


@users.command("list")
@click.option("--role", type=click.Choice(["super_admin", *ROLES]))
@click.option("--search", "-q")
@click.option("--activation", type=click.Choice(["activated", "pending"]))
@click.option("--deactivated", is_flag=True, help="Only deactivated users.")
@click.option("--subsidiary-users", type=click.Choice(["all", "direct"]))
@click.option("--sort")
@page_opts
@click.pass_context
def users_list(ctx, role, search, activation, deactivated, subsidiary_users, sort, page, limit):
    """List users you can see (scope follows your role)."""
    params = clean({"role": role, "search": search, "activation": activation,
                    "deactivated": "true" if deactivated else None, "subsidiaryUsers": subsidiary_users,
                    "sort": sort, "page": page, "limit": limit})
    run(ctx, Request("GET", "/users", params=params),
        USER_COLS)


@users.command("get")
@click.argument("user_id")
@click.pass_context
def users_get(ctx, user_id):
    """One user's details."""
    run(ctx, Request("GET", f"/users/{user_id}"))


def _create_user(ctx, first_name, last_name, email, username, roles, subsidiary_id, country, email_language,
                 send_invite, temp_password, data, sets):
    body = body_from({
        "firstName": first_name, "lastName": last_name, "email": email, "username": username,
        "roles": list(roles) or None, "subsidiaryId": subsidiary_id, "countryCode": country,
        "adminEmailLanguage": email_language, "sendInvite": send_invite, "sendTemporaryPassword": temp_password,
    }, data, sets)
    if "subsidiary" in body.get("roles", []) and not body.get("subsidiaryId"):
        raise click.BadParameter("A Subsidiary / Partner user needs --subsidiary-id.")
    run(ctx, Request("POST", "/users", body=body))


def user_create_options(f):
    f = write_opts(f)
    f = click.option("--temp-password/--no-temp-password", default=None, help="Email a temporary password.")(f)
    f = click.option("--send-invite/--no-send-invite", default=None,
                     help="Invite email. If you give neither, the API SENDS one (its default).")(f)
    f = click.option("--email-language", type=click.Choice(EMAIL_LANGS), help="Language of the admin email.")(f)
    f = click.option("--country", help="Country code, e.g. CH, AE.")(f)
    f = click.option("--subsidiary-id", help="Required for Subsidiary / Partner users.")(f)
    f = click.option("--username")(f)
    f = click.option("--email", required=True)(f)
    f = click.option("--last-name", required=True)(f)
    f = click.option("--first-name", required=True)(f)
    return f


@users.command("create")
@click.option("--role", "roles", multiple=True, required=True, type=click.Choice(ADMIN_ROLES))
@user_create_options
@click.pass_context
def users_create(ctx, roles, first_name, last_name, email, username, subsidiary_id, country, email_language,
                 send_invite, temp_password, data, sets):
    """Create a Super User or Subsidiary / Partner admin.

    The API emails an invite unless you pass --no-send-invite. Practice
    Admins and Coaches are added with 'practices members add'.
    """
    _create_user(ctx, first_name, last_name, email, username, roles, subsidiary_id, country, email_language,
                 send_invite, temp_password, data, sets)


@users.command("update")
@click.argument("user_id")
@click.option("--first-name")
@click.option("--last-name")
@click.option("--email")
@click.option("--country")
@click.option("--subsidiary-id")
@click.option("--role", "roles", multiple=True, type=click.Choice(ADMIN_ROLES),
              help="Replaces the user's admin roles. Practice Admin / Coach: use 'practices members update'.")
@click.option("--email-language", type=click.Choice(EMAIL_LANGS))
@write_opts
@click.pass_context
def users_update(ctx, user_id, first_name, last_name, email, country, subsidiary_id, roles, email_language, data, sets):
    """Edit a user: name, email, country, subsidiary, roles."""
    body = body_from({"firstName": first_name, "lastName": last_name, "email": email, "countryCode": country,
                      "subsidiaryId": subsidiary_id, "roles": list(roles) or None,
                      "adminEmailLanguage": email_language}, data, sets)
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/users/{user_id}", body=body))


@users.command("deactivate")
@click.argument("user_id")
@click.pass_context
def users_deactivate(ctx, user_id):
    """Deactivate (soft-delete) a user. Undo with 'users reactivate'."""
    run(ctx, Request("DELETE", f"/users/{user_id}"))


@users.command("reactivate")
@click.argument("user_id")
@click.option("--role", required=True, type=click.Choice(ROLES))
@click.option("--subsidiary-id")
@click.option("--practice-id")
@click.pass_context
def users_reactivate(ctx, user_id, role, subsidiary_id, practice_id):
    """Reactivate a deactivated user with a role (Super User only)."""
    run(ctx, Request("POST", f"/users/{user_id}/reactivate",
                     body=clean({"role": role, "subsidiaryId": subsidiary_id, "practiceId": practice_id})))


@users.command("temp-password")
@click.argument("user_ids", nargs=-1, required=True)
@click.pass_context
def users_temp_password(ctx, user_ids):
    """Generate and email temporary passwords to these users ('-' reads IDs from stdin)."""
    try:
        ids = [int(x) for x in read_ids(user_ids)]
    except ValueError:
        raise click.BadParameter("User IDs must be numbers.")
    if not ids:
        raise click.UsageError("No user IDs given.")
    run(ctx, Request("POST", "/users/temporary-password", body={"userIds": ids}))


@users.command("erase")
@click.argument("user_id")
@click.option("--confirm-email", required=True, help="The user's email, typed out, to confirm.")
@click.pass_context
def users_erase(ctx, user_id, confirm_email):
    """PERMANENTLY erase a user (personal-data erasure). Cannot be undone."""
    c = client(ctx)
    current = unwrap(c.call(Request("GET", f"/users/{user_id}")))
    actual = (current.get("email") if isinstance(current, dict) else None) or ""
    if actual.lower() != confirm_email.lower():
        raise BobAdminError(f"--confirm-email does not match user {user_id}. Nothing erased.")
    run(ctx, Request("DELETE", f"/users/{user_id}/permanent"))


# --------------------------------------------------------------------------
# super users (shortcuts on users)
# --------------------------------------------------------------------------
@cli.group("superusers")
def superusers() -> None:
    """Super Users and Subsidiary / Partner admins (shortcuts)."""


@superusers.command("list")
@click.option("--partners", is_flag=True, help="List Subsidiary / Partner admins instead.")
@click.option("--search", "-q")
@page_opts
@click.pass_context
def superusers_list(ctx, partners, search, page, limit):
    """List Super Users (or partner admins)."""
    params = clean({"role": "subsidiary" if partners else "superuser", "search": search, "page": page, "limit": limit})
    run(ctx, Request("GET", "/users", params=params),
        USER_COLS)


@superusers.command("create")
@click.option("--partner", is_flag=True, help="Create a Subsidiary / Partner admin instead (needs --subsidiary-id).")
@user_create_options
@click.pass_context
def superusers_create(ctx, partner, first_name, last_name, email, username, subsidiary_id, country, email_language,
                      send_invite, temp_password, data, sets):
    """Create a Super User (or, with --partner, a Subsidiary / Partner admin)."""
    role = "subsidiary" if partner else "superuser"
    _create_user(ctx, first_name, last_name, email, username, (role,), subsidiary_id, country, email_language,
                 send_invite, temp_password, data, sets)


# --------------------------------------------------------------------------
# practices
# --------------------------------------------------------------------------
@cli.group()
def practices() -> None:
    """Practices: list, approve/reject registrations, edit, staff."""


PRACTICE_COLS = ["id", "code", "name", "status", "countryCode", "addressCity", "contactName", "contactEmail", "coachCount"]


@practices.command("list")
@click.option("--status", type=click.Choice(PRACTICE_STATUS))
@click.option("--exclude-status", type=click.Choice(PRACTICE_STATUS))
@click.option("--search", "-q")
@click.option("--subsidiary-id")
@click.option("--unassigned", is_flag=True, help="Only practices with no subsidiary.")
@click.option("--activation", type=click.Choice(["activated", "pending"]))
@click.option("--sort", help="e.g. name:asc, code:desc, status:asc, coachCount:desc")
@click.option("--counts", is_flag=True, help="Include status counts.")
@page_opts
@click.pass_context
def practices_list(ctx, status, exclude_status, search, subsidiary_id, unassigned, activation, sort, counts, page, limit):
    """List practices."""
    params = clean({"status": status, "excludeStatus": exclude_status, "search": search,
                    "subsidiaryId": subsidiary_id, "subsidiaryAssignment": "unassigned" if unassigned else None,
                    "activation": activation, "sort": sort, "includeStatusCounts": "true" if counts else None,
                    "page": page, "limit": limit})
    run(ctx, Request("GET", "/practices", params=params), PRACTICE_COLS)


@practices.command("pending")
@page_opts
@click.pass_context
def practices_pending(ctx, page, limit):
    """Registrations waiting for approval."""
    run(ctx, Request("GET", "/practices", params=clean({"status": "pending", "page": page, "limit": limit})), PRACTICE_COLS)


@practices.command("get")
@click.argument("practice_id")
@click.pass_context
def practices_get(ctx, practice_id):
    """One practice's details."""
    run(ctx, Request("GET", f"/practices/{practice_id}"))


@practices.command("stats")
@click.argument("practice_id")
@click.pass_context
def practices_stats(ctx, practice_id):
    """Weekly statistics for a practice."""
    run(ctx, Request("GET", f"/practices/{practice_id}/statistics"))


@practices.command("approve")
@click.argument("practice_id")
@click.option("--idb-office/--no-idb-office", required=True, help="Is it an IDB office?")
@click.option("--idb-kit/--no-idb-kit", required=True, help="Does it have the IDB kit?")
@click.option("--training-date", required=True, help="App training date, YYYY-MM-DD.")
@click.option("--subsidiary-id")
@click.option("--note")
@click.pass_context
def practices_approve(ctx, practice_id, idb_office, idb_kit, training_date, subsidiary_id, note):
    """Approve a pending registration (records the decision history)."""
    body = clean({"isIdbOffice": idb_office, "hasIdbKit": idb_kit, "appTrainingDate": training_date,
                  "subsidiaryId": subsidiary_id, "note": note})
    run(ctx, Request("POST", f"/practices/{practice_id}/decisions/approve", body=body))


@practices.command("reject")
@click.argument("practice_id")
@click.option("--reason", required=True)
@click.pass_context
def practices_reject(ctx, practice_id, reason):
    """Reject a pending registration with a reason (kept for review)."""
    run(ctx, Request("POST", f"/practices/{practice_id}/decisions/reject", body={"reason": reason}))


@practices.command("decisions")
@click.option("--practice-id", type=int)
@click.option("--outcome", type=click.Choice(["approved", "rejected"]))
@click.option("--subsidiary-id")
@click.option("--search", "-q")
@page_opts
@click.pass_context
def practices_decisions(ctx, practice_id, outcome, subsidiary_id, search, page, limit):
    """Approval / rejection history."""
    run(ctx, Request("GET", "/practice-decisions", params=clean({
        "practiceId": practice_id, "outcome": outcome, "subsidiaryId": subsidiary_id, "search": search,
        "page": page, "limit": limit})),
        ["id", "practiceId", "practiceName", "countryCode", "outcome", "actorName", "decisionAt", "reason"])


# ---- automatic approval (BA-324) -------------------------------------------
CHECK_COLS = ["id", "countryCode", "verdict", "failed", "duplicate", "createdAt"]


def _all_practices(c: Client) -> list[dict[str, Any]]:
    req = Request("GET", "/practices", params={"limit": 100})
    data = unwrap(fetch_all(c, req, c.call(req)))
    rows = data.get("items") or data.get("rows") if isinstance(data, dict) else data
    return [r for r in (rows or []) if isinstance(r, dict)]


def _manual_countries(manual: tuple[str, ...]) -> list[str]:
    if manual:
        return [m for item in manual for m in item.split(",")]
    env = os.environ.get("BOB_ADMIN_MANUAL_COUNTRIES")
    return env.split(",") if env is not None else list(approval.DEFAULT_MANUAL_COUNTRIES)


def _check_pending(c: Client, practice_ids: tuple[str, ...], manual: tuple[str, ...], countries: tuple[str, ...],
                   mx: bool) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    everything = _all_practices(c)
    wanted = {str(i) for i in practice_ids}
    only = {x.strip().lower() for item in countries for x in item.split(",") if x.strip()}
    pending = [p for p in everything if p.get("status") == "pending"
               and (not wanted or str(p.get("id")) in wanted)
               and (not only or approval.country(p) in only)]
    lookup = approval.dns_mx_lookup() if mx else None
    results = [approval.check_practice(p, everything, _manual_countries(manual), lookup) for p in pending]
    return results, everything


def check_options(f):
    f = click.option("--no-mx", is_flag=True, help="Skip the mail-server lookup for the contact email's domain.")(f)
    f = click.option("--country", "countries", multiple=True, metavar="CC",
                     help="Only these countries (repeat or comma-separate), e.g. --country AE.")(f)
    f = click.option("--manual-country", "manual", multiple=True, metavar="CC",
                     help="Countries a person always approves (default: US, or BOB_ADMIN_MANUAL_COUNTRIES).")(f)
    return f


@practices.command("check")
@click.argument("practice_ids", nargs=-1)
@check_options
@click.pass_context
def practices_check(ctx, practice_ids, manual, countries, no_mx):
    """Run the automatic-approval checks on pending registrations. Read-only.

    Each one gets verdict 'approve' (every check passed) or 'exception' (a person
    decides; 'failed' says why). Duplicates are matched against every practice
    on the platform. Output has IDs, countries and reasons, no names or emails.
    """
    results, _ = _check_pending(client(ctx), practice_ids, manual, countries, not no_mx)
    summary = {"pending": len(results), "approve": sum(r["verdict"] == "approve" for r in results),
               "exception": sum(r["verdict"] == "exception" for r in results), "items": results}
    if ctx.obj.get("json") or ctx.obj.get("fields") or ctx.obj.get("ids"):
        emit(ctx, summary)
    else:
        rows = [{**r, "failed": ",".join(r["failed"]) or "-"} for r in results]
        click.echo(f"{summary['pending']} pending: {summary['approve']} would be approved, "
                   f"{summary['exception']} go to a person.")
        if rows:
            emit(ctx, rows, CHECK_COLS)
        for r in results:
            for chk in r["checks"]:
                if not chk["ok"]:
                    click.echo(f"  {r['id']}: {chk['check']}: {chk['detail']}")


@practices.command("auto-approve")
@check_options
@click.option("--max", "max_approvals", type=int, default=10, show_default=True,
              help="Approve at most this many in one run; the rest wait for the next.")
@click.option("--training-in-days", type=int, default=14, show_default=True,
              help="Placeholder training date, days from today (the API still requires one).")
@click.pass_context
def practices_auto_approve(ctx, manual, countries, no_mx, max_approvals, training_in_days):
    """Approve every pending registration that passes all checks (BA-324).

    The rest stay pending for a person, with the failed checks listed. Each
    approval records a note saying it was automatic and which checks passed.
    Use --dry-run first. On prod this needs BOB_ADMIN_PROD_WRITES=1, or the
    narrower BOB_ADMIN_AUTO_APPROVE=1 that unlocks only this command.
    """
    c = client(ctx)
    dry = bool(ctx.obj.get("dry_run"))
    if not dry:
        c.write_scope = "auto-approve"
        c.check_write_allowed(Request("POST", "/practices/0/decisions/approve"))
        if not ctx.obj.get("yes"):
            raise BobAdminError("This approves practices. Re-run with --yes (or --dry-run to preview).")
    results, _ = _check_pending(c, (), manual, countries, not no_mx)
    passing = [r for r in results if r["verdict"] == "approve"]
    approved, skipped, decided, errors, planned = [], [], [], [], []
    for r in passing:
        if len(approved) + len(planned) >= max_approvals:
            skipped.append(r["id"])
            continue
        body = {"isIdbOffice": False, "hasIdbKit": False,
                "appTrainingDate": approval.training_date(training_in_days), "note": approval.approval_note(r)}
        req = Request("POST", f"/practices/{r['id']}/decisions/approve", body=body)
        if dry:
            planned.append({"id": r["id"], **req.describe(c.base)})
            continue
        try:
            fresh = unwrap(c.call(Request("GET", f"/practices/{r['id']}")))
            if isinstance(fresh, dict) and fresh.get("status") not in (None, "pending"):
                decided.append(r["id"])
                continue
            c.call(req)
            approved.append(r["id"])
        except BobAdminError as e:
            errors.append({"id": r["id"], "error": str(e)})
    out = {
        "env": c.env, "dryRun": dry, "pending": len(results),
        "approved": approved, "wouldApprove": planned,
        "exceptions": [{"id": r["id"], "countryCode": r["countryCode"], "failed": r["failed"],
                        "duplicate": r["duplicate"], "duplicates": r["duplicates"],
                        "details": [f"{x['check']}: {x['detail']}" for x in r["checks"] if not x["ok"]]}
                       for r in results if r["verdict"] == "exception"],
        "waitingForNextRun": skipped, "alreadyDecided": decided, "errors": errors,
    }
    emit(ctx, out)
    if errors:
        ctx.exit(1)


@practices.command("duplicates")
@click.option("--since", help="Only groups with a practice created on or after this date (YYYY-MM-DD). Default: 30 days ago.")
@click.option("--days", type=int, default=30, show_default=True, help="Same as --since, counted back from today.")
@click.option("--include-possible", is_flag=True, help="Also list weaker matches (a common name, a shared phone).")
@click.pass_context
def practices_duplicates(ctx, since, days, include_possible):
    """Find people who signed up more than once (pending or already approved). Read-only.

    'strong' groups are the same person or practice (same contact name plus the
    same city, postcode, phone, similar email or practice name; or the same
    email for the same practice). Output has IDs and reasons only; the 'key' is
    stable, so a run can tell a group it already raised.
    """
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz
    start = (_dt.fromisoformat(since).replace(tzinfo=_tz.utc) if since
             else _dt.now(_tz.utc) - _td(days=days))
    groups = approval.duplicate_groups(_all_practices(client(ctx)), start, include_possible)
    out = {"since": start.date().isoformat(), "groups": len(groups), "items": groups}
    if ctx.obj.get("json") or ctx.obj.get("fields") or ctx.obj.get("ids"):
        emit(ctx, out)
    else:
        click.echo(f"{len(groups)} duplicate group(s) with a practice created since {out['since']}.")
        for g in groups:
            ids = ", ".join(f"{p['id']} ({p['status']})" for p in g["practices"])
            click.echo(f"  {g['match']:8} {ids}  [{'; '.join(g['reasons'])}]{'  internal' if g['internal'] else ''}")


@practices.command("create")
@click.option("--name", required=True)
@click.option("--country", "country_code", help="Country code, e.g. AE.")
@click.option("--subsidiary-id")
@click.option("--street")
@click.option("--zip", "zip_code")
@click.option("--city")
@click.option("--contact-name")
@click.option("--contact-email")
@click.option("--contact-phone")
@click.option("--default-language")
@click.option("--idb-office/--no-idb-office", default=None)
@click.option("--idb-kit/--no-idb-kit", default=None)
@click.option("--training-date")
@click.option("--admin-first-name", help="Initial Practice Admin (all three admin options together).")
@click.option("--admin-last-name")
@click.option("--admin-email")
@click.option("--admin-user-id", type=int, help="Use an existing user as the initial admin.")
@write_opts
@click.pass_context
def practices_create(ctx, name, country_code, subsidiary_id, street, zip_code, city, contact_name, contact_email,
                     contact_phone, default_language, idb_office, idb_kit, training_date, admin_first_name,
                     admin_last_name, admin_email, admin_user_id, data, sets):
    """Create a practice and its first Practice Admin in one step."""
    admin = clean({"firstName": admin_first_name, "lastName": admin_last_name, "email": admin_email})
    if admin and len(admin) != 3:
        raise click.BadParameter("Give --admin-first-name, --admin-last-name and --admin-email together.")
    body = body_from({
        "name": name, "countryCode": country_code, "subsidiaryId": subsidiary_id, "street": street,
        "zipCode": zip_code, "city": city, "contactName": contact_name, "contactEmail": contact_email,
        "contactPhone": contact_phone, "defaultLanguage": default_language, "isIdbOffice": idb_office,
        "hasIdbKit": idb_kit, "appTrainingDate": training_date, "initialAdmin": admin or None,
        "initialAdminUserId": admin_user_id,
    }, data, sets)
    run(ctx, Request("POST", "/practices", body=body))


@practices.command("update")
@click.argument("practice_id")
@click.option("--name")
@click.option("--status", type=click.Choice(PRACTICE_STATUS))
@click.option("--subsidiary-id")
@click.option("--street")
@click.option("--zip", "zip_code")
@click.option("--city")
@click.option("--contact-name")
@click.option("--contact-email")
@click.option("--contact-phone")
@click.option("--default-language")
@write_opts
@click.pass_context
def practices_update(ctx, practice_id, name, status, subsidiary_id, street, zip_code, city, contact_name,
                     contact_email, contact_phone, default_language, data, sets):
    """Edit a practice (code and country cannot change)."""
    body = body_from({"name": name, "status": status, "subsidiaryId": subsidiary_id, "street": street,
                      "zipCode": zip_code, "city": city, "contactName": contact_name,
                      "contactEmail": contact_email, "contactPhone": contact_phone,
                      "defaultLanguage": default_language}, data, sets)
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/practices/{practice_id}", body=body))


@practices.command("delete")
@click.argument("practice_id")
@click.pass_context
def practices_delete(ctx, practice_id):
    """Soft-delete a practice."""
    run(ctx, Request("DELETE", f"/practices/{practice_id}"))


@practices.command("logo")
@click.argument("practice_id")
@click.argument("image", type=click.Path(exists=True, dir_okay=False))
@click.pass_context
def practices_logo(ctx, practice_id, image):
    """Upload a practice logo (png/jpg/webp)."""
    p = Path(image)
    run(ctx, Request("POST", f"/practices/{practice_id}/logo", files={"file": (p.name, p.read_bytes())}))


@practices.group("members")
def members() -> None:
    """Practice staff: Practice Admins and Coaches."""


@members.command("list")
@click.argument("practice_id")
@click.pass_context
def members_list(ctx, practice_id):
    """Staff of a practice."""
    run(ctx, Request("GET", f"/practices/{practice_id}/members"),
        ["id", "userId", "firstName", "lastName", "email", "memberType", "status"])


@members.command("add")
@click.argument("practice_id")
@click.option("--type", "member_type", required=True, type=click.Choice(["practice_admin", "coach"]))
@click.option("--user-id", type=int, help="Add an existing user.")
@click.option("--first-name", help="Or create a new user (with --last-name and --email).")
@click.option("--last-name")
@click.option("--email")
@click.option("--send-invite/--no-send-invite", default=None)
@click.option("--reactivate", is_flag=True, default=None, help="Reactivate the user if deactivated.")
@click.pass_context
def members_add(ctx, practice_id, member_type, user_id, first_name, last_name, email, send_invite, reactivate):
    """Add a Practice Admin or Coach."""
    new_user = clean({"firstName": first_name, "lastName": last_name, "email": email})
    if not user_id and len(new_user) != 3:
        raise click.BadParameter("Give --user-id, or all of --first-name, --last-name and --email.")
    body = clean({"memberType": member_type, "userId": user_id, "user": new_user or None,
                  "sendInvite": send_invite, "reactivate": reactivate})
    run(ctx, Request("POST", f"/practices/{practice_id}/members", body=body))


@members.command("update")
@click.argument("practice_id")
@click.argument("user_id")
@click.option("--type", "member_type", type=click.Choice(["practice_admin", "coach"]), help="Switch Practice Admin ↔ Coach.")
@click.option("--first-name")
@click.option("--last-name")
@click.option("--email")
@click.pass_context
def members_update(ctx, practice_id, user_id, member_type, first_name, last_name, email):
    """Edit a staff member, or switch their permission level."""
    body = clean({"memberType": member_type, "firstName": first_name, "lastName": last_name, "email": email})
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/practices/{practice_id}/members/{user_id}", body=body))


@members.command("remove")
@click.argument("practice_id")
@click.argument("user_id")
@click.pass_context
def members_remove(ctx, practice_id, user_id):
    """Remove a staff member from a practice."""
    run(ctx, Request("DELETE", f"/practices/{practice_id}/members/{user_id}"))


@members.command("move")
@click.argument("practice_id")
@click.argument("user_id")
@click.option("--to", "target", required=True, type=int, help="Target practice ID.")
@click.option("--type", "member_type", type=click.Choice(["practice_admin", "coach"]))
@click.pass_context
def members_move(ctx, practice_id, user_id, target, member_type):
    """Move a staff member to another practice."""
    run(ctx, Request("POST", f"/practices/{practice_id}/members/{user_id}/move",
                     body=clean({"targetPracticeId": target, "memberType": member_type})))


# --------------------------------------------------------------------------
# subsidiaries
# --------------------------------------------------------------------------
@cli.group()
def subsidiaries() -> None:
    """Subsidiaries / market partners."""


@subsidiaries.command("list")
@click.option("--search", "-q")
@page_opts
@click.pass_context
def subsidiaries_list(ctx, search, page, limit):
    """List subsidiaries."""
    run(ctx, Request("GET", "/subsidiaries", params=clean({"search": search, "page": page, "limit": limit})),
        ["id", "name", "countryCode", "contactName", "contactEmail", "practiceCount", "userCount"])


@subsidiaries.command("get")
@click.argument("subsidiary_id")
@click.pass_context
def subsidiaries_get(ctx, subsidiary_id):
    """One subsidiary's details."""
    run(ctx, Request("GET", f"/subsidiaries/{subsidiary_id}"))


@subsidiaries.command("create")
@click.option("--name", required=True)
@click.option("--country", required=True, help="Country code, e.g. AE.")
@click.option("--contact-name", required=True)
@click.option("--contact-email", required=True)
@click.pass_context
def subsidiaries_create(ctx, name, country, contact_name, contact_email):
    """Create a subsidiary."""
    run(ctx, Request("POST", "/subsidiaries", body={"name": name, "countryCode": country,
                                                     "contactName": contact_name, "contactEmail": contact_email}))


@subsidiaries.command("update")
@click.argument("subsidiary_id")
@click.option("--name")
@click.option("--country")
@click.option("--contact-name")
@click.option("--contact-email")
@click.pass_context
def subsidiaries_update(ctx, subsidiary_id, name, country, contact_name, contact_email):
    """Edit a subsidiary."""
    body = clean({"name": name, "countryCode": country, "contactName": contact_name, "contactEmail": contact_email})
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/subsidiaries/{subsidiary_id}", body=body))


@subsidiaries.command("delete")
@click.argument("subsidiary_id")
@click.pass_context
def subsidiaries_delete(ctx, subsidiary_id):
    """Soft-delete a subsidiary (blocked while it still has practices)."""
    run(ctx, Request("DELETE", f"/subsidiaries/{subsidiary_id}"))


@subsidiaries.command("assign")
@click.argument("subsidiary_id")
@click.option("--practice", "practice_id", help="Practice ID to assign.")
@click.option("--admin", "admin_id", help="Subsidiary admin user ID to assign.")
@click.option("--expected-current", required=True,
              help="The subsidiary it is in now (safety check); use the current ID or 'none'.")
@click.pass_context
def subsidiaries_assign(ctx, subsidiary_id, practice_id, admin_id, expected_current):
    """Assign or transfer a practice or partner admin to this subsidiary."""
    if bool(practice_id) == bool(admin_id):
        raise click.UsageError("Give exactly one of --practice or --admin.")
    body = {"entityType": "practice" if practice_id else "admin", "entityId": str(practice_id or admin_id),
            "expectedSubsidiaryId": expected_current}
    run(ctx, Request("POST", f"/subsidiaries/{subsidiary_id}/assignments", body=body))


# --------------------------------------------------------------------------
# products
# --------------------------------------------------------------------------
@cli.group()
def products() -> None:
    """Product catalogue, product tabs and BOB value → product links."""


@products.command("list")
@click.option("--tab-id")
@click.option("--search", "-q")
@click.pass_context
def products_list(ctx, tab_id, search):
    """All products, including hidden ones."""
    run(ctx, Request("GET", "/products/admin", params=clean({"tabId": tab_id, "q": search})),
        ["id", "name", "tabId", "isActive", "packageQuantity", "packageUnit", "sortOrder", "defaultUrl"])


def product_fields(f):
    f = write_opts(f)
    f = click.option("--country-url", "country_urls", multiple=True, metavar="CC=URL", help="Per-country shop link.")(f)
    f = click.option("--active/--hidden", "is_active", default=None)(f)
    f = click.option("--image-asset-id", type=int, help="From 'assets upload'.")(f)
    f = click.option("--url", "default_url", help="Default shop link.")(f)
    f = click.option("--package-unit", help="JSON or text, e.g. '{\"en\":\"pcs\"}'.")(f)
    f = click.option("--package-quantity", help="JSON or number.")(f)
    return f


def _product_body(name, tab_id, package_quantity, package_unit, default_url, image_asset_id, is_active,
                  country_urls, data, sets, sort_order=None):
    return body_from({
        "name": name, "tabId": tab_id,
        "packageQuantity": parse_value(package_quantity) if package_quantity else None,
        "packageUnit": parse_value(package_unit) if package_unit else None,
        "defaultUrl": default_url, "imageAssetId": image_asset_id, "isActive": is_active,
        "countryUrls": {k: v for k, v in parse_pairs(country_urls, "--country-url").items()} or None,
        "sortOrder": sort_order,
    }, data, sets)


@products.command("create")
@click.option("--name", required=True)
@click.option("--tab-id", required=True)
@product_fields
@click.pass_context
def products_create(ctx, name, tab_id, package_quantity, package_unit, default_url, image_asset_id, is_active,
                    country_urls, data, sets):
    """Add a product to a tab."""
    run(ctx, Request("POST", "/products", body=_product_body(name, tab_id, package_quantity, package_unit,
                                                             default_url, image_asset_id, is_active,
                                                             country_urls, data, sets)))


@products.command("update")
@click.argument("product_uuid")
@click.option("--name")
@click.option("--tab-id")
@click.option("--sort-order", type=int)
@product_fields
@click.pass_context
def products_update(ctx, product_uuid, name, tab_id, sort_order, package_quantity, package_unit, default_url,
                    image_asset_id, is_active, country_urls, data, sets):
    """Edit a product."""
    body = _product_body(name, tab_id, package_quantity, package_unit, default_url, image_asset_id, is_active,
                         country_urls, data, sets, sort_order)
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/products/{product_uuid}", body=body))


@products.command("delete")
@click.argument("product_uuid")
@click.pass_context
def products_delete(ctx, product_uuid):
    """Delete a product."""
    run(ctx, Request("DELETE", f"/products/{product_uuid}"))


@products.group("tabs")
def tabs() -> None:
    """Product tabs (the groups in the app's product screen)."""


@tabs.command("list")
@click.pass_context
def tabs_list(ctx):
    """List product tabs."""
    run(ctx, Request("GET", "/product-tabs"), ["id", "name", "sortOrder", "productCount"])


@tabs.command("create")
@click.option("--name", required=True)
@click.pass_context
def tabs_create(ctx, name):
    """Create a product tab."""
    run(ctx, Request("POST", "/product-tabs", body={"name": name}))


@tabs.command("rename")
@click.argument("tab_uuid")
@click.option("--name", required=True)
@click.pass_context
def tabs_rename(ctx, tab_uuid, name):
    """Rename a product tab."""
    run(ctx, Request("PUT", f"/product-tabs/{tab_uuid}", body={"name": name}))


@tabs.command("delete")
@click.argument("tab_uuid")
@click.pass_context
def tabs_delete(ctx, tab_uuid):
    """Delete a product tab."""
    run(ctx, Request("DELETE", f"/product-tabs/{tab_uuid}"))


@tabs.command("reorder")
@click.argument("tab_uuids", nargs=-1, required=True)
@click.option("--key", default="tabIds", show_default=True, help="Body field name, if the API expects another.")
@click.pass_context
def tabs_reorder(ctx, tab_uuids, key):
    """Set the tab order (all tab UUIDs, in order)."""
    run(ctx, Request("PUT", "/product-tabs/tab-order", body={key: list(tab_uuids)}))


@tabs.command("order-products")
@click.argument("tab_uuid")
@click.argument("product_uuids", nargs=-1, required=True)
@click.option("--key", default="productIds", show_default=True, help="Body field name, if the API expects another.")
@click.pass_context
def tabs_order_products(ctx, tab_uuid, product_uuids, key):
    """Set the product order inside a tab."""
    run(ctx, Request("PUT", f"/product-tabs/{tab_uuid}/product-order", body={key: list(product_uuids)}))


@products.command("bob-values")
@click.option("--set-from", metavar="@FILE|JSON",
              help='Set links: {"items":[{"valueKey":"cps-07","productId":"<uuid>","refillProductId":null}]}. '
                   "Unlisted values stay as they are (Super Admin only).")
@click.pass_context
def products_bob_values(ctx, set_from):
    """Show (or replace) which product each BOB value recommends."""
    if set_from:
        run(ctx, Request("PUT", "/bob-value-products", body=load_data(set_from)))
    else:
        run(ctx, Request("GET", "/bob-value-products"))


# --------------------------------------------------------------------------
# news
# --------------------------------------------------------------------------
@cli.group()
def news() -> None:
    """News and in-app announcements."""


@news.command("list")
@click.option("--search", "-q")
@click.option("--country")
@click.option("--language")
@click.option("--kind", type=click.Choice(["news", "announcement"]))
@click.option("--status", type=click.Choice(["active", "inactive"]))
@click.option("--display-order", type=click.Choice(["pinned", "high", "normal"]))
@page_opts
@click.pass_context
def news_list(ctx, search, country, language, kind, status, display_order, page, limit):
    """List news (admin view)."""
    params = clean({"search": search, "country": country, "language": language, "kind": kind, "status": status,
                    "displayOrder": display_order, "page": page, "limit": limit})
    run(ctx, Request("GET", "/news/admin", params=params),
        ["id", "title", "kind", "active", "pinned", "priority", "countryCodes", "dateStart"])


@news.command("get")
@click.argument("news_uuid")
@click.pass_context
def news_get(ctx, news_uuid):
    """One news item."""
    run(ctx, Request("GET", f"/news/admin/{news_uuid}"))


def news_fields(f):
    f = write_opts(f)
    f = click.option("--priority", type=int)(f)
    f = click.option("--pinned/--not-pinned", default=None)(f)
    f = click.option("--external-url")(f)
    f = click.option("--video-url", help="YouTube or Vimeo link (sets media type to video).")(f)
    f = click.option("--image-asset-id", type=int, help="From 'assets upload' (sets media type to image).")(f)
    f = click.option("--end", "publish_end", help="Publish until (ISO date/time).")(f)
    f = click.option("--start", "publish_start", help="Publish from (ISO date/time).")(f)
    f = click.option("--active/--inactive", default=None)(f)
    f = click.option("--country", "countries", multiple=True, help="Target country code; repeat for several.")(f)
    f = click.option("--language", help="Language of the text, e.g. en.")(f)
    f = click.option("--kind", type=click.Choice(["news", "announcement"]))(f)
    f = click.option("--content", help="Body text, or @file to read it from a file.")(f)
    f = click.option("--summary", "short_description", help="Short description.")(f)
    return f


def _news_body(title, short_description, content, kind, language, countries, active, publish_start, publish_end,
               image_asset_id, video_url, external_url, pinned, priority, data, sets):
    if content and content.startswith("@"):
        content = Path(content[1:]).read_text(encoding="utf8")
    media = "video" if video_url else "image" if image_asset_id else None
    return body_from({
        "title": title, "shortDescription": short_description, "content": content, "kind": kind,
        "language": language, "countryCodes": list(countries) or None, "active": active,
        "publishStartAt": publish_start, "publishEndAt": publish_end, "imageAssetId": image_asset_id,
        "videoUrl": video_url, "mediaType": media, "externalUrl": external_url, "pinned": pinned,
        "priority": priority,
    }, data, sets)


@news.command("create")
@click.option("--title", required=True)
@news_fields
@click.pass_context
def news_create(ctx, title, short_description, content, kind, language, countries, active, publish_start,
                publish_end, image_asset_id, video_url, external_url, pinned, priority, data, sets):
    """Create a news item or announcement. Inactive unless you pass --active."""
    body = _news_body(title, short_description, content, kind, language, countries, active, publish_start,
                      publish_end, image_asset_id, video_url, external_url, pinned, priority, data, sets)
    body.setdefault("active", False)
    run(ctx, Request("POST", "/news", body=body))


@news.command("update")
@click.argument("news_uuid")
@click.option("--title")
@news_fields
@click.pass_context
def news_update(ctx, news_uuid, title, short_description, content, kind, language, countries, active, publish_start,
                publish_end, image_asset_id, video_url, external_url, pinned, priority, data, sets):
    """Edit a news item (e.g. --active to publish it)."""
    body = _news_body(title, short_description, content, kind, language, countries, active, publish_start,
                      publish_end, image_asset_id, video_url, external_url, pinned, priority, data, sets)
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/news/{news_uuid}", body=body))


@news.command("delete")
@click.argument("news_uuid")
@click.pass_context
def news_delete(ctx, news_uuid):
    """Delete (soft) a news item."""
    run(ctx, Request("DELETE", f"/news/{news_uuid}"))


@news.command("video-preview")
@click.argument("url")
@click.pass_context
def news_video_preview(ctx, url):
    """Check a YouTube / Vimeo link before using it."""
    run(ctx, Request("GET", "/news/admin/video-preview", params={"url": url}))


# --------------------------------------------------------------------------
# assets
# --------------------------------------------------------------------------
@cli.group()
def assets() -> None:
    """Images for news and products."""


@assets.command("upload")
@click.argument("image", type=click.Path(exists=True, dir_okay=False))
@click.pass_context
def assets_upload(ctx, image):
    """Upload an image (png/jpg/webp, max 5 MB); prints its asset ID."""
    p = Path(image)
    run(ctx, Request("POST", "/assets", files={"file": (p.name, p.read_bytes())}))


# --------------------------------------------------------------------------
# integrations (partner API tokens)
# --------------------------------------------------------------------------
@cli.group()
def integrations() -> None:
    """Partner API tokens (e.g. the external practice-registration form)."""


@integrations.command("list")
@click.pass_context
def integrations_list(ctx):
    """List API tokens (active and revoked)."""
    run(ctx, Request("GET", "/tokens"), ["id", "name", "domain", "devMode", "revokedAt", "createdAt"])


@integrations.command("create")
@click.option("--name", required=True)
@click.option("--source-ip", "domain", required=True, help="The partner system's IPv4/IPv6 address.")
@click.option("--dev-mode", is_flag=True, default=None, help="Skip the source-IP check (testing only).")
@click.pass_context
def integrations_create(ctx, name, domain, dev_mode):
    """Issue a token. The secret is shown ONCE in the output; store it safely."""
    run(ctx, Request("POST", "/tokens", body=clean({"name": name, "domain": domain, "devMode": dev_mode})))


@integrations.command("update")
@click.argument("token_id")
@click.option("--name")
@click.option("--source-ip", "domain")
@click.option("--dev-mode/--no-dev-mode", default=None)
@click.pass_context
def integrations_update(ctx, token_id, name, domain, dev_mode):
    """Edit a token's name, source IP or dev mode."""
    body = clean({"name": name, "domain": domain, "devMode": dev_mode})
    if not body:
        raise click.UsageError("Nothing to change. Pass at least one option.")
    run(ctx, Request("PUT", f"/tokens/{token_id}", body=body))


@integrations.command("revoke")
@click.argument("token_id")
@click.pass_context
def integrations_revoke(ctx, token_id):
    """Revoke a token. The partner loses access immediately."""
    run(ctx, Request("POST", f"/tokens/{token_id}/revoke"))


# --------------------------------------------------------------------------
# reports
# --------------------------------------------------------------------------
@cli.group()
def reports() -> None:
    """Dashboards, usage and BOB-score reports, Excel exports."""


def metric_opts(f):
    f = click.option("--param", "-p", "params", multiple=True, metavar="KEY=VALUE", help="Any other filter.")(f)
    f = click.option("--mode", type=click.Choice(["idspace", "idb"]))(f)
    f = click.option("--family", type=click.Choice(["all", "prime", "perio", "non-idb"]))(f)
    f = click.option("--type", "score_type", type=click.Choice(["p1", "bleeding", "bpe"]))(f)
    f = click.option("--practice-id", type=int)(f)
    f = click.option("--subsidiary-id")(f)
    f = click.option("--to", "to_", help="End date YYYY-MM-DD.")(f)
    f = click.option("--from", "from_", help="Start date YYYY-MM-DD.")(f)
    return f


def _metric_params(from_, to_, subsidiary_id, practice_id, score_type, family, mode, params):
    p = clean({"from": from_, "to": to_, "subsidiaryId": subsidiary_id, "practiceId": practice_id,
               "type": score_type, "family": family, "mode": mode})
    p.update(parse_pairs(params, "--param"))
    return p


@reports.command("home")
@click.pass_context
def reports_home(ctx):
    """Admin home: pending count and oldest waiting registrations."""
    run(ctx, Request("GET", "/dashboard/home"), ["id", "name", "city", "countryCode", "subsidiaryName", "submittedAt"],
        rows_key="pending.items")


@reports.command("dashboard")
@click.pass_context
def reports_dashboard(ctx):
    """Role-based dashboard widgets."""
    run(ctx, Request("GET", "/dashboard"), ["key", "title", "type"], rows_key="widgets")


@reports.command("practice-usage")
@click.option("--search", "-q")
@click.option("--subsidiary-id")
@click.option("--usage-state", type=click.Choice(["active", "dormant", "no_activity_in_period", "no_recorded_usage", "unknown"]))
@click.option("--practice-status", type=click.Choice(["active", "inactive", "all"]))
@click.option("--activation", type=click.Choice(["activated", "pending"]))
@click.option("--sort-by", type=click.Choice(["name", "sessions30d", "sessionsInPeriod", "firstRecordedSessionAt", "lastRecordedSessionAt"]))
@click.option("--desc", is_flag=True)
@click.option("--page", type=int)
@click.option("--page-size", type=click.Choice(["25", "50", "100"]))
@click.option("--export", "out", metavar="FILE.xlsx", help="Save the Excel export instead.")
@click.pass_context
def reports_practice_usage(ctx, search, subsidiary_id, usage_state, practice_status, activation, sort_by, desc,
                           page, page_size, out):
    """Which practices use BOB, and how much (sessions in the last 30 days)."""
    params = clean({"search": search, "subsidiaryId": subsidiary_id, "usageState": usage_state,
                    "practiceStatus": practice_status, "activation": activation, "sortBy": sort_by,
                    "sortDirection": "desc" if desc else None, "page": page, "pageSize": page_size})
    path = "/metrics/practice-usage/export" if out else "/metrics/practice-usage"
    run(ctx, Request("GET", path, params=params), out=out, columns=[
        "practiceId", "name", "code", "country", "subsidiaryName", "usageState", "sessions30d",
        "lastRecordedSessionAt", "daysSinceLastSession"])


@reports.command("bobscore")
@metric_opts
@click.option("--export", "out", metavar="FILE.xlsx", help="Save the Excel export instead.")
@click.pass_context
def reports_bobscore(ctx, from_, to_, subsidiary_id, practice_id, score_type, family, mode, params, out):
    """BOB-score counts per practice per month."""
    p = _metric_params(from_, to_, subsidiary_id, practice_id, score_type, family, mode, params)
    run(ctx, Request("GET", "/metrics/export" if out else "/metrics/bobscore", params=p), out=out,
        columns=["entityId", "entityName", "month", "value", "country"], rows_key="grid")


@reports.command("brush-usage")
@metric_opts
@click.option("--export", "out", metavar="FILE.xlsx", help="Save the Excel export instead.")
@click.pass_context
def reports_brush_usage(ctx, from_, to_, subsidiary_id, practice_id, score_type, family, mode, params, out):
    """Brush usage by family (prime / perio / non-IDB)."""
    p = _metric_params(from_, to_, subsidiary_id, practice_id, score_type, family, mode, params)
    run(ctx, Request("GET", "/metrics/brush-usage/export" if out else "/metrics/brush-usage", params=p), out=out)


@reports.command("analytics")
@click.option("--param", "-p", "params", multiple=True, metavar="KEY=VALUE")
@click.option("--export", "out", metavar="FILE.xlsx", help="Save the Excel export instead.")
@click.pass_context
def reports_analytics(ctx, params, out):
    """Analytics overview (the admin's Analytics tab)."""
    p = parse_pairs(params, "--param")
    run(ctx, Request("GET", "/metrics/analytics/export" if out else "/metrics/analytics", params=p), out=out,
        columns=["country", "eligible", "activated", "activationRate", "activeInQuarter", "sessions",
                 "sessionsPerActivePractice"], rows_key="markets")


@reports.command("legacy-switch")
@click.pass_context
def reports_legacy_switch(ctx):
    """Old app → BOB switch: closing soon, mixed use, closed."""
    run(ctx, Request("GET", "/legacy-switch/report"))


@reports.command("emails")
@click.pass_context
def reports_emails(ctx):
    """Email delivery audit (pending / sent / failed)."""
    run(ctx, Request("GET", "/email-deliveries"), ["id", "type", "status", "to", "subject", "attempts", "error", "createdAt"])


# --------------------------------------------------------------------------
# help tickets, templates
# --------------------------------------------------------------------------
@cli.group()
def tickets() -> None:
    """In-app help tickets."""


@tickets.command("list")
@click.option("--search", "-q")
@page_opts
@click.pass_context
def tickets_list(ctx, search, page, limit):
    """List help tickets."""
    run(ctx, Request("GET", "/help-tickets", params=clean({"search": search, "page": page, "limit": limit})),
        ["id", "uuid", "name", "clinicName", "country", "status", "createdAt"])


@tickets.command("get")
@click.argument("ticket_uuid")
@click.pass_context
def tickets_get(ctx, ticket_uuid):
    """One help ticket."""
    run(ctx, Request("GET", f"/help-tickets/{ticket_uuid}"))


@tickets.command("update")
@click.argument("ticket_uuid")
@click.option("--status", type=click.Choice(["open", "closed"]))
@click.option("--note")
@click.pass_context
def tickets_update(ctx, ticket_uuid, status, note):
    """Close / reopen a ticket, or add a note."""
    body = clean({"status": status, "note": note})
    if not body:
        raise click.UsageError("Nothing to change. Pass --status and/or --note.")
    run(ctx, Request("PATCH", f"/help-tickets/{ticket_uuid}", body=body))


@cli.group()
def templates() -> None:
    """System recommendation templates."""


@templates.command("list")
@click.pass_context
def templates_list(ctx):
    """All system templates with translations."""
    run(ctx, Request("GET", "/recommendation-templates/admin"), ["id", "sortOrder", "active", "translations", "updatedAt"])


@templates.command("create")
@click.option("--data", required=True, metavar="JSON|@FILE", help="Template body (see: bob-admin ops show POST /recommendation-templates).")
@click.pass_context
def templates_create(ctx, data):
    """Create a system template."""
    run(ctx, Request("POST", "/recommendation-templates", body=load_data(data)))


@templates.command("update")
@click.argument("template_uuid")
@click.option("--data", required=True, metavar="JSON|@FILE")
@click.pass_context
def templates_update(ctx, template_uuid, data):
    """Replace a system template."""
    run(ctx, Request("PUT", f"/recommendation-templates/{template_uuid}", body=load_data(data)))


@templates.command("delete")
@click.argument("template_uuid")
@click.pass_context
def templates_delete(ctx, template_uuid):
    """Delete (soft) a system template."""
    run(ctx, Request("DELETE", f"/recommendation-templates/{template_uuid}"))


# --------------------------------------------------------------------------
# reference, spec, raw API
# --------------------------------------------------------------------------
@cli.command("countries")
@click.option("--with-practices", is_flag=True)
@click.pass_context
def countries(ctx, with_practices):
    """Country reference list."""
    run(ctx, Request("GET", "/countries", params=clean({"hasPractices": "true" if with_practices else None})))


@cli.command("languages")
@click.pass_context
def languages(ctx):
    """Published languages."""
    run(ctx, Request("GET", "/languages"))


@cli.command("health")
@click.pass_context
def health(ctx):
    """Is the API up? (no sign-in needed)"""
    c = client(ctx)
    base = c.base[: -len("/api/v1")] if c.base.endswith("/api/v1") else c.base
    import requests as _rq
    try:
        r = _rq.get(base + "/api/health", timeout=15)
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:200]
    except _rq.RequestException as e:
        raise BobAdminError(f"Could not reach {base}: {e}")
    emit(ctx, {"env": c.env, "url": base + "/api/health", "status": r.status_code, "body": body})


@cli.group()
def ops() -> None:
    """Browse every API endpoint in the bundled spec."""


@ops.command("list")
@click.option("--tag", help="e.g. Users, Practices, Metrics.")
@click.option("--search", "-q")
@click.pass_context
def ops_list(ctx, tag, search):
    """List endpoints (141 in total)."""
    emit(ctx, spec.operations(tag, search), ["tag", "method", "path", "summary"])


@ops.command("show")
@click.argument("method")
@click.argument("path")
@click.pass_context
def ops_show(ctx, method, path):
    """Parameters and body fields of one endpoint, e.g. ops show POST /users"""
    try:
        emit(ctx, spec.describe(method, path))
    except KeyError as e:
        raise BobAdminError(str(e.args[0]))


@cli.command("api")
@click.argument("method", type=click.Choice(["GET", "POST", "PUT", "PATCH", "DELETE"], case_sensitive=False))
@click.argument("path")
@click.option("--query", "-p", "query", multiple=True, metavar="KEY=VALUE")
@click.option("--data", metavar="JSON|@FILE")
@click.option("--set", "sets", multiple=True, metavar="KEY=VALUE")
@click.option("--out", metavar="FILE", help="Save the raw response (e.g. an export) to a file.")
@click.pass_context
def api(ctx, method, path, query, data, sets, out):
    """Call any endpoint directly, e.g. api GET /practices -p status=pending"""
    path = spec.normalise(path)
    body = body_from({}, data, sets) if (data or sets) else None
    run(ctx, Request(method.upper(), path, params=parse_pairs(query, "--query"), body=body), out=out)


cli.add_command(build_group(run, body_from))


# --------------------------------------------------------------------------
def main() -> None:
    # Windows consoles default to cp1252; names, arrows and other languages need UTF-8.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    try:
        cli(prog_name="bob-admin")
    except BobAdminError as e:
        if "--json" in sys.argv:
            click.echo(json.dumps({"error": str(e), "status": e.status, "details": e.payload}, ensure_ascii=False, default=str))
        else:
            click.echo(f"Error: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
