import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Asteroid, calculateImpactEffects } from '@/services/asteroidApi';
import { Flame, Waves, Activity, Target, Zap, AlertTriangle, Rocket } from 'lucide-react';
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
  
  if (!asteroid) return null;

  const effects = calculateImpactEffects(asteroid, targetLocation || undefined);

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
      <DialogContent className="max-w-2xl panel border-2 border-primary/50 glow-primary">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary text-glow flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 animate-pulse-glow" />
            Impact Simulation: {asteroid.name}
          </DialogTitle>
          <DialogDescription className="text-foreground/80">
            Estimated effects if this asteroid were to impact Earth
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
                <span className="text-muted-foreground text-sm">Threat Level</span>
                <p className={`font-bold ${asteroid.is_potentially_hazardous ? 'text-destructive' : 'text-accent'}`}>
                  {asteroid.is_potentially_hazardous ? 'HIGH' : 'MODERATE'}
                </p>
              </div>
            </div>
          </div>

          {/* Impact Effects */}
          <div className="panel rounded-lg p-4">
            <h3 className="text-lg font-semibold text-destructive mb-3">Impact Effects</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Energy Release</p>
                  <p className="text-2xl font-bold text-primary">{effects.energy_megatons} Megatons</p>
                  <p className="text-sm text-muted-foreground">TNT equivalent</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Crater Diameter</p>
                  <p className="text-2xl font-bold text-secondary">{effects.crater_diameter_km} km</p>
                  <p className="text-sm text-muted-foreground">Impact crater size</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Fireball Radius</p>
                  <p className="text-2xl font-bold text-destructive">{effects.fireball_radius_km} km</p>
                  <p className="text-sm text-muted-foreground">Thermal radiation zone</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Shockwave Radius</p>
                  <p className="text-2xl font-bold text-accent">{effects.shockwave_radius_km} km</p>
                  <p className="text-sm text-muted-foreground">Overpressure damage zone</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Earthquake Magnitude</p>
                  <p className="text-2xl font-bold text-primary">{effects.earthquake_magnitude}</p>
                  <p className="text-sm text-muted-foreground">Richter scale equivalent</p>
                </div>
              </div>

              {parseFloat(effects.tsunami_height_m) > 0 && (
                <div className="flex items-start gap-3">
                  <Waves className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Tsunami Height</p>
                    <p className="text-2xl font-bold text-secondary">{effects.tsunami_height_m} meters</p>
                    <p className="text-sm text-muted-foreground">Coastal wave height</p>
                  </div>
                </div>
              )}
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
