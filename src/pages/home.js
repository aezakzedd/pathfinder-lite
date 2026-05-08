// Original Pathfinder-style home page, rebuilt with vanilla JS and CSS.

const HOME_SLIDES = [
  {
    name: 'Binurong Point',
    image: '/images/original/home-binurong-point.webp',
    alt: 'Binurong Point coastal hills'
  },
  {
    name: 'Puraran Beach',
    image: '/images/original/home-puraran-beach.webp',
    alt: 'Puraran Beach surf coast'
  },
  {
    name: 'Palumbanes Island',
    image: '/images/original/home-palumbanes-island.webp',
    alt: 'Palumbanes Island coastline'
  },
  {
    name: 'Boto ni Kurakog',
    image: '/images/original/home-boto-ni-kurakog.webp',
    alt: 'Boto ni Kurakog rock formation'
  }
];

let homeCleanup = null;

export function renderHome(container) {
  cleanupHome();

  container.innerHTML = `
    <div class="page page-home">
      <div class="home-ambient" aria-hidden="true"></div>
      <div class="home-starfield" aria-hidden="true"></div>
      <div class="home-edge-vignette" aria-hidden="true"></div>

      <main class="home-shell">
        <section class="home-hero" aria-labelledby="home-headline">
          <div class="home-metadata scroll-reveal">
            <span>PATHFINDER // v1.0.21</span>
            <svg class="home-metadata-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3L11 9.999" />
              <path d="M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024" />
              <path d="M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069" />
              <path d="M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z" />
            </svg>
          </div>

          <h1 class="home-headline scroll-reveal" id="home-headline">
            Explore with<br>
            <span>every click.</span>
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
            <button class="home-secondary-cta" type="button" data-navigate="#/contact">
              Work with us
            </button>
          </div>

          <div class="home-badges scroll-reveal" aria-label="Project partner marks">
            <img src="/images/original/card-badges.webp" alt="Pathfinder partner badges" draggable="false">
          </div>
        </section>

        <section class="home-carousel scroll-reveal" aria-label="Featured Catanduanes destinations">
          <div class="home-carousel-stage">
            ${HOME_SLIDES.map((slide, index) => `
              <article class="home-carousel-card" data-slide-index="${index}" aria-label="${slide.name}">
                <img src="${slide.image}" alt="${slide.alt}" draggable="false">
                <span class="home-carousel-label">${slide.name}</span>
              </article>
            `).join('')}
          </div>
          <div class="home-carousel-controls" aria-label="Carousel controls">
            <button type="button" class="home-carousel-button home-carousel-prev" aria-label="Previous destination">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div class="home-carousel-dots" aria-label="Carousel position">
              ${HOME_SLIDES.map((slide, index) => `
                <button type="button" class="home-carousel-dot" data-slide-dot="${index}" aria-label="Show ${slide.name}"></button>
              `).join('')}
            </div>
            <button type="button" class="home-carousel-button home-carousel-next" aria-label="Next destination">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        <section class="home-scroll-grid" id="what-we-do" aria-label="Pathfinder capabilities">
          <aside class="home-scroll-copy scroll-reveal">
            <span>AI-Powered Guide</span>
            <h2>Ask, pin, and plan without leaving the map.</h2>
            <p>Chat with Pathfinder to build custom multi-day itineraries, pin destinations, and get grounded local recommendations from verified Catanduanes data.</p>
          </aside>

          <div class="home-guide-showcase scroll-reveal">
            <div class="home-map-card">
              <img src="/images/original/card-map.webp" alt="Pathfinder map view" draggable="false">
              <span class="home-guide-pin home-guide-pin-a">Puraran</span>
              <span class="home-guide-pin home-guide-pin-b">Binurong Point</span>
              <span class="home-guide-pin home-guide-pin-c">Twin Rock</span>
              <div class="home-chat-float">
                <span>Welcome to the island</span>
                <strong>Find beaches near Virac with a low budget.</strong>
                <p>Try Puraran, Twin Rock, and Mamangal Beach first. I can turn them into a day plan.</p>
              </div>
            </div>
          </div>

          <aside class="home-scroll-copy scroll-reveal">
            <span>What's Beyond</span>
            <h2>200+ destinations, grouped for real visitor decisions.</h2>
            <p>Beaches, falls, viewpoints, heritage sites, food, and stays are ranked by local attributes so the kiosk can recommend practical routes instead of random lists.</p>
          </aside>

          <div class="home-prism-grid scroll-reveal">
            <article class="home-prism-card home-prism-wide">
              <img src="/images/original/prism-surf.webp" alt="Puraran surfing coastline" draggable="false">
              <div>
                <span>Surf coast</span>
                <strong>Puraran</strong>
              </div>
            </article>
            <article class="home-prism-card">
              <img src="/images/original/prism-abaca.webp" alt="Abaca heritage" draggable="false">
              <div>
                <span>Local craft</span>
                <strong>Abaca</strong>
              </div>
            </article>
            <article class="home-prism-card">
              <img src="/images/original/prism-binu.webp" alt="Binurong Point" draggable="false">
              <div>
                <span>Viewpoint</span>
                <strong>Binurong</strong>
              </div>
            </article>
            <article class="home-prism-stat">
              <strong>11</strong>
              <span>municipalities</span>
            </article>
            <article class="home-prism-stat">
              <strong>200+</strong>
              <span>destinations</span>
            </article>
          </div>

          <aside class="home-scroll-copy scroll-reveal">
            <span>Work With Us</span>
            <h2>Open, local-first tourism infrastructure.</h2>
            <p>Pathfinder is designed to stay transparent: a small web frontend, local data, and offline-capable backend services that can run on modest kiosk hardware.</p>
          </aside>

          <div class="home-open-card scroll-reveal">
            <div class="home-open-card-top">
              <img src="/images/original/creator-tan.webp" alt="Pathfinder contributor" draggable="false">
              <div>
                <span>Open source</span>
                <strong>bikemaster2331/pathfinder</strong>
              </div>
            </div>
            <ul>
              <li>RAG AI foundation</li>
              <li>Dynamic maps and routes</li>
              <li>Verified Catanduanes data</li>
              <li>Raspberry Pi kiosk target</li>
            </ul>
            <button type="button" class="home-secondary-cta home-open-link" data-navigate="#/creators">Meet the team</button>
          </div>
        </section>

        <footer class="home-footer scroll-reveal">
          <span>Catanduanes, PH</span>
          <span>v1.0.21</span>
          <a href="https://github.com/bikemaster2331/pathfinder" target="_blank" rel="noopener noreferrer">GitHub &nearr;</a>
          <span>2026</span>
        </footer>
      </main>
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

function setupHomePage(container) {
  const cards = Array.from(container.querySelectorAll('.home-carousel-card'));
  const dots = Array.from(container.querySelectorAll('.home-carousel-dot'));
  const prevButton = container.querySelector('.home-carousel-prev');
  const nextButton = container.querySelector('.home-carousel-next');
  const carousel = container.querySelector('.home-carousel');
  let activeIndex = 0;
  let intervalId = null;
  let observer = null;

  const renderCarousel = () => {
    const lastIndex = cards.length - 1;

    cards.forEach((card, index) => {
      card.classList.remove('is-active', 'is-left', 'is-right', 'is-hidden');

      if (index === activeIndex) {
        card.classList.add('is-active');
      } else if (index === (activeIndex + lastIndex) % cards.length) {
        card.classList.add('is-left');
      } else if (index === (activeIndex + 1) % cards.length) {
        card.classList.add('is-right');
      } else {
        card.classList.add('is-hidden');
      }
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex);
      dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    });
  };

  const goTo = (nextIndex) => {
    activeIndex = (nextIndex + cards.length) % cards.length;
    renderCarousel();
  };

  const startAuto = () => {
    stopAuto();
    intervalId = window.setInterval(() => goTo(activeIndex + 1), 6500);
  };

  const stopAuto = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const handlePrev = () => goTo(activeIndex - 1);
  const handleNext = () => goTo(activeIndex + 1);
  const dotHandlers = dots.map((dot, index) => {
    const handler = () => goTo(index);
    dot.addEventListener('click', handler);
    return { dot, handler };
  });

  prevButton?.addEventListener('click', handlePrev);
  nextButton?.addEventListener('click', handleNext);
  carousel?.addEventListener('pointerenter', stopAuto);
  carousel?.addEventListener('pointerleave', startAuto);

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    container.querySelectorAll('.scroll-reveal').forEach((element) => observer.observe(element));
  } else {
    container.querySelectorAll('.scroll-reveal').forEach((element) => element.classList.add('is-visible'));
  }

  renderCarousel();
  startAuto();

  return () => {
    stopAuto();
    observer?.disconnect();
    prevButton?.removeEventListener('click', handlePrev);
    nextButton?.removeEventListener('click', handleNext);
    carousel?.removeEventListener('pointerenter', stopAuto);
    carousel?.removeEventListener('pointerleave', startAuto);
    dotHandlers.forEach(({ dot, handler }) => dot.removeEventListener('click', handler));
  };
}
