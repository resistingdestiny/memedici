import { useState, useEffect } from 'react';
import { getAgentArtworks, type AgentArtworksResponse, type ApiArtwork } from '@/lib/api';

interface UseAgentArtworksReturn {
  artworks: ApiArtwork[];
  statistics: AgentArtworksResponse['statistics'] | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useAgentArtworks(agentId: string, initialLimit: number = 12): UseAgentArtworksReturn {
  const [artworks, setArtworks] = useState<ApiArtwork[]>([]);
  const [statistics, setStatistics] = useState<AgentArtworksResponse['statistics'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);

  const fetchArtworks = async (currentOffset: number = 0, append: boolean = false) => {
    if (!agentId) {
      console.log("useAgentArtworks: No agentId provided");
      setArtworks([]);
      setStatistics(null);
      return;
    }

    console.log("useAgentArtworks: Fetching artworks for agent:", agentId, "offset:", currentOffset);
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const response = await getAgentArtworks(agentId, limit, currentOffset, true);
      console.log("useAgentArtworks: API response:", response);
      
      if (response.success) {
        if (append) {
          setArtworks(prev => [...prev, ...response.artworks]);
        } else {
          setArtworks(response.artworks || []);
        }
        
        setStatistics(response.statistics);
        setHasMore(response.pagination.has_more);
        setOffset(currentOffset + (response.artworks?.length || 0));
        console.log("useAgentArtworks: Successfully loaded", response.artworks?.length || 0, "artworks");
      } else {
        console.warn("useAgentArtworks: API returned success=false");
        throw new Error(response.error || 'Failed to fetch artworks');
      }
    } catch (fetchError) {
      console.error(`useAgentArtworks: Failed to fetch artworks for agent ${agentId}:`, fetchError);
      setIsError(true);
      setError(fetchError instanceof Error ? fetchError : new Error('Unknown error'));
      
      // Don't clear existing artworks on error for append operations
      if (!append) {
        setArtworks([]);
        setStatistics(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchArtworks(offset, true);
    }
  };

  const refetch = () => {
    setOffset(0);
    fetchArtworks(0, false);
  };

  useEffect(() => {
    fetchArtworks(0, false);
  }, [agentId]);

  return {
    artworks,
    statistics,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    refetch,
  };
} 