export function isValidCoordinates(coordinates) {
  return Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);
}

export function getDestinationCoordinates(destination) {
  if (isValidCoordinates(destination?.coordinates)) {
    return destination.coordinates;
  }

  if (isValidCoordinates(destination?.geometry?.coordinates)) {
    return destination.geometry.coordinates;
  }

  return null;
}

export function calculateDistance(coord1, coord2) {
  if (!isValidCoordinates(coord1) || !isValidCoordinates(coord2)) return 0;

  const earthRadiusKm = 6371;
  const [lng1, lat1] = coord1.map(toRadians);
  const [lng2, lat2] = coord2.map(toRadians);
  const deltaLat = lat2 - lat1;
  const deltaLng = lng2 - lng1;

  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(1));
}

export function estimateDriveMinutes(distanceKm) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return 0;

  let averageSpeedKmh = 40;
  let transferBufferMinutes = 4;

  if (km < 3) {
    averageSpeedKmh = 22;
    transferBufferMinutes = 4;
  } else if (km < 8) {
    averageSpeedKmh = 30;
    transferBufferMinutes = 5;
  } else if (km < 20) {
    averageSpeedKmh = 38;
    transferBufferMinutes = 7;
  } else {
    averageSpeedKmh = 46;
    transferBufferMinutes = 10;
  }

  const rawMinutes = (km / averageSpeedKmh) * 60 + transferBufferMinutes;
  return Math.max(3, Math.ceil(rawMinutes));
}

export function calculateTotalRoute(hub, spots = []) {
  const startCoordinates = getDestinationCoordinates(hub);
  if (!startCoordinates || spots.length === 0) return 0;

  let totalDistance = 0;
  let currentCoordinates = startCoordinates;

  spots.forEach(spot => {
    const nextCoordinates = getDestinationCoordinates(spot);
    if (!nextCoordinates) return;
    totalDistance += calculateDistance(currentCoordinates, nextCoordinates);
    currentCoordinates = nextCoordinates;
  });

  return Number(totalDistance.toFixed(1));
}

export function calculateTimeUsage(hub, spots = [], options = {}) {
  const startCoordinates = isValidCoordinates(options.startCoordinates)
    ? options.startCoordinates
    : getDestinationCoordinates(hub);

  if (!startCoordinates || spots.length === 0) {
    return { totalUsed: 0, driveTime: 0, visitTime: 0 };
  }

  const includeReturnLeg = options.includeReturnLeg !== false;
  const returnCoordinates = isValidCoordinates(options.returnCoordinates)
    ? options.returnCoordinates
    : getDestinationCoordinates(hub);

  let totalDrive = 0;
  let totalVisit = 0;
  let currentCoordinates = startCoordinates;

  spots.forEach(spot => {
    const nextCoordinates = getDestinationCoordinates(spot);
    if (!nextCoordinates) return;

    const visitMinutes = Number(spot.visit_time_minutes);
    totalVisit += Number.isFinite(visitMinutes) && visitMinutes > 0 ? visitMinutes : 60;

    const distance = calculateDistance(currentCoordinates, nextCoordinates);
    totalDrive += estimateDriveMinutes(distance);
    currentCoordinates = nextCoordinates;
  });

  if (includeReturnLeg && returnCoordinates) {
    totalDrive += estimateDriveMinutes(calculateDistance(currentCoordinates, returnCoordinates));
  }

  return {
    totalUsed: totalDrive + totalVisit,
    driveTime: totalDrive,
    visitTime: totalVisit
  };
}

export function calculateDriveTimes(hub, spots = [], options = {}) {
  const startCoordinates = isValidCoordinates(options.startCoordinates)
    ? options.startCoordinates
    : getDestinationCoordinates(hub);

  if (!startCoordinates || spots.length === 0) return [];

  let currentCoordinates = startCoordinates;

  return spots.map(spot => {
    const nextCoordinates = getDestinationCoordinates(spot);
    if (!nextCoordinates) return { driveTime: 0, distanceKm: 0 };

    const distanceKm = calculateDistance(currentCoordinates, nextCoordinates);
    const driveTime = estimateDriveMinutes(distanceKm);
    currentCoordinates = nextCoordinates;
    return { driveTime, distanceKm };
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
