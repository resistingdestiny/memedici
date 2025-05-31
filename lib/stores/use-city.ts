"use client";

import { create } from "zustand";

export interface Studio {
  id: string;
  name: string;
  agentId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  recentArtworks: {
    id: string;
    title: string;
    image: string;
    position: [number, number, number];
    rotation: [number, number, number];
  }[];
}

interface CityState {
  // Camera and navigation
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isMoving: boolean;
  
  // Studios and agents
  studios: Studio[];
  activeStudio: string | null;
  hoveredStudio: string | null;
  pinnedStudio: string | null;
  
  // Agent hubs and marketplaces
  pinnedAgentHub: string | null;
  pinnedMarketplace: string | null;
  
  // UI state
  showMinimap: boolean;
  showUI: boolean;
  tourMode: boolean;
  
  // Actions
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setActiveStudio: (studioId: string | null) => void;
  setHoveredStudio: (studioId: string | null) => void;
  setPinnedStudio: (studioId: string | null) => void;
  setPinnedAgentHub: (hubId: string | null) => void;
  setPinnedMarketplace: (marketId: string | null) => void;
  closeAllPinnedOverlays: () => void;
  toggleMinimap: () => void;
  toggleUI: () => void;
  startTour: () => void;
  stopTour: () => void;
  moveToStudio: (studioId: string) => void;
  initializeStudios: () => void;
}

export const useCityStore = create<CityState>((set, get) => ({
  // Initial state
  cameraPosition: [0, 10, 20],
  cameraTarget: [0, 0, 0],
  isMoving: false,
  
  studios: [],
  activeStudio: null,
  hoveredStudio: null,
  pinnedStudio: null,
  
  pinnedAgentHub: null,
  pinnedMarketplace: null,
  
  showMinimap: true,
  showUI: true,
  tourMode: false,
  
  // Actions
  setCameraPosition: (position) => set({ cameraPosition: position }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setActiveStudio: (studioId) => set({ activeStudio: studioId }),
  setHoveredStudio: (studioId) => set({ hoveredStudio: studioId }),
  setPinnedStudio: (studioId) => set({ pinnedStudio: studioId }),
  setPinnedAgentHub: (hubId) => set({ pinnedAgentHub: hubId }),
  setPinnedMarketplace: (marketId) => set({ pinnedMarketplace: marketId }),
  closeAllPinnedOverlays: () => set({
    pinnedStudio: null,
    pinnedAgentHub: null,
    pinnedMarketplace: null
  }),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  toggleUI: () => set((state) => ({ showUI: !state.showUI })),
  
  startTour: () => set({ tourMode: true, showUI: false }),
  stopTour: () => set({ tourMode: false, showUI: true }),
  
  moveToStudio: (studioId) => {
    const { studios } = get();
    const studio = studios.find(s => s.id === studioId);
    if (studio) {
      const [x, y, z] = studio.position;
      set({
        cameraTarget: [x, y + 2, z],
        cameraPosition: [x + 8, y + 5, z + 8],
        activeStudio: studioId,
        isMoving: true
      });
      
      // Reset moving state after animation
      setTimeout(() => set({ isMoving: false }), 2000);
    }
  },
  
  initializeStudios: () => {
    // Only initialize if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }
    
    // Create simple colored placeholder images as data URIs
    const createPlaceholderImage = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 512);
        // Add some texture pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 50; i++) {
          ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
        }
      }
      return canvas.toDataURL();
    };

    // Create studios based on agent data
    const studios: Studio[] = [
      {
        id: "leonardo-studio",
        name: "Leonardo's Workshop",
        agentId: "leonardo",
        position: [-15, 0, -10],
        rotation: [0, Math.PI / 4, 0],
        scale: [1, 1, 1],
        recentArtworks: [
          {
            id: "art-1",
            title: "Modern Mona Lisa",
            image: createPlaceholderImage('#8B4513'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-2",
            title: "Digital Last Supper",
            image: createPlaceholderImage('#DAA520'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "raphael-studio",
        name: "Raphael's Atelier",
        agentId: "raphael",
        position: [15, 0, -10],
        rotation: [0, -Math.PI / 4, 0],
        scale: [1, 1, 1],
        recentArtworks: [
          {
            id: "art-3",
            title: "Modern School of Athens",
            image: createPlaceholderImage('#4169E1'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "michelangelo-studio",
        name: "Michelangelo's Forge",
        agentId: "michelangelo",
        position: [0, 0, 15],
        rotation: [0, Math.PI, 0],
        scale: [1, 1, 1],
        recentArtworks: [
          {
            id: "art-4",
            title: "Cybernetic Creation",
            image: createPlaceholderImage('#DC143C'),
            position: [0, 2, -2],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "caravaggio-studio",
        name: "Caravaggio's Studio",
        agentId: "caravaggio",
        position: [-15, 0, 10],
        rotation: [0, Math.PI / 2, 0],
        scale: [1, 1, 1],
        recentArtworks: [
          {
            id: "art-5",
            title: "Modern Bacchus",
            image: createPlaceholderImage('#8A2BE2'),
            position: [0, 2, 2],
            rotation: [0, 0, 0]
          }
        ]
      }
    ];
    
    set({ studios });
  }
})); 