"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export function RoamingArtist({ 
  artistId, 
  name, 
  specialty, 
  homeStudio, 
  initialPosition, 
  color, 
  onArtistClick 
}: { 
  artistId: string; 
  name: string; 
  specialty: string; 
  homeStudio?: string; 
  initialPosition: [number, number, number]; 
  color: string;
  onArtistClick: (artist: any) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [position] = useState<THREE.Vector3>(new THREE.Vector3(...initialPosition));
  const [velocity] = useState<THREE.Vector3>(new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    0,
    (Math.random() - 0.5) * 2
  ));
  const [isHovered, setIsHovered] = useState(false);
  const [lastDirection, setLastDirection] = useState<THREE.Vector3>(new THREE.Vector3(1, 0, 0));

  // Enhanced roaming behavior with physics
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth movement with physics-like behavior
    const speed = homeStudio ? 0.3 : 0.5; // Studio artists move a bit slower
    const maxSpeed = speed;
    const acceleration = 0.02;
    
    // Add some randomness to movement every few seconds
    if (Math.random() < 0.005) {
      velocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * acceleration,
        0,
        (Math.random() - 0.5) * acceleration
      ));
    }

    // City boundary collision (enhanced for larger city)
    const cityRadius = homeStudio ? 15 : 90; // Studio artists stay near their studios
    const homePos = homeStudio ? getStudioPosition(homeStudio) : new THREE.Vector3(0, 0, 0);
    const distanceFromHome = position.distanceTo(homePos);
    
    if (distanceFromHome > cityRadius) {
      // Bounce back towards home/center
      const directionToHome = homePos.clone().sub(position).normalize();
      velocity.add(directionToHome.multiplyScalar(acceleration * 2));
    }

    // Limit velocity
    if (velocity.length() > maxSpeed) {
      velocity.normalize().multiplyScalar(maxSpeed);
    }

    // Apply velocity to position
    position.add(velocity.clone().multiplyScalar(delta * 60));
    
    // Update group position
    groupRef.current.position.copy(position);
    
    // Track movement direction for rotation
    if (velocity.length() > 0.01) {
      setLastDirection(velocity.clone().normalize());
    }
    
    // Rotate artist to face movement direction
    if (lastDirection && groupRef.current) {
      const targetRotation = Math.atan2(lastDirection.x, lastDirection.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        0.1
      );
    }

    // Floating animation
    if (meshRef.current) {
      meshRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2 + parseInt(artistId, 36)) * 0.2;
    }
  });

  // Get studio position for studio artists
  const getStudioPosition = (studioName: string): THREE.Vector3 => {
    const studioPositions: { [key: string]: THREE.Vector3 } = {
      "Leonardo Studio": new THREE.Vector3(-40, 0, -30),
      "Raphael Studio": new THREE.Vector3(45, 0, -25),
      "Michelangelo Studio": new THREE.Vector3(0, 0, 50),
      "Caravaggio Studio": new THREE.Vector3(-35, 0, 35),
      "Da Vinci Studio": new THREE.Vector3(40, 0, 30),
      "Picasso Studio": new THREE.Vector3(-60, 0, 0),
      "Monet Studio": new THREE.Vector3(25, 0, -45),
      "Van Gogh Studio": new THREE.Vector3(-25, 0, -40)
    };
    return studioPositions[studioName] || new THREE.Vector3(0, 0, 0);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    console.log('🎨 Artist clicked:', { id: artistId, name, specialty, homeStudio, position: position.toArray() });
    
    const artist = {
      id: artistId,
      name,
      specialty,
      homeStudio,
      color,
      type: homeStudio ? "Studio Artist" : "Independent Artist",
      isActive: false,
      isAIAgent: false,
      position: position.toArray()
    };
    
    onArtistClick(artist);
  };

  const handlePointerOver = () => setIsHovered(true);
  const handlePointerOut = () => setIsHovered(false);

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* Artist Figure */}
      <mesh 
        ref={meshRef}
        position={[0, 1.5, 0]} 
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow 
        receiveShadow
      >
        <cylinderGeometry args={[0.3, 0.5, 1.5]} />
        <meshPhysicalMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Artist Head */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Floating Art Symbol */}
      <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
        <mesh position={[0, 4, 0]}>
          <ringGeometry args={[0.3, 0.5, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </Float>

      {/* Trail Effect */}
      <Sparkles
        count={20}
        scale={[2, 3, 2]}
        size={1}
        speed={0.5}
        color={color}
        position={[0, 1, -1]}
      />

      {/* Information Panel when hovered */}
      {isHovered && (
        <Html position={[0, 5, 0]}>
          <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-lg px-3 py-2 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25 animate-in fade-in duration-200 pointer-events-none">
            <div className="text-sm font-bold text-white">{name}</div>
            <div className="text-xs opacity-80">{specialty}</div>
            {homeStudio && (
              <div className="text-xs text-green-400">📍 {homeStudio}</div>
            )}
            <div className="text-xs text-yellow-400 mt-1">🖱️ Click to Chat</div>
          </div>
        </Html>
      )}

      {/* Studio Artist Indicator */}
      {homeStudio && (
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.1]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
} 