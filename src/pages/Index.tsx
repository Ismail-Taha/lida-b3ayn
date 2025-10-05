import { useState, useEffect, useMemo, useCallback } from 'react';
import { AsteroidScene } from '@/components/AsteroidScene';
import { AsteroidTooltip } from '@/components/AsteroidTooltip';
import { SimulationModal } from '@/components/SimulationModal';
import { fetchNearEarthAsteroids, Asteroid } from '@/services/asteroidApi';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Satellite, Play, Search, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import spaceBackground from '@/assets/space-background.jpg';

const Index = () => {
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredAsteroid, setHoveredAsteroid] = useState<Asteroid | null>(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState<Asteroid | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [filters, setFilters] = useState({
    sizeRange: [0, 10] as [number, number],
    velocityRange: [0, 100000] as [number, number],
  });
  const [maxAsteroids, setMaxAsteroids] = useState(30);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchSizeRange, setSearchSizeRange] = useState<[number, number]>([0, 10]);
  const [searchVelocityRange, setSearchVelocityRange] = useState<[number, number]>([0, 100000]);

  useEffect(() => {
    loadAsteroids();
  }, []);

  const loadAsteroids = async () => {
    setLoading(true);
    try {
      const data = await fetchNearEarthAsteroids();
      setAsteroids(data);
      setMaxAsteroids((prev) => Math.min(prev, data.length));
      toast.success(`Loaded ${data.length} near-Earth asteroids`);
    } catch (error) {
      toast.error('Failed to load asteroid data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const diameterRange = useMemo<[number, number]>(() => {
    if (!asteroids.length) return [0, 10];
    const sizes = asteroids.map((a) => a.diameter_km);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    return [Math.floor(min * 1000) / 1000, Math.ceil(max * 1000) / 1000];
  }, [asteroids]);

  const velocityRange = useMemo<[number, number]>(() => {
    if (!asteroids.length) return [0, 100000];
    const velocities = asteroids.map((a) => a.velocity_kmh);
    const min = Math.min(...velocities);
    const max = Math.max(...velocities);
    return [Math.floor(min), Math.ceil(max)];
  }, [asteroids]);

  useEffect(() => {
    if (!asteroids.length) return;

    setFilters((prev) => {
      const nextSizeRange = diameterRange;
      const nextVelocityRange = velocityRange;

      const sizeChanged =
        prev.sizeRange[0] !== nextSizeRange[0] || prev.sizeRange[1] !== nextSizeRange[1];
      const velocityChanged =
        prev.velocityRange[0] !== nextVelocityRange[0] || prev.velocityRange[1] !== nextVelocityRange[1];

      if (!sizeChanged && !velocityChanged) {
        return prev;
      }

      return {
        ...prev,
        sizeRange: sizeChanged ? nextSizeRange : prev.sizeRange,
        velocityRange: velocityChanged ? nextVelocityRange : prev.velocityRange,
      };
    });
  }, [asteroids, diameterRange, velocityRange]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isSimulationOpen) return;
      const { clientX, clientY } = event;
      setMousePosition((prev) => {
        if (prev.x === clientX && prev.y === clientY) {
          return prev;
        }
        return { x: clientX, y: clientY };
      });
    },
    [isSimulationOpen]
  );

  const handleAsteroidClick = (asteroid: Asteroid) => {
    setSelectedAsteroid(asteroid);
    setIsSimulationOpen(true);
  };

  const filteredAsteroids = useMemo(() => {
    if (!asteroids.length) return [];

    return asteroids.filter((asteroid) => {
      const withinSize =
        asteroid.diameter_km >= filters.sizeRange[0] && asteroid.diameter_km <= filters.sizeRange[1];
      const withinVelocity =
        asteroid.velocity_kmh >= filters.velocityRange[0] &&
        asteroid.velocity_kmh <= filters.velocityRange[1];

      return withinSize && withinVelocity;
    })
      .sort((a, b) => a.miss_distance_km - b.miss_distance_km)
      .slice(0, maxAsteroids);
  }, [asteroids, filters, maxAsteroids]);

  const resetFilters = useCallback(() => {
    setFilters({
      sizeRange: diameterRange,
      velocityRange: velocityRange,
    });
  }, [diameterRange, velocityRange]);

  const handleSearchOpen = useCallback(() => {
    setSearchName('');
    setSearchSizeRange(diameterRange);
    setSearchVelocityRange(velocityRange);
    setIsSearchOpen(true);
  }, [diameterRange, velocityRange]);

  const searchResults = useMemo(() => {
    if (!asteroids.length) return [];

    const normalizedQuery = searchName.trim().toLowerCase();

    return asteroids
      .filter((asteroid) => {
        const matchesName =
          !normalizedQuery || asteroid.name.toLowerCase().includes(normalizedQuery);
        const matchesSize =
          asteroid.diameter_km >= searchSizeRange[0] &&
          asteroid.diameter_km <= searchSizeRange[1];
        const matchesVelocity =
          asteroid.velocity_kmh >= searchVelocityRange[0] &&
          asteroid.velocity_kmh <= searchVelocityRange[1];

        return matchesName && matchesSize && matchesVelocity;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [asteroids, searchName, searchSizeRange, searchVelocityRange]);

  const handleSearchSelect = useCallback(
    (asteroid: Asteroid) => {
      setFilters((prev) => ({
        ...prev,
        sizeRange: [
          Math.min(prev.sizeRange[0], asteroid.diameter_km),
          Math.max(prev.sizeRange[1], asteroid.diameter_km),
        ] as [number, number],
        velocityRange: [
          Math.min(prev.velocityRange[0], asteroid.velocity_kmh),
          Math.max(prev.velocityRange[1], asteroid.velocity_kmh),
        ] as [number, number],
      }));
      setSelectedAsteroid(asteroid);
      setHoveredAsteroid(asteroid);
      setIsSimulationOpen(true);
      setIsSearchOpen(false);
    },
    [setIsSimulationOpen, setFilters, setSelectedAsteroid, setHoveredAsteroid, setIsSearchOpen]
  );

  useEffect(() => {
    if (hoveredAsteroid && !filteredAsteroids.find((a) => a.id === hoveredAsteroid.id)) {
      setHoveredAsteroid(null);
    }

    if (selectedAsteroid && !filteredAsteroids.find((a) => a.id === selectedAsteroid.id)) {
      setSelectedAsteroid(null);
      setIsSimulationOpen(false);
    }
  }, [filteredAsteroids, hoveredAsteroid, selectedAsteroid]);

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
          
          <div className="flex gap-4 items-start">
            <Button
              onClick={handleSearchOpen}
              className="flex items-center gap-2 bg-primary/80 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Search className="w-4 h-4" />
              Search Near
            </Button>
            <Button asChild className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30">
              <Link to="/impact-analysis">
                <BookOpen className="w-4 h-4" />
                Impact Science
              </Link>
            </Button>
            <div className="panel rounded-lg px-6 py-3">
              <p className="text-sm text-muted-foreground">Total Asteroids</p>
              <p className="text-3xl font-bold text-primary">{filteredAsteroids.length}</p>
              <p className="text-xs text-muted-foreground">of {asteroids.length} tracked</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 lg:grid-cols-3 md:grid-cols-2">
          <div className="panel rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Size Range</p>
                <p className="text-base font-semibold text-foreground">
                  {filters.sizeRange[0].toFixed(2)} km – {filters.sizeRange[1].toFixed(2)} km
                </p>
              </div>
            </div>
            <Slider
              value={filters.sizeRange}
              min={diameterRange[0]}
              max={Math.max(diameterRange[1], diameterRange[0] + 0.01)}
              step={0.01}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  sizeRange: value as [number, number],
                }))
              }
            />
          </div>

          <div className="panel rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Velocity Range</p>
                <p className="text-base font-semibold text-foreground">
                  {Math.round(filters.velocityRange[0]).toLocaleString()} km/h – {Math.round(filters.velocityRange[1]).toLocaleString()} km/h
                </p>
              </div>
            </div>
            <Slider
              value={filters.velocityRange}
              min={velocityRange[0]}
              max={Math.max(velocityRange[1], velocityRange[0] + 100)}
              step={100}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  velocityRange: value as [number, number],
                }))
              }
            />
          </div>

          <div className="panel rounded-lg p-2.5 flex flex-col gap-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Visible Count</p>
              <p className="text-base font-semibold text-foreground">
                Showing {filteredAsteroids.length} of {asteroids.length}
              </p>
              <Slider
                value={[Math.min(maxAsteroids, Math.max(asteroids.length, 1))]}
                min={1}
                max={Math.max(asteroids.length, 1)}
                step={1}
                onValueChange={(value) => setMaxAsteroids(value[0])}
              />
              <p className="text-xs text-muted-foreground leading-snug">
                Limit the number of asteroids rendered in the 3D scene for performance tuning.
              </p>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
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
              asteroids={filteredAsteroids}
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
            <span className="inline-block w-3 h-3 bg-[#fde68a] rounded-full mr-2"></span>
            Small body
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="inline-block w-3 h-3 bg-[#c084fc] rounded-full mr-2"></span>
            Medium body
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="inline-block w-3 h-3 bg-[#7dd3fc] rounded-full mr-2"></span>
            Large body
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="inline-block w-3 h-3 bg-[#fdba74] rounded-full mr-2"></span>
            Giant body
          </p>
        </div>
      </div>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Search Near-Earth Asteroids</DialogTitle>
            <DialogDescription>
              Filter by name, size, or velocity to quickly locate asteroids of interest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Asteroid Name</p>
              <Input
                placeholder="Search by name"
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Size Range (km)</p>
                <p className="text-sm text-foreground font-medium">
                  {searchSizeRange[0].toFixed(2)} km – {searchSizeRange[1].toFixed(2)} km
                </p>
              </div>
              <Slider
                value={searchSizeRange}
                min={diameterRange[0]}
                max={Math.max(diameterRange[1], diameterRange[0] + 0.01)}
                step={0.01}
                onValueChange={(value) => setSearchSizeRange(value as [number, number])}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Velocity Range (km/h)</p>
                <p className="text-sm text-foreground font-medium">
                  {Math.round(searchVelocityRange[0]).toLocaleString()} km/h – {Math.round(searchVelocityRange[1]).toLocaleString()} km/h
                </p>
              </div>
              <Slider
                value={searchVelocityRange}
                min={velocityRange[0]}
                max={Math.max(velocityRange[1], velocityRange[0] + 100)}
                step={100}
                onValueChange={(value) => setSearchVelocityRange(value as [number, number])}
              />
            </div>

            <div className="border border-border rounded-lg max-h-64 overflow-y-auto divide-y divide-border">
              {searchResults.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No asteroids match your search criteria.</p>
              ) : (
                searchResults.map((asteroid) => (
                  <button
                    key={asteroid.id}
                    type="button"
                    onClick={() => handleSearchSelect(asteroid)}
                    className="w-full text-left p-4 hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-sm font-semibold text-foreground">{asteroid.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {asteroid.diameter_km.toFixed(2)} km · Velocity: {Math.round(asteroid.velocity_kmh).toLocaleString()} km/h · Miss Distance: {asteroid.miss_distance_km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Close Approach: {new Date(asteroid.close_approach_date).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
