import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, CheckCircle, Circle, Flag, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJourney } from '@/contexts/JourneyContext';

const JourneyPanel: React.FC = () => {
  const { journey, endJourney, reachCheckpoint } = useJourney();

  if (!journey?.active) return null;

  const progress = journey.checkpoints.filter(cp => cp.reached).length / journey.checkpoints.length;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card rounded-2xl p-4 soft-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Journey Active</h3>
        </div>
        <Button onClick={endJourney} variant="outline" size="sm" className="rounded-xl border-destructive text-destructive text-xs h-8">
          <StopCircle className="w-3 h-3 mr-1" /> End
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <motion.div
          className="gradient-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{journey.source.name}</span>
        <span>→</span>
        <span className="truncate">{journey.destination.name}</span>
      </div>

      {/* Checkpoints */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {journey.checkpoints.map((cp, i) => (
          <motion.div
            key={cp.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
              cp.reached ? 'bg-success/10' : i === journey.currentCheckpointIndex ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {cp.reached ? (
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium text-foreground">{cp.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{Math.ceil(cp.timeLimit / 60)}m</span>
              {!cp.reached && i === journey.currentCheckpointIndex && (
                <Button
                  size="sm"
                  onClick={() => reachCheckpoint(cp.id)}
                  className="h-6 text-xs px-2 rounded-lg gradient-primary text-primary-foreground"
                >
                  Check In
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default JourneyPanel;
