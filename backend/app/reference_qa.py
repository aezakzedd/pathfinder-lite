from __future__ import annotations

import difflib
import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CHATBOT_DATA_DIR = ROOT / "backend" / "data" / "chatbot"
REFERENCE_QA_PATH = CHATBOT_DATA_DIR / "reference_phase1_qa.json"
REFERENCE_PLACE_MAP_PATH = CHATBOT_DATA_DIR / "reference_phase1_place_map.json"

DEFAULT_MIN_SCORE = 0.66
DEFAULT_MIN_TOKEN_OVERLAP = 2

PLACE_BOOST = 0.10
LOCATION_BOOST = 0.05


@dataclass(frozen=True)
class ReferenceQAMatch:
    row: dict[str, Any]
    score: float
    token_overlap: int
    is_exact: bool


class ReferenceQAStore:
    def __init__(
        self,
        qa_path: Path = REFERENCE_QA_PATH,
        place_map_path: Path = REFERENCE_PLACE_MAP_PATH,
    ) -> None:
        self.qa_path = qa_path
        self.place_map_path = place_map_path
        self.qa_rows = self._load_json_list(qa_path)
        self.place_map_rows = self._load_json_list(place_map_path)

        self._exact_question_index: dict[str, dict[str, Any]] = {}
        self._entries: list[dict[str, Any]] = []
        self._variant_to_canonical: dict[str, str] = {}

        self._build_indexes()

    def match(
        self,
        query: str,
        *,
        min_score: float = DEFAULT_MIN_SCORE,
        min_token_overlap: int = DEFAULT_MIN_TOKEN_OVERLAP,
    ) -> ReferenceQAMatch | None:
        normalized_query = normalize_text(query)
        if not normalized_query:
            return None

        query_tokens = set(tokenize(query))

        exact_row = self._exact_question_index.get(normalized_query)
        if exact_row is not None:
            overlap = len(query_tokens & exact_row["_question_tokens"])
            return ReferenceQAMatch(
                row=exact_row["row"],
                score=1.0,
                token_overlap=overlap,
                is_exact=True,
            )

        best_match: ReferenceQAMatch | None = None
        best_id = ""

        for entry in self._entries:
            overlap = len(query_tokens & entry["_question_tokens"])
            if overlap < min_token_overlap:
                continue

            union = len(query_tokens | entry["_question_tokens"]) or 1
            jaccard = overlap / union
            seq_ratio = difflib.SequenceMatcher(
                None, normalized_query, entry["_normalized_question"]
            ).ratio()
            score = (0.55 * jaccard) + (0.45 * seq_ratio)

            place_key = entry["_normalized_place"]
            if place_key and place_key in normalized_query:
                score += PLACE_BOOST

            location_key = entry["_normalized_location"]
            if location_key and location_key in normalized_query:
                score += LOCATION_BOOST

            score = min(score, 0.99)
            if score < min_score:
                continue

            row_id = str(entry["row"].get("id") or "")
            candidate = ReferenceQAMatch(
                row=entry["row"],
                score=score,
                token_overlap=overlap,
                is_exact=False,
            )

            if best_match is None:
                best_match = candidate
                best_id = row_id
                continue

            if score > best_match.score:
                best_match = candidate
                best_id = row_id
                continue

            if score == best_match.score and overlap > best_match.token_overlap:
                best_match = candidate
                best_id = row_id
                continue

            if score == best_match.score and overlap == best_match.token_overlap and row_id < best_id:
                best_match = candidate
                best_id = row_id

        return best_match

    def canonical_place_name(self, row: dict[str, Any]) -> str | None:
        canonical = clean_text(row.get("place_name_canonical"))
        if canonical:
            return canonical

        raw = clean_text(row.get("place_name_raw"))
        if not raw:
            return None

        return self._variant_to_canonical.get(normalize_text(raw)) or raw

    def _build_indexes(self) -> None:
        sorted_rows = sorted(self.qa_rows, key=lambda row: str(row.get("id") or ""))
        for row in sorted_rows:
            question = clean_text(row.get("question"))
            normalized_question = normalize_text(question)
            if not normalized_question:
                continue

            normalized_place = normalize_text(row.get("place_name_raw"))
            normalized_location = normalize_text(row.get("location"))
            tokens = set(tokenize(question))

            entry = {
                "row": row,
                "_normalized_question": normalized_question,
                "_normalized_place": normalized_place,
                "_normalized_location": normalized_location,
                "_question_tokens": tokens,
            }
            self._entries.append(entry)
            self._exact_question_index.setdefault(normalized_question, entry)

        for row in self.place_map_rows:
            canonical = clean_text(row.get("place_name_canonical"))
            if not canonical:
                continue

            variants = row.get("variants") or []
            for variant in variants:
                normalized_variant = normalize_text(variant)
                if not normalized_variant:
                    continue
                self._variant_to_canonical.setdefault(normalized_variant, canonical)

    @staticmethod
    def _load_json_list(path: Path) -> list[dict[str, Any]]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                return [row for row in payload if isinstance(row, dict)]
        except (FileNotFoundError, json.JSONDecodeError):
            return []
        return []


def fix_mojibake(value: Any) -> str:
    text = str(value or "")
    for source_encoding in ("cp1252", "latin-1"):
        try:
            repaired = text.encode(source_encoding).decode("utf-8")
            if repaired.count("\ufffd") <= text.count("\ufffd"):
                return repaired
        except UnicodeError:
            continue
    return text


def clean_text(value: Any) -> str:
    text = fix_mojibake(value)
    return re.sub(r"\s+", " ", text).strip()


def normalize_text(value: Any) -> str:
    text = clean_text(value)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(value: Any) -> list[str]:
    return [token for token in normalize_text(value).split() if len(token) > 1]


@lru_cache(maxsize=1)
def get_reference_qa_store() -> ReferenceQAStore:
    return ReferenceQAStore()
