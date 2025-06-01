import { useState, useEffect } from 'react';
import { getAllArtworks, type AllArtworksResponse } from '@/lib/api';

type AllArtwork = AllArtworksResponse['artworks'][0];

interface UseAllArtworksReturn {
  artworks: AllArtwork[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useAllArtworks(initialLimit: number = 20): UseAllArtworksReturn {
  const [artworks, setArtworks] = useState<AllArtwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);

  const fetchArtworks = async (currentOffset: number = 0, append: boolean = false) => {
    console.log("useAllArtworks: Fetching all artworks, offset:", currentOffset);
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const response = await getAllArtworks(limit, currentOffset, true);
      console.log("useAllArtworks: API response:", response);
      
      if (response.success) {
        if (append) {
          setArtworks(prev => [...prev, ...response.artworks]);
        } else {
          setArtworks(response.artworks || []);
        }
        
        setHasMore(response.pagination.has_more);
        setOffset(currentOffset + (response.artworks?.length || 0));
        console.log("useAllArtworks: Successfully loaded", response.artworks?.length || 0, "artworks");
      } else {
        console.warn("useAllArtworks: API returned success=false");
        throw new Error(response.error || 'Failed to fetch artworks');
      }
    } catch (fetchError) {
      console.error(`useAllArtworks: Failed to fetch all artworks:`, fetchError);
      setIsError(true);
      setError(fetchError instanceof Error ? fetchError : new Error('Unknown error'));
      
      // Don't clear existing artworks on error for append operations
      if (!append) {
        setArtworks([]);
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
  }, []);

  return {
    artworks,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    refetch,
  };
} 