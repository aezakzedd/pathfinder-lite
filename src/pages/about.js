// About page module
export function renderAbout(container) {
  container.innerHTML = `
    <div class="page page-about">
      <section class="hero">
        <span class="eyebrow">About Pathfinder</span>
        <h1 class="headline">
          Every trip starts<br />
          with a <em>question.</em>
        </h1>
        <p class="lead">
          Planning a trip to Catanduanes was harder than it needed to be. No single source of truth. No intelligent routing. No local insight. A solution was needed —
        </p>
        <p class="lead">So we made<span class="one">one.</span></p>
      </section>
      <div class="stats-strip">
        <div class="stat">
          <span class="stat-value">200+</span>
          <span class="stat-label">Verified destinations</span>
        </div>
        <div class="stat">
          <span class="stat-value">Island-wide</span>
          <span class="stat-label">11 Municipalities covered</span>
        </div>
        <div class="stat">
          <span class="stat-value">RAG</span>
          <span class="stat-label">AI pipeline</span>
        </div>
        <div class="stat">
          <span class="stat-value">Open</span>
          <span class="stat-label">Source & transparent</span>
        </div>
      </div>
    </div>
  `;
}
