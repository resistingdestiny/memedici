"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, RoundedBox, Sphere, MeshTransmissionMaterial } from "@react-three/drei";
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
  const headRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const faceScreenRef = useRef<THREE.Mesh>(null);
  const antennaRefs = useRef<THREE.Mesh[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
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

    // Skip movement when hovered to make clicking easier
    if (!isHovered) {
      // Smooth movement with physics-like behavior
      const speed = homeStudio ? 0.08 : 0.12; // Much slower speeds for contemplative movement
      const maxSpeed = speed;
      const acceleration = 0.005; // Reduced acceleration for gentler movement
      
      // Add some randomness to movement every few seconds
      if (Math.random() < 0.002) { // Less frequent direction changes
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
      
      // Rotate agent to face movement direction
      if (lastDirection && groupRef.current) {
        const targetRotation = Math.atan2(lastDirection.x, lastDirection.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetRotation,
          0.1
        );
      }
    }

    // Cyberpunk agent animations (same as CyberpunkAgent)
    if (meshRef.current) {
      // Slow cyberpunk floating
      const bob = Math.sin(state.clock.elapsedTime * 2) * 0.3;
      meshRef.current.position.y = 1 + bob;
    }

    if (headRef.current) {
      // Gentle head scanning
      headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
    }

    // Energy ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 2;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
    }

    // Eye blinking effect
    if (eyeLeftRef.current && eyeRightRef.current) {
      const blinkTime = state.clock.elapsedTime * 4;
      const blink = Math.sin(blinkTime) > 0.95 ? 0.1 : 1;
      (eyeLeftRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = blink * 2;
      (eyeRightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = blink * 2;
    }

    // Mouth LED strip animation
    if (mouthRef.current) {
      const mouthTime = state.clock.elapsedTime * 3;
      (mouthRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        0.4 + Math.sin(mouthTime) * 0.3;
    }

    // Antenna animations
    antennaRefs.current.forEach((antenna, i) => {
      if (antenna) {
        antenna.rotation.y = state.clock.elapsedTime * (0.5 + i * 0.25);
        antenna.position.y = 3.5 + Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.1;
      }
    });

    // Pulse the light intensity
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.intensity = 0.5 + Math.sin(t * 3) * 0.5; // Pulsing between 0 and 1
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
      {/* Enhanced AI Agent Body (same as CyberpunkAgent) */}
      <RoundedBox ref={meshRef} args={[0.8, 2, 0.8]} radius={0.1} position={[0, 1, 0]} castShadow receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}>
        <MeshTransmissionMaterial
          samples={16}
          resolution={256}
          transmission={0.9}
          roughness={0}
          clearcoat={1}
          thickness={0.3}
          chromaticAberration={0.8}
          distortionScale={0.1}
          temporalDistortion={0.1}
          color={isHovered ? "#00ff88" : color}
        />
      </RoundedBox>

      {/* Larger Spherical Head */}
      <Sphere ref={headRef} args={[0.4, 32, 32]} position={[0, 1.5, 0]} castShadow>
        <meshStandardMaterial 
          color="#ffffff"
          emissive={color}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
        />
      </Sphere>

      {/* Digital Face Screen */}
      <mesh ref={faceScreenRef} position={[0, 1.5, 0.35]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial 
          color="#001133"
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Glowing Eyes */}
      <mesh ref={eyeLeftRef} position={[-0.15, 1.6, 0.35]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh ref={eyeRightRef} position={[0.15, 1.6, 0.35]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={2}
        />
      </mesh>

      {/* LED Mouth Strip */}
      <mesh ref={mouthRef} position={[0, 1.3, 0.35]}>
        <boxGeometry args={[0.3, 0.03, 0.01]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Energy Ring Around Agent */}
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Holographic Scanning Lines */}
      {[0.5, 1, 1.5, 2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.2, 1.2, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}

      {/* Enhanced Spinning Antenna Array */}
      {[0, 1, 2].map((i) => (
        <mesh 
          key={i}
          ref={(el) => el && (antennaRefs.current[i] = el)}
          position={[
            Math.cos(i * Math.PI * 2 / 3) * 0.6,
            3.5,
            Math.sin(i * Math.PI * 2 / 3) * 0.6
          ]}
        >
          <cylinderGeometry args={[0.02, 0.02, 1]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Pulsing Light above head */}
      <pointLight 
        ref={lightRef}
        position={[0, 3, 0]} 
        color={color} 
        intensity={0.8}
        distance={5}
        decay={2}
      />

      {/* Particle Aura */}
      <Sparkles count={50} scale={3} size={2} speed={1} color={color} />
      
      {/* Data Streams */}
      <Sparkles count={30} scale={1.5} size={1} speed={1.5} color="#ffff00" />

      {/* Enhanced Cyberpunk Effects */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh position={[0, 2.5, 0]}>
          <torusGeometry args={[1.5, 0.1, 8, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      </Float>

      {/* Status Indicator */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.1]} />
        <meshStandardMaterial 
          color="#003366"
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Information Panel when hovered - INCLUDES NAME NOW */}
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