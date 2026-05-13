from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_CONFIG_PATH = Path(__file__).resolve().parents[1] / "data" / "chatbot" / "config.json"


def _load() -> dict[str, Any]:
    try:
        return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


_config: dict[str, Any] | None = None


def get_config() -> dict[str, Any]:
    global _config
    if _config is None:
        _config = _load()
    return _config


def get(section: str, key: str, default: Any = None) -> Any:
    return get_config().get(section, {}).get(key, default)


def reload() -> None:
    global _config
    _config = _load()
