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
from great_minds_reflections import apply_reflection_review  # noqa: E402


SITE_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = SITE_ROOT / "data" / "catalogs"
SOURCE = SITE_ROOT / "data" / "source"
GREAT_MINDS = SOURCE / "great_minds_census.csv"
GREAT_MINDS_REFLECTIONS = SOURCE / "great-minds-reflections.json"
NEUROAI = SOURCE / "neuroai_canonical_census.csv"
ADDITIONAL_PEOPLE = SOURCE / "additional_neuroai_people.csv"
LAB_RESOURCES = SOURCE / "lab-research-resources.json"
MEMBERSHIP = SOURCE / "catalog-membership.json"
METADATA = SOURCE / "catalog-metadata-corrections.json"
REVIEWED_CENSUS = SOURCE / "reviewed-census-v3.json"
# Reinforcement-learning census. Europe first: on a duplicate, the earlier file wins.
RL_SOURCES = [SOURCE / "rl_census_europe.csv", SOURCE / "rl_census_world.csv", SOURCE / "rl_census_reviewed_additions.csv"]


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
    return apply_reflection_review(output, GREAT_MINDS, GREAT_MINDS_REFLECTIONS)


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
                    "id": row.get("id", "") or stable_id("rl", name, url_key(url)),
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


def write_catalog(path: Path, records: list[dict[str, object]], *, reviewed: bool = False) -> None:
    if LAB_RESOURCES.exists():
        resources = json.loads(LAB_RESOURCES.read_text(encoding="utf-8"))
        for record in records:
            key = f"{record['collection']}:{record['id']}"
            if key not in resources and record["collection"] == "rl" and MEMBERSHIP.exists():
                moves = json.loads(MEMBERSHIP.read_text(encoding="utf-8"))
                source = next((move["id"] for move in moves if move["decision"] == "move_rl" and move.get("destinationId") == record["id"]), None)
                if source:
                    key = f"neuroai:{source}"
            if key in resources:
                for field, value in resources[key].items():
                    # The reviewed manifest can carry newer verified resources.
                    # Empty discovery arrays do not erase earlier verified work.
                    if field not in record or not record[field]:
                        record[field] = value
    if METADATA.exists() and not reviewed:
        corrections = json.loads(METADATA.read_text(encoding="utf-8"))
        for record in records:
            correction = next((row for row in corrections if row["id"] == record["id"]), None)
            if correction:
                if not correction.get("sources"):
                    raise ValueError(f"Missing metadata evidence: {record['id']}")
                for field in ["lead", "institution", "name", "url"]:
                    if field in correction:
                        record[field] = correction[field]
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"{path.name}: duplicate record ids")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{path.name}: {len(records)} records, {path.stat().st_size} bytes")


def reviewed_catalogs() -> dict[str, list[dict[str, object]]]:
    """Read a portable, explicitly reviewed projection; never scrape during builds.

    Omitted collections keep their original source pipeline. Private annotations
    live in D1 and are never imported, updated or deleted by this builder.
    """
    if not REVIEWED_CENSUS.exists():
        return {}
    manifest = json.loads(REVIEWED_CENSUS.read_text(encoding="utf-8"))
    if manifest.get("status") != "REVIEWED_LOWER_BOUND" or not manifest.get("auditedAt") or not manifest.get("provenance"):
        raise ValueError("Census manifest must include reviewed status, date and provenance")
    catalogs = manifest.get("catalogs", {})
    if not catalogs or set(catalogs) - {"neuroai", "bio-inspired", "ai-for-science"}:
        raise ValueError("Census manifest has missing or unsupported collections")
    required = {"id", "collection", "name", "entityType", "lead", "institution", "country", "city", "url", "primary", "topics", "summary", "question", "questionBasis", "evidenceUrls", "status", "activity"}
    forbidden = {"privateNotes", "publicNotes", "decision", "published", "owner", "fit", "tier", "elite", "recruiting", "contactRule", "position"}
    for collection, records in catalogs.items():
        if not isinstance(records, list) or not records:
            raise ValueError(f"Reviewed collection is empty: {collection}")
        for record in records:
            if not required.issubset(record) or forbidden.intersection(record):
                raise ValueError(f"Invalid census fields: {record.get('id')}")
            if record["collection"] != collection or not record["id"] or not record["name"] or not record["summary"] or not record["activity"]:
                raise ValueError(f"Incomplete reviewed census identity: {record.get('id')}")
            if not str(record["url"]).startswith(("https://", "http://")) or not record["evidenceUrls"]:
                raise ValueError(f"Missing census source evidence: {record['id']}")
    return catalogs


def apply_membership(records: list[dict[str, object]], rl_records: list[dict[str, object]]) -> list[dict[str, object]]:
    """Apply reviewed inclusion decisions without rewriting censuses or D1 notes.

    Unreviewed rows retain their existing classification until the audit reaches
    them. A move resolves to an existing RL identity; it never clones a lab.
    """
    if not MEMBERSHIP.exists():
        return records
    decisions = json.loads(MEMBERSHIP.read_text(encoding="utf-8"))
    known = {str(row["id"]) for row in records}
    destinations = {str(row["id"]) for row in rl_records}
    seen: set[str] = set()
    removed: set[str] = set()
    for row in decisions:
        record_id = row.get("id")
        decision = row.get("decision")
        if record_id not in known or record_id in seen:
            raise ValueError(f"Unknown or repeated membership identity: {record_id}")
        seen.add(record_id)
        if decision not in {"keep", "move_rl", "exclude", "uncertain"}:
            raise ValueError(f"Invalid membership decision: {decision}")
        if not row.get("reason") or not row.get("sources") or not row.get("checkedAt"):
            raise ValueError(f"Missing membership evidence: {record_id}")
        if decision == "move_rl" and row.get("destinationId") not in destinations and row.get("destinationId") != record_id:
            raise ValueError(f"Unresolved RL destination: {record_id}")
        if decision != "keep":
            removed.add(record_id)
    return [row for row in records if row["id"] not in removed]


def apply_moves(records: list[dict[str, object]], neuroai_records: list[dict[str, object]]) -> list[dict[str, object]]:
    if not MEMBERSHIP.exists():
        return records
    moves = json.loads(MEMBERSHIP.read_text(encoding="utf-8"))
    known = {row["id"] for row in records}
    original = {row["id"]: row for row in neuroai_records}
    for move in moves:
        if move["decision"] != "move_rl" or move.get("destinationId") in known:
            continue
        if move.get("destinationId") != move["id"] or move["id"] not in original:
            raise ValueError(f"Unresolved RL move: {move['id']}")
        records.append({**original[move["id"]], "collection": "rl"})
        known.add(move["id"])
    return sorted(records, key=lambda row: str(row["name"]).casefold())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rl-only", action="store_true", help="build only the RL catalog")
    parser.add_argument("--rl-source", action="append", type=Path, help="RL census CSV (repeatable)")
    parser.add_argument("--rl-output", type=Path, default=OUTPUT / "rl.json")
    args = parser.parse_args()

    rl_records = rl(args.rl_source)
    if not args.rl_only:
        reviewed = reviewed_catalogs()
        neuroai_records = neuroai()
        write_catalog(OUTPUT / "great-minds.json", great_minds())
        write_catalog(OUTPUT / "neuroai.json", reviewed.get("neuroai", apply_membership(neuroai_records, rl_records)), reviewed="neuroai" in reviewed)
        for collection in ["bio-inspired", "ai-for-science"]:
            write_catalog(OUTPUT / f"{collection}.json", reviewed.get(collection, []), reviewed=collection in reviewed)
        rl_records = apply_moves(rl_records, neuroai_records)
        moves = json.loads(MEMBERSHIP.read_text(encoding="utf-8")) if MEMBERSHIP.exists() else []
        aliases = [{"sourceId": row["id"], "destinationId": row["destinationId"]} for row in moves if row["decision"] == "move_rl"]
        (OUTPUT / "membership-aliases.json").write_text(json.dumps(aliases, separators=(",", ":")) + "\n")
        reviewed_aliases = json.loads(REVIEWED_CENSUS.read_text()).get("annotationAliases", []) if REVIEWED_CENSUS.exists() else []
        known_alias_sources = set()
        for alias in reviewed_aliases:
            collection = alias.get("collection")
            source_id = alias.get("sourceId")
            destination_id = alias.get("destinationId")
            if collection not in reviewed or not isinstance(source_id, str) or not source_id or source_id == destination_id:
                raise ValueError("Invalid reviewed annotation alias")
            if destination_id not in {row["id"] for row in reviewed[collection]} or (collection, source_id) in known_alias_sources:
                raise ValueError("Missing destination or repeated reviewed annotation alias")
            known_alias_sources.add((collection, source_id))
        (OUTPUT / "census-aliases.json").write_text(json.dumps(reviewed_aliases, separators=(",", ":")) + "\n")
    write_catalog(args.rl_output, rl_records)


if __name__ == "__main__":
    main()
