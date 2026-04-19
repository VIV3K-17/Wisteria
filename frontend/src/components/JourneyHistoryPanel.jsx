import React from 'react';
import { motion } from 'framer-motion';
import { Clock3, MapPin, Route } from 'lucide-react';

const JourneyHistoryPanel = ({ history }) => {
  if (!history.length) {
    return (
      <div className="glass-card rounded-3xl p-6 soft-shadow text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock3 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No journey history yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your completed or ended trips will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <motion.div
          key={`${item.id}-${item.endedAt}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card rounded-3xl p-4 soft-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Route className="h-3.5 w-3.5 text-primary" />
                <span>{item.status}</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{item.source.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-destructive shrink-0" />
                  <span className="truncate">{item.destination.name}</span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{new Date(item.endedAt).toLocaleDateString()}</p>
              <p>{new Date(item.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-background/70 p-3 border border-border/50">
              <p className="text-lg font-bold text-primary">{item.reachedCount}/{item.checkpointCount}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Checkpoints</p>
            </div>
            <div className="rounded-2xl bg-background/70 p-3 border border-border/50">
              <p className="text-lg font-bold text-primary">{new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Started</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default JourneyHistoryPanel;