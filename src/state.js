// Global state management for pathfinder-lite
// Uses localStorage for persistence

const STORAGE_KEYS = {
  THEME: 'pathfinder-lite-theme',
  ITINERARY: 'pathfinder-lite-itinerary',
  ACTIVE_HUB: 'pathfinder-lite-active-hub',
  DATE_RANGE: 'pathfinder-lite-date-range',
  SELECTED_ACTIVITIES: 'pathfinder-lite-activities'
};

const defaultState = {
  theme: 'light',
  itinerary: [],
  activeHub: null,
  dateRange: null,
  selectedActivities: []
};

let state = { ...defaultState };

// Load state from localStorage
function loadState() {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    const itinerary = localStorage.getItem(STORAGE_KEYS.ITINERARY);
    const activeHub = localStorage.getItem(STORAGE_KEYS.ACTIVE_HUB);
    const dateRange = localStorage.getItem(STORAGE_KEYS.DATE_RANGE);
    const selectedActivities = localStorage.getItem(STORAGE_KEYS.SELECTED_ACTIVITIES);
    
    if (theme) state.theme = theme;
    if (itinerary) state.itinerary = JSON.parse(itinerary);
    if (activeHub) state.activeHub = JSON.parse(activeHub);
    if (dateRange) state.dateRange = JSON.parse(dateRange);
    if (selectedActivities) state.selectedActivities = JSON.parse(selectedActivities);
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

// Save state to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    localStorage.setItem(STORAGE_KEYS.ITINERARY, JSON.stringify(state.itinerary));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HUB, JSON.stringify(state.activeHub));
    localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify(state.dateRange));
    localStorage.setItem(STORAGE_KEYS.SELECTED_ACTIVITIES, JSON.stringify(state.selectedActivities));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Get state value
function getState(key) {
  return state[key];
}

// Set state value
function setState(key, value) {
  state[key] = value;
  saveState();
}

// Get entire state
function getAllState() {
  return { ...state };
}

// Reset state to defaults
function resetState() {
  state = { ...defaultState };
  saveState();
}

// Initialize state
loadState();

export { getState, setState, getAllState, resetState, STORAGE_KEYS };
