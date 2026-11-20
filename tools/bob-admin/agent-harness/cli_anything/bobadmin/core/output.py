"""Human tables and --json output."""

from __future__ import annotations

import json
from typing import Any

import click

from cli_anything.bobadmin.core.client import unwrap  # noqa: F401  (re-exported)

# Columns we show first when they exist, in this order.
PREFERRED = [
    "id", "uuid", "code", "key", "valueKey", "name", "title", "firstName", "lastName", "email", "username",
    "role", "roles", "status", "kind", "productId", "countryCode", "country", "subsidiary", "subsidiaryName",
    "practiceName", "memberType", "active", "isActive", "devMode", "domain", "usageState",
    "sessions30d", "lastRecordedSessionAt", "createdAt", "updatedAt",
]
ID_KEYS = ("id", "uuid", "practiceId", "userId", "valueKey", "key", "code")
MAX_COLS = 8
MAX_WIDTH = 40


def extract_rows(data: Any) -> tuple[list[dict[str, Any]] | None, dict[str, Any]]:
    """Find the list of records in a response; return (rows, meta)."""
    data = unwrap(data)
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)] or None, {}
    if isinstance(data, dict):
        for key in ("data", "items", "rows", "results", "records", "practices", "users", "news", "products", "tokens"):
            v = data.get(key)
            if isinstance(v, list) and (not v or isinstance(v[0], dict)):
                meta = {k: v2 for k, v2 in data.items() if k != key and not isinstance(v2, (list, dict))}
                for block in ("meta", "pagination", "summary"):
                    if isinstance(data.get(block), dict):
                        meta.update({k: v2 for k, v2 in data[block].items() if not isinstance(v2, (list, dict))})
                return v, meta
    return None, {}


def dig(data: Any, path: str) -> Any:
    for part in path.split("."):
        if not isinstance(data, dict):
            return None
        data = data.get(part)
    return data


def summary_lines(data: dict[str, Any], skip: str) -> list[str]:
    """One line per group: top-level scalars, then 'overview: sessions=60  ...'."""
    top = skip.split(".")[0]
    loose = [f"{k}={_cell(v)}" for k, v in data.items()
             if k != top and not isinstance(v, (dict, list)) and v is not None]
    out = ["  ".join(loose)] if loose else []
    for k, v in data.items():
        if isinstance(v, dict):
            parts = [f"{k2}={_cell(v2)}" for k2, v2 in v.items()
                     if f"{k}.{k2}" != skip and not isinstance(v2, (dict, list)) and v2 is not None]
            if parts:
                out.append(f"{k}: " + "  ".join(parts))
    return out


def _cell(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, float):
        return f"{v:.2f}".rstrip("0").rstrip(".") if v != int(v) else str(int(v))
    if isinstance(v, list):
        v = ", ".join(_cell(x) for x in v)
    elif isinstance(v, dict):
        v = v.get("name") or v.get("code") or v.get("id") or json.dumps(v, ensure_ascii=False)
    s = str(v).replace("\n", " ")
    return s if len(s) <= MAX_WIDTH else s[: MAX_WIDTH - 1] + "…"


def table(rows: list[dict[str, Any]], columns: list[str] | None = None) -> str:
    if not rows:
        return "(no records)"
    keys: list[str] = []
    for r in rows:
        for k in r:
            if k not in keys:
                keys.append(k)
    if columns:
        cols = [c for c in columns if c in keys] or columns
    else:
        cols = [c for c in PREFERRED if c in keys][:MAX_COLS]
        if len(cols) < 3:
            cols += [k for k in keys if k not in cols and not isinstance(rows[0].get(k), (dict, list))][: MAX_COLS - len(cols)]
    widths = {c: max(len(c), *(len(_cell(r.get(c))) for r in rows)) for c in cols}
    line = "  ".join(c.ljust(widths[c]) for c in cols)
    sep = "  ".join("-" * widths[c] for c in cols)
    body = ["  ".join(_cell(r.get(c)).ljust(widths[c]) for c in cols) for r in rows]
    return "\n".join([line, sep, *body])


def emit(ctx: click.Context, data: Any, columns: list[str] | None = None, rows_key: str | None = None) -> None:
    """Print a response. rows_key points at a nested list (e.g. 'pending.items') for reports."""
    fields, ids_only = ctx.obj.get("fields"), ctx.obj.get("ids")
    if fields or ids_only:
        inner = unwrap(data)
        rows = dig(inner, rows_key) if rows_key and isinstance(inner, dict) else None
        if not isinstance(rows, list):
            rows, _ = extract_rows(data)
        if rows is None:
            rows = [inner] if isinstance(inner, dict) else []
        if ids_only:
            for r in rows:
                rid = next((r.get(k) for k in ID_KEYS if r.get(k) is not None), None)
                if rid is not None:
                    click.echo(str(rid))
            return
        projected = [{f: r.get(f) for f in fields} for r in rows]
        if ctx.obj.get("json"):
            click.echo(json.dumps(projected, indent=2, ensure_ascii=False, default=str))
        else:
            click.echo(table(projected, fields))
        return
    if ctx.obj.get("json"):
        click.echo(json.dumps(data, indent=2, ensure_ascii=False, default=str))
        return
    if rows_key:
        inner = unwrap(data)
        nested = dig(inner, rows_key) if isinstance(inner, dict) else None
        if isinstance(nested, list):
            lines = summary_lines(inner, rows_key)
            if lines:
                click.echo("\n".join(lines) + "\n")
            click.echo(table([r for r in nested if isinstance(r, dict)], columns))
            return
    rows, meta = extract_rows(data)
    data = unwrap(data)
    if rows is not None:
        click.echo(table(rows, columns))
        if meta:
            click.echo("\n" + "  ".join(f"{k}={v}" for k, v in meta.items()))
        return
    if isinstance(data, dict):
        width = max((len(k) for k in data), default=0)
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                click.echo(f"{k.ljust(width)}  {json.dumps(v, ensure_ascii=False, default=str)[:300]}")
            else:
                click.echo(f"{k.ljust(width)}  {v}")
        return
    click.echo(str(data))
