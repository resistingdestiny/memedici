"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Float, Sparkles, Environment, Sky, Stars, Cloud, ContactShadows, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { CyberpunkAgent } from "./CyberpunkAgent";

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
          {/* HOLOGRAPHIC FRAME - No hover color changes */}
          <mesh castShadow>
            <boxGeometry args={[artwork.scale[0] + 0.3, artwork.scale[1] + 0.3, 0.2]} />
            <meshStandardMaterial 
              color="#ffffff"
              emissive="#00ffff"
              emissiveIntensity={0.8}
              metalness={1}
              roughness={0}
              transparent
              opacity={0.9}
            />
          </mesh>
          
          {/* GLOWING BORDER - Consistent glow */}
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[artwork.scale[0] + 0.4, artwork.scale[1] + 0.4, 0.15]} />
            <meshStandardMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={1.0}
              transparent
              opacity={0.7}
            />
          </mesh>
          
          {/* ARTWORK IMAGE - No brightness changes on hover */}
          <mesh position={[0, 0, 0.11]}>
            <planeGeometry args={[artwork.scale[0], artwork.scale[1]]} />
            <meshBasicMaterial 
              map={texture}
              transparent={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* INDIVIDUAL ARTWORK SPOTLIGHTS - Consistent lighting */}
          <spotLight
            position={[0, 8, 5]}
            target-position={artwork.position}
            angle={0.8}
            penumbra={0.2}
            intensity={5}
            color="#ffffff"
            castShadow
          />
          
          {/* Additional front lighting */}
          <pointLight
            position={[0, 0, 2]}
            intensity={3}
            color="#ffffff"
            distance={10}
          />
          
          {/* INDIVIDUAL PARTICLE AURA - Consistent particles */}
          <Sparkles 
            count={30} 
            scale={artwork.scale[0] + 2} 
            size={1} 
            speed={1} 
            color="#00ffff" 
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
  const particleRef = useRef<THREE.Group>(null);

  // Real artwork URLs for the gallery - Original VR positioning
  const realArtworks = [
    {
      id: "art-1",
      title: "🎨 YOUR NIGHTCAFE CREATION",
      image: "/api/proxy-image?url=" + encodeURIComponent("https://creator.nightcafe.studio/jobs/84lwOA5gRcR8SMq6m8ZD/84lwOA5gRcR8SMq6m8ZD--1--ljlvd.jpg"),
      position: [0, 6, -12] as [number, number, number], // Much further back and higher
      rotation: [0, 0, 0] as [number, number, number],
      scale: [6, 4.5, 0.1] as [number, number, number] // Made it even larger as centerpiece
    },
    {
      id: "art-2", 
      title: "Digital Renaissance",
      image: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&h=600&fit=crop",
      position: [15, 4, -8] as [number, number, number], // Much further right
      rotation: [0, -Math.PI/4, 0] as [number, number, number],
      scale: [3, 3.5, 0.1] as [number, number, number]
    },
    {
      id: "art-3",
      title: "Cyber Baroque",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      position: [-15, 3, -8] as [number, number, number], // Much further left
      rotation: [0, Math.PI/4, 0] as [number, number, number],
      scale: [3.5, 3, 0.1] as [number, number, number]
    },
    {
      id: "art-4",
      title: "AI Abstraction",
      image: "https://images.unsplash.com/photo-1578662015879-be14ced36384?w=800&h=600&fit=crop",
      position: [12, 2, 15] as [number, number, number], // Way back behind you
      rotation: [0, Math.PI, 0] as [number, number, number],
      scale: [3.2, 3.8, 0.1] as [number, number, number]
    },
    {
      id: "art-5",
      title: "Quantum Canvas",
      image: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&h=600&fit=crop",
      position: [-12, 8, 12] as [number, number, number], // High and far back
      rotation: [0, -Math.PI/2, 0] as [number, number, number],
      scale: [4.5, 2.5, 0.1] as [number, number, number]
    },
    {
      id: "art-6",
      title: "Holographic Memory",
      image: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop",
      position: [0, 12, 8] as [number, number, number], // High up overhead
      rotation: [Math.PI/6, 0, 0] as [number, number, number],
      scale: [3.5, 3, 0.1] as [number, number, number]
    },
    {
      id: "art-7",
      title: "Virtual Visions",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      position: [20, 5, 0] as [number, number, number], // Far right side
      rotation: [0, -Math.PI/2, Math.PI/12] as [number, number, number],
      scale: [3, 4, 0.1] as [number, number, number]
    },
    {
      id: "art-8",
      title: "Data Streams",
      image: "https://images.unsplash.com/photo-1578662015879-be14ced36384?w=800&h=600&fit=crop",
      position: [-20, 6, 5] as [number, number, number], // Far left side
      rotation: [0, Math.PI/2, -Math.PI/12] as [number, number, number],
      scale: [3.8, 3.2, 0.1] as [number, number, number]
    }
  ];

  // Get studio-specific artists that appear in gallery view
  const getStudioArtists = () => {
    const studioAgentMap: { [key: string]: string } = {
      "leonardo-studio": "leonardo-ai",
      "raphael-studio": "raphael-ai", 
      "michelangelo-studio": "michelangelo-ai",
      "caravaggio-studio": "caravaggio-ai",
      "da-vinci-studio": "da-vinci-ai",
      "picasso-studio": "picasso-ai",
      "monet-studio": "monet-ai",
      "van-gogh-studio": "van-gogh-ai"
    };

    return [
      {
        id: `${studio.id}-ai-agent`,
        agentId: studioAgentMap[studio.id] || "leonardo-ai",
        position: [0, 0, 8] as [number, number, number],
        isActive: false
      }
    ];
  };

  const studioArtists = getStudioArtists();
  
  useFrame((state) => {
    if (galleryRef.current) {
      // Gentle ambient rotation
      galleryRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    
    if (particleRef.current) {
      particleRef.current.rotation.y += 0.001;
      particleRef.current.rotation.x += 0.0005;
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('🎨 Gallery loaded for studio:', studio.name);
    console.log('🖼️ Artworks to display:', realArtworks.length);
    realArtworks.forEach((art, i) => {
      console.log(`Art ${i + 1}: ${art.title} - ${art.image}`);
    });
    
    // Test the NightCafe URL specifically
    const testNightCafeUrl = async () => {
      try {
        console.log('🔍 Testing NightCafe URL via our proxy...');
        const proxyUrl = realArtworks[0].image; // This is now our proxy URL
        const response = await fetch(proxyUrl, { 
          method: 'HEAD'
        });
        console.log('✅ NightCafe proxy test result:', response.status, response.statusText);
        if (response.ok) {
          console.log('🎉 NightCafe image should load successfully!');
        } else {
          console.warn('⚠️ NightCafe proxy returned:', response.status);
        }
      } catch (error) {
        console.error('❌ NightCafe proxy test failed:', error);
      }
    };
    
    testNightCafeUrl();
  }, [studio.name]);

  return (
    <>
      {/* INSANE CYBERPUNK LIGHTING SYSTEM 🌈 */}
      <ambientLight intensity={0.3} color="#0a0a2e" />
      
      {/* MAIN GALLERY SPOTLIGHTS */}
      <directionalLight position={[0, 20, 0]} intensity={2} color="#ffffff" castShadow />
      <pointLight position={[0, 15, 0]} intensity={3} color="#00ffff" distance={50} />
      <pointLight position={[15, 10, 15]} intensity={2} color="#ff00ff" distance={40} />
      <pointLight position={[-15, 10, -15]} intensity={2} color="#ffff00" distance={40} />
      <pointLight position={[0, 25, 0]} intensity={4} color="#ffffff" distance={60} />
      
      {/* NEON ACCENT LIGHTS */}
      <spotLight position={[20, 15, 0]} target-position={[0, 0, 0]} angle={0.4} intensity={2} color="#D2691E" />
      <spotLight position={[-20, 15, 0]} target-position={[0, 0, 0]} angle={0.4} intensity={3} color="#ff0088" />
      <spotLight position={[0, 15, 20]} target-position={[0, 0, 0]} angle={0.4} intensity={3} color="#8800ff" />
      
      {/* CYBERPUNK FOG */}
      <fog attach="fog" args={["#000511", 20, 100]} />
      
      {/* SIMPLE GALLERY FLOOR - NO FLICKERING */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshLambertMaterial 
          color="#001122"
        />
      </mesh>

      {/* INSANE FLOATING ARTWORKS - VR STYLE */}
      <group ref={galleryRef}>
        {realArtworks.map((artwork, index) => (
          <FloatingArtwork 
            key={artwork.id} 
            artwork={artwork} 
            index={index} 
            studio={studio}
            onLightboxOpen={onLightboxOpen}
          />
        ))}
      </group>

      {/* CENTRAL STUDIO MONUMENT */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[0, 12, 0]}>
          {/* FLOATING CRYSTAL */}
          <mesh>
            <octahedronGeometry args={[2]} />
            <MeshTransmissionMaterial
              samples={32}
              resolution={1024}
              transmission={0.95}
              roughness={0}
              clearcoat={1}
              thickness={1}
              chromaticAberration={1.5}
              distortionScale={0.5}
              temporalDistortion={0.3}
              color="#00ffff"
            />
          </mesh>
          
          {/* STUDIO NAME HOLOGRAM */}
          <Html position={[0, 3, 0]} center>
            <div className="bg-black/95 backdrop-blur-xl text-cyan-400 px-8 py-4 rounded-2xl text-center border-2 border-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse">
              <div className="text-3xl font-bold text-white">{studio.name}</div>
              <div className="text-lg opacity-80">Virtual Gallery</div>
              <div className="text-sm text-purple-400 mt-2">Neural Art Exhibition</div>
            </div>
          </Html>
          
          {/* ENERGY RINGS */}
          {[3, 4, 5].map((radius, i) => (
            <mesh key={i} rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[radius, 0.1, 8, 32]} />
              <meshStandardMaterial
                color="#ffff00"
                emissive="#ffff00"
                emissiveIntensity={2}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </group>
      </Float>

      {/* Studio AI Agents - positioned in gallery */}
      {studioArtists.map((artist) => (
        <CyberpunkAgent
          key={artist.id}
          agentId={artist.agentId}
          position={artist.position}
          isActive={artist.isActive}
          onAgentClick={onArtistClick}
        />
      ))}

      {/* PARTICLE SYSTEMS */}
      <Sparkles count={500} scale={50} size={2} speed={0.5} color="#00ffff" />
      <Sparkles count={300} scale={30} size={1.5} speed={0.8} color="#ff00ff" />
      
      {/* FLOATING DATA STREAMS */}
      <group ref={particleRef}>
        {Array.from({length: 20}).map((_, i) => (
          <Float key={i} speed={1 + i * 0.1} rotationIntensity={0.2} floatIntensity={0.8}>
            <mesh position={[
              (Math.random() - 0.5) * 40,
              Math.random() * 20 + 5,
              (Math.random() - 0.5) * 40
            ]}>
              <sphereGeometry args={[0.2]} />
              <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={1.5}
                transparent
                opacity={0.8}
              />
            </mesh>
          </Float>
        ))}
      </group>

      {/* ENHANCED GALLERY CAMERA CONTROLS */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.05}
        maxDistance={60}
        minDistance={3}
        target={[0, 6, -2]}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 8}
      />
    </>
  );
} 