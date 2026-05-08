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
            <span>Back to Itinerary</span>
          </button>
          <button class="last-control-btn last-finish-btn" type="button" id="finish-home-btn">
            <span>Finish & Home</span>
          </button>
          <a
            class="last-control-btn last-download-btn ${pdfReady ? '' : 'is-disabled'}"
            id="pdf-download-link"
            ${pdfReady ? `href="${currentPdfUrl}"` : 'aria-disabled="true" tabindex="-1"'}
            download="${currentPdfId ? `pathfinder-itinerary-${currentPdfId}.pdf` : 'pathfinder-itinerary.pdf'}"
          >
            <span>Download PDF</span>
          </a>
        </div>
      </section>

      <main class="pdf-preview-stage" id="pdf-preview-stage">
        <section class="pdf-document-wrap" id="pdf-preview-container" aria-label="PDF preview">
          ${pdfReady
            ? renderPdfPreview(currentPdfUrl)
            : hasItinerary
              ? renderGeneratingPreview()
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
  const { pdfPreviewContainer, pdfDownloadLink, setPdfId } = elements;
  setDownloadDisabled(pdfDownloadLink);
  pdfPreviewContainer.innerHTML = renderGeneratingPreview();

  try {
    const response = await requestPdfGeneration(exportPayload);
    const fullDownloadUrl = apiUrl(response.download_url);
    localStorage.setItem(PDF_ID_KEY, response.pdf_id);
    setPdfId(response.pdf_id);

    setDownloadReady(pdfDownloadLink, fullDownloadUrl, response.pdf_id);
    pdfPreviewContainer.innerHTML = renderPdfPreview(fullDownloadUrl);
  } catch (error) {
    console.error('PDF generation error:', error);
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
    <iframe src="${pdfUrl}" class="pdf-preview-frame" title="Pathfinder itinerary PDF preview"></iframe>
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
        <span>Go to Itinerary</span>
      </button>
    </div>
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
