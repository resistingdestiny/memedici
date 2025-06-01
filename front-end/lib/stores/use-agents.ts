"use client";

import { create } from "zustand";
import { 
  Agent, 
  getAgents, 
  getAgent, 
  createAgent, 
  CreateAgentRequest,
  chatWithAgent as apiChatWithAgent,
  ChatResponse,
  transformAgentData,
  checkHealth
} from "@/lib/api";

interface AgentsState {
  agents: Agent[];
  featuredAgents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  selectedTags: string[];
  sortBy: "price" | "output" | "date";
  sortOrder: "asc" | "desc";
  viewMode: "table" | "grid";
  
  // Chat state
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  
  setSearchTerm: (term: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSortBy: (sort: "price" | "output" | "date") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setViewMode: (mode: "table" | "grid") => void;
  
  fetchAgents: () => Promise<void>;
  fetchFeaturedAgents: () => Promise<void>;
  getAgentById: (id: string) => Promise<Agent | null>;
  selectAgent: (agent: Agent) => void;
  
  // Real API methods
  createNewAgent: (data: CreateAgentRequest) => Promise<Agent>;
  chatWithAgent: (agentId: string, message: string, threadId?: string) => Promise<ChatResponse>;
  
  // Chat methods
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // Legacy methods (kept for backward compatibility)
  mintAgent: (data: Partial<Agent>) => Promise<Agent>;
  buyAgent: (agentId: string, price: number) => Promise<boolean>;
  listAgent: (agentId: string, price: number) => Promise<boolean>;
  delistAgent: (agentId: string) => Promise<boolean>;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent" | "system";
  message: string;
  timestamp: Date;
  agentId?: string;
  assets?: Record<string, any>;
  toolsUsed?: string[];
}

export const useAgents = create<AgentsState>((set, get) => ({
  agents: [],
  featuredAgents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,
  searchTerm: "",
  selectedTags: [],
  sortBy: "output",
  sortOrder: "desc",
  viewMode: "table",
  
  // Chat state
  chatMessages: [],
  chatLoading: false,
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setViewMode: (mode) => set({ viewMode: mode }),
  
  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // First check if backend is healthy
      await checkHealth();
      
      const response = await getAgents();
      const transformedAgents = response.agents.map(transformAgentData);
      
      set({
        agents: transformedAgents,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch agents';
      set({ 
        isLoading: false, 
        error: errorMessage,
        agents: [] // Clear agents on error
      });
    }
  },
  
  fetchFeaturedAgents: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await getAgents();
      const transformedAgents = response.agents.map(transformAgentData);
      const featured = transformedAgents.filter(agent => agent.featured).slice(0, 4);
      
      set({
        featuredAgents: featured,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error("Error fetching featured agents:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch featured agents';
      set({ 
        isLoading: false, 
        error: errorMessage,
        featuredAgents: []
      });
    }
  },
  
  getAgentById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // First try to find in existing agents
      let { agents } = get();
      
      if (agents.length === 0) {
        await get().fetchAgents();
        agents = get().agents;
      }
      
      let agent = agents.find(a => a.id === id || a.agent_id === id);
      
      // If not found locally, fetch from API
      if (!agent) {
        const response = await getAgent(id);
        agent = transformAgentData(response);
        
        // Add to agents list
        set(state => ({
          agents: [...state.agents, agent!]
        }));
      }
      
      if (agent) {
        set({ selectedAgent: agent });
      }
      
      set({ isLoading: false, error: null });
      return agent || null;
    } catch (error: any) {
      console.error(`Error fetching agent with ID ${id}:`, error);
      const errorMessage = error?.response?.data?.detail || error?.message || `Failed to fetch agent ${id}`;
      set({ 
        isLoading: false, 
        error: errorMessage
      });
      return null;
    }
  },
  
  selectAgent: (agent: Agent) => {
    set({ selectedAgent: agent });
  },
  
  createNewAgent: async (data: CreateAgentRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await createAgent(data);
      
      if (response.success) {
        const newAgent = transformAgentData(response.agent_info);
        
        set((state) => ({
          agents: [...state.agents, newAgent],
          isLoading: false,
          error: null
        }));
        
        return newAgent;
      } else {
        throw new Error(response.error || 'Failed to create agent');
      }
    } catch (error: any) {
      console.error("Error creating agent:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create agent';
      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },
  
  chatWithAgent: async (agentId: string, message: string, threadId: string = 'default') => {
    set({ chatLoading: true, error: null });
    
    try {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        sender: "user",
        message,
        timestamp: new Date(),
        agentId
      };
      
      get().addChatMessage(userMessage);
      
      // Call API
      const response = await apiChatWithAgent(agentId, message, threadId);
      
      if (response.success && response.response) {
        // Add agent response
        const agentMessage: ChatMessage = {
          id: `${Date.now()}-agent`,
          sender: "agent",
          message: response.response,
          timestamp: new Date(),
          agentId,
          assets: response.assets,
          toolsUsed: response.tools_used
        };
        
        get().addChatMessage(agentMessage);
        
        // Add system messages for tools/evolution
        if (response.tools_used && response.tools_used.length > 0) {
          const toolsMessage: ChatMessage = {
            id: `${Date.now()}-tools`,
            sender: "system",
            message: `🛠️ Tools used: ${response.tools_used.join(', ')}`,
            timestamp: new Date(),
            agentId
          };
          get().addChatMessage(toolsMessage);
        }
        
        if (response.persona_evolved) {
          const evolutionMessage: ChatMessage = {
            id: `${Date.now()}-evolution`,
            sender: "system",
            message: "🎭 Agent persona has evolved through this interaction!",
            timestamp: new Date(),
            agentId
          };
          get().addChatMessage(evolutionMessage);
        }
        
        // Update agent stats if available
        const agent = get().agents.find(a => a.id === agentId || a.agent_id === agentId);
        if (agent) {
          const updatedAgent = {
            ...agent,
            stats: {
              ...agent.stats,
              promptsHandled: agent.stats.promptsHandled + 1,
              artworksCreated: response.assets ? agent.stats.artworksCreated + Object.keys(response.assets).length : agent.stats.artworksCreated
            }
          };
          
          set(state => ({
            agents: state.agents.map(a => a.id === agentId || a.agent_id === agentId ? updatedAgent : a),
            selectedAgent: state.selectedAgent?.id === agentId || state.selectedAgent?.agent_id === agentId ? updatedAgent : state.selectedAgent
          }));
        }
      } else {
        throw new Error(response.error || 'Chat failed');
      }
      
      set({ chatLoading: false, error: null });
      return response;
    } catch (error: any) {
      console.error("Error in chat:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Chat failed';
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        sender: "system",
        message: `❌ Error: ${errorMessage}`,
        timestamp: new Date(),
        agentId
      };
      
      get().addChatMessage(errorChatMessage);
      
      set({ chatLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },
  
  addChatMessage: (message: ChatMessage) => {
    set(state => ({
      chatMessages: [...state.chatMessages, message]
    }));
  },
  
  clearChatMessages: () => {
    set({ chatMessages: [] });
  },
  
  // Legacy methods for backward compatibility
  mintAgent: async (data) => {
    // Convert legacy format to new API format
    const agentRequest: CreateAgentRequest = {
      agent_id: data.name?.toLowerCase().replace(/\s+/g, '_') || `agent_${Date.now()}`,
      config: {
        id: data.name?.toLowerCase().replace(/\s+/g, '_') || `agent_${Date.now()}`,
        display_name: data.name || "New Agent",
        archetype: "Creative Artist",
        origin_story: data.description || "A creative AI agent",
        core_traits: ["creative", "innovative"],
        primary_mediums: data.specialty || ["digital"],
        signature_motifs: [],
        influences: [],
        colour_palette: [],
        creation_rate: 4,
        collab_affinity: [],
        
        // Studio ID - REQUIRED FIELD
        studio_id: `${data.name?.toLowerCase().replace(/\s+/g, '_') || `agent_${Date.now()}`}_studio`,
        
        agent_type: "creative_artist",
        model_name: "gpt-3.5-turbo",
        temperature: 0.7,
        memory_enabled: true,
        structured_output: false,
        studio_name: data.collective || "Creative Studio",
        studio_description: "A creative space for artistic expression",
        studio_theme: "abstract",
        art_style: "digital",
        studio_items: [],
        tools_enabled: ["generate_image", "generate_video"],
        custom_tools: [],
        persona_name: data.name || "Creative Soul",
        persona_background: data.description || "An emerging digital artist",
        personality_traits: ["curious", "experimental"],
        artistic_influences: ["Van Gogh", "Basquiat"],
        preferred_mediums: data.specialty || ["digital"],
        interaction_count: 0,
        artworks_created: 0,
        persona_evolution_history: []
      }
    };
    
    return get().createNewAgent(agentRequest);
  },
  
  buyAgent: async (agentId: string, price: number) => {
    set({ isLoading: true });
    
    try {
      // Simulate API call - this would be implemented when blockchain features are added
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      // Simulate API call - this would be implemented when marketplace features are added
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
      // Simulate API call - this would be implemented when marketplace features are added
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
  },
}));