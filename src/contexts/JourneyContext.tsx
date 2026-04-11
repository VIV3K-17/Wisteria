import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface Checkpoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  timeLimit: number; // seconds to reach from previous checkpoint
  reached: boolean;
  reachedAt?: number;
  deadline?: number; // timestamp by which it must be reached
}

export interface Journey {
  id: string;
  source: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  checkpoints: Checkpoint[];
  startedAt: number;
  active: boolean;
  currentCheckpointIndex: number;
}

interface JourneyContextType {
  journey: Journey | null;
  startJourney: (source: { lat: number; lng: number; name: string }, destination: { lat: number; lng: number; name: string }) => void;
  endJourney: () => void;
  reachCheckpoint: (id: string) => void;
  missedCheckpoint: Checkpoint | null;
  clearMissedCheckpoint: () => void;
  confirmSafety: () => void;
  alertTriggered: boolean;
  clearAlert: () => void;
}

const JourneyContext = createContext<JourneyContextType | null>(null);

export const useJourney = () => {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
};

function generateCheckpoints(
  source: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Checkpoint[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 checkpoints
  const checkpoints: Checkpoint[] = [];
  
  for (let i = 1; i <= count; i++) {
    const ratio = i / (count + 1);
    const lat = source.lat + (destination.lat - source.lat) * ratio + (Math.random() - 0.5) * 0.005;
    const lng = source.lng + (destination.lng - source.lng) * ratio + (Math.random() - 0.5) * 0.005;
    
    checkpoints.push({
      id: crypto.randomUUID(),
      lat,
      lng,
      name: `Checkpoint ${i}`,
      timeLimit: 120 + Math.floor(Math.random() * 180), // 2-5 minutes
      reached: false,
    });
  }
  return checkpoints;
}

export const JourneyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [missedCheckpoint, setMissedCheckpoint] = useState<Checkpoint | null>(null);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const startJourney = useCallback((source: { lat: number; lng: number; name: string }, destination: { lat: number; lng: number; name: string }) => {
    const checkpoints = generateCheckpoints(source, destination);
    const now = Date.now();
    
    // Set deadlines
    let cumulativeTime = 0;
    checkpoints.forEach(cp => {
      cumulativeTime += cp.timeLimit;
      cp.deadline = now + cumulativeTime * 1000;
    });

    setJourney({
      id: crypto.randomUUID(),
      source,
      destination,
      checkpoints,
      startedAt: now,
      active: true,
      currentCheckpointIndex: 0,
    });
    setMissedCheckpoint(null);
    setAlertTriggered(false);
  }, []);

  const endJourney = useCallback(() => {
    setJourney(null);
    setMissedCheckpoint(null);
    setAlertTriggered(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, []);

  const reachCheckpoint = useCallback((id: string) => {
    setJourney(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        checkpoints: prev.checkpoints.map(cp =>
          cp.id === id ? { ...cp, reached: true, reachedAt: Date.now() } : cp
        ),
      };
      const nextIndex = updated.checkpoints.findIndex(cp => !cp.reached);
      updated.currentCheckpointIndex = nextIndex === -1 ? updated.checkpoints.length : nextIndex;
      return updated;
    });
    setMissedCheckpoint(null);
  }, []);

  const confirmSafety = useCallback(() => {
    setMissedCheckpoint(null);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, []);

  const clearMissedCheckpoint = useCallback(() => setMissedCheckpoint(null), []);
  const clearAlert = useCallback(() => setAlertTriggered(false), []);

  // Check for missed checkpoints
  useEffect(() => {
    if (!journey?.active) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const current = journey.checkpoints[journey.currentCheckpointIndex];
      if (current && !current.reached && current.deadline && now > current.deadline) {
        setMissedCheckpoint(current);
        // Give 30 seconds to confirm safety
        safetyTimeoutRef.current = setTimeout(() => {
          setAlertTriggered(true);
        }, 30000);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [journey]);

  return (
    <JourneyContext.Provider value={{
      journey,
      startJourney,
      endJourney,
      reachCheckpoint,
      missedCheckpoint,
      clearMissedCheckpoint,
      confirmSafety,
      alertTriggered,
      clearAlert,
    }}>
      {children}
    </JourneyContext.Provider>
  );
};
