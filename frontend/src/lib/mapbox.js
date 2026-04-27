// OpenRouteService Directions API utility
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || '';

const buildRouteFailure = (message, code = 'ROUTE_UNAVAILABLE') => ({
  success: false,
  code,
  message,
  primaryRoute: null,
  alternativeRoutes: [],
  isReal: false
});

const isConfiguredApiKey = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.includes('your_api_key') || lower.includes('your-key') || lower.includes('replace_me')) {
    return false;
  }

  return true;
};

const extractRoutesFromGeoJSON = (data) => {
  const features = Array.isArray(data?.features) ? data.features : [];
  if (features.length === 0) return null;

  const parsedRoutes = features
    .map((feature) => {
      const geometry = feature?.geometry;
      const summary = feature?.properties?.summary || {};
      const segments = Array.isArray(feature?.properties?.segments) ? feature.properties.segments : [];

      const summaryDistance = Number(summary.distance);
      const summaryDuration = Number(summary.duration);

      const fallbackDistance = segments.reduce((total, segment) => total + Number(segment?.distance || 0), 0);
      const fallbackDuration = segments.reduce((total, segment) => total + Number(segment?.duration || 0), 0);

      if (!geometry?.coordinates || geometry.coordinates.length === 0) {
        return null;
      }

      return {
        geometry,
        distance: Number.isFinite(summaryDistance) ? summaryDistance : fallbackDistance,
        duration: Number.isFinite(summaryDuration) ? summaryDuration : fallbackDuration
      };
    })
    .filter(Boolean);

  if (parsedRoutes.length === 0) return null;

  return {
    primaryRoute: parsedRoutes[0],
    alternativeRoutes: parsedRoutes.slice(1)
  };
};

const parseServiceErrorMessage = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    return (
      parsed?.error?.message ||
      parsed?.error ||
      parsed?.message ||
      text
    );
  } catch {
    return text;
  }
};

const getOsrmProfile = (transportMode) => {
  const profileMap = {
    walk: 'foot',
    bicycle: 'bike',
    car: 'driving'
  };
  return profileMap[transportMode] || 'driving';
};

const getOrsProfile = (transportMode) => {
  const profileMap = {
    walk: 'foot-hiking',
    bicycle: 'cycling-regular',
    car: 'driving-car'
  };
  return profileMap[transportMode] || 'driving-car';
};

const tryGetOsrmRoute = async (source, destination, transportMode = 'car') => {
  const profile = getOsrmProfile(transportMode);
  const coordinates = `${source.lng},${source.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?alternatives=true&geometries=geojson&overview=full`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const routes = Array.isArray(data?.routes) ? data.routes : [];
    if (data?.code !== 'Ok' || routes.length === 0) return null;

    return {
      success: true,
      primaryRoute: {
        geometry: routes[0].geometry,
        distance: Number(routes[0].distance || 0),
        duration: Number(routes[0].duration || 0)
      },
      alternativeRoutes: routes.slice(1).map((route) => ({
        geometry: route.geometry,
        distance: Number(route.distance || 0),
        duration: Number(route.duration || 0)
      })),
      isReal: true,
      provider: 'osrm'
    };
  } catch (err) {
    console.warn('OSRM fallback routing failed:', err);
    return null;
  }
};

export const getRoute = async (source, destination, transportMode = 'car') => {
  if (!isConfiguredApiKey(ORS_API_KEY)) {
    const osrmRoute = await tryGetOsrmRoute(source, destination, transportMode);
    if (osrmRoute) return osrmRoute;
    return buildRouteFailure('Routing is not configured. Add a valid OpenRouteService API key.');
  }

  const profile = getOrsProfile(transportMode);
  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const payload = {
    coordinates: [
      [source.lng, source.lat],
      [destination.lng, destination.lat]
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const serviceMessage = parseServiceErrorMessage(errorText);
      console.warn(
        `OpenRouteService request failed with status ${response.status}${serviceMessage ? `: ${serviceMessage}` : ''}`
      );

      const osrmRoute = await tryGetOsrmRoute(source, destination);
      if (osrmRoute) return osrmRoute;

      return buildRouteFailure(
        serviceMessage || 'Routing service rejected the request.',
        `ORS_${response.status}`
      );
    }

    const data = await response.json();
    const routes = extractRoutesFromGeoJSON(data);

    if (!routes) {
      const osrmRoute = await tryGetOsrmRoute(source, destination, transportMode);
      if (osrmRoute) return osrmRoute;
      return buildRouteFailure('No drivable route found between these points.', 'NO_ROUTE_FOUND');
    }

    return {
      success: true,
      primaryRoute: routes.primaryRoute,
      alternativeRoutes: routes.alternativeRoutes,
      isReal: true,
      transportMode
    };
  } catch (err) {
    console.warn('OpenRouteService API error:', err);
    const osrmRoute = await tryGetOsrmRoute(source, destination, transportMode);
    if (osrmRoute) return osrmRoute;
    return buildRouteFailure('Could not reach routing service. Check network/API key and try again.', 'NETWORK_ERROR');
  }
};

export const searchLocations = async (query, userPosition = null, limit = 5) => {
  const cleanQuery = String(query || '').trim();
  if (cleanQuery.length < 2) return [];
  if (!isConfiguredApiKey(ORS_API_KEY)) return [];

  const params = new URLSearchParams({
    api_key: ORS_API_KEY,
    text: cleanQuery,
    size: String(limit)
  });

  if (userPosition?.lat && userPosition?.lng) {
    params.set('focus.point.lat', String(userPosition.lat));
    params.set('focus.point.lon', String(userPosition.lng));
  }

  try {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    return features
      .map((feature) => {
        const coords = feature?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;

        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const name = feature?.properties?.label || feature?.properties?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        return { name, lat, lng };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('OpenRouteService geocode search failed:', err);
    return [];
  }
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
