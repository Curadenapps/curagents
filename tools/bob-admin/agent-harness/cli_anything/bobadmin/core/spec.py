"""Read the bundled OpenAPI spec (taken from the test API's Swagger page).

Lets agents discover every endpoint, including ones without a curated
command, and see what body each one expects.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

SPEC_PATH = Path(__file__).resolve().parent.parent / "openapi.json"
PREFIX = "/api/v1"
VERBS = ("get", "post", "put", "patch", "delete")


@lru_cache(maxsize=1)
def load() -> dict[str, Any]:
    return json.loads(SPEC_PATH.read_text(encoding="utf8"))


def _resolve(schema: dict[str, Any]) -> dict[str, Any]:
    ref = schema.get("$ref")
    if ref:
        return load()["components"]["schemas"][ref.split("/")[-1]]
    return schema


def operations(tag: str | None = None, search: str | None = None) -> list[dict[str, Any]]:
    out = []
    for path, methods in load()["paths"].items():
        for verb, op in methods.items():
            if verb not in VERBS:
                continue
            t = (op.get("tags") or ["Other"])[0]
            short = path[len(PREFIX):] if path.startswith(PREFIX) else path
            row = {
                "tag": t,
                "method": verb.upper(),
                "path": short,
                "summary": (op.get("summary") or "").strip(),
            }
            if tag and tag.lower() not in t.lower():
                continue
            if search and search.lower() not in f"{row['method']} {short} {row['summary']} {t}".lower():
                continue
            out.append(row)
    out.sort(key=lambda r: (r["tag"], r["path"], r["method"]))
    return out


def normalise(path: str) -> str:
    """Accept '/users', 'users', '/api/v1/users' (and Git Bash's mangled 'C:/.../users')."""
    path = path.replace("\\", "/")
    if ":" in path[:3] and "/Git/" in path:  # Git Bash turned '/users' into 'C:/Program Files/Git/users'
        path = path.split("/Git/", 1)[1]
    if not path.startswith("/"):
        path = "/" + path
    if path.startswith("/api/v1/"):
        path = path[len("/api/v1"):]
    return path


def find(method: str, path: str) -> dict[str, Any] | None:
    path = normalise(path)
    full = path if path.startswith(PREFIX) or path.startswith("/api/health") else PREFIX + path
    op = load()["paths"].get(full, {}).get(method.lower())
    return op


def describe(method: str, path: str) -> dict[str, Any]:
    op = find(method, path)
    if op is None:
        raise KeyError(f"No operation {method.upper()} {path} in the spec")
    params = [
        {
            "name": p["name"],
            "in": p.get("in"),
            "required": bool(p.get("required")),
            "type": _type_of(p.get("schema", {})),
        }
        for p in op.get("parameters", [])
        if p.get("name") != "x-custom-lang"
    ]
    body = None
    content = op.get("requestBody", {}).get("content", {})
    for ctype, c in content.items():
        body = {"contentType": ctype, "fields": _fields(c.get("schema", {}))}
        break
    return {
        "method": method.upper(),
        "path": normalise(path),
        "tag": (op.get("tags") or ["Other"])[0],
        "summary": op.get("summary") or "",
        "description": op.get("description") or "",
        "parameters": params,
        "body": body,
    }


def _type_of(schema: dict[str, Any]) -> str:
    schema = _resolve(schema)
    if "enum" in schema:
        return "|".join(map(str, schema["enum"]))
    t = schema.get("type", "object")
    if t == "array":
        return f"array<{_type_of(schema.get('items', {}))}>"
    return t


def _fields(schema: dict[str, Any]) -> list[dict[str, Any]]:
    schema = _resolve(schema)
    required = set(schema.get("required", []))
    fields = []
    for name, sub in schema.get("properties", {}).items():
        sub_r = _resolve(sub)
        fields.append(
            {
                "name": name,
                "type": _type_of(sub),
                "required": name in required,
                "description": (sub_r.get("description") or "").strip(),
            }
        )
    return fields
