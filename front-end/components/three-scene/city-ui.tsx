"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCityStore } from "@/lib/stores/use-city";
import { useAgents } from "@/lib/stores/use-agents";
import { 
  Map, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Play, 
  Pause, 
  Info,
  ArrowLeft,
  Sparkles,
  Camera
} from "lucide-react";

export function CityUI() {
  const {
    studios,
    activeStudio,
    hoveredStudio,
    pinnedAgentHub,
    pinnedMarketplace,
    hoveredAgentHub,
    hoveredMarketplace,
    showMinimap,
    showUI,
    tourMode,
    toggleMinimap,
    toggleUI,
    startTour,
    stopTour,
    moveToStudio,
    setCameraPosition,
    setCameraTarget,
    enterGalleryMode
  } = useCityStore();
  
  const { agents, fetchAgents } = useAgents();
  
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);
  
  // Initialize studios when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && studios.length === 0) {
      console.log('🏛️ CityUI: Agents loaded, initializing studios...', agents.length);
      const { loadStudiosFromAPI } = useCityStore.getState();
      loadStudiosFromAPI();
    }
  }, [agents.length, studios.length]);
  
  // Enhanced Debug: Log state changes with more detail
  useEffect(() => {
    console.log('🔍 CityUI Enhanced Debug:');
    console.log('  📍 pinnedAgentHub:', pinnedAgentHub);
    console.log('  👆 hoveredAgentHub:', hoveredAgentHub);
    console.log('  📍 pinnedMarketplace:', pinnedMarketplace);
    console.log('  👆 hoveredMarketplace:', hoveredMarketplace);
    console.log('  🎯 showAgentHub:', !!(pinnedAgentHub || hoveredAgentHub));
    console.log('  🎯 showMarketplace:', !!(pinnedMarketplace || hoveredMarketplace));
    console.log('  🏛️ studios loaded:', studios.length);
    console.log('  🗺️ showMinimap:', showMinimap);
  }, [pinnedAgentHub, hoveredAgentHub, pinnedMarketplace, hoveredMarketplace, studios.length, showMinimap]);
  
  const activeStudioData = studios.find(s => s.id === activeStudio);
  const hoveredStudioData = studios.find(s => s.id === hoveredStudio);
  const displayStudio = activeStudioData || hoveredStudioData;
  
  // Agent Hub and Marketplace display logic - show on hover OR pin
  const showAgentHub = pinnedAgentHub || hoveredAgentHub;
  const showMarketplace = pinnedMarketplace || hoveredMarketplace;
  
  // Additional debug logging for show states
  useEffect(() => {
    console.log('🎯 Panel Display States:');
    console.log('  Agent Hub Panel:', showAgentHub ? 'VISIBLE' : 'HIDDEN');
    console.log('  Marketplace Panel:', showMarketplace ? 'VISIBLE' : 'HIDDEN');
  }, [showAgentHub, showMarketplace]);
  
  const getAgentForStudio = (studioAgentId: string) => {
    return agents.find(agent => agent.id === studioAgentId);
  };
  
  const resetCamera = () => {
    setCameraPosition([0, 15, 25]);
    setCameraTarget([0, 0, 0]);
  };
  
  if (!showUI && !tourMode) return null;
  
  return (
    <>
      {/* Enhanced top control bar with glassmorphism */}
      <div className="absolute top-20 left-4 right-4 z-10 flex justify-between items-start">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="backdrop-blur-md bg-black/20 border-white/20 text-white hover:bg-white/10 transition-all duration-300 shadow-lg"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit City
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMinimap}
            className="backdrop-blur-md bg-black/20 border-white/20 text-white hover:bg-white/10 transition-all duration-300 shadow-lg"
          >
            <Map className="h-4 w-4 mr-2" />
            {showMinimap ? "Hide" : "Show"} Map
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetCamera}
            className="backdrop-blur-md bg-black/20 border-white/20 text-white hover:bg-white/10 transition-all duration-300 shadow-lg"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant={tourMode ? "default" : "outline"}
            size="sm"
            onClick={tourMode ? stopTour : startTour}
            className={tourMode 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 border-0 shadow-lg hover:shadow-purple-500/25 transition-all duration-300" 
              : "backdrop-blur-md bg-black/20 border-white/20 text-white hover:bg-white/10 transition-all duration-300 shadow-lg"
            }
          >
            {tourMode ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {tourMode ? "Stop" : "Start"} Tour
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleUI}
            className="backdrop-blur-md bg-black/20 border-white/20 text-white hover:bg-white/10 transition-all duration-300 shadow-lg"
          >
            {showUI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Enhanced Minimap with better styling */}
      {showMinimap && (
        <Card className="absolute top-20 right-4 w-72 z-10 backdrop-blur-md bg-black/20 border-white/20 shadow-xl">
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center text-white">
              <Map className="h-5 w-5 mr-2 text-blue-400" />
              City Map
            </h3>
            <div className="relative aspect-square bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-white/10">
              {/* Central plaza indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg shadow-yellow-400/50" />
              
              {/* Enhanced studios on minimap */}
              {studios.length > 0 ? studios.map((studio) => {
                try {
                  // Ensure studio has required position data
                  if (!studio?.position || !Array.isArray(studio.position) || studio.position.length < 3) {
                    console.warn('⚠️ Studio missing position data:', studio?.name || 'Unknown', studio);
                    return null;
                  }
                  
                  // Fixed coordinate mapping for spread-out studios (range -240 to +240 based on new API data)
                  const x = Math.max(0, Math.min(100, (studio.position[0] + 240) / 480 * 100));
                  const z = Math.max(0, Math.min(100, (studio.position[2] + 240) / 480 * 100));
                  const isActive = activeStudio === studio.id;
                  const isHovered = hoveredStudio === studio.id;
                  
                  return (
                    <button
                      key={studio.id}
                      className={`absolute w-4 h-4 rounded-sm transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                        isActive 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 scale-150 shadow-lg shadow-purple-500/50' 
                          : isHovered
                          ? 'bg-white scale-125 shadow-md'
                          : 'bg-white/60 hover:bg-white hover:scale-110'
                      }`}
                      style={{ left: `${x}%`, top: `${z}%` }}
                      onClick={() => moveToStudio(studio.id)}
                      title={studio.name || 'Studio'}
                    />
                  );
                } catch (error) {
                  console.error('❌ Error rendering studio on minimap:', studio?.name || 'Unknown', error);
                  return null;
                }
              }) : (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50 text-xs text-center">
                  {agents.length > 0 ? 'Loading studios...' : 'No studios available'}
                </div>
              )}
              
              {/* Agent Builder Hub on minimap */}
              <button
                className={`absolute w-5 h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  showAgentHub
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 scale-150 shadow-lg shadow-cyan-500/50'
                    : 'bg-cyan-400/80 hover:bg-cyan-400 hover:scale-125'
                }`}
                style={{ left: '75%', top: '25%' }} // Position for [120, 0, 0] - adjusted for new coordinate system
                onClick={() => {
                  setCameraPosition([128, 25, 8]);
                  setCameraTarget([120, 0, 0]);
                }}
                title="Agent Builder Hub"
              />
              
              {/* Trading Exchange on minimap */}
              <button
                className={`absolute w-5 h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  showMarketplace
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 scale-150 shadow-lg shadow-yellow-500/50'
                    : 'bg-yellow-400/80 hover:bg-yellow-400 hover:scale-125'
                }`}
                style={{ left: '50%', top: '90%' }} // Position for [0, 0, 140] - adjusted for new coordinate system
                onClick={() => {
                  setCameraPosition([8, 25, 148]);
                  setCameraTarget([0, 0, 140]);
                }}
                title="MEDI Exchange"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Studio info panel */}
      {displayStudio && (
        <Card className="absolute bottom-4 left-4 w-[450px] z-10 backdrop-blur-md bg-black/20 border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl text-white mb-2">{displayStudio.name}</h3>
                {(() => {
                  const agent = getAgentForStudio(displayStudio.agentId);
                  return agent ? (
                    <div className="flex items-center gap-3 mt-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border-purple-500/30"
                      >
                        {agent.collective}
                      </Badge>
                      <span className="text-sm text-white/70 flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {agent.stats.artworksCreated} artworks
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
              <Button 
                size="sm" 
                asChild
                className="bg-gradient-to-r from-purple-500 to-blue-500 border-0 shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
              >
                <Link href={`/agents/${displayStudio.agentId}`}>
                  <Info className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </Button>
            </div>
            
            {(() => {
              const agent = getAgentForStudio(displayStudio.agentId);
              return agent ? (
                <p className="text-sm text-white/80 mb-6 leading-relaxed">
                  {agent.description}
                </p>
              ) : null;
            })()}
            
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center text-white">
                <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />
                Recent Creations
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {displayStudio.recentArtworks.map((artwork) => (
                  <div key={artwork.id} className="relative aspect-video rounded-lg overflow-hidden border border-white/20 shadow-lg">
                    <img
                      src={artwork.image}
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
                      <p className="text-white text-xs font-medium p-3 leading-tight">
                        {artwork.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all duration-300"
                onClick={() => {
                  enterGalleryMode(displayStudio.id);
                }}
              >
                🏛️ Visit Studio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Agent Builder Hub info panel - ENHANCED VISIBILITY */}
      {showAgentHub && (
        <Card className="absolute bottom-4 left-4 w-[650px] z-50 backdrop-blur-md bg-black/30 border-4 border-cyan-400 shadow-2xl shadow-cyan-400/50 animate-pulse">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-bold text-3xl text-cyan-400 mb-3 animate-bounce">🤖 AGENT BUILDER HUB</h3>
                <div className="flex items-center gap-3 mt-2">
                  <Badge 
                    variant="secondary" 
                    className="text-sm bg-gradient-to-r from-cyan-500/40 to-blue-500/40 text-white border-cyan-500/50 px-3 py-1"
                  >
                    ✨ ACTIVE v3.0
                  </Badge>
                  <span className="text-lg text-cyan-300 flex items-center font-bold">
                    <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                    Neural Networks ONLINE
                  </span>
                </div>
                {/* Close button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const { setPinnedAgentHub } = useCityStore.getState();
                    setPinnedAgentHub(null);
                  }}
                  className="mt-2 bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30"
                >
                  ✕ Close
                </Button>
              </div>
              <Button 
                size="lg" 
                asChild
                className="bg-gradient-to-r from-cyan-500 to-blue-500 border-0 shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-lg px-6 py-3 animate-pulse"
              >
                <Link href="/agents">
                  🚀 ENTER BUILDER NOW
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-white/80 mb-6 leading-relaxed">
              Create powerful AI agents using advanced neural networks. Build, train, and deploy your custom AI assistants for various tasks including art creation, data analysis, and automation.
            </p>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center text-white">
                <Sparkles className="h-4 w-4 mr-2 text-cyan-400" />
                Agent Builder Features
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="font-medium text-sm text-white mb-1">⚡ Neural Network Design</div>
                  <div className="text-xs text-white/70">Build custom AI architectures</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="font-medium text-sm text-white mb-1">🎭 Personality Engine</div>
                  <div className="text-xs text-white/70">Define unique AI personalities</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="font-medium text-sm text-white mb-1">📊 Performance Analytics</div>
                  <div className="text-xs text-white/70">Monitor agent performance</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold transition-all duration-300"
                  asChild
                >
                  <Link href="/agents">
                    ⚡ Create Agent
                  </Link>
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all duration-300"
                  asChild
                >
                  <Link href="/agents">
                    🎭 View Agents
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Trading Exchange info panel - POSITIONED TO THE RIGHT */}
      {showMarketplace && (
        <Card className="absolute bottom-4 right-4 w-[460px] z-50 backdrop-blur-md bg-black/30 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/50 animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-2xl text-yellow-400 mb-2 animate-bounce">💎 MEDI EXCHANGE</h3>
                <div className="flex items-center gap-3 mt-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-gradient-to-r from-yellow-500/40 to-orange-500/40 text-white border-yellow-500/50"
                  >
                    LIVE TRADING
                  </Badge>
                  <span className="text-sm text-yellow-300 flex items-center font-bold">
                    <Sparkles className="h-3 w-3 mr-1 animate-spin" />
                    $2.4M Volume 24h
                  </span>
                </div>
                {/* Close button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const { setPinnedMarketplace } = useCityStore.getState();
                    setPinnedMarketplace(null);
                  }}
                  className="mt-2 bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30"
                >
                  ✕ Close
                </Button>
              </div>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-green-500 to-yellow-500 border-0 shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                onClick={() => {
                  alert('💹 Opening MEDI Exchange trading interface!');
                }}
              >
                💹 START TRADING
              </Button>
            </div>
            
            <p className="text-sm text-white/80 mb-6 leading-relaxed">
              Trade MEDI tokens, AI artworks, and agent services on the decentralized marketplace. Access real-time market data and execute instant transactions.
            </p>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center text-white">
                <Sparkles className="h-4 w-4 mr-2 text-yellow-400" />
                Live Market Data
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">$MEDI/USD</span>
                    <span className="text-green-400 font-bold">$1,247.89 ↗</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">AI Agents</span>
                    <span className="text-blue-400 font-bold">89,432 active</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">Artworks</span>
                    <span className="text-purple-400 font-bold">156K listed</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all duration-300"
                  onClick={() => {
                    alert('👛 Opening your MEDI wallet!');
                  }}
                >
                  👛 Wallet
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all duration-300"
                  onClick={() => {
                    alert('📊 Opening market analytics dashboard!');
                  }}
                >
                  📊 Analytics
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced Studios list - POSITIONED TO AVOID OVERLAP */}
      <Card className={`absolute ${showMarketplace ? 'bottom-4 right-[480px]' : 'bottom-4 right-4'} w-96 z-10 backdrop-blur-md bg-black/20 border-white/20 shadow-xl transition-all duration-300`}>
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 text-white text-lg">AI Creator Studios</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {studios.map((studio) => {
              const agent = getAgentForStudio(studio.agentId);
              const isActive = activeStudio === studio.id;
              
              return (
                <button
                  key={studio.id}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 border ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 border-purple-500/50 shadow-lg shadow-purple-500/25' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                  onClick={() => moveToStudio(studio.id)}
                >
                  <div className="font-medium text-sm text-white mb-1">{studio.name}</div>
                  {agent && (
                    <div className="text-xs text-white/70 flex items-center justify-between">
                      <span>{agent.collective}</span>
                      <span className="flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {studio.recentArtworks.length} artworks
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Enhanced Tour mode overlay */}
      {tourMode && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="backdrop-blur-md bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl max-w-lg text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg shadow-purple-500/25 mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Welcome to Medici City
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Experience the future of AI art creation. Click on any studio to explore AI creators and their latest masterpieces.
            </p>
          </div>
        </div>
      )}
    </>
  );
} 