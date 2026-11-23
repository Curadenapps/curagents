"""One CLI command per API endpoint, generated from the bundled OpenAPI spec.

`bob-admin call <area> <action>`: e.g. `call users find-all --role coach`,
`call practices approve 12 --is-idb-office true ...`. Path parameters become
arguments (pass '-' to read IDs from stdin, one per line), query parameters
and body fields become options. Required body fields are checked after
--data / --set are merged, so a full body can also come from a file.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Callable

import click

from cli_anything.bobadmin.core import spec
from cli_anything.bobadmin.core.client import Request

RESERVED = {"data", "set", "help", "h"}


def kebab(s: str) -> str:
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "-", s)
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()


def _op_parts(op_id: str) -> tuple[str, str]:
    parts = op_id.split("_")
    controller = parts[0].replace("Controller", "")
    method = parts[1] if len(parts) >= 3 else parts[-1]
    return controller, method


def _ops() -> list[dict[str, Any]]:
    doc = spec.load()
    raw = []
    for path, methods in doc["paths"].items():
        for verb, op in methods.items():
            if verb not in spec.VERBS or not path.startswith(spec.PREFIX):
                continue  # /api/health has its own 'health' command
            controller, method = _op_parts(op.get("operationId", f"{verb}_{path}"))
            group = kebab((op.get("tags") or ["other"])[0])
            raw.append({"group": group, "name": kebab(method), "controller": controller,
                        "verb": verb.upper(), "path": path, "op": op})
    counts = Counter((r["group"], r["name"]) for r in raw)
    for r in raw:
        if counts[(r["group"], r["name"])] > 1:
            r["name"] = f"{kebab(r['controller'])}-{r['name']}"
    return raw


def _body_schema(op: dict[str, Any]) -> tuple[str | None, dict[str, Any]]:
    for ctype, c in op.get("requestBody", {}).get("content", {}).items():
        return ctype, spec._resolve(c.get("schema", {}))
    return None, {}


def _coerce(raw: str | None, schema: dict[str, Any]) -> Any:
    """Turn an option string into the type the spec asks for."""
    if raw is None:
        return None
    schema = spec._resolve(schema)
    t = schema.get("type")
    if t in ("integer", "number"):
        try:
            return int(raw) if t == "integer" or raw.isdigit() else float(raw)
        except ValueError:
            raise click.BadParameter(f"'{raw}' is not a number")
    if t == "boolean":
        low = raw.lower()
        if low in ("true", "yes", "1", "on"):
            return True
        if low in ("false", "no", "0", "off"):
            return False
        raise click.BadParameter(f"'{raw}' is not true/false")
    if t in ("object", "array") or t is None:
        try:
            return json.loads(raw)
        except ValueError:
            if t == "array":
                return [x.strip() for x in raw.split(",") if x.strip()]
            return raw
    return raw


def read_ids(values: tuple[str, ...]) -> list[str]:
    """'-' means: read IDs from stdin, one per line (output of --ids)."""
    out: list[str] = []
    for v in values:
        if v == "-":
            out += [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
        else:
            out.append(v)
    return out


def _help(op: dict[str, Any], verb: str, path: str, required: list[str]) -> str:
    text = (op.get("summary") or "").strip()
    desc = (op.get("description") or "").strip()
    lines = [text or f"{verb} {path}", "", f"{verb} {path}"]
    if desc and desc != text:
        lines += ["", desc[:600]]
    if required:
        lines += ["", "Required body fields: " + ", ".join(required)]
    return "\n".join(lines)


def build_group(run: Callable, body_from: Callable) -> click.Group:
    """Build `call` with one sub-group per API area."""

    @click.group("call")
    def call() -> None:
        """Every API endpoint as a command (generated from the spec).

        Use the friendly commands (users, practices, ...) first; reach for
        `call` for anything they don't cover. `bob-admin call <area> --help`
        lists an area's actions.
        """

    groups: dict[str, click.Group] = {}
    for item in sorted(_ops(), key=lambda r: (r["group"], r["name"])):
        g = groups.get(item["group"])
        if g is None:
            g = click.Group(item["group"], help=f"{item['op'].get('tags', ['Other'])[0]} endpoints.")
            groups[item["group"]] = g
            call.add_command(g)
        g.add_command(_make_command(item, run, body_from))
    return call


def _make_command(item: dict[str, Any], run: Callable, body_from: Callable) -> click.Command:
    op, verb, path = item["op"], item["verb"], item["path"]
    short_path = path[len(spec.PREFIX):] if path.startswith(spec.PREFIX) else path
    path_params = re.findall(r"{(\w+)}", short_path)
    query = [p for p in op.get("parameters", []) if p.get("in") == "query"]
    ctype, body = _body_schema(op)
    fields = body.get("properties", {}) if body else {}
    required = list(body.get("required", [])) if body else []
    multipart = bool(ctype and "multipart" in ctype)

    params: list[click.Parameter] = []
    for i, name in enumerate(path_params):
        params.append(click.Argument([f"path_{name.lower()}"], nargs=-1 if i == 0 else 1, required=True,
                                     metavar=name.upper() + ("..." if i == 0 else "")))
    option_map: dict[str, tuple[str, dict[str, Any], str]] = {}  # dest -> (api name, schema, where)
    for q in query:
        dest = f"q_{kebab(q['name']).replace('-', '_')}"
        sch = q.get("schema", {})
        params.append(click.Option([f"--{kebab(q['name'])}", dest], help=f"Query: {spec._type_of(sch)}"))
        option_map[dest] = (q["name"], sch, "query")
    for name, sch in fields.items():
        sch_r = spec._resolve(sch)
        flag = kebab(name)
        if flag in RESERVED or any(f"--{flag}" in p.opts for p in params if isinstance(p, click.Option)):
            flag = f"body-{flag}"
        dest = f"b_{flag.replace('-', '_')}"
        is_file = multipart and sch_r.get("format") == "binary"
        hint = "file path" if is_file else spec._type_of(sch)
        desc = (sch_r.get("description") or "").strip()
        req = " (required)" if name in required else ""
        params.append(click.Option([f"--{flag}", dest], help=f"Body: {hint}{req}. {desc}"[:300]))
        option_map[dest] = (name, sch, "file" if is_file else "body")
    if body and not multipart:
        params.append(click.Option(["--data"], metavar="JSON|@FILE", help="Whole body as JSON or @file.json; options override it."))
        params.append(click.Option(["--set", "sets"], multiple=True, metavar="KEY=VALUE", help="Extra body field."))
    if verb == "GET" and "out" not in option_map and not any("--out" in getattr(p, "opts", []) for p in params):
        params.append(click.Option(["--out"], metavar="FILE", help="Save the raw response (e.g. an .xlsx export) to a file."))

    def callback(**kw: Any) -> None:
        ctx = click.get_current_context()
        q_params: dict[str, Any] = {}
        b_fields: dict[str, Any] = {}
        files: dict[str, Any] = {}
        for dest, (api_name, sch, where) in option_map.items():
            val = kw.get(dest)
            if val is None:
                continue
            if where == "query":
                q_params[api_name] = val
            elif where == "file":
                p = Path(val)
                files[api_name] = (p.name, p.read_bytes())
            else:
                b_fields[api_name] = _coerce(val, sch)
        req_body = None
        if body and not multipart:
            req_body = body_from(b_fields, kw.get("data"), kw.get("sets") or ())
            missing = [f for f in required if f not in req_body]
            if missing:
                raise click.UsageError("Missing required body field(s): " + ", ".join(missing))
            if not req_body and verb == "GET":
                req_body = None
        elif multipart:
            req_body = b_fields or None
            missing = [f for f in required if f not in files and f not in b_fields]
            if missing:
                raise click.UsageError("Missing required field(s): " + ", ".join(missing))

        rest = {n: kw[f"path_{n.lower()}"] for n in path_params[1:]}
        firsts = read_ids(kw[f"path_{path_params[0].lower()}"]) if path_params else [None]
        if path_params and not firsts:
            raise click.UsageError(f"No {path_params[0]} given.")
        out = kw.get("out")
        if out and len(firsts) > 1:
            raise click.UsageError("--out saves one response; give a single ID.")
        for first in firsts:
            url = short_path
            if path_params:
                url = url.replace("{" + path_params[0] + "}", str(first))
            for n, v in rest.items():
                url = url.replace("{" + n + "}", str(v))
            run(ctx, Request(verb, url, params=q_params or None, body=req_body, files=files or None), out=out)

    return click.Command(item["name"], params=params, callback=callback,
                         help=_help(op, verb, short_path, required), short_help=(op.get("summary") or "")[:70])
