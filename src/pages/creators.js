// Creators page module
export function renderCreators(container) {
  container.innerHTML = `
    <div class="page page-creators">
      <section class="creators-opening">
        <span class="info-kicker">Creators</span>
        <h1 class="info-title">Built by a small team with a practical brief.</h1>
        <p class="info-lead">
          Pathfinder Lite brings together software, hardware, and local tourism research so the
          kiosk can help visitors plan without waiting for a full desktop-class application.
        </p>
      </section>

      <section class="team-panel" aria-label="Pathfinder creators">
        <article class="creator-row">
          <div class="creator-mark">
            <span class="creator-index">01</span>
            <span class="creator-initial">T</span>
          </div>
          <div class="creator-body">
            <div class="creator-heading">
              <h2>Tan</h2>
              <span>Core Developer</span>
            </div>
            <p>Built the AI pipeline, RAG system, frontend, backend, map engine, and itinerary planner.</p>
          </div>
          <div class="creator-links" aria-label="Tan links">
            <a class="creator-link" href="https://github.com/bikemaster2331" target="_blank" rel="noopener noreferrer" aria-label="Tan GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.7.5.6 5.6.6 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.8 1.2 1.8 1.2 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.3 1.2A11 11 0 0 1 12 6.1c.9 0 1.9.1 2.8.4 2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.1v3.1c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.4 5.6 18.3.5 12 .5Z" />
              </svg>
            </a>
            <a class="creator-link" href="mailto:tanlanuzga@gmail.com" aria-label="Tan email">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                <path d="m4 7 7.1 5.1a1.6 1.6 0 0 0 1.8 0L20 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </article>

        <article class="creator-row">
          <div class="creator-mark">
            <span class="creator-index">02</span>
            <span class="creator-initial">R</span>
          </div>
          <div class="creator-body">
            <div class="creator-heading">
              <h2>Roi</h2>
              <span>Hardware Engineer</span>
            </div>
            <p>Handled Raspberry Pi deployment, hardware setup, and embedded systems integration.</p>
          </div>
        </article>

        <article class="creator-row">
          <div class="creator-mark">
            <span class="creator-index">03</span>
            <span class="creator-initial">Z</span>
          </div>
          <div class="creator-body">
            <div class="creator-heading">
              <h2>Zed</h2>
              <span>Full Stack</span>
            </div>
            <p>Worked across full-stack development and hardware integration, bridging the kiosk software with RPi infrastructure.</p>
          </div>
        </article>
      </section>

      <section class="credits-band">
        <span>Pathfinder</span>
        <strong>Catanduanes tourism planning, rebuilt for public kiosk use.</strong>
      </section>
    </div>
  `;
}
