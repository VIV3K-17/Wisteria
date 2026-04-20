import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useJourney } from '@/contexts/JourneyContext';
import BlackspotsOverlay from '@/components/BlackspotsOverlay';
import AvatarMarker from '@/components/AvatarMarker';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#30669B;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const checkpointIcon = (reached, isNext) => L.divIcon({
  html: `<div style="width:20px;height:20px;background:${reached ? '#22c55e' : isNext ? '#f59e0b' : '#94a3b8'};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;items-center;justify-content;position:relative;">
    ${isNext ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:1px solid white;animation:pulse 1s infinite;"></div>' : ''}
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const destIcon = L.divIcon({
  html: `<div style="width:24px;height:24px;background:#ef4444;border:3px solid white;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(45deg);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(-45deg);color:white;font-size:10px;font-weight:bold;">🏁</div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
}

function FitRouteBounds({ route, isActive }) {
  const map = useMap();
  useEffect(() => {
    if (!isActive || !route) return;
    
    const coordinates = route.geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) return;

    // Convert [lng, lat] to [lat, lng] for Leaflet
    const leafletBounds = coordinates.map(coord => [coord[1], coord[0]]);
    
    // Fit bounds with some padding
    const latLngs = L.latLngBounds(leafletBounds);
    map.fitBounds(latLngs, { padding: [50, 50], animate: true });
  }, [route, map, isActive]);
  
  return null;
}

function MapClickHandler({ onMapClick, canSelectDestination }) {
  useMapEvents({
    click: (e) => {
      if (canSelectDestination) {
        onMapClick?.({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    }
  });
  return null;
}

const MapView = ({ userPosition, destination, className = '', isPreviewMode = false, routeData = null, onDestinationSelect = null, blackspots = [] }) => {
  const { journey, currentPath } = useJourney();
  const defaultCenter = [19.0760, 72.8777]; // Mumbai
  const center = userPosition ? [userPosition.lat, userPosition.lng] : defaultCenter;

  const plannedRoute = [];
  if (journey?.active) {
    journey.checkpoints.forEach(cp => plannedRoute.push([cp.lat, cp.lng]));
    plannedRoute.push([journey.destination.lat, journey.destination.lng]);
  } else if (userPosition && destination && !isPreviewMode) {
    plannedRoute.push([userPosition.lat, userPosition.lng]);
    plannedRoute.push([destination.lat, destination.lng]);
  }

  // Convert GeoJSON coordinates to Leaflet format for route rendering
  const getRouteCoordinates = (geometry) => {
    if (!geometry || !geometry.coordinates) return [];
    return geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lng, lat] -> [lat, lng]
  };

  return (
    <div className={`relative isolate h-full w-full rounded-2xl overflow-hidden soft-shadow ${className} border border-border/50`}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapClickHandler onMapClick={onDestinationSelect} canSelectDestination={!journey?.active} />

        {/* Fit bounds to show the entire route in preview mode */}
        {isPreviewMode && routeData?.primaryRoute && (
          <FitRouteBounds route={routeData.primaryRoute} isActive={true} />
        )}

        {/* User Location */}
        {userPosition && (
          <>
            <RecenterMap position={[userPosition.lat, userPosition.lng]} />
            {journey?.active ? (
              <AvatarMarker
                position={[userPosition.lat, userPosition.lng]}
                imageUrl="/assets/car-avatar.svg"
                userName="You"
                animated
              />
            ) : (
              <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            <Circle center={[userPosition.lat, userPosition.lng]} radius={100} pathOptions={{ color: '#30669B', fillColor: '#30669B', fillOpacity: 0.05, weight: 1 }} />
          </>
        )}

        {/* Preview Mode - Route Display */}
        {isPreviewMode && routeData && (
          <>
            {/* Primary Route (Bold) */}
            {routeData.primaryRoute?.geometry && (
              <Polyline
                positions={getRouteCoordinates(routeData.primaryRoute.geometry)}
                pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.9 }}
              />
            )}

            {/* Alternative Routes (Faded) */}
            {routeData.alternativeRoutes?.map((route, idx) => (
              <Polyline
                key={idx}
                positions={getRouteCoordinates(route.geometry)}
                pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '5, 5' }}
              />
            ))}

          </>
        )}

        {/* Selected Destination Marker before journey starts */}
        {!journey?.active && destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>{destination.name}</Popup>
          </Marker>
        )}

        {/* Planned Route (Dashed) - Active Journey */}
        {!isPreviewMode && plannedRoute.length >= 2 && (
          <Polyline positions={plannedRoute} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5, dashArray: '8, 12' }} />
        )}

        {/* Actual Path Taken (Solid) - Active Journey */}
        {!isPreviewMode && currentPath.length >= 2 && (
          <Polyline positions={currentPath} pathOptions={{ color: '#30669B', weight: 5, opacity: 0.9 }} />
        )}

        {/* Blackspots Overlay */}
        {<BlackspotsOverlay blackspots={blackspots} />}

        {/* Checkpoints - Active Journey */}
        {!isPreviewMode && journey?.active && journey.checkpoints.map((cp, idx) => (
          <Marker key={cp.id} position={[cp.lat, cp.lng]} icon={checkpointIcon(cp.reached, idx === journey.currentCheckpointIndex)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{cp.name}</p>
                <p className={cp.reached ? 'text-success' : 'text-warning'}>
                  {cp.reached ? 'Reached' : `Must reach by ${new Date(cp.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Final Destination - Active Journey */}
        {!isPreviewMode && journey?.active && (
          <Marker 
            position={[journey.destination.lat, journey.destination.lng]} 
            icon={destIcon}
          >
            <Popup>{journey.destination.name}</Popup>
          </Marker>
        )}
      </MapContainer>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default MapView;