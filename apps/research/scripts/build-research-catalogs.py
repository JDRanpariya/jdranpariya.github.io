#!/usr/bin/env python3
"""Project the research censuses into compact, stable website catalogs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from research_people import lead_keys, person_key  # noqa: E402


SITE_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = SITE_ROOT / "data" / "catalogs"
SOURCE = SITE_ROOT / "data" / "source"
GREAT_MINDS = SOURCE / "great_minds_census.csv"
NEUROAI = SOURCE / "neuroai_canonical_census.csv"
ADDITIONAL_PEOPLE = SOURCE / "additional_neuroai_people.csv"
# Reinforcement-learning census. Europe first: on a duplicate, the earlier file wins.
RL_SOURCES = [SOURCE / "rl_census_europe.csv", SOURCE / "rl_census_world.csv"]


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
    merge_additional_people(output)
    return sorted(output, key=lambda item: str(item["name"]).casefold())


def merge_additional_people(records: list[dict[str, object]]) -> None:
    """Add public researcher directory entries not already represented by a lab lead."""
    known_leads: set[str] = set()
    for record in records:
        known_leads.update(lead_keys(str(record["lead"])))
    for person in read_csv(ADDITIONAL_PEOPLE):
        if person_key(person["name"]) not in known_leads:
            records.append(additional_person_record(person))


def additional_person_record(person: dict[str, str]) -> dict[str, object]:
    return {
        "id": stable_id("ep", person["name"], person["url"]),
        "collection": "neuroai",
        "name": person["name"],
        "entityType": "researcher",
        "lead": "",
        "institution": person["institution"],
        "country": person["country"],
        "city": "",
        "url": person["url"],
        "primary": "",
        "topics": [],
        "summary": "",
        "question": "",
        "questionBasis": "",
        "evidenceUrls": [],
        "status": "ADDITIONAL_RESEARCHER",
        "activity": "",
    }


def url_key(url: str) -> str:
    """Scheme-, www-, query-, fragment- and trailing-slash-insensitive URL key."""
    key = (url or "").strip().casefold()
    key = re.sub(r"^[a-z][a-z0-9+.-]*://", "", key)
    key = re.sub(r"^www\.", "", key)
    key = re.split(r"[?#]", key, maxsplit=1)[0]
    return key.rstrip("/")


def name_key(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def rl(sources: list[Path] | None = None) -> list[dict[str, object]]:
    """Merge the RL census files, dropping rows whose normalized URL or name was already seen."""
    output: list[dict[str, object]] = []
    seen_urls: set[str] = set()
    seen_names: set[str] = set()
    for path in sources if sources is not None else RL_SOURCES:
        if not path.exists():
            print(f"rl: {path.name} not found; skipped", file=sys.stderr)
            continue
        for row in read_csv(path):
            name, url = row.get("name", ""), row.get("url", "")
            if not name:
                continue
            keys_url, keys_name = url_key(url), name_key(name)
            if (keys_url and keys_url in seen_urls) or keys_name in seen_names:
                continue
            if keys_url:
                seen_urls.add(keys_url)
            seen_names.add(keys_name)
            topics = values(row.get("topics", ""))
            output.append(
                {
                    "id": stable_id("rl", name, url_key(url)),
                    "collection": "rl",
                    "name": name,
                    "entityType": row.get("entity_type", ""),
                    "lead": row.get("lead", ""),
                    "institution": row.get("institution", ""),
                    "country": row.get("country", ""),
                    "city": row.get("city", ""),
                    "url": url,
                    "primary": row.get("primary", "") or (topics[0] if topics else ""),
                    "topics": topics,
                    "summary": row.get("summary", ""),
                    "question": row.get("question", ""),
                    "questionBasis": row.get("question_basis", ""),
                    "evidenceUrls": values(row.get("evidence_url_1", ""), row.get("evidence_url_2", "")),
                    "status": "active",
                    "activity": row.get("active_as_of", ""),
                    "elite": row.get("elite", "").casefold() == "yes",
                }
            )
    return sorted(output, key=lambda item: str(item["name"]).casefold())


def write_catalog(path: Path, records: list[dict[str, object]]) -> None:
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"{path.name}: duplicate record ids")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{path.name}: {len(records)} records, {path.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rl-only", action="store_true", help="build only the RL catalog")
    parser.add_argument("--rl-source", action="append", type=Path, help="RL census CSV (repeatable)")
    parser.add_argument("--rl-output", type=Path, default=OUTPUT / "rl.json")
    args = parser.parse_args()

    if not args.rl_only:
        write_catalog(OUTPUT / "great-minds.json", great_minds())
        write_catalog(OUTPUT / "neuroai.json", neuroai())
    write_catalog(args.rl_output, rl(args.rl_source))


if __name__ == "__main__":
    main()
