import { useState, useEffect } from 'react';
import { getAgents, transformAgentData, Agent as APIAgent } from '@/lib/api';
import { AgentConfig } from '@/lib/types';
import { Agent, agentData } from '@/lib/stubs';

interface UseListAgentsReturn {
  data: AgentConfig[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
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

    console.log('[useListAgents] Starting fetch...');

    try {
      // Fetch real agents from API
      console.log('[useListAgents] Calling getAgents API...');
      const response = await getAgents();
      console.log('[useListAgents] API Response:', response);
      
      const realAgents = response.agents || [];
      console.log('[useListAgents] Real agents from API:', realAgents.length);

      // Transform API agents to AgentConfig format
      const transformedApiAgents = realAgents.map(transformAgentData).map(convertAPIAgentToAgentConfig);
      console.log('[useListAgents] Transformed API agents:', transformedApiAgents.length, transformedApiAgents);

      // Convert dummy agents to AgentConfig format
      const dummyAgents = agentData.map(convertDummyToAgentConfig);
      console.log('[useListAgents] Dummy agents:', dummyAgents.length);

      // Merge data: real agents first, then dummy agents that don't conflict
      const realAgentIds = new Set(transformedApiAgents.map(agent => agent.id));
      const uniqueDummyAgents = dummyAgents.filter(agent => !realAgentIds.has(agent.id));
      
      // Combine with real agents first
      const combinedData = [...transformedApiAgents, ...uniqueDummyAgents];
      console.log('[useListAgents] Final combined data:', combinedData.length, combinedData);
      
      setData(combinedData);
    } catch (err) {
      console.error('[useListAgents] Error fetching agents:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      
      // Fallback to dummy data on error
      const dummyAgents = agentData.map(convertDummyToAgentConfig);
      console.log('[useListAgents] Using dummy data as fallback:', dummyAgents.length);
      setData(dummyAgents);
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

  // Ensure we always have at least dummy data
  useEffect(() => {
    if (!isLoading && data.length === 0) {
      console.log('[useListAgents] No data found, falling back to dummy agents');
      const dummyAgents = agentData.map(convertDummyToAgentConfig);
      setData(dummyAgents);
    }
  }, [data.length, isLoading]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
} 