"""Sweep bookkeeping: what was already written, a local log, and the Notion run log.

The local files live next to the bob-admin sessions in ~/.bob-admin. The
Notion run-log row (RUNTIME.md "Agent run log") and the registry switch use
the REST API with NOTION_API_KEY when it is set; the key is read from the
environment and never printed.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

from cli_anything.bobadmin.core.client import config_dir

STATE_FILE = "support-sweep-state.json"
LOG_FILE = "support-sweep.log"
HISTORY_FILE = "support-history.jsonl"
NOTION_ENV = "NOTION_API_KEY"
NOTION_VERSION = "2025-09-03"
REGISTRY_DS = "ca4bcf81-b541-49e6-9da5-1fc8bfd38418"
RUNLOG_DS = "9b260587-5c0d-4d90-947e-b6e10ba159df"
REGISTRY_NAME = "Support sweep (Fabian)"
ZURICH = ZoneInfo("Europe/Zurich")


def now() -> datetime:
    return datetime.now(ZURICH)


def load_state() -> dict[str, str]:
    p = config_dir() / STATE_FILE
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_state(state: dict[str, str]) -> None:
    p = config_dir() / STATE_FILE
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, indent=2), encoding="utf-8")


def log_local(line: str) -> None:
    p = config_dir() / LOG_FILE
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(f"{now():%Y-%m-%d %H:%M} {line}\n")


def record(entry: dict[str, Any]) -> None:
    """One anonymised line per handled request (task id, type, verdict, action): what `stats` learns from."""
    p = config_dir() / HISTORY_FILE
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"at": now().isoformat(timespec="seconds"), **entry}, ensure_ascii=False) + "\n")


def history() -> list[dict[str, Any]]:
    p = config_dir() / HISTORY_FILE
    if not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            continue
    return out


# --------------------------------------------------------------------------
# Notion (optional)
# --------------------------------------------------------------------------
class Notion:
    def __init__(self, http: requests.Session | None = None):
        self.key = os.environ.get(NOTION_ENV, "")
        self.http = http or requests.Session()

    @property
    def configured(self) -> bool:
        return bool(self.key)

    def _call(self, method: str, path: str, body: dict | None = None) -> dict[str, Any]:
        r = self.http.request(method, "https://api.notion.com/v1" + path, json=body, timeout=30, headers={
            "Authorization": f"Bearer {self.key}", "Notion-Version": NOTION_VERSION})
        if not r.ok:
            raise RuntimeError(f"Notion {method} {path} -> {r.status_code}")
        return r.json()

    def registry_row(self) -> dict[str, Any] | None:
        """The registry row whose 'Started by' names the sweep, or None."""
        cursor = None
        while True:
            body: dict[str, Any] = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            data = self._call("POST", f"/data_sources/{REGISTRY_DS}/query", body)
            for row in data.get("results", []):
                if REGISTRY_NAME.lower() in _text(row.get("properties", {}).get("Started by")).lower():
                    return row
            if not data.get("has_more"):
                return None
            cursor = data.get("next_cursor")

    def write_run(self, outcome: str, summary: str, error: str = "", registry_id: str | None = None,
                  version: str = "") -> None:
        t = now()
        props: dict[str, Any] = {
            "Run": {"title": [{"text": {"content": f"app-support {t:%Y-%m-%d %H:%M}"}}]},
            "Agent": {"select": {"name": "app-support"}},
            "When": {"date": {"start": t.isoformat(timespec="minutes")}},
            "Where": {"select": {"name": "PC"}},
            "Account": {"select": {"name": "Fabian"}},
            "Outcome": {"select": {"name": outcome}},
            "Summary": {"rich_text": [{"text": {"content": summary[:1900]}}]},
            "Error": {"rich_text": [{"text": {"content": error[:1900]}}]},
            "Spec commit": {"rich_text": [{"text": {"content": version}}]},
        }
        if registry_id:
            props["Registry"] = {"relation": [{"id": registry_id}]}
        self._call("POST", "/pages", {"parent": {"type": "data_source_id", "data_source_id": RUNLOG_DS},
                                      "properties": props})


def _text(prop: Any) -> str:
    if not isinstance(prop, dict):
        return ""
    for key in ("title", "rich_text"):
        if isinstance(prop.get(key), list):
            return "".join(x.get("plain_text", "") for x in prop[key])
    sel = prop.get("select") or {}
    return sel.get("name", "") if isinstance(sel, dict) else ""


def registry_account(row: dict[str, Any]) -> str:
    return _text(row.get("properties", {}).get("Account"))
