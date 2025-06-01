import { useState, useEffect } from 'react';
import { httpClient } from '@/lib/http';
import { AgentConfig } from '@/lib/types';
import { Agent, agentData } from '@/lib/stubs';

interface UseGetAgentReturn {
  data: AgentConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

// API Response interface based on actual backend structure
interface ApiAgentResponse {
  agent_id: string;
  identity: {
    display_name: string;
    avatar_url?: string | null;
    archetype: string;
    core_traits: string[];
    origin_story: string;
    voice_style?: string;
    creation_rate?: number;
  };
  creative_specs: {
    primary_mediums: string[];
    signature_motifs?: string[];
    influences?: string[];
    colour_palette?: string[];
    collab_affinity?: string[];
    prompt_formula?: string;
  };
  technical?: {
    agent_type: string;
    model_name: string;
    temperature: number;
    tools_enabled: string[];
    custom_tools: any[];
    memory_enabled: boolean;
  };
  studio?: {
    name: string;
    description: string;
    theme: string;
    art_style: string;
    featured_items?: any[];
  };
  evolution?: {
    interaction_count: number;
    artworks_created: number;
    evolution_history?: any[];
  };
  system_prompt_preview?: string;
}

// Convert API response to AgentConfig format
function convertApiToAgentConfig(apiResponse: ApiAgentResponse): AgentConfig {
  const identity = (apiResponse.identity || {}) as ApiAgentResponse['identity'];
  const creative = (apiResponse.creative_specs || {}) as ApiAgentResponse['creative_specs'];
  const technical = (apiResponse.technical || {}) as NonNullable<ApiAgentResponse['technical']>;
  const studio = (apiResponse.studio || {}) as NonNullable<ApiAgentResponse['studio']>;
  const evolution = (apiResponse.evolution || {}) as NonNullable<ApiAgentResponse['evolution']>;

  return {
    id: apiResponse.agent_id,
    display_name: identity.display_name || apiResponse.agent_id,
    archetype: identity.archetype || 'Creative Artist',
    origin_story: identity.origin_story || '',
    core_traits: identity.core_traits || [],
    primary_mediums: creative.primary_mediums || [],
    avatar: identity.avatar_url 
      ? (identity.avatar_url.startsWith('http') 
          ? identity.avatar_url 
          : `https://memedici-backend.onrender.com/${identity.avatar_url}`)
      : `https://api.dicebear.com/7.x/avatars/svg?seed=${apiResponse.agent_id}`,
    collective: studio.name || identity.archetype || 'Independent',
    featured: false, // Default value since API doesn't provide this
    gallery: null, // Default value since API doesn't provide this
    stats: {
      promptsHandled: evolution.interaction_count || 0,
      artworksCreated: evolution.artworks_created || 0,
      backersCount: 0, // Default value since API doesn't provide this
      totalStaked: 0, // Default value since API doesn't provide this
    },
    samples: [], // Default value since API doesn't provide this
    
    // Extended creative fields
    signature_motifs: creative.signature_motifs || [],
    influences: creative.influences || [],
    colour_palette: creative.colour_palette || [],
    collab_affinity: creative.collab_affinity || [],
    prompt_formula: creative.prompt_formula || null,
    voice_style: identity.voice_style || null,
    creation_rate: identity.creation_rate || 4,
    
    // Technical fields
    agent_type: technical.agent_type || 'creative_artist',
    model_name: technical.model_name || 'gpt-4',
    temperature: technical.temperature || 0.7,
    max_tokens: null,
    memory_enabled: technical.memory_enabled !== false,
    structured_output: false,
    
    // Studio fields
    studio_name: studio.name || 'Creative Studio',
    studio_description: studio.description || '',
    studio_theme: studio.theme || 'modern',
    art_style: studio.art_style || 'digital',
    studio_items: studio.featured_items || [],
    
    // Tools
    tools_enabled: technical.tools_enabled || [],
    custom_tools: technical.custom_tools || [],
    
    // Evolution fields
    interaction_count: evolution.interaction_count || 0,
    artworks_created: evolution.artworks_created || 0,
    persona_evolution_history: evolution.evolution_history || [],
  };
}

// Convert dummy Agent to AgentConfig format
function convertDummyToAgentConfig(agent: Agent): AgentConfig {
  return {
    id: agent.id,
    display_name: agent.name,
    archetype: agent.collective,
    origin_story: agent.description,
    core_traits: agent.specialty,
    primary_mediums: agent.specialty, // Using specialty as mediums fallback
    avatar: agent.avatar,
    collective: agent.collective,
    featured: agent.featured,
    gallery: agent.gallery,
    stats: agent.stats,
    samples: agent.samples,
  };
}

export function useGetAgent(agentId: string): UseGetAgentReturn {
  const [data, setData] = useState<AgentConfig | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const fetchAgent = async () => {
    if (!agentId) {
      console.log("useGetAgent: No agentId provided");
      setData(undefined);
      return;
    }

    console.log("useGetAgent: Fetching agent with ID:", agentId);
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      // Try to fetch from API first
      console.log("useGetAgent: Attempting API fetch for agent:", agentId);
      const response = await httpClient.get<ApiAgentResponse>(`/agents/${agentId}`);
      console.log("useGetAgent: API response:", response.data);
      
      if (response.data) {
        const foundAgent = convertApiToAgentConfig(response.data);
        console.log("useGetAgent: Converted agent:", foundAgent);
        setData(foundAgent);
        setIsLoading(false);
        return; // Success, exit early
      }
    } catch (apiError) {
      console.warn(`useGetAgent: API fetch failed for agent ${agentId}:`, apiError);
    }

    // If API fails, try dummy data
    console.log("useGetAgent: Trying dummy data for agent:", agentId);
    const dummyAgent = agentData.find(agent => agent.id === agentId);
    if (dummyAgent) {
      console.log("useGetAgent: Found dummy agent:", dummyAgent);
      const foundAgent = convertDummyToAgentConfig(dummyAgent);
      setData(foundAgent);
      setIsLoading(false);
      return; // Success with dummy data
    }

    // If both API and dummy data fail, then it's an error
    console.error("useGetAgent: Agent not found in API or dummy data:", agentId);
    setIsError(true);
    setError(new Error(`Agent with ID ${agentId} not found`));
    setData(undefined);
    setIsLoading(false);
  };

  const refetch = () => {
    fetchAgent();
  };

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
} 