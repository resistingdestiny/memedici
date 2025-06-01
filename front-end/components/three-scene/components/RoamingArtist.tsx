"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, RoundedBox, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { ScaledGLB, AnimatedScaledGLB } from "./GLBScaler";
import { useCityStore } from "@/lib/stores/use-city";

export function RoamingArtist({ 
  artistId, 
  name, 
  specialty, 
  homeStudio, 
  initialPosition, 
  color, 
  onArtistClick,
  isFocused = false,
  glbFile = "https://siliconroads.com/cyberpunk_robot.glb" // Default fallback
}: { 
  artistId: string; 
  name: string; 
  specialty: string; 
  homeStudio?: string; 
  initialPosition: [number, number, number]; 
  color: string;
  onArtistClick: (artist: any) => void;
  isFocused?: boolean;
  glbFile?: string; // New optional prop for GLB file
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  // Comment out all the individual refs for the complex appearance
  // const headRef = useRef<THREE.Mesh>(null);
  // const ringRef = useRef<THREE.Mesh>(null);
  // const eyeLeftRef = useRef<THREE.Mesh>(null);
  // const eyeRightRef = useRef<THREE.Mesh>(null);
  // const mouthRef = useRef<THREE.Mesh>(null);
  // const faceScreenRef = useRef<THREE.Mesh>(null);
  // const antennaRefs = useRef<THREE.Mesh[]>([]);
  // const lightRef = useRef<THREE.PointLight>(null);
  
  // Get studios from the city store for dynamic building avoidance
  const { studios } = useCityStore();
  
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
      // Only move if not hovered AND not focused
      if (!isHovered && !isFocused) {
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
        const bounds = 350;
        
        // Building avoidance zones - keep agents away from buildings
        const buildingZones = [
          { pos: [120, 0, 0], radius: 70, name: "Agent Builder Hub" },
          { pos: [0, 0, 140], radius: 80, name: "Exchange Building" },
          { pos: [0, 0, 0], radius: 50, name: "Central Plaza" },
          // Add dynamic studio positions
          ...studios.map(studio => ({
            pos: studio.position,
            radius: 50, // Safe distance from studios
            name: studio.name
          }))
        ];
        
        // Check for building collisions before moving
        const testPosition = position.clone().add(velocity.clone().multiplyScalar(0.02));
        let shouldAvoidBuilding = false;
        let strongestAvoidance = new THREE.Vector3(0, 0, 0);
        
        for (const building of buildingZones) {
          const distanceToBuilding = Math.sqrt(
            Math.pow(testPosition.x - building.pos[0], 2) + 
            Math.pow(testPosition.z - building.pos[2], 2)
          );
          
          if (distanceToBuilding < building.radius) {
            // Agent is getting too close to a building, steer away
            const avoidanceStrength = (building.radius - distanceToBuilding) / building.radius; // Stronger when closer
            const avoidanceVector = new THREE.Vector3(
              testPosition.x - building.pos[0],
              0,
              testPosition.z - building.pos[2]
            ).normalize().multiplyScalar(2.0 * avoidanceStrength); // Scale by proximity
            
            // Accumulate avoidance forces
            strongestAvoidance.add(avoidanceVector);
            shouldAvoidBuilding = true;
            
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
              console.log(`🚧 Agent ${name} avoiding ${building.name} (distance: ${distanceToBuilding.toFixed(1)})`);
            }
          }
        }
        
        // Apply avoidance if needed
        if (shouldAvoidBuilding) {
          velocity.add(strongestAvoidance);
          velocity.normalize().multiplyScalar(1.0);
        }
        
        // Update position with collision-checked movement
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
      
      // Pulsing glow animation for better visibility
      if (glowRef.current && innerGlowRef.current) {
        const pulseIntensity = 0.3 + Math.sin(time * 2) * 0.2;
        const innerPulseIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        
        // Animate glow material emissive intensity
        (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulseIntensity;
        (innerGlowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = innerPulseIntensity;
        
        // Slightly scale the glow spheres for additional effect
        const scaleVariation = 1 + Math.sin(time * 1.5) * 0.1;
        glowRef.current.scale.setScalar(scaleVariation);
        innerGlowRef.current.scale.setScalar(scaleVariation * 0.8);
      }
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
    
    // Directly open the full agent panel
    onArtistClick(artist);
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
  };
  
  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* GLOW EFFECT FOR BETTER VISIBILITY */}
      <mesh ref={glowRef} position={[0, 3, 0]}>
        <sphereGeometry args={[8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
      
      {/* PULSING INNER GLOW */}
      <mesh ref={innerGlowRef} position={[0, 3, 0]}>
        <sphereGeometry args={[5]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.15}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
      
      {/* ENHANCED POINT LIGHT FOR GLOW */}
      <pointLight
        position={[0, 3, 0]}
        color={color}
        intensity={2.0}
        distance={25}
        decay={2}
      />
      
      {/* SECONDARY GLOW LIGHT */}
      <pointLight
        position={[0, 1, 0]}
        color={color}
        intensity={1.0}
        distance={15}
        decay={1.5}
      />

      {/* CYBERPUNK ROBOT GLB MODEL */}
      <AnimatedScaledGLB
        glbFile={glbFile}
        targetSizeOverride={15.0}
        playAllAnimations={true}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* ENHANCED LARGER HOVER AREA - SURROUNDS THE ENTIRE AGENT */}
      <mesh
        position={[0, 6, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        visible={false}
      >
        <sphereGeometry args={[15]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* INVISIBLE LARGER CLICKABLE AREA FOR EASIER CLICKING */}
      <mesh
        position={[0, 3.75, 0]}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        visible={false}
      >
        <sphereGeometry args={[12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* SPARKLES FOR ENHANCED VISIBILITY */}
      <Sparkles 
        count={40} 
        scale={12} 
        size={3} 
        speed={0.8} 
        color={color}
        opacity={0.6}
      />
      
      <Sparkles 
        count={20} 
        scale={8} 
        size={2} 
        speed={1.2} 
        color="#ffffff"
        opacity={0.4}
      />

      {/* Keep the hover information panel */}
      {isHovered && (
        <Html position={[0, 8, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-400 rounded-xl px-6 py-4 text-cyan-400 font-mono animate-in fade-in duration-200 shadow-xl shadow-cyan-400/40 min-w-[250px] transform hover:scale-105 transition-transform">
            <div className="text-xl font-bold text-center mb-1">{name}</div>
            <div className="text-sm text-center mb-3 text-cyan-300">{specialty}</div>
            {homeStudio && (
              <div className="text-xs text-green-400 text-center mb-2 font-semibold">📍 {homeStudio}</div>
            )}
            <div className="text-xs text-purple-400 text-center mb-4">
              {homeStudio ? '🏛️ Studio Artist' : '🌟 Independent Artist'}
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm py-3 px-6 rounded-lg transition-all cursor-pointer font-bold shadow-lg transform hover:scale-105">
                💬 Click to Open Agent Panel
              </div>
              <div className="text-xs text-gray-300 mt-2 opacity-75">Chat • Profile • AI Tools</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Note: Preloading is now handled by the GLBScaler component 