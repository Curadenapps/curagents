"""Unit tests for cli-anything-bobadmin. No network: HTTP is faked."""

from __future__ import annotations

import json

import pytest
from click.testing import CliRunner

from cli_anything.bobadmin import bobadmin_cli
from cli_anything.bobadmin.bobadmin_cli import cli
from cli_anything.bobadmin.core import client as client_mod
from cli_anything.bobadmin.core import spec
from cli_anything.bobadmin.core.client import BobAdminError, Client, Request, Session
from cli_anything.bobadmin.core.output import extract_rows, table, unwrap

TEST_API = "https://phinamic-api.quanht.site/api/v1"


class FakeResponse:
    def __init__(self, status=200, body=None, content=None, headers=None):
        self.status_code = status
        self._body = body
        self.content = content if content is not None else (json.dumps(body).encode() if body is not None else b"")
        self.headers = headers or {"content-type": "application/json"}
        self.reason = "ERR" if status >= 400 else "OK"
        self.text = self.content.decode(errors="replace")

    @property
    def ok(self):
        return self.status_code < 400

    def json(self):
        if self._body is None:
            raise ValueError("no json")
        return self._body


class FakeHttp:
    """Records requests; answers from a queue (default: an empty success envelope)."""

    def __init__(self):
        self.calls: list[dict] = []
        self.queue: list[FakeResponse] = []

    def request(self, method, url, headers=None, **kw):
        body = json.loads(kw["data"]) if isinstance(kw.get("data"), str) else kw.get("data")
        self.calls.append({"method": method, "url": url, "headers": headers or {}, "params": kw.get("params"),
                           "body": body, "files": kw.get("files")})
        if self.queue:
            return self.queue.pop(0)
        return FakeResponse(200, {"success": True, "message": "ok", "data": {"ok": True}})


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("BOB_ADMIN_HOME", str(tmp_path))
    for var in ("BOB_ADMIN_API_URL", "BOB_ADMIN_ENV", "BOB_ADMIN_PROD_WRITES", "BOB_ADMIN_PASSWORD", "BOB_ADMIN_IDENTITY"):
        monkeypatch.delenv(var, raising=False)
    return tmp_path


@pytest.fixture
def http(monkeypatch, home):
    fake = FakeHttp()
    monkeypatch.setattr(client_mod.requests, "Session", lambda: fake)
    return fake


def signed_in(env="test", token="ACCESS", refresh="REFRESH"):
    s = Session(env=env, access_token=token, refresh_token=refresh, user={"email": "tester@example.com"})
    s.save()


def invoke(*args, input=None):
    return CliRunner().invoke(cli, list(args), input=input, catch_exceptions=True)


# ---------------------------------------------------------------- spec
def test_spec_has_all_operations():
    ops = spec.operations()
    assert len(ops) == 141
    tags = {o["tag"] for o in ops}
    for t in ("Users", "Practices", "Products", "News", "Subsidiaries", "Metrics", "API Tokens"):
        assert t in tags


def test_spec_describe_create_user():
    d = spec.describe("POST", "/users")
    fields = {f["name"]: f for f in d["body"]["fields"]}
    assert fields["email"]["required"] and fields["roles"]["required"]
    assert "sendTemporaryPassword" in fields


def test_spec_describe_unknown():
    with pytest.raises(KeyError):
        spec.describe("GET", "/nope")


# ---------------------------------------------------------------- output
def test_unwrap_envelope():
    assert unwrap({"success": True, "message": "x", "data": [1], "timestamp": "t"}) == [1]
    assert unwrap({"success": True, "data": {"a": 1}, "meta": {"page": 1}}) == {"a": 1, "meta": {"page": 1}}
    assert unwrap({"a": 1}) == {"a": 1}


def test_extract_rows_paginated():
    rows, meta = extract_rows({"success": True, "data": {"items": [{"id": 1}], "total": 9}})
    assert rows == [{"id": 1}] and meta == {"total": 9}


def test_table_picks_known_columns():
    out = table([{"id": 1, "email": "a@b.c", "noise": {"x": 1}}])
    assert "email" in out.splitlines()[0] and "noise" not in out.splitlines()[0]


# ---------------------------------------------------------------- client
def test_login_saves_session(http, home):
    http.queue.append(FakeResponse(200, {"success": True, "data": {
        "accessToken": "A1", "refreshToken": "R1", "user": {"email": "x@y.z"}, "capabilities": {}}}))
    c = Client("test")
    res = c.login("x@y.z", "pw")
    assert res["requiresPasswordChange"] is False
    assert http.calls[0]["url"] == TEST_API + "/auth/login"
    assert http.calls[0]["body"] == {"identity": "x@y.z", "password": "pw"}
    saved = json.loads((home / "session-test.json").read_text())
    assert saved["accessToken"] == "A1" and saved["refreshToken"] == "R1"


def test_login_temporary_password(http):
    http.queue.append(FakeResponse(200, {"success": True, "data": {"requiresPasswordChange": True, "passwordChangeToken": "T"}}))
    assert Client("test").login("u", "p") == {"requiresPasswordChange": True, "passwordChangeToken": "T"}


def test_refresh_on_401_then_retry(http, home):
    signed_in()
    http.queue += [
        FakeResponse(401, {"message": "expired"}),
        FakeResponse(200, {"success": True, "data": {"accessToken": "A2", "refreshToken": "R2"}}),
        FakeResponse(200, {"success": True, "data": [{"id": 5}]}),
    ]
    out = Client("test").call(Request("GET", "/users"))
    assert unwrap(out) == [{"id": 5}]
    assert [c["url"].rsplit("/", 2)[-2:] for c in http.calls] == [["v1", "users"], ["auth", "refresh"], ["v1", "users"]]
    assert http.calls[2]["headers"]["Authorization"] == "Bearer A2"
    assert json.loads((home / "session-test.json").read_text())["refreshToken"] == "R2"


def test_not_signed_in(http):
    with pytest.raises(BobAdminError, match="Not signed in"):
        Client("test").call(Request("GET", "/users"))
    assert http.calls == []


def test_prod_writes_locked(http, monkeypatch):
    signed_in("prod")
    with pytest.raises(BobAdminError, match="locked"):
        Client("prod").call(Request("POST", "/news", body={}))
    monkeypatch.setenv("BOB_ADMIN_PROD_WRITES", "1")
    Client("prod").call(Request("POST", "/news", body={}))
    assert http.calls[0]["url"] == "https://api.bobscore.app/api/v1/news"


def test_prod_reads_allowed(http):
    signed_in("prod")
    Client("prod").call(Request("GET", "/users"))
    assert http.calls[0]["url"] == "https://api.bobscore.app/api/v1/users"


def test_error_message_surfaces(http):
    signed_in()
    http.queue.append(FakeResponse(400, {"success": False, "message": ["email must be an email"]}))
    with pytest.raises(BobAdminError, match="email must be an email"):
        Client("test").call(Request("GET", "/users"))


def test_validation_errors_detail_surfaces(http):
    # A wrong password answers 422 with the reason only in `errors` (seen live on test, 23 Nov 2026).
    http.queue.append(FakeResponse(422, {"status": 422, "message": "Unprocessable Entity Exception",
                                         "errors": {"identity": "invalidCredentials"}}))
    with pytest.raises(BobAdminError, match=r"Unprocessable Entity Exception \(identity: invalidCredentials\)"):
        Client("test").login("someone@example.com", "wrong")
    http.queue.append(FakeResponse(422, {"errors": {"email": ["must be an email", "is required"]}}))
    signed_in()
    with pytest.raises(BobAdminError, match="email: must be an email; is required"):
        Client("test").call(Request("POST", "/users", body={}))


# ---------------------------------------------------------------- CLI
@pytest.mark.parametrize("group", ["auth", "users", "superusers", "practices", "subsidiaries", "products",
                                   "news", "assets", "integrations", "reports", "tickets", "templates", "ops"])
def test_group_help(group):
    r = invoke(group, "--help")
    assert r.exit_code == 0, r.output


def test_dry_run_sends_nothing(http):
    signed_in()
    r = invoke("--json", "--dry-run", "superusers", "create", "--first-name", "Ana", "--last-name", "B",
               "--email", "ana@example.com", "--country", "AE", "--send-invite")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["dryRun"] and out["method"] == "POST" and out["url"] == TEST_API + "/users"
    assert out["body"] == {"firstName": "Ana", "lastName": "B", "email": "ana@example.com", "roles": ["superuser"],
                           "countryCode": "AE", "sendInvite": True}
    assert http.calls == []


def test_write_without_yes_in_json_mode_refuses(http):
    signed_in()
    r = invoke("--json", "practices", "reject", "12", "--reason", "duplicate")
    assert isinstance(r.exception, BobAdminError) and "--yes" in str(r.exception)
    assert http.calls == []


def test_approve_with_yes(http):
    signed_in()
    r = invoke("--yes", "practices", "approve", "12", "--idb-office", "--no-idb-kit", "--training-date", "2027-01-15")
    assert r.exit_code == 0, r.output
    call = http.calls[0]
    assert call["url"] == TEST_API + "/practices/12/decisions/approve"
    assert call["body"] == {"isIdbOffice": True, "hasIdbKit": False, "appTrainingDate": "2027-01-15"}


def test_partner_admin_needs_subsidiary(http):
    signed_in()
    r = invoke("--yes", "superusers", "create", "--partner", "--first-name", "A", "--last-name", "B", "--email", "a@b.c")
    assert r.exit_code != 0 and "subsidiary-id" in r.output
    assert http.calls == []


def test_interactive_confirm_no_aborts(http, monkeypatch):
    signed_in()
    monkeypatch.setattr(bobadmin_cli.sys.stdin, "isatty", lambda: True, raising=False)
    r = invoke("news", "delete", "abc", input="n\n")
    assert r.exit_code != 0
    assert http.calls == []


def test_list_params(http):
    signed_in()
    http.queue.append(FakeResponse(200, {"success": True, "data": [{"id": 1, "name": "Clinic", "status": "pending"}]}))
    r = invoke("practices", "list", "--status", "pending", "--search", "Dubai", "--limit", "50")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["params"] == {"status": "pending", "search": "Dubai", "limit": 50}
    assert "Clinic" in r.output


def test_members_add_new_user(http):
    signed_in()
    r = invoke("--yes", "practices", "members", "add", "7", "--type", "coach", "--first-name", "C",
               "--last-name", "D", "--email", "c@d.e", "--send-invite")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["body"] == {"memberType": "coach", "user": {"firstName": "C", "lastName": "D", "email": "c@d.e"},
                                     "sendInvite": True}


def test_news_create_defaults_inactive(http):
    signed_in()
    r = invoke("--yes", "news", "create", "--title", "Hello", "--country", "AE", "--country", "CH",
               "--video-url", "https://youtu.be/x")
    assert r.exit_code == 0, r.output
    body = http.calls[0]["body"]
    assert body["active"] is False and body["countryCodes"] == ["AE", "CH"] and body["mediaType"] == "video"


def test_product_create_country_urls(http):
    signed_in()
    r = invoke("--yes", "products", "create", "--name", "CS 5460", "--tab-id", "t1", "--country-url", "CH=https://a",
               "--hidden")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["body"] == {"name": "CS 5460", "tabId": "t1", "isActive": False, "countryUrls": {"CH": "https://a"}}


def test_export_saves_file(http, tmp_path):
    signed_in()
    http.queue.append(FakeResponse(200, None, content=b"PK\x03\x04xlsx", headers={"content-type": "application/vnd.openxmlformats"}))
    out = tmp_path / "usage.xlsx"
    r = invoke("reports", "practice-usage", "--export", str(out))
    assert r.exit_code == 0, r.output
    assert out.read_bytes().startswith(b"PK")
    assert http.calls[0]["url"] == TEST_API + "/metrics/practice-usage/export"


def test_erase_requires_matching_email(http):
    signed_in()
    http.queue.append(FakeResponse(200, {"success": True, "data": {"id": 3, "email": "real@x.y"}}))
    r = invoke("--yes", "users", "erase", "3", "--confirm-email", "wrong@x.y")
    assert isinstance(r.exception, BobAdminError)
    assert [c["method"] for c in http.calls] == ["GET"]


def test_api_passthrough_normalises_path(http):
    signed_in()
    r = invoke("api", "GET", "api/v1/practices", "-p", "status=pending")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["url"] == TEST_API + "/practices" and http.calls[0]["params"] == {"status": "pending"}


def test_auth_login_cli_uses_env_password(http, monkeypatch, home):
    monkeypatch.setenv("BOB_ADMIN_PASSWORD", "pw")
    http.queue.append(FakeResponse(200, {"success": True, "data": {"accessToken": "A", "refreshToken": "R",
                                                                   "user": {"email": "u@x.y", "roles": ["superuser"]},
                                                                   "capabilities": {}}}))
    r = invoke("--json", "auth", "login", "-u", "u@x.y")
    assert r.exit_code == 0, r.output
    assert json.loads(r.output)["signedIn"] is True
    assert "pw" not in r.output


def test_login_takes_roles_from_capabilities(http, home):
    http.queue.append(FakeResponse(200, {"success": True, "data": {
        "accessToken": "A", "refreshToken": "R", "user": {"email": "x@y.z"}, "capabilities": {"roles": ["superuser"]}}}))
    Client("test").login("x@y.z", "pw")
    assert json.loads((home / "session-test.json").read_text())["user"]["roles"] == ["superuser"]


def test_report_home_nested_rows(http):
    signed_in()
    http.queue.append(FakeResponse(200, {"success": True, "data": {
        "asOf": "t", "pending": {"total": 22, "unassigned": 6, "items": [{"id": "9", "name": "Clinic Z", "city": "Dubai"}]}}}))
    r = invoke("reports", "home")
    assert r.exit_code == 0, r.output
    assert "pending: total=22" in r.output and "Clinic Z" in r.output


def test_practice_usage_summary_line(http):
    signed_in()
    http.queue.append(FakeResponse(200, {"success": True, "data": {
        "rows": [{"practiceId": "1", "name": "A", "usageState": "dormant"}],
        "summary": {"total": 73, "dormant": 5}, "pagination": {"page": 1}}}))
    r = invoke("reports", "practice-usage")
    assert r.exit_code == 0, r.output
    assert "dormant" in r.output and "total=73" in r.output


# ---------------------------------------------------------------- generated `call` commands
def test_call_has_every_endpoint():
    g = cli.commands["call"]
    assert sum(len(sub.commands) for sub in g.commands.values()) == 140  # all but /api/health


def test_call_create_user_checks_required_and_types(http):
    signed_in()
    r = invoke("--yes", "call", "users", "create", "--first-name", "A", "--last-name", "B", "--email", "a@b.c")
    assert r.exit_code != 0 and "roles" in r.output
    r = invoke("--yes", "call", "users", "create", "--first-name", "A", "--last-name", "B", "--email", "a@b.c",
               "--roles", "superuser", "--send-invite", "false")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["body"] == {"firstName": "A", "lastName": "B", "email": "a@b.c", "roles": ["superuser"],
                                     "sendInvite": False}


def test_call_path_and_query(http):
    signed_in()
    r = invoke("call", "practices", "find-all", "--status", "pending", "--limit", "5")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["url"] == TEST_API + "/practices" and http.calls[0]["params"] == {"status": "pending", "limit": "5"}
    r = invoke("--yes", "call", "practices", "move-member", "12", "55", "--target-practice-id", "9")
    assert r.exit_code == 0, r.output
    assert http.calls[1]["url"] == TEST_API + "/practices/12/members/55/move"
    assert http.calls[1]["body"] == {"targetPracticeId": 9}


def test_call_reads_ids_from_stdin(http):
    signed_in()
    r = CliRunner().invoke(cli, ["call", "practices", "find-one", "-"], input="7\n8\n")
    assert r.exit_code == 0, r.output
    assert [c["url"] for c in http.calls] == [TEST_API + "/practices/7", TEST_API + "/practices/8"]


def test_call_write_from_stdin_needs_yes(http):
    signed_in()
    r = CliRunner().invoke(cli, ["call", "practices", "remove", "-"], input="7\n")
    assert isinstance(r.exception, BobAdminError) and http.calls == []


def test_call_body_field_named_data_is_renamed():
    cmd = cli.commands["call"].commands["patients"].commands["create-score"]
    opts = {o for p in cmd.params for o in getattr(p, "opts", [])}
    assert "--body-data" in opts and "--data" in opts


# ---------------------------------------------------------------- composable output
def page(items, current, total_pages):
    return FakeResponse(200, {"success": True, "data": {"items": items, "meta": {
        "currentPage": current, "totalPages": total_pages, "totalItems": 3}}})


def test_all_follows_pages(http):
    signed_in()
    http.queue += [page([{"id": 1}], 1, 3), page([{"id": 2}], 2, 3), page([{"id": 3}], 3, 3)]
    r = invoke("--json", "--all", "practices", "list", "--status", "active")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert [i["id"] for i in out["items"]] == [1, 2, 3] and out["fetchedAll"] == {"records": 3, "pages": 3}
    assert [c["params"].get("page") for c in http.calls] == [None, 2, 3]
    assert all(c["params"]["status"] == "active" for c in http.calls)


def test_ids_and_fields(http):
    signed_in()
    http.queue += [page([{"id": 4, "name": "A", "x": 1}, {"id": 5, "name": "B", "x": 2}], 1, 1)] * 2
    r = invoke("--ids", "practices", "list")
    assert r.output.split() == ["4", "5"]
    r = invoke("--json", "--fields", "id,name", "practices", "list")
    assert json.loads(r.output) == [{"id": 4, "name": "A"}, {"id": 5, "name": "B"}]


def test_temp_password_reads_stdin(http):
    signed_in()
    r = CliRunner().invoke(cli, ["--yes", "users", "temp-password", "-"], input="4\n5\n")
    assert r.exit_code == 0, r.output
    assert http.calls[0]["body"] == {"userIds": [4, 5]}


def test_user_create_rejects_practice_roles():
    r = invoke("--dry-run", "users", "create", "--role", "coach", "--first-name", "A", "--last-name", "B", "--email", "a@b.c")
    assert r.exit_code != 0


def test_call_get_out_saves_export(http, tmp_path):
    signed_in()
    http.queue.append(FakeResponse(200, None, content=b"PK\x03\x04x", headers={"content-type": "application/vnd.ms-excel"}))
    out = tmp_path / "scores.xlsx"
    r = invoke("call", "metrics", "metrics-export", "--from", "2026-10-01", "--out", str(out))
    assert r.exit_code == 0, r.output
    assert out.read_bytes().startswith(b"PK") and http.calls[0]["url"] == TEST_API + "/metrics/export"
