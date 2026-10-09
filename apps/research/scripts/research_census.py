"""Shared helpers for the research census scripts (elite institutions, person keys)."""

from __future__ import annotations

import re
import unicodedata

# Jay's "elite institution" set (2026-10-01). Each entry: (label, include pattern, exclude pattern).
ELITE_INSTITUTIONS: list[tuple[str, str, str | None]] = [
    ("MIT", r"\bMIT\b|Massachusetts Institute of Technology", None),
    ("Harvard", r"\bHarvard\b", None),
    ("Stanford", r"\bStanford\b", None),
    ("Berkeley", r"\bBerkeley\b", None),
    ("CMU", r"Carnegie Mellon|\bCMU\b", None),
    ("Caltech", r"\bCaltech\b|California Institute of Technology", None),
    ("Princeton", r"\bPrinceton\b", None),
    ("Columbia", r"\bColumbia\b", r"British Columbia|District of Columbia"),
    ("Yale", r"\bYale\b", None),
    ("NYU", r"\bNYU\b|New York University", None),
    ("Oxford", r"University of Oxford|Oxford University", None),
    ("Cambridge", r"University of Cambridge|Cambridge University", None),
    ("UCL", r"\bUCL\b|University College London|\bGatsby\b|Sainsbury Wellcome|\bSWC\b", None),
    ("Imperial", r"Imperial College", None),
    ("ETH Zurich", r"\bETH\b|Eidgen(?:ö|oe?)ssische Technische", None),
    ("EPFL", r"\bEPFL\b|Polytechnique F[ée]d[ée]rale de Lausanne", None),
    ("NUS", r"\bNUS\b|National University of Singapore", None),
    ("NTU", r"Nanyang Technological|\bNTU\b", r"Taiwan"),
    ("Toronto", r"University of Toronto|\bUofT\b|\bU of T\b|\bUTIAS\b", None),
    ("Mila/McGill/UdeM", r"\bMila\b|\bMcGill\b|Universit[ée] de Montr[ée]al|University of Montreal|\bUdeM\b", None),
    ("Alberta", r"University of Alberta|\bUAlberta\b|\bAmii\b", None),
]

_COMPILED = [
    (label, re.compile(include), re.compile(exclude) if exclude else None)
    for label, include, exclude in ELITE_INSTITUTIONS
]


def elite_institution_label(institution: str) -> str:
    """Return the matching elite label, or '' when the institution is not in the set."""
    for label, include, exclude in _COMPILED:
        if include.search(institution or "") and not (exclude and exclude.search(institution)):
            return label
    return ""


def is_elite_institution(institution: str) -> bool:
    return bool(elite_institution_label(institution))


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
    """Given name + surname, accent- and case-insensitive, skipping initials and expanding
    common nicknames ("Máté Lengyel" == "Mate Lengyel", "Tim P. Vogels" == "Timothy Vogels",
    "A. Rupam Mahmood" -> "rupam mahmood", "Gido M. van de Ven" -> "gido ven")."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().casefold()
    tokens = [token for token in re.split(r"[^a-z0-9-]+", ascii_name) if token.strip("-")]
    tokens = [token for token in tokens if token not in {"prof", "dr"}]
    if len(tokens) < 2:
        return ""
    given = next((token for token in tokens[:-1] if len(token) > 1), tokens[0])
    return f"{NICKNAMES.get(given, given)} {tokens[-1]}"


def lead_keys(lead: str) -> set[str]:
    """Person keys for every named lead in a census 'pi_or_lead' cell ("A; B and C")."""
    parts = re.split(r"\s*(?:;|/|&|\band\b)\s*", lead or "")
    return {key for key in (person_key(part) for part in parts if part.strip()) if " " in key}
