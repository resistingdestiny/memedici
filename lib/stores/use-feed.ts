"use client";

import { create } from "zustand";
import { FeedItem } from "@/lib/types";
import { agentData } from "@/lib/stubs";

interface FeedState {
  items: FeedItem[];
  viewMode: "grid" | "reels" | "products";
  isLoading: boolean;
  hasMore: boolean;
  
  setViewMode: (mode: "grid" | "reels" | "products") => void;
  loadMore: () => Promise<void>;
  likeItem: (itemId: string) => void;
}

// Helper function to generate random dimensions
const getRandomDimensions = () => {
  const aspectRatios = [
    { width: 800, height: 1200 }, // Portrait
    { width: 800, height: 800 },  // Square
    { width: 1200, height: 800 }, // Landscape
    { width: 800, height: 1000 }, // Slightly tall
    { width: 1000, height: 800 }  // Slightly wide
  ];
  return aspectRatios[Math.floor(Math.random() * aspectRatios.length)];
};

export const useFeed = create<FeedState>((set, get) => ({
  items: [],
  viewMode: "grid",
  isLoading: false,
  hasMore: true,
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  loadMore: async () => {
    const { items, isLoading } = get();
    
    if (isLoading) return;
    
    set({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newItems: FeedItem[] = Array.from({ length: 20 }, (_, i) => {
        const rand = Math.random();
        const itemType: FeedItem["type"] = rand > 0.7 ? "video" : rand > 0.5 ? "product" : "image";
        const dimensions = getRandomDimensions();
        
        // Get a random agent from the agent data
        const randomAgent = agentData[Math.floor(Math.random() * agentData.length)];
        
        return {
          id: `item-${items.length + i}`,
          type: itemType,
          title: `${randomAgent.name}'s Creation ${items.length + i + 1}`,
          media: `https://picsum.photos/${dimensions.width}/${dimensions.height}?random=${items.length + i}`,
          creator: {
            name: randomAgent.name,
            avatar: randomAgent.avatar,
            agentId: randomAgent.id,
          },
          likes: Math.floor(Math.random() * 1000),
          isLiked: false,
          price: Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 10 : null,
        };
      });
      
      set({
        items: [...items, ...newItems],
        isLoading: false,
        hasMore: items.length < 100
      });
    } catch (error) {
      console.error("Error loading more items:", error);
      set({ isLoading: false });
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