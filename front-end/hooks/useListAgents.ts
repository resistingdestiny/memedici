import { useState, useEffect } from 'react';
import { httpClient } from '@/lib/http';
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

export function useListAgents(): UseListAgentsReturn {
  const [data, setData] = useState<AgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const fetchAgents = async () => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      // Fetch real agents from API
      const response = await httpClient.get<AgentConfig[]>('/agents');
      const realAgents = response.data || [];

      // Convert dummy agents to AgentConfig format
      const dummyAgents = agentData.map(convertDummyToAgentConfig);

      // Merge data: real agents first, then dummy agents that don't conflict
      const realAgentIds = new Set(realAgents.map(agent => agent.id));
      const uniqueDummyAgents = dummyAgents.filter(agent => !realAgentIds.has(agent.id));
      
      // Combine with real agents first
      const combinedData = [...realAgents, ...uniqueDummyAgents];
      
      setData(combinedData);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      
      // Fallback to dummy data on error
      const dummyAgents = agentData.map(convertDummyToAgentConfig);
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

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
} 