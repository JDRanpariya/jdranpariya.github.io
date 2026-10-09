#!/usr/bin/env python3
"""Merge the elite-supervisor research (A consensus + C people + cold-approach tiers)
into data/source/elite_people_census.csv.

Usage: python3 scripts/import-elite-census.py [SOURCE_DIR]
SOURCE_DIR defaults to Jay's research-program outreach/elite folder. The CSV is the
reviewed snapshot the catalog build reads; re-run this only when the research changes.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = SITE_ROOT / "data" / "source" / "elite_people_census.csv"
DEFAULT_SOURCE = Path.home() / "Developer/projects/research-program/program/outreach/elite"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from research_census import is_elite_institution, person_key  # noqa: E402

COLUMNS = [
    "name",
    "position",
    "institution",
    "country",
    "url",
    "fit",
    "recruiting",
    "contact_rule",
    "cold_approach_tier",
    "topics",
    "sources",
    "evidence_url_1",
    "evidence_url_2",
    "elite_institution",
]

COUNTRIES = {"UK": "United Kingdom", "USA": "United States", "US": "United States"}


def split_group(name: str) -> list[str]:
    """A-consensus lists some co-led groups as 'X / Y / Z'; the census is per person."""
    return [part.strip() for part in name.split(" / ") if part.strip()]


def plain(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip()


def parse_tiers(plan: Path) -> dict[str, str]:
    tiers: dict[str, str] = {}
    tier = ""
    for line in plan.read_text(encoding="utf-8").splitlines():
        if line.startswith("## (b)"):
            break
        heading = re.match(r"###\s+Tier\s+(\d)", line)
        if heading:
            tier = heading.group(1)
            continue
        if tier and line.startswith("|"):
            bold = re.search(r"\*\*([^*]+)\*\*", line)
            if bold:
                tiers[person_key(bold.group(1))] = tier
    return tiers


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    consensus = json.loads((source / "A-consensus.json").read_text(encoding="utf-8"))
    people = json.loads((source / "C-people.json").read_text(encoding="utf-8"))
    tiers = parse_tiers(source / "COLD-APPROACH-PLAN.md")

    merged: dict[str, dict[str, object]] = {}

    for row in consensus:
        for name in split_group(row["name"]):
            key = person_key(name)
            entry = merged.setdefault(key, {"name": plain(name), "a": None, "c": None})
            entry["a"] = row

    for row in people:
        key = person_key(row["name"])
        entry = merged.setdefault(key, {"name": plain(row["name"]), "a": None, "c": None})
        entry["c"] = row
        # Prefer C's spelling (fuller first names, diacritics) over A's.
        entry["name"] = plain(row["name"])

    missing = [key for key in tiers if key not in merged]
    if missing:
        raise SystemExit(f"Cold-approach names not found in A/C: {missing}")

    rows: list[dict[str, str]] = []
    for key, entry in merged.items():
        a = entry["a"] or {}
        c = entry["c"] or {}
        strong = a.get("fit") == "strong" or int(c.get("match_score") or 0) >= 4
        institution = c.get("institution") or a.get("institution") or ""
        evidence = [paper["url"] for paper in c.get("papers") or [] if paper.get("url")]
        url = c.get("url") or a.get("lab_url") or ""
        if not evidence and url:
            evidence = [url]
        elite = is_elite_institution(institution) or is_elite_institution(a.get("institution", ""))
        sources = []
        if a:
            sources.append(f"A:{a.get('consensus_count', 0)}")
        if c:
            sources.append(f"C:{c.get('finders', 0)}")
        country = c.get("country") or a.get("country") or ""
        rows.append(
            {
                "name": str(entry["name"]),
                "position": c.get("position", ""),
                "institution": institution,
                "country": COUNTRIES.get(country, country),
                "url": url,
                "fit": "strong" if strong else "partial",
                "recruiting": c.get("recruiting") or a.get("recruiting") or "",
                "contact_rule": c.get("contact_rule") or a.get("contact_rule") or "",
                "cold_approach_tier": tiers.get(key, ""),
                "topics": "; ".join(a.get("topics") or []),
                "sources": " ".join(sources),
                "evidence_url_1": evidence[0] if evidence else "",
                "evidence_url_2": evidence[1] if len(evidence) > 1 else "",
                "elite_institution": "yes" if elite else "no",
            }
        )

    rows.sort(key=lambda row: row["name"].casefold())
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(
        f"{OUTPUT.name}: {len(rows)} people "
        f"({sum(r['elite_institution'] == 'yes' for r in rows)} elite, "
        f"{sum(r['fit'] == 'strong' for r in rows)} strong, "
        f"{sum(bool(r['cold_approach_tier']) for r in rows)} tiered)"
    )


if __name__ == "__main__":
    main()
