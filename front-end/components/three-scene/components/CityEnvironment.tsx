"use client";

import { Environment, Sky, Stars, Cloud, Float, ContactShadows, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export function CityEnvironment() {
  return (
    <>
      {/* ENHANCED LIGHTING SYSTEM FOR LARGER CITY 🌈 */}
      <ambientLight intensity={0.3} color="#0a0a2e" />
      
      {/* MAIN NEON LIGHT - Higher and more intense for spread-out studios */}
      <directionalLight
        position={[50, 50, 20]}
        intensity={2}
        color="#00ffff"
        castShadow
        shadow-mapSize-width={4096} // Higher quality shadows for larger area
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={200} // Much larger shadow distance
        shadow-camera-left={-100} // Wider shadow coverage
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* REGIONAL LIGHTING FOR DIFFERENT STUDIO AREAS */}
      <pointLight position={[-40, 20, -30]} intensity={3} color="#FFD700" distance={60} /> {/* Leonardo area */}
      <pointLight position={[45, 20, -25]} intensity={3} color="#4169E1" distance={60} /> {/* Raphael area */}
      <pointLight position={[0, 20, 50]} intensity={4} color="#DC143C" distance={80} /> {/* Michelangelo area */}
      <pointLight position={[-35, 20, 35]} intensity={3} color="#8A2BE2" distance={60} /> {/* Caravaggio area */}
      <pointLight position={[40, 20, 30]} intensity={1.5} color="#D2691E" distance={60} /> {/* Da Vinci area - changed from green to orange */}
      <pointLight position={[-60, 20, 0]} intensity={3} color="#696969" distance={60} /> {/* Picasso area */}
      <pointLight position={[25, 15, -45]} intensity={2} color="#98FB98" distance={50} /> {/* Monet area */}
      <pointLight position={[-25, 15, -40]} intensity={3} color="#FFD700" distance={50} /> {/* Van Gogh area */}
      
      {/* ENHANCED ATMOSPHERIC EFFECTS FOR VAST CITY */}
      <fog attach="fog" args={["#0a0a2e", 50, 300]} /> {/* Extended fog range */}
      
      {/* FUTURISTIC ENVIRONMENT */}
      <Environment preset="night" />
      
      {/* CYBERPUNK SKY */}
      <Sky 
        distance={450000}
        sunPosition={[0, -0.5, 0]}
        inclination={0.8}
        azimuth={0.5}
        turbidity={20}
        rayleigh={1}
      />
      
      {/* ENHANCED NEON STARS FOR LARGER SCALE */}
      <Stars radius={400} depth={100} count={5000} factor={12} saturation={1} fade speed={2} />
      
      {/* FLOATING NEON CLOUDS IN DIFFERENT AREAS */}
      <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Cloud position={[60, 30, -60]} speed={0.1} opacity={0.2} color="#ff00ff" />
      </Float>
      <Float speed={0.3} rotationIntensity={0.1} floatIntensity={0.2}>
        <Cloud position={[-80, 25, 40]} speed={0.08} opacity={0.15} color="#00ffff" />
      </Float>
      <Float speed={0.4} rotationIntensity={0.1} floatIntensity={0.25}>
        <Cloud position={[30, 35, 70]} speed={0.12} opacity={0.18} color="#ffff00" />
      </Float>
      
      {/* ENHANCED ATMOSPHERIC PARTICLES FOR LARGER SPACE */}
      <Sparkles count={1000} scale={200} size={3} speed={0.3} color="#00ffff" />
      <Sparkles count={600} scale={120} size={2} speed={0.5} color="#ff00ff" />
      <Sparkles count={400} scale={80} size={1} speed={0.8} color="#ffff00" />
    </>
  );
}

export function CityGround() {
  return (
    <>
      {/* SIMPLE NON-FLICKERING GROUND */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>

      {/* BASIC CONTACT SHADOWS ONLY */}
      <ContactShadows
        position={[0, -0.48, 0]}
        opacity={0.3}
        scale={200}
        blur={1}
        far={30}
        color="#000000"
      />
    </>
  );
} 