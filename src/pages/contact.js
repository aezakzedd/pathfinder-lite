// Original Pathfinder-style Contact page.

const CONTACT_EMAIL = 'pathfinder.catanduanes@gmail.com';

export function renderContact(container) {
  container.innerHTML = `
    <div class="page editorial-page page-contact-original">
      <div class="editorial-grain" aria-hidden="true"></div>

      <main class="editorial-shell contact-original-shell">
        <section class="contact-original-hero editorial-rise">
          <span class="editorial-eyebrow">Contact</span>
          <h1>Reach us<br>about <em>Catanduanes.</em></h1>
          <p>
            Whether you want to contribute, report an issue, or just share a good beach tip,
            we're reachable.
          </p>
        </section>

        <section class="contact-original-channels editorial-rise" aria-label="Contact channels">
          <a class="contact-original-row" href="mailto:${CONTACT_EMAIL}">
            <div>
              <span>Email</span>
              <strong>${CONTACT_EMAIL}</strong>
              <p>General inquiries &amp; partnerships</p>
            </div>
            <span aria-hidden="true">&nearr;</span>
          </a>

          <a class="contact-original-row" href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer">
            <div>
              <span>GitHub</span>
              <strong>bikemaster2331/pathfinder</strong>
              <p>Issues, contributions &amp; source</p>
            </div>
            <span aria-hidden="true">&nearr;</span>
          </a>

          <a class="contact-original-row" href="https://www.facebook.com/catanduanestourismpromotionoffice" target="_blank" rel="noopener noreferrer">
            <div>
              <span>Facebook</span>
              <strong>Catanduanes Tourism</strong>
              <p>Tourism office partner page</p>
            </div>
            <span aria-hidden="true">&nearr;</span>
          </a>
        </section>

        <section class="contact-original-copy editorial-rise" aria-label="Copy email">
          <div>
            <span>Quick copy</span>
            <strong>${CONTACT_EMAIL}</strong>
          </div>
          <button type="button" data-copy-email>Copy</button>
        </section>

        <footer class="editorial-footer editorial-rise">
          <span>Pathfinder</span>
          <span>Catanduanes, PH</span>
          <span>v1.0.21</span>
          <span>2026</span>
        </footer>
      </main>
    </div>
  `;

  const copyButton = container.querySelector('[data-copy-email]');
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      copyButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 1600);
    } catch {
      copyButton.textContent = CONTACT_EMAIL;
    }
  });
}
