#!/usr/bin/env python3
"""
Prepare Phase 1 reference dataset artifacts for Pathfinder Lite.

This script is intentionally non-runtime. It reads the original Pathfinder
reference data and emits deterministic, reviewable JSON/Markdown artifacts for
later import work (Phase 2+).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REFERENCE_ROOT = PROJECT_ROOT / "docs" / "_reference" / "pathfinder-pi-original"
DEFAULT_OUT_DIR = PROJECT_ROOT / "backend" / "data" / "chatbot"
DEFAULT_GEOJSON = PROJECT_ROOT / "public" / "data" / "catanduanes_datafile.geojson"

DATASET_REL = Path("src") / "backend" / "dataset" / "dataset.json"
NEW_ENTRIES_REL = Path("test") / "json" / "new_entries.json"
CONFIG_REL = Path("src") / "backend" / "config" / "config.yaml"

QA_ARTIFACT = "reference_phase1_qa.json"
PLACE_MAP_ARTIFACT = "reference_phase1_place_map.json"
REPORT_ARTIFACT = "REFERENCE_PHASE1_PREP_REPORT.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build Phase 1 normalized reference dataset artifacts."
    )
    parser.add_argument(
        "--reference-root",
        type=Path,
        default=DEFAULT_REFERENCE_ROOT,
        help="Path to docs/_reference/pathfinder-pi-original",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help="Output directory for JSON artifacts",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on malformed or incomplete rows instead of skipping them",
    )
    return parser.parse_args()


def fix_mojibake(value: Any) -> str:
    text = str(value or "")
    for source_encoding in ("cp1252", "latin-1"):
        try:
            repaired = text.encode(source_encoding).decode("utf-8")
            # Keep repaired text only if it appears at least as readable.
            if repaired.count("\ufffd") <= text.count("\ufffd"):
                return repaired
        except UnicodeError:
            continue
    return text


def clean_text(value: Any) -> str:
    text = fix_mojibake(value)
    # Keep natural spacing in answers/questions, collapse repeated whitespace.
    return re.sub(r"\s+", " ", text).strip()


def normalize_text(value: Any) -> str:
    text = clean_text(value)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_json_array(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"{path} is not a JSON array")
    rows = []
    for item in payload:
        if isinstance(item, dict):
            rows.append(item)
    return rows


def load_geo_points_by_normalized_name(path: Path) -> dict[str, dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    by_normalized_name: dict[str, dict[str, Any]] = {}
    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue

        properties = feature.get("properties") or {}
        name = clean_text(properties.get("name"))
        coords = geometry.get("coordinates") or []
        if not name or len(coords) < 2:
            continue

        key = normalize_text(name)
        by_normalized_name[key] = {
            "name": name,
            "coordinates": {
                "lat": float(coords[1]),
                "lng": float(coords[0]),
            },
        }
    return by_normalized_name


def load_config_places(path: Path) -> dict[str, dict[str, Any]]:
    """
    Lightweight YAML reader for the `places:` block in config.yaml.
    No external dependencies are used by design.
    """
    lines = path.read_text(encoding="utf-8").splitlines()
    in_places = False
    current_name = ""
    places: dict[str, dict[str, Any]] = {}

    place_pattern = re.compile(r'^\s{2}"(.+)":\s*$')
    lat_pattern = re.compile(r"^\s{4}lat:\s*(.+?)\s*$")
    lng_pattern = re.compile(r"^\s{4}lng:\s*(.+?)\s*$")
    type_pattern = re.compile(r"^\s{4}type:\s*(.+?)\s*$")

    for line in lines:
        if not in_places:
            if line.strip() == "places:":
                in_places = True
            continue

        # End when we hit a new top-level section.
        if line and not line.startswith(" "):
            break

        match_place = place_pattern.match(line)
        if match_place:
            current_name = clean_text(match_place.group(1))
            places[current_name] = {"lat": None, "lng": None, "type": None}
            continue

        if not current_name:
            continue

        match_lat = lat_pattern.match(line)
        if match_lat:
            try:
                places[current_name]["lat"] = float(match_lat.group(1))
            except ValueError:
                places[current_name]["lat"] = None
            continue

        match_lng = lng_pattern.match(line)
        if match_lng:
            try:
                places[current_name]["lng"] = float(match_lng.group(1))
            except ValueError:
                places[current_name]["lng"] = None
            continue

        match_type = type_pattern.match(line)
        if match_type:
            places[current_name]["type"] = clean_text(match_type.group(1))

    return places


def to_activity_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        out = [clean_text(item) for item in value if clean_text(item)]
        return out
    as_text = clean_text(value)
    return [as_text] if as_text else []


def to_optional_clean_text(value: Any) -> str | None:
    text = clean_text(value)
    return text or None


def row_coordinates(row: dict[str, Any]) -> dict[str, float] | None:
    coords = row.get("coordinates")
    if not isinstance(coords, dict):
        return None
    lat = coords.get("lat")
    lng = coords.get("lng")
    if lat is None or lng is None:
        return None
    try:
        return {"lat": float(lat), "lng": float(lng)}
    except (TypeError, ValueError):
        return None


def build_qa_rows(
    dataset_rows: list[dict[str, Any]],
    new_rows: list[dict[str, Any]],
    geo_points: dict[str, dict[str, Any]],
    config_places: dict[str, dict[str, Any]],
    strict: bool,
) -> tuple[
    list[dict[str, Any]],
    dict[str, dict[str, Any]],
    dict[str, Any],
]:
    """
    Returns:
    - qa_rows
    - place_map_rows_by_canonical
    - stats
    """
    config_by_norm = {
        normalize_text(name): {"name": name, **meta}
        for name, meta in config_places.items()
    }

    source_rank = {"dataset.json": 0, "new_entries.json": 1}
    annotated_rows: list[dict[str, Any]] = []

    for row in dataset_rows:
        annotated_rows.append({**row, "__source_file": "dataset.json"})
    for row in new_rows:
        annotated_rows.append({**row, "__source_file": "new_entries.json"})

    deduped_by_question: dict[str, dict[str, Any]] = {}
    dedupe_replace_count = 0
    skipped_rows = 0

    for idx, row in enumerate(annotated_rows):
        question = clean_text(row.get("input"))
        norm_question = normalize_text(question)

        if not norm_question:
            if strict:
                raise ValueError(f"Missing/empty input question at row index {idx}")
            skipped_rows += 1
            continue

        answer = clean_text(row.get("summary_offline")) or clean_text(row.get("output"))
        if not answer:
            if strict:
                raise ValueError(
                    f"Missing both summary_offline/output for normalized question: {norm_question!r}"
                )
            skipped_rows += 1
            continue

        record = {
            "__norm_question": norm_question,
            "__source_file": row["__source_file"],
            "__source_rank": source_rank[row["__source_file"]],
            "__source_order": idx,
            "question": question,
            "answer": answer,
            "place_name_raw": to_optional_clean_text(row.get("place_name")),
            "topic": to_optional_clean_text(row.get("topic")),
            "activities": to_activity_list(row.get("activities")),
            "location": to_optional_clean_text(row.get("location")),
            "budget": to_optional_clean_text(row.get("budget")),
            "group_type": to_optional_clean_text(row.get("group_type")),
            "skill_level": to_optional_clean_text(row.get("skill_level")),
            "__row_coordinates": row_coordinates(row),
        }

        existing = deduped_by_question.get(norm_question)
        if existing is None:
            deduped_by_question[norm_question] = record
            continue

        existing_rank = existing["__source_rank"]
        incoming_rank = record["__source_rank"]
        if incoming_rank > existing_rank:
            deduped_by_question[norm_question] = record
            dedupe_replace_count += 1
            continue

        # Same-source duplicates: keep first encountered for determinism.
        if incoming_rank == existing_rank:
            continue

    selected = sorted(
        deduped_by_question.values(),
        key=lambda row: (row["__norm_question"], row["__source_file"], row["question"]),
    )

    place_map_builder: dict[str, dict[str, Any]] = {}
    qa_rows: list[dict[str, Any]] = []

    for index, record in enumerate(selected, start=1):
        place_name_raw = record["place_name_raw"]
        place_name_canonical = None
        mapping_status = "unresolved"
        best_geo_coords = None
        config_coords = None
        coord_source = None

        if place_name_raw:
            norm_place = normalize_text(place_name_raw)
            geo_match = geo_points.get(norm_place)
            config_match = config_by_norm.get(norm_place)

            if geo_match:
                place_name_canonical = geo_match["name"]
                mapping_status = "geo_exact"
                best_geo_coords = geo_match["coordinates"]
                coord_source = "geojson"
            elif config_match:
                place_name_canonical = config_match["name"]
                mapping_status = "config_only"
                if config_match.get("lat") is not None and config_match.get("lng") is not None:
                    config_coords = {
                        "lat": float(config_match["lat"]),
                        "lng": float(config_match["lng"]),
                    }
                    coord_source = "config"
            else:
                place_name_canonical = place_name_raw
                mapping_status = "unresolved"

        qa_row = {
            "id": f"phase1_qa_{index:04d}",
            "question": record["question"],
            "answer": record["answer"],
            "place_name_raw": place_name_raw,
            "place_name_canonical": place_name_canonical,
            "mapping_status": mapping_status,
            "topic": record["topic"],
            "activities": record["activities"],
            "location": record["location"],
            "budget": record["budget"],
            "group_type": record["group_type"],
            "skill_level": record["skill_level"],
            "source_file": record["__source_file"],
        }
        qa_rows.append(qa_row)

        if not place_name_raw or not place_name_canonical:
            continue

        canonical_key = normalize_text(place_name_canonical)
        entry = place_map_builder.get(canonical_key)
        if entry is None:
            entry = {
                "place_name_canonical": place_name_canonical,
                "mapping_status": mapping_status,
                "best_coordinates": None,
                "variants": set(),
                "source_files": set(),
                "row_count": 0,
                "has_geo_match": False,
                "has_config_match": False,
                "coordinate_sources": set(),
                "_candidate_coords": [],
            }
            place_map_builder[canonical_key] = entry

        entry["variants"].add(place_name_raw)
        entry["source_files"].add(record["__source_file"])
        entry["row_count"] += 1

        if mapping_status == "geo_exact":
            entry["has_geo_match"] = True
            entry["mapping_status"] = "geo_exact"
        elif mapping_status == "config_only" and entry["mapping_status"] != "geo_exact":
            entry["has_config_match"] = True
            entry["mapping_status"] = "config_only"

        if best_geo_coords:
            entry["coordinate_sources"].add("geojson")
            entry["_candidate_coords"].append(("geojson", best_geo_coords))
        if record["__row_coordinates"]:
            entry["coordinate_sources"].add("row_coordinates")
            entry["_candidate_coords"].append(("row_coordinates", record["__row_coordinates"]))
        if config_coords:
            entry["coordinate_sources"].add("config")
            entry["_candidate_coords"].append(("config", config_coords))

    # Resolve best coordinates deterministically with priority:
    # geojson > row_coordinates > config.
    source_priority = {"geojson": 0, "row_coordinates": 1, "config": 2}
    place_map_rows: list[dict[str, Any]] = []

    for key in sorted(place_map_builder.keys()):
        entry = place_map_builder[key]
        coords = None
        if entry["_candidate_coords"]:
            chosen = sorted(
                entry["_candidate_coords"],
                key=lambda item: (
                    source_priority.get(item[0], 99),
                    round(float(item[1]["lat"]), 6),
                    round(float(item[1]["lng"]), 6),
                ),
            )[0]
            coords = {
                "lat": round(float(chosen[1]["lat"]), 6),
                "lng": round(float(chosen[1]["lng"]), 6),
            }

        place_map_rows.append(
            {
                "place_name_canonical": entry["place_name_canonical"],
                "mapping_status": entry["mapping_status"],
                "best_coordinates": coords,
                "variants": sorted(entry["variants"], key=normalize_text),
                "source_provenance": {
                    "source_files": sorted(entry["source_files"]),
                    "row_count": entry["row_count"],
                    "has_geo_match": entry["has_geo_match"],
                    "has_config_match": entry["has_config_match"],
                    "coordinate_sources": sorted(entry["coordinate_sources"]),
                },
            }
        )

    stats = {
        "qa_row_count": len(qa_rows),
        "place_map_count": len(place_map_rows),
        "dedupe_replace_count": dedupe_replace_count,
        "skipped_rows": skipped_rows,
        "mapping_counts": {
            "geo_exact": sum(1 for row in qa_rows if row["mapping_status"] == "geo_exact"),
            "config_only": sum(1 for row in qa_rows if row["mapping_status"] == "config_only"),
            "unresolved": sum(1 for row in qa_rows if row["mapping_status"] == "unresolved"),
        },
        "unresolved_places": sorted(
            {
                row["place_name_canonical"]
                for row in qa_rows
                if row["mapping_status"] == "unresolved" and row["place_name_canonical"]
            },
            key=normalize_text,
        ),
    }

    return qa_rows, {row["place_name_canonical"]: row for row in place_map_rows}, stats


def json_write(path: Path, payload: Any) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8")


def build_report(
    dataset_rows: list[dict[str, Any]],
    new_rows: list[dict[str, Any]],
    combined_unique_raw_questions: int,
    combined_unique_norm_questions: int,
    combined_unique_places: int,
    qa_stats: dict[str, Any],
) -> str:
    unresolved_lines = qa_stats["unresolved_places"]
    if unresolved_lines:
        unresolved_md = "\n".join(f"- {name}" for name in unresolved_lines)
    else:
        unresolved_md = "- (none)"

    return (
        "# Reference Phase 1 Prep Report\n\n"
        "## Summary\n"
        "This report was generated by `scripts/reference_phase1_prepare.py`.\n"
        "Phase 1 is data-prep only and does not change runtime chatbot/map behavior.\n\n"
        "## Ingestion Envelope\n"
        f"- `dataset.json` rows: **{len(dataset_rows)}**\n"
        f"- `new_entries.json` rows: **{len(new_rows)}**\n"
        f"- Combined rows: **{len(dataset_rows) + len(new_rows)}**\n"
        f"- Combined unique raw questions: **{combined_unique_raw_questions}**\n"
        f"- Combined unique normalized questions: **{combined_unique_norm_questions}**\n"
        f"- Combined unique place names: **{combined_unique_places}**\n\n"
        "## Output Artifact Counts\n"
        f"- QA rows emitted: **{qa_stats['qa_row_count']}**\n"
        f"- Place map rows emitted: **{qa_stats['place_map_count']}**\n"
        f"- Dedup replacements due to source precedence: **{qa_stats['dedupe_replace_count']}**\n"
        f"- Skipped malformed/incomplete rows: **{qa_stats['skipped_rows']}**\n\n"
        "## Mapping Coverage\n"
        f"- `geo_exact`: **{qa_stats['mapping_counts']['geo_exact']}**\n"
        f"- `config_only`: **{qa_stats['mapping_counts']['config_only']}**\n"
        f"- `unresolved`: **{qa_stats['mapping_counts']['unresolved']}**\n\n"
        "## Unresolved Place Names (Text-Only in Phase 1)\n"
        f"{unresolved_md}\n\n"
        "## Normalization Decisions\n"
        "- Unicode/diacritic cleanup is applied for matching and dedup keys.\n"
        "- Matching keys use lowercase + punctuation collapse + whitespace normalization.\n"
        "- Source precedence for conflicting questions is `new_entries.json` over `dataset.json`.\n"
        "- Question deduplication is based on normalized `input`.\n"
        "- Answer precedence is `summary_offline`, then `output`.\n"
        "- Metadata is preserved when present: `place_name`, `topic`, `activities`, `location`, `budget`, `group_type`, `skill_level`.\n"
        "- Unresolved place-like terms are retained as text-only records (no pin assumptions in Phase 1).\n"
    )


def main() -> int:
    args = parse_args()
    reference_root = args.reference_root.resolve()
    out_dir = args.out_dir.resolve()
    geojson_path = DEFAULT_GEOJSON.resolve()

    dataset_path = reference_root / DATASET_REL
    new_entries_path = reference_root / NEW_ENTRIES_REL
    config_path = reference_root / CONFIG_REL

    required_paths = [dataset_path, new_entries_path, config_path, geojson_path]
    missing = [path for path in required_paths if not path.exists()]
    if missing:
        for path in missing:
            print(f"ERROR: Missing required input file: {path}", file=sys.stderr)
        return 1

    dataset_rows = load_json_array(dataset_path)
    new_rows = load_json_array(new_entries_path)
    geo_points = load_geo_points_by_normalized_name(geojson_path)
    config_places = load_config_places(config_path)

    combined_rows = dataset_rows + new_rows
    combined_unique_raw_questions = len(
        {
            str(row.get("input") or "").strip()
            for row in combined_rows
            if str(row.get("input") or "").strip()
        }
    )
    combined_unique_norm_questions = len(
        {
            normalize_text(clean_text(row.get("input")))
            for row in combined_rows
            if normalize_text(clean_text(row.get("input")))
        }
    )
    combined_unique_places = len(
        {
            str(row.get("place_name") or "").strip()
            for row in combined_rows
            if str(row.get("place_name") or "").strip()
        }
    )

    qa_rows, place_map_by_name, qa_stats = build_qa_rows(
        dataset_rows=dataset_rows,
        new_rows=new_rows,
        geo_points=geo_points,
        config_places=config_places,
        strict=args.strict,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    qa_path = out_dir / QA_ARTIFACT
    place_map_path = out_dir / PLACE_MAP_ARTIFACT
    report_path = PROJECT_ROOT / "docs" / REPORT_ARTIFACT
    report_path.parent.mkdir(parents=True, exist_ok=True)

    json_write(qa_path, qa_rows)
    json_write(
        place_map_path,
        sorted(place_map_by_name.values(), key=lambda row: normalize_text(row["place_name_canonical"])),
    )
    report_path.write_text(
        build_report(
            dataset_rows=dataset_rows,
            new_rows=new_rows,
            combined_unique_raw_questions=combined_unique_raw_questions,
            combined_unique_norm_questions=combined_unique_norm_questions,
            combined_unique_places=combined_unique_places,
            qa_stats=qa_stats,
        ),
        encoding="utf-8",
    )

    print("Phase 1 artifacts generated:")
    print(f"- {qa_path}")
    print(f"- {place_map_path}")
    print(f"- {report_path}")
    print(
        "Summary:"
        f" dataset={len(dataset_rows)}, new_entries={len(new_rows)},"
        f" combined={len(dataset_rows) + len(new_rows)},"
        f" unique_raw_questions={combined_unique_raw_questions},"
        f" unique_norm_questions={combined_unique_norm_questions},"
        f" unique_places={combined_unique_places}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
