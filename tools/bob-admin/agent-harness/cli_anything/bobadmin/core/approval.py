"""Automatic practice approval: the checks, and duplicate sign-up matching.

Pure logic, no HTTP, so it can be tested on its own. The CLI commands
`practices check`, `practices auto-approve` and `practices duplicates` feed it the
practice list from the API.

The checks follow Stage 3 of the BOB onboarding concept (Sean, 6 and 10 Nov 2026):
a pending registration is approved without a person only when every check passes;
anything else goes to a person (the exceptions queue). The rejection history on
prod (Nov 2026: duplicates, test entries, staff registrations, spam) shaped the
test, internal and duplicate checks.

Results carry practice IDs, countries and reasons only, never names, emails or
phone numbers, so they can go into run logs and Asana task notes as they are.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, Callable, Iterable

# --------------------------------------------------------------------------
# settings (overridable from the CLI)
# --------------------------------------------------------------------------
# Countries that always go to a person. US: BAAs aren't in place yet (concept, Stage 3).
DEFAULT_MANUAL_COUNTRIES = ("us",)

# Staff and partner-tech addresses: someone at Curaden or Phinamic registering a
# practice is almost always a test or a set-up that needs a person ("Setup the
# subsidiary and the main clinic instead", "dont test on PROD").
INTERNAL_DOMAIN_PARTS = ("curaden", "curaprox", "bobscore", "phinamic", "quanht")

# Throwaway and placeholder mail domains.
THROWAWAY_DOMAINS = {
    "example.com", "example.org", "example.net", "test.com", "test.de", "mailinator.com",
    "yopmail.com", "guerrillamail.com", "sharklasers.com", "10minutemail.com", "tempmail.com",
    "temp-mail.org", "trashmail.com", "maildrop.cc", "getnada.com", "dispostable.com",
    "fakeinbox.com", "throwawaymail.com", "mailnesia.com", "emailondeck.com",
}

# Words that mark test or junk entries when they stand on their own.
TEST_WORDS = {
    "test", "tests", "testing", "tester", "qa", "demo", "dummy", "fake", "sample", "asdf",
    "qwerty", "lorem", "ipsum", "xxx", "xxxx", "random", "teste", "prueba", "probe",
}

# Titles and name suffixes that don't tell two people apart.
PERSON_NOISE = {
    "dr", "dra", "drs", "dr.", "dds", "dmd", "md", "phd", "msc", "bsc", "prof", "mr", "mrs", "ms",
    "jr", "junior", "sr", "senior", "filho", "neto", "sobrinho", "ii", "iii",
}

CHECK_ORDER = ["complete", "email", "not_test", "not_internal", "market", "not_duplicate"]

MxLookup = Callable[[str], "bool | None"]


# --------------------------------------------------------------------------
# normalising
# --------------------------------------------------------------------------
def fold(s: Any) -> str:
    """Lower case, accents off, anything but letters and digits becomes one space."""
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def person_key(name: Any) -> str:
    tokens = [t for t in fold(name).split() if t not in PERSON_NOISE and len(t) > 1]
    return " ".join(sorted(tokens))


def email_parts(email: Any) -> tuple[str, str]:
    e = str(email or "").strip().lower()
    if "@" not in e:
        return "", ""
    local, domain = e.rsplit("@", 1)
    local = local.split("+", 1)[0]
    if domain in ("gmail.com", "googlemail.com"):
        local, domain = local.replace(".", ""), "gmail.com"
    return local, domain


def email_key(email: Any) -> str:
    local, domain = email_parts(email)
    return f"{local}@{domain}" if local and domain else ""


def phone_key(phone: Any) -> str:
    digits = re.sub(r"\D", "", str(phone or ""))
    return digits[-9:] if len(digits) >= 6 else ""


def zip_key(z: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", fold(z))


def similar(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def country(p: dict[str, Any]) -> str:
    return str(p.get("countryCode") or "").strip().lower()


# --------------------------------------------------------------------------
# duplicates
# --------------------------------------------------------------------------
def match(a: dict[str, Any], b: dict[str, Any]) -> tuple[str | None, list[str]]:
    """How strongly two practices look like the same sign-up.

    Returns ("strong" | "possible" | None, reasons). Strong means the same person or
    practice, safe to ask them about it. Possible means a person should look first
    (a common name, a shared front-desk phone, one owner with two real practices).
    """
    same_country = country(a) and country(a) == country(b)
    ea, eb = email_key(a.get("contactEmail")), email_key(b.get("contactEmail"))
    same_email = bool(ea) and ea == eb
    pa, pb = phone_key(a.get("contactPhone")), phone_key(b.get("contactPhone"))
    same_phone = bool(pa) and pa == pb
    ka, kb = person_key(a.get("contactName")), person_key(b.get("contactName"))
    same_person = bool(ka) and (ka == kb or similar(ka, kb) >= 0.92)
    name_sim = similar(fold(a.get("name")), fold(b.get("name")))
    za, zb = zip_key(a.get("addressZip")), zip_key(b.get("addressZip"))
    same_zip = bool(za) and za == zb
    ca, cb = fold(a.get("addressCity")), fold(b.get("addressCity"))
    same_city = bool(ca) and ca == cb
    street_sim = similar(fold(a.get("addressStreet")), fold(b.get("addressStreet")))
    local_sim = similar(email_parts(a.get("contactEmail"))[0], email_parts(b.get("contactEmail"))[0])

    reasons = []
    if same_email:
        reasons.append("same email")
    if same_phone:
        reasons.append("same phone")
    if same_person:
        reasons.append("same contact name")
    if name_sim >= 0.85:
        reasons.append("same practice name" if name_sim >= 0.98 else "similar practice name")
    if same_zip:
        reasons.append("same postcode")
    elif same_city:
        reasons.append("same city")
    if street_sim >= 0.85:
        reasons.append("same street" if street_sim >= 0.98 else "similar street")
    if local_sim >= 0.8 and not same_email:
        reasons.append("similar email")

    corroborated = any([same_city, same_zip, street_sim >= 0.85, name_sim >= 0.85, local_sim >= 0.8, same_phone])
    if same_email and (name_sim >= 0.85 or same_zip or street_sim >= 0.85):
        return "strong", reasons
    if same_country and same_person and corroborated:
        return "strong", reasons
    if same_country and name_sim >= 0.92 and (same_zip or street_sim >= 0.85):
        return "strong", reasons
    if same_email or same_phone or (same_country and same_person) or (same_country and name_sim >= 0.92 and same_city):
        return "possible", reasons
    return None, []


def find_duplicates(p: dict[str, Any], others: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Other practices (rejected ones left out) that look like the same sign-up as p."""
    out = []
    for o in others:
        if o.get("id") == p.get("id") or o.get("status") == "rejected":
            continue
        level, reasons = match(p, o)
        if level:
            out.append({"practiceId": o.get("id"), "status": o.get("status"), "countryCode": o.get("countryCode"),
                        "createdAt": o.get("createdAt"), "match": level, "reasons": reasons})
    out.sort(key=lambda d: (d["match"] != "strong", str(d.get("createdAt") or "")))
    return out


# --------------------------------------------------------------------------
# the checks
# --------------------------------------------------------------------------
def is_internal(email: Any) -> bool:
    domain = email_parts(email)[1]
    return any(part in domain for part in INTERNAL_DOMAIN_PARTS)


def looks_like_test(p: dict[str, Any]) -> list[str]:
    hits = []
    for field in ("name", "contactName", "addressStreet", "addressCity"):
        words = set(fold(p.get(field)).split())
        if words & TEST_WORDS:
            hits.append(field)
        elif re.search(r"(.)\1{4,}", fold(p.get(field)).replace(" ", "")):
            hits.append(field)
    local = email_parts(p.get("contactEmail"))[0]
    if set(re.split(r"[^a-z0-9]+", str(p.get("contactEmail") or "").lower().split("@")[0])) & TEST_WORDS:
        hits.append("contactEmail")
    elif local and re.fullmatch(r"(test|qa|demo)\d*", local):
        hits.append("contactEmail")
    return hits


def check_practice(p: dict[str, Any], all_practices: list[dict[str, Any]],
                   manual_countries: Iterable[str] = DEFAULT_MANUAL_COUNTRIES,
                   mx_lookup: MxLookup | None = None) -> dict[str, Any]:
    """Run every check on one pending practice. Verdict 'approve' only when all pass."""
    manual = {c.strip().lower() for c in manual_countries if c and c.strip()}
    checks: list[dict[str, Any]] = []

    def add(name: str, ok: bool, detail: str = "") -> None:
        checks.append({"check": name, "ok": ok, "detail": detail})

    missing = [f for f in ("name", "contactName", "contactEmail", "countryCode") if not str(p.get(f) or "").strip()]
    if not (str(p.get("addressCity") or "").strip() or str(p.get("addressZip") or "").strip()):
        missing.append("addressCity/addressZip")
    add("complete", not missing, ("missing " + ", ".join(missing)) if missing else "")

    local, domain = email_parts(p.get("contactEmail"))
    if not local or not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", domain or ""):
        add("email", False, "not a valid address")
    elif domain in THROWAWAY_DOMAINS:
        add("email", False, f"throwaway or placeholder domain ({domain})")
    else:
        mx = mx_lookup(domain) if mx_lookup else None
        if mx is False:
            add("email", False, f"domain {domain} can't receive mail (no MX or A record)")
        else:
            add("email", True, "" if mx else "mail server not checked")

    test_hits = looks_like_test(p)
    add("not_test", not test_hits, ("looks like a test entry in " + ", ".join(test_hits)) if test_hits else "")

    internal = is_internal(p.get("contactEmail"))
    add("not_internal", not internal, "Curaden / Phinamic address: a person sets these up" if internal else "")

    cc = country(p)
    if not p.get("subsidiaryId"):
        add("market", False, f"no subsidiary for country '{cc or '?'}': not a launched market")
    elif cc in manual:
        add("market", False, f"country '{cc}' is approved by a person (manual list)")
    else:
        add("market", True, f"allocated to subsidiary {p.get('subsidiaryId')}")

    dups = find_duplicates(p, all_practices)
    strong = [d for d in dups if d["match"] == "strong"]
    if strong:
        add("not_duplicate", False, "same sign-up as practice " + ", ".join(str(d["practiceId"]) for d in strong))
    elif dups:
        add("not_duplicate", False, "possible duplicate of practice " + ", ".join(str(d["practiceId"]) for d in dups))
    else:
        add("not_duplicate", True)

    failed = [c["check"] for c in checks if not c["ok"]]
    return {
        "id": p.get("id"),
        "countryCode": p.get("countryCode"),
        "subsidiaryId": p.get("subsidiaryId"),
        "createdAt": p.get("createdAt"),
        "verdict": "approve" if not failed else "exception",
        "failed": failed,
        "duplicate": "strong" if strong else ("possible" if dups else None),
        "checks": checks,
        "duplicates": dups,
    }


def approval_note(result: dict[str, Any], tool: str = "bob-admin practices auto-approve") -> str:
    passed = ", ".join(c["check"] for c in result["checks"] if c["ok"])
    return (f"Approved automatically by {tool} on {date.today().isoformat()}. Checks passed: {passed}. "
            "IDB office, IDB kit and training date are placeholders: confirm them in onboarding.")[:1000]


def training_date(days: int, today: date | None = None) -> str:
    return ((today or date.today()) + timedelta(days=days)).isoformat()


# --------------------------------------------------------------------------
# duplicate scan over practices already in the system
# --------------------------------------------------------------------------
def parse_when(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def duplicate_groups(practices: list[dict[str, Any]], since: datetime,
                     include_possible: bool = False) -> list[dict[str, Any]]:
    """Groups of practices that look like one sign-up, where at least one was created since `since`."""
    live = [p for p in practices if p.get("status") != "rejected"]
    recent = [p for p in live if (parse_when(p.get("createdAt")) or since) >= since]
    parent: dict[Any, Any] = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    edges: dict[tuple, dict[str, Any]] = {}
    by_id = {p.get("id"): p for p in live}
    for p in recent:
        for d in find_duplicates(p, live):
            if d["match"] != "strong" and not include_possible:
                continue
            a, b = sorted([p.get("id"), d["practiceId"]], key=str)
            key = (a, b)
            if key not in edges or (d["match"] == "strong" and edges[key]["match"] != "strong"):
                edges[key] = {"a": a, "b": b, "match": d["match"], "reasons": d["reasons"]}
            parent[find(a)] = find(b)

    groups: dict[Any, dict[str, Any]] = {}
    for (a, b), e in edges.items():
        g = groups.setdefault(find(a), {"ids": set(), "pairs": []})
        g["ids"].update([a, b])
        g["pairs"].append(e)

    out = []
    for g in groups.values():
        members = sorted((by_id[i] for i in g["ids"] if i in by_id), key=lambda p: str(p.get("createdAt") or ""))
        ids = [p.get("id") for p in members]
        out.append({
            "key": "dup:" + "-".join(str(i) for i in sorted(ids, key=lambda x: int(x) if str(x).isdigit() else 0)),
            "match": "strong" if any(e["match"] == "strong" for e in g["pairs"]) else "possible",
            "internal": any(is_internal(p.get("contactEmail")) for p in members),
            "practices": [{"id": p.get("id"), "status": p.get("status"), "countryCode": p.get("countryCode"),
                           "subsidiaryId": p.get("subsidiaryId"), "createdAt": p.get("createdAt"),
                           "coachCount": p.get("coachCount")} for p in members],
            "newest": ids[-1] if ids else None,
            "reasons": sorted({r for e in g["pairs"] for r in e["reasons"]}),
        })
    out.sort(key=lambda g: str(g["practices"][-1].get("createdAt") or ""), reverse=True)
    return out


# --------------------------------------------------------------------------
# mail server lookup
# --------------------------------------------------------------------------
def dns_mx_lookup() -> MxLookup | None:
    """True: the domain takes mail. False: it can't. None: couldn't tell (no DNS library, timeout)."""
    try:
        import dns.exception
        import dns.resolver
    except ImportError:
        return None
    cache: dict[str, bool | None] = {}
    resolver = dns.resolver.Resolver()
    resolver.lifetime = 5.0

    def lookup(domain: str) -> bool | None:
        if domain in cache:
            return cache[domain]
        result: bool | None
        try:
            resolver.resolve(domain, "MX")
            result = True
        except dns.resolver.NXDOMAIN:
            result = False
        except dns.resolver.NoAnswer:
            try:  # no MX: mail goes to the A record (RFC 5321 implicit MX)
                resolver.resolve(domain, "A")
                result = True
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
                result = False
            except dns.exception.DNSException:
                result = None
        except dns.exception.DNSException:
            result = None
        cache[domain] = result
        return result

    return lookup
