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
      setData(undefined);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      // First, check dummy data
      const dummyAgent = agentData.find(agent => agent.id === agentId);
      let foundAgent: AgentConfig | undefined;

      if (dummyAgent) {
        foundAgent = convertDummyToAgentConfig(dummyAgent);
        setData(foundAgent); // Set dummy data immediately for better UX
      }

      try {
        // Then fetch from real API (this might override dummy data)
        const response = await httpClient.get<AgentConfig>(`/agents/${agentId}`);
        if (response.data) {
          foundAgent = response.data;
          setData(foundAgent);
        }
      } catch (apiError) {
        console.warn(`API fetch failed for agent ${agentId}, using dummy data if available:`, apiError);
        
        // If API fails and we don't have dummy data, this is an error
        if (!foundAgent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        // If we have dummy data, we continue with it (no error)
      }

      if (!foundAgent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

    } catch (err) {
      console.error(`Error fetching agent ${agentId}:`, err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch agent'));
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