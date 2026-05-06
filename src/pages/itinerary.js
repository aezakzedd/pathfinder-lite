// Itinerary page module
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
          
          <!-- Map Placeholder -->
          <div class="map-placeholder">
            <div class="map-canvas">
              <div class="map-marker marker-1" style="top: 30%; left: 40%;">
                <div class="marker-pin"></div>
                <span class="marker-label">Puraran</span>
              </div>
              <div class="map-marker marker-2" style="top: 45%; left: 55%;">
                <div class="marker-pin"></div>
                <span class="marker-label">Binurong</span>
              </div>
              <div class="map-marker marker-3" style="top: 60%; left: 35%;">
                <div class="marker-pin"></div>
                <span class="marker-label">Twin Rock</span>
              </div>
              <div class="map-marker marker-4" style="top: 25%; left: 65%;">
                <div class="marker-pin"></div>
                <span class="marker-label">Caramoran</span>
              </div>
            </div>
          </div>
          
          <!-- Map Controls -->
          <div class="map-controls">
            <button class="map-control-btn" aria-label="Zoom in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <button class="map-control-btn" aria-label="Zoom out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
            </button>
            <button class="map-control-btn" aria-label="Locate me">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button class="map-control-btn" aria-label="Filter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            <button class="map-control-btn" aria-label="Reset view">
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
          <div class="destination-preview-card">
            <div class="destination-image">
              <div class="destination-placeholder">🏄</div>
            </div>
            <div class="destination-content">
              <div class="destination-badge">Surf · P50-300</div>
              <h3 class="destination-name">Puraran Beach</h3>
              <p class="destination-location">Baras, Catanduanes</p>
              <div class="destination-meta">
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  2-3 hours
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Outdoor
                </span>
              </div>
              <button class="btn-add-trip">Add to Trip</button>
            </div>
          </div>
          
          <!-- Itinerary Preview Card -->
          <div class="itinerary-preview-card">
            <div class="itinerary-header">
              <h3>Itinerary Preview</h3>
              <span class="spot-count">3 spots</span>
            </div>
            <div class="day-tabs">
              <button class="day-tab day-tab-active">Day 1</button>
              <button class="day-tab">Day 2</button>
              <button class="day-tab">Day 3</button>
            </div>
            <div class="itinerary-spots">
              <div class="itinerary-spot">
                <div class="spot-info">
                  <span class="spot-name">Puraran Beach</span>
                  <span class="spot-time">9:00 AM</span>
                </div>
                <div class="spot-actions">
                  <button class="spot-action-btn" aria-label="Move up">↑</button>
                  <button class="spot-action-btn" aria-label="Move down">↓</button>
                  <button class="spot-action-btn spot-remove" aria-label="Remove">×</button>
                </div>
              </div>
              <div class="itinerary-spot">
                <div class="spot-info">
                  <span class="spot-name">Binurong Point</span>
                  <span class="spot-time">11:30 AM</span>
                </div>
                <div class="spot-actions">
                  <button class="spot-action-btn" aria-label="Move up">↑</button>
                  <button class="spot-action-btn" aria-label="Move down">↓</button>
                  <button class="spot-action-btn spot-remove" aria-label="Remove">×</button>
                </div>
              </div>
              <div class="itinerary-spot">
                <div class="spot-info">
                  <span class="spot-name">Twin Rock</span>
                  <span class="spot-time">2:00 PM</span>
                </div>
                <div class="spot-actions">
                  <button class="spot-action-btn" aria-label="Move up">↑</button>
                  <button class="spot-action-btn" aria-label="Move down">↓</button>
                  <button class="spot-action-btn spot-remove" aria-label="Remove">×</button>
                </div>
              </div>
            </div>
            <div class="time-wallet">
              <div class="wallet-header">
                <span class="wallet-label">Schedule: Relaxed pace</span>
                <span class="wallet-percent">65%</span>
              </div>
              <div class="wallet-bar">
                <div class="wallet-fill" style="width: 65%;"></div>
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
}
