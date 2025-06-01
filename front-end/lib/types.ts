export interface FeedItem {
  id: string;
  type: "image" | "video" | "product";
  title: string;
  media: string;
  creator: {
    name: string;
    avatar: string;
    bio?: string;
    followers?: number;
    agentId?: string;
  };
  likes: number;
  isLiked?: boolean;
  price?: number | null;
  tags?: string[];
  description?: string;
}

// API Types for Memedici Backend
export interface AgentConfig {
  id: string;
  display_name: string;
  archetype: string;
  origin_story: string;
  core_traits: string[];
  primary_mediums: string[];
  avatar?: string;
  collective?: string;
  featured?: boolean;
  gallery?: string | null;
  stats?: {
    promptsHandled: number;
    artworksCreated: number;
    backersCount: number;
    totalStaked: number;
  };
  samples?: {
    title: string;
    image: string;
    promptId?: string;
  }[];
  
  // Extended fields from API response
  signature_motifs?: string[];
  influences?: string[];
  colour_palette?: string[];
  collab_affinity?: string[];
  prompt_formula?: string | null;
  voice_style?: string | null;
  creation_rate?: number;
  
  // Technical fields
  agent_type?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number | null;
  memory_enabled?: boolean;
  structured_output?: boolean;
  
  // Studio fields
  studio_name?: string;
  studio_description?: string;
  studio_theme?: string;
  art_style?: string;
  studio_items?: any[];
  
  // Tools
  tools_enabled?: string[];
  custom_tools?: {
    name: string;
    description: string;
    api_config?: {
      endpoint: string;
    };
  }[];
  
  // Evolution fields
  interaction_count?: number;
  artworks_created?: number;
  persona_evolution_history?: any[];
}

export interface ChatRequest {
  message: string;
  agent_id?: string;
  thread_id?: string;
  context?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  success: boolean;
  response?: string | null;
  message?: string;
  error?: string | null;
  agent_id: string;
  thread_id: string;
  tools_used?: string[] | null;
  persona_evolved?: boolean;
  metadata?: {
    tokens_used?: number;
    processing_time?: number;
    [key: string]: any;
  };
  assets?: {
    [key: string]: {
      type: string;
      url: string;
      file_path: string;
      prompt: string;
      model: string;
      parameters: Record<string, any>;
      created_at: string;
    };
  };
  artworks_created?: number;
}