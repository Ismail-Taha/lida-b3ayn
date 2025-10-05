import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Asteroid, calculateImpactEffects } from '@/services/asteroidApi';
import { Flame, Waves, Activity, Target, Zap, Rocket, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TargetingMap } from './TargetingMap';
import { ImpactRadar } from './ImpactRadar';

interface SimulationModalProps {
  asteroid: Asteroid | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationModal = ({ asteroid, isOpen, onClose }: SimulationModalProps) => {
  const [simulationPhase, setSimulationPhase] = useState<'preview' | 'targeting' | 'impact'>('preview');
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const effects = useMemo(() => {
    if (!asteroid) return null;
    return calculateImpactEffects(asteroid, targetLocation || undefined);
  }, [asteroid, targetLocation]);

  if (!asteroid || !effects) return null;

  const handleLaunch = () => {
    setSimulationPhase('targeting');
  };

  const handleTargetSelected = (location: { lat: number; lng: number }) => {
    setTargetLocation(location);
    setSimulationPhase('impact');
  };

  const handleClose = () => {
    setSimulationPhase('preview');
    setTargetLocation(null);
    onClose();
  };

  // Show targeting map
  if (simulationPhase === 'targeting') {
    return (
      <TargetingMap
        onTargetSelected={handleTargetSelected}
        onCancel={handleClose}
      />
    );
  }

  // Show impact radar
  if (simulationPhase === 'impact' && targetLocation) {
    return (
      <ImpactRadar
        asteroid={asteroid}
        targetLocation={targetLocation}
        effects={effects}
        onClose={handleClose}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl panel border-2 border-primary/50 glow-primary p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary text-glow flex items-center gap-2">
            <Globe className="w-6 h-6 animate-pulse-glow" />
            Impact Simulation: {asteroid.name}
          </DialogTitle>
          <DialogDescription className="text-foreground/80">
            Estimated effects if this asteroid were to impact Earth
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          {/* Asteroid Info */}
          <div className="panel rounded-lg p-4">
            <h3 className="text-lg font-semibold text-secondary mb-3">Asteroid Properties</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">Diameter</span>
                <p className="text-foreground font-bold">{asteroid.diameter_km.toFixed(3)} km</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Velocity</span>
                <p className="text-foreground font-bold">{asteroid.velocity_kmh.toFixed(0)} km/h</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Mass Category</span>
                <p className="text-foreground font-bold">
                  {asteroid.diameter_km > 1 ? 'Massive' : asteroid.diameter_km > 0.5 ? 'Large' : 'Medium'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Absolute Magnitude</span>
                <p className="text-foreground font-bold">{asteroid.absolute_magnitude.toFixed(2)} H</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="panel rounded-lg p-4 border border-destructive/50 bg-destructive/10">
            <p className="text-sm text-destructive font-medium">
              ⚠ This is a simplified simulation. Actual impact effects would vary based on impact angle, 
              location, composition, and many other factors.
            </p>
          </div>

          {/* Launch Button */}
          <Button
            onClick={handleLaunch}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-lg py-6 glow-secondary"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Launch Impact Simulation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
