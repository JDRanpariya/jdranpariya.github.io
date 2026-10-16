#!/usr/bin/env python3
"""Validate per-entry classification decisions against original census identities."""
from __future__ import annotations

import argparse
import csv
import importlib.util
import json
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", type=Path)
    parser.add_argument("--require-complete", action="store_true")
    parser.add_argument("--output", type=Path, default=ROOT / "data/source/catalog-membership.json")
    parser.add_argument("--ledger", type=Path)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("catalog_builder", ROOT / "scripts/build-research-catalogs.py")
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    neuroai = {row["id"]: row for row in builder.neuroai()}
    rl = {row["id"]: row for row in builder.rl()}
    decisions = []
    seen = set()
    for path in sorted(args.results.glob("*.json")):
        row = json.loads(path.read_text())
        record_id = row.get("id")
        if record_id not in neuroai or record_id in seen:
            raise ValueError(f"Unknown or repeated identity: {path.name}")
        seen.add(record_id)
        if row.get("decision") not in {"keep", "move_rl", "exclude", "uncertain"}:
            raise ValueError(f"Invalid decision: {path.name}")
        if not row.get("reason") or not row.get("sources"):
            raise ValueError(f"Missing evidence: {path.name}")
        date.fromisoformat(row["checkedAt"])
        if row["decision"] == "keep" and not row.get("bridge"):
            raise ValueError(f"Missing NeuroAI mechanism: {path.name}")
        if row["decision"] == "move_rl" and row.get("destinationId") not in rl and row.get("destinationId") != record_id:
            raise ValueError(f"Unresolved RL destination: {path.name}")
        for source in row["sources"]:
            parsed = urlparse(source.get("url", ""))
            if parsed.scheme not in {"https", "http"} or not parsed.hostname or not source.get("note"):
                raise ValueError(f"Invalid source: {path.name}")
        decisions.append({key: row.get(key) for key in ["id", "decision", "destinationId", "reason", "bridge", "sources", "checkedAt"]})
    if args.require_complete and seen != set(neuroai):
        raise ValueError(f"Membership reviews missing: {len(set(neuroai) - seen)}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(decisions, ensure_ascii=False, indent=2) + "\n")
    if args.ledger:
        args.ledger.parent.mkdir(parents=True, exist_ok=True)
        with args.ledger.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["id", "name", "decision", "destination_id", "destination_name", "reason", "bridge", "sources"])
            writer.writeheader()
            for row in decisions:
                destination = rl.get(row.get("destinationId"), neuroai.get(row.get("destinationId"), {}))
                writer.writerow({"id": row["id"], "name": neuroai[row["id"]]["name"], "decision": row["decision"], "destination_id": row.get("destinationId") or "", "destination_name": destination.get("name", ""), "reason": row["reason"], "bridge": row.get("bridge") or "", "sources": " | ".join(source["url"] for source in row["sources"])})
    print(json.dumps({"source_records": len(neuroai), "reviewed": len(decisions), "pending": len(neuroai) - len(decisions), "decisions": Counter(row["decision"] for row in decisions)}))


if __name__ == "__main__":
    main()
