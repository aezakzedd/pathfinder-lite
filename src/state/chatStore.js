// Chat state management module
// Handles chat messages with optional persistence

const STORAGE_KEY = 'pathfinder-lite-chat-messages';
const MAX_MESSAGES = 50;

let messages = [];
let listeners = [];

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
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

export {
  addMessage,
  getMessages,
  clearMessages,
  getMessageCount,
  removeMessage,
  subscribe
};
