import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Shield, Mail, Phone, User as UserIcon, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user, requestEmergencyContactsOTP, updateEmergencyContacts } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contacts, setContacts] = useState(user?.emergencyContacts || []);
  const [emergencyEmail, setEmergencyEmail] = useState(user?.emergencyEmail || '');
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(user?.emergencyEmail || '');

  if (!user) {
    navigate('/login');
    return null;
  }

  const hasValidEmergencySetup = () => {
    return contacts.length >= 1 && (emergencyEmail || pendingEmail);
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in name and phone number',
        variant: 'destructive'
      });
      return;
    }

    setContacts(prev => [...prev, {
      ...newContact,
      _id: crypto.randomUUID()
    }]);

    setNewContact({ name: '', phone: '', relationship: '' });
    setShowContactDialog(false);

    toast({
      title: 'Contact added',
      description: `${newContact.name} has been added to emergency contacts`
    });
  };

  const handleRemoveContact = (contactId) => {
    setContacts(prev => prev.filter(c => c._id !== contactId));
    toast({
      title: 'Contact removed',
      description: 'Emergency contact has been removed'
    });
  };

  const handleRequestOTP = async () => {
    if (!user?._id) {
      toast({
        title: 'Error',
        description: 'User information missing',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const emailToUse = user.email;
      const result = await requestEmergencyContactsOTP();
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setPendingEmail(pendingEmail || emergencyEmail || '');
      setShowOTPDialog(true);

      toast({
        title: 'OTP Sent',
        description: `Verification code sent to ${emailToUse} (primary account email)`
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to send OTP',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndSave = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    if (!hasValidEmergencySetup()) {
      toast({
        title: 'Incomplete Setup',
        description: 'Please add at least one emergency contact',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await updateEmergencyContacts({
        otp,
        contacts,
        emergencyEmail: pendingEmail
      });
      if (!result.success) {
        throw new Error(result.error || 'OTP verification failed');
      }

      setEmergencyEmail(pendingEmail);
      setShowOTPDialog(false);
      setOtp('');

      toast({
        title: 'Success!',
        description: 'Emergency contacts have been saved securely'
      });

      // Redirect to dashboard after successful setup
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'OTP verification failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-red-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Safety Settings</h1>
              <p className="text-slate-300">Configure your emergency contacts</p>
            </div>
          </div>

          {/* Alert for new users */}
          {!user?.emergencyContacts?.length && (
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Setup Required</p>
                <p className="text-amber-100 text-sm">You must add at least one emergency contact before starting a journey</p>
              </div>
            </div>
          )}

          {/* Emergency Email Section */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-white font-semibold mb-3">
              <Mail className="w-5 h-5" />
              Emergency Email
            </label>
            <Input
              type="email"
              placeholder="your-emergency-email@example.com"
              value={pendingEmail || emergencyEmail}
              onChange={(e) => setPendingEmail(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
            <p className="text-slate-400 text-sm mt-2">This email will receive safety alerts and verification codes</p>
          </div>

          {/* Emergency Contacts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-white font-semibold">
                <Users className="w-5 h-5" />
                Emergency Contacts ({contacts.length})
              </label>
              <Button
                onClick={() => setShowContactDialog(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Contact
              </Button>
            </div>

            <div className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No emergency contacts yet</p>
                </div>
              ) : (
                contacts.map((contact, idx) => (
                  <motion.div
                    key={contact._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/5 border border-white/20 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-semibold">{contact.name}</p>
                      <p className="text-slate-400 text-sm">{contact.phone}</p>
                      {contact.relationship && (
                        <p className="text-slate-500 text-xs mt-1">{contact.relationship}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContact(contact._id)}
                      className="text-red-400 hover:bg-red-400/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleRequestOTP}
            disabled={!hasValidEmergencySetup() || loading}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Verify & Save Settings'}
          </Button>

          <p className="text-slate-400 text-sm text-center mt-4">
            Your emergency contacts are encrypted and secure. You can update them anytime.
          </p>
        </motion.div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Add Emergency Contact</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add someone who should be notified in case of emergency
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white">Full Name *</Label>
              <Input
                placeholder="e.g., Mom"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Phone Number *</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Relationship (Optional)</Label>
              <Input
                placeholder="e.g., Mother, Sister, Friend"
                value={newContact.relationship}
                onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactDialog(false)}
              className="border-white/20 bg-white/90 text-slate-900 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddContact}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Verify Your Email</DialogTitle>
            <DialogDescription className="text-slate-400">
              We've sent a 6-digit verification code to {pendingEmail}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                  <InputOTPSlot index={1} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                  <InputOTPSlot index={2} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                  <InputOTPSlot index={3} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                  <InputOTPSlot index={4} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                  <InputOTPSlot index={5} className="bg-slate-800 border-slate-500 text-white text-lg font-semibold" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={() => handleRequestOTP()}
              variant="link"
              className="text-center w-full text-blue-400 hover:text-blue-300"
            >
              Didn't receive code? Resend OTP
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOTPDialog(false);
                setOtp('');
              }}
              className="border-white/20 bg-white/90 text-slate-900 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOTPAndSave}
              disabled={otp.length !== 6 || loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
