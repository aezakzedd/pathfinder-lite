import { calculateDistance, getDestinationCoordinates, isValidCoordinates } from './distance.js';

export function optimizeRoute(hub, spots = [], options = {}) {
  if (!Array.isArray(spots) || spots.length < 2) return spots;

  const startCoordinates = isValidCoordinates(options.startCoordinates)
    ? options.startCoordinates
    : getDestinationCoordinates(hub);

  if (!startCoordinates) return spots;

  if (spots.some(spot => spot.locked)) {
    return solveWithLocks(spots, startCoordinates);
  }

  if (hasExplicitTimeContext(spots)) {
    return solveWithTimeContext(spots, startCoordinates);
  }

  if (spots.length < 8) {
    return solveBruteForce(spots, startCoordinates);
  }

  return solveGreedyFromStart(startCoordinates, spots);
}

function solveWithLocks(spots, startCoordinates) {
  const finalOrder = new Array(spots.length).fill(null);
  const pool = [];

  spots.forEach((spot, index) => {
    if (spot.locked) {
      finalOrder[index] = spot;
    } else {
      pool.push(spot);
    }
  });

  let currentLocation = startCoordinates;

  for (let index = 0; index < finalOrder.length; index += 1) {
    if (finalOrder[index]) {
      currentLocation = getDestinationCoordinates(finalOrder[index]) || currentLocation;
      continue;
    }

    const bestIndex = findNearestIndex(currentLocation, pool);
    if (bestIndex === -1) continue;

    const nextSpot = pool.splice(bestIndex, 1)[0];
    finalOrder[index] = nextSpot;
    currentLocation = getDestinationCoordinates(nextSpot) || currentLocation;
  }

  return finalOrder.filter(Boolean);
}

function solveWithTimeContext(spots, startCoordinates) {
  const buckets = {
    morning: [],
    daytime: [],
    evening: []
  };

  spots.forEach(spot => {
    buckets[getTimeBucket(spot)].push(spot);
  });

  let currentLocation = startCoordinates;
  const finalOrder = [];

  ['morning', 'daytime', 'evening'].forEach(bucketKey => {
    const bucketOrder = solveGreedyFromStart(currentLocation, buckets[bucketKey]);
    if (bucketOrder.length === 0) return;
    finalOrder.push(...bucketOrder);
    currentLocation = getDestinationCoordinates(bucketOrder[bucketOrder.length - 1]) || currentLocation;
  });

  return finalOrder;
}

function solveGreedyFromStart(startCoordinates, spots = []) {
  if (!Array.isArray(spots) || spots.length < 2) return spots;

  const remaining = [...spots];
  const ordered = [];
  let currentLocation = startCoordinates;

  while (remaining.length > 0) {
    const bestIndex = findNearestIndex(currentLocation, remaining);
    if (bestIndex === -1) break;

    const nextSpot = remaining.splice(bestIndex, 1)[0];
    ordered.push(nextSpot);
    currentLocation = getDestinationCoordinates(nextSpot) || currentLocation;
  }

  return ordered;
}

function solveBruteForce(spots, startCoordinates) {
  let bestOrder = spots;
  let minTotalDistance = Infinity;
  let bestFirstLegDistance = Infinity;

  getPermutations(spots.map((_, index) => index)).forEach(order => {
    const firstCoordinates = getDestinationCoordinates(spots[order[0]]);
    if (!firstCoordinates) return;

    let currentDistance = calculateDistance(startCoordinates, firstCoordinates);
    const firstLegDistance = currentDistance;

    for (let index = 0; index < order.length - 1; index += 1) {
      const fromCoordinates = getDestinationCoordinates(spots[order[index]]);
      const toCoordinates = getDestinationCoordinates(spots[order[index + 1]]);
      currentDistance += calculateDistance(fromCoordinates, toCoordinates);
    }

    const lastCoordinates = getDestinationCoordinates(spots[order[order.length - 1]]);
    currentDistance += calculateDistance(lastCoordinates, startCoordinates);

    if (
      currentDistance < minTotalDistance - 0.1 ||
      (Math.abs(currentDistance - minTotalDistance) <= 0.1 && firstLegDistance < bestFirstLegDistance)
    ) {
      minTotalDistance = currentDistance;
      bestFirstLegDistance = firstLegDistance;
      bestOrder = order.map(index => spots[index]);
    }
  });

  return bestOrder;
}

function findNearestIndex(currentLocation, spots) {
  let bestIndex = -1;
  let minDistance = Infinity;

  spots.forEach((spot, index) => {
    const coordinates = getDestinationCoordinates(spot);
    if (!coordinates) return;

    const distance = calculateDistance(currentLocation, coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getTimeBucket(spot) {
  const raw = String(spot?.best_time_of_day || '').toLowerCase().trim();

  if (!raw || raw === 'any') return 'daytime';
  if (raw.includes('morning') || raw.includes('sunrise') || raw.includes('breakfast')) return 'morning';
  if (raw.includes('sunset') || raw.includes('evening') || raw.includes('dinner') || raw.includes('night')) return 'evening';

  return 'daytime';
}

function hasExplicitTimeContext(spots) {
  return spots.some(spot => getTimeBucket(spot) !== 'daytime');
}

function getPermutations(input) {
  const output = [];
  const arr = [...input];

  function swap(a, b) {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
  }

  function generate(n) {
    if (n === 1) {
      output.push([...arr]);
      return;
    }

    for (let index = 0; index < n; index += 1) {
      generate(n - 1);
      swap(n % 2 ? 0 : index, n - 1);
    }
  }

  generate(arr.length);
  return output;
}
