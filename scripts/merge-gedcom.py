#!/usr/bin/env python3
"""Merge Imberton_Darodes_Family_Tree.ged into family-tree.ged."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXISTING = ROOT / "data" / "family-tree.ged"
INCOMING = Path.home() / "Downloads" / "Imberton_Darodes_Family_Tree.ged"
REPORT = ROOT / "scripts" / "merge-gedcom-report.txt"

INDI_MAP: dict[str, str] = {
    "@I1@": "@D_Doum@",
    "@I2@": "@D_MSeves@",
    "@I3@": "@D_F1@",
    "@I4@": "@D_ACostes@",
    "@I5@": "@D_F2@",
    "@I6@": "@D_CMusotte@",
    "@I7@": "@D_J1@",
    "@I8@": "@D_JFMLaparade@",
    "@I9@": "@D_L1@",
    "@I10@": "@D_FESommeson@",
    "@I11@": "@D_G1@",
    "@I12@": "@D_EMillion@",
    "@I13@": "@M_Aim@",
    "@I14@": "@M_JDumollard@",
    "@I15@": "@M_Vincent@",
    "@I16@": "@M_Adeline@",
    "@I17@": "@I_BGEDarodes@",
    "@I18@": "@D_P1@",
    "@I19@": "@D_H1@",
    "@I20@": "@D_MA@",
    "@I21@": "@D_A1@",
    "@I22@": "@D_M1@",
    "@I23@": "@D_A2@",
    "@I24@": "@D_J2@",
    "@I25@": "@I_Paul1@",
    "@I26@": "@I_Esprite@",
    "@I27@": "@I_PaulJ@",
    "@I28@": "@I_MAReine@",
    "@I29@": "@I_Hippolyte@",
    "@I30@": "@I_PaulB@",
    "@I31@": "@I_MMPrioron@",
    "@I32@": "@I_MPierre@",
    "@I33@": "@I_MTAEGirard@",
    "@I34@": "@I_JAVarenne@",
    "@I35@": "@I_MNPaul@",
    "@I36@": "@I_Jean@",
    "@I37@": "@P_Janine@",
    "@I38@": "@I_MAPierrette@",
    "@I39@": "@G_Joseph@",
    "@I40@": "@I_JGA@",
    "@I41@": "@L_Claudette@",
}

FAM_MAP: dict[str, str] = {
    "@F1@": "@F_Darodes_0@",
    "@F2@": "@F_Darodes_1@",
    "@F3@": "@F_Darodes_2@",
    "@F4@": "@F_Darodes_3@",
    "@F5@": "@F_Darodes_4@",
    "@F6@": "@F_Million_Vincent@",
    "@F7@": "@F_Million_Base@",
    "@F8@": "@F_Darodes_5@",
    "@F9@": "@F_Imb_1@",
    "@F10@": "@F_Imb_2@",
    "@F11@": "@F_Imb_3@",
    "@F12@": "@F_Imb_5@",
    "@F13@": "@F_Imb_4@",
    "@F14@": "@F_Imb_6@",
    "@F15@": "@F_Jean_Janine@",
    "@F16@": "@F_Monique_Joseph@",
    "@F17@": "@F_Jacq_Claud@",
}

NEW_INDI: dict[str, list[str]] = {
    "@D_Doum@": [
        "0 @D_Doum@ INDI",
        "1 NAME Doumengès /Darolles/",
        "1 OCCU laborer",
        "1 BIRT",
        "2 DATE ABT 1660",
        "1 FAMS @F_Darodes_0@",
    ],
    "@D_MSeves@": [
        "0 @D_MSeves@ INDI",
        "1 NAME Marie /Seves/",
        "1 BIRT",
        "2 DATE ABT 1670",
        "1 FAMS @F_Darodes_0@",
    ],
    "@M_Vincent@": [
        "0 @M_Vincent@ INDI",
        "1 NAME Vincent /Million/",
        "1 BIRT",
        "2 DATE 1788",
        "1 DEAT",
        "2 DATE 1870",
        "1 FAMS @F_Million_Vincent@",
    ],
    "@M_Adeline@": [
        "0 @M_Adeline@ INDI",
        "1 NAME Adeline /Bourgeois/",
        "1 BIRT",
        "2 DATE 1792",
        "1 DEAT",
        "2 DATE 1857",
        "1 FAMS @F_Million_Vincent@",
    ],
}

NEW_FAM: dict[str, list[str]] = {
    "@F_Darodes_0@": [
        "0 @F_Darodes_0@ FAM",
        "1 HUSB @D_Doum@",
        "1 WIFE @D_MSeves@",
        "1 CHIL @D_F1@",
    ],
    "@F_Million_Vincent@": [
        "0 @F_Million_Vincent@ FAM",
        "1 HUSB @M_Vincent@",
        "1 WIFE @M_Adeline@",
        "1 CHIL @M_Aim@",
    ],
}

INSERT_INDI_BEFORE = {
    "@D_Doum@": "@D_F1@",
    "@D_MSeves@": "@D_F1@",
    "@M_Vincent@": "@M_Aim@",
    "@M_Adeline@": "@M_Aim@",
}

INSERT_FAM_BEFORE = {
    "@F_Darodes_0@": "@F_Darodes_1@",
    "@F_Million_Vincent@": "@F_Million_Base@",
}


@dataclass
class GedcomRecord:
    xref: str
    tag: str
    lines: list[str] = field(default_factory=list)


def parse_gedcom(text: str) -> tuple[list[str], list[GedcomRecord]]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    header: list[str] = []
    records: list[GedcomRecord] = []
    current: GedcomRecord | None = None

    for line in lines:
        if line.startswith("0 ") and " @" in line and not line.startswith("0 TRLR"):
            if current:
                records.append(current)
            m = re.match(r"^0 (@[^@]+@) (\S+)", line)
            if not m:
                continue
            current = GedcomRecord(xref=m.group(1), tag=m.group(2), lines=[line])
        elif line.strip() == "0 TRLR":
            if current:
                records.append(current)
            break
        elif current is not None:
            current.lines.append(line)
        elif not records:
            header.append(line)

    return header, records


def normalize_year(date: str | None) -> str | None:
    if not date:
        return None
    m = re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", date)
    return m.group(1) if m else None


def extract_events(record: GedcomRecord) -> dict[str, dict[str, str | None]]:
    events: dict[str, dict[str, str | None]] = {}
    stack: list[tuple[int, str]] = []
    for line in record.lines[1:]:
        m = re.match(r"^(\d+) (\S+)(?: (.*))?$", line)
        if not m:
            continue
        level, tag, value = int(m.group(1)), m.group(2), m.group(3)
        while stack and stack[-1][0] >= level:
            stack.pop()
        if tag in {"BIRT", "DEAT", "MARR", "DIV", "OCCU"} and level == 1:
            events[tag] = {"value": value, "date": None, "place": None}
            stack.append((level, tag))
        elif stack and level == 2 and stack[-1][1] in events:
            parent = stack[-1][1]
            if tag == "DATE":
                events[parent]["date"] = value
            elif tag == "PLAC":
                events[parent]["place"] = value
    return events


def has_tag(record: GedcomRecord, tag: str) -> bool:
    return any(re.match(rf"^1 {tag}\b", line) for line in record.lines)


def has_famc(record: GedcomRecord, fam_id: str) -> bool:
    return any(line.strip() == f"1 FAMC {fam_id}" for line in record.lines)


def add_famc(record: GedcomRecord, fam_id: str) -> None:
    if has_famc(record, fam_id):
        return
    insert_at = len(record.lines)
    for i, line in enumerate(record.lines[1:], start=1):
        if re.match(r"^1 FAMS\b", line):
            insert_at = i
            break
    record.lines.insert(insert_at, f"1 FAMC {fam_id}")


def merge_event_lines(
    target: GedcomRecord,
    tag: str,
    incoming: dict[str, str | None],
    conflicts: list[str],
    label: str,
) -> bool:
    existing = extract_events(target).get(tag)
    changed = False

    if tag == "OCCU":
        if has_tag(target, "OCCU") or not incoming.get("value"):
            return False
        target.lines.append(f"1 OCCU {incoming['value']}")
        return True

    if existing and existing.get("date"):
        in_date = incoming.get("date")
        if in_date:
            ey = normalize_year(existing["date"])
            iy = normalize_year(in_date)
            if ey and iy and ey != iy:
                conflicts.append(
                    f"{label} {tag}: existing={existing['date']!r} vs incoming={in_date!r}"
                )
        return False

    if existing:
        if incoming.get("place") and not existing.get("place"):
            for i, line in enumerate(target.lines):
                if line.startswith("1 " + tag):
                    j = i + 1
                    while j < len(target.lines) and target.lines[j].startswith("2 "):
                        j += 1
                    target.lines.insert(j, f"2 PLAC {incoming['place']}")
                    return True
        return False

    if not incoming.get("date") and not incoming.get("place"):
        return False

    block = [f"1 {tag}"]
    if incoming.get("date"):
        block.append(f"2 DATE {incoming['date']}")
    if incoming.get("place"):
        block.append(f"2 PLAC {incoming['place']}")
    insert_at = 1
    for i, line in enumerate(target.lines[1:], start=1):
        if re.match(r"^1 (FAMC|FAMS)\b", line):
            insert_at = i
            break
        insert_at = i + 1
    for offset, line in enumerate(block):
        target.lines.insert(insert_at + offset, line)
    return True


def merge_marr(
    target: GedcomRecord,
    incoming_date: str | None,
    conflicts: list[str],
    label: str,
) -> bool:
    existing = extract_events(target).get("MARR")
    if existing and existing.get("date"):
        if incoming_date:
            ey = normalize_year(existing["date"])
            iy = normalize_year(incoming_date)
            if ey and iy and ey != iy:
                conflicts.append(
                    f"{label} MARR: existing={existing['date']!r} vs incoming={incoming_date!r}"
                )
        return False
    if not incoming_date:
        return False
    target.lines.extend(["1 MARR", f"2 DATE {incoming_date}"])
    return True


def insert_record_before(
    records: list[GedcomRecord],
    new_record: GedcomRecord,
    before_xref: str,
    inserted: set[str],
    existing_xrefs: set[str],
) -> None:
    if new_record.xref in inserted or new_record.xref in existing_xrefs:
        return
    for i, rec in enumerate(records):
        if rec.xref == before_xref:
            records.insert(i, new_record)
            inserted.add(new_record.xref)
            return
    records.append(new_record)
    inserted.add(new_record.xref)


def main() -> int:
    if not INCOMING.exists():
        print(f"Missing incoming file: {INCOMING}", file=sys.stderr)
        return 1

    header, records = parse_gedcom(EXISTING.read_text(encoding="utf-8"))
    _, incoming_records = parse_gedcom(INCOMING.read_text(encoding="utf-8"))
    incoming = {r.xref: r for r in incoming_records}
    by_xref = {r.xref: r for r in records}

    conflicts: list[str] = []
    enrichments: list[str] = []

    for old_id, new_id in INDI_MAP.items():
        if old_id not in incoming or new_id not in by_xref:
            continue
        dst = by_xref[new_id]
        events = extract_events(incoming[old_id])
        label = new_id
        for tag, payload in events.items():
            if merge_event_lines(dst, tag, payload, conflicts, label):
                enrichments.append(f"{label}: added {tag}")

    for old_id, new_id in FAM_MAP.items():
        if old_id not in incoming or new_id not in by_xref:
            continue
        marr = extract_events(incoming[old_id]).get("MARR")
        if merge_marr(
            by_xref[new_id],
            marr.get("date") if marr else None,
            conflicts,
            new_id,
        ):
            enrichments.append(f"{new_id}: added MARR")

    inserted: set[str] = set()
    existing_xrefs = set(by_xref.keys())
    for xref, lines in NEW_INDI.items():
        insert_record_before(
            records,
            GedcomRecord(xref=xref, tag="INDI", lines=lines),
            INSERT_INDI_BEFORE[xref],
            inserted,
            existing_xrefs,
        )
        if xref in inserted:
            enrichments.append(f"Added individual {xref}")

    for xref, lines in NEW_FAM.items():
        insert_record_before(
            records,
            GedcomRecord(xref=xref, tag="FAM", lines=lines),
            INSERT_FAM_BEFORE[xref],
            inserted,
            existing_xrefs,
        )
        if xref in inserted:
            enrichments.append(f"Added family {xref}")

    if "@D_F1@" in by_xref:
        if not has_famc(by_xref["@D_F1@"], "@F_Darodes_0@"):
            add_famc(by_xref["@D_F1@"], "@F_Darodes_0@")
            enrichments.append("@D_F1@: linked FAMC @F_Darodes_0@")
    if "@M_Aim@" in by_xref:
        if not has_famc(by_xref["@M_Aim@"], "@F_Million_Vincent@"):
            add_famc(by_xref["@M_Aim@"], "@F_Million_Vincent@")
            enrichments.append("@M_Aim@: linked FAMC @F_Million_Vincent@")

    out_lines = list(header)
    if out_lines and out_lines[-1].strip():
        out_lines.append("")
    for rec in records:
        out_lines.extend(rec.lines)
        out_lines.append("")
    out_lines.append("0 TRLR")
    out_lines.append("")

    EXISTING.write_text("\n".join(out_lines), encoding="utf-8")

    report_lines = [
        "GEDCOM merge report",
        f"Incoming: {INCOMING}",
        f"Output: {EXISTING}",
        "",
        f"Enrichments ({len(enrichments)}):",
        *[f"  - {e}" for e in enrichments],
        "",
        f"Conflicts — existing data kept ({len(conflicts)}):",
        *[f"  - {c}" for c in conflicts],
    ]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    print("\n".join(report_lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
