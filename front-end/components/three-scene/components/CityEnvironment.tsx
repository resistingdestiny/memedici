"use client";

import { Environment, Sky, Stars, Cloud, Float, ContactShadows, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export function CityEnvironment() {
  return (
    <>
      {/* ENHANCED LIGHTING SYSTEM FOR LARGER CITY 🌈 */}
      {/* Hemisphere Light for soft ambient fill */}
      <hemisphereLight
        args={[0xddddff, 0x222222, 0.4]}
      />
      
      {/* MAIN DIRECTIONAL LIGHT - Enhanced with better shadow settings */}
      <directionalLight
        position={[50, 50, 20]}
        intensity={2}
        color="#00ffff"
        castShadow
        shadow-mapSize-width={4096} // Higher quality shadows
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={200} // Much larger shadow distance
        shadow-camera-left={-100} // Wider shadow coverage
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001} // Reduce shadow acne
      />
      
      {/* REGIONAL LIGHTING FOR DIFFERENT STUDIO AREAS - Enhanced with better falloff */}
      <pointLight position={[-40, 20, -30]} intensity={3} color="#FFD700" distance={60} decay={2} castShadow={false} /> {/* Leonardo area */}
      <pointLight position={[45, 20, -25]} intensity={3} color="#4169E1" distance={60} decay={2} castShadow={false} /> {/* Raphael area */}
      <pointLight position={[0, 20, 50]} intensity={4} color="#DC143C" distance={80} decay={2} castShadow={false} /> {/* Michelangelo area */}
      <pointLight position={[-35, 20, 35]} intensity={3} color="#8A2BE2" distance={60} decay={2} castShadow={false} /> {/* Caravaggio area */}
      <pointLight position={[40, 20, 30]} intensity={1.5} color="#D2691E" distance={60} decay={2} castShadow={false} /> {/* Da Vinci area */}
      <pointLight position={[-60, 20, 0]} intensity={3} color="#696969" distance={60} decay={2} castShadow={false} /> {/* Picasso area */}
      <pointLight position={[25, 15, -45]} intensity={2} color="#98FB98" distance={50} decay={2} castShadow={false} /> {/* Monet area */}
      <pointLight position={[-25, 15, -40]} intensity={3} color="#FFD700" distance={50} decay={2} castShadow={false} /> {/* Van Gogh area */}
      
      {/* ENHANCED ATMOSPHERIC EFFECTS FOR VAST CITY */}
      <fog attach="fog" args={["#0a0a2e", 20, 400]} />
      
      {/* ENVIRONMENT MAP for better reflections */}
      <Environment
        preset="night"
        background={false}
        blur={0.6}
      />
      
      {/* DRAMATIC CYBERPUNK SKY */}
      <Sky
        distance={450000}
        sunPosition={[0, -0.4, 0]}
        inclination={0.8}
        azimuth={0.5}
        turbidity={35}
        rayleigh={2}
        mieCoefficient={0.1}
        mieDirectionalG={0.8}
      />
      
      {/* ENHANCED STAR FIELD */}
      <Stars
        radius={500}
        depth={100}
        count={8000}
        factor={8}
        saturation={1}
        fade
        speed={0.5}
      />
      
      {/* NEBULA CLOUDS - Floating in the distance */}
      <Float speed={0.2} rotationIntensity={0.1} floatIntensity={0.1}>
        <Cloud
          position={[200, 80, -300]}
          speed={0.1}
          opacity={0.4}
          color="#ff0088"
          segments={40}
          bounds={[80, 20, 80]}
        />
      </Float>
      
      <Float speed={0.15} rotationIntensity={0.1} floatIntensity={0.1}>
        <Cloud
          position={[-250, 60, 200]}
          speed={0.08}
          opacity={0.3}
          color="#0088ff"
          segments={40}
          bounds={[100, 25, 100]}
        />
      </Float>
      
      <Float speed={0.25} rotationIntensity={0.1} floatIntensity={0.1}>
        <Cloud
          position={[150, 100, 180]}
          speed={0.12}
          opacity={0.35}
          color="#8800ff"
          segments={40}
          bounds={[60, 15, 60]}
        />
      </Float>
      
      {/* ATMOSPHERIC LAYERS */}
      <Sparkles
        count={500}
        scale={[400, 100, 400]}
        size={1}
        speed={0.1}
        color="#002244"
        opacity={0.2}
        position={[0, 50, 0]}
      />
      
      <Sparkles
        count={300}
        scale={[300, 80, 300]}
        size={1.5}
        speed={0.15}
        color="#220044"
        opacity={0.25}
        position={[0, 70, 0]}
      />
      
      <Sparkles
        count={200}
        scale={[200, 60, 200]}
        size={2}
        speed={0.2}
        color="#440022"
        opacity={0.3}
        position={[0, 90, 0]}
      />
      
      {/* Contact shadows for ground objects */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={200}
        blur={2}
        far={50}
        resolution={1024}
        color="#000011"
      />
    </>
  );
}

export function CityGround() {
  return (
    <group>
      {/* MAIN GROUND PLANE - No flickering, single solid base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial
          color="#0a0a1a"
          roughness={0.9}
          metalness={0.0}
          emissive="#000011"
          emissiveIntensity={0.05}
        />
      </mesh>
      
      {/* SINGLE GRID OVERLAY - Properly spaced to avoid z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <planeGeometry args={[600, 600, 120, 120]} />
        <meshBasicMaterial
          color="#003366"
          transparent
          opacity={0.2}
          wireframe
          depthWrite={false}
        />
      </mesh>
      
      {/* CENTRAL PLATFORM AREA - Well spaced above ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <circleGeometry args={[120, 64]} />
        <meshStandardMaterial
          color="#001122"
          transparent
          opacity={0.4}
          emissive="#002244"
          emissiveIntensity={0.2}
          roughness={0.8}
          metalness={0.2}
          depthWrite={false}
        />
      </mesh>
      
      {/* GLOWING PATH MARKERS - Higher above ground */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 80 + (i % 3) * 40; // Vary radius in groups
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh key={i} position={[x, -0.3, z]}>
            <circleGeometry args={[3, 8]} />
            <meshStandardMaterial
              color="#00ffff"
              transparent
              opacity={0.6}
              emissive="#00ffff"
              emissiveIntensity={0.8}
              roughness={0.1}
              metalness={0.0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      
      {/* NEON CIRCUIT PATTERNS - Subtle ground decoration */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 150;
        const z = Math.sin(angle) * 150;
        
        return (
          <mesh key={`circuit-${i}`} position={[x, -0.35, z]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[40, 2]} />
            <meshStandardMaterial
              color="#0066cc"
              transparent
              opacity={0.3}
              emissive="#0066cc"
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
} 