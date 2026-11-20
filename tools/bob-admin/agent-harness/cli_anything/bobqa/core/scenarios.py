"""Scripted QA scenarios: the flows a coach runs in the BOB web app, done
through the same API calls, each step checked and reported pass / fail.

A scenario is a list of Steps. Steps run in order; after the first failure
the rest are skipped, except cleanup steps, which always run so no QA test
patient is left behind.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from cli_anything.bobadmin.core.client import BobAdminError, Client, Request, unwrap
from cli_anything.bobadmin.core.output import extract_rows
from cli_anything.bobqa.core import fixtures


class CheckFailed(Exception):
    """A step ran but the answer was not what the web app needs."""


class Skip(Exception):
    """A step does not apply to this run (e.g. no QA inbox set)."""


@dataclass
class Step:
    name: str
    fn: Callable[["Run"], Any]
    writes: bool = False
    cleanup: bool = False
    doc: str = ""


@dataclass
class Run:
    client: Client
    scenario: str
    practice: int | None = None
    email: str | None = None
    keep: bool = False
    run_id: str = field(default_factory=fixtures.new_run_id)
    state: dict[str, Any] = field(default_factory=dict)
    created: dict[str, Any] = field(default_factory=dict)
    results: list[dict[str, Any]] = field(default_factory=list)

    # ---- API helpers ---------------------------------------------------
    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return unwrap(self.client.call(Request("GET", path, params=params)))

    def send(self, method: str, path: str, body: Any = None) -> Any:
        guard_write(self.client)
        return unwrap(self.client.call(Request(method, path, body=body)))

    def status_of(self, path: str) -> int:
        """HTTP status of a GET (200, or the error status), without raising."""
        try:
            self.client.call(Request("GET", path))
            return 200
        except BobAdminError as e:
            if e.status is None:
                raise
            return e.status

    # ---- runner ----------------------------------------------------------
    def execute(self, steps: list[Step]) -> dict[str, Any]:
        failed = False
        started = time.time()
        for step in steps:
            if failed and not step.cleanup:
                self.results.append({"step": step.name, "status": "skip", "detail": "skipped after an earlier failure"})
                continue
            t0 = time.time()
            try:
                detail = step.fn(self)
                status = "pass"
            except Skip as e:
                status, detail = "skip", str(e)
            except (CheckFailed, BobAdminError) as e:
                status, detail = "fail", str(e)
                failed = True
            except Exception as e:  # a bug in the scenario itself; report it, keep cleaning up
                status, detail = "fail", f"{type(e).__name__}: {e}"
                failed = True
            self.results.append({"step": step.name, "status": status, "ms": int((time.time() - t0) * 1000),
                                 "detail": detail})
        return {
            "scenario": self.scenario,
            "env": self.client.env,
            "api": self.client.base,
            "runId": self.run_id,
            "passed": not any(r["status"] == "fail" for r in self.results),
            "counts": {s: sum(1 for r in self.results if r["status"] == s) for s in ("pass", "fail", "skip")},
            "seconds": round(time.time() - started, 1),
            "practiceId": self.practice,
            "created": self.created,
            "steps": self.results,
        }


def guard_write(client: Client) -> None:
    """bob-qa writes patient data, so it writes to the test platform only.
    BOB_ADMIN_PROD_WRITES does not unlock it: there is no override."""
    if client.env != "test":
        raise BobAdminError(
            f"bob-qa never writes to {client.env}: it creates patient data. Run writes against test only."
        )


def ids_of(data: Any) -> list[Any]:
    rows, _ = extract_rows(data)
    if rows is None and isinstance(data, list):
        rows = data
    return [r.get("id") for r in rows or [] if isinstance(r, dict)]


def need(cond: Any, message: str) -> None:
    if not cond:
        raise CheckFailed(message)


# --------------------------------------------------------------------------
# shared steps
# --------------------------------------------------------------------------
def step_sign_in(run: Run) -> str:
    me = run.get("/auth/me")
    need(isinstance(me, dict) and me.get("id"), "/auth/me answered without a user")
    run.state["me"] = me
    return f"signed in as user {me.get('id')}"


def step_practice(run: Run) -> str:
    coached = run.get("/practices/my-coached", {"limit": 100})
    rows, _ = extract_rows(coached)
    ids = [r.get("id") for r in rows or []]
    need(ids, "this account is not a coach or practice admin in any practice")
    if run.practice is None:
        default = (run.state.get("me") or {}).get("defaultPracticeId")
        run.practice = default if default in ids else ids[0]
        how = "default practice" if default in ids else "first coached practice"
    else:
        need(run.practice in ids, f"you are not a coach in practice {run.practice} (yours: {ids})")
        how = "chosen practice"
    return f"practice {run.practice} ({how}; {len(ids)} coached)"


def step_app_config(run: Run) -> str:
    cfg = run.get("/app-config")
    need(cfg is not None, "/app-config answered empty")
    return f"{len(cfg) if isinstance(cfg, (dict, list)) else 1} settings"


def step_settings(run: Run) -> str:
    s = run.get("/settings")
    need(isinstance(s, dict), "/settings did not answer an object")
    return "user settings read"


def step_products(run: Run) -> str:
    data = run.get("/products", {"practiceId": run.practice})
    tabs = data.get("tabs") if isinstance(data, dict) else data
    count = 0
    for t in tabs if isinstance(tabs, list) else []:
        if isinstance(t, dict):
            count += len(t.get("products") or [])
    if not count:
        rows, _ = extract_rows(data)
        count = len(rows or [])
    need(count or tabs, "/products answered no tabs and no products")
    return f"{len(tabs) if isinstance(tabs, list) else '?'} tabs, {count} products"


def step_templates(run: Run) -> str:
    data = run.get("/recommendation-templates")
    rows, _ = extract_rows(data)
    rows = rows if rows is not None else (data if isinstance(data, list) else [])
    return f"{len(rows)} recommendation templates"


def step_announcements(run: Run) -> str:
    data = run.get("/news/announcements")
    rows, _ = extract_rows(data)
    rows = rows if rows is not None else (data if isinstance(data, list) else [])
    return f"{len(rows)} live announcements"


def step_patient_list(run: Run) -> str:
    data = run.get("/patients", {"practiceId": run.practice, "limit": 1})
    need(isinstance(data, (dict, list)), "/patients did not answer a list")
    rows, meta = extract_rows(data)
    total = meta.get("totalItems") or meta.get("total")
    return f"patient list answers ({total if total is not None else len(rows or [])} in practice)"


# --------------------------------------------------------------------------
# coach-loop steps
# --------------------------------------------------------------------------
def step_create_patient(run: Run) -> str:
    body = fixtures.qa_patient(run.practice, run.run_id, run.email)
    p = run.send("POST", "/patients", body)
    need(isinstance(p, dict) and p.get("id"), "patient create answered without an id")
    run.created["patient"] = p["id"]
    if p.get("firstName") is not None:
        need(fixtures.is_qa_patient(p), f"patient saved with first name {p.get('firstName')!r}")
    return f"patient {p['id']} ({body['firstName']} {body['lastName']})"


def step_temporary_score(run: Run) -> str:
    s = run.send("POST", "/patients/scores", fixtures.temporary_score_payload(run.practice, run.run_id))
    need(isinstance(s, dict) and s.get("id"), "temporary score answered without an id")
    temp = s.get("patientId") or (s.get("patient") or {}).get("id")
    need(temp, "temporary score answered without the temporary patient's id")
    run.created["tempPatient"] = temp
    run.state["scoreId"] = s["id"]
    return f"score {s['id']} on temporary patient {temp}"


def step_assign(run: Run) -> str:
    run.send("POST", "/patients/assign-session",
             {"sourcePatientId": run.created["tempPatient"], "targetPatientId": run.created["patient"]})
    return f"session moved to patient {run.created['patient']}"


def step_scores_listed(run: Run) -> str:
    pid, sid = run.created["patient"], run.state["scoreId"]
    ids = ids_of(run.get(f"/patients/{pid}/scores"))
    need(sid in ids, f"score {sid} is not in patient {pid}'s scores ({ids})")
    return f"score {sid} listed ({len(ids)} on patient)"


def step_score_detail(run: Run) -> str:
    pid, sid = run.created["patient"], run.state["scoreId"]
    d = run.get(f"/patients/{pid}/scores/{sid}")
    need(isinstance(d, dict), "score detail did not answer an object")
    owner = d.get("patientId") or (d.get("patient") or {}).get("id")
    if owner is not None:
        need(owner == pid, f"score detail says patient {owner}, expected {pid}")
    kinds = d.get("assessments") or d.get("type")
    return f"score {sid} detail read (assessments: {kinds})"


def step_temp_gone(run: Run) -> str:
    temp = run.created["tempPatient"]
    status = run.status_of(f"/patients/{temp}")
    need(status in (404, 410), f"temporary patient {temp} still answers {status} after assign")
    run.created["tempPatientRemoved"] = True
    return f"temporary patient {temp} removed ({status})"


def step_resend(run: Run) -> str:
    if not run.email:
        raise Skip("no QA inbox set (bob-qa config set email ...)")
    pid, sid = run.created["patient"], run.state["scoreId"]
    run.send("POST", f"/patients/{pid}/scores/{sid}/resend-mail")
    return f"score email queued to the QA inbox"


def step_cleanup(run: Run) -> str:
    if run.keep:
        raise Skip(f"--keep: left {run.created or 'nothing'} on {run.client.env}")
    done = []
    temp = run.created.get("tempPatient")
    if temp and not run.created.get("tempPatientRemoved") and run.status_of(f"/patients/{temp}") == 200:
        run.send("DELETE", f"/patients/{temp}")
        done.append(f"temporary patient {temp}")
    pid = run.created.get("patient")
    if pid:
        run.send("DELETE", f"/patients/{pid}")
        status = run.status_of(f"/patients/{pid}")
        need(status in (404, 410), f"patient {pid} still answers {status} after delete")
        done.append(f"patient {pid}")
    run.created["cleanedUp"] = done
    return "deleted " + (", ".join(done) if done else "nothing (nothing was created)")


SIGN_IN = Step("sign-in", step_sign_in, doc="GET /auth/me")
PRACTICE = Step("practice", step_practice, doc="GET /practices/my-coached; pick the practice")

SCENARIOS: dict[str, dict[str, Any]] = {
    "smoke": {
        "doc": "Read-only: what the web app loads after sign-in. Sends no writes; safe on prod.",
        "steps": [
            SIGN_IN,
            PRACTICE,
            Step("app-config", step_app_config, doc="GET /app-config"),
            Step("settings", step_settings, doc="GET /settings"),
            Step("products", step_products, doc="GET /products?practiceId"),
            Step("recommendation-templates", step_templates, doc="GET /recommendation-templates"),
            Step("announcements", step_announcements, doc="GET /news/announcements"),
            Step("patient-list", step_patient_list, doc="GET /patients?practiceId&limit=1"),
        ],
    },
    "coach-loop": {
        "doc": ("A coach's core loop on test: QA test patient, BOB score with a temporary patient, "
                "assign the session, read it back, resend the score email to the QA inbox, "
                "read products and templates, then delete everything it made."),
        "steps": [
            SIGN_IN,
            PRACTICE,
            Step("create-test-patient", step_create_patient, writes=True, doc="POST /patients (QA-TEST name)"),
            Step("temporary-score", step_temporary_score, writes=True, doc="POST /patients/scores"),
            Step("assign-session", step_assign, writes=True, doc="POST /patients/assign-session"),
            Step("score-listed", step_scores_listed, doc="GET /patients/{id}/scores"),
            Step("score-detail", step_score_detail, doc="GET /patients/{id}/scores/{scoreId}"),
            Step("temporary-patient-removed", step_temp_gone, doc="GET /patients/{tempId} answers 404"),
            Step("resend-score-email", step_resend, writes=True, doc="POST .../scores/{scoreId}/resend-mail"),
            Step("products", step_products, doc="GET /products?practiceId"),
            Step("recommendation-templates", step_templates, doc="GET /recommendation-templates"),
            Step("cleanup", step_cleanup, writes=True, cleanup=True, doc="DELETE /patients/{id} (+ temp)"),
        ],
    },
}


def scenario_writes(name: str) -> bool:
    return any(s.writes for s in SCENARIOS[name]["steps"])


def plan(name: str) -> list[dict[str, Any]]:
    return [{"step": s.name, "writes": s.writes, "call": s.doc} for s in SCENARIOS[name]["steps"]]
