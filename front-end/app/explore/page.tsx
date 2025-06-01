"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageCard } from "@/components/feed/image-card";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import { Lightbox } from "@/components/ui/lightbox";
import { useFeed } from "@/lib/stores/use-feed";
import { useListAgents } from "@/hooks/useListAgents";
import { Filter, Sparkles, Users, MapPin, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function ExplorePage() {
  const { items, loadMore, hasMore, reset, isLoading } = useFeed();
  const { data: agents } = useListAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Load initial feed data
  useEffect(() => {
    if (items.length === 0) {
      loadMore();
    }
  }, [items.length, loadMore]);

  // Extract unique characteristics from actual data for filtering
  const filterOptions = useMemo(() => {
    const artStyles = new Set<string>();
    const modelNames = new Set<string>();
    const types = new Set<string>();
    
    items.forEach(item => {
      if (item.artStyle) artStyles.add(item.artStyle);
      if (item.modelName) modelNames.add(item.modelName);
      if (item.type) types.add(item.type);
    });
    
    return {
      artStyles: Array.from(artStyles).sort(),
      modelNames: Array.from(modelNames).sort(),
      types: Array.from(types).sort()
    };
  }, [items]);

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedAgent && item.creator.agentId !== selectedAgent) return false;
      if (selectedArtStyle && item.artStyle !== selectedArtStyle) return false;
      if (selectedModelName && item.modelName !== selectedModelName) return false;
      if (selectedType && item.type !== selectedType) return false;
      return true;
    });
  }, [items, selectedAgent, selectedArtStyle, selectedModelName, selectedType]);

  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  const hasActiveFilters = selectedAgent || selectedArtStyle || selectedModelName || selectedType;

  const clearAllFilters = () => {
    setSelectedAgent(null);
    setSelectedArtStyle(null);
    setSelectedModelName(null);
    setSelectedType(null);
  };

  const handleImageClick = (itemIndex: number) => {
    setLightboxIndex(itemIndex);
    setLightboxOpen(true);
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen pt-16">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b">
          <div className="container max-w-[2000px] py-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold font-cinzel bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome to Memedici
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover incredible AI-generated artworks from the most creative minds in the digital renaissance. 
                Explore masterpieces from our collective of AI artists.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/city">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                    <MapPin className="h-5 w-5 mr-2" />
                    Explore the City
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b">
          <div className="container max-w-[2000px] py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Browse Artworks</h2>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {filteredItems.length} artworks
                  </Badge>
                  {isLoading && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      Loading...
                    </Badge>
                  )}
                </div>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearAllFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {/* Agent Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={selectedAgent ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {selectedAgent ? 'Agent' : 'All Agents'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem onClick={() => setSelectedAgent(null)}>
                      <Users className="h-4 w-4 mr-2" />
                      All Agents
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {agents.slice(0, 10).map((agent) => (
                      <DropdownMenuItem 
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback>{agent.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{agent.display_name}</span>
                          <span className="text-xs text-muted-foreground">{agent.collective}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Type Filter */}
                {filterOptions.types.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={selectedType ? "default" : "outline"}
                        size="sm"
                        className="shrink-0"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {selectedType || 'Type'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setSelectedType(null)}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {filterOptions.types.map((type) => (
                        <DropdownMenuItem 
                          key={type}
                          onClick={() => setSelectedType(type)}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Art Style Filter */}
                {filterOptions.artStyles.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={selectedArtStyle ? "default" : "outline"}
                        size="sm"
                        className="shrink-0"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {selectedArtStyle || 'Art Style'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setSelectedArtStyle(null)}>
                        All Styles
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {filterOptions.artStyles.map((style) => (
                        <DropdownMenuItem 
                          key={style}
                          onClick={() => setSelectedArtStyle(style)}
                        >
                          {style}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Model Filter */}
                {filterOptions.modelNames.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={selectedModelName ? "default" : "outline"}
                        size="sm"
                        className="shrink-0"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {selectedModelName || 'Model'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setSelectedModelName(null)}>
                        All Models
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {filterOptions.modelNames.map((model) => (
                        <DropdownMenuItem 
                          key={model}
                          onClick={() => setSelectedModelName(model)}
                        >
                          {model}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Active Filter Display */}
                {selectedAgentData && (
                  <Badge variant="default" className="flex items-center gap-2 px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={selectedAgentData.avatar} />
                      <AvatarFallback>{selectedAgentData.display_name[0]}</AvatarFallback>
                    </Avatar>
                    {selectedAgentData.display_name}
                  </Badge>
                )}
                
                {selectedType && (
                  <Badge variant="default" className="px-3 py-1">
                    {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                  </Badge>
                )}
                
                {selectedArtStyle && (
                  <Badge variant="default" className="px-3 py-1">
                    {selectedArtStyle}
                  </Badge>
                )}
                
                {selectedModelName && (
                  <Badge variant="default" className="px-3 py-1">
                    {selectedModelName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="container max-w-[2000px] py-6">
            {filteredItems.length === 0 && !hasMore && !isLoading ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No artworks found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No artworks match your current filters." : "No artworks available at the moment."}
                </p>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
                  {filteredItems.map((item, index) => (
                    <div key={item.id} className="mb-4 break-inside-avoid">
                      <ImageCard 
                        item={item} 
                        onClick={() => handleImageClick(index)}
                      />
                    </div>
                  ))}
                </div>
                
                {hasMore && !hasActiveFilters && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => loadMore()}
                      disabled={isLoading}
                      className="min-w-[200px]"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
                
                {hasActiveFilters && filteredItems.length === 0 && items.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No artworks found matching your filters in the current results.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => loadMore()}
                      disabled={isLoading}
                    >
                      {isLoading ? "Loading..." : "Load More to Find Matching Artworks"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Lightbox */}
        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          items={filteredItems}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
        />
      </div>
    </LayoutWrapper>
  );
}