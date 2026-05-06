// Contact page module
export function renderContact(container) {
  container.innerHTML = `
    <div class="page page-contact">
      <section class="hero">
        <span class="eyebrow">Contact</span>
        <h1 class="headline">
          Reach us<br />
          about <em>Catanduanes.</em>
        </h1>
        <p class="lead">
          Whether you want to contribute, report an issue, or just share a good beach tip, we're reachable.
        </p>
      </section>
      <ul class="channels">
        <li class="channel">
          <div class="channel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div class="channel-body">
            <span class="channel-label">Email</span>
            <a href="mailto:pathfinder.catanduanes@gmail.com" class="channel-value">pathfinder.catanduanes@gmail.com</a>
            <span class="channel-desc">General inquiries & partnerships</span>
          </div>
        </li>
        <li class="channel">
          <div class="channel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .296C5.37.296 0 5.666 0 12.297c0 5.302 3.438 9.8 8.206 11.387.6.11.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.386-1.332-1.755-1.332-1.755-1.09-.745.082-.73.082-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.81 1.305 3.495.998.108-.775.42-1.305.763-1.605-2.665-.304-5.467-1.333-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.124-.304-.535-1.527.117-3.18 0 0 1.008-.322 3 1.23a11.5 11.5 0 0 1 3.004-.404 11.5 11.5 0 0 1 3.004.404c2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.876.118 3.18.77.84 1.234 1.91 1.234 3.22 0 4.61-2.807 5.623-5.48 5.92.43.372.814 1.102.814 2.222 0 1.604-.014 2.896-.014 3.29 0 .32.216.694.825.576C20.565 22.092 24 17.596 24 12.297 24 5.666 18.627.296 12 .296z" />
            </svg>
          </div>
          <div class="channel-body">
            <span class="channel-label">GitHub</span>
            <a href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer" class="channel-value">bikemaster2331/pathfinder</a>
            <span class="channel-desc">Issues, contributions & source</span>
          </div>
        </li>
      </ul>
    </div>
  `;
}
