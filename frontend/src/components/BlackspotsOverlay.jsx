import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

const BlackspotsOverlay = ({ blackspots = [] }) => {
  const map = useMap();

  useEffect(() => {
    const normalizedBlackspots = Array.isArray(blackspots)
      ? blackspots
      : Array.isArray(blackspots?.features)
        ? blackspots.features
        : [];

    if (!normalizedBlackspots.length) {
      return undefined;
    }

    const layerGroup = L.layerGroup().addTo(map);

    const getSeverityColor = (severity) => ({
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#eab308'
    }[severity] || '#f59e0b');

    const accidentIcon = (severity) => {
      const severityColor = getSeverityColor(severity);

      return L.divIcon({
        className: '',
        html: `
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: ${severityColor};
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            line-height: 1;
          ">🚨</div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -14]
      });
    };

    normalizedBlackspots.forEach((spot) => {
      const geometry = spot.geometry || {};
      const coordinates = geometry.coordinates || [spot.lng || spot.coordinates?.[0], spot.lat || spot.coordinates?.[1]];
      const lng = coordinates?.[0];
      const lat = coordinates?.[1];

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return;
      }

      const properties = spot.properties || spot;
      const severity = properties.severity || 'medium';
      const title = properties.title || 'Accident Spot';
      const description = properties.description || '';
      const radius = properties.radius || 100;
      const severityColor = getSeverityColor(severity);

      const marker = L.marker([lat, lng], {
        icon: accidentIcon(severity)
      });

      marker.bindPopup(`
        <div style="padding: 8px; font-size: 12px;">
          <strong style="color: ${severityColor}; font-size: 14px;">🚨 ${title}</strong>
          ${description ? `<p style="margin: 4px 0 0 0;">${description}</p>` : ''}
          <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Severity: ${severity}</p>
        </div>
      `);

      const circle = L.circle([lat, lng], {
        color: severityColor,
        weight: 2,
        opacity: 0.6,
        fillColor: severityColor,
        fillOpacity: 0.1,
        radius
      });

      marker.addTo(layerGroup);
      circle.addTo(layerGroup);
    });

    return () => {
      layerGroup.remove();
    };
  }, [blackspots, map]);

  return null;
};

export default BlackspotsOverlay;
