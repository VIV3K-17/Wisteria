import React, { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Custom Avatar Marker with smooth animation
 * Displays a user image or avatar on the map with smooth transitions
 */
const createAvatarIcon = (imageUrl, size = 40) => {
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: rgba(255,255,255,0.9);
      border: 2px solid #30669B;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      overflow: hidden;
      padding: 4px;
    ">
      <img src="${imageUrl}" alt="User" style="
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
      " />
    </div>
  `;

  return L.divIcon({
    html,
    className: 'avatar-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export const AvatarMarker = ({ position, imageUrl = null, userName = 'User', animated = true }) => {
  const map = useMap();
  const [markerPosition, setMarkerPosition] = useState(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  // Apply smooth animation CSS
  useEffect(() => {
    if (animated && map) {
      const style = document.createElement('style');
      style.textContent = `
        .avatar-marker {
          transition: transform 0.5s ease;
        }
        .avatar-marker img {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => document.head.removeChild(style);
    }
  }, [animated, map]);

  return (
    <Marker
      position={markerPosition}
      icon={createAvatarIcon(imageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 3v3h16v-3s-2-3-8-3z"/></svg>', 40)}
      title={userName}
    >
      {/* Popup with user info */}
    </Marker>
  );
};

export default AvatarMarker;
