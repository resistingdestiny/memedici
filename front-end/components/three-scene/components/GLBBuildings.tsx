"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { ScaledGLB } from "./GLBScaler";

// Exchange Building using ams_s2.glb
export function ExchangeBuilding({ position, marketId }: { position: [number, number, number]; marketId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { pinnedMarketplace, hoveredMarketplace, setPinnedMarketplace, setHoveredMarketplace } = useCityStore();
  const isPinned = pinnedMarketplace === marketId;
  const isHovered = hoveredMarketplace === marketId;

  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced floating for interactive state
      if (isPinned || isHovered) {
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
    
    console.log('🏦 EXCHANGE CLICKED!');
    setPinnedMarketplace(isPinned ? null : marketId);
    
    setTimeout(() => {
      (globalThis as any).buildingInteractionActive = false;
    }, 1000);
  };

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    setHoveredMarketplace(marketId);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    setHoveredMarketplace(null);
  };

  return (
    <group ref={groupRef} position={position}>
      <ScaledGLB 
        glbFile="https://siliconroads.com/ams_s2.glb"
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Exchange Information Overlay */}
      {(isHovered || isPinned) && (
        <Html position={[0, 12, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-orange-400/70 rounded-2xl px-6 py-4 text-orange-400 font-mono animate-in fade-in duration-200 shadow-2xl shadow-orange-400/30 min-w-[300px]">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">🏦 MEDICI EXCHANGE</h2>
              <p className="text-sm text-orange-300">Digital Art Trading Hub</p>
            </div>
            
            <div className="text-center mb-4">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                isPinned 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-400/50' 
                  : 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              }`}>
                {isPinned ? '💰 ACTIVE EXCHANGE' : '🏛️ HOVER TO EXPLORE'}
              </div>
            </div>

            <div className="text-center text-xs text-gray-300 mb-4">
              <div>💎 NFT Marketplace</div>
              <div>📈 Live Trading Floor</div>
              <div>🤝 Artist Collaborations</div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                💰 Enter Exchange
              </button>
              
              <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                📊 View Market Data
              </button>
            </div>

            {isPinned && (
              <div className="mt-4 pt-4 border-t border-orange-400/30">
                <p className="text-xs text-gray-300 leading-relaxed">
                  The Medici Exchange is the premier destination for digital art trading. Connect with collectors, 
                  discover emerging artists, and participate in the future of art commerce through blockchain technology.
                </p>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Agent Builder using cyberpunk_bar.glb
export function AgentBuilderHub({ position, hubId }: { position: [number, number, number]; hubId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { pinnedAgentHub, hoveredAgentHub, setPinnedAgentHub, setHoveredAgentHub } = useCityStore();
  const isPinned = pinnedAgentHub === hubId;
  const isHovered = hoveredAgentHub === hubId;

  useFrame((state) => {
    if (groupRef.current) {
      // Enhanced floating for interactive state
      if (isPinned || isHovered) {
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
    
    console.log('🤖 AGENT BUILDER CLICKED!');
    setPinnedAgentHub(isPinned ? null : hubId);
    
    setTimeout(() => {
      (globalThis as any).buildingInteractionActive = false;
    }, 1000);
  };

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    setHoveredAgentHub(hubId);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    setHoveredAgentHub(null);
  };

  return (
    <group ref={groupRef} position={position}>
      <ScaledGLB 
        glbFile="https://siliconroads.com/cyberpunk_bar.glb"
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Agent Builder Information Overlay */}
      {(isHovered || isPinned) && (
        <Html position={[0, 12, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-400/70 rounded-2xl px-6 py-4 text-cyan-400 font-mono animate-in fade-in duration-200 shadow-2xl shadow-cyan-400/30 min-w-[300px]">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">🤖 AGENT BUILDER</h2>
              <p className="text-sm text-cyan-300">AI Assistant Creation Hub</p>
            </div>
            
            <div className="text-center mb-4">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                isPinned 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50' 
                  : 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              }`}>
                {isPinned ? '🎯 ACTIVE BUILDER' : '🏛️ HOVER TO EXPLORE'}
              </div>
            </div>

            <div className="text-center text-xs text-gray-300 mb-4">
              <div>🧠 AI Agent Design</div>
              <div>⚡ Neural Training</div>
              <div>🎨 Creative Programming</div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                🤖 Build Agent
              </button>
              
              <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                🧠 Training Center
              </button>
            </div>

            {isPinned && (
              <div className="mt-4 pt-4 border-t border-cyan-400/30">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Design and train your own AI art assistants. This advanced facility combines cutting-edge machine learning 
                  with artistic creativity to birth the next generation of digital collaborators.
                </p>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
} 