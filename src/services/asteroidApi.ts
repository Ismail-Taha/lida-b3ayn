export interface Asteroid {
  id: string;
  name: string;
  diameter_km: number;
  velocity_kmh: number;
  miss_distance_km: number;
  is_potentially_hazardous: boolean;
  close_approach_date: string;
  absolute_magnitude: number;
  x: number;
  y: number;
  z: number;
}

const NASA_API_KEY = 'DEMO_KEY'; // Using demo key for testing, users can get their own from api.nasa.gov

export const fetchNearEarthAsteroids = async (): Promise<Asteroid[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const response = await fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDateStr}&end_date=${endDateStr}&api_key=${NASA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch asteroid data');
    }

    const data = await response.json();
    const asteroids: Asteroid[] = [];

    Object.keys(data.near_earth_objects).forEach((date) => {
      data.near_earth_objects[date].forEach((neo: any) => {
        const closeApproach = neo.close_approach_data[0];
        const diameter = neo.estimated_diameter.kilometers;
        
        // Calculate 3D position based on miss distance and random positioning
        const distance = parseFloat(closeApproach.miss_distance.kilometers);
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        
        // Normalize to reasonable scale for visualization
        const scaledDistance = Math.min(distance / 100000, 10);
        
        asteroids.push({
          id: neo.id,
          name: neo.name,
          diameter_km: (diameter.estimated_diameter_min + diameter.estimated_diameter_max) / 2,
          velocity_kmh: parseFloat(closeApproach.relative_velocity.kilometers_per_hour),
          miss_distance_km: distance,
          is_potentially_hazardous: neo.is_potentially_hazardous_asteroid,
          close_approach_date: closeApproach.close_approach_date,
          absolute_magnitude: neo.absolute_magnitude_h,
          x: Math.sin(angle1) * Math.cos(angle2) * scaledDistance,
          y: Math.sin(angle2) * scaledDistance,
          z: Math.cos(angle1) * Math.cos(angle2) * scaledDistance,
        });
      });
    });

    return asteroids.slice(0, 50); // Limit to 50 asteroids for performance
  } catch (error) {
    console.error('Error fetching asteroids:', error);
    return [];
  }
};

export const calculateImpactEffects = (asteroid: Asteroid) => {
  const energy = (0.5 * (asteroid.diameter_km ** 3) * (asteroid.velocity_kmh / 3600) ** 2) / 1000;
  
  return {
    energy_megatons: energy.toFixed(2),
    crater_diameter_km: (asteroid.diameter_km * 20).toFixed(2),
    fireball_radius_km: (asteroid.diameter_km * 5).toFixed(2),
    shockwave_radius_km: (asteroid.diameter_km * 50).toFixed(2),
    earthquake_magnitude: Math.min(5 + Math.log10(energy), 10).toFixed(1),
    tsunami_height_m: asteroid.diameter_km > 0.5 ? (asteroid.diameter_km * 10).toFixed(1) : '0',
  };
};
