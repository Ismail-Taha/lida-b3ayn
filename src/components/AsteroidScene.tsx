import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Asteroid } from '@/services/asteroidApi';

interface AsteroidSceneProps {
  asteroids: Asteroid[];
  onAsteroidHover: (asteroid: Asteroid | null) => void;
  onAsteroidClick: (asteroid: Asteroid) => void;
}

const Earth = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#1e40af"
        emissive="#1e3a8a"
        emissiveIntensity={0.2}
        roughness={0.7}
        metalness={0.1}
      />
    </Sphere>
  );
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

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  const size = Math.max(0.05, Math.min(asteroid.diameter_km / 10, 0.3));
  const color = asteroid.is_potentially_hazardous ? '#ff0000' : '#808080';
  const emissive = asteroid.is_potentially_hazardous ? '#ff6666' : '#404040';

  return (
    <Sphere
      ref={meshRef}
      args={[size, 16, 16]}
      position={[asteroid.x, asteroid.y, asteroid.z]}
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
        emissive={emissive}
        emissiveIntensity={hovered ? 1 : 0.5}
        roughness={0.9}
        metalness={0.1}
      />
    </Sphere>
  );
};

export const AsteroidScene = ({ asteroids, onAsteroidHover, onAsteroidClick }: AsteroidSceneProps) => {
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
          <AsteroidMesh
            key={asteroid.id}
            asteroid={asteroid}
            onHover={onAsteroidHover}
            onClick={onAsteroidClick}
          />
        ))}
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={30}
        />
      </Canvas>
    </div>
  );
};
