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
  Plane,
  Preload
} from "@react-three/drei";
import { useCityStore } from "@/lib/stores/use-city";
import { useAgents, ChatMessage } from "@/lib/stores/use-agents";
import * as THREE from "three";
import { CityUI } from "./city-ui";
// import { StudioBuilding } from "./components/StudioBuilding"; // Replaced with GLBStudio
import { CyberpunkAgent } from "./components/CyberpunkAgent";
import { RoamingArtist } from "./components/RoamingArtist";
import { StudioGallery } from "./components/StudioGallery";
import { CityEnvironment, CityGround } from "./components/CityEnvironment";
import { MovementController } from "./components/MovementController";
import { AgentBuildingHub, TradingMarketplace, LoadingFallback, MysteriousContraption } from "./components/CityStructures";
import { PastelHouse } from "./components/PastelHouse";
import { GLBStudio } from "./components/GLBStudio";
import { ExchangeBuilding, AgentBuilderHub } from "./components/GLBBuildings";
import { preloadAllGLBFiles, clearGLBCache, getGLBCacheSize } from "./components/GLBScaler";
import { useSearchParams } from "next/navigation";

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
  
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY EARLY RETURNS
  const { 
    studios, 
    currentGalleryStudio, 
    closeAllPinnedOverlays,
    initializeStudios,
  } = useCityStore();

  const { 
    agents, 
    fetchAgents, 
    chatWithAgent, 
    chatMessages, 
    chatLoading, 
    addChatMessage, 
    clearChatMessages 
  } = useAgents();

  // Add WebGL context loss state
  const [webglContextLost, setWebglContextLost] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Add a scene ready state to prevent premature loading
  const [sceneReady, setSceneReady] = useState(false);

  // URL parameter handling for agent focus
  const searchParams = useSearchParams();
  const focusAgentId = searchParams.get('agent');
  const shouldFocus = searchParams.get('focus') === 'true';
  const [agentFocusPosition, setAgentFocusPosition] = useState<[number, number, number] | null>(null);

  // UI STATES - moved to top
  const [showMinimap, setShowMinimap] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [lightboxData, setLightboxData] = useState<{ artwork: any; studio: any } | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

  console.log('🏛️ CityScene - Studios loaded:', studios?.length);
  console.log('🏛️ CityScene - Current gallery studio:', currentGalleryStudio);
  console.log('🏛️ CityScene - URL params:', { focusAgentId, shouldFocus });

  // Initialize studios and agents if they haven't been loaded yet
  useEffect(() => {
    const initializeData = async () => {
      try {
    if (studios.length === 0) {
      console.log('🏛️ Initializing studios...');
          await initializeStudios();
    }

    if (agents.length === 0) {
      console.log('🤖 Fetching agents...');
          await fetchAgents();
    }
    
    // Preload all GLB files to prevent flashing - but only once
    console.log('🔄 Preloading GLB files to prevent flashing...');
    preloadAllGLBFiles();

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('🚨 WebGL not supported - 3D scene may not load properly');
    } else {
      console.log('✅ WebGL support detected');
    }

        // Delay scene loading to prevent texture loading conflicts
        setTimeout(() => {
          console.log('✅ Scene initialization complete - enabling 3D scene');
          setSceneReady(true);
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error during scene initialization:', error);
        // Still enable scene even if there are errors
        setTimeout(() => setSceneReady(true), 2000);
      }
    };

    initializeData();

    // Monitor GLB cache size
    const monitorCache = setInterval(() => {
      const cacheSize = getGLBCacheSize();
      console.log(`📊 GLB Cache size: ${cacheSize} models`);
      // Only warn if cache gets extremely large (20+ models), but don't auto-clear
      if (cacheSize > 20) {
        console.warn('⚠️ GLB cache is very large, consider manual clearing if performance degrades');
      }
    }, 60000); // Check every 60 seconds instead of 30

    return () => {
      clearInterval(monitorCache);
      // Don't automatically clear cache on unmount - let it persist for better performance
      console.log('🏛️ CityScene unmounting, keeping GLB cache for faster reloads');
    };
  }, [studios.length, agents.length, initializeStudios, fetchAgents]);

  // Handle WebGL context loss and restoration
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      console.error('🚨 WebGL context lost!');
      event.preventDefault();
      setWebglContextLost(true);
    };

    const handleContextRestored = (event: Event) => {
      console.log('✅ WebGL context restored!');
      setWebglContextLost(false);
    };

    if (canvasRef.current) {
      canvasRef.current.addEventListener('webglcontextlost', handleContextLost);
      canvasRef.current.addEventListener('webglcontextrestored', handleContextRestored);
    }

    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('webglcontextlost', handleContextLost);
        canvasRef.current.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, []);

  // Transform real agents from API into city artists with positions
  const apiAgents = agents || [];
  console.log('🤖 Using real agents from API:', apiAgents.length, 'agents loaded');

  // Separate agents into assigned (to studios) and unassigned (roaming)
  const assignedAgentIds = new Set(
    studios.flatMap(studio => (studio as any).assigned_agents || [])
  );
  
  const unassignedAgents = apiAgents.filter(agent => 
    !assignedAgentIds.has(agent.agent_id || agent.id)
  );
  
  console.log('👥 Assigned agents:', assignedAgentIds.size);
  console.log('🌍 Unassigned (roaming) agents:', unassignedAgents.length);

  // Generate positions for unassigned agents - spread them around the city
  const generatePositions = (count: number) => {
    const positions: [number, number, number][] = [];
    const radius = 60; // Distance from center
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 20;
      positions.push([x, 0, z]);
    }
    return positions;
  };

  const agentPositions = generatePositions(unassignedAgents.length);

  // Transform API unassigned agents into roaming artists format
  const roamingArtists = unassignedAgents.map((agent, index) => ({
    id: agent.agent_id,
    name: agent.name,
    specialty: agent.specialty[0] || 'Digital Artist',
    position: agentPositions[index] || [0, 0, 0],
    color: `hsl(${(index * 137.5) % 360}, 70%, 60%)`, // Generate unique colors
    isAIAgent: true,
    avatar: agent.avatar,
    description: agent.description,
    stats: agent.stats,
    greeting: agent.identity?.display_name 
      ? `Hello! I'm ${agent.identity.display_name}, ${agent.description}. What would you like to create today?`
      : `Hi! I'm ${agent.name}. Let's explore the world of ${agent.specialty[0]} together!`
  }));

  console.log('🎨 Transformed roaming artists:', roamingArtists.length);

  // Handle agent focusing from URL parameters
  useEffect(() => {
    if (focusAgentId && shouldFocus && roamingArtists.length > 0) {
      const targetArtist = roamingArtists.find(artist => artist.id === focusAgentId);
      if (targetArtist) {
        console.log('🎯 Found target artist for focus:', targetArtist.name, targetArtist.position);
        setAgentFocusPosition(targetArtist.position);
        
        // Don't auto-select the artist - just position camera
        // User should manually click to interact
      } else {
        console.warn('⚠️ Agent not found for focusing:', focusAgentId);
      }
    }
  }, [focusAgentId, shouldFocus, roamingArtists]);

  // If WebGL context is lost, show recovery screen
  if (webglContextLost) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="bg-black/90 backdrop-blur-xl border border-yellow-400 rounded-xl p-8 text-yellow-400 font-mono text-center shadow-lg shadow-yellow-400/25 max-w-md">
          <div className="text-2xl font-bold mb-4">⚠️ GRAPHICS RESET</div>
          <div className="text-lg mb-4">WebGL Context Lost</div>
          <div className="text-sm opacity-70 mb-6">
            The 3D graphics context was lost, usually due to GPU memory issues. This can happen with complex 3D scenes.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-full"
          >
            🔄 Restart 3D Scene
          </button>
        </div>
      </div>
    );
  }

  // Handle artist interactions
  const handleArtistClick = (artist: any) => {
    console.log('🎨 Artist interaction:', artist);
    setSelectedArtist(artist);
    setIsChatMode(false);
    
    // Find corresponding agent from the API data
    const correspondingAgent = agents.find(agent => 
      agent.name.toLowerCase().includes(artist.name.toLowerCase()) ||
      agent.specialty.some(spec => spec.toLowerCase().includes(artist.specialty.toLowerCase()))
    );
    
    if (correspondingAgent) {
      setCurrentAgentId(correspondingAgent.agent_id);
      console.log('🎯 Found corresponding agent:', correspondingAgent.name, correspondingAgent.agent_id);
    } else {
      setCurrentAgentId(null);
      console.log('⚠️ No corresponding agent found for artist:', artist.name);
    }
    
    // Clear previous chat messages
    clearChatMessages();
    
    // Add initial greeting message
    const greeting: ChatMessage = {
      id: Date.now().toString(),
      sender: "agent",
      message: artist.isAIAgent && artist.greeting 
        ? artist.greeting 
        : `Hello! I'm ${artist.name}, a ${artist.specialty}. Welcome to Medici City! What would you like to know about art?`,
      timestamp: new Date(),
      agentId: correspondingAgent?.agent_id
    };
    
    addChatMessage(greeting);
  };

  // Handle sending chat messages with real API
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedArtist) return;

    // If we have a corresponding agent from the API, use real chat
    if (currentAgentId) {
      try {
        console.log('🚀 Sending message to agent:', currentAgentId);
        await chatWithAgent(currentAgentId, chatInput.trim());
        setChatInput("");
      } catch (error) {
        console.error('❌ Chat error:', error);
        // Error message is already added by the store
      }
    } else {
      // Fallback to mock chat for non-API artists
      const userMessage: ChatMessage = {
        id: Date.now().toString() + "user",
        sender: "user",
        message: chatInput.trim(),
        timestamp: new Date(),
        agentId: undefined
      };

      // Generate mock AI response
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

      const artistResponse: ChatMessage = {
        id: Date.now().toString() + "artist",
        sender: "agent",
        message: generateResponse(),
        timestamp: new Date(),
        agentId: undefined
      };

      addChatMessage(userMessage);
      addChatMessage(artistResponse);
      setChatInput("");
    }
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
  
  // Enhanced debugging for gallery mode issues
  console.log('🏛️ CityScene - Gallery Mode Debug:');
  console.log('  currentGalleryStudio:', currentGalleryStudio);
  console.log('  studios.length:', studios.length);
  console.log('  studios IDs:', studios.map(s => s.id));
  console.log('  currentStudio found:', currentStudio?.name || 'NOT FOUND');
  
  // Prevent gallery exit if studios haven't loaded yet but we have a gallery studio ID
  const shouldShowGallery = currentGalleryStudio !== null;
  
  console.log('🏛️ CityScene - About to render, shouldShowGallery:', shouldShowGallery, 'currentStudio:', currentStudio?.name || 'None (City mode)');
  
  // Custom camera component for agent focusing
  function FocusCamera({ focusPosition }: { focusPosition: [number, number, number] | null }) {
    const { camera } = useThree();
    
    useEffect(() => {
      if (focusPosition) {
        console.log('📸 Focusing camera on position:', focusPosition);
        // Position camera closer and at eye level for better interaction
        const [x, y, z] = focusPosition;
        camera.position.set(x + 3, y + 2, z + 3); // Closer to the agent
        camera.lookAt(x, y + 1, z); // Look at the agent's center
        camera.updateProjectionMatrix();
      }
    }, [focusPosition, camera]);
    
    return null;
  }

  return (
    <div className="w-full h-screen relative">
        <Canvas
          ref={canvasRef}
          camera={shouldShowGallery 
            ? { position: [0, 3, 8], fov: 60 } // Gallery mode: Positioned to watch the dancing robot, can turn to see art
            : { position: [0, 80, 120], fov: 75 } // City mode: High and far back for wide city view
          }
          shadows={{ type: THREE.PCFSoftShadowMap, enabled: true }}
          gl={{ 
            antialias: false, // Disable antialias to save memory
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0, // Reduced from 1.5 for better HDR
            outputColorSpace: THREE.SRGBColorSpace,
            // Add error handling and performance options
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
            stencil: false,
            depth: true,
            alpha: false,
            // Add context restoration
            logarithmicDepthBuffer: false, // Disable for better performance
          }}
          onClick={handleSceneClick}
          onCreated={(state) => {
            console.log('✅ Three.js Canvas created successfully');
            const gl = state.gl.getContext();
            console.log('🎮 WebGL Renderer info:', {
              vendor: gl.getParameter(gl.VENDOR),
              renderer: gl.getParameter(gl.RENDERER),
              version: gl.getParameter(gl.VERSION),
              maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
              maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
            });
            
            // Set up context loss handling
            state.gl.domElement.addEventListener('webglcontextlost', (event) => {
              console.error('🚨 WebGL context lost during render');
              event.preventDefault();
              setWebglContextLost(true);
            });
            
            state.gl.domElement.addEventListener('webglcontextrestored', () => {
              console.log('✅ WebGL context restored during render');
              setWebglContextLost(false);
            });
          }}
          onError={(error) => {
            console.error('🚨 Three.js Canvas error:', error);
            setWebglContextLost(true);
          }}
        >
        <Suspense fallback={<SimpleFallback />}>
          <ThreeErrorBoundary>
            {/* Custom camera focusing for agent URLs */}
            <FocusCamera focusPosition={agentFocusPosition} />
            
            {shouldShowGallery ? (
              // GALLERY MODE - Show 3D Studio Gallery
              currentStudio ? (
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
                // Show loading state while waiting for studios to load
                <SimpleFallback />
              )
            ) : (
              // CITY MODE - Show main cyberpunk city
              <>
                {/* ENHANCED LIGHTING AND ENVIRONMENT */}
                <CityEnvironment />
                
                {/* CITY GROUND */}
                <CityGround />
                
                {/* GLB STUDIOS - SPREAD OUT WITH AUTOMATIC SCALING */}
                {studios.map((studio, index) => {
                  // Available GLB files for studios - EXCLUDING exchange and agent builder buildings
                  const studioTypes = [
                    'https://siliconroads.com/hw_4_cyberpunk_sci-fi_building.glb',
                    'https://siliconroads.com/oriental_building.glb', 
                    'https://siliconroads.com/mushroom_house.glb',
                    'https://siliconroads.com/pastel_house.glb',
                    'https://siliconroads.com/cyberpunk_bar.glb',
                    'https://siliconroads.com/ams_s2.glb',
                    'https://siliconroads.com/the_neko_stop-off__-_hand-painted_diorama.glb',
                    'https://siliconroads.com/cyberpunk_robot.glb'
                  ];
                  
                  // Use the studio's actual position and rotation from API data
                  const glbFile = studioTypes[index % studioTypes.length];
                  const position = studio.position; // Use real position from API
                  const rotation = studio.rotation; // Use real rotation from API
                  
                  return (
                    <GLBStudio 
                      key={studio.id} 
                      studio={studio} 
                      glbFile={glbFile}
                      position={position}
                      rotation={rotation}
                    />
                  );
                })}
                
                {/* ROAMING ARTISTS - UNASSIGNED AGENTS GLIDING AROUND THE MAIN CITY 🎨👥 */}
                {roamingArtists.map((artist) => (
                  <RoamingArtist
                    key={artist.id}
                    artistId={artist.id}
                    name={artist.name}
                    specialty={artist.specialty}
                    initialPosition={artist.position}
                    color={artist.color}
                    onArtistClick={handleArtistClick}
                    isFocused={focusAgentId === artist.id && shouldFocus}
                  />
                ))}
                
                {/* STUDIO ARTISTS - ASSIGNED AGENTS NEAR THEIR RESPECTIVE STUDIOS 🏛️👨‍🎨 */}
                {studios
                  .filter(studio => studio.agent) // Only studios with assigned agents
                  .map((studio) => (
                    <RoamingArtist
                      key={`studio-artist-${studio.agent!.agent_id || studio.agent!.id}`}
                      artistId={studio.agent!.agent_id || studio.agent!.id}
                      name={studio.agent!.name || studio.studioData.name}
                      specialty={studio.agent!.specialty?.[0] || studio.studioData.art_style}
                      homeStudio={studio.studioData.name}
                      initialPosition={[
                        studio.position[0] + (Math.random() - 0.5) * 10,
                        studio.position[1] + 0.5,
                        studio.position[2] + (Math.random() - 0.5) * 10
                      ] as [number, number, number]}
                      color="#00ffff" // Cyan color for studio artists
                      onArtistClick={handleArtistClick}
                      isFocused={focusAgentId === (studio.agent!.agent_id || studio.agent!.id) && shouldFocus}
                    />
                  ))
                }

                {/* EMPTY PLATFORM INDICATORS FOR STUDIOS WITHOUT AGENTS */}
                {studios
                  .filter(studio => !studio.agent) // Only studios without assigned agents
                  .map((studio) => (
                    <group key={`empty-${studio.id}`} position={studio.position}>
                      {/* Empty platform visual indicator */}
                      <mesh position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[3, 3, 0.2, 16]} />
                        <meshLambertMaterial 
                          color="#444444" 
                          transparent 
                          opacity={0.6} 
                        />
                      </mesh>
                      
                      {/* Floating text indicating available studio */}
                      <Html position={[0, 2, 0]} center>
                        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-center text-sm pointer-events-none">
                          <div className="font-bold">{studio.studioData.name}</div>
                          <div className="text-xs opacity-70">Available Studio</div>
                          <div className="text-xs text-blue-400">{studio.studioData.theme}</div>
                        </div>
                      </Html>
                      
                      {/* Subtle ambient lighting for empty platforms */}
                      <pointLight
                        position={[0, 3, 0]}
                        intensity={0.5}
                        color="#4488ff"
                        distance={10}
                      />
                    </group>
                  ))
                }
                
                {/* ENHANCED CENTRAL PLAZA */}
                <MysteriousContraption />
                
                {/* NEW GLB FACILITIES - AUTOMATIC SCALING */}
                <ExchangeBuilding position={[0, 0, 140]} marketId="exchange1" />
                <AgentBuilderHub position={[120, 0, 0]} hubId="builder1" />
                
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
                          {msg.sender === 'agent' && selectedArtist.isAIAgent && selectedArtist.avatar && (
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
                                : msg.sender === 'system'
                                  ? 'bg-yellow-800 text-yellow-100 border border-yellow-400/30'
                                : selectedArtist.isAIAgent
                                  ? 'bg-gradient-to-r from-blue-800 to-purple-800 text-blue-100 border border-blue-400/30'
                                  : 'bg-gray-700 text-gray-100 border border-gray-600'
                            }`}
                          >
                            {msg.sender === 'agent' && selectedArtist.isAIAgent && (
                              <div className="text-xs text-blue-300 mb-1 font-semibold">{selectedArtist.name}</div>
                            )}
                            {/* Show assets if any */}
                            {msg.assets && Object.keys(msg.assets).length > 0 && (
                              <div className="mb-3">
                                {Object.entries(msg.assets).map(([assetId, assetInfo]: [string, any]) => (
                                  <div key={assetId} className="mb-2">
                                    {assetInfo.type === 'image' && (
                                      <div>
                                        <img 
                                          src={assetInfo.url} 
                                          alt={assetInfo.prompt} 
                                          className="max-w-full h-auto rounded-lg mb-2"
                                        />
                                        <p className="text-xs opacity-70">🎨 {assetInfo.prompt}</p>
                                      </div>
                                    )}
                                    {assetInfo.type === 'video' && (
                                      <div>
                                        <video 
                                          src={assetInfo.url} 
                                          controls 
                                          className="max-w-full h-auto rounded-lg mb-2"
                                        />
                                        <p className="text-xs opacity-70">🎬 {assetInfo.prompt}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-sm">{msg.message}</p>
                            {/* Show tools used if any */}
                            {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs opacity-70">🛠️ Tools: {msg.toolsUsed.join(', ')}</p>
                              </div>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show typing indicator when chat is loading */}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2 max-w-[80%]">
                          {selectedArtist.isAIAgent && selectedArtist.avatar && (
                            <img 
                              src={selectedArtist.avatar} 
                              alt={selectedArtist.name}
                              className="w-8 h-8 rounded-full object-cover border border-cyan-400"
                            />
                          )}
                          <div className="bg-gradient-to-r from-blue-800 to-purple-800 text-blue-100 border border-blue-400/30 p-3 rounded-lg">
                            <div className="flex items-center space-x-1">
                              <div className="text-xs text-blue-300 mb-1 font-semibold">{selectedArtist.name}</div>
                            </div>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                        disabled={chatLoading}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || chatLoading}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <span className="mr-1">📤</span>
                        {chatLoading ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {selectedArtist.isAIAgent && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button 
                          onClick={() => setChatInput("What can you teach me about your artistic style?")}
                          disabled={chatLoading}
                          className="text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          💭 Ask about style
                        </button>
                        <button 
                          onClick={() => setChatInput("Can you analyze this artwork for me?")}
                          disabled={chatLoading}
                          className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🔍 Analyze art
                        </button>
                        <button 
                          onClick={() => setChatInput("What techniques would you recommend for beginners?")}
                          disabled={chatLoading}
                          className="text-xs bg-green-600/30 hover:bg-green-600/50 text-green-200 px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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