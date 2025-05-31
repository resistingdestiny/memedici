"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { ScaledGLB } from "./GLBScaler";

// Remove Text import to avoid troika-worker issues
// import { Text } from "@react-three/drei";

// Client-side check to prevent SSR issues with Text components
const isClient = typeof window !== 'undefined';

// Module-level variable to track building clicks
let lastBuildingClickTime = 0;

// Import the interaction flag from city-scene
declare global {
  var buildingInteractionActive: boolean;
}

// Initialize if not exists
if (typeof window !== 'undefined') {
  if (typeof (globalThis as any).buildingInteractionActive === 'undefined') {
    (globalThis as any).buildingInteractionActive = false;
  }
}

// NEW: Mysterious Contraption at the center using GLB
export function MysteriousContraption() {
  const contraptionRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (contraptionRef.current) {
      // Slow mysterious rotation
      contraptionRef.current.rotation.y += 0.002;
      
      // Subtle floating animation
      contraptionRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group ref={contraptionRef} position={[0, 0, 0]}>
      {/* MYSTERIOUS CONTRAPTION GLB MODEL with automatic scaling */}
      <ScaledGLB 
        glbFile="16_mysterious_contraption.glb"
        castShadow
        receiveShadow
      />
      
      {/* Enhanced Ambient Sparkles around the contraption */}
      <Sparkles
        count={200}
        scale={[30, 15, 30]}
        size={2}
        speed={0.3}
        color="#ff00ff"
        position={[0, 8, 0]}
      />
      
      {/* Secondary sparkle layer */}
      <Sparkles
        count={100}
        scale={[20, 10, 20]}
        size={1}
        speed={0.5}
        color="#00ffff"
        position={[0, 12, 0]}
      />
    </group>
  );
}

// MASSIVE AGENT BUILDING HUB 🏗️
export function AgentBuildingHub({ position, hubId }: { position: [number, number, number]; hubId: string }) {
  const hubRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const { pinnedAgentHub, hoveredAgentHub, setPinnedAgentHub, setHoveredAgentHub } = useCityStore();
  const isPinned = pinnedAgentHub === hubId;
  const isHovered = hoveredAgentHub === hubId;
  
  useFrame((state) => {
    if (hubRef.current && beaconRef.current) {
      // Rotating hub
      hubRef.current.rotation.y += 0.002;
      
      // Pulsing beacon
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      beaconRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group ref={hubRef} position={position}>
      {/* MAIN HUB STRUCTURE */}
      <RoundedBox 
        args={[20, 15, 20]} 
        radius={1} 
        castShadow 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          // Set interaction flag
          (globalThis as any).buildingInteractionActive = true;
          
          // Mark the time of this building click
          lastBuildingClickTime = Date.now();
          console.log('🔥🔥🔥 AGENT HUB CLICKED! 🔥🔥🔥');
          console.log('  Current isPinned:', isPinned);
          console.log('  Current hubId:', hubId);
          console.log('  Will set pinnedAgentHub to:', isPinned ? null : hubId);
          setPinnedAgentHub(isPinned ? null : hubId);
          console.log('  ✅ setPinnedAgentHub called successfully');
          
          // Clear interaction flag after a delay
          setTimeout(() => {
            (globalThis as any).buildingInteractionActive = false;
          }, 1000);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          console.log('🔥 AGENT HUB HOVERED! Setting hover state');
          console.log('  Setting hoveredAgentHub to:', hubId);
          setHoveredAgentHub(hubId);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          console.log('🔥 AGENT HUB UNHOVERED! Clearing hover state');
          console.log('  Setting hoveredAgentHub to: null');
          setHoveredAgentHub(null);
        }}
      >
        <meshStandardMaterial
          color={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#1a1a1a"}
          emissive={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#0088ff"}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </RoundedBox>
      
      {/* CENTRAL BEACON TOWER */}
      <mesh position={[0, 12, 0]} castShadow>
        <cylinderGeometry args={[2, 3, 24, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={isPinned ? "#ffff00" : "#00ffff"}
          emissiveIntensity={2}
          metalness={1}
          roughness={0}
        />
      </mesh>
      
      {/* BEACON CRYSTAL */}
      <mesh ref={beaconRef} position={[0, 20, 0]} castShadow>
        <octahedronGeometry args={[3]} />
        <MeshTransmissionMaterial
          samples={32}
          resolution={1024}
          transmission={0.95}
          roughness={0}
          clearcoat={1}
          thickness={0.8}
          chromaticAberration={1.5}
          distortionScale={0.5}
          temporalDistortion={0.3}
          color={isPinned ? "#ffff00" : "#00ffff"}
        />
      </mesh>
      
      {/* ENERGY RINGS AROUND BEACON */}
      {[6, 8, 10].map((radius, i) => (
        <mesh key={i} position={[0, 20, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[radius, 0.3, 8, 32]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      
      {/* CORNER TOWERS */}
      {[[-8, 8], [8, 8], [-8, -8], [8, -8]].map(([x, z], i) => (
        <Float key={i} speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
          <mesh position={[x, 5, z]} castShadow>
            <cylinderGeometry args={[1, 1, 10]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#00ff88"
              emissiveIntensity={1.0}
              metalness={1}
              roughness={0}
            />
          </mesh>
        </Float>
      ))}
      
      {/* MASSIVE PARTICLE EFFECTS */}
      <Sparkles count={300} scale={25} size={4} speed={1} color={isPinned ? "#ffff00" : "#00ffff"} />
      <Sparkles count={200} scale={15} size={2} speed={1.5} color={isPinned ? "#ffaa00" : "#ffff00"} />
      
      {/* HUB LIGHTING */}
      <pointLight position={[0, 25, 0]} intensity={5} color="#00ffff" distance={50} />
      <pointLight position={[0, 15, 0]} intensity={3} color="#ffff00" />
    </group>
  );
}

// TRADING MARKPLACE 💰 - ORIGINAL ELABORATE VERSION
export function TradingMarketplace({ position, marketId }: { position: [number, number, number]; marketId: string }) {
  const { pinnedMarketplace, hoveredMarketplace, setPinnedMarketplace, setHoveredMarketplace } = useCityStore();
  const isPinned = pinnedMarketplace === marketId;
  const isHovered = hoveredMarketplace === marketId;
  
  return (
    <group position={position}>
      {/* MAIN MARKETPLACE PLATFORM */}
      <mesh 
        position={[0, 0, 0]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          // Set interaction flag
          (globalThis as any).buildingInteractionActive = true;
          
          // Mark the time of this building click
          lastBuildingClickTime = Date.now();
          console.log('🔥🔥🔥 MARKETPLACE CLICKED! 🔥🔥🔥');
          console.log('  Current isPinned:', isPinned);
          console.log('  Current marketId:', marketId);
          console.log('  Will set pinnedMarketplace to:', isPinned ? null : marketId);
          setPinnedMarketplace(isPinned ? null : marketId);
          console.log('  ✅ setPinnedMarketplace called successfully');
          
          // Clear interaction flag after a delay
          setTimeout(() => {
            (globalThis as any).buildingInteractionActive = false;
          }, 1000);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          console.log('🔥 MARKETPLACE HOVERED! Setting hover state');
          console.log('  Setting hoveredMarketplace to:', marketId);
          setHoveredMarketplace(marketId);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          console.log('🔥 MARKETPLACE UNHOVERED! Clearing hover state');
          console.log('  Setting hoveredMarketplace to: null');
          setHoveredMarketplace(null);
        }}
      >
        <cylinderGeometry args={[25, 25, 3, 16]} />
        <meshStandardMaterial
          color={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#2a2a2a"}
          emissive={isPinned ? "#ffff00" : isHovered ? "#ff0088" : "#ff00ff"}
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* TRADING TOWERS AROUND THE PLATFORM */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 20;
        const z = Math.sin(angle) * 20;
        return (
          <Float key={i} speed={1 + i * 0.1} rotationIntensity={0.2} floatIntensity={0.3}>
            <mesh position={[x, 8, z]} castShadow>
              <cylinderGeometry args={[1, 1.5, 16]} />
              <meshStandardMaterial
                color="#ff6600"
                emissive="#ff6600"
                emissiveIntensity={0.8}
                metalness={0.8}
                roughness={0.1}
              />
            </mesh>
          </Float>
        );
      })}

      {/* CENTRAL TRADING SPIRE */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
        <mesh position={[0, 15, 0]} castShadow>
          <coneGeometry args={[3, 12, 8]} />
          <meshStandardMaterial
            color="#ff9900"
            emissive="#ff9900"
            emissiveIntensity={1.2}
            metalness={1}
            roughness={0}
          />
        </mesh>
      </Float>

      {/* HOLOGRAPHIC TRADING SCREENS */}
      {[-15, 0, 15].map((x, i) => (
        <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={0.3} floatIntensity={0.4}>
          <mesh position={[x, 12, 20]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[8, 6]} />
            <meshStandardMaterial
              color="#001122"
              emissive="#00ff00"
              emissiveIntensity={0.6}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Float>
      ))}

      {/* MARKETPLACE PARTICLE EFFECTS */}
      <Sparkles count={200} scale={30} size={3} speed={1.5} color={isPinned ? "#ffff00" : "#ff00ff"} />
      <Sparkles count={150} scale={20} size={2} speed={2} color="#ff6600" />
      
      {/* MARKETPLACE LIGHTING */}
      <pointLight position={[0, 15, 0]} intensity={4} color="#ff00ff" distance={40} />
      <pointLight position={[0, 25, 0]} intensity={3} color="#ff6600" distance={50} />
    </group>
  );
}

export function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 text-foreground">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary opacity-20"></div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium">Loading Medici City...</div>
          <div className="text-sm text-muted-foreground">Preparing immersive experience</div>
        </div>
      </div>
    </Html>
  );
} 