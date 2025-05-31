"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, RoundedBox, Sphere, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { ScaledGLB } from "./GLBScaler";

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
  // Comment out all the individual refs for the complex appearance
  // const headRef = useRef<THREE.Mesh>(null);
  // const ringRef = useRef<THREE.Mesh>(null);
  // const eyeLeftRef = useRef<THREE.Mesh>(null);
  // const eyeRightRef = useRef<THREE.Mesh>(null);
  // const mouthRef = useRef<THREE.Mesh>(null);
  // const faceScreenRef = useRef<THREE.Mesh>(null);
  // const antennaRefs = useRef<THREE.Mesh[]>([]);
  // const lightRef = useRef<THREE.PointLight>(null);
  
  const [position] = useState<THREE.Vector3>(new THREE.Vector3(...initialPosition));
  const [velocity] = useState<THREE.Vector3>(new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    0,
    (Math.random() - 0.5) * 2
  ));
  const [isHovered, setIsHovered] = useState(false);
  const [lastDirection, setLastDirection] = useState<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
  
  // Store animation phase for subtle idle effects
  const [animationPhase] = useState<number>(Math.random() * Math.PI * 2);
  const [baseY] = useState<number>(initialPosition[1]);

  useFrame((state) => {
    if (groupRef.current) {
      // Only move if not hovered
      if (!isHovered) {
        // Update velocity more frequently for more noticeable movement
        if (Math.random() < 0.01) {
          velocity.set(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          );
          velocity.normalize().multiplyScalar(1.0);
        }

        // Movement boundaries for the larger city
        const bounds = 150;
        
        // Update position with faster movement
        position.add(velocity.clone().multiplyScalar(0.02));
        
        // Bounce off boundaries
        if (position.x > bounds || position.x < -bounds) {
          velocity.x *= -1;
          position.x = Math.max(-bounds, Math.min(bounds, position.x));
        }
        if (position.z > bounds || position.z < -bounds) {
          velocity.z *= -1;
          position.z = Math.max(-bounds, Math.min(bounds, position.z));
        }

        // Update direction for facing movement
        if (velocity.length() > 0.01) {
          setLastDirection(velocity.clone().normalize());
        }

        // Apply position to group
        groupRef.current.position.copy(position);
        
        // Face movement direction
        if (lastDirection.length() > 0) {
          const targetRotation = Math.atan2(lastDirection.x, lastDirection.z);
          groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y,
            targetRotation,
            0.05
          );
        }
      }

      // Idle floating animation
      const time = state.clock.elapsedTime + animationPhase;
      groupRef.current.position.y = baseY + Math.sin(time * 1.5) * 0.2;
      
      // Subtle rotation
      groupRef.current.rotation.y += Math.sin(time * 0.5) * 0.001;
    }
  });

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
      {/* CYBERPUNK ROBOT GLB MODEL with automatic scaling */}
      <ScaledGLB 
        glbFile="cyberpunk_robot.glb"
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* COMMENT OUT ALL THE COMPLEX CUSTOM APPEARANCE */}
      {/* 
      <RoundedBox ref={meshRef} args={[0.8, 2, 0.8]} radius={0.1} position={[0, 1, 0]} castShadow receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}>
        <meshStandardMaterial
          color={isHovered ? "#00ff88" : color}
          emissive={isHovered ? "#004400" : color}
          emissiveIntensity={isHovered ? 0.3 : 0.1}
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={1.5}
          transparent
          opacity={0.9}
        />
      </RoundedBox>

      <Sphere ref={headRef} args={[0.4, 32, 32]} position={[0, 1.5, 0]} castShadow>
        <meshStandardMaterial 
          color="#ffffff"
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={1.0}
          envMapIntensity={2.0}
        />
      </Sphere>

      <mesh ref={faceScreenRef} position={[0, 1.5, 0.35]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial 
          color="#001133"
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.9}
          metalness={0.0}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={eyeLeftRef} position={[-0.15, 1.6, 0.35]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={3}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>
      <mesh ref={eyeRightRef} position={[0.15, 1.6, 0.35]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={3}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      <mesh ref={mouthRef} position={[0, 1.3, 0.35]}>
        <boxGeometry args={[0.3, 0.03, 0.01]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.0}
          metalness={1.0}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          roughness={0.0}
          metalness={1.0}
          transparent
          opacity={0.9}
        />
      </mesh>

      {[0.5, 1, 1.5, 2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.2, 1.2, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.0}
            roughness={0.0}
            metalness={0.5}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}

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
            emissiveIntensity={1.0}
            roughness={0.0}
            metalness={1.0}
          />
        </mesh>
      ))}

      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh position={[0, 2.5, 0]}>
          <torusGeometry args={[1.5, 0.1, 8, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.7}
          />
        </mesh>
      </Float>

      <pointLight 
        ref={lightRef}
        position={[0, 3, 0]} 
        color={color} 
        intensity={0.8}
        distance={5}
        decay={2}
      />

      <Sparkles 
        count={50} 
        scale={3} 
        size={2} 
        speed={1} 
        color={color}
        opacity={0.8}
      />
      
      <Sparkles 
        count={30} 
        scale={2} 
        size={1.5} 
        speed={1.5} 
        color="#ffff00"
        opacity={0.6}
      />
      */}

      {/* Keep the hover information panel */}
      {isHovered && (
        <Html position={[0, 4, 0]} center>
          <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl px-4 py-3 text-cyan-400 font-mono animate-in fade-in duration-200 shadow-lg shadow-cyan-400/25 min-w-[200px]">
            <div className="text-lg font-bold text-center">{name}</div>
            <div className="text-sm text-center mb-2">{specialty}</div>
            {homeStudio && (
              <div className="text-xs text-green-400 text-center mb-2">📍 {homeStudio}</div>
            )}
            <div className="text-xs text-purple-400 text-center mb-3">
              {homeStudio ? 'Studio Artist' : 'Independent Artist'}
            </div>
            <div className="text-center">
              <div className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-1 px-3 rounded transition-colors cursor-pointer">
                🗨️ Click to Chat
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Note: Preloading is now handled by the GLBScaler component 