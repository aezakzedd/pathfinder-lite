// Home page module
export function renderHome(container) {
  container.innerHTML = `
    <div class="page page-home">
      <section class="hero">
        <span class="eyebrow">Pathfinder</span>
        <h1 class="headline">
          Discover<br />
          <em>Catanduanes.</em>
        </h1>
        <p class="lead">
          Your AI-powered travel guide to the island of happiness.
        </p>
        <button class="cta-primary" data-navigate="#/itinerary">
          Start Planning
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </section>
    </div>
  `;
}
