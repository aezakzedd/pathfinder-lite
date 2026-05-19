# Active Pin Chatbot Parity Report (Pre-Change)

Date: 2026-05-19  
Project: `pathfinder-lite-maptalks`

## Scope

Compare Pathfinder Lite chatbot active-pin UI and multi-location notice behavior against read-only reference:
- `docs/_reference/pathfinder-pi-original/src/frontend/components/ChatBot.jsx`
- `docs/_reference/pathfinder-pi-original/src/frontend/styles/components/ChatBot.module.css`
- `docs/_reference/pathfinder-pi-original/src/frontend/pages/Itinerary.jsx`

## Findings

1. Active pin visual parity drift
- Reference uses a compact blue pill (`activePinPill`) inline with chat input controls.
- Lite currently shows a separate "Talking about:" row above input, with different visual treatment.

2. Multi-match notice reliability gap
- Lite has notice logic in `src/pages/itinerary.js` (`handleChatLocations`) only after successful local destination matching.
- If destination matching is delayed/empty in UI state, no notice appears even when backend returns multiple locations.

3. Current message text
- Existing notice format already matches desired wording pattern:
  - `I found X matching places and selected Y.`

## Smallest Safe Fix Plan

1. Adjust active-pin pill markup/styling in Lite chat input to match reference style and placement.
2. Keep existing map-selection behavior, but make multi-match notice resilient by basing it on returned locations when local match list is unavailable.
3. Preserve all existing MapTalks behavior and chatbot API contract.

