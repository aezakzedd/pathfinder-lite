from __future__ import annotations

from dataclasses import dataclass, field
from time import time
from typing import Any


DEFAULT_SESSION_ID = "kiosk"
MAX_SESSIONS = 24
SESSION_TTL_SECONDS = 60 * 60 * 6


@dataclass
class DialogueMemory:
    last_intent: str | None = None
    active_place_id: str | None = None
    preferences: dict[str, Any] = field(default_factory=dict)
    last_recommended_place_ids: list[str] = field(default_factory=list)
    pending_followup: str | None = None
    updated_at: float = field(default_factory=time)
    # Conversation memory fields (Phase 5)
    turn_history: list[dict[str, Any]] = field(default_factory=list)
    topic_history: list[str] = field(default_factory=list)
    last_activity: str | None = None
    last_town: str | None = None
    last_user_question: str = ""
    # Phase 7: language detection
    detected_language: str = "en"


class DialogueStateStore:
    def __init__(self) -> None:
        self.sessions: dict[str, DialogueMemory] = {}

    def get(self, session_id: str | None = None) -> DialogueMemory:
        self._prune()
        key = normalize_session_id(session_id)
        if key not in self.sessions:
            self.sessions[key] = DialogueMemory()
        memory = self.sessions[key]
        memory.updated_at = time()
        return memory

    def _prune(self) -> None:
        now = time()
        expired = [
            key for key, memory in self.sessions.items()
            if now - memory.updated_at > SESSION_TTL_SECONDS
        ]
        for key in expired:
            self.sessions.pop(key, None)

        if len(self.sessions) <= MAX_SESSIONS:
            return

        oldest = sorted(self.sessions.items(), key=lambda item: item[1].updated_at)
        for key, _ in oldest[:len(self.sessions) - MAX_SESSIONS]:
            self.sessions.pop(key, None)


def normalize_session_id(session_id: str | None) -> str:
    value = str(session_id or "").strip()
    return value or DEFAULT_SESSION_ID


dialogue_store = DialogueStateStore()
