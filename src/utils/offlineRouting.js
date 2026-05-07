const ROAD_SEGMENTS = [
  [
    [124.10, 13.60],
    [124.16, 13.58],
    [124.23, 13.58],
    [124.28, 13.61],
    [124.32, 13.64],
    [124.35, 13.65],
    [124.38, 13.70],
    [124.39, 13.78],
    [124.35, 13.81],
    [124.30, 13.84],
    [124.29, 13.89],
    [124.31, 13.94]
  ],
  [
    [124.31, 13.94],
    [124.25, 13.99],
    [124.17, 14.05],
    [124.11, 14.02],
    [124.07, 13.98],
    [124.04, 13.88],
    [124.04, 13.77],
    [124.07, 13.68],
    [124.10, 13.60]
  ],
  [
    [124.10, 13.60],
    [124.13, 13.68],
    [124.17, 13.75],
    [124.22, 13.80],
    [124.30, 13.84]
  ],
  [
    [124.23, 13.58],
    [124.20, 13.64],
    [124.17, 13.75],
    [124.10, 13.86],
    [124.07, 13.98]
  ],
  [
    [124.28, 13.61],
    [124.24, 13.68],
    [124.22, 13.80],
    [124.29, 13.89]
  ],
  [
    [124.35, 13.65],
    [124.30, 13.67],
    [124.24, 13.68],
    [124.17, 13.75]
  ]
];

const KEY_PRECISION = 5;
let baseGraph = null;

export function buildOfflineRouteGeometry(waypoints = []) {
  const cleanWaypoints = waypoints.filter(isValidCoordinate);
  if (cleanWaypoints.length < 2) {
    return {
      source: 'offline-road-network',
      coordinates: cleanWaypoints,
      distanceKm: 0
    };
  }

  const graph = getBaseGraph();
  const coordinates = [];
  let distanceKm = 0;

  for (let index = 0; index < cleanWaypoints.length - 1; index += 1) {
    const leg = buildLegRoute(graph, cleanWaypoints[index], cleanWaypoints[index + 1]);
    if (leg.coordinates.length > 0) {
      appendCoordinates(coordinates, leg.coordinates);
      distanceKm += leg.distanceKm;
    }
  }

  return {
    source: 'offline-road-network',
    coordinates,
    distanceKm: Math.round(distanceKm * 10) / 10
  };
}

export function getOfflineRoadSegments() {
  return ROAD_SEGMENTS.map(segment => segment.map(coordinate => [...coordinate]));
}

function buildLegRoute(base, from, to) {
  const graph = cloneGraph(base);
  const fromKey = addWaypointToGraph(graph, from, 'from');
  const toKey = addWaypointToGraph(graph, to, 'to');
  const pathKeys = shortestPath(graph, fromKey, toKey);

  if (pathKeys.length < 2) {
    return {
      coordinates: [from, to],
      distanceKm: distance(from, to)
    };
  }

  const coordinates = pathKeys.map(key => graph.nodes.get(key));
  return {
    coordinates,
    distanceKm: calculateRouteDistance(coordinates)
  };
}

function getBaseGraph() {
  if (baseGraph) return baseGraph;

  const nodes = new Map();
  const edges = new Map();
  const segments = [];

  ROAD_SEGMENTS.forEach(segment => {
    for (let index = 0; index < segment.length; index += 1) {
      addNode(nodes, edges, segment[index]);
      if (index > 0) {
        const from = segment[index - 1];
        const to = segment[index];
        addEdge(nodes, edges, from, to);
        segments.push({ from, to, fromKey: coordinateKey(from), toKey: coordinateKey(to) });
      }
    }
  });

  baseGraph = { nodes, edges, segments };
  return baseGraph;
}

function cloneGraph(base) {
  return {
    nodes: new Map(base.nodes),
    edges: new Map(Array.from(base.edges.entries()).map(([key, links]) => [key, links.map(link => ({ ...link }))])),
    segments: base.segments
  };
}

function addWaypointToGraph(graph, coordinate, prefix) {
  const waypointKey = `${prefix}:${coordinateKey(coordinate)}`;
  graph.nodes.set(waypointKey, [...coordinate]);
  graph.edges.set(waypointKey, []);

  const snap = findNearestRoadSnap(graph.segments, coordinate);
  const snapKey = `${prefix}:snap:${coordinateKey(snap.coordinate)}`;
  graph.nodes.set(snapKey, snap.coordinate);
  graph.edges.set(snapKey, graph.edges.get(snapKey) || []);

  connectKeys(graph, waypointKey, snapKey);
  connectKeys(graph, snapKey, snap.fromKey);
  connectKeys(graph, snapKey, snap.toKey);

  return waypointKey;
}

function findNearestRoadSnap(segments, coordinate) {
  let best = null;

  segments.forEach(segment => {
    const projected = projectPointToSegment(coordinate, segment.from, segment.to);
    const candidate = {
      coordinate: projected,
      fromKey: segment.fromKey,
      toKey: segment.toKey,
      distanceKm: distance(coordinate, projected)
    };

    if (!best || candidate.distanceKm < best.distanceKm) {
      best = candidate;
    }
  });

  return best;
}

function projectPointToSegment(point, from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return [...from];

  const t = Math.max(0, Math.min(1, (((point[0] - from[0]) * dx) + ((point[1] - from[1]) * dy)) / lengthSquared));
  return [
    from[0] + (dx * t),
    from[1] + (dy * t)
  ];
}

function shortestPath(graph, startKey, endKey) {
  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const queue = new Set(graph.nodes.keys());

  while (queue.size > 0) {
    let currentKey = null;
    let currentDistance = Infinity;

    queue.forEach(key => {
      const value = distances.get(key) ?? Infinity;
      if (value < currentDistance) {
        currentDistance = value;
        currentKey = key;
      }
    });

    if (!currentKey || currentKey === endKey) break;
    queue.delete(currentKey);

    (graph.edges.get(currentKey) || []).forEach(edge => {
      if (!queue.has(edge.to)) return;
      const nextDistance = currentDistance + edge.weight;
      if (nextDistance < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, currentKey);
      }
    });
  }

  if (!distances.has(endKey)) return [];

  const path = [];
  let current = endKey;
  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }
  return path;
}

function addNode(nodes, edges, coordinate) {
  const key = coordinateKey(coordinate);
  if (!nodes.has(key)) nodes.set(key, [...coordinate]);
  if (!edges.has(key)) edges.set(key, []);
  return key;
}

function addEdge(nodes, edges, from, to) {
  const fromKey = addNode(nodes, edges, from);
  const toKey = addNode(nodes, edges, to);
  connectKeys({ nodes, edges }, fromKey, toKey);
}

function connectKeys(graph, fromKey, toKey) {
  const from = graph.nodes.get(fromKey);
  const to = graph.nodes.get(toKey);
  if (!from || !to || fromKey === toKey) return;

  const weight = distance(from, to);
  addDirectedEdge(graph.edges, fromKey, toKey, weight);
  addDirectedEdge(graph.edges, toKey, fromKey, weight);
}

function addDirectedEdge(edges, fromKey, toKey, weight) {
  const links = edges.get(fromKey) || [];
  if (!links.some(link => link.to === toKey)) {
    links.push({ to: toKey, weight });
    edges.set(fromKey, links);
  }
}

function appendCoordinates(target, coordinates) {
  coordinates.forEach(coordinate => {
    const previous = target[target.length - 1];
    if (!previous || coordinateKey(previous) !== coordinateKey(coordinate)) {
      target.push(coordinate);
    }
  });
}

function calculateRouteDistance(coordinates) {
  return coordinates.reduce((total, coordinate, index) => {
    if (index === 0) return total;
    return total + distance(coordinates[index - 1], coordinate);
  }, 0);
}

function distance(from, to) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to[1] - from[1]);
  const dLng = toRadians(to[0] - from[0]);
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLng / 2) ** 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function coordinateKey(coordinate) {
  return `${Number(coordinate[0]).toFixed(KEY_PRECISION)},${Number(coordinate[1]).toFixed(KEY_PRECISION)}`;
}

function isValidCoordinate(coordinate) {
  return Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(Number(coordinate[0])) &&
    Number.isFinite(Number(coordinate[1]));
}
