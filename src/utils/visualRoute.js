import { getDestinationCoordinates, isValidCoordinates } from './distance.js';

export const HUBS = {
  virac: {
    id: 'hub-virac',
    name: 'Virac',
    coordinates: [124.23, 13.58]
  },
  'san-andres': {
    id: 'hub-san-andres',
    name: 'San Andres',
    coordinates: [124.10, 13.60]
  }
};

export function getHubByName(name) {
  const key = normalizeHubKey(name);
  return HUBS[key] ? { ...HUBS[key], coordinates: [...HUBS[key].coordinates] } : null;
}

export function getVisualRoute(startCoords, endCoords) {
  if (!isValidCoordinates(startCoords) || !isValidCoordinates(endCoords)) {
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [startCoords, endCoords]
    }
  };
}

export function buildRouteCoordinates(hub, stops = []) {
  const startCoordinates = getDestinationCoordinates(hub);
  if (!startCoordinates) return [];

  const coordinates = [startCoordinates];
  stops.forEach(stop => {
    const stopCoordinates = getDestinationCoordinates(stop);
    if (stopCoordinates) coordinates.push(stopCoordinates);
  });

  return coordinates.length > 1 ? coordinates : [];
}

export function buildPreviewRouteCoordinates(hub, stops = [], destination = null) {
  const destinationCoordinates = getDestinationCoordinates(destination);
  if (!destinationCoordinates) return [];

  const lastStopCoordinates = stops.length > 0
    ? getDestinationCoordinates(stops[stops.length - 1])
    : null;
  const startCoordinates = lastStopCoordinates || getDestinationCoordinates(hub);

  if (!startCoordinates) return [];
  return [startCoordinates, destinationCoordinates];
}

function normalizeHubKey(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}
