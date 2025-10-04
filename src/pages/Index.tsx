import { useState, useEffect } from 'react';
import { AsteroidScene } from '@/components/AsteroidScene';
import { AsteroidTooltip } from '@/components/AsteroidTooltip';
import { SimulationModal } from '@/components/SimulationModal';
import { fetchNearEarthAsteroids, Asteroid } from '@/services/asteroidApi';
import { Button } from '@/components/ui/button';
import { Loader2, Satellite, AlertTriangle, Play } from 'lucide-react';
import { toast } from 'sonner';
import spaceBackground from '@/assets/space-background.jpg';

const Index = () => {
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredAsteroid, setHoveredAsteroid] = useState<Asteroid | null>(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState<Asteroid | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  useEffect(() => {
    loadAsteroids();
  }, []);

  const loadAsteroids = async () => {
    setLoading(true);
    try {
      const data = await fetchNearEarthAsteroids();
      setAsteroids(data);
      toast.success(`Loaded ${data.length} near-Earth asteroids`);
    } catch (error) {
      toast.error('Failed to load asteroid data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleAsteroidClick = (asteroid: Asteroid) => {
    setSelectedAsteroid(asteroid);
    setIsSimulationOpen(true);
  };

  const hazardousCount = asteroids.filter(a => a.is_potentially_hazardous).length;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{
        backgroundImage: `url(${spaceBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />

      {/* Header */}
      <header className="relative z-10 panel mx-4 my-4 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary text-glow flex items-center gap-3">
              <Satellite className="w-10 h-10 animate-pulse-glow" />
              Near-Earth Asteroid Tracker
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time 3D visualization of asteroid positions and impact simulation
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="panel rounded-lg px-6 py-3">
              <p className="text-sm text-muted-foreground">Total Asteroids</p>
              <p className="text-3xl font-bold text-primary">{asteroids.length}</p>
            </div>
            <div className="panel rounded-lg px-6 py-3 border border-destructive/50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Hazardous
              </p>
              <p className="text-3xl font-bold text-destructive">{hazardousCount}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 h-[calc(100vh-180px)] mx-4 mb-4">
        <div className="h-full panel rounded-lg overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <p className="text-xl text-foreground">Loading asteroid data...</p>
                <p className="text-sm text-muted-foreground mt-2">Fetching from NASA NEO API</p>
              </div>
            </div>
          ) : (
            <AsteroidScene
              asteroids={asteroids}
              onAsteroidHover={setHoveredAsteroid}
              onAsteroidClick={handleAsteroidClick}
            />
          )}
        </div>
      </main>

      {/* Info Panel */}
      <div className="fixed bottom-6 left-6 panel rounded-lg p-4 max-w-md z-10">
        <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Controls
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <span className="text-foreground">Click and drag</span> to rotate view</li>
          <li>• <span className="text-foreground">Scroll</span> to zoom in/out</li>
          <li>• <span className="text-foreground">Hover</span> over asteroids for info</li>
          <li>• <span className="text-foreground">Click</span> asteroid to simulate impact</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
            Normal asteroid
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="inline-block w-3 h-3 bg-destructive rounded-full mr-2 glow-secondary"></span>
            Potentially hazardous
          </p>
        </div>
      </div>

      {/* Tooltip */}
      <AsteroidTooltip asteroid={hoveredAsteroid} position={mousePosition} />

      {/* Simulation Modal */}
      <SimulationModal
        asteroid={selectedAsteroid}
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
      />
    </div>
  );
};

export default Index;
