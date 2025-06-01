"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, Environment, Sky, Stars, Cloud, ContactShadows, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { MovementController } from "./MovementController";
import { CyberpunkAgent } from "./CyberpunkAgent";
import { ScaledGLB, AnimatedScaledGLB } from "./GLBScaler";

// Client-side check to prevent SSR issues with Text components
const isClient = typeof window !== 'undefined';

// FLOATING ARTWORK WITH HOVER LABELS 🖼️
function FloatingArtwork({ artwork, index, studio, onLightboxOpen }: { artwork: any; index: number; studio: any; onLightboxOpen?: (artwork: any, studio: any) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    console.log(`🖼️ Loading artwork: ${artwork.title} from ${artwork.image}`);
    setIsLoading(true);
    setHasError(false);
    
    const loader = new THREE.TextureLoader();
    
    // Special handling for NightCafe artwork
    if (artwork.title.includes('NIGHTCAFE')) {
      console.log('🌟 Loading YOUR NightCafe artwork via proxy...');
    }
    
    loader.load(
      artwork.image,
      (loadedTexture) => {
        console.log(`✅ Successfully loaded: ${artwork.title}`);
        if (artwork.title.includes('NIGHTCAFE')) {
          console.log('🎉 YOUR NIGHTCAFE ARTWORK LOADED SUCCESSFULLY!');
        }
        // Optimize texture settings for better display
        loadedTexture.generateMipmaps = false;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.flipY = true; // Change to true to fix upside-down orientation
        setTexture(loadedTexture);
        setIsLoading(false);
        setHasError(false);
      },
      (progress) => {
        console.log(`⏳ Loading progress for ${artwork.title}:`, progress);
        if (artwork.title.includes('NIGHTCAFE')) {
          console.log('⏳ NightCafe loading progress:', progress);
        }
      },
      (error) => {
        console.error(`❌ Failed to load ${artwork.title}:`, error);
        if (artwork.title.includes('NIGHTCAFE')) {
          console.error('💥 NIGHTCAFE LOADING FAILED:', error);
          console.error('🔍 Attempted URL:', artwork.image);
        }
        setHasError(true);
        // Create a vibrant fallback texture with better visibility
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Create a bright, cyberpunk-style fallback
          const gradient = ctx.createLinearGradient(0, 0, 512, 512);
          gradient.addColorStop(0, '#ff0080');
          gradient.addColorStop(0.3, '#8000ff');
          gradient.addColorStop(0.6, '#0080ff');
          gradient.addColorStop(1, '#00ff80');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 512);
          
          // Add bright pattern for visibility
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 10, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Add text
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.strokeText('NIGHTCAFE', 256, 200);
          ctx.fillText('NIGHTCAFE', 256, 200);
          ctx.strokeText('ARTWORK', 256, 260);
          ctx.fillText('ARTWORK', 256, 260);
          
          ctx.font = 'bold 24px Arial';
          ctx.strokeText('Loading Failed', 256, 320);
          ctx.fillText('Loading Failed', 256, 320);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.needsUpdate = true;
        setTexture(fallbackTexture);
        setIsLoading(false);
      }
    );
  }, [artwork.image, artwork.title]);
  
  return (
    <>
      <Float key={artwork.id} speed={1 + index * 0.2} rotationIntensity={0.1} floatIntensity={0.3}>
        <group 
          position={artwork.position} 
          rotation={artwork.rotation}
          onClick={(e) => {
            e.stopPropagation();
            console.log(`🖼️ Clicked artwork: ${artwork.title}`);
            onLightboxOpen?.(artwork, studio);
          }}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
        >
          {/* CLEAN ARTWORK IMAGE - No frames or borders */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[artwork.scale[0], artwork.scale[1]]} />
            <meshBasicMaterial 
              map={texture}
              transparent={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* SIMPLE LIGHTING FOR ARTWORK */}
          <pointLight
            position={[0, 0, 2]}
            intensity={2}
            color="#ffffff"
            distance={8}
          />
        </group>
      </Float>

      {/* FLOATING ARTWORK INFO - Positioned FAR TO THE SIDE to not cover art */}
      {isHovered && (
        <Html position={[
          artwork.position[0] > 10 
            ? artwork.position[0] - (artwork.scale[0]/2 + 5) // Left side for far-right artworks
            : artwork.position[0] + (artwork.scale[0]/2 + 5), // Right side for other artworks
          artwork.position[1], // Same height as the artwork center
          artwork.position[2]
        ]} center>
          <div className="bg-black/90 backdrop-blur-xl text-cyan-400 px-4 py-2 rounded-xl text-left border border-cyan-400/50 shadow-lg shadow-cyan-400/25 min-w-[200px] animate-in fade-in duration-300 pointer-events-none">
            <div className="text-xs opacity-70 font-mono">NEURAL_ART.dat</div>
            <div className="font-bold text-lg">{artwork.title}</div>
            <div className="text-xs text-purple-400">HOLOGRAPHIC_RENDER</div>
            <div className="text-xs opacity-60 mt-1">Studio: {studio.name}</div>
            <div className="text-xs text-yellow-400 mt-1">🖱️ Click to view full-size</div>
            {isLoading && <div className="text-xs text-yellow-400 mt-1">Loading...</div>}
            {hasError && <div className="text-xs text-red-400 mt-1">Failed to load image</div>}
            {!isLoading && !hasError && <div className="text-xs text-green-400 mt-1">Loaded successfully!</div>}
          </div>
        </Html>
      )}
    </>
  );
}

export function StudioGallery({ studio, onLightboxOpen, onArtistClick }: { 
  studio: any; 
  onLightboxOpen?: (artwork: any, studio: any) => void;
  onArtistClick?: (artist: any) => void;
}) {
  const galleryRef = useRef<THREE.Group>(null);

  // Use real artwork data from the studio - only show if artworks actually exist
  const realArtworks = studio.recentArtworks && studio.recentArtworks.length > 0
    ? studio.recentArtworks.map((artwork: any, index: number) => ({
        id: artwork.id,
        title: artwork.title,
        image: artwork.image,
        position: [
          // Position artworks in a circle around the center
          Math.cos(index * (Math.PI * 2 / studio.recentArtworks.length)) * 12,
          6 + Math.sin(index * 0.5) * 2, // Varying heights
          Math.sin(index * (Math.PI * 2 / studio.recentArtworks.length)) * 12
        ] as [number, number, number],
        rotation: [0, index * (Math.PI * 2 / studio.recentArtworks.length), 0] as [number, number, number],
        scale: [4, 3, 0.1] as [number, number, number]
      }))
    : []; // Empty array if no artworks

  // Only show agents that are actually assigned to this studio
  const getStudioArtists = () => {
    if (!studio.agent) {
      return []; // No agents if none are assigned
    }

    // Return the single assigned agent
    return [{
      id: `${studio.id}-agent`,
      agentId: studio.agent.agent_id || studio.agent.id,
      name: studio.agent.name,
      specialty: studio.agent.specialty?.[0] || studio.studioData.art_style,
      position: [0, 0, 0] as [number, number, number],
      isActive: true,
      platformId: 0,
      agent: studio.agent
    }];
  };

  const studioArtists = getStudioArtists();
  
  // Only show platforms and robots if there are actual assigned agents
  const shouldShowAgentContent = studioArtists.length > 0;
  
  // Split artworks between platforms (if multiple agents) or show all for single agent
  const getArtworksForPlatform = (platformId: number) => {
    if (realArtworks.length === 0) return [];
    
    if (studioArtists.length === 1) {
      // Single agent gets all artworks
      return realArtworks;
    }
    
    const artworksPerPlatform = Math.ceil(realArtworks.length / studioArtists.length);
    const startIndex = platformId * artworksPerPlatform;
    const endIndex = Math.min(startIndex + artworksPerPlatform, realArtworks.length);
    
    return realArtworks.slice(startIndex, endIndex).map((artwork, index) => {
      const platformCenter = studioArtists[platformId]?.position || [0, 0, 0];
      return {
        ...artwork,
        position: [
          platformCenter[0] + artwork.position[0],
          artwork.position[1],
          platformCenter[2] + artwork.position[2]
        ] as [number, number, number]
      };
    });
  };

  // Random spinning feature selection
  const getRandomSpinningFeature = () => {
    const features = [
      { glbFile: "https://siliconroads.com/cyberpunk_robot.glb", shouldSpin: true, name: "Cyberpunk Guardian" },
      { glbFile: "https://siliconroads.com/solaria_core.glb", shouldSpin: true, name: "Solaria Core" },
      { glbFile: "https://siliconroads.com/diamond_hands.glb", shouldSpin: false, name: "Diamond Hands" }
    ];
    return features[Math.floor(Math.random() * features.length)];
  };

  const [randomFeature] = useState(getRandomSpinningFeature());
  const featureRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (galleryRef.current) {
      // Gentle ambient rotation
      galleryRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    
    // Animate spinning feature
    if (featureRef.current && randomFeature.shouldSpin) {
      featureRef.current.rotation.y += 0.01;
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('🎨 Gallery loaded for studio:', studio.name);
    console.log('🤖 Studio artists:', studioArtists.length);
    console.log('🖼️ Real artworks:', realArtworks.length);
    console.log('🏛️ Should show agent content:', shouldShowAgentContent);
    
    if (studio.agent) {
      console.log('👨‍🎨 Assigned agent:', studio.agent.name);
    } else {
      console.log('❌ No agent assigned to this studio');
    }
    
    studioArtists.forEach((artist, i) => {
      const artworksForPlatform = getArtworksForPlatform(i);
      console.log(`Platform ${i + 1}: ${artworksForPlatform.length} artworks`);
    });
  }, [studio.name, realArtworks.length, studioArtists.length]);

  return (
    <>
      {/* CYBERPUNK SKY - SAME AS MAIN CITY */}
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
      
      {/* ENHANCED STAR FIELD - SAME AS MAIN CITY */}
      <Stars
        radius={500}
        depth={100}
        count={8000}
        factor={8}
        saturation={1}
        fade
        speed={0.5}
      />
      
      {/* NEBULA CLOUDS - FLOATING IN THE DISTANCE */}
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
      
      {/* ATMOSPHERIC FOG */}
      <fog attach="fog" args={["#0a0a2e", 20, 400]} />
      
      {/* ENVIRONMENT MAP for better reflections */}
      <Environment
        preset="night"
        background={false}
        blur={0.6}
      />
      
      {/* SIMPLIFIED LIGHTING SYSTEM */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <hemisphereLight args={[0xddddff, 0x222222, 0.4]} />
      
      {/* MAIN GALLERY LIGHTING */}
      <directionalLight position={[0, 20, 0]} intensity={1.5} color="#ffffff" castShadow />
      <pointLight position={[0, 15, 0]} intensity={2} color="#ffffff" distance={50} />
      
      {/* ONLY SHOW PLATFORMS IF THERE ARE ASSIGNED AGENTS */}
      {shouldShowAgentContent && studioArtists.map((artist, index) => (
        <AnimatedScaledGLB 
          key={`platform-${artist.id}`}
          glbFile="https://siliconroads.com/fucursor.glb"
          position={[artist.position[0], 2, artist.position[2]]}
          targetSizeOverride={12}
          playAllAnimations={true}
          castShadow
        />
      ))}

      {/* FLOATING ARTWORKS - ONLY SHOW IF ARTWORKS EXIST */}
      {realArtworks.length > 0 && (
        <group ref={galleryRef}>
          {shouldShowAgentContent ? (
            // Show artworks grouped by platform if agents exist
            studioArtists.map((artist, platformId) => (
              <group key={artist.id}>
                {getArtworksForPlatform(platformId).map((artwork, index) => (
                  <FloatingArtwork 
                    key={artwork.id} 
                    artwork={artwork} 
                    index={index} 
                    studio={studio}
                    onLightboxOpen={onLightboxOpen}
                  />
                ))}
              </group>
            ))
          ) : (
            // Show artworks without platform grouping if no agents
            realArtworks.map((artwork, index) => (
              <FloatingArtwork 
                key={artwork.id} 
                artwork={artwork} 
                index={index} 
                studio={studio}
                onLightboxOpen={onLightboxOpen}
              />
            ))
          )}
        </group>
      )}

      {/* ROBOTS ON TOP OF THEIR PLATFORMS - ONLY IF AGENTS ARE ASSIGNED */}
      {shouldShowAgentContent && studioArtists.map((artist) => (
        <AnimatedScaledGLB
          key={`robot-${artist.id}`}
          glbFile="https://siliconroads.com/robot_playground.glb"
          position={[artist.position[0], 6, artist.position[2]]}
          targetSizeOverride={8}
          playAllAnimations={true}
          castShadow
          receiveShadow
          onClick={() => onArtistClick?.({
            id: artist.id,
            agentId: artist.agentId,
            name: artist.agent?.name || "Gallery Assistant",
            specialty: artist.specialty,
            type: "AI Assistant",
            isAIAgent: true,
            isActive: artist.isActive,
            avatar: artist.agent?.avatar,
            description: artist.agent?.description,
            stats: artist.agent?.stats
          })}
        />
      ))}

      {/* EMPTY STUDIO MESSAGE IF NO AGENTS OR ARTWORKS */}
      {!shouldShowAgentContent && realArtworks.length === 0 && (
        <Html position={[0, 5, 0]} center>
          <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded-lg px-6 py-4 text-gray-300 text-center shadow-lg">
            <div className="text-2xl font-bold mb-2">{studio.studioData.name}</div>
            <div className="text-lg opacity-70 mb-3">Empty Studio</div>
            <div className="text-sm opacity-60">
              This studio is available for an agent to claim and start creating artworks.
            </div>
            <div className="text-xs text-blue-400 mt-2">Theme: {studio.studioData.theme}</div>
          </div>
        </Html>
      )}

      {/* RANDOM SPINNING FEATURE - ONLY IF THERE'S CONTENT IN THE STUDIO */}
      {(shouldShowAgentContent || realArtworks.length > 0) && (
        <group ref={featureRef} position={[0, 8, -30]}>
          <AnimatedScaledGLB
            glbFile={randomFeature.glbFile}
            targetSizeOverride={6}
            playAllAnimations={true}
            castShadow
            receiveShadow
          />
        </group>
      )}

      {/* MINIMAL SPARKLES FOR AMBIANCE */}
      <Sparkles count={30} scale={25} size={0.8} speed={0.2} color="#00ffff" />
      
      {/* ENHANCED GALLERY CAMERA CONTROLS */}
      <MovementController />

      {/* EXIT GALLERY BUTTON */}
      <Html position={[-25, 15, -25]} center>
        <button 
          onClick={() => {
            const { exitGalleryMode } = useCityStore.getState();
            exitGalleryMode();
          }}
          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl border-2 border-red-400 shadow-lg shadow-red-400/50 transition-all hover:scale-105 animate-pulse"
        >
          🚪 EXIT GALLERY
        </button>
      </Html>
    </>
  );
} 