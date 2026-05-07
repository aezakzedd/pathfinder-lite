import { calculateDistance, calculateTimeUsage, estimateDriveMinutes, getDestinationCoordinates, isValidCoordinates } from './distance.js';
import { optimizeRoute } from './optimize.js';

export const FILTER_LABELS = {
  Water: ['beach', 'swimming', 'falls', 'beach_resort'],
  Outdoor: ['hike', 'nature'],
  Views: ['viewpoint'],
  Heritage: ['religious', 'history', 'culture', 'indoor'],
  Dining: ['food'],
  Stay: ['accommodation', 'beach_resort']
};

const DISPLAY_CATEGORY_BY_RAW = Object.entries(FILTER_LABELS).reduce((map, [label, categories]) => {
  categories.forEach(category => {
    if (!map[category]) map[category] = label;
  });
  return map;
}, {});

const CATEGORY_PRIORITY = {
  beach: 1,
  swimming: 1,
  falls: 1,
  hike: 1,
  nature: 1,
  viewpoint: 2,
  beach_resort: 2,
  religious: 2,
  history: 2,
  culture: 2,
  indoor: 2,
  food: 3,
  accommodation: 4
};

const CATEGORY_VISIT_FALLBACK = {
  accommodation: 45,
  beach_resort: 60,
  food: 75,
  beach: 120,
  swimming: 90,
  hike: 110,
  falls: 95,
  nature: 90,
  viewpoint: 70,
  religious: 45,
  history: 55,
  culture: 60,
  indoor: 60
};

const DAILY_CAPACITY_MINUTES = 540;
const SLOT_PLAN = [
  { name: 'morning', minutes: 150 },
  { name: 'midday', minutes: 120 },
  { name: 'afternoon', minutes: 150 },
  { name: 'evening', minutes: 120 }
];

const ALL_MUNICIPALITIES = [
  'Virac',
  'San Andres',
  'Bato',
  'Gigmoto',
  'Caramoran',
  'Baras',
  'San Miguel',
  'Bagamanoc',
  'Panganiban',
  'Viga',
  'Pandan'
];

const ZONE_PLANS = {
  1: [ALL_MUNICIPALITIES],
  2: [
    ['Virac', 'San Andres', 'Bato', 'Baras', 'San Miguel'],
    ['Gigmoto', 'Caramoran', 'Bagamanoc', 'Panganiban', 'Viga', 'Pandan']
  ],
  3: [
    ['Virac', 'San Andres'],
    ['Bato', 'Baras', 'San Miguel', 'Gigmoto', 'Caramoran'],
    ['Bagamanoc', 'Panganiban', 'Viga', 'Pandan']
  ],
  4: [
    ['Virac', 'San Andres'],
    ['Bato', 'Baras', 'San Miguel'],
    ['Gigmoto', 'Caramoran'],
    ['Bagamanoc', 'Panganiban', 'Viga', 'Pandan']
  ],
  5: [
    ['Virac'],
    ['San Andres', 'Bato'],
    ['Baras', 'San Miguel'],
    ['Gigmoto', 'Caramoran'],
    ['Bagamanoc', 'Panganiban', 'Viga', 'Pandan']
  ],
  6: [
    ['Virac'],
    ['San Andres', 'Bato'],
    ['Baras', 'San Miguel'],
    ['Gigmoto', 'Caramoran'],
    ['Bagamanoc', 'Panganiban'],
    ['Viga', 'Pandan']
  ],
  7: [
    ['Virac'],
    ['San Andres'],
    ['Bato', 'Baras'],
    ['San Miguel'],
    ['Gigmoto', 'Caramoran'],
    ['Bagamanoc', 'Panganiban'],
    ['Viga', 'Pandan']
  ]
};

export function featureCollectionToDestinations(geojson) {
  if (!geojson?.features?.length) return [];

  return geojson.features
    .map(normalizeDestinationFeature)
    .filter(Boolean);
}

export function normalizeDestinationFeature(feature) {
  const geometry = feature?.geometry;
  const properties = feature?.properties || {};

  if (geometry?.type !== 'Point' || !isValidCoordinates(geometry.coordinates)) {
    return null;
  }

  const rawCategory = normalizeCategory(properties.category || properties.type);
  const categoryGroup = DISPLAY_CATEGORY_BY_RAW[rawCategory] || normalizeDisplayCategory(rawCategory);
  const id = properties.id ?? properties.OBJECTID ?? properties.name;

  if (!id || !properties.name) return null;

  return {
    ...properties,
    id: String(id),
    name: String(properties.name),
    description: properties.description || '',
    municipality: formatTitle(properties.municipality || properties.MUNICIPALI || ''),
    type: properties.type || '',
    category: rawCategory,
    categoryGroup,
    displayCategory: categoryGroup,
    coordinates: [...geometry.coordinates],
    geometry: {
      type: 'Point',
      coordinates: [...geometry.coordinates]
    },
    min_budget: normalizeBudget(properties.min_budget),
    budgetLabel: formatBudgetLabel(properties.min_budget),
    best_time_of_day: properties.best_time_of_day || 'any',
    outdoor_exposure: properties.outdoor_exposure || '',
    visit_time_minutes: normalizeVisitMinutes(properties.visit_time_minutes, rawCategory),
    is_top_10: Boolean(properties.is_top_10),
    isTop10: Boolean(properties.is_top_10),
    sourceProperties: { ...properties }
  };
}

export function filterDestinationsForSetup(destinations = [], setup = {}) {
  return destinations.filter(destination => destinationMatchesSetup(destination, setup));
}

export function destinationMatchesSetup(destination, setup = {}) {
  if (!destination) return false;
  if (!matchesBudget(destination, setup.budget)) return false;

  const activeActivities = Array.isArray(setup.activities) ? setup.activities : [];
  if (activeActivities.length === 0) return true;
  if (destination.isTop10 || destination.is_top_10) return true;

  return matchesActivity(destination, activeActivities);
}

export function matchesActivity(destination, activeActivities = []) {
  if (!Array.isArray(activeActivities) || activeActivities.length === 0) return true;

  const activeCategories = new Set(
    activeActivities.flatMap(label => FILTER_LABELS[label] || [])
  );

  return activeCategories.has(normalizeCategory(destination.category || destination.rawCategory));
}

export function matchesBudget(destination, selectedBudget = 'low') {
  const destinationBudget = normalizeBudget(destination.min_budget);
  return getAllowedBudgetTiers(selectedBudget).includes(destinationBudget);
}

export function normalizeBudget(value = 'low') {
  const raw = String(value || '').toLowerCase().trim();
  if (raw.includes('high') || raw.includes('600') || raw === 'phpphpphp' || raw === 'ppp') return 'high';
  if (raw.includes('medium') || raw.includes('mid') || raw.includes('200-') || raw === 'phpphp' || raw === 'pp') return 'medium';
  return 'low';
}

function getAllowedBudgetTiers(value = 'low') {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeBudget))];
  }

  const selected = normalizeBudget(value);
  if (selected === 'high') return ['low', 'medium', 'high'];
  if (selected === 'medium') return ['low', 'medium'];
  return ['low'];
}

export function findDestinationsByLocations(destinations = [], locations = []) {
  if (!Array.isArray(locations) || locations.length === 0) return [];

  const matches = [];
  const seenIds = new Set();

  locations.forEach(location => {
    const match = findDestinationByLocation(destinations, location);
    if (match && !seenIds.has(match.id)) {
      seenIds.add(match.id);
      matches.push(match);
    }
  });

  return matches;
}

export function generateItinerary({
  hub,
  dayCount = 3,
  budgetFilter = 'low',
  selectedActivities = [],
  allSpots = []
}) {
  const hubCoordinates = getDestinationCoordinates(hub);
  if (!hubCoordinates || dayCount < 1) {
    return { days: {}, dayMeta: {} };
  }

  const pool = filterDestinationsForSetup(allSpots, {
    activities: selectedActivities,
    budget: budgetFilter
  }).filter(destination => Number(destination.visit_time_minutes) > 0);

  if (pool.length === 0) return { days: {}, dayMeta: {} };

  const zonePlan = getZonePlan(dayCount);
  const zoneBuckets = clusterByZone(pool, zonePlan);
  const allCandidates = sortByPriority(sortByProximity(pool, hubCoordinates));
  const usedIds = new Set();
  const days = {};
  const dayMeta = {};

  let dayStartCoordinates = hubCoordinates;
  let dayStartLabel = hub.name || 'Selected hub';

  for (let day = 1; day <= dayCount; day += 1) {
    const primaryPool = sortByProximity(
      (zoneBuckets[day - 1] || []).filter(destination => !usedIds.has(destination.id)),
      dayStartCoordinates
    );
    const primaryIds = new Set(primaryPool.map(destination => destination.id));
    const secondaryPool = sortByProximity(
      allCandidates.filter(destination => !usedIds.has(destination.id) && !primaryIds.has(destination.id)),
      dayStartCoordinates
    );

    const selected = buildDayFromSlotPlan({
      hub,
      dayStartCoordinates,
      primaryPool,
      secondaryPool,
      usedIds
    });

    days[day] = selected;
    const lastStop = selected[selected.length - 1];
    const lastCoordinates = getDestinationCoordinates(lastStop) || dayStartCoordinates;

    dayMeta[day] = {
      startCoordinates: dayStartCoordinates,
      startLabel: dayStartLabel,
      endCoordinates: lastCoordinates
    };

    dayStartCoordinates = lastCoordinates;
    dayStartLabel = lastStop?.name || dayStartLabel;
  }

  return { days, dayMeta };
}

function findDestinationByLocation(destinations, location) {
  const id = typeof location === 'object' ? location.id : null;
  const name = typeof location === 'object' ? (location.name || location.location || location.title) : location;
  const normalizedName = normalizeLookup(name);

  if (id !== null && id !== undefined) {
    const normalizedId = String(id);
    const byId = destinations.find(destination => destination.id === normalizedId);
    if (byId) return byId;
  }

  if (!normalizedName) return null;

  return destinations.find(destination => normalizeLookup(destination.name) === normalizedName) ||
    destinations.find(destination => normalizeLookup(destination.name).includes(normalizedName) ||
      normalizedName.includes(normalizeLookup(destination.name)));
}

function buildDayFromSlotPlan({ hub, dayStartCoordinates, primaryPool, secondaryPool, usedIds }) {
  const selected = [];
  const selectedIds = new Set();
  let currentCoordinates = dayStartCoordinates;
  let totalUsedMinutes = 0;

  SLOT_PLAN.forEach(slot => {
    let slotUsedMinutes = 0;
    let guard = 0;

    while (guard < 256) {
      guard += 1;
      const candidate = pickBestCandidateForSlot({
        slotName: slot.name,
        slotRemainingMinutes: slot.minutes - slotUsedMinutes,
        dayRemainingMinutes: DAILY_CAPACITY_MINUTES - totalUsedMinutes,
        currentCoordinates,
        primaryPool,
        secondaryPool,
        selectedIds
      });

      if (!candidate) break;

      const incrementMinutes = estimateIncrementMinutes(currentCoordinates, candidate);
      if (incrementMinutes <= 0) break;

      selected.push(candidate);
      selectedIds.add(candidate.id);
      usedIds.add(candidate.id);
      currentCoordinates = getDestinationCoordinates(candidate);
      slotUsedMinutes += incrementMinutes;
      totalUsedMinutes += incrementMinutes;
    }
  });

  const optimized = selected.length > 0
    ? optimizeRoute(hub, selected, { startCoordinates: dayStartCoordinates })
    : [];

  while (optimized.length > 0) {
    const usage = calculateTimeUsage(hub, optimized, {
      startCoordinates: dayStartCoordinates,
      includeReturnLeg: false
    });

    if (usage.totalUsed <= DAILY_CAPACITY_MINUTES) break;

    const removed = optimized.pop();
    if (removed?.id) usedIds.delete(removed.id);
  }

  return optimized;
}

function pickBestCandidateForSlot({
  slotName,
  slotRemainingMinutes,
  dayRemainingMinutes,
  currentCoordinates,
  primaryPool,
  secondaryPool,
  selectedIds
}) {
  const ranked = [
    ...rankCandidates(primaryPool, slotName, currentCoordinates, selectedIds, true),
    ...rankCandidates(secondaryPool, slotName, currentCoordinates, selectedIds, false)
  ];

  return ranked.find(candidate => {
    const increment = estimateIncrementMinutes(currentCoordinates, candidate);
    return increment <= slotRemainingMinutes && increment <= dayRemainingMinutes;
  }) || null;
}

function rankCandidates(pool, slotName, currentCoordinates, selectedIds, isPrimary) {
  return pool
    .filter(destination => !selectedIds.has(destination.id) && isSlotCompatible(slotName, normalizeDaypartTag(destination.best_time_of_day)))
    .sort((a, b) => {
      const rankA = rankForSlot(a, slotName, currentCoordinates, isPrimary);
      const rankB = rankForSlot(b, slotName, currentCoordinates, isPrimary);
      return rankA - rankB;
    });
}

function rankForSlot(destination, slotName, currentCoordinates, isPrimary) {
  const daypartTag = normalizeDaypartTag(destination.best_time_of_day);
  const distanceWeight = calculateDistance(currentCoordinates, getDestinationCoordinates(destination));
  const priorityWeight = getCategoryPriority(destination) * 9;
  const daypartWeight = slotPenalty(slotName, daypartTag);
  const primaryBoost = isPrimary ? -4 : 0;
  const featuredBoost = destination.isTop10 ? -6 : 0;

  return (distanceWeight * 3.5) + priorityWeight + daypartWeight + primaryBoost + featuredBoost;
}

function estimateIncrementMinutes(fromCoordinates, destination) {
  const toCoordinates = getDestinationCoordinates(destination);
  if (!toCoordinates) return 0;
  const distance = calculateDistance(fromCoordinates, toCoordinates);
  return estimateDriveMinutes(distance) + normalizeVisitMinutes(destination.visit_time_minutes, destination.category);
}

function getZonePlan(dayCount) {
  const clamped = Math.min(Math.max(Number(dayCount) || 1, 1), 7);
  return ZONE_PLANS[clamped] || ZONE_PLANS[7];
}

function clusterByZone(destinations, zonePlan) {
  const municipalityToZone = {};
  zonePlan.forEach((municipalities, zoneIndex) => {
    municipalities.forEach(municipality => {
      municipalityToZone[municipality.toLowerCase()] = zoneIndex;
    });
  });

  const buckets = zonePlan.map(() => []);
  const overflow = [];

  destinations.forEach(destination => {
    const zoneIndex = municipalityToZone[String(destination.municipality || '').toLowerCase()];
    if (zoneIndex === undefined) {
      overflow.push(destination);
    } else {
      buckets[zoneIndex].push(destination);
    }
  });

  if (overflow.length > 0) {
    buckets[buckets.length - 1].push(...overflow);
  }

  return buckets;
}

function sortByProximity(destinations, startCoordinates) {
  return [...destinations]
    .filter(destination => getDestinationCoordinates(destination))
    .sort((a, b) => calculateDistance(startCoordinates, getDestinationCoordinates(a)) -
      calculateDistance(startCoordinates, getDestinationCoordinates(b)));
}

function sortByPriority(destinations) {
  return [...destinations].sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));
}

function getCategoryPriority(destination) {
  return CATEGORY_PRIORITY[normalizeCategory(destination.category)] ?? 2;
}

function normalizeVisitMinutes(value, category) {
  const minutes = Number(value);
  if (Number.isFinite(minutes) && minutes > 0) {
    return Math.max(15, Math.min(240, Math.round(minutes)));
  }

  return CATEGORY_VISIT_FALLBACK[normalizeCategory(category)] ?? 60;
}

function normalizeDaypartTag(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw || raw === 'any') return 'any';
  if (raw.includes('night') || raw.includes('evening') || raw.includes('dinner') || raw.includes('sunset')) return 'evening';
  if (raw.includes('afternoon')) return 'afternoon';
  if (raw.includes('midday') || raw.includes('noon') || raw.includes('lunch')) return 'midday';
  if (raw.includes('morning') || raw.includes('sunrise') || raw.includes('breakfast')) return 'morning';
  return 'any';
}

function isSlotCompatible(slotName, daypartTag) {
  if (daypartTag === 'evening') return slotName === 'evening';
  return true;
}

function slotPenalty(slotName, daypartTag) {
  if (daypartTag === 'any') {
    if (slotName === 'morning') return 8;
    if (slotName === 'evening') return 12;
    return 0;
  }

  const matrix = {
    morning: { morning: 0, midday: 14, afternoon: 28, evening: 65 },
    midday: { morning: 18, midday: 0, afternoon: 12, evening: 48 },
    afternoon: { morning: 30, midday: 10, afternoon: 0, evening: 26 },
    evening: { morning: 70, midday: 52, afternoon: 26, evening: 0 }
  };

  return matrix[daypartTag]?.[slotName] ?? 0;
}

function normalizeDisplayCategory(rawCategory) {
  const category = String(rawCategory || '').toLowerCase();
  if (category.includes('hotel') || category.includes('resort')) return 'Stay';
  if (category.includes('food') || category.includes('dining')) return 'Dining';
  if (category.includes('falls') || category.includes('beach') || category.includes('swim')) return 'Water';
  if (category.includes('view')) return 'Views';
  if (category.includes('church') || category.includes('history') || category.includes('culture')) return 'Heritage';
  return 'Outdoor';
}

function normalizeCategory(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/&/g, 'and');
}

function normalizeLookup(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatTitle(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatBudgetLabel(value = 'low') {
  const normalized = normalizeBudget(value);
  if (normalized === 'high') return 'PHP600+';
  if (normalized === 'medium') return 'PHP200-PHP600';
  return '<=PHP200';
}
