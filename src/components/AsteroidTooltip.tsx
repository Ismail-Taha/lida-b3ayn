import { Asteroid } from '@/services/asteroidApi';
import { AlertTriangle, TrendingUp, Target } from 'lucide-react';

interface AsteroidTooltipProps {
  asteroid: Asteroid | null;
  position: { x: number; y: number };
}

export const AsteroidTooltip = ({ asteroid, position }: AsteroidTooltipProps) => {
  if (!asteroid) return null;

  return (
    <div
      className="fixed z-50 panel rounded-lg p-4 min-w-[280px] pointer-events-none"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y + 20}px`,
      }}
    >
      <div className="flex items-start gap-3">
        {asteroid.is_potentially_hazardous && (
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 animate-pulse-glow" />
        )}
        <div className="space-y-2 flex-1">
          <h3 className="font-bold text-primary text-glow">{asteroid.name}</h3>
          
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Diameter:</span>
              <span className="text-foreground font-medium">
                {asteroid.diameter_km.toFixed(3)} km
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Velocity:</span>
              <span className="text-foreground font-medium">
                {asteroid.velocity_kmh.toFixed(0)} km/h
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Miss Distance:</span>
              <span className="text-foreground font-medium">
                {asteroid.miss_distance_km.toFixed(0)} km
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Approach Date:</span>
              <span className="text-foreground font-medium">
                {asteroid.close_approach_date}
              </span>
            </div>
            
            {asteroid.is_potentially_hazardous && (
              <div className="mt-2 pt-2 border-t border-destructive/30">
                <span className="text-destructive font-medium text-xs">
                  ⚠ POTENTIALLY HAZARDOUS
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
