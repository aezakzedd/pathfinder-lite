// API client for pathfinder-lite
// Wrapper around fetch for backend communication

const API_BASE = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

function post(endpoint, data) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

function put(endpoint, data) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

// Specific API methods
async function askChatbot(question) {
  return post('/ask', { question });
}

// Alias for clarity in itinerary context
async function askPathfinder(message) {
  return post('/ask', { question: message });
}

async function getPdfCache(pdfId) {
  return get(`/api/pdf-cache/${pdfId}.pdf`);
}

async function createPdfShare(pdfId) {
  return post(`/api/pdf-cache/${pdfId}/share`);
}

async function finishSession() {
  return post('/api/session/finish');
}

async function getHealth() {
  return get('/health');
}

export { get, post, put, del, askChatbot, askPathfinder, getPdfCache, createPdfShare, finishSession, getHealth };
