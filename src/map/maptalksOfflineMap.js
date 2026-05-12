import 'maptalks/dist/maptalks.css';
import * as maptalks from 'maptalks';
import { requestRouteGeometry as requestRouteFromService } from '../utils/routeService.js';

const GEOJSON_URL = '/data/catanduanes_datafile.geojson';
const LOCAL_TILE_URL = '/tiles/{z}/{x}/{y}.png';

// Calibrated to visually match the original Pathfinder (MapLibre) initial view.
// MapLibre zoom ≠ Maptalks zoom, so these are tuned by eye, not copied 1:1.
const PATHFINDER_CAMERA = {
  center: [124.22, 13.70],
  zoom: 11.75,
  pitch: 60,
  bearing: -15
};

const MIN_ZOOM = 10.5;
const MAX_ZOOM = 19;

const CATEGORY_ICONS = {
  Water: '<path d="M8 17a4 4 0 0 0 8 0c0-3-4-7-4-7s-4 4-4 7Z" /><path d="M15 6h2l2 4M13 6h-2l-2 4M14 3l-2 3" />',
  Outdoor: '<path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /><path d="M7 21l2-7 3-2 3 2 2 7M9 10l-3 3M15 10l3 3" />',
  Views: '<path d="m4 19 5-9 4 6 2-3 5 6H4Z" /><path d="M14 7h.01" />',
  Heritage: '<path d="M5 9h14M7 9v10M17 9v10M4 19h16M6 5h12l1 4H5l1-4Z" />',
  Dining: '<path d="M7 3v8M10 3v8M7 7h3M8.5 11v10M16 3v18M14 3v7a2 2 0 0 0 2 2" />',
  Stay: '<path d="M4 20V9l8-5 8 5v11M8 20v-7h8v7M10 20v-3h4v3" />'
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
    geojson: options.geojson || null,
    ready: false,
    map: null,
    boundaryLayer: null,
    markerLayer: null,
    routeLayer: null,
    previewLayer: null,
    hubLayer: null,
    labelLayer: null,
    popupLayer: null,
    popupDestination: null,
    selectedDestinationId: null,
    addedDestinationIds: new Set(),
    hub: null,
    routeCoordinates: [],
    previewCoordinates: [],
    routeCache: new Map(),
    routeRequestId: 0,
    previewRequestId: 0,
    routeKey: '',
    previewKey: '',
    routeResult: null,
    previewResult: null,
    onRouteResult: typeof options.onRouteResult === 'function' ? options.onRouteResult : null,
    initId: Date.now()
  };

  container.innerHTML = '';
  container.classList.add('maptalks-offline-map');

  setupMaptalksMap(mapInstance, options).catch(error => {
    console.error('Failed to initialize Maptalks map:', error);
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

  let destinationsChanged = false;
  let hubChanged = false;
  let routeChanged = false;
  let previewChanged = false;
  let selectionChanged = false;

  if (updates.destinations && !destinationsEqualById(updates.destinations, mapInstance.destinations)) {
    mapInstance.destinations = updates.destinations;
    destinationsChanged = true;
  }
  if ('hub' in updates) {
    if (!hubEqual(updates.hub, mapInstance.hub)) {
      mapInstance.hub = updates.hub;
      hubChanged = true;
    }
  }
  if ('selectedDestinationId' in updates) {
    if (mapInstance.selectedDestinationId !== updates.selectedDestinationId) {
      mapInstance.selectedDestinationId = updates.selectedDestinationId;
      selectionChanged = true;
    }
  }
  if ('addedDestinationIds' in updates) {
    mapInstance.addedDestinationIds = new Set(updates.addedDestinationIds || []);
    selectionChanged = true;
  }
  if ('routeCoordinates' in updates) {
    if (!coordsEqual(updates.routeCoordinates, mapInstance.routeCoordinates)) {
      mapInstance.routeCoordinates = updates.routeCoordinates || [];
      routeChanged = true;
    }
  }
  if ('previewCoordinates' in updates) {
    if (!coordsEqual(updates.previewCoordinates, mapInstance.previewCoordinates)) {
      mapInstance.previewCoordinates = updates.previewCoordinates || [];
      previewChanged = true;
    }
  }
  let popupChanged = false;
  if ('popupDestination' in updates) {
    if (mapInstance.popupDestination?.id !== updates.popupDestination?.id) {
      mapInstance.popupDestination = updates.popupDestination;
      popupChanged = true;
    }
  }

  if (!mapInstance.ready || !mapInstance.map) return;

  if (routeChanged) renderRouteLayer();
  if (previewChanged) renderPreviewLayer();
  if (hubChanged) renderHubLayer();
  if (destinationsChanged) {
    renderMarkerLayer();
  } else if (selectionChanged) {
    updateMarkerStates();
  }
  if (popupChanged) syncPopup();
}

export function zoomIn() {
  if (!mapInstance?.map) return;
  mapInstance.map.zoomIn();
}

export function zoomOut() {
  if (!mapInstance?.map) return;
  mapInstance.map.zoomOut();
}

export function resetView() {
  if (!mapInstance?.map) return;
  mapInstance.map.animateTo({
    center: PATHFINDER_CAMERA.center,
    zoom: PATHFINDER_CAMERA.zoom,
    pitch: PATHFINDER_CAMERA.pitch,
    bearing: PATHFINDER_CAMERA.bearing
  }, { duration: 600 });
}

export function fitToRoute() {
  if (!mapInstance?.map) return;
  const coords = [];

  if (mapInstance.routeCoordinates && mapInstance.routeCoordinates.length > 0) {
    mapInstance.routeCoordinates.forEach(c => {
      if (Array.isArray(c) && c.length >= 2) coords.push(new maptalks.Coordinate(c[0], c[1]));
    });
  }

  if (mapInstance.hub?.coordinates) {
    const h = mapInstance.hub.coordinates;
    coords.push(new maptalks.Coordinate(h[0], h[1]));
  }

  if (coords.length > 1) {
    const extent = new maptalks.Extent(coords[0], coords[0]);
    coords.forEach(c => extent._combine(c));
    mapInstance.map.fitExtent(extent, -1, { padding: { left: 40, right: 40, top: 40, bottom: 40 }, animation: false });
  } else {
    resetView();
  }
}

export function invalidateSize() {
  if (!mapInstance?.map) return;
  applyMapTheme(mapInstance);
  mapInstance.map.checkSize();
}

export function getMap() {
  return mapInstance?.map || null;
}

export function destroyMap() {
  if (!mapInstance) return;

  // Clean up UIMarkers
  if (mapInstance._uiMarkers) {
    mapInstance._uiMarkers.forEach(m => { try { m.remove(); } catch (_) { /* noop */ } });
  }
  if (mapInstance._hubUIMarker) {
    try { mapInstance._hubUIMarker.remove(); } catch (_) { /* noop */ }
  }
  if (mapInstance._activePopup) {
    try { mapInstance._activePopup.remove(); } catch (_) { /* noop */ }
  }

  if (mapInstance.map) {
    mapInstance.map.remove();
  }

  mapInstance.container.classList.remove('maptalks-offline-map');
  mapInstance.container.innerHTML = '';
  mapInstance = null;
}

export async function requestRouteGeometry(waypoints = []) {
  return requestRouteFromService(waypoints);
}

// ── Map setup ──────────────────────────────────────────────

async function setupMaptalksMap(instance, options) {
  if (mapInstance !== instance) return;

  const seaColor = getCssMapValue('--offline-map-sea', '#a9d7e0');

  instance.map = new maptalks.Map(instance.container, {
    center: PATHFINDER_CAMERA.center,
    zoom: PATHFINDER_CAMERA.zoom,
    pitch: PATHFINDER_CAMERA.pitch,
    bearing: PATHFINDER_CAMERA.bearing,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    dragPan: true,
    dragRotate: false,
    dragPitch: false,
    dragRotatePitch: false,
    touchPitch: false,
    touchRotate: false,
    attribution: false,
    fog: false,
    devicePixelRatio: 1,
    baseLayer: null
  });

  instance.container.style.background = seaColor;

  // Create layers
  instance.boundaryLayer = new maptalks.VectorLayer('boundaries', [], {
    enableSimplify: true,
    hitDetect: false,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.routeLayer = new maptalks.VectorLayer('routes', [], {
    hitDetect: false,
    enableSimplify: true,
    simplifyTolerance: 2,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.previewLayer = new maptalks.VectorLayer('previews', [], {
    hitDetect: false,
    enableSimplify: true,
    simplifyTolerance: 2,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.hubLayer = new maptalks.VectorLayer('hubs', [], {
    hitDetect: false,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.markerLayer = new maptalks.VectorLayer('markers', [], {
    hitDetect: true,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.labelLayer = new maptalks.VectorLayer('labels', [], {
    hitDetect: false,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  instance.popupLayer = new maptalks.VectorLayer('popups', [], {
    hitDetect: true,
    forceRenderOnMoving: false,
    forceRenderOnZooming: false
  }).addTo(instance.map);

  // Try adding tile layer
  addLocalTileLayerIfAvailable(instance);

  // Bind map click to dismiss popups
  instance.map.on('click', () => {
    instance.popupDestination = null;
    document.dispatchEvent(new CustomEvent('clear-destination'));
    syncPopup();
  });

  // Load GeoJSON
  const geojson = options.geojson || await fetchGeoJson();
  if (mapInstance !== instance) return;

  instance.geojson = geojson;
  renderGeoJsonBase(instance, geojson);
  renderMunicipalityLabels(instance);
  applyMapTheme(instance);
  instance.ready = true;
  renderDynamicLayers();

  // Force camera back to the Pathfinder view after all layers render
  // so that no auto-fit or layer extent calculation can drift the view.
  instance.map.setCenter(PATHFINDER_CAMERA.center);
  instance.map.setZoom(PATHFINDER_CAMERA.zoom);
  instance.map.setPitch(PATHFINDER_CAMERA.pitch);
  instance.map.setBearing(PATHFINDER_CAMERA.bearing);

  // Guard: if user zooms out below MIN_ZOOM, ease back to the Pathfinder camera
  instance.map.on('zoomend', () => {
    if (mapInstance !== instance) return;
    if (instance.map.getZoom() < MIN_ZOOM) {
      instance.map.animateTo({
        center: PATHFINDER_CAMERA.center,
        zoom: PATHFINDER_CAMERA.zoom,
        pitch: PATHFINDER_CAMERA.pitch,
        bearing: PATHFINDER_CAMERA.bearing
      }, { duration: 400 });
    }
  });

  window.requestAnimationFrame(() => invalidateSize());
}

async function fetchGeoJson() {
  const response = await fetch(GEOJSON_URL);
  if (!response.ok) throw new Error(`Unable to load ${GEOJSON_URL}`);
  return response.json();
}

async function addLocalTileLayerIfAvailable(instance) {
  const tileUrl = await findAvailableLocalTile();
  if (!tileUrl || mapInstance !== instance || !instance.map) return;

  const tileLayer = new maptalks.TileLayer('base-tiles', {
    urlTemplate: LOCAL_TILE_URL,
    subdomains: ['a', 'b', 'c'],
    maxAvailableZoom: 15,
    repeatWorld: false
  });
  instance.map.setBaseLayer(tileLayer);
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
  const lat = 13.75;
  const lng = 124.25;
  const latRad = lat * Math.PI / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2 * n);
  return `/tiles/${zoom}/${x}/${y}.png`;
}

// ── GeoJSON rendering ──────────────────────────────────────

function renderGeoJsonBase(instance, geojson) {
  instance.boundaryLayer.clear();
  if (!geojson?.features) return;

  const geometries = [];
  const landColor = getCssMapValue('--offline-map-land', '#164f3b');
  const boundaryColor = getCssMapValue('--offline-map-boundary', 'rgba(3, 7, 18, 0.46)');
  const lineColor = getCssMapValue('--offline-map-line', 'rgba(3, 7, 18, 0.42)');

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === 'Polygon') {
      geometries.push(new maptalks.Polygon(geom.coordinates, {
        symbol: {
          polygonFill: landColor,
          polygonOpacity: 1,
          lineColor: boundaryColor,
          lineWidth: 1.5,
          lineOpacity: 1
        }
      }));
    } else if (geom.type === 'MultiPolygon') {
      for (const coords of geom.coordinates) {
        geometries.push(new maptalks.Polygon(coords, {
          symbol: {
            polygonFill: landColor,
            polygonOpacity: 1,
            lineColor: boundaryColor,
            lineWidth: 1.5,
            lineOpacity: 1
          }
        }));
      }
    } else if (geom.type === 'LineString') {
      geometries.push(new maptalks.LineString(geom.coordinates, {
        symbol: {
          lineColor: lineColor,
          lineWidth: 1.4,
          lineOpacity: 0.75,
          lineDasharray: [5, 7]
        }
      }));
    } else if (geom.type === 'MultiLineString') {
      for (const coords of geom.coordinates) {
        geometries.push(new maptalks.LineString(coords, {
          symbol: {
            lineColor: lineColor,
            lineWidth: 1.4,
            lineOpacity: 0.75,
            lineDasharray: [5, 7]
          }
        }));
      }
    }
  }

  instance.boundaryLayer.addGeometry(geometries);
}

function applyMapTheme(instance) {
  if (!instance?.container) return;
  const seaColor = getCssMapValue('--offline-map-sea', '#a9d7e0');
  instance.container.style.background = seaColor;

  if (instance.geojson && instance.boundaryLayer) {
    renderGeoJsonBase(instance, instance.geojson);
  }
}

function renderMunicipalityLabels(instance) {
  instance.labelLayer.clear();

  const labelColor = getCssMapValue('--offline-map-label', 'rgba(248, 250, 252, 0.92)');
  const labelStroke = getCssMapValue('--offline-map-label-stroke', 'rgba(3, 7, 18, 0.78)');

  const markers = MAP_LABELS.map(label =>
    new maptalks.Marker(label.coordinates, {
      properties: { name: label.name },
      symbol: {
        textFaceName: 'Open Sans, Inter, system-ui, sans-serif',
        textName: '{name}',
        textSize: 12,
        textWeight: 'bold',
        textFill: labelColor,
        textOpacity: 0.9,
        textHaloFill: labelStroke,
        textHaloRadius: 3,
        textHorizontalAlignment: 'middle',
        textVerticalAlignment: 'middle'
      },
      zIndex: 2
    })
  );

  instance.labelLayer.addGeometry(markers);
}

// ── Dynamic layers ─────────────────────────────────────────

function renderDynamicLayers() {
  if (!mapInstance?.ready || !mapInstance.map) return;

  renderRouteLayer();
  renderPreviewLayer();
  renderHubLayer();
  renderMarkerLayer();
  syncPopup();
}

function renderRouteLayer() {
  scheduleRouteRender(mapInstance, 'route', mapInstance.routeCoordinates);
}

function renderPreviewLayer() {
  scheduleRouteRender(mapInstance, 'preview', mapInstance.previewCoordinates);
}

function scheduleRouteRender(instance, kind, coordinates) {
  const routeCoordinates = Array.isArray(coordinates) ? coordinates : [];
  const layer = kind === 'preview' ? instance.previewLayer : instance.routeLayer;
  const requestField = kind === 'preview' ? 'previewRequestId' : 'routeRequestId';
  const keyField = kind === 'preview' ? 'previewKey' : 'routeKey';
  const resultField = kind === 'preview' ? 'previewResult' : 'routeResult';
  const key = coordinatesKey(routeCoordinates);

  if (!key || routeCoordinates.length < 2) {
    layer.clear();
    instance[keyField] = '';
    instance[resultField] = null;
    if (kind === 'route') notifyRouteResult(instance, null);
    return;
  }

  if (instance[keyField] === key && instance[resultField]) {
    return;
  }

  instance[keyField] = key;
  const cached = instance.routeCache.get(key);
  if (cached) {
    instance[resultField] = cached;
    drawRouteResult(instance, kind, cached);
    if (kind === 'route') notifyRouteResult(instance, cached);
    return;
  }

  layer.clear();
  const requestId = instance[requestField] + 1;
  instance[requestField] = requestId;

  requestRouteFromService(routeCoordinates).then(result => {
    if (mapInstance !== instance || instance[requestField] !== requestId || instance[keyField] !== key) return;
    instance.routeCache.set(key, result);
    if (instance.routeCache.size > 50) {
      const firstKey = instance.routeCache.keys().next().value;
      instance.routeCache.delete(firstKey);
    }
    instance[resultField] = result;
    drawRouteResult(instance, kind, result);
    if (kind === 'route') notifyRouteResult(instance, result);
  });
}

function drawRouteResult(instance, kind, result) {
  const layer = kind === 'preview' ? instance.previewLayer : instance.routeLayer;
  layer.clear();

  let coords = result?.coordinates || result?.geometry || [];
  if (coords.length < 2) return;

  coords = decimateCoords(coords, 0.0004);

  const isPreview = kind === 'preview';
  const isFallback = Boolean(result?.isFallback);
  const useDash = isPreview || isFallback;

  // Casing (outer line)
  const casing = new maptalks.LineString(coords, {
    symbol: {
      lineColor: '#ffffff',
      lineWidth: isPreview ? 7 : 8,
      lineOpacity: isPreview ? 0.74 : 0.88,
      lineCap: 'round',
      lineJoin: 'round',
      lineDasharray: useDash ? [10, 10] : null
    }
  });

  // Inner line
  const inner = new maptalks.LineString(coords, {
    symbol: {
      lineColor: isPreview ? '#f59e0b' : '#12b7d4',
      lineWidth: isPreview ? 4 : 5,
      lineOpacity: isPreview ? 0.9 : 0.92,
      lineCap: 'round',
      lineJoin: 'round',
      lineDasharray: useDash ? [10, 10] : null
    }
  });

  layer.addGeometry([casing, inner]);
}

function notifyRouteResult(instance, result) {
  instance.onRouteResult?.({
    kind: 'route',
    result,
    coordinates: instance.routeCoordinates
  });
}

function renderHubLayer() {
  const instance = mapInstance;
  instance.hubLayer.clear();

  // Remove old hub UIMarker
  if (instance._hubUIMarker) {
    try { instance._hubUIMarker.remove(); } catch (_) { /* noop */ }
    instance._hubUIMarker = null;
  }

  if (!instance.hub?.coordinates) return;

  const html = `
    <div class="offline-hub-marker">
      <span class="offline-hub-halo"></span>
      <span class="offline-hub-dot"></span>
      <span class="offline-hub-label">${escapeHtml(instance.hub.name)}</span>
    </div>
  `;

  const hubMarker = new maptalks.ui.UIMarker(instance.hub.coordinates, {
    content: html,
    dy: 0,
    single: false,
    eventsPropagation: true
  });

  hubMarker.addTo(instance.map);
  instance._hubUIMarker = hubMarker;
}

function renderMarkerLayer() {
  const instance = mapInstance;

  // Remove old UIMarkers
  if (instance._uiMarkers) {
    instance._uiMarkers.forEach(m => { try { m.remove(); } catch (_) { /* noop */ } });
  }
  instance._uiMarkers = [];
  instance._markerCache = new Map();

  instance.destinations.forEach(destination => {
    if (!isValidCoordinate(destination.coordinates)) return;

    const isFeatured = Boolean(destination.isTop10 || destination.is_top_10);
    const category = destination.categoryGroup || destination.displayCategory || destination.category;
    const color = isFeatured ? '#ef4444' : 'var(--offline-poi-color)';
    const iconPath = CATEGORY_ICONS[category] || CATEGORY_ICONS.Outdoor;

    // Build initial HTML — classes will be managed via DOM later
    let innerHtml;
    if (isFeatured) {
      innerHtml = `
        <span class="offline-marker-ring"></span>
        <span class="offline-marker-pin" style="--marker-color: ${color};">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true">
            <path d="M136,127.42V232a8,8,0,0,1-16,0V127.42a56,56,0,1,1,16,0Z" fill="var(--marker-color)" stroke="#000000" stroke-width="16" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="offline-marker-label">${escapeHtml(destination.name)}</span>
      `;
    } else {
      innerHtml = `
        <span class="offline-marker-ring"></span>
        <span class="offline-marker-badge" style="--marker-color: ${color};">
          <svg viewBox="0 0 24 24" aria-hidden="true">${iconPath}</svg>
        </span>
        <span class="offline-marker-label" style="display:none">${escapeHtml(destination.name)}</span>
      `;
    }

    const html = `<div class="offline-destination-marker${isFeatured ? ' featured' : ''}">${innerHtml}</div>`;

    const marker = new maptalks.ui.UIMarker(destination.coordinates, {
      content: html,
      dy: isFeatured ? -20 : 0,
      single: false,
      eventsPropagation: false
    });

    marker.__destinationData = destination;
    marker.__isFeatured = isFeatured;
    marker.addTo(instance.map);

    const dom = marker.getDOM();
    if (dom) {
      dom.addEventListener('click', (e) => {
        e.stopPropagation();
        instance.popupDestination = destination;
        document.dispatchEvent(new CustomEvent('select-destination', { detail: { destination } }));
        syncPopup();
      });
    }

    instance._uiMarkers.push(marker);
    instance._markerCache.set(destination.id, marker);
  });

  // Apply current selection/added states
  updateMarkerStates();
}

// Update only CSS classes and label visibility on existing cached markers
function updateMarkerStates() {
  const instance = mapInstance;
  if (!instance?._uiMarkers) return;

  instance._uiMarkers.forEach(marker => {
    const dom = marker.getDOM();
    if (!dom) return;

    const dest = marker.__destinationData;
    const isFeatured = marker.__isFeatured;
    const isSelected = instance.selectedDestinationId === dest.id;
    const isAdded = instance.addedDestinationIds.has(dest.id);

    const wrapper = dom.querySelector('.offline-destination-marker');
    if (!wrapper) return;

    // Toggle classes without removing/recreating the element
    wrapper.classList.toggle('selected', isSelected);
    wrapper.classList.toggle('added', isAdded);

    // For non-featured markers, show/hide label based on selection state
    if (!isFeatured) {
      const label = wrapper.querySelector('.offline-marker-label');
      if (label) {
        label.style.display = (isSelected || isAdded) ? '' : 'none';
      }
    }
  });
}

function syncPopup() {
  const instance = mapInstance;
  if (!instance) return;

  // Remove old popup
  if (instance._activePopup) {
    instance._activePopup.remove();
    instance._activePopup = null;
  }

  if (!instance.popupDestination) return;

  const destination = instance.popupDestination;
  if (!isValidCoordinate(destination?.coordinates)) return;

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

  const popup = new maptalks.ui.UIMarker(destination.coordinates, {
    content: content,
    dy: -50,
    single: false,
    eventsPropagation: false
  });

  popup.addTo(instance.map);

  const dom = popup.getDOM();
  if (dom) {
    dom.addEventListener('click', (e) => {
      e.stopPropagation();
      const addBtn = e.target.closest?.('[data-popup-add]');
      const removeBtn = e.target.closest?.('[data-popup-remove]');
      if (!addBtn && !removeBtn) return;

      e.preventDefault();
      const destinationId = addBtn?.dataset.popupAdd || removeBtn?.dataset.popupRemove;
      const dest = findDestination(destinationId);
      if (!dest) return;

      const eventName = addBtn ? 'add-to-trip' : 'remove-from-trip';
      instance.popupDestination = dest;
      document.dispatchEvent(new CustomEvent(eventName, { detail: { destination: dest } }));
    });
  }

  instance._activePopup = popup;
}

function findDestination(destinationId) {
  return mapInstance?.destinations.find(d => d.id === destinationId) ||
    (mapInstance?.popupDestination?.id === destinationId ? mapInstance.popupDestination : null);
}

function destinationsEqualById(a = [], b = []) {
  if (a.length !== b.length) return false;
  const idsA = new Set(a.map(d => d.id));
  const idsB = new Set(b.map(d => d.id));
  if (idsA.size !== idsB.size) return false;
  for (const id of idsA) {
    if (!idsB.has(id)) return false;
  }
  return true;
}

function coordsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i], cb = b[i];
    if (!Array.isArray(ca) || !Array.isArray(cb) || ca.length < 2 || cb.length < 2) return false;
    if (Math.abs(ca[0] - cb[0]) > 1e-9 || Math.abs(ca[1] - cb[1]) > 1e-9) return false;
  }
  return true;
}

function hubEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id;
}

function decimateCoords(coords = [], threshold = 0.0004) {
  if (coords.length <= 30) return coords;
  const out = [coords[0]];
  let last = coords[0];
  for (let i = 1; i < coords.length - 1; i++) {
    const c = coords[i];
    const dx = c[0] - last[0];
    const dy = c[1] - last[1];
    if (dx * dx + dy * dy > threshold * threshold) {
      out.push(c);
      last = c;
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

// ── Utilities ──────────────────────────────────────────────

function coordinatesKey(coordinates = []) {
  const clean = coordinates.filter(isValidCoordinate);
  if (clean.length < 2) return '';
  return clean
    .map(c => `${Number(c[0]).toFixed(5)},${Number(c[1]).toFixed(5)}`)
    .join('|');
}

function isValidCoordinate(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
  return Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]));
}

function getCssMapValue(name, fallback) {
  if (typeof getComputedStyle !== 'function') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    getComputedStyle(mapInstance?.container || document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
