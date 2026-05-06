// Navbar component
import { navigateTo, getCurrentRoute } from '../router.js';
import { getState } from '../state.js';

export function renderNavbar() {
  const currentRoute = getCurrentRoute();
  const isItineraryPage = currentRoute === 'itinerary';
  
  if (isItineraryPage) {
    return ''; // No navbar on itinerary page
  }
  
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  
  nav.innerHTML = `
    <div class="navbar-inner">
      <div class="navbar-left">
        <button class="brand-button" data-navigate="#/">
          <span class="brand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 12v2a2 2 0 0 1-2 2H9a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h0"/>
              <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-5a2 2 0 0 0-2 2v2"/>
            </svg>
          </span>
        </button>
      </div>
      <div class="navbar-center">
        <div class="nav-links">
          <button class="nav-link ${currentRoute === 'creators' ? 'active' : ''}" data-navigate="#/creators">
            Creators
          </button>
          <button class="nav-link ${currentRoute === 'about' ? 'active' : ''}" data-navigate="#/about">
            What we do
          </button>
          <button class="nav-link ${currentRoute === 'contact' ? 'active' : ''}" data-navigate="#/contact">
            Contact
          </button>
        </div>
      </div>
      <div class="navbar-right">
        <div id="theme-toggle-container"></div>
        ${currentRoute === 'home' ? `
          <div class="cta-group">
            <button class="cta-nav" data-navigate="#/itinerary">
              <span>Start</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Add click handlers
  nav.querySelectorAll('[data-navigate]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const path = button.getAttribute('data-navigate');
      navigateTo(path);
    });
  });
  
  return nav;
}
