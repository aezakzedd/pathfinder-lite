const MAP_VIEWBOX_SIZE = 1000;
const GEOJSON_URL = '/data/catanduanes_datafile.geojson';
const DEFAULT_BOUNDS = {
  minLng: 123.92,
  maxLng: 124.56,
  minLat: 13.42,
  maxLat: 14.16
};
const BOUNDS_PADDING_RATIO = 0.08;

const CATEGORY_COLORS = {
  Water: '#3b82f6',
  Views: '#8b5cf6',
  Outdoor: '#10b981',
  Heritage: '#f59e0b',
  Dining: '#ef4444',
  Stay: '#6366f1'
};

const MAP_LABELS = [
  { name: 'Pandan', coordinates: [124.17, 14.05] },
  { name: 'Caramoran', coordinates: [124.07, 13.98] },
  { name: 'Bagamanoc', coordinates: [124.31, 13.94] },
  { name: 'Panganiban', coordinates: [124.29, 13.89] },
  { name: 'Viga', coordinates: [124.30, 13.84] },
  { name: 'Gigmoto', coordinates: [124.39, 13.78] },
  { name: 'Baras', coordinates: [124.35, 13.65] },
  { name: 'Bato', coordinates: [124.28, 13.61] },
  { name: 'San Andres', coordinates: [124.10, 13.60] },
  { name: 'Virac', coordinates: [124.23, 13.58] }
];

let mapInstance = null;

export function initMap(containerId, destinations = []) {
  destroyMap();

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Map container with id "${containerId}" not found`);
    return null;
  }

  mapInstance = {
    container,
    destinations,
    bounds: DEFAULT_BOUNDS,
    geojsonMarkup: '',
    labelMarkup: '',
    zoom: 1,
    popupDestination: null,
    eventListeners: []
  };

  container.classList.add('lite-map');
  container.innerHTML = renderMapShell(destinations, mapInstance.zoom);
  bindMapEvents();

  fetch(GEOJSON_URL)
    .then(response => response.json())
    .then(geojson => {
      if (!mapInstance || mapInstance.container !== container) return;
      mapInstance.bounds = padBounds(computeGeoJsonBounds(geojson) || DEFAULT_BOUNDS);
      mapInstance.geojsonMarkup = renderGeoJson(geojson);
      mapInstance.labelMarkup = renderLabels();
      renderMap();
    })
    .catch(error => {
      console.warn('Failed to load Catanduanes GeoJSON:', error);
    });

  return mapInstance;
}

export function addMarkers(destinations = []) {
  if (!mapInstance) return;
  mapInstance.destinations = destinations;
  renderMap();
}

export function flyTo() {
  if (!mapInstance) return;
  mapInstance.zoom = 1.22;
  renderMap();
}

export function resetView() {
  if (!mapInstance) return;
  mapInstance.zoom = 1;
  mapInstance.popupDestination = null;
  renderMap();
}

export function zoomIn() {
  if (!mapInstance) return;
  mapInstance.zoom = Math.min(mapInstance.zoom + 0.18, 1.9);
  renderMap();
}

export function zoomOut() {
  if (!mapInstance) return;
  mapInstance.zoom = Math.max(mapInstance.zoom - 0.18, 0.82);
  renderMap();
}

export function getMap() {
  return mapInstance;
}

export function destroyMap() {
  if (!mapInstance) return;

  mapInstance.eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  mapInstance.container.classList.remove('lite-map');
  mapInstance.container.innerHTML = '';
  mapInstance = null;
}

export function invalidateSize() {
  renderMap();
}

function renderMap() {
  if (!mapInstance) return;
  mapInstance.container.innerHTML = renderMapShell(
    mapInstance.destinations,
    mapInstance.zoom,
    mapInstance.popupDestination
  );
  bindMapEvents();
}

function renderMapShell(destinations, zoom, popupDestination = null) {
  const geojsonMarkup = mapInstance?.geojsonMarkup || `<path class="lite-map-island" d="${fallbackIslandPath()}" />`;
  const labelMarkup = mapInstance?.labelMarkup || renderLabels();

  return `
    <div class="lite-map-stage">
      <svg class="lite-map-svg" viewBox="0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}" role="img" aria-label="Catanduanes map">
        <defs>
          <filter id="lite-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="rgba(15,23,42,0.22)" />
          </filter>
        </defs>
        <rect class="lite-map-sea" width="${MAP_VIEWBOX_SIZE}" height="${MAP_VIEWBOX_SIZE}" />
        <g class="lite-map-world" transform="${getZoomTransform(zoom)}">
          ${geojsonMarkup}
          ${labelMarkup}
          ${renderMarkers(destinations)}
        </g>
      </svg>
      ${popupDestination ? renderPopup(popupDestination) : ''}
      <div class="lite-map-attribution">Local GeoJSON map</div>
    </div>
  `;
}

function renderGeoJson(geojson) {
  if (!geojson?.features?.length) {
    return `<path class="lite-map-island" d="${fallbackIslandPath()}" />`;
  }

  return geojson.features.map(feature => {
    const geometry = feature.geometry;
    if (!geometry) return '';

    if (geometry.type === 'Polygon') {
      return `<path class="lite-map-island" d="${polygonToPath(geometry.coordinates)}" />`;
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates
        .map(polygon => `<path class="lite-map-island" d="${polygonToPath(polygon)}" />`)
        .join('');
    }

    if (geometry.type === 'LineString') {
      return `<path class="lite-map-boundary" d="${lineToPath(geometry.coordinates)}" />`;
    }

    return '';
  }).join('');
}

function renderLabels() {
  return MAP_LABELS.map(label => {
    const point = project(label.coordinates);
    return `
      <text class="lite-map-label" x="${point.x}" y="${point.y}">
        ${escapeHtml(label.name)}
      </text>
    `;
  }).join('');
}

function renderMarkers(destinations = []) {
  return destinations.map(destination => {
    if (!destination.coordinates || destination.coordinates.length < 2) return '';

    const point = project(destination.coordinates);
    const color = CATEGORY_COLORS[destination.category] || '#3b82f6';

    return `
      <g class="lite-map-marker" data-destination-id="${escapeHtml(destination.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${escapeHtml(destination.name)}">
        <path d="M0 -30C18 -30 30 -18 30 0c0 22-30 44-30 44S-30 22-30 0c0-18 12-30 30-30Z" fill="${color}" />
        <path d="M0 -30C18 -30 30 -18 30 0c0 22-30 44-30 44S-30 22-30 0c0-18 12-30 30-30Z" class="lite-map-marker-outline" />
        <circle cx="0" cy="0" r="10" class="lite-map-marker-core" />
      </g>
    `;
  }).join('');
}

function renderPopup(destination) {
  const point = project(destination.coordinates);
  const left = (point.x / MAP_VIEWBOX_SIZE) * 100;
  const top = (point.y / MAP_VIEWBOX_SIZE) * 100;

  return `
    <div class="lite-map-popup" style="left: ${left}%; top: ${top}%;">
      <strong>${escapeHtml(destination.name)}</strong>
      <span>${escapeHtml(destination.category)} - ${escapeHtml(destination.estimatedTime || '1 hour')}</span>
      <button type="button" data-popup-add="${escapeHtml(destination.id)}">Add Spot</button>
    </div>
  `;
}

function bindMapEvents() {
  if (!mapInstance) return;

  const { container } = mapInstance;
  mapInstance.eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  mapInstance.eventListeners = [];

  const clickHandler = event => {
    const marker = event.target.closest?.('.lite-map-marker');
    const addButton = event.target.closest?.('[data-popup-add]');

    if (addButton) {
      const destination = findDestination(addButton.dataset.popupAdd);
      if (destination) {
        document.dispatchEvent(new CustomEvent('add-to-trip', { detail: { destination } }));
        mapInstance.popupDestination = null;
        renderMap();
      }
      return;
    }

    if (marker) {
      const destination = findDestination(marker.dataset.destinationId);
      if (destination) {
        mapInstance.popupDestination = destination;
        document.dispatchEvent(new CustomEvent('select-destination', { detail: { destination } }));
        renderMap();
      }
      return;
    }

    if (event.target.closest?.('.lite-map-popup')) return;
    mapInstance.popupDestination = null;
    renderMap();
  };

  const keyHandler = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const marker = event.target.closest?.('.lite-map-marker');
    if (!marker) return;

    event.preventDefault();
    const destination = findDestination(marker.dataset.destinationId);
    if (destination) {
      mapInstance.popupDestination = destination;
      document.dispatchEvent(new CustomEvent('select-destination', { detail: { destination } }));
      renderMap();
    }
  };

  container.addEventListener('click', clickHandler);
  container.addEventListener('keydown', keyHandler);
  mapInstance.eventListeners.push({ element: container, event: 'click', handler: clickHandler });
  mapInstance.eventListeners.push({ element: container, event: 'keydown', handler: keyHandler });
}

function findDestination(destinationId) {
  return mapInstance?.destinations.find(destination => destination.id === destinationId);
}

function getZoomTransform(zoom) {
  const origin = MAP_VIEWBOX_SIZE / 2;
  return `translate(${origin} ${origin}) scale(${zoom}) translate(${-origin} ${-origin})`;
}

function polygonToPath(rings = []) {
  return rings.map(ring => `${lineToPath(ring)} Z`).join(' ');
}

function lineToPath(coordinates = []) {
  return coordinates.map((coordinate, index) => {
    const point = project(coordinate);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(' ');
}

function fallbackIslandPath() {
  return lineToPath([
    [124.08, 14.12],
    [124.28, 14.08],
    [124.47, 13.86],
    [124.39, 13.61],
    [124.20, 13.47],
    [124.01, 13.61],
    [123.99, 13.90],
    [124.08, 14.12]
  ]);
}

function project([lng, lat]) {
  const bounds = mapInstance?.bounds || DEFAULT_BOUNDS;
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const x = ((lng - bounds.minLng) / lngSpan) * MAP_VIEWBOX_SIZE;
  const y = ((bounds.maxLat - lat) / latSpan) * MAP_VIEWBOX_SIZE;
  return { x, y };
}

function computeGeoJsonBounds(geojson) {
  const bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  };

  geojson?.features?.forEach(feature => {
    visitCoordinates(feature.geometry?.coordinates, bounds);
  });

  return Number.isFinite(bounds.minLng) ? bounds : null;
}

function visitCoordinates(coordinates, bounds) {
  if (!Array.isArray(coordinates)) return;

  if (isCoordinatePair(coordinates)) {
    const [lng, lat] = coordinates;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    return;
  }

  coordinates.forEach(child => visitCoordinates(child, bounds));
}

function isCoordinatePair(coordinates) {
  return typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number';
}

function padBounds(bounds) {
  const lngPadding = Math.max((bounds.maxLng - bounds.minLng) * BOUNDS_PADDING_RATIO, 0.01);
  const latPadding = Math.max((bounds.maxLat - bounds.minLat) * BOUNDS_PADDING_RATIO, 0.01);

  return {
    minLng: bounds.minLng - lngPadding,
    maxLng: bounds.maxLng + lngPadding,
    minLat: bounds.minLat - latPadding,
    maxLat: bounds.maxLat + latPadding
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
