"""Name matching for the public NeuroAI researcher directory."""

from __future__ import annotations

import re
import unicodedata

NICKNAMES = {
    "ben": "benjamin",
    "chris": "christopher",
    "dan": "daniel",
    "kim": "kimberly",
    "matt": "matthew",
    "max": "maxim",
    "sam": "samuel",
    "tim": "timothy",
}


def person_key(name: str) -> str:
    """Normalize given name and surname, ignoring initials and common nicknames."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().casefold()
    tokens = [token for token in re.split(r"[^a-z0-9-]+", ascii_name) if token.strip("-")]
    tokens = [token for token in tokens if token not in {"prof", "dr"}]
    if len(tokens) < 2:
        return ""
    given = next((token for token in tokens[:-1] if len(token) > 1), tokens[0])
    return f"{NICKNAMES.get(given, given)} {tokens[-1]}"


def lead_keys(lead: str) -> set[str]:
    """Normalize each named lead in a semicolon-, slash-, or 'and'-separated cell."""
    parts = re.split(r"\s*(?:;|/|&|\band\b)\s*", lead or "")
    return {key for key in (person_key(part) for part in parts if part.strip()) if " " in key}
