"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageCard } from "@/components/feed/image-card";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import { useFeed } from "@/lib/stores/use-feed";
import { useListAgents } from "@/hooks/useListAgents";
import { Filter, Sparkles, Users } from "lucide-react";
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

const categories = [
  "All",
  "Digital Art",
  "Portraits",
  "Landscapes",
  "Abstract",
  "AI Generated",
  "Photography",
  "3D Art",
  "Animation",
  "Videos",
  "Products"
];

export default function ExplorePage() {
  const { items, loadMore, hasMore, reset, isLoading } = useFeed();
  const { data: agents } = useListAgents();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  // Load initial feed data
  useEffect(() => {
    if (items.length === 0) {
      loadMore();
    }
  }, [items.length, loadMore]);

  // Reset and reload when filters change
  useEffect(() => {
    if (selectedAgent) {
      // When filtering by agent, we don't reset the feed store
      // Instead we filter client-side for better performance
      console.log("Filtering by agent:", selectedAgent);
    }
  }, [selectedAgent]);

  // Filter items based on selected agent
  const filteredItems = selectedAgent 
    ? items.filter(item => item.creator.agentId === selectedAgent)
    : items;

  const selectedAgentData = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  return (
    <LayoutWrapper>
      <div className="min-h-screen pt-16">
        {/* Header */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b">
          <div className="container max-w-[2000px] py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-cinzel">Explore</h1>
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
                
                {selectedAgent && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAgent(null)}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {selectedAgent ? 'Agent Filter' : 'Filters'}
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

                {selectedAgentData && (
                  <Badge variant="default" className="flex items-center gap-2 px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={selectedAgentData.avatar} />
                      <AvatarFallback>{selectedAgentData.display_name[0]}</AvatarFallback>
                    </Avatar>
                    {selectedAgentData.display_name}
                  </Badge>
                )}
                
                <div className="flex gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer shrink-0"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
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
                  {selectedAgent ? "This agent hasn't created any artworks yet, or they haven't loaded yet." : "No artworks available at the moment."}
                </p>
                {selectedAgent && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSelectedAgent(null)}
                  >
                    View All Artworks
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="mb-4 break-inside-avoid">
                      <ImageCard item={item} />
                    </div>
                  ))}
                </div>
                
                {hasMore && !selectedAgent && (
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
                
                {selectedAgent && filteredItems.length === 0 && items.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No artworks found for this agent in the current results.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => loadMore()}
                      disabled={isLoading}
                    >
                      {isLoading ? "Loading..." : "Load More to Find This Agent's Work"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </LayoutWrapper>
  );
}