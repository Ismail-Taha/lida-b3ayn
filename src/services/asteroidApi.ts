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

const NASA_API_KEY = 'DEMO_KEY'; // Get your own free key at https://api.nasa.gov

// Fallback mock data when API is unavailable
const generateMockAsteroids = (): Asteroid[] => {
  const mockAsteroids: Asteroid[] = [];
  const names = [
    '(2024 XR1) Apophis', '(2023 QZ5) Bennu', '(2024 RT2) Ryugu', 
    '(2023 PX9) Itokawa', '(2024 ML3) Eros', '(2023 KN2) Vesta',
    '(2024 HG7) Ceres', '(2023 FD1) Pallas', '(2024 BC4) Juno',
    '(2023 YT8) Psyche', '(2024 WK6) Didymos', '(2023 UV3) Dimorphos',
    '(2024 SM9) Toutatis', '(2023 QL7) Geographos', '(2024 NP2) Castalia',
    '(2023 MX5) Icarus', '(2024 LK1) Phaethon', '(2023 JH8) Gaspra',
    '(2024 IR4) Ida', '(2023 HF6) Mathilde', '(2024 GY3) Aten',
    '(2023 FV9) Apollo', '(2024 EK7) Amor', '(2023 DW2) Hungaria',
    '(2024 CP5) Flora', '(2023 BN8) Themis', '(2024 AL1) Hygiea',
    '(2023 ZM4) Interamnia', '(2024 YX6) Europa', '(2023 XK9) Davida',
    '(2024 WH3) Sylvia', '(2023 VG7) Camilla', '(2024 UF2) Cybele',
    '(2023 TE5) Eunomia', '(2024 SD8) Euphrosyne', '(2023 RC1) Bamberga',
    '(2024 QB4) Iris', '(2023 PZ7) Hebe', '(2024 OY9) Fortuna',
    '(2023 NX2) Metis', '(2024 MW5) Egeria', '(2023 LV8) Thisbe',
    '(2024 KU1) Doris', '(2023 JT4) Parthenope', '(2024 IS7) Massalia',
    '(2023 HR3) Victoria', '(2024 GQ6) Laetitia', '(2023 FP9) Harmonia',
    '(2024 EO2) Daphne', '(2023 DN5) Amphitrite'
  ];

  for (let i = 0; i < 50; i++) {
    const angle1 = (i / 50) * Math.PI * 2 + Math.random() * 0.5;
    const angle2 = Math.random() * Math.PI - Math.PI / 2;
    const distance = 3 + Math.random() * 7;
    
    const diameter = 0.05 + Math.random() * 2.5;
    const velocity = 20000 + Math.random() * 80000;
    const missDistance = 1000000 + Math.random() * 50000000;
    const isHazardous = Math.random() > 0.85;
    
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));
    
    mockAsteroids.push({
      id: `mock-${i}`,
      name: names[i],
      diameter_km: diameter,
      velocity_kmh: velocity,
      miss_distance_km: missDistance,
      is_potentially_hazardous: isHazardous,
      close_approach_date: date.toISOString().split('T')[0],
      absolute_magnitude: 18 + Math.random() * 10,
      x: Math.sin(angle1) * Math.cos(angle2) * distance,
      y: Math.sin(angle2) * distance,
      z: Math.cos(angle1) * Math.cos(angle2) * distance,
    });
  }
  
  return mockAsteroids;
};

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
    console.error('Error fetching asteroids, using mock data:', error);
    // Return mock data when API fails (rate limit, network error, etc.)
    return generateMockAsteroids();
  }
};

export const calculateImpactEffects = (asteroid: Asteroid, targetLocation?: { lat: number; lng: number }) => {
  const energy = (0.5 * (asteroid.diameter_km ** 3) * (asteroid.velocity_kmh / 3600) ** 2) / 1000;
  const craterDiameter = asteroid.diameter_km * 20;
  const craterDepth = craterDiameter * 0.3;
  const fireballRadius = asteroid.diameter_km * 5;
  const shockwaveRadius = asteroid.diameter_km * 50;
  const windBlastRadius = asteroid.diameter_km * 40;
  const earthquakeRadius = asteroid.diameter_km * 100;
  
  // Calculate casualties based on radius and rough population density (if location provided)
  const populationDensity = 100; // people per km²
  const craterArea = Math.PI * (craterDiameter / 2) ** 2;
  const fireballArea = Math.PI * fireballRadius ** 2;
  const shockwaveArea = Math.PI * shockwaveRadius ** 2;
  const windBlastArea = Math.PI * windBlastRadius ** 2;
  
  const craterCasualties = Math.floor(craterArea * populationDensity);
  const fireballDeaths = Math.floor((fireballArea - craterArea) * populationDensity * 0.9);
  const fireball3rdBurns = Math.floor(fireballArea * populationDensity * 0.05);
  const fireball2ndBurns = Math.floor(fireballArea * populationDensity * 0.1);
  const shockwaveDeaths = Math.floor((shockwaveArea - fireballArea) * populationDensity * 0.3);
  const windBlastDeaths = Math.floor((windBlastArea - fireballArea) * populationDensity * 0.25);
  const earthquakeDeaths = Math.floor(earthquakeRadius * populationDensity * 0.01);
  
  const windSpeed = Math.min(asteroid.velocity_kmh * 0.1, 15000);
  const shockwaveDecibels = Math.min(200 + Math.log10(energy) * 10, 250);
  const earthquakeMagnitude = Math.min(5 + Math.log10(energy), 10);
  const impactSpeed = asteroid.velocity_kmh * 0.95;
  const averageYears = Math.max(Math.floor(energy * 15000), 1000);
  
  return {
    // Basic metrics
    energy_megatons: energy.toFixed(2),
    impact_speed_mph: (impactSpeed * 0.621371).toFixed(0),
    average_occurrence_years: averageYears.toLocaleString(),
    
    // Crater
    crater_diameter_km: craterDiameter.toFixed(2),
    crater_diameter_miles: (craterDiameter * 0.621371).toFixed(1),
    crater_depth_ft: (craterDepth * 3280.84).toFixed(0),
    crater_casualties: craterCasualties.toLocaleString(),
    
    // Fireball
    fireball_radius_km: fireballRadius.toFixed(2),
    fireball_radius_miles: (fireballRadius * 0.621371).toFixed(1),
    fireball_deaths: fireballDeaths.toLocaleString(),
    fireball_3rd_degree_burns: fireball3rdBurns.toLocaleString(),
    fireball_2nd_degree_burns: fireball2ndBurns.toLocaleString(),
    fireball_tree_ignition_miles: (fireballRadius * 0.8 * 0.621371).toFixed(0),
    
    // Shock wave
    shockwave_radius_km: shockwaveRadius.toFixed(2),
    shockwave_radius_miles: (shockwaveRadius * 0.621371).toFixed(1),
    shockwave_decibels: shockwaveDecibels.toFixed(0),
    shockwave_deaths: shockwaveDeaths.toLocaleString(),
    shockwave_lung_damage_miles: (shockwaveRadius * 0.3 * 0.621371).toFixed(0),
    shockwave_eardrum_rupture_miles: (shockwaveRadius * 0.4 * 0.621371).toFixed(0),
    shockwave_building_collapse_miles: (shockwaveRadius * 0.7 * 0.621371).toFixed(0),
    shockwave_home_collapse_miles: (shockwaveRadius * 0.9 * 0.621371).toFixed(0),
    
    // Wind blast
    wind_blast_radius_km: windBlastRadius.toFixed(2),
    wind_blast_radius_miles: (windBlastRadius * 0.621371).toFixed(1),
    wind_peak_speed_mph: (windSpeed * 0.621371).toFixed(0),
    wind_deaths: windBlastDeaths.toLocaleString(),
    wind_jupiter_storm_miles: (windBlastRadius * 0.2 * 0.621371).toFixed(0),
    wind_complete_level_miles: (windBlastRadius * 0.35 * 0.621371).toFixed(0),
    wind_ef5_tornado_miles: (windBlastRadius * 0.6 * 0.621371).toFixed(0),
    wind_trees_down_miles: (windBlastRadius * 0.621371).toFixed(0),
    
    // Earthquake
    earthquake_magnitude: earthquakeMagnitude.toFixed(1),
    earthquake_deaths: earthquakeDeaths.toLocaleString(),
    earthquake_felt_miles: (earthquakeRadius * 0.621371).toFixed(0),
    
    // Tsunami
    tsunami_height_m: asteroid.diameter_km > 0.5 ? (asteroid.diameter_km * 10).toFixed(1) : '0',
  };
};
