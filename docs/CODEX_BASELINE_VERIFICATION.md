# Codex Baseline Verification

Date: 2026-05-19  
Project: `pathfinder-lite-maptalks`  
Scope: Post-hygiene baseline verification after chatbot UI parity/confidence/safety-net/active-pin fixes.

## Commands Run

### 1) Git/repo checks

```powershell
git status
git log --oneline -3
git ls-files backend/data/route_cache.sqlite
git check-ignore -v _reference/
git check-ignore -v docs/_reference/
git check-ignore -v pathfinder-lite-maptalks.zip
```

### 2) Frontend build

```powershell
npm run build
```

### 3) Backend import/startup checks

```powershell
python -c "import importlib; importlib.import_module('backend.app.main')"
backend/.venv/Scripts/python.exe -c "import importlib; m = importlib.import_module('backend.app.main'); print(hasattr(m, 'app'))"
```

Notes:
- System Python import failed (`ModuleNotFoundError: fastapi`).
- Verification proceeded with `backend/.venv/Scripts/python.exe` (no dependency changes made).

### 4) API/chatbot checks

1. Direct handler verification (no HTTP test client dependency):

```powershell
backend/.venv/Scripts/python.exe - <<'PY'
# imported backend.app.main.ask and invoked scenarios A-H
PY
```

2. Practical HTTP `/ask` verification:

```powershell
# Started uvicorn in hidden background process on 127.0.0.1:8011
# Invoked /health and /ask scenarios A-H via Invoke-RestMethod
# Stopped process after checks
```

### 5) UI source inspection

```powershell
rg -n "chat-follow-up|chat-action-row|chat-action-btn|messageEl\\.appendChild\\(contentEl\\)|followUp" src/pages/itinerary.js src/styles/itinerary.css
```

---

## Pass/Fail Table

| Check | Result | Evidence |
|---|---|---|
| Repo clean | PASS | `git status`: working tree clean |
| Latest history available | PASS | `git log --oneline -3` returned latest commits including `3441a1b` |
| `backend/data/route_cache.sqlite` tracked | PASS | `git ls-files backend/data/route_cache.sqlite` returned path |
| `_reference/` ignored | PASS | `.gitignore:39:/_reference/` |
| `docs/_reference/` ignored | PASS | `.gitignore:38:/docs/_reference/` |
| `pathfinder-lite-maptalks.zip` ignored | PASS | `.gitignore:21:*.zip pathfinder-lite-maptalks.zip` |
| Frontend build | PASS | `npm run build` succeeded (Vite build complete) |
| `backend.app.main:app` import (project venv) | PASS | `backend/.venv/Scripts/python.exe` import succeeded; `has app: True` |
| Scenario A: Tell me about Binurong Point | PASS | `intent=place_info`, non-fallback, includes `Binurong Point` |
| Scenario B: Where can I swim? | PASS | `intent=recommendation`, non-fallback, swim/beach locations returned |
| Scenario C: Tell me about Puraran Beach | PASS (with note) | Non-fallback and includes `Puraran Beach`; intent returned as `recommendation` rather than strict place-info framing |
| Scenario D: best restaurants | PASS | Non-fallback, restaurant/food locations returned |
| Scenario E: quantum physics in tourism | FAIL | Returned non-fallback place answer with map pin (`Catanduanes Halfway Resort Hotel`) instead of safe fallback/no-random-pin behavior |
| Scenario F: active_pin + Is this good for beginners? | FAIL | Returned `intent=nonsense` with \"I didn't understand\"; active pin context not applied |
| Scenario G: active_pin + What is nearby? | PASS | `intent=nearby_question`, active pin context used (`Near Binurong Point...`) |
| Scenario H: active_pin + best restaurants | PASS (behavior) / FAIL (shape) | Broad food results returned (sticky pin dropped), but response missing required fields in cached path |
| `/ask` required response keys present in all tested paths | FAIL | Missing keys in some paths (`quick_actions`, `source`, etc.) |
| UI: assistant bubble follow-up italics rendered | PASS | Render path appends only `contentEl` at `src/pages/itinerary.js:1453`; no follow-up render node added |
| UI: assistant bubble quick-action grid rendered | PASS | `.chat-action-row`/`.chat-action-btn` styles exist, but no render creation path found |
| UI: assistant bubble action buttons rendered | PASS | Click handler remains, but no assistant-bubble button construction found in render function |

---

## Response-Shape Notes

Required shape:
- `answer`
- `locations`
- `actions`
- `quick_actions`
- `follow_up`
- `intent`
- `confidence`
- `detected_language`
- `entities`
- `source`

Observed:
- Standard chatbot path usually includes all keys.
- Gatekeeper early returns in [`backend/app/main.py`](C:/Users/Admin/Documents/pathfinder-lite-maptalks/backend/app/main.py) lines 94-141 return reduced payloads (missing `quick_actions`, `confidence`, `detected_language`, `entities`, `source`).
- Semantic-cache hit path in [`backend/app/semantic_cache.py`](C:/Users/Admin/Documents/pathfinder-lite-maptalks/backend/app/semantic_cache.py) lines 58-69 omits `quick_actions` and `source`.

Result: response-shape contract is not consistently preserved across all `/ask` paths.

## UI Source-Inspection Notes

- Assistant message rendering currently appends text content only:
  - [`src/pages/itinerary.js`](C:/Users/Admin/Documents/pathfinder-lite-maptalks/src/pages/itinerary.js): line 1453 (`messageEl.appendChild(contentEl);`).
- `followUp` is stored in message objects (line 1166) but not rendered in assistant bubble markup.
- No current render path found for `.chat-follow-up`, `.chat-action-row`, or assistant-bubble `.chat-action-btn` nodes.
- CSS rules for these classes still exist in [`src/styles/itinerary.css`](C:/Users/Admin/Documents/pathfinder-lite-maptalks/src/styles/itinerary.css), but are not actively used by the chat render function.

## Current Risks

1. `/ask` response contract inconsistency across gatekeeper/cache paths can break frontend assumptions in edge flows.
2. Semantic cache currently strips fields (`quick_actions`, `source`) on cache hits.
3. Active-pin contextual query (`Is this good for beginners?`) still routes to nonsense fallback instead of active-pin-aware answer.
4. Out-of-domain query handling may still produce unrelated place pins instead of safe fallback/no-pin behavior.

## Final Recommendation

Baseline is **not fully stable** yet for the requested chatbot behavior contract.  
Keep this as a verification snapshot and address the failing `/ask` contract/context/fallback cases before treating this baseline as release-ready.
