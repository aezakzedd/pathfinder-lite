// Home page module
export function renderHome(container) {
  container.innerHTML = `
    <div class="page page-home">
      <div class="home-glow" aria-hidden="true"></div>
      <div class="home-stars" aria-hidden="true"></div>
      <div class="home-vignette" aria-hidden="true"></div>

      <main class="home-stage">
        <section class="home-hero" aria-labelledby="home-headline">
          <div class="home-version-label">
            <span class="home-version-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M4 17 17 4m0 0h-7m7 0v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M5 20c3.7-3.4 8-4.8 13-4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <span>PATHFINDER // v1.0.21</span>
          </div>

          <h1 class="home-headline" id="home-headline">
            Explore with<br />
            every click.
          </h1>

          <p class="home-subtitle">
            Pathfinder is the AI travel guide for Catanduanes.
            Make personalized itineraries or find hidden spots.
            Plan your entire trip with real-time local data.
          </p>

          <div class="home-hero-actions" aria-label="Home actions">
            <button class="home-primary-action" type="button" data-navigate="#/itinerary">
              <span>Start Exploring</span>
              <span aria-hidden="true">↗</span>
            </button>
            <button class="home-secondary-action" type="button" data-navigate="#/contact">
              Work with us
            </button>
          </div>

          <div class="home-partners" aria-label="Tourism partners">
            <span>CATANDUANES</span>
            <span>TOURISM</span>
            <span>VIRAC</span>
            <span>BARAS</span>
            <span>LOCAL GUIDES</span>
          </div>
        </section>

        <section class="home-destination-strip" aria-label="Featured Catanduanes destinations">
          <article class="home-destination-card home-destination-side home-destination-left" aria-label="Puraran Beach">
            <img src="/images/puraran_beach.webp" alt="Puraran Beach coastline" loading="eager" />
          </article>

          <article class="home-destination-card home-destination-main" aria-label="Binurong Point">
            <img src="/images/binurong_point.webp" alt="Binurong Point rolling hills and coastline" loading="eager" />
            <span class="home-destination-label">Binurong Point</span>
          </article>

          <article class="home-destination-card home-destination-side home-destination-right" aria-label="Twin Rock Beach Resort">
            <img src="/images/twin_rock.webp" alt="Twin Rock Beach Resort" loading="eager" />
          </article>
        </section>
      </main>
    </div>
  `;
}
