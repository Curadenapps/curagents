"""Test data bob-qa sends: QA test patients and BOB score payloads.

The score payload mirrors what the BOB web app itself sends (read from its
JS bundle on test.bobscore.app, 20 Nov 2026): `assessments: ["bobscore"]`,
legacy `type: "p1"`, a `meta` block, and `data.bobScore` with the score,
steps, meta and bleedingStatus blocks repeated flat for older backends.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

# Every patient bob-qa creates carries this first name, so anyone looking at the
# test practice (and `patients delete`) can tell QA data from anything else.
QA_FIRST_NAME = "QA-TEST"
QA_BIRTHDAY = "01/01/2000"  # DD/MM/YYYY, what the API expects
QA_PHONE = "+41790000000"


def new_run_id() -> str:
    return time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4]


def is_qa_patient(patient: dict[str, Any]) -> bool:
    return str(patient.get("firstName") or "").startswith(QA_FIRST_NAME)


def qa_patient(practice_id: int, run_id: str, email: str | None = None) -> dict[str, Any]:
    """CreatePatientDto for a clearly labelled QA test patient."""
    return {
        "firstName": QA_FIRST_NAME,
        "lastName": f"bob-qa {run_id}",
        "birthday": QA_BIRTHDAY,
        "gender": "i",
        "practiceId": int(practice_id),
        # The API requires an email. Without a QA inbox we use a reserved
        # domain that can never receive mail (RFC 2606).
        "email": email or f"qa+{run_id}@example.com",
        "phoneNumber": QA_PHONE,
        "consent": True,
        "subscription": bool(email),
    }


def healthy_tooth() -> dict[str, Any]:
    return {
        "missing": False, "crown": False, "implant": False, "bleeding": False,
        "palatalInner": False, "palatalOuter": False,
        "brushInner": 0, "brushOuter": 0, "furcation": False,
    }


def bob_score_block(final: int = 0) -> dict[str, Any]:
    return {
        "score": {"final": final, "dental-status": {"score": final, "bleeding-index": final}},
        "steps": {"dental-status": {"teeth-overview": {}, "bleeding-index": {}}},
        "meta": {"dental-status": {"teeth-overview": {"valid": True}, "bleeding-index": {"valid": True}}},
        "bleedingStatus": {"picture": "", "fileType": "jpeg", "pictureApproved": False},
    }


def score_payload(run_id: str, status: str = "finished", duration: int = 60) -> dict[str, Any]:
    """CreatePatientScoreDto: a BOB Index session on a healthy 32-tooth mouth map."""
    block = bob_score_block()
    return {
        "assessments": ["bobscore"],
        "type": "p1",
        "meta": {
            "timestamp": int(time.time()),
            "version": "1.0",
            "status": status,
            "recommendation": f"bob-qa {run_id}: automated QA session, not a real patient.",
            "duration": duration,
        },
        "data": {
            "fdiSchema": [healthy_tooth() for _ in range(32)],
            "bobScore": block,
            # flat copies, as the web app still sends them
            "steps": block["steps"],
            "meta": block["meta"],
            "bleedingStatus": block["bleedingStatus"],
            "score": block["score"],
        },
    }


def temporary_score_payload(practice_id: int, run_id: str) -> dict[str, Any]:
    """CreateTemporaryScoreDto: the same session, recorded before the patient is known."""
    return {"practiceId": int(practice_id), **score_payload(run_id)}
