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

Use the non-interactive command:

```bash
sudo raspi-config nonint do_boot_behaviour B2
```

Interactive fallback:

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
  chromium \
  unclutter
```

On this Raspberry Pi OS Lite setup, the browser binary is:

```bash
/usr/bin/chromium
```

On older images, you can check both names:

```bash
which chromium
which chromium-browser
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

## 8. Test the Frontend Server Manually

Start the local preview server:

```bash
cd /home/pi/pathfinder-lite
npm run preview -- --host 127.0.0.1 --port 4173
```

From another terminal or SSH session, test that it responds:

```bash
curl http://127.0.0.1:4173/
```

Do not run `startx` from SSH. Raspberry Pi OS Lite normally allows Xorg only for the physical console user, so `startx` from SSH can fail even when the setup is correct.

If you want to test Chromium manually, do it from the physical Pi console or tty, not from SSH.

## 9. Create the Preview Server Systemd Service

Create:

```bash
sudo nano /etc/systemd/system/pathfinder-preview.service
```

Paste:

```ini
[Unit]
Description=Pathfinder Lite frontend preview server
After=network-online.target
Wants=network-online.target

[Service]
User=pi
WorkingDirectory=/home/pi/pathfinder-lite
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run preview -- --host 127.0.0.1 --port 4173
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pathfinder-preview.service
sudo systemctl start pathfinder-preview.service
sudo systemctl status pathfinder-preview.service
```

Test it:

```bash
curl http://127.0.0.1:4173/
```

## 10. Create `.xinitrc` for Chromium Kiosk

Create:

```bash
nano ~/.xinitrc
```

Paste:

```bash
#!/bin/sh

xset s off
xset -dpms
xset s noblank

unclutter -idle 0.5 -root &

openbox-session &

sleep 6

exec /usr/bin/chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --start-maximized \
  http://127.0.0.1:4173/#/
```

Make it executable:

```bash
chmod +x ~/.xinitrc
```

## 11. Start X from Console Auto Login

Create or edit:

```bash
nano ~/.bash_profile
```

Paste:

```bash
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  startx
fi
```

This is the working Raspberry Pi OS Lite flow:

- console autologin enters tty1
- `.bash_profile` runs `startx`
- `.xinitrc` starts Openbox, hides the pointer, and launches `/usr/bin/chromium`
- `pathfinder-preview.service` serves the built frontend at `127.0.0.1:4173`

Reboot:

```bash
sudo reboot
```

Pathfinder Lite should now start automatically in Chromium kiosk mode.

## 12. Verify After Reboot

After reboot, SSH into the Pi and run:

```bash
systemctl status pathfinder-preview.service
pgrep -a chromium
ps -ef | grep -E "Xorg|openbox|chromium" | grep -v grep
```

Expected:

- `pathfinder-preview.service` is active.
- `Xorg` is running.
- `openbox` is running.
- `chromium` is running.

If `echo $XDG_SESSION_TYPE` is blank over SSH, that is normal. SSH is not the graphical session.

## 13. Hide the Mouse Pointer

The setup above hides the pointer in two ways:

- `unclutter -idle 0.5 -root` hides the cursor after a short idle delay.
- Kiosk mode should be started from the physical console through `startx`.

If the pointer is still visible, check that `unclutter` is installed:

```bash
command -v unclutter
pgrep unclutter
```

You can also install it again:

```bash
sudo apt install -y unclutter
```

## 14. Stop, Start, or Disable the Preview Server

Stop the frontend server:

```bash
sudo systemctl stop pathfinder-preview.service
```

Start it again:

```bash
sudo systemctl start pathfinder-preview.service
```

Disable server autorun:

```bash
sudo systemctl disable pathfinder-preview.service
```

View logs:

```bash
journalctl -u pathfinder-preview.service -f
```

## 15. Update the App Later

```bash
cd /home/pi/pathfinder-lite
git pull
npm install
npm run build
sudo systemctl restart pathfinder-preview.service
```

If Chromium is already running, either reboot:

```bash
sudo reboot
```

Or restart Chromium from the physical Pi console:

```bash
pkill chromium
startx
```

Do not run `startx` from SSH.

## 16. Offline Map and Routing Notes

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

## 17. Troubleshooting

Chromium command not found:

```bash
which chromium
which chromium-browser
```

Preview server not running:

```bash
sudo systemctl status pathfinder-preview.service
journalctl -u pathfinder-preview.service -n 100
```

Screen blanks after idle:

```bash
xset s off
xset -dpms
xset s noblank
```

Kiosk service failed:

```bash
pgrep -a chromium
ps -ef | grep -E "Xorg|openbox|chromium" | grep -v grep
```

If the preview server is active but Chromium does not start, check `.bash_profile`, `.xinitrc`, and console autologin.

If `pgrep -a chromium` shows nothing, the graphical kiosk did not start.

If `echo $XDG_SESSION_TYPE` is blank over SSH, that is normal. SSH is not the graphical session.

Do not use `~/.config/labwc/autostart` for Raspberry Pi OS Lite because no desktop or labwc session is running.

Do not start Chromium as a normal systemd service unless a graphical session is already running.

Do not run `startx` from SSH.

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
