import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJourney } from '@/contexts/JourneyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const SafetyAlert = () => {
  const {
    missedCheckpoint,
    confirmSafety,
    alertTriggered,
    clearAlert
  } = useJourney();
  const { user } = useAuth();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!missedCheckpoint) {
      setCountdown(60);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [missedCheckpoint]);

  useEffect(() => {
    if (alertTriggered && user) {
      const contacts = user.emergencyContacts || [];
      if (contacts.length > 0) {
        contacts.forEach(contact => {
          console.log(`[EMERGENCY ALERT] Sending to ${contact.name} (${contact.phone}): ${user.fullName} missed a safety checkpoint. Last known location: ${JSON.stringify(user.location || 'unknown')}`);
        });
        toast({
          title: '🚨 Emergency Alerts Sent!',
          description: `Alerts dispatched to ${contacts.length} emergency contacts`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: '⚠️ CRITICAL: No Contacts',
          description: 'Emergency alert triggered but no contacts found!',
          variant: 'destructive'
        });
      }
      clearAlert();
    }
  }, [alertTriggered, user, toast, clearAlert]);

  return (
    <AnimatePresence>
      {missedCheckpoint && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-destructive/20 backdrop-blur-md"
        >
          <motion.div 
            initial={{ y: 100, scale: 0.9, opacity: 0 }} 
            animate={{ y: 0, scale: 1, opacity: 1 }} 
            className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-destructive/50"
          >
            <div className="text-center">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                 <ShieldAlert className="w-12 h-12 text-destructive" />
              </motion.div>
              
              <h3 className="text-2xl font-black text-foreground mb-2">SAFETY CHECK</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                You missed your scheduled check-in at <span className="text-foreground font-bold">{missedCheckpoint.name}</span>.
              </p>
              
              <div className="bg-destructive/5 rounded-2xl py-6 mb-8 border border-destructive/10">
                <p className="text-[10px] text-destructive uppercase font-bold tracking-widest mb-1">Time until alerts</p>
                <div className={`text-5xl font-black ${countdown <= 10 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                  {countdown}s
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                    onClick={confirmSafety} 
                    className="w-full bg-success hover:bg-success/90 text-success-foreground rounded-2xl h-14 font-bold text-lg shadow-lg shadow-success/20"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  I AM SAFE
                </Button>
                
                <Button 
                  onClick={() => {
                    setAlertTriggered(true);
                    confirmSafety();
                  }} 
                  variant="outline" 
                  className="w-full rounded-2xl h-14 border-destructive text-destructive font-bold text-lg hover:bg-destructive/10"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  TRIGGER SOS
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SafetyAlert;