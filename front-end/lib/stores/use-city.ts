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
  
  // Agent hubs and marketplaces
  pinnedAgentHub: string | null;
  pinnedMarketplace: string | null;
  
  // Gallery view
  isInGalleryMode: boolean;
  currentGalleryStudio: string | null;
  
  // UI state
  showMinimap: boolean;
  showUI: boolean;
  tourMode: boolean;
  
  // Actions
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setActiveStudio: (studioId: string | null) => void;
  setHoveredStudio: (studioId: string | null) => void;
  setPinnedAgentHub: (hubId: string | null) => void;
  setPinnedMarketplace: (marketId: string | null) => void;
  closeAllPinnedOverlays: () => void;
  enterGalleryMode: (studioId: string) => void;
  exitGalleryMode: () => void;
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
  
  pinnedAgentHub: null,
  pinnedMarketplace: null,
  
  isInGalleryMode: false,
  currentGalleryStudio: null,
  
  showMinimap: true,
  showUI: true,
  tourMode: false,
  
  // Actions
  setCameraPosition: (position) => set({ cameraPosition: position }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setActiveStudio: (studioId) => set({ activeStudio: studioId }),
  setHoveredStudio: (studioId) => set({ hoveredStudio: studioId }),
  setPinnedAgentHub: (hubId) => set({ pinnedAgentHub: hubId }),
  setPinnedMarketplace: (marketId) => set({ pinnedMarketplace: marketId }),
  closeAllPinnedOverlays: () => set({
    pinnedAgentHub: null,
    pinnedMarketplace: null
  }),
  enterGalleryMode: (studioId) => set({ currentGalleryStudio: studioId }),
  exitGalleryMode: () => set({ currentGalleryStudio: null }),
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

    // Create studios based on agent data - SPREAD OUT MUCH MORE
    const studios: Studio[] = [
      {
        id: "leonardo-studio",
        name: "Leonardo's Workshop",
        agentId: "leonardo",
        position: [-40, 0, -30], // Much further spread out
        rotation: [0, Math.PI / 4, 0],
        scale: [1.2, 1, 1.2], // Slightly larger and wider
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
          },
          {
            id: "art-8",
            title: "Vitruvian AI",
            image: createPlaceholderImage('#CD853F'),
            position: [0, 3, -1],
            rotation: [0, 0, 0]
          },
          {
            id: "art-9",
            title: "The Flying Machine 2.0",
            image: createPlaceholderImage('#DEB887'),
            position: [-1, 1.5, 1],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "raphael-studio",
        name: "Raphael's Atelier",
        agentId: "raphael",
        position: [45, 0, -25], // Far to the right
        rotation: [0, -Math.PI / 3, 0],
        scale: [1, 1.3, 1], // Taller and more elegant
        recentArtworks: [
          {
            id: "art-3",
            title: "Modern School of Athens",
            image: createPlaceholderImage('#4169E1'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-10",
            title: "Digital Sistine Madonna",
            image: createPlaceholderImage('#6495ED'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-11",
            title: "Renaissance Metaverse",
            image: createPlaceholderImage('#87CEEB'),
            position: [0, 3, -1],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "michelangelo-studio",
        name: "Michelangelo's Forge",
        agentId: "michelangelo",
        position: [0, 0, 50], // Far back
        rotation: [0, Math.PI, 0],
        scale: [1.4, 1.2, 1.4], // Massive and imposing
        recentArtworks: [
          {
            id: "art-4",
            title: "Cybernetic Creation",
            image: createPlaceholderImage('#DC143C'),
            position: [0, 2, -2],
            rotation: [0, 0, 0]
          },
          {
            id: "art-12",
            title: "Digital David",
            image: createPlaceholderImage('#FF6347'),
            position: [-2, 2.5, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-13",
            title: "The Sistine Cloud",
            image: createPlaceholderImage('#FF4500'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-14",
            title: "Pieta 3.0",
            image: createPlaceholderImage('#B22222'),
            position: [1, 1.5, 1],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "caravaggio-studio",
        name: "Caravaggio's Studio",
        agentId: "caravaggio",
        position: [-35, 0, 35], // Far left back area
        rotation: [0, Math.PI / 2.5, 0],
        scale: [0.9, 1.1, 0.9], // Narrower but taller, mysterious
        recentArtworks: [
          {
            id: "art-5",
            title: "Modern Bacchus",
            image: createPlaceholderImage('#8A2BE2'),
            position: [0, 2, 2],
            rotation: [0, 0, 0]
          },
          {
            id: "art-15",
            title: "Digital Chiaroscuro",
            image: createPlaceholderImage('#4B0082'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-16",
            title: "The Calling of St. AI",
            image: createPlaceholderImage('#6A0DAD'),
            position: [2, 2.5, 0],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "da-vinci-studio",
        name: "Da Vinci's Lab",
        agentId: "davinci",
        position: [40, 0, 30], // Far right back
        rotation: [0, -Math.PI / 1.8, 0],
        scale: [1.1, 1.4, 1.1], // Tall and innovative looking
        recentArtworks: [
          {
            id: "art-17",
            title: "Neural Network Portrait",
            image: createPlaceholderImage('#228B22'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-18",
            title: "Quantum Salvator Mundi",
            image: createPlaceholderImage('#32CD32'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-19",
            title: "The Annunciation 2.0",
            image: createPlaceholderImage('#9ACD32'),
            position: [0, 3, -1],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "picasso-studio",
        name: "Picasso's Cubist Lab",
        agentId: "picasso",
        position: [-60, 0, 0], // Far left side
        rotation: [0, Math.PI / 6, 0],
        scale: [1.3, 0.8, 1.3], // Wide and angular, cubist style
        recentArtworks: [
          {
            id: "art-20",
            title: "Guernica Reloaded",
            image: createPlaceholderImage('#696969'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-21",
            title: "Les Demoiselles d'AI",
            image: createPlaceholderImage('#A9A9A9'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-22",
            title: "Blue Period Bot",
            image: createPlaceholderImage('#191970'),
            position: [0, 3, -1],
            rotation: [0, 0, 0]
          },
          {
            id: "art-23",
            title: "Cubist Self-Portrait",
            image: createPlaceholderImage('#2F4F4F'),
            position: [1, 1.5, 1],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "monet-studio",
        name: "Monet's Digital Garden",
        agentId: "monet",
        position: [25, 0, -45], // Front right area
        rotation: [0, -Math.PI / 5, 0],
        scale: [1, 0.9, 1], // Organic, garden-like proportions
        recentArtworks: [
          {
            id: "art-24",
            title: "Water Lilies VR",
            image: createPlaceholderImage('#98FB98'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-25",
            title: "Impression Algorithm",
            image: createPlaceholderImage('#90EE90'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          }
        ]
      },
      {
        id: "van-gogh-studio",
        name: "Van Gogh's Swirling Studio",
        agentId: "vangogh",
        position: [-25, 0, -40], // Front left area
        rotation: [0, Math.PI / 7, 0],
        scale: [1.2, 1.1, 1.2], // Expressive proportions
        recentArtworks: [
          {
            id: "art-26",
            title: "Starry Night Code",
            image: createPlaceholderImage('#FFD700'),
            position: [-2, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            id: "art-27",
            title: "Sunflowers.exe",
            image: createPlaceholderImage('#FFA500'),
            position: [2, 2, 0],
            rotation: [0, 0, 0]
          }
        ]
      }
    ];
    
    set({ studios });
  }
})); 