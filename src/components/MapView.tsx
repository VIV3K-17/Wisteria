import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useJourney } from '@/contexts/JourneyContext';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;background:#30669B;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const checkpointIcon = (reached: boolean) => new L.DivIcon({
  html: `<div style="width:16px;height:16px;background:${reached ? '#22c55e' : '#f59e0b'};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;background:#ef4444;border:3px solid white;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(45deg);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
}

interface MapViewProps {
  userPosition: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({ userPosition, destination, className = '' }) => {
  const { journey } = useJourney();
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  const center: [number, number] = userPosition
    ? [userPosition.lat, userPosition.lng]
    : defaultCenter;

  const routePoints: [number, number][] = [];
  if (journey?.active && userPosition) {
    routePoints.push([userPosition.lat, userPosition.lng]);
    journey.checkpoints.forEach(cp => routePoints.push([cp.lat, cp.lng]));
    routePoints.push([journey.destination.lat, journey.destination.lng]);
  } else if (userPosition && destination) {
    routePoints.push([userPosition.lat, userPosition.lng]);
    routePoints.push([destination.lat, destination.lng]);
  }

  return (
    <div className={`rounded-2xl overflow-hidden soft-shadow ${className}`} style={{ height: '100%', minHeight: '300px' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPosition && (
          <>
            <RecenterMap position={[userPosition.lat, userPosition.lng]} />
            <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
              <Popup>Your Location</Popup>
            </Marker>
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={50}
              pathOptions={{ color: '#30669B', fillColor: '#30669B', fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}

        {journey?.active && journey.checkpoints.map(cp => (
          <Marker key={cp.id} position={[cp.lat, cp.lng]} icon={checkpointIcon(cp.reached)}>
            <Popup>
              <strong>{cp.name}</strong><br />
              {cp.reached ? '✅ Reached' : `⏱ ${Math.ceil(cp.timeLimit / 60)} min limit`}
            </Popup>
          </Marker>
        ))}

        {journey?.active && (
          <Marker position={[journey.destination.lat, journey.destination.lng]} icon={destIcon}>
            <Popup>{journey.destination.name}</Popup>
          </Marker>
        )}

        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: '#30669B', weight: 4, opacity: 0.7, dashArray: '10, 6' }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
