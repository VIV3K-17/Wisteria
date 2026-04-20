// Mapbox Directions API utility
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const getRoute = async (source, destination) => {
  if (!MAPBOX_TOKEN) {
    console.warn('VITE_MAPBOX_TOKEN not configured. Using mock route data.');
    return generateMockRoute(source, destination);
  }

  const coordinates = `${source.lng},${source.lat};${destination.lng},${destination.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?alternatives=true&geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return generateMockRoute(source, destination);
    }

    return {
      success: true,
      primaryRoute: {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance, // meters
        duration: data.routes[0].duration // seconds
      },
      alternativeRoutes: data.routes.slice(1).map(r => ({
        geometry: r.geometry,
        distance: r.distance,
        duration: r.duration
      })),
      isReal: true
    };
  } catch (err) {
    console.error('Mapbox API error:', err);
    return generateMockRoute(source, destination);
  }
};

// Generate a simple mock route between two points
const generateMockRoute = (source, destination) => {
  // Simple linear interpolation
  const points = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      source.lng + (destination.lng - source.lng) * t,
      source.lat + (destination.lat - source.lat) * t
    ]);
  }

  // Calculate mock distance in meters (approx)
  const dlat = (destination.lat - source.lat) * 111000; // meters per degree latitude
  const dlng = (destination.lng - source.lng) * 111000 * Math.cos((source.lat + destination.lat) / 2 * Math.PI / 180);
  const distance = Math.sqrt(dlat * dlat + dlng * dlng);
  const duration = distance / 14; // Assume 50 km/h average

  return {
    success: true,
    primaryRoute: {
      geometry: {
        type: 'LineString',
        coordinates: points
      },
      distance: Math.round(distance),
      duration: Math.round(duration)
    },
    alternativeRoutes: [],
    isReal: false
  };
};

export const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};
