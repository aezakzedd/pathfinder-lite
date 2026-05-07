# Pathfinder Lite

Pathfinder Lite is the lightweight Raspberry Pi 4B kiosk frontend for the Pathfinder tourism app. It uses Vite, vanilla JavaScript, plain CSS, local assets, Leaflet, and offline/local map data.

This project is designed for kiosk use on Raspberry Pi OS Lite with Chromium running full screen.

## Recommended Raspberry Pi OS

Use **Raspberry Pi OS Lite 64-bit**.

Why 64-bit:

- Better support for modern Chromium and Node.js.
- Better memory handling on Raspberry Pi 4B 4GB.
- More future-proof for local/offline services.

Use 32-bit only if you have a specific hardware or driver reason.

## Hardware

- Raspberry Pi 4B 4GB
- Official Raspberry Pi power supply
- HDMI display or touchscreen
- Keyboard for first setup
- Network access for installation
- Optional: mouse for setup only

## 1. Flash Raspberry Pi OS Lite

1. Open Raspberry Pi Imager.
2. Choose **Raspberry Pi OS Lite 64-bit**.
3. Open advanced settings.
4. Set hostname, username, password, Wi-Fi, locale, and SSH if needed.
5. Flash the SD card.
6. Boot the Raspberry Pi.

After first boot:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

## 2. Enable Console Auto Login

Run:

```bash
sudo raspi-config
```

Choose:

```text
System Options
Boot / Auto Login
Console Autologin
```

This lets the kiosk service start automatically after boot.

## 3. Install Minimal GUI, Chromium, and Cursor Hiding

Raspberry Pi OS Lite does not include a desktop, so install only the small pieces needed to run Chromium.

```bash
sudo apt update
sudo apt install -y \
  git \
  curl \
  ca-certificates \
  xserver-xorg \
  x11-xserver-utils \
  xinit \
  openbox \
  chromium-browser \
  unclutter
```

If `chromium-browser` is not available on your image, install Chromium with:

```bash
sudo apt install -y chromium
```

Optional touchscreen keyboard:

```bash
sudo apt install -y matchbox-keyboard
```

## 4. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Use Node 20 LTS for best compatibility with the Vite build.

## 5. Clone Pathfinder Lite

If deploying this repo directly:

```bash
cd /home/pi
git clone https://github.com/aezakzedd/pathfinder-lite.git
cd /home/pi/pathfinder-lite
```

If you copied the full workspace instead:

```bash
cd /home/pi/pathfinder-pi/pathfinder-lite
```

The rest of this guide assumes:

```bash
/home/pi/pathfinder-lite
```

If your folder is different, replace that path in the commands below.

## 6. Install Dependencies

```bash
cd /home/pi/pathfinder-lite
npm install
```

No external CDN assets are required at runtime.

## 7. Build the Frontend

```bash
cd /home/pi/pathfinder-lite
npm run build
```

This creates the production files in:

```bash
/home/pi/pathfinder-lite/dist
```

## 8. Test Manually

Start the local preview server:

```bash
cd /home/pi/pathfinder-lite
npm run preview -- --host 127.0.0.1 --port 4173
```

From another terminal or SSH session, test that it responds:

```bash
curl http://127.0.0.1:4173/
```

To test Chromium manually from the Pi console:

```bash
startx /usr/bin/chromium-browser --kiosk --noerrdialogs --disable-infobars http://127.0.0.1:4173/#/
```

If your Chromium binary is named `chromium`, use:

```bash
startx /usr/bin/chromium --kiosk --noerrdialogs --disable-infobars http://127.0.0.1:4173/#/
```

## 9. Create the Kiosk Launch Script

Create:

```bash
nano /home/pi/start-pathfinder-lite.sh
```

Paste:

```bash
#!/usr/bin/env bash
set -e

APP_DIR="/home/pi/pathfinder-lite"
APP_URL="http://127.0.0.1:4173/#/"
LOG_DIR="$APP_DIR/logs"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

if ! pgrep -f "vite preview.*4173" >/dev/null 2>&1; then
  npm run preview -- --host 127.0.0.1 --port 4173 > "$LOG_DIR/preview.log" 2>&1 &
fi

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4173/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

xset s off || true
xset -dpms || true
xset s noblank || true

openbox-session >/tmp/openbox.log 2>&1 &
unclutter -idle 0.2 -root >/tmp/unclutter.log 2>&1 &

CHROME="$(command -v chromium-browser || command -v chromium)"

exec "$CHROME" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  "$APP_URL"
```

Make it executable:

```bash
chmod +x /home/pi/start-pathfinder-lite.sh
```

## 10. Create `.xinitrc`

Create:

```bash
nano /home/pi/.xinitrc
```

Paste:

```bash
#!/usr/bin/env bash
exec /home/pi/start-pathfinder-lite.sh
```

Make it executable:

```bash
chmod +x /home/pi/.xinitrc
```

## 11. Autorun the Frontend on Boot

Create the user systemd folder:

```bash
mkdir -p /home/pi/.config/systemd/user
```

Create the service:

```bash
nano /home/pi/.config/systemd/user/pathfinder-lite-kiosk.service
```

Paste:

```ini
[Unit]
Description=Pathfinder Lite Chromium kiosk
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=DISPLAY=:0
ExecStart=/usr/bin/startx /home/pi/.xinitrc -- :0 -nocursor
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Enable it:

```bash
systemctl --user daemon-reload
systemctl --user enable pathfinder-lite-kiosk.service
loginctl enable-linger pi
```

Reboot:

```bash
sudo reboot
```

Pathfinder Lite should now start automatically in Chromium kiosk mode.

## 12. Hide the Mouse Pointer

The setup above hides the pointer in two ways:

- `unclutter -idle 0.2 -root` hides the cursor after a short idle delay.
- `startx ... -nocursor` asks X11 to hide the cursor at the display server level.

If the pointer is still visible, check that `unclutter` is installed:

```bash
command -v unclutter
pgrep unclutter
```

You can also install it again:

```bash
sudo apt install -y unclutter
```

## 13. Stop or Disable Kiosk Mode

Stop for the current session:

```bash
systemctl --user stop pathfinder-lite-kiosk.service
```

Disable autorun:

```bash
systemctl --user disable pathfinder-lite-kiosk.service
```

Start again:

```bash
systemctl --user start pathfinder-lite-kiosk.service
```

View logs:

```bash
journalctl --user -u pathfinder-lite-kiosk.service -f
```

Preview server log:

```bash
tail -f /home/pi/pathfinder-lite/logs/preview.log
```

## 14. Update the App Later

```bash
cd /home/pi/pathfinder-lite
git pull
npm install
npm run build
systemctl --user restart pathfinder-lite-kiosk.service
```

## 15. Offline Map and Routing Notes

Pathfinder Lite uses local map data and local assets. It must not depend on online map tiles or external CDNs.

The frontend route renderer first expects a local backend route endpoint:

```text
POST /api/route
```

Request body:

```json
{
  "waypoints": [[124.0, 13.6], [124.1, 13.7]]
}
```

Expected response:

```json
{
  "geometry": [[124.0, 13.6], [124.05, 13.65], [124.1, 13.7]],
  "distance_km": 12.4,
  "duration_min": 28,
  "source": "local"
}
```

If the route backend is unavailable, the frontend may show an approximate fallback route. For accurate road-following routes, run a local/offline backend service such as precomputed local route GeoJSON, local OSRM, Valhalla, or GraphHopper.

## 16. Troubleshooting

Chromium command not found:

```bash
command -v chromium-browser || command -v chromium
```

Preview server not running:

```bash
cd /home/pi/pathfinder-lite
npm run preview -- --host 127.0.0.1 --port 4173
```

Screen blanks after idle:

```bash
xset s off
xset -dpms
xset s noblank
```

Kiosk service failed:

```bash
journalctl --user -u pathfinder-lite-kiosk.service -n 100
```

Rebuild after dependency or source changes:

```bash
cd /home/pi/pathfinder-lite
npm install
npm run build
```

## Development

Run locally:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

