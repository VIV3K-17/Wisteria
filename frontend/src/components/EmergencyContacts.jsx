import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Phone, User, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
const EmergencyContacts = ({
  open,
  onClose
}) => {
  const {
    user,
    addEmergencyContact,
    removeEmergencyContact
  } = useAuth();
  const {
    toast
  } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({
        title: 'Please fill name and phone',
        variant: 'destructive'
      });
      return;
    }
    if (!/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''))) {
      toast({
        title: 'Invalid phone number',
        variant: 'destructive'
      });
      return;
    }
    const saved = await addEmergencyContact({
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim() || 'Other'
    });
    if (!saved) {
      toast({
        title: 'Could not save contact',
        description: 'Please try again with valid details',
        variant: 'destructive'
      });
      return;
    }

    setName('');
    setPhone('');
    setRelationship('');
    toast({
      title: 'Contact added!'
    });
  };
  return <AnimatePresence>
      {open && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{
        y: 100
      }} animate={{
        y: 0
      }} exit={{
        y: 100
      }} onClick={e => e.stopPropagation()} className="bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto soft-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Emergency Contacts</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add form */}
            <div className="space-y-3 mb-6 p-4 bg-secondary/30 rounded-xl">
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name" className="pl-10 rounded-xl bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" className="pl-10 rounded-xl bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Relationship</Label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. Parent, Spouse" className="pl-10 rounded-xl bg-background" />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground rounded-xl">
                <UserPlus className="w-4 h-4 mr-2" /> Add Contact
              </Button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {user?.emergencyContacts.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No emergency contacts yet</p>}
              {user?.emergencyContacts.map(contact => <motion.div key={contact.id} layout initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: 20
          }} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{contact.name}</p>
                    <p className="text-muted-foreground text-xs">{contact.phone} · {contact.relationship}</p>
                  </div>
                  <button onClick={() => removeEmergencyContact(contact.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>)}
            </div>
          </motion.div>
        </motion.div>}
    </AnimatePresence>;
};
export default EmergencyContacts;