// Pathfinder home page — vanilla JS port of the React original.
// Includes: hero, carousel, testimonials, sticky-scroll sections
// (guide / reviews-bento / collaborate), footer. Optimized for RPi 4.

const HOME_SLIDES = [
  { name: 'Binurong Point', image: '/images/original/home-binurong-point.webp', alt: 'Binurong Point coastal hills' },
  { name: 'Puraran Beach', image: '/images/original/home-puraran-beach.webp', alt: 'Puraran Beach surf coast' },
  { name: 'Palumbanes Island', image: '/images/original/home-palumbanes-island.webp', alt: 'Palumbanes Island coastline' },
  { name: 'Boto ni Kurakog', image: '/images/original/home-boto-ni-kurakog.webp', alt: 'Boto ni Kurakog rock formation' }
];

const TESTIMONIALS = [
  { label: 'First-time Visitor', quote: 'Ang bilis lang magplano, will use again' },
  { label: 'Weekend Explorer', quote: 'Shoutout sa mga kapamilya at mga kaibigan ko at kay Patrick Guerrero, sikat na ako.' },
  { label: 'Weekend Explorer', quote: 'Must try: Paraiso Ni Honesto' },
  { label: 'Group Trip Organizer', quote: 'Multi-day planner kept our group of 8 perfectly coordinated across 3 days. Sa mga graduating d\'yan ingat!' },
  { label: 'Backpacker', quote: 'Offline access helped when signal dropped in remote spots.' },
  { label: 'Food Trip Duo', quote: 'Saved us time finding local food stops between attractions. I\'m excited to spend my money on delicacies offered in the Island of Catanduanes' }
];

const MOCK_SCENARIOS = [
  { user: 'Where can I find the best surf in Catanduanes?', ai: 'Puraran Beach is famous for its \'Majestic\' waves on the east coast. It\'s an iconic destination for surfers.', cardName: 'Puraran Beach', cardTag: 'Surf · P50-300', dist: 'ETA: 45 MINS // 28 KM', image: '/images/puraran_beach.webp' },
  { user: 'Is the hike to Binurong Point difficult?', ai: 'The hike to Binurong Point is a breathtaking journey through rolling pastoral hills built for discovery. It\'s a moderate 20-30 minute walk that is accessible for most.', cardName: 'Binurong Point', cardTag: 'Hike · P50-200', dist: 'ETA: 50 MINS // 25 KM', image: '/images/binurong_point.webp' },
  { user: 'Recommendations for a family-friendly beach resort?', ai: 'Twin Rock Beach Resort is perfect for families, offering calm waters and rock formations. It\'s ideal for kayaking and safe swimming for children.', cardName: 'Twin Rock Beach Resort', cardTag: 'Beach · P100-500', dist: 'ETA: 15 MINS // 8.5 KM', image: '/images/twin_rock.webp' }
];

const REPO_FEATURES = [
  { label: 'RAG AI', desc: 'Retrieval Augmented Generation' },
  { label: 'Dynamic Maps', desc: 'Interactive Leaflet visualization' },
  { label: 'Verified Data', desc: 'Locally sourced tourism records' },
  { label: 'Open Source', desc: 'Transparency & Community driven' }
];

const TECH_STACK = [
  { name: 'React', color: '#61DAFB' },
  { name: 'Python', color: '#3776AB' },
  { name: 'Vite', color: '#646CFF' },
  { name: 'Leaflet', color: '#199900' },
  { name: 'JavaScript', color: '#F7DF1E' }
];

const CREATORS_HOME = [
  { name: 'Tan', role: 'Core Dev', accent: '#22d3ee', email: 'tanlanuzga@gmail.com', github: 'https://github.com/bikemaster2331', bio: 'Full-stack architect. Built the AI pipeline, RAG system, UI/UX, backend, map engine, and itinerary planner.', hasAvatar: true },
  { name: 'Roi', role: 'Hardware', accent: '#a78bfa', bio: 'Raspberry Pi deployment, hardware setup, and embedded systems integration.' },
  { name: 'Zed', role: 'Full Stack', accent: '#34d399', bio: 'Full-stack development and hardware integration. Bridged software with RPi infrastructure.' }
];

const REPO_VERSION = 'v1.0.21';

let homeCleanup = null;

export function renderHome(container) {
  cleanupHome();

  container.innerHTML = `
    <div class="page page-home">
      <!-- ambient/starfield/vignette removed for RPi performance -->

      <!-- ═══ PAGE 1 — HERO ═══ -->
      <main class="home-hero-section">
        <div class="home-hero-wrapper">
          <div class="home-metadata scroll-reveal">
            <span>PATHFINDER // ${REPO_VERSION}</span>
            <svg class="home-metadata-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3L11 9.999" />
              <path d="M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024" />
              <path d="M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069" />
              <path d="M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z" />
            </svg>
          </div>

          <h1 class="home-headline scroll-reveal" id="home-headline">
            Explore with<br><span class="home-headline-accent">every click.</span>
          </h1>

          <p class="home-subheadline scroll-reveal">
            Pathfinder is the AI travel guide for Catanduanes.<br>
            Make personalized itineraries or find hidden spots.<br>
            Plan your entire trip with real-time local data.
          </p>

          <div class="home-cta-group scroll-reveal" aria-label="Home actions">
            <button class="home-primary-cta" type="button" data-navigate="#/itinerary">
              <span>Start Exploring</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="home-secondary-cta" type="button" data-navigate="#/contact">Work with us</button>
          </div>

          <div class="home-badges scroll-reveal" aria-label="Project partner marks">
            <img src="/images/original/card-badges.webp" alt="Pathfinder partner badges" draggable="false">
          </div>

          <!-- Carousel -->
          <section class="home-carousel scroll-reveal" aria-label="Featured destinations">
            <div class="home-carousel-stage">
              ${HOME_SLIDES.map((s, i) => `
                <article class="home-carousel-card" data-slide-index="${i}" aria-label="${s.name}">
                  <img src="${s.image}" alt="${s.alt}" draggable="false">
                  <span class="home-carousel-label">${s.name}</span>
                </article>
              `).join('')}
            </div>
            <div class="home-carousel-controls">
              <button type="button" class="home-carousel-button home-carousel-prev" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div class="home-carousel-dots">
                ${HOME_SLIDES.map((s, i) => `<button type="button" class="home-carousel-dot" data-slide-dot="${i}" aria-label="Show ${s.name}"></button>`).join('')}
              </div>
              <button type="button" class="home-carousel-button home-carousel-next" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </section>
        </div>

        <!-- Testimonials -->
        <section class="home-testimonials scroll-reveal" aria-label="Testimonials">
          <div class="home-testimonials-block">
            <h2 class="home-testimonials-heading">Let's hear<br>it for...</h2>
            <div class="home-testimonials-items">
              ${TESTIMONIALS.map((t, i) => `
                <div class="home-testimonial-item" data-testimonial="${i}">
                  <div class="home-testimonial-card${i === TESTIMONIALS.length - 1 ? ' home-testimonial-card-last' : ''}">
                    <div class="home-testimonial-header">
                      <div class="home-testimonial-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>
                      <span class="home-testimonial-label">${t.label}</span>
                    </div>
                    <p class="home-testimonial-quote">${t.quote}</p>
                    <div class="home-testimonial-meta"><span class="home-meta-dot"></span><span>Verified Experience</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      </main>

      <div class="home-section-bridge"></div>

      <!-- ═══ STICKY SCROLL SECTIONS ═══ -->
      <div class="home-sticky-container">

        <!-- Left — sticky titles -->
        <div class="home-sticky-panel">
          <div class="home-sticky-content">
            <div class="home-sticky-title-group" data-section="guide">
              <h2 class="home-sticky-title is-active">AI-Powered<br>Guide</h2>
              <div class="home-sticky-subtext-wrap is-active">
                <div class="home-sticky-subtext-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  <p>Chat with our AI to build custom multi-day itineraries, pin destinations, and get real-time local recommendations.</p>
                </div>
              </div>
            </div>
            <div class="home-sticky-title-group" data-section="reviews">
              <h2 class="home-sticky-title">What's<br>Beyond</h2>
              <div class="home-sticky-subtext-wrap">
                <div class="home-sticky-subtext-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  <p>Browse 200+ destinations, see live traveler stats, and discover top-rated spots across Catanduanes</p>
                </div>
              </div>
            </div>
            <div class="home-sticky-title-group" data-section="collaborate">
              <h2 class="home-sticky-title">Work<br>With Us</h2>
              <div class="home-sticky-subtext-wrap">
                <div class="home-sticky-subtext-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  <p>View the source, star the repo, or open a pull request — this project is fully open source.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right — scrolling content -->
        <div class="home-scroll-panel">

          <!-- Section 1: Guide -->
          <div class="home-scroll-section" id="home-sec-guide">
            <div class="home-guide-showcase">
              <div class="home-guide-map-frame scroll-reveal">
                <img src="/images/original/card-map.webp" alt="Pathfinder map view" class="home-guide-map-image" draggable="false">
                <div class="home-guide-map-vignette"></div>
                <div class="home-guide-map-scanlines"></div>
                <div class="home-guide-user-msg">Welcome to the island</div>
                <div class="home-guide-pin home-guide-pin-a"><span class="home-guide-pin-dot" style="background:#fb7185"></span>Puraran</div>
                <div class="home-guide-pin home-guide-pin-b"><span class="home-guide-pin-dot" style="background:#22d3ee"></span>Binurong Point</div>
                <div class="home-guide-pin home-guide-pin-c"><span class="home-guide-pin-dot" style="background:#facc15"></span>Twin Rock</div>
                <div class="home-guide-popup" id="home-guide-popup"></div>
                <div class="home-guide-chat-float scroll-reveal" id="home-guide-chat">
                  <div class="home-guide-chat-header">
                    <span class="home-guide-chat-title">Pathfinder AI</span>
                    <span class="home-guide-chat-online">● Online</span>
                  </div>
                  <div class="home-guide-chat-body" id="home-guide-chat-body"></div>
                  <div class="home-guide-chat-input">
                    <span class="home-guide-chat-placeholder" id="home-guide-chat-placeholder">Ask Pathfinder anything...</span>
                    <button class="home-guide-chat-send" disabled tabindex="-1" aria-label="Send">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                        <path d="m21.854 2.147-10.94 10.939" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Reviews / Bento -->
          <div class="home-scroll-section" id="home-sec-reviews">
            <div class="home-bento-grid scroll-reveal">
              <div class="home-prism-layout">
                <div class="home-prism-column">
                  <div class="home-prism-brand-card">
                    <img src="/images/original/prism-abaca.webp" alt="Abaca craft" draggable="false">
                  </div>
                  <div class="home-prism-stats-card">
                    <span class="home-prism-stat-metadata">Node: Isla // 01</span>
                    <div class="home-prism-stats-row"><span>CATANDUANES</span></div>
                  </div>
                </div>
                <div class="home-prism-column">
                  <div class="home-prism-hero-card">
                    <img src="/images/original/prism-binu.webp" alt="Binurong Point" draggable="false">
                  </div>
                  <div class="home-prism-player-card">
                    <span class="home-prism-stat-num">11</span>
                    <div class="home-prism-stat-col">
                      <span class="home-prism-stat-label">Municipalities</span>
                      <span class="home-prism-stat-sub">Our proprietary retrieval-augmented generation pipeline treats each municipality as a distinct knowledge domain.</span>
                    </div>
                  </div>
                </div>
                <div class="home-prism-column">
                  <div class="home-prism-photo-card">
                    <img src="/images/original/prism-surf.webp" alt="Catanduanes scenery" draggable="false">
                  </div>
                  <div class="home-prism-cta-card">
                    <span class="home-prism-cta-num" id="home-dest-count">0+</span>
                    <span class="home-prism-cta-sub">Destinations</span>
                    <p>Explore the island with AI-powered itineraries. Let Pathfinder guide you to the best spots.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Collaborate -->
          <div class="home-scroll-section" id="home-sec-collaborate">
            <div class="home-contribute-shell">
              <p class="home-contribute-note scroll-reveal">
                Pathfinder operates in direct partnership with the
                <a href="https://www.facebook.com/catanduanestourismpromotion/" target="_blank" rel="noopener noreferrer">Catanduanes Tourism Promotion Office</a>,
                <br>thoroughly relying on validated, updated, and locally sourced data to promote responsible and reliable
                <br>tourism through a transparent open-source platform. Contributions, issues, and feature requests are welcome.
              </p>

              <a href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer" class="home-repo-card scroll-reveal">
                <div class="home-repo-header">
                  <div class="home-repo-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 .296C5.37.296 0 5.666 0 12.297c0 5.302 3.438 9.8 8.206 11.387.6.11.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.386-1.332-1.755-1.332-1.755-1.09-.745.082-.73.082-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.81 1.305 3.495.998.108-.775.42-1.305.763-1.605-2.665-.304-5.467-1.333-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.124-.304-.535-1.527.117-3.18 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.004-.404 11.5 11.5 0 0 1 3.004.404c2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.876.118 3.18.77.84 1.234 1.91 1.234 3.22 0 4.61-2.807 5.623-5.48 5.92.43.372.814 1.102.814 2.222 0 1.604-.014 2.896-.014 3.29 0 .32.216.694.825.576C20.565 22.092 24 17.596 24 12.297 24 5.666 18.627.296 12 .296z"/></svg>
                  </div>
                  <div class="home-repo-meta">
                    <span class="home-repo-name">bikemaster2331/pathfinder <span class="home-repo-version">${REPO_VERSION}</span></span>
                    <span class="home-repo-desc">AI-powered travel itinerary maker for Catanduanes</span>
                  </div>
                  <span class="home-repo-arrow">&nearr;</span>
                </div>
                <div class="home-repo-body">
                  <div class="home-repo-features-grid" id="home-repo-features">
                    ${REPO_FEATURES.map((f, i) => `
                      <div class="home-feat-item${i === 0 ? ' is-active' : ''}" data-feat-index="${i}">
                        <div class="home-feat-meta">
                          <span class="home-feat-label">${f.label}</span>
                          <span class="home-feat-desc">${f.desc}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div class="home-repo-footer-row">
                  <div class="home-tech-icon-pill">
                    ${TECH_STACK.map(t => `<span class="home-tech-icon-btn" style="--tech-color:${t.color}" title="${t.name}"></span>`).join('')}
                  </div>
                </div>
              </a>

              <div class="home-creators-section scroll-reveal">
                <span class="home-tech-label">Creators</span>
                <div class="home-creators-grid">
                  ${CREATORS_HOME.map((c, i) => `
                    <div class="home-creator-card-wrap" style="--creator-accent:${c.accent}" data-creator-index="${i}">
                      <div class="home-creator-flipper">
                        <div class="home-creator-front">
                          <div class="home-creator-avatar">
                            ${c.hasAvatar
                              ? `<img src="/images/original/creator-tan.webp" alt="${c.name}" draggable="false">`
                              : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                            }
                          </div>
                          <span class="home-creator-name">${c.name}</span>
                          <span class="home-creator-role">${c.role}</span>
                        </div>
                        <div class="home-creator-back">
                          <span class="home-creator-back-name">${c.name}</span>
                          <p class="home-creator-bio">${c.bio}</p>
                          <div class="home-creator-actions">
                            ${c.email ? `<a href="mailto:${c.email}" class="home-creator-link" aria-label="Email ${c.name}">✉</a>` : ''}
                            ${c.github ? `<a href="${c.github}" target="_blank" rel="noopener noreferrer" class="home-creator-link" aria-label="GitHub">GH</a>` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <footer class="home-footer scroll-reveal">
        <span>Catanduanes, PH</span>
        <span>${REPO_VERSION}</span>
        <a href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer">GitHub &nearr;</a>
        <span>2026</span>
      </footer>
    </div>
  `;

  homeCleanup = setupHomePage(container);
}

export function cleanupHome() {
  if (homeCleanup) {
    homeCleanup();
    homeCleanup = null;
  }
}

// ── Setup logic ──────────────────────────────────────────────

function setupHomePage(container) {
  const cleanups = [];

  // Carousel
  setupCarousel(container, cleanups);
  // Scroll reveal
  setupScrollReveal(container, cleanups);
  // Sticky scroll sections
  setupStickyScroll(container, cleanups);
  // Mock chat scenario rotation
  setupMockChat(container, cleanups);
  // Bento 200+ count-up
  setupCountUp(container, cleanups);
  // Creator card flip
  setupCreatorFlip(container, cleanups);
  // Feature highlight cycle
  setupFeatCycle(container, cleanups);

  return () => cleanups.forEach(fn => fn());
}

// ── Carousel ─────────────────────────────────────────────────

function setupCarousel(container, cleanups) {
  const cards = Array.from(container.querySelectorAll('.home-carousel-card'));
  const dots = Array.from(container.querySelectorAll('.home-carousel-dot'));
  const prev = container.querySelector('.home-carousel-prev');
  const next = container.querySelector('.home-carousel-next');
  const carousel = container.querySelector('.home-carousel');
  let active = 0, interval = null;

  const render = () => {
    const last = cards.length - 1;
    cards.forEach((c, i) => {
      c.classList.remove('is-active', 'is-left', 'is-right', 'is-hidden');
      if (i === active) c.classList.add('is-active');
      else if (i === (active + last) % cards.length) c.classList.add('is-left');
      else if (i === (active + 1) % cards.length) c.classList.add('is-right');
      else c.classList.add('is-hidden');
    });
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === active); d.setAttribute('aria-current', i === active ? 'true' : 'false'); });
  };
  const goTo = n => { active = ((n % cards.length) + cards.length) % cards.length; render(); };
  const startAuto = () => { stopAuto(); interval = setInterval(() => goTo(active + 1), 6500); };
  const stopAuto = () => { if (interval) { clearInterval(interval); interval = null; } };
  const handlePrev = () => goTo(active - 1);
  const handleNext = () => goTo(active + 1);
  const dotHandlers = dots.map((d, i) => { const h = () => goTo(i); d.addEventListener('click', h); return () => d.removeEventListener('click', h); });

  prev?.addEventListener('click', handlePrev);
  next?.addEventListener('click', handleNext);
  carousel?.addEventListener('pointerenter', stopAuto);
  carousel?.addEventListener('pointerleave', startAuto);
  render(); startAuto();

  cleanups.push(() => {
    stopAuto();
    prev?.removeEventListener('click', handlePrev);
    next?.removeEventListener('click', handleNext);
    carousel?.removeEventListener('pointerenter', stopAuto);
    carousel?.removeEventListener('pointerleave', startAuto);
    dotHandlers.forEach(fn => fn());
  });
}

// ── Scroll reveal ────────────────────────────────────────────

function setupScrollReveal(container, cleanups) {
  if (!('IntersectionObserver' in window)) {
    container.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  container.querySelectorAll('.scroll-reveal').forEach(el => obs.observe(el));
  cleanups.push(() => obs.disconnect());
}

// ── Sticky scroll sections ───────────────────────────────────

function setupStickyScroll(container, cleanups) {
  const sections = ['guide', 'reviews', 'collaborate'];
  const sectionEls = sections.map(id => container.querySelector(`#home-sec-${id}`));
  const titleGroups = sections.map(id => container.querySelector(`.home-sticky-title-group[data-section="${id}"]`));
  let currentActive = 'guide';

  const obs = new IntersectionObserver(entries => {
    let best = currentActive, bestRatio = 0;
    entries.forEach(e => {
      const idx = sectionEls.indexOf(e.target);
      if (idx >= 0 && e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = sections[idx]; }
    });
    if (best !== currentActive) {
      currentActive = best;
      titleGroups.forEach((tg, i) => {
        const isActive = sections[i] === currentActive;
        const title = tg?.querySelector('.home-sticky-title');
        const sub = tg?.querySelector('.home-sticky-subtext-wrap');
        if (title) title.classList.toggle('is-active', isActive);
        if (sub) sub.classList.toggle('is-active', isActive);
      });
    }
  }, { root: null, rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

  sectionEls.forEach(el => { if (el) obs.observe(el); });
  cleanups.push(() => obs.disconnect());
}

// ── Mock chat scenario rotation ──────────────────────────────

function setupMockChat(container, cleanups) {
  const body = container.querySelector('#home-guide-chat-body');
  const placeholder = container.querySelector('#home-guide-chat-placeholder');
  const popup = container.querySelector('#home-guide-popup');
  if (!body) return;

  let idx = 0, step = 0, timers = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const runCycle = () => {
    clearTimers();
    const scenario = MOCK_SCENARIOS[idx];
    step = 0;
    body.innerHTML = '';
    if (popup) popup.innerHTML = '';
    if (placeholder) { placeholder.textContent = ''; placeholder.classList.add('is-typing'); typeText(placeholder, scenario.user, 25); }

    timers.push(setTimeout(() => {
      step = 1;
      if (placeholder) { placeholder.textContent = 'Ask Pathfinder anything...'; placeholder.classList.remove('is-typing'); }
      body.innerHTML = `<div class="home-guide-msg-user home-animate-in">${scenario.user}</div>`;
    }, 2200));

    timers.push(setTimeout(() => {
      step = 2;
      const highlight = scenario.cardName;
      const aiText = scenario.ai.replace(new RegExp(`(${highlight})`, 'gi'), '<strong>$1</strong>');
      body.innerHTML += `<div class="home-guide-msg-ai home-animate-in"><span class="home-guide-typewriter">${aiText}</span></div>`;
      if (popup) {
        popup.innerHTML = `
          <div class="home-guide-popup-inner home-animate-in">
            <div class="home-guide-popup-image-frame"><img src="${scenario.image}" alt="${scenario.cardName}" draggable="false"></div>
            <div class="home-guide-popup-content">
              <h4>${scenario.cardName}</h4>
              <div class="home-guide-popup-meta">
                <span>${scenario.cardTag.split(' · ')[0]}</span>
                <span>25m trip</span>
                <span>Popular</span>
                <span>${scenario.cardTag.split(' · ')[1]}</span>
              </div>
              <button class="home-guide-popup-add-btn" disabled tabindex="-1">Add Spot</button>
            </div>
          </div>`;
      }
    }, 2800));

    timers.push(setTimeout(() => {
      step = 3;
      body.innerHTML += `
        <div class="home-guide-msg-card home-animate-in">
          <div class="home-guide-msg-card-label">Recommendation</div>
          <div class="home-guide-msg-stop">
            <span class="home-guide-msg-place">${scenario.cardName}</span>
            <span class="home-guide-msg-dist">${scenario.dist}</span>
          </div>
        </div>`;
    }, 5600));

    timers.push(setTimeout(() => {
      idx = (idx + 1) % MOCK_SCENARIOS.length;
      runCycle();
    }, 11500));
  };

  runCycle();
  cleanups.push(clearTimers);
}

function typeText(el, text, speed) {
  let i = 0;
  const tick = () => {
    if (i < text.length) { el.textContent = text.slice(0, ++i); setTimeout(tick, speed); }
  };
  tick();
}

// ── Count-up ─────────────────────────────────────────────────

function setupCountUp(container, cleanups) {
  const el = container.querySelector('#home-dest-count');
  if (!el) return;
  let obs;
  obs = new IntersectionObserver(entries => {
    if (entries[0]?.isIntersecting) {
      obs.disconnect();
      const t0 = performance.now(), dur = 1800;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 200) + '+';
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.3 });
  obs.observe(el);
  cleanups.push(() => obs.disconnect());
}

// ── Creator card flip ────────────────────────────────────────

function setupCreatorFlip(container, cleanups) {
  const cards = container.querySelectorAll('.home-creator-card-wrap');
  const handlers = [];
  cards.forEach(card => {
    const handler = () => {
      const isFlipped = card.classList.contains('is-flipped');
      cards.forEach(c => c.classList.remove('is-flipped'));
      if (!isFlipped) card.classList.add('is-flipped');
    };
    card.addEventListener('click', handler);
    handlers.push(() => card.removeEventListener('click', handler));
  });
  cleanups.push(() => handlers.forEach(fn => fn()));
}

// ── Feature highlight cycle ──────────────────────────────────

function setupFeatCycle(container, cleanups) {
  const items = container.querySelectorAll('.home-feat-item');
  if (!items.length) return;
  let active = 0;
  const interval = setInterval(() => {
    items[active]?.classList.remove('is-active');
    active = (active + 1) % items.length;
    items[active]?.classList.add('is-active');
  }, 3000);
  items.forEach((item, i) => {
    item.addEventListener('mouseenter', () => {
      items[active]?.classList.remove('is-active');
      active = i;
      items[active]?.classList.add('is-active');
    });
  });
  cleanups.push(() => clearInterval(interval));
}
