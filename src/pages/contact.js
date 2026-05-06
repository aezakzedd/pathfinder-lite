// Contact page module
export function renderContact(container) {
  container.innerHTML = `
    <div class="page page-contact">
      <section class="contact-hero">
        <div>
          <span class="info-kicker">Contact</span>
          <h1 class="info-title">Keep the island guide accurate.</h1>
          <p class="info-lead">
            Send corrections, partnership notes, destination updates, or deployment questions.
            Pathfinder Lite is built to improve as local knowledge gets sharper.
          </p>
        </div>
        <aside class="contact-note">
          <span>Best for kiosk feedback</span>
          <strong>Destination changes, route issues, and visitor-facing content updates.</strong>
        </aside>
      </section>

      <section class="contact-grid" aria-label="Contact channels">
        <a class="contact-card" href="mailto:pathfinder.catanduanes@gmail.com">
          <span class="contact-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
              <path d="m4 7 7.1 5.1a1.6 1.6 0 0 0 1.8 0L20 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="contact-label">Email</span>
          <strong>pathfinder.catanduanes@gmail.com</strong>
          <p>General inquiries, LGU coordination, destination corrections, and content partnerships.</p>
        </a>

        <a class="contact-card" href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer">
          <span class="contact-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.7.5.6 5.6.6 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.8 1.2 1.8 1.2 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.3 1.2A11 11 0 0 1 12 6.1c.9 0 1.9.1 2.8.4 2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.1v3.1c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.4 5.6 18.3.5 12 .5Z" />
            </svg>
          </span>
          <span class="contact-label">Source</span>
          <strong>bikemaster2331/pathfinder</strong>
          <p>Open issues, review implementation work, or follow the project history.</p>
        </a>

        <div class="contact-card contact-card-muted">
          <span class="contact-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" stroke-width="1.8" />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </span>
          <span class="contact-label">Kiosk updates</span>
          <strong>Local deployment feedback</strong>
          <p>Report touchscreen, readability, route cleanup, or Raspberry Pi performance observations after field tests.</p>
        </div>
      </section>

      <section class="contact-checklist" aria-label="What to include">
        <h2>Helpful details to include</h2>
        <ul>
          <li>Destination name and municipality</li>
          <li>What changed or what felt incorrect</li>
          <li>Photos or source notes if available</li>
          <li>Device, browser, and kiosk mode notes for bugs</li>
        </ul>
      </section>
    </div>
  `;
}
