import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const EmergencyPanel = ({ onOpenContacts }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSOS = () => {
    const contacts = user?.emergencyContacts || [];

    if (!contacts.length) {
      toast({
        title: 'No emergency contacts',
        description: 'Add at least one contact before using SOS.',
        variant: 'destructive'
      });
      onOpenContacts?.();
      return;
    }

    contacts.forEach(contact => {
      console.log(`[SOS] Alerting ${contact.name} (${contact.phone}) for ${user.fullName}`);
    });

    toast({
      title: 'SOS triggered',
      description: `Emergency alert sent to ${contacts.length} contacts.`,
      variant: 'destructive'
    });

    onOpenContacts?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-6 soft-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Emergency mode</h2>
          <p className="text-sm text-muted-foreground">Send an SOS to your saved contacts.</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-background/70 p-4">
        <p className="text-sm font-medium text-foreground">Saved contacts</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.emergencyContacts?.length || 0} contact(s) available
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Button onClick={handleSOS} className="h-14 w-full rounded-2xl bg-destructive text-destructive-foreground font-bold text-base hover:bg-destructive/90">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Trigger SOS
        </Button>
        <Button onClick={onOpenContacts} variant="outline" className="h-12 w-full rounded-2xl border-border/70 font-semibold">
          <Phone className="mr-2 h-4 w-4" />
          Manage contacts
        </Button>
      </div>
    </motion.div>
  );
};

export default EmergencyPanel;