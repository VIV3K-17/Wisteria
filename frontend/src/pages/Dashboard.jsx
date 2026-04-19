import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Navigation, Shield, Users, LogOut, MapPin, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/contexts/AuthContext';
import { useJourney } from '@/contexts/JourneyContext';
import { useToast } from '@/hooks/use-toast';
import MapView from '@/components/MapView';
import JourneyPanel from '@/components/JourneyPanel';
import SafetyAlert from '@/components/SafetyAlert';
import EmergencyContacts from '@/components/EmergencyContacts';
import DashboardNav from '@/components/DashboardNav';
import JourneyHistoryPanel from '@/components/JourneyHistoryPanel';
import EmergencyPanel from '@/components/EmergencyPanel';

const DESTINATIONS = [{
  name: 'Mumbai Central',
  lat: 19.0760,
  lng: 72.8777
}, {
  name: 'Delhi Gate',
  lat: 28.6139,
  lng: 77.2090
}, {
  name: 'Bangalore MG Road',
  lat: 12.9716,
  lng: 77.5946
}, {
  name: 'Chennai Marina',
  lat: 13.0827,
  lng: 80.2707
}, {
  name: 'Hyderabad Charminar',
  lat: 17.3616,
  lng: 78.4747
}];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { journey, startJourney, updatePosition, journeyHistory } = useJourney();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('home');
  const [navOpen, setNavOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [userPos, setUserPos] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredDests = DESTINATIONS.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      setUserPos({ lat: 19.0760, lng: 72.8777 });
      return;
    }
    let watchId;
    try {
      watchId = navigator.geolocation.watchPosition(pos => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(newPos);
        if (journey?.active) updatePosition(newPos);
        setLocationLoading(false);
      }, () => {
        setLocationLoading(false);
        setUserPos({ lat: 19.0760, lng: 72.8777 });
      }, { enableHighAccuracy: true, timeout: 5000 });
    } catch (err) {
      console.error('Geolocation error:', err);
      setLocationLoading(false);
      setUserPos({ lat: 19.0760, lng: 72.8777 });
    }
    return () => watchId && navigator.geolocation.clearWatch(watchId);
  }, [journey?.active, updatePosition]);

  const handleStartJourney = useCallback(() => {
    if (!userPos || !selectedDest) return;
    startJourney({ ...userPos, name: 'Current Location' }, selectedDest);
    toast({ title: '🚀 Journey Started!', description: `Heading to ${selectedDest.name}` });
  }, [userPos, selectedDest, startJourney, toast]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav
        activeView={activeView}
        onChangeView={setActiveView}
        open={navOpen}
        onOpenChange={setNavOpen}
        userName={user.fullName}
      />

      <div className="min-h-screen pb-6">
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">SafeTravel</h1>
                <p className="text-xs text-muted-foreground">{user.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowContacts(true)} className="rounded-xl text-primary h-8">
                <Users className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLogoutDialogOpen(true)} className="rounded-xl text-muted-foreground h-8">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.header>

        <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:px-6 md:py-5">
          {activeView === 'home' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-4">
                {!journey?.active && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} className="space-y-3">
                    <div className="glass-card rounded-2xl p-4 soft-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                          {locationLoading ? <Loader2 className="w-5 h-5 text-success animate-spin" /> : <Navigation className="w-5 h-5 text-success" />}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Location</p>
                          <p className="text-sm font-medium">{locationLoading ? 'Detecting...' : userPos ? `${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}` : 'Unavailable'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4 soft-shadow relative">
                      <Label className="text-xs text-muted-foreground mb-2 block">Where are you going?</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search destination..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }} className="pl-10 rounded-xl" />
                      </div>

                      {showSuggestions && searchQuery && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-card rounded-xl border border-border soft-shadow z-20 max-h-48 overflow-y-auto">
                          {filteredDests.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No results</p> : filteredDests.map(dest => (
                            <button key={dest.name} onClick={() => { setSelectedDest(dest); setSearchQuery(dest.name); setShowSuggestions(false); }} className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 text-left">
                              <MapPin className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm">{dest.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button onClick={handleStartJourney} disabled={!selectedDest || !userPos} className="w-full gradient-primary rounded-2xl h-14 font-semibold text-base">
                      <Play className="w-5 h-5 mr-2" /> Start Journey
                    </Button>
                  </motion.div>
                )}

                <JourneyPanel />

                <div className="glass-card rounded-2xl p-4 soft-shadow">
                  <p className="text-sm font-medium text-foreground">Emergency Contacts</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold text-primary">{user.emergencyContacts?.length || 0}</p>
                    <Button variant="outline" className="rounded-xl" onClick={() => setShowContacts(true)}>
                      Manage contacts
                    </Button>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-3 soft-shadow">
                <div className="h-[320px] sm:h-[380px] lg:h-[560px] overflow-hidden rounded-2xl">
                  <MapView userPosition={userPos} destination={selectedDest} className="h-full" />
                </div>
              </div>
            </div>
          )}

          {activeView === 'history' && (
            <>
              <div className="glass-card rounded-3xl p-5 soft-shadow">
                <h2 className="text-xl font-bold text-foreground">Journey history</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent trips and their checkpoint progress.
                </p>
              </div>
              <JourneyHistoryPanel history={journeyHistory} />
            </>
          )}

          {activeView === 'sos' && (
            <EmergencyPanel onOpenContacts={() => setShowContacts(true)} />
          )}
        </main>

        <SafetyAlert />
        <EmergencyContacts open={showContacts} onClose={() => setShowContacts(false)} />
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout from SafeTravel?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out and sent back to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutDialogOpen(false);
                handleLogout();
              }}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;