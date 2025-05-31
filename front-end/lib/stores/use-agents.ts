"use client";

import { create } from "zustand";
import { Agent, agentData } from "@/lib/stubs";

interface AgentsState {
  agents: Agent[];
  featuredAgents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  searchTerm: string;
  selectedTags: string[];
  sortBy: "price" | "output" | "date";
  sortOrder: "asc" | "desc";
  viewMode: "table" | "grid";
  
  setSearchTerm: (term: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSortBy: (sort: "price" | "output" | "date") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setViewMode: (mode: "table" | "grid") => void;
  
  fetchAgents: () => Promise<void>;
  fetchFeaturedAgents: () => Promise<void>;
  getAgentById: (id: string) => Promise<Agent | null>;
  selectAgent: (agent: Agent) => void;
  
  mintAgent: (data: Partial<Agent>) => Promise<Agent>;
  buyAgent: (agentId: string, price: number) => Promise<boolean>;
  listAgent: (agentId: string, price: number) => Promise<boolean>;
  delistAgent: (agentId: string) => Promise<boolean>;
}

export const useAgents = create<AgentsState>((set, get) => ({
  agents: [],
  featuredAgents: [],
  selectedAgent: null,
  isLoading: false,
  searchTerm: "",
  selectedTags: [],
  sortBy: "output",
  sortOrder: "desc",
  viewMode: "table",
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setViewMode: (mode) => set({ viewMode: mode }),
  
  fetchAgents: async () => {
    set({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      set({
        agents: agentData,
        isLoading: false
      });
    } catch (error) {
      console.error("Error fetching agents:", error);
      set({ isLoading: false });
    }
  },
  
  fetchFeaturedAgents: async () => {
    set({ isLoading: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const featured = agentData.filter(agent => agent.featured).slice(0, 4);
      
      set({
        featuredAgents: featured,
        isLoading: false
      });
    } catch (error) {
      console.error("Error fetching featured agents:", error);
      set({ isLoading: false });
    }
  },
  
  getAgentById: async (id: string) => {
    set({ isLoading: true });
    
    try {
      let { agents } = get();
      
      if (agents.length === 0) {
        await get().fetchAgents();
        agents = get().agents;
      }
      
      const agent = agents.find(a => a.id === id) || null;
      
      if (agent) {
        set({ selectedAgent: agent });
      }
      
      set({ isLoading: false });
      return agent;
    } catch (error) {
      console.error(`Error fetching agent with ID ${id}:`, error);
      set({ isLoading: false });
      return null;
    }
  },
  
  selectAgent: (agent: Agent) => {
    set({ selectedAgent: agent });
  },
  
  mintAgent: async (data) => {
    set({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: data.name || "New Agent",
        description: data.description || "",
        specialty: data.specialty || [],
        collective: data.collective || "Independent",
        avatar: data.avatar || "https://api.dicebear.com/7.x/avatars/svg?seed=1",
        featured: false,
        gallery: null,
        stats: {
          promptsHandled: 0,
          artworksCreated: 0,
          backersCount: 0,
          totalStaked: 0,
        },
        samples: []
      };
      
      set((state) => ({
        agents: [...state.agents, newAgent],
        isLoading: false
      }));
      
      return newAgent;
    } catch (error) {
      console.error("Error minting agent:", error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  buyAgent: async (agentId: string, price: number) => {
    set({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === agentId
            ? { ...agent, owner: "user" }
            : agent
        ),
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error("Error buying agent:", error);
      set({ isLoading: false });
      return false;
    }
  },
  
  listAgent: async (agentId: string, price: number) => {
    set({ isLoading: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === agentId
            ? { ...agent, listed: true, listPrice: price }
            : agent
        ),
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error("Error listing agent:", error);
      set({ isLoading: false });
      return false;
    }
  },
  
  delistAgent: async (agentId: string) => {
    set({ isLoading: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === agentId
            ? { ...agent, listed: false, listPrice: undefined }
            : agent
        ),
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error("Error delisting agent:", error);
      set({ isLoading: false });
      return false;
    }
  }
}));