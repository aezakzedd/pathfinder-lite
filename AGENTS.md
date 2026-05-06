# Pathfinder Lite - Agent Instructions

## Project Overview
This is a Raspberry Pi 4B kiosk frontend rebuild of the Pathfinder tourism application. The goal is to create a lightweight, performant frontend optimized for touch-based kiosk deployment.

## Scope
**Work only inside `pathfinder-lite`.** The old React project in the parent directory is read-only reference material. Do not modify any files outside of the `pathfinder-lite` directory.

## Allowed Stack
- **Build Tool:** Vite
- **JavaScript:** Vanilla ES6 modules (no frameworks)
- **CSS:** Plain CSS with CSS variables (no Tailwind, no PostCSS)
- **Map:** Leaflet (for interactive maps, Phase 5+)
- **Assets:** Local assets only (no external CDNs)

## Forbidden Dependencies
- **Frameworks:** React, Preact, Svelte, Vue
- **Maps:** MapLibre
- **Animations:** Framer Motion, GSAP
- **PDF:** pdfjs-dist
- **Drag & Drop:** dnd-kit
- **Icons:** lucide-react (use inline SVGs or local sprites)
- **Date Pickers:** react-datepicker (use native HTML5)
- **Keyboards:** react-simple-keyboard (use Chromium native keyboard)
- **CSS:** Tailwind CSS
- **Fonts:** Google Fonts, Fontshare (use system fonts or local WOFF2)
- **External CDNs:** No external resources allowed

## Architecture Principles
- **State Management:** Vanilla JavaScript with localStorage/sessionStorage
- **Routing:** Hash-based routing (e.g., #/, #/itinerary, #/about)
- **Styling:** CSS variables for theming, CSS transitions only (no animation libraries)
- **Icons:** Inline SVGs or local SVG sprite
- **PDF Generation:** Backend-generated only (no browser PDF rendering)
- **Touch Controls:** Touch-friendly buttons (min 44px), no drag-and-drop
- **Performance:** Target <700MB memory, <10-20% idle CPU on RPi 4B 4GB

## Performance Requirements
- Avoid long-running animations and unnecessary timers
- Avoid excessive backdrop-filter blur effects
- Use CSS transitions only (opacity, transform)
- Minimize JavaScript bundle size
- Use compressed WebP/AVIF images
- Use WOFF2 fonts or system fonts

## Backend Integration
- Connect only to existing backend endpoints during initial phases
- New backend endpoints will be added in later phases
- Do not modify the backend during frontend development

## Development Workflow
1. Work only in `pathfinder-lite/`
2. Test changes with `npm run dev`
3. Build with `npm run build`
4. Commit changes to git
5. Push to GitHub repository

## Kiosk Mode
- Cursor lock functionality implemented in `src/styles/kiosk.css`
- Add `kiosk-mode` class to html element for cursor hiding
- Ensure touch targets are at least 44px
