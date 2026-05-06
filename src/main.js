// Main entry point for pathfinder-lite
import { onRouteChange, navigateTo } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderThemeToggle } from './components/theme-toggle.js';
import { renderHome } from './pages/home.js';
import { renderItinerary } from './pages/itinerary.js';
import { renderLast } from './pages/last.js';
import { renderAbout } from './pages/about.js';
import { renderContact } from './pages/contact.js';
import { renderCreators } from './pages/creators.js';

// Import CSS
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/home.css';
import './styles/itinerary.css';
import './styles/last.css';
import './styles/about.css';
import './styles/contact.css';
import './styles/creators.css';
import './styles/kiosk.css';

// Page renderers map
const pageRenderers = {
  home: renderHome,
  itinerary: renderItinerary,
  last: renderLast,
  about: renderAbout,
  contact: renderContact,
  creators: renderCreators
};

// Main app container
const app = document.getElementById('app');

// Render the app
function renderApp(routeName) {
  // Clear app
  app.innerHTML = '';
  
  // Render navbar (except on itinerary page)
  const navbar = renderNavbar();
  if (navbar) {
    app.appendChild(navbar);
  }
  
  // Render page content
  const pageContainer = document.createElement('div');
  pageContainer.className = 'page-container';
  
  // Append to DOM before rendering so DOM queries work
  app.appendChild(pageContainer);
  
  const renderer = pageRenderers[routeName] || pageRenderers.home;
  renderer(pageContainer);
  
  // Render theme toggle in navbar
  const themeToggleContainer = document.getElementById('theme-toggle-container');
  if (themeToggleContainer) {
    const themeToggle = renderThemeToggle();
    themeToggleContainer.appendChild(themeToggle);
  }
  
  // Add page transition
  pageContainer.style.opacity = '0';
  pageContainer.style.transform = 'translateY(20px)';
  
  requestAnimationFrame(() => {
    pageContainer.style.transition = 'opacity 300ms ease, transform 300ms ease';
    pageContainer.style.opacity = '1';
    pageContainer.style.transform = 'translateY(0)';
  });
}

// Initialize router
onRouteChange((routeName) => {
  renderApp(routeName);
  document.body.setAttribute('data-route', routeName);
});

// Add global click handler for data-navigate attributes
document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-navigate]');
  if (button) {
    e.preventDefault();
    const path = button.getAttribute('data-navigate');
    navigateTo(path);
  }
});
