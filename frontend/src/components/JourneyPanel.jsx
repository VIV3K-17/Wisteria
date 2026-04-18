import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, CheckCircle, Circle, Flag, StopCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJourney } from '@/contexts/JourneyContext';

const Countdown = ({ deadline, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        onExpire && onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  if (timeLeft === 0) return <span className="text-destructive font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue!</span>;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
};

const JourneyPanel = () => {
  const {
    journey,
    endJourney,
    updatePosition // Using manual check-in as fallback which effectively just updates next index if we add that function
  } = useJourney();

  if (!journey?.active) return null;

  const progress = journey.checkpoints.filter(cp => cp.reached).length / journey.checkpoints.length;
  const currentCP = journey.checkpoints[journey.currentCheckpointIndex];

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      className="glass-card rounded-2xl p-4 soft-shadow border border-primary/10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Live Tracking</h3>
        </div>
        <Button onClick={endJourney} variant="ghost" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10 h-8 font-medium">
          <StopCircle className="w-3 h-3 mr-1" /> End Journey
        </Button>
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] text-muted-foreground font-medium uppercase">Progress</div>
        <div className="text-[10px] text-primary font-bold">{Math.round(progress * 100)}%</div>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2.5 mb-5 overflow-hidden">
        <motion.div 
          className="gradient-primary h-full rounded-full" 
          initial={{ width: 0 }} 
          animate={{ width: `${progress * 100}%` }} 
          transition={{ duration: 0.8, ease: "easeOut" }} 
        />
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 bg-secondary/20 rounded-xl border border-border/50">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 py-1 px-2 rounded-lg w-fit">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="truncate max-w-[120px]">{journey.source.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground font-semibold bg-background/50 py-1 px-2 rounded-lg w-fit">
            <Flag className="w-3 h-3 text-destructive" />
            <span className="truncate max-w-[120px]">{journey.destination.name}</span>
          </div>
        </div>
        <div className="h-10 w-px bg-border/50" />
        <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p>
            <p className="text-sm font-bold text-primary">In Transit</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Milestones</p>
        {journey.checkpoints.map((cp, i) => (
          <motion.div 
            key={cp.id} 
            className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all ${
              cp.reached ? 'bg-success/5 border border-success/20' : 
              i === journey.currentCheckpointIndex ? 'bg-primary/5 border-2 border-primary/30 ring-4 ring-primary/5' : 
              'bg-muted/10 border border-transparent opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                cp.reached ? 'bg-success border-success text-white' : 
                i === journey.currentCheckpointIndex ? 'border-primary text-primary' : 
                'border-muted-foreground text-muted-foreground'
              }`}>
                {cp.reached ? <CheckCircle className="w-3 h-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground">{cp.name}</span>
                {!cp.reached && i === journey.currentCheckpointIndex && (
                  <span className="text-[10px] text-muted-foreground">Proximity: Automatic detection</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground font-mono">
              {!cp.reached && i === journey.currentCheckpointIndex ? (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-primary uppercase mb-0.5">Due in</span>
                  <div className="text-sm font-bold text-primary">
                    <Countdown deadline={cp.deadline} />
                  </div>
                </div>
              ) : cp.reached ? (
                <span className="text-success font-bold">Reached</span>
              ) : (
                <span>--:--</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default JourneyPanel;