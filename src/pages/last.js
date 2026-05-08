// Last/Share page module
import { clearItinerary } from '../state/itineraryStore.js';
import { requestPdfGeneration, finishSession } from '../api.js';
import { apiUrl } from '../config/apiConfig.js';

export function renderLast(container) {
  // Load export payload from localStorage
  let exportPayload = null;
  let currentPdfId = null;
  try {
    const saved = localStorage.getItem('pathfinder-lite-export-payload');
    if (saved) {
      exportPayload = JSON.parse(saved);
    }
    // Load current PDF ID if stored
    const savedPdfId = localStorage.getItem('pathfinder-lite-pdf-id');
    if (savedPdfId) {
      currentPdfId = savedPdfId;
    }
  } catch (error) {
    console.error('Error loading export payload:', error);
  }

  // Check if we have itinerary data
  const hasItinerary = exportPayload && exportPayload.totalStops > 0;
  const dayCount = Number(exportPayload?.dayCount) || Object.keys(exportPayload?.days || {}).length;
  const dateRangeText = formatDateRange(exportPayload?.dateRange);

  container.innerHTML = `
    <div class="page page-last">
      <section class="share-hero">
        <h1 class="headline">
          ${hasItinerary ? 'Your Trip<br /><em>is Ready.</em>' : 'No Trip<br /><em>Yet.</em>'}
        </h1>
        <p class="lead">
          ${hasItinerary 
            ? `${exportPayload.totalStops} destinations across ${dayCount} day${dayCount !== 1 ? 's' : ''}${dateRangeText ? ` (${dateRangeText})` : ''}.`
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
                <span class="stat-value">${dayCount}</span>
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
            <div class="finish-section">
              <h3>Finish Session</h3>
              <p class="finish-note">Complete your trip and clear data for the next kiosk user.</p>
              <button class="btn-secondary" id="finish-home-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Finish & Home
              </button>
              <div id="finish-loading" class="finish-loading" style="display: none;">
                <span>Cleaning up...</span>
              </div>
              <div id="finish-error" class="finish-error" style="display: none;"></div>
            </div>
            
            <div class="pdf-section">
              <h3>PDF Download</h3>
              <p class="pdf-note">Generate a PDF of your itinerary to download.</p>
              <div id="pdf-button-container">
                <button class="btn-primary" id="generate-pdf-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Generate PDF
                </button>
              </div>
              <div id="pdf-loading" class="pdf-loading" style="display: none;">
                <span>Generating PDF...</span>
              </div>
              <div id="pdf-error" class="pdf-error" style="display: none;"></div>
              <div id="pdf-download" class="pdf-download" style="display: none;">
                <a id="pdf-download-link" class="btn-primary" href="#" download>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download PDF
                </a>
              </div>
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

    // Setup PDF generation handler
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const pdfButtonContainer = document.getElementById('pdf-button-container');
    const pdfLoading = document.getElementById('pdf-loading');
    const pdfError = document.getElementById('pdf-error');
    const pdfDownload = document.getElementById('pdf-download');
    const pdfDownloadLink = document.getElementById('pdf-download-link');

    if (generatePdfBtn && exportPayload) {
      generatePdfBtn.addEventListener('click', async () => {
        try {
          // Show loading state
          pdfButtonContainer.style.display = 'none';
          pdfLoading.style.display = 'block';
          pdfError.style.display = 'none';
          pdfDownload.style.display = 'none';

          // Call backend to generate PDF
          const response = await requestPdfGeneration(exportPayload);

          // Build full download URL
          const fullDownloadUrl = apiUrl(response.download_url);

          // Store PDF ID for session cleanup
          currentPdfId = response.pdf_id;
          localStorage.setItem('pathfinder-lite-pdf-id', currentPdfId);

          // Show download button
          pdfLoading.style.display = 'none';
          pdfDownload.style.display = 'block';
          pdfDownloadLink.href = fullDownloadUrl;
          pdfDownloadLink.download = `pathfinder-itinerary-${response.pdf_id}.pdf`;
        } catch (error) {
          // Show error
          pdfLoading.style.display = 'none';
          pdfError.style.display = 'block';
          pdfError.textContent = `Failed to generate PDF: ${error.message}`;
          console.error('PDF generation error:', error);
        }
      });
    }

    // Setup Finish & Home handler
    const finishHomeBtn = document.getElementById('finish-home-btn');
    const finishLoading = document.getElementById('finish-loading');
    const finishError = document.getElementById('finish-error');

    if (finishHomeBtn) {
      finishHomeBtn.addEventListener('click', async () => {
        try {
          // Show loading state
          finishHomeBtn.disabled = true;
          finishLoading.style.display = 'block';
          finishError.style.display = 'none';

          // Call backend to finish session
          const sessionId = 'kiosk'; // Default kiosk session ID
          const payload = {};
          if (currentPdfId) {
            payload.pdf_id = currentPdfId;
          }
          if (sessionId) {
            payload.session_id = sessionId;
          }

          await finishSession(payload);

          // Clear local browser state
          clearItinerary();
          localStorage.removeItem('pathfinder-lite-export-payload');
          localStorage.removeItem('pathfinder-lite-pdf-id');
          sessionStorage.removeItem('pathfinder-lite-chat-messages');

          // Navigate to home
          window.location.hash = '#/';
        } catch (error) {
          // If backend fails, still clear local state and go home
          console.warn('Backend session finish failed, clearing local state:', error);
          finishLoading.style.display = 'none';
          finishError.style.display = 'block';
          finishError.textContent = 'Backend cleanup failed, but local data cleared.';

          // Clear local state anyway
          clearItinerary();
          localStorage.removeItem('pathfinder-lite-export-payload');
          localStorage.removeItem('pathfinder-lite-pdf-id');
          sessionStorage.removeItem('pathfinder-lite-chat-messages');

          // Navigate to home after a brief delay
          setTimeout(() => {
            window.location.hash = '#/';
          }, 1500);
        }
      });
    }
  }
}

function formatDateRange(dateRange = {}) {
  if (!dateRange.startDate || !dateRange.endDate) return '';
  const start = formatDate(dateRange.startDate);
  const end = formatDate(dateRange.endDate);
  return start && end ? `${start} - ${end}` : '';
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
