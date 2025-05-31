"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  Environment, 
  Html,
  Sparkles,
  Stars,
  Cloud,
  Sky,
  Float,
  ContactShadows,
  Sphere,
  RoundedBox,
  Text3D,
  MeshTransmissionMaterial,
  MeshReflectorMaterial,
  PointerLockControls,
  useTexture,
  Box,
  Plane
} from "@react-three/drei";
import { useCityStore } from "@/lib/stores/use-city";
import * as THREE from "three";
import { CityUI } from "./city-ui";
import { StudioBuilding } from "./components/StudioBuilding";
import { CyberpunkAgent } from "./components/CyberpunkAgent";
import { RoamingArtist } from "./components/RoamingArtist";
import { StudioGallery } from "./components/StudioGallery";
import { CityEnvironment, CityGround } from "./components/CityEnvironment";
import { MovementController } from "./components/MovementController";
import { CyberpunkPlaza, AgentBuildingHub, TradingMarketplace, LoadingFallback } from "./components/CityStructures";
import { PastelHouse } from "./components/PastelHouse";

// Module-level variable to track building clicks
let lastBuildingClickTime = 0;
let buildingInteractionActive = false; // New flag to prevent scene clicks during building interactions

// Simple fallback component that doesn't use Three.js
const SimpleFallback = () => (
  <Html center>
    <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-8 text-cyan-400 font-mono text-center shadow-lg shadow-cyan-400/25">
      <div className="text-2xl font-bold mb-4">🏛️ MEDICI CITY</div>
      <div className="text-lg mb-2">Loading Virtual Art Gallery...</div>
      <div className="text-sm opacity-70">Initializing 3D Environment</div>
      <div className="mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
        </div>
          </div>
        </Html>
);

// Error Boundary Component for Three.js
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ThreeErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Three.js Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
  return (
    <Html center>
          <div className="bg-red-900/90 backdrop-blur-xl border border-red-400 rounded-xl p-8 text-red-400 font-mono text-center shadow-lg shadow-red-400/25">
            <div className="text-2xl font-bold mb-4">⚠️ 3D ERROR</div>
            <div className="text-lg mb-2">Something went wrong with the 3D scene</div>
            <div className="text-sm opacity-70">Please refresh the page</div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
      </div>
    </Html>
  );
}

    return this.props.children;
  }
}

export function CityScene() {
  console.log('🏛️ CityScene component starting to load...');
  
  const { 
    studios, 
    currentGalleryStudio, 
    closeAllPinnedOverlays,
    initializeStudios
  } = useCityStore();

  console.log('🏛️ CityScene - Studios loaded:', studios?.length);
  console.log('🏛️ CityScene - Current gallery studio:', currentGalleryStudio);

  // Initialize studios if they haven't been loaded yet
  useEffect(() => {
    if (studios.length === 0) {
      console.log('🏛️ Initializing studios...');
      initializeStudios();
    }
  }, [studios.length, initializeStudios]);

  // Define roaming artists data directly
  const roamingArtists = [
    {
      id: "maya-chen",
      name: "Maya Chen",
      specialty: "Digital Painter",
      position: [20, 0, 15] as [number, number, number],
      color: "#ff6b6b"
    },
    {
      id: "alex-rivera",
      name: "Alex Rivera", 
      specialty: "3D Sculptor",
      position: [-15, 0, 25] as [number, number, number],
      color: "#4ecdc4"
    },
    {
      id: "jordan-kim",
      name: "Jordan Kim",
      specialty: "AI Collaborator", 
      position: [30, 0, -20] as [number, number, number],
      color: "#45b7d1"
    },
    {
      id: "sam-torres",
      name: "Sam Torres",
      specialty: "Pixel Artist",
      position: [-25, 0, -10] as [number, number, number],
      color: "#96ceb4"
    },
    {
      id: "riley-patel",
      name: "Riley Patel",
      specialty: "Mixed Media",
      position: [10, 0, 35] as [number, number, number],
      color: "#feca57"
    },
    {
      id: "casey-wong",
      name: "Casey Wong",
      specialty: "Concept Artist",
      position: [-35, 0, 5] as [number, number, number],
      color: "#ff9ff3"
    },
    {
      id: "avery-smith",
      name: "Avery Smith",
      specialty: "Animation",
      position: [25, 0, -35] as [number, number, number],
      color: "#54a0ff"
    },
    {
      id: "taylor-brown",
      name: "Taylor Brown",
      specialty: "VR Designer",
      position: [-20, 0, -30] as [number, number, number],
      color: "#5f27cd"
    },
    {
      id: "morgan-davis",
      name: "Morgan Davis",
      specialty: "NFT Creator",
      position: [40, 0, 10] as [number, number, number],
      color: "#00d2d3"
    },
    {
      id: "quinn-lee",
      name: "Quinn Lee",
      specialty: "Generative Art",
      position: [-10, 0, 40] as [number, number, number],
      color: "#ff6348"
    }
  ];

  // Define studio artists data directly
  const studioArtists = [
    {
      id: "leonardo-assistant",
      name: "Marco Benedetti",
      specialty: "Renaissance Techniques",
      homeStudio: "Leonardo Studio",
      position: [-38, 0, -28] as [number, number, number],
      color: "#8B4513"
    },
    {
      id: "raphael-assistant", 
      name: "Sofia Angelico",
      specialty: "Classical Harmony",
      homeStudio: "Raphael Studio",
      position: [47, 0, -23] as [number, number, number],
      color: "#4169E1"
    },
    {
      id: "michelangelo-assistant",
      name: "Giovanni Marmo",
      specialty: "Stone & Digital",
      homeStudio: "Michelangelo Studio", 
      position: [2, 0, 52] as [number, number, number],
      color: "#DC143C"
    },
    {
      id: "caravaggio-assistant",
      name: "Lucia Ombra",
      specialty: "Light & Shadow",
      homeStudio: "Caravaggio Studio",
      position: [-33, 0, 37] as [number, number, number],
      color: "#8A2BE2"
    },
    {
      id: "da-vinci-assistant",
      name: "Alessandro Inventore",
      specialty: "Innovation & Art",
      homeStudio: "Da Vinci Studio",
      position: [42, 0, 32] as [number, number, number],
      color: "#D2691E"
    },
    {
      id: "picasso-assistant",
      name: "Pablo Fragmento",
      specialty: "Cubist Revolution",
      homeStudio: "Picasso Studio",
      position: [-58, 0, 2] as [number, number, number],
      color: "#696969"
    },
    {
      id: "monet-assistant",
      name: "Claude Lumière",
      specialty: "Impressionist Light",
      homeStudio: "Monet Studio",
      position: [27, 0, -43] as [number, number, number],
      color: "#98FB98"
    },
    {
      id: "van-gogh-assistant",
      name: "Vincent Spirale",
      specialty: "Expressive Energy",
      homeStudio: "Van Gogh Studio",
      position: [-23, 0, -38] as [number, number, number],
      color: "#FFD700"
    }
  ];

  // UI State
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ artwork: any; studio: any } | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'artist';
    message: string;
    timestamp: Date;
  }>>([]);
  const [chatInput, setChatInput] = useState("");

  // Handle artist interactions
  const handleArtistClick = (artist: any) => {
    console.log('🎨 Artist interaction:', artist);
    setSelectedArtist(artist);
    setIsChatMode(false);
    setChatMessages([
      {
        id: Date.now().toString(),
        sender: "artist" as const,
        message: artist.isAIAgent && artist.greeting 
          ? artist.greeting 
          : `Hello! I'm ${artist.name}, a ${artist.specialty}. Welcome to Medici City! What would you like to know about art?`,
        timestamp: new Date()
      }
    ]);
  };

  // Handle sending chat messages
  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedArtist) return;

    const userMessage = {
      id: Date.now().toString() + "user",
      sender: "user" as const,
      message: chatInput.trim(),
      timestamp: new Date()
    };

    // Generate AI response based on artist type and specialty
    const generateResponse = () => {
      if (selectedArtist.type === "AI Assistant") {
        return `As an AI curator, I can tell you about the artworks here, the history of this ${selectedArtist.isActive ? "active studio" : "gallery space"}, or help you navigate the virtual experience. What interests you most?`;
        } else {
        const responses = [
          `That's a great question! As a ${selectedArtist.specialty}, I find inspiration in the intersection of traditional techniques and digital innovation.`,
          `You know, working ${selectedArtist.homeStudio ? `at ${selectedArtist.homeStudio}` : "as an independent artist"} has really shaped my perspective on art in the digital age.`,
          `I'd love to show you some of my techniques! Have you tried experimenting with ${selectedArtist.specialty.toLowerCase()} yourself?`,
          `The beauty of Medici City is how we can all learn from each other. What kind of art speaks to you most?`,
          `Technology has revolutionized how we create, but the human touch in art will always be irreplaceable. What do you think?`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    };

    const artistResponse = {
      id: Date.now().toString() + "artist",
      sender: "artist" as const,
      message: generateResponse(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage, artistResponse]);
    setChatInput("");
  };
  
  // Close pinned overlays when clicking outside - but not immediately after building clicks
  const handleSceneClick = (e: any) => {
    // Don't close if building interaction is active
    if ((globalThis as any).buildingInteractionActive) {
      console.log('  ❌ NOT closing overlays - building interaction is active');
      return;
    }

    const timeSinceLastBuildingClick = Date.now() - lastBuildingClickTime;
    console.log('🌍 Scene clicked - checking if should close overlays');
    console.log('  Time since last building click:', timeSinceLastBuildingClick, 'ms');
    
    // Don't close panels if a building was clicked recently (within 500ms) 
    if (timeSinceLastBuildingClick < 500) {
      console.log('  ❌ NOT closing overlays - building was clicked recently');
      return;
    }
    
    // Also check if we have any pinned panels - only close if something is actually pinned
    const { pinnedAgentHub, pinnedMarketplace } = useCityStore.getState();
    if (!pinnedAgentHub && !pinnedMarketplace) {
      console.log('  ❌ NOT closing overlays - no panels are pinned');
      return;
    }
    
    console.log('  ✅ Will call closeAllPinnedOverlays');
    closeAllPinnedOverlays();
  };

  // Find the current studio if in gallery mode
  const currentStudio = currentGalleryStudio ? studios.find(s => s.id === currentGalleryStudio) : null;
  
  console.log('🏛️ CityScene - About to render, currentStudio:', currentStudio?.name || 'None (City mode)');
  
  return (
    <div className="w-full h-screen relative">
      {/* CLOSEABLE CONTROL HINT */}
      {controlsVisible && (
        <div 
          className="absolute top-4 left-4 z-10"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {!showControls ? (
            <div className="bg-black/60 backdrop-blur-sm border border-cyan-400/50 rounded-lg px-3 py-2 text-cyan-400 font-mono text-sm cursor-pointer hover:bg-black/80 transition-all flex items-center gap-2">
              🎮 Controls
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setControlsVisible(false);
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded px-1 text-xs font-bold transition-all"
                title="Close controls"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="bg-black/90 backdrop-blur-xl border border-cyan-400 rounded-xl p-4 text-cyan-400 font-mono animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">🎮 MEDICI CITY</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setControlsVisible(false);
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded px-2 py-1 text-sm font-bold transition-all"
                  title="Close controls"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm space-y-1">
                <div>WASD / Arrow Keys: Move</div>
                <div>Shift: Run</div>
                <div>Space: Jump</div>
                <div className="text-yellow-400 font-bold">V: Toggle First/Third Person</div>
                <div className="text-green-400 font-bold">Mouse Wheel: Zoom</div>
                <div className="text-green-400">+/- Keys: Keyboard Zoom</div>
                <div className="text-pink-400 font-bold">Click Buildings to Interact!</div>
                <div className="text-orange-400 text-xs mt-2">Studios are spread across the vast city!</div>
              </div>
            </div>
          )}
        </div>
      )}

        <Canvas
          camera={{ position: [15, 25, 25], fov: 85 }} // Higher position and wider FOV for spread-out city
          shadows={{ type: THREE.PCFSoftShadowMap, enabled: true }}
          gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.5,
            outputColorSpace: THREE.SRGBColorSpace
          }}
          onClick={handleSceneClick}
        >
        <Suspense fallback={<SimpleFallback />}>
          <ThreeErrorBoundary>
            {currentStudio ? (
              // GALLERY MODE - Show 3D Studio Gallery
              <StudioGallery 
                studio={currentStudio} 
                onLightboxOpen={(artwork, studio) => {
                  console.log('🖼️ Lightbox triggered:', { artwork, studio });
                  if (artwork && studio) {
                    setLightboxData({ artwork, studio });
                  } else {
                    console.error('❌ Invalid lightbox data:', { artwork, studio });
                  }
                }}
                onArtistClick={handleArtistClick}
              />
            ) : (
              // CITY MODE - Show main cyberpunk city
              <>
                {/* ENHANCED LIGHTING AND ENVIRONMENT */}
                <CityEnvironment />
                
                {/* CITY GROUND */}
                <CityGround />
                
                {/* SPREAD-OUT STUDIOS */}
                {studios.map((studio) => (
                  <StudioBuilding key={studio.id} studio={studio} />
                ))}
                
                {/* ROAMING ARTISTS - GLIDING AROUND THE MAIN CITY 🎨👥 */}
                {roamingArtists.map((artist) => (
                  <RoamingArtist
                    key={artist.id}
                    artistId={artist.id}
                    name={artist.name}
                    specialty={artist.specialty}
                    initialPosition={artist.position}
                    color={artist.color}
                    onArtistClick={handleArtistClick}
                  />
                ))}
                
                {/* STUDIO ARTISTS - NEAR THEIR RESPECTIVE STUDIOS 🏛️👨‍🎨 */}
                {studioArtists.map((artist) => (
                  <RoamingArtist
                    key={artist.id}
                    artistId={artist.id}
                    name={artist.name}
                    specialty={artist.specialty}
                    homeStudio={artist.homeStudio}
                    initialPosition={artist.position}
                    color={artist.color}
                    onArtistClick={handleArtistClick}
                  />
                ))}
                
                {/* ENHANCED CENTRAL PLAZA */}
                <CyberpunkPlaza />
                
                {/* REPOSITIONED FACILITIES FOR BETTER SPACING */}
                <AgentBuildingHub position={[80, 0, 80]} hubId="hub1" />
                <TradingMarketplace position={[0, 5, 120]} marketId="market1" />
                
                {/* PASTEL HOUSES - RESIDENTIAL DISTRICT */}
                <PastelHouse position={[30, 0, 30]} scale={3} rotation={[0, 0, 0]} />
                <PastelHouse position={[-40, 0, 25]} scale={2.5} rotation={[0, Math.PI / 2, 0]} />
                <PastelHouse position={[60, 0, -20]} scale={3.2} rotation={[0, Math.PI, 0]} />
                <PastelHouse position={[-25, 0, -35]} scale={2.8} rotation={[0, -Math.PI / 3, 0]} />
                <PastelHouse position={[15, 0, 65]} scale={2.6} rotation={[0, Math.PI / 4, 0]} />
                <PastelHouse position={[-60, 0, -15]} scale={3.1} rotation={[0, Math.PI / 6, 0]} />
                <PastelHouse position={[45, 0, 50]} scale={2.9} rotation={[0, -Math.PI / 4, 0]} />
                <PastelHouse position={[-15, 0, 70]} scale={2.7} rotation={[0, Math.PI * 1.5, 0]} />
                
                {/* ENHANCED MOVEMENT CONTROLLER */}
                <MovementController />
              </>
            )}
          </ThreeErrorBoundary>
          </Suspense>
        </Canvas>
      
      {/* CITY UI OVERLAY - Map, Studio Info, Controls */}
      <CityUI />

      {/* CENTERED LIGHTBOX - COMPLETELY OUTSIDE OF THREE.JS */}
      {lightboxData && lightboxData.artwork && lightboxData.studio && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9999] animate-in fade-in duration-300"
          onClick={() => setLightboxData(null)}
        >
          {/* Close button - positioned at very top */}
          <button 
            onClick={() => setLightboxData(null)}
            className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors z-10 bg-black/70 rounded-full p-3 border border-red-400/50 hover:border-red-400"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Container for image and info side by side */}
          <div className="w-full max-w-[95vw] flex items-center justify-center gap-8">
            {/* Full-size image - Left side */}
            <div className="flex-shrink-0">
              {lightboxData.artwork.image && (
                <img 
                  src={lightboxData.artwork.image} 
                  alt={lightboxData.artwork.title || 'Artwork'}
                  className="max-w-[60vw] max-h-[80vh] object-contain rounded-lg shadow-2xl border-4 border-cyan-400 shadow-cyan-400/50"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
            
            {/* Image info - Right side */}
            <div className="flex-shrink-0 max-w-[30vw] text-left bg-black/90 backdrop-blur-xl rounded-2xl px-8 py-8 border-2 border-cyan-400/70 shadow-lg shadow-cyan-400/30">
              <h2 className="text-4xl font-bold text-white mb-4">{lightboxData.artwork.title || 'Untitled Artwork'}</h2>
              <p className="text-cyan-400 text-xl mb-3">Studio: {lightboxData.studio.name || 'Unknown Studio'}</p>
              <p className="text-purple-400 text-lg mt-4 font-medium">Neural Art Exhibition - MEDICI CITY</p>
              {lightboxData.artwork.title && lightboxData.artwork.title.includes('NIGHTCAFE') && (
                <p className="text-yellow-400 text-xl mt-4 font-bold">🎨 Your Personal NightCafe Creation</p>
              )}
              
              {/* Gallery link button */}
              <div className="mt-8 space-y-4">
                <button 
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors cursor-pointer shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxData(null);
                  }}
                >
                  🏛️ Back to Gallery
                </button>
                
                <div className="text-gray-400 text-sm text-center">
                  Click outside to close
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTIST INFORMATION PANEL WITH CHAT 🎨👤💬 */}
      {selectedArtist && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[9998] animate-in fade-in duration-300"
          onClick={() => setSelectedArtist(null)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-cyan-400/70 rounded-2xl max-w-4xl w-full mx-4 shadow-2xl shadow-cyan-400/25 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header for AI Agents */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-6">
                {/* AI Agent Avatar */}
                {selectedArtist.isAIAgent && selectedArtist.avatar ? (
                  <div className="relative">
                    <img 
                      src={selectedArtist.avatar} 
                      alt={selectedArtist.name}
                      className="w-20 h-20 rounded-full object-cover border-4 shadow-lg border-cyan-400"
                      style={{ boxShadow: `0 0 25px ${selectedArtist.color || '#00ffff'}80` }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
                      <span className="text-xs">🤖</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg"
                    style={{ 
                      backgroundColor: selectedArtist.color,
                      borderColor: selectedArtist.color,
                      boxShadow: `0 0 25px ${selectedArtist.color}50`
                    }}
                  >
                    <span className="text-3xl">{selectedArtist.type === "AI Agent" ? "🤖" : "🎨"}</span>
                  </div>
                )}
                
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white">{selectedArtist.name}</h2>
                  <p className="text-cyan-400 text-xl">{selectedArtist.specialty}</p>
                  {selectedArtist.personality && (
                    <p className="text-purple-400 text-sm">Personality: {selectedArtist.personality}</p>
                  )}
                  {selectedArtist.experience && (
                    <p className="text-yellow-400 text-sm">Experience: {selectedArtist.experience}</p>
                  )}
                  {selectedArtist.homeStudio && !selectedArtist.isAIAgent && (
                    <p className="text-green-400 text-sm">📍 {selectedArtist.homeStudio}</p>
                  )}
                  {selectedArtist.isAIAgent && (
                    <p className="text-cyan-300 text-sm">🤖 Advanced AI Gallery Curator</p>
                  )}
                </div>
              </div>
              
              {/* Mode Toggle Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsChatMode(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !isChatMode 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {selectedArtist.isAIAgent ? '📊 Profile' : 'ℹ️ Info'}
                </button>
                <button
                  onClick={() => setIsChatMode(true)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isChatMode 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  💬 Chat
                </button>
                <button 
                  onClick={() => setSelectedArtist(null)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded px-3 py-2 font-bold transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              {!isChatMode ? (
                // Enhanced Info Mode - Different for AI Agents
                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                  {selectedArtist.isAIAgent ? (
                    // AI Agent Profile Layout
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Stats and Info */}
                      <div className="space-y-4">
                        {/* AI Agent Description */}
                        <div className="bg-black/50 rounded-lg p-4 border border-cyan-400/30">
                          <h3 className="text-white font-semibold mb-2 flex items-center">
                            <span className="mr-2">🤖</span>
                            AI Agent Profile
                          </h3>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {selectedArtist.description}
                          </p>
                        </div>

                        {/* AI Capabilities Stats */}
                        {selectedArtist.stats && (
                          <div className="bg-black/50 rounded-lg p-4 border border-cyan-400/30">
                            <h3 className="text-white font-semibold mb-3 flex items-center">
                              <span className="mr-2">📊</span>
                              AI Capabilities
                            </h3>
                            <div className="space-y-3">
                              {Object.entries(selectedArtist.stats).map(([stat, value]) => (
                                <div key={stat} className="flex items-center justify-between">
                                  <span className="text-gray-300 text-sm">{stat}</span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${value as number}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-cyan-400 text-sm font-bold w-8 text-right">{value as number}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column - Interactive Features */}
                      <div className="space-y-4">
                        {/* Greeting Message */}
                        {selectedArtist.greeting && (
                          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-4 border border-blue-400/30">
                            <h3 className="text-white font-semibold mb-2 flex items-center">
                              <span className="mr-2">💬</span>
                              AI Greeting
                            </h3>
                            <p className="text-blue-200 text-sm italic leading-relaxed">
                              "{selectedArtist.greeting}"
                            </p>
                          </div>
                        )}

                        {/* AI Features */}
                        <div className="bg-black/50 rounded-lg p-4 border border-purple-400/30">
                          <h3 className="text-white font-semibold mb-3 flex items-center">
                            <span className="mr-2">⚡</span>
                            AI Features
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center text-green-400 text-sm">
                              <span className="mr-2">✓</span>
                              Real-time art analysis
                            </div>
                            <div className="flex items-center text-green-400 text-sm">
                              <span className="mr-2">✓</span>
                              Interactive Q&A
                            </div>
                            <div className="flex items-center text-green-400 text-sm">
                              <span className="mr-2">✓</span>
                              Technique tutorials
                            </div>
                            <div className="flex items-center text-green-400 text-sm">
                              <span className="mr-2">✓</span>
                              Art history insights
                            </div>
                            <div className="flex items-center text-green-400 text-sm">
                              <span className="mr-2">✓</span>
                              Personalized recommendations
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-black/50 rounded-lg p-4 border border-yellow-400/30">
                          <h3 className="text-white font-semibold mb-3 flex items-center">
                            <span className="mr-2">🎯</span>
                            Quick Actions
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-3 rounded transition-colors">
                              🎨 Analyze Art
                            </button>
                            <button className="bg-green-600 hover:bg-green-500 text-white text-xs py-2 px-3 rounded transition-colors">
                              📚 Learn Techniques
                            </button>
                            <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 px-3 rounded transition-colors">
                              🏛️ Gallery Tour
                            </button>
                            <button className="bg-orange-600 hover:bg-orange-500 text-white text-xs py-2 px-3 rounded transition-colors">
                              💡 Get Inspired
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular Artist Profile Layout
                    <div className="space-y-4">
                      <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                        <h3 className="text-white font-semibold mb-2 flex items-center">
                          <span className="mr-2">🎯</span>
                          Artist Type
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {selectedArtist.homeStudio 
                            ? 'Studio Artist - Works closely with the studio, specializing in collaborative projects and mentoring.' 
                            : 'Independent Artist - Roams the city freely, bringing fresh perspectives and cross-pollination of ideas between studios.'
                          }
                        </p>
                      </div>

                      <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                        <h3 className="text-white font-semibold mb-2 flex items-center">
                          <span className="mr-2">✨</span>
                          Artistic Philosophy
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {(() => {
                            const specialty = selectedArtist.specialty;
                            if (specialty === "Digital Painter") return "Bridges traditional painting techniques with cutting-edge digital tools, creating works that honor the past while embracing the future.";
                            if (specialty === "3D Sculptor") return "Transforms virtual clay into digital masterpieces, pushing the boundaries of form and space in three-dimensional art.";
                            if (specialty === "AI Collaborator") return "Partners with artificial intelligence to create unprecedented artworks, exploring the symbiosis between human creativity and machine learning.";
                            if (specialty === "Pixel Artist") return "Masters the art of digital minimalism, creating complex narratives and emotions through carefully placed pixels.";
                            if (specialty === "Mixed Media") return "Combines traditional and digital techniques, creating hybrid artworks that transcend medium boundaries.";
                            if (specialty === "Concept Artist") return "Visualizes ideas and dreams, bringing abstract concepts to life through detailed artistic exploration.";
                            if (specialty === "Animation") return "Brings static art to life, creating moving poetry that tells stories through motion and time.";
                            if (specialty === "VR Designer") return "Crafts immersive virtual worlds, designing experiences that transport viewers into entirely new realities.";
                            if (specialty === "NFT Creator") return "Pioneers the intersection of art and blockchain technology, creating unique digital assets with provable ownership.";
                            if (specialty === "Generative Art") return "Programs creativity itself, designing algorithms that generate infinite unique artworks.";
                            if (specialty.includes("Renaissance")) return "Honors the classical traditions while incorporating modern digital techniques, bridging centuries of artistic evolution.";
                            if (specialty.includes("Classical")) return "Maintains the timeless principles of beauty and proportion while adapting them for the digital age.";
                            if (specialty.includes("Stone")) return "Translates the ancient art of sculpture into the digital realm, maintaining the soul of stone in virtual marble.";
                            if (specialty.includes("Light")) return "Masters the interplay of illumination and shadow, creating dramatic narratives through contrast.";
                            if (specialty.includes("Innovation")) return "Constantly pushes the boundaries of what's possible, inventing new techniques and approaches to art.";
                            return "A unique artistic voice contributing to the rich tapestry of Medici City's creative community.";
                          })()
                        }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => setIsChatMode(true)}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <span className="mr-2">💬</span>
                      {selectedArtist.isAIAgent ? 'Start AI Conversation' : 'Start Conversation'}
                    </button>
                    
                    {selectedArtist.homeStudio && !selectedArtist.isAIAgent && (
                      <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                        <span className="mr-2">🏛️</span>
                        Visit {selectedArtist.homeStudio}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Enhanced Chat Mode
                <div className="flex flex-col h-[60vh]">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex items-start space-x-2 max-w-[80%]">
                          {msg.sender === 'artist' && selectedArtist.isAIAgent && selectedArtist.avatar && (
                            <img 
                              src={selectedArtist.avatar} 
                              alt={selectedArtist.name}
                              className="w-8 h-8 rounded-full object-cover border border-cyan-400"
                            />
                          )}
                          <div
                            className={`p-3 rounded-lg ${
                              msg.sender === 'user'
                                ? 'bg-cyan-600 text-white'
                                : selectedArtist.isAIAgent
                                  ? 'bg-gradient-to-r from-blue-800 to-purple-800 text-blue-100 border border-blue-400/30'
                                  : 'bg-gray-700 text-gray-100 border border-gray-600'
                            }`}
                          >
                            {msg.sender === 'artist' && selectedArtist.isAIAgent && (
                              <div className="text-xs text-blue-300 mb-1 font-semibold">{selectedArtist.name}</div>
                            )}
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Chat Input */}
                  <div className="border-t border-white/10 p-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={selectedArtist.isAIAgent 
                          ? `Ask ${selectedArtist.name} about art, techniques, or anything creative...`
                          : `Message ${selectedArtist.name}...`
                        }
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <span className="mr-1">📤</span>
                        Send
                      </button>
                    </div>
                    {selectedArtist.isAIAgent && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button 
                          onClick={() => setChatInput("What can you teach me about your artistic style?")}
                          className="text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 px-3 py-1 rounded-full transition-colors"
                        >
                          💭 Ask about style
                        </button>
                        <button 
                          onClick={() => setChatInput("Can you analyze this artwork for me?")}
                          className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-3 py-1 rounded-full transition-colors"
                        >
                          🔍 Analyze art
                        </button>
                        <button 
                          onClick={() => setChatInput("What techniques would you recommend for beginners?")}
                          className="text-xs bg-green-600/30 hover:bg-green-600/50 text-green-200 px-3 py-1 rounded-full transition-colors"
                        >
                          🎓 Learn techniques
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 