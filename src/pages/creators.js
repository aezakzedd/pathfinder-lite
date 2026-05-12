// Original Pathfinder-style Creators page.

const CREATORS = [
  {
    name: 'Tan',
    role: 'Core Developer',
    tag: 'Architect',
    accent: '#22d3ee',
    email: 'tanlanuzga@gmail.com',
    github: 'https://github.com/bikemaster2331',
    bio: 'Built the AI pipeline, RAG system, frontend, backend, map engine, and itinerary planner.'
  },
  {
    name: 'Roi',
    role: 'Hardware Engineer',
    tag: 'Infrastructure',
    accent: '#a78bfa',
    bio: 'Raspberry Pi deployment, hardware setup, and embedded systems integration.'
  },
  {
    name: 'Zed',
    role: 'Full Stack',
    tag: 'Bridge',
    accent: '#34d399',
    bio: 'Full-stack development and hardware integration. Bridged the software world with physical RPi infrastructure.'
  },
  {
    name: 'Pat',
    role: 'Hardware Engineer',
    tag: 'Infrastructure',
    accent: '#fb923c',
    bio: 'Raspberry Pi configuration, networking, and hardware infrastructure that keeps the system running.',
    hidden: true
  },
  {
    name: 'Lee',
    role: 'Researcher',
    tag: 'Truth',
    accent: '#f472b6',
    bio: 'Destination data sourcing, tourism research, and documentation.',
    hidden: true
  }
];

export function renderCreators(container) {
  container.innerHTML = `
    <div class="page editorial-page page-creators-original">
      <div class="editorial-grain" aria-hidden="true"></div>

      <main class="editorial-shell creators-original-shell">
        <section class="creators-original-hero editorial-rise">
          <span class="editorial-eyebrow">Pathfinder &middot; Catanduanes, PH</span>
          <h1>Built by three.<br><em>for everyone.</em></h1>
          <p>
            An AI travel guide with a live map, a RAG pipeline, and 200+ verified destinations
            sourced from the ground up.
          </p>
        </section>

        <section class="creators-original-list editorial-rise" aria-label="Pathfinder creators">
          <div class="creators-list-label">Meet the team</div>
          ${CREATORS.filter(c => !c.hidden).map((creator, index) => `
            <article class="creator-original-row" style="--creator-accent: ${creator.accent}">
              <span class="creator-original-index">${String(index + 1).padStart(2, '0')}</span>
              <div class="creator-original-main">
                <div>
                  <h2>${creator.name}</h2>
                  <span>${creator.role}</span>
                </div>
                <p>${creator.bio}</p>
              </div>
              <span class="creator-original-tag">${creator.tag}</span>
              <div class="creator-original-links" aria-label="${creator.name} links">
                ${creator.github ? `<a href="${creator.github}" target="_blank" rel="noopener noreferrer" aria-label="${creator.name} GitHub">GH</a>` : ''}
                ${creator.email ? `<a href="mailto:${creator.email}" aria-label="${creator.name} email">Mail</a>` : ''}
              </div>
            </article>
          `).join('')}
        </section>

        <section class="creators-original-closing editorial-rise">
          <p>Designed and developed in partnership with the Catanduanes Tourism Promotion Office.</p>
          <a href="https://www.facebook.com/catanduanestourismpromotionoffice" target="_blank" rel="noopener noreferrer">Tourism office &nearr;</a>
          <span>v1.0.21</span>
        </section>
      </main>
    </div>
  `;
}
