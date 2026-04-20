import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistance, formatDuration } from '@/lib/mapbox';

const RoutePreviewCard = ({ route, destination, onStart, onCancel, isLoading = false }) => {
  if (!route || !destination) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card rounded-2xl p-4 soft-shadow border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Route Preview</p>
            <p className="text-lg font-semibold text-foreground">{destination.name}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Route Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Distance</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatDistance(route.primaryRoute.distance)}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Est. Time</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatDuration(route.primaryRoute.duration)}
          </p>
        </div>
      </div>

      {/* Alternative Routes Info */}
      {route.alternativeRoutes && route.alternativeRoutes.length > 0 && (
        <div className="text-xs text-muted-foreground mb-4 bg-white/5 rounded p-2">
          📍 {route.alternativeRoutes.length} alternative route{route.alternativeRoutes.length !== 1 ? 's' : ''} available
        </div>
      )}

      {/* Start Button */}
      <Button
        onClick={onStart}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            Starting Journey...
          </>
        ) : (
          '🚀 Start Journey'
        )}
      </Button>
    </motion.div>
  );
};

export default RoutePreviewCard;
