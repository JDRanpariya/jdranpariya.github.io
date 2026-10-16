"""Apply a complete reviewed reflection audit without touching annotation IDs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit


def apply_reflection_review(records: list[dict], source_csv: Path, review_path: Path) -> list[dict]:
    if not review_path.exists():
        return records
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if review.get("status") != "REVIEWED" or not review.get("reviewedAt"):
        raise ValueError("Great Minds reflection audit must be reviewed")
    if review.get("baselineCsvSha256") != hashlib.sha256(source_csv.read_bytes()).hexdigest():
        raise ValueError("Great Minds baseline changed; reconcile the reflection audit first")
    baseline = {record["id"]: record for record in records}
    decisions = review.get("decisions", [])
    ids = [row.get("id") for row in decisions]
    if len(ids) != len(set(ids)) or set(ids) != set(baseline):
        raise ValueError("Great Minds reflection audit must cover every baseline ID exactly once")
    if any(row.get("decision") not in {"QUALIFY", "WITHHOLD"} or not row.get("reason") for row in decisions):
        raise ValueError("Great Minds reflection decisions require a disposition and reason")
    qualified = {row["id"] for row in decisions if row["decision"] == "QUALIFY"}
    result = []
    seen = set()
    for record in review.get("records", []):
        record_id = record.get("id")
        if not record_id or record_id in seen or record.get("collection") != "great-minds":
            raise ValueError("Invalid or repeated Great Minds reflection identity")
        seen.add(record_id)
        if record_id in baseline:
            if record_id not in qualified:
                raise ValueError("Withheld person cannot appear in the active Great Minds catalog")
            # Identity fields are frozen because annotations use these IDs.
            if any(record.get(key) != baseline[record_id][key] for key in ["name", "url"]):
                raise ValueError("Existing Great Minds name/URL must preserve its annotation identity")
        if not record.get("perspective") or not record.get("perspectiveSourceUrl"):
            raise ValueError("Every active person requires a sourced perspective")
        paths = record.get("readingPaths", [])
        if not paths:
            raise ValueError("Every active person requires a reflective reading or viewing path")
        for path in paths:
            if not all(path.get(key) for key in ["title", "url", "kind", "whyRead", "sourceUrl"]):
                raise ValueError("Incomplete reflective work entry point")
        urls = [record["url"], record["perspectiveSourceUrl"]]
        urls += [url for path in paths for url in [path["url"], path["sourceUrl"]]]
        if any(urlsplit(url).scheme not in {"http", "https"} or not urlsplit(url).netloc for url in urls):
            raise ValueError("Reflection sources require HTTP(S) URLs")
        forbidden = {"privateNotes", "publicNotes", "ownerId", "ownerEmail", "decision", "isPublished"}
        if forbidden.intersection(record):
            raise ValueError("Private annotations cannot be imported through a source catalog")
        result.append(record)
    if qualified - seen:
        raise ValueError("Qualified baseline people are missing their reading paths")
    return sorted(result, key=lambda item: str(item["name"]).casefold())
