// Itinerary page module
import { initMap, zoomIn, zoomOut, resetView, destroyMap, invalidateSize, updateMapState } from '../map/liteMap.js';
import { askPathfinder } from '../api.js';
import { getState as getAppState, setState as setAppState } from '../state.js';
import {
  getSelectedDestination,
  setSelectedDestination,
  clearSelectedDestination,
  getActiveDay,
  setActiveDay,
  getDayStops,
  addStopToDay,
  removeStopFromDay,
  removeDestinationFromDay,
  replaceItineraryDays,
  moveStopUp,
  moveStopDown,
  reorderStop,
  reorderStopToEnd,
  getTimeWalletInfo,
  isDestinationInDay,
  getStopCount,
  getTripSetup,
  updateTripSetup,
  toggleTripSetupActivity,
  setTripSetupBudget,
  isTripSetupComplete,
  completeTripSetup,
  subscribe,
  getAllStops,
  clearItinerary
} from '../state/itineraryStore.js';
import {
  addMessage,
  getMessages,
  removeMessage,
  subscribe as subscribeChat
} from '../state/chatStore.js';
import { calculateDistance, calculateDriveTimes } from '../utils/distance.js';
import {
  featureCollectionToDestinations,
  filterDestinationsForSetup,
  findDestinationsByLocations,
  generateItinerary
} from '../utils/generateItinerary.js';
import { buildPreviewRouteCoordinates, buildRouteCoordinates, getHubByName } from '../utils/visualRoute.js';

let mapInitialized = false;
let stateUnsubscribe = null;
let chatUnsubscribe = null;
let eventListeners = [];
let isSending = false;
let setupOverlayOpen = false;
let setupCalendarOpen = false;
let setupOpenedFromCompleted = false;
let draggedStopId = null;
let pointerDrag = null;
let allDestinations = [];
let allSpotsGeoJson = null;

const setupActivities = ['Water', 'Outdoor', 'Views', 'Heritage', 'Dining', 'Stay'];
const budgetOptions = [
  { value: 'low', label: '&le;&#8369;200' },
  { value: 'medium', label: '&#8369;200-&#8369;600' },
  { value: 'high', label: '&#8369;600+' }
];

const setupActivityIcons = {
  Water: '<path d="M8 17a4 4 0 0 0 8 0c0-3-4-7-4-7s-4 4-4 7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /><path d="M15 6h2l2 4M13 6h-2l-2 4M14 3l-2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />',
  Outdoor: '<path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke="currentColor" stroke-width="1.8" /><path d="M7 21l2-7 3-2 3 2 2 7M9 10l-3 3M15 10l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />',
  Views: '<path d="m4 19 5-9 4 6 2-3 5 6H4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /><path d="M14 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />',
  Heritage: '<path d="M5 9h14M7 9v10M17 9v10M4 19h16M6 5h12l1 4H5l1-4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />',
  Dining: '<path d="M7 3v8M10 3v8M7 7h3M8.5 11v10M16 3v18M14 3v7a2 2 0 0 0 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />',
  Stay: '<path d="M4 20V9l8-5 8 5v11M8 20v-7h8v7M10 20v-3h4v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />'
};

// Category emoji mapping
const categoryEmojis = {
  'Water': '🌊',
  'Views': '🏔️',
  'Outdoor': '🥾',
  'Heritage': '🏛️',
  'Dining': '🍽️',
  'Stay': '🏨'
};

const destinationImages = {
  'puraran-beach': '/images/puraran_beach.webp',
  'binurong-point': '/images/binurong_point.webp',
  'twin-rock': '/images/twin_rock.webp',
  'mamangsal': '/images/mamangal.webp',
  'bato-church': '/images/st_john_church.webp',
  'puraran beach': '/images/puraran_beach.webp',
  'binurong point': '/images/binurong_point.webp',
  'twin rock beach resort': '/images/twin_rock.webp',
  'mamangal beach': '/images/mamangal.webp',
  'bato church': '/images/st_john_church.webp',
  'st. john the baptist church': '/images/st_john_church.webp'
};

export function renderItinerary(container) {
  const setup = getTripSetup();
  setupOverlayOpen = !setup.completed || !isTripSetupComplete(setup);

  container.innerHTML = `
    <div class="page page-itinerary ${setupOverlayOpen ? 'setup-active' : ''}">
      <div class="itinerary-container">
        <!-- Grid Overlay -->
        <div class="grid-overlay"></div>
        
        <!-- Left Chatbot Panel -->
        <aside class="chatbot-panel">
          <div class="chatbot-header">
            <a class="pathfinder-brand" href="#/" data-navigate="#/" aria-label="Pathfinder Home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 12v2a2 2 0 0 1-2 2H9a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h0"/>
                <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-5a2 2 0 0 0-2 2v2"/>
              </svg>
              <span>PATHFINDER</span>
            </a>
            <button class="check-itinerary-btn" id="check-itinerary-btn" type="button" aria-label="Check Itinerary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6.5c2.4-1.4 4.8-1.4 7.2 0v11c-2.4-1.4-4.8-1.4-7.2 0v-11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M12.8 6.5c2.4-1.4 4.8-1.4 7.2 0v11c-2.4-1.4-4.8-1.4-7.2 0v-11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              </svg>
              Check Itinerary
            </button>
          </div>
          
          <div class="chatbot-body">
            <div class="chatbot-messages" id="chatbot-messages">
              <div class="empty-state" id="chat-empty-state">
                <div class="empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </svg>
                </div>
                <p class="empty-title">Pathfinder AI</p>
                <p class="empty-subtitle">Ask me about destinations, activities, or anything about Catanduanes</p>
              </div>
              
              <div class="suggestion-chips" id="suggestion-chips">
                <button class="suggestion-chip" data-prompt="Best beaches">Best beaches</button>
                <button class="suggestion-chip" data-prompt="Hidden waterfalls">Hidden waterfalls</button>
                <button class="suggestion-chip" data-prompt="Local food">Local food</button>
                <button class="suggestion-chip" data-prompt="Budget tips">Budget tips</button>
              </div>

              <!-- Itinerary Preview as Chat Card -->
              <div class="chat-itinerary-card" id="chat-itinerary-card">
                <div class="itinerary-header">
                  <div class="itinerary-header-left">
                    <h3>Itinerary Preview</h3>
                    <span class="spot-count" id="chat-spot-count">0 spots</span>
                  </div>
                  <div class="itinerary-header-right">
                    <span class="itinerary-spark" aria-hidden="true">+</span>
                    <button class="itinerary-minimize-btn" id="itinerary-minimize-btn" type="button" aria-label="Minimize itinerary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="itinerary-day-summary">
                  <div class="day-indicator" id="day-indicator">
                    <span class="day-indicator-text" id="day-indicator-text">Day 1 of 3</span>
                  </div>
                  <div class="pace-indicator" id="pace-indicator">
                    <span class="pace-text" id="pace-text">Relaxed pace</span>
                    <div class="pace-bar">
                      <div class="pace-fill" id="pace-fill" style="width: 0%;"></div>
                    </div>
                  </div>
                </div>
                <div class="itinerary-spots" id="chat-itinerary-spots">
                  <div class="itinerary-empty">No stops added yet</div>
                </div>
                <div class="itinerary-actions">
                  <button class="btn-secondary chat-back-btn" id="chat-back-btn" aria-label="Previous day">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 18 9 12l6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button class="btn-primary chat-generate-btn" id="chat-generate-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m14 4 6 6M4 20l9.5-9.5M13 5l6 6-2 2-6-6 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M5 5v4M3 7h4M19 17v4M17 19h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    Generate
                  </button>
                  <button class="btn-primary" id="chat-next-btn" style="display: none;">Next</button>
                  <button class="btn-primary" id="chat-save-btn" style="display: none;">Save</button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="chatbot-input-area">
            <form class="chatbot-form" id="chatbot-form">
              <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Ask Pathfinder..." />
              <button type="submit" class="send-btn" id="send-btn" aria-label="Send message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          </div>
        </aside>
        
        <!-- Main Map Area -->
        <main class="map-area">
          <!-- Map Header -->
          <div class="map-header">
            <h1 class="map-title">CATANDUANES</h1>
            <p class="map-subtitle">PATHFINDER_PHILIPPINES</p>
            <p class="map-description">Explore the island of happiness with AI-powered travel guidance</p>
          </div>
          
          <!-- Local GeoJSON Map -->
          <div id="pathfinder-map" class="map-placeholder"></div>
          <div class="setup-map-dim" id="setup-map-dim" aria-hidden="true"></div>
          
          <!-- Map Controls -->
          <div class="map-controls">
            <button class="map-control-btn" id="zoom-in-btn" aria-label="Zoom in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <button class="map-control-btn" id="zoom-out-btn" aria-label="Zoom out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
            </button>
          </div>

          <div class="setup-control-bar" aria-label="Map setup controls">
            <button class="setup-icon-btn" type="button" id="toggle-map-title-btn" aria-label="Preview map">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
              </svg>
            </button>
            <button class="setup-icon-btn map-theme-toggle" type="button" id="itinerary-theme-toggle" aria-label="Switch to night mode">
              <svg class="theme-day-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <svg class="theme-night-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="setup-open-btn" id="open-setup-btn" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Setup</span>
            </button>
            <button class="setup-icon-btn setup-info-control" type="button" id="map-info-btn" aria-label="Show Info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" />
                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
              </svg>
              <span class="info-btn-text">Show Info</span>
            </button>
          </div>
          
          <!-- Trip Setup Panel -->
          <div class="trip-setup-panel">
            <div class="trip-setup-header">
              <h3>TRIP SETUP</h3>
            </div>
            <div class="trip-setup-content">
              <div class="form-group">
                <label class="form-label">Start Point</label>
                <select class="form-select" id="start-point-select">
                  <option value="" disabled selected>Select starting hub</option>
                  <option value="virac">Virac</option>
                  <option value="san-andres">San Andres</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Trip Dates</label>
                <div class="date-inputs">
                  <input type="date" class="form-input" />
                  <span class="date-separator">to</span>
                  <input type="date" class="form-input" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Interests</label>
                <div class="interest-chips">
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🌊 Water</span>
                  </label>
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🥾 Outdoor</span>
                  </label>
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🏔️ Views</span>
                  </label>
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🏛️ Heritage</span>
                  </label>
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🍽️ Dining</span>
                  </label>
                  <label class="interest-chip">
                    <input type="checkbox" />
                    <span>🏨 Stay</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Budget Level</label>
                <div class="budget-slider">
                  <input type="range" min="0" max="100" value="50" class="range-input" />
                  <div class="budget-labels">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
              <button class="btn-primary">Apply Filters</button>
            </div>
          </div>

          <section class="trip-setup-overlay" id="trip-setup-overlay" aria-label="Trip setup">
            <div class="trip-setup-card" role="dialog" aria-modal="true" aria-labelledby="trip-setup-title">
              <div class="trip-setup-main">
                <h2 id="trip-setup-title">START POINT AND TRIP DATE</h2>

                <label class="setup-field setup-select-field" for="setup-start-point">
                  <span class="setup-field-icon" aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s6-5.1 6-10A6 6 0 0 0 6 11c0 4.9 6 10 6 10Z" stroke="currentColor" stroke-width="1.8" />
                      <circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.8" />
                    </svg>
                  </span>
                  <select id="setup-start-point" class="setup-input setup-select" aria-label="Start point">
                    <option value="Virac">Virac</option>
                    <option value="San Andres">San Andres</option>
                  </select>
                </label>

                <label class="setup-field" for="setup-trip-date">
                  <span class="setup-field-icon" aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
                      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </span>
                  <input id="setup-trip-date" class="setup-input setup-date" type="text" inputmode="none" readonly aria-label="Trip date" />
                  <button class="setup-calendar-trigger" id="setup-calendar-trigger" type="button" aria-label="Open calendar">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
                      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </button>
                  <div class="setup-calendar-popover" id="setup-calendar-popover" aria-hidden="true"></div>
                </label>

                <div class="setup-budget-group">
                  <h3>BUDGET SLIDER</h3>
                  <input id="setup-budget-range" class="setup-budget-range" type="range" min="0" max="2" step="1" value="0" aria-label="Budget range" />
                  <div class="setup-budget-options" id="setup-budget-options" aria-label="Budget options">
                    ${budgetOptions.map(option => `
                      <button class="setup-budget-option" type="button" data-budget="${option.value}">
                        ${option.label}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>

              <aside class="setup-activity-panel">
                <h3>CHOOSE ACTIVITIES</h3>
                <div class="setup-activity-list" id="setup-activity-list">
                  ${setupActivities.map(activity => `
                    <button class="setup-activity-btn" type="button" data-activity="${activity}">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        ${setupActivityIcons[activity]}
                      </svg>
                      <span>${activity}</span>
                    </button>
                  `).join('')}
                </div>
              </aside>

              <div class="setup-card-footer">
                <button class="setup-done-btn" id="setup-done-btn" type="button" disabled>Done</button>
              </div>
            </div>
          </section>
          
          <!-- Destination Preview Card -->
          <div class="destination-preview-card" id="destination-preview">
            <div class="destination-image">
              <div class="destination-placeholder">📍</div>
            </div>
            <div class="destination-content">
              <p class="destination-empty">Select a destination from the map</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  // Initialize UI and state
  initializeUI();
  
  // Initialize map after DOM is updated
  setTimeout(() => {
    if (!mapInitialized) {
      // Load the real local GeoJSON once for both base map and destination points.
      fetch('/data/catanduanes_datafile.geojson')
        .then(response => response.json())
        .then(geojson => {
          allSpotsGeoJson = geojson;
          allDestinations = featureCollectionToDestinations(geojson);
          const filteredDestinations = getFilteredMapDestinations();
          initMap('pathfinder-map', filteredDestinations, { geojson });
          mapInitialized = true;
          updateMapFeatures();

          // Setup control button handlers
          setupMapControls();
        })
        .catch(error => {
          console.error('Failed to load destination data:', error);
          // Initialize map without data
          allSpotsGeoJson = null;
          allDestinations = [];
          initMap('pathfinder-map', []);
          mapInitialized = true;
          setupMapControls();
        });
    }
  }, 100);
}

function initializeUI() {
  // Subscribe to state changes
  stateUnsubscribe = subscribe(() => {
    renderDestinationPreview();
    renderItinerarySpots();
    renderTimeWallet();
    updateDayTabs();
    renderTripSetup();
    updateMapFeatures();
  });
  
  // Subscribe to chat changes
  chatUnsubscribe = subscribeChat(() => {
    renderChatMessages();
  });
  
  // Initial render
  renderDestinationPreview();
  syncMapInfoButton();
  renderItinerarySpots();
  renderTimeWallet();
  updateDayTabs();
  renderChatMessages();
  
  // Setup chat handlers
  setupChatHandlers();
  
  // Setup export handlers
  setupExportHandlers();

  // Setup trip setup overlay handlers
  setupTripSetupHandlers();
  renderTripSetup();
  
  // Setup custom event listener for select-destination from map markers
  const selectDestinationHandler = (e) => {
    if (e.detail && e.detail.destination) {
      setSelectedDestination(e.detail.destination);
    }
  };
  document.addEventListener('select-destination', selectDestinationHandler);
  eventListeners.push({ element: document, event: 'select-destination', handler: selectDestinationHandler });
  
  // Setup custom event listener for add-to-trip from map popups
  const addToTripHandler = (e) => {
    if (e.detail && e.detail.destination) {
      handleAddToTrip(e.detail.destination);
    }
  };
  document.addEventListener('add-to-trip', addToTripHandler);
  eventListeners.push({ element: document, event: 'add-to-trip', handler: addToTripHandler });

  const removeFromTripHandler = (e) => {
    if (e.detail && e.detail.destination) {
      handleRemoveFromTrip(e.detail.destination.id);
    }
  };
  document.addEventListener('remove-from-trip', removeFromTripHandler);
  eventListeners.push({ element: document, event: 'remove-from-trip', handler: removeFromTripHandler });

  const clearDestinationHandler = () => {
    clearSelectedDestination();
  };
  document.addEventListener('clear-destination', clearDestinationHandler);
  eventListeners.push({ element: document, event: 'clear-destination', handler: clearDestinationHandler });
}

function setupMapControls() {
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const resetBtn = document.getElementById('reset-btn');
  const locateBtn = document.getElementById('locate-btn');
  const filterBtn = document.getElementById('filter-btn');
  const openSetupBtn = document.getElementById('open-setup-btn');
  const mapInfoBtn = document.getElementById('map-info-btn');
  const itineraryThemeToggle = document.getElementById('itinerary-theme-toggle');

  if (zoomInBtn) {
    const clickHandler = () => zoomIn();
    zoomInBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: zoomInBtn, event: 'click', handler: clickHandler });
  }

  if (zoomOutBtn) {
    const clickHandler = () => zoomOut();
    zoomOutBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: zoomOutBtn, event: 'click', handler: clickHandler });
  }

  if (resetBtn) {
    const clickHandler = () => resetView();
    resetBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: resetBtn, event: 'click', handler: clickHandler });
  }

  if (locateBtn) {
    const clickHandler = () => {
      console.log('Locate me - to be implemented');
    };
    locateBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: locateBtn, event: 'click', handler: clickHandler });
  }

  if (filterBtn) {
    const clickHandler = () => {
      openTripSetup();
    };
    filterBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: filterBtn, event: 'click', handler: clickHandler });
  }

  if (openSetupBtn) {
    const clickHandler = () => {
      // Toggle setup overlay
      const setup = getTripSetup();
      const isValid = isTripSetupComplete(setup);
      const isCurrentlyOpen = setupOverlayOpen || !setup.completed || !isValid;
      
      if (isCurrentlyOpen) {
        setupOverlayOpen = false;
        setupOpenedFromCompleted = false;
      } else {
        setupOpenedFromCompleted = setup.completed && isValid;
        setupOverlayOpen = true;
      }
      renderTripSetup();
    };
    openSetupBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: openSetupBtn, event: 'click', handler: clickHandler });
  }

  if (mapInfoBtn) {
    const clickHandler = () => {
      showMapInfo();
    };
    mapInfoBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: mapInfoBtn, event: 'click', handler: clickHandler });
  }

  if (itineraryThemeToggle) {
    const clickHandler = () => {
      const currentTheme = getAppState('theme') || 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setAppState('theme', nextTheme);
      applyItineraryTheme(nextTheme);
    };
    itineraryThemeToggle.addEventListener('click', clickHandler);
    eventListeners.push({ element: itineraryThemeToggle, event: 'click', handler: clickHandler });
    applyItineraryTheme(getAppState('theme') || 'light');
  }
}

function updateMapFeatures() {
  if (!mapInitialized) return;

  const setup = getTripSetup();
  const selectedDestination = getSelectedDestination();
  const currentStops = getDayStops();
  const hub = getHubByName(setup.startPoint);
  const filteredDestinations = getFilteredMapDestinations();
  const visibleDestinations = includeSelectedDestination(filteredDestinations, selectedDestination);
  const isSelectedAdded = selectedDestination ? isDestinationInDay(selectedDestination.id) : false;

  updateMapState({
    destinations: visibleDestinations,
    hub,
    selectedDestinationId: selectedDestination?.id || null,
    addedDestinationIds: currentStops.map(stop => stop.id),
    routeCoordinates: hub ? buildRouteCoordinates(hub, currentStops) : [],
    previewCoordinates: hub && selectedDestination && !isSelectedAdded
      ? buildPreviewRouteCoordinates(hub, currentStops, selectedDestination)
      : [],
    popupDestination: selectedDestination || null
  });
}

function getFilteredMapDestinations() {
  const setup = getTripSetup();
  return filterDestinationsForSetup(allDestinations, setup);
}

function includeSelectedDestination(destinations, selectedDestination) {
  if (!selectedDestination || destinations.some(destination => destination.id === selectedDestination.id)) {
    return destinations;
  }

  return [...destinations, selectedDestination];
}

function getActivePinPayload() {
  const destination = getSelectedDestination();
  if (!destination) return null;

  return {
    id: destination.id,
    name: destination.name,
    category: destination.category,
    type: destination.type,
    municipality: destination.municipality,
    coordinates: destination.coordinates
  };
}

function applyItineraryTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeToggle = document.getElementById('itinerary-theme-toggle');
  if (!themeToggle) return;

  const isDark = theme === 'dark';
  themeToggle.classList.toggle('theme-night', isDark);
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to day mode' : 'Switch to night mode');
}

function setupTripSetupHandlers() {
  const startSelect = document.getElementById('setup-start-point');
  const dateInput = document.getElementById('setup-trip-date');
  const calendarTrigger = document.getElementById('setup-calendar-trigger');
  const calendarPopover = document.getElementById('setup-calendar-popover');
  const budgetRange = document.getElementById('setup-budget-range');
  const budgetButtons = document.querySelectorAll('.setup-budget-option');
  const activityButtons = document.querySelectorAll('.setup-activity-btn');
  const doneBtn = document.getElementById('setup-done-btn');

  if (startSelect) {
    const changeHandler = () => {
      updateTripSetup({ startPoint: startSelect.value });
    };
    startSelect.addEventListener('change', changeHandler);
    eventListeners.push({ element: startSelect, event: 'change', handler: changeHandler });
  }

  if (dateInput) {
    const clickHandler = () => {
      setupCalendarOpen = true;
      renderTripSetup();
    };
    dateInput.addEventListener('click', clickHandler);
    eventListeners.push({ element: dateInput, event: 'click', handler: clickHandler });
  }

  if (calendarTrigger) {
    const clickHandler = () => {
      setupCalendarOpen = !setupCalendarOpen;
      renderTripSetup();
    };
    calendarTrigger.addEventListener('click', clickHandler);
    eventListeners.push({ element: calendarTrigger, event: 'click', handler: clickHandler });
  }

  if (calendarPopover) {
    const clickHandler = (event) => {
      const dateButton = event.target.closest('[data-calendar-date]');
      if (!dateButton) return;
      setupCalendarOpen = false;
      updateTripSetup({ tripDate: dateButton.dataset.calendarDate });
    };
    calendarPopover.addEventListener('click', clickHandler);
    eventListeners.push({ element: calendarPopover, event: 'click', handler: clickHandler });
  }

  if (budgetRange) {
    const inputHandler = () => {
      const option = budgetOptions[Number(budgetRange.value)] || budgetOptions[0];
      updateBudgetSliderVisual(budgetRange);
      setTripSetupBudget(option.value);
    };
    budgetRange.addEventListener('input', inputHandler);
    eventListeners.push({ element: budgetRange, event: 'input', handler: inputHandler });
  }

  budgetButtons.forEach(button => {
    const clickHandler = () => {
      setTripSetupBudget(button.dataset.budget);
    };
    button.addEventListener('click', clickHandler);
    eventListeners.push({ element: button, event: 'click', handler: clickHandler });
  });

  activityButtons.forEach(button => {
    const clickHandler = () => {
      toggleTripSetupActivity(button.dataset.activity);
    };
    button.addEventListener('click', clickHandler);
    eventListeners.push({ element: button, event: 'click', handler: clickHandler });
  });

  if (doneBtn) {
    const clickHandler = () => {
      const result = completeTripSetup();
      if (result.success) {
        setupOverlayOpen = false;
        setupCalendarOpen = false;
        setupOpenedFromCompleted = false;
        renderTripSetup();
      }
    };
    doneBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: doneBtn, event: 'click', handler: clickHandler });
  }
}

function openTripSetup() {
  const setup = getTripSetup();
  setupOpenedFromCompleted = setup.completed && isTripSetupComplete(setup);
  setupOverlayOpen = true;
  renderTripSetup();
}

function showMapInfo() {
  const previewCard = document.getElementById('destination-preview');

  if (!previewCard) return;

  const isHidden = previewCard.classList.contains('hidden');

  if (isHidden) {
    previewCard.classList.remove('hidden');
  } else {
    previewCard.classList.add('hidden');
  }

  syncMapInfoButton();
}

function syncMapInfoButton() {
  const previewCard = document.getElementById('destination-preview');
  const infoBtn = document.getElementById('map-info-btn');
  const infoBtnText = infoBtn?.querySelector('.info-btn-text');

  if (!previewCard || !infoBtn) return;

  const isHidden = previewCard.classList.contains('hidden');
  infoBtn.setAttribute('aria-label', isHidden ? 'Show Info' : 'Hide Info');
  if (infoBtnText) infoBtnText.textContent = isHidden ? 'Show Info' : 'Hide Info';
}

function renderTripSetup() {
  const page = document.querySelector('.page-itinerary');
  const overlay = document.getElementById('trip-setup-overlay');
  const dim = document.getElementById('setup-map-dim');
  const startSelect = document.getElementById('setup-start-point');
  const dateInput = document.getElementById('setup-trip-date');
  const calendarPopover = document.getElementById('setup-calendar-popover');
  const budgetRange = document.getElementById('setup-budget-range');
  const budgetButtons = document.querySelectorAll('.setup-budget-option');
  const activityButtons = document.querySelectorAll('.setup-activity-btn');
  const doneBtn = document.getElementById('setup-done-btn');

  if (!page || !overlay) return;

  const setup = getTripSetup();
  const isValid = isTripSetupComplete(setup);
  const isOpen = setupOverlayOpen || !setup.completed || !isValid;
  const isInitialSetup = isOpen && !setupOpenedFromCompleted && (!setup.completed || !isValid);
  setupOverlayOpen = isOpen;

  page.classList.toggle('setup-active', isOpen);
  page.classList.toggle('setup-initial', isInitialSetup);
  page.classList.toggle('setup-reopen', isOpen && !isInitialSetup);
  overlay.classList.toggle('setup-visible', isOpen);
  overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (dim) dim.classList.toggle('setup-map-dim-visible', isOpen);

  if (startSelect && startSelect.value !== setup.startPoint) {
    startSelect.value = setup.startPoint;
  }

  if (dateInput) {
    const displayDate = formatSetupDateDisplay(setup.tripDate);
    if (dateInput.value !== displayDate) {
      dateInput.value = displayDate;
    }
  }

  if (calendarPopover) {
    calendarPopover.classList.toggle('setup-calendar-open', setupCalendarOpen);
    calendarPopover.setAttribute('aria-hidden', setupCalendarOpen ? 'false' : 'true');
    calendarPopover.innerHTML = renderSetupCalendar(setup.tripDate);
  }

  const budgetIndex = Math.max(0, budgetOptions.findIndex(option => option.value === setup.budget));
  if (budgetRange && Number(budgetRange.value) !== budgetIndex) {
    budgetRange.value = String(budgetIndex);
  }
  if (budgetRange) {
    updateBudgetSliderVisual(budgetRange);
  }

  budgetButtons.forEach(button => {
    button.classList.toggle('setup-budget-selected', button.dataset.budget === setup.budget);
  });

  activityButtons.forEach(button => {
    const selected = setup.activities.includes(button.dataset.activity);
    button.classList.toggle('setup-activity-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });

  if (doneBtn) {
    doneBtn.disabled = !isValid;
    doneBtn.classList.toggle('setup-done-ready', isValid);
  }

  if (mapInitialized) {
    window.requestAnimationFrame(() => invalidateSize());
  }
}

function formatSetupDateDisplay(dateValue) {
  if (!dateValue) return '';

  const start = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const month = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  return `${month} ${startDay} - ${endMonth} ${endDay}`;
}

function renderSetupCalendar(dateValue) {
  const selected = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const monthLabel = selected.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const selectedDay = selected.getDate();
  const rangeEnd = new Date(selected);
  rangeEnd.setDate(selectedDay + 1);
  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startOffset + 1;
    let cellDate;
    let cellLabel;
    let muted = false;

    if (dayNumber < 1) {
      cellLabel = daysInPrevMonth + dayNumber;
      cellDate = new Date(year, month - 1, cellLabel);
      muted = true;
    } else if (dayNumber > daysInMonth) {
      cellLabel = dayNumber - daysInMonth;
      cellDate = new Date(year, month + 1, cellLabel);
      muted = true;
    } else {
      cellLabel = dayNumber;
      cellDate = new Date(year, month, cellLabel);
    }

    const isoDate = toIsoDate(cellDate);
    const inRange = isoDate === dateValue || isoDate === toIsoDate(rangeEnd);
    cells.push(`
      <button class="setup-calendar-day ${muted ? 'muted' : ''} ${inRange ? 'selected' : ''}" type="button" data-calendar-date="${isoDate}">
        ${cellLabel}
      </button>
    `);
  }

  return `
    <div class="setup-calendar-header">
      <span>${monthLabel}</span>
      <span class="setup-calendar-next" aria-hidden="true">›</span>
    </div>
    <div class="setup-calendar-weekdays">
      ${weekdayLabels.map(day => `<span>${day}</span>`).join('')}
    </div>
    <div class="setup-calendar-grid">
      ${cells.join('')}
    </div>
  `;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setupChatHandlers() {
  const chatForm = document.getElementById('chatbot-form');
  const chatInput = document.getElementById('chatbot-input');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  
  // Form submit handler
  if (chatForm) {
    const submitHandler = (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (message && !isSending) {
        sendMessage(message);
        chatInput.value = '';
      }
    };
    chatForm.addEventListener('submit', submitHandler);
    eventListeners.push({ element: chatForm, event: 'submit', handler: submitHandler });
  }
  
  // Enter key handler
  if (chatInput) {
    const keydownHandler = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message && !isSending) {
          sendMessage(message);
          chatInput.value = '';
        }
      }
    };
    chatInput.addEventListener('keydown', keydownHandler);
    eventListeners.push({ element: chatInput, event: 'keydown', handler: keydownHandler });
  }
  
  // Suggestion chip handlers
  suggestionChips.forEach(chip => {
    const clickHandler = () => {
      const prompt = chip.dataset.prompt;
      if (prompt && !isSending) {
        sendMessage(prompt);
      }
    };
    chip.addEventListener('click', clickHandler);
    eventListeners.push({ element: chip, event: 'click', handler: clickHandler });
  });
}

async function sendMessage(message) {
  isSending = true;
  
  // Add user message
  addMessage({
    role: 'user',
    content: message
  });
  
  // Add loading indicator
  const loadingId = `loading-${Date.now()}`;
  addMessage({
    id: loadingId,
    role: 'assistant',
    content: '...',
    isLoading: true
  });
  
  try {
    const response = await askPathfinder({
      question: message,
      active_pin: getActivePinPayload()
    });
    
    // Remove loading message
    removeMessage(loadingId);
    
    // Add actual response
    let responseText = '';
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && response.answer) {
      responseText = response.answer;
    } else if (response && response.message) {
      responseText = response.message;
    } else {
      responseText = JSON.stringify(response);
    }
    
    addMessage({
      role: 'assistant',
      content: responseText
    });

    handleChatLocations(response);
    
  } catch (error) {
    // Remove loading message
    removeMessage(loadingId);
    
    // Add error message
    addMessage({
      role: 'system',
      content: 'Sorry, I encountered an error. Please try again.'
    });
    
    console.error('Chat error:', error);
  } finally {
    isSending = false;
  }
}

function handleChatLocations(response) {
  const locations = Array.isArray(response?.locations) ? response.locations : [];
  if (locations.length === 0 || allDestinations.length === 0) return;

  const matches = findDestinationsByLocations(allDestinations, locations);
  if (matches.length === 0) return;

  setSelectedDestination(matches[0]);

  if (matches.length > 1) {
    addMessage({
      role: 'system',
      content: `I found ${matches.length} matching places and selected ${matches[0].name}.`
    });
  }
}

function renderChatMessages() {
  const messagesContainer = document.getElementById('chatbot-messages');
  const emptyState = document.getElementById('chat-empty-state');
  const suggestionChips = document.getElementById('suggestion-chips');
  
  if (!messagesContainer) return;
  
  const messages = getMessages();
  
  // Show/hide empty state
  if (emptyState && suggestionChips) {
    if (messages.length === 0) {
      emptyState.style.display = 'block';
      suggestionChips.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
      suggestionChips.style.display = 'none';
    }
  }
  
  // Render messages
  const existingMessages = messagesContainer.querySelectorAll('.chat-message');
  existingMessages.forEach(msg => msg.remove());
  
  messages.forEach(message => {
    if (message.isLoading) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'chat-message chat-message-assistant chat-message-loading';
      loadingEl.innerHTML = '<span class="typing-indicator">...</span>';
      messagesContainer.appendChild(loadingEl);
    } else {
      const messageEl = document.createElement('div');
      messageEl.className = `chat-message chat-message-${message.role === 'user' ? 'user' : 'assistant'}`;
      messageEl.textContent = message.content;
      messagesContainer.appendChild(messageEl);
    }
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setupExportHandlers() {
  const generatePdfBtn = document.getElementById('generate-pdf-btn');
  const saveBtn = document.getElementById('save-btn');
  const chatGenerateBtn = document.getElementById('chat-generate-btn');
  const chatSaveBtn = document.getElementById('chat-save-btn');
  const chatBackBtn = document.getElementById('chat-back-btn');
  const chatNextBtn = document.getElementById('chat-next-btn');
  const checkItineraryBtn = document.getElementById('check-itinerary-btn');
  const minimizeBtn = document.getElementById('itinerary-minimize-btn');
  
  const handleExport = () => {
    // Prepare export payload
    const exportPayload = {
      days: getAllDays(),
      allStops: getAllStops(),
      totalStops: getAllStops().length,
      activeDay: getActiveDay(),
      timeWallet: getTimeWalletInfo(),
      exportedAt: new Date().toISOString()
    };
    
    // Store in localStorage
    localStorage.setItem('pathfinder-lite-export-payload', JSON.stringify(exportPayload));
    
    // Navigate to last page
    window.location.hash = '#/last';
  };

  const handleGenerate = () => {
    const setup = getTripSetup();
    const hub = getHubByName(setup.startPoint);

    if (!hub || allDestinations.length === 0) {
      addMessage({
        role: 'system',
        content: 'Complete setup first so Pathfinder can generate from the local destination map.'
      });
      return;
    }

    const result = generateItinerary({
      hub,
      dayCount: 3,
      budgetFilter: setup.budget,
      selectedActivities: setup.activities,
      allSpots: allDestinations
    });

    if (!Object.keys(result.days).length) {
      addMessage({
        role: 'system',
        content: 'No local destinations matched the current activity and budget filters.'
      });
      return;
    }

    replaceItineraryDays(result.days);
    addMessage({
      role: 'system',
      content: 'Generated a lightweight local itinerary from your selected activities and budget.'
    });
  };
  
  if (generatePdfBtn) {
    const clickHandler = () => handleExport();
    generatePdfBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: generatePdfBtn, event: 'click', handler: clickHandler });
  }

  if (saveBtn) {
    const clickHandler = () => handleExport();
    saveBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: saveBtn, event: 'click', handler: clickHandler });
  }

  if (chatGenerateBtn) {
    const clickHandler = () => handleGenerate();
    chatGenerateBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: chatGenerateBtn, event: 'click', handler: clickHandler });
  }

  if (chatSaveBtn) {
    const clickHandler = () => handleExport();
    chatSaveBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: chatSaveBtn, event: 'click', handler: clickHandler });
  }

  if (checkItineraryBtn) {
    const clickHandler = () => {
      const itineraryCard = document.getElementById('chat-itinerary-card');
      const messagesContainer = document.getElementById('chatbot-messages');
      if (itineraryCard && messagesContainer) {
        // Check if card is minimized
        if (itineraryCard.classList.contains('minimized')) {
          itineraryCard.classList.remove('minimized');
        }
        // Check if there are new messages after the itinerary card
        const messages = getMessages();
        const itineraryCardIndex = Array.from(messagesContainer.children).indexOf(itineraryCard);
        const hasNewMessages = messages.length > 0 && itineraryCardIndex < messagesContainer.children.length - 1;
        
        if (hasNewMessages) {
          // Move card to bottom
          messagesContainer.appendChild(itineraryCard);
        }
        // Scroll the itinerary card into view
        itineraryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    checkItineraryBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: checkItineraryBtn, event: 'click', handler: clickHandler });
  }

  if (minimizeBtn) {
    const clickHandler = () => {
      const itineraryCard = document.getElementById('chat-itinerary-card');
      if (itineraryCard) {
        const isMinimized = itineraryCard.classList.toggle('minimized');
        minimizeBtn.setAttribute('aria-label', isMinimized ? 'Expand itinerary' : 'Minimize itinerary');
      }
    };
    minimizeBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: minimizeBtn, event: 'click', handler: clickHandler });
  }

  if (chatBackBtn) {
    const clickHandler = () => {
      const activeDay = getActiveDay();
      if (activeDay > 1) {
        setActiveDay(activeDay - 1);
      }
    };
    chatBackBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: chatBackBtn, event: 'click', handler: clickHandler });
  }

  if (chatNextBtn) {
    const clickHandler = () => {
      const activeDay = getActiveDay();
      if (activeDay < 3) {
        setActiveDay(activeDay + 1);
      }
    };
    chatNextBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: chatNextBtn, event: 'click', handler: clickHandler });
  }
}

function renderDestinationPreview() {
  const previewContainer = document.getElementById('destination-preview');
  if (!previewContainer) return;
  
  const destination = getSelectedDestination();
  
  if (!destination) {
    previewContainer.innerHTML = `
      <div class="destination-image destination-image-empty">
        <div class="destination-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      </div>
      <div class="destination-content">
        <h3 class="destination-empty-title">Select a destination</h3>
        <p class="destination-empty-subtitle">Click on a map marker to view location details</p>
        <button class="btn-add-trip btn-disabled" disabled>Add Spot</button>
      </div>
    `;
    return;
  }
  
  const isAdded = isDestinationInDay(destination.id);
  const imageSrc = getDestinationImageSrc(destination);
  const hub = getHubByName(getTripSetup().startPoint);
  const distanceText = getDestinationDistanceText(destination, hub);
  const description = destination.description || 'Explore this destination and add it to your Catanduanes itinerary.';
  const categoryLabel = destination.displayCategory || destination.categoryGroup || destination.category || 'Spot';
  const bestTime = formatValue(destination.best_time_of_day, 'Any time');
  const exposure = formatValue(destination.outdoor_exposure, 'Mixed');
  const costLevel = destination.budgetLabel || formatValue(destination.min_budget, 'Low');
  
  previewContainer.innerHTML = `
    <div class="destination-image">
      ${imageSrc ? `<img src="${imageSrc}" alt="${destination.name}" />` : `<div class="destination-placeholder">${categoryEmojis[categoryLabel] || '+'}</div>`}
      <span class="destination-distance">${distanceText}</span>
    </div>
    <div class="destination-content">
      <h3 class="destination-name">${destination.name}</h3>
      <p class="destination-description">${description}</p>
      <div class="destination-meta-grid">
        <span><strong>Type</strong>${categoryLabel}</span>
        <span><strong>Cost</strong>${costLevel}</span>
        <span><strong>Best</strong>${bestTime}</span>
        <span><strong>Exposure</strong>${exposure}</span>
      </div>
      <button class="btn-add-trip ${isAdded ? 'btn-remove-trip' : ''}" id="trip-toggle-btn">
        ${isAdded ? 'Remove Spot' : 'Add Spot'}
      </button>
    </div>
  `;
  
  const toggleBtn = document.getElementById('trip-toggle-btn');
  if (toggleBtn) {
    const clickHandler = () => {
      if (isAdded) {
        handleRemoveFromTrip(destination.id);
      } else {
        handleAddToTrip(destination);
      }
    };
    toggleBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: toggleBtn, event: 'click', handler: clickHandler });
  }
}

function handleAddToTrip(destination) {
  const result = addStopToDay(destination);
  if (result.success) {
    renderDestinationPreview();
  } else {
    console.log(result.message);
  }
}

function handleRemoveFromTrip(destinationId) {
  const result = removeDestinationFromDay(destinationId);
  if (!result.success) {
    console.log(result.message);
  }
}

function getDestinationImageSrc(destination) {
  const directKey = destinationImages[destination.id];
  if (directKey) return directKey;

  const nameKey = String(destination.name || '').toLowerCase();
  return destinationImages[nameKey] || '';
}

function getDestinationDistanceText(destination, hub) {
  if (!destination?.coordinates || !hub?.coordinates) return 'Distance pending';
  const distanceKm = calculateDistance(hub.coordinates, destination.coordinates);
  return `${distanceKm} km from hub`;
}

function formatValue(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function renderItinerarySpots() {
  const spotsContainer = document.getElementById('chat-itinerary-spots');
  const spotCountEl = document.getElementById('chat-spot-count');
  
  if (!spotsContainer || !spotCountEl) return;
  
  const stops = getDayStops();
  const hub = getHubByName(getTripSetup().startPoint);
  const driveTimes = hub ? calculateDriveTimes(hub, stops, { includeReturnLeg: false }) : [];
  
  spotCountEl.textContent = `${stops.length} spot${stops.length !== 1 ? 's' : ''}`;
  
  if (stops.length === 0) {
    spotsContainer.innerHTML = '<div class="itinerary-empty">No stops added yet</div>';
    return;
  }
  
  spotsContainer.innerHTML = stops.map((stop, index) => `
    <div class="itinerary-spot" data-stop-id="${stop.stopId}" draggable="true">
      ${index > 0 ? `
        <div class="spot-drive-row">
          <span class="spot-timeline-dot"></span>
          <span class="spot-drive-icon">↝</span>
          <span>${driveTimes[index]?.driveTime || 0} min drive</span>
        </div>
      ` : ''}
      <div class="spot-info">
        <span class="spot-handle" aria-hidden="true">⋮⋮</span>
        <span class="spot-name">${stop.name}</span>
        <button class="spot-action-btn spot-remove" data-action="remove" aria-label="Remove">×</button>
      </div>
      <div class="spot-actions">
        <button class="spot-action-btn" data-action="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="spot-action-btn" data-action="down" ${index === stops.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
      </div>
    </div>
  `).join('');
  
  // Setup stop action handlers
  spotsContainer.querySelectorAll('.spot-action-btn').forEach(btn => {
    const stopId = btn.closest('.itinerary-spot').dataset.stopId;
    const action = btn.dataset.action;
    
    const clickHandler = () => {
      if (action === 'up') {
        moveStopUp(stopId);
      } else if (action === 'down') {
        moveStopDown(stopId);
      } else if (action === 'remove') {
        removeStopFromDay(stopId);
      }
    };
    
    btn.addEventListener('click', clickHandler);
    eventListeners.push({ element: btn, event: 'click', handler: clickHandler });
  });

  setupStopDragHandlers(spotsContainer);
}

function setupStopDragHandlers(spotsContainer) {
  spotsContainer.querySelectorAll('.itinerary-spot').forEach(spot => {
    const dragStartHandler = (event) => {
      draggedStopId = spot.dataset.stopId;
      spot.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedStopId);
    };

    const dragEndHandler = () => {
      draggedStopId = null;
      spotsContainer.querySelectorAll('.itinerary-spot').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
      });
      spotsContainer.classList.remove('drag-active');
    };

    const dragOverHandler = (event) => {
      if (!draggedStopId || draggedStopId === spot.dataset.stopId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      spotsContainer.classList.add('drag-active');
      spotsContainer.querySelectorAll('.itinerary-spot').forEach(item => item.classList.remove('drag-over'));
      spot.classList.add('drag-over');
    };

    const dropHandler = (event) => {
      event.preventDefault();
      const sourceStopId = event.dataTransfer.getData('text/plain') || draggedStopId;
      const targetStopId = spot.dataset.stopId;
      draggedStopId = null;
      if (sourceStopId && targetStopId && sourceStopId !== targetStopId) {
        reorderStop(sourceStopId, targetStopId);
      }
    };

    const pointerDownHandler = (event) => {
      if (event.target.closest('button')) return;
      pointerDrag = {
        stopId: spot.dataset.stopId,
        startY: event.clientY,
        active: false
      };
      spot.setPointerCapture?.(event.pointerId);
    };

    const pointerMoveHandler = (event) => {
      if (!pointerDrag || pointerDrag.stopId !== spot.dataset.stopId) return;
      const deltaY = event.clientY - pointerDrag.startY;

      if (!pointerDrag.active && Math.abs(deltaY) > 8) {
        pointerDrag.active = true;
        spot.classList.add('dragging');
        spotsContainer.classList.add('drag-active');
      }

      if (pointerDrag.active) {
        event.preventDefault();
        spot.style.transform = `translateY(${deltaY}px) scale(0.985)`;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.itinerary-spot');
        spotsContainer.querySelectorAll('.itinerary-spot').forEach(item => item.classList.remove('drag-over'));
        if (target && target !== spot && spotsContainer.contains(target)) {
          target.classList.add('drag-over');
        }
      }
    };

    const pointerUpHandler = (event) => {
      if (!pointerDrag || pointerDrag.stopId !== spot.dataset.stopId) return;
      const sourceStopId = pointerDrag.stopId;
      const wasDragging = pointerDrag.active;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.itinerary-spot');

      pointerDrag = null;
      spot.releasePointerCapture?.(event.pointerId);
      spot.style.transform = '';
      spotsContainer.classList.remove('drag-active');
      spotsContainer.querySelectorAll('.itinerary-spot').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
      });

      if (wasDragging && target && target !== spot && spotsContainer.contains(target)) {
        reorderStop(sourceStopId, target.dataset.stopId);
      }
    };

    spot.addEventListener('dragstart', dragStartHandler);
    spot.addEventListener('dragend', dragEndHandler);
    spot.addEventListener('dragover', dragOverHandler);
    spot.addEventListener('drop', dropHandler);
    spot.addEventListener('pointerdown', pointerDownHandler);
    spot.addEventListener('pointermove', pointerMoveHandler);
    spot.addEventListener('pointerup', pointerUpHandler);
    spot.addEventListener('pointercancel', pointerUpHandler);
    eventListeners.push({ element: spot, event: 'dragstart', handler: dragStartHandler });
    eventListeners.push({ element: spot, event: 'dragend', handler: dragEndHandler });
    eventListeners.push({ element: spot, event: 'dragover', handler: dragOverHandler });
    eventListeners.push({ element: spot, event: 'drop', handler: dropHandler });
    eventListeners.push({ element: spot, event: 'pointerdown', handler: pointerDownHandler });
    eventListeners.push({ element: spot, event: 'pointermove', handler: pointerMoveHandler });
    eventListeners.push({ element: spot, event: 'pointerup', handler: pointerUpHandler });
    eventListeners.push({ element: spot, event: 'pointercancel', handler: pointerUpHandler });
  });

  const containerDragOverHandler = (event) => {
    if (!draggedStopId) return;
    event.preventDefault();
  };

  const containerDropHandler = (event) => {
    if (!draggedStopId || event.target.closest('.itinerary-spot')) return;
    event.preventDefault();
    const sourceStopId = event.dataTransfer.getData('text/plain') || draggedStopId;
    draggedStopId = null;
    reorderStopToEnd(sourceStopId);
  };

  spotsContainer.addEventListener('dragover', containerDragOverHandler);
  spotsContainer.addEventListener('drop', containerDropHandler);
  eventListeners.push({ element: spotsContainer, event: 'dragover', handler: containerDragOverHandler });
  eventListeners.push({ element: spotsContainer, event: 'drop', handler: containerDropHandler });
}

function updateBudgetSliderVisual(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 2);
  const value = Number(slider.value || 0);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  slider.style.setProperty('--budget-fill', `${percent}%`);
}

function renderTimeWallet() {
  const paceText = document.getElementById('pace-text');
  const paceFill = document.getElementById('pace-fill');
  
  const walletInfo = getTimeWalletInfo();

  if (paceText && paceFill) {
    paceText.textContent = `${walletInfo.pace} pace`;
    paceFill.style.width = `${walletInfo.percentage}%`;
  }
}

function updateDayTabs() {
  const activeDay = getActiveDay();
  const dayIndicatorText = document.getElementById('day-indicator-text');
  const chatSaveBtn = document.getElementById('chat-save-btn');
  const chatGenerateBtn = document.getElementById('chat-generate-btn');
  const chatBackBtn = document.getElementById('chat-back-btn');
  const chatNextBtn = document.getElementById('chat-next-btn');
  
  if (dayIndicatorText) {
    dayIndicatorText.textContent = `Day ${activeDay} of 3`;
  }
  
  // Handle action button visibility based on day
  if (chatBackBtn && chatGenerateBtn && chatNextBtn && chatSaveBtn) {
    // Back button: disabled on Day 1, enabled on Day 2+
    chatBackBtn.disabled = activeDay <= 1;
    
    // Next button: visible on Day 1-2, hidden on Day 3
    if (activeDay < 3) {
      chatNextBtn.style.display = 'block';
      chatSaveBtn.style.display = 'none';
    } else {
      chatNextBtn.style.display = 'none';
      chatSaveBtn.style.display = 'block';
    }
    
    // Generate button: visible on all days
    chatGenerateBtn.style.display = 'block';
  }
}

// Cleanup function to be called when leaving the page
export function cleanupItinerary() {
  // Unsubscribe from state changes
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }
  
  // Unsubscribe from chat changes
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  
  // Remove all event listeners
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];
  
  // Destroy map
  if (mapInitialized) {
    destroyMap();
    mapInitialized = false;
  }
  
  // Clear selected destination
  clearSelectedDestination();
  
  // Reset sending state
  isSending = false;
}
