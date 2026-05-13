// Chat state management module
// Handles chat messages with optional persistence

const STORAGE_KEY = 'pathfinder-lite-chat-messages';
const STATE_KEY = 'pathfinder-lite-chat-state';
const CACHE_KEY = 'pathfinder-lite-query-cache';
const MAX_MESSAGES = 50;
const MAX_CACHE_ENTRIES = 40;
const CACHE_THRESHOLD = 0.72;

let messages = [];
let listeners = [];

let conversationState = {
  lastPlace: null,
  lastActivity: null,
  lastTown: null,
  lastIntent: null,
  mentionedPlaces: [],
  turnCount: 0,
  detectedLanguage: 'en'
};

function loadConversationState() {
  try {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) {
      conversationState = { ...conversationState, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading chat state:', error);
  }
}

function saveConversationState() {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(conversationState));
  } catch (error) {
    console.error('Error saving chat state:', error);
  }
}

function getConversationState() {
  return { ...conversationState };
}

function updateConversationState(updates) {
  conversationState = { ...conversationState, ...updates };
  saveConversationState();
}

function resetConversationState() {
  conversationState = {
    lastPlace: null,
    lastActivity: null,
    lastTown: null,
    lastIntent: null,
    mentionedPlaces: [],
    turnCount: 0
  };
  saveConversationState();
}

// ---------------------------------------------------------------------------
// QUERY CACHE (lightweight semantic cache in sessionStorage)
// ---------------------------------------------------------------------------
let queryCache = [];

const FILLER_WORDS = new Set([
  'the','a','an','in','on','at','to','for','of','and',
  'is','are','was','were','be','been','being',
  'do','does','did','will','would','could','should',
  'i','you','he','she','it','we','they','me','him','her','them'
]);

function normalizeQuery(text) {
  let cleaned = String(text).toLowerCase().trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(w => w && !FILLER_WORDS.has(w));
  return words.join(' ');
}

function jaccardSimilarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function loadQueryCache() {
  try {
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (saved) {
      queryCache = JSON.parse(saved);
      if (queryCache.length > MAX_CACHE_ENTRIES) {
        queryCache = queryCache.slice(-MAX_CACHE_ENTRIES);
      }
    }
  } catch (error) {
    console.error('Error loading query cache:', error);
    queryCache = [];
  }
}

function saveQueryCache() {
  try {
    const toSave = queryCache.slice(-MAX_CACHE_ENTRIES);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving query cache:', error);
  }
}

function getCachedResponse(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  // 1. Exact match
  for (const entry of queryCache) {
    if (entry.normalized === normalized) {
      entry.accessedAt = Date.now();
      saveQueryCache();
      return entry.response;
    }
  }

  // 2. Jaccard similarity
  let best = null;
  let bestScore = 0;
  for (const entry of queryCache) {
    const score = jaccardSimilarity(normalized, entry.normalized);
    if (score >= CACHE_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best) {
    best.accessedAt = Date.now();
    saveQueryCache();
    return { ...best.response, cached: true, similarity: Math.round(bestScore * 1000) / 1000 };
  }
  return null;
}

function cacheResponse(query, response) {
  if (!response || !response.answer) return;
  const normalized = normalizeQuery(query);
  if (!normalized) return;

  // Update existing if exact match
  for (const entry of queryCache) {
    if (entry.normalized === normalized) {
      entry.response = {
        answer: response.answer,
        locations: response.locations || [],
        actions: response.actions || [],
        follow_up: response.follow_up || null,
        intent: response.intent || null
      };
      entry.updatedAt = Date.now();
      entry.accessedAt = Date.now();
      saveQueryCache();
      return;
    }
  }

  // Append new
  queryCache.push({
    normalized,
    response: {
      answer: response.answer,
      locations: response.locations || [],
      actions: response.actions || [],
      follow_up: response.follow_up || null,
      intent: response.intent || null
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    accessedAt: Date.now()
  });

  if (queryCache.length > MAX_CACHE_ENTRIES) {
    queryCache.sort((a, b) => b.accessedAt - a.accessedAt);
    queryCache = queryCache.slice(0, MAX_CACHE_ENTRIES);
  }
  saveQueryCache();
}

function clearQueryCache() {
  queryCache = [];
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error('Error clearing query cache:', e);
  }
}

// Load messages from sessionStorage
function loadMessages() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      messages = JSON.parse(saved);
      // Limit to max messages
      if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(-MAX_MESSAGES);
      }
    }
  } catch (error) {
    console.error('Error loading chat messages:', error);
    messages = [];
  }
}

// Save messages to sessionStorage
function saveMessages() {
  try {
    // Only keep last MAX_MESSAGES
    const toSave = messages.slice(-MAX_MESSAGES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving chat messages:', error);
  }
}

// Add a message
function addMessage(message) {
  messages.push({
    ...message,
    id: message.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  });
  
  // Limit messages
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }
  
  saveMessages();
  notifyListeners();
}

// Get all messages
function getMessages() {
  return [...messages];
}

// Clear all messages
function clearMessages() {
  messages = [];
  saveMessages();
  notifyListeners();
}

// Get message count
function getMessageCount() {
  return messages.length;
}

// Remove a message by id
function removeMessage(id) {
  messages = messages.filter(m => m.id !== id);
  saveMessages();
  notifyListeners();
}

// Subscribe to message changes
function subscribe(listener) {
  listeners.push(listener);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

// Notify listeners of changes
function notifyListeners() {
  listeners.forEach(listener => listener(messages));
}

// Initialize
loadMessages();
loadConversationState();
loadQueryCache();

export {
  addMessage,
  getMessages,
  clearMessages,
  getMessageCount,
  removeMessage,
  subscribe,
  getConversationState,
  updateConversationState,
  resetConversationState,
  getCachedResponse,
  cacheResponse,
  clearQueryCache
};
