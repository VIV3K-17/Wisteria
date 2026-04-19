import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const JourneyContext = createContext(null);
const JOURNEY_HISTORY_KEY = 'safety_journey_history';

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

function generateCheckpoints(source, destination) {
  const count = 3; 
  const checkpoints = [];
  for (let i = 1; i <= count; i++) {
    const ratio = i / (count + 1);
    // Add some noise to the linear path
    const lat = source.lat + (destination.lat - source.lat) * ratio + (Math.random() - 0.5) * 0.002;
    const lng = source.lng + (destination.lng - source.lng) * ratio + (Math.random() - 0.5) * 0.002;
    checkpoints.push({
      id: crypto.randomUUID(),
      lat,
      lng,
      name: `Checkpoint ${i}`,
      timeLimit: 300 + (i * 300), // Incremental time limits (5, 10, 15... mins)
      reached: false
    });
  }
  return checkpoints;
}

export const JourneyProvider = ({
  children
}) => {
  const [journey, setJourney] = useState(null);
  const [missedCheckpoint, setMissedCheckpoint] = useState(null);
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

  const startJourney = useCallback((source, destination) => {
    const checkpoints = generateCheckpoints(source, destination);
    const now = Date.now();

    // Set deadlines
    checkpoints.forEach(cp => {
      cp.deadline = now + cp.timeLimit * 1000;
    });

    setJourney({
      id: crypto.randomUUID(),
      source,
      destination,
      checkpoints,
      startedAt: now,
      active: true,
      currentCheckpointIndex: 0
    });
    setCurrentPath([[source.lat, source.lng]]);
    setMissedCheckpoint(null);
    setAlertTriggered(false);
  }, []);

  const updatePosition = useCallback((pos) => {
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
  }, []);

  const endJourney = useCallback(() => {
    setJourney(prev => {
      addJourneyToHistory(prev);
      return null;
    });
    setCurrentPath([]);
    setMissedCheckpoint(null);
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