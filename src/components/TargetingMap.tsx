import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';
import { Target, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TargetingMapProps {
  onTargetSelected: (location: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

export const TargetingMap = ({ onTargetSelected, onCancel }: TargetingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        projection: 'globe',
        zoom: 2,
        center: [0, 20],
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.getCanvas().style.cursor = 'pointer';

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setSelectedLocation({ lat, lng });

        if (marker.current) {
          marker.current.remove();
        }

        const el = document.createElement('div');
        el.className = 'targeting-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #ef4444';
        el.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
        el.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)';
        el.style.animation = 'pulse 2s infinite';

        marker.current = new maplibregl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        toast.success(`Target selected: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
      });
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map.');
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  const handleHit = () => {
    if (selectedLocation) {
      onTargetSelected(selectedLocation);
    } else {
      toast.error('Please select a target location on the map');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="panel mx-4 my-4 p-4 rounded-lg border-2 border-destructive/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-destructive animate-pulse-glow" />
              <div>
                <h2 className="text-2xl font-bold text-destructive text-glow">Target Selection</h2>
                <p className="text-sm text-muted-foreground">Click anywhere on the map to select impact location</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={handleHit}
                disabled={!selectedLocation}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground glow-secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Launch Impact
              </Button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 mx-4 mb-4 rounded-lg overflow-hidden border-2 border-border panel relative">
          <div ref={mapContainer} className="absolute inset-0" />
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 panel rounded-lg p-3 border border-destructive/50">
              <p className="text-sm text-muted-foreground">Selected Target</p>
              <p className="text-foreground font-mono">
                {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lng.toFixed(4)}°E
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
