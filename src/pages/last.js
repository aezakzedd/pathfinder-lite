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
  let currentPdfDownloadUrl = currentPdfId ? getPdfDownloadUrl(currentPdfUrl) : '';
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
            ${pdfReady ? `href="${currentPdfDownloadUrl}"` : 'aria-disabled="true" tabindex="-1"'}
            download="${currentPdfId ? `pathfinder-itinerary-${currentPdfId}.pdf` : 'pathfinder-itinerary.pdf'}"
          >
            <span>Download PDF</span>
          </a>
        </div>
      </section>

      <main class="pdf-preview-stage" id="pdf-preview-stage">
        <section class="pdf-document-wrap" id="pdf-preview-container" aria-label="PDF preview">
          ${hasItinerary
            ? renderExportPreview(exportPayload)
            : pdfReady
              ? renderPreviewUnavailable()
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
        currentPdfDownloadUrl = getPdfDownloadUrl(currentPdfUrl);
      }
    });
  }
}

async function generatePdfForPreview(exportPayload, elements) {
  const { pdfPreviewContainer, pdfDownloadLink, setPdfId } = elements;
  setDownloadDisabled(pdfDownloadLink);
  pdfPreviewContainer.innerHTML = renderExportPreview(exportPayload);

  try {
    const response = await requestPdfGeneration(exportPayload);
    const fullDownloadUrl = apiUrl(response.download_url);
    localStorage.setItem(PDF_ID_KEY, response.pdf_id);
    setPdfId(response.pdf_id);

    setDownloadReady(pdfDownloadLink, getPdfDownloadUrl(fullDownloadUrl), response.pdf_id);
    pdfPreviewContainer.innerHTML = renderExportPreview(exportPayload);
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

function getPdfDownloadUrl(url) {
  const separator = String(url).includes('?') ? '&' : '?';
  return `${url}${separator}download=1`;
}

function renderPreviewUnavailable() {
  return `
    <div class="pdf-preview-fallback">
      ${iconDocument()}
      <h2>Preview unavailable</h2>
      <p>Preview content was not found in this browser. Use Download PDF.</p>
    </div>
  `;
}

function renderExportPreview(payload) {
  const pages = buildPreviewPages(payload);
  return `
    <div class="pdf-page-stack" aria-label="Itinerary page preview">
      ${pages.map((page, index) => renderPreviewPage(page, index + 1, pages.length)).join('')}
    </div>
  `;
}

function renderPreviewPage(lines, pageNumber, pageCount) {
  return `
    <article class="pdf-preview-page">
      <div class="pdf-preview-content">
        ${lines.join('')}
      </div>
      <footer class="pdf-preview-footer">
        Pathfinder AI - Generated ${new Date().toLocaleDateString()} - Timing estimates may vary
        <span>Page ${pageNumber} of ${pageCount}</span>
      </footer>
    </article>
  `;
}

function buildPreviewPages(payload) {
  const pages = [];
  const dayPages = [];
  const days = payload?.days || {};
  const sortedDays = Object.keys(days).sort((a, b) => Number(a) - Number(b));
  const setup = payload?.setup || {};
  const dateRange = payload?.dateRange || {};
  const startPoint = setup.startPoint || 'Virac';
  const totalStops = Number(payload?.totalStops || 0);
  const dayCount = Number(payload?.dayCount || sortedDays.length || 1);
  const totalKm = estimateTotalKm(days);

  sortedDays.forEach((dayKey, index) => {
    const stops = Array.isArray(days[dayKey]) ? days[dayKey] : [];
    if (!stops.length) return;
    dayPages.push(...buildDayPages({
      dayNumber: index + 1,
      stops,
      startPoint: index === 0 ? startPoint : getStopName(getLastStop(days[String(index)])) || startPoint,
      isFirstDay: index === 0,
      header: index === 0 ? renderPreviewHeader({ startPoint, dateRange, dayCount, totalStops, totalKm }) : ''
    }));
  });

  pages.push(...dayPages);
  pages.push(...buildReferencePages(days, setup));
  return pages.length ? pages : [[renderParagraph('No itinerary export content found.')]];
}

function buildDayPages({ dayNumber, stops, startPoint, isFirstDay, header }) {
  const pages = [];
  let current = [];
  let lineBudget = isFirstDay ? 14 : 18;
  let currentBlock = '';
  let currentMinutes = (dayNumber === 1 ? 8 * 60 + 21 : 9 * 60 + 11);
  let totalMinutes = 0;

  if (header) current.push(header);
  current.push(`<h2>DAY ${dayNumber}</h2>`);
  current.push(`<p><strong>${stops.length >= 7 ? 'Tight Schedule' : 'Balanced Schedule'}</strong> - Start at ${formatClock(currentMinutes)}</p>`);
  current.push(`<p>${stops.length} Stops</p>`);
  current.push(`<div class="pdf-map-placeholder">MAP SCREENSHOT PLACEHOLDER<br><span>Click map image for directions.</span></div>`);

  stops.forEach((stop, stopIndex) => {
    const driveMinutes = getDriveMinutes(stop, stopIndex);
    const visitMinutes = getVisitMinutes(stop);
    currentMinutes += driveMinutes;
    totalMinutes += driveMinutes + visitMinutes;
    const block = getTimeBlock(currentMinutes);

    if (block !== currentBlock) {
      currentBlock = block;
      current.push(`<h3>${block}</h3>`);
      current.push(`<p>-> START FROM ${escapeHtml(String(startPoint).toUpperCase())}</p>`);
      lineBudget -= 2;
    }

    const transport = getTransport(driveMinutes);
    const cost = getCost(driveMinutes);
    const top10 = stop.is_top_10 || stop.is_top10 || stop.top10 ? ' * TOP 10' : '';
    current.push(`<p>-> ${driveMinutes} MIN DRIVE // ${transport} (${cost})</p>`);
    current.push(`<p><strong>${formatClock(currentMinutes)} ${escapeHtml(getMunicipality(stop).toUpperCase())}${escapeHtml(getStopName(stop))}${top10}</strong></p>`);
    current.push(`<p>${escapeHtml(shorten(stop.description || stop.desc || 'Local destination details are available at the kiosk.', 112))}</p>`);
    current.push(`<p>Open: ${escapeHtml(stop.opening_hours || stop.hours || 'Verify locally')} · Stay: ${visitMinutes}m${stop.best_time || stop.best_time_of_day ? ` · Best: ${escapeHtml(stop.best_time || stop.best_time_of_day)}` : ''}${getExposure(stop) ? ` · ${escapeHtml(getExposure(stop))}` : ''}</p>`);
    currentMinutes += visitMinutes;
    lineBudget -= 4;

    if (lineBudget <= 0 && stopIndex < stops.length - 1) {
      pages.push(current);
      current = [];
      lineBudget = 18;
    }
  });

  current.push(`<p>- END DAY ${dayNumber} // EST FINISH: ${formatClock(currentMinutes)} -</p>`);
  pages.push(current);
  return pages;
}

function buildReferencePages(days, setup) {
  const allStops = Object.values(days).flat();
  const budget = setup?.budget || 'Budget-Friendly';
  const costLines = allStops.map((stop) => `<p>${escapeHtml(shorten(getStopName(stop), 28))} P50-200 (${escapeHtml(budget)})</p>`);
  const firstPage = [
    '<h2>FINANCIAL BLUEPRINT</h2>',
    '<h3>Budget Distribution</h3>',
    '<p>- BUDGET TIER - EST. COST RANGE # SPOTS</p>',
    `<p>${escapeHtml(budget)} P50 - P200 per person ${allStops.length}</p>`,
    '<h3>! LOGISTICS & PAYMENT TIP</h3>',
    '<p>Most locations in Catanduanes are cash-only. ATMs are available in Virac town center.</p>',
    '<p>FUEL TAX: Catanduanes terrain involves mountain passes. Budget extra for tricycle/van fuel.</p>',
    '<h3>Cost Breakdown Per Stop</h3>',
    ...costLines.slice(0, 8)
  ];
  const secondPage = [
    ...costLines.slice(8),
    '<h2>EMERGENCY & REFERENCE</h2>',
    '<p>[Location] Provincial Tourism Office Capitol Complex, Virac - (052) 811-1231</p>',
    '<p>[Medical] Catanduanes Provincial Hospital Virac, Catanduanes - (052) 811-1163</p>',
    '<p>[Police] Philippine National Police - Virac Virac Station - (052) 811-1102</p>',
    '<p>[Port] Philippine Coast Guard Port of Virac - (052) 811-1250</p>',
    '<p>[Phone] Emergency Hotline 911 (National) / 117 (PNP)</p>',
    '<h2>TRAVEL REMINDERS</h2>',
    '<p>* Download offline maps - cell signal is weak in coastal and mountainous areas.</p>',
    '<p>* Bring cash - most rural spots do not accept digital payments.</p>',
    '<p>* Check weather forecasts - typhoon season is June to November.</p>',
    '<p>* Respect local customs - always ask before photographing locals or sacred sites.</p>',
    '<p>AI-generated content: Itinerary details - including times, costs, and availability - are estimates produced by an AI model and may be inaccurate or outdated. Always verify with local operators before travelling. Pathfinder AI is not liable for any discrepancies.</p>'
  ];
  return [firstPage, secondPage];
}

function renderPreviewHeader({ startPoint, dateRange, dayCount, totalStops, totalKm }) {
  return `
    <header class="pdf-preview-plan-header">
      <p><strong>STATUS: Finalized</strong></p>
      <p>PATHFINDER_v1.0.21</p>
      <p>ID: ${Math.random().toString(36).slice(2, 9).toUpperCase()}</p>
      <h1>EXPEDITION PLAN</h1>
      <p><strong>CATANDUANES, PH // HUB: ${escapeHtml(startPoint)}</strong></p>
      <p>${formatDateRange(dateRange)}</p>
      <p>${dayCount} Days - ${totalStops} Stops - ${totalKm.toFixed(1)} km total</p>
      <p>GENERATED BY PATHFINDER AI</p>
    </header>
  `;
}

function getStopName(stop) {
  return stop?.name || stop?.title || 'Unknown Stop';
}

function getMunicipality(stop) {
  const municipality = stop?.municipality || stop?.city || '';
  return municipality ? `${municipality} ` : '';
}

function getLastStop(stops) {
  return Array.isArray(stops) && stops.length ? stops[stops.length - 1] : null;
}

function getDriveMinutes(stop, index) {
  const raw = stop?.driveTime ?? stop?.drive_time ?? stop?.travel_time;
  if (typeof raw === 'number' && raw > 0) return Math.round(raw);
  if (typeof raw === 'string') {
    const match = raw.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return index === 0 ? 10 : 20;
}

function getVisitMinutes(stop) {
  if (typeof stop?.visit_time_minutes === 'number') return Math.max(15, Math.round(stop.visit_time_minutes));
  if (typeof stop?.duration === 'number') return Math.max(15, Math.round(stop.duration * 60));
  return 30;
}

function getTimeBlock(minutes) {
  const hour = Math.floor(minutes / 60);
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'EVENING';
}

function getTransport(minutes) {
  if (minutes <= 20) return 'TRICYCLE';
  if (minutes <= 45) return 'VAN / TRICYCLE';
  return 'PRIVATE VAN RECOMMENDED';
}

function getCost(minutes) {
  if (minutes <= 15) return '~P30-50';
  if (minutes <= 30) return '~P50-150';
  if (minutes <= 60) return '~P100-300';
  return '~P150-500';
}

function getExposure(stop) {
  return stop?.outdoor_exposure || stop?.exposure || stop?.weather_tip || '';
}

function estimateTotalKm(days) {
  const allStops = Object.values(days || {}).flat();
  const minutes = allStops.reduce((sum, stop, index) => sum + getDriveMinutes(stop, index), 0);
  return minutes * 0.55;
}

function formatClock(minutes) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatDateRange(dateRange) {
  const start = dateRange?.startDate || '';
  const end = dateRange?.endDate || '';
  if (!start && !end) return 'Wed, May 13 - Thu, May 14';
  return `${start || end} - ${end || start}`;
}

function shorten(text, maxLength) {
  const value = String(text || '');
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function renderParagraph(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
