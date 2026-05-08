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
  
  // Determine initial PDF state
  const pdfReady = !!currentPdfId;
  const pdfUrl = pdfReady ? `${apiUrl('/api/pdf/' + currentPdfId + '.pdf')}` : '';

  container.innerHTML = `
    <div class="page page-last">
      <div class="export-toolbar">
        <div class="export-toolbar-left">
          <button class="btn-secondary btn-large" id="back-itinerary-btn" data-navigate="#/itinerary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Itinerary
          </button>
        </div>
        
        <div class="export-toolbar-center">
          <div class="pdf-status" id="pdf-status">
            ${pdfReady ? '<span class="status-ready">PDF Ready</span>' : '<span class="status-generating">Generating PDF...</span>'}
          </div>
        </div>
        
        <div class="export-toolbar-right">
          <div id="pdf-button-container" class="pdf-button-container">
            <button class="btn-primary btn-large" id="generate-pdf-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Generate PDF
            </button>
          </div>
          
          <div id="pdf-download" class="pdf-download" style="display: ${pdfReady ? 'flex' : 'none'};">
            <a id="pdf-download-link" class="btn-primary btn-large" href="${pdfUrl}" download="pathfinder-itinerary.pdf">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </a>
          </div>
          
          <button class="btn-secondary btn-large" id="send-phone-btn" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 18h-3l-5 5v-5H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3" />
            </svg>
            Send to Phone
            <span class="btn-badge">Coming next</span>
          </button>
          
          <button class="btn-secondary btn-large" id="finish-home-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Finish & Home
          </button>
        </div>
      </div>
      
      <div class="export-content">
        ${hasItinerary ? `
          <div class="export-main">
            <div class="pdf-preview-container" id="pdf-preview-container">
              ${pdfReady ? `
                <iframe src="${pdfUrl}" class="pdf-preview-frame" id="pdf-preview-frame"></iframe>
              ` : `
                <div class="pdf-preview-placeholder">
                  <div class="placeholder-content">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    <h3>PDF Preview</h3>
                    <p>Generate a PDF to preview your itinerary.</p>
                    <div class="preview-fallback">
                      <span class="fallback-icon">⚠</span>
                      <span class="fallback-text">Preview unavailable on this browser. Use Download PDF.</span>
                    </div>
                  </div>
                </div>
              `}
            </div>
            
            <div class="trip-summary-panel">
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
          </div>
        ` : `
          <div class="export-empty">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 17h6M9 13h6M9 9h6M12 3a9 9 0 1 0 9 9A10 10 0 0 0 12 3z" />
              </svg>
            </div>
            <p class="empty-text">No itinerary data found. Start planning your trip to see it here.</p>
            <button class="btn-primary btn-large" data-navigate="#/itinerary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Go to Itinerary
            </button>
          </div>
        `}
      </div>
      
      <div id="finish-loading" class="finish-loading" style="display: none;">
        <span>Cleaning up...</span>
      </div>
      <div id="finish-error" class="finish-error" style="display: none;"></div>
    </div>
  `;

  // Setup PDF generation handler
  if (hasItinerary) {
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const pdfButtonContainer = document.getElementById('pdf-button-container');
    const pdfDownload = document.getElementById('pdf-download');
    const pdfDownloadLink = document.getElementById('pdf-download-link');
    const pdfStatus = document.getElementById('pdf-status');
    const pdfPreviewContainer = document.getElementById('pdf-preview-container');

    if (generatePdfBtn && exportPayload) {
      generatePdfBtn.addEventListener('click', async () => {
        try {
          // Show loading state
          pdfButtonContainer.style.display = 'none';
          pdfStatus.innerHTML = '<span class="status-generating">Generating PDF...</span>';
          pdfDownload.style.display = 'none';

          // Call backend to generate PDF
          const response = await requestPdfGeneration(exportPayload);

          // Build full download URL
          const fullDownloadUrl = apiUrl(response.download_url);

          // Store PDF ID for session cleanup
          currentPdfId = response.pdf_id;
          localStorage.setItem('pathfinder-lite-pdf-id', currentPdfId);

          // Show download button and update status
          pdfStatus.innerHTML = '<span class="status-ready">PDF Ready</span>';
          pdfDownload.style.display = 'flex';
          pdfDownloadLink.href = fullDownloadUrl;
          pdfDownloadLink.download = `pathfinder-itinerary-${response.pdf_id}.pdf`;

          // Update PDF preview
          pdfPreviewContainer.innerHTML = `
            <iframe src="${fullDownloadUrl}" class="pdf-preview-frame" id="pdf-preview-frame"></iframe>
          `;
        } catch (error) {
          // Show error
          pdfStatus.innerHTML = '<span class="status-error">Error generating PDF</span>';
          pdfButtonContainer.style.display = 'block';
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
