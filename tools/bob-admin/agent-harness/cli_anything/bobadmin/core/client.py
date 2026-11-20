"""HTTP client for the BOB platform API (the backend behind BOB Admin).

Signs in as a real admin user (Bearer JWT), keeps the session in
~/.bob-admin/session-<env>.json, renews it with the refresh token on a 401,
and guards every write (dry run, confirmation, production lock).
"""

from __future__ import annotations

import json
import os
import stat
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests

# Where each environment's API lives. admin-test.bobscore.app calls the
# Phinamic test backend; admin.bobscore.app calls api.bobscore.app.
ENVIRONMENTS: dict[str, dict[str, str]] = {
    "test": {
        "api": "https://phinamic-api.quanht.site/api/v1",
        "admin": "https://admin-test.bobscore.app",
    },
    "prod": {
        "api": "https://api.bobscore.app/api/v1",
        "admin": "https://admin.bobscore.app",
    },
}
DEFAULT_ENV = "test"
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# Auth calls are writes in HTTP terms but change nothing on the platform.
NON_MUTATING_POSTS = {"/auth/login", "/auth/refresh", "/auth/logout"}
PROD_WRITE_ENV_FLAG = "BOB_ADMIN_PROD_WRITES"
TIMEOUT = 30


class BobAdminError(Exception):
    """Raised for anything the CLI should report and exit non-zero on."""

    def __init__(self, message: str, status: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def config_dir() -> Path:
    base = os.environ.get("BOB_ADMIN_HOME")
    path = Path(base) if base else Path.home() / ".bob-admin"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_api_url(env: str) -> str:
    override = os.environ.get("BOB_ADMIN_API_URL")
    if override:
        return override.rstrip("/")
    if env not in ENVIRONMENTS:
        raise BobAdminError(f"Unknown environment '{env}'. Use one of: {', '.join(ENVIRONMENTS)}")
    return ENVIRONMENTS[env]["api"]


@dataclass
class Session:
    env: str
    access_token: str | None = None
    refresh_token: str | None = None
    user: dict[str, Any] = field(default_factory=dict)
    # File name prefix: bob-admin keeps "session-<env>.json", bob-qa "qa-session-<env>.json",
    # so the two CLIs can be signed in as different people at the same time.
    name: str = "session"

    @property
    def path(self) -> Path:
        return config_dir() / f"{self.name}-{self.env}.json"

    @classmethod
    def load(cls, env: str, name: str = "session") -> "Session":
        s = cls(env=env, name=name)
        if s.path.exists():
            data = json.loads(s.path.read_text(encoding="utf8"))
            s.access_token = data.get("accessToken")
            s.refresh_token = data.get("refreshToken")
            s.user = data.get("user") or {}
        return s

    def save(self) -> None:
        self.path.write_text(
            json.dumps(
                {"accessToken": self.access_token, "refreshToken": self.refresh_token, "user": self.user},
                indent=1,
            ),
            encoding="utf8",
        )
        try:
            os.chmod(self.path, stat.S_IRUSR | stat.S_IWUSR)
        except OSError:
            pass

    def clear(self) -> None:
        self.access_token = self.refresh_token = None
        self.user = {}
        if self.path.exists():
            self.path.unlink()


@dataclass
class Request:
    method: str
    path: str
    params: dict[str, Any] | None = None
    body: Any = None
    files: dict[str, Any] | None = None

    @property
    def is_write(self) -> bool:
        return self.method.upper() in WRITE_METHODS and self.path not in NON_MUTATING_POSTS

    def describe(self, base: str) -> dict[str, Any]:
        out: dict[str, Any] = {"method": self.method.upper(), "url": base + self.path}
        if self.params:
            out["params"] = {k: v for k, v in self.params.items() if v is not None}
        if self.body is not None:
            out["body"] = self.body
        if self.files:
            out["files"] = sorted(self.files)
        return out


class Client:
    def __init__(self, env: str = DEFAULT_ENV, lang: str | None = None, http: requests.Session | None = None,
                 session_name: str = "session", cli_name: str = "bob-admin"):
        self.env = env
        self.base = resolve_api_url(env)
        self.lang = lang
        self.cli_name = cli_name
        self.session = Session.load(env, session_name)
        self.http = http or requests.Session()

    # ---- safety -------------------------------------------------------
    def check_write_allowed(self) -> None:
        if self.env == "prod" and os.environ.get(PROD_WRITE_ENV_FLAG) != "1":
            raise BobAdminError(
                "Writes to production are locked. Set "
                f"{PROD_WRITE_ENV_FLAG}=1 in your own shell to allow them for that shell only."
            )

    # ---- low level ----------------------------------------------------
    def _headers(self, auth: bool = True, json_body: bool = True) -> dict[str, str]:
        h = {"Accept": "application/json, */*"}
        if json_body:
            h["Content-Type"] = "application/json"
        if self.lang:
            h["x-custom-lang"] = self.lang
        if auth and self.session.access_token:
            h["Authorization"] = f"Bearer {self.session.access_token}"
        return h

    def _send(self, req: Request, auth: bool = True) -> requests.Response:
        params = {k: v for k, v in (req.params or {}).items() if v is not None and v != ""}
        kwargs: dict[str, Any] = {"params": params, "timeout": TIMEOUT}
        if req.files:
            kwargs["files"] = req.files
            if req.body:
                kwargs["data"] = req.body
            headers = self._headers(auth, json_body=False)
        else:
            headers = self._headers(auth, json_body=req.body is not None)
            if req.body is not None:
                kwargs["data"] = json.dumps(req.body)
        try:
            return self.http.request(req.method.upper(), self.base + req.path, headers=headers, **kwargs)
        except requests.RequestException as e:
            raise BobAdminError(f"Could not reach {self.base}: {e}") from e

    def refresh(self) -> bool:
        if not self.session.refresh_token:
            return False
        r = self._send(Request("POST", "/auth/refresh", body={"refreshToken": self.session.refresh_token}), auth=False)
        if not r.ok:
            return False
        data = unwrap(_json(r)) or {}
        token = data.get("accessToken") or data.get("token")
        if not token:
            return False
        self.session.access_token = token
        self.session.refresh_token = data.get("refreshToken") or self.session.refresh_token
        self.session.save()
        return True

    def call(self, req: Request, raw: bool = False, auth: bool = True) -> Any:
        """Send a request. Returns parsed JSON, or the Response when raw=True."""
        if req.is_write:
            self.check_write_allowed()
        if auth and not self.session.access_token:
            raise BobAdminError(f"Not signed in to {self.env}. Run: {self.cli_name} --env {self.env} auth login")
        r = self._send(req, auth=auth)
        if r.status_code == 401 and auth and self.refresh():
            r = self._send(req, auth=auth)
        if r.status_code == 401 and auth:
            raise BobAdminError(
                f"Session for {self.env} expired. Run: {self.cli_name} --env {self.env} auth login", 401, _json(r)
            )
        if not r.ok:
            payload = _json(r)
            msg = _error_message(payload) or r.reason or "request failed"
            raise BobAdminError(f"{req.method.upper()} {req.path} -> {r.status_code}: {msg}", r.status_code, payload)
        if raw:
            return r
        if r.status_code == 204 or not r.content:
            return {"ok": True}
        parsed = _json(r)
        return parsed if parsed is not None else {"ok": True, "text": r.text[:2000]}

    # ---- auth ---------------------------------------------------------
    def login(self, identity: str, password: str) -> dict[str, Any]:
        r = self._send(Request("POST", "/auth/login", body={"identity": identity, "password": password}), auth=False)
        if not r.ok:
            payload = _json(r)
            raise BobAdminError(f"Sign-in failed ({r.status_code}): {_error_message(payload) or r.reason}", r.status_code)
        data = unwrap(_json(r)) or {}
        if data.get("requiresPasswordChange"):
            return {"requiresPasswordChange": True, "passwordChangeToken": data.get("passwordChangeToken")}
        token = data.get("accessToken") or data.get("token")
        if not token:
            raise BobAdminError("Sign-in answered without an access token.")
        self.session.access_token = token
        self.session.refresh_token = data.get("refreshToken")
        user = dict(data.get("user") or {})
        caps = data.get("capabilities") or {}
        if isinstance(caps, dict) and caps.get("roles") and not user.get("roles"):
            user["roles"] = caps["roles"]  # the role lives in capabilities, not on the user
        self.session.user = user
        self.session.save()
        return {"requiresPasswordChange": False, "user": self.session.user, "capabilities": data.get("capabilities")}

    def complete_temporary_password(self, token: str, password: str) -> Any:
        r = self._send(Request("POST", "/auth/complete-temporary-password", body={"token": token, "password": password}), auth=False)
        if not r.ok:
            raise BobAdminError(f"Password change failed ({r.status_code}): {_error_message(_json(r)) or r.reason}")
        return _json(r) or {"ok": True}

    def logout(self) -> None:
        if self.session.refresh_token:
            try:
                self._send(Request("POST", "/auth/logout", body={"refreshToken": self.session.refresh_token}))
            except BobAdminError:
                pass
        self.session.clear()


def unwrap(data: Any) -> Any:
    """The API answers {success, message, data, timestamp}; return the data part."""
    if isinstance(data, dict) and "success" in data and "data" in data:
        inner = data["data"]
        extra = {k: v for k, v in data.items() if k not in ("success", "message", "data", "timestamp")}
        if extra and isinstance(inner, dict):
            return {**inner, **extra}
        if extra and isinstance(inner, list):
            return {"data": inner, **extra}
        return inner
    return data


def _json(r: requests.Response) -> Any:
    try:
        return r.json()
    except ValueError:
        return None


def _error_message(payload: Any) -> str | None:
    if isinstance(payload, dict):
        m = payload.get("message") or payload.get("error") or payload.get("detail")
        if isinstance(m, list):
            return "; ".join(map(str, m))
        if m:
            return str(m)
    return None
