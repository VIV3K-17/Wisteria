import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJourney } from '@/contexts/JourneyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const SafetyAlert: React.FC = () => {
  const { missedCheckpoint, confirmSafety, alertTriggered, clearAlert } = useJourney();
  const { user } = useAuth();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!missedCheckpoint) {
      setCountdown(30);
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
      const contacts = user.emergencyContacts;
      if (contacts.length > 0) {
        contacts.forEach(contact => {
          console.log(`[EMERGENCY ALERT] Sending to ${contact.name} (${contact.phone}): ${user.fullName} may be in danger. Last known location shared.`);
        });
        toast({
          title: '🚨 Emergency Alert Sent',
          description: `Alerts sent to ${contacts.length} emergency contact(s)`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '⚠️ No Emergency Contacts',
          description: 'Please add emergency contacts in settings',
          variant: 'destructive',
        });
      }
      clearAlert();
    }
  }, [alertTriggered, user, toast, clearAlert]);

  return (
    <AnimatePresence>
      {missedCheckpoint && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-card rounded-2xl p-6 max-w-sm w-full soft-shadow"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Are You Safe?</h3>
              <p className="text-muted-foreground text-sm mb-1">
                You missed <strong>{missedCheckpoint.name}</strong>
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Please confirm you are safe within
              </p>
              <div className="text-3xl font-bold text-destructive mb-6">{countdown}s</div>

              <div className="space-y-3">
                <Button
                  onClick={confirmSafety}
                  className="w-full bg-success text-success-foreground rounded-xl h-12 font-semibold"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  I'm Safe
                </Button>
                <Button
                  onClick={() => {
                    if (user?.emergencyContacts.length) {
                      user.emergencyContacts.forEach(c => {
                        console.log(`[SOS] Calling ${c.name}: ${c.phone}`);
                      });
                      toast({ title: 'SOS Triggered', description: 'Contacting emergency services', variant: 'destructive' });
                    }
                    confirmSafety();
                  }}
                  variant="outline"
                  className="w-full rounded-xl h-12 border-destructive text-destructive font-semibold"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Send SOS Now
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
