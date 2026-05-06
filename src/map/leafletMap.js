import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createMarkers } from './markers.js';

// Catanduanes bounds
const CATANDUANES_BOUNDS = [
  [13.4, 123.65], // Southwest
  [14.2, 124.8]   // Northeast
];

const INITIAL_CENTER = [13.70, 124.25];
const INITIAL_ZOOM = 10;

let mapInstance = null;
let markersLayer = null;

/**
 * Initialize Leaflet map
 * @param {string} containerId - ID of the map container div
 * @param {Array} destinations - Array of destination objects
 */
export function initMap(containerId, destinations = []) {
  // Clean up existing map if any
  if (mapInstance) {
    destroyMap();
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Map container with id "${containerId}" not found`);
    return null;
  }

  // Initialize map
  mapInstance = L.map(containerId, {
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    bounds: CATANDUANES_BOUNDS,
    maxBounds: CATANDUANES_BOUNDS,
    maxBoundsViscosity: 1.0,
    zoomControl: false, // Custom controls will be added
    attributionControl: true
  });

  // NOTE: Using OpenStreetMap tiles as temporary development fallback.
  // For final kiosk mode, this should be replaced with local/offline tiles
  // or a local image/GeoJSON base layer.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    minZoom: 9
  }).addTo(mapInstance);

  // Create markers layer group
  markersLayer = L.layerGroup().addTo(mapInstance);

  // Add destination markers
  if (destinations.length > 0) {
    addMarkers(destinations);
  }

  return mapInstance;
}

/**
 * Add markers to the map
 * @param {Array} destinations - Array of destination objects
 */
export function addMarkers(destinations) {
  if (!mapInstance || !markersLayer) {
    console.warn('Map not initialized');
    return;
  }

  markersLayer.clearLayers();
  const markers = createMarkers(destinations);
  markers.forEach(marker => markersLayer.addLayer(marker));
}

/**
 * Fly to a specific location
 * @param {Array} coordinates - [lat, lng]
 * @param {number} zoom - Zoom level
 */
export function flyTo(coordinates, zoom = INITIAL_ZOOM) {
  if (!mapInstance) return;
  mapInstance.flyTo(coordinates, zoom, { duration: 1.5 });
}

/**
 * Reset map view to initial bounds
 */
export function resetView() {
  if (!mapInstance) return;
  mapInstance.flyToBounds(CATANDUANES_BOUNDS, { duration: 1.5, padding: [50, 50] });
}

/**
 * Zoom in
 */
export function zoomIn() {
  if (!mapInstance) return;
  mapInstance.zoomIn();
}

/**
 * Zoom out
 */
export function zoomOut() {
  if (!mapInstance) return;
  mapInstance.zoomOut();
}

/**
 * Get current map instance
 */
export function getMap() {
  return mapInstance;
}

/**
 * Destroy map instance and clean up
 */
export function destroyMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markersLayer = null;
  }
}

/**
 * Invalidate map size (useful when container size changes)
 */
export function invalidateSize() {
  if (mapInstance) {
    mapInstance.invalidateSize();
  }
}
