import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Line, OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Asteroid } from '@/services/asteroidApi';

type SizeCategory = 'giant' | 'large' | 'medium' | 'small';

const getSizeCategory = (diameterKm: number): SizeCategory => {
  if (diameterKm >= 1.5) return 'giant';
  if (diameterKm >= 0.9) return 'large';
  if (diameterKm >= 0.45) return 'medium';
  return 'small';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getVisualScale = (diameterKm: number) => {
  const normalized = Math.pow(clamp(diameterKm / 5, 0, 1), 0.7);
  return clamp(0.12 + normalized * 0.45, 0.12, 0.7);
};

const AU_TO_SCENE_UNITS = 3.2;

interface OrbitParameters {
  majorAxis: THREE.Vector3;
  minorAxis: THREE.Vector3;
  semiMajor: number;
  semiMinor: number;
  eccentricity: number;
  angle: number;
}

const generateOrbitParameters = (asteroid: Asteroid): OrbitParameters | null => {
  if (asteroid.orbit_p_vector && asteroid.orbit_q_vector && asteroid.semi_major_axis_au) {
    const majorAxis = new THREE.Vector3(...asteroid.orbit_p_vector).normalize();
    let minorAxis = new THREE.Vector3(...asteroid.orbit_q_vector).normalize();

    if (majorAxis.lengthSq() === 0) {
      return null;
    }

    const orthogonalComponent = minorAxis
      .clone()
      .sub(majorAxis.clone().multiplyScalar(minorAxis.dot(majorAxis)));
    if (orthogonalComponent.lengthSq() > 0) {
      minorAxis = orthogonalComponent.normalize();
    }

    const eccentricity = clamp(asteroid.orbital_eccentricity ?? 0.2, 0.02, 0.9);
    const semiMajor = clamp(asteroid.semi_major_axis_au * AU_TO_SCENE_UNITS, 0.6, 14);
    const semiMinor = semiMajor * Math.sqrt(Math.max(0.0001, 1 - eccentricity * eccentricity));
    const angle = asteroid.true_anomaly_rad ?? 0;

    return { majorAxis, minorAxis, semiMajor, semiMinor, eccentricity, angle };
  }

  const direction = new THREE.Vector3(asteroid.x, asteroid.y, asteroid.z);
  if (direction.lengthSq() === 0) return null;

  const majorAxis = direction.clone().normalize();
  const upReference = Math.abs(majorAxis.dot(new THREE.Vector3(0, 1, 0))) > 0.85
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);

  const planeNormal = new THREE.Vector3().crossVectors(majorAxis, upReference).normalize();
  if (planeNormal.lengthSq() === 0) {
    planeNormal.set(0, 1, 0);
  }

  let minorAxis = new THREE.Vector3().crossVectors(planeNormal, majorAxis).normalize();
  if (minorAxis.lengthSq() === 0) {
    minorAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), majorAxis).normalize();
  }

  const normalizedVelocity = clamp((asteroid.velocity_kmh - 20000) / 80000, 0, 1);
  const eccentricity = clamp(0.12 + normalizedVelocity * 0.55, 0.1, 0.7);
  const semiMajor = clamp(asteroid.miss_distance_km / 120000, 0.6, 12);
  const semiMinor = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);

  const baseSeed = Array.from(asteroid.id).reduce(
    (acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0,
    2166136261
  );
  const approachTime = new Date(asteroid.close_approach_date).getTime();
  const dateSeed = Number.isNaN(approachTime) ? 0 : Math.floor(approachTime / 86400000);
  const combinedSeed = (baseSeed ^ dateSeed) >>> 0;

  const inclinationFactor = clamp((asteroid.absolute_magnitude - 16) / 8, 0, 1);
  const inclinationAngle = inclinationFactor * (Math.PI / 5);
  const inclinationDirection = (combinedSeed & 1) === 0 ? 1 : -1;
  if (inclinationAngle !== 0) {
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
      majorAxis,
      inclinationAngle * inclinationDirection
    );
    minorAxis.applyQuaternion(tiltQuat);
    minorAxis.normalize();
  }

  const angle = ((combinedSeed % 360) / 360) * Math.PI * 2;

  return { majorAxis, minorAxis, semiMajor, semiMinor, eccentricity, angle };
};

const getOrbitPosition = (params: OrbitParameters, theta: number): THREE.Vector3 => {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const r =
    params.semiMajor * (1 - params.eccentricity * params.eccentricity) /
    (1 + params.eccentricity * cosTheta);

  return new THREE.Vector3()
    .addScaledVector(params.majorAxis, r * cosTheta)
    .addScaledVector(params.minorAxis, r * sinTheta);
};

interface AsteroidSceneProps {
  asteroids: Asteroid[];
  onAsteroidHover: (asteroid: Asteroid | null) => void;
  onAsteroidClick: (asteroid: Asteroid) => void;
}

const Earth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth_texture.jpg');

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={earthTexture}
        emissive="#1e3a8a"
        emissiveIntensity={0.1}
        roughness={0.8}
        metalness={0.05}
      />
    </Sphere>
  );
};

interface AsteroidMaterialTextures {
  color: THREE.Texture;
  bump: THREE.Texture;
  roughness: THREE.Texture;
}

const createAsteroidTextures = (asteroid: Asteroid): AsteroidMaterialTextures | null => {
  if (typeof document === 'undefined') return null;

  const size = 128;
  const colorCanvas = document.createElement('canvas');
  const heightCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  heightCanvas.width = heightCanvas.height = size;

  const colorCtx = colorCanvas.getContext('2d');
  const heightCtx = heightCanvas.getContext('2d');
  if (!colorCtx || !heightCtx) return null;

  const baseSeed = Array.from(asteroid.id).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  let seed = baseSeed;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const giantPalettes = [
    { hue: 12, hueVariance: 14, saturation: [60, 78], lightness: [50, 68] },
    { hue: 28, hueVariance: 10, saturation: [55, 75], lightness: [52, 70] },
  ];
  const largePalettes = [
    { hue: 200, hueVariance: 24, saturation: [48, 68], lightness: [54, 72] },
    { hue: 150, hueVariance: 18, saturation: [45, 65], lightness: [56, 74] },
  ];
  const mediumPalettes = [
    { hue: 60, hueVariance: 20, saturation: [40, 58], lightness: [58, 76] },
    { hue: 320, hueVariance: 16, saturation: [48, 66], lightness: [55, 72] },
  ];
  const smallPalettes = [
    { hue: 205, hueVariance: 26, saturation: [42, 60], lightness: [60, 78] },
    { hue: 90, hueVariance: 18, saturation: [38, 56], lightness: [62, 80] },
  ];

  const sizeCategory = getSizeCategory(asteroid.diameter_km);
  const paletteGroup =
    sizeCategory === 'giant'
      ? giantPalettes
      : sizeCategory === 'large'
      ? largePalettes
      : sizeCategory === 'medium'
      ? mediumPalettes
      : smallPalettes;
  const palette = paletteGroup[Math.floor(random() * paletteGroup.length)];
  const jitterHue = palette.hue + (random() - 0.5) * palette.hueVariance;
  const baseHue = (jitterHue + 360) % 360;
  const baseSaturation = palette.saturation[0] + random() * (palette.saturation[1] - palette.saturation[0]);
  const baseLightness = palette.lightness[0] + random() * (palette.lightness[1] - palette.lightness[0]);

  colorCtx.fillStyle = `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`;
  colorCtx.fillRect(0, 0, size, size);

  heightCtx.fillStyle = 'rgba(140, 140, 140, 1)';
  heightCtx.fillRect(0, 0, size, size);

  const highlightGradient = colorCtx.createRadialGradient(64, 56, 12, 64, 94, 88);
  highlightGradient.addColorStop(0, 'rgba(255,255,255,0.45)');
  highlightGradient.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  highlightGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
  colorCtx.globalCompositeOperation = 'overlay';
  colorCtx.fillStyle = highlightGradient;
  colorCtx.fillRect(0, 0, size, size);
  colorCtx.globalCompositeOperation = 'source-over';

  const craterCount = 12 + Math.floor(random() * 16);
  for (let i = 0; i < craterCount; i++) {
    const radius = 5 + random() * 20;
    const x = random() * size;
    const y = random() * size;
    const depth = 0.2 + random() * 0.45;

    const craterGradient = colorCtx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
    craterGradient.addColorStop(0, `rgba(0, 0, 0, ${0.35 + depth * 0.6})`);
    craterGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    colorCtx.fillStyle = craterGradient;
    colorCtx.beginPath();
    colorCtx.arc(x, y, radius, 0, Math.PI * 2);
    colorCtx.fill();

    const rimHighlight = colorCtx.createRadialGradient(x - radius * 0.18, y - radius * 0.18, radius * 0.08, x, y, radius * 0.55);
    rimHighlight.addColorStop(0, `rgba(255,255,255,${0.15 + depth * 0.3})`);
    rimHighlight.addColorStop(1, 'rgba(255,255,255,0)');
    colorCtx.fillStyle = rimHighlight;
    colorCtx.beginPath();
    colorCtx.arc(x, y, radius, 0, Math.PI * 2);
    colorCtx.fill();

    const heightGradient = heightCtx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    heightGradient.addColorStop(0, `rgba(80, 80, 80, ${0.95})`);
    heightGradient.addColorStop(1, 'rgba(160, 160, 160, 0.8)');
    heightCtx.fillStyle = heightGradient;
    heightCtx.beginPath();
    heightCtx.arc(x, y, radius, 0, Math.PI * 2);
    heightCtx.fill();
  }

  const speckleCount = 90 + Math.floor(random() * 90);
  for (let i = 0; i < speckleCount; i++) {
    const speckleX = random() * size;
    const speckleY = random() * size;
    const speckleRadius = 1 + random() * 2.5;
    const tintShift = (random() - 0.5) * 12;

    colorCtx.fillStyle = `hsla(${(baseHue + tintShift + 360) % 360}, ${Math.min(
      85,
      baseSaturation + 10
    )}%, ${Math.min(90, baseLightness + 18)}%, ${0.25 + random() * 0.3})`;
    colorCtx.beginPath();
    colorCtx.arc(speckleX, speckleY, speckleRadius, 0, Math.PI * 2);
    colorCtx.fill();

    heightCtx.fillStyle = `rgba(120, 120, 120, ${0.2 + random() * 0.4})`;
    heightCtx.beginPath();
    heightCtx.arc(speckleX, speckleY, speckleRadius, 0, Math.PI * 2);
    heightCtx.fill();
  }

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.anisotropy = 8;
  colorTexture.needsUpdate = true;

  const bumpTexture = new THREE.CanvasTexture(heightCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.anisotropy = 4;
  bumpTexture.needsUpdate = true;

  const roughnessTexture = new THREE.CanvasTexture(heightCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.anisotropy = 4;
  roughnessTexture.needsUpdate = true;

  return {
    color: colorTexture,
    bump: bumpTexture,
    roughness: roughnessTexture,
  };
};

const AsteroidMesh = ({ 
  asteroid, 
  onHover, 
  onClick 
}: { 
  asteroid: Asteroid; 
  onHover: (asteroid: Asteroid | null) => void;
  onClick: (asteroid: Asteroid) => void;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const textures = useMemo(() => createAsteroidTextures(asteroid), [asteroid]);

  useEffect(() => {
    return () => {
      textures?.color.dispose();
      textures?.bump.dispose();
      textures?.roughness.dispose();
    };
  }, [textures]);

  const size = useMemo(() => getVisualScale(asteroid.diameter_km), [asteroid.diameter_km]);
  const surfaceColors: Record<SizeCategory, string> = {
    giant: '#f97316',
    large: '#38bdf8',
    medium: '#a855f7',
    small: '#facc15',
  };

  const emissiveColors: Record<SizeCategory, string> = {
    giant: '#ffba6b',
    large: '#93c5fd',
    medium: '#d8b4fe',
    small: '#fde68a',
  };

  const sizeCategory = useMemo(() => getSizeCategory(asteroid.diameter_km), [asteroid.diameter_km]);
  const color = surfaceColors[sizeCategory];
  const emissive = emissiveColors[sizeCategory];

  const orbitParams = useMemo(() => generateOrbitParameters(asteroid), [asteroid]);

  const position = useMemo<[number, number, number]>(() => {
    if (!orbitParams) {
      return [asteroid.x, asteroid.y, asteroid.z];
    }
    const worldPos = getOrbitPosition(orbitParams, orbitParams.angle);
    return [worldPos.x, worldPos.y, worldPos.z];
  }, [asteroid, orbitParams]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Sphere
      ref={meshRef}
      args={[size, 48, 48]}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(asteroid);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
        document.body.style.cursor = 'default';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(asteroid);
      }}
    >
      <meshStandardMaterial
        color={color}
        map={textures?.color ?? undefined}
        roughnessMap={textures?.roughness ?? undefined}
        bumpMap={textures?.bump ?? undefined}
        bumpScale={0.08}
        emissive={emissive}
        emissiveIntensity={hovered ? 1.1 : 0.55}
        roughness={0.8}
        metalness={0.08}
      />
    </Sphere>
  );
};

const AsteroidOrbit = ({ asteroid, isHovered }: { asteroid: Asteroid; isHovered: boolean }) => {
  const orbitParams = useMemo(() => generateOrbitParameters(asteroid), [asteroid]);

  const points = useMemo(() => {
    if (!orbitParams) return [];
    const segments = 160;
    return Array.from({ length: segments + 1 }, (_, i) => {
      const theta = (i / segments) * Math.PI * 2;
      return getOrbitPosition(orbitParams, theta);
    });
  }, [orbitParams]);

  if (points.length === 0) return null;

  const sizeCategory = getSizeCategory(asteroid.diameter_km);

  const hoverColors: Record<SizeCategory, string> = {
    giant: '#fdba74',
    large: '#7dd3fc',
    medium: '#c084fc',
    small: '#fde68a',
  };

  const baseColor = '#6b7280';
  const color = isHovered ? hoverColors[sizeCategory] : baseColor;
  const opacity = isHovered ? 0.75 : 0.35;
  const dashSize = isHovered ? 0.42 : 0.22;
  const gapSize = isHovered ? 0.05 : 0.12;

  return (
    <Line
      points={points}
      color={color}
      transparent
      opacity={opacity}
      dashed
      dashSize={dashSize}
      gapSize={gapSize}
    />
  );
};

export const AsteroidScene = ({ asteroids, onAsteroidHover, onAsteroidClick }: AsteroidSceneProps) => {
  const [hoveredAsteroidId, setHoveredAsteroidId] = useState<string | null>(null);

  const handleHover = useCallback(
    (asteroid: Asteroid | null) => {
      setHoveredAsteroidId(asteroid?.id ?? null);
      onAsteroidHover(asteroid);
    },
    [onAsteroidHover]
  );

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={['#0a0a1a']} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d9ff" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Earth />
        
        {asteroids.map((asteroid) => (
          <AsteroidOrbit
            key={`${asteroid.id}-orbit`}
            asteroid={asteroid}
            isHovered={hoveredAsteroidId === asteroid.id}
          />
        ))}

        {asteroids.map((asteroid) => (
          <AsteroidMesh
            key={asteroid.id}
            asteroid={asteroid}
            onHover={handleHover}
            onClick={onAsteroidClick}
          />
        ))}
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={80}
          zoomSpeed={1.2}
          panSpeed={0.6}
          rotateSpeed={0.9}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};
