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

export function initMap(containerId, destinations = [], options = {}) {
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
    zoom: 1,
    popupDestination: null,
    selectedDestinationId: null,
    addedDestinationIds: new Set(),
    hub: null,
    routeCoordinates: [],
    previewCoordinates: [],
    eventListeners: [],
    baseGroup: null,
    overlayGroup: null,
    popupLayer: null,
    worldGroups: []
  };

  container.classList.add('lite-map');
  container.innerHTML = renderMapShell();
  cacheDomRefs();
  bindMapEvents();

  if (options.geojson) {
    applyGeoJson(options.geojson);
  } else {
    fetch(GEOJSON_URL)
      .then(response => response.json())
      .then(geojson => {
        if (!mapInstance || mapInstance.container !== container) return;
        applyGeoJson(geojson);
      })
      .catch(error => {
        console.warn('Failed to load Catanduanes GeoJSON:', error);
        renderStaticBase();
      });
  }

  renderDynamicLayers();
  return mapInstance;
}

export function addMarkers(destinations = []) {
  if (!mapInstance) return;
  mapInstance.destinations = destinations;
  renderDynamicLayers();
}

export function updateMapState(updates = {}) {
  if (!mapInstance) return;

  if (updates.destinations) mapInstance.destinations = updates.destinations;
  if ('hub' in updates) mapInstance.hub = updates.hub;
  if ('selectedDestinationId' in updates) mapInstance.selectedDestinationId = updates.selectedDestinationId;
  if ('addedDestinationIds' in updates) {
    mapInstance.addedDestinationIds = new Set(updates.addedDestinationIds || []);
  }
  if ('routeCoordinates' in updates) mapInstance.routeCoordinates = updates.routeCoordinates || [];
  if ('previewCoordinates' in updates) mapInstance.previewCoordinates = updates.previewCoordinates || [];
  if ('popupDestination' in updates) mapInstance.popupDestination = updates.popupDestination;

  renderDynamicLayers();
}

export function flyTo() {
  if (!mapInstance) return;
  mapInstance.zoom = 1.22;
  updateZoomTransform();
  renderDynamicLayers();
}

export function resetView() {
  if (!mapInstance) return;
  mapInstance.zoom = 1;
  mapInstance.popupDestination = null;
  updateZoomTransform();
  renderDynamicLayers();
}

export function zoomIn() {
  if (!mapInstance) return;
  mapInstance.zoom = Math.min(mapInstance.zoom + 0.18, 1.9);
  updateZoomTransform();
  renderDynamicLayers();
}

export function zoomOut() {
  if (!mapInstance) return;
  mapInstance.zoom = Math.max(mapInstance.zoom - 0.18, 0.82);
  updateZoomTransform();
  renderDynamicLayers();
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
  updateZoomTransform();
}

function renderMapShell() {
  return `
    <div class="lite-map-stage">
      <svg class="lite-map-svg" viewBox="0 0 ${MAP_VIEWBOX_SIZE} ${MAP_VIEWBOX_SIZE}" role="img" aria-label="Catanduanes map">
        <defs>
          <filter id="lite-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="rgba(15,23,42,0.22)" />
          </filter>
        </defs>
        <rect class="lite-map-sea" width="${MAP_VIEWBOX_SIZE}" height="${MAP_VIEWBOX_SIZE}" />
        <g class="lite-map-world lite-map-base" data-map-base></g>
        <g class="lite-map-world lite-map-overlay" data-map-overlay></g>
      </svg>
      <div class="lite-map-popup-layer" data-map-popup></div>
      <div class="lite-map-attribution">Local GeoJSON map</div>
    </div>
  `;
}

function cacheDomRefs() {
  if (!mapInstance) return;
  mapInstance.baseGroup = mapInstance.container.querySelector('[data-map-base]');
  mapInstance.overlayGroup = mapInstance.container.querySelector('[data-map-overlay]');
  mapInstance.popupLayer = mapInstance.container.querySelector('[data-map-popup]');
  mapInstance.worldGroups = Array.from(mapInstance.container.querySelectorAll('.lite-map-world'));
  updateZoomTransform();
}

function applyGeoJson(geojson) {
  if (!mapInstance) return;
  mapInstance.bounds = padBounds(computeGeoJsonBounds(geojson) || DEFAULT_BOUNDS);
  renderStaticBase(geojson);
  renderDynamicLayers();
}

function renderStaticBase(geojson = null) {
  if (!mapInstance?.baseGroup) return;
  const baseMarkup = geojson?.features?.length
    ? `${renderGeoJson(geojson)}${renderLabels()}`
    : `<path class="lite-map-island" d="${fallbackIslandPath()}" />${renderLabels()}`;

  mapInstance.baseGroup.innerHTML = baseMarkup;
}

function renderDynamicLayers() {
  if (!mapInstance) return;
  if (mapInstance.overlayGroup) {
    mapInstance.overlayGroup.innerHTML = `
      ${renderRouteLine(mapInstance.routeCoordinates, 'lite-map-route-line')}
      ${renderRouteLine(mapInstance.previewCoordinates, 'lite-map-preview-line')}
      ${renderHubMarker(mapInstance.hub)}
      ${renderMarkers(mapInstance.destinations)}
    `;
  }

  if (mapInstance.popupLayer) {
    mapInstance.popupLayer.innerHTML = mapInstance.popupDestination ? renderPopup(mapInstance.popupDestination) : '';
  }
}

function renderGeoJson(geojson) {
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

function renderRouteLine(coordinates = [], className) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
  const points = coordinates
    .map(project)
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');

  return `<polyline class="${className}" points="${points}" vector-effect="non-scaling-stroke" />`;
}

function renderHubMarker(hub) {
  if (!hub?.coordinates || hub.coordinates.length < 2) return '';
  const point = project(hub.coordinates);
  return `
    <g class="lite-map-hub-marker" transform="translate(${point.x} ${point.y})" aria-label="${escapeHtml(hub.name)} hub">
      <circle class="lite-map-hub-halo" r="34" />
      <circle class="lite-map-hub-dot" r="15" />
      <text class="lite-map-hub-label" y="50">${escapeHtml(hub.name)}</text>
    </g>
  `;
}

function renderMarkers(destinations = []) {
  return destinations.map(destination => {
    if (!destination.coordinates || destination.coordinates.length < 2) return '';

    const point = project(destination.coordinates);
    const displayCategory = destination.categoryGroup || destination.displayCategory || destination.category;
    const color = destination.isTop10 || destination.is_top_10
      ? '#ef4444'
      : (CATEGORY_COLORS[displayCategory] || '#3b82f6');
    const isSelected = mapInstance.selectedDestinationId === destination.id;
    const isAdded = mapInstance.addedDestinationIds.has(destination.id);
    const featuredClass = destination.isTop10 || destination.is_top_10 ? ' featured' : '';
    const selectedClass = isSelected ? ' selected' : '';
    const addedClass = isAdded ? ' added' : '';
    const pinSize = destination.isTop10 || destination.is_top_10 ? 1.12 : 1;

    return `
      <g class="lite-map-marker${featuredClass}${selectedClass}${addedClass}" data-destination-id="${escapeHtml(destination.id)}" transform="translate(${point.x} ${point.y}) scale(${pinSize})" tabindex="0" role="button" aria-label="${escapeHtml(destination.name)}">
        <circle class="lite-map-selected-ring" r="40" />
        <path d="M0 -30C18 -30 30 -18 30 0c0 22-30 44-30 44S-30 22-30 0c0-18 12-30 30-30Z" fill="${color}" />
        <path d="M0 -30C18 -30 30 -18 30 0c0 22-30 44-30 44S-30 22-30 0c0-18 12-30 30-30Z" class="lite-map-marker-outline" />
        <circle cx="0" cy="0" r="10" class="lite-map-marker-core" />
        ${featuredClass ? `<text class="lite-map-marker-label" y="61">${escapeHtml(destination.name)}</text>` : ''}
      </g>
    `;
  }).join('');
}

function renderPopup(destination) {
  const point = projectForCurrentZoom(destination.coordinates);
  const left = (point.x / MAP_VIEWBOX_SIZE) * 100;
  const top = (point.y / MAP_VIEWBOX_SIZE) * 100;
  const isAdded = mapInstance.addedDestinationIds.has(destination.id);
  const actionAttr = isAdded ? 'data-popup-remove' : 'data-popup-add';
  const actionText = isAdded ? 'Remove Spot' : 'Add Spot';
  const category = destination.displayCategory || destination.categoryGroup || destination.category || 'Spot';

  return `
    <div class="lite-map-popup" style="left: ${left}%; top: ${top}%;">
      <strong>${escapeHtml(destination.name)}</strong>
      <span>${escapeHtml(category)} - ${escapeHtml(destination.budgetLabel || destination.min_budget || 'low')}</span>
      <button type="button" ${actionAttr}="${escapeHtml(destination.id)}">${actionText}</button>
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
    const addButton = event.target.closest?.('[data-popup-add]');
    const removeButton = event.target.closest?.('[data-popup-remove]');
    const marker = event.target.closest?.('.lite-map-marker');

    if (addButton || removeButton) {
      const destination = findDestination(addButton?.dataset.popupAdd || removeButton?.dataset.popupRemove);
      if (destination) {
        const eventName = addButton ? 'add-to-trip' : 'remove-from-trip';
        document.dispatchEvent(new CustomEvent(eventName, { detail: { destination } }));
        mapInstance.popupDestination = destination;
        renderDynamicLayers();
      }
      return;
    }

    if (marker) {
      const destination = findDestination(marker.dataset.destinationId);
      if (destination) {
        mapInstance.popupDestination = destination;
        document.dispatchEvent(new CustomEvent('select-destination', { detail: { destination } }));
        renderDynamicLayers();
      }
      return;
    }

    if (event.target.closest?.('.lite-map-popup')) return;
    mapInstance.popupDestination = null;
    document.dispatchEvent(new CustomEvent('clear-destination'));
    renderDynamicLayers();
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
      renderDynamicLayers();
    }
  };

  container.addEventListener('click', clickHandler);
  container.addEventListener('keydown', keyHandler);
  mapInstance.eventListeners.push({ element: container, event: 'click', handler: clickHandler });
  mapInstance.eventListeners.push({ element: container, event: 'keydown', handler: keyHandler });
}

function findDestination(destinationId) {
  return mapInstance?.destinations.find(destination => destination.id === destinationId) ||
    (mapInstance?.popupDestination?.id === destinationId ? mapInstance.popupDestination : null);
}

function updateZoomTransform() {
  if (!mapInstance) return;
  const transform = getZoomTransform(mapInstance.zoom);
  mapInstance.worldGroups.forEach(group => {
    group.setAttribute('transform', transform);
  });
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

function projectForCurrentZoom(coordinates) {
  const point = project(coordinates);
  const origin = MAP_VIEWBOX_SIZE / 2;
  const zoom = mapInstance?.zoom || 1;
  return {
    x: origin + ((point.x - origin) * zoom),
    y: origin + ((point.y - origin) * zoom)
  };
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
