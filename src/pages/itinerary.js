// Itinerary page module
export function renderItinerary(container) {
  container.innerHTML = `
    <div class="page page-itinerary">
      <div class="itinerary-layout">
        <aside class="itinerary-sidebar">
          <div class="chatbot-panel">
            <div class="chatbot-header">
              <h2>Ask Pathfinder</h2>
            </div>
            <div class="chatbot-messages">
              <div class="message message-bot">
                <p>Hello! I'm your AI travel guide. Ask me anything about Catanduanes destinations, activities, or planning tips.</p>
              </div>
            </div>
            <div class="chatbot-input">
              <input type="text" placeholder="Ask about destinations..." />
              <button class="send-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
        <main class="itinerary-main">
          <div class="map-placeholder">
            <p>Map will be implemented in Phase 5</p>
          </div>
        </main>
      </div>
    </div>
  `;
}
