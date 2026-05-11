// --- Dense road graph (lazy-loaded from road_graph.json) ---

const ROAD_GRAPH_URL = '/data/road_graph.json';
const KEY_PRECISION = 5;
const GRID_SIZE = 0.01;

let denseGraph = null;
let denseGraphPromise = null;
let denseGraphFailed = false;

// --- Sparse fallback (original 30-point skeleton, used if road_graph.json unavailable) ---

const SPARSE_ROAD_SEGMENTS = [
  [[124.10,13.60],[124.16,13.58],[124.23,13.58],[124.28,13.61],[124.32,13.64],[124.35,13.65],[124.38,13.70],[124.39,13.78],[124.35,13.81],[124.30,13.84],[124.29,13.89],[124.31,13.94]],
  [[124.31,13.94],[124.25,13.99],[124.17,14.05],[124.11,14.02],[124.07,13.98],[124.04,13.88],[124.04,13.77],[124.07,13.68],[124.10,13.60]],
  [[124.10,13.60],[124.13,13.68],[124.17,13.75],[124.22,13.80],[124.30,13.84]],
  [[124.23,13.58],[124.20,13.64],[124.17,13.75],[124.10,13.86],[124.07,13.98]],
  [[124.28,13.61],[124.24,13.68],[124.22,13.80],[124.29,13.89]],
  [[124.35,13.65],[124.30,13.67],[124.24,13.68],[124.17,13.75]]
];

let sparseGraph = null;

// --- Public API ---

export function buildOfflineRouteGeometry(waypoints = []) {
  const cleanWaypoints = waypoints.filter(isValidCoordinate);
  if (cleanWaypoints.length < 2) {
    return {
      source: 'offline-road-network',
      coordinates: cleanWaypoints,
      distanceKm: 0
    };
  }

  // If dense graph is already loaded, use it synchronously
  if (denseGraph) {
    return routeWithDenseGraph(denseGraph, cleanWaypoints);
  }

  // Fall back to sparse graph
  return routeWithSparseGraph(cleanWaypoints);
}

export async function buildOfflineRouteGeometryAsync(waypoints = []) {
  const cleanWaypoints = waypoints.filter(isValidCoordinate);
  if (cleanWaypoints.length < 2) {
    return {
      source: 'offline-road-network',
      coordinates: cleanWaypoints,
      distanceKm: 0
    };
  }

  const graph = await loadDenseGraph();
  if (graph) {
    return routeWithDenseGraph(graph, cleanWaypoints);
  }

  return routeWithSparseGraph(cleanWaypoints);
}

export function getOfflineRoadSegments() {
  return SPARSE_ROAD_SEGMENTS.map(segment => segment.map(coordinate => [...coordinate]));
}

export function preloadRoadGraph() {
  loadDenseGraph();
}

// --- Dense graph loader ---

async function loadDenseGraph() {
  if (denseGraph) return denseGraph;
  if (denseGraphFailed) return null;

  if (!denseGraphPromise) {
    denseGraphPromise = (async () => {
      try {
        const response = await fetch(ROAD_GRAPH_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        denseGraph = buildDenseGraph(data);
        return denseGraph;
      } catch {
        denseGraphFailed = true;
        return null;
      }
    })();
  }

  return denseGraphPromise;
}

function buildDenseGraph(data) {
  const nodes = data.nodes;
  const adjacency = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) adjacency[i] = [];

  const edgesRaw = data.edges;
  for (let i = 0; i < edgesRaw.length; i++) {
    const fromIdx = edgesRaw[i][0];
    const toIdx = edgesRaw[i][1];
    const distKm = edgesRaw[i][2];
    adjacency[fromIdx].push(toIdx, distKm);
    adjacency[toIdx].push(fromIdx, distKm);
  }

  // Spatial grid for fast nearest-node lookup
  const grid = new Map();
  for (let idx = 0; idx < nodes.length; idx++) {
    const cellKey = gridCell(nodes[idx][0], nodes[idx][1]);
    let list = grid.get(cellKey);
    if (!list) { list = []; grid.set(cellKey, list); }
    list.push(idx);
  }

  return {
    nodes,
    adjacency,
    edgesRaw,
    edgeGeometries: data.edge_geometries || {},
    grid
  };
}

function gridCell(lng, lat) {
  return `${Math.floor(lng / GRID_SIZE)},${Math.floor(lat / GRID_SIZE)}`;
}

// --- Dense graph routing (A*) ---

function nearestNode(graph, coord) {
  const lng = coord[0];
  const lat = coord[1];
  const cellX = Math.floor(lng / GRID_SIZE);
  const cellY = Math.floor(lat / GRID_SIZE);

  let bestIdx = 0;
  let bestDist = Infinity;

  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const list = graph.grid.get(key);
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const nodeIdx = list[i];
        const d = haversine(coord, graph.nodes[nodeIdx]);
        if (d < bestDist) { bestDist = d; bestIdx = nodeIdx; }
      }
    }
  }

  // Brute-force fallback (should never happen for Catanduanes)
  if (bestDist === Infinity) {
    for (let idx = 0; idx < graph.nodes.length; idx++) {
      const d = haversine(coord, graph.nodes[idx]);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    }
  }

  return bestIdx;
}

function astar(graph, startIdx, endIdx) {
  if (startIdx === endIdx) return { path: [startIdx], distance: 0 };

  const endCoord = graph.nodes[endIdx];
  const gScore = new Map();
  gScore.set(startIdx, 0);
  const cameFrom = new Map();

  // Min-heap: [estimatedTotal, gCost, nodeIdx]
  const open = [[haversine(graph.nodes[startIdx], endCoord), 0, startIdx]];

  while (open.length > 0) {
    // Pop minimum
    let minI = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i][0] < open[minI][0]) minI = i;
    }
    const [, currentG, current] = open[minI];
    open[minI] = open[open.length - 1];
    open.pop();

    if (current === endIdx) {
      const path = [current];
      let c = current;
      while (cameFrom.has(c)) { c = cameFrom.get(c); path.push(c); }
      path.reverse();
      return { path, distance: currentG };
    }

    if (currentG > (gScore.get(current) ?? Infinity)) continue;

    const adj = graph.adjacency[current];
    for (let i = 0; i < adj.length; i += 2) {
      const neighbor = adj[i];
      const edgeDist = adj[i + 1];
      const tentG = currentG + edgeDist;
      if (tentG < (gScore.get(neighbor) ?? Infinity)) {
        gScore.set(neighbor, tentG);
        cameFrom.set(neighbor, current);
        const h = haversine(graph.nodes[neighbor], endCoord);
        open.push([tentG + h, tentG, neighbor]);
      }
    }
  }

  return { path: [startIdx, endIdx], distance: haversine(graph.nodes[startIdx], graph.nodes[endIdx]) };
}

function findEdgeGeometry(graph, fromIdx, toIdx) {
  const edges = graph.edgesRaw;
  const geoms = graph.edgeGeometries;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i][0] === fromIdx && edges[i][1] === toIdx) {
      const g = geoms[String(i)];
      return g || null;
    }
    if (edges[i][0] === toIdx && edges[i][1] === fromIdx) {
      const g = geoms[String(i)];
      return g ? g.slice().reverse() : null;
    }
  }
  return null;
}

function denseRoute(graph, start, end) {
  const startIdx = nearestNode(graph, start);
  const endIdx = nearestNode(graph, end);
  const { path, distance: pathDist } = astar(graph, startIdx, endIdx);

  const geometry = [start];
  const startNode = graph.nodes[startIdx];
  if (haversine(start, startNode) > 0.01) geometry.push(startNode);

  for (let i = 0; i < path.length - 1; i++) {
    const edgeGeom = findEdgeGeometry(graph, path[i], path[i + 1]);
    if (edgeGeom) {
      for (let j = 0; j < edgeGeom.length; j++) geometry.push(edgeGeom[j]);
    }
    geometry.push(graph.nodes[path[i + 1]]);
  }

  const endNode = graph.nodes[endIdx];
  if (haversine(end, endNode) > 0.01) geometry.push(end);

  const distanceKm = pathDist + haversine(start, startNode) + haversine(endNode, end);

  // Deduplicate consecutive identical points
  const deduped = [geometry[0]];
  for (let i = 1; i < geometry.length; i++) {
    if (geometry[i][0] !== deduped[deduped.length - 1][0] ||
        geometry[i][1] !== deduped[deduped.length - 1][1]) {
      deduped.push(geometry[i]);
    }
  }

  return { coordinates: deduped, distanceKm: Math.round(distanceKm * 10000) / 10000 };
}

function routeWithDenseGraph(graph, waypoints) {
  const coordinates = [];
  let distanceKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = denseRoute(graph, waypoints[i], waypoints[i + 1]);
    appendCoordinates(coordinates, leg.coordinates);
    distanceKm += leg.distanceKm;
  }

  return {
    source: 'offline-road-network',
    coordinates,
    distanceKm: Math.round(distanceKm * 10) / 10
  };
}

// --- Sparse graph routing (fallback) ---

function getSparseGraph() {
  if (sparseGraph) return sparseGraph;

  const nodes = new Map();
  const edges = new Map();
  const segments = [];

  SPARSE_ROAD_SEGMENTS.forEach(segment => {
    for (let index = 0; index < segment.length; index++) {
      addNode(nodes, edges, segment[index]);
      if (index > 0) {
        const from = segment[index - 1];
        const to = segment[index];
        addSparseEdge(nodes, edges, from, to);
        segments.push({ from, to, fromKey: coordinateKey(from), toKey: coordinateKey(to) });
      }
    }
  });

  sparseGraph = { nodes, edges, segments };
  return sparseGraph;
}

function routeWithSparseGraph(waypoints) {
  const graph = getSparseGraph();
  const coordinates = [];
  let distanceKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = sparseLegRoute(graph, waypoints[i], waypoints[i + 1]);
    if (leg.coordinates.length > 0) {
      appendCoordinates(coordinates, leg.coordinates);
      distanceKm += leg.distanceKm;
    }
  }

  return {
    source: 'offline-road-network',
    coordinates,
    distanceKm: Math.round(distanceKm * 10) / 10,
    isFallback: true
  };
}

function sparseLegRoute(base, from, to) {
  const graph = cloneSparseGraph(base);
  const fromKey = addWaypointToSparseGraph(graph, from, 'from');
  const toKey = addWaypointToSparseGraph(graph, to, 'to');
  const pathKeys = sparseShortestPath(graph, fromKey, toKey);

  if (pathKeys.length < 2) {
    return { coordinates: [from, to], distanceKm: haversine(from, to) };
  }

  const coords = pathKeys.map(key => graph.nodes.get(key));
  return { coordinates: coords, distanceKm: calculateRouteDistance(coords) };
}

function cloneSparseGraph(base) {
  return {
    nodes: new Map(base.nodes),
    edges: new Map(Array.from(base.edges.entries()).map(([key, links]) => [key, links.map(link => ({ ...link }))])),
    segments: base.segments
  };
}

function addWaypointToSparseGraph(graph, coordinate, prefix) {
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
      distanceKm: haversine(coordinate, projected)
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
  return [from[0] + (dx * t), from[1] + (dy * t)];
}

function sparseShortestPath(graph, startKey, endKey) {
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

// --- Shared helpers ---

function addNode(nodes, edges, coordinate) {
  const key = coordinateKey(coordinate);
  if (!nodes.has(key)) nodes.set(key, [...coordinate]);
  if (!edges.has(key)) edges.set(key, []);
  return key;
}

function addSparseEdge(nodes, edges, from, to) {
  const fromKey = addNode(nodes, edges, from);
  const toKey = addNode(nodes, edges, to);
  connectKeys({ nodes, edges }, fromKey, toKey);
}

function connectKeys(graph, fromKey, toKey) {
  const from = graph.nodes.get(fromKey);
  const to = graph.nodes.get(toKey);
  if (!from || !to || fromKey === toKey) return;

  const weight = haversine(from, to);
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
    return total + haversine(coordinates[index - 1], coordinate);
  }, 0);
}

function haversine(from, to) {
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
