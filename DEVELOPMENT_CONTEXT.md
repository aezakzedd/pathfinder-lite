# Pathfinder Lite - Development Context

## Project Identity

**Project Name:** Pathfinder Lite

**Purpose:** Lightweight Raspberry Pi 4B kiosk frontend rebuild of Pathfinder tourism app

**Target Environment:** Raspberry Pi 4B 4GB, Chromium kiosk mode, touchscreen

**Current Repo/Folder:** `pathfinder-lite`

## Architecture Summary

- **Build Tool:** Vite
- **JavaScript:** Vanilla JavaScript ES modules (no frameworks)
- **Styling:** Plain CSS with CSS variables (no Tailwind)
- **Routing:** Hash-based router (custom implementation)
- **Map:** Leaflet offline renderer with local GeoJSON fallback (no online tiles or MapLibre)
- **State Management:** localStorage/sessionStorage with custom state modules
- **Backend:** External FastAPI backend on localhost (not modified in this project)
- **PDF Generation:** Backend-generated only (no frontend PDF rendering)

## Strict Rules

**Work Scope:**
- Work only inside `pathfinder-lite`
- Parent project is read-only reference only

**Forbidden Technologies:**
- No React, Preact, Svelte, Vue
- No Tailwind
- No Framer Motion or GSAP
- No MapLibre
- No pdfjs-dist, jsPDF, or frontend PDF rendering
- No dnd-kit
- No lucide-react
- No react-datepicker
- No react-simple-keyboard
- No external CDNs, Google Fonts, Fontshare
- No heavy UI libraries

**Design Requirements:**
- Keep touch targets at least 44px
- Maintain glassmorphism/kiosk visual system
- No infinite animations
- No heavy DOM updates

## Completed Phases

**Phase 1: Project Scaffold**
- Vanilla Vite setup
- Hash-based router
- Navbar component
- Theme toggle (light/dark)

**Phase 2: Visual Design System**
- CSS tokens and variables
- Shared components
- Glassmorphism styling system

**Phase 3: Home Page**
- Hero section
- Tourism visual/card carousel
- Bento/prism feature cards
- Stats/impact strip
- CTA/footer section

**Phase 4: Itinerary Layout**
- Full itinerary page layout
- Chatbot panel placeholder
- Map area with controls
- Trip setup panel
- Destination preview card
- Itinerary preview card

**Phase 5: Leaflet Map Integration**
- Leaflet map initialization
- Custom markers with category-based styling
- Popups with "Add to Trip" buttons
- Map controls (zoom in/out, reset view)
- Local sample POI data in `public/data/destinations.sample.json`

**Phase 6: Itinerary State & Destination Selection**
- Modular state management in `src/state/itineraryStore.js`
- Destination selection from map markers
- Add to Trip functionality with duplicate prevention
- Dynamic itinerary preview rendering
- Day tabs (Day 1, 2, 3)
- Stop controls (move up/down/remove)
- Time wallet calculation (8-hour day capacity)
- localStorage persistence
- Event listener cleanup

**Phase 7: Chatbot UI Integration**
- Chat state module in `src/state/chatStore.js`
- sessionStorage persistence (max 50 messages)
- Chat UI with user/assistant/system bubbles
- Backend `/ask` endpoint integration via `src/api.js`
- Suggestion chips (Best beaches, Hidden waterfalls, Local food, Budget tips)
- Loading indicator with proper cleanup
- Empty message prevention
- Error handling for backend offline

**Phase 8: Final/Share Page**
- Export payload storage in localStorage
- Trip summary display (total stops, days planned, pace)
- Day-by-day breakdown with stop lists
- PDF download placeholder (backend required)
- QR code placeholder (backend required)
- Back to Itinerary navigation
- Start New Trip (clears data, navigates home)
- Empty state for no itinerary

**Phase 9: QA & Bug Fix**
- Route cleanup implementation
- Event listener cleanup fixes
- Map cleanup verification
- Dead code removal
- Build verification

**Phase 10: About, Contact, Creators Polish**
- Completed About page content and responsive styling
- Completed Contact page channel cards and feedback checklist
- Completed Creators page team presentation and credits band
- Preserved vanilla JS/CSS stack and avoided new dependencies

**Focused Phase: Original Pathfinder Itinerary Setup Design Match**
- Added setup-first itinerary behavior with persistent localStorage setup state
- Added original-inspired floating setup overlay over the visible map
- Added top-right Setup control to reopen setup anytime
- Added Virac and San Andres start point selector
- Added native date input styled as the setup date field
- Added Water, Outdoor, Views, Heritage, Dining, and Stay activity buttons
- Added budget selector with <=PHP200, PHP200-PHP600, and PHP600+ labels
- Added Done validation requiring start point, date, and at least one activity
- Preserved existing map, markers, destination preview, Add to Trip, duplicate prevention, day tabs, stop controls, time wallet, chat, export, route cleanup, and storage behavior

**Focused Phase: Original Pathfinder Post-Setup UI Match**
- Redesigned left chatbot header - removed window controls, home button, ASK PATHFINDER text
- Added Pathfinder brand/logo as home link with inline SVG icon
- Added Check Itinerary button in header to bring itinerary card into view
- Integrated itinerary preview into chatbot panel as a message/card
- Removed standalone floating itinerary preview card from map area
- Updated render functions to use chat-itinerary-card elements
- Styled right location details panel with placeholder when no destination selected
- Replaced alert-based map info with Hide Info/Show Info toggle for right panel
- Made map title visibility conditional - only shows when eye button is active
- Implemented Setup button toggle behavior (open/close overlay)
- Moved zoom controls to bottom-right corner with 32px spacing
- Preserved all existing functionality (setup, map, markers, Add to Trip, chat, export, cleanup)

**Focused Phase: Original Pathfinder Chat Panel Behavior Match**
- Separated chat panel and map as two rounded cards with 12px gap between them
- Added border and border-radius to both chatbot-panel and map-area
- Renamed Generate PDF button to Generate with placeholder auto-fill behavior
- Generate button shows system message about recommendation logic requirement
- PDF/export action (Save button) only appears on final day (Day 3)
- Generate button appears on Days 1-2, Save button appears on Day 3
- Replaced day tabs with Day X of Y text and prev/next navigation buttons
- Added minimize/maximize button to itinerary card with collapse behavior
- Minimized card shows only header with rotated icon
- Check Itinerary expands minimized card and moves it to bottom if new messages exist
- Chat input remains visible at bottom of left panel
- Suggestion chips visible when no chat messages exist
- Preserved all existing functionality (setup, map, markers, Add Spot, chat, export, cleanup)

**Focused Phase: Original Pathfinder UI Fidelity Fixes**
- Increased chatbot panel width from 320px to 360px to keep Check Itinerary on one line
- Added flex-shrink: 0 to Check Itinerary button to prevent text wrapping
- Tied location details card toggle to info button beside Setup with visible "Hide Info"/"Show Info" text
- Changed Back button to navigate to previous day instead of going home
- Back button disabled on Day 1, enabled on Days 2-3
- Removed duplicate top day navigation buttons from itinerary card
- Added pace indicator beside day counter in itinerary card header
- Removed duplicate time wallet section (now using pace indicator in header)
- Corrected action buttons: Day 1 (disabled Back, Generate, Next), Middle (Back, Generate, Next), Final (Back, Generate, Save)
- Added CSS variables for light theme in tokens.css
- Updated itinerary.css to use CSS variables for theme consistency
- Chatbot panel, itinerary card, map area, and control buttons now respect light/dark theme
- Preserved all existing functionality (setup, map, markers, Add to Trip, chat, export, cleanup)

**Focused Phase: Lightweight GeoJSON Map and Bundle Trim**
- Replaced the Leaflet/OpenStreetMap tile renderer with a local SVG renderer backed by `public/data/catanduanes_datafile.geojson`
- Preserved itinerary map API compatibility for marker selection, Add to Trip, zoom controls, setup blur, and cleanup behavior
- Removed the Leaflet dependency and deleted the old marker helper module
- Lazy-loaded About, Contact, Creators, and Final page modules/styles so the itinerary bundle stays smaller
- Removed unused hidden itinerary preview, day-tab, and time-wallet UI remnants
- Trimmed unused destination imagery from the public image set

**Focused Phase: Restore Original Pathfinder Map Features Lightweight**
- Added vanilla utility ports for distance, route optimization, itinerary generation, and visual route helpers in `src/utils/`
- Switched itinerary markers from sample JSON to the real local GeoJSON destination points
- Added activity and budget marker filtering using original Pathfinder category mappings
- Added selected hub marker for Virac and San Andres
- Added current-day SVG route line and selected-destination preview route line
- Added selected marker highlighting and featured/top-10 marker styling
- Added popup Add Spot/Remove Spot state with matching itinerary updates
- Sent `active_pin` with chatbot requests and selected returned `locations` by matching local destination data
- Expanded destination details with distance from hub, cost, best time, exposure, and add/remove state
- Kept the lightweight local SVG/GeoJSON renderer and avoided new dependencies

**Focused Phase: Leaflet Offline Map Restoration**
- Added `src/map/leafletOfflineMap.js` as the active map adapter while keeping the previous `liteMap.js` file as fallback/reference
- Reintroduced Leaflet for real panning, zooming, lat/lng marker placement, max-bounds focus, and polyline route rendering
- Kept the map fully offline: local `/tiles/{z}/{x}/{y}.png` are used only if actual image tiles exist, otherwise the map falls back to local GeoJSON polygons/lines with a sea-colored base
- Rendered `public/data/catanduanes_datafile.geojson` polygon/line features through Leaflet canvas and destination points as custom div markers
- Preserved category colors, selected marker highlight, featured/top-10 marker styling, added-marker state, hub marker, popup Add/Remove state, route polyline, and dashed preview polyline
- Added `requestRouteGeometry(waypoints)` placeholder for future local `POST /api/route` FastAPI integration; no public routing servers are called
- Added minimal local Leaflet CSS in `itinerary.css` instead of loading any CDN stylesheet

**Focused Phase: Leaflet Map Interaction Fixes**
- Imported Leaflet's local package CSS to stabilize pan/zoom transforms without using a CDN
- Reworked non-featured destination markers into compact category icon circles while keeping top-10 markers as larger pins with labels
- Added two-click trip date range selection with start/end storage in itinerary setup state
- Added theme-aware offline map colors: green map tone for light mode, light gray map tone for dark mode
- Added `src/utils/offlineRouting.js`, a small local road-network router that snaps stops to offline road corridors and uses Dijkstra to draw multi-segment route/preview lines
- Kept local GeoJSON fallback and confirmed no online tiles or public routing servers are used

## Current Known Implementation

**Working Features:**
- Home page with full layout and animations
- About, Contact, and Creators pages are polished with kiosk-consistent styling
- Itinerary page with offline Leaflet Catanduanes map
- Leaflet panning and zooming are restored
- Non-featured markers use compact category icon circles; top-10 markers remain prominent pins
- Itinerary map filters markers by selected activities and budget
- Itinerary map shows selected start hub, current-day road-following route, preview route, selected marker highlight, and featured markers
- Setup calendar supports start and end date range selection
- First visit to itinerary opens setup overlay until setup is completed
- Setup completion persists in localStorage and can be reopened from the top-right Setup control
- Setup overlay validates start point, trip date, and activities before enabling Done
- Destination marker click updates preview card
- Add/Remove Spot buttons on map popup and details card update the active day
- Duplicate stop prevention
- Itinerary list is dynamic per day
- Day tabs switch between Day 1, 2, 3
- Move up/down/remove stop controls
- Time wallet updates based on 8-hour capacity
- Chatbot connects to backend `/ask` endpoint
- Chat persists in sessionStorage
- Final page reads export payload from localStorage
- Trip summary displays correctly
- Empty state appears when no itinerary exists

**Backend-Dependent Features:**
- PDF generation (placeholder, requires backend)
- QR code generation (placeholder, requires backend)
- Share link creation (placeholder API function ready)

## Current Dependency State

**Production Dependencies:**
- `leaflet` (^1.9.4) - offline interactive map rendering

**Dev Dependencies:**
- `vite` (^8.0.10) - Build tool
- `esbuild` (^0.28.0) - Minifier

**No forbidden dependencies currently added**

## Current Bundle Size

Latest build (Leaflet Map Interaction Fixes):
- HTML: 0.56 kB
- Main CSS: 95.54 kB
- Main JS: 92.17 kB
- Leaflet async JS chunk: 149.47 kB
- Lazy route CSS chunks: 13.21 kB total
- Lazy route JS chunks: 18.55 kB total
- Full built JS/CSS assets: ~368.30 kB

Leaflet is dynamically imported by the itinerary map adapter. No online map tiles, external CDNs, or remote routing services are used.

## Important Technical Notes

**State Management:**
- Route cleanup is handled in `src/main.js` via pageCleanup map
- Itinerary cleanup is exported from `src/pages/itinerary.js` as `cleanupItinerary()`
- Chat state is in `src/state/chatStore.js`
- Itinerary state is in `src/state/itineraryStore.js`
- Itinerary setup state is stored inside `pathfinder-lite-itinerary-state` under `setup`

**Map Implementation:**
- Active offline Leaflet map logic is in `src/map/leafletOfflineMap.js`
- Previous lightweight SVG map logic remains in `src/map/liteMap.js` as fallback/reference
- Local map geometry is in `public/data/catanduanes_datafile.geojson`
- Offline road routing logic is in `src/utils/offlineRouting.js`
- The map checks local `/tiles/{z}/{x}/{y}.png` candidates and only enables tiles when the response is an actual image
- If no local tiles are present, Leaflet renders the local GeoJSON polygon/line layer over a local sea-colored base
- The renderer preserves the same itinerary events for destination selection and Add to Trip
- Map feature utilities are in `src/utils/distance.js`, `src/utils/generateItinerary.js`, `src/utils/optimize.js`, and `src/utils/visualRoute.js`

**Event Listener Management:**
- All event listeners must be tracked in `eventListeners` array
- Cleanup function removes all tracked listeners
- Route cleanup calls page-specific cleanup functions before rendering new page

**Data Flow:**
- Itinerary export payload stored in `pathfinder-lite-export-payload` localStorage key
- Chat messages stored in `pathfinder-lite-chat-messages` sessionStorage key
- Itinerary state stored in `pathfinder-lite-itinerary-state` localStorage key
- Setup completion, start point, trip date, activities, and budget are stored in itinerary state

## Remaining Work

**Phase 11: Asset Optimization**
- Convert images to WebP/AVIF
- Use local WOFF2 fonts
- Minify JSON data files

**Phase 12: Offline/Local Map Readiness**
- Implement local tile server or offline tile caching
- Use local GeoJSON for base map
- Remove online tile dependency

**Phase 13: Backend PDF Generation Integration**
- Connect placeholder PDF download to backend endpoint
- Test PDF generation flow

**Phase 14: QR/Share Link Integration**
- Connect placeholder QR to backend share endpoint
- Implement share link generation

**Phase 15: Raspberry Pi Kiosk Testing**
- Test on actual Raspberry Pi 4B hardware
- Verify touchscreen responsiveness
- Test Chromium kiosk mode
- Performance tuning for target hardware

## Testing Instructions

**Run Frontend Dev Server:**
```bash
npm run dev -- --host 127.0.0.1 --port 7321 --strictPort
```

**Open in Browser:**
```
http://127.0.0.1:7321/#/
```

**Build for Production:**
```bash
npm run build
```

**Test Routes:**
- `#/` - Home page
- `#/itinerary` - Itinerary page with map
- `#/last` - Final/share page
- `#/about` - About page
- `#/contact` - Contact page
- `#/creators` - Creators page

**Manual Testing Checklist:**
- Marker click updates destination preview ✓
- Add to Trip works ✓
- Duplicate prevention works ✓
- Day tabs work ✓
- Move up/down/remove works ✓
- Time wallet updates ✓
- Chat sends messages ✓
- Chat loading cleanup works ✓
- Export to last page works ✓
- Start New Trip clears data ✓
- Route cleanup prevents duplicates ✓

## Recommended First Prompt for Codex

Read `AGENTS.md` and `DEVELOPMENT_CONTEXT.md` first. Then inspect the current codebase and summarize the current state before making changes. Do not modify files until I approve the next phase.
