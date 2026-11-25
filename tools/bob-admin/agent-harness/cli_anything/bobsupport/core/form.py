"""Read an "App Requests & Feedback" form submission out of an Asana task.

The form writes each label on its own line ("Name:"), the value on the next
lines, and ends with "This task was submitted through App Requests & Feedback".
Older forms (Error Request, Digital Sales Request) use other labels; the
aliases below map them onto the same keys.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

FORM_MARKER = "This task was submitted through"

# canonical key -> labels seen on the board (lower case, without the colon)
LABELS: dict[str, tuple[str, ...]] = {
    "name": ("name",),
    "email": ("email address", "email"),
    "title": ("title", "task title - state the issue in under 10 words"),
    "country": ("app country", "select country"),
    "application": ("application(s)", "select which app", "select the app"),
    "os": ("operating system", "select your mobile operating system"),
    "area": ("area", "submit your request", "issue / bug type"),
    "device": ("confirm your device model",),
    "led_to": ("what led to the issue?",),
    "happened": ("what happened?",),
    "request": ("describe your request", "describe the error"),
}
_LABEL_TO_KEY = {label: key for key, labels in LABELS.items() for label in labels}
_LABEL_RE = re.compile(r"^\*?([A-Za-z][A-Za-z0-9 ()/?\\-]{1,60}?)\s*:\*?\s*$")
_MAILTO_RE = re.compile(r"\[([^|\]]+)\|mailto:[^\]]+\]")


@dataclass
class Submission:
    fields: dict[str, str] = field(default_factory=dict)
    from_form: bool = False
    form_name: str = ""

    def get(self, key: str, default: str = "") -> str:
        return self.fields.get(key, default)

    @property
    def first_name(self) -> str:
        name = self.get("name").strip()
        return name.split()[0] if name else ""

    @property
    def email(self) -> str:
        return self.get("email").strip().lower()

    @property
    def text(self) -> str:
        """Everything the requester wrote, for classification."""
        parts = [self.get(k) for k in ("title", "area", "led_to", "happened", "request")]
        return "\n".join(p for p in parts if p)


def parse(notes: str | None) -> Submission:
    notes = (notes or "").replace("\r\n", "\n")
    notes = _MAILTO_RE.sub(r"\1", notes).replace("\\-", "-")
    sub = Submission()
    if FORM_MARKER in notes:
        sub.from_form = True
        tail = notes.split(FORM_MARKER, 1)[1].strip().splitlines()
        sub.form_name = tail[0].strip(" *") if tail else ""
        notes = notes.split(FORM_MARKER, 1)[0]
    notes = notes.split("———————————————")[0]
    key: str | None = None
    buf: list[str] = []

    def flush() -> None:
        if key and key not in sub.fields:
            sub.fields[key] = "\n".join(buf).strip()

    for line in notes.split("\n"):
        m = _LABEL_RE.match(line.strip())
        label = m.group(1).strip().lower() if m else None
        if label is not None and label in _LABEL_TO_KEY:
            flush()
            key, buf = _LABEL_TO_KEY[label], []
        elif label is not None and key != "request":
            # an unknown label (a new form field): keep it under its own name
            flush()
            key, buf = label, []
        else:
            buf.append(line)
    flush()
    return sub


def from_task(task: dict[str, Any]) -> Submission:
    return parse(task.get("notes"))
