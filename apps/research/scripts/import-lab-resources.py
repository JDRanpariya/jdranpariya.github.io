#!/usr/bin/env python3
"""Validate reviewed per-entry results and project them into catalog resources.

Raw source ledgers stay in the audit directory. No unreviewed fetch cache is
promoted into the catalog, and existing catalog IDs and annotations are unchanged.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_PLANS: set[str] = set()


def web_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname)


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def personal_url(value: object) -> bool:
    if not web_url(value):
        return False
    host = urlparse(value).hostname.lower()
    # Known institutional and profile-service targets are useful evidence, but
    # do not meet Jay's requested independent-personal-site rule.
    blocked = {"ualberta.ca", "mcgill.ca", "openreview.net", "researchgate.net", "linkedin.com", "orcid.org", "scholar.google.com", "github.com", "dblp.org"}
    return not re.search(r"\.edu(?:\.|$)|\.ac\.[a-z]{2,}$", host) and not any(host == domain or host.endswith("." + domain) for domain in blocked)


def plans(rows: list[dict]) -> list[dict]:
    output = []
    seen = set()
    for row in rows:
        if row.get("url") in EXCLUDED_PLANS:
            continue
        require(all(row.get(key) for key in ["title", "author", "kind", "url", "evidenceUrl"]), "Incomplete plan")
        require(row["kind"] in {"plan", "agenda", "roadmap", "statement", "proposal"}, "Invalid plan kind")
        require(web_url(row["url"]) and web_url(row["evidenceUrl"]), "Invalid plan link")
        require(row["title"].strip().lower() not in {"research", "research projects", "research interests", "publications", "cv"}, "Generic page is not a research plan")
        identity = (row["url"], row["author"], row["title"])
        if identity not in seen:
            seen.add(identity)
            output.append({key: row[key] for key in ["title", "url", "author", "kind", "evidenceUrl"]})
    return output


def project(row: dict) -> dict:
    require(row.get("status") in {"checked", "partial", "source_limited"}, "Invalid review status")
    has_resources = bool(row.get("leadSites") or row.get("researchPlans") or row.get("teamMembers"))
    require(bool(row.get("sources")) or (row["status"] == "source_limited" and not has_resources and bool(row.get("limitations"))), "No inspected sources recorded")
    for source in row.get("sources", []):
        require(web_url(source.get("url")) and bool(source.get("note")), "Missing source evidence")
    leads = []
    for lead in row.get("leadSites", []):
        require(bool(lead.get("name")) and personal_url(lead.get("url")) and web_url(lead.get("evidenceUrl")), "Invalid independent lead site")
        leads.append({key: lead[key] for key in ["name", "url", "evidenceUrl"]})
    members = []
    record_plans = list(row.get("researchPlans", []))
    seen = set()
    for member in row.get("teamMembers", []):
        # The raw ledger can preserve roster identities without an independent
        # site; the requested interface shows only members who have one.
        if not member.get("personalUrl"):
            # A valid authored proposal is still useful when its author has no
            # independent homepage. Keep it under the record's plan list.
            record_plans.extend(member.get("researchPlans", []))
            continue
        require(bool(member.get("name")) and personal_url(member.get("personalUrl")) and web_url(member.get("evidenceUrl")), "Invalid independent member site")
        identity = (member["name"], member["personalUrl"].rstrip("/"))
        require(identity not in seen, "Duplicate team member")
        seen.add(identity)
        members.append({
            "name": member["name"], "role": member.get("role", ""),
            "personalUrl": member["personalUrl"], "evidenceUrl": member["evidenceUrl"],
            "researchPlans": plans(member.get("researchPlans", [])),
        })
    return {
        "leadSites": leads,
        "researchPlans": plans(record_plans),
        "teamMembers": members,
        "resourcesReview": {"status": row["status"], "checkedAt": row["checkedAt"]},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", type=Path)
    parser.add_argument("--exclusions", type=Path, help="Independent review decisions: URL/reason pairs for rejected plans")
    parser.add_argument("--require-complete", action="store_true", help="Fail if any catalog ID is missing or its review is still partial")
    parser.add_argument("--output", type=Path, default=ROOT / "data/source/lab-research-resources.json")
    args = parser.parse_args()
    if args.exclusions:
        for decision in json.loads(args.exclusions.read_text()):
            require(web_url(decision.get("url")) and bool(decision.get("reason")), "Invalid plan exclusion")
            EXCLUDED_PLANS.add(decision["url"])
    # Validate against original census identities, including entries hidden by
    # the membership audit. Their review ledger and saved notes remain intact.
    spec = importlib.util.spec_from_file_location("catalog_builder", ROOT / "scripts/build-research-catalogs.py")
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    rl_records, neuroai_records = builder.rl(), builder.neuroai()
    known = {f"{row['collection']}:{row['id']}": row for row in rl_records + neuroai_records}
    required = {f"rl:{row['id']}" for row in rl_records}
    required.update(f"neuroai:{row['id']}" for row in builder.apply_membership(neuroai_records, rl_records))
    if builder.MEMBERSHIP.exists():
        for move in json.loads(builder.MEMBERSHIP.read_text()):
            if move["decision"] == "move_rl" and move.get("destinationId") == move["id"]:
                required.add(f"neuroai:{move['id']}")
    output = {}
    errors = []
    for path in sorted(args.results.glob("*.json")):
        try:
            row = json.loads(path.read_text())
            key = f"{row['collection']}:{row['recordId']}"
            require(key in known, f"Unknown catalog entry: {key}")
            require(key not in output, f"Duplicate catalog entry: {key}")
            output[key] = project(row)
        except (KeyError, ValueError, TypeError) as error:
            errors.append(f"{path.name}: {error}")
    if errors:
        raise SystemExit("\n".join(errors))
    if args.require_complete:
        require(required.issubset(output), "Some active catalog entries have no result")
        unfinished = [key for key, row in output.items() if key in required and row["resourcesReview"]["status"] == "partial"]
        require(not unfinished, f"Reviews remain unfinished: {len(unfinished)}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    counts = Counter(row["resourcesReview"]["status"] for row in output.values())
    pending = sum(key not in output or output[key]["resourcesReview"]["status"] == "partial" for key in required)
    print(json.dumps({"total": len(known), "results": len(output), "completed_reviews": len(output) - counts["partial"], "pending": len(known) - len(output) + counts["partial"], "statuses": counts,
                      "required_active_reviews": len(required), "pending_active_reviews": pending,
                      "with_plans": sum(bool(row["researchPlans"]) or any(member["researchPlans"] for member in row["teamMembers"]) for row in output.values()),
                      "members_with_sites": sum(len(row["teamMembers"]) for row in output.values())}))


if __name__ == "__main__":
    main()
