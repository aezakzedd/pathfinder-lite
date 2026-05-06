// Last/Share page module
export function renderLast(container) {
  container.innerHTML = `
    <div class="page page-last">
      <section class="share-hero">
        <h1 class="headline">
          Your Trip<br />
          <em>is Ready.</em>
        </h1>
        <p class="lead">
          Download your itinerary or scan the QR code to share it.
        </p>
      </section>
      <div class="share-content">
        <div class="qr-placeholder">
          <p>QR Code will be implemented in Phase 9</p>
        </div>
        <div class="share-actions">
          <button class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download PDF
          </button>
          <button class="btn-secondary" data-navigate="#/">
            Start New Trip
          </button>
        </div>
      </div>
    </div>
  `;
}
