import { useState, useEffect } from 'react';
import { getTools } from '@/lib/api';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at?: string;
  api_config?: {
    endpoint: string;
    method: string;
    auth?: any;
  };
  status?: 'active' | 'inactive' | 'error';
  usage_count?: number;
}

interface UseToolsReturn {
  data: Tool[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

export function useTools(): UseToolsReturn {
  const [data, setData] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const fetchTools = async () => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const response = await getTools();
      
      // Handle different response formats
      if (response.custom_tools) {
        setData(response.custom_tools);
      } else if (Array.isArray(response)) {
        setData(response);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Failed to fetch tools'));
      
      // Fallback to empty array
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchTools();
  };

  useEffect(() => {
    fetchTools();
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
} 