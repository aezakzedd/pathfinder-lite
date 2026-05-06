// Home page module
export function renderHome(container) {
  container.innerHTML = `
    <div class="page page-home">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="status-badge">
            <span class="status-dot"></span>
            <span>Live · Catanduanes Tourism</span>
          </div>
          <h1 class="headline">
            Discover<br />
            <em>Catanduanes.</em>
          </h1>
          <p class="lead">
            Your AI-powered travel guide to the island of happiness. Explore pristine beaches, hidden waterfalls, and local culture with smart itineraries.
          </p>
          <div class="cta-group">
            <button class="btn-primary" data-navigate="#/itinerary">
              Start Planning
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button class="btn-secondary" data-navigate="#/about">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <!-- Tourism Visual Section -->
      <section class="tourism-section">
        <div class="section-header text-center">
          <span class="section-label">Explore</span>
          <h2 class="section-title">Island Destinations</h2>
          <p class="section-subtitle">From surfing beaches to hidden waterfalls, discover the best of Catanduanes</p>
        </div>
        <div class="carousel-container">
          <div class="carousel-track">
            <div class="carousel-card carousel-card-center">
              <div class="carousel-card-image">
                <div class="carousel-placeholder">
                  <span class="carousel-placeholder-icon">🏄</span>
                  <span class="carousel-placeholder-text">Puraran Beach</span>
                </div>
              </div>
              <div class="carousel-card-content">
                <span class="carousel-tag">Surf · P50-300</span>
                <h3>Puraran Beach</h3>
                <p>Famous for its "Majestic" waves on the east coast. An iconic destination for surfers worldwide.</p>
              </div>
            </div>
            <div class="carousel-card carousel-card-left">
              <div class="carousel-card-image">
                <div class="carousel-placeholder">
                  <span class="carousel-placeholder-icon">🥾</span>
                  <span class="carousel-placeholder-text">Binurong Point</span>
                </div>
              </div>
              <div class="carousel-card-content">
                <span class="carousel-tag">Hike · P50-200</span>
                <h3>Binurong Point</h3>
                <p>Breathtaking journey through rolling pastoral hills built for discovery.</p>
              </div>
            </div>
            <div class="carousel-card carousel-card-right">
              <div class="carousel-card-image">
                <div class="carousel-placeholder">
                  <span class="carousel-placeholder-icon">🏖️</span>
                  <span class="carousel-placeholder-text">Twin Rock</span>
                </div>
              </div>
              <div class="carousel-card-content">
                <span class="carousel-tag">Beach · P100-500</span>
                <h3>Twin Rock Beach Resort</h3>
                <p>Perfect for families with calm waters and rock formations. Ideal for kayaking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Bento Feature Cards -->
      <section class="bento-section">
        <div class="section-header text-center">
          <span class="section-label">Features</span>
          <h2 class="section-title">Smart Travel Tools</h2>
          <p class="section-subtitle">Everything you need for the perfect island adventure</p>
        </div>
        <div class="bento-grid">
          <div class="bento-card">
            <div class="bento-card-icon">🤖</div>
            <h3 class="bento-card-title">AI Tourism Assistant</h3>
            <p class="bento-card-description">Chat with our AI to get personalized recommendations, local tips, and real-time guidance.</p>
          </div>
          <div class="bento-card">
            <div class="bento-card-icon">🗺️</div>
            <h3 class="bento-card-title">Interactive Map Board</h3>
            <p class="bento-card-description">Explore destinations with an interactive map featuring points of interest and routes.</p>
          </div>
          <div class="bento-card">
            <div class="bento-card-icon">📋</div>
            <h3 class="bento-card-title">Itinerary Planning</h3>
            <p class="bento-card-description">Build custom itineraries based on your interests, time, and budget preferences.</p>
          </div>
          <div class="bento-card">
            <div class="bento-card-icon">🔍</div>
            <h3 class="bento-card-title">Local Discovery</h3>
            <p class="bento-card-description">Find hidden gems and local favorites that tourists often miss.</p>
          </div>
          <div class="bento-card">
            <div class="bento-card-icon">📱</div>
            <h3 class="bento-card-title">QR/PDF Sharing</h3>
            <p class="bento-card-description">Share your itinerary instantly via QR code or download as PDF.</p>
          </div>
          <div class="bento-card">
            <div class="bento-card-icon">🖥️</div>
            <h3 class="bento-card-title">Raspberry Pi Kiosk</h3>
            <p class="bento-card-description">Deploy as a touch-screen kiosk for tourism centers and hotels.</p>
          </div>
        </div>
      </section>

      <!-- Stats Strip -->
      <section class="stats-section">
        <div class="stats-strip">
          <div class="stat">
            <span class="stat-value">11</span>
            <span class="stat-label">Municipalities</span>
          </div>
          <div class="stat">
            <span class="stat-value">200+</span>
            <span class="stat-label">Destinations</span>
          </div>
          <div class="stat">
            <span class="stat-value">Offline</span>
            <span class="stat-label">Ready</span>
          </div>
          <div class="stat">
            <span class="stat-value">Touch</span>
            <span class="stat-label">First</span>
          </div>
        </div>
      </section>

      <!-- CTA Footer Section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2 class="cta-title">Ready to Explore?</h2>
          <p class="cta-subtitle">Start planning your Catanduanes adventure today with AI-powered guidance.</p>
          <button class="btn-primary btn-large" data-navigate="#/itinerary">
            Begin Your Journey
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  `;
}
