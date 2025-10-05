import { useEffect, useRef, useState } from 'react';
import type { Feature, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Asteroid, type ImpactEffects } from '@/services/asteroidApi';
import { 
  Target, Flame, Activity, Wind, Waves, 
  Building, Users, Skull, X 
} from 'lucide-react';

interface ImpactRadarProps {
  asteroid: Asteroid;
  targetLocation: { lat: number; lng: number };
  effects: ImpactEffects;
  onClose: () => void;
}

export const ImpactRadar = ({ 
  asteroid, 
  targetLocation, 
  effects, 
  onClose 
}: ImpactRadarProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const updateRadarCirclesRef = useRef<() => void>(() => {});
  const [showExplosion, setShowExplosion] = useState(false);
  const [activeRadar, setActiveRadar] = useState({
    crater: true,
    fireball: true,
    shockwave: true,
    wind: false,
    earthquake: false,
  });

  const targetLat = targetLocation.lat;
  const targetLng = targetLocation.lng;

  useEffect(() => {
    updateRadarCirclesRef.current = () => {
      if (!map.current) return;

      const circleIds = ['crater', 'fireball', 'shockwave', 'wind', 'earthquake'] as const;

      circleIds.forEach((id) => {
        const outlineId = `${id}-outline`;
        if (map.current?.getLayer(outlineId)) {
          map.current.removeLayer(outlineId);
        }
        if (map.current?.getLayer(id)) {
          map.current.removeLayer(id);
        }
        if (map.current?.getSource(id)) {
          map.current.removeSource(id);
        }
      });

      const createCircle = (id: (typeof circleIds)[number], radiusKm: number, color: string, opacity: number) => {
        if (!activeRadar[id]) return;

        const radiusInMeters = radiusKm * 1000;
        const points = 64;
        const coordinates: [number, number][] = [];

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const dx = radiusInMeters * Math.cos(angle);
          const dy = radiusInMeters * Math.sin(angle);

          const lat = targetLat + dy / 111320;
          const lng = targetLng + dx / (111320 * Math.cos((targetLat * Math.PI) / 180));

          coordinates.push([lng, lat]);
        }
        coordinates.push(coordinates[0]);

        const data: Feature<Polygon> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        };

        const existingSource = map.current?.getSource(id) as maplibregl.GeoJSONSource | undefined;

        if (existingSource) {
          existingSource.setData(data);
        } else {
          map.current?.addSource(id, {
            type: 'geojson',
            data,
          });
        }

        if (!map.current?.getLayer(id)) {
          map.current?.addLayer({
            id,
            type: 'fill',
            source: id,
            paint: {
              'fill-color': color,
              'fill-opacity': opacity,
            },
          });
        }

        const outlineId = `${id}-outline`;
        if (!map.current?.getLayer(outlineId)) {
          map.current?.addLayer({
            id: outlineId,
            type: 'line',
            source: id,
            paint: {
              'line-color': color,
              'line-width': 2,
            },
          });
        }
      };

      createCircle('earthquake', Number(effects.earthquake_felt_miles) * 1.60934, '#a855f7', 0.1);
      createCircle('wind', Number(effects.wind_blast_radius_km), '#fbbf24', 0.15);
      createCircle('shockwave', Number(effects.shockwave_radius_km), '#3b82f6', 0.2);
      createCircle('fireball', Number(effects.fireball_radius_km), '#f97316', 0.3);
      createCircle('crater', Number(effects.crater_diameter_km) / 2, '#ef4444', 0.5);
    };
  }, [activeRadar, effects, targetLat, targetLng]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [targetLng, targetLat],
      zoom: 8,
    });

    map.current = mapInstance;

    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstance.getCanvas().style.cursor = 'pointer';

    mapInstance.on('load', () => {
      setTimeout(() => setShowExplosion(true), 500);
      updateRadarCirclesRef.current();
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, [targetLat, targetLng]);

  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      updateRadarCirclesRef.current();
    }
  }, [activeRadar, effects, targetLat, targetLng]);

  const radarSections = [
    {
      id: 'crater',
      title: 'Crater',
      icon: Target,
      color: 'text-destructive',
      data: [
        { label: `${effects.crater_diameter_miles} mile wide crater`, highlight: true },
        { label: `${effects.crater_casualties} people would be vaporized` },
        { label: `The crater is ${effects.crater_depth_ft} ft deep` },
      ],
    },
    {
      id: 'fireball',
      title: 'Fireball',
      icon: Flame,
      color: 'text-orange-500',
      data: [
        { label: `${effects.fireball_radius_miles} mile wide fireball`, highlight: true },
        { label: `${effects.fireball_deaths} people would die from the fireball` },
        { label: `${effects.fireball_3rd_degree_burns} people would receive 3rd degree burns` },
        { label: `${effects.fireball_2nd_degree_burns} people would receive 2nd degree burns` },
        { label: `Trees would catch on fire within ${effects.fireball_tree_ignition_miles} miles` },
      ],
    },
    {
      id: 'shockwave',
      title: 'Shock Wave',
      icon: Activity,
      color: 'text-blue-500',
      data: [
        { label: `${effects.shockwave_decibels} decibel shock wave`, highlight: true },
        { label: `${effects.shockwave_deaths} people would die from the shock wave` },
        { label: `Lung damage within ${effects.shockwave_lung_damage_miles} miles` },
        { label: `Ruptured eardrums within ${effects.shockwave_eardrum_rupture_miles} miles` },
        { label: `Buildings collapse within ${effects.shockwave_building_collapse_miles} miles` },
        { label: `Homes collapse within ${effects.shockwave_home_collapse_miles} miles` },
      ],
    },
    {
      id: 'wind',
      title: 'Wind Blast',
      icon: Wind,
      color: 'text-yellow-500',
      data: [
        { label: `${effects.wind_peak_speed_mph} mph peak wind speed`, highlight: true },
        { label: `${effects.wind_deaths} people would die from the wind blast` },
        { label: `Faster than Jupiter storms within ${effects.wind_jupiter_storm_miles} miles` },
        { label: `Complete leveling within ${effects.wind_complete_level_miles} miles` },
        { label: `EF5 tornado conditions within ${effects.wind_ef5_tornado_miles} miles` },
        { label: `Trees knocked down within ${effects.wind_trees_down_miles} miles` },
      ],
    },
    {
      id: 'earthquake',
      title: 'Earthquake',
      icon: Activity,
      color: 'text-purple-500',
      data: [
        { label: `${effects.earthquake_magnitude} magnitude earthquake`, highlight: true },
        { label: `${effects.earthquake_deaths} people would die from the earthquake` },
        { label: `Felt ${effects.earthquake_felt_miles} miles away` },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex">
      {/* Map Side */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Explosion Animation */}
        {showExplosion && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="explosion-animation">
              <div className="explosion-core" />
              <div className="explosion-ring" />
              <div className="explosion-shockwave" />
            </div>
          </div>
        )}

        {/* Impact Summary */}
        <div className="absolute top-4 left-4 panel rounded-lg p-4 max-w-md border-2 border-destructive/50">
          <h3 className="text-xl font-bold text-destructive mb-2 flex items-center gap-2">
            <Skull className="w-5 h-5" />
            Impact Summary
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="text-muted-foreground">Asteroid:</span> {asteroid.name}
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Impact Speed:</span> {effects.impact_speed_mph} mph
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Energy:</span> {effects.energy_megatons} Gigatons TNT
            </p>
            <p className="text-foreground">
              <span className="text-muted-foreground">Frequency:</span> Every {effects.average_occurrence_years} years
            </p>
          </div>
        </div>
      </div>

      {/* Radar Panel Side */}
      <div className="w-[500px] panel border-l-2 border-border overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <h2 className="text-2xl font-bold text-primary">Impact Analysis</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {radarSections.map((section) => (
            <div key={section.id} className="panel rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  <h3 className="font-semibold text-lg text-foreground">{section.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={section.id} className="text-sm text-muted-foreground">
                    Show
                  </Label>
                  <Switch
                    id={section.id}
                    checked={activeRadar[section.id as keyof typeof activeRadar]}
                    onCheckedChange={(checked) =>
                      setActiveRadar({ ...activeRadar, [section.id]: checked })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                {section.data.map((item, idx) => (
                  <p
                    key={idx}
                    className={`text-sm ${
                      item.highlight
                        ? `font-bold ${section.color}`
                        : 'text-muted-foreground'
                    }`}
                  >
                    • {item.label}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .explosion-animation {
          position: relative;
          width: 300px;
          height: 300px;
        }
        
        .explosion-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          background: radial-gradient(circle, #fff 0%, #ff6b00 30%, #ff0000 60%, transparent 100%);
          border-radius: 50%;
          animation: explode-core 1.5s ease-out forwards;
        }
        
        .explosion-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border: 4px solid #ff4400;
          border-radius: 50%;
          animation: explode-ring 2s ease-out forwards;
          animation-delay: 0.3s;
        }
        
        .explosion-shockwave {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border: 2px solid rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: shockwave 2.5s ease-out forwards;
          animation-delay: 0.5s;
        }
        
        @keyframes explode-core {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          50% {
            width: 200px;
            height: 200px;
            opacity: 1;
          }
          100% {
            width: 250px;
            height: 250px;
            opacity: 0;
          }
        }
        
        @keyframes explode-ring {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 500px;
            height: 500px;
            opacity: 0;
          }
        }
        
        @keyframes shockwave {
          0% {
            width: 0;
            height: 0;
            opacity: 0.8;
          }
          100% {
            width: 800px;
            height: 800px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
