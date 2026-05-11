# Pathfinder-Lite Global Back Button (Raspberry Pi)

This Chrome extension adds a **Back** button (top-left) on pages that are not part of Pathfinder-Lite.

## What it does
- When the user taps "Open in Google Maps" (from the PDF launcher page), they leave the Pathfinder-Lite app. The back button appears so they can return.
- **Fixed from original**: The back button also appears on Chrome error pages (`chrome-error://`), so even if Google Maps directions fail to load due to no internet connection, the user can still navigate back.
- Cursor is forced hidden on every page (kiosk mode).
- The button is suppressed on Pathfinder-Lite app pages (`#/`, `#/itinerary`, `#/last`, etc.) and map-link launcher pages (`/m/{id}`).
- Back action resolves to the last known Pathfinder-Lite page, falling back to `http://localhost:5173/#/last`.

## Files
- `manifest.json` — Chrome Extension Manifest V3
- `content.js` — Main content script (injected on all pages)
- `start-kiosk-with-back-button.sh` — Launches Chromium in kiosk mode with the extension
- `setup-rpi-kiosk-autostart.sh` — One-time setup: installs cursor-hider and registers LXDE autostart

## Install on Raspberry Pi Chromium

1. Copy the `pathfinder-lite` folder to the Pi (e.g. `/home/pi/pathfinder-lite`).

2. Make launcher scripts executable:
```bash
chmod +x /home/pi/pathfinder-lite/scripts/rpi-global-back-button-extension/start-kiosk-with-back-button.sh
chmod +x /home/pi/pathfinder-lite/scripts/rpi-global-back-button-extension/setup-rpi-kiosk-autostart.sh
```

3. Run the setup script once:
```bash
/home/pi/pathfinder-lite/scripts/rpi-global-back-button-extension/setup-rpi-kiosk-autostart.sh
```

4. Reboot the Pi (or log out/in).

5. Manual launch (optional):
```bash
chromium-browser \
  --kiosk "http://localhost:5173/#/last" \
  --disable-extensions-except=/home/pi/pathfinder-lite/scripts/rpi-global-back-button-extension \
  --load-extension=/home/pi/pathfinder-lite/scripts/rpi-global-back-button-extension
```

## Configuration
- Default return URL: `http://localhost:5173/#/last`
- Override via environment variable: `APP_URL=http://192.168.4.1:5173/#/last`
- Allowed Pathfinder hosts are in `PATHFINDER_HOST_ALLOWLIST` inside `content.js`.

## Difference from the original pathfinder extension
- Adapted for pathfinder-lite's **hash-based routing** (`#/itinerary`, `#/last`, etc.)
- Back button **appears on Chrome error pages** (no internet) — the original suppressed it there
- Simplified storage/state management (no PDF cache ID tracking needed)
- Detects `/m/{id}` map-link launcher pages as Pathfinder pages (button hidden there)
