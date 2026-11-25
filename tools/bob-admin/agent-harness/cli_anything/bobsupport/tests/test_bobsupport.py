"""Unit tests for cli-anything-bobsupport. No network: BOB and Asana are faked in memory."""

from __future__ import annotations

import json
import re

import pytest
from click.testing import CliRunner

from cli_anything.bobadmin.core import client as client_mod
from cli_anything.bobadmin.core.client import Session
from cli_anything.bobsupport import bobsupport_cli
from cli_anything.bobsupport.bobsupport_cli import cli, task_gid
from cli_anything.bobsupport.core import form, playbook, runlog

TEST_API = "https://phinamic-api.quanht.site/api/v1"
ASANA = "https://app.asana.com/api/1.0"

FORM_NOTES = """Name:
Ziva Example

Email address:
ziva@example.com

Title:
Practice name change

App Country :
Slovenia

Application(s):
BOB

Area:
Data/Tracking

Describe your request:
Hello. I opened my own practice. How can I change the practice name?

———————————————
This task was submitted through App Requests & Feedback
https://form.asana.com/?k=x"""


class FakeResponse:
    def __init__(self, status=200, body=None):
        self.status_code = status
        self._body = body
        self.content = json.dumps(body).encode() if body is not None else b""
        self.headers = {"content-type": "application/json"}
        self.reason = "ERR" if status >= 400 else "OK"
        self.text = self.content.decode()

    @property
    def ok(self):
        return self.status_code < 400

    def json(self):
        if self._body is None:
            raise ValueError("no json")
        return self._body


def bob_ok(data):
    return FakeResponse(200, {"success": True, "data": data})


def asana_ok(data):
    return FakeResponse(200, {"data": data})


class World:
    """The BOB platform and Asana, just enough for the support flow."""

    def __init__(self):
        self.calls: list[tuple[str, str, object]] = []
        self.users = [{
            "id": 1257, "email": "ziva@example.com", "username": "zex", "status": "active",
            "activatedAt": "2026-11-12T10:00:00Z", "mustSetPassword": False, "roles": ["coach"],
            "subsidiaryId": None, "defaultPracticeId": 999,
            "practices": [{"practiceId": "999", "practiceName": "Old Name", "memberTypes": ["coach"]}],
        }]
        self.practices = {999: {"id": 999, "name": "Old Name", "status": "active", "coachCount": 1,
                                "contactEmail": "ziva@example.com", "createdAt": "2026-09-25"}}
        self.tasks = {
            "111": {"gid": "111", "name": "Practice name change", "notes": FORM_NOTES, "completed": False,
                    "memberships": [{"project": {"gid": "1200298616652229"}, "section": {"name": "Awaiting Feedback"}}]},
            "222": {"gid": "222", "name": "Fabian: change in BOB Admin", "completed": False,
                    "parent": {"gid": "111", "name": "Practice name change"},
                    "notes": 'Where: BOB Admin → Practices → … → Practice name\nChange: replace with "New Name s.p."'},
        }
        self.subtasks = {"111": ["222"]}
        self.stories: dict[str, list[str]] = {}
        self.comments_in: dict[str, list[dict]] = {}  # comments already on a task (what GET stories returns)
        self.next_gid = 900

    def comment_on(self, gid, text, who_gid="555", who_name="Ziva Example"):
        self.comments_in.setdefault(gid, []).append({
            "text": text, "resource_subtype": "comment_added", "created_at": "2026-11-25T14:32:00Z",
            "created_by": {"gid": who_gid, "name": who_name}})

    def request(self, method, url, headers=None, **kw):
        body = json.loads(kw["data"]) if isinstance(kw.get("data"), str) else kw.get("json")
        params = kw.get("params") or {}
        self.calls.append((method, url, body))
        if url.startswith(ASANA):
            return self.asana(method, url[len(ASANA):], params, (body or {}).get("data") if body else None)
        return self.bob(method, re.sub(r"^https://[^/]+/api/v1", "", url), params, body)

    # ---- BOB ----
    def bob(self, method, path, params, body):
        if (method, path) == ("GET", "/users"):
            q = (params.get("search") or "").lower()
            return bob_ok({"items": [u for u in self.users if q in u["email"]], "meta": {}})
        m = re.fullmatch(r"/practices/(\d+)", path)
        if m and method == "GET":
            p = self.practices.get(int(m.group(1)))
            return bob_ok(p) if p else FakeResponse(404, {"message": "not found"})
        if m and method == "PUT":
            self.practices[int(m.group(1))].update(body)
            return bob_ok(self.practices[int(m.group(1))])
        if (method, path) == ("POST", "/users/temporary-password"):
            return bob_ok({"sent": body["userIds"]})
        if (method, path) == ("GET", "/practices"):
            return bob_ok({"items": [p for p in self.practices.values() if p["status"] == params.get("status")], "meta": {}})
        if (method, path) == ("GET", "/practice-decisions"):
            return bob_ok({"items": [{"practiceId": 5, "countryCode": "BR", "outcome": "approved",
                                      "actorName": "Super User", "decisionAt": "2026-11-25T08:00:00Z"}]})
        if re.fullmatch(r"/subsidiaries/\d+", path):
            return bob_ok({"id": 90, "countryCode": "br"})
        return FakeResponse(404, {"message": f"no route {method} {path}"})

    # ---- Asana ----
    def asana(self, method, path, params, data):
        if path == "/users/me":
            return asana_ok({"gid": "1196321462158324", "name": "Fabian Jöhl"})
        if path.endswith("/tasks/search"):
            if params.get("is_subtask") == "true":
                return asana_ok([t for t in self.tasks.values() if t.get("parent") and not t["completed"]])
            return asana_ok([t for t in self.tasks.values() if not t.get("parent")])
        m = re.fullmatch(r"/tasks/(\d+)", path)
        if m and method == "GET":
            return asana_ok(self.tasks[m.group(1)])
        if m and method == "PUT":
            self.tasks[m.group(1)].update(data)
            return asana_ok(self.tasks[m.group(1)])
        m = re.fullmatch(r"/tasks/(\d+)/subtasks", path)
        if m and method == "GET":
            return asana_ok([self.tasks[g] for g in self.subtasks.get(m.group(1), [])])
        if m and method == "POST":
            self.next_gid += 1
            gid = str(self.next_gid)
            self.tasks[gid] = {"gid": gid, "completed": False, "parent": {"gid": m.group(1)}, **data}
            self.subtasks.setdefault(m.group(1), []).append(gid)
            return asana_ok(self.tasks[gid])
        m = re.fullmatch(r"/tasks/(\d+)/stories", path)
        if m and method == "GET":
            return asana_ok(self.comments_in.get(m.group(1), []))
        if m and method == "POST":
            self.stories.setdefault(m.group(1), []).append(data["text"])
            return asana_ok({"gid": "s1"})
        return FakeResponse(404, {"errors": [{"message": f"no route {method} {path}"}]})


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("BOB_ADMIN_HOME", str(tmp_path))
    for var in ("BOB_ADMIN_PROD_WRITES", "NOTION_API_KEY", "BOB_SUPPORT_ENV"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("ASANA_TOKEN", "test-token")
    return tmp_path


@pytest.fixture
def world(monkeypatch, home):
    w = World()
    monkeypatch.setattr(client_mod.requests, "Session", lambda: w)
    Session(env="test", access_token="ACCESS", refresh_token="R", user={"email": "admin@example.com"}).save()
    return w


def run(*args):
    return CliRunner().invoke(cli, ["--env", "test", *args], obj={}, catch_exceptions=False)


# ---------------------------------------------------------------- form + playbook
def test_parse_form_fields():
    s = form.parse(FORM_NOTES)
    assert s.from_form and s.email == "ziva@example.com" and s.first_name == "Ziva"
    assert s.get("country") == "Slovenia" and "practice name" in s.text


def test_parse_old_error_form_with_mailto():
    s = form.parse("*Name:*\nNina\n\n*Email address:*\n[nina@ex.si|mailto:nina@ex.si]\n\n*Select which App:*\nCuraprox\n\n"
                   "*What happened?:*\nIt crashes\n\n———————————————\nThis task was submitted through *Error Request*")
    assert s.email == "nina@ex.si" and s.get("application") == "Curaprox" and s.get("happened") == "It crashes"


@pytest.mark.parametrize("text,key", [
    ("How can I change the practice name?", "practice-rename"),
    ("Gostaria de activar a minha aplicacao", "activation-status"),
    ("Necesito acceso a la nueva app BOB", "activation-status"),
    ("I never received the temporary password", "temp-password"),
    ("Please delete my practice, we closed", "practice-delete"),
    ("How can I change address of my practice?", "practice-details"),
    ("The colours are hard to read", "other"),
])
def test_classify(text, key, home):
    assert playbook.classify(text, learned={"keywords": {}, "tasks": {}})[0].key == key


def test_learned_phrase_and_task_override(home):
    data = playbook.load_learned()
    data["keywords"]["practice-delete"] = ["studio chiuso"]
    data["tasks"]["555"] = "temp-password"
    playbook.save_learned(data)
    assert playbook.classify("Lo studio chiuso da ottobre")[0].key == "practice-delete"
    assert playbook.classify("anything at all", "555")[0].key == "temp-password"


def test_task_gid_accepts_links():
    assert task_gid("1220494681856181") == "1220494681856181"
    assert task_gid("https://app.asana.com/0/0/1220494681856181/f") == "1220494681856181"
    assert task_gid("https://app.asana.com/1/1171371475355741/project/1200298616652229/task/1220494681856181?focus=true") == "1220494681856181"


# ---------------------------------------------------------------- check / do
def test_check_change_subtask_plans_rename(world):
    r = run("--json", "check", "222")
    plan = json.loads(r.output)
    assert plan["type"] == "practice-rename" and plan["verdict"] == "change"
    assert plan["actions"][0]["body"] == {"name": "New Name s.p."}
    assert plan["changeSubtask"] == "222"
    assert not [c for c in world.calls if c[0] in ("PUT", "POST", "DELETE")]  # check never writes


def test_do_dry_run_sends_nothing(world):
    r = run("--dry-run", "do", "222")
    assert "dry run" in r.output
    assert world.practices[999]["name"] == "Old Name"


def test_do_renames_and_ticks_change_subtask(world):
    r = run("--yes", "do", "222")
    assert r.exit_code == 0, r.output
    assert world.practices[999]["name"] == "New Name s.p."
    assert world.tasks["222"]["completed"] is True
    assert "Done with bob-support" in world.stories["222"][0]
    assert runlog.history()[-1]["type"] == "practice-rename"


def test_do_prod_is_locked(world):
    Session(env="prod", access_token="ACCESS", user={"email": "a@b.c"}).save()
    r = CliRunner().invoke(cli, ["--env", "prod", "--yes", "do", "222"], obj={})
    assert r.exit_code != 0 and "locked" in str(r.exception)


def test_temp_password_waits_for_pending_practice(world):
    world.practices[999]["status"] = "pending"
    world.tasks["111"]["notes"] = (FORM_NOTES.replace("How can I change the practice name?", "I never received my password")
                                   .replace("Practice name change", "Login"))
    world.tasks["111"]["name"] = "Login"
    world.subtasks["111"] = []
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "temp-password" and plan["verdict"] == "reply" and not plan["actions"]


def test_no_account(world):
    world.users = []
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["verdict"] == "no-account"


def test_partner_admin_sees_central_approvals(world):
    world.users[0].update(subsidiaryId=90, practices=[])
    world.tasks["111"]["notes"] = (FORM_NOTES.replace("How can I change the practice name?", "Registrations are not reaching my approval")
                                   .replace("Practice name change", "New registrations"))
    world.tasks["111"]["name"] = "New registrations"
    world.subtasks["111"] = []
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "activation-status"
    assert any("Super User" in f for f in plan["facts"])


def test_from_json_without_token(world, monkeypatch, tmp_path):
    monkeypatch.delenv("ASANA_TOKEN")
    f = tmp_path / "t.json"
    f.write_text(json.dumps({"data": {"gid": "111", "name": "Practice name change", "notes": FORM_NOTES}}), encoding="utf-8")
    plan = json.loads(run("--json", "check", "--from-json", str(f), "--name", "Brand New").output)
    assert plan["actions"][0]["body"] == {"name": "Brand New"}


# ---------------------------------------------------------------- comments
def _plain_form(world, request="I need some help if the CLI works", title="Test"):
    world.tasks["111"]["notes"] = FORM_NOTES.replace("Hello. I opened my own practice. How can I change the practice name?",
                                                     request).replace("Practice name change", title)
    world.tasks["111"]["name"] = title
    world.subtasks["111"] = []
    world.tasks.pop("222")


def test_requester_comment_decides_type_and_emails(world):
    _plain_form(world)
    world.users.append({**world.users[0], "id": 4000, "email": "old@yopmail.com", "username": "old"})
    world.comment_on("111", "hi would like to change my address from old@yopmail.com to new@yopmail.com")
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "account-email" and plan["verdict"] == "change"
    assert plan["userId"] == 4000  # looked up by the old address from the comment
    assert plan["actions"][0]["body"] == {"email": "new@yopmail.com"}
    assert any("newest one decided" in f for f in plan["facts"])
    assert not any("@" in f for f in plan["facts"])  # no email addresses in the note


def test_automated_and_team_comments_ignored(world):
    _plain_form(world)
    world.comment_on("111", "Hi Ziva, please change the practice name… — Sent by Fabian's support assistant (automated).")
    world.comment_on("111", "Please delete my practice", who_gid="1207214370347608", who_name="Sean Dunne")
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "other"


def test_team_member_who_sent_the_form_counts(world):
    _plain_form(world)
    world.tasks["111"]["notes"] = world.tasks["111"]["notes"].replace("Ziva Example", "Sean Dunne")
    world.comment_on("111", "please send me a new temporary password", who_gid="1207214370347608", who_name="Sean Dunne")
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "temp-password"


def test_curaprox_app_request_skips_admin_console(world):
    _plain_form(world, request="Wo kann mann sich regrestriren", title="Wo kann man sich regrestriren")
    world.tasks["111"]["notes"] = world.tasks["111"]["notes"].replace("Application(s):\nBOB", "Application(s):\nCuraprox")
    plan = json.loads(run("--json", "check", "111").output)
    assert plan["type"] == "activation-status" and plan["verdict"] == "reply" and not plan["actions"]
    assert any("not BOB" in f for f in plan["facts"])
    assert not [c for c in world.calls if "/users" in c[1] and "asana" not in c[1]]  # no Admin Console lookup


def test_german_automated_reply_ignored_for_sender(world):
    _plain_form(world)
    world.comment_on("111", "Hallo, bitte löschen Sie meine Praxis — Gesendet von Seans Support-Assistent (automatisiert).")
    assert json.loads(run("--json", "check", "111").output)["type"] == "other"


# ---------------------------------------------------------------- sweep
def test_sweep_notes_once_per_change(world):
    r = run("sweep", "--post")
    assert r.exit_code == 0, r.output
    assert len(world.stories["222"]) == 1 and "Admin Console check" in world.stories["222"][0]
    assert "ziva@example.com" not in world.stories["222"][0]  # no email addresses in Asana notes
    run("sweep", "--post")
    assert len(world.stories["222"]) == 1  # unchanged: nothing written again
    world.practices[999]["coachCount"] = 3
    run("sweep", "--post")
    assert len(world.stories["222"]) == 2  # something changed: one new note


def test_sweep_preview_writes_nothing(world):
    run("sweep")
    assert world.stories == {}


def test_sweep_creates_check_subtask_without_change_subtask(world):
    world.subtasks["111"] = []
    world.tasks.pop("222")
    run("sweep", "--post")
    new = [t for t in world.tasks.values() if t.get("name", "").startswith("Admin Console check")]
    assert len(new) == 1 and new[0]["assignee"] == "1196321462158324"
    run("sweep", "--post")
    assert len([t for t in world.tasks.values() if t.get("name", "").startswith("Admin Console check")]) == 1


def test_learn_commands(world):
    run("learn", "phrase", "practice-delete", "studio chiuso")
    run("learn", "task", "111", "temp-password")
    data = playbook.load_learned()
    assert data["keywords"]["practice-delete"] == ["studio chiuso"] and data["tasks"]["111"] == "temp-password"
    assert "studio chiuso" in run("learn", "export").output


def test_types_lists_every_type(world):
    out = run("types").output
    for t in playbook.TYPES:
        assert t.key in out


def test_wrapper_points_at_sweep(home, monkeypatch):
    w = bobsupport_cli._wrapper()
    assert "sweep --all --post --scheduled" in w.read_text()
