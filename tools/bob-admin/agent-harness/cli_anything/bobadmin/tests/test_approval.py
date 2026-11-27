"""Automatic approval and duplicate matching. No network: practices are made up."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from cli_anything.bobadmin.core import approval
from cli_anything.bobadmin.tests.test_bobadmin import (  # noqa: F401  (fixtures)
    TEST_API, FakeResponse, home, http, invoke, signed_in,
)


NAMES = ["Amal Haddad", "Bruno Keller", "Chiara Rossi", "Dario Novak", "Elif Yilmaz", "Farah Saleh",
         "Goran Petrovic", "Hana Suzuki", "Ines Duarte", "Jonas Berg", "Karim Nasser", "Lea Frei"]
PLACES = ["Marina Smile", "Alpine Dental", "Harbour Teeth", "Cedar Oral Care", "Lotus Clinic", "Summit Dentistry",
          "Riverside Practice", "Oak Family Dental", "Bright Molar", "Coral Bay Dental", "Pine Hill Dental", "Sun Valley"]


def practice(pid, **kw):
    base = {"id": pid, "status": "active", "name": PLACES[pid % 12], "contactName": NAMES[pid % 12],
            "contactEmail": f"p{pid}@clinic{pid}.com", "contactPhone": None, "countryCode": "AE",
            "addressCity": ["Dubai", "Zurich", "Milan", "Ljubljana", "Izmir", "Sharjah", "Split", "Osaka", "Porto",
                            "Bergen", "Beirut", "Bern"][pid % 12],
            "addressZip": f"{pid * 7919 % 99999:05d}", "addressStreet": f"{pid * 37} {PLACES[(pid + 5) % 12]} Road",
            "subsidiaryId": "7", "createdAt": "2026-11-20T10:00:00.000Z"}
    base.update(kw)
    return base


def mx_yes(domain):
    return True


# ---------------------------------------------------------------- matching
def test_same_person_two_emails_is_strong():
    # The case Sean saw: same name (with "Jr."), same city, two different email providers.
    a = practice(2, contactName="Jenny Valdo Jr.", contactEmail="jennyvaldo@gmail.com",
                 name="Clinica Sorriso Valdo", addressCity="São Paulo", countryCode="BR")
    b = practice(1, contactName="jenny valdo", contactEmail="jenny.valdo1@hotmail.com",
                 name="Odonto Valdo", addressCity="Sao Paulo", countryCode="BR")
    level, reasons = approval.match(a, b)
    assert level == "strong"
    assert "same contact name" in reasons and "same city" in reasons


def test_common_name_alone_is_only_possible():
    a = practice(2, contactName="Maria Silva", countryCode="BR")
    b = practice(1, contactName="Maria Silva", countryCode="BR")
    assert approval.match(a, b)[0] == "possible"


def test_different_countries_same_name_no_match():
    a = practice(2, contactName="Maria Silva", countryCode="BR")
    b = practice(1, contactName="Maria Silva", countryCode="PT")
    assert approval.match(a, b)[0] is None


def test_same_email_two_real_practices_is_possible_not_strong():
    a = practice(2, contactEmail="owner@group.com", name="North Clinic")
    b = practice(1, contactEmail="owner@group.com", name="South Clinic")
    assert approval.match(a, b)[0] == "possible"


def test_gmail_dots_and_plus_are_the_same_email():
    assert approval.email_key("Jenny.Valdo+bob@gmail.com") == approval.email_key("jennyvaldo@googlemail.com")


def test_same_practice_name_and_postcode_is_strong():
    a = practice(2, name="Dental Studio Novak", addressZip="1000", contactName="A B")
    b = practice(1, name="Dental studio Novak", addressZip="1000", contactName="C D")
    assert approval.match(a, b)[0] == "strong"


def test_empty_phones_do_not_match():
    assert approval.match(practice(2), practice(1))[0] is None


# ---------------------------------------------------------------- checks
def test_clean_registration_is_approved():
    p = practice(9, status="pending")
    r = approval.check_practice(p, [p, practice(1), practice(2)], mx_lookup=mx_yes)
    assert r["verdict"] == "approve" and r["failed"] == []
    assert [c["check"] for c in r["checks"]] == approval.CHECK_ORDER


def test_duplicate_goes_to_a_person():
    old = practice(1, contactName="Jenny Valdo", addressCity="Recife", countryCode="BR")
    new = practice(2, status="pending", contactName="Jenny Valdo Jr", addressCity="Recife", countryCode="BR",
                   contactEmail="other@gmail.com")
    r = approval.check_practice(new, [old, new], mx_lookup=mx_yes)
    assert r["verdict"] == "exception" and r["failed"] == ["not_duplicate"]
    assert r["duplicate"] == "strong" and r["duplicates"][0]["practiceId"] == 1


def test_rejected_practices_are_not_duplicates():
    old = practice(1, status="rejected", contactName="Jenny Valdo", addressCity="Recife", countryCode="BR")
    new = practice(2, status="pending", contactName="Jenny Valdo", addressCity="Recife", countryCode="BR")
    assert approval.check_practice(new, [old, new], mx_lookup=mx_yes)["verdict"] == "approve"


def test_test_entries_internal_and_throwaway():
    t = approval.check_practice(practice(3, status="pending", name="Test clinic"), [], mx_lookup=mx_yes)
    assert "not_test" in t["failed"]
    i = approval.check_practice(practice(4, status="pending", contactEmail="someone@curaden.ae"), [], mx_lookup=mx_yes)
    assert i["failed"] == ["not_internal"]
    w = approval.check_practice(practice(5, status="pending", contactEmail="x@mailinator.com"), [], mx_lookup=mx_yes)
    assert w["failed"] == ["email"]


def test_word_test_inside_a_name_is_fine():
    r = approval.check_practice(practice(6, status="pending", contactName="Celeste Testoni"), [], mx_lookup=mx_yes)
    assert r["verdict"] == "approve"


def test_market_checks():
    # US is approved automatically by default (Sean, 26 Nov 2026)
    us = approval.check_practice(practice(7, status="pending", countryCode="US"), [], mx_lookup=mx_yes)
    assert us["verdict"] == "approve"
    none = approval.check_practice(practice(8, status="pending", subsidiaryId=None), [], mx_lookup=mx_yes)
    assert none["failed"] == ["market"]
    manual = approval.check_practice(practice(7, status="pending", countryCode="JP"), [], manual_countries=["jp"],
                                     mx_lookup=mx_yes)
    assert manual["failed"] == ["market"]


def test_email_domain_without_mail_server():
    r = approval.check_practice(practice(9, status="pending"), [], mx_lookup=lambda d: False)
    assert r["failed"] == ["email"]
    unknown = approval.check_practice(practice(9, status="pending"), [], mx_lookup=lambda d: None)
    assert unknown["verdict"] == "approve"


def test_incomplete_registration():
    r = approval.check_practice(practice(10, status="pending", contactName="", addressCity="", addressZip=""), [],
                                mx_lookup=mx_yes)
    assert "complete" in r["failed"]


def test_results_hold_no_personal_data():
    p = practice(11, status="pending", contactName="Jenny Valdo", contactEmail="jenny@clinic.com",
                 contactPhone="+55 11 99999 0000")
    text = json.dumps(approval.check_practice(p, [p, practice(1, contactName="Jenny Valdo", addressCity=p["addressCity"])],
                                              mx_lookup=mx_yes))
    for secret in ("Jenny", "jenny@clinic.com", "99999", PLACES[11]):
        assert secret not in text


def test_duplicate_groups_since():
    old_a = practice(1, contactName="Ana Lima", addressCity="Rio", countryCode="BR", createdAt="2026-09-25T00:00:00Z")
    old_b = practice(2, contactName="Ana Lima", addressCity="Rio", countryCode="BR", createdAt="2026-09-26T00:00:00Z")
    new_a = practice(3, contactName="Rui Costa", addressCity="Porto", countryCode="PT", createdAt="2026-11-20T00:00:00Z")
    new_b = practice(4, status="pending", contactName="Rui Costa", addressCity="Porto", countryCode="PT",
                     createdAt="2026-11-25T00:00:00Z")
    groups = approval.duplicate_groups([old_a, old_b, new_a, new_b], datetime(2026, 11, 1, tzinfo=timezone.utc))
    assert len(groups) == 1
    g = groups[0]
    assert g["key"] == "dup:3-4" and g["match"] == "strong" and g["newest"] == 4
    assert [p["id"] for p in g["practices"]] == [3, 4]


# ---------------------------------------------------------------- CLI
def page(items):
    return FakeResponse(200, {"success": True, "data": {"items": items, "meta": {"totalPages": 1, "currentPage": 1}}})


def setup_practices(http, items):
    http.queue.append(page(items))


def test_check_command_is_read_only(http, monkeypatch):
    signed_in()
    monkeypatch.setattr(approval, "dns_mx_lookup", lambda: mx_yes)
    setup_practices(http, [practice(1), practice(2, status="pending"), practice(3, status="pending", name="test")])
    r = invoke("--json", "practices", "check")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["pending"] == 2 and out["approve"] == 1 and out["exception"] == 1
    assert [c["method"] for c in http.calls] == ["GET"]
    assert http.calls[0]["params"]["limit"] == 100


def test_auto_approve_dry_run_sends_nothing(http, monkeypatch):
    signed_in()
    monkeypatch.setattr(approval, "dns_mx_lookup", lambda: mx_yes)
    setup_practices(http, [practice(2, status="pending"), practice(3, status="pending", name="Test")])
    r = invoke("--json", "--dry-run", "practices", "auto-approve")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["dryRun"] and out["approved"] == [] and [w["id"] for w in out["wouldApprove"]] == [2]
    assert out["exceptions"][0]["id"] == 3
    assert all(c["method"] == "GET" for c in http.calls)


def test_auto_approve_needs_yes(http):
    signed_in()
    r = invoke("--json", "practices", "auto-approve")
    assert r.exit_code != 0 and not http.calls


def test_auto_approve_with_yes(http, monkeypatch):
    signed_in()
    monkeypatch.setattr(approval, "dns_mx_lookup", lambda: mx_yes)
    setup_practices(http, [practice(2, status="pending"), practice(5, status="pending"), practice(6, status="pending")])
    http.queue.append(FakeResponse(200, {"success": True, "data": {"id": 2, "status": "pending"}}))
    r = invoke("--json", "--yes", "practices", "auto-approve", "--max", "1", "--training-in-days", "0")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["approved"] == [2] and out["waitingForNextRun"] == [5, 6]
    post = [c for c in http.calls if c["method"] == "POST"]
    assert len(post) == 1 and post[0]["url"] == TEST_API + "/practices/2/decisions/approve"
    body = post[0]["body"]
    assert body["isIdbOffice"] is True and body["hasIdbKit"] is True
    assert "Approved automatically" in body["note"]


def test_auto_approve_skips_a_practice_someone_just_decided(http, monkeypatch):
    signed_in()
    monkeypatch.setattr(approval, "dns_mx_lookup", lambda: mx_yes)
    setup_practices(http, [practice(2, status="pending")])
    http.queue.append(FakeResponse(200, {"success": True, "data": {"id": 2, "status": "active"}}))
    r = invoke("--json", "--yes", "practices", "auto-approve")
    out = json.loads(r.output)
    assert out["approved"] == [] and out["alreadyDecided"] == [2]
    assert not [c for c in http.calls if c["method"] == "POST"]


def test_auto_approve_prod_locked_without_flag(http):
    signed_in(env="prod")
    r = invoke("--json", "--env", "prod", "--yes", "practices", "auto-approve")
    assert r.exit_code != 0 and not http.calls


def test_auto_approve_prod_narrow_unlock(http, monkeypatch):
    signed_in(env="prod")
    monkeypatch.setenv("BOB_ADMIN_AUTO_APPROVE", "1")
    monkeypatch.setattr(approval, "dns_mx_lookup", lambda: mx_yes)
    setup_practices(http, [practice(2, status="pending")])
    http.queue.append(FakeResponse(200, {"success": True, "data": {"id": 2, "status": "pending"}}))
    r = invoke("--json", "--env", "prod", "--yes", "practices", "auto-approve")
    assert r.exit_code == 0, r.output
    assert json.loads(r.output)["approved"] == [2]
    # ...and the narrow flag doesn't unlock other prod writes
    r2 = invoke("--json", "--env", "prod", "--yes", "practices", "reject", "2", "--reason", "x")
    assert r2.exit_code != 0


def test_duplicates_command(http):
    signed_in()
    setup_practices(http, [
        practice(3, contactName="Rui Costa", addressCity="Porto", countryCode="PT", createdAt="2026-11-20T00:00:00Z"),
        practice(4, status="pending", contactName="Rui Costa", addressCity="Porto", countryCode="PT",
                 createdAt="2026-11-25T00:00:00Z"),
    ])
    r = invoke("--json", "practices", "duplicates", "--since", "2026-11-01")
    assert r.exit_code == 0, r.output
    out = json.loads(r.output)
    assert out["groups"] == 1 and out["items"][0]["key"] == "dup:3-4"
    assert "Rui" not in r.output
