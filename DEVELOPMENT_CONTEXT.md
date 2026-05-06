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
- **Map:** Leaflet (no MapLibre)
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
- Added original-inspired floating setup overlay over the visible Leaflet map
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

## Current Known Implementation

**Working Features:**
- Home page with full layout and animations
- About, Contact, and Creators pages are polished with kiosk-consistent styling
- Itinerary page with real Leaflet map
- First visit to itinerary opens setup overlay until setup is completed
- Setup completion persists in localStorage and can be reopened from the top-right Setup control
- Setup overlay validates start point, trip date, and activities before enabling Done
- Destination marker click updates preview card
- Add to Trip button adds to active day
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
- `leaflet` (^1.9.4) - Map rendering

**Dev Dependencies:**
- `vite` (^8.0.10) - Build tool
- `esbuild` (^0.28.0) - Minifier

**No forbidden dependencies currently added**

## Current Bundle Size

Latest build (Original Pathfinder Chat Panel Behavior Match):
- HTML: 0.56 kB
- CSS: 79.85 kB
- JS: 222.59 kB
- Total: ~303.00 kB

Still acceptable for lightweight Raspberry Pi target.

## Important Technical Notes

**State Management:**
- Route cleanup is handled in `src/main.js` via pageCleanup map
- Itinerary cleanup is exported from `src/pages/itinerary.js` as `cleanupItinerary()`
- Chat state is in `src/state/chatStore.js`
- Itinerary state is in `src/state/itineraryStore.js`
- Itinerary setup state is stored inside `pathfinder-lite-itinerary-state` under `setup`

**Map Implementation:**
- Leaflet map logic is in `src/map/leafletMap.js`
- Marker logic is in `src/map/markers.js`
- Current map uses OpenStreetMap tiles as temporary development fallback only
- Final kiosk deployment should use local/offline tiles, local image overlay, or local GeoJSON base

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
