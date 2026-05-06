// Hash-based router for pathfinder-lite
// Routes: #/, #/itinerary, #/last, #/about, #/contact, #/creators

const routes = {
  '/': 'home',
  '#/': 'home',
  '#/itinerary': 'itinerary',
  '#/last': 'last',
  '#/about': 'about',
  '#/contact': 'contact',
  '#/creators': 'creators'
};

let currentRoute = 'home';
let currentParams = {};

function parseHash() {
  const hash = window.location.hash || '#/';
  const [path, queryString] = hash.split('?');
  const routeName = routes[path] || 'home';
  
  // Parse query parameters
  const params = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return { routeName, params, path };
}

function navigateTo(path, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const hash = queryString ? `${path}?${queryString}` : path;
  window.location.hash = hash;
}

function onRouteChange(callback) {
  const handler = () => {
    const { routeName, params, path } = parseHash();
    if (routeName !== currentRoute || JSON.stringify(params) !== JSON.stringify(currentParams)) {
      currentRoute = routeName;
      currentParams = params;
      callback(routeName, params, path);
    }
  };
  
  window.addEventListener('hashchange', handler);
  window.addEventListener('load', handler);
  
  // Initial call
  handler();
}

function getCurrentRoute() {
  return currentRoute;
}

function getCurrentParams() {
  return currentParams;
}

export { navigateTo, onRouteChange, getCurrentRoute, getCurrentParams, parseHash };
