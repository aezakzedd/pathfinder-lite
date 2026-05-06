const GEOJSON_URL = '/data/catanduanes_datafile.geojson';
const LOCAL_TILE_URL = '/tiles/{z}/{x}/{y}.png';
const DEFAULT_CENTER = [13.75, 124.25];
const DEFAULT_ZOOM = 10;
const DEFAULT_MAX_BOUNDS = [
  [13.32, 123.78],
  [14.24, 124.72]
];

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

let leafletPromise = null;
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
    geojson: options.geojson || null,
    ready: false,
    L: null,
    map: null,
    baseLayer: null,
    boundaryLayer: null,
    markerLayer: null,
    routeLayer: null,
    previewLayer: null,
    hubLayer: null,
    labelLayer: null,
    routeRenderer: null,
    popupDestination: null,
    selectedDestinationId: null,
    addedDestinationIds: new Set(),
    hub: null,
    routeCoordinates: [],
    previewCoordinates: [],
    bounds: null,
    initId: Date.now(),
    popupClickHandler: null
  };

  container.innerHTML = '';
  container.classList.add('leaflet-offline-map');

  setupLeafletMap(mapInstance, options).catch(error => {
    console.error('Failed to initialize offline Leaflet map:', error);
    renderMapError(container);
  });

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

export function zoomIn() {
  if (!mapInstance?.map) return;
  mapInstance.map.zoomIn(1);
}

export function zoomOut() {
  if (!mapInstance?.map) return;
  mapInstance.map.zoomOut(1);
}

export function resetView() {
  if (!mapInstance?.map) return;
  fitToCatanduanes(mapInstance);
}

export function invalidateSize() {
  if (!mapInstance?.map) return;
  mapInstance.map.invalidateSize({ pan: false });
}

export function getMap() {
  return mapInstance?.map || null;
}

export function destroyMap() {
  if (!mapInstance) return;

  if (mapInstance.map) {
    mapInstance.map.off();
    mapInstance.map.remove();
  }

  if (mapInstance.popupClickHandler) {
    mapInstance.container.removeEventListener('click', mapInstance.popupClickHandler);
  }

  mapInstance.container.classList.remove('leaflet-offline-map');
  delete mapInstance.container.__pathfinderLeafletMap;
  mapInstance.container.innerHTML = '';
  mapInstance = null;
}

export async function requestRouteGeometry(waypoints = []) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return null;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), 1200) : null;

  try {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints }),
      signal: controller?.signal
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

async function setupLeafletMap(instance, options) {
  const L = await loadLeaflet();
  if (mapInstance !== instance) return;

  instance.L = L;
  instance.map = L.map(instance.container, {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
    minZoom: 9,
    maxZoom: 15,
    zoomSnap: 0.25,
    wheelDebounceTime: 80,
    maxBoundsViscosity: 0.85
  });
  instance.container.__pathfinderLeafletMap = instance.map;

  instance.markerLayer = L.layerGroup().addTo(instance.map);
  instance.routeLayer = L.layerGroup().addTo(instance.map);
  instance.previewLayer = L.layerGroup().addTo(instance.map);
  instance.hubLayer = L.layerGroup().addTo(instance.map);
  instance.labelLayer = L.layerGroup().addTo(instance.map);
  instance.routeRenderer = L.svg({ padding: 0.5 });

  bindMapEvents(instance);
  addLocalTileLayerIfAvailable(instance);

  const geojson = options.geojson || await fetchGeoJson();
  if (mapInstance !== instance) return;

  instance.geojson = geojson;
  renderGeoJsonBase(instance, geojson);
  renderMunicipalityLabels(instance);
  fitToCatanduanes(instance);
  instance.ready = true;
  renderDynamicLayers();
  window.requestAnimationFrame(() => invalidateSize());
}

async function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then(module => module.default || module);
  }
  return leafletPromise;
}

async function fetchGeoJson() {
  const response = await fetch(GEOJSON_URL);
  if (!response.ok) {
    throw new Error(`Unable to load ${GEOJSON_URL}`);
  }
  return response.json();
}

async function addLocalTileLayerIfAvailable(instance) {
  const tileUrl = await findAvailableLocalTile();
  if (!tileUrl || mapInstance !== instance || !instance.map) return;

  instance.baseLayer = instance.L.tileLayer(LOCAL_TILE_URL, {
    minZoom: 8,
    maxZoom: 15,
    noWrap: true,
    detectRetina: false,
    updateWhenIdle: true,
    keepBuffer: 1
  }).addTo(instance.map);
}

async function findAvailableLocalTile() {
  if (typeof fetch !== 'function') return null;

  const candidates = [
    '/tiles/0/0/0.png',
    getCenterTileUrl(8),
    getCenterTileUrl(9),
    getCenterTileUrl(10),
    getCenterTileUrl(11),
    getCenterTileUrl(12)
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.startsWith('image/')) return url;
    } catch {
      return null;
    }
  }

  return null;
}

function getCenterTileUrl(zoom) {
  const [lat, lng] = DEFAULT_CENTER;
  const latRad = lat * Math.PI / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2 * n);
  return `/tiles/${zoom}/${x}/${y}.png`;
}

function renderGeoJsonBase(instance, geojson) {
  const L = instance.L;
  const baseFeatures = {
    type: 'FeatureCollection',
    features: (geojson?.features || []).filter(feature => feature.geometry?.type !== 'Point')
  };

  if (instance.boundaryLayer) {
    instance.map.removeLayer(instance.boundaryLayer);
  }

  instance.boundaryLayer = L.geoJSON(baseFeatures, {
    interactive: false,
    renderer: L.canvas({ padding: 0.35 }),
    style: feature => styleBaseFeature(feature)
  }).addTo(instance.map);

  const bounds = instance.boundaryLayer.getBounds();
  instance.bounds = bounds.isValid() ? bounds : L.latLngBounds(DEFAULT_MAX_BOUNDS);
}

function styleBaseFeature(feature) {
  const type = feature.geometry?.type;
  const isLine = type === 'LineString' || type === 'MultiLineString';

  if (isLine) {
    return {
      color: 'rgba(15, 23, 42, 0.35)',
      weight: 1.4,
      opacity: 0.75,
      dashArray: '5 7'
    };
  }

  return {
    color: 'rgba(15, 23, 42, 0.58)',
    weight: 1.35,
    opacity: 0.95,
    fillColor: '#edf3ed',
    fillOpacity: 0.92
  };
}

function renderMunicipalityLabels(instance) {
  if (!instance.labelLayer) return;
  instance.labelLayer.clearLayers();

  MAP_LABELS.forEach(label => {
    instance.L.marker(toLatLng(label.coordinates), {
      interactive: false,
      icon: instance.L.divIcon({
        className: 'offline-map-label',
        html: escapeHtml(label.name),
        iconSize: [120, 22],
        iconAnchor: [60, 11]
      })
    }).addTo(instance.labelLayer);
  });
}

function fitToCatanduanes(instance) {
  if (!instance?.map) return;

  const bounds = instance.bounds?.isValid?.()
    ? instance.bounds
    : instance.L.latLngBounds(DEFAULT_MAX_BOUNDS);
  const paddedMaxBounds = bounds.pad(0.28);

  instance.map.setMaxBounds(paddedMaxBounds);
  instance.map.fitBounds(bounds.pad(0.08), {
    animate: false,
    padding: [24, 24]
  });
}

function renderDynamicLayers() {
  if (!mapInstance?.ready || !mapInstance.map) return;

  renderRouteLayer();
  renderPreviewLayer();
  renderHubLayer();
  renderMarkerLayer();
  syncPopup();
}

function renderRouteLayer() {
  const instance = mapInstance;
  instance.routeLayer.clearLayers();

  const latLngs = coordinatesToLatLngs(instance.routeCoordinates);
  if (latLngs.length < 2) return;

  instance.L.polyline(latLngs, {
    renderer: instance.routeRenderer,
    className: 'offline-route-line',
    color: '#12b7d4',
    weight: 5,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(instance.routeLayer);
}

function renderPreviewLayer() {
  const instance = mapInstance;
  instance.previewLayer.clearLayers();

  const latLngs = coordinatesToLatLngs(instance.previewCoordinates);
  if (latLngs.length < 2) return;

  instance.L.polyline(latLngs, {
    renderer: instance.routeRenderer,
    className: 'offline-preview-line',
    color: '#f59e0b',
    weight: 4,
    opacity: 0.88,
    dashArray: '10 10',
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(instance.previewLayer);
}

function renderHubLayer() {
  const instance = mapInstance;
  instance.hubLayer.clearLayers();

  if (!instance.hub?.coordinates) return;

  instance.L.marker(toLatLng(instance.hub.coordinates), {
    interactive: false,
    zIndexOffset: 850,
    icon: instance.L.divIcon({
      className: 'offline-hub-marker',
      html: `
        <span class="offline-hub-halo"></span>
        <span class="offline-hub-dot"></span>
        <span class="offline-hub-label">${escapeHtml(instance.hub.name)}</span>
      `,
      iconSize: [88, 88],
      iconAnchor: [44, 44]
    })
  }).addTo(instance.hubLayer);
}

function renderMarkerLayer() {
  const instance = mapInstance;
  instance.markerLayer.clearLayers();

  instance.destinations.forEach(destination => {
    if (!isValidCoordinate(destination.coordinates)) return;

    const isSelected = instance.selectedDestinationId === destination.id;
    const isAdded = instance.addedDestinationIds.has(destination.id);
    const isFeatured = Boolean(destination.isTop10 || destination.is_top_10);
    const marker = instance.L.marker(toLatLng(destination.coordinates), {
      title: destination.name,
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: isSelected ? 900 : (isFeatured ? 500 : 0),
      icon: createDestinationIcon(instance, destination, { isSelected, isAdded, isFeatured })
    });

    marker.on('click', event => {
      if (event.originalEvent) {
        instance.L.DomEvent.stopPropagation(event.originalEvent);
      }
      instance.popupDestination = destination;
      document.dispatchEvent(new CustomEvent('select-destination', { detail: { destination } }));
      openDestinationPopup(destination, marker);
    });

    marker.addTo(instance.markerLayer);
  });
}

function createDestinationIcon(instance, destination, state) {
  const category = destination.categoryGroup || destination.displayCategory || destination.category;
  const color = state.isFeatured ? '#ef4444' : (CATEGORY_COLORS[category] || '#3b82f6');
  const classNames = [
    'offline-destination-marker',
    state.isFeatured ? 'featured' : '',
    state.isSelected ? 'selected' : '',
    state.isAdded ? 'added' : ''
  ].filter(Boolean).join(' ');

  return instance.L.divIcon({
    className: classNames,
    html: `
      <span class="offline-marker-ring"></span>
      <span class="offline-marker-pin" style="--marker-color: ${color};">
        <span class="offline-marker-core"></span>
      </span>
      ${state.isFeatured ? `<span class="offline-marker-label">${escapeHtml(destination.name)}</span>` : ''}
    `,
    iconSize: state.isFeatured ? [72, 82] : [54, 64],
    iconAnchor: state.isFeatured ? [36, 58] : [27, 50],
    popupAnchor: [0, state.isFeatured ? -58 : -50]
  });
}

function syncPopup() {
  const instance = mapInstance;
  if (!instance.popupDestination) {
    instance.map.closePopup();
    return;
  }

  openDestinationPopup(instance.popupDestination);
}

function openDestinationPopup(destination, sourceMarker = null) {
  const instance = mapInstance;
  if (!instance?.map || !isValidCoordinate(destination?.coordinates)) return;

  const isAdded = instance.addedDestinationIds.has(destination.id);
  const actionAttr = isAdded ? 'data-popup-remove' : 'data-popup-add';
  const actionText = isAdded ? 'Remove Spot' : 'Add Spot';
  const category = destination.displayCategory || destination.categoryGroup || destination.category || 'Spot';
  const content = `
    <div class="offline-map-popup">
      <strong>${escapeHtml(destination.name)}</strong>
      <span>${escapeHtml(category)} - ${escapeHtml(destination.budgetLabel || destination.min_budget || 'low')}</span>
      <button type="button" ${actionAttr}="${escapeHtml(destination.id)}">${actionText}</button>
    </div>
  `;

  if (sourceMarker) {
    sourceMarker.bindPopup(content, {
      className: 'offline-leaflet-popup',
      closeButton: false,
      autoPanPadding: [24, 24]
    }).openPopup();
    return;
  }

  instance.L.popup({
    className: 'offline-leaflet-popup',
    closeButton: false,
    autoPanPadding: [24, 24]
  })
    .setLatLng(toLatLng(destination.coordinates))
    .setContent(content)
    .openOn(instance.map);
}

function bindMapEvents(instance) {
  instance.popupClickHandler = handlePopupClick;
  instance.container.addEventListener('click', instance.popupClickHandler);

  instance.map.on('click', () => {
    instance.popupDestination = null;
    document.dispatchEvent(new CustomEvent('clear-destination'));
  });
}

function handlePopupClick(event) {
  if (!mapInstance) return;

  const addButton = event.target.closest?.('[data-popup-add]');
  const removeButton = event.target.closest?.('[data-popup-remove]');
  if (!addButton && !removeButton) return;

  event.preventDefault();
  event.stopPropagation();

  const destinationId = addButton?.dataset.popupAdd || removeButton?.dataset.popupRemove;
  const destination = findDestination(destinationId);
  if (!destination) return;

  const eventName = addButton ? 'add-to-trip' : 'remove-from-trip';
  mapInstance.popupDestination = destination;
  document.dispatchEvent(new CustomEvent(eventName, { detail: { destination } }));
}

function findDestination(destinationId) {
  return mapInstance?.destinations.find(destination => destination.id === destinationId) ||
    (mapInstance?.popupDestination?.id === destinationId ? mapInstance.popupDestination : null);
}

function coordinatesToLatLngs(coordinates = []) {
  return coordinates
    .filter(isValidCoordinate)
    .map(toLatLng);
}

function toLatLng([lng, lat]) {
  return [lat, lng];
}

function isValidCoordinate(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
  return Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]));
}

function renderMapError(container) {
  container.innerHTML = `
    <div class="offline-map-error">
      <strong>Map unavailable</strong>
      <span>Local map data could not be loaded.</span>
    </div>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
