// Last/Share page module
import { clearItinerary } from '../state/itineraryStore.js';
import { createPdfShare, finishSession, requestPdfGeneration } from '../api.js';
import { apiUrl } from '../config/apiConfig.js';

const EXPORT_PAYLOAD_KEY = 'pathfinder-lite-export-payload';
const PDF_ID_KEY = 'pathfinder-lite-pdf-id';
const CHAT_MESSAGES_KEY = 'pathfinder-lite-chat-messages';

function resolveBackendUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return apiUrl(value);
}

export function renderLast(container) {
  const { exportPayload, savedPdfId } = loadExportState();
  const hasItinerary = Boolean(exportPayload && Number(exportPayload.totalStops) > 0);
  let currentPdfId = savedPdfId;
  let currentPdfUrl = currentPdfId ? getPdfPreviewUrl(currentPdfId) : '';
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
            ${pdfReady ? `href="${getPdfDownloadUrl(currentPdfUrl)}"` : 'aria-disabled="true" tabindex="-1"'}
            download="${currentPdfId ? `pathfinder-itinerary-${currentPdfId}.pdf` : 'pathfinder-itinerary.pdf'}"
          >
            <span>Download PDF</span>
          </a>
        </div>
        <div class="send-phone-panel" id="send-phone-panel" aria-live="polite">
          <span class="send-phone-label">SEND TO PHONE</span>
          <p class="send-phone-status" id="send-phone-status">Preparing transfer link...</p>
          <div class="send-phone-qr" id="send-phone-qr" aria-label="Phone transfer QR code"></div>
          <p class="send-phone-warning" id="send-phone-warning" hidden></p>
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
  const shareElements = {
    panel: document.getElementById('send-phone-panel'),
    status: document.getElementById('send-phone-status'),
    qr: document.getElementById('send-phone-qr'),
    warning: document.getElementById('send-phone-warning')
  };

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
      shareElements,
      setPdfId: (pdfId) => {
        currentPdfId = pdfId;
        currentPdfUrl = getPdfPreviewUrl(pdfId);
      }
    });
  } else if (pdfReady) {
    loadPreviewImages(currentPdfId, pdfPreviewContainer);
    createShareForPdf(currentPdfId, shareElements);
  } else {
    setSharePreparing(shareElements);
  }
}

async function generatePdfForPreview(exportPayload, elements) {
  const { pdfPreviewContainer, pdfDownloadLink, shareElements, setPdfId } = elements;
  setDownloadDisabled(pdfDownloadLink);
  setSharePreparing(shareElements);
  pdfPreviewContainer.innerHTML = renderGeneratingPreview();

  try {
    const response = await requestPdfGeneration(exportPayload);
    const pdfId = response.pdf_id;
    const previewUrl = apiUrl(response.download_url || `/api/pdf/${pdfId}.pdf`);
    localStorage.setItem(PDF_ID_KEY, pdfId);
    setPdfId(pdfId);

    setDownloadReady(pdfDownloadLink, getPdfDownloadUrl(previewUrl), pdfId);
    pdfPreviewContainer.innerHTML = renderPdfPreview(pdfId);
    await loadPreviewImages(pdfId, pdfPreviewContainer);
    await createShareForPdf(pdfId, shareElements);
  } catch (error) {
    console.error('PDF generation error:', error);
    setDownloadDisabled(pdfDownloadLink);
    setShareError(shareElements);
    pdfPreviewContainer.innerHTML = renderPreviewUnavailable();
  }
}

async function createShareForPdf(pdfId, elements) {
  if (!pdfId) {
    setSharePreparing(elements);
    return;
  }

  setShareLoading(elements);

  try {
    const share = await createPdfShare(pdfId);
    setShareReady(elements, share);
  } catch (error) {
    console.error('PDF share error:', error);
    setShareError(elements);
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

function setSharePreparing(elements) {
  if (!hasShareElements(elements)) return;
  elements.panel.classList.remove('is-ready', 'is-error');
  elements.panel.classList.add('is-loading');
  elements.status.textContent = 'Preparing transfer link...';
  elements.qr.innerHTML = '';
  elements.warning.hidden = true;
  elements.warning.textContent = '';
}

function setShareLoading(elements) {
  setSharePreparing(elements);
}

function setShareReady(elements, share) {
  if (!hasShareElements(elements)) return;
  const svg = String(share?.qr_svg || '').trim();
  if (!svg.includes('<svg')) {
    setShareError(elements);
    return;
  }

  elements.panel.classList.remove('is-loading', 'is-error');
  elements.panel.classList.add('is-ready');
  elements.status.textContent = 'Scan with your phone';
  elements.qr.innerHTML = `
    <div class="send-phone-qr-box">${svg}</div>
    <span class="send-phone-expiry">Expires in ${Number(share.expires_in_minutes || 60)} minutes</span>
  `;

  const shareUrl = String(share?.share_url || '');
  if (isLocalhostUrl(shareUrl)) {
    elements.warning.hidden = false;
    elements.warning.textContent = 'Phone sharing requires the Raspberry Pi LAN/hotspot IP.';
  } else {
    elements.warning.hidden = true;
    elements.warning.textContent = '';
  }
}

function setShareError(elements) {
  if (!hasShareElements(elements)) return;
  elements.panel.classList.remove('is-loading', 'is-ready');
  elements.panel.classList.add('is-error');
  elements.status.textContent = 'Transfer unavailable. Use Download PDF.';
  elements.qr.innerHTML = '';
  elements.warning.hidden = true;
  elements.warning.textContent = '';
}

function isLocalhostUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(value);
}

function hasShareElements(elements) {
  return Boolean(elements?.panel && elements.status && elements.qr && elements.warning);
}

function getPdfPreviewUrl(pdfId) {
  return apiUrl(`/api/pdf/${pdfId}.pdf`);
}

function getPdfPreviewMetadataUrl(pdfId) {
  return apiUrl(`/api/pdf/${pdfId}/preview`);
}

function getPdfIframeUrl(pdfUrl) {
  return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}

function getPdfDownloadUrl(url) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}download=1`;
}

function renderPdfPreview(pdfId) {
  return `
    <div class="pdf-preview-pages" id="pdf-preview-pages" role="img" aria-label="PDF preview pages">
      <div class="pdf-preview-loading" role="status" aria-live="polite">
        <span>Loading preview...</span>
      </div>
    </div>
  `;
}

function renderGeneratingPreview() {
  return `
    <div class="pdf-document-placeholder" role="status" aria-live="polite">
      <div class="pdf-paper-skeleton" aria-hidden="true">
        <span class="skeleton-title"></span>
        <span class="skeleton-line wide"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-block"></span>
        <span class="skeleton-line wide"></span>
        <span class="skeleton-line short"></span>
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
      <a href="#" id="fallback-pdf-iframe" class="last-control-btn last-finish-btn">
        <span>Open PDF Preview</span>
      </a>
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

async function loadPreviewImages(pdfId, container) {
  if (!pdfId || !container) return;

  try {
    const previewUrl = getPdfPreviewMetadataUrl(pdfId);
    const response = await fetch(previewUrl);

    if (!response.ok) {
      container.innerHTML = renderPreviewUnavailable();
      attachFallbackHandler(pdfId, container);
      return;
    }

    const previewData = await response.json();
    renderPreviewPages(previewData, container);
  } catch (error) {
    console.error('Preview loading error:', error);
    container.innerHTML = renderPreviewUnavailable();
    attachFallbackHandler(pdfId, container);
  }
}

function renderPreviewPages(previewData, container) {
  const pages = previewData.pages || [];
  if (pages.length === 0) {
    container.innerHTML = renderPreviewUnavailable();
    return;
  }

  const pagesHtml = pages.map((page) => {
    const pageImage = resolveBackendUrl(page.image_url || '');
    const pageWidth = page.width || 794;
    const pageHeight = page.height || 1123;
    const links = page.links || [];

    const overlaysHtml = links.map((link) => {
      const href = resolveBackendUrl(link.href || '#');
      const target = link.target || '_blank';
      const x = (link.x || 0) * 100;
      const y = (link.y || 0) * 100;
      const w = (link.w || 0) * 100;
      const h = (link.h || 0) * 100;
      const label = link.label || 'Open map';

      return `
        <a
          class="pdf-preview-hotspot map-hotspot"
          href="${href}"
          target="${target}"
          rel="noopener noreferrer"
          style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;"
          aria-label="${label}"
          title="${label}"
        ></a>
      `;
    }).join('');

    return `
      <article class="pdf-preview-image-page" style="--page-w:${pageWidth}px;--page-h:${pageHeight}px;">
        <img class="pdf-preview-page-image" src="${pageImage}" alt="PDF page ${page.page}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTQiIGhlaWdodD0iNTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTcgM2g3bDUgNXYxM0g3VjNaIiBzdHJva2U9IiM0NzU2NjkiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiAvPjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IDEzaDJNNy41IDEwaDJNOS41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IDEzaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IDEzaDJNNy41IDEwaDJNNy41IDEwaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IDEzaDJNNy41IDEwaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IDEzaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IDEwaDJNNy41IEhaXN0b3J5PjxwYXRoIGQ9Ik0xNCAzdjVoNU0xMC41IDEzaDVNOS41IDEwaDJNOS41IDEzaDVNNy41IEhaXN0b3J5Pjwvc3ZnPg=='; console.error('Preview image failed to load:', '${page.image_url}');">
        ${overlaysHtml}
      </article>
    `;
  }).join('');

  container.innerHTML = `<div class="pdf-preview-pages-inner">${pagesHtml}</div>`;
}

function attachFallbackHandler(pdfId, container) {
  const fallbackLink = container.querySelector('#fallback-pdf-iframe');
  if (fallbackLink) {
    fallbackLink.addEventListener('click', (e) => {
      e.preventDefault();
      const pdfUrl = getPdfPreviewUrl(pdfId);
      const iframeUrl = getPdfIframeUrl(pdfUrl);
      container.innerHTML = `
        <iframe
          src="${iframeUrl}"
          class="pdf-preview-frame"
          title="Pathfinder itinerary PDF preview"
        ></iframe>
      `;
    });
  }
}
