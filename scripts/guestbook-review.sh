#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# guestbook-review.sh — Daily guestbook review & push workflow
# ─────────────────────────────────────────────────────────────────
#
# Usage:  ./scripts/guestbook-review.sh
#
# What it does:
#   1. Fetches today's responses from the linked Google Sheet (CSV)
#   2. Shows each new entry for approval (y/n/edit)
#   3. Appends approved entries to src/_data/guestbook.json
#   4. Commits & pushes ONLY guestbook.json
#
# Prerequisites:
#   - Publish the Google Sheet linked to your form as CSV:
#     Google Sheet → File → Share → Publish to web → CSV
#   - Set the GUESTBOOK_SHEET_URL below (or export it in your shell)
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON="$ROOT/src/_data/guestbook.json"
TMP_CSV="$(mktemp /tmp/guestbook-XXXXX.csv)"
TMP_NEW="$(mktemp /tmp/guestbook-new-XXXXX.json)"

# ── Config ──────────────────────────────────────────────────────
# Replace with your published Google Sheet CSV URL:
SHEET_URL="${GUESTBOOK_SHEET_URL:-""
}"

if [[ -z "$SHEET_URL" ]]; then
  echo "❌ GUESTBOOK_SHEET_URL not set."
  echo ""
  echo "To get it:"
  echo "  1. Open the Google Sheet linked to your guestbook form"
  echo "  2. File → Share → Publish to web"
  echo "  3. Choose the responses sheet → CSV → Publish"
  echo "  4. Copy the URL and either:"
  echo "     export GUESTBOOK_SHEET_URL='https://docs.google.com/...' "
  echo "     or paste it into this script."
  exit 1
fi

# ── Helpers ─────────────────────────────────────────────────────
BOLD=$'\e[1m'  DIM=$'\e[2m'  GREEN=$'\e[32m'
YELLOW=$'\e[33m'  CYAN=$'\e[36m'  RESET=$'\e[0m'

confirm() {
  local prompt="$1"
  while true; do
    printf "%s [y/n/e(dit)/s(kip all)]: " "$prompt"
    read -r choice
    case "$choice" in
      y|Y) return 0 ;;
      n|N) return 1 ;;
      e|E) return 2 ;;
      s|S) return 3 ;;
      *) echo "  → y(es) / n(o) / e(dit message) / s(kip remaining)" ;;
    esac
  done
}

# ── Fetch sheet ─────────────────────────────────────────────────
echo "${CYAN}Fetching responses...${RESET}"
curl -sL "$SHEET_URL" -o "$TMP_CSV"

if [[ ! -s "$TMP_CSV" ]]; then
  echo "❌ Empty response from Google Sheet. Check the URL."
  rm -f "$TMP_CSV" "$TMP_NEW"
  exit 1
fi

# ── Parse CSV & find new entries ────────────────────────────────
# Google Forms CSV columns (adjust indices if your form differs):
#   0: Timestamp
#   1: Message  (entry.736310078)
#   2: Name     (entry.1611923301)
#   3: URL      (entry.2008969763)
#   4: Email    (entry.1366435166)
#   5: Theme    (entry.901424146)

python3 - "$TMP_CSV" "$JSON" "$TMP_NEW" <<'PYEOF'
import csv, json, sys
from datetime import datetime, date

csv_path, json_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

# Load existing entries to deduplicate
with open(json_path) as f:
    existing = json.load(f)

# Build a set of (date, name, message_start) for dedup
seen = set()
for e in existing:
    key = (e.get("date",""), e.get("name",""), e.get("message","")[:50])
    seen.add(key)

new_entries = []
with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)  # skip header row
    for row in reader:
        if len(row) < 3:
            continue
        # Parse timestamp → date string
        try:
            ts = datetime.strptime(row[0].strip(), "%m/%d/%Y %H:%M:%S")
            d = ts.strftime("%Y-%m-%d")
        except ValueError:
            try:
                ts = datetime.strptime(row[0].strip(), "%Y-%m-%d %H:%M:%S")
                d = ts.strftime("%Y-%m-%d")
            except ValueError:
                d = date.today().isoformat()

        entry = {
            "date": d,
            "name": row[2].strip() if len(row) > 2 else "Anonymous",
            "message": row[1].strip() if len(row) > 1 else "",
            "url": row[3].strip() if len(row) > 3 else "",
            "email": row[4].strip() if len(row) > 4 else "",
            "theme": row[5].strip() if len(row) > 5 else "beige",
        }

        key = (entry["date"], entry["name"], entry["message"][:50])
        if key not in seen:
            new_entries.append(entry)
            seen.add(key)

with open(out_path, 'w') as f:
    json.dump(new_entries, f, indent=2, ensure_ascii=False)

print(len(new_entries))
PYEOF

COUNT=$(tail -1 <<< "$(cat "$TMP_NEW" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')")

if [[ "$COUNT" == "0" ]]; then
  echo "${GREEN}✓ No new entries since last review.${RESET}"
  rm -f "$TMP_CSV" "$TMP_NEW"
  exit 0
fi

echo ""
echo "${BOLD}${YELLOW}$COUNT new entr$([ "$COUNT" = 1 ] && echo 'y' || echo 'ies') found:${RESET}"
echo ""

# ── Interactive review ──────────────────────────────────────────
APPROVED='[]'
IDX=0

while read -r ENTRY; do
  IDX=$((IDX + 1))
  NAME=$(echo "$ENTRY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')
  DATE=$(echo "$ENTRY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["date"])')
  MSG=$(echo "$ENTRY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["message"])')
  URL=$(echo "$ENTRY" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url",""))')
  THEME=$(echo "$ENTRY" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("theme","beige"))')

  echo "${BOLD}── Entry $IDX / $COUNT ──${RESET}"
  echo "  ${CYAN}Name:${RESET}  $NAME"
  echo "  ${CYAN}Date:${RESET}  $DATE"
  echo "  ${CYAN}Theme:${RESET} $THEME"
  [[ -n "$URL" ]] && echo "  ${CYAN}URL:${RESET}   $URL"
  echo "  ${CYAN}Message:${RESET}"
  echo "$MSG" | sed 's/^/    /'
  echo ""

  confirm "  ${GREEN}Approve this entry?${RESET}"
  RC=$?

  if [[ $RC -eq 0 ]]; then
    # Approved
    APPROVED=$(echo "$APPROVED" | python3 -c "
import json, sys
arr = json.load(sys.stdin)
arr.append(json.loads('''$ENTRY'''))
print(json.dumps(arr, ensure_ascii=False))
")
    echo "  ${GREEN}✓ Approved${RESET}"
  elif [[ $RC -eq 2 ]]; then
    # Edit message
    TMPFILE=$(mktemp /tmp/gb-edit-XXXXX.txt)
    echo "$MSG" > "$TMPFILE"
    ${EDITOR:-nano} "$TMPFILE"
    EDITED_MSG=$(cat "$TMPFILE")
    rm -f "$TMPFILE"
    EDITED=$(echo "$ENTRY" | python3 -c "
import json, sys
e = json.load(sys.stdin)
e['message'] = '''$EDITED_MSG'''.strip()
print(json.dumps(e, ensure_ascii=False))
")
    APPROVED=$(echo "$APPROVED" | python3 -c "
import json, sys
arr = json.load(sys.stdin)
arr.append(json.loads('''$EDITED'''))
print(json.dumps(arr, ensure_ascii=False))
")
    echo "  ${GREEN}✓ Approved (edited)${RESET}"
  elif [[ $RC -eq 3 ]]; then
    echo "  ${DIM}Skipping remaining entries.${RESET}"
    break
  else
    echo "  ${DIM}✗ Skipped${RESET}"
  fi
  echo ""
done < <(python3 -c "
import json
with open('$TMP_NEW') as f:
    for entry in json.load(f):
        print(json.dumps(entry, ensure_ascii=False))
")

# ── Write approved entries ──────────────────────────────────────
APPROVED_COUNT=$(echo "$APPROVED" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')

if [[ "$APPROVED_COUNT" == "0" ]]; then
  echo "${DIM}No entries approved. Nothing to write.${RESET}"
  rm -f "$TMP_CSV" "$TMP_NEW"
  exit 0
fi

# Prepend new entries (newest first) to existing guestbook
python3 - "$JSON" <<PYMERGE
import json, sys

with open("$JSON") as f:
    existing = json.load(f)

new = json.loads('''$APPROVED''')

# New entries go to the front (newest first)
merged = new + existing

with open("$JSON", 'w') as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"Wrote {len(new)} new + {len(existing)} existing = {len(merged)} total")
PYMERGE

echo ""
echo "${GREEN}✓ guestbook.json updated with $APPROVED_COUNT new entries.${RESET}"

# ── Git commit & push (only guestbook.json) ─────────────────────
echo ""
printf "${YELLOW}Push to git? [y/n]: ${RESET}"
read -r PUSH

if [[ "$PUSH" == "y" || "$PUSH" == "Y" ]]; then
  cd "$ROOT"
  git add src/_data/guestbook.json
  git commit -m "guestbook: add $APPROVED_COUNT new $([ "$APPROVED_COUNT" = 1 ] && echo 'entry' || echo 'entries') — $(date +%Y-%m-%d)"
  git push
  echo "${GREEN}✓ Pushed!${RESET}"
else
  echo "${DIM}Skipped push. Changes are in guestbook.json (unstaged).${RESET}"
fi

# ── Cleanup ─────────────────────────────────────────────────────
rm -f "$TMP_CSV" "$TMP_NEW"
echo ""
echo "${GREEN}Done ✓${RESET}"
