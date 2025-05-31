"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { CyberpunkAgent } from "./CyberpunkAgent";

// Client-side check to prevent SSR issues
const isClient = typeof window !== 'undefined';

// UNIQUE ARTIST STUDIO BUILDINGS WITH DISTINCTIVE DESIGNS 🎨
export function StudioBuilding({ studio }: { studio: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const cubistRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]); // For cubist fragments
  const { activeStudio, hoveredStudio, setHoveredStudio, setActiveStudio, enterGalleryMode } = useCityStore();
  
  const isActive = activeStudio === studio.id;
  const isHovered = hoveredStudio === studio.id;
  const showInterface = isHovered || isActive;
  
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      // Different floating animations for each artist
      let offset = 0;
      if (studio.id === "leonardo-studio") {
        offset = Math.sin(state.clock.elapsedTime * 2) * 0.3; // Mechanical rhythm
      } else if (studio.id === "raphael-studio") {
        offset = Math.sin(state.clock.elapsedTime * 1.5) * 0.2; // Graceful flow
      } else if (studio.id === "michelangelo-studio") {
        offset = Math.sin(state.clock.elapsedTime * 1) * 0.4; // Powerful, slow
      } else if (studio.id === "van-gogh-studio") {
        offset = Math.sin(state.clock.elapsedTime * 4) * 0.5; // Energetic swirls
      } else if (studio.id === "picasso-studio") {
        offset = Math.sin(state.clock.elapsedTime * 3) * 0.3 + Math.cos(state.clock.elapsedTime * 2) * 0.2; // Cubist complexity
      } else {
        offset = Math.sin(state.clock.elapsedTime * 2.5) * 0.25; // Default
      }
      
      // Apply floating to main mesh or all cubist fragments
      if (studio.id === "picasso-studio") {
        // Apply floating to all cubist fragments
        cubistRefs.current.forEach((ref, i) => {
          if (ref) {
            ref.position.y = (i === 0 ? 2 : i === 1 ? 4 : i === 2 ? 6 : 8) + offset;
          }
        });
      } else {
        meshRef.current.position.y = studio.position[1] + offset;
      }
      
      // FIXED: Consistent glow pulsing without random flickering
      const studioSeed = studio.id.charCodeAt(0) + studio.id.charCodeAt(1); // Consistent seed per studio
      const glow = 0.5 + Math.sin(state.clock.elapsedTime * 2 + studioSeed) * 0.3;
      glowRef.current.scale.setScalar(1 + glow * 0.1);
      
      // Artist-specific rotations
      if (isActive) {
        if (studio.id === "picasso-studio") {
          // Rotate all cubist fragments
          cubistRefs.current.forEach((ref) => {
            if (ref) {
              ref.rotation.y += 0.02; // Fast, cubist rotation
              ref.rotation.z += 0.01;
            }
          });
        } else if (studio.id === "van-gogh-studio") {
          meshRef.current.rotation.y += 0.015; // Swirling motion
        } else {
          meshRef.current.rotation.y += 0.01; // Standard rotation
        }
      }
    }
  });
  
  // Get studio-specific colors and materials
  const getStudioStyle = () => {
    switch (studio.id) {
      case "leonardo-studio":
        return {
          primaryColor: "#8B4513", // Renaissance brown
          secondaryColor: "#DAA520", // Golden
          emissiveColor: isActive ? "#FFD700" : isHovered ? "#FFA500" : "#CD853F",
          shape: "octagonal", // Technical, precise
          height: 10,
          width: 7
        };
      case "raphael-studio":
        return {
          primaryColor: "#4169E1", // Royal blue
          secondaryColor: "#87CEEB", // Sky blue
          emissiveColor: isActive ? "#00BFFF" : isHovered ? "#1E90FF" : "#4169E1",
          shape: "classical", // Elegant columns
          height: 12,
          width: 6
        };
      case "michelangelo-studio":
        return {
          primaryColor: "#DC143C", // Deep red
          secondaryColor: "#B22222", // Fire brick
          emissiveColor: isActive ? "#FF4500" : isHovered ? "#FF6347" : "#DC143C",
          shape: "monumental", // Massive and imposing
          height: 15,
          width: 10
        };
      case "caravaggio-studio":
        return {
          primaryColor: "#4B0082", // Indigo (shadows)
          secondaryColor: "#8A2BE2", // Blue violet
          emissiveColor: isActive ? "#9370DB" : isHovered ? "#8A2BE2" : "#4B0082",
          shape: "dramatic", // High contrast, chiaroscuro
          height: 11,
          width: 5
        };
      case "da-vinci-studio":
        return {
          primaryColor: "#8B4513", // Changed from forest green to brown
          secondaryColor: "#DAA520", // Changed from lime green to golden rod  
          emissiveColor: isActive ? "#D2691E" : isHovered ? "#DAA520" : "#8B4513", // Changed from bright green to orange/brown tones
          shape: "innovative", // Complex, multi-level
          height: 14,
          width: 7
        };
      case "picasso-studio":
        return {
          primaryColor: "#696969", // Dim gray
          secondaryColor: "#2F4F4F", // Dark slate gray
          emissiveColor: isActive ? "#FF1493" : isHovered ? "#FF69B4" : "#696969",
          shape: "cubist", // Angular, fragmented
          height: 8,
          width: 12
        };
      case "monet-studio":
        return {
          primaryColor: "#98FB98", // Pale green
          secondaryColor: "#90EE90", // Light green
          emissiveColor: isActive ? "#00FF7F" : isHovered ? "#7FFF00" : "#98FB98",
          shape: "organic", // Flowing, natural
          height: 9,
          width: 8
        };
      case "van-gogh-studio":
        return {
          primaryColor: "#FFD700", // Gold
          secondaryColor: "#FFA500", // Orange
          emissiveColor: isActive ? "#FFFF00" : isHovered ? "#FFD700" : "#FFA500",
          shape: "swirling", // Dynamic, energetic
          height: 11,
          width: 9
        };
      default:
        return {
          primaryColor: "#0088ff",
          secondaryColor: "#00ffff",
          emissiveColor: isActive ? "#00ff88" : isHovered ? "#ff0088" : "#0088ff",
          shape: "default",
          height: 8,
          width: 6
        };
    }
  };

  const style = getStudioStyle();

  const renderUniqueStructure = () => {
    switch (style.shape) {
      case "octagonal": // Leonardo - Technical precision
        return (
          <>
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <cylinderGeometry args={[style.width/2, style.width/2, style.height, 8]} />
              <MeshTransmissionMaterial
                backside samples={16} resolution={512} transmission={0.8}
                roughness={0.1} clearcoat={1} clearcoatRoughness={0.1}
                thickness={0.5} chromaticAberration={0.5}
                distortionScale={0.1} temporalDistortion={0.1}
                color={style.primaryColor}
              />
            </mesh>
            {/* Technical gear elements */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, 2 + i * 3, 0]} rotation={[0, i * Math.PI/4, 0]}>
                <torusGeometry args={[style.width/2 + 0.5, 0.2, 8, 16]} />
                <meshStandardMaterial color={style.secondaryColor} emissive={style.emissiveColor} emissiveIntensity={1} />
              </mesh>
            ))}
          </>
        );

      case "classical": // Raphael - Elegant columns
        return (
          <>
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <cylinderGeometry args={[style.width/2, style.width/2 + 1, style.height, 16]} />
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.5} />
            </mesh>
            {/* Classical columns */}
            {[-2, 2].map((x) => [-2, 2].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, style.height/2, z]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, style.height]} />
                <meshStandardMaterial color="#ffffff" emissive={style.secondaryColor} emissiveIntensity={0.8} />
              </mesh>
            )))}
          </>
        );

      case "monumental": // Michelangelo - Massive blocks
        return (
          <>
            <RoundedBox ref={meshRef} args={[style.width, style.height, style.width]} radius={0.5} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.7} roughness={0.3} metalness={0.7} />
            </RoundedBox>
            {/* Massive supporting pillars */}
            {[[-3, 3], [3, 3], [-3, -3], [3, -3]].map(([x, z], i) => (
              <RoundedBox key={i} args={[1.5, style.height + 2, 1.5]} radius={0.2} position={[x, 1, z]} castShadow>
                <meshStandardMaterial color={style.secondaryColor} emissive={style.emissiveColor} emissiveIntensity={1} />
              </RoundedBox>
            ))}
          </>
        );

      case "dramatic": // Caravaggio - High contrast
        return (
          <>
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <coneGeometry args={[style.width/2, style.height, 6]} />
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={1.2} />
            </mesh>
            {/* Dramatic light beams */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, 2 + i * 3, 0]} rotation={[0, i * Math.PI/3, 0]}>
                <coneGeometry args={[0.5, 2, 6]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} transparent opacity={0.7} />
              </mesh>
            ))}
          </>
        );

      case "innovative": // Da Vinci - Multi-level complexity
        return (
          <>
            {/* Main tower */}
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <cylinderGeometry args={[style.width/2, style.width/3, style.height, 12]} />
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.6} />
            </mesh>
            {/* Flying machine elements */}
            {[3, 6, 9].map((y) => (
              <group key={y} position={[0, y, 0]}>
                <mesh rotation={[0, y * 0.3, 0]}>
                  <torusGeometry args={[2, 0.3, 8, 16]} />
                  <meshStandardMaterial color={style.secondaryColor} emissive={style.emissiveColor} emissiveIntensity={1} />
                </mesh>
                {/* Spinning elements */}
                <mesh rotation={[Math.PI/2, 0, y * 0.2]}>
                  <cylinderGeometry args={[0.1, 0.1, 4]} />
                  <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
                </mesh>
              </group>
            ))}
          </>
        );

      case "cubist": // Picasso - Angular fragments
        return (
          <>
            {/* Multiple angular pieces */}
            {[
              { pos: [0, 2, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number], scale: [style.width, 4, 4] as [number, number, number] },
              { pos: [2, 4, 2] as [number, number, number], rot: [0, Math.PI/4, 0] as [number, number, number], scale: [4, 6, 3] as [number, number, number] },
              { pos: [-2, 6, -2] as [number, number, number], rot: [0, -Math.PI/4, 0] as [number, number, number], scale: [3, 4, 5] as [number, number, number] },
              { pos: [1, 8, -1] as [number, number, number], rot: [0, Math.PI/3, 0] as [number, number, number], scale: [2, 3, 3] as [number, number, number] }
            ].map((fragment, i) => (
              <RoundedBox
                key={i} 
                ref={(ref) => {
                  if (i === 0) meshRef.current = ref; // First fragment also goes to meshRef
                  cubistRefs.current[i] = ref; // All fragments go to cubistRefs
                }}
                args={fragment.scale} 
                radius={0.2} 
                position={fragment.pos} 
                rotation={fragment.rot}
                castShadow receiveShadow
                onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
                onPointerEnter={() => setHoveredStudio(studio.id)}
                onPointerLeave={() => setHoveredStudio(null)}>
                <meshStandardMaterial
                  color={i % 2 === 0 ? style.primaryColor : style.secondaryColor} 
                  emissive={style.emissiveColor} 
                  emissiveIntensity={0.8} 
                />
              </RoundedBox>
            ))}
          </>
        );

      case "organic": // Monet - Flowing natural forms
        return (
          <>
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <sphereGeometry args={[style.width/2, 16, 12]} />
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.5} />
            </mesh>
            {/* Water lily pads */}
            {[1, 2, 3].map((i) => (
              <mesh key={i} position={[Math.cos(i) * 3, 1 + i, Math.sin(i) * 3]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[0.5, 2, 8]} />
                <meshStandardMaterial color={style.secondaryColor} emissive={style.emissiveColor} emissiveIntensity={1} transparent opacity={0.8} />
              </mesh>
            ))}
          </>
        );

      case "swirling": // Van Gogh - Dynamic energy
        return (
          <>
            <mesh ref={meshRef} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
              onPointerEnter={() => setHoveredStudio(studio.id)}
              onPointerLeave={() => setHoveredStudio(null)}>
              <cylinderGeometry args={[style.width/2, style.width/3, style.height, 8]} />
              <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.8} />
            </mesh>
            {/* Swirling energy ribbons */}
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[
                Math.cos(i * Math.PI/2) * 3, 
                2 + i * 2, 
                Math.sin(i * Math.PI/2) * 3
              ]} rotation={[0, i * Math.PI/2, 0]}>
                <torusGeometry args={[1.5, 0.3, 6, 12]} />
                <meshStandardMaterial color={style.secondaryColor} emissive={style.emissiveColor} emissiveIntensity={1.5} />
              </mesh>
            ))}
          </>
        );

      default:
        return (
          <RoundedBox ref={meshRef} args={[style.width, style.height, style.width]} radius={0.3} castShadow receiveShadow
            onClick={(e) => { e.stopPropagation(); setActiveStudio(studio.id); }}
            onPointerEnter={() => setHoveredStudio(studio.id)}
            onPointerLeave={() => setHoveredStudio(null)}>
            <meshStandardMaterial color={style.primaryColor} emissive={style.emissiveColor} emissiveIntensity={0.5} />
          </RoundedBox>
        );
    }
  };
  
  return (
    <group position={studio.position} rotation={studio.rotation} scale={studio.scale}>
      {renderUniqueStructure()}

      {/* ARTIST-SPECIFIC NEON GLOW OUTLINE */}
      <mesh ref={glowRef} position={[0, style.height/2, 0]}>
        <sphereGeometry args={[style.width/2 + 2, 16, 16]} />
        <meshStandardMaterial
          color={style.emissiveColor}
          emissive={style.emissiveColor}
          emissiveIntensity={0.8} // Reduced from 1.5 to prevent harsh flickering
          transparent
          opacity={0.15} // Reduced opacity for subtlety
        />
      </mesh>
      
      {/* CYBERPUNK AI AGENT - REMOVED since agents should only be in galleries or roaming */}
      {/* <CyberpunkAgent agentId={studio.agentId} position={[0, 1, style.width/2 + 1]} isActive={isActive} /> */}
      
      {/* ARTIST-SPECIFIC PARTICLE EFFECTS */}
      {isActive && (
        <>
          <Sparkles count={200} scale={style.width + 5} size={6} speed={2} color={style.emissiveColor} />
          <Sparkles count={100} scale={style.width + 2} size={3} speed={1.5} color={style.secondaryColor} />
        </>
      )}

      {/* ENHANCED STUDIO INFO OVERLAY - REMOVED TO REDUCE CLUTTER */}
      {/* {showInterface && (
        <Html position={[0, style.height + 3, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-400 rounded-xl px-6 py-4 text-center shadow-lg shadow-cyan-400/50 animate-in fade-in duration-300 pointer-events-none">
            <div className="text-2xl font-bold text-white mb-2">{studio.name}</div>
            <div className="text-cyan-400 text-lg mb-2">{studio.artist}</div>
            <div className="text-purple-400 text-sm mb-3">{studio.specialty}</div>
            
            <div className="flex gap-2 justify-center">
              <button 
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  enterGalleryMode(studio.id);
                }}
              >
                🏛️ Enter Gallery
              </button>
              <button 
                className="bg-purple-500 hover:bg-purple-400 text-white font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Agent interaction for studio:', studio.id);
                }}
              >
                🤖 Meet Agent
              </button>
            </div>
            
            <div className="text-gray-400 text-xs mt-2">
              Style: {style.shape.charAt(0).toUpperCase() + style.shape.slice(1)}
            </div>
          </div>
        </Html>
      )} */}
    </group>
  );
} 