"""Lightweight semantic cache using built-in difflib (no ML deps).
Caches Q&A pairs keyed by normalized query text with SequenceMatcher similarity.
"""
from __future__ import annotations

import difflib
import re
import time
from typing import Any


class SemanticCache:
    """In-memory semantic cache with TTL pruning."""

    DEFAULT_THRESHOLD = 0.78
    DEFAULT_TTL_SECONDS = 60 * 60 * 6  # 6 hours
    MAX_ENTRIES = 200

    def __init__(
        self,
        threshold: float = DEFAULT_THRESHOLD,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        max_entries: int = MAX_ENTRIES,
    ) -> None:
        self.threshold = threshold
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._entries: list[dict[str, Any]] = []

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------
    def get(self, query: str, count: int | None = None) -> dict[str, Any] | None:
        """Look up a cached response by query similarity.
        Returns the full cached dict (with 'answer', 'locations', etc.) or None.
        """
        self._prune()
        normalized = self._normalize(query)

        best_entry = None
        best_score = 0.0

        for entry in self._entries:
            score = self._similarity(normalized, entry["normalized_query"])
            if score >= self.threshold and score > best_score:
                # Validate count match if provided
                if count is not None and entry.get("count") is not None:
                    if entry["count"] != count:
                        continue
                best_score = score
                best_entry = entry

        if best_entry is not None:
            # Move to front (LRU-ish)
            self._entries.remove(best_entry)
            best_entry["accessed_at"] = time.time()
            self._entries.insert(0, best_entry)
            return {
                "answer": best_entry["answer"],
                "locations": best_entry.get("locations", []),
                "actions": best_entry.get("actions", []),
                "follow_up": best_entry.get("follow_up"),
                "intent": best_entry.get("intent"),
                "cached": True,
                "similarity": round(best_score, 3),
            }
        return None

    def set(
        self,
        query: str,
        response: dict[str, Any],
        count: int | None = None,
    ) -> None:
        """Store a Q&A pair in the cache."""
        normalized = self._normalize(query)
        now = time.time()

        # Check if an exact-normalized entry already exists → update it
        for entry in self._entries:
            if entry["normalized_query"] == normalized:
                entry["answer"] = response.get("answer", "")
                entry["locations"] = response.get("locations", [])
                entry["actions"] = response.get("actions", [])
                entry["follow_up"] = response.get("follow_up")
                entry["intent"] = response.get("intent")
                entry["count"] = count
                entry["updated_at"] = now
                entry["accessed_at"] = now
                # Move to front
                self._entries.remove(entry)
                self._entries.insert(0, entry)
                return

        # Otherwise append new entry
        self._entries.insert(
            0,
            {
                "query": query,
                "normalized_query": normalized,
                "answer": response.get("answer", ""),
                "locations": response.get("locations", []),
                "actions": response.get("actions", []),
                "follow_up": response.get("follow_up"),
                "intent": response.get("intent"),
                "count": count,
                "created_at": now,
                "updated_at": now,
                "accessed_at": now,
            },
        )

        self._prune()

    def clear(self) -> None:
        self._entries.clear()

    def stats(self) -> dict[str, int]:
        return {
            "entries": len(self._entries),
            "max_entries": self.max_entries,
            "ttl_seconds": self.ttl_seconds,
        }

    # -----------------------------------------------------------------------
    # Private helpers
    # -----------------------------------------------------------------------
    def _prune(self) -> None:
        now = time.time()
        # Drop expired
        self._entries = [
            e for e in self._entries
            if now - e["accessed_at"] <= self.ttl_seconds
        ]
        # Hard cap on count (oldest last-accessed first)
        if len(self._entries) > self.max_entries:
            self._entries.sort(key=lambda e: e["accessed_at"], reverse=True)
            self._entries = self._entries[: self.max_entries]

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"\s+", " ", text)
        # Strip common filler words that don't affect semantics
        fillers = {"the", "a", "an", "in", "on", "at", "to", "for", "of", "and"}
        words = [w for w in text.split() if w not in fillers]
        return " ".join(words)

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        """Quick ratio from difflib — built-in, zero deps."""
        if not a or not b:
            return 0.0
        return difflib.SequenceMatcher(None, a, b).quick_ratio()


# Singleton instance shared across requests
semantic_cache = SemanticCache()
