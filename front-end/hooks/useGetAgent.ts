import { useState, useEffect } from 'react';
import { httpClient } from '@/lib/http';
import { AgentConfig } from '@/lib/types';

interface UseGetAgentReturn {
  data: AgentConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

// API response format from deployed backend
interface ApiAgentResponse {
  agent_id: string;
  identity?: {
    display_name?: string;
    avatar_url?: string;
    archetype?: string;
    core_traits?: string[];
    origin_story?: string;
  };
  creative_specs?: {
    primary_mediums?: string[];
    signature_motifs?: string[];
    influences?: string[];
    colour_palette?: string[];
    collab_affinity?: string[];
    prompt_formula?: string;
  };
  studio?: {
    name?: string;
    description?: string;
    theme?: string;
    art_style?: string;
  };
  technical?: {
    agent_type?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    memory_enabled?: boolean;
    structured_output?: boolean;
  };
  evolution?: {
    interaction_count?: number;
    artworks_created?: number;
    persona_evolution_history?: any[];
  };
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
    voice_style: null, // Not in current API
    creation_rate: 3, // Default value
    
    // Technical fields
    agent_type: technical.agent_type || 'creative_artist',
    model_name: technical.model_name || 'gpt-4',
    temperature: technical.temperature || 0.7,
    max_tokens: technical.max_tokens || null,
    memory_enabled: technical.memory_enabled || true,
    structured_output: technical.structured_output || false,
    
    // Studio fields
    studio_name: studio.name || 'Creative Studio',
    studio_description: studio.description || 'A creative workspace',
    studio_theme: studio.theme || 'modern',
    art_style: studio.art_style || 'digital',
    studio_items: [], // Default empty
    
    // Tools
    tools_enabled: ['generate_image'], // Default
    custom_tools: [], // Default empty
    
    // Evolution fields
    interaction_count: evolution.interaction_count || 0,
    artworks_created: evolution.artworks_created || 0,
    persona_evolution_history: evolution.persona_evolution_history || [],
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

    console.log("useGetAgent: Fetching agent from deployed backend:", agentId);
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      // Fetch from deployed API
      const response = await httpClient.get<ApiAgentResponse>(`/agents/${agentId}`);
      console.log("useGetAgent: API response:", response.data);
      
      if (response.data) {
        const foundAgent = convertApiToAgentConfig(response.data);
        console.log("useGetAgent: Converted agent:", foundAgent);
        setData(foundAgent);
      } else {
        throw new Error(`Agent with ID ${agentId} not found in deployed backend`);
      }
    } catch (apiError) {
      console.error(`useGetAgent: Failed to fetch agent ${agentId} from deployed backend:`, apiError);
      setIsError(true);
      setError(new Error(`Agent with ID ${agentId} not found in deployed backend`));
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
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