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
    showMinimap,
    showUI,
    tourMode,
    toggleMinimap,
    toggleUI,
    startTour,
    stopTour,
    moveToStudio,
    setCameraPosition,
    setCameraTarget
  } = useCityStore();
  
  const { agents, fetchAgents } = useAgents();
  
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);
  
  const activeStudioData = studios.find(s => s.id === activeStudio);
  const hoveredStudioData = studios.find(s => s.id === hoveredStudio);
  const displayStudio = activeStudioData || hoveredStudioData;
  
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
              {studios.map((studio) => {
                const x = (studio.position[0] + 20) / 40 * 100;
                const z = (studio.position[2] + 20) / 40 * 100;
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
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced Studio info panel */}
      {displayStudio && (
        <Card className="absolute bottom-4 left-4 w-96 z-10 backdrop-blur-md bg-black/20 border-white/20 shadow-xl">
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
              
              {/* Gallery Button */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all duration-300"
                onClick={() => {
                  // TODO: Add gallery functionality here
                  console.log('Opening gallery for studio:', displayStudio.id);
                  alert('🏛️ Opening gallery for ' + displayStudio.name);
                }}
              >
                🏛️ Visit Studio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced Studios list */}
      <Card className="absolute bottom-4 right-4 w-80 z-10 backdrop-blur-md bg-black/20 border-white/20 shadow-xl">
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
          <div className="backdrop-blur-md bg-black/30 rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md text-center">
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