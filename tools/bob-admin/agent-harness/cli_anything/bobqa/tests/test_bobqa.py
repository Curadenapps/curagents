"""Unit tests for cli-anything-bobqa. No network: HTTP is faked, answering per route."""

from __future__ import annotations

import json
import re

import pytest
from click.testing import CliRunner

from cli_anything.bobadmin.core import client as client_mod
from cli_anything.bobadmin.core.client import Session
from cli_anything.bobqa.bobqa_cli import cli
from cli_anything.bobqa.core import fixtures, qaconfig, scenarios

TEST_API = "https://phinamic-api.quanht.site/api/v1"


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


def ok(data):
    return FakeResponse(200, {"success": True, "message": "ok", "data": data})


def not_found():
    return FakeResponse(404, {"success": False, "message": "Patient not found", "statusCode": 404})


class FakeBob:
    """A tiny in-memory BOB platform: enough of the API for the scenarios."""

    def __init__(self):
        self.calls: list[dict] = []
        self.patients: dict[int, dict] = {}
        self.scores: dict[int, dict] = {}
        self.next_id = 900
        self.coached = [{"id": 7, "name": "QA Practice"}, {"id": 8, "name": "Other"}]
        self.default_practice = 7
        self.overrides: dict[tuple[str, str], FakeResponse] = {}
        self.keep_temp_after_assign = False

    def _id(self):
        self.next_id += 1
        return self.next_id

    def request(self, method, url, headers=None, **kw):
        body = json.loads(kw["data"]) if isinstance(kw.get("data"), str) else kw.get("data")
        path = url.replace(TEST_API, "")
        self.calls.append({"method": method, "path": path, "params": kw.get("params"), "body": body,
                           "headers": headers or {}})
        key = (method, path)
        if key in self.overrides:
            return self.overrides[key]
        return self.route(method, path, body, kw.get("params") or {})

    def route(self, method, path, body, params):
        if (method, path) == ("GET", "/auth/me"):
            return ok({"id": 5, "defaultPracticeId": self.default_practice})
        if (method, path) == ("GET", "/practices/my-coached"):
            return ok({"items": self.coached, "meta": {"totalItems": len(self.coached)}})
        if (method, path) == ("GET", "/app-config"):
            return ok({"minVersion": "1.0"})
        if (method, path) == ("GET", "/settings"):
            return ok({"language": "en"})
        if (method, path) == ("GET", "/products"):
            return ok({"tabs": [{"id": 1, "name": "IDB", "products": [{"key": "cps-06"}, {"key": "cps-07"}]}]})
        if (method, path) == ("GET", "/recommendation-templates"):
            return ok([{"uuid": "a", "text": "Brush daily"}])
        if (method, path) == ("GET", "/news/announcements"):
            return ok([])
        if (method, path) == ("GET", "/patients"):
            rows = [p for p in self.patients.values()
                    if not params.get("search") or params["search"] in p.get("firstName", "")]
            return ok({"items": rows, "meta": {"totalItems": len(rows)}})
        if (method, path) == ("POST", "/patients"):
            pid = self._id()
            self.patients[pid] = {"id": pid, **body, "isTemporary": False}
            return ok(self.patients[pid])
        if (method, path) == ("POST", "/patients/scores"):
            tid, sid = self._id(), self._id()
            self.patients[tid] = {"id": tid, "isTemporary": True, "practiceId": body["practiceId"]}
            self.scores[sid] = {"id": sid, "patientId": tid, "assessments": body["assessments"]}
            return ok({"id": sid, "patientId": tid})
        if (method, path) == ("POST", "/patients/assign-session"):
            src, dst = body["sourcePatientId"], body["targetPatientId"]
            for s in self.scores.values():
                if s["patientId"] == src:
                    s["patientId"] = dst
            if not self.keep_temp_after_assign:
                self.patients.pop(src, None)
            return ok({"ok": True})
        m = re.fullmatch(r"/patients/(\d+)", path)
        if m:
            pid = int(m.group(1))
            if pid not in self.patients:
                return not_found()
            if method == "DELETE":
                self.patients.pop(pid)
                return ok({"ok": True})
            return ok(self.patients[pid])
        m = re.fullmatch(r"/patients/(\d+)/scores", path)
        if m:
            pid = int(m.group(1))
            return ok({"items": [s for s in self.scores.values() if s["patientId"] == pid], "meta": {}})
        m = re.fullmatch(r"/patients/(\d+)/scores/(\d+)(/resend-mail)?", path)
        if m:
            s = self.scores.get(int(m.group(2)))
            return ok(s if not m.group(3) else {"queued": True}) if s else not_found()
        return ok({"ok": True})

    def paths(self, method=None):
        return [c["path"] for c in self.calls if method is None or c["method"] == method]


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("BOB_ADMIN_HOME", str(tmp_path))
    for var in ("BOB_ADMIN_API_URL", "BOB_QA_ENV", "BOB_ADMIN_PROD_WRITES", "BOB_QA_PASSWORD", "BOB_QA_IDENTITY"):
        monkeypatch.delenv(var, raising=False)
    return tmp_path


@pytest.fixture
def bob(monkeypatch, home):
    fake = FakeBob()
    monkeypatch.setattr(client_mod.requests, "Session", lambda: fake)
    return fake


def signed_in(env="test"):
    Session(env=env, access_token="QA-ACCESS", refresh_token="QA-REFRESH", user={"email": "coach@example.com"},
            name="qa-session").save()


def invoke(*args, input=None):
    return CliRunner().invoke(cli, list(args), input=input, catch_exceptions=True)


# ---------------------------------------------------------------- fixtures
def test_qa_patient_is_labelled_and_safe():
    p = fixtures.qa_patient(7, "RUN1")
    assert p["firstName"] == "QA-TEST" and "RUN1" in p["lastName"]
    assert p["email"].endswith("@example.com") and p["subscription"] is False
    assert fixtures.is_qa_patient(p)
    assert not fixtures.is_qa_patient({"firstName": "Anna"})
    with_inbox = fixtures.qa_patient(7, "RUN1", "inbox@yopmail.com")
    assert with_inbox["email"] == "inbox@yopmail.com" and with_inbox["subscription"] is True


def test_score_payload_mirrors_web_app():
    s = fixtures.temporary_score_payload(7, "RUN1")
    assert s["practiceId"] == 7 and s["assessments"] == ["bobscore"] and s["type"] == "p1"
    assert {"timestamp", "version", "status"} <= set(s["meta"])
    assert len(s["data"]["fdiSchema"]) == 32
    assert s["data"]["bobScore"]["score"]["final"] == 0
    assert s["data"]["score"] == s["data"]["bobScore"]["score"]


# ---------------------------------------------------------------- session
def test_bob_qa_keeps_its_own_session(bob, home):
    Session(env="test", access_token="ADMIN", user={"email": "admin@example.com"}).save()
    r = invoke("auth", "status")
    assert "signedIn" in r.output and "False" in r.output  # admin session is not bob-qa's
    signed_in()
    r = invoke("--json", "auth", "whoami")
    assert r.exit_code == 0, r.output
    assert bob.calls[-1]["headers"]["Authorization"] == "Bearer QA-ACCESS"
    assert (home / "qa-session-test.json").exists() and (home / "session-test.json").exists()


def test_not_signed_in_points_at_bob_qa(bob):
    r = invoke("--json", "products")
    assert r.exit_code != 0
    assert "bob-qa --env test auth login" in str(r.exception)
    assert bob.calls == []


def test_login_saves_qa_session(bob, home, monkeypatch):
    monkeypatch.setenv("BOB_QA_PASSWORD", "pw-not-echoed")
    bob.overrides[("POST", "/auth/login")] = ok({"accessToken": "A1", "refreshToken": "R1", "user": {"email": "c@example.com"}})
    r = invoke("auth", "login", "-u", "c@example.com")
    assert r.exit_code == 0, r.output
    assert "pw-not-echoed" not in r.output
    saved = json.loads((home / "qa-session-test.json").read_text())
    assert saved["accessToken"] == "A1"


# ---------------------------------------------------------------- safety
def test_writes_never_go_to_prod_even_with_flag(bob, monkeypatch):
    monkeypatch.setenv("BOB_ADMIN_PROD_WRITES", "1")
    signed_in("prod")
    r = invoke("--env", "prod", "--yes", "scores", "temporary", "--practice", "7")
    assert r.exit_code != 0 and "never writes to prod" in str(r.exception)
    r = invoke("--env", "prod", "--yes", "qa", "run", "coach-loop")
    assert r.exit_code != 0 and "never writes to prod" in str(r.exception)
    assert bob.paths("POST") == []


def test_prod_reads_allowed(bob):
    signed_in("prod")
    r = invoke("--env", "prod", "--json", "app-config")
    assert r.exit_code == 0, r.output


def test_dry_run_sends_nothing(bob):
    signed_in()
    r = invoke("--dry-run", "--json", "patients", "create-test", "--practice", "7")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["dryRun"] and out["body"]["firstName"] == "QA-TEST"
    assert bob.paths("POST") == []


def test_json_write_without_yes_refused(bob):
    signed_in()
    r = invoke("--json", "scores", "temporary", "--practice", "7")
    assert r.exit_code != 0 and "--yes" in str(r.exception)
    assert bob.paths("POST") == []


def test_delete_refuses_real_patients(bob):
    signed_in()
    bob.patients[42] = {"id": 42, "firstName": "Anna", "isTemporary": False}
    r = invoke("--yes", "patients", "delete", "42")
    assert r.exit_code != 0 and "not a QA-TEST" in str(r.exception)
    assert bob.paths("DELETE") == []
    bob.patients[43] = {"id": 43, "firstName": "QA-TEST", "lastName": "bob-qa x"}
    r = invoke("--yes", "--json", "patients", "delete", "43")
    assert r.exit_code == 0, r.output
    assert bob.paths("DELETE") == ["/patients/43"]


def test_cleanup_deletes_only_qa_patients(bob):
    signed_in()
    bob.patients[50] = {"id": 50, "firstName": "QA-TEST", "lastName": "old run"}
    bob.patients[51] = {"id": 51, "firstName": "QA-TESTER?", "lastName": "x"}  # also QA-prefixed
    bob.patients[52] = {"id": 52, "firstName": "Anna", "lastName": "QA-TEST"}
    r = invoke("--yes", "--json", "patients", "cleanup")
    assert r.exit_code == 0, r.output
    assert sorted(bob.paths("DELETE")) == ["/patients/50", "/patients/51"]
    assert 52 in bob.patients


# ---------------------------------------------------------------- commands
def test_command_requests(bob):
    signed_in()
    invoke("--json", "products", "--practice", "7")
    assert bob.calls[-1]["path"] == "/products" and bob.calls[-1]["params"] == {"practiceId": 7}
    invoke("--yes", "--json", "scores", "assign", "901", "42")
    assert bob.calls[-1]["body"] == {"sourcePatientId": 901, "targetPatientId": 42}
    invoke("--yes", "--json", "scores", "resend", "42", "77")
    assert bob.calls[-1]["method"] == "POST" and bob.calls[-1]["path"] == "/patients/42/scores/77/resend-mail"
    invoke("--json", "patients", "list", "--qa-only", "--temporary")
    assert bob.calls[-1]["params"] == {"search": "QA-TEST", "isTemporary": "true"}


def test_every_group_has_help():
    for args in (["--help"], ["qa", "--help"], ["patients", "--help"], ["scores", "--help"], ["config", "--help"]):
        assert invoke(*args).exit_code == 0


def test_config_set_and_show(home):
    assert invoke("config", "set", "email", "inbox@yopmail.com").exit_code == 0
    assert invoke("config", "set", "practice", "7").exit_code == 0
    assert qaconfig.load() == {"email": "inbox@yopmail.com", "practice": 7}
    assert invoke("config", "set", "practice", "seven").exit_code != 0
    assert invoke("config", "unset", "email").exit_code == 0
    assert qaconfig.load() == {"practice": 7}


# ---------------------------------------------------------------- scenarios
def test_qa_list_and_show():
    r = invoke("--json", "qa", "list")
    names = {x["scenario"]: x["writes"] for x in json.loads(r.output)}
    assert names == {"smoke": False, "coach-loop": True}
    r = invoke("--json", "qa", "show", "coach-loop")
    assert "cleanup" in r.output


def test_smoke_is_read_only_and_passes(bob):
    signed_in()
    r = invoke("--json", "qa", "run", "smoke")
    assert r.exit_code == 0, r.output
    rep = json.loads(r.output)
    assert rep["passed"] and rep["counts"]["fail"] == 0 and rep["practiceId"] == 7
    assert bob.paths("POST") == [] and bob.paths("DELETE") == []


def test_coach_loop_passes_and_cleans_up(bob, home):
    signed_in()
    r = invoke("--yes", "--json", "qa", "run", "coach-loop", "--email", "inbox@yopmail.com")
    assert r.exit_code == 0, r.output
    rep = json.loads(r.output)
    assert rep["passed"], rep["steps"]
    assert [s["status"] for s in rep["steps"]] == ["pass"] * 12
    created = next(c for c in bob.calls if c["path"] == "/patients" and c["method"] == "POST")
    assert created["body"]["firstName"] == "QA-TEST" and created["body"]["email"] == "inbox@yopmail.com"
    assert any(p.endswith("/resend-mail") for p in bob.paths("POST"))
    assert bob.patients == {}  # nothing left behind
    assert (home / "qa-runs").exists() and list((home / "qa-runs").glob("coach-loop-*.json"))


def test_coach_loop_without_inbox_skips_email(bob):
    signed_in()
    r = invoke("--yes", "--json", "qa", "run", "coach-loop")
    rep = json.loads(r.output)
    assert rep["passed"]
    email = next(s for s in rep["steps"] if s["step"] == "resend-score-email")
    assert email["status"] == "skip"
    assert not any(p.endswith("/resend-mail") for p in bob.paths("POST"))
    created = next(c for c in bob.calls if c["path"] == "/patients" and c["method"] == "POST")
    assert created["body"]["email"].endswith("@example.com")


def test_coach_loop_failure_still_cleans_up(bob):
    signed_in()
    bob.overrides[("POST", "/patients/assign-session")] = FakeResponse(500, {"success": False, "message": "boom"})
    r = invoke("--yes", "--json", "qa", "run", "coach-loop", "--no-email")
    assert r.exit_code == 1
    rep = json.loads(r.output)
    status = {s["step"]: s["status"] for s in rep["steps"]}
    assert status["assign-session"] == "fail" and status["score-listed"] == "skip"
    assert status["cleanup"] == "pass"
    assert bob.patients == {}  # test patient and temporary patient both deleted


def test_temp_patient_left_after_assign_is_a_failure(bob):
    signed_in()
    bob.keep_temp_after_assign = True
    rep = json.loads(invoke("--yes", "--json", "qa", "run", "coach-loop", "--no-email").output)
    status = {s["step"]: s["status"] for s in rep["steps"]}
    assert status["temporary-patient-removed"] == "fail" and status["cleanup"] == "pass"
    assert bob.patients == {}


def test_wrong_practice_fails_before_any_write(bob):
    signed_in()
    rep = json.loads(invoke("--yes", "--json", "qa", "run", "coach-loop", "--practice", "99").output)
    assert not rep["passed"]
    assert bob.paths("POST") == [] and bob.paths("DELETE") == []


def test_keep_leaves_data(bob):
    signed_in()
    rep = json.loads(invoke("--yes", "--json", "qa", "run", "coach-loop", "--no-email", "--keep").output)
    assert rep["passed"]
    assert bob.paths("DELETE") == [] and len(bob.patients) == 1


def test_scenario_dry_run_sends_nothing(bob):
    signed_in()
    r = invoke("--dry-run", "--json", "qa", "run", "coach-loop")
    assert r.exit_code == 0, r.output
    assert json.loads(r.output)["dryRun"] is True
    assert bob.calls == []


def test_guard_write_only_test():
    class C:
        env = "prod"
    with pytest.raises(Exception):
        scenarios.guard_write(C())
