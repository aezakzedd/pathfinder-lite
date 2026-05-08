// Main entry point for pathfinder-lite
import { onRouteChange, navigateTo } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderThemeToggle, applyTheme } from './components/theme-toggle.js';
import { renderHome, cleanupHome } from './pages/home.js';
import { renderItinerary, cleanupItinerary } from './pages/itinerary.js';
import { getState } from './state.js';

// Import CSS
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/home.css';
import './styles/itinerary.css';
import './styles/kiosk.css';

// Apply initial theme before rendering
const initialTheme = getState('theme') || 'light';
applyTheme(initialTheme);

const routeLoaders = {
  home: async () => ({ render: renderHome, cleanup: cleanupHome }),
  itinerary: async () => ({ render: renderItinerary, cleanup: cleanupItinerary }),
  last: async () => {
    const [page] = await Promise.all([
      import('./pages/last.js'),
      import('./styles/last.css')
    ]);
    return { render: page.renderLast, cleanup: null };
  },
  about: async () => {
    const [page] = await Promise.all([
      import('./pages/about.js'),
      import('./styles/about.css')
    ]);
    return { render: page.renderAbout, cleanup: null };
  },
  contact: async () => {
    const [page] = await Promise.all([
      import('./pages/contact.js'),
      import('./styles/contact.css')
    ]);
    return { render: page.renderContact, cleanup: null };
  },
  creators: async () => {
    const [page] = await Promise.all([
      import('./pages/creators.js'),
      import('./styles/creators.css')
    ]);
    return { render: page.renderCreators, cleanup: null };
  }
};

// Main app container
const app = document.getElementById('app');

let currentCleanup = null;
let renderVersion = 0;

// Render the app
async function renderApp(routeName) {
  const version = ++renderVersion;

  // Cleanup previous page if needed
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  
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

  const loader = routeLoaders[routeName] || routeLoaders.home;
  const { render, cleanup } = await loader();
  if (version !== renderVersion) return;

  render(pageContainer);
  currentCleanup = cleanup;
  
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
