"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Float, Sparkles, Environment, Sky, Stars, Cloud, ContactShadows, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useCityStore } from "@/lib/stores/use-city";
import { MovementController } from "./MovementController";
import { CyberpunkAgent } from "./CyberpunkAgent";
import { ScaledGLB, AnimatedScaledGLB } from "./GLBScaler";
import { getAgentArtworks, type ApiArtwork } from "@/lib/api";

// Client-side check to prevent SSR issues with Text components
const isClient = typeof window !== 'undefined';

// FLOATING ARTWORK WITH HOVER LABELS 🖼️
function FloatingArtwork({ artwork, index, studio, onLightboxOpen }: { artwork: any; index: number; studio: any; onLightboxOpen?: (artwork: any, studio: any) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Create a loading texture immediately (synchronously) to prevent white images
  const createLoadingTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create a subtle loading gradient
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add loading animation dots
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', 256, 256);
      
      // Add some sparkle effects
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const loadingTex = new THREE.CanvasTexture(canvas);
    loadingTex.needsUpdate = true;
    return loadingTex;
  };
  
  // Initialize with loading texture immediately
  const [loadingTexture] = useState(() => createLoadingTexture());
  
  useEffect(() => {
    console.log(`🖼️ Loading artwork: ${artwork.title} from ${artwork.image || artwork.file_url}`);
    setIsLoading(true);
    setHasError(false);
    
    const loader = new THREE.TextureLoader();
    const imageUrl = artwork.image || artwork.file_url;
    
    // Validate URL before attempting to load
    if (!imageUrl || imageUrl.trim() === '') {
      console.error(`❌ No valid URL for artwork: ${artwork.title || artwork.id}`);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    console.log(`🔗 Attempting to load from URL: ${imageUrl}`);
    
    // Special handling for NightCafe artwork
    if (artwork.title && artwork.title.includes('NIGHTCAFE')) {
      console.log('🌟 Loading YOUR NightCafe artwork via proxy...');
    }
    
    loader.load(
      imageUrl,
      (loadedTexture) => {
        console.log(`✅ Successfully loaded artwork: ${artwork.title || artwork.id} from ${imageUrl}`);
        if (artwork.title && artwork.title.includes('NIGHTCAFE')) {
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
        console.log(`⏳ Loading progress for ${artwork.title || artwork.id}:`, progress);
        if (artwork.title && artwork.title.includes('NIGHTCAFE')) {
          console.log('⏳ NightCafe loading progress:', progress);
        }
      },
      (error) => {
        console.error(`❌ Failed to load artwork: ${artwork.title || artwork.id} from URL: ${imageUrl}`);
        console.error(`❌ Error details:`, error);
        if (artwork.title && artwork.title.includes('NIGHTCAFE')) {
          console.error('💥 NIGHTCAFE LOADING FAILED:', error);
          console.error('🔍 Attempted URL:', imageUrl);
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
          ctx.strokeText('ARTWORK', 256, 200);
          ctx.fillText('ARTWORK', 256, 200);
          ctx.strokeText('FAILED', 256, 260);
          ctx.fillText('FAILED', 256, 260);
          
          ctx.font = 'bold 24px Arial';
          ctx.strokeText('Loading Error', 256, 320);
          ctx.fillText('Loading Error', 256, 320);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.needsUpdate = true;
        setTexture(fallbackTexture);
        setIsLoading(false);
      }
    );
  }, [artwork.image, artwork.file_url, artwork.title]);
  
  return (
    <>
      <Float key={artwork.id} speed={1 + index * 0.2} rotationIntensity={0.1} floatIntensity={0.3}>
        <group 
          position={artwork.position} 
          rotation={artwork.rotation}
          onClick={(e) => {
            e.stopPropagation();
            console.log(`🖼️ Clicked artwork: ${artwork.title || artwork.prompt}`);
            onLightboxOpen?.(artwork, studio);
          }}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
        >
          {/* CLEAN ARTWORK IMAGE - No frames or borders */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[artwork.scale[0], artwork.scale[1]]} />
            <meshBasicMaterial 
              map={texture || loadingTexture}
              transparent={true}
              opacity={1}
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
            <div className="font-bold text-lg">{artwork.title || artwork.prompt}</div>
            <div className="text-xs text-purple-400">HOLOGRAPHIC_RENDER</div>
            <div className="text-xs opacity-60 mt-1">Studio: {studio.name}</div>
            {artwork.agent_name && (
              <div className="text-xs text-green-400 mt-1">Artist: {artwork.agent_name}</div>
            )}
            {artwork.model_name && (
              <div className="text-xs text-blue-400 mt-1">Model: {artwork.model_name}</div>
            )}
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
  const [studioArtworks, setStudioArtworks] = useState<ApiArtwork[]>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);

  // Fetch real artworks from studio members
  useEffect(() => {
    const fetchStudioArtworks = async () => {
      if (!studio.agent || !studio.agent.agent_id) {
        console.log(`🏛️ No agent assigned to studio: ${studio.name}`);
        setStudioArtworks([]);
        return;
      }

      setLoadingArtworks(true);
      console.log(`🎨 Fetching artworks for studio: ${studio.name} from agent: ${studio.agent.name}`);

      try {
        const response = await getAgentArtworks(studio.agent.agent_id, 50, 0, true);
        
        if (response.success && response.artworks) {
          console.log(`✅ Loaded ${response.artworks.length} artworks for studio: ${studio.name}`);
          setStudioArtworks(response.artworks);
        } else {
          console.warn(`⚠️ Failed to load artworks for studio: ${studio.name}`, response.error);
          setStudioArtworks([]);
        }
      } catch (error) {
        console.error(`❌ Error fetching artworks for studio: ${studio.name}`, error);
        setStudioArtworks([]);
      } finally {
        setLoadingArtworks(false);
      }
    };

    fetchStudioArtworks();
  }, [studio.agent?.agent_id, studio.name]);

  // Convert API artworks to gallery format - REMOVED 8-ARTWORK LIMIT AND SPREAD MORE
  const galleryArtworks = studioArtworks.length > 0
    ? studioArtworks
        .filter(artwork => {
          // Filter out artworks without valid image URLs
          const hasValidUrl = artwork.file_url && artwork.file_url.trim() !== '';
          if (!hasValidUrl) {
            console.warn(`🚫 Skipping artwork without valid URL:`, artwork.id, artwork.prompt?.slice(0, 50));
          }
          return hasValidUrl;
        })
        .map((artwork, index) => {
          // Create much more spread out positioning in 3D space
          const totalArtworks = studioArtworks.length;
          const layers = Math.ceil(totalArtworks / 12); // 12 artworks per layer
          const currentLayer = Math.floor(index / 12);
          const indexInLayer = index % 12;
          
          // Multiple concentric circles at different heights and radii
          const baseRadius = 20 + currentLayer * 15; // Increasing radius for each layer
          const angleStep = (Math.PI * 2) / Math.min(12, totalArtworks - currentLayer * 12);
          const angle = indexInLayer * angleStep;
          
          return {
            id: artwork.id,
            title: artwork.prompt, // Use prompt as title for AI artworks
            image: artwork.file_url,
            file_url: artwork.file_url, // Keep both for debugging
            agent_name: studio.agent?.name,
            model_name: artwork.model_name,
            created_at: artwork.created_at,
            position: [
              // X: Spread in a wider circle with some randomness
              Math.cos(angle) * baseRadius + (Math.random() - 0.5) * 10,
              // Y: Varying heights with layering
              8 + currentLayer * 6 + Math.sin(index * 0.7) * 3,
              // Z: Spread in a wider circle with some randomness
              Math.sin(angle) * baseRadius + (Math.random() - 0.5) * 10
            ] as [number, number, number],
            rotation: [0, angle + Math.PI, 0] as [number, number, number], // Face inward
            scale: [4, 3, 0.1] as [number, number, number]
          };
        })
    : [];

  // Check for different studio states
  const hasAgent = studio.agent && studio.agent.agent_id;
  const hasArtworks = galleryArtworks.length > 0;

  // Only show platforms and robots if there are actual assigned agents (restored from previous version)
  const shouldShowAgentContent = hasAgent;

  // Always get at least one platform position
  const getStudioArtists = () => {
    if (!hasAgent) {
      // Return empty array - no platforms without agents
      return [];
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
  
  // Split artworks between platforms (if multiple agents) or show all for single agent
  const getArtworksForPlatform = (platformId: number) => {
    if (galleryArtworks.length === 0) return [];
    
    if (studioArtists.length === 1) {
      // Single agent gets all artworks
      return galleryArtworks;
    }
    
    const artworksPerPlatform = Math.ceil(galleryArtworks.length / studioArtists.length);
    const startIndex = platformId * artworksPerPlatform;
    const endIndex = Math.min(startIndex + artworksPerPlatform, galleryArtworks.length);
    
    return galleryArtworks.slice(startIndex, endIndex).map((artwork, index) => {
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

  // Random spinning feature selection with improved variety (restored cyberpunk_robot)
  const getRandomSpinningFeature = () => {
    const features = [
      { glbFile: "https://siliconroads.com/cyberpunk_robot.glb", shouldSpin: true, name: "Cyberpunk Guardian" },
      { glbFile: "https://siliconroads.com/solaria_core.glb", shouldSpin: true, name: "Solaria Core" },
      { glbFile: "https://siliconroads.com/diamond_hands.glb", shouldSpin: false, name: "Diamond Hands" },
      { glbFile: "https://siliconroads.com/the_artist.glb", shouldSpin: true, name: "The Artist" }
    ];
    
    // Use studio ID to ensure consistent but varied selection across studios
    const studioSeed = studio.id ? studio.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    const featureIndex = studioSeed % features.length;
    
    console.log(`🎪 Studio "${studio.name}" assigned spinning feature: ${features[featureIndex].name}`);
    return features[featureIndex];
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
    console.log('🤖 Has agent:', hasAgent);
    console.log('🖼️ Raw artworks from API:', studioArtworks.length);
    console.log('🖼️ Filtered gallery artworks displayed:', galleryArtworks.length);
    console.log('🏛️ Has artworks:', hasArtworks);
    
    // Log each artwork's URL for debugging
    studioArtworks.forEach((artwork, i) => {
      console.log(`📸 Artwork ${i + 1}:`, {
        id: artwork.id,
        prompt: artwork.prompt?.slice(0, 50) + '...',
        file_url: artwork.file_url,
        model_name: artwork.model_name,
        created_at: artwork.created_at
      });
    });
    
    if (studio.agent) {
      console.log('👨‍🎨 Assigned agent:', studio.agent.name);
    } else {
      console.log('❌ No agent assigned to this studio');
    }
  }, [studio.name, studioArtworks.length, galleryArtworks.length, hasAgent, hasArtworks]);

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
      
      {/* ONLY SHOW PLATFORMS IF THERE ARE ASSIGNED AGENTS (restored previous logic) */}
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

      {/* LOADING STATE */}
      {loadingArtworks && (
        <Html position={[0, 8, 0]} center>
          <div className="bg-purple-900/90 backdrop-blur-xl text-purple-200 px-6 py-4 rounded-xl text-center border border-purple-400/50 shadow-lg shadow-purple-400/25 pointer-events-none animate-pulse">
            <div className="text-lg font-bold mb-2">🎨 Loading Studio Artworks...</div>
            <div className="text-sm opacity-70">Fetching creations from studio members</div>
          </div>
        </Html>
      )}

      {/* FLOATING ARTWORKS - Show artworks if they exist */}
      {hasArtworks && !loadingArtworks && (
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
            galleryArtworks.map((artwork, index) => (
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

      {/* DANCING ROBOT ON PLATFORM - Only show if agent is assigned (restored robot_playground.glb) */}
      {shouldShowAgentContent && studioArtists.map((artist) => (
        <group key={`robot-group-${artist.id}`}>
          {/* Robot Model */}
          <AnimatedScaledGLB
            key={`robot-${artist.id}`}
            glbFile="https://siliconroads.com/robot_playground.glb"
            position={[artist.position[0], 6, artist.position[2]]}
            targetSizeOverride={8}
            playAllAnimations={true}
            castShadow
            receiveShadow
            onClick={() => {
              console.log('🤖 Robot clicked for studio artist:', artist.agent?.name);
              // Use EXACT same format as wandering agents
              const studioArtist = {
                id: artist.agentId,
                name: artist.agent?.name,
                specialty: artist.agent?.specialty?.[0] || artist.specialty,
                homeStudio: studio.name,
                color: "#00ffff",
                type: "Studio Artist",
                isActive: false,
                isAIAgent: false,
                position: artist.position
              };
              onArtistClick?.(studioArtist);
            }}
          />
          
          {/* INVISIBLE LARGER CLICKABLE AREA FOR EASIER CLICKING */}
          <mesh
            position={[artist.position[0], 6, artist.position[2]]}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🎯 Robot clickable area clicked for:', artist.agent?.name);
              // Use EXACT same format as wandering agents
              const studioArtist = {
                id: artist.agentId,
                name: artist.agent?.name,
                specialty: artist.agent?.specialty?.[0] || artist.specialty,
                homeStudio: studio.name,
                color: "#00ffff",
                type: "Studio Artist",
                isActive: false,
                isAIAgent: false,
                position: artist.position
              };
              onArtistClick?.(studioArtist);
            }}
            visible={false}
          >
            <sphereGeometry args={[10]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      ))}

      {/* RANDOM SPINNING FEATURE - Only if there's content in the studio (restored previous logic) */}
      {(shouldShowAgentContent || hasArtworks) && (
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