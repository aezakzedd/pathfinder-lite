from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.gatekeeper import limiter
from backend.app.knowledge_base import get_knowledge_base
from backend.app.main import AskRequest, ask, semantic_cache
from backend.app.dialogue_state import dialogue_store


REQUIRED_KEYS = [
    "answer",
    "locations",
    "actions",
    "quick_actions",
    "follow_up",
    "intent",
    "confidence",
    "detected_language",
    "entities",
    "source",
]


REPORT_PATH = ROOT / "docs" / "CODEX_PHASE3_VERIFICATION.md"


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str


def reset_runtime_state() -> None:
    semantic_cache.clear()
    dialogue_store.sessions.clear()
    limiter._windows.clear()


def run_ask(question: str, *, session_id: str, active_pin: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = AskRequest(question=question, session_id=session_id, active_pin=active_pin)
    return ask(payload)


def missing_shape_keys(payload: dict[str, Any]) -> list[str]:
    return [key for key in REQUIRED_KEYS if key not in payload]


def first_location_name(payload: dict[str, Any]) -> str:
    locations = payload.get("locations") or []
    if not locations:
        return ""
    return str(locations[0].get("name") or "")


def first_location(payload: dict[str, Any]) -> dict[str, Any]:
    locations = payload.get("locations") or []
    if not locations:
        return {}
    return locations[0]


def has_fallback_phrase(answer: str) -> bool:
    lowered = str(answer or "").lower()
    return "didn't understand" in lowered or "i can help with places" in lowered


def is_valid_lng_lat(coords: Any) -> bool:
    if not isinstance(coords, list) or len(coords) < 2:
        return False
    try:
        float(coords[0])
        float(coords[1])
    except (TypeError, ValueError):
        return False
    return True


def verify() -> tuple[list[CheckResult], dict[str, dict[str, Any]], dict[str, Any]]:
    checks: list[CheckResult] = []
    scenario_results: dict[str, dict[str, Any]] = {}

    reset_runtime_state()
    kb = get_knowledge_base()
    binurong = kb.match_place("Binurong Point")
    active_pin = binurong.to_location() if binurong else None

    scenarios = [
        ("A", "Tell me about Binurong Point", "phase3-A", None),
        ("B", "Where can I swim?", "phase3-B", None),
        ("C", "Tell me about Puraran Beach", "phase3-C", None),
        ("D", "best restaurants", "phase3-D", None),
        ("E", "Tell me about quantum physics in Catanduanes tourism", "phase3-E", None),
        ("F", "Is this good for beginners?", "phase3-active", active_pin),
        ("G", "What is nearby?", "phase3-active", active_pin),
        ("H", "best restaurants", "phase3-active", active_pin),
        ("T1", "How much tricycle fare in Virac?", "phase3-T1", None),
        ("T2", "What is Catanduanes known for?", "phase3-T2", None),
        ("T3", "Is there nightlife in Virac?", "phase3-T3", None),
        ("T4", "Where is Majestic Puraran Beach Resort?", "phase3-T4", None),
        ("C1", "Where is 2838 Tea and Cafe?", "phase3-C1", None),
    ]

    for code, question, session, pin in scenarios:
        response = run_ask(question, session_id=session, active_pin=pin)
        scenario_results[code] = response

    def add(name: str, passed: bool, detail: str) -> None:
        checks.append(CheckResult(name=name, passed=passed, detail=detail))

    # Baseline A-H checks
    a = scenario_results["A"]
    add(
        "A place info",
        a.get("intent") not in {"fallback", "nonsense"} and first_location_name(a).lower() == "binurong point",
        f"intent={a.get('intent')} first={first_location_name(a)}",
    )

    b = scenario_results["B"]
    add(
        "B swim recommendation",
        b.get("intent") not in {"fallback", "nonsense"} and not has_fallback_phrase(b.get("answer", "")),
        f"intent={b.get('intent')} count={len(b.get('locations') or [])}",
    )

    c = scenario_results["C"]
    c_answer = str(c.get("answer") or "").lower()
    c_has_puraran = "puraran beach" in c_answer or any(
        str(loc.get("name") or "").lower() == "puraran beach" for loc in (c.get("locations") or [])
    )
    add("C Puraran response", c.get("intent") not in {"fallback", "nonsense"} and c_has_puraran, f"intent={c.get('intent')}")

    d = scenario_results["D"]
    add(
        "D restaurants",
        d.get("intent") not in {"fallback", "nonsense"} and len(d.get("locations") or []) > 0,
        f"intent={d.get('intent')} count={len(d.get('locations') or [])}",
    )

    e = scenario_results["E"]
    add(
        "E out-of-domain safe fallback",
        len(e.get("locations") or []) == 0 and e.get("intent") in {"fallback", "faq", "nonsense"},
        f"intent={e.get('intent')} count={len(e.get('locations') or [])}",
    )

    f = scenario_results["F"]
    add(
        "F active-pin beginners context",
        f.get("intent") != "nonsense" and "didn't understand" not in str(f.get("answer") or "").lower(),
        f"intent={f.get('intent')} first={first_location_name(f)}",
    )

    g = scenario_results["G"]
    add(
        "G active-pin nearby",
        g.get("intent") != "nonsense" and "didn't understand" not in str(g.get("answer") or "").lower(),
        f"intent={g.get('intent')} first={first_location_name(g)}",
    )

    h = scenario_results["H"]
    add(
        "H active-pin broad restaurants",
        h.get("intent") == "recommendation" and "near binurong" not in str(h.get("answer") or "").lower(),
        f"intent={h.get('intent')} first={first_location_name(h)}",
    )

    # Phase 2/3 targets
    t1 = scenario_results["T1"]
    add(
        "T1 tricycle fare",
        "tricycle" in str(t1.get("answer") or "").lower(),
        f"intent={t1.get('intent')} count={len(t1.get('locations') or [])}",
    )

    t2 = scenario_results["T2"]
    add(
        "T2 Catanduanes known for",
        t2.get("intent") != "nonsense" and len(t2.get("locations") or []) == 0,
        f"intent={t2.get('intent')} count={len(t2.get('locations') or [])}",
    )

    t3 = scenario_results["T3"]
    add(
        "T3 nightlife in Virac",
        t3.get("intent") != "nonsense",
        f"intent={t3.get('intent')} count={len(t3.get('locations') or [])}",
    )

    t4 = scenario_results["T4"]
    add(
        "T4 Majestic Puraran unresolved",
        len(t4.get("locations") or []) == 0 and "majestic puraran" in str(t4.get("answer") or "").lower(),
        f"intent={t4.get('intent')} count={len(t4.get('locations') or [])}",
    )

    # Phase 3 config_only bridge
    c1 = scenario_results["C1"]
    c1_first = first_location(c1)
    add(
        "C1 config_only pin bridge",
        len(c1.get("locations") or []) > 0
        and str(c1_first.get("mapping_status") or "").lower() == "config_only"
        and is_valid_lng_lat(c1_first.get("coordinates")),
        f"intent={c1.get('intent')} first_id={c1_first.get('id')} mapping={c1_first.get('mapping_status')}",
    )

    # Response shape checks for all scenarios
    for code, payload in scenario_results.items():
        missing = missing_shape_keys(payload)
        add(f"Shape {code}", not missing, f"missing={missing}")

    # Cache path shape check
    reset_runtime_state()
    first = run_ask("What is Catanduanes known for?", session_id="phase3-cache")
    cached = run_ask("What is Catanduanes known for?", session_id="phase3-cache")
    add("Shape cache first", not missing_shape_keys(first), f"missing={missing_shape_keys(first)}")
    add(
        "Shape cache hit",
        not missing_shape_keys(cached),
        f"missing={missing_shape_keys(cached)} cached={cached.get('cached')}",
    )

    # Gatekeeper shape checks
    reset_runtime_state()
    gibberish = run_ask("asdjklqwe", session_id="phase3-gib")
    profanity = run_ask("fuck you", session_id="phase3-prof")
    rate_limited = None
    for idx in range(8):
        candidate = run_ask(f"hello {idx}", session_id="phase3-rate")
        if candidate.get("intent") == "rate_limited":
            rate_limited = candidate
            break

    add("Shape gibberish", not missing_shape_keys(gibberish), f"missing={missing_shape_keys(gibberish)}")
    add("Shape profanity", not missing_shape_keys(profanity), f"missing={missing_shape_keys(profanity)}")
    add(
        "Shape rate-limited",
        rate_limited is not None and not missing_shape_keys(rate_limited),
        f"missing={missing_shape_keys(rate_limited or {})}",
    )

    meta = {
        "cache_first_intent": first.get("intent"),
        "cache_hit_intent": cached.get("intent"),
        "cache_hit_flag": cached.get("cached"),
        "gibberish_intent": gibberish.get("intent"),
        "profanity_intent": profanity.get("intent"),
        "rate_limited_intent": (rate_limited or {}).get("intent"),
    }
    return checks, scenario_results, meta


def write_report(checks: list[CheckResult], scenarios: dict[str, dict[str, Any]], meta: dict[str, Any]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    passed = sum(1 for check in checks if check.passed)
    total = len(checks)

    lines: list[str] = []
    lines.append("# Codex Phase 3 Verification")
    lines.append("")
    lines.append(f"Date: {now}")
    lines.append("Project: `pathfinder-lite-maptalks`")
    lines.append("Scope: Phase 3 config-only reference pin bridge + response-shape/runtime checks.")
    lines.append("")
    lines.append("## Commands Run")
    lines.append("")
    lines.append("```powershell")
    lines.append("npm run build")
    lines.append("backend/.venv/Scripts/python.exe -c \"import importlib; importlib.import_module('backend.app.main')\"")
    lines.append("backend/.venv/Scripts/python.exe scripts/verify_phase3_reference_runtime.py")
    lines.append("```")
    lines.append("")
    lines.append(f"## Result: {passed}/{total} checks passed")
    lines.append("")
    lines.append("| Check | Result | Detail |")
    lines.append("|---|---|---|")
    for check in checks:
        lines.append(f"| {check.name} | {'PASS' if check.passed else 'FAIL'} | {check.detail} |")

    lines.append("")
    lines.append("## Scenario Snapshot")
    lines.append("")
    lines.append("| Scenario | intent | confidence | locations | first location |")
    lines.append("|---|---|---:|---:|---|")
    for code in sorted(scenarios.keys()):
        payload = scenarios[code]
        first = first_location_name(payload) or "-"
        lines.append(
            f"| {code} | {payload.get('intent')} | {payload.get('confidence')} | {len(payload.get('locations') or [])} | {first} |"
        )

    lines.append("")
    lines.append("## Runtime Path Notes")
    lines.append("")
    lines.append(f"- Cache first intent: `{meta.get('cache_first_intent')}`")
    lines.append(f"- Cache hit intent: `{meta.get('cache_hit_intent')}`, cached flag: `{meta.get('cache_hit_flag')}`")
    lines.append(f"- Gibberish intent: `{meta.get('gibberish_intent')}`")
    lines.append(f"- Profanity intent: `{meta.get('profanity_intent')}`")
    lines.append(f"- Rate-limit intent: `{meta.get('rate_limited_intent')}`")
    lines.append("")
    lines.append("## Risks")
    lines.append("")
    lines.append("- Config-only responses provide coordinates without a matching GeoJSON destination card.")
    lines.append("- Unresolved reference places intentionally remain text-only in Phase 3.")
    lines.append("- Final UI parity for synthetic coordinates depends on map zoom/focus behavior and should be smoke-tested manually.")
    lines.append("")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    checks, scenarios, meta = verify()
    write_report(checks, scenarios, meta)
    failed = [check for check in checks if not check.passed]

    print(json.dumps(
        {
            "report_path": str(REPORT_PATH),
            "passed": len(checks) - len(failed),
            "failed": len(failed),
            "failed_checks": [check.name for check in failed],
        },
        indent=2,
    ))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
