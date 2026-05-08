// Original Pathfinder-style About page.

export function renderAbout(container) {
  container.innerHTML = `
    <div class="page editorial-page page-about-original">
      <div class="editorial-grain" aria-hidden="true"></div>

      <main class="editorial-shell">
        <section class="about-original-hero editorial-rise">
          <span class="editorial-eyebrow">About Pathfinder</span>
          <h1>Every trip starts<br>with a <em>question.</em></h1>
          <p class="about-original-lead">
            Planning a trip to Catanduanes was harder than it needed to be. No single source of truth.
            No intelligent routing. No local insight. A solution was needed -
            <strong> So we made one.</strong>
          </p>
        </section>

        <section class="about-original-stats editorial-rise" aria-label="Pathfinder coverage">
          <article>
            <strong>200+</strong>
            <span>Verified destinations</span>
          </article>
          <article>
            <strong>Island-wide</strong>
            <span>11 Municipalities covered</span>
          </article>
          <article>
            <strong>RAG</strong>
            <span>AI pipeline</span>
          </article>
          <article>
            <strong>Open</strong>
            <span>Source &amp; transparent</span>
          </article>
        </section>

        <section class="about-original-body" aria-label="About Pathfinder details">
          <article class="about-original-section editorial-rise">
            <span>What it is</span>
            <div>
              <p>
                Pathfinder is an AI-powered travel guide built specifically for Catanduanes, the island
                province at the eastern tip of the Bicol Peninsula. It combines a retrieval-augmented AI,
                an interactive map, and verified local data into a single, honest planning tool.
              </p>
              <p>
                Ask it anything. It knows the beaches, the falls, the trails, the food, the roads,
                and some secrets.
              </p>
            </div>
          </article>

          <article class="about-original-section editorial-rise">
            <span>How it works</span>
            <div>
              <p>
                The AI uses a RAG pipeline, meaning it reasons over a real, curated knowledge base of
                200+ destinations rather than hallucinating from general training data. Every answer is
                grounded in locally sourced, validated information.
              </p>
              <p>
                The itinerary planner builds day plans based on your budget, interests, and travel time,
                then optimizes the route so you actually see what you came for.
              </p>
            </div>
          </article>

          <article class="about-original-section editorial-rise">
            <span>Who's behind it</span>
            <div>
              <p>
                Pathfinder was built by three students as a thesis project, with the help of the
                Catanduanes Tourism Promotion Office. The data is locally validated. The code is open source.
              </p>
              <p>
                We believe infrastructure for tourism should be transparent and community-driven,
                not locked behind mystery boxes.
              </p>
            </div>
          </article>
        </section>

        <section class="about-original-actions editorial-rise" aria-label="About actions">
          <button type="button" data-navigate="#/itinerary">Start exploring</button>
          <button type="button" data-navigate="#/creators">Meet the team</button>
        </section>

        <footer class="editorial-footer editorial-rise">
          <span>Catanduanes, PH</span>
          <span>v1.0.21</span>
          <a href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer">GitHub &nearr;</a>
          <span>2026</span>
        </footer>
      </main>
    </div>
  `;
}
