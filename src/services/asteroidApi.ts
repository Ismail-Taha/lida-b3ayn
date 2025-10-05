export interface Asteroid {
  id: string;
  name: string;
  diameter_km: number;
  velocity_kmh: number;
  velocity_kms?: number;
  miss_distance_km: number;
  close_approach_date: string;
  absolute_magnitude: number;
  x: number;
  y: number;
  z: number;
  orbital_inclination_deg?: number;
  orbital_eccentricity?: number;
  semi_major_axis_au?: number;
  orbit_p_vector?: [number, number, number];
  orbit_q_vector?: [number, number, number];
  true_anomaly_rad?: number;
  impact_angle_deg?: number;
  impact_azimuth_deg?: number;
}

interface NeoDiameter {
  estimated_diameter_min: number;
  estimated_diameter_max: number;
}

interface NeoApproachData {
  close_approach_date: string;
  miss_distance: { kilometers: string };
  relative_velocity: { kilometers_per_hour: string };
}

interface NeoObject {
  id: string;
  name: string;
  absolute_magnitude_h: number;
  estimated_diameter: { kilometers: NeoDiameter };
  close_approach_data: NeoApproachData[];
}

interface NeoFeedResponse {
  near_earth_objects: Record<string, NeoObject[]>;
}

interface NeoOrbitalData {
  eccentricity: string;
  inclination: string;
  ascending_node_longitude: string;
  perihelion_argument: string;
  mean_anomaly: string;
  semi_major_axis: string;
}

interface NeoDetailResponse {
  orbital_data?: NeoOrbitalData;
}

const populationDensityMapUrl = new URL('../../population_density_map.png', import.meta.url).href;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type SimpleVector = { x: number; y: number; z: number };

const normalizeVector = (vector: SimpleVector): SimpleVector => {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
};

const POPULATION_MAP_BOUNDS = { minX: 1, minY: 32, maxX: 1671, maxY: 1166 };
let populationMapContext: CanvasRenderingContext2D | null = null;
let populationMapWidth = 0;
let populationMapHeight = 0;
let populationMapPromise: Promise<void> | null = null;
const populationDensityCache = new Map<string, number>();

const initPopulationDensityMap = (): Promise<void> => {
  if (populationMapPromise) {
    return populationMapPromise;
  }

  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  populationMapPromise = new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = populationDensityMapUrl;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve();
        return;
      }
      ctx.drawImage(image, 0, 0);
      populationMapContext = ctx;
      populationMapWidth = image.width;
      populationMapHeight = image.height;
      resolve();
    };

    image.onerror = (error) => {
      console.error('Failed to load population density map', error);
      resolve();
    };
  });

  return populationMapPromise;
};

if (typeof window !== 'undefined') {
  void initPopulationDensityMap();
}

const samplePopulationDensityFromMap = (lat: number, lng: number): number | null => {
  if (!populationMapContext) {
    return null;
  }

  const key = `${lat.toFixed(3)}|${lng.toFixed(3)}`;
  if (populationDensityCache.has(key)) {
    return populationDensityCache.get(key) ?? null;
  }

  const { minX, minY, maxX, maxY } = POPULATION_MAP_BOUNDS;
  const width = maxX - minX;
  const height = maxY - minY;

  const x = minX + ((lng + 180) / 360) * width;
  const y = minY + ((90 - lat) / 180) * height;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    populationDensityCache.set(key, 0);
    return null;
  }

  const px = Math.round(x);
  const py = Math.round(y);

  if (px < 0 || py < 0 || px >= populationMapWidth || py >= populationMapHeight) {
    populationDensityCache.set(key, 0);
    return null;
  }

  const pixel = populationMapContext.getImageData(px, py, 1, 1).data;
  const [r, g, b] = pixel;

  const isBackground = r > 250 && g > 250 && b > 250;
  if (isBackground) {
    populationDensityCache.set(key, 0);
    return 0;
  }

  const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
  const normalized = Math.min(1, Math.max(0, (255 - grayscale) / 255));
  const density = Math.round(normalized * 30000);

  populationDensityCache.set(key, density);
  return density;
};

const solveKeplerEquation = (meanAnomalyRad: number, eccentricity: number): number => {
  let E = eccentricity < 0.8 ? meanAnomalyRad : Math.PI;
  for (let i = 0; i < 12; i++) {
    const f = E - eccentricity * Math.sin(E) - meanAnomalyRad;
    const fPrime = 1 - eccentricity * Math.cos(E);
    E -= f / fPrime;
  }
  return E;
};

interface OrbitalGeometry {
  p: [number, number, number];
  q: [number, number, number];
  eccentricity: number;
  inclinationDeg: number;
  semiMajorAu: number;
  trueAnomalyRad: number;
  impactAngleDeg: number;
  impactAzimuthDeg: number;
}

const computeOrbitalGeometry = (
  orbitalData: NeoOrbitalData | undefined,
  relativeVelocityKms: number | undefined
): OrbitalGeometry | null => {
  if (!orbitalData) return null;

  const eccentricity = parseFloat(orbitalData.eccentricity);
  const inclinationDeg = parseFloat(orbitalData.inclination);
  const ascendingNodeDeg = parseFloat(orbitalData.ascending_node_longitude);
  const perihelionArgDeg = parseFloat(orbitalData.perihelion_argument);
  const meanAnomalyDeg = parseFloat(orbitalData.mean_anomaly);
  const semiMajorAu = parseFloat(orbitalData.semi_major_axis);

  if ([eccentricity, inclinationDeg, ascendingNodeDeg, perihelionArgDeg, meanAnomalyDeg, semiMajorAu].some((value) => !Number.isFinite(value))) {
    return null;
  }

  const inclinationRad = inclinationDeg * DEG2RAD;
  const ascendingNodeRad = ascendingNodeDeg * DEG2RAD;
  const perihelionArgRad = perihelionArgDeg * DEG2RAD;
  const meanAnomalyRad = meanAnomalyDeg * DEG2RAD;

  const eccentricAnomaly = solveKeplerEquation(meanAnomalyRad, eccentricity);
  const trueAnomalyRad = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );

  const cosO = Math.cos(ascendingNodeRad);
  const sinO = Math.sin(ascendingNodeRad);
  const cosI = Math.cos(inclinationRad);
  const sinI = Math.sin(inclinationRad);
  const cosW = Math.cos(perihelionArgRad);
  const sinW = Math.sin(perihelionArgRad);

  const pVector: SimpleVector = {
    x: cosO * cosW - sinO * sinW * cosI,
    y: sinO * cosW + cosO * sinW * cosI,
    z: sinW * sinI,
  };

  const qVector: SimpleVector = {
    x: -cosO * sinW - sinO * cosW * cosI,
    y: -sinO * sinW + cosO * cosW * cosI,
    z: cosW * sinI,
  };

  const sqrtOneMinusESq = Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity));
  const sinE = Math.sin(eccentricAnomaly);
  const cosE = Math.cos(eccentricAnomaly);

  const velocityVector = normalizeVector({
    x: -sinE * pVector.x + sqrtOneMinusESq * cosE * qVector.x,
    y: -sinE * pVector.y + sqrtOneMinusESq * cosE * qVector.y,
    z: -sinE * pVector.z + sqrtOneMinusESq * cosE * qVector.z,
  });

  if (velocityVector.x === 0 && velocityVector.y === 0 && velocityVector.z === 0) {
    return null;
  }

  const horizontalMagnitude = Math.hypot(velocityVector.x, velocityVector.y);
  const verticalMagnitude = Math.abs(velocityVector.z);

  const relativeVelocity = relativeVelocityKms && Number.isFinite(relativeVelocityKms) ? relativeVelocityKms : null;

  let impactAngleRad: number;
  if (relativeVelocity) {
    const horizontalSpeed = horizontalMagnitude * relativeVelocity;
    const verticalSpeed = verticalMagnitude * relativeVelocity;
    impactAngleRad = Math.atan2(verticalSpeed, Math.max(1e-6, horizontalSpeed));
  } else {
    impactAngleRad = Math.atan2(verticalMagnitude, Math.max(1e-6, horizontalMagnitude));
  }

  let impactAngleDeg = impactAngleRad * RAD2DEG;
  if (!Number.isFinite(impactAngleDeg)) {
    impactAngleDeg = 45;
  }
  impactAngleDeg = clamp(impactAngleDeg, 5, 90);

  const impactAzimuthDeg = (Math.atan2(velocityVector.x, velocityVector.y) * RAD2DEG + 360) % 360;

  return {
    p: [pVector.x, pVector.y, pVector.z],
    q: [qVector.x, qVector.y, qVector.z],
    eccentricity,
    inclinationDeg,
    semiMajorAu,
    trueAnomalyRad,
    impactAngleDeg,
    impactAzimuthDeg,
  };
};

export interface ImpactEffects {
  energy_megatons: string;
  impact_speed_mph: string;
  average_occurrence_years: string;
  local_population_density_per_km2: string;
  estimated_population_exposed: string;
  crater_diameter_km: string;
  crater_diameter_miles: string;
  crater_depth_ft: string;
  crater_casualties: string;
  fireball_radius_km: string;
  fireball_radius_miles: string;
  fireball_deaths: string;
  fireball_3rd_degree_burns: string;
  fireball_2nd_degree_burns: string;
  fireball_tree_ignition_miles: string;
  shockwave_radius_km: string;
  shockwave_radius_miles: string;
  shockwave_decibels: string;
  shockwave_deaths: string;
  shockwave_lung_damage_miles: string;
  shockwave_eardrum_rupture_miles: string;
  shockwave_building_collapse_miles: string;
  shockwave_home_collapse_miles: string;
  wind_blast_radius_km: string;
  wind_blast_radius_miles: string;
  wind_peak_speed_mph: string;
  wind_deaths: string;
  wind_jupiter_storm_miles: string;
  wind_complete_level_miles: string;
  wind_ef5_tornado_miles: string;
  wind_trees_down_miles: string;
  earthquake_magnitude: string;
  earthquake_deaths: string;
  earthquake_felt_miles: string;
  tsunami_height_m: string;
}

const NASA_API_KEY = 'poLEkSXMTfqHSgUCvk82Rm7XWmpWgHNru7jg9PRx'; // Get your own free key at https://api.nasa.gov

const EARTH_RADIUS_KM = 6371;

const populationCenters = [
  { lat: 28.6139, lng: 77.209, density: 14000, sigmaKm: 230 }, // Delhi
  { lat: 19.076, lng: 72.8777, density: 15000, sigmaKm: 180 }, // Mumbai
  { lat: 40.7128, lng: -74.006, density: 11500, sigmaKm: 160 }, // New York City
  { lat: 34.0522, lng: -118.2437, density: 6500, sigmaKm: 150 }, // Los Angeles
  { lat: 51.5074, lng: -0.1278, density: 10200, sigmaKm: 180 }, // London
  { lat: 39.9042, lng: 116.4074, density: 13500, sigmaKm: 220 }, // Beijing
  { lat: 35.6762, lng: 139.6503, density: 14800, sigmaKm: 170 }, // Tokyo
  { lat: -23.5505, lng: -46.6333, density: 9300, sigmaKm: 210 }, // São Paulo
  { lat: -1.2864, lng: 36.8172, density: 7200, sigmaKm: 190 }, // Nairobi
  { lat: 6.5244, lng: 3.3792, density: 13800, sigmaKm: 210 }, // Lagos
  { lat: -6.2088, lng: 106.8456, density: 12500, sigmaKm: 200 }, // Jakarta
  { lat: 30.0444, lng: 31.2357, density: 9800, sigmaKm: 170 }, // Cairo
  { lat: 55.7558, lng: 37.6173, density: 7800, sigmaKm: 200 }, // Moscow
  { lat: 19.4326, lng: -99.1332, density: 11800, sigmaKm: 190 }, // Mexico City
  { lat: -34.6037, lng: -58.3816, density: 8700, sigmaKm: 180 }, // Buenos Aires
  { lat: 37.5665, lng: 126.978, density: 14200, sigmaKm: 150 }, // Seoul
  { lat: 41.0082, lng: 28.9784, density: 9700, sigmaKm: 170 }, // Istanbul
  { lat: 14.5995, lng: 120.9842, density: 12100, sigmaKm: 180 }, // Manila
];

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const estimatePopulationDensityFallback = (lat: number, lng: number): number => {
  const baseDensity = 25;
  const latWeight = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(lat) / 72, 1.6)), 1.2);
  let density = 0;
  let minDistance = Infinity;

  for (const center of populationCenters) {
    const distanceKm = haversineDistanceKm(lat, lng, center.lat, center.lng);
    if (distanceKm < minDistance) {
      minDistance = distanceKm;
    }
    const spread = center.sigmaKm;
    const contribution = center.density * Math.exp(-Math.pow(distanceKm, 2) / (2 * spread * spread));
    density += contribution;
  }

  const continentalBias = latWeight * 220;
  if (minDistance < 600) {
    density += baseDensity + continentalBias;
  } else if (minDistance < 1200) {
    density += (baseDensity + continentalBias) * 0.4;
  }

  return Math.min(Math.max(density, 0), 30000);
};

export const estimatePopulationDensity = (lat?: number, lng?: number): number => {
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
    return 120;
  }

  if (typeof document !== 'undefined') {
    void initPopulationDensityMap();
  }

  const rasterDensity = samplePopulationDensityFromMap(lat, lng);
  if (rasterDensity !== null) {
    return rasterDensity;
  }

  return estimatePopulationDensityFallback(lat, lng);
};

const formatInteger = (value: number) => Math.max(0, Math.round(value)).toLocaleString();

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

    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));

    mockAsteroids.push({
      id: `mock-${i}`,
      name: names[i],
      diameter_km: diameter,
      velocity_kmh: velocity,
      velocity_kms: velocity / 3600,
      miss_distance_km: missDistance,
      close_approach_date: date.toISOString().split('T')[0],
      absolute_magnitude: 18 + Math.random() * 10,
      x: Math.sin(angle1) * Math.cos(angle2) * distance,
      y: Math.sin(angle2) * distance,
      z: Math.cos(angle1) * Math.cos(angle2) * distance,
      impact_angle_deg: 45,
      impact_azimuth_deg: (i * 30) % 360,
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

    const data = (await response.json()) as NeoFeedResponse;
    const asteroids: Asteroid[] = [];

    Object.keys(data.near_earth_objects).forEach((date) => {
      data.near_earth_objects[date].forEach((neo) => {
        const closeApproach = neo.close_approach_data[0];
        if (!closeApproach) {
          return;
        }
        const diameter = neo.estimated_diameter.kilometers;
        const relativeVelocityKmh = parseFloat(closeApproach.relative_velocity.kilometers_per_hour);
        const relativeVelocityKms = parseFloat(closeApproach.relative_velocity.kilometers_per_second ?? '0');

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
          velocity_kmh: relativeVelocityKmh,
          velocity_kms: Number.isFinite(relativeVelocityKms) ? relativeVelocityKms : undefined,
          miss_distance_km: distance,
          close_approach_date: closeApproach.close_approach_date,
          absolute_magnitude: neo.absolute_magnitude_h,
          x: Math.sin(angle1) * Math.cos(angle2) * scaledDistance,
          y: Math.sin(angle2) * scaledDistance,
          z: Math.cos(angle1) * Math.cos(angle2) * scaledDistance,
        });
      });
    });

    const detailFetchCount = Math.min(asteroids.length, 40);
    const detailPromises = asteroids.slice(0, detailFetchCount).map(async (asteroid) => {
      try {
        const detailResponse = await fetch(
          `https://api.nasa.gov/neo/rest/v1/neo/${asteroid.id}?api_key=${NASA_API_KEY}`
        );

        if (!detailResponse.ok) {
          throw new Error('Failed to fetch orbital data');
        }

        const detail = (await detailResponse.json()) as NeoDetailResponse;
        const geometry = computeOrbitalGeometry(detail.orbital_data, asteroid.velocity_kms);

        if (geometry) {
          asteroid.orbital_inclination_deg = geometry.inclinationDeg;
          asteroid.orbital_eccentricity = geometry.eccentricity;
          asteroid.semi_major_axis_au = geometry.semiMajorAu;
          asteroid.orbit_p_vector = geometry.p;
          asteroid.orbit_q_vector = geometry.q;
          asteroid.true_anomaly_rad = geometry.trueAnomalyRad;
          asteroid.impact_angle_deg = geometry.impactAngleDeg;
          asteroid.impact_azimuth_deg = geometry.impactAzimuthDeg;
        }
      } catch (detailError) {
        console.error(`Failed to enrich asteroid ${asteroid.id} with orbital data`, detailError);
      }
    });

    await Promise.all(detailPromises);

    asteroids.forEach((asteroid) => {
      if (asteroid.impact_angle_deg === undefined) {
        asteroid.impact_angle_deg = 45;
      }
      if (asteroid.impact_azimuth_deg === undefined) {
        asteroid.impact_azimuth_deg = 0;
      }
    });

    return asteroids.slice(0, 100); // Limit to 100 asteroids for performance
  } catch (error) {
    console.error('Error fetching asteroids, using mock data:', error);
    // Return mock data when API fails (rate limit, network error, etc.)
    return generateMockAsteroids();
  }
};

export const calculateImpactEffects = (
  asteroid: Asteroid,
  targetLocation?: { lat: number; lng: number }
): ImpactEffects => {
  const energy = (0.5 * (asteroid.diameter_km ** 3) * (asteroid.velocity_kmh / 3600) ** 2) / 1000;
  const craterDiameter = asteroid.diameter_km * 20;
  const craterDepth = craterDiameter * 0.3;
  const fireballRadius = asteroid.diameter_km * 5;
  const shockwaveRadius = asteroid.diameter_km * 50;
  const windBlastRadius = asteroid.diameter_km * 40;
  const earthquakeRadius = asteroid.diameter_km * 100;

  const localPopulationDensity = estimatePopulationDensity(targetLocation?.lat, targetLocation?.lng);
  const populationDensity = Number.isFinite(localPopulationDensity) ? localPopulationDensity : 120;

  const craterArea = Math.PI * (craterDiameter / 2) ** 2;
  const fireballArea = Math.PI * fireballRadius ** 2;
  const shockwaveArea = Math.PI * shockwaveRadius ** 2;
  const windBlastArea = Math.PI * windBlastRadius ** 2;

  const craterCasualties = craterArea * populationDensity * 0.95;
  const fireballDeaths = Math.max(0, (fireballArea - craterArea) * populationDensity * 0.85);
  const fireball3rdBurns = fireballArea * populationDensity * 0.06;
  const fireball2ndBurns = fireballArea * populationDensity * 0.12;
  const shockwaveDeaths = Math.max(0, (shockwaveArea - fireballArea) * populationDensity * 0.28);
  const windBlastDeaths = Math.max(0, (windBlastArea - fireballArea) * populationDensity * 0.18);
  const earthquakeDeaths = earthquakeRadius * populationDensity * 0.015;

  const exposedPopulation = shockwaveArea * populationDensity;

  const windSpeed = Math.min(asteroid.velocity_kmh * 0.1, 15000);
  const shockwaveDecibels = Math.min(200 + Math.log10(Math.max(1, energy)) * 10, 250);
  const earthquakeMagnitude = Math.min(5 + Math.log10(Math.max(1, energy)), 10);
  const impactSpeed = asteroid.velocity_kmh * 0.95;
  const averageYears = Math.max(Math.floor(energy * 15000), 1000);

  return {
    energy_megatons: energy.toFixed(2),
    impact_speed_mph: (impactSpeed * 0.621371).toFixed(0),
    average_occurrence_years: averageYears.toLocaleString(),
    local_population_density_per_km2: populationDensity.toFixed(0),
    estimated_population_exposed: formatInteger(exposedPopulation),

    crater_diameter_km: craterDiameter.toFixed(2),
    crater_diameter_miles: (craterDiameter * 0.621371).toFixed(1),
    crater_depth_ft: (craterDepth * 3280.84).toFixed(0),
    crater_casualties: formatInteger(craterCasualties),

    fireball_radius_km: fireballRadius.toFixed(2),
    fireball_radius_miles: (fireballRadius * 0.621371).toFixed(1),
    fireball_deaths: formatInteger(fireballDeaths),
    fireball_3rd_degree_burns: formatInteger(fireball3rdBurns),
    fireball_2nd_degree_burns: formatInteger(fireball2ndBurns),
    fireball_tree_ignition_miles: (fireballRadius * 0.8 * 0.621371).toFixed(0),

    shockwave_radius_km: shockwaveRadius.toFixed(2),
    shockwave_radius_miles: (shockwaveRadius * 0.621371).toFixed(1),
    shockwave_decibels: shockwaveDecibels.toFixed(0),
    shockwave_deaths: formatInteger(shockwaveDeaths),
    shockwave_lung_damage_miles: (shockwaveRadius * 0.3 * 0.621371).toFixed(0),
    shockwave_eardrum_rupture_miles: (shockwaveRadius * 0.4 * 0.621371).toFixed(0),
    shockwave_building_collapse_miles: (shockwaveRadius * 0.7 * 0.621371).toFixed(0),
    shockwave_home_collapse_miles: (shockwaveRadius * 0.9 * 0.621371).toFixed(0),

    wind_blast_radius_km: windBlastRadius.toFixed(2),
    wind_blast_radius_miles: (windBlastRadius * 0.621371).toFixed(1),
    wind_peak_speed_mph: (windSpeed * 0.621371).toFixed(0),
    wind_deaths: formatInteger(windBlastDeaths),
    wind_jupiter_storm_miles: (windBlastRadius * 0.2 * 0.621371).toFixed(0),
    wind_complete_level_miles: (windBlastRadius * 0.35 * 0.621371).toFixed(0),
    wind_ef5_tornado_miles: (windBlastRadius * 0.6 * 0.621371).toFixed(0),
    wind_trees_down_miles: (windBlastRadius * 0.621371).toFixed(0),

    earthquake_magnitude: earthquakeMagnitude.toFixed(1),
    earthquake_deaths: formatInteger(earthquakeDeaths),
    earthquake_felt_miles: (earthquakeRadius * 0.621371).toFixed(0),

    tsunami_height_m: asteroid.diameter_km > 0.5 ? (asteroid.diameter_km * 10).toFixed(1) : '0',
  };
};
