// About page module
export function renderAbout(container) {
  container.innerHTML = `
    <div class="page page-about">
      <section class="info-hero">
        <div class="info-hero-copy">
          <span class="info-kicker">About Pathfinder Lite</span>
          <h1 class="info-title">A lighter guide for better island trips.</h1>
          <p class="info-lead">
            Pathfinder Lite turns Catanduanes destination data into a fast, touch-ready kiosk
            experience for visitors who need clear routes, practical context, and local-first
            trip planning without a heavy app stack.
          </p>
          <div class="info-actions" aria-label="About page actions">
            <button class="btn-primary" type="button" data-navigate="#/itinerary">
              Plan a route
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="btn-secondary" type="button" data-navigate="#/creators">Meet the team</button>
          </div>
        </div>
        <div class="info-snapshot" aria-label="Pathfinder project highlights">
          <span class="snapshot-label">Current build focus</span>
          <strong>Raspberry Pi 4B kiosk frontend</strong>
          <p>Vanilla Vite, hash routing, Leaflet maps, local state, and restrained CSS built for Chromium kiosk mode.</p>
        </div>
      </section>

      <section class="metric-grid" aria-label="Pathfinder coverage">
        <article class="metric-card">
          <span class="metric-value">200+</span>
          <span class="metric-label">Verified destinations</span>
        </article>
        <article class="metric-card">
          <span class="metric-value">11</span>
          <span class="metric-label">Municipalities covered</span>
        </article>
        <article class="metric-card">
          <span class="metric-value">3 days</span>
          <span class="metric-label">Itinerary planning workspace</span>
        </article>
        <article class="metric-card">
          <span class="metric-value">Kiosk</span>
          <span class="metric-label">Touch-first deployment target</span>
        </article>
      </section>

      <section class="about-story">
        <div class="section-header">
          <span class="section-label">Why it exists</span>
          <h2 class="section-title">Travel planning should feel grounded, not scattered.</h2>
          <p class="section-subtitle">
            The original Pathfinder effort brought together destination research, AI assistance,
            and route planning. This rebuild keeps the useful pieces and trims the interface for
            public kiosk hardware.
          </p>
        </div>
        <div class="about-pillars">
          <article class="pillar">
            <span class="pillar-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 6.5 10 4l4 2.5 6-2.5v13.5L14 20l-4-2.5L4 20V6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M10 4v13.5M14 6.5V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <h3>Local orientation</h3>
            <p>Places are organized around real visitor decisions: where to go, how long to spend, and what fits into a day.</p>
          </article>
          <article class="pillar">
            <span class="pillar-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v18M5 8h14M7 16h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M8 5.5 5 8l3 2.5M16 13.5l3 2.5-3 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <h3>Fast planning flow</h3>
            <p>Visitors can inspect destinations, add stops, reorder plans, and export a trip without signing in.</p>
          </article>
          <article class="pillar">
            <span class="pillar-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7 4h10l2 4v12H5V8l2-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <h3>Hardware-aware UI</h3>
            <p>The interface avoids heavyweight frameworks, large animation loops, and tiny controls that slow down kiosk use.</p>
          </article>
        </div>
      </section>

      <section class="about-timeline" aria-label="Project phases">
        <div class="timeline-item">
          <span class="timeline-step">01</span>
          <div>
            <h3>Discover</h3>
            <p>Browse curated Catanduanes destinations through a map-led interface.</p>
          </div>
        </div>
        <div class="timeline-item">
          <span class="timeline-step">02</span>
          <div>
            <h3>Assemble</h3>
            <p>Add stops to day plans, tune the route order, and keep each day within a realistic time wallet.</p>
          </div>
        </div>
        <div class="timeline-item">
          <span class="timeline-step">03</span>
          <div>
            <h3>Share</h3>
            <p>Prepare the trip summary for backend PDF and QR integrations in later phases.</p>
          </div>
        </div>
      </section>
    </div>
  `;
}
