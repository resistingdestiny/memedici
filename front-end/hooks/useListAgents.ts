import { useState, useEffect } from 'react';
import { getAgents, transformAgentData, Agent as APIAgent } from '@/lib/api';
import { AgentConfig } from '@/lib/types';

interface UseListAgentsReturn {
  data: AgentConfig[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

// Convert API Agent to AgentConfig format
function convertAPIAgentToAgentConfig(apiAgent: APIAgent): AgentConfig {
  return {
    id: apiAgent.id,
    display_name: apiAgent.name,
    archetype: apiAgent.identity?.archetype || apiAgent.collective,
    origin_story: apiAgent.description,
    core_traits: apiAgent.specialty,
    primary_mediums: apiAgent.creative_specs?.primary_mediums || apiAgent.specialty,
    avatar: apiAgent.avatar,
    collective: apiAgent.collective,
    featured: apiAgent.featured,
    gallery: apiAgent.gallery,
    stats: apiAgent.stats,
    samples: apiAgent.samples,
  };
}

export function useListAgents(): UseListAgentsReturn {
  const [data, setData] = useState<AgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const fetchAgents = async () => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    console.log('[useListAgents] Fetching real agents from deployed backend...');

    try {
      // Fetch real agents from deployed API
      const response = await getAgents();
      console.log('[useListAgents] API Response:', response);
      
      const realAgents = response.agents || [];
      console.log('[useListAgents] Real agents from deployed backend:', realAgents.length);

      // Transform API agents to AgentConfig format
      const transformedApiAgents = realAgents.map(transformAgentData).map(convertAPIAgentToAgentConfig);
      console.log('[useListAgents] Transformed API agents:', transformedApiAgents.length, transformedApiAgents);
      
      setData(transformedApiAgents);
    } catch (err) {
      console.error('[useListAgents] Error fetching agents from deployed backend:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents from deployed backend'));
      
      // Set empty data on error - no dummy fallback
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchAgents();
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
} 