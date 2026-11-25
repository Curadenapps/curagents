"""Small Asana REST client for the support CLI.

Signs in with the owner's own Personal Access Token, read from the
environment (ASANA_TOKEN), never stored or printed. Only the calls the
support flow needs: read the board, read a task with its subtasks and
comments, add a subtask or an internal comment on a subtask, tick a subtask.
"""

from __future__ import annotations

import os
from typing import Any

import requests

API = "https://app.asana.com/api/1.0"
TOKEN_ENV = "ASANA_TOKEN"
WORKSPACE = "1171371475355741"
BOARD = "1200298616652229"          # App Tasks, Requests & Feedback
TIMEOUT = 30
TASK_FIELDS = ",".join([
    "name", "notes", "completed", "created_at", "modified_at", "permalink_url",
    "assignee.gid", "assignee.name", "parent.gid", "parent.name",
    "memberships.project.gid", "memberships.section.name",
    "custom_fields.name", "custom_fields.display_value",
])


class AsanaError(Exception):
    pass


class Asana:
    def __init__(self, token: str | None = None, http: requests.Session | None = None):
        self.token = token if token is not None else os.environ.get(TOKEN_ENV, "")
        self.http = http or requests.Session()
        self._me: dict[str, Any] | None = None

    @property
    def configured(self) -> bool:
        return bool(self.token)

    def _call(self, method: str, path: str, params: dict | None = None, body: dict | None = None) -> Any:
        if not self.token:
            raise AsanaError(
                f"No Asana token. Create a Personal Access Token in Asana (profile picture → Settings → Apps → "
                f"Developer apps → Personal access tokens) and save it as the Windows user environment variable "
                f"{TOKEN_ENV}, then open a new terminal."
            )
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        kwargs: dict[str, Any] = {"params": params or {}, "timeout": TIMEOUT, "headers": headers}
        if body is not None:
            kwargs["json"] = {"data": body}
        try:
            r = self.http.request(method, API + path, **kwargs)
        except requests.RequestException as e:
            raise AsanaError(f"Could not reach Asana: {e}") from e
        if r.status_code == 401:
            raise AsanaError(f"Asana rejected the token in {TOKEN_ENV} (401). Make a new one and replace it.")
        if not r.ok:
            try:
                msg = "; ".join(e.get("message", "") for e in r.json().get("errors", []))
            except ValueError:
                msg = r.text[:300]
            raise AsanaError(f"Asana {method} {path} -> {r.status_code}: {msg}")
        if not r.content:
            return None
        return r.json().get("data")

    # ---- reads ---------------------------------------------------------
    def me(self) -> dict[str, Any]:
        if self._me is None:
            self._me = self._call("GET", "/users/me", {"opt_fields": "gid,name,email"})
        return self._me

    def task(self, gid: str) -> dict[str, Any]:
        return self._call("GET", f"/tasks/{gid}", {"opt_fields": TASK_FIELDS})

    def subtasks(self, gid: str) -> list[dict[str, Any]]:
        return self._call("GET", f"/tasks/{gid}/subtasks",
                          {"opt_fields": "name,notes,completed,assignee.gid,assignee.name"}) or []

    def comments(self, gid: str) -> list[dict[str, Any]]:
        stories = self._call("GET", f"/tasks/{gid}/stories",
                             {"opt_fields": "text,created_at,created_by.gid,created_by.name,resource_subtype"}) or []
        return [s for s in stories if s.get("resource_subtype") == "comment_added"]

    def search(self, **filters: Any) -> list[dict[str, Any]]:
        params = {"opt_fields": TASK_FIELDS, "limit": 100, "sort_by": "created_at", **filters}
        return self._call("GET", f"/workspaces/{WORKSPACE}/tasks/search", params) or []

    def my_open_items(self, assignee: str = "me") -> list[dict[str, Any]]:
        """Open form tasks on the board and open '…: change in BOB Admin' subtasks assigned to the owner."""
        found: dict[str, dict[str, Any]] = {}
        for t in self.search(**{"projects.any": BOARD, "assignee.any": assignee, "completed": "false"}):
            found[t["gid"]] = t
        for t in self.search(**{"assignee.any": assignee, "completed": "false", "is_subtask": "true",
                                "text": "change in BOB Admin"}):
            found.setdefault(t["gid"], t)
        return list(found.values())

    # ---- writes (internal only: subtasks and subtask comments) ----------
    def add_subtask(self, parent_gid: str, name: str, notes: str, assignee: str | None = None) -> dict[str, Any]:
        body = {"name": name, "notes": notes}
        if assignee:
            body["assignee"] = assignee
        return self._call("POST", f"/tasks/{parent_gid}/subtasks", body=body)

    def update_task(self, gid: str, **fields: Any) -> dict[str, Any]:
        return self._call("PUT", f"/tasks/{gid}", body=fields)

    def comment(self, gid: str, text: str) -> dict[str, Any]:
        return self._call("POST", f"/tasks/{gid}/stories", body={"text": text})


def is_form_task(task: dict[str, Any]) -> bool:
    return "This task was submitted through" in (task.get("notes") or "")


def is_change_subtask(task: dict[str, Any]) -> bool:
    return bool(task.get("parent")) and "change in bob admin" in (task.get("name") or "").lower()


def task_link(gid: str) -> str:
    return f"https://app.asana.com/0/0/{gid}"
