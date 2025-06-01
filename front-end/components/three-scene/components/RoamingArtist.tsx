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
        if (Math.random() < 0.05) {
          // Add gentle orbital tendency around the central plaza
          const angleToCenter = Math.atan2(position.z, position.x);
          const orbitalDirection = new THREE.Vector3(
            -Math.sin(angleToCenter), // Perpendicular to radius (orbital direction)
            0,
            Math.cos(angleToCenter)
          );
          
          // Mix random movement with orbital tendency
          const randomComponent = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          );
          
          // 60% orbital, 40% random for more interesting movement
          velocity.copy(orbitalDirection.multiplyScalar(0.6).add(randomComponent.multiplyScalar(0.4)));
          velocity.normalize().multiplyScalar(2.0);
        }

        // Movement boundaries - keep agents close to central plaza
        const bounds = 100; // Much smaller bounds - keep agents near plaza
        
        // Strong attraction to central plaza to keep agents nearby
        const centerAttraction = new THREE.Vector3(0, 0, 0);
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        
        // If agents get too far from center, pull them back strongly
        if (distanceFromCenter > 80) {
          const attractionStrength = (distanceFromCenter - 80) / 20; // Stronger as they get further
          centerAttraction.set(-position.x, 0, -position.z).normalize().multiplyScalar(attractionStrength * 3.0);
          velocity.add(centerAttraction);
          console.log(`🏠 Agent ${name} being pulled back to plaza (distance: ${distanceFromCenter.toFixed(1)})`);
        }
        
        // Building avoidance zones - keep agents away from buildings but near plaza
        const buildingZones = [
          { pos: [120, 0, 0], radius: 70, name: "Agent Builder Hub" },
          { pos: [0, 0, 140], radius: 80, name: "Exchange Building" },
          { pos: [0, 0, 0], radius: 30, name: "Central Plaza" }, // Reduced central plaza avoidance
          // Add dynamic studio positions but with reduced radius
          ...studios.map(studio => ({
            pos: studio.position,
            radius: 35, // Reduced safe distance from studios
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
        position.add(velocity.clone().multiplyScalar(0.05));
        
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

      {/* Simple hover label - click for full details */}
      {isHovered && (
        <Html position={[0, 8, 0]} center>
          <div className="bg-black/90 backdrop-blur-sm border border-cyan-400/70 rounded-lg px-3 py-2 text-cyan-400 font-mono text-sm pointer-events-none shadow-lg">
            <div className="font-bold text-center">{name}</div>
            <div className="text-xs text-center text-gray-300 opacity-75">Click for details</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Note: Preloading is now handled by the GLBScaler component 