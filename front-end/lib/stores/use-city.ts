"use client";

import { create } from "zustand";
import { getStudios, getAgents, Studio as ApiStudio, Agent } from "@/lib/api";

export interface Studio {
  id: string;
  name: string;
  agentId?: string; // Make optional since studios might not have agents
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
  // API data fields
  studio_id: string;
  studioData: {
    name: string;
    description: string;
    theme: string;
    art_style: string;
    items_count: number;
    featured_items: any[];
  };
  assigned_agents: string[];
  agent_count: number;
  agent?: Agent; // The actual agent data if assigned
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
  hoveredAgentHub: string | null;
  hoveredMarketplace: string | null;
  
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
  setHoveredAgentHub: (hubId: string | null) => void;
  setHoveredMarketplace: (marketId: string | null) => void;
  // Add new function for API-based studios
  generateStudiosFromAgents: (agents: any[]) => void;
  loadStudiosFromAPI: () => Promise<void>;
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
  hoveredAgentHub: null,
  hoveredMarketplace: null,
  
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
    
    // Don't initialize with mock data anymore - redirect to loadStudiosFromAPI
    console.log('🏛️ Redirecting to loadStudiosFromAPI for real data...');
    get().loadStudiosFromAPI();
  },
  setHoveredAgentHub: (hubId: string | null) => set({ hoveredAgentHub: hubId }),
  setHoveredMarketplace: (marketId: string | null) => set({ hoveredMarketplace: marketId }),
  // Add new function for API-based studios
  generateStudiosFromAgents: (agents: any[]) => {
    console.log('🏛️ Generating studios from API agents:', agents.length);
    
    // Don't regenerate if we already have studios
    const existingStudios = get().studios;
    if (existingStudios.length > 0) {
      console.log('🏛️ Studios already exist, not regenerating');
      return;
    }

    // Helper function to create placeholder images
    const createPlaceholderImage = (color: string) => {
      if (typeof window === 'undefined') return '';
      
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

    // Generate studio positions in a circle around the city
    const generateStudioPositions = (count: number) => {
      const positions: [number, number, number][] = [];
      const baseRadius = 80; // Distance from center
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = baseRadius + (Math.random() - 0.5) * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        positions.push([x, 0, z]);
      }
      return positions;
    };

    const studioPositions = generateStudioPositions(agents.length);

    // Create studios based on real agents
    const studios: Studio[] = agents.map((agent, index) => {
      const position = studioPositions[index] || [0, 0, 0];
      const agentName = agent.name || agent.identity?.display_name || `Agent ${index + 1}`;
      const studioName = agent.studio?.name || `${agentName}'s Studio`;
      
      // Generate color based on agent specialty or use a default
      const getColorForSpecialty = (specialty: string[]) => {
        const colorMap: Record<string, string> = {
          'digital': '#4169E1',
          'painting': '#FF6347',
          'sculpture': '#8B4513',
          'photography': '#32CD32',
          'abstract': '#9932CC',
          'portrait': '#FF69B4',
          'landscape': '#228B22',
          'conceptual': '#FF8C00',
          'mixed': '#DAA520',
          'generative': '#00CED1'
        };
        
        const primarySpecialty = specialty[0]?.toLowerCase() || 'digital';
        for (const [key, color] of Object.entries(colorMap)) {
          if (primarySpecialty.includes(key)) {
            return color;
          }
        }
        return `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
      };

      const studioColor = getColorForSpecialty(agent.specialty || ['digital']);

      // Generate sample artworks for the studio
      const artworkTitles = [
        'Neural Canvas',
        'Digital Dreams',
        'AI Imagination',
        'Synthetic Vision',
        'Generated Beauty',
        'Algorithmic Art',
        'Creative Code',
        'Virtual Masterpiece'
      ];

      const recentArtworks = Array.from({ length: Math.min(4, artworkTitles.length) }, (_, artIndex) => ({
        id: `${agent.agent_id}-art-${artIndex}`,
        title: artworkTitles[artIndex],
        image: createPlaceholderImage(studioColor),
        position: [
          (artIndex % 2 === 0 ? -2 : 2),
          2 + (artIndex * 0.5),
          artIndex < 2 ? 0 : -1
        ] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number]
      }));

      return {
        id: agent.agent_id,
        name: studioName,
        agentId: agent.agent_id,
        position,
        rotation: [0, (Math.random() - 0.5) * Math.PI, 0] as [number, number, number],
        scale: [
          1 + (Math.random() - 0.5) * 0.4,
          1 + (Math.random() - 0.5) * 0.6,
          1 + (Math.random() - 0.5) * 0.4
        ] as [number, number, number],
        recentArtworks,
        studio_id: agent.studio?.studio_id || agent.agent_id,
        studioData: agent.studio || {
          name: studioName,
          description: "",
          theme: "",
          art_style: "",
          items_count: 0,
          featured_items: []
        },
        assigned_agents: [agent.agent_id],
        agent_count: 1,
        agent: agent
      };
    });

    console.log('🏛️ Generated studios:', studios.length);
    set({ studios });
  },
  loadStudiosFromAPI: async () => {
    try {
      console.log('🏗️ Loading studios from API...');
      
      // Fetch both studios and agents data
      const [studiosResponse, agentsResponse] = await Promise.all([
        getStudios(),
        getAgents()
      ]);
      
      const apiStudios: ApiStudio[] = studiosResponse.studios || [];
      const agents: Agent[] = agentsResponse.agents || [];
      
      console.log('📥 API Studios loaded:', apiStudios.length);
      console.log('👥 API Agents loaded:', agents.length);
      
      // If no API studios, create some empty platforms for available studios
      let studiosToProcess = apiStudios;
      if (apiStudios.length === 0) {
        console.log('🏗️ No API studios found, creating empty platforms...');
        // Create some empty studio platforms
        studiosToProcess = [
          { studio_id: 'empty-1', studio: { name: 'Available Studio 1', description: '', theme: 'Modern', art_style: 'Contemporary', items_count: 0, featured_items: [] }, assigned_agents: [], agent_count: 0 },
          { studio_id: 'empty-2', studio: { name: 'Available Studio 2', description: '', theme: 'Renaissance', art_style: 'Classical', items_count: 0, featured_items: [] }, assigned_agents: [], agent_count: 0 },
          { studio_id: 'empty-3', studio: { name: 'Available Studio 3', description: '', theme: 'Cyberpunk', art_style: 'Digital', items_count: 0, featured_items: [] }, assigned_agents: [], agent_count: 0 },
          { studio_id: 'empty-4', studio: { name: 'Available Studio 4', description: '', theme: 'Baroque', art_style: 'Ornate', items_count: 0, featured_items: [] }, assigned_agents: [], agent_count: 0 },
          { studio_id: 'empty-5', studio: { name: 'Available Studio 5', description: '', theme: 'Impressionist', art_style: 'Impressionism', items_count: 0, featured_items: [] }, assigned_agents: [], agent_count: 0 }
        ] as ApiStudio[];
      }
      
      // Generate positions for studios in a circle formation
      const generateStudioPositions = (count: number) => {
        const radius = 40; // Base radius
        const positions: [number, number, number][] = [];
        
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * 2 * Math.PI;
          // Vary the radius slightly for more organic layout
          const currentRadius = radius + Math.sin(i * 0.7) * 10;
          const x = Math.cos(angle) * currentRadius;
          const z = Math.sin(angle) * currentRadius;
          const y = 0;
          positions.push([x, y, z]);
        }
        
        return positions;
      };
      
      const positions = generateStudioPositions(studiosToProcess.length);
      
      // Convert API studios to 3D studios
      const cityStudios: Studio[] = studiosToProcess.map((apiStudio, index) => {
        // Find assigned agent data
        const assignedAgent = apiStudio.assigned_agents.length > 0 
          ? agents.find(agent => apiStudio.assigned_agents.includes(agent.agent_id || agent.id))
          : null;
          
        // Only generate artworks if the studio actually has items
        const generateRealArtworks = (studioData: any, itemsCount: number) => {
          if (itemsCount === 0 || !studioData.featured_items || studioData.featured_items.length === 0) {
            return []; // No artworks if none exist
          }
          
          // Use actual featured items from the API
          return studioData.featured_items.slice(0, 4).map((item: any, i: number) => ({
            id: item.id || `${apiStudio.studio_id}_art_${i}`,
            title: item.title || item.name || `${studioData.theme} Artwork ${i + 1}`,
            image: item.image || item.url || generatePlaceholderImage(getThemeColor(studioData.theme)),
            position: [
              Math.random() * 6 - 3, // -3 to 3
              Math.random() * 3 + 1, // 1 to 4
              Math.random() * 6 - 3  // -3 to 3
            ] as [number, number, number],
            rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number]
          }));
        };
        
        const generatePlaceholderImage = (color: string) => {
          if (typeof window === 'undefined') return '';
          return `data:image/svg+xml;base64,${btoa(`
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" fill="${color}"/>
              <text x="256" y="256" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
                ${apiStudio.studio.theme}
              </text>
            </svg>
          `)}`;
        };
        
        const getThemeColor = (theme: string) => {
          switch (theme?.toLowerCase()) {
            case 'metaphysical-futurism': return '#00ffff';
            case 'renaissance': return '#daa520';
            case 'baroque': return '#8b4513';
            case 'cubism': return '#ff6347';
            case 'impressionism': return '#98fb98';
            case 'post-impressionism': return '#dda0dd';
            case 'modern': return '#4169e1';
            case 'cyberpunk': return '#ff00ff';
            case 'classical': return '#ffd700';
            case 'contemporary': return '#00ced1';
            default: return '#696969';
          }
        };
        
        return {
          id: apiStudio.studio_id,
          name: apiStudio.studio.name,
          agentId: assignedAgent?.agent_id || assignedAgent?.id,
          position: positions[index],
          rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          recentArtworks: generateRealArtworks(apiStudio.studio, apiStudio.studio.items_count),
          studio_id: apiStudio.studio_id,
          studioData: apiStudio.studio,
          assigned_agents: apiStudio.assigned_agents,
          agent_count: apiStudio.agent_count,
          agent: assignedAgent || undefined
        };
      });
      
      console.log('🏛️ Generated city studios:', cityStudios.length);
      console.log('🎨 Studios with agents:', cityStudios.filter(s => s.agent).length);
      console.log('🏗️ Empty studios:', cityStudios.filter(s => !s.agent).length);
      
      set({ studios: cityStudios });
      
    } catch (error) {
      console.error('❌ Error loading studios from API:', error);
      // Fallback to creating empty studios if API fails
      const fallbackStudios: Studio[] = [
        {
          id: 'fallback-1',
          name: 'Available Studio',
          position: [20, 0, 20],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          recentArtworks: [],
          studio_id: 'fallback-1',
          studioData: {
            name: 'Available Studio',
            description: 'A studio waiting for an artist',
            theme: 'Modern',
            art_style: 'Contemporary',
            items_count: 0,
            featured_items: []
          },
          assigned_agents: [],
          agent_count: 0
        }
      ];
      set({ studios: fallbackStudios });
    }
  }
})); 