import L from 'leaflet';

/**
 * Create custom icon for markers
 * @param {string} category - Destination category
 * @returns {L.Icon} Leaflet icon instance
 */
function createMarkerIcon(category) {
  const categoryColors = {
    'Water': '#3b82f6',
    'Views': '#8b5cf6',
    'Outdoor': '#10b981',
    'Heritage': '#f59e0b',
    'Dining': '#ef4444',
    'Stay': '#6366f1'
  };

  const color = categoryColors[category] || '#3b82f6';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

/**
 * Create popup content for a destination
 * @param {Object} destination - Destination object
 * @returns {string} HTML content for popup
 */
function createPopupContent(destination) {
  return `
    <div class="marker-popup">
      <h3 class="popup-title">${destination.name}</h3>
      <p class="popup-category">${destination.category}</p>
      <p class="popup-location">${destination.municipality}, Catanduanes</p>
      <div class="popup-meta">
        <span class="popup-time">⏱ ${destination.estimatedTime}</span>
        <span class="popup-budget">💰 ${destination.budget}</span>
      </div>
      <button class="popup-add-btn" data-destination-id="${destination.id}">
        Add to Trip
      </button>
    </div>
  `;
}

/**
 * Create markers from destinations array
 * @param {Array} destinations - Array of destination objects
 * @returns {Array} Array of Leaflet marker instances
 */
export function createMarkers(destinations) {
  return destinations.map(destination => {
    if (!destination.coordinates || destination.coordinates.length < 2) {
      console.warn(`Invalid coordinates for destination: ${destination.name}`);
      return null;
    }

    const [lng, lat] = destination.coordinates;
    const marker = L.marker([lat, lng], {
      icon: createMarkerIcon(destination.category)
    });

    const popupContent = createPopupContent(destination);
    marker.bindPopup(popupContent, {
      className: 'custom-popup',
      maxWidth: 280
    });

    // Add click handler for Add to Trip button
    marker.on('popupopen', () => {
      const addBtn = document.querySelector(`[data-destination-id="${destination.id}"]`);
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Dispatch custom event for adding to trip
          const event = new CustomEvent('add-to-trip', {
            detail: { destination }
          });
          document.dispatchEvent(event);
          marker.closePopup();
        });
      }
    });

    return marker;
  }).filter(marker => marker !== null);
}
