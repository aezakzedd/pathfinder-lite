// Itinerary page module
import { initMap, zoomIn, zoomOut, resetView, destroyMap } from '../map/leafletMap.js';
import {
  getSelectedDestination,
  setSelectedDestination,
  clearSelectedDestination,
  getActiveDay,
  setActiveDay,
  getDayStops,
  addStopToDay,
  removeStopFromDay,
  moveStopUp,
  moveStopDown,
  getTimeWalletInfo,
  isDestinationInDay,
  getStopCount,
  subscribe
} from '../state/itineraryStore.js';

let mapInitialized = false;
let stateUnsubscribe = null;
let eventListeners = [];

// Category emoji mapping
const categoryEmojis = {
  'Water': '🌊',
  'Views': '🏔️',
  'Outdoor': '🥾',
  'Heritage': '🏛️',
  'Dining': '🍽️',
  'Stay': '🏨'
};

export function renderItinerary(container) {
  container.innerHTML = `
    <div class="page page-itinerary">
      <div class="itinerary-container">
        <!-- Grid Overlay -->
        <div class="grid-overlay"></div>
        
        <!-- Left Chatbot Panel -->
        <aside class="chatbot-panel">
          <div class="chatbot-header">
            <div class="window-controls">
              <button class="window-btn" aria-label="Minimize"></button>
              <button class="window-btn" aria-label="Maximize"></button>
              <button class="window-btn" aria-label="Close"></button>
            </div>
            <div class="chatbot-title-group">
              <button class="home-btn" data-navigate="#/" aria-label="Go to home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
              <h2 class="chatbot-title">ASK PATHFINDER</h2>
            </div>
          </div>
          
          <div class="chatbot-body">
            <div class="chatbot-messages">
              <div class="empty-state">
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
              
              <div class="suggestion-chips">
                <button class="suggestion-chip">Best beaches</button>
                <button class="suggestion-chip">Hidden waterfalls</button>
                <button class="suggestion-chip">Local food</button>
                <button class="suggestion-chip">Budget tips</button>
              </div>
            </div>
          </div>
          
          <div class="chatbot-input-area">
            <form class="chatbot-form">
              <input type="text" class="chatbot-input" placeholder="Ask Pathfinder..." />
              <button type="submit" class="send-btn" aria-label="Send message">
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
          
          <!-- Real Leaflet Map -->
          <div id="pathfinder-map" class="map-placeholder"></div>
          
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
            <button class="map-control-btn" id="locate-btn" aria-label="Locate me">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button class="map-control-btn" id="filter-btn" aria-label="Filter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            <button class="map-control-btn" id="reset-btn" aria-label="Reset view">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
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
                <select class="form-select">
                  <option value="">Select starting hub</option>
                  <option value="virac">Virac</option>
                  <option value="san-andres">San Andres</option>
                  <option value="caramoran">Caramoran</option>
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
          
          <!-- Destination Preview Card -->
          <div class="destination-preview-card" id="destination-preview">
            <div class="destination-image">
              <div class="destination-placeholder">📍</div>
            </div>
            <div class="destination-content">
              <p class="destination-empty">Select a destination from the map</p>
            </div>
          </div>
          
          <!-- Itinerary Preview Card -->
          <div class="itinerary-preview-card">
            <div class="itinerary-header">
              <h3>Itinerary Preview</h3>
              <span class="spot-count" id="spot-count">0 spots</span>
            </div>
            <div class="day-tabs" id="day-tabs">
              <button class="day-tab day-tab-active" data-day="1">Day 1</button>
              <button class="day-tab" data-day="2">Day 2</button>
              <button class="day-tab" data-day="3">Day 3</button>
            </div>
            <div class="itinerary-spots" id="itinerary-spots">
              <div class="itinerary-empty">No stops added yet</div>
            </div>
            <div class="time-wallet">
              <div class="wallet-header">
                <span class="wallet-label" id="wallet-label">Schedule: Relaxed pace</span>
                <span class="wallet-percent" id="wallet-percent">0%</span>
              </div>
              <div class="wallet-bar">
                <div class="wallet-fill" id="wallet-fill" style="width: 0%;"></div>
              </div>
            </div>
            <div class="itinerary-actions">
              <button class="btn-secondary">Back</button>
              <button class="btn-primary">Generate PDF</button>
              <button class="btn-primary">Save</button>
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
      // Load destination data
      fetch('/data/destinations.sample.json')
        .then(response => response.json())
        .then(data => {
          initMap('pathfinder-map', data.destinations);
          mapInitialized = true;
          
          // Setup control button handlers
          setupMapControls();
          
          // Setup map marker click handlers
          setupMapMarkerHandlers();
        })
        .catch(error => {
          console.error('Failed to load destination data:', error);
          // Initialize map without data
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
  });
  
  // Initial render
  renderDestinationPreview();
  renderItinerarySpots();
  renderTimeWallet();
  updateDayTabs();
  
  // Setup day tab handlers
  setupDayTabs();
  
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
}

function setupMapControls() {
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const resetBtn = document.getElementById('reset-btn');
  const locateBtn = document.getElementById('locate-btn');
  const filterBtn = document.getElementById('filter-btn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => zoomIn());
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => zoomOut());
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => resetView());
  }

  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      console.log('Locate me - to be implemented');
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      console.log('Filter - to be implemented');
    });
  }
}

function setupMapMarkerHandlers() {
  // Listen for marker clicks to select destination
  const mapContainer = document.getElementById('pathfinder-map');
  if (mapContainer) {
    // This will be handled by the marker click events in markers.js
    // which dispatch custom events
  }
}

function setupDayTabs() {
  const dayTabs = document.querySelectorAll('.day-tab');
  dayTabs.forEach(tab => {
    const clickHandler = () => {
      const day = parseInt(tab.dataset.day);
      setActiveDay(day);
    };
    tab.addEventListener('click', clickHandler);
    eventListeners.push({ element: tab, event: 'click', handler: clickHandler });
  });
}

function renderDestinationPreview() {
  const previewContainer = document.getElementById('destination-preview');
  if (!previewContainer) return;
  
  const destination = getSelectedDestination();
  
  if (!destination) {
    previewContainer.innerHTML = `
      <div class="destination-image">
        <div class="destination-placeholder">📍</div>
      </div>
      <div class="destination-content">
        <p class="destination-empty">Select a destination from the map</p>
      </div>
    `;
    return;
  }
  
  const emoji = categoryEmojis[destination.category] || '📍';
  const isAdded = isDestinationInDay(destination.id);
  
  previewContainer.innerHTML = `
    <div class="destination-image">
      <div class="destination-placeholder">${emoji}</div>
    </div>
    <div class="destination-content">
      <div class="destination-badge">${destination.category} · ${destination.budget}</div>
      <h3 class="destination-name">${destination.name}</h3>
      <p class="destination-location">${destination.municipality}, Catanduanes</p>
      <div class="destination-meta">
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          ${destination.estimatedTime}
        </span>
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          ${destination.category}
        </span>
      </div>
      <button class="btn-add-trip ${isAdded ? 'btn-disabled' : ''}" id="add-trip-btn" ${isAdded ? 'disabled' : ''}>
        ${isAdded ? 'Already Added' : 'Add to Trip'}
      </button>
    </div>
  `;
  
  // Setup add to trip button
  const addBtn = document.getElementById('add-trip-btn');
  if (addBtn && !isAdded) {
    const clickHandler = () => handleAddToTrip(destination);
    addBtn.addEventListener('click', clickHandler);
    eventListeners.push({ element: addBtn, event: 'click', handler: clickHandler });
  }
}

function handleAddToTrip(destination) {
  const result = addStopToDay(destination);
  if (result.success) {
    // Show success feedback
    renderDestinationPreview();
  } else {
    console.log(result.message);
  }
}

function renderItinerarySpots() {
  const spotsContainer = document.getElementById('itinerary-spots');
  const spotCountEl = document.getElementById('spot-count');
  
  if (!spotsContainer || !spotCountEl) return;
  
  const stops = getDayStops();
  
  spotCountEl.textContent = `${stops.length} spot${stops.length !== 1 ? 's' : ''}`;
  
  if (stops.length === 0) {
    spotsContainer.innerHTML = '<div class="itinerary-empty">No stops added yet</div>';
    return;
  }
  
  spotsContainer.innerHTML = stops.map((stop, index) => `
    <div class="itinerary-spot" data-stop-id="${stop.stopId}">
      <div class="spot-info">
        <span class="spot-name">${stop.name}</span>
        <span class="spot-time">${stop.time}</span>
      </div>
      <div class="spot-actions">
        <button class="spot-action-btn" data-action="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="spot-action-btn" data-action="down" ${index === stops.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="spot-action-btn spot-remove" data-action="remove" aria-label="Remove">×</button>
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
}

function renderTimeWallet() {
  const walletLabel = document.getElementById('wallet-label');
  const walletPercent = document.getElementById('wallet-percent');
  const walletFill = document.getElementById('wallet-fill');
  
  if (!walletLabel || !walletPercent || !walletFill) return;
  
  const walletInfo = getTimeWalletInfo();
  
  walletLabel.textContent = `Schedule: ${walletInfo.pace} pace`;
  walletPercent.textContent = `${Math.round(walletInfo.percentage)}%`;
  walletFill.style.width = `${walletInfo.percentage}%`;
}

function updateDayTabs() {
  const activeDay = getActiveDay();
  const dayTabs = document.querySelectorAll('.day-tab');
  
  if (dayTabs.length === 0) return;
  
  dayTabs.forEach(tab => {
    const tabDay = parseInt(tab.dataset.day);
    if (tabDay === activeDay) {
      tab.classList.add('day-tab-active');
    } else {
      tab.classList.remove('day-tab-active');
    }
  });
}

// Cleanup function to be called when leaving the page
export function cleanupItinerary() {
  // Unsubscribe from state changes
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
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
}
