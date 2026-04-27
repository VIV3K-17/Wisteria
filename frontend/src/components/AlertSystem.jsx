import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Phone, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useJourney } from '@/contexts/JourneyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { isCheckpointOverdue, shouldEscalateToLevelThree } from '@/lib/TrackingEngine';

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

const AlertSystem = ({ userPosition }) => {
  const { journey, confirmSafety, setMissedCheckpoints } = useJourney();
  const { user } = useAuth();
  const { toast } = useToast();

  const [missedCheckpointAlert, setMissedCheckpointAlert] = useState(false);
  const [currentMissedCheckpoint, setCurrentMissedCheckpoint] = useState(null);
  const [escalationLevel, setEscalationLevel] = useState(0); // 0=none, 1=warning, 2=live tracking, 3=SOS
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [showSOS, setShowSOS] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [level2CheckpointIndex, setLevel2CheckpointIndex] = useState(null);

  const timerRef = useRef();
  const escalationRef = useRef();
  const level2SentRef = useRef(false);
  const level3SentRef = useRef(false);

  // Monitor checkpoints and trigger escalation
  useEffect(() => {
    if (!journey?.active || !user || escalationLevel === 3) return;

    timerRef.current = setInterval(async () => {
      const now = Date.now();
      const currentCP = journey.checkpoints[journey.currentCheckpointIndex];

      if (currentCP && currentCP.deadline) {
        const timeDiff = now - currentCP.deadline;

        // Level 1: checkpoint just missed
        if (isCheckpointOverdue(currentCP, now) && escalationLevel === 0) {
          setEscalationLevel(1);
          setMissedCheckpoints(1);
          setMissedCheckpointAlert(true);
          setCurrentMissedCheckpoint(currentCP);
          setCountdownSeconds(60);

          // Play sound alert
          playAlert();

          console.log('🚨 Level 1 Alert: Checkpoint missed!');
        }

        // Level 3: user missed a subsequent checkpoint while still Level 2.
        if (shouldEscalateToLevelThree({
          escalationLevel,
          currentCheckpointIndex: journey.currentCheckpointIndex,
          level2CheckpointIndex,
          checkpoint: currentCP,
          now
        }) && !level3SentRef.current) {
            level3SentRef.current = true;
            setEscalationLevel(3);
            setMissedCheckpoints(3);
            setShowSOS(true);
            
            // Trigger Level 3 SOS
            triggerLevel3Alert(currentCP);
            console.log('🚨 Level 3 SOS: User completely unresponsive');
        }
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [journey, user, escalationLevel, level2CheckpointIndex, setMissedCheckpoints]);

  // Countdown timer for Level 1 alert
  useEffect(() => {
    if (escalationLevel !== 1 || countdownSeconds <= 0) {
      if (countdownSeconds <= 0 && escalationLevel === 1) {
        // Time's up, move to Level 2
        setEscalationLevel(2);
        setMissedCheckpoints(2);
        setLevel2CheckpointIndex(journey?.currentCheckpointIndex ?? null);
        setMissedCheckpointAlert(false);
        if (currentMissedCheckpoint && !level2SentRef.current) {
          level2SentRef.current = true;
          triggerLevel2Alert(currentMissedCheckpoint);
        }
      }
      return;
    }

    escalationRef.current = setTimeout(() => {
      setCountdownSeconds(prev => prev - 1);
    }, 1000);

    return () => {
      if (escalationRef.current) clearTimeout(escalationRef.current);
    };
  }, [countdownSeconds, escalationLevel, currentMissedCheckpoint, journey?.currentCheckpointIndex, setMissedCheckpoints]);

  const playAlert = () => {
    // Create a simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log('Audio alert not available');
    }
  };

  const triggerLevel2Alert = async (checkpoint) => {
    if (!user?._id) return;

    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/journey/alert/level2`, {
        userId: user._id,
        journeyId: journey.id,
        checkpoint
      });

      toast({
        title: '⚠️ Safety Alert Sent',
        description: 'Your emergency contacts have been notified with live tracking',
        variant: 'destructive'
      });
    } catch (err) {
      console.error('Failed to send Level 2 alert:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerLevel3Alert = async (checkpoint) => {
    if (!user?._id) return;

    setIsProcessing(true);
    try {
      await axios.post(`${API_URL}/journey/alert/level3`, {
        userId: user._id,
        journeyId: journey.id,
        checkpoint
      });

      toast({
        title: '🚨 SOS ALERT SENT',
        description: 'Emergency contacts have been notified of your critical status',
        variant: 'destructive'
      });
    } catch (err) {
      console.error('Failed to send Level 3 SOS:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSafety = async () => {
    playAlert(); // Success beep
    confirmSafety();
    setMissedCheckpointAlert(false);
    setEscalationLevel(0);
    setMissedCheckpoints(0);
    setCountdownSeconds(60);
    setCurrentMissedCheckpoint(null);
    setLevel2CheckpointIndex(null);
    level2SentRef.current = false;
    level3SentRef.current = false;

    toast({
      title: '✓ Safety Confirmed',
      description: 'Checkpoint deadline extended by 5 minutes'
    });
  };

  if (!journey?.active) return null;

  return (
    <>
      {/* Level 1: Warning Modal */}
      <AnimatePresence>
        {escalationLevel === 1 && missedCheckpointAlert && currentMissedCheckpoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Danger Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Are you okay?</h2>
                </div>
                <p className="text-red-100">You missed checkpoint: {currentMissedCheckpoint.name}</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Respond within {countdownSeconds}s</p>
                    <p className="text-sm text-red-700 mt-1">
                      If you don't respond, your emergency contacts will be notified
                    </p>
                  </div>
                </div>

                {/* Checkpoint Info */}
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>Deadline: {new Date(currentMissedCheckpoint.deadline).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Countdown Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(countdownSeconds / 60) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                <Button
                  onClick={handleConfirmSafety}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isProcessing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I'm Safe
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Help
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Level 3: SOS Modal */}
        {escalationLevel === 3 && showSOS && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-600"
            >
              {/* SOS Header - Pulsing */}
              <motion.div
                className="bg-red-600 p-6 text-white text-center"
                animate={{ backgroundColor: ['#dc2626', '#991b1b', '#dc2626'] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="text-4xl font-bold mb-2">🚨 SOS 🚨</div>
                <p className="text-lg font-semibold">CRITICAL ALERT ACTIVATED</p>
              </motion.div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="font-semibold text-red-900 mb-2">Emergency contacts have been notified</p>
                  <p className="text-sm text-red-700">
                    Your location and journey details have been sent to all emergency contacts. Help is being coordinated.
                  </p>
                </div>

                {/* Status Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Current Location Shared</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-red-600" />
                    <span>Contacts Notified</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>Destination Shared</span>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 border border-yellow-200">
                  <p className="font-semibold mb-1">What to do:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Stay calm and find a safe location</li>
                    <li>Call emergency services if in danger</li>
                    <li>Contact your emergency contacts</li>
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="bg-gray-50 px-6 py-4">
                <Button
                  onClick={() => setShowSOS(false)}
                  className="w-full bg-gray-700 hover:bg-gray-800"
                >
                  I Understand
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AlertSystem;
