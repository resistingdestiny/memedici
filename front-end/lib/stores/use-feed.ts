"use client";

import { create } from "zustand";
import { FeedItem } from "@/lib/types";
import { getAgents, getAgentArtworks, transformAgentData } from "@/lib/api";

interface FeedState {
  items: FeedItem[];
  viewMode: "grid" | "reels" | "products";
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
  
  setViewMode: (mode: "grid" | "reels" | "products") => void;
  loadMore: () => Promise<void>;
  likeItem: (itemId: string) => void;
  reset: () => void;
}

export const useFeed = create<FeedState>((set, get) => ({
  items: [],
  viewMode: "grid",
  isLoading: false,
  hasMore: true,
  offset: 0,
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  reset: () => set({ items: [], offset: 0, hasMore: true }),
  
  loadMore: async () => {
    const { items, isLoading, offset } = get();
    
    if (isLoading) return;
    
    set({ isLoading: true });
    
    try {
      console.log("useFeed: Fetching artworks from deployed backend");
      
      // First, get all agents
      const agentsResponse = await getAgents();
      const agents = agentsResponse.agents || [];
      console.log("useFeed: Found", agents.length, "agents");
      
      // Then fetch artworks from each agent
      const allArtworks: any[] = [];
      const maxArtworksPerAgent = 5; // Limit per agent to avoid too much data
      
      for (const agent of agents.slice(0, 8)) { // Limit to first 8 agents for performance
        try {
          const transformedAgent = transformAgentData(agent);
          console.log(`useFeed: Fetching artworks for agent ${transformedAgent.name}`);
          
          const artworksResponse = await getAgentArtworks(
            transformedAgent.id, 
            maxArtworksPerAgent, 
            0, 
            true
          );
          
          if (artworksResponse.success && artworksResponse.artworks) {
            // Add agent info to each artwork
            const agentArtworks = artworksResponse.artworks.map(artwork => ({
              ...artwork,
              agent_id: transformedAgent.id,
              agent_name: transformedAgent.name,
              agent_info: {
                display_name: transformedAgent.name,
                studio_name: transformedAgent.collective,
                art_style: artworksResponse.agent?.art_style || "digital",
                avatar_url: transformedAgent.avatar
              }
            }));
            
            allArtworks.push(...agentArtworks);
            console.log(`useFeed: Added ${agentArtworks.length} artworks from ${transformedAgent.name}`);
          }
        } catch (error) {
          console.warn(`useFeed: Failed to fetch artworks for agent ${agent.agent_id}:`, error);
          // Continue with other agents
        }
      }
      
      // Sort by creation date (newest first)
      allArtworks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Take a slice based on pagination
      const startIndex = offset;
      const endIndex = offset + 20;
      const paginatedArtworks = allArtworks.slice(startIndex, endIndex);
      
      if (paginatedArtworks.length > 0) {
        // Transform API artworks to FeedItem format
        const newItems: FeedItem[] = paginatedArtworks.map((artwork) => {
          // Get avatar URL with fallback
          let avatarUrl = artwork.agent_info?.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `https://memedici-backend.onrender.com/${avatarUrl}`;
          }
          if (!avatarUrl) {
            avatarUrl = `https://api.dicebear.com/7.x/avatars/svg?seed=${artwork.agent_id}`;
          }

          return {
            id: artwork.id,
            type: artwork.artwork_type === "video" ? "video" : "image" as "image" | "video" | "product",
            title: artwork.prompt && artwork.prompt.length > 50 ? `${artwork.prompt.substring(0, 50)}...` : artwork.prompt || "AI Creation",
            media: artwork.file_url,
            creator: {
              name: artwork.agent_info?.display_name || artwork.agent_name || artwork.agent_id,
              avatar: avatarUrl,
              agentId: artwork.agent_id,
            },
            likes: Math.floor(Math.random() * 100), // Could be tracked in backend later
            isLiked: false,
            price: null, // Could be added to backend later
            createdAt: artwork.created_at,
            modelName: artwork.model_name,
            studioName: artwork.agent_info?.studio_name,
            artStyle: artwork.agent_info?.art_style,
          };
        });
        
        set({
          items: [...items, ...newItems],
          offset: endIndex,
          hasMore: endIndex < allArtworks.length,
          isLoading: false
        });
        
        console.log("useFeed: Successfully loaded", newItems.length, "real artworks from deployed backend");
      } else {
        // No more artworks
        set({ isLoading: false, hasMore: false });
      }
      
    } catch (error) {
      console.error("Error loading artworks from deployed backend:", error);
      
      // Fallback to mock data on error
      console.log("useFeed: Falling back to mock data");
      const mockItems: FeedItem[] = Array.from({ length: 10 }, (_, i) => {
        const rand = Math.random();
        const itemType: FeedItem["type"] = rand > 0.8 ? "video" : "image";
        
        return {
          id: `mock-item-${items.length + i}`,
          type: itemType,
          title: `Mock Creation ${items.length + i + 1}`,
          media: `https://picsum.photos/800/800?random=${items.length + i}`,
          creator: {
            name: `Agent ${(items.length + i) % 5 + 1}`,
            avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${items.length + i}`,
            agentId: `agent-${(items.length + i) % 5 + 1}`,
          },
          likes: Math.floor(Math.random() * 1000),
          isLiked: false,
          price: null,
        };
      });
      
      set({
        items: [...items, ...mockItems],
        offset: offset + mockItems.length,
        isLoading: false,
        hasMore: items.length < 50 // Limit mock data
      });
    }
  },
  
  likeItem: (itemId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? { ...item, likes: item.isLiked ? item.likes - 1 : item.likes + 1, isLiked: !item.isLiked }
          : item
      ),
    }));
  },
}));