// Last/Share page module
import { clearItinerary } from '../state/itineraryStore.js';

export function renderLast(container) {
  // Load export payload from localStorage
  let exportPayload = null;
  try {
    const saved = localStorage.getItem('pathfinder-lite-export-payload');
    if (saved) {
      exportPayload = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading export payload:', error);
  }

  // Check if we have itinerary data
  const hasItinerary = exportPayload && exportPayload.totalStops > 0;

  container.innerHTML = `
    <div class="page page-last">
      <section class="share-hero">
        <h1 class="headline">
          ${hasItinerary ? 'Your Trip<br /><em>is Ready.</em>' : 'No Trip<br /><em>Yet.</em>'}
        </h1>
        <p class="lead">
          ${hasItinerary 
            ? `${exportPayload.totalStops} destinations across your selected days.`
            : 'Build your itinerary first to generate a shareable trip.'}
        </p>
      </section>
      
      ${hasItinerary ? `
        <div class="share-content">
          <div class="trip-summary">
            <h2>Trip Summary</h2>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Total Stops</span>
                <span class="stat-value">${exportPayload.totalStops}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Days Planned</span>
                <span class="stat-value">${Object.keys(exportPayload.days).filter(day => exportPayload.days[day].length > 0).length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pace</span>
                <span class="stat-value">${exportPayload.timeWallet.pace}</span>
              </div>
            </div>
            
            <div class="day-breakdown">
              <h3>Day Breakdown</h3>
              ${Object.entries(exportPayload.days).map(([day, stops]) => `
                <div class="day-summary ${stops.length > 0 ? '' : 'day-empty'}">
                  <div class="day-header">
                    <span class="day-title">Day ${day}</span>
                    <span class="day-count">${stops.length} stop${stops.length !== 1 ? 's' : ''}</span>
                  </div>
                  ${stops.length > 0 ? `
                    <ul class="day-stops">
                      ${stops.map(stop => `
                        <li class="stop-item">
                          <span class="stop-name">${stop.name}</span>
                          <span class="stop-time">${stop.time}</span>
                        </li>
                      `).join('')}
                    </ul>
                  ` : '<p class="day-empty-text">No stops planned</p>'}
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="share-actions">
            <div class="pdf-section">
              <h3>PDF Download</h3>
              <p class="pdf-note">PDF generation will be handled by the local backend.</p>
              <button class="btn-primary btn-disabled" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF (Backend Required)
              </button>
            </div>
            
            <div class="qr-section">
              <h3>Share Link</h3>
              <p class="qr-note">QR code generation will use backend/share link later.</p>
              <div class="qr-placeholder">
                <div class="qr-placeholder-inner">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <path d="M3 14h7v7H3z" />
                  </svg>
                  <span>QR Placeholder</span>
                </div>
              </div>
            </div>
            
            <div class="session-actions">
              <button class="btn-secondary" id="back-itinerary-btn" data-navigate="#/itinerary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Itinerary
              </button>
              <button class="btn-primary" id="start-new-btn" data-navigate="#/">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Start New Trip
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="share-content empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 17h6M9 13h6M9 9h6M12 3a9 9 0 1 0 9 9A10 10 0 0 0 12 3z" />
            </svg>
          </div>
          <p class="empty-text">No itinerary data found. Start planning your trip to see it here.</p>
          <button class="btn-primary" data-navigate="#/itinerary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Go to Itinerary
          </button>
        </div>
      `}
    </div>
  `;

  // Setup start new trip handler
  if (hasItinerary) {
    const startNewBtn = document.getElementById('start-new-btn');
    if (startNewBtn) {
      const clickHandler = (e) => {
        e.preventDefault();
        // Clear itinerary data
        clearItinerary();
        // Clear export payload
        localStorage.removeItem('pathfinder-lite-export-payload');
        // Navigate to home
        window.location.hash = '#/';
      };
      startNewBtn.addEventListener('click', clickHandler);
    }
  }
}
