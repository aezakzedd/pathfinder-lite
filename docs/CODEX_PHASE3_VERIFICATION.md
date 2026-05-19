# Codex Phase 3 Verification

Date: 2026-05-19 14:56:30
Project: `pathfinder-lite-maptalks`
Scope: Phase 3 config-only reference pin bridge + response-shape/runtime checks.

## Commands Run

```powershell
npm run build
backend/.venv/Scripts/python.exe -c "import importlib; importlib.import_module('backend.app.main')"
backend/.venv/Scripts/python.exe scripts/verify_phase3_reference_runtime.py
```

## Result: 31/31 checks passed

| Check | Result | Detail |
|---|---|---|
| A place info | PASS | intent=place_info first=Binurong Point |
| B swim recommendation | PASS | intent=recommendation count=5 |
| C Puraran response | PASS | intent=recommendation |
| D restaurants | PASS | intent=recommendation count=5 |
| E out-of-domain safe fallback | PASS | intent=fallback count=0 |
| F active-pin beginners context | PASS | intent=place_info first=Binurong Point |
| G active-pin nearby | PASS | intent=nearby_question first=Balacay Point |
| H active-pin broad restaurants | PASS | intent=recommendation first=Bestea X E-fren Fries |
| T1 tricycle fare | PASS | intent=faq count=0 |
| T2 Catanduanes known for | PASS | intent=faq count=0 |
| T3 nightlife in Virac | PASS | intent=place_info count=1 |
| T4 Majestic Puraran unresolved | PASS | intent=faq count=0 |
| C1 config_only pin bridge | PASS | intent=faq first_id=ref-config-2838-tea-and-cafe mapping=config_only |
| Shape A | PASS | missing=[] |
| Shape B | PASS | missing=[] |
| Shape C | PASS | missing=[] |
| Shape D | PASS | missing=[] |
| Shape E | PASS | missing=[] |
| Shape F | PASS | missing=[] |
| Shape G | PASS | missing=[] |
| Shape H | PASS | missing=[] |
| Shape T1 | PASS | missing=[] |
| Shape T2 | PASS | missing=[] |
| Shape T3 | PASS | missing=[] |
| Shape T4 | PASS | missing=[] |
| Shape C1 | PASS | missing=[] |
| Shape cache first | PASS | missing=[] |
| Shape cache hit | PASS | missing=[] cached=True |
| Shape gibberish | PASS | missing=[] |
| Shape profanity | PASS | missing=[] |
| Shape rate-limited | PASS | missing=[] |

## Scenario Snapshot

| Scenario | intent | confidence | locations | first location |
|---|---|---:|---:|---|
| A | place_info | 0.95 | 1 | Binurong Point |
| B | recommendation | 0.02 | 5 | Mamangal Beach |
| C | recommendation | 0.18 | 2 | Mamangal Beach |
| C1 | faq | 1.0 | 1 | 2838 Tea and Cafe |
| D | recommendation | 0.02 | 5 | Bestea X E-fren Fries |
| E | fallback | 0.0 | 0 | - |
| F | place_info | 0.04 | 1 | Binurong Point |
| G | nearby_question | 0.02 | 5 | Balacay Point |
| H | recommendation | 0.02 | 5 | Bestea X E-fren Fries |
| T1 | faq | 0.75 | 0 | - |
| T2 | faq | 1.0 | 0 | - |
| T3 | place_info | 0.68 | 1 | Taller's Brew |
| T4 | faq | 1.0 | 0 | - |

## Runtime Path Notes

- Cache first intent: `faq`
- Cache hit intent: `faq`, cached flag: `True`
- Gibberish intent: `nonsense`
- Profanity intent: `profanity`
- Rate-limit intent: `rate_limited`

## Risks

- Config-only responses provide coordinates without a matching GeoJSON destination card.
- Unresolved reference places intentionally remain text-only in Phase 3.
- Final UI parity for synthetic coordinates depends on map zoom/focus behavior and should be smoke-tested manually.
