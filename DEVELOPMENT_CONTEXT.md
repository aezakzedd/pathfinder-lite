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
- **Backend:** Lightweight local FastAPI service under `backend/` for route rendering and future kiosk services
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

**Focused Phase: Map Parity Fixes - Theme, Markers, Date Range, and Routing Contract**
- Restyled the Leaflet GeoJSON base through the existing website theme variables: light mode uses soft green land, dark mode uses white/light-gray land, with readable water, labels, boundaries, and routes
- Made non-featured POIs uniform compact circular markers and top-10 destinations stable SVG pin markers to prevent stretched Leaflet divIcon rendering
- Added `src/utils/routeService.js` as the frontend routing contract: it first tries local `POST /api/route` with `{ "waypoints": [[lng, lat], ...] }` and expects `{ "geometry": [[lng, lat], ...], "distance_km": number, "duration_min": number, "source": string }`
- Kept `src/utils/offlineRouting.js` only as an internally marked `fallback-approximate-road-network` when `/api/route` is unavailable; fallback route lines are visually dashed so they are not presented as authoritative road routing
- Added dynamic date-range day counts from 1 to 7 days across itinerary state, Generate, Back/Next/Save actions, and final/share export payload
- Updated pace calculation to combine visit time with route travel time, using `/api/route` duration when available and fallback estimates otherwise
- Inspected the original Pathfinder route utilities: the original frontend used Turf, geojson-path-finder, and `catanduanes_optimized.json`; Lite does not port those heavy dependencies

**Phase 11A: Real Road-Routing Integration**
- Added shared frontend API base config via `VITE_API_URL` with `http://localhost:8000` fallback
- Pointed `src/api.js` and `src/utils/routeService.js` at the configured backend base instead of the frontend origin
- Added a minimal local FastAPI backend under `backend/` with `POST /api/route`
- Added a compressed SQLite route cache at `backend/data/route_cache.sqlite` for runtime-light road-following routes
- Added `backend/tools/build_route_cache.py` to precompute hub-to-destination and nearest-neighbor destination route geometry from the original local road GeoJSON
- Updated the route endpoint to serve cached `[lng, lat]` geometry, distance, duration, and `source: "local-road-router"` through simple SQLite lookups
- Kept `src/utils/offlineRouting.js` as browser fallback only when the backend is unavailable
- Explicitly marks uncached/backend fallback routes as `fallback-approximate-road-network`
- Kept routing data and pathfinding work out of the frontend bundle and avoided online routing services or heavy frontend pathfinding dependencies

**Phase 12A: Lightweight Offline Chatbot Backend Foundation**
- Added backend `/ask` endpoint backed by deterministic local Python logic
- Added `backend/app/knowledge_base.py` to load tourism/place data from `public/data/catanduanes_datafile.geojson`
- Added exact, slug, partial, municipality/category, budget, and active-pin boosted place matching
- Added `backend/app/dialogue_state.py` for lightweight in-memory kiosk session context
- Added `backend/app/chatbot.py` with local intent routing for place info, recommendations, itinerary requests, nearby questions, budget questions, route questions, greetings, follow-ups, and fallback
- Supported follow-ups such as `tell me more`, `add it`, `nearby food`, `make it cheaper`, `another one`, and active-pin `what about this place?`
- Returned structured responses with `answer`, `locations`, `follow_up`, `actions`, `intent`, and `source: "local-chatbot"`
- Added `backend/tools/chatbot_smoke.py` for deterministic backend smoke checks
- Kept chatbot logic out of the frontend bundle and avoided online LLMs, embeddings, vector DBs, or external APIs

**Phase 12B: Chatbot Data Quality and Frontend Action Integration**
- Restored `.env.example` with `VITE_API_URL=http://localhost:8000`
- Added lightweight chatbot seed files under `backend/data/chatbot/` for aliases, enriched place facts, FAQs, and recommendation rules
- Enriched GeoJSON-backed places with common aliases such as Binurong, Twin Rock, Bato Church, Puraran, Mamangal, Maribina, Balacay, Virac Airport, and Virac Port
- Added structured fact snippets for important places including best time, accessibility, travel tips, budget notes, family notes, visit duration, and caution notes
- Added deterministic FAQ routing for general Catanduanes questions such as best time to visit, budget tips, transport, safety, food, rainy weather, family-friendly stops, and packing
- Improved recommendation ranking for beaches, viewpoints, food, heritage, budget-friendly stops, family-friendly stops, low-walking stops, and outdoor/nature stops
- Improved follow-up memory so `tell me more`, `nearby food`, `another one`, `make it cheaper`, and `add it` preserve context better
- Improved fallback behavior to suggest possible place matches instead of giving random recommendations
- Updated the frontend chat flow to send setup preferences with `/ask`, select/highlight returned locations, show multiple-match status, and treat `add_to_trip` actions as guidance to use the existing Add Spot UI
- Expanded `backend/tools/chatbot_smoke.py` to cover alias lookup, FAQ, enriched facts, budget beaches, follow-ups, active pin, and nearby food behavior
- Kept the chatbot deterministic and offline-capable without LLMs, embeddings, vector databases, or online APIs

**Phase 12C: Chat-Driven Itinerary Generation and Safe Actions**
- Added `backend/app/itinerary_planner.py` for deterministic local itinerary planning from GeoJSON places, setup preferences, recommendation rules, and route-cache travel estimates
- Parsed day count, start point, activities/categories, budget, pace, and avoid terms such as hiking, rainy weather, far stops, and expensive stops
- Generated day-by-day itinerary actions with `replace_itinerary`, including days, local destination objects, and summaries with day count, start point, pace, budget, route source, and estimated total minutes
- Added safe smaller chatbot actions for `add_to_day`, `remove_place`, `replace_place`, and `clear_itinerary_suggestion`
- Preserved duplicate prevention by sending the current itinerary from the frontend to `/ask`
- Updated frontend chat messages to render confirmation buttons for structured actions such as Apply Plan, Add to Day, Remove, Replace, and Clear Plan
- The frontend does not silently apply chatbot itinerary edits; it waits for the user to tap the action button before mutating itinerary state
- Applying a chatbot plan uses the existing itinerary store, map selection, route updates, active-day behavior, and local destination data matching
- Expanded backend smoke checks to cover generated beach itineraries, budget itineraries, 3-day Virac plans, cheaper follow-ups, add-to-day with active pin, and duplicate prevention
- Kept Phase 12C deterministic and offline-capable without LLMs, embeddings, vector databases, online APIs, or new dependencies

**Phase 13B.1: Lightweight Backend-Generated Itinerary PDF Download**
- Added fpdf2 to backend/requirements.txt for lightweight backend PDF generation
- Created backend/app/pdf_generator.py with itinerary PDF generation logic using fpdf2
- Created backend/app/pdf_store.py for PDF storage management with UUID-based IDs
- Created backend/data/generated_pdfs/ directory for PDF storage and added to .gitignore
- Added POST /api/pdf/generate endpoint to accept frontend export payload and generate PDF
- Added GET /api/pdf/{pdf_id}.pdf endpoint to download generated PDF files
- Added DELETE /api/pdf/{pdf_id} endpoint to delete generated PDF files from storage
- Updated src/pages/last.js with functional Generate PDF button, loading state, download link, and error handling
- Created backend/tools/pdf_smoke.py smoke test with sample 2-day itinerary payload
- Smoke test passed: PDF ID f0ccc287-dbb6-4111-995f-12e4a49f325e, file size 1740 bytes
- Ran python -m compileall backend and npm run build successfully
- Updated backend/README.md with PDF endpoint documentation, sample curl request, and storage location
- PDF includes: title, timestamp, start hub, date range, day count, total stops, route source, day-by-day itinerary, stop details, drive time, visit duration, day status (Relaxed/Busy/Tight/Overloaded), and footer disclaimer
- Kept PDF visually simple with readable headings, light section dividers, compact stop rows, no external fonts, and no image loading
- Did not include locked/anchor labels unless stored in itinerary
- Frontend remains a renderer only; PDF generation is entirely backend-side
- Kept vanilla JS, Vite, plain CSS, and Leaflet stack without adding React, Tailwind, MapLibre, or frontend PDF libraries

**Phase 13B.2: Finish & Home Cleanup and PDF Session Cleanup**
- Added POST /api/session/finish endpoint to backend/app/main.py
- Endpoint accepts optional pdf_id and session_id payload
- Deletes generated PDF if pdf_id is provided using existing pdf_store logic
- Clears chatbot dialogue memory for session if session_id is provided
- Returns {ok: true, deleted_pdf: true/false, cleared_session: true/false}
- Endpoint is safe if pdf_id is missing, already deleted, or invalid
- Does not delete route cache, chatbot data, tourism data, or app files
- Updated src/api.js finishSession(payload) to accept optional payload
- Updated src/pages/last.js with Finish & Home button
- Finish & Home button calls POST /api/session/finish with pdf_id and session_id
- Clears localStorage/sessionStorage keys: itinerary state, export payload, chat messages, pdf_id
- Navigates back to home after cleanup
- Shows cleanup/loading state while finishing
- If backend cleanup fails, still clears local browser state and goes home with readable warning
- Stores pdf_id in localStorage when PDF is generated for session cleanup
- Updated backend/tools/pdf_smoke.py to test session finish endpoint
- Smoke test passed: PDF generated, session finish deleted PDF, repeated call handled safely
- Ran python -m compileall backend and npm run build successfully
- Updated backend/README.md with /api/session/finish documentation
- Ensures next kiosk user starts with clean session without affecting shared resources

**Phase 13B.2: Lightweight PDF Schedule and Content Upgrade**
- Completely rewrote backend/app/pdf_generator.py with expedition-style PDF layout
- Added expedition-style top section with STATUS, PATHFINDER_LITE version, itinerary ID, EXPEDITION PLAN title, location, date range, total days/stops, and generation timestamp
- Fixed time scheduling: stops no longer show all 9:00 AM, now use computed arrival times based on drive time and visit duration
- Fixed duration formatting: decimal hours (1.5, 0.75) now display as hours/minutes (1h 30m, 45m)
- Added route source display logic: shows local-road-router or fallback-approximate-road-network
- Added day cards with schedule status (Relaxed/Busy/Tight/Overloaded), stop count, recommended start time, estimated finish time, total duration
- Added time-block grouping (MORNING before 12:00, AFTERNOON 12:00-18:00, EVENING 18:00+)
- Added start line "-> START FROM [HUB]" and drive lines between stops
- Added drive lines with transport type (TRICYCLE/VAN/PRIVATE VAN) and cost estimates based on drive minutes
- Enhanced stop information: arrival time, name, municipality, category, TOP 10 label, description, opening hours, best time, exposure/weather tip, stay duration
- Added Financial Blueprint section with budget tier, logistics/payment notes, fuel/terrain notes, cost breakdown disclaimer
- Added Emergency & Reference section with Provincial Tourism Office, Catanduanes Provincial Hospital, Philippine National Police, Philippine Coast Guard, Emergency Hotline 911
- Added Travel Reminders section: offline maps, cash, weather, water/sun protection, local customs
- Added stronger disclaimer about estimates and verification requirements
- Added footer on every page with Pathfinder Lite, generation date, timing estimates may vary, page number
- Updated backend/tools/pdf_smoke.py with 10-stop 2-day payload for multi-page PDF testing
- Added PDF feature verification to smoke test output
- Smoke test passed: PDF ID 897a9b75-a004-4393-a83b-36ef0856c331, all features verified
- Ran python -m compileall backend and npm run build successfully
- Updated backend/README.md with PDF upgrade description
- PDF remains backend-only using fpdf2, no frontend PDF libraries added
- Kept vanilla JS, Vite, plain CSS, and Leaflet stack

**Phase 13B.3: Last Page Export UI and Control Visibility Polish**
- Redesigned Last page layout into a proper kiosk export screen
- Added fixed/sticky export toolbar that remains visible while PDF is displayed
- Export toolbar includes: Back to Itinerary, PDF status indicator, Generate PDF/Download PDF, Send to Phone (disabled with "Coming next"), Finish & Home
- Made buttons larger and readable for kiosk use (min-height 56px, min-width 180px)
- Added clear PDF state messages: Generating PDF (yellow), PDF Ready (green), Error (red)
- PDF preview area is scrollable independently with iframe
- Added preview fallback message: "Preview unavailable on this browser. Use Download PDF."
- Controls not hidden behind PDF iframe with z-index 1000 on toolbar, z-index 2000 on loading/error overlays
- Send to Phone button disabled with "Coming next" badge since not yet implemented
- Layout works at kiosk viewport sizes: 1920x1080 (larger buttons), 1366x768 (stacked layout), smaller screens (responsive)
- PDF recovery from localStorage after refresh shows correct toolbar state (PDF Ready if PDF exists)
- Back to Itinerary returns to itinerary page without clearing current itinerary
- Finish & Home clears session/local state and returns home
- Download PDF remains immediately visible after PDF generation
- Updated src/pages/last.js with new export toolbar layout and PDF preview
- Updated src/styles/last.css with fixed toolbar, large buttons, responsive design
- Smoke test passed: PDF ID 08b9cba4-9dfe-4b2b-8ee1-139cd1dcfee3, file size 5131 bytes
- Ran python -m compileall backend and npm run build successfully
- Kept vanilla JS, Vite, plain CSS, and Leaflet stack
- Visual style consistent with dark Pathfinder UI

**Phase 13B.4: Original Pathfinder Last Page Export Viewer Recreation**
- Replaced the Last page dashboard/split layout with an original Pathfinder-style export viewer
- Removed the visible Trip Summary / Day Breakdown sidebar from the main Last page layout
- Made the PDF preview the centered dominant stage on a dark fullscreen kiosk background
- Added an independently scrollable full-screen PDF preview stage with a clean white document preview
- Reworked export controls into a fixed upper-left control panel that remains visible while the PDF preview scrolls
- Toolbar controls now match the original grouping: Back to Itinerary, Finish & Home, Download PDF in a horizontal row
- Removed the global site navbar from the Last page so export controls are not covered
- Removed the Send to Phone and PDF Ready status cards from the visible export viewer after UI parity review
- Removed icons from Back to Itinerary, Finish & Home, Download PDF, and Go to Itinerary controls
- Made the export control row transparent so it floats over the viewer without a heavy card background
- Restored solid button fills for Back to Itinerary, Finish & Home, and Download PDF after readability review
- Updated the backend PDF endpoint to serve inline previews by default and attachment downloads only with `?download=1`, fixing blank iframe previews in Chromium
- Download PDF remains visible at all times; it is disabled while generating and enabled immediately once the PDF is ready
- Last page now auto-generates the backend PDF when export payload exists and no saved PDF ID is available
- Refresh recovery reads `pathfinder-lite-pdf-id` from localStorage, restores the iframe preview URL, and enables Download PDF even when the export payload has already been cleared
- PDF state messages now live in the preview area only; the fixed toolbar is reduced to the three core actions
- Preview fallback message says "Preview unavailable on this browser. Use Download PDF."
- Kept Back to Itinerary behavior non-destructive and kept Finish & Home session/local cleanup behavior
- Kept the existing backend-generated PDF flow without adding frontend PDF libraries, QR libraries, canvas capture, or new dependencies

**Phase 13C.1: Original Pathfinder Home Page Visual Layout Port**
- Replaced the previous Lite "Discover Catanduanes" multi-section home page with an original Pathfinder-style dark fullscreen landing page
- Added centered hero copy matching the original: `PATHFINDER // v1.0.21`, `Explore with every click.`, the Catanduanes AI travel guide subtitle, and compact Start Exploring / Work with us actions
- Restyled the home navbar to match the original composition: Pathfinder logo on the left, Creators / What we do / Contact centered, circular theme control, and white Start button on the right
- Added CSS-only dark background effects with radial color glow, subtle star/dot pattern, and vignette edges; no animation libraries or new dependencies were added
- Added a static bottom destination card strip using local images: Binurong Point as the large center card, with Puraran Beach and Twin Rock side cards peeking in
- Added a tourism/partner text mark row below the hero actions as a lightweight substitute for unavailable original partner logo files
- Preserved hash navigation: top Start and hero Start Exploring both navigate to `#/itinerary`; Work with us navigates to `#/contact`
- Removed old home bento cards, stats strip, placeholder badges, and emoji carousel placeholders from the active home layout
- Kept the home page frontend-only, vanilla JS, plain CSS, and local assets only

**Phase 13C.1b: Original Pathfinder Public Pages Visual Parity**
- Inspected the original Pathfinder Home, About, Creators, Contact, and navbar source from `https://github.com/bikemaster2331/pathfinder.git`
- Rebuilt the public-page navbar to more closely match the original: icon-only Pathfinder mark at left, centered Creators / What we do / Contact links, circular theme button, and compact white Start CTA on the home page
- Replaced the Lite home implementation with a closer original structure: dark hero, original copy, local badge image, compressed original destination carousel assets, guide showcase, prism media grid, open-source section, and footer
- Added a small vanilla carousel controller and IntersectionObserver scroll reveals with cleanup in `src/pages/home.js`; no Framer Motion, GSAP, canvas particle library, or other animation dependency was added
- Ported About page copy and structure from the original: editorial hero, island-wide stats strip, What it is / How it works / Who's behind it sections, CTA row, and footer
- Ported Creators page structure from the original: editorial intro, three creator rows with roles/tags, links, and tourism office closing note
- Ported Contact page structure from the original: editorial hero, Email/GitHub/Facebook channel rows, quick-copy email box, and footer
- Imported original local visual resources into `public/images/original/` as compressed WebP files instead of shipping the original multi-megabyte PNGs
- Kept the implementation vanilla JS, plain CSS, local assets only, and did not modify itinerary, map, backend routing, chatbot, or PDF behavior

**Phase 13C.2: Lightweight Backend-Generated QR PDF Sharing**
- Added `qrcode>=7.4,<8` to backend requirements for backend-generated SVG QR output
- Added `backend/app/pdf_share.py` with in-memory 60-minute share sessions, short safe share IDs, expired-share cleanup, SVG QR generation, mobile share page rendering, and PDF share invalidation
- Added `POST /api/pdf/{pdf_id}/share` to validate a generated PDF, create or reuse a share ID, build a QR share URL, and return `share_id`, `share_url`, `pdf_url`, `qr_svg`, and `expires_in_minutes`
- Added `GET /s/{share_id}` to serve a lightweight mobile landing page with an Open PDF button and same-Wi-Fi/hotspot reminder
- Added `GET /api/pdf-share/{share_id}.pdf` to serve shared PDFs inline without exposing raw `pdf_id` in the URL
- Added `PATHFINDER_SHARE_BASE_URL` support so Raspberry Pi deployments can emit LAN/hotspot QR URLs such as `http://192.168.1.50:8000`; fallback remains `request.base_url` for development
- Updated `POST /api/session/finish` and `DELETE /api/pdf/{pdf_id}` to invalidate active QR share sessions for the PDF
- Replaced stale frontend share helpers pointing at `/api/pdf-cache` and `/api/share` with `createPdfShare(pdfId)` calling `POST /api/pdf/{pdf_id}/share`
- Restored the Last page Send to Phone panel under the fixed export controls with states for preparing, QR ready, localhost/LAN warning, and transfer unavailable
- The frontend only injects backend-generated SVG into a dedicated QR container; no frontend QR package, canvas renderer, PNG dependency, or online service was added
- Expanded `backend/tools/pdf_smoke.py` to verify share creation, QR SVG output, mobile landing page, shared PDF endpoint, and share invalidation after Finish & Home cleanup

**Phase 13D.1: Original Pathfinder PDF Content and Visual Parity**
- Inspected the original Pathfinder PDF artifact and the original `generatePDF.js` implementation, then manually ported the visual/content structure into the Lite backend fpdf2 generator
- Rebuilt `backend/app/pdf_generator.py` around an original-inspired theme: dark navy expedition header, green status/version/id text, large centered `EXPEDITION PLAN`, human-readable date range, stats row, and blue `GENERATED BY PATHFINDER AI`
- Added dark navy day cards with stop counts, yellow schedule status, map placeholder section, `Click map image for directions.`, MORNING/AFTERNOON/EVENING blocks, start/drive lines, and bordered stop cards with blue time badges
- Added field compatibility for original and Lite payloads including `best_time`, `best_time_of_day`, `outdoor_exposure`, `exposure`, `weather_tip`, `visit_time_minutes`, `duration`, `opening_hours`, `hours`, `is_top_10`, `isTop10`, `is_top10`, and `top10`
- Added schedule pagination safeguards so stop cards do not overlap footers, day headers are not stranded at page bottoms, and footers render as `Pathfinder AI - Generated M/D/YYYY - Timing estimates may vary` plus `Page X of Y`
- Added original-style Financial Blueprint, Budget Distribution, logistics/payment tip, fuel/terrain note, Cost Breakdown Per Stop, Emergency & Reference, Travel Reminders, and AI-generated content disclaimer sections
- Updated `backend/tools/pdf_smoke.py` with a 2-day, 16-stop original-style sample payload and checks for generated PDF size, multi-page output, QR share creation, mobile share page, shared PDF endpoint, and share invalidation after session finish
- Documented that map screenshots remain placeholders in this phase because Lite avoids frontend screenshot/PDF libraries and MapLibre; exact map imagery should be handled in a later backend-safe static map phase

**Phase 13D.3: Last Page Real Backend PDF Preview**
- Removed the fake HTML export preview path from `src/pages/last.js`, including the old `renderExportPreview`, preview-page builders, date/stop formatting helpers, and HTML-only PDF layout rendering
- Last page preview now shows only the real backend PDF iframe at `/api/pdf/{pdf_id}.pdf`, a generating skeleton, an empty state, or a preview-unavailable fallback
- Existing saved `pathfinder-lite-pdf-id` values recover immediately into the real backend PDF iframe and enable Download PDF without needing the old export payload
- New exports show `Generating PDF preview...`, call `POST /api/pdf/generate`, save `pdf_id`, enable Download PDF with `?download=1`, render the inline PDF URL without `?download=1`, and then create the QR share session
- Trimmed fake-preview CSS from `src/styles/last.css` and added focused `.pdf-preview-frame` styling for centered, scrollable backend PDF display while keeping the fixed export controls and QR panel above the iframe
- Kept QR sharing, Download PDF, Back to Itinerary, Finish & Home cleanup, and localStorage/sessionStorage cleanup behavior intact without adding frontend PDF or QR libraries

**Phase 13D.4: PDF Preview Chrome Polish and Google Maps Directions Integration**
- Added `getPdfIframeUrl(pdfUrl)` helper to append PDF viewer hints: `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
- Updated `renderPdfPreview()` to use `getPdfIframeUrl()` for the iframe src while keeping `getPdfDownloadUrl()` separate for downloads
- Reduced `.pdf-preview-frame` width from 72vw/1040px to 70vw/980px to minimize dark PDF viewer side space
- Updated responsive breakpoints for pdf-preview-frame to maintain consistent sizing across screen sizes
- Note: Browser PDF toolbar hiding via URL fragment is best-effort only because Chromium's native PDF viewer controls are browser-owned and may ignore the hints
- Added Google Maps Directions URL generation to backend with `build_google_maps_directions_url()` and `build_day_directions_url()`
- Added coordinate extraction supporting multiple field formats: `coordinates=[lng,lat]`, `geometry.coordinates=[lng,lat]`, `lng/lat`, `longitude/latitude`, `lon/lat`
- Added known hub coordinates for Virac (13.5833, 124.2333) and San Andres (13.6167, 124.0833)
- Google Maps URLs use correct lat,lng order (not lng,lat) and limit waypoints to 8 to avoid URL length issues
- Updated `draw_map_placeholder()` to accept `directions_url` parameter and attach clickable link to map rectangle using `pdf.link()`
- Map placeholder text changed from "MAP SCREENSHOT PLACEHOLDER" to "Route placeholder" with smaller, muted font
- Link text shows blue "Click map image for directions." when coordinates are available, gray "Directions unavailable: missing coordinates." when not
- No Google API key or online API calls are used; only standard Google Maps URLs are generated
- Map screenshots remain as drawn route-style placeholders; actual map imagery is not implemented in this phase

**Phase 13D.5: Remove Double Scrollbar from Last Page PDF Preview**
- Changed `.pdf-preview-stage` from `overflow: auto` to `overflow: hidden` to remove outer page scrollbar
- Removed bottom padding from `.pdf-preview-stage` (was `48px`, now just `22px 44px`)
- Updated `.pdf-document-wrap` to have `height: calc(100vh - 44px)` and `overflow: hidden`
- Updated `.pdf-document-wrap` width from `min(72vw, 940px)` to `min(70vw, 980px)` to match iframe width
- Changed `.pdf-preview-frame` from fixed width with min-height to `width: 100%` and `height: 100%`
- Removed `min-height: 920px` from `.pdf-preview-frame` (was forcing outer container to overflow)
- Removed `min-height: 820px` from 1366px breakpoint
- Removed `min-height: 760px` from 980px breakpoint
- Removed `min-height: 1180px` from 1920px breakpoint
- The PDF iframe is now the only scrollable area with its internal Chromium PDF viewer scrollbar
- Outer Last page remains `position: fixed`, `inset: 0`, `overflow: hidden` with dark background
- Controls remain fixed and clickable above the iframe with z-index 1000
- Send to Phone QR panel does not create page scroll
- No horizontal scrolling created
- Kept iframe centered with flex layout
- No changes to backend PDF generation, QR sharing, Download PDF, or Finish & Home

**Phase 13D.6: Google Maps Launcher Page for PDF Map Links**
- Added `backend/app/map_link.py` with in-memory map link registry similar to QR share registry
- Map link registry stores: map_link_id, pdf_id, google_maps_url, created_at, expires_at
- Map links expire after 60 minutes (same TTL as QR share sessions)
- Added endpoint `GET /m/{map_link_id}` that returns lightweight HTML launcher page
- Launcher page displays: "Pathfinder Directions" title, "Open this day route in Google Maps." message
- Launcher page has primary button "Open Google Maps" with `target="_blank"` and `rel="noopener noreferrer"`
- Launcher page has secondary button "Return to PDF" linking back to `/api/pdf/{pdf_id}.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
- Updated `generate_itinerary_pdf()` to accept optional `base_url` parameter
- Updated `draw_day()` to accept `pdf_id` and `base_url` parameters
- When a day has Google Maps directions URL and base_url is provided, PDF generator creates a map link via `create_map_link()`
- PDF map placeholder now links to launcher URL instead of direct Google Maps URL
- Launcher page uses the same base URL logic as QR sharing (PATHFINDER_SHARE_BASE_URL or request.base_url)
- Updated `DELETE /api/pdf/{pdf_id}` to invalidate map links for the PDF
- Updated `POST /api/session/finish` to invalidate map links when pdf_id is provided
- Updated smoke test to add coordinates to sample payload for Google Maps URL generation
- Updated smoke test to verify map link creation, launcher page content, and map link invalidation
- Launcher page avoids open redirect risk by only storing backend-generated Google Maps URLs
- Direct PDF URI annotations cannot reliably force `target="_blank"` inside Chromium's built-in PDF viewer, so the launcher page is a safe workaround
- No changes to frontend JavaScript, CSS, or QR sharing
- No Google API key or online API calls are used for launcher functionality

**Phase 13E.1: Backend-Rendered PDF Page Preview with HTML Map Overlays**
- Added Pillow>=10,<12 to backend/requirements.txt for route map image generation
- Added pypdfium2>=4,<5 to backend/requirements.txt for PDF page rendering to PNG
- Created `backend/app/map_renderer.py` for local route map image generation using Pillow
  - Supports various coordinate formats ([lng, lat], lng/lat, longitude/latitude)
  - Supports hub coordinates (Virac, San Andres) as starting points
  - Generates local route image with dark water, gray land, blue route line, colored stop dots, distinct start/end markers
  - Fits coordinates into image bounds with padding
  - Generates fallback image if fewer than 2 valid coordinates
- Created `backend/app/pdf_preview.py` for PDF page image rendering using pypdfium2
  - Renders generated PDF pages into PNG images stored in `backend/data/generated_pdfs/previews/{pdf_id}/page-X.png`
  - Stores overlay metadata in `backend/data/generated_pdfs/previews/{pdf_id}/overlays.json`
  - Provides functions for preview metadata retrieval and overlay management
  - Provides functions for preview image cleanup
- Updated `backend/app/pdf_generator.py` to:
  - Import map_renderer functions for route map image generation
  - Change `generate_itinerary_pdf()` return type to include overlay_metadata
  - Update `draw_day()` to accept overlay_metadata parameter and return map_overlay
  - Replace fpdf2-drawn map placeholder with generated PNG route image using `pdf.image()`
  - Record normalized page coordinates (x, y, w, h from 0 to 1) for map link overlays during PDF generation
  - Keep map rectangle/link clickable and "Click map image for directions." text
- Updated `backend/app/main.py` to:
  - Import pdf_preview functions for preview image management
  - Update `POST /api/pdf/generate` to handle new return type from generate_itinerary_pdf
  - Call `render_pdf_pages_to_images()` after PDF generation
  - Call `add_map_link_overlay()` for each map link from overlay_metadata
  - Add `GET /api/pdf/{pdf_id}/preview` endpoint returning JSON with pdf_id, page_count, pages (image_url, width, height, links)
  - Add `GET /api/pdf/{pdf_id}/preview/{page}.png` endpoint returning the rendered page image
  - Update `DELETE /api/pdf/{pdf_id}` to call `delete_preview_images()`
  - Update `POST /api/session/finish` to call `delete_preview_images()`
- Updated `src/pages/last.js` to:
  - Stop using native PDF iframe as primary preview
  - Add `getPdfPreviewMetadataUrl()` function for preview API endpoint
  - Add `loadPreviewImages()` function to fetch preview metadata and render page images
  - Add `renderPreviewPages()` function to render page images with transparent HTML anchor overlays
  - Add `attachFallbackHandler()` function for fallback to iframe if preview fails
  - Update `renderPdfPreview()` to return a container div instead of iframe
  - Update `renderPreviewUnavailable()` to include fallback button to open PDF iframe
  - Update `generatePdfForPreview()` to call `loadPreviewImages()` after PDF generation
  - Update initial render to call `loadPreviewImages()` when pdf_id exists from localStorage
  - Keep Download PDF button using real PDF endpoint
  - Keep QR sharing using real PDF endpoint
  - Keep localStorage pdf_id recovery
- Updated `src/styles/last.css` to:
  - Add `.pdf-preview-pages` for vertical scrolling preview container
  - Add `.pdf-preview-pages-inner` for page images layout
  - Add `.pdf-preview-loading` for loading state
  - Add `.pdf-preview-image-page` for individual page containers with CSS variables for dimensions
  - Add `.pdf-preview-page-image` for page images
  - Add `.pdf-preview-hotspot` for transparent anchor overlays with absolute positioning
- Updated `backend/tools/pdf_smoke.py` to:
  - Import map_renderer and pdf_preview functions
  - Update generate_itinerary_pdf call to handle new return type with overlay_metadata
  - Add test for route map image generation with coordinates
  - Add test for fallback map image generation
  - Add test for preview image rendering
  - Add test for preview metadata retrieval
  - Add test for preview JSON endpoint
  - Add test for preview page image endpoint
  - Add test for preview image cleanup
  - Add verification that preview images are deleted by session finish
- Updated `backend/README.md` with documentation for backend-rendered PDF page preview, route map images, and new dependencies (Pillow, pypdfium2)
- Backend-rendered preview overcomes Chromium PDF viewer limitations by using HTML overlays for reliable `target="_blank"` behavior
- No frontend PDF libraries (pdfjs-dist, jsPDF) or external APIs are used
- Preview images are cleaned up on PDF deletion and session finish
- All smoke tests pass, dependencies installed, backend compiles, frontend builds successfully

**Offline Routing Implementation Plan:**
- Best short-term: generate precomputed local route GeoJSON between hubs and POIs, then serve exact route geometry from the local backend through `POST /api/route`
- Best long-term: run a local OSRM, Valhalla, or GraphHopper service on localhost and have the FastAPI backend adapt its response to the Lite route contract
- The Lite frontend must remain a renderer only; it should not become the heavy routing/pathfinding engine
- No public OSRM/demo servers, online routing APIs, online tiles, external CDNs, Turf, geojson-path-finder, or MapLibre should be used in Pathfinder Lite

## Current Known Implementation

**Working Features:**
- Home page now closely follows the original Pathfinder public landing layout with lightweight carousel and scroll reveal behavior
- About, Contact, and Creators pages now use original Pathfinder-style editorial structure and copy
- Itinerary page with offline Leaflet Catanduanes map
- Leaflet panning and zooming are restored
- Non-featured markers use compact category icon circles; top-10 markers remain prominent pins
- Itinerary map filters markers by selected activities and budget
- Itinerary map shows selected start hub, current-day route, preview route, selected marker highlight, and featured markers
- Route rendering first tries local `/api/route`, which serves a small precomputed SQLite road-route cache, and falls back to an approximate local road graph only when unavailable or uncached
- Chatbot `/ask` works offline from the local GeoJSON knowledge base and can return locations for map highlighting
- Chatbot `/ask` is enriched by local alias, place fact, FAQ, and recommendation-rule seed files
- Chatbot `/ask` can generate simple local itinerary plans and safe itinerary edit actions without an LLM
- Frontend chat sends active pin, setup preferences, and the current itinerary to `/ask`, highlights returned locations, reports multiple matches, and confirms structured itinerary actions before applying them
- Setup calendar supports start and end date range selection, and itinerary days are derived from the selected range up to 7 days
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
- Final page can generate a backend SVG QR code for Send to Phone once a PDF is ready
- QR share links open a lightweight mobile page and serve the generated PDF from the local backend
- Trip summary displays correctly
- Empty state appears when no itinerary exists

**Backend-Dependent Features:**
- PDF generation (backend fpdf2 original-style expedition PDF with frontend preview/download button)
- QR code generation and phone PDF sharing (backend qrcode SVG output and in-memory share sessions)
- Share link creation through local backend `/api/pdf/{pdf_id}/share`

## Current Dependency State

**Production Dependencies:**
- `leaflet` (^1.9.4) - offline interactive map rendering

**Backend Dependencies:**
- `fastapi` / `uvicorn` - local API service
- `fpdf2` - backend PDF generation
- `qrcode` - backend SVG QR generation

**Dev Dependencies:**
- `vite` (^8.0.10) - Build tool
- `esbuild` (^0.28.0) - Minifier

**No forbidden dependencies currently added**

## Current Bundle Size

Latest build (Phase 13D.3 Last Page Real PDF Preview):
- HTML: 0.56 kB
- Main CSS: 97.41 kB
- Main JS: 102.83 kB
- Leaflet async JS chunk: 149.47 kB
- Last page CSS chunk: 5.70 kB
- Last page JS chunk: 7.56 kB
- Lazy public route CSS chunks: 7.01 kB total
- Lazy public route JS chunks: 9.24 kB total
- Full built JS/CSS assets: ~379.22 kB

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
- Route API contract and fallback selection logic is in `src/utils/routeService.js`
- Backend precomputed route cache is in `backend/data/route_cache.sqlite`
- Backend route cache generator is `backend/tools/build_route_cache.py`
- Backend chatbot logic is in `backend/app/chatbot.py`, `backend/app/knowledge_base.py`, and `backend/app/dialogue_state.py`
- Backend itinerary planning logic is in `backend/app/itinerary_planner.py`
- Backend chatbot seed data is in `backend/data/chatbot/aliases.json`, `place_facts.json`, `faqs.json`, and `recommendation_rules.json`
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
