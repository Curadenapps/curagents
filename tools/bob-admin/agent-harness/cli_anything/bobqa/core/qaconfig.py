"""Local bob-qa settings (QA inbox, default practice) and run reports.

Kept in the user's own ~/.bob-admin folder, never in the repository.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from cli_anything.bobadmin.core.client import config_dir

KEYS = {
    "email": "Inbox for score emails during QA runs (a test inbox, never a real patient's).",
    "practice": "Practice ID used for QA runs when --practice is not given.",
}


def path() -> Path:
    return config_dir() / "qa-config.json"


def load() -> dict[str, Any]:
    p = path()
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf8"))
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def save(data: dict[str, Any]) -> None:
    path().write_text(json.dumps(data, indent=1), encoding="utf8")


def runs_dir() -> Path:
    d = config_dir() / "qa-runs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_report(report: dict[str, Any]) -> Path:
    p = runs_dir() / f"{report['scenario']}-{report['runId']}.json"
    p.write_text(json.dumps(report, indent=1, ensure_ascii=False, default=str), encoding="utf8")
    return p
