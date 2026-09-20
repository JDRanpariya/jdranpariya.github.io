#!/usr/bin/env python3
"""Project the research censuses into compact, stable website catalogs."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = SITE_ROOT / "data" / "catalogs"
SOURCE = SITE_ROOT / "data" / "source"
GREAT_MINDS = SOURCE / "great_minds_census.csv"
NEUROAI = SOURCE / "neuroai_canonical_census.csv"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return [{key: (value or "").strip() for key, value in row.items()} for row in csv.DictReader(handle)]


def stable_id(prefix: str, name: str, url: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().casefold()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized).strip()
    digest = hashlib.sha256(f"{normalized}\n{url.rstrip('/').casefold()}".encode()).hexdigest()[:14]
    return f"{prefix}-{digest}"


def values(*items: str) -> list[str]:
    result: list[str] = []
    for item in items:
        for value in re.split(r"\s*[;|]\s*", item or ""):
            value = value.strip()
            if value and value not in result:
                result.append(value)
    return result


def great_minds() -> list[dict[str, object]]:
    output: list[dict[str, object]] = []
    for row in read_csv(GREAT_MINDS):
        output.append(
            {
                "id": stable_id("gm", row["canonical_name"], row["canonical_url"]),
                "collection": "great-minds",
                "name": row["canonical_name"],
                "entityType": "researcher",
                "lead": "",
                "institution": row["current_affiliation"],
                "country": row["country_or_region"],
                "city": row["city"],
                "url": row["canonical_url"],
                "primary": row["primary_field"],
                "topics": values(row["primary_field"], row["secondary_fields"]),
                "summary": row["landmark_contribution"],
                "question": row["life_question"],
                "questionBasis": row["life_question_basis"],
                "evidenceUrls": values(row["consensus_evidence_1_url"], row["consensus_evidence_2_url"]),
                "status": row["consensus_class"],
                "activity": row["maintenance_evidence"],
            }
        )
    return sorted(output, key=lambda item: str(item["name"]).casefold())


def neuroai() -> list[dict[str, object]]:
    output: list[dict[str, object]] = []
    for row in read_csv(NEUROAI):
        if row["count_in_headline"] != "1":
            continue
        output.append(
            {
                "id": row["candidate_id"] or stable_id("na", row["canonical_name"], row["canonical_url"]),
                "collection": "neuroai",
                "name": row["canonical_name"],
                "entityType": row["entity_type"],
                "lead": row["pi_or_lead"],
                "institution": row["institution"],
                "country": row["country"],
                "city": row["city"],
                "url": row["canonical_url"],
                "primary": values(row["primary_topics"])[0] if values(row["primary_topics"]) else "",
                "topics": values(row["primary_topics"], row["secondary_topics"]),
                "summary": row["relevance_summary"],
                "question": "",
                "questionBasis": "",
                "evidenceUrls": values(row["evidence_url_1"], row["evidence_url_2"]),
                "status": row["relevance_class"],
                "activity": row["last_activity_evidence"],
            }
        )
    return sorted(output, key=lambda item: str(item["name"]).casefold())


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    catalogs = {
        "great-minds.json": great_minds(),
        "neuroai.json": neuroai(),
    }
    for filename, records in catalogs.items():
        path = OUTPUT / filename
        path.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{filename}: {len(records)} records, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
