import { estimateDriveMinutes, isValidCoordinates } from './distance.js';
import { buildOfflineRouteGeometry } from './offlineRouting.js';

const ROUTE_ENDPOINT = '/api/route';
const ROUTE_TIMEOUT_MS = 1400;

export async function requestRouteGeometry(waypoints = [], options = {}) {
  const cleanWaypoints = normalizeWaypoints(waypoints);
  if (cleanWaypoints.length < 2) {
    return createEmptyRoute(cleanWaypoints);
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl === 'function') {
    const apiResult = await tryBackendRoute(cleanWaypoints, fetchImpl, options);
    if (apiResult) return apiResult;
  }

  return buildFallbackRoute(cleanWaypoints);
}

export function normalizeRouteResponse(response) {
  const coordinates = normalizeWaypoints(response?.geometry || response?.coordinates || []);
  if (coordinates.length < 2) return null;

  const distanceKm = normalizeNumber(response.distance_km ?? response.distanceKm);
  const durationMin = normalizeNumber(response.duration_min ?? response.durationMin);

  return {
    coordinates,
    geometry: coordinates,
    distanceKm,
    distance_km: distanceKm,
    durationMin,
    duration_min: durationMin,
    source: response.source || 'local-route-api',
    isFallback: false
  };
}

export function buildFallbackRoute(waypoints = []) {
  const fallback = buildOfflineRouteGeometry(waypoints);
  const coordinates = normalizeWaypoints(fallback.coordinates || []);
  const distanceKm = normalizeNumber(fallback.distanceKm ?? fallback.distance_km);
  const durationMin = normalizeNumber(fallback.durationMin ?? fallback.duration_min) ||
    estimateDriveMinutes(distanceKm);

  return {
    coordinates,
    geometry: coordinates,
    distanceKm,
    distance_km: distanceKm,
    durationMin,
    duration_min: durationMin,
    source: 'fallback-approximate-road-network',
    isFallback: true
  };
}

function createEmptyRoute(coordinates) {
  return {
    coordinates,
    geometry: coordinates,
    distanceKm: 0,
    distance_km: 0,
    durationMin: 0,
    duration_min: 0,
    source: 'empty-route',
    isFallback: true
  };
}

async function tryBackendRoute(waypoints, fetchImpl, options) {
  const endpoint = options.endpoint || ROUTE_ENDPOINT;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller && typeof setTimeout === 'function'
    ? setTimeout(() => controller.abort(), options.timeoutMs || ROUTE_TIMEOUT_MS)
    : null;

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints }),
      signal: controller?.signal
    });

    if (!response?.ok) return null;

    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType && !contentType.includes('application/json')) return null;

    const payload = await response.json();
    return normalizeRouteResponse(payload);
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeWaypoints(waypoints = []) {
  return Array.isArray(waypoints)
    ? waypoints
      .filter(isValidCoordinates)
      .map(coordinate => [Number(coordinate[0]), Number(coordinate[1])])
    : [];
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
