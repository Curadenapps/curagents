"""cli-anything-bobsupport (alias: bob-support): App Support requests against the Admin Console.

The inside of it is the Asana board "App Tasks, Requests & Feedback". For
each request assigned to the owner (the form task, or the "…: change in BOB
Admin" subtask App Support makes), it looks the requester up in the BOB
Admin Console and says what's true there and what to do: an Admin Console
change, or only a reply in Asana.

Two halves:
  - automated, hourly (`sweep`): read-only in the Admin Console; writes one
    internal note per request in Asana (a subtask comment or an
    "Admin Console check" subtask), only when what it found changed;
  - the owner (`do`): every Admin Console change, on the owner's own
    sign-in, behind bob-admin's guards (prod unlock, dry run, a yes). After
    the change it ticks the change subtask, so App Support sends the
    "All done" reply and closes the task.

Shares bob-admin's sign-in (session-<env>.json): `bob-admin --env prod auth login`.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import click

from cli_anything.bobadmin.core.client import ENVIRONMENTS, BobAdminError, Client, config_dir
from cli_anything.bobadmin.core.output import table
from cli_anything.bobsupport import __version__
from cli_anything.bobsupport.core import asana as asana_mod
from cli_anything.bobsupport.core import form, playbook, runlog
from cli_anything.bobsupport.core.asana import Asana, AsanaError
from cli_anything.bobsupport.core.plan import VERDICTS, Case, Plan, build

CLI_NAME = "bob-support"
# App Support's sign-off in the languages it replies in ("— Sent by …'s support assistant (automated)")
AUTOMATED_RE = re.compile(r"\((automated|automatisiert|automatizzato|automatisé|automatizado|automático|"
                          r"avtomatizirano|automatisch)\)", re.I)
CHECK_SUBTASK = "Admin Console check"
TASK_NAME = "bob-support sweep (Fabian)"


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def client(ctx: click.Context) -> Client:
    if "client" not in ctx.obj:
        ctx.obj["client"] = Client(env=ctx.obj["env"], cli_name="bob-admin")
    return ctx.obj["client"]


def asana(ctx: click.Context) -> Asana:
    if "asana" not in ctx.obj:
        ctx.obj["asana"] = Asana()
    return ctx.obj["asana"]


def out(ctx: click.Context, data: Any, human: str | None = None) -> None:
    if ctx.obj.get("json"):
        click.echo(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    elif human is not None:
        click.echo(human)


def task_gid(ref: str) -> str:
    """Accept a gid or any Asana task link."""
    ref = ref.strip().split("?")[0].rstrip("/")
    if ref.isdigit():
        return ref
    segments = ref.split("/")
    if "task" in segments and segments.index("task") + 1 < len(segments):
        return segments[segments.index("task") + 1]
    ids = [s for s in segments if s.isdigit() and len(s) > 10]
    if ids:
        return ids[-1]
    raise click.BadParameter(f"Not an Asana task id or link: {ref}")


def load_case(a: Asana, gid: str) -> Case:
    t = a.task(gid)
    if asana_mod.is_change_subtask(t):
        parent = a.task(t["parent"]["gid"])
        return _case(parent, change=t, comments=a.comments(parent["gid"]))
    change = next((s for s in a.subtasks(gid)
                   if not s.get("completed") and "change in bob admin" in (s.get("name") or "").lower()), None)
    return _case(t, change=change, comments=a.comments(gid))


def requester_comments(task: dict[str, Any], comments: list[dict[str, Any]] | None) -> list[str]:
    """What the requester wrote after the form, newest first.

    Skips App Support's automated replies and the team's own comments, unless the
    commenter is the person who sent the form (a team member testing, for example).
    """
    sender = form.from_task(task).get("name").strip().lower()
    out = []
    for c in comments or []:
        text = (c.get("text") or "").strip()
        who = c.get("created_by") or {}
        if not text or AUTOMATED_RE.search(text):
            continue
        if who.get("gid") in asana_mod.TEAM and (who.get("name") or "").strip().lower() != sender:
            continue
        out.append(text)
    return list(reversed(out))


def _case(task: dict[str, Any], change: dict[str, Any] | None = None,
          comments: list[dict[str, Any]] | None = None) -> Case:
    sub = form.from_task(task)
    section = next((m.get("section", {}).get("name", "") for m in task.get("memberships") or []
                    if (m.get("project") or {}).get("gid") in (None, asana_mod.BOARD)), "")
    return Case(task_gid=task["gid"], title=task.get("name") or sub.get("title"), submission=sub,
                section=section, change_gid=(change or {}).get("gid"), change_notes=(change or {}).get("notes") or "",
                comments=requester_comments(task, comments))


def case_from_json(path: str) -> Case:
    """A task as JSON (Asana API or the Asana connector's get_task), for runs without a token."""
    text = Path(path).read_text(encoding="utf-8-sig") if path != "-" else sys.stdin.read()
    try:
        raw = json.loads(text, strict=False)  # tolerate raw line breaks inside strings (pasted connector output)
    except ValueError as e:
        raise click.BadParameter(f"{path} isn't valid JSON: {e}")
    task = raw.get("data", raw)
    parent = task.get("parent") if isinstance(task.get("parent"), dict) else None
    if parent and parent.get("notes"):
        return _case({**parent, "gid": parent["gid"]}, change=task, comments=parent.get("comments"))
    change = next((s for s in task.get("subtasks") or []
                   if "change in bob admin" in (s.get("name") or "").lower() and not s.get("completed")), None)
    return _case(task, change=change, comments=task.get("comments"))


def overrides(**kw: Any) -> dict[str, Any]:
    return {k: v for k, v in kw.items() if v not in (None, "", ())}


def override_opts(f):
    for opt in reversed([
        click.option("--type", "rtype", type=click.Choice([t.key for t in playbook.TYPES]),
                     help="Override the detected request type."),
        click.option("--practice-id", help="The practice to act on (when the account has several)."),
        click.option("--user-id", help="The BOB account, when the form email isn't the account's email."),
        click.option("--lookup-email", help="Look up this email instead of the form's."),
        click.option("--name", help="New practice name (practice-rename)."),
        click.option("--street"), click.option("--zip"), click.option("--city"),
        click.option("--contact-name"), click.option("--contact-email"), click.option("--contact-phone"),
        click.option("--email", help="New account email (account-email)."),
    ]):
        f = opt(f)
    return f


def opts_to_overrides(kw: dict[str, Any]) -> dict[str, Any]:
    kw = dict(kw)
    kw["type"] = kw.pop("rtype", None)
    return overrides(**kw)


def show_plan(ctx: click.Context, plan: Plan) -> None:
    c = client(ctx)
    if ctx.obj.get("json"):
        out(ctx, plan.to_dict(c.base))
        return
    click.echo(f"{plan.case.title}  [{plan.case.section or 'no section'}]  {asana_mod.task_link(plan.case.task_gid)}")
    if plan.case.change_gid:
        click.echo(f"change subtask: {asana_mod.task_link(plan.case.change_gid)}")
    click.echo("")
    click.echo(plan.note(c.env))
    if plan.actions:
        click.echo("\nWhat `do` would send:")
        for a in plan.actions:
            click.echo(f"  - {a.label}\n    {a.cli}")


def resolve(ctx: click.Context, ref: str, from_json: str | None) -> Case:
    if from_json:
        return case_from_json(from_json)
    return load_case(asana(ctx), task_gid(ref))


# --------------------------------------------------------------------------
# root
# --------------------------------------------------------------------------
@click.group(invoke_without_command=True, context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--env", type=click.Choice(sorted(ENVIRONMENTS)),
              default=lambda: os.environ.get("BOB_SUPPORT_ENV", "prod"), show_default="prod",
              help="Which Admin Console to look in (support requests are about real practices: prod).")
@click.option("--json", "as_json", is_flag=True, help="Machine-readable JSON output.")
@click.option("--yes", "-y", is_flag=True, help="Send changes without asking.")
@click.option("--dry-run", is_flag=True, help="Show what would change, change nothing.")
@click.version_option(__version__, prog_name=CLI_NAME)
@click.pass_context
def cli(ctx: click.Context, env: str, as_json: bool, yes: bool, dry_run: bool) -> None:
    """App Support requests (Asana board) against the BOB Admin Console."""
    ctx.ensure_object(dict)
    ctx.obj.update(env=env, json=as_json, yes=yes, dry_run=dry_run)
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@cli.command("status")
@click.pass_context
def status(ctx: click.Context) -> None:
    """What's connected: Admin Console sign-in, Asana token, Notion key."""
    c, a = client(ctx), asana(ctx)
    info: dict[str, Any] = {"env": c.env, "adminConsole": None, "asana": None,
                            "notionKey": runlog.Notion().configured}
    u = c.session.user or {}
    info["adminConsole"] = (f"signed in as {u.get('email') or u.get('username') or 'someone'}"
                            if c.session.access_token else f"not signed in: bob-admin --env {c.env} auth login")
    if a.configured:
        try:
            info["asana"] = f"token works, signed in as {a.me().get('name')}"
        except AsanaError as e:
            info["asana"] = str(e)
    else:
        info["asana"] = f"no token: set {asana_mod.TOKEN_ENV} (see `bob-support setup`)"
    learned = playbook.load_learned()
    info["learned"] = {"phrases": sum(len(v) for v in learned["keywords"].values()), "tasks": len(learned["tasks"])}
    out(ctx, info, "\n".join(f"{k.ljust(12)} {v}" for k, v in info.items()))


@cli.command("setup")
def setup() -> None:
    """How to connect Asana (once)."""
    click.echo(f"""Connect bob-support to Asana (once, about 2 minutes):

1. In Asana: your profile picture → Settings → Apps → Developer apps → "Create new token".
   Name it "bob-support". Copy it (Asana shows it once).
2. Windows: Start → "Edit environment variables for your account" → New:
     Variable name:  {asana_mod.TOKEN_ENV}
     Variable value: the token
   Never paste it into a chat, a file or the repo.
3. Open a new terminal and run:  bob-support status

The Admin Console side uses your bob-admin sign-in:  bob-admin --env prod auth login
The hourly sweep:  bob-support schedule install""")


@cli.command("types")
@click.pass_context
def types(ctx: click.Context) -> None:
    """The request types, and what's automated vs what stays with you."""
    rows = [{"type": t.key, "label": t.label, "hourly (automated, read-only)": t.hourly,
             "you": t.owner} for t in playbook.TYPES]
    if ctx.obj.get("json"):
        out(ctx, rows)
        return
    for r in rows:
        click.echo(f"{r['type']}: {r['label']}\n  hourly: {r['hourly (automated, read-only)']}\n  you:    {r['you']}\n")


# --------------------------------------------------------------------------
# inbox / check / do
# --------------------------------------------------------------------------
def collect(ctx: click.Context, everyone: bool) -> list[Case]:
    a = asana(ctx)
    if everyone:
        items = a.search(**{"projects.any": asana_mod.BOARD, "completed": "false"})
        items += a.search(**{"completed": "false", "is_subtask": "true", "text": "change in BOB Admin"})
    else:
        items = a.my_open_items()
    cases: dict[str, Case] = {}
    for t in items:
        if asana_mod.is_change_subtask(t):
            parent_gid = t["parent"]["gid"]
            try:
                parent = a.task(parent_gid)
            except AsanaError:
                continue
            if not asana_mod.is_form_task(parent) or parent.get("completed"):
                continue
            cases[parent_gid] = _case(parent, change=a.task(t["gid"]), comments=a.comments(parent_gid))
        elif asana_mod.is_form_task(t) and t["gid"] not in cases:
            section = _case(t).section
            if section in ("Done", "Archived/Rejected"):
                continue
            cases[t["gid"]] = _case(t, comments=a.comments(t["gid"]))
    return list(cases.values())


@cli.command("inbox")
@click.option("--all", "everyone", is_flag=True, help="Every open form request on the board, not only yours.")
@click.pass_context
def inbox(ctx: click.Context, everyone: bool) -> None:
    """Your open requests: form tasks and change subtasks assigned to you."""
    learned = playbook.load_learned()
    rows = []
    for case in collect(ctx, everyone):
        rt, _ = playbook.classify("\n".join([case.title, case.submission.text]), case.task_gid, learned)
        rows.append({"task": case.task_gid, "type": rt.key, "change": "yes" if case.change_gid else "",
                     "section": case.section, "title": case.title, "country": case.submission.get("country")})
    if ctx.obj.get("json"):
        out(ctx, rows)
        return
    click.echo(table(rows, ["task", "type", "change", "section", "country", "title"]))
    click.echo(f"\n{len(rows)} open. Next: bob-support check TASK")


@cli.command("check")
@click.argument("task", required=False)
@click.option("--from-json", metavar="FILE|-", help="Read the task from a JSON file (no Asana token needed).")
@override_opts
@click.pass_context
def check(ctx: click.Context, task: str | None, from_json: str | None, **kw: Any) -> None:
    """Look a request up in the Admin Console and say what to do. Changes nothing."""
    if not task and not from_json:
        raise click.UsageError("Give a task id or link (or --from-json FILE).")
    case = resolve(ctx, task or "", from_json)
    plan = build(client(ctx), case, opts_to_overrides(kw))
    show_plan(ctx, plan)


@cli.command("do")
@click.argument("task", required=False)
@click.option("--from-json", metavar="FILE|-", help="Read the task from a JSON file (no Asana token needed).")
@click.option("--no-asana", is_flag=True, help="Don't tick the change subtask afterwards.")
@override_opts
@click.pass_context
def do(ctx: click.Context, task: str | None, from_json: str | None, no_asana: bool, **kw: Any) -> None:
    """Make the Admin Console change for a request (asks first), then tick its change subtask."""
    if not task and not from_json:
        raise click.UsageError("Give a task id or link (or --from-json FILE).")
    c = client(ctx)
    case = resolve(ctx, task or "", from_json)
    plan = build(c, case, opts_to_overrides(kw))
    if not ctx.obj.get("json"):
        show_plan(ctx, plan)
    if not plan.actions:
        raise BobAdminError(f"Nothing to change in the Admin Console ({VERDICTS[plan.verdict]}). "
                            + (plan.next_step or ""))
    described = [a.describe(c.base) for a in plan.actions]
    if ctx.obj.get("dry_run"):
        out(ctx, {"dryRun": True, "env": c.env, "actions": described}, "\n(dry run: nothing sent)")
        return
    c.check_write_allowed()
    if not ctx.obj.get("yes"):
        if ctx.obj.get("json") or not sys.stdin.isatty():
            raise BobAdminError("This changes data. Re-run with --yes (or --dry-run to preview).")
        label = "PRODUCTION" if c.env == "prod" else c.env
        click.confirm(f"\nSend {len(plan.actions)} change(s) to {label}?", abort=True)
    done = []
    for a in plan.actions:
        c.call(a.request)
        done.append(a.label)
        click.echo(f"done: {a.label}", err=bool(ctx.obj.get("json")))
    runlog.record({"task": case.task_gid, "type": plan.rtype.key, "verdict": plan.verdict,
                   "did": [f"{a.request.method} {a.request.path}" for a in plan.actions], "by": "do"})
    asana_note = None
    if not no_asana and not from_json:
        asana_note = tick_change(ctx, case, done)
    out(ctx, {"env": c.env, "done": done, "asana": asana_note,
              "replyHint": plan.reply_hint}, f"\nFor the reply: {plan.reply_hint}" if plan.reply_hint else None)


def tick_change(ctx: click.Context, case: Case, done: list[str]) -> str:
    """Tick (or create ticked) the change subtask: App Support then tells the requester and closes the task."""
    a = asana(ctx)
    if not a.configured:
        msg = "No Asana token: tick the change subtask yourself so App Support closes the loop."
        click.echo(msg, err=True)
        return msg
    note = "Done with bob-support: " + "; ".join(done)
    if case.change_gid:
        a.comment(case.change_gid, note)
        a.update_task(case.change_gid, completed=True)
        msg = f"ticked {asana_mod.task_link(case.change_gid)}"
    else:
        me = a.me()
        first = (me.get("name") or "Owner").split()[0]
        sub = a.add_subtask(case.task_gid, f"{first}: change in BOB Admin", note, assignee=me["gid"])
        a.update_task(sub["gid"], completed=True)
        msg = f"added and ticked {asana_mod.task_link(sub['gid'])}"
    click.echo(msg + " (App Support sends the \"All done\" reply on its next run)", err=bool(ctx.obj.get("json")))
    return msg


# --------------------------------------------------------------------------
# sweep: the hourly, automated half
# --------------------------------------------------------------------------
@cli.command("sweep")
@click.option("--all", "everyone", is_flag=True, help="Every open form request, not only yours.")
@click.option("--post/--no-post", default=False, help="Write the findings into Asana (internal notes only).")
@click.option("--scheduled", is_flag=True, help="Run as the scheduled task: check the switch, write the run log.")
@click.pass_context
def sweep(ctx: click.Context, everyone: bool, post: bool, scheduled: bool) -> None:
    """Check every open request in the Admin Console (read-only); note what changed in Asana."""
    notion = runlog.Notion()
    registry_id = None
    if scheduled and notion.configured:
        try:
            row = notion.registry_row()
        except Exception as e:  # noqa: BLE001 - any failure reading the switch stops the run
            runlog.log_local(f"failed: registry unreadable ({e})")
            _write_run(notion, "failed", "switch: registry unreadable", str(e), None)
            raise BobAdminError(f"Could not read the Agent registry: {e}")
        if row:
            registry_id = row.get("id")
            account = runlog.registry_account(row)
            if account and account != "Fabian":
                runlog.log_local(f"no-op: switch says {account}")
                _write_run(notion, "no-op", f"switch: assigned to {account}", "", registry_id)
                out(ctx, {"outcome": "no-op", "switch": account}, f"no-op: the registry row says {account}")
                return
    c, a = client(ctx), asana(ctx)
    state = runlog.load_state()
    results, errors = [], []
    learned = playbook.load_learned()
    try:
        cases = collect(ctx, everyone)
    except (AsanaError, BobAdminError) as e:
        runlog.log_local(f"failed: {e}")
        if scheduled:
            _write_run(notion, "failed", "sweep: could not read Asana", str(e), registry_id)
        raise
    for case in cases:
        try:
            plan = build(c, case, learned=learned)
        except BobAdminError as e:
            errors.append(f"{case.task_gid}: {e}")
            if e.status in (None, 401):  # signed out or unreachable: stop, every other task would fail too
                break
            continue
        fp = plan.fingerprint()
        key = case.change_gid or case.task_gid
        changed = state.get(key) != fp
        wrote = ""
        if changed and post:
            try:
                wrote = write_note(a, case, plan, c.env)
                state[key] = fp
                runlog.record({"task": case.task_gid, "type": plan.rtype.key, "verdict": plan.verdict, "by": "sweep"})
            except AsanaError as e:
                errors.append(f"{case.task_gid}: {e}")
        results.append({"task": case.task_gid, "type": plan.rtype.key, "verdict": plan.verdict,
                        "new": "yes" if changed else "", "written": wrote, "title": case.title})
    if post:
        runlog.save_state(state)
    written = sum(1 for r in results if r["written"])
    summary = f"sweep: {len(results)} checked, {written} noted in Asana, {len(errors)} errors"
    outcome = "failed" if errors and not results else ("partial" if errors else ("ok" if written else "no-op"))
    runlog.log_local(f"{outcome}: {summary}" + (f" | {' | '.join(errors)}" if errors else ""))
    if scheduled:
        _write_run(notion, outcome, summary + (" (" + ", ".join(r["task"] for r in results if r["written"]) + ")" if written else ""),
                   " | ".join(errors), registry_id)
    if ctx.obj.get("json"):
        out(ctx, {"outcome": outcome, "summary": summary, "results": results, "errors": errors})
    else:
        click.echo(table(results, ["task", "type", "verdict", "new", "written", "title"]) if results else "(nothing open)")
        click.echo(f"\n{summary}" + ("" if post else " (preview: add --post to write the notes)"))
        for e in errors:
            click.echo(f"error: {e}", err=True)
    if errors and not results:
        sys.exit(1)


def write_note(a: Asana, case: Case, plan: Plan, env: str) -> str:
    note = plan.note(env)
    if case.change_gid:
        a.comment(case.change_gid, f"{CHECK_SUBTASK}\n\n{note}")
        return "comment on change subtask"
    existing = next((s for s in a.subtasks(case.task_gid)
                     if (s.get("name") or "").startswith(CHECK_SUBTASK) and not s.get("completed")), None)
    if existing:
        a.update_task(existing["gid"], notes=note)
        return "updated check subtask"
    a.add_subtask(case.task_gid, f"{CHECK_SUBTASK}: {case.title}"[:200], note, assignee=a.me()["gid"])
    return "new check subtask"


def _write_run(notion: runlog.Notion, outcome: str, summary: str, error: str, registry_id: str | None) -> None:
    if not notion.configured:
        return
    try:
        notion.write_run(outcome, summary, error, registry_id, version=f"bob-support {__version__}")
    except Exception as e:  # noqa: BLE001 - the local log still has the run
        runlog.log_local(f"run log not written: {e}")


# --------------------------------------------------------------------------
# learn: getting better from the owner's corrections
# --------------------------------------------------------------------------
@cli.group("learn")
def learn() -> None:
    """Teach bob-support: correct a request's type, add a phrase, see what it learned."""


@learn.command("task")
@click.argument("task")
@click.argument("rtype", type=click.Choice([t.key for t in playbook.TYPES]))
@click.option("--phrase", help="Also learn this phrase for the type (e.g. the words that should have matched).")
@click.pass_context
def learn_task(ctx: click.Context, task: str, rtype: str, phrase: str | None) -> None:
    """This request is really RTYPE (and, optionally, PHRASE means RTYPE)."""
    data = playbook.load_learned()
    data["tasks"][task_gid(task)] = rtype
    if phrase:
        data["keywords"].setdefault(rtype, [])
        if phrase.lower() not in [p.lower() for p in data["keywords"][rtype]]:
            data["keywords"][rtype].append(phrase)
    playbook.save_learned(data)
    out(ctx, {"task": task_gid(task), "type": rtype, "phrase": phrase},
        f"learned: {task_gid(task)} is {rtype}" + (f'; "{phrase}" → {rtype}' if phrase else ""))


@learn.command("phrase")
@click.argument("rtype", type=click.Choice([t.key for t in playbook.TYPES]))
@click.argument("phrase")
@click.pass_context
def learn_phrase(ctx: click.Context, rtype: str, phrase: str) -> None:
    """Requests that say PHRASE are RTYPE from now on."""
    data = playbook.load_learned()
    data["keywords"].setdefault(rtype, [])
    if phrase.lower() not in [p.lower() for p in data["keywords"][rtype]]:
        data["keywords"][rtype].append(phrase)
    playbook.save_learned(data)
    out(ctx, {"type": rtype, "phrase": phrase}, f'learned: "{phrase}" → {rtype}')


@learn.command("list")
@click.pass_context
def learn_list(ctx: click.Context) -> None:
    """What you've taught, and how requests were handled."""
    data = playbook.load_learned()
    hist = runlog.history()
    by_type = Counter(h.get("type") for h in hist if h.get("by") == "do")
    stats = {"phrases": data["keywords"], "correctedTasks": len(data["tasks"]),
             "changesMadeByType": dict(by_type), "requestsSeen": len({h.get("task") for h in hist})}
    if ctx.obj.get("json"):
        out(ctx, stats)
        return
    click.echo(f"Requests seen: {stats['requestsSeen']}   types corrected by you: {stats['correctedTasks']}")
    click.echo("Changes made with `do`: " + (", ".join(f"{k} {v}" for k, v in by_type.items()) or "none yet"))
    for k, phrases in data["keywords"].items():
        click.echo(f"  {k}: " + ", ".join(f'"{p}"' for p in phrases))


@learn.command("export")
def learn_export() -> None:
    """Your phrases as a ready snippet for playbook.py, to share them with everyone by PR."""
    data = playbook.load_learned()
    if not any(data["keywords"].values()):
        click.echo("Nothing taught yet.")
        return
    click.echo("# Add to the keywords of each type in cli_anything/bobsupport/core/playbook.py:")
    for k, phrases in data["keywords"].items():
        click.echo(f"#   {k}: " + ", ".join(json.dumps(p, ensure_ascii=False) for p in phrases))


# --------------------------------------------------------------------------
# schedule: the hourly sweep on this PC (Windows Task Scheduler)
# --------------------------------------------------------------------------
@cli.group("schedule")
def schedule() -> None:
    """The hourly sweep on this PC: Mon-Thu, 07:30 to 19:30."""


def _wrapper() -> Path:
    bindir = config_dir() / "bin"
    exe = Path(sys.executable).with_name("bob-support.exe")
    cmd = f'"{exe}"' if exe.exists() else f'"{sys.executable}" -m cli_anything.bobsupport'
    w = bindir / "bob-support-sweep.cmd"
    bindir.mkdir(parents=True, exist_ok=True)
    w.write_text(f'@echo off\r\n{cmd} sweep --all --post --scheduled >> "{config_dir() / runlog.LOG_FILE}" 2>&1\r\n',
                 encoding="ascii")
    return w


@schedule.command("install")
@click.pass_context
def schedule_install(ctx: click.Context) -> None:
    """Register the Windows scheduled task (your user, no admin rights needed)."""
    if os.name != "nt":
        raise click.UsageError("The schedule command is for Windows. Elsewhere use cron: "
                               "30 7-19 * * 1-4 bob-support sweep --all --post --scheduled")
    w = _wrapper()
    args = ["schtasks", "/Create", "/F", "/TN", TASK_NAME, "/TR", f'"{w}"', "/SC", "WEEKLY",
            "/D", "MON,TUE,WED,THU", "/ST", "07:30", "/RI", "60", "/DU", "12:01"]
    if not ctx.obj.get("yes"):
        click.echo(f"Creates the scheduled task \"{TASK_NAME}\": hourly Mon-Thu 07:30-19:30, runs\n  {w}")
        click.confirm("Create it?", abort=True)
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise BobAdminError(f"schtasks failed: {r.stderr.strip() or r.stdout.strip()}")
    click.echo(f"Scheduled. Log: {config_dir() / runlog.LOG_FILE}")


@schedule.command("remove")
def schedule_remove() -> None:
    """Remove the scheduled task."""
    r = subprocess.run(["schtasks", "/Delete", "/F", "/TN", TASK_NAME], capture_output=True, text=True)
    click.echo("Removed." if r.returncode == 0 else (r.stderr.strip() or r.stdout.strip()))


@schedule.command("show")
def schedule_show() -> None:
    """The scheduled task and the last lines of its log."""
    r = subprocess.run(["schtasks", "/Query", "/TN", TASK_NAME, "/FO", "LIST"], capture_output=True, text=True)
    click.echo(r.stdout.strip() if r.returncode == 0 else "Not scheduled. Run: bob-support schedule install")
    log = config_dir() / runlog.LOG_FILE
    if log.exists():
        click.echo("\nLast runs:\n" + "\n".join(log.read_text(encoding="utf-8").splitlines()[-8:]))


def main() -> None:
    try:
        cli(obj={})
    except (BobAdminError, AsanaError) as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
