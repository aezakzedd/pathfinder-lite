// Itinerary state management module
// Handles multi-day itinerary, destination selection, and time wallet

const STORAGE_KEY = 'pathfinder-lite-itinerary-state';
const DEFAULT_DAY_COUNT = 3;
const MAX_TRIP_DAYS = 7;

const DEFAULT_TRIP_SETUP = {
  startPoint: '',
  tripDate: '',
  tripEndDate: '',
  activities: [],
  budget: 'low',
  completed: false,
  completedAt: null
};

const DEFAULT_STATE = {
  selectedDestination: null,
  activeDay: 1,
  days: createDayMap(DEFAULT_DAY_COUNT),
  setup: { ...DEFAULT_TRIP_SETUP },
  plannedDayCount: null,
  dayCapacity: 8 // 8 hours per day
};

let state = { ...DEFAULT_STATE };
let listeners = [];

// Load state from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...DEFAULT_STATE, ...parsed };
      // Ensure days structure exists
      if (!state.days) {
        state.days = createDayMap(DEFAULT_DAY_COUNT);
      }
      state.setup = normalizeTripSetup(state.setup);
      ensureDayStructure();
    }
  } catch (error) {
    console.error('Error loading itinerary state:', error);
    state = { ...DEFAULT_STATE };
  }
}

// Save state to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving itinerary state:', error);
  }
}

// Notify listeners of state changes
function notifyListeners() {
  listeners.forEach(listener => listener(state));
}

function normalizeTripSetup(setup = {}) {
  return {
    ...DEFAULT_TRIP_SETUP,
    ...setup,
    tripEndDate: setup.tripEndDate || setup.endDate || '',
    activities: Array.isArray(setup.activities) ? setup.activities : []
  };
}

function getTripSetup() {
  return {
    ...state.setup,
    activities: [...state.setup.activities]
  };
}

function updateTripSetup(updates = {}) {
  state.setup = normalizeTripSetup({
    ...state.setup,
    ...updates,
    completed: false,
    completedAt: null
  });
  state.plannedDayCount = null;
  ensureDayStructure();
  saveState();
  notifyListeners();
}

function toggleTripSetupActivity(activity) {
  const activities = new Set(state.setup.activities);
  if (activities.has(activity)) {
    activities.delete(activity);
  } else {
    activities.add(activity);
  }
  updateTripSetup({ activities: [...activities] });
}

function setTripSetupBudget(budget) {
  updateTripSetup({ budget });
}

function isTripSetupComplete(setup = state.setup) {
  return Boolean(
    setup.startPoint &&
    setup.tripDate &&
    setup.tripEndDate &&
    Array.isArray(setup.activities) &&
    setup.activities.length > 0
  );
}

function completeTripSetup() {
  if (!isTripSetupComplete(state.setup)) {
    return { success: false, message: 'Complete start point, date, and activities first' };
  }

  state.setup = normalizeTripSetup({
    ...state.setup,
    completed: true,
    completedAt: new Date().toISOString()
  });
  state.plannedDayCount = null;
  ensureDayStructure();
  saveState();
  notifyListeners();
  return { success: true, setup: getTripSetup() };
}

// Get selected destination
function getSelectedDestination() {
  return state.selectedDestination;
}

// Set selected destination
function setSelectedDestination(destination) {
  state.selectedDestination = destination;
  saveState();
  notifyListeners();
}

// Clear selected destination
function clearSelectedDestination() {
  state.selectedDestination = null;
  saveState();
  notifyListeners();
}

// Get active day
function getActiveDay() {
  return state.activeDay;
}

// Set active day
function setActiveDay(day) {
  const dayCount = getTripDayCount();
  const targetDay = Number(day);
  if (targetDay >= 1 && targetDay <= dayCount) {
    state.activeDay = targetDay;
    saveState();
    notifyListeners();
  }
}

// Get stops for a specific day
function getDayStops(day = null) {
  const targetDay = day || state.activeDay;
  return state.days[targetDay] || [];
}

// Get all days
function getAllDays() {
  return state.days;
}

// Add destination to active day
function addStopToDay(destination) {
  ensureDayStructure();
  const day = state.activeDay;
  const stops = state.days[day] || (state.days[day] = []);
  
  // Check for duplicate
  const isDuplicate = stops.some(stop => stop.id === destination.id);
  if (isDuplicate) {
    return { success: false, message: 'Destination already added to this day' };
  }
  
  // Add stop with default time
  const stop = {
    ...destination,
    stopId: `${destination.id}-${Date.now()}`,
    time: '9:00 AM',
    duration: parseDuration(destination.estimatedTime, destination.visit_time_minutes)
  };
  
  state.days[day].push(stop);
  saveState();
  notifyListeners();
  
  return { success: true, message: 'Added to itinerary' };
}

// Remove stop from active day
function removeStopFromDay(stopId) {
  ensureDayStructure();
  const day = state.activeDay;
  state.days[day] = (state.days[day] || []).filter(stop => stop.stopId !== stopId);
  saveState();
  notifyListeners();
}

function removeDestinationFromDay(destinationId, day = null) {
  ensureDayStructure();
  const targetDay = day || state.activeDay;
  const stop = state.days[targetDay]?.find(item => item.id === destinationId);
  if (!stop) {
    return { success: false, message: 'Destination is not in this day' };
  }

  state.days[targetDay] = state.days[targetDay].filter(item => item.id !== destinationId);
  saveState();
  notifyListeners();
  return { success: true, message: 'Removed from itinerary' };
}

function replaceItineraryDays(days = {}, dayCount = getTripDayCount()) {
  const timestamp = Date.now();
  const safeDayCount = clampDayCount(dayCount);
  state.plannedDayCount = safeDayCount;
  state.days = createDayMap(safeDayCount);

  Array.from({ length: safeDayCount }, (_, index) => index + 1).forEach(day => {
    const dayStops = Array.isArray(days[day]) ? days[day] : [];
    state.days[day] = dayStops.map((destination, index) => ({
      ...destination,
      stopId: `${destination.id}-${timestamp}-${day}-${index}`,
      time: destination.time || '9:00 AM',
      duration: parseDuration(destination.estimatedTime, destination.visit_time_minutes)
    }));
  });

  state.activeDay = 1;
  ensureDayStructure(safeDayCount);
  saveState();
  notifyListeners();
}

// Move stop up in the list
function moveStopUp(stopId) {
  ensureDayStructure();
  const day = state.activeDay;
  const stops = state.days[day] || [];
  const index = stops.findIndex(stop => stop.stopId === stopId);
  
  if (index > 0) {
    [stops[index - 1], stops[index]] = [stops[index], stops[index - 1]];
    saveState();
    notifyListeners();
  }
}

// Move stop down in the list
function moveStopDown(stopId) {
  ensureDayStructure();
  const day = state.activeDay;
  const stops = state.days[day] || [];
  const index = stops.findIndex(stop => stop.stopId === stopId);
  
  if (index < stops.length - 1) {
    [stops[index], stops[index + 1]] = [stops[index + 1], stops[index]];
    saveState();
    notifyListeners();
  }
}

function reorderStop(stopId, targetStopId) {
  ensureDayStructure();
  const day = state.activeDay;
  const stops = state.days[day] || [];
  const fromIndex = stops.findIndex(stop => stop.stopId === stopId);
  const toIndex = stops.findIndex(stop => stop.stopId === targetStopId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return;
  }

  const [movedStop] = stops.splice(fromIndex, 1);
  stops.splice(toIndex, 0, movedStop);
  saveState();
  notifyListeners();
}

function reorderStopToEnd(stopId) {
  ensureDayStructure();
  const day = state.activeDay;
  const stops = state.days[day] || [];
  const fromIndex = stops.findIndex(stop => stop.stopId === stopId);

  if (fromIndex === -1 || fromIndex === stops.length - 1) {
    return;
  }

  const [movedStop] = stops.splice(fromIndex, 1);
  stops.push(movedStop);
  saveState();
  notifyListeners();
}

// Update stop time
function updateStopTime(stopId, time) {
  ensureDayStructure();
  const day = state.activeDay;
  const stop = (state.days[day] || []).find(s => s.stopId === stopId);
  if (stop) {
    stop.time = time;
    saveState();
    notifyListeners();
  }
}

// Calculate total duration for a day
function calculateDayDuration(day = null) {
  const targetDay = day || state.activeDay;
  const stops = state.days[targetDay] || [];
  return stops.reduce((total, stop) => total + (stop.duration || 0), 0);
}

// Calculate time wallet percentage
function calculateTimeWalletPercentage(day = null, options = {}) {
  return getTimeWalletInfo(day, options).percentage;
}

// Get time wallet info
function getTimeWalletInfo(day = null, options = {}) {
  const targetDay = day || state.activeDay;
  const visitMinutes = options.visitMinutes ?? Math.round(calculateDayDuration(targetDay) * 60);
  const driveTime = Number(options.travelMinutes ?? options.driveTime ?? 0);
  const totalMinutes = Math.max(0, visitMinutes + (Number.isFinite(driveTime) ? driveTime : 0));
  const totalDuration = totalMinutes / 60;
  const percentage = Math.min((totalDuration / state.dayCapacity) * 100, 100);
  const remaining = Math.max(state.dayCapacity - totalDuration, 0);
  
  let pace = 'Relaxed';
  if (percentage > 80) pace = 'Full';
  else if (percentage > 60) pace = 'Moderate';
  
  return {
    totalDuration,
    totalMinutes,
    driveTime: Number.isFinite(driveTime) ? driveTime : 0,
    visitTime: visitMinutes,
    percentage,
    remaining,
    pace,
    capacity: state.dayCapacity
  };
}

// Check if destination is already in active day
function isDestinationInDay(destinationId, day = null) {
  const targetDay = day || state.activeDay;
  return state.days[targetDay].some(stop => stop.id === destinationId);
}

// Get stop count for a day
function getStopCount(day = null) {
  const targetDay = day || state.activeDay;
  return state.days[targetDay].length;
}

// Reset itinerary state
function resetItinerary() {
  state = {
    ...DEFAULT_STATE,
    days: createDayMap(DEFAULT_DAY_COUNT),
    setup: { ...DEFAULT_TRIP_SETUP },
    plannedDayCount: null
  };
  saveState();
  notifyListeners();
}

// Clear itinerary (alias for reset)
function clearItinerary() {
  resetItinerary();
}

// Get all stops across all days
function getAllStops() {
  const allStops = [];
  Object.keys(state.days).forEach(day => {
    state.days[day].forEach(stop => {
      allStops.push({ ...stop, day: parseInt(day) });
    });
  });
  return allStops;
}

// Subscribe to state changes
function subscribe(listener) {
  listeners.push(listener);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

// Get entire state
function getState() {
  return { ...state };
}

function getTripDayCount(setup = state.setup) {
  if (state.plannedDayCount) return clampDayCount(state.plannedDayCount);
  return calculateTripDayCount(setup, Object.keys(state.days || {}).length || DEFAULT_DAY_COUNT);
}

function calculateTripDayCount(setup = {}, fallbackDayCount = DEFAULT_DAY_COUNT) {
  const startValue = setup.tripDate || setup.startDate;
  const endValue = setup.tripEndDate || setup.endDate;
  const start = parseLocalDate(startValue);
  const end = parseLocalDate(endValue);

  if (!start || !end) return clampDayCount(fallbackDayCount);

  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return clampDayCount(diffDays);
}

function ensureDayStructure(dayCount = getTripDayCount()) {
  const safeDayCount = clampDayCount(dayCount);
  const nextDays = createDayMap(safeDayCount);

  Object.keys(nextDays).forEach(day => {
    nextDays[day] = Array.isArray(state.days?.[day]) ? state.days[day] : [];
  });

  state.days = nextDays;
  if (state.activeDay > safeDayCount) state.activeDay = safeDayCount;
  if (state.activeDay < 1) state.activeDay = 1;
}

function createDayMap(dayCount = DEFAULT_DAY_COUNT) {
  return Array.from({ length: clampDayCount(dayCount) }, (_, index) => index + 1)
    .reduce((days, day) => {
      days[day] = [];
      return days;
    }, {});
}

function clampDayCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_DAY_COUNT;
  return Math.min(Math.max(Math.floor(number), 1), MAX_TRIP_DAYS);
}

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Parse duration string to hours (e.g., "2-3 hours" -> 2.5)
function parseDuration(durationStr, visitTimeMinutes = null) {
  const minutes = Number(visitTimeMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    return minutes / 60;
  }

  if (!durationStr) return 1; // Default 1 hour
  
  const match = durationStr.match(/(\d+)(?:-(\d+))?\s*hours?/i);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = match[2] ? parseInt(match[2], 10) : min;
    return (min + max) / 2;
  }
  
  return 1; // Default 1 hour
}

// Initialize state
loadState();

export {
  getSelectedDestination,
  setSelectedDestination,
  clearSelectedDestination,
  getActiveDay,
  setActiveDay,
  getDayStops,
  getAllDays,
  addStopToDay,
  removeStopFromDay,
  removeDestinationFromDay,
  replaceItineraryDays,
  moveStopUp,
  moveStopDown,
  reorderStop,
  reorderStopToEnd,
  updateStopTime,
  calculateDayDuration,
  calculateTimeWalletPercentage,
  getTimeWalletInfo,
  isDestinationInDay,
  getStopCount,
  getTripSetup,
  getTripDayCount,
  calculateTripDayCount,
  updateTripSetup,
  toggleTripSetupActivity,
  setTripSetupBudget,
  isTripSetupComplete,
  completeTripSetup,
  resetItinerary,
  clearItinerary,
  getAllStops,
  subscribe,
  getState
};
