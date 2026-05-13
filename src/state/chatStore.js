// Chat state management module
// Handles chat messages with optional persistence

const STORAGE_KEY = 'pathfinder-lite-chat-messages';
const STATE_KEY = 'pathfinder-lite-chat-state';
const MAX_MESSAGES = 50;

let messages = [];
let listeners = [];

let conversationState = {
  lastPlace: null,
  lastActivity: null,
  lastTown: null,
  lastIntent: null,
  mentionedPlaces: [],
  turnCount: 0
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

export {
  addMessage,
  getMessages,
  clearMessages,
  getMessageCount,
  removeMessage,
  subscribe,
  getConversationState,
  updateConversationState,
  resetConversationState
};
