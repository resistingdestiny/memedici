"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ScaledGLB } from "./GLBScaler";

// Exchange Building using ams_s2.glb
export function ExchangeBuilding({ position, marketId }: { position: [number, number, number]; marketId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced floating for interactive state
      if (isHovered) {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      } else {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      }
      
      // Subtle rotation
      groupRef.current.rotation.y += Math.sin(state.clock.elapsedTime * 0.3) * 0.001;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    (globalThis as any).buildingInteractionActive = true;
    
    console.log('🏦 EXCHANGE CLICKED! Opening launchpad page in new tab...');
    // Open launchpad page in new tab instead of showing overlay
    window.open('/launchpad', '_blank');
    
    setTimeout(() => {
      (globalThis as any).buildingInteractionActive = false;
    }, 1000);
  };

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    setIsHovered(true);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    setIsHovered(false);
  };

  return (
    <>
      <group ref={groupRef} position={position}>
        <ScaledGLB 
          glbFile="https://siliconroads.com/ams_s2.glb"
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        />

        {/* Simple hover info only */}
        {isHovered && (
          <Html position={[0, 12, 0]} center>
            <div className="bg-black/95 backdrop-blur-xl border-2 border-orange-400/70 rounded-2xl px-6 py-4 font-mono animate-in fade-in duration-200 shadow-2xl min-w-[300px] pointer-events-none">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-1">🏦 MEDICI EXCHANGE</h2>
                <p className="text-sm text-orange-300">Digital Art Trading Hub</p>
              </div>
              
              <div className="text-center text-xs text-gray-300 mb-4">
                <div>💎 NFT Marketplace</div>
                <div>📈 Live Trading Floor</div>
                <div>🚀 Agent Launchpad</div>
                <div>🤝 Artist Collaborations</div>
              </div>
              
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-orange-600 text-white font-bold rounded-lg">
                  Click for Launchpad
                </div>
              </div>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

// Agent Builder using cyberpunk_bar.glb
export function AgentBuilderHub({ position, hubId }: { position: [number, number, number]; hubId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced floating for interactive state
      if (isHovered) {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      } else {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      }
      
      // Removed rotation - the bar now stays facing the opposite direction (180 degrees)
      // groupRef.current.rotation.y += Math.sin(state.clock.elapsedTime * 0.3) * 0.001;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    (globalThis as any).buildingInteractionActive = true;
    
    console.log('🤖 AGENT BUILDER CLICKED! Opening agents page in new tab...');
    // Open agents page in new tab instead of showing overlay
    window.open('/agents', '_blank');
    
    setTimeout(() => {
      (globalThis as any).buildingInteractionActive = false;
    }, 1000);
  };

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    setIsHovered(true);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    setIsHovered(false);
  };

  return (
    <group ref={groupRef} position={position} rotation={[0, Math.PI, 0]}>
      <ScaledGLB 
        glbFile="https://siliconroads.com/cyberpunk_bar.glb"
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Simple hover info only */}
      {isHovered && (
        <Html position={[0, 12, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-400/70 rounded-2xl px-6 py-4 font-mono animate-in fade-in duration-200 shadow-2xl min-w-[300px] pointer-events-none">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">🤖 AGENT BUILDER</h2>
              <p className="text-sm text-cyan-300">AI Assistant Creation Hub</p>
            </div>
            
            <div className="text-center text-xs text-gray-300 mb-4">
              <div>🧠 AI Agent Design</div>
              <div>⚡ Neural Training</div>
              <div>🎨 Creative Programming</div>
            </div>
            
            <div className="text-center">
              <div className="inline-block px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg">
                Click to Build Agents
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
} 