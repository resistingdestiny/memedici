import { useState, useEffect } from 'react';
import { getAgent, transformAgentData } from '@/lib/api';
import { AgentConfig } from '@/lib/types';

interface UseGetAgentReturn {
  data: AgentConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

// Convert API Agent to AgentConfig format - similar to useListAgents
function convertAPIAgentToAgentConfig(apiAgent: any): AgentConfig {
  const identity = apiAgent.identity || {};
  const creative = apiAgent.creative_specs || {};
  const technical = apiAgent.technical || {};
  const studio = apiAgent.studio || {};
  const evolution = apiAgent.evolution || {};

  return {
    id: apiAgent.agent_id,
    display_name: identity.display_name || apiAgent.agent_id,
    archetype: identity.archetype || 'Creative Artist',
    origin_story: identity.origin_story || '',
    core_traits: identity.core_traits || [],
    primary_mediums: creative.primary_mediums || [],
    avatar: identity.avatar_url 
      ? (identity.avatar_url.startsWith('http') 
          ? identity.avatar_url 
          : `https://memedici-backend.onrender.com/${identity.avatar_url}`)
      : `https://api.dicebear.com/7.x/avatars/svg?seed=${apiAgent.agent_id}`,
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
    creation_rate: identity.creation_rate || 3,
    
    // Technical fields
    agent_type: technical.agent_type || 'creative_artist',
    model_name: technical.model_name || 'gpt-4',
    temperature: technical.temperature || 0.7,
    max_tokens: technical.max_tokens || null,
    memory_enabled: technical.memory_enabled !== false,
    structured_output: technical.structured_output || false,
    
    // Studio fields - Now optional
    studio_name: studio?.name || undefined,
    studio_description: studio?.description || undefined,
    studio_theme: studio?.theme || undefined,
    art_style: studio?.art_style || undefined,
    studio_items: studio?.featured_items?.map((item: any) => ({
      name: item.name,
      category: item.category,
      description: item.description,
      rarity: item.rarity || 'common',
      specifications: item.specifications || {},
      condition: item.condition || 'excellent',
      acquisition_date: item.acquisition_date || null,
      cost: item.cost || null,
      notes: item.notes || null,
    })) || undefined,
    
    // Tools
    tools_enabled: technical.tools_enabled || ['generate_image'],
    custom_tools: technical.custom_tools || [],
    
    // Evolution fields
    interaction_count: evolution.interaction_count || 0,
    artworks_created: evolution.artworks_created || 0,
    persona_evolution_history: evolution.evolution_history || [],
    
    // Custom instructions
    custom_instructions: technical.custom_instructions || null,
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
      // Use the same API function as useListAgents for consistency
      const response = await getAgent(agentId);
      console.log("useGetAgent: API response:", response);
      
      if (response) {
        const foundAgent = convertAPIAgentToAgentConfig(response);
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