#!/usr/bin/env python3
"""
scripts/import-bardentreffen.py

Converts Blerta's Bardentreffen programme spreadsheet into
src/_data/bardentreffen.json, which /notes/bardentreffen-2026/ renders.

    python3 scripts/import-bardentreffen.py ~/Downloads/Blertaaaaaaaa_Bardentreffen.xlsx

Shape of the source workbook:
  - One sheet named "Stage Locations": stage name in A, Google Maps URL in B.
  - One sheet per festival day, named DD.MM.YYYY. Row 1 is the header —
    A1 is "Time", B1 onwards are stage names. Each following row has a time
    in column A and an act in the column of whichever stage it's playing.
  - Each act cell is filled with a colour standing for its genre, and
    hyperlinked to the festival's page for that act.
  - Below the grid, a "Legend / Musical Genres:" block maps each fill colour
    (column A) to a genre name (column B).

Everything is read back out of the file rather than hardcoded, so a corrected
draft can be re-imported without touching this script — including new stages,
new days, and renamed genres. Only the short genre labels and their id slugs
are known here, since the spreadsheet has no place to put them; an unrecognised
genre still imports, it just warns and falls back to a neutral colour on
the page.

No third-party deps: an .xlsx is a zip of XML, and stdlib reads both.
"""

import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "_data" / "bardentreffen.json"

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Genre name as written in the legend -> (id used in CSS, short label for cards).
# Keyed on letters and digits only, so punctuation and spacing edits to the
# legend wording ("Children's Music" vs "Childrens Music") still match.
GENRE_IDS = {
    "singersongwritertraditionalfolk": ("folk", "Folk"),
    "globalpopbrassworldfusion": ("world", "World"),
    "vocalchoral": ("vocal", "Choral"),
    "childrensmusic": ("kids", "Kids"),
    "spokenwordradiobroadcast": ("spoken", "Spoken"),
}

DAY_SHEET_RE = re.compile(r"^(\d{2})\.(\d{2})\.(\d{4})$")
CELL_RE = re.compile(r"([A-Z]+)(\d+)")
COUNTRY_RE = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")
MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ─── Workbook reading ─────────────────────────────────────────────────────────
class Workbook:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        self.shared = self._shared_strings()
        self.fills = self._fill_colours()
        self.sheets = self._sheet_index()

    def _xml(self, name):
        return ET.fromstring(self.z.read(name))

    def _shared_strings(self):
        try:
            root = self._xml("xl/sharedStrings.xml")
        except KeyError:
            return []
        return ["".join(t.text or "" for t in si.iter(f"{{{NS}}}t")) for si in root]

    def _fill_colours(self):
        """cellXfs style index -> ARGB fill, e.g. 12 -> 'FFC9DAF8'."""
        root = self._xml("xl/styles.xml")
        fills = []
        for f in root.find(f"{{{NS}}}fills"):
            pattern = f.find(f"{{{NS}}}patternFill")
            fg = pattern.find(f"{{{NS}}}fgColor") if pattern is not None else None
            fills.append(fg.get("rgb") if fg is not None else None)
        return [fills[int(xf.get("fillId") or 0)] for xf in root.find(f"{{{NS}}}cellXfs")]

    def _sheet_index(self):
        rels = {
            r.get("Id"): r.get("Target")
            for r in self._xml("xl/_rels/workbook.xml.rels")
        }
        out = {}
        for s in self._xml("xl/workbook.xml").find(f"{{{NS}}}sheets"):
            target = rels[s.get(f"{{{REL}}}id")].lstrip("/")
            out[s.get("name")] = target if target.startswith("xl/") else "xl/" + target
        return out

    def sheet(self, name):
        """-> (values by ref, hyperlink targets by ref, fill colours by ref)."""
        path = self.sheets[name]
        root = self._xml(path)

        values, fills = {}, {}
        for c in root.iter(f"{{{NS}}}c"):
            ref = c.get("r")
            style = int(c.get("s") or 0)
            if style < len(self.fills) and self.fills[style]:
                fills[ref] = self.fills[style]

            v = c.find(f"{{{NS}}}v")
            inline = c.find(f"{{{NS}}}is")
            if c.get("t") == "s" and v is not None:
                text = self.shared[int(v.text)]
            elif inline is not None:
                text = "".join(t.text or "" for t in inline.iter(f"{{{NS}}}t"))
            elif v is not None:
                text = v.text
            else:
                continue
            if text and str(text).strip():
                values[ref] = str(text).strip()

        rel_path = f"{path.rsplit('/', 1)[0]}/_rels/{path.rsplit('/', 1)[1]}.rels"
        try:
            link_rels = {r.get("Id"): r.get("Target") for r in self._xml(rel_path)}
        except KeyError:
            link_rels = {}
        links = {}
        for h in root.iter(f"{{{NS}}}hyperlink"):
            target = link_rels.get(h.get(f"{{{REL}}}id")) or h.get("location")
            if target:
                links[h.get("ref")] = target

        return values, links, fills


# ─── Cell helpers ─────────────────────────────────────────────────────────────
def col_of(ref):
    return CELL_RE.match(ref).group(1)


def row_of(ref):
    return int(CELL_RE.match(ref).group(2))


def parse_time(raw):
    """'19:00' -> '19:00'. Excel also stores some times as a day fraction."""
    raw = str(raw).strip()
    if re.fullmatch(r"\d{1,2}:\d{2}", raw):
        h, m = raw.split(":")
        return f"{int(h):02d}:{m}"
    try:
        minutes = round(float(raw) * 24 * 60)
    except ValueError:
        return None
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def sort_key(hhmm):
    """Sets after midnight belong to the end of the night, not the start."""
    h, m = map(int, hhmm.split(":"))
    return (h + 24 if h < 6 else h) * 60 + m


def split_country(name):
    """'MOS (JPN)' -> ('MOS', 'JPN'). Leaves real parentheses alone."""
    m = COUNTRY_RE.match(name)
    if not m:
        return name, None
    base, inner = m.group(1).strip(), m.group(2).strip()
    parts = [p.strip() for p in inner.split("/")]
    if base and all(re.fullmatch(r"[A-Za-z]{2,4}\.?", p) for p in parts):
        return base, inner
    return name, None


def fold(s):
    """Lowercase, strip accents — used for search keys. Mirrors the page's JS."""
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def genre_key(label):
    return re.sub(r"[^a-z0-9]", "", fold(label))


# ─── Import ───────────────────────────────────────────────────────────────────
_warned = set()


def read_genres(values, fills):
    """Legend block below the grid: fill colour in A, genre name in B.

    The legend is repeated on every day sheet, so warn about an unrecognised
    genre once rather than once per day.
    """
    legend_row = next(
        (row_of(r) for r, v in values.items() if v.lower().startswith("legend")), None
    )
    if legend_row is None:
        return {}, legend_row

    by_colour = {}
    for ref, label in values.items():
        if col_of(ref) != "B" or row_of(ref) <= legend_row:
            continue
        colour = fills.get(f"A{row_of(ref)}")
        if not colour:
            continue
        gid, short = GENRE_IDS.get(genre_key(label), (None, None))
        if gid is None:
            gid = re.sub(r"[^a-z0-9]+", "-", fold(label)).strip("-")[:20]
            short = label.split()[0]
            if gid not in _warned:
                _warned.add(gid)
                print(f"  ! unknown genre {label!r} — imported as '{gid}'. Add it to "
                      f"GENRE_IDS here and give it a colour in the page's CSS; until "
                      f"then it renders without one.")
        by_colour[colour] = {"id": gid, "label": label, "short": short}
    return by_colour, legend_row


def main():
    if len(sys.argv) != 2:
        sys.exit(f"usage: {sys.argv[0]} <programme.xlsx>")
    src = Path(sys.argv[1]).expanduser()
    if not src.exists():
        sys.exit(f"no such file: {src}")

    wb = Workbook(src)
    print(f"Reading {src.name}")

    # Stages + map links.
    values, links, _ = wb.sheet("Stage Locations")
    stages = []
    for row in sorted({row_of(r) for r in values if col_of(r) == "A"}):
        name = values.get(f"A{row}")
        if not name or name.lower() == "stage name":
            continue
        stages.append({"name": name, "map": links.get(f"B{row}") or values.get(f"B{row}")})
    stage_map = {s["name"]: s["map"] for s in stages}
    print(f"  {len(stages)} stages")

    day_sheets = sorted(
        (n for n in wb.sheets if DAY_SHEET_RE.match(n)),
        key=lambda n: DAY_SHEET_RE.match(n).group(3, 2, 1),
    )

    genres_by_colour, days, total = {}, [], 0
    for sheet in day_sheets:
        d, m, y = DAY_SHEET_RE.match(sheet).group(1, 2, 3)
        iso = f"{y}-{m}-{d}"

        values, links, fills = wb.sheet(sheet)
        found, legend_row = read_genres(values, fills)
        genres_by_colour.update(found)
        limit = legend_row or 10**6

        columns = {
            col_of(r): v for r, v in values.items() if row_of(r) == 1 and col_of(r) != "A"
        }
        order = list(columns.values())

        slots = []
        for ref in sorted((r for r in values if col_of(r) == "A"), key=row_of):
            row = row_of(ref)
            if row < 2 or row >= limit:
                continue
            time = parse_time(values[ref])
            if not time:
                continue

            acts = []
            for column, stage in columns.items():
                raw = values.get(f"{column}{row}")
                if not raw:
                    continue
                name, country = split_country(raw)
                genre = genres_by_colour.get(fills.get(f"{column}{row}", ""))
                acts.append({
                    "stage": stage,
                    "name": name,
                    "country": country,
                    "genre": genre["id"] if genre else None,
                    "url": links.get(f"{column}{row}"),
                    "q": fold(f"{name} {stage} {country or ''}"),
                })
            if acts:
                acts.sort(key=lambda a: order.index(a["stage"]))
                slots.append({"time": time, "acts": acts})

        slots.sort(key=lambda s: sort_key(s["time"]))

        weekday = WEEKDAYS[_weekday(int(y), int(m), int(d))]

        # Each act is rendered twice (once per view), so it needs an identity
        # the page can use to keep a starred act in sync between the two and
        # to remember it in localStorage across visits.
        by_stage = {s: [] for s in order}
        for slot in slots:
            for act in slot["acts"]:
                act["key"] = f"{iso}|{slot['time']}|{act['stage']}|{act['name']}"
                by_stage[act["stage"]].append(dict(act, time=slot["time"]))

        count = sum(len(v) for v in by_stage.values())
        total += count
        days.append({
            "iso": iso,
            "label": f"{weekday} {int(d)} {MONTHS[int(m) - 1]}",
            "short": f"{weekday[:3]} {int(d)}",
            "stages": order,
            "slots": slots,
            "byStage": [
                {"stage": s, "map": stage_map.get(s), "acts": by_stage[s]}
                for s in order if by_stage[s]
            ],
            "count": count,
        })

        missing = [a["name"] for s in slots for a in s["acts"] if not a["url"]]
        no_genre = [a["name"] for s in slots for a in s["acts"] if not a["genre"]]
        print(f"  {iso}: {count} acts, {len(order)} stages, {len(slots)} time slots")
        if missing:
            print(f"     no link in source (rendered as plain text): {', '.join(missing)}")
        if no_genre:
            print(f"     no genre fill in source: {', '.join(no_genre)}")

    ordered = [g for g in genres_by_colour.values()]
    seen, genres = set(), []
    for g in ordered:
        if g["id"] not in seen:
            seen.add(g["id"])
            genres.append(g)

    data = {
        "stages": stages,
        "stageMap": stage_map,
        "genres": genres,
        "genreShort": {g["id"]: g["short"] for g in genres},
        "days": days,
        "totalActs": total,
        "totalStages": len(stages),
    }

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{total} acts across {len(days)} days → {OUT.relative_to(ROOT)}")
    print("Now run: bun run format && bun run build")


def _weekday(y, m, d):
    """Zeller, Monday = 0. Avoids importing datetime for one lookup."""
    if m < 3:
        m += 12
        y -= 1
    h = (d + (13 * (m + 1)) // 5 + y + y // 4 - y // 100 + y // 400) % 7
    return (h + 5) % 7


if __name__ == "__main__":
    main()
