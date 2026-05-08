// Last/Share page module
import { clearItinerary } from '../state/itineraryStore.js';
import { finishSession, requestPdfGeneration } from '../api.js';
import { apiUrl } from '../config/apiConfig.js';

const EXPORT_PAYLOAD_KEY = 'pathfinder-lite-export-payload';
const PDF_ID_KEY = 'pathfinder-lite-pdf-id';
const CHAT_MESSAGES_KEY = 'pathfinder-lite-chat-messages';

export function renderLast(container) {
  const { exportPayload, savedPdfId } = loadExportState();
  const hasItinerary = Boolean(exportPayload && Number(exportPayload.totalStops) > 0);
  let currentPdfId = savedPdfId;
  let currentPdfUrl = currentPdfId ? apiUrl(`/api/pdf/${currentPdfId}.pdf`) : '';
  const pdfReady = Boolean(currentPdfId);

  container.innerHTML = `
    <div class="page page-last last-export-page">
      <section class="last-export-controls" aria-label="Export controls">
        <div class="last-export-actions">
          <button class="last-control-btn last-back-btn" type="button" data-navigate="#/itinerary">
            ${iconArrowLeft()}
            <span>Back to Itinerary</span>
          </button>
          <button class="last-control-btn last-finish-btn" type="button" id="finish-home-btn">
            ${iconHome()}
            <span>Finish & Home</span>
          </button>
          <a
            class="last-control-btn last-download-btn ${pdfReady ? '' : 'is-disabled'}"
            id="pdf-download-link"
            ${pdfReady ? `href="${currentPdfUrl}"` : 'aria-disabled="true" tabindex="-1"'}
            download="${currentPdfId ? `pathfinder-itinerary-${currentPdfId}.pdf` : 'pathfinder-itinerary.pdf'}"
          >
            ${iconDownload()}
            <span>Download PDF</span>
          </a>
        </div>

        <div class="last-status-card ${pdfReady ? 'is-ready' : hasItinerary ? 'is-generating' : 'is-unavailable'}" id="pdf-status-card">
          <span class="last-status-label">${pdfReady ? 'PDF Ready' : hasItinerary ? 'Generating PDF' : 'Preview unavailable'}</span>
          <span class="last-status-detail">${pdfReady ? 'Download is available.' : hasItinerary ? 'Creating the document preview now.' : 'No itinerary export data was found.'}</span>
        </div>

        <div class="send-phone-panel" aria-disabled="true">
          <div class="send-phone-title">Send to Phone</div>
          <div class="send-phone-status" id="send-phone-status">Coming next</div>
        </div>
      </section>

      <main class="pdf-preview-stage" id="pdf-preview-stage">
        <section class="pdf-document-wrap" id="pdf-preview-container" aria-label="PDF preview">
          ${hasItinerary
            ? pdfReady
              ? renderPdfPreview(currentPdfUrl)
              : renderGeneratingPreview()
            : renderEmptyPreview()
          }
        </section>
      </main>

      <div id="finish-loading" class="finish-loading" style="display: none;">
        <span>Cleaning up session...</span>
      </div>
      <div id="finish-error" class="finish-error" style="display: none;"></div>
    </div>
  `;

  const pdfStatusCard = document.getElementById('pdf-status-card');
  const pdfPreviewContainer = document.getElementById('pdf-preview-container');
  const pdfDownloadLink = document.getElementById('pdf-download-link');
  const finishHomeBtn = document.getElementById('finish-home-btn');
  const finishLoading = document.getElementById('finish-loading');
  const finishError = document.getElementById('finish-error');

  if (pdfDownloadLink) {
    pdfDownloadLink.addEventListener('click', (event) => {
      if (pdfDownloadLink.classList.contains('is-disabled')) {
        event.preventDefault();
      }
    });
  }

  if (finishHomeBtn) {
    finishHomeBtn.addEventListener('click', async () => {
      await handleFinishHome({
        finishHomeBtn,
        finishLoading,
        finishError,
        currentPdfId
      });
    });
  }

  if (hasItinerary && !pdfReady) {
    generatePdfForPreview(exportPayload, {
      pdfStatusCard,
      pdfPreviewContainer,
      pdfDownloadLink,
      setPdfId: (pdfId) => {
        currentPdfId = pdfId;
        currentPdfUrl = apiUrl(`/api/pdf/${pdfId}.pdf`);
      }
    });
  }
}

async function generatePdfForPreview(exportPayload, elements) {
  const { pdfStatusCard, pdfPreviewContainer, pdfDownloadLink, setPdfId } = elements;
  setPdfStatus(pdfStatusCard, 'generating', 'Generating PDF', 'Creating the document preview now.');
  setDownloadDisabled(pdfDownloadLink);
  pdfPreviewContainer.innerHTML = renderGeneratingPreview();

  try {
    const response = await requestPdfGeneration(exportPayload);
    const fullDownloadUrl = apiUrl(response.download_url);
    localStorage.setItem(PDF_ID_KEY, response.pdf_id);
    setPdfId(response.pdf_id);

    setPdfStatus(pdfStatusCard, 'ready', 'PDF Ready', 'Download is available.');
    setDownloadReady(pdfDownloadLink, fullDownloadUrl, response.pdf_id);
    pdfPreviewContainer.innerHTML = renderPdfPreview(fullDownloadUrl);
  } catch (error) {
    console.error('PDF generation error:', error);
    setPdfStatus(pdfStatusCard, 'error', 'Error state', 'PDF generation failed. Try returning to the itinerary and saving again.');
    setDownloadDisabled(pdfDownloadLink);
    pdfPreviewContainer.innerHTML = renderPreviewUnavailable();
  }
}

async function handleFinishHome({ finishHomeBtn, finishLoading, finishError, currentPdfId }) {
  try {
    finishHomeBtn.disabled = true;
    finishLoading.style.display = 'block';
    finishError.style.display = 'none';

    const payload = { session_id: 'kiosk' };
    if (currentPdfId) payload.pdf_id = currentPdfId;
    await finishSession(payload);

    clearLocalExportSession();
    window.location.hash = '#/';
  } catch (error) {
    console.warn('Backend session finish failed, clearing local state:', error);
    finishLoading.style.display = 'none';
    finishError.style.display = 'block';
    finishError.textContent = 'Backend cleanup failed, but local data was cleared.';
    clearLocalExportSession();
    setTimeout(() => {
      window.location.hash = '#/';
    }, 1200);
  }
}

function clearLocalExportSession() {
  clearItinerary();
  localStorage.removeItem(EXPORT_PAYLOAD_KEY);
  localStorage.removeItem(PDF_ID_KEY);
  sessionStorage.removeItem(CHAT_MESSAGES_KEY);
}

function loadExportState() {
  let exportPayload = null;
  let savedPdfId = null;

  try {
    const savedPayload = localStorage.getItem(EXPORT_PAYLOAD_KEY);
    if (savedPayload) exportPayload = JSON.parse(savedPayload);
    savedPdfId = localStorage.getItem(PDF_ID_KEY);
  } catch (error) {
    console.error('Error loading export payload:', error);
  }

  return { exportPayload, savedPdfId };
}

function setPdfStatus(element, state, label, detail) {
  if (!element) return;
  element.className = `last-status-card is-${state}`;
  element.innerHTML = `
    <span class="last-status-label">${label}</span>
    <span class="last-status-detail">${detail}</span>
  `;
}

function setDownloadReady(link, url, pdfId) {
  if (!link) return;
  link.href = url;
  link.download = `pathfinder-itinerary-${pdfId}.pdf`;
  link.classList.remove('is-disabled');
  link.removeAttribute('aria-disabled');
  link.removeAttribute('tabindex');
}

function setDownloadDisabled(link) {
  if (!link) return;
  link.removeAttribute('href');
  link.setAttribute('aria-disabled', 'true');
  link.setAttribute('tabindex', '-1');
  link.classList.add('is-disabled');
}

function renderPdfPreview(pdfUrl) {
  return `
    <object data="${pdfUrl}" type="application/pdf" class="pdf-preview-frame" aria-label="Pathfinder itinerary PDF preview">
      ${renderPreviewUnavailable()}
    </object>
  `;
}

function renderGeneratingPreview() {
  return `
    <div class="pdf-document-placeholder">
      <div class="pdf-paper-skeleton">
        <span class="skeleton-title"></span>
        <span class="skeleton-line wide"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line short"></span>
        <span class="skeleton-block"></span>
        <span class="skeleton-line wide"></span>
        <span class="skeleton-line"></span>
      </div>
      <p>Generating PDF preview...</p>
    </div>
  `;
}

function renderPreviewUnavailable() {
  return `
    <div class="pdf-preview-fallback">
      ${iconDocument()}
      <h2>Preview unavailable</h2>
      <p>Preview unavailable on this browser. Use Download PDF.</p>
    </div>
  `;
}

function renderEmptyPreview() {
  return `
    <div class="pdf-preview-fallback">
      ${iconDocument()}
      <h2>No itinerary export found</h2>
      <p>Return to the itinerary and save a trip to create a PDF preview.</p>
      <button class="last-control-btn last-finish-btn" type="button" data-navigate="#/itinerary">
        ${iconArrowLeft()}
        <span>Go to Itinerary</span>
      </button>
    </div>
  `;
}

function iconArrowLeft() {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function iconHome() {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 11 9-8 9 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function iconDownload() {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function iconDocument() {
  return `
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M14 3v5h5M9.5 13h5M9.5 16h5M9.5 10h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  `;
}
