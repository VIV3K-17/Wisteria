import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Navigation, Shield, Users, LogOut, MapPin, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useJourney } from '@/contexts/JourneyContext';
import { useToast } from '@/hooks/use-toast';
import MapView from '@/components/MapView';
import JourneyPanel from '@/components/JourneyPanel';
import SafetyAlert from '@/components/SafetyAlert';
import EmergencyContacts from '@/components/EmergencyContacts';

// Some well-known Indian destinations for the search
const DESTINATIONS = [
  { name: 'Mumbai Central', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi Gate', lat: 28.6139, lng: 77.2090 },
  { name: 'Bangalore MG Road', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai Marina', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad Charminar', lat: 17.3616, lng: 78.4747 },
  { name: 'Kolkata Victoria', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune Station', lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur Hawa Mahal', lat: 26.9239, lng: 75.8267 },
  { name: 'Ahmedabad Sabarmati', lat: 23.0225, lng: 72.5714 },
  { name: 'Lucknow Hazratganj', lat: 26.8467, lng: 80.9462 },
];

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { journey, startJourney } = useJourney();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<typeof DESTINATIONS[0] | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredDests = DESTINATIONS.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      // Fallback to a default
      setUserPos({ lat: 19.0760, lng: 72.8777 });
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        setUserPos({ lat: 19.0760, lng: 72.8777 });
        toast({ title: 'Using default location', description: 'GPS not available, using Mumbai as fallback' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleStartJourney = useCallback(() => {
    if (!userPos) {
      toast({ title: 'Location not available', variant: 'destructive' });
      return;
    }
    if (!selectedDest) {
      toast({ title: 'Please select a destination', variant: 'destructive' });
      return;
    }
    startJourney(
      { ...userPos, name: 'Current Location' },
      { lat: selectedDest.lat, lng: selectedDest.lng, name: selectedDest.name }
    );
    toast({ title: '🚀 Journey Started!', description: `Heading to ${selectedDest.name}` });
  }, [userPos, selectedDest, startJourney, toast]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">SafeTravel</h1>
              <p className="text-xs text-muted-foreground leading-tight">{user.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowContacts(true)} className="rounded-xl text-primary h-8">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-muted-foreground h-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Location & Search */}
        {!journey?.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {/* Current location */}
            <div className="glass-card rounded-2xl p-4 soft-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                  {locationLoading ? (
                    <Loader2 className="w-5 h-5 text-success animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Location</p>
                  <p className="text-sm font-medium text-foreground">
                    {locationLoading ? 'Detecting...' : userPos ? `${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}` : 'Unavailable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search destination */}
            <div className="glass-card rounded-2xl p-4 soft-shadow relative">
              <Label className="text-xs text-muted-foreground mb-2 block">Where are you going?</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search destination..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-10 rounded-xl bg-background border-border"
                />
              </div>

              {showSuggestions && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-4 right-4 top-full mt-1 bg-card rounded-xl border border-border soft-shadow z-20 max-h-48 overflow-y-auto"
                >
                  {filteredDests.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No results</p>
                  ) : (
                    filteredDests.map(dest => (
                      <button
                        key={dest.name}
                        onClick={() => {
                          setSelectedDest(dest);
                          setSearchQuery(dest.name);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{dest.name}</span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}

              {selectedDest && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/5 p-2 rounded-lg"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{selectedDest.name}</span>
                </motion.div>
              )}
            </div>

            {/* Start Journey */}
            <Button
              onClick={handleStartJourney}
              disabled={!selectedDest || !userPos}
              className="w-full gradient-primary text-primary-foreground rounded-2xl h-14 font-semibold text-base soft-shadow"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Journey
            </Button>
          </motion.div>
        )}

        {/* Journey Panel */}
        <JourneyPanel />

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ height: journey?.active ? '50vh' : '40vh' }}
        >
          <MapView
            userPosition={userPos}
            destination={selectedDest}
          />
        </motion.div>

        {/* Quick Stats */}
        {!journey?.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="glass-card rounded-2xl p-4 soft-shadow text-center">
              <p className="text-2xl font-bold text-primary">{user.emergencyContacts.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Emergency Contacts</p>
            </div>
            <div
              className="glass-card rounded-2xl p-4 soft-shadow text-center cursor-pointer hover:bg-primary/5 transition-colors"
              onClick={() => setShowContacts(true)}
            >
              <Users className="w-6 h-6 text-accent mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Manage Contacts</p>
            </div>
          </motion.div>
        )}
      </main>

      <SafetyAlert />
      <EmergencyContacts open={showContacts} onClose={() => setShowContacts(false)} />
    </div>
  );
};

export default Dashboard;
