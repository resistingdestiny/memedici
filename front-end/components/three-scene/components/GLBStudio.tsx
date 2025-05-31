"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { ScaledGLB } from "./GLBScaler";

export function GLBStudio({ 
  studio, 
  glbFile, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}: {
  studio: any;
  glbFile: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isGLBLoaded, setIsGLBLoaded] = useState(false);
  const { activeStudio, hoveredStudio, setHoveredStudio, setActiveStudio, enterGalleryMode } = useCityStore();
  
  const isActive = activeStudio === studio.id;
  const isHovered = hoveredStudio === studio.id;
  const showInterface = isHovered || isActive;

  useFrame((state) => {
    if (groupRef.current && isGLBLoaded) {
      // Add subtle floating animation for active/hovered studios
      if (isActive || isHovered) {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      }
      
      // Subtle rotation for visual interest
      groupRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    console.log('🏛️ GLB Studio clicked:', studio.name);
    setActiveStudio(studio.id);
  };

  const handlePointerEnter = () => {
    setHoveredStudio(studio.id);
  };

  const handlePointerLeave = () => {
    setHoveredStudio(null);
  };

  const handleEnterGallery = () => {
    console.log('🖼️ Entering gallery for:', studio.name);
    enterGalleryMode(studio.id);
  };

  const handleGLBLoad = () => {
    setIsGLBLoaded(true);
    console.log(`🏛️ GLB Studio loaded: ${studio.name} (${glbFile})`);
  };

  const handleGLBError = () => {
    console.error(`❌ Failed to load GLB Studio: ${studio.name} (${glbFile})`);
  };

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation}
    >
      {/* GLB Model with automatic bounding box scaling */}
      <ScaledGLB 
        glbFile={glbFile}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Studio Information Overlay - Only show when GLB is loaded */}
      {showInterface && isGLBLoaded && (
        <Html position={[0, 8, 0]} center>
          <div className="bg-black/95 backdrop-blur-xl border-2 border-cyan-400/70 rounded-2xl px-6 py-4 text-cyan-400 font-mono animate-in fade-in duration-200 shadow-2xl shadow-cyan-400/30 min-w-[280px]">
            {/* Studio Header */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">{studio.name}</h2>
              <p className="text-sm text-cyan-300">{studio.artist}</p>
              <p className="text-xs text-purple-400">{studio.period}</p>
            </div>
            
            {/* Studio Status */}
            <div className="text-center mb-4">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                isActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-400/50' 
                  : 'bg-blue-500/20 text-blue-400 border border-blue-400/50'
              }`}>
                {isActive ? '🎯 ACTIVE STUDIO' : '🏛️ HOVER TO EXPLORE'}
              </div>
            </div>

            {/* Gallery Info */}
            <div className="text-center text-xs text-gray-300 mb-4">
              <div>🎨 {studio.artworks?.length || 5} Artworks</div>
              <div>🤖 AI-Enhanced Experience</div>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterGallery();
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🖼️ Enter Gallery
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStudio(isActive ? null : studio.id);
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isActive ? '❌ Close Info' : 'ℹ️ Studio Info'}
              </button>
            </div>

            {/* Quick Studio Description */}
            {isActive && (
              <div className="mt-4 pt-4 border-t border-cyan-400/30">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {getStudioDescription(studio.id)}
                </p>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Studio descriptions for each type
function getStudioDescription(studioId: string): string {
  const descriptions: { [key: string]: string } = {
    "leonardo": "Experience the perfect blend of technical precision and artistic innovation. This studio specializes in engineering-meets-art, featuring detailed anatomical studies and mechanical designs.",
    "raphael": "Immerse yourself in harmonious compositions and classical beauty. Known for balanced perspectives and graceful figures that embody Renaissance ideals.",
    "michelangelo": "Witness the power of monumental art and sculptural mastery. This space transforms digital marble into breathtaking three-dimensional experiences.",
    "caravaggio": "Explore the dramatic interplay of light and shadow. Revolutionary chiaroscuro techniques create intense emotional narratives in every piece.",
    "da-vinci": "Discover the intersection of art, science, and invention. A laboratory of creativity where artistic vision meets technological innovation.",
    "picasso": "Break boundaries with revolutionary cubist perspectives. Reality reconstructed through geometric fragments and multiple viewpoints.",
    "monet": "Capture fleeting moments of light and atmosphere. Impressionist techniques bring natural beauty and changing light to digital life.",
    "van-gogh": "Feel the emotional intensity of expressive brushwork. Bold colors and dynamic textures convey deep psychological and spiritual themes."
  };
  
  return descriptions[studioId] || "A unique artistic environment where creativity and technology merge to create extraordinary digital experiences.";
} 