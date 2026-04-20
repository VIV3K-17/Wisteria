import React from 'react';
import { GeoJSON } from 'react-leaflet';

const BlackspotsOverlay = ({ blackspots = [] }) => {
  if (!blackspots || blackspots.length === 0) {
    return null;
  }

  // Create a GeoJSON FeatureCollection from blackspot points
  const geoJsonData = {
    type: 'FeatureCollection',
    features: blackspots.map((spot, idx) => ({
      type: 'Feature',
      id: spot.id || idx,
      geometry: {
        type: 'Point',
        coordinates: [spot.lng || spot.coordinates[0], spot.lat || spot.coordinates[1]]
      },
      properties: {
        severity: spot.severity || 'medium', // low, medium, high
        title: spot.title || 'Danger Zone',
        description: spot.description || '',
        radius: spot.radius || 100 // meters
      }
    }))
  };

  const onEachFeature = (feature, layer) => {
    const { severity, title, description } = feature.properties;
    const severityColor = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#eab308'
    }[severity] || '#f59e0b';

    layer.bindPopup(`
      <div style="padding: 8px; font-size: 12px;">
        <strong style="color: ${severityColor}; font-size: 14px;">⚠️ ${title}</strong>
        ${description ? `<p style="margin: 4px 0 0 0;">${description}</p>` : ''}
        <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Severity: ${severity}</p>
      </div>
    `);

    // Add a circle around the point to show danger radius
    const circleOptions = {
      color: severityColor,
      weight: 2,
      opacity: 0.6,
      fillColor: severityColor,
      fillOpacity: 0.1,
      radius: feature.properties.radius
    };

    if (window.L) {
      window.L.circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], circleOptions).addTo(layer._map || layer);
    }
  };

  const pointToLayer = (feature, latlng) => {
    const { severity } = feature.properties;
    const severityColor = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#eab308'
    }[severity] || '#f59e0b';

    return window.L?.circleMarker(latlng, {
      radius: 6,
      fillColor: severityColor,
      color: '#fff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.8
    });
  };

  return (
    <GeoJSON
      data={geoJsonData}
      onEachFeature={onEachFeature}
      pointToLayer={pointToLayer}
    />
  );
};

export default BlackspotsOverlay;
