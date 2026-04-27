import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import along from '@turf/along';
import { lineString } from '@turf/helpers';

const JourneyContext = createContext(null);
const JOURNEY_HISTORY_KEY = 'safety_journey_history';
const API_URL = (() => {
  const prod = (import.meta.env.VITE_API_URL || "https://wisteria-6bcx.onrender.com/api").trim();
  const local = (import.meta.env.VITE_LOCAL_API_URL || "http://127.0.0.1:5000/api").trim();

  if (typeof window === "undefined") return prod;

  const { hostname } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.endsWith(".local");

  return isLocalHost ? local : prod;
})();

export const useJourney = () => {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
};

const readStoredHistory = () => {
  try {
    const stored = localStorage.getItem(JOURNEY_HISTORY_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read journey history:', err);
    return [];
  }
};

// Calculate distance between two lat/lng points in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Generate checkpoints using Turf.js along a route or linear path
function generateCheckpoints(source, destination, routeGeometry = null, routeDurationSeconds = null, transportMode = 'car') {
  const count = 3;
  const checkpoints = [];

  let points = [];
  let routeDistanceMeters = 0;

  if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
    // Use actual route geometry from routing response
    try {
      const line = lineString(routeGeometry.coordinates);

      // Calculate total distance
      let currentDistance = 0;
      for (let i = 0; i < routeGeometry.coordinates.length - 1; i++) {
        const [lon1, lat1] = routeGeometry.coordinates[i];
        const [lon2, lat2] = routeGeometry.coordinates[i + 1];
        currentDistance += getDistance(lat1, lon1, lat2, lon2);
      }
      routeDistanceMeters = currentDistance;

      // Generate evenly spaced checkpoints along the route
      const segmentDistance = currentDistance / (count + 1);

      for (let i = 1; i <= count; i++) {
        const distanceToPoint = segmentDistance * i;
        try {
          const point = along(line, distanceToPoint / 1000); // Turf uses kilometers
          if (point && point.geometry && point.geometry.coordinates) {
            points.push({
              lat: point.geometry.coordinates[1],
              lng: point.geometry.coordinates[0]
            });
          }
        } catch (err) {
          console.log('Turf checkpoint generation skipped, using fallback');
          points = null;
          break;
        }
      }
    } catch (err) {
      console.log('Route-based checkpoint generation failed, using fallback');
      points = null;
    }
  }

  // Fallback: linear interpolation if route geometry not available
  if (!points || points.length === 0) {
    points = [];
    routeDistanceMeters = getDistance(source.lat, source.lng, destination.lat, destination.lng);
    for (let i = 1; i <= count; i++) {
      const ratio = i / (count + 1);
      points.push({
        lat: source.lat + (destination.lat - source.lat) * ratio + (Math.random() - 0.5) * 0.002,
        lng: source.lng + (destination.lng - source.lng) * ratio + (Math.random() - 0.5) * 0.002
      });
    }
  }

  // Prefer route duration when available, else estimate from distance at mode-appropriate speeds.
  // Mode speeds: walk ~5 km/h (1.39 m/s), bicycle ~20 km/h (5.56 m/s), car ~50 km/h (13.89 m/s)
  const speedsMs = {
    walk: 1.39,
    bicycle: 5.56,
    car: 13.89
  };
  const speed = speedsMs[transportMode] || speedsMs.car;
  
  const durationFromRoute = Number(routeDurationSeconds);
  const hasRouteDuration = Number.isFinite(durationFromRoute) && durationFromRoute > 0;
  const estimatedDuration = routeDistanceMeters > 0 ? routeDistanceMeters / speed : 1800;
  const baseDuration = hasRouteDuration ? durationFromRoute : estimatedDuration;

  // Add a safety buffer so deadlines are realistic for traffic/pauses.
  const bufferedTotal = Math.max(baseDuration * 1.3, 20 * 60);
  const checkpointDeadlines = Array.from({ length: count }, (_, idx) => {
    const ratio = (idx + 1) / (count + 1);
    return Math.round(bufferedTotal * ratio);
  });

  // Create checkpoint objects
  points.forEach((point, idx) => {
    checkpoints.push({
      id: crypto.randomUUID(),
      lat: point.lat,
      lng: point.lng,
      name: `Checkpoint ${idx + 1}`,
      timeLimit: checkpointDeadlines[idx],
      reached: false
    });
  });

  return checkpoints;
}

export const JourneyProvider = ({
  children
}) => {
  const [journey, setJourney] = useState(null);
  const [missedCheckpoint, setMissedCheckpoint] = useState(null);
  const [missedCheckpoints, setMissedCheckpoints] = useState(0);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [journeyHistory, setJourneyHistory] = useState(() => readStoredHistory());
  
  const timerRef = useRef();
  const safetyTimeoutRef = useRef();

  useEffect(() => {
    localStorage.setItem(JOURNEY_HISTORY_KEY, JSON.stringify(journeyHistory));
  }, [journeyHistory]);

  const addJourneyToHistory = useCallback((completedJourney) => {
    if (!completedJourney) return;

    const reachedCount = completedJourney.checkpoints.filter(cp => cp.reached).length;
    const historyEntry = {
      id: completedJourney.id,
      source: completedJourney.source,
      destination: completedJourney.destination,
      startedAt: completedJourney.startedAt,
      endedAt: Date.now(),
      checkpointCount: completedJourney.checkpoints.length,
      reachedCount,
      status: reachedCount === completedJourney.checkpoints.length ? 'completed' : 'ended'
    };

    setJourneyHistory(prev => [historyEntry, ...prev].slice(0, 20));
  }, []);

  const startJourney = useCallback(async (source, destination, routeData = null, userId = null, transportMode = 'car') => {
    const checkpoints = generateCheckpoints(
      source,
      destination,
      routeData?.primaryRoute?.geometry,
      routeData?.primaryRoute?.duration,
      transportMode
    );
    const now = Date.now();

    // Set deadlines
    checkpoints.forEach(cp => {
      cp.deadline = now + cp.timeLimit * 1000;
    });

    const nextJourney = {
      id: crypto.randomUUID(),
      source,
      destination,
      transportMode,
      checkpoints,
      startedAt: now,
      active: true,
      currentCheckpointIndex: 0
    };

    setJourney(nextJourney);
    setCurrentPath([[source.lat, source.lng]]);
    setMissedCheckpoint(null);
    setMissedCheckpoints(0);
    setAlertTriggered(false);

    if (userId) {
      try {
        await axios.post(`${API_URL}/journey/start`, {
          userId,
          journeyId: nextJourney.id,
          source,
          destination,
          checkpoints: nextJourney.checkpoints
        });
      } catch (err) {
        console.error('Failed to create journey on server:', err);
      }
    }
  }, []);

  const updatePosition = useCallback(async (pos, userId = null) => {
    const activeJourneyId = journey?.id;

    setCurrentPath(prev => {
      const last = prev[prev.length - 1];
      if (last && last[0] === pos.lat && last[1] === pos.lng) return prev;
      return [...prev, [pos.lat, pos.lng]];
    });

    setJourney(prev => {
      if (!prev || !prev.active) return prev;
      
      const currentCP = prev.checkpoints[prev.currentCheckpointIndex];
      if (currentCP && !currentCP.reached) {
        const dist = getDistance(pos.lat, pos.lng, currentCP.lat, currentCP.lng);
        // If within 50 meters of checkpoint
        if (dist < 50) {
          const updatedCheckpoints = prev.checkpoints.map(cp => 
            cp.id === currentCP.id ? { ...cp, reached: true, reachedAt: Date.now() } : cp
          );
          const nextIndex = updatedCheckpoints.findIndex(cp => !cp.reached);
          return {
            ...prev,
            checkpoints: updatedCheckpoints,
            currentCheckpointIndex: nextIndex === -1 ? updatedCheckpoints.length : nextIndex
          };
        }
      }
      return prev;
    });

    if (userId && activeJourneyId) {
      try {
        await axios.post(`${API_URL}/journey/update-position`, {
          userId,
          journeyId: activeJourneyId,
          position: pos
        });
      } catch (err) {
        console.error('Failed to sync position to server:', err);
      }
    }
  }, [journey?.id]);

  const endJourney = useCallback(() => {
    setJourney(prev => {
      addJourneyToHistory(prev);
      return null;
    });
    setCurrentPath([]);
    setMissedCheckpoint(null);
    setMissedCheckpoints(0);
    setAlertTriggered(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, [addJourneyToHistory]);

  const confirmSafety = useCallback(() => {
    setMissedCheckpoint(null);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    
    // Extend deadline of current checkpoint by 5 minutes as a safety buffer
    setJourney(prev => {
        if (!prev) return prev;
        const updatedCPs = prev.checkpoints.map((cp, idx) => {
            if (idx === prev.currentCheckpointIndex) {
                return { ...cp, deadline: Date.now() + 300000 };
            }
            return cp;
        });
        return { ...prev, checkpoints: updatedCPs };
    });
  }, []);

  const clearMissedCheckpoint = useCallback(() => setMissedCheckpoint(null), []);
  const clearAlert = useCallback(() => setAlertTriggered(false), []);
  const clearJourneyHistory = useCallback(() => setJourneyHistory([]), []);

  // Check for missed deadlines
  useEffect(() => {
    if (!journey?.active) return;
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const current = journey.checkpoints[journey.currentCheckpointIndex];
      
      if (current && !current.reached && current.deadline && now > current.deadline) {
        if (!missedCheckpoint) {
          setMissedCheckpoint(current);
          setMissedCheckpoints(prev => prev + 1);
          // Give 60 seconds to confirm safety before alerting contacts
          safetyTimeoutRef.current = setTimeout(() => {
            setAlertTriggered(true);
          }, 60000);
        }
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [journey, missedCheckpoint]);

  return <JourneyContext.Provider value={{
    journey,
    currentPath,
    journeyHistory,
    missedCheckpoints,
    setMissedCheckpoints,
    startJourney,
    updatePosition,
    endJourney,
    missedCheckpoint,
    clearMissedCheckpoint,
    confirmSafety,
    alertTriggered,
    clearAlert,
    clearJourneyHistory
  }}>
      {children}
    </JourneyContext.Provider>;
};