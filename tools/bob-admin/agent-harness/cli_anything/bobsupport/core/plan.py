"""Turn a support request into a plan: what the Admin Console shows, and what to do.

Read-only by itself. A plan's actions are bob-admin API requests that only
run through `bob-support do`, behind the same guards as bob-admin (prod
unlock, dry run, a yes).
"""

from __future__ import annotations

import hashlib
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from cli_anything.bobadmin.core.client import BobAdminError, Client, Request, unwrap
from cli_anything.bobsupport.core import form, playbook

VERDICTS = {
    "change": "Admin Console change needed",
    "need-info": "Needs details from the requester first",
    "reply": "Reply only, nothing to change",
    "no-account": "No BOB account found for that email",
    "check": "Owner decides",
    "solved": "Solved: they signed in after asking",
}
# requests that are about getting in: solved once the person has signed in since asking
SOLVABLE_BY_SIGN_IN = {"activation-status", "temp-password"}
CLOSABLE_SECTION = "Awaiting Feedback"
CHANGE_RE = re.compile(r"replace with\s+[\"“„']([^\"”“']+)[\"”“']", re.I)


@dataclass
class Action:
    label: str
    request: Request
    cli: str  # the same change as a bob-admin line, for the record

    def describe(self, base: str) -> dict[str, Any]:
        return {"label": self.label, "bob_admin": self.cli, **self.request.describe(base)}


@dataclass
class Case:
    """One request: the form task, plus the change subtask when that's what was assigned."""
    task_gid: str
    title: str
    submission: form.Submission
    section: str = ""
    change_gid: str | None = None
    change_notes: str = ""
    comments: list[str] = field(default_factory=list)
    done: list[str] = field(default_factory=list)  # what `bob-support do` already did here
    created_at: str = ""  # when the request came in (ISO); "solved" means signed in after this

    @property
    def closable(self) -> bool:
        return self.section == CLOSABLE_SECTION and not self.change_gid


@dataclass
class Plan:
    case: Case
    rtype: playbook.RequestType
    matched: list[str]
    verdict: str = "reply"
    facts: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    actions: list[Action] = field(default_factory=list)
    next_step: str = ""
    reply_hint: str = ""
    user: dict[str, Any] | None = None
    practices: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self, base: str = "") -> dict[str, Any]:
        return {
            "task": self.case.task_gid, "changeSubtask": self.case.change_gid, "title": self.case.title,
            "type": self.rtype.key, "typeLabel": self.rtype.label, "matched": self.matched,
            "verdict": self.verdict, "verdictLabel": VERDICTS[self.verdict],
            "closable": self.verdict == "solved" and self.case.closable, "section": self.case.section,
            "facts": self.facts, "warnings": self.warnings,
            "actions": [a.describe(base) for a in self.actions],
            "nextStep": self.next_step, "replyHint": self.reply_hint,
            "userId": (self.user or {}).get("id"),
            "practiceIds": [p.get("id") for p in self.practices],
        }

    def note(self, env: str) -> str:
        """The internal note the sweep leaves in Asana (no email addresses)."""
        lines = [
            f"Type: {self.rtype.label}" + (f" (matched: {', '.join(list(dict.fromkeys(self.matched))[:3])})"
                                           if self.matched else ""),
            f"Verdict: {VERDICTS[self.verdict]}",
            "",
            *[f"• {f}" for f in self.facts],
        ]
        if self.warnings:
            lines += ["", "Check first:", *[f"⚠ {w}" for w in self.warnings]]
        if self.next_step:
            lines += ["", f"Next step: {self.next_step}"]
        if self.reply_hint:
            lines += ["", f"For the reply: {self.reply_hint}"]
        lines += ["", f"(bob-support, Admin Console {env}, read-only. Automated whenever this changes.)"]
        return "\n".join(lines)

    def fingerprint(self) -> str:
        basis = "|".join([self.rtype.key, self.verdict, *self.facts, *self.warnings, self.next_step])
        return hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]


# --------------------------------------------------------------------------
# Admin Console lookups (read-only)
# --------------------------------------------------------------------------
def _items(data: Any) -> list[dict[str, Any]]:
    data = unwrap(data)
    if isinstance(data, dict):
        for key in ("items", "rows", "data"):
            if isinstance(data.get(key), list):
                return [x for x in data[key] if isinstance(x, dict)]
    return [x for x in data if isinstance(x, dict)] if isinstance(data, list) else []


def find_user(c: Client, email: str) -> dict[str, Any] | None:
    if not email:
        return None
    for u in _items(c.call(Request("GET", "/users", params={"search": email, "limit": 10}))):
        if (u.get("email") or "").lower() == email.lower():
            return u
    return None


def get_practice(c: Client, practice_id: Any) -> dict[str, Any] | None:
    try:
        p = unwrap(c.call(Request("GET", f"/practices/{practice_id}")))
    except BobAdminError as e:
        if e.status == 404:
            return None
        raise
    return p if isinstance(p, dict) else None


def pending_in_subsidiary(c: Client, subsidiary_id: Any) -> list[dict[str, Any]]:
    return _items(c.call(Request("GET", "/practices", params={
        "status": "pending", "subsidiaryId": subsidiary_id, "limit": 50})))


def subsidiary_country(c: Client, subsidiary_id: Any) -> str:
    try:
        s = unwrap(c.call(Request("GET", f"/subsidiaries/{subsidiary_id}")))
    except BobAdminError:
        return ""
    return (s.get("countryCode") or "").upper() if isinstance(s, dict) else ""


def recent_decisions(c: Client, country: str, limit: int = 100) -> list[dict[str, Any]]:
    """Latest approval decisions for one country (the endpoint has no country filter)."""
    rows = _items(c.call(Request("GET", "/practice-decisions", params={"limit": limit})))
    return [r for r in rows if (r.get("countryCode") or "").upper() == country]


def practice_stats(c: Client, practice_id: Any) -> dict[str, Any]:
    try:
        s = unwrap(c.call(Request("GET", f"/practices/{practice_id}/stats")))
    except BobAdminError:
        return {}
    return s if isinstance(s, dict) else {}


EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
FROM_TO_RE = re.compile(r"(?:from|von|da|de|od)\s+(\S+@\S+?)[\s,.;]+(?:to|zu|auf|a|para|à|na|v)\s+(\S+@\S+?)[\s,.;]*$",
                        re.I | re.M)


def emails_in_comments(comments: list[str]) -> tuple[str | None, str | None]:
    """(current email, new email) from the requester's newest comment that has any."""
    for text in comments:
        m = FROM_TO_RE.search(text)
        if m:
            return m.group(1).strip(".,;").lower(), m.group(2).strip(".,;").lower()
        found = [e.lower() for e in EMAIL_RE.findall(text)]
        if len(found) >= 2:
            return found[0], found[1]
        if len(found) == 1:
            return None, found[0]
    return None, None


def signed_in_since(user: dict[str, Any] | None, practices: list[dict[str, Any]], since: str) -> str | None:
    """The date they first signed in, if that was after `since` and they're fully on BOB; else None.

    Fully on BOB: account active, activated, temporary password replaced, and at least
    one active practice. Someone who was already active before asking (and still wrote
    "I can't log in") is not solved by this.
    """
    if not user or user.get("status") != "active" or user.get("mustSetPassword"):
        return None
    activated = user.get("activatedAt") or ""
    if not activated or not since or activated[:19] <= since[:19]:
        return None
    if not any(p.get("status") == "active" for p in practices):
        return None
    return activated[:10]


def _date(v: Any) -> str:
    return str(v)[:10] if v else "never"


def _q(s: str) -> str:
    return '"' + s.replace('"', '\\"') + '"'


# --------------------------------------------------------------------------
# building the plan
# --------------------------------------------------------------------------
def build(c: Client, case: Case, overrides: dict[str, Any] | None = None,
          learned: dict | None = None) -> Plan:
    o = {k: v for k, v in (overrides or {}).items() if v not in (None, "", ())}
    text = "\n".join([case.title, case.submission.text])
    from_comment = False
    if o.get("type"):
        rtype, matched = playbook.BY_KEY[o["type"]], ["(given with --type)"]
    else:
        rtype, matched = playbook.classify(text, case.task_gid, learned)
        if matched != ["(taught for this task)"]:
            # the requester's newest comment wins when it names a request: it's the latest word
            for comment in case.comments:
                ct, cm = playbook.classify(comment, None, learned)
                if ct.key != "other":
                    rtype, matched, from_comment = ct, cm, True
                    break
        if rtype.key == "other" and case.change_notes:
            rtype, matched = playbook.classify(case.change_notes, None, learned)
    plan = Plan(case=case, rtype=rtype, matched=matched)
    if case.change_notes:
        first = case.change_notes.strip().splitlines()
        plan.facts.append("Change subtask says: " + " / ".join(x.strip() for x in first[:2]))
    if case.comments:
        plan.facts.append(f"Read {len(case.comments)} comment(s) from the requester"
                          + (" (the newest one decided the type)." if from_comment else "."))
    app = case.submission.get("application")
    mentions_bob = re.search(r"\bbob\b", " ".join([app, text, *case.comments]).lower()) is not None
    if app and not mentions_bob and not o:
        plan.facts.append(f"The request is about {app}, not BOB: the BOB Admin Console doesn't hold these "
                          "accounts, so nothing was looked up there.")
        plan.verdict = "reply"
        plan.reply_hint = "Answer in Asana from the app's FAQ; no Admin Console change applies."
        return plan
    if rtype.key == "account-email":
        old, new = emails_in_comments(case.comments)
        if old:
            o.setdefault("lookup_email", old)
        if new:
            o.setdefault("email", new)

    email = o.get("lookup_email") or case.submission.email
    user = find_user(c, email) if email else None
    if o.get("user_id") and not user:
        user = unwrap(c.call(Request("GET", f"/users/{o['user_id']}")))
    plan.user = user
    if not user:
        which = "the form email" if email == case.submission.email else "the email the requester named"
        plan.facts.append(f"No BOB account with {which} (on {c.env})." if email else "The form has no email address.")
    else:
        roles = ", ".join(user.get("roles") or []) or "none"
        temp_state = "not used yet (must set a password at first sign-in)" if user.get("mustSetPassword") else "already changed"
        plan.facts.append(
            f"Account {user.get('id')} ({user.get('username') or 'no username'}): status {user.get('status')}, "
            f"activated {_date(user.get('activatedAt')).replace('never', 'not yet')}, temporary password {temp_state}, "
            f"roles {roles}.")
        if user.get("subsidiaryId"):
            plan.facts.append(f"Partner / subsidiary admin of subsidiary {user.get('subsidiaryId')}.")
        for m in (user.get("practices") or [])[:6]:
            p = get_practice(c, m.get("practiceId")) or {}
            if p:
                plan.practices.append(p)
            plan.facts.append(
                f"Practice {m.get('practiceId')} {_q(p.get('name') or m.get('practiceName') or '?')}: "
                f"{p.get('status', '?')}, {p.get('coachCount', '?')} coach(es), "
                f"as {', '.join(m.get('memberTypes') or [])}"
                + (f", {p.get('addressStreet') or ''} {p.get('addressZip') or ''} {p.get('addressCity') or ''}".rstrip(", ")
                   if rtype.key == "practice-details" else ""))
    if o.get("practice_id") and all(str(p.get("id")) != str(o["practice_id"]) for p in plan.practices):
        p = get_practice(c, o["practice_id"])
        if not p:
            raise BobAdminError(f"Practice {o['practice_id']} not found in the Admin Console.")
        plan.practices.insert(0, p)
        plan.facts.append(f"Practice {p.get('id')} {_q(p.get('name') or '?')} (given with --practice-id): {p.get('status')}.")

    handler = HANDLERS.get(rtype.key, _other)
    handler(c, plan, o)
    if case.done and not case.change_gid:
        # `bob-support do` already handled this request and no new change subtask is open:
        # don't propose the same change again or ask for its details again
        plan.actions = [a for a in plan.actions if not any(a.label in d for d in case.done)]
        plan.facts.append("Already done with bob-support: " + "; ".join(d.strip() for d in case.done) + ".")
        if not plan.actions:
            plan.verdict = "reply"
            plan.next_step = "Nothing left to change: App Support sends the \"All done\" reply and closes the task."
    signed_in = signed_in_since(user, plan.practices, case.created_at)
    if rtype.key in SOLVABLE_BY_SIGN_IN and signed_in and not (user or {}).get("subsidiaryId") and not o:
        plan.verdict = "solved"
        plan.actions = []
        plan.facts.append(f"They signed in on {signed_in}, after sending the request ({_date(case.created_at)}), "
                          "and their practice is active: they're already on BOB.")
        plan.next_step = ("Nothing to do: the sweep closes this ticket." if case.closable
                          else "Nothing to change; close the ticket when it suits you.")
        plan.reply_hint = ""
    if not user and plan.verdict not in ("change", "check"):
        plan.verdict = "no-account"
        plan.next_step = plan.next_step or "Ask which email address they registered with (or point them to the sign-up form)."
    return plan


def _target(plan: Plan, o: dict[str, Any]) -> dict[str, Any] | None:
    if o.get("practice_id"):
        return next((p for p in plan.practices if str(p.get("id")) == str(o["practice_id"])), None)
    if len(plan.practices) == 1:
        return plan.practices[0]
    default = (plan.user or {}).get("defaultPracticeId")
    if default is not None and len(plan.practices) > 1:
        plan.warnings.append(
            f"The account is in {len(plan.practices)} practices; using its default practice {default}. "
            "Pass --practice-id to pick another.")
        return next((p for p in plan.practices if str(p.get("id")) == str(default)), None)
    return None


def _shared_warning(plan: Plan, p: dict[str, Any]) -> None:
    if (p.get("coachCount") or 0) > 1:
        plan.warnings.append(
            f"Practice {p.get('id')} has {p.get('coachCount')} coaches: a change there changes it for all of them.")
    contact = (p.get("contactEmail") or "").lower()
    if contact and plan.case.submission.email and contact != plan.case.submission.email:
        plan.warnings.append(f"Practice {p.get('id')} has another contact email than the requester.")


def _rename(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    p = _target(plan, o)
    new = o.get("name")
    if not new:
        m = CHANGE_RE.search(plan.case.change_notes or "")
        new = m.group(1).strip() if m else None
    if not p:
        plan.verdict = "check" if plan.user else "no-account"
        plan.next_step = "Pick the practice: bob-support do TASK --practice-id ID --name \"…\"" if plan.user else ""
        return
    _shared_warning(plan, p)
    if len(plan.practices) > 1 and o.get("practice_id"):
        plan.warnings.append("The account is in more than one practice; check it's the right one.")
    if not new:
        plan.verdict = "need-info"
        plan.next_step = "Ask for the new practice name exactly as it should appear."
        plan.reply_hint = "We can change the practice name for them; ask for the exact new name."
        return
    if new == p.get("name"):
        plan.verdict = "reply"
        plan.facts.append(f"Practice {p.get('id')} is already called {_q(new)}.")
        plan.reply_hint = "The practice already has that name; ask them to sign out and in again."
        return
    plan.verdict = "change"
    plan.actions.append(Action(
        f"Rename practice {p.get('id')} from {_q(p.get('name') or '')} to {_q(new)}",
        Request("PUT", f"/practices/{p.get('id')}", body={"name": new}),
        f"bob-admin --env {c.env} practices update {p.get('id')} --name {_q(new)}"))
    plan.next_step = f"bob-support do {plan.case.change_gid or plan.case.task_gid}" + ("" if o.get("name") else f" (new name {_q(new)})")
    plan.reply_hint = f"Done: the practice is now called {_q(new)} in BOB; they may need to sign in again."


def _details(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    p = _target(plan, o)
    fields = {"street": o.get("street"), "zipCode": o.get("zip"), "city": o.get("city"),
              "contactName": o.get("contact_name"), "contactEmail": o.get("contact_email"),
              "contactPhone": o.get("contact_phone")}
    fields = {k: v for k, v in fields.items() if v}
    if not p:
        plan.verdict = "check" if plan.user else "no-account"
        return
    _shared_warning(plan, p)
    if not fields:
        plan.verdict = "need-info"
        plan.next_step = ("Ask for the new details (street and number, postcode, city, country), then "
                          "bob-support do TASK --street … --zip … --city …")
        return
    plan.verdict = "change"
    flag = {"street": "street", "zipCode": "zip", "city": "city", "contactName": "contact-name",
            "contactEmail": "contact-email", "contactPhone": "contact-phone"}
    flags = " ".join(f"--{flag[k]} {_q(v)}" for k, v in fields.items())
    plan.actions.append(Action(f"Update practice {p.get('id')}: {', '.join(f'{k}={v}' for k, v in fields.items())}",
                               Request("PUT", f"/practices/{p.get('id')}", body=fields),
                               f"bob-admin --env {c.env} practices update {p.get('id')} {flags}"))
    plan.reply_hint = "Done: the practice details are updated in BOB."


def _delete(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    p = _target(plan, o)
    if not p:
        plan.verdict = "check" if plan.user else "no-account"
        return
    stats = practice_stats(c, p.get("id"))
    overview = stats.get("overview") if isinstance(stats.get("overview"), dict) else stats
    sessions = overview.get("sessions") if isinstance(overview, dict) else None
    plan.facts.append(f"Practice {p.get('id')}: {sessions if sessions is not None else '?'} sessions recorded, "
                      f"created {_date(p.get('createdAt'))}.")
    _shared_warning(plan, p)
    plan.verdict = "change"
    plan.warnings.append("Deleting removes the practice for everyone in it. Get the requester's explicit "
                         "confirmation in Asana first.")
    plan.actions.append(Action(f"Delete (soft) practice {p.get('id')} {_q(p.get('name') or '')}",
                               Request("DELETE", f"/practices/{p.get('id')}"),
                               f"bob-admin --env {c.env} practices delete {p.get('id')}"))
    plan.next_step = "Once they've confirmed: bob-support do TASK"
    plan.reply_hint = "Done: the practice is removed from BOB. Personal-data erasure is a separate request."


def _temp_password(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    u = plan.user
    if not u:
        plan.reply_hint = ("No account under this email: ask which address they registered with; password emails "
                           "bounce silently on a mistyped address.")
        return
    statuses = {p.get("status") for p in plan.practices}
    if plan.practices and statuses <= {"pending", "new"}:
        plan.verdict = "reply"
        plan.facts.append("Their practice isn't approved yet, so no login has been sent.")
        plan.next_step = "Approval first (see activation-status); the logins go out on approval."
        plan.reply_hint = "Their practice is still waiting for approval; the temporary password arrives once it's approved."
        return
    if u.get("status") != "active":
        plan.verdict = "check"
        plan.warnings.append(f"The account status is {u.get('status')}: reactivate before sending a password.")
        return
    plan.verdict = "change"
    plan.actions.append(Action(f"Send a new temporary password to account {u.get('id')}",
                               Request("POST", "/users/temporary-password", body={"userIds": [int(u["id"])]}),
                               f"bob-admin --env {c.env} users temp-password {u.get('id')}"))
    if u.get("activatedAt") and not u.get("mustSetPassword"):
        plan.facts.append("They have signed in before: \"Forgot password\" on the sign-in screen also works.")
    plan.next_step = f"bob-support do {plan.case.change_gid or plan.case.task_gid}"
    plan.reply_hint = ("A new temporary password is on its way from support@bobscore.com (check spam); they set "
                       "their own at first sign-in. Never write the password in Asana.")


def _activation(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    u = plan.user
    if u and u.get("subsidiaryId"):
        pending = pending_in_subsidiary(c, u["subsidiaryId"])
        plan.facts.append(f"{len(pending)} practice(s) waiting for approval in their subsidiary"
                          + (": " + "; ".join(f"{p.get('id')} {_q(p.get('name') or '')} since {_date(p.get('createdAt'))}"
                                               for p in pending[:8]) if pending else "."))
        country = subsidiary_country(c, u["subsidiaryId"])
        decided = recent_decisions(c, country) if country else []
        if decided:
            actors = Counter(d.get("actorName") or "?" for d in decided)
            plan.facts.append(
                f"Latest approval decisions for {country}: {len(decided)}, last on {_date(decided[0].get('decisionAt'))}, by "
                + ", ".join(f"{a} ({n})" for a, n in actors.most_common(3)) + ".")
        plan.verdict = "reply"
        if pending:
            plan.reply_hint = "They approve these themselves in the Admin Console under Practices → Pending approval."
        elif decided:
            plan.reply_hint = ("Nothing is waiting for them because the new registrations in their country were "
                               "approved centrally (see the decisions above); say so, and who to tell if they want to approve them.")
        else:
            plan.reply_hint = "Nothing is waiting in their subsidiary: ask for one practice name and date."
        return
    if not u:
        plan.reply_hint = "No account under this email yet: either the registration didn't go through, or another email was used."
        return
    pend = [p for p in plan.practices if p.get("status") in ("pending", "new")]
    if pend:
        p = pend[0]
        plan.verdict = "check"
        plan.facts.append(f"Practice {p.get('id')} is {p.get('status')} since {_date(p.get('createdAt'))}"
                          + (f", subsidiary {p.get('subsidiaryId')}" if p.get("subsidiaryId") else ", no subsidiary (Curaden approves)"))
        plan.next_step = (f"Approve if it's ours: bob-admin --env {c.env} practices approve {p.get('id')} "
                          "--idb-office|--no-idb-office --idb-kit|--no-idb-kit --training-date YYYY-MM-DD")
        plan.reply_hint = "Their practice is waiting for approval; once approved, each coach gets a temporary password by email."
        return
    if plan.practices and u.get("status") == "active" and (u.get("mustSetPassword") or not u.get("activatedAt")):
        _temp_password(c, plan, o)
        plan.facts.append("The practice is active, but the account has no activation date: they haven't "
                          "signed in to the new BOB yet.")
        return
    plan.verdict = "reply"
    plan.reply_hint = "Their account and practice are active: sign in at https://bobscore.app or in the Curaprox - BOB app."


def _email(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    p, u = _target(plan, o), plan.user
    if not (p and u):
        plan.verdict = "check" if u else "no-account"
        return
    new = o.get("email")
    if not new:
        plan.verdict = "need-info"
        plan.next_step = "Ask for the new email address, then bob-support do TASK --email NEW"
        return
    plan.verdict = "change"
    plan.actions.append(Action(f"Change the email of account {u.get('id')} in practice {p.get('id')}",
                               Request("PUT", f"/practices/{p.get('id')}/members/{u.get('id')}", body={"email": new}),
                               f"bob-admin --env {c.env} practices members update {p.get('id')} {u.get('id')} --email {new}"))
    plan.reply_hint = "Done: they sign in with the new email from now on (same password)."


def _role(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    plan.verdict = "check" if plan.user else "no-account"
    plan.next_step = ("Decide. No BOB Admin access for practices (BA-325). A Practice Admin switch in the app: "
                      "bob-admin practices members update PRACTICE USER --type practice_admin")


def _other(c: Client, plan: Plan, o: dict[str, Any]) -> None:
    plan.verdict = "reply"


HANDLERS = {
    "practice-rename": _rename,
    "practice-details": _details,
    "practice-delete": _delete,
    "temp-password": _temp_password,
    "activation-status": _activation,
    "account-email": _email,
    "role-access": _role,
    "other": _other,
}
