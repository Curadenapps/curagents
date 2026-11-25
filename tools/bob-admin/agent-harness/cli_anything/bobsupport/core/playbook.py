"""Request types the support CLI knows, and how a request is matched to one.

Each type says what the hourly sweep does on its own (always read-only in the
Admin Console) and what stays with the owner (every Admin Console change).
Keywords are matched on meaning-carrying phrases in the languages the board
gets (EN, DE, IT, FR, ES, PT, SL). What the owner teaches with
`bob-support learn` is added from ~/.bob-admin/support-learned.json.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from cli_anything.bobadmin.core.client import config_dir


@dataclass(frozen=True)
class RequestType:
    key: str
    label: str
    keywords: tuple[str, ...]
    hourly: str          # what the automated sweep does (read-only)
    owner: str           # what stays with the owner
    admin_write: bool    # can end in an Admin Console change
    needs: tuple[str, ...] = field(default_factory=tuple)  # what the change needs from the requester


TYPES: tuple[RequestType, ...] = (
    RequestType(
        "practice-rename", "Practice name change",
        ("practice name", "name of my practice", "name of the practice", "rename", "change the name",
         "opened my own", "new practice name", "praxisname", "name der praxis", "praxis umbenennen",
         "nome dello studio", "nome studio", "nom du cabinet", "nombre de la clínica", "nombre de la clinica",
         "nome da clínica", "nome da clinica", "ime ordinacije", "ime prakse"),
        "Finds the account by the form email, lists its practices (id, name, status, coaches) and flags a "
        "practice shared with other people, where a rename would rename it for everyone.",
        "Confirms the new name and runs `bob-support do` (PUT /practices/{id}). Shared practice: decide "
        "between a rename and a new practice.",
        True, ("the new practice name exactly as it should appear",)),
    RequestType(
        "practice-details", "Practice address or contact change",
        ("address", "adresse", "indirizzo", "dirección", "direccion", "endereço", "endereco", "naslov",
         "phone number", "telefon", "contact email", "postcode", "zip code"),
        "Finds the practice and shows its current address and contact details.",
        "Runs `bob-support do` with the new fields (PUT /practices/{id}).",
        True, ("street and number, postcode, city and country",)),
    RequestType(
        "practice-delete", "Delete a practice",
        ("delete my practice", "delete the practice", "delete practice", "remove my practice", "remove the practice",
         "close my practice", "closed the practice", "delete my account", "delete account", "praxis löschen",
         "konto löschen", "account löschen", "eliminare lo studio", "cancellare", "supprimer", "eliminar",
         "borrar", "excluir", "izbriši", "izbrisati"),
        "Finds the practice, counts its staff and sessions, and flags anyone else still in it.",
        "Confirms with the requester, then runs `bob-support do` (soft delete, DELETE /practices/{id}). "
        "A personal-data erasure of the user stays a separate, explicit step (bob-admin users erase).",
        True, ("confirmation that the whole practice should go, not just one person",)),
    RequestType(
        "temp-password", "Login or temporary password",
        ("password", "passwort", "kennwort", "temporary", "temporäres", "can't log in", "cannot log in",
         "can not log in", "unable to log in", "login", "log in", "sign in", "anmelden", "einloggen",
         "credentials", "no email", "didn't receive", "did not receive", "never received", "haven't received",
         "not received", "contraseña", "contrasena", "senha", "mot de passe", "geslo", "prijava"),
        "Finds the account: status, whether it was ever activated, whether the temporary password is still "
        "unused, and whether its practice is approved.",
        "Runs `bob-support do` to send a new temporary password (POST /users/temporary-password) when the "
        "account exists and its practice is active. Never sets or posts a password.",
        True),
    RequestType(
        "activation-status", "Registration, approval or activation status",
        ("registration", "register", "registered", "registrierung", "registriert", "regestriren", "registrieren",
         "registrazione", "registrarse", "registro", "cadastro", "registracija", "approval", "approve",
         "approved", "pending", "activate", "activation", "activated", "freischalten", "freigeschaltet",
         "attivazione", "activar", "ativar", "aktivacija", "still waiting", "not active",
         "create a new account", "create an account", "new account", "access to the new app", "need access",
         "acceso a la nueva app", "nueva app", "acesso", "neues konto", "would like to have this", "sign up",
         "signed up", "regestrieren"),
        "Checks the account and its practice: pending, active, rejected; for a partner admin, lists the "
        "practices waiting in their subsidiary.",
        "Approves in the Admin Console when it's ours to approve (`bob-admin practices approve`, needs the IDB "
        "answers and a training date), or replies with the status.",
        True),
    RequestType(
        "account-email", "Change the account email",
        ("change my email", "change the email", "new email", "email change", "e-mail ändern", "neue e-mail",
         "cambiare email", "cambiar el correo", "alterar o e-mail", "spremeniti e-pošto"),
        "Finds the account and its practice membership.",
        "Runs `bob-support do --email NEW` (PUT /practices/{practice}/members/{user}).",
        True, ("the new email address",)),
    RequestType(
        "role-access", "Role or access change",
        ("practice admin", "admin rights", "admin access", "access rights", "permission", "change my role",
         "adminrechte", "berechtigung", "diritti di amministratore", "permisos de administrador"),
        "Finds the account and its roles per practice.",
        "Decides (no BOB Admin access for practices, BA-325); a Practice Admin switch in the app is "
        "`bob-admin practices members update PRACTICE USER --type practice_admin`.",
        True),
    RequestType(
        "other", "Other (no Admin Console change expected)",
        (),
        "Looks the requester up by email so the reply can use what their account shows.",
        "Answers in Asana (App Support writes the reply).",
        False),
)
BY_KEY = {t.key: t for t in TYPES}
LEARNED_FILE = "support-learned.json"


def learned_path() -> Path:
    return config_dir() / LEARNED_FILE


def load_learned() -> dict:
    p = learned_path()
    if not p.exists():
        return {"keywords": {}, "tasks": {}}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"keywords": {}, "tasks": {}}
    data.setdefault("keywords", {})
    data.setdefault("tasks", {})
    return data


def save_learned(data: dict) -> None:
    p = learned_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().replace("’", "'"))


def classify(text: str, task_gid: str | None = None, learned: dict | None = None) -> tuple[RequestType, list[str]]:
    """Best type for a request, and the phrases that matched.

    A task the owner corrected wins outright. Otherwise the type with the most
    matching phrases wins; a tie goes to the type listed first (most specific).
    """
    learned = learned if learned is not None else load_learned()
    if task_gid and task_gid in learned.get("tasks", {}):
        key = learned["tasks"][task_gid]
        if key in BY_KEY:
            return BY_KEY[key], ["(taught for this task)"]
    t = _norm(text)
    best: tuple[int, int, RequestType, list[str]] | None = None
    for order, rt in enumerate(TYPES):
        phrases = list(rt.keywords) + list(learned.get("keywords", {}).get(rt.key, []))
        hits = [p for p in phrases if _phrase_in(_norm(p), t)]
        if hits and (best is None or len(hits) > best[0]):
            best = (len(hits), order, rt, hits)
    if best is None:
        return BY_KEY["other"], []
    return best[2], best[3]


def _phrase_in(phrase: str, text: str) -> bool:
    return re.search(r"(?<![\w])" + re.escape(phrase) + r"s?(?![\w])", text) is not None  # plurals count
